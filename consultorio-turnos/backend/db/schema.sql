-- schema_simplificado.sql
-- Estructura optimizada para el Sistema de Gestión de Turnos Médicos
-- Cumple con la problemática 1.0 (7 tablas esenciales)

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. TABLA: roles
CREATE TABLE IF NOT EXISTS roles (
    role_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre TEXT NOT NULL UNIQUE -- 'ADMIN', 'PACIENTE'
);

-- 2. TABLA: usuarios (Auth simple)
CREATE TABLE IF NOT EXISTS usuarios (
    usuario_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    public_id UUID DEFAULT gen_random_uuid() UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    nombre_completo TEXT NOT NULL,
    role_id BIGINT NOT NULL REFERENCES roles(role_id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. TABLA: especialidades
CREATE TABLE IF NOT EXISTS especialidades (
    especialidad_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre TEXT NOT NULL UNIQUE,
    descripcion TEXT
);

-- 4. TABLA: medicos
CREATE TABLE IF NOT EXISTS medicos (
    medico_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre TEXT NOT NULL,
    especialidad_id BIGINT NOT NULL REFERENCES especialidades(especialidad_id),
    telefono TEXT,
    activo BOOLEAN DEFAULT TRUE
);

-- 5. TABLA: franjas_horarias (Slots para el calendario)
CREATE TABLE IF NOT EXISTS franjas_horarias (
    franja_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    UNIQUE(hora_inicio, hora_fin)
);

-- 6. TABLA: horarios_disponibles (Plantilla de disponibilidad)
CREATE TABLE IF NOT EXISTS horarios_disponibles (
    horario_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    medico_id BIGINT NOT NULL REFERENCES medicos(medico_id) ON DELETE CASCADE,
    dia_semana INT NOT NULL CHECK (dia_semana BETWEEN 0 AND 6), -- 0=Dom, 6=Sab
    franja_id BIGINT NOT NULL REFERENCES franjas_horarias(franja_id),
    UNIQUE(medico_id, dia_semana, franja_id)
);

-- 7. TABLA: turnos (Gestión de citas)
CREATE TABLE IF NOT EXISTS turnos (
    turno_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    public_id UUID DEFAULT gen_random_uuid() UNIQUE,
    paciente_id BIGINT NOT NULL REFERENCES usuarios(usuario_id),
    medico_id BIGINT NOT NULL REFERENCES medicos(medico_id),
    especialidad_id BIGINT NOT NULL REFERENCES especialidades(especialidad_id),
    fecha DATE NOT NULL,
    franja_id BIGINT NOT NULL REFERENCES franjas_horarias(franja_id),
    estado TEXT NOT NULL DEFAULT 'CONFIRMADO', -- 'CONFIRMADO', 'CANCELADO', 'REPROGRAMADO'
    notas TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    -- Restricción de integridad: Un médico no puede tener dos turnos en la misma fecha y franja
    -- siempre que el turno esté confirmado o reprogramado (no cancelado)
    UNIQUE(medico_id, fecha, franja_id)
);

-- Indices para optimizar filtros de búsqueda
CREATE INDEX idx_turnos_fecha_medico ON turnos(fecha, medico_id);
CREATE INDEX idx_turnos_paciente ON turnos(paciente_id);
CREATE INDEX idx_horarios_medico ON horarios_disponibles(medico_id, dia_semana);

-- Seed data básico (opcional)
INSERT INTO roles (nombre) VALUES ('ADMIN'), ('PACIENTE') ON CONFLICT DO NOTHING;
