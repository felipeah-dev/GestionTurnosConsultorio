// rateLimit.middleware.js: Configuración de rate limiting por endpoint para prevenir fuerza bruta y abuso de la API
import rateLimit from 'express-rate-limit';

export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Demasiadas peticiones, intenta más tarde' },
});

export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Demasiados intentos de autenticación, intenta más tarde' },
});

// export const turnosLimiter = rateLimit({
//     windowMs: 60 * 60 * 1000,
//     max: 20,
//     standardHeaders: true,
//     legacyHeaders: false,
//     message: { error: 'Límite de solicitudes de turno alcanzado' },
// });
