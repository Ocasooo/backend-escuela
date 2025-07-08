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

async function obtenerMaterialAlumno(alumno_id) {
  return db.customQuery(
    `SELECT c.nombre AS nombre_materia, m.observacion, m.calificacion, m.tipo
     FROM material m
     JOIN alumno_material am ON am.material_id = m.id
     JOIN curso c ON m.curso_id = c.id
     WHERE am.alumno_id = ?`,
    [alumno_id]
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

  async function actualizarCalificacion(alumno_id, calificacion, carpeta) {
    return db.customQuery(
      `UPDATE material m
      JOIN alumno_material am ON am.material_id = m.id
      SET m.calificacion = ?, m.estado = 'calificado'
      WHERE am.alumno_id = ? AND m.carpeta = ?`,
      [calificacion, alumno_id, carpeta]
    )
  }

async function agregarExamen(file, observacion, curso_id, alumno_id, calificacion) {
  if (!file || !file.buffer || !file.originalname) {
    throw new Error('Archivo inválido')
  }

  // ✅ Crear carpeta uploads/examenes si no existe
  const carpetaExamenes = path.join(__dirname, '../../uploads/examenes')
  if (!fs.existsSync(carpetaExamenes)) {
    fs.mkdirSync(carpetaExamenes, { recursive: true })
  }

  // ✅ Guardar en uploads/examenes
  const nombreArchivo = Date.now() + '-' + file.originalname
  const ruta = path.join('uploads', 'examenes', nombreArchivo)
  const rutaCompleta = path.join(__dirname, '../../', ruta)

  fs.writeFileSync(rutaCompleta, file.buffer)

  const result = await db.customQuery(
    `INSERT INTO material (observacion, archivo_scan, fecha_subida, curso_id, estado, calificacion, tipo)
     VALUES (?, ?, NOW(), ?, 'enviado', ?, 'examen')`,
    [observacion, ruta, curso_id, calificacion || '----']
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

async function obtenerExamenesAlumno(alumno_id, curso_id) {
  return db.customQuery(
    `SELECT c.nombre AS nombre_materia, m.observacion, m.calificacion
     FROM material m
     JOIN alumno_material am ON am.material_id = m.id
     JOIN curso c ON m.curso_id = c.id
     WHERE am.alumno_id = ? AND m.curso_id = ? AND m.tipo = 'examen'`,
    [alumno_id, curso_id]
  )
}

async function obtenerExamenesCurso(curso_id) {
  return db.customQuery(
    `SELECT a.dni, a.nombre, a.apellido, m.observacion, m.calificacion,m.id
     FROM material m
     JOIN alumno_material am ON am.material_id = m.id
     JOIN alumno a ON a.id = am.alumno_id
     WHERE m.curso_id = ? AND m.tipo = 'examen'`,
    [curso_id]
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

  async function eliminarPorCarpeta(carpeta) {
  // Primero obtener todos los materiales que tienen esa carpeta, para borrar archivos físicos si es necesario
  const materiales = await db.customQuery(`SELECT archivo_scan FROM material WHERE carpeta = ?`, [carpeta])

  // Eliminar archivos físicos
  materiales.forEach(mat => {
    if (mat.archivo_scan) {
      const rutaCompleta = path.join(__dirname, '../../', mat.archivo_scan)
      if (fs.existsSync(rutaCompleta)) {
        fs.unlinkSync(rutaCompleta)
      }
    }
  })

  // Borrar registros de la tabla alumno_material
  await db.customQuery(`DELETE FROM alumno_material WHERE material_id IN (SELECT id FROM material WHERE carpeta = ?)`, [carpeta])

  // Finalmente, borrar de material
  await db.customQuery(`DELETE FROM material WHERE carpeta = ?`, [carpeta])
}


  return {
    todos,
    uno,
    actualizarCalificacion,
    agregarArchivo,
    eliminar,
    upload,
    agregarEntrega,
    obtenerMaterialAlumno,
    agregarExamen,
    obtenerExamenesAlumno,
    obtenerExamenesCurso,
    eliminarPorCarpeta
  }
}
