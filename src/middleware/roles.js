// src/middleware/roles.js

function normalizarRol(rol) {
  if (!rol) return ''
  const r = rol.toLowerCase().trim()
  if (r === 'admin' || r === 'administrador') return 'administrador'
  if (r === 'docente' || r === 'profesor') return 'profesor'
  if (r === 'estudiante' || r === 'alumno') return 'alumno'
  return r
}

/**
 * Middleware para requerir uno o más roles.
 * Si la ruta permite 'profesor', los usuarios con rol 'administrador' también tienen acceso automáticamente.
 */
function requiereRol(...rolesPermitidos) {
  const rolesNormalizados = rolesPermitidos.map(normalizarRol)

  return (req, res, next) => {
    const usuario = req.usuario || req.user

    if (!usuario) {
      return res.status(401).json({
        error: true,
        status: 401,
        body: 'No autenticado: se requiere iniciar sesión'
      })
    }

    const rolUsuario = normalizarRol(usuario.ocupacion || usuario.rol || usuario.tipo)

    // Si el usuario es administrador, tiene acceso completo a todas las rutas y operaciones
    if (rolUsuario === 'administrador') {
      return next()
    }

    if (rolesNormalizados.includes(rolUsuario)) {
      return next()
    }

    return res.status(403).json({
      error: true,
      status: 403,
      body: `Acceso denegado: se requiere uno de los siguientes roles: [${rolesPermitidos.join(', ')}]. Tu rol actual es: ${usuario.ocupacion || 'sin rol'}`
    })
  }
}

module.exports = {
  requiereRol,
  normalizarRol
}
