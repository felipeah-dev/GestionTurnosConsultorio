// medico.model.js: Consultas SQL para gestión de médicos y sus especialidades asociadas
import pool from '../db/connection.js';

/**
 * Obtiene médicos activos filtrando por especialidad_id
 * El frontend pasa el especialidad_id que obtuvo de GET /api/especialidades
 */
export const getMedicosByEspecialidad = async (especialidad_id) => {
    const { rows } = await pool.query(
        `SELECT m.medico_id AS "id", m.nombre, m.primer_apellido, m.segundo_apellido, e.nombre AS "especialidad"
         FROM medicos m
         JOIN especialidades e ON e.especialidad_id = m.especialidad_id
         WHERE m.especialidad_id = $1
        AND m.activo = TRUE
         ORDER BY m.nombre`,
        [especialidad_id]
    );
    return rows;
};
