const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares Globales
app.use(cors());
app.use(express.json());

// Ruta de prueba
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Servidor del Consultorio funcionando' });
});

// Importación de Rutas (Para ser implementadas por el colaborador)
// app.use('/api/auth', require('./routes/auth.routes'));
// app.use('/api/turnos', require('./routes/turno.routes'));

app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
