const path = require('path')
const fs = require('fs')
const multer = require('multer')
const tabla = 'material'

const storage = multer.memoryStorage()
const upload = multer({ storage })

module.exports = function (dbinyectada) {
  let db = dbinyectada
  if (!db) db = require('../../DB/mysql.js')

  function todos() {
    return db.customQuery(
      `SELECT m.*, c.nombre AS curso_nombre, msg.titulo AS mensaje_titulo
       FROM material m
       LEFT JOIN curso c ON m.curso_id = c.id
       LEFT JOIN mensaje msg ON m.mensaje_id = msg.id`
    )
  }

  function uno(id) {
    return db.customQuery(
      `SELECT m.*, c.nombre AS curso_nombre, msg.titulo AS mensaje_titulo
       FROM material m
       LEFT JOIN curso c ON m.curso_id = c.id
       LEFT JOIN mensaje msg ON m.mensaje_id = msg.id
       WHERE m.id = ?`, [id]
    )
  }

  function agregarArchivo(file, curso_id, mensaje_id) {
    if (!file || !file.buffer || !file.originalname) {
      throw new Error('Archivo inválido')
    }

    const nombreArchivo = Date.now() + '-' + file.originalname
    const ruta = path.join('uploads', nombreArchivo)
    const rutaCompleta = path.join(__dirname, '../../', ruta)

    fs.writeFileSync(rutaCompleta, file.buffer)

    return db.customQuery(
      `INSERT INTO material (observacion, archivo_scan, fecha_subida, curso_id, mensaje_id)
       VALUES (?, ?, NOW(), ?, ?)`,
      [file.originalname, ruta, curso_id, mensaje_id || null]
    )
  }

  function eliminar(data) {
    return db.eliminar(tabla, data)
  }

  return {
    todos,
    uno,
    agregarArchivo,
    eliminar,
    upload
  }
}
