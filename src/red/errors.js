const respuestas = require('./respuestas')
const multer = require('multer')

function errors(err, req, res, next) {
  console.error('[error]', err)

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return respuestas.error(req, res, 'El archivo excede el tamaño máximo permitido (15 MB)', 400)
    }
    return respuestas.error(req, res, `Error en la carga de archivo: ${err.message}`, 400)
  }

  // Si es un error MySQL, usamos sqlMessage
  const message = err.sqlMessage || err.message || 'Error interno'
  const status = err.statusCode || 500

  respuestas.error(req, res, message, status)
}

module.exports = errors
