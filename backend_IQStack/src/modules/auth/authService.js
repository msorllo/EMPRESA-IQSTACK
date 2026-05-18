const userRepository = require('../users/userRepository');
const crypto = require('../../infrastructure/crypto');
const token = require('../../infrastructure/token');

class AuthService {
    async register(email, password, role) {
        const existingUser = await userRepository.findByEmail(email);
        if (existingUser) {
            throw new Error('El correo ya está registrado.');
        }

        const password_hash = await crypto.hash(password);
        const newUser = await userRepository.create({ email, password_hash, role });
        
        return newUser;
    }

    async login(email, password) {
        const user = await userRepository.findByEmail(email);
        if (!user) {
            throw new Error('Credenciales inválidas.');
        }

        const isMatch = await crypto.compare(password, user.password_hash);
        if (!isMatch) {
            throw new Error('Credenciales inválidas.');
        }

        const payload = {
            userId: user.user_id,
            role: user.role
        };

        const authToken = token.generate(payload);
        
        // Principio de Inmutabilidad: Devolvemos un nuevo objeto sin la contraseña
        const { password_hash, ...userWithoutPassword } = user;
        
        return { user: userWithoutPassword, token: authToken };
    }
}

module.exports = new AuthService();