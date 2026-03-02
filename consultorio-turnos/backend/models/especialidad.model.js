// especialidad.model.js: Consultas SQL para gestión del catálogo de especialidades médicas
import pool from "../db/connection.js";

export const all = async () => {
    const { rows } = await pool.query(`SELECT especialidad_id AS "id", nombre FROM especialidades`);
    return rows;
}