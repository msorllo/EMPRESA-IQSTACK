const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

class Database {
    constructor() {
        this.dbPromise = open({
            filename: 'C:/Users/msorl/Desktop/IQSTACK/BASE DE DATOS/iqstack.db',
            driver: sqlite3.Database
        });
    }

    async query(text, params = []) {
        const db = await this.dbPromise;
        
        // Adaptamos los parámetros $1, $2 (PostgreSQL) a ?, ? (SQLite)
        let sqliteText = text;
        for (let i = 20; i >= 1; i--) {
             sqliteText = sqliteText.replace(new RegExp('\\$' + i + '\\b', 'g'), '?');
        }
        
        const isSelect = sqliteText.trim().toUpperCase().startsWith('SELECT');
        const isReturning = sqliteText.toUpperCase().includes('RETURNING');

        if (isSelect || isReturning) {
            // RETURNING se simula para la compatibilidad
            if(isReturning) {
                sqliteText = sqliteText.replace(/RETURNING.*/i, '');
                const result = await db.run(sqliteText, params);
                const rows = await db.all('SELECT * FROM users WHERE user_id = ?', [result.lastID]);
                return { rows };
            }
            const rows = await db.all(sqliteText, params);
            return { rows };
        } else {
            const result = await db.run(sqliteText, params);
            return { rows: [], lastID: result.lastID, changes: result.changes };
        }
    }
}

module.exports = new Database();