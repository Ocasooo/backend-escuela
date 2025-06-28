const express = require('express')
const respuesta = require('../../red/respuestas.js')
const controlador = require('./index.js')

const router = express.Router()

router.get('/', todos)
router.get('/curso/:cursoId', porCurso)
router.get('/:id', uno)
router.post('/guardar', guardarHTML)
router.delete('/', eliminar)

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

async function porCurso(req, res, next) {
  try {
    const item = await controlador.porCursoId(req.params.cursoId)
    if (!item) return respuesta.error(req, res, 'No encontrado', 404)
    respuesta.success(req, res, item, 200)
  } catch (err) {
    next(err)
  }
}

async function guardarHTML(req, res, next) {
  try {
    await controlador.guardar(req.body)
    respuesta.success(req, res, 'Curso HTML guardado o actualizado', 200)
  } catch (err) {
    next(err)
  }
}

async function eliminar(req, res, next) {
  try {
    await controlador.eliminar(req.body)
    respuesta.success(req, res, 'Curso HTML eliminado', 200)
  } catch (err) {
    next(err)
  }
}

module.exports = router
