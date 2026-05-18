// Manejo de errores global
module.exports = (err, req, res, next) => {
    console.error(err);
    res.status(500).json({
        success: false,
        message: 'Ocurrió un error interno en el servidor.',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
};