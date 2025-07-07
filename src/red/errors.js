const respuestas = require('./respuestas')

function errors(err, req, res, next) {
  console.error('[error]', err)

  // Si es un error MySQL, usamos sqlMessage
  const message = err.sqlMessage || err.message || 'Error interno'
  const status = err.statusCode || 500

  respuestas.error(req, res, message, status)
}

module.exports = errors
