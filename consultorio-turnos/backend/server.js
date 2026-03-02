import express from 'express';
import cors  from 'cors';
import 'dotenv/config';
import { registro, login } from "./controllers/auth.controller.js";
import {obtenerEspecialidades} from "./controllers/especialidades.controller.js";
import {obtenerMedicos} from "./controllers/medicos.controller.js";
import {obtenerDisponibilidad} from "./controllers/disponibilidad.controller.js";
import {actualizarEstadoTurno, crearTurno, obtenerTurnosPaciente} from "./controllers/turnos.controller.js";
import {verifyToken} from "./middlewares/auth.middleware.js";
import {authorizeRoles} from "./middlewares/rbac.middleware.js";
import { authLimiter, apiLimiter } from "./middlewares/rateLimit.middleware.js";

const app = express();
const PORT = process.env.PORT || 4000;

// Middlewares Globales
app.use(cors());
app.use(express.json());

app.use('/api', apiLimiter); // ← aplica a todas las rutas /api

app.post('/api/auth/register', authLimiter, registro);
app.post('/api/auth/login', authLimiter, login);

app.get('/api/especialidades', obtenerEspecialidades);
app.get('/api/medicos', obtenerMedicos);
app.get('/api/disponibilidad', obtenerDisponibilidad);

app.post('/api/turnos', verifyToken, authorizeRoles(2), crearTurno);
app.get('/api/paciente/turnos', verifyToken, authorizeRoles(2), obtenerTurnosPaciente);
app.patch('/api/turnos/:id', verifyToken, authorizeRoles(1, 2), actualizarEstadoTurno);


app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
