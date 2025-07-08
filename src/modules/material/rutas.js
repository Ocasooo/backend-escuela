const express = require('express')
const respuesta = require('../../red/respuestas.js')
const controlador = require('./index.js')
const path = require('path')
const fs = require('fs')

const router = express.Router()

// --- GET ---
router.get('/', todos)
router.get('/examenes/alumno/:alumno_id/curso/:curso_id', obtenerExamenesAlumno)
router.get('/examenes/curso/:curso_id', obtenerExamenesCurso)
router.get('/alumno/:id', ObtenerMaterialAlumno)
router.get('/descargar/:id', descargarArchivo)
router.get('/:id', uno)

// --- POST ---
router.post('/examen', controlador.upload.single('archivo'), agregarExamen)
router.post('/entrega', controlador.upload.single('archivo'), agregarEntrega)
router.post('/', controlador.upload.single('archivo'), agregarArchivo)

// --- PATCH ---
router.patch('/calificar', actualizarCalificacion)

// --- PUT ---
router.put('/', eliminar)
router.delete('/carpeta/:nombre', eliminarPorCarpeta)

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
      return respuesta.error(req, res, 'Archivo no encontrado', 404)
    }

    const archivo = item[0]
    const rutaArchivo = path.join(__dirname, '../../', archivo.archivo_scan)

    if (!fs.existsSync(rutaArchivo)) {
      return respuesta.error(req, res, 'Archivo no existe físicamente', 404)
    }

    res.download(rutaArchivo, archivo.observacion)
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

async function actualizarCalificacion(req,res ){
  try {
    const { id, calificacion, carpeta } = req.body

    if (!id || calificacion === undefined || !carpeta) {
      return respuesta.error(req, res, 'Faltan datos: id, calificación o carpeta', 400)
    }

    await controlador.actualizarCalificacion(id, calificacion, carpeta)

    respuesta.success(req, res, 'Calificación actualizada correctamente', 200)
  } catch (error) {
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


async function uno(req, res, next) {
  try {
    const item = await controlador.uno(req.params.id)
    respuesta.success(req, res, item, 200)
  } catch (err) {
    next(err)
  }
}

async function agregarArchivo(req, res, next) {
  try {
    const { curso_id, mensaje_id } = req.body
    const archivo = req.file

    if (!archivo) {
      return respuesta.error(req, res, 'Archivo requerido', 400)
    }

    const insertResult = await controlador.agregarArchivo(archivo, curso_id, mensaje_id)
    respuesta.success(req, res, insertResult, 201)
  } catch (err) {
    next(err)
  }
}

async function agregarEntrega(req, res, next) {
  try {
    const { observacion, carpeta, curso_id, alumno_id } = req.body
    const archivo = req.file

    if (!archivo) {
      return respuesta.error(req, res, 'Archivo requerido', 400)
    }

    if (!alumno_id) {
      return respuesta.error(req, res, 'alumno_id requerido', 400)
    }

    const insertResult = await controlador.agregarEntrega(archivo, observacion, carpeta, curso_id, alumno_id)
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
