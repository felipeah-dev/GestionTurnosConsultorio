// auth.model.js: Consultas SQL para registro y autenticación de usuarios contra la base de datos
import pool from "../db/connection.js";

export const findUserByEmail = async (email) => {
    const { rows } = await pool.query(`SELECT * FROM usuarios WHERE email = $1`, [email]);
    return rows[0];
}

export const createUser = async (user) => {
    const query = `
        INSERT INTO usuarios(email, password_hash, nombre, primer_apellido, segundo_apellido, role_id, telefono, fecha_nacimiento) 
        VALUES ($1, $2, $3, $4, $5, 1, $6, $7)
        RETURNING email, nombre, primer_apellido, public_id`;

    const resultado = await pool.query(query, [
        user.email, user.password, user.nombre, user.primer_apellido, user.segundo_apellido, user.telefono, user.fecha_nacimiento
    ])

    return resultado.rows[0];
}