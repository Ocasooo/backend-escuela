const express = require('express')
const respuesta = require('../../red/respuestas')
const controlador = require('./index')

const router = express.Router()


router.get('/', obtenerAulas)
router.post('/', agregarAula)
router.post('/horarios', agregarHorario)
router.post('/asignar-curso-aula-horario', asignarCursoAulaHorario)
router.get('/info-completa', obtenerInfoCompleta)
router.put('/eliminar-curso-asignacion', eliminarCursoAsignacion)


async function eliminarCursoAsignacion (req, res, next){
  try {
    const { id } = req.body
    const resultado = await controlador.eliminarCursoAsignacion(id)
    respuesta.success(req, res, resultado, 200)
  } catch (error) {
    next(error)
  }
}


async function obtenerAulas(req, res, next) {
  try {
    const aulas = await controlador.obtenerAulas()
    respuesta.success(req, res, aulas, 200)
  } catch (error) {
    next(error)
  }
}

async function agregarAula(req, res, next) {
  try {
    await controlador.agregarAula(req.body)
    respuesta.success(req, res, 'Aula agregada correctamente', 201)
  } catch (error) {
    next(error)
  }
}

async function agregarHorario(req, res, next) {
  try {
    await controlador.agregarHorario(req.body)
    respuesta.success(req, res, 'Horario agregado correctamente', 201)
  } catch (error) {
    next(error)
  }
}

async function asignarCursoAulaHorario(req, res, next) {
  try {
    const result = await controlador.agregarCursoConAulaYHorario(req.body)
    respuesta.success(req, res, result, 201)
  } catch (error) {
    next(error)
  }
}

async function obtenerInfoCompleta(req, res, next) {
  try {
    const info = await controlador.obtenerInfoCompleta()
    respuesta.success(req, res, info, 200)
  } catch (error) {
    next(error)
  }
}

module.exports = router
