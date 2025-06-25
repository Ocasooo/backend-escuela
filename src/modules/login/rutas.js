const express = require('express');
const respuesta = require('../../red/respuestas.js');
const controlador = require('./controlador')(require('../../DB/mysql.js'));

const router = express.Router();

router.post('/', login);

async function login(req, res, next) {
  try {
    const { correo, contrasena } = req.body;
    const resultado = await controlador.login({ correo, contrasena });
    respuesta.success(req, res, resultado, 200);
  } catch (err) {
    res.status(401).json({
      error: true,
      status: 401,
      body: err.message || 'Correo o contraseña incorrectos',
    });
  }
}

router.get('/token-dev', (req, res) => {
  const jwt = require('jsonwebtoken')
  const SECRET = process.env.JWT_SECRET || 'claveSuperSecreta'

  const payload = {
    id: 13,
    correo: 'franco-makula@outlook.com.ar',
    nombre: 'Franco',
    apellido: 'Makula',
    tipo: 'superadmin'
  }

  const token = jwt.sign(payload, SECRET, { expiresIn: '100y' }) // token eterno para dev
  res.json({ token })
})


module.exports = router;
