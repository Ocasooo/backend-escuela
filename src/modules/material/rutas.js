const express = require('express')
const respuesta = require('../../red/respuestas.js')
const controlador = require('./index.js')

const router = express.Router()

router.get('/', todos)
router.get('/:id', uno)
router.post('/', controlador.upload.single('archivo'), agregarArchivo)
router.put('/', eliminar)

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

    const rutaRelativa = 'uploads/' + archivo.filename

    await controlador.agregarArchivo(archivo, curso_id, mensaje_id)
    respuesta.success(req, res, 'Archivo guardado', 201)
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
