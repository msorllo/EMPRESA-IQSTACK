const express = require('express');
const router = express.Router();
const authController = require('./authController');

// Regla: La UI es "tonta", la lógica es "ciega" -> Las rutas conectan ambos
router.post('/register', (req, res, next) => authController.register(req, res, next));
router.post('/login', (req, res, next) => authController.login(req, res, next));

module.exports = router;