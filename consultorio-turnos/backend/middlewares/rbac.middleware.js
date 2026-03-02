// rbac.middleware.js: Middleware que verifica el rol del usuario autenticado y que el recurso le pertenece antes de permitir la operación
export const authorizeRoles = (...rolesPermitidos) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'No autenticado' });
        }

        if (!rolesPermitidos.includes(Number(req.user.rol))) {
            return res.status(403).json({ error: 'No tienes permisos para realizar esta acción' });
        }

        next();
    };
};