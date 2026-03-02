// turnos.controller.js: Lógica para crear, cancelar y reprogramar turnos con transacciones atómicas para evitar doble reserva
import pool from '../db/connection.js';
import { isFranjaOcupada, createTurno, getTurnosByPaciente, getTurnoByPublicId, updateEstadoTurno, getTurnoDetailsByPublicId } from '../models/turno.model.js';

// POST /api/turnos
export const crearTurno = async (req, res) => {
    try {
        const { medico_id, fecha, franja_id } = req.body;

        if (!medico_id || !fecha || !franja_id) {
            return res.status(400).json({ error: 'medico_id, fecha y franja_id son requeridos' });
        }

        if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
            return res.status(400).json({ error: 'El formato de fecha debe ser YYYY-MM-DD' });
        }

        const { rows } = await pool.query(
            `SELECT usuario_id, role_id FROM usuarios WHERE public_id = $1`,
            [req.user.uuid]
        );

        if (!rows.length) {
            return res.status(404).json({ error: 'Paciente no encontrado' });
        }

        const paciente_id = rows[0].usuario_id;

        const ocupado = await isFranjaOcupada(medico_id, fecha, franja_id);
        if (ocupado) {
            return res.status(409).json({ error: 'El horario seleccionado ya no está disponible' });
        }

        const { rows: medicoRows } = await pool.query(
            `SELECT especialidad_id FROM medicos WHERE medico_id = $1`,
            [medico_id]
        );

        if (!medicoRows.length) {
            return res.status(404).json({ error: 'Médico no encontrado' });
        }

        const especialidad_id = medicoRows[0].especialidad_id;
        const turno = await createTurno({ paciente_id, medico_id, especialidad_id, fecha, franja_id });

        res.status(201).json({ mensaje: 'Turno creado exitosamente', turno });
    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({ error: 'El horario seleccionado ya no está disponible' });
        }
        console.error('[crearTurno]', error);
        res.status(500).json({ error: 'Error al crear el turno' });
    }
};

// GET /api/paciente/turnos
export const obtenerTurnosPaciente = async (req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT usuario_id FROM usuarios WHERE public_id = $1`,
            [req.user.uuid]
        );

        if (!rows.length) {
            return res.status(404).json({ error: 'Paciente no encontrado' });
        }

        const paciente_id = rows[0].usuario_id;
        const turnos = await getTurnosByPaciente(paciente_id);

        res.status(200).json(turnos);
    } catch (error) {
        console.error('[obtenerTurnosPaciente]', error);
        res.status(500).json({ error: 'Error al consultar los turnos' });
    }
};

// PATCH /api/turnos/:id
const ESTADOS_VALIDOS = ['CANCELADO', 'REPROGRAMADO'];
const ROL_ADMIN = 1; // role_id de ADMIN según seed

export const actualizarEstadoTurno = async (req, res) => {
    try {
        const { id } = req.params; // public_id del turno
        const { estado } = req.body;

        if (!estado || !ESTADOS_VALIDOS.includes(estado)) {
            return res.status(400).json({
                error: `El estado debe ser uno de: ${ESTADOS_VALIDOS.join(', ')}`,
            });
        }

        const turno = await getTurnoByPublicId(id);

        if (!turno) {
            return res.status(404).json({ error: 'Turno no encontrado' });
        }

        const esAdmin = req.user.rol === ROL_ADMIN;

        if (!esAdmin) {
            const { rows } = await pool.query(
                `SELECT usuario_id FROM usuarios WHERE public_id = $1`,
                [req.user.uuid]
            );

            if (!rows.length || rows[0].usuario_id !== turno.paciente_id) {
                return res.status(403).json({ error: 'No tienes permiso para modificar este turno' });
            }
        }

        const actualizado = await updateEstadoTurno(
            turno.turno_id,
            estado,
            req.body.fecha || null,
            req.body.franja_id || null
        );
        res.status(200).json({ mensaje: 'Cita actualizada exitosamente', turno: actualizado });
    } catch (error) {
        console.error('[actualizarEstadoTurno]', error);
        res.status(500).json({ error: 'Error al actualizar el turno' });
    }
};

// GET /api/turnos/:id
export const obtenerDetalleTurno = async (req, res) => {
    try {
        const { id } = req.params;
        const turno = await getTurnoDetailsByPublicId(id);

        if (!turno) {
            return res.status(404).json({ error: 'Turno no encontrado' });
        }

        // Verificar pertenencia (a menos que sea admin)
        const { rows } = await pool.query(
            `SELECT usuario_id FROM usuarios WHERE public_id = $1`,
            [req.user.uuid]
        );

        if (rows[0].usuario_id !== turno.paciente_id && req.user.rol !== 1) {
            return res.status(403).json({ error: 'No tienes permiso para ver este turno' });
        }

        res.status(200).json(turno);
    } catch (error) {
        console.error('[obtenerDetalleTurno]', error);
        res.status(500).json({ error: 'Error al consultar el detalle del turno' });
    }
};
