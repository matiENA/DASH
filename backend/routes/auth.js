const express = require('express');
const { autenticarUsuario } = require('../utils/supabase');

function createAuthRouter() {
    const router = express.Router();

    // POST /api/auth/login — Autenticación de operadores
    router.post('/login', async (req, res) => {
        try {
            const { usuario, password } = req.body;
            if (!usuario || !password) {
                return res.status(400).json({ success: false, error: 'Debe ingresar usuario y contraseña' });
            }

            const sesion = await autenticarUsuario(usuario, password);
            res.json({
                success: true,
                usuario: sesion.usuario,
                rol: sesion.rol,
                id: sesion.id
            });
        } catch (err) {
            console.warn("⚠️ [Auth] Error en login:", err.message);
            res.status(401).json({ success: false, error: err.message || 'Credenciales inválidas' });
        }
    });

    return router;
}

module.exports = createAuthRouter;
