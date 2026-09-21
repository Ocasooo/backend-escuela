const express = require('express')
const respuesta = require('../../red/respuestas.js')
const controlador = require('./index.js')
const { requiereRol } = require('../../middleware/roles.js')

const router = express.Router()

// --- Rutas de Consulta ---
router.get('/curso/:curso_id', obtenerPorCurso)
router.get('/:id', obtenerUno)
router.get('/', todos)

// --- Rutas de Creación y Edición de Temas ---
router.post('/', controlador.upload.single('imagen'), crearTema)
router.put('/:id', controlador.upload.single('imagen'), editarTema)
router.delete('/:id', eliminarTema)

// --- Rutas de Respuestas (Anidadas o Raíz) ---
router.post('/:id/respuesta', controlador.upload.single('imagen'), crearRespuesta)
router.put('/respuesta/:id', controlador.upload.single('imagen'), editarRespuesta)
router.delete('/respuesta/:id', eliminarRespuesta)

// Controladores de rutas
async function obtenerPorCurso(req, res, next) {
  try {
    const { curso_id } = req.params
    if (!curso_id) {
      return respuesta.error(req, res, 'Falta el ID del curso', 400)
    }
    const items = await controlador.obtenerPorCurso(curso_id)
    respuesta.success(req, res, items, 200)
  } catch (err) {
    next(err)
  }
}

async function obtenerUno(req, res, next) {
  try {
    const { id } = req.params
    const item = await controlador.obtenerUno(id)
    if (!item) {
      return respuesta.error(req, res, 'Tema no encontrado', 404)
    }
    respuesta.success(req, res, item, 200)
  } catch (err) {
    next(err)
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

async function crearTema(req, res, next) {
  try {
    const resultado = await controlador.crearTema(req.body, req.file, req.usuario)
    respuesta.success(req, res, resultado, 201)
  } catch (err) {
    next(err)
  }
}

async function editarTema(req, res, next) {
  try {
    const { id } = req.params
    const resultado = await controlador.editarTema(id, req.body, req.file, req.usuario)
    respuesta.success(req, res, resultado, 200)
  } catch (err) {
    next(err)
  }
}

async function eliminarTema(req, res, next) {
  try {
    const { id } = req.params
    await controlador.eliminarTema(id, req.usuario)
    respuesta.success(req, res, 'Tema y respuestas eliminados correctamente', 200)
  } catch (err) {
    next(err)
  }
}

async function crearRespuesta(req, res, next) {
  try {
    const { id } = req.params // foro_id
    const resultado = await controlador.crearRespuesta(id, req.body, req.file, req.usuario)
    respuesta.success(req, res, resultado, 201)
  } catch (err) {
    next(err)
  }
}

async function editarRespuesta(req, res, next) {
  try {
    const { id } = req.params // respuesta_id
    const resultado = await controlador.editarRespuesta(id, req.body, req.file, req.usuario)
    respuesta.success(req, res, resultado, 200)
  } catch (err) {
    next(err)
  }
}

async function eliminarRespuesta(req, res, next) {
  try {
    const { id } = req.params // respuesta_id
    await controlador.eliminarRespuesta(id, req.usuario)
    respuesta.success(req, res, 'Respuesta eliminada correctamente', 200)
  } catch (err) {
    next(err)
  }
}

module.exports = router