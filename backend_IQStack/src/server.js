const express = require('express');
const cors = require('cors');
const env = require('./config/env');
const authRoutes = require('./modules/auth/authRoutes');
const adminRoutes = require('./modules/admin/adminRoutes');
const clientRoutes = require('./modules/client/clientRoutes');
const errorHandler = require('./middlewares/errorHandler');

const path = require('path');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../../web_IQStack')));

// Servir Página Principal de Entrada
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../../web_IQStack/index.html'));
});

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/client', clientRoutes);

// Manejador Global de Errores
app.use(errorHandler);

app.listen(env.port, () => {
    console.log(`[IQ STACK] Servidor backend ejecutándose en el puerto ${env.port}`);
});