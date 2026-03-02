import express from 'express';
import 'dotenv/config';
import { body } from 'express-validator';
import cors  from 'cors';
import { registro, login } from "./controllers/auth.controller.js";
import {obtenerEspecialidades} from "./controllers/especialidades.controller.js";
import {obtenerMedicos} from "./controllers/medicos.controller.js";
import {obtenerDisponibilidad} from "./controllers/disponibilidad.controller.js";
import {actualizarEstadoTurno, crearTurno, obtenerTurnosPaciente} from "./controllers/turnos.controller.js";
import {verifyToken} from "./middlewares/auth.middleware.js";
import {authorizeRoles} from "./middlewares/rbac.middleware.js";
import { authLimiter, apiLimiter } from "./middlewares/rateLimit.middleware.js";
import {InputErrors} from "./middlewares/validation.js";

const app = express();
const PORT = process.env.PORT || 4000;

// Middlewares Globales
app.use(cors());
app.use(express.json());

app.use('/api', apiLimiter); // ← aplica a todas las rutas /api

app.post('/api/auth/register',
    body('nombre')
        .notEmpty().withMessage('El nombre es obligatorio')
        .isLength({ min: 3, max: 50 }),
    body('primer_apellido')
        .notEmpty().withMessage('El primer apellido es obligatorio')
        .isLength({ min: 3, max: 50 }),
    body('segundo_apellido')
        .optional()
        .isLength({ min: 3, max: 50 }),
    body('email')
        .notEmpty().withMessage('El e-mail es obligatorio')
        .isEmail().withMessage('E-mail inválido')
        .normalizeEmail(),
    body('password')
        .isLength({ min: 6 }).withMessage('El password debe tener mínimo 6 caracteres'),
    body('telefono')
        .matches(/^\d{10}$/).withMessage('El teléfono debe tener 10 dígitos'),
    body('fecha_nacimiento')
        .isDate().withMessage('Fecha inválida'),
    InputErrors,
    authLimiter,
    registro
);
app.post('/api/auth/login',
    body('email')
        .notEmpty().withMessage('El e-mail es obligatorio')
        .isEmail().withMessage('E-mail inválido')
        .normalizeEmail(),
    body('password')
        .notEmpty().withMessage('El password es obligatorio'),
    InputErrors,
    authLimiter,
    login);

app.get('/api/especialidades', obtenerEspecialidades);
app.get('/api/medicos', obtenerMedicos);
app.get('/api/disponibilidad', obtenerDisponibilidad);

app.post('/api/turnos', verifyToken, authorizeRoles(2), crearTurno);
app.get('/api/paciente/turnos', verifyToken, authorizeRoles(2), obtenerTurnosPaciente);
app.patch('/api/turnos/:id', verifyToken, authorizeRoles(1, 2), actualizarEstadoTurno);


app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
