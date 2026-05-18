const bcrypt = require('bcrypt');

// Wrapper agnóstico para encriptación
class Crypto {
    async hash(password) {
        return await bcrypt.hash(password, 12);
    }

    async compare(password, hash) {
        return await bcrypt.compare(password, hash);
    }
}

module.exports = new Crypto();