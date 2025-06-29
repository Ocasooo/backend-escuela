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
      `SELECT m.*,am.*, c.nombre AS curso_nombre, msg.asunto AS mensaje_titulo
      FROM material m
      LEFT JOIN curso c ON m.curso_id = c.id
      LEFT JOIN mensaje msg ON m.mensaje_id = msg.id
      JOIN alumno_material am ON am.material_id = m.id`
    )
  }


  function uno(id) {
    return db.customQuery(
      `SELECT m.*, c.nombre AS curso_nombre, msg.asunto AS mensaje_titulo
      FROM material m
      LEFT JOIN curso c ON m.curso_id = c.id
      LEFT JOIN mensaje msg ON m.mensaje_id = msg.id
      WHERE m.id = ?`, [id]
    )
  }

  async function agregarArchivo(file, curso_id, mensaje_id) {
    if (!file || !file.buffer || !file.originalname) {
      throw new Error('Archivo inválido')
    }

    const nombreArchivo = Date.now() + '-' + file.originalname
    const ruta = path.join('uploads', nombreArchivo)
    const rutaCompleta = path.join(__dirname, '../../', ruta)

    fs.writeFileSync(rutaCompleta, file.buffer)

    const result = await db.customQuery(
      `INSERT INTO material (observacion, archivo_scan, fecha_subida, curso_id, mensaje_id)
      VALUES (?, ?, NOW(), ?, ?)`,  
      [file.originalname, ruta, curso_id, mensaje_id || null]
    )

    return {
      id: result.insertId,     // ✅ Devuelve el ID insertado
      archivo_scan: ruta       // ✅ Devuelve la ruta relativa
    }
  }

  async function agregarEntrega(file, observacion, carpeta, curso_id, alumno_id,estado) {
  if (!file || !file.buffer || !file.originalname) {
    throw new Error('Archivo inválido')
  }

  const nombreArchivo = Date.now() + '-' + file.originalname
  const ruta = path.join('uploads', nombreArchivo)
  const rutaCompleta = path.join(__dirname, '../../', ruta)

  fs.writeFileSync(rutaCompleta, file.buffer)

  const result = await db.customQuery(
    `INSERT INTO material (observacion, carpeta, archivo_scan, fecha_subida, curso_id, estado,calificacion)
     VALUES (?, ?, ?, NOW(), ? , 'enviado', '----')`,
    [observacion, carpeta, ruta, curso_id || null]
  )

  const materialId = result.insertId

  await db.customQuery(
    `INSERT INTO alumno_material (alumno_id, material_id) VALUES (?, ?)`,
    [alumno_id, materialId]
  )

  return {
    id: materialId,
    archivo_scan: ruta
  }
}


  function eliminar(data) {
    return db.eliminar(tabla, data)
  }

  return {
    todos,
    uno,
    agregarArchivo,
    eliminar,
    upload,
    agregarEntrega
  }
}
