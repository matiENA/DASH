const express = require('express');
const { autenticarUsuario } = require('../utils/supabase');

function createAuthRouter() {
    const router = express.Router();

    // POST /api/auth/login — Autenticación de usuarios
    router.post('/login', async (req, res) => {
        try {
            const { usuario, password } = req.body;
            if (!usuario) {
                return res.status(400).json({ success: false, error: 'Usuario requerido' });
            }

            console.log(`🔐 [Auth] Intento de login para usuario: ${usuario}`);
            const user = await autenticarUsuario(usuario, password);

            if (!user) {
                return res.status(401).json({ success: false, error: 'Credenciales inválidas' });
            }

            res.json({
                success: true,
                user: {
                    id: user.id,
                    usuario: user.usuario,
                    rol: user.rol || 'operador'
                }
            });
        } catch (err) {
            console.error("❌ Error en POST /api/auth/login:", err.message);
            res.status(401).json({ success: false, error: 'Credenciales inválidas o error de autenticación' });
        }
    });

    // GET /api/auth/verify — Verificación rápida de estado
    router.get('/verify', (req, res) => {
        res.json({ success: true, status: 'active' });
    });

    return router;
}

module.exports = createAuthRouter;
