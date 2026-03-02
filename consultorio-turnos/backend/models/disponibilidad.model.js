// disponibilidad.model.js: Consultas SQL para obtener horarios disponibles filtrando por médico, especialidad y fecha
import pool from '../db/connection.js';

export const getFranjasDelMedico = async (medico_id, fecha) => {
    // dia_semana: 0=Dom ... 6=Sab — EXTRACT dow de PostgreSQL devuelve lo mismo
    const { rows } = await pool.query(
        `SELECT fh.franja_id, fh.hora_inicio AS hora
        FROM horarios_disponibles hd
        JOIN franjas_horarias fh 
        ON fh.franja_id = hd.franja_id
        WHERE hd.medico_id = $1
        AND hd.dia_semana = EXTRACT(DOW FROM $2::DATE)
        ORDER BY fh.hora_inicio`,
        [medico_id, fecha]
    );
    return rows;
};


export const getFranjasOcupadas = async (medico_id, fecha) => {
    const { rows } = await pool.query(
        `SELECT franja_id
        FROM turnos
        WHERE medico_id = $1
        AND fecha = $2
        AND estado IN ('CONFIRMADO', 'REPROGRAMADO')`,
        [medico_id, fecha]
    );
    return rows.map((r) => r.franja_id);
};
