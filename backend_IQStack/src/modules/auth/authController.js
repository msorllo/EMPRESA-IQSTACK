const authService = require('./authService');

class AuthController {
    async register(req, res, next) {
        try {
            const { email, password, role } = req.body;
            
            // Early Return Pattern
            if (!email || !password) {
                return res.status(400).json({ success: false, message: 'Email y contraseña son obligatorios.' });
            }

            const newUser = await authService.register(email, password, role);
            return res.status(201).json({ success: true, data: newUser });
        } catch (error) {
            // Manejo de errores controlados
            if(error.message === 'El correo ya está registrado.') {
                return res.status(409).json({ success: false, message: error.message });
            }
            next(error);
        }
    }

    async login(req, res, next) {
        try {
            const { email, password } = req.body;

            // Early Return Pattern
            if (!email || !password) {
                return res.status(400).json({ success: false, message: 'Email y contraseña son obligatorios.' });
            }

            const data = await authService.login(email, password);
            return res.status(200).json({ success: true, data });
        } catch (error) {
            if(error.message === 'Credenciales inválidas.') {
                return res.status(401).json({ success: false, message: error.message });
            }
            next(error);
        }
    }
}

module.exports = new AuthController();