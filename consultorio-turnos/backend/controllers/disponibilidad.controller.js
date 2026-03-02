// disponibilidad.controller.js: Lógica para consultar horarios disponibles filtrando por especialidad, médico y fecha en tiempo real
import { getFranjasDelMedico, getFranjasOcupadas } from '../models/disponibilidad.model.js';

export const obtenerDisponibilidad = async (req, res) => {
    try {
        const { medico_id, fecha } = req.query;

        if (!medico_id || !fecha) {
            return res.status(400).json({ error: 'Los parámetros medico_id y fecha son requeridos' });
        }

        if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
            return res.status(400).json({ error: 'El formato de fecha debe ser YYYY-MM-DD' });
        }

        const [todasLasFranjas, ocupadas] = await Promise.all([
            getFranjasDelMedico(medico_id, fecha),
            getFranjasOcupadas(medico_id, fecha),
        ]);

        const ocupadasSet = new Set(ocupadas.map(String));
        const horarios_libres = todasLasFranjas.filter(
            (f) => !ocupadasSet.has(String(f.franja_id))
        );

        res.status(200).json({ fecha, horarios_libres });

    } catch (error) {
        console.error('[obtenerDisponibilidad]', error);
        res.status(500).json({ error: 'Error al consultar disponibilidad' });
    }
};
