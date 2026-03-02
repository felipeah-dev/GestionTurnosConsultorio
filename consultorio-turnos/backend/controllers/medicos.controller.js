// medicos.controller.js: Lógica CRUD de médicos con validaciones, asignación de especialidades y control de turnos futuros
import { getMedicosByEspecialidad } from '../models/medico.model.js';

export const obtenerMedicos = async (req, res) => {
    try {
        const { especialidad_id } = req.query;

        if (!especialidad_id) {
            return res.status(400).json({ error: 'El parámetro especialidad_id es requerido' });
        }

        const medicos = await getMedicosByEspecialidad(especialidad_id);
        res.status(200).json(medicos);
    } catch (error) {
        console.log('[obtenerMedicos]', error);
        res.status(500).json({ error: 'Error al consultar médicos' });
    }
};
