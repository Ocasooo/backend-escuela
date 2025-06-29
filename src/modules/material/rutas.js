const express = require('express')
const respuesta = require('../../red/respuestas.js')
const controlador = require('./index.js')
const path = require('path')
const fs = require('fs')

const router = express.Router()

router.get('/', todos)
router.get('/:id', uno)
router.post('/', controlador.upload.single('archivo'), agregarArchivo)
router.post('/entrega', controlador.upload.single('archivo'), agregarEntrega)
router.put('/', eliminar)
router.get('/descargar/:id', descargarArchivo)

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
