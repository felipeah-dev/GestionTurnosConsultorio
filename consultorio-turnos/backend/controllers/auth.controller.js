// auth.controller.js: Lógica de registro, login y logout: validación de credenciales, creación de JWT y gestión de sesiones
import 'dotenv/config';
import jwt from 'jsonwebtoken';
import {createUser, findUserByEmail} from "../models/auth.model.js";
import {checkPassword, hashPassword} from "../utils/auth.js";

export const registro = async (req, res) => {
    const { nombre, primer_apellido, segundo_apellido, email, password, telefono, fecha_nacimiento } = req.body;

    const userExists = await findUserByEmail(email);

    if(userExists) {
        const error = new Error('El email ya esta registrado');
        return res.status(409).json({error: error.message });
    }

    const passwordHash = await hashPassword(password);

    const newUser = await createUser({
        nombre,
        primer_apellido,
        segundo_apellido,
        email,
        password: passwordHash,
        telefono,
        fecha_nacimiento
    });

    if(!newUser) {
        const error = new Error('No se pudo registrar al usuario');
        return res.status(500).json({error: error.message});
    }

    res.status(201).json({msg: 'Usuario creado correctamente', newUser});
}

export const login = async (req, res) => {
    const { email, password } = req.body;

    const user = await findUserByEmail(email);
    if(!user) {
        const error = new Error('El usuario no existe');
        return res.status(404).json({error: error.message});
    }

    const isPasswordCorrect = await checkPassword(password, user.password_hash);
    if(!isPasswordCorrect) {
        const error = new Error('Password Incorrecto');
        return res.status(401).json({error: error.message});
    }

    const token = jwt.sign(
        { uuid: user.public_id, rol: user.role_id },
        process.env.JWT_SECRET,
        { expiresIn: '2h'}
    );

    res.status(200).json({
        token,
        nombre: user.nombre,
        email: user.email,
        rol: user.role_id
    });


}