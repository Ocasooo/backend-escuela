const jwt = require('jsonwebtoken')
const config = require('../../config')
const SECRET = config.jwt.secret

function verificarToken(req, res, next) {
  // Rutas públicas que NO necesitan token
  const rutasPublicas = [
    '/api/login',
    '/api/material/descargar'
  ]

  // Permitir la ruta de login exacta o subrutas públicas, pero NO /api/login/token-dev ni similares
  if (req.originalUrl === '/api/login' || req.originalUrl.startsWith('/api/login?') || req.originalUrl.startsWith('/api/material/descargar')) {
    return next()
  }

  // Token de cabecera
  const authHeader = req.headers.authorization
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return res.status(401).json({ error: true, status: 401, body: 'Token requerido' })
  }

  jwt.verify(token, SECRET, (err, usuario) => {
    if (err) {
      return res.status(403).json({ error: true, status: 403, body: 'Token inválido o expirado' })
    }

    req.usuario = usuario
    req.user = usuario
    next()
  })
}

module.exports = verificarToken
