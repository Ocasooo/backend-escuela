const jwt = require('jsonwebtoken')
const SECRET = process.env.JWT_SECRET || 'claveSuperSecreta'

function verificarToken(req, res, next) {
  // ✅ Estas rutas NO necesitan token
  const rutasPublicas = [
    '/api/login',
    '/api/login/token-dev'
  ]

  if (rutasPublicas.includes(req.originalUrl)) {
    return next()
  }

  // Token
  const authHeader = req.headers.authorization
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return res.status(401).json({ error: 'Token requerido' })
  }

  jwt.verify(token, SECRET, (err, usuario) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido o expirado' })
    }

    req.usuario = usuario
    next()
  })
}

module.exports = verificarToken
