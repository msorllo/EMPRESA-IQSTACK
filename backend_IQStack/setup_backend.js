const fs = require('fs');
const path = require('path');

const baseDir = path.join(__dirname, 'src');

const dirs = [
    'config',
    'infrastructure',
    'middlewares',
    'modules/auth',
    'modules/users'
];

dirs.forEach(d => fs.mkdirSync(path.join(baseDir, d), { recursive: true }));

const files = {
    '.env': `PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=admin
DB_NAME=iqstack
JWT_SECRET=super_secret_eco_key_2026
`,
    'src/config/env.js': `require('dotenv').config();

module.exports = {
    port: process.env.PORT || 3000,
    db: {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    },
    jwtSecret: process.env.JWT_SECRET
};`,

    'src/infrastructure/database.js': `const { Pool } = require('pg');
const env = require('../config/env');

// Wrapper agnóstico para la base de datos
class Database {
    constructor() {
        this.pool = new Pool({
            host: env.db.host,
            port: env.db.port,
            user: env.db.user,
            password: env.db.password,
            database: env.db.database,
        });
    }

    async query(text, params) {
        return await this.pool.query(text, params);
    }
}

module.exports = new Database();`,

    'src/infrastructure/crypto.js': `const bcrypt = require('bcrypt');

// Wrapper agnóstico para encriptación
class Crypto {
    async hash(password) {
        return await bcrypt.hash(password, 12);
    }

    async compare(password, hash) {
        return await bcrypt.compare(password, hash);
    }
}

module.exports = new Crypto();`,

    'src/infrastructure/token.js': `const jwt = require('jsonwebtoken');
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

module.exports = new Token();`,

    'src/middlewares/errorHandler.js': `// Manejo de errores global
module.exports = (err, req, res, next) => {
    console.error(err);
    res.status(500).json({
        success: false,
        message: 'Ocurrió un error interno en el servidor.',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
};`,

    'src/modules/users/userRepository.js': `const db = require('../../infrastructure/database');

class UserRepository {
    async findByEmail(email) {
        const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) return null;
        return result.rows[0];
    }

    async create(userParams) {
        const query = \`
            INSERT INTO users (email, password_hash, role) 
            VALUES ($1, $2, $3) RETURNING user_id, email, role, created_at
        \`;
        const values = [userParams.email, userParams.password_hash, userParams.role || 'Client_PYME'];
        const result = await db.query(query, values);
        return result.rows[0];
    }
}

module.exports = new UserRepository();`,

    'src/modules/auth/authService.js': `const userRepository = require('../users/userRepository');
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

module.exports = new AuthService();`,

    'src/modules/auth/authController.js': `const authService = require('./authService');

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

module.exports = new AuthController();`,

    'src/modules/auth/authRoutes.js': `const express = require('express');
const router = express.Router();
const authController = require('./authController');

// Regla: La UI es "tonta", la lógica es "ciega" -> Las rutas conectan ambos
router.post('/register', (req, res, next) => authController.register(req, res, next));
router.post('/login', (req, res, next) => authController.login(req, res, next));

module.exports = router;`,

    'src/server.js': `const express = require('express');
const cors = require('cors');
const env = require('./config/env');
const authRoutes = require('./modules/auth/authRoutes');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Rutas
app.use('/api/auth', authRoutes);

// Manejador Global de Errores
app.use(errorHandler);

app.listen(env.port, () => {
    console.log(\`[IQ STACK] Servidor backend ejecutándose en el puerto \${env.port}\`);
});`
};

for (const [filepath, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(__dirname, filepath), content);
}

console.log("Backend scaffolded successfully!");
