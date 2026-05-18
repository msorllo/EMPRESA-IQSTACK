const jwt = require('jsonwebtoken');
const env = require('../config/env');

// Wrapper agnóstico para tokens
class Token {
    generate(payload, expiresIn = '24h') {
        return jwt.sign(payload, env.jwtSecret, { expiresIn });
    }

    verify(token) {
        try {
            return jwt.verify(token, env.jwtSecret);
        } catch (error) {
            return null;
        }
    }
}

module.exports = new Token();