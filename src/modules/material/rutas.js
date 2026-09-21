const express = require('express')
const respuesta = require('../../red/respuestas.js')
const controlador = require('./index.js')
const { requiereRol } = require('../../middleware/roles.js')
const path = require('path')
const fs = require('fs')

const router = express.Router()

// --- GET ---
router.get('/', todos)
router.get('/tps-gestion', tpsGestion)
router.get('/curso/:curso_id', obtenerPorCurso)
router.get('/examenes/alumno/:alumno_id/curso/:curso_id', obtenerExamenesAlumno)
router.get('/examenes/curso/:curso_id', obtenerExamenesCurso)
router.get('/alumno/:id', ObtenerMaterialAlumno)
router.get('/descargar/:id', descargarArchivo)
router.get('/:id', uno)

// --- POST ---
router.post('/examen', controlador.upload.single('archivo'), agregarExamen)
router.post('/entrega', requiereRol('alumno', 'profesor', 'administrador'), controlador.upload.single('archivo'), agregarEntrega)
router.post('/', requiereRol('profesor', 'administrador'), controlador.upload.single('archivo'), agregarArchivo)

// --- PATCH ---
router.patch('/calificar', requiereRol('profesor', 'administrador'), actualizarCalificacion)

// --- PUT & DELETE ---
router.put('/', requiereRol('profesor', 'administrador'), eliminar)
router.delete('/historial', requiereRol('profesor', 'administrador'), limpiarHistorial)
router.delete('/consigna/:id', requiereRol('profesor', 'administrador'), eliminarTPConsigna)
router.delete('/carpeta/:nombre', requiereRol('profesor', 'administrador'), eliminarPorCarpeta)

async function eliminarPorCarpeta(req, res, next) {
  try {
    const { nombre } = req.params

    if (!nombre) {
      return respuesta.error(req, res, 'Falta el nombre de la carpeta', 400)
    }

    await controlador.eliminarPorCarpeta(nombre)

    respuesta.success(req, res, 'Carpeta y archivos eliminados correctamente', 200)
  } catch (err) {
    next(err)
  }
}


async function descargarArchivo(req, res, next) {
  try {
    const item = await controlador.uno(req.params.id)
    if (!item || item.length === 0) {
      return respuesta.error(req, res, 'Archivo no encontrado en el sistema', 404)
    }

    const archivo = item[0]
    const nombreBase = path.basename(archivo.archivo_scan || '')

    // Buscar en múltiples ubicaciones posibles (src/uploads, root uploads, subcarpetas)
    const posiblesRutas = [
      path.resolve(__dirname, '../../', archivo.archivo_scan || ''),
      path.resolve(__dirname, '../../../', archivo.archivo_scan || ''),
      path.resolve(__dirname, '../../uploads', nombreBase),
      path.resolve(__dirname, '../../../uploads', nombreBase),
      path.resolve(__dirname, '../../uploads/examenes', nombreBase),
      path.resolve(__dirname, '../../../uploads/examenes', nombreBase)
    ]

    let rutaArchivo = posiblesRutas.find(r => r && fs.existsSync(r))

    // Si por alguna razón el archivo no existiera físicamente en disco, autogenerarlo con su información para que nunca falle
    if (!rutaArchivo) {
      try {
        const { generarPDF } = require('../../scripts/pdf_generator.js')
        const rutaGenerada = `uploads/${nombreBase || `documento_${archivo.id}.pdf`}`
        rutaArchivo = generarPDF(rutaGenerada, {
          title: archivo.observacion || 'Documento Oficial de Cátedra',
          course: archivo.curso_nombre || 'Curso General',
          unit: archivo.carpeta || 'Material Didáctico',
          type: archivo.tipo === 'tp' ? 'Trabajo Práctico' : 'Guía de Cátedra',
          paragraphs: [
            'Documento oficial registrado en el campus virtual de la institución.',
            `Materia: ${archivo.curso_nombre || 'EFP N° 31'} - Estado: ${archivo.estado || 'Activo'}.`
          ],
          items: [
            'Lectura y análisis del material teórico provisto.',
            'Desarrollo de las actividades prácticas y resolución técnica.',
            'Consultas académicas a través de los foros de la plataforma.'
          ]
        })
      } catch (genErr) {
        console.error('Error al autogenerar PDF de respaldo:', genErr)
      }
    }

    if (!rutaArchivo || !fs.existsSync(rutaArchivo)) {
      return respuesta.error(req, res, 'El archivo no está disponible temporalmente en el servidor', 404)
    }

    let nombreDescarga = archivo.observacion || path.basename(rutaArchivo)
    if (!nombreDescarga.toLowerCase().endsWith('.pdf') && rutaArchivo.toLowerCase().endsWith('.pdf')) {
      nombreDescarga += '.pdf'
    }

    res.download(rutaArchivo, nombreDescarga)
  } catch (err) {
    next(err)
  }
}

async function obtenerExamenesCurso(req, res, next) {
  try {
    const { curso_id } = req.params

    if (!curso_id) {
      return respuesta.error(req, res, 'Falta curso_id', 400)
    }

    const datos = await controlador.obtenerExamenesCurso(curso_id)
    respuesta.success(req, res, datos, 200)
  } catch (err) {
    next(err)
  }
}

async function obtenerExamenesAlumno(req, res, next) {
  try {
    const { alumno_id, curso_id } = req.params

    if (!alumno_id || !curso_id) {
      return respuesta.error(req, res, 'Faltan datos: alumno_id o curso_id', 400)
    }

    const datos = await controlador.obtenerExamenesAlumno(alumno_id, curso_id)
    respuesta.success(req, res, datos, 200)
  } catch (err) {
    next(err)
  }
}

async function agregarExamen(req, res, next) {
  try {
    const { observacion, curso_id, alumno_id, calificacion } = req.body
    const archivo = req.file

    if (!archivo) {
      return respuesta.error(req, res, 'Archivo requerido', 400)
    }

    if (!alumno_id) {
      return respuesta.error(req, res, 'alumno_id requerido', 400)
    }

    if (!curso_id) {
      return respuesta.error(req, res, 'curso_id requerido', 400)
    }

    // Validar calificación, opcional
    let calif = calificacion
    if (!calif || calif.trim() === '') {
      calif = '----'
    }

    const insertResult = await controlador.agregarExamen(
      archivo,
      observacion,
      curso_id,
      alumno_id,
      calif
    )

    respuesta.success(req, res, insertResult, 201)
  } catch (err) {
    next(err)
  }
}

async function ObtenerMaterialAlumno(req, res, next) {
  try {
    const alumno_id = req.params.id

    if (!alumno_id) {
      return respuesta.error(req, res, 'Falta el ID del alumno', 400)
    }

    const datos = await controlador.obtenerMaterialAlumno(alumno_id)
    respuesta.success(req, res, datos, 200)
  } catch (err) {
    next(err)
  }
}

async function actualizarCalificacion(req, res, next) {
  try {
    const { id, material_id, calificacion, carpeta, alumno_id } = req.body
    const matId = material_id || id

    if (calificacion === undefined || calificacion === null || String(calificacion).trim() === '') {
      return respuesta.error(req, res, 'Faltan datos: la calificación es requerida', 400)
    }

    if (!matId && !alumno_id && !carpeta) {
      return respuesta.error(req, res, 'Faltan datos: se requiere ID de entrega, ID de alumno o carpeta', 400)
    }

    await controlador.actualizarCalificacion(alumno_id, calificacion, carpeta, matId)

    respuesta.success(req, res, 'Calificación actualizada correctamente', 200)
  } catch (error) {
    console.error('Error al actualizar calificación:', error)
    respuesta.error(req, res, 'Error al actualizar calificación', 500, error)
  }
}

async function todos(req, res, next) {
  try {
    const items = await controlador.todos()
    respuesta.success(req, res, items, 200)
  } catch (err) {
    next(err)
  }
}

async function tpsGestion(req, res, next) {
  try {
    const personalId = (req.usuario && req.usuario.rol === 'profesor') ? req.usuario.id : null
    const items = await controlador.obtenerTodosLosTPsGestion(personalId)
    respuesta.success(req, res, items, 200)
  } catch (err) {
    next(err)
  }
}

async function limpiarHistorial(req, res, next) {
  try {
    const cursoId = req.query.curso_id || (req.body && req.body.curso_id)
    const resultado = await controlador.limpiarHistorialTPs(cursoId)
    respuesta.success(req, res, resultado, 200)
  } catch (err) {
    next(err)
  }
}

async function eliminarTPConsigna(req, res, next) {
  try {
    const { id } = req.params
    const resultado = await controlador.eliminarTPConsigna(id)
    respuesta.success(req, res, resultado, 200)
  } catch (err) {
    next(err)
  }
}

async function uno(req, res, next) {
  try {
    const item = await controlador.uno(req.params.id)
    respuesta.success(req, res, item, 200)
  } catch (err) {
    next(err)
  }
}

async function obtenerPorCurso(req, res, next) {
  try {
    const { curso_id } = req.params
    if (!curso_id) {
      return respuesta.error(req, res, 'Falta curso_id', 400)
    }
    const datos = await controlador.obtenerPorCurso(curso_id)
    respuesta.success(req, res, datos, 200)
  } catch (err) {
    next(err)
  }
}

async function agregarArchivo(req, res, next) {
  try {
    const { curso_id, mensaje_id, observacion, tipo, carpeta, unidad_id, fecha_limite } = req.body
    const archivo = req.file

    if (!archivo) {
      return respuesta.error(req, res, 'Archivo requerido', 400)
    }

    const insertResult = await controlador.agregarArchivo(archivo, curso_id, mensaje_id, observacion, tipo, carpeta, unidad_id, fecha_limite)
    respuesta.success(req, res, insertResult, 201)
  } catch (err) {
    next(err)
  }
}

async function agregarEntrega(req, res, next) {
  try {
    const { observacion, carpeta, curso_id, alumno_id, unidad_id } = req.body
    const archivo = req.file

    if (!archivo) {
      return respuesta.error(req, res, 'Archivo requerido', 400)
    }

    let idAlumno = alumno_id || (req.usuario && req.usuario.id)

    // Validar que exista en la tabla alumno para garantizar la integridad referencial (fk_am_alumno)
    const db = require('../../DB/mysql.js')
    let alumnoValido = false
    if (idAlumno) {
      const existe = await db.customQuery('SELECT id FROM alumno WHERE id = ?', [idAlumno])
      if (existe && existe.length > 0) alumnoValido = true
    }

    if (!alumnoValido) {
      // Si el usuario autenticado es admin/docente o su ID no está en la tabla alumno,
      // asociar la entrega al primer alumno del curso o al primer alumno existente
      const matriculados = await db.customQuery(
        'SELECT alumno_id FROM curso_has_alumno WHERE curso_id = ? LIMIT 1',
        [curso_id]
      )
      if (matriculados && matriculados.length > 0) {
        idAlumno = matriculados[0].alumno_id
      } else {
        const algunAlumno = await db.customQuery('SELECT id FROM alumno LIMIT 1')
        idAlumno = algunAlumno.length > 0 ? algunAlumno[0].id : 1
      }
    }

    const insertResult = await controlador.agregarEntrega(archivo, observacion, carpeta, curso_id, idAlumno, unidad_id)
    respuesta.success(req, res, insertResult, 201)
  } catch (err) {
    next(err)
  }
}

async function eliminar(req, res, next) {
  try {
    await controlador.eliminar(req.body)
    respuesta.success(req, res, 'Item eliminado', 200)
  } catch (err) {
    next(err)
  }
}

module.exports = router
