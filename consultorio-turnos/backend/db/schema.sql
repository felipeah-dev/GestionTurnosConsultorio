-- schema.sql: DDL completo de PostgreSQL: todas las tablas, claves foráneas, restricciones UNIQUE y audit_log
/* =========================================================
   BASE B (MEJORADA) - PostgreSQL
   - Normalización por slots (time_slot)
   - Historial (cancel/reprogramación/eventos de estado)
   - UUID públicos (anti-enumeración / anti-IDOR)
   - Auditoría append-only + triggers opcionales
   - RLS opcional (bien planteado con app.user_id)
   ========================================================= */

-- Extensiones
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

-- ENUM justificado por estados del turno
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'turno_status') THEN
    CREATE TYPE turno_status AS ENUM (
      'CONFIRMADO',
      'CANCELADO',
      'REPROGRAMADO',
      'ATENDIDO',
      'NO_ASISTIO'
    );
  END IF;
END$$;

-- =========================================================
-- UTILIDADES (APP CONTEXT)
-- La app debe ejecutar, por conexión/tx:
--   SELECT set_config('app.user_id','123', true);
--   SELECT set_config('app.request_id','<uuid>', true);
--   SELECT set_config('app.ip','203.0.113.10', true);
--   SELECT set_config('app.user_agent','...', true);
-- =========================================================

CREATE OR REPLACE FUNCTION app_current_user_id()
RETURNS BIGINT
LANGUAGE sql
AS $$
  SELECT NULLIF(current_setting('app.user_id', true), '')::bigint
$$;

CREATE OR REPLACE FUNCTION app_current_request_id()
RETURNS UUID
LANGUAGE sql
AS $$
  SELECT NULLIF(current_setting('app.request_id', true), '')::uuid
$$;

CREATE OR REPLACE FUNCTION app_current_ip()
RETURNS INET
LANGUAGE sql
AS $$
  SELECT NULLIF(current_setting('app.ip', true), '')::inet
$$;

CREATE OR REPLACE FUNCTION app_current_user_agent()
RETURNS TEXT
LANGUAGE sql
AS $$
  SELECT NULLIF(current_setting('app.user_agent', true), '')
$$;

-- =========================================================
-- SEGURIDAD (RBAC) + AUTH
-- =========================================================

CREATE TABLE IF NOT EXISTS users (
  user_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_public_id UUID NOT NULL DEFAULT gen_random_uuid(),
  username CITEXT NOT NULL UNIQUE,            -- email case-insensitive
  password_hash TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (char_length(username::text) BETWEEN 3 AND 254),
  CHECK (position('@' IN username::text) > 1),
  CHECK (char_length(password_hash) >= 20)
);

CREATE TABLE IF NOT EXISTS roles (
  role_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (char_length(name) BETWEEN 3 AND 64)
);

CREATE TABLE IF NOT EXISTS permissions (
  permission_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  description TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (char_length(code) BETWEEN 3 AND 80)
);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  role_id BIGINT NOT NULL REFERENCES roles(role_id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id BIGINT NOT NULL REFERENCES roles(role_id) ON DELETE CASCADE,
  permission_id BIGINT NOT NULL REFERENCES permissions(permission_id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS user_sessions (
  session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ NULL,
  revoked_by_user_id BIGINT NULL REFERENCES users(user_id) ON DELETE SET NULL,
  ip_address INET NULL,
  user_agent TEXT NULL,
  refresh_token_hash TEXT NULL,
  CHECK (expires_at > created_at),
  CHECK (refresh_token_hash IS NULL OR char_length(refresh_token_hash) >= 32)
);

-- =========================================================
-- AUDITORÍA (append-only)
-- =========================================================

CREATE TABLE IF NOT EXISTS audit_log (
  audit_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_user_id BIGINT NULL REFERENCES users(user_id) ON DELETE SET NULL,
  action_code TEXT NOT NULL,
  module TEXT NOT NULL,
  object_table TEXT NOT NULL,
  object_pk JSONB NOT NULL,
  success BOOLEAN NOT NULL DEFAULT TRUE,
  failure_reason TEXT NULL,
  ip_address INET NULL,
  user_agent TEXT NULL,
  request_id UUID NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  CHECK (char_length(action_code) BETWEEN 3 AND 80),
  CHECK (char_length(module) BETWEEN 2 AND 40),
  CHECK (jsonb_typeof(object_pk) = 'object')
);

-- append-only enforcement
CREATE OR REPLACE FUNCTION audit_log_block_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'audit_log es append-only: operación % no permitida', TG_OP;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_log_no_update ON audit_log;
DROP TRIGGER IF EXISTS trg_audit_log_no_delete ON audit_log;

CREATE TRIGGER trg_audit_log_no_update
BEFORE UPDATE ON audit_log
FOR EACH ROW EXECUTE FUNCTION audit_log_block_mutation();

CREATE TRIGGER trg_audit_log_no_delete
BEFORE DELETE ON audit_log
FOR EACH ROW EXECUTE FUNCTION audit_log_block_mutation();

-- Trigger genérico opcional para auditar cambios de filas
CREATE OR REPLACE FUNCTION audit_row_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  pk_col TEXT := TG_ARGV[0];
  action_prefix TEXT := TG_ARGV[1];
  module_name TEXT := TG_ARGV[2];
  pk_value TEXT;
  pk_json JSONB;
  details_json JSONB;
BEGIN
  IF TG_OP = 'INSERT' THEN
    EXECUTE format('SELECT ($1).%I::text', pk_col) INTO pk_value USING NEW;
    pk_json := jsonb_build_object(pk_col, pk_value);
    details_json := jsonb_build_object('new', to_jsonb(NEW));
    INSERT INTO audit_log(actor_user_id, action_code, module, object_table, object_pk, success, ip_address, user_agent, request_id, details)
    VALUES (app_current_user_id(), action_prefix || '_INSERT', module_name, TG_TABLE_NAME, pk_json, TRUE, app_current_ip(), app_current_user_agent(), app_current_request_id(), details_json);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    EXECUTE format('SELECT ($1).%I::text', pk_col) INTO pk_value USING NEW;
    pk_json := jsonb_build_object(pk_col, pk_value);
    details_json := jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW));
    INSERT INTO audit_log(actor_user_id, action_code, module, object_table, object_pk, success, ip_address, user_agent, request_id, details)
    VALUES (app_current_user_id(), action_prefix || '_UPDATE', module_name, TG_TABLE_NAME, pk_json, TRUE, app_current_ip(), app_current_user_agent(), app_current_request_id(), details_json);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    EXECUTE format('SELECT ($1).%I::text', pk_col) INTO pk_value USING OLD;
    pk_json := jsonb_build_object(pk_col, pk_value);
    details_json := jsonb_build_object('old', to_jsonb(OLD));
    INSERT INTO audit_log(actor_user_id, action_code, module, object_table, object_pk, success, ip_address, user_agent, request_id, details)
    VALUES (app_current_user_id(), action_prefix || '_DELETE', module_name, TG_TABLE_NAME, pk_json, TRUE, app_current_ip(), app_current_user_agent(), app_current_request_id(), details_json);
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

-- =========================================================
-- DOMINIO (Consultorio)
-- =========================================================

CREATE TABLE IF NOT EXISTS specialty (
  specialty_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code TEXT NULL UNIQUE,                          -- código estable opcional
  name TEXT NOT NULL UNIQUE,
  description TEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (char_length(name) BETWEEN 3 AND 120),
  CHECK (code IS NULL OR char_length(code) BETWEEN 3 AND 30)
);

CREATE TABLE IF NOT EXISTS doctor (
  doctor_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  doctor_public_id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id BIGINT NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE RESTRICT,
  professional_license TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (char_length(professional_license) BETWEEN 5 AND 40),
  CHECK (char_length(first_name) BETWEEN 2 AND 80),
  CHECK (char_length(last_name) BETWEEN 2 AND 80),
  CHECK (phone IS NULL OR char_length(phone) BETWEEN 7 AND 25)
);

CREATE TABLE IF NOT EXISTS patient (
  patient_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  patient_public_id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id BIGINT NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE RESTRICT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT NULL,
  date_of_birth DATE NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (char_length(first_name) BETWEEN 2 AND 80),
  CHECK (char_length(last_name) BETWEEN 2 AND 80),
  CHECK (phone IS NULL OR char_length(phone) BETWEEN 7 AND 25),
  CHECK (date_of_birth IS NULL OR date_of_birth <= CURRENT_DATE)
);

CREATE TABLE IF NOT EXISTS doctor_specialty (
  doctor_id BIGINT NOT NULL REFERENCES doctor(doctor_id) ON DELETE RESTRICT,
  specialty_id BIGINT NOT NULL REFERENCES specialty(specialty_id) ON DELETE RESTRICT,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (doctor_id, specialty_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_doctor_primary_specialty
ON doctor_specialty (doctor_id)
WHERE is_primary = TRUE;

CREATE TABLE IF NOT EXISTS time_slot (
  time_slot_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  slot_minutes SMALLINT NOT NULL,
  label TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (start_time, end_time),
  CHECK (end_time > start_time),
  CHECK (slot_minutes BETWEEN 5 AND 240)
);

CREATE TABLE IF NOT EXISTS horarios_disponibles (
  horario_disponible_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  doctor_id BIGINT NOT NULL REFERENCES doctor(doctor_id) ON DELETE RESTRICT,
  day_of_week SMALLINT NOT NULL, -- 0=domingo ... 6=sábado
  time_slot_id BIGINT NOT NULL REFERENCES time_slot(time_slot_id) ON DELETE RESTRICT,
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (doctor_id, day_of_week, time_slot_id),
  CHECK (day_of_week BETWEEN 0 AND 6)
);

CREATE TABLE IF NOT EXISTS doctor_time_block (
  doctor_time_block_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  doctor_id BIGINT NOT NULL REFERENCES doctor(doctor_id) ON DELETE RESTRICT,
  block_date DATE NOT NULL,
  time_slot_id BIGINT NOT NULL REFERENCES time_slot(time_slot_id) ON DELETE RESTRICT,
  reason TEXT NULL,
  created_by_user_id BIGINT NULL REFERENCES users(user_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (doctor_id, block_date, time_slot_id),
  CHECK (reason IS NULL OR char_length(reason) BETWEEN 3 AND 500)
);

CREATE TABLE IF NOT EXISTS turno (
  turno_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  turno_public_id UUID NOT NULL DEFAULT gen_random_uuid(),

  patient_id BIGINT NOT NULL REFERENCES patient(patient_id) ON DELETE RESTRICT,
  doctor_id BIGINT NOT NULL REFERENCES doctor(doctor_id) ON DELETE RESTRICT,
  specialty_id BIGINT NOT NULL REFERENCES specialty(specialty_id) ON DELETE RESTRICT,

  appointment_date DATE NOT NULL,
  time_slot_id BIGINT NOT NULL REFERENCES time_slot(time_slot_id) ON DELETE RESTRICT,

  status turno_status NOT NULL DEFAULT 'CONFIRMADO',
  notes TEXT NULL,

  created_by_user_id BIGINT NULL REFERENCES users(user_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  version INTEGER NOT NULL DEFAULT 1,

  UNIQUE (turno_public_id),
  CHECK (version >= 1),
  CHECK (notes IS NULL OR char_length(notes) <= 2000),
  CHECK (updated_at >= created_at),

  CONSTRAINT fk_turno_doctor_specialty
    FOREIGN KEY (doctor_id, specialty_id)
    REFERENCES doctor_specialty(doctor_id, specialty_id)
    ON DELETE RESTRICT
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_turno_doctor_slot_active
ON turno (doctor_id, appointment_date, time_slot_id)
WHERE status IN ('CONFIRMADO', 'REPROGRAMADO');

CREATE TABLE IF NOT EXISTS turno_cancellation (
  turno_cancellation_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  turno_id BIGINT NOT NULL UNIQUE REFERENCES turno(turno_id) ON DELETE CASCADE,
  canceled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  canceled_by_user_id BIGINT NULL REFERENCES users(user_id) ON DELETE SET NULL,
  reason TEXT NULL,
  CHECK (reason IS NULL OR char_length(reason) BETWEEN 3 AND 500)
);

CREATE TABLE IF NOT EXISTS turno_reschedule (
  turno_reschedule_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  turno_id BIGINT NOT NULL REFERENCES turno(turno_id) ON DELETE CASCADE,

  old_appointment_date DATE NOT NULL,
  old_time_slot_id BIGINT NOT NULL REFERENCES time_slot(time_slot_id) ON DELETE RESTRICT,

  new_appointment_date DATE NOT NULL,
  new_time_slot_id BIGINT NOT NULL REFERENCES time_slot(time_slot_id) ON DELETE RESTRICT,

  reason TEXT NULL,
  rescheduled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  rescheduled_by_user_id BIGINT NULL REFERENCES users(user_id) ON DELETE SET NULL,

  CHECK (old_appointment_date <> new_appointment_date OR old_time_slot_id <> new_time_slot_id),
  CHECK (reason IS NULL OR char_length(reason) BETWEEN 3 AND 500)
);

CREATE TABLE IF NOT EXISTS turno_status_event (
  turno_status_event_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  turno_id BIGINT NOT NULL REFERENCES turno(turno_id) ON DELETE CASCADE,
  old_status turno_status NOT NULL,
  new_status turno_status NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  changed_by_user_id BIGINT NULL REFERENCES users(user_id) ON DELETE SET NULL,
  note TEXT NULL,
  CHECK (old_status <> new_status),
  CHECK (note IS NULL OR char_length(note) <= 500)
);

-- =========================================================
-- TRIGGERS (consistencia + trazabilidad)
-- =========================================================

CREATE OR REPLACE FUNCTION turno_before_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  NEW.version := OLD.version + 1;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_turno_before_update ON turno;
CREATE TRIGGER trg_turno_before_update
BEFORE UPDATE ON turno
FOR EACH ROW EXECUTE FUNCTION turno_before_update();

CREATE OR REPLACE FUNCTION turno_after_update_status_event()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO turno_status_event(turno_id, old_status, new_status, changed_at, changed_by_user_id, note)
    VALUES (
      NEW.turno_id,
      OLD.status,
      NEW.status,
      now(),
      COALESCE(app_current_user_id(), NEW.created_by_user_id),
      NULL
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_turno_status_event ON turno;
CREATE TRIGGER trg_turno_status_event
AFTER UPDATE ON turno
FOR EACH ROW EXECUTE FUNCTION turno_after_update_status_event();

DROP TRIGGER IF EXISTS trg_audit_turno ON turno;
CREATE TRIGGER trg_audit_turno
AFTER INSERT OR UPDATE OR DELETE ON turno
FOR EACH ROW EXECUTE FUNCTION audit_row_change('turno_public_id', 'TURN', 'TURNOS');

DROP TRIGGER IF EXISTS trg_audit_doctor_time_block ON doctor_time_block;
CREATE TRIGGER trg_audit_doctor_time_block
AFTER INSERT OR UPDATE OR DELETE ON doctor_time_block
FOR EACH ROW EXECUTE FUNCTION audit_row_change('doctor_time_block_id', 'BLOCK', 'AVAILABILITY');

DROP TRIGGER IF EXISTS trg_audit_horarios_disponibles ON horarios_disponibles;
CREATE TRIGGER trg_audit_horarios_disponibles
AFTER INSERT OR UPDATE OR DELETE ON horarios_disponibles
FOR EACH ROW EXECUTE FUNCTION audit_row_change('horario_disponible_id', 'TEMPLATE', 'AVAILABILITY');

-- =========================================================
-- ÍNDICES RECOMENDADOS
-- =========================================================

CREATE INDEX IF NOT EXISTS ix_users_created_at ON users (created_at DESC);

CREATE INDEX IF NOT EXISTS ix_user_sessions_user_created_at ON user_sessions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_user_sessions_expires_at ON user_sessions (expires_at);
CREATE INDEX IF NOT EXISTS ix_user_sessions_active ON user_sessions (user_id, last_seen_at DESC) WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS ix_audit_log_occurred_at ON audit_log (occurred_at DESC);
CREATE INDEX IF NOT EXISTS ix_audit_log_actor_occurred_at ON audit_log (actor_user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS ix_audit_log_action_occurred_at ON audit_log (action_code, occurred_at DESC);
CREATE INDEX IF NOT EXISTS gin_audit_log_object_pk ON audit_log USING GIN (object_pk);

CREATE INDEX IF NOT EXISTS ix_doctor_user_id ON doctor (user_id);
CREATE INDEX IF NOT EXISTS ix_patient_user_id ON patient (user_id);
CREATE INDEX IF NOT EXISTS ix_doctor_specialty_specialty ON doctor_specialty (specialty_id);

CREATE INDEX IF NOT EXISTS ix_horarios_disponibles_doctor_dow ON horarios_disponibles (doctor_id, day_of_week);
CREATE INDEX IF NOT EXISTS ix_doctor_time_block_doctor_date ON doctor_time_block (doctor_id, block_date);

CREATE INDEX IF NOT EXISTS ix_turno_patient_status_date ON turno (patient_id, status, appointment_date DESC);
CREATE INDEX IF NOT EXISTS ix_turno_doctor_date ON turno (doctor_id, appointment_date);
CREATE INDEX IF NOT EXISTS ix_turno_specialty_date ON turno (specialty_id, appointment_date);

CREATE INDEX IF NOT EXISTS ix_turno_reschedule_turno_id ON turno_reschedule (turno_id, rescheduled_at DESC);
CREATE INDEX IF NOT EXISTS ix_turno_status_event_turno_id ON turno_status_event (turno_id, changed_at DESC);

-- =========================================================
-- DISPONIBILIDAD: FUNCIÓN PARA API
-- =========================================================

CREATE OR REPLACE FUNCTION get_doctor_availability(
  p_doctor_id BIGINT,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  doctor_id BIGINT,
  slot_date DATE,
  time_slot_id BIGINT,
  start_time TIME,
  end_time TIME,
  is_available BOOLEAN
)
LANGUAGE sql
AS $$
  WITH days AS (
    SELECT d::date AS slot_date
    FROM generate_series(p_start_date::timestamp, p_end_date::timestamp, interval '1 day') g(d)
  ),
  template_slots AS (
    SELECT
      hd.doctor_id,
      dy.slot_date,
      hd.time_slot_id
    FROM days dy
    JOIN horarios_disponibles hd
      ON hd.doctor_id = p_doctor_id
     AND hd.is_enabled = TRUE
     AND hd.day_of_week = EXTRACT(DOW FROM dy.slot_date)::int
  ),
  blocked AS (
    SELECT doctor_id, block_date AS slot_date, time_slot_id
    FROM doctor_time_block
    WHERE doctor_id = p_doctor_id
      AND block_date BETWEEN p_start_date AND p_end_date
  ),
  taken AS (
    SELECT doctor_id, appointment_date AS slot_date, time_slot_id
    FROM turno
    WHERE doctor_id = p_doctor_id
      AND appointment_date BETWEEN p_start_date AND p_end_date
      AND status IN ('CONFIRMADO','REPROGRAMADO')
  )
  SELECT
    ts.doctor_id,
    ts.slot_date,
    ts.time_slot_id,
    t.start_time,
    t.end_time,
    (b.time_slot_id IS NULL AND k.time_slot_id IS NULL) AS is_available
  FROM template_slots ts
  JOIN time_slot t ON t.time_slot_id = ts.time_slot_id
  LEFT JOIN blocked b ON b.doctor_id = ts.doctor_id AND b.slot_date = ts.slot_date AND b.time_slot_id = ts.time_slot_id
  LEFT JOIN taken   k ON k.doctor_id = ts.doctor_id AND k.slot_date = ts.slot_date AND k.time_slot_id = ts.time_slot_id
  ORDER BY ts.slot_date, t.start_time;
$$;

-- =========================================================
-- RLS (OPCIONAL, RECOMENDADO PARA REDUCIR IDOR)
-- =========================================================

ALTER TABLE turno ENABLE ROW LEVEL SECURITY;
ALTER TABLE turno_cancellation ENABLE ROW LEVEL SECURITY;
ALTER TABLE turno_reschedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_time_block ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS turno_patient_select_own ON turno;
CREATE POLICY turno_patient_select_own
ON turno
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM patient p
    WHERE p.patient_id = turno.patient_id
      AND p.user_id = app_current_user_id()
  )
);

DROP POLICY IF EXISTS turno_patient_update_own ON turno;
CREATE POLICY turno_patient_update_own
ON turno
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM patient p
    WHERE p.patient_id = turno.patient_id
      AND p.user_id = app_current_user_id()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM patient p
    WHERE p.patient_id = turno.patient_id
      AND p.user_id = app_current_user_id()
  )
);

DROP POLICY IF EXISTS turno_doctor_select_own ON turno;
CREATE POLICY turno_doctor_select_own
ON turno
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM doctor d
    WHERE d.doctor_id = turno.doctor_id
      AND d.user_id = app_current_user_id()
  )
);

DROP POLICY IF EXISTS block_doctor_manage_own ON doctor_time_block;
CREATE POLICY block_doctor_manage_own
ON doctor_time_block
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM doctor d
    WHERE d.doctor_id = doctor_time_block.doctor_id
      AND d.user_id = app_current_user_id()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM doctor d
    WHERE d.doctor_id = doctor_time_block.doctor_id
      AND d.user_id = app_current_user_id()
  )
);

-- =========================================================
-- COMMENTS
-- =========================================================

COMMENT ON TABLE users IS 'Cuentas de autenticación (username/email case-insensitive + password_hash).';
COMMENT ON TABLE roles IS 'Roles de acceso (RBAC) para mínimo privilegio.';
COMMENT ON TABLE permissions IS 'Permisos atómicos asignables a roles (RBAC).';
COMMENT ON TABLE user_sessions IS 'Sesiones persistentes con refresh token hasheado y revocación.';
COMMENT ON TABLE audit_log IS 'Bitácora append-only de eventos críticos para trazabilidad y auditoría.';
COMMENT ON TABLE specialty IS 'Catálogo de especialidades médicas (code opcional para integraciones).';
COMMENT ON TABLE doctor IS 'Perfil de médico (vinculado a users) y datos profesionales.';
COMMENT ON TABLE patient IS 'Perfil de paciente (vinculado a users).';
COMMENT ON TABLE time_slot IS 'Catálogo de intervalos (slots) reutilizable.';
COMMENT ON TABLE horarios_disponibles IS 'Plantilla semanal por médico (slot habilitado por día).';
COMMENT ON TABLE doctor_time_block IS 'Bloqueos puntuales por fecha y slot.';
COMMENT ON TABLE turno IS 'Turnos/citas: paciente + médico + especialidad + fecha + slot.';
COMMENT ON TABLE turno_cancellation IS 'Detalle de cancelación por turno.';
COMMENT ON TABLE turno_reschedule IS 'Historial de reprogramación por turno.';
COMMENT ON TABLE turno_status_event IS 'Historial de cambios de estado (automático al actualizar status).';
