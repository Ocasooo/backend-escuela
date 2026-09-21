// src/modules/examen/rutas.js

const express = require('express')
const respuesta = require('../../red/respuestas.js')
const controlador = require('./index.js')
const { requiereRol } = require('../../middleware/roles.js')

const router = express.Router()

// Rutas
router.get('/', todos)
router.get('/curso/:curso_id', obtenerPorCurso)
router.get('/info/completa', examenConInfo)
router.get('/:id', uno)
router.post('/', requiereRol('profesor'), agregar)
router.put('/:id', requiereRol('profesor'), editar)
router.put('/', requiereRol('profesor'), eliminar)

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

// Handlers
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

async function examenConInfo(req, res, next) {
  try {
    const items = await controlador.examenConInfo()
    respuesta.success(req, res, items, 200)
  } catch (err) {
    next(err)
  }
}

async function agregar(req, res, next) {
  try {
    await controlador.agregar(req.body)
    respuesta.success(req, res, 'Examen agregado con éxito', 201)
  } catch (err) {
    next(err)
  }
}

async function editar(req, res, next) {
  try {
    await controlador.editar(req.params.id, req.body)
    respuesta.success(req, res, 'Examen actualizado con éxito', 200)
  } catch (err) {
    next(err)
  }
}

async function eliminar(req, res, next) {
  try {
    await controlador.eliminar(req.body)
    respuesta.success(req, res, 'Examen eliminado', 200)
  } catch (err) {
    next(err)
  }
}

module.exports = router
