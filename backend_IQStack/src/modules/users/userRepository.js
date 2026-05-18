const db = require('../../infrastructure/database');

class UserRepository {
    async findByEmail(email) {
        const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) return null;
        return result.rows[0];
    }

    async create(userParams) {
        const query = `
            INSERT INTO users (email, password_hash, role) 
            VALUES ($1, $2, $3) RETURNING user_id, email, role, created_at
        `;
        const values = [userParams.email, userParams.password_hash, userParams.role || 'Client_PYME'];
        const result = await db.query(query, values);
        return result.rows[0];
    }
}

module.exports = new UserRepository();