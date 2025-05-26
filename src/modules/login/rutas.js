const express = require('express');
const respuesta = require('../../red/respuestas.js');
const controlador = require('./controlador')(require('../../DB/mysql.js'));

const router = express.Router();

router.post('/', login);

async function login(req, res, next) {
  try {
    const { Correo, Contrasena } = req.body;
    const resultado = await controlador.login({ Correo, Contrasena });
    respuesta.success(req, res, resultado, 200);
  } catch (err) {
    res.status(401).json({
      error: true,
      status: 401,
      body: err.message || 'Correo o contraseña incorrectos',
    });
  }
}

module.exports = router;
