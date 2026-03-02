// turno.model.js: Consultas SQL para crear, cancelar, reprogramar y consultar turnos con bloqueo pesimista
import pool from '../db/connection.js';

/**
 * Verifica si una franja ya está ocupada para ese médico/fecha (CONFIRMADO o REPROGRAMADO)
 */
export const isFranjaOcupada = async (medico_id, fecha, franja_id) => {
    const { rows } = await pool.query(
        `SELECT 1 FROM turnos
     WHERE medico_id = $1
       AND fecha = $2
       AND franja_id = $3
       AND estado IN ('CONFIRMADO', 'REPROGRAMADO')
     LIMIT 1`,
        [medico_id, fecha, franja_id]
    );
    return rows.length > 0;
};

/**
 * Inserta un nuevo turno. Retorna el turno creado con public_id.
 */
export const createTurno = async ({ paciente_id, medico_id, especialidad_id, fecha, franja_id }) => {
    const { rows } = await pool.query(
        `INSERT INTO turnos (paciente_id, medico_id, especialidad_id, fecha, franja_id, estado)
     VALUES ($1, $2, $3, $4, $5, 'CONFIRMADO')
     RETURNING
       public_id,
       fecha,
       estado,
       created_at`,
        [paciente_id, medico_id, especialidad_id, fecha, franja_id]
    );
    return rows[0];
};

/**
 * Obtiene el historial de turnos de un paciente (por usuario_id interno)
 */
export const getTurnosByPaciente = async (paciente_id) => {
    const { rows } = await pool.query(
        `SELECT
       t.public_id                                        AS "turno_id",
       m.nombre || ' ' || m.primer_apellido              AS "medico",
       e.nombre                                           AS "especialidad",
       t.fecha,
       fh.hora_inicio                                     AS "hora",
       t.estado
     FROM turnos t
     JOIN medicos m       ON m.medico_id       = t.medico_id
     JOIN especialidades e ON e.especialidad_id = t.especialidad_id
     JOIN franjas_horarias fh ON fh.franja_id  = t.franja_id
     WHERE t.paciente_id = $1
     ORDER BY t.fecha DESC, fh.hora_inicio DESC`,
        [paciente_id]
    );
    return rows;
};

/**
 * Busca un turno por public_id — incluye paciente_id para validar pertenencia
 */
export const getTurnoByPublicId = async (public_id) => {
    const { rows } = await pool.query(
        `SELECT turno_id, public_id, paciente_id, estado
     FROM turnos
     WHERE public_id = $1`,
        [public_id]
    );
    return rows[0];
};

/**
 * Actualiza el estado de un turno
 */
export const updateEstadoTurno = async (turno_id, estado) => {
    const { rows } = await pool.query(
        `UPDATE turnos
     SET estado = $1
     WHERE turno_id = $2
     RETURNING public_id, estado`,
        [estado, turno_id]
    );
    return rows[0];
};
