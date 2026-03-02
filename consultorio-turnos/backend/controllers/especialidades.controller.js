// especialidades.controller.js: Lógica CRUD de especialidades médicas con validaciones y control de dependencias activas
import {all} from "../models/especialidad.model.js";

export const obtenerEspecialidades = async (req, res) => {
    const allEspecialidades = await all();
    if(!allEspecialidades) {
        return res.status(500).json({error: 'Ocurrio al consultar los registros'})
    }

    res.status(200).json(allEspecialidades);
}