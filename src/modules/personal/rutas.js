const express = require('express')
const respuesta = require('../../red/respuestas.js')//importamos las repuestas
const controlador = require('./index.js')
const router = express.Router()
const multer = require('multer')
const upload = multer({ storage: multer.memoryStorage() })

//Rutas urls
router.post('/subir-imagen', upload.single('imagen'), subirImagen)
router.patch('/editarDatosPersonales',express.json(), editarDatosPersonales)
router.patch('/editar',express.json(), editar)
router.get('/',todos)
router.patch('/cambiar-contrasena', cambiarContrasena)
router.post('/', agregar)
router.put('/',eliminar)
router.get('/:id',uno)


//funcionalidad
async function todos (req,res,next){
    try{
        const items = await controlador.todos()
            respuesta.success(req,res,items,200)
    }catch(err){
        next(err)
    }
    
}

async function editarDatosPersonales(req, res, next) {
  try {
    const { id, nombre, apellido, correo, telefono } = req.body

    const datos = {
      nombre,
      apellido,
      correo,
      telefono
    }

    const resultado = await controlador.editarDatosPersonales(id, datos)
    respuesta.success(req, res, resultado, 200)
  } catch (error) {
    next(error)
  }
}

async function editar(req, res, next) {
  try {
    const { id, nombre, apellido, correo, telefono,ocupacion,fecha_nacimiento,dni } = req.body

    const datos = {
      nombre,
      apellido,
      correo,
      telefono,
      ocupacion,
      fecha_nacimiento,
      dni
    }

    const resultado = await controlador.editar(id, datos)
    respuesta.success(req, res, resultado, 200)
  } catch (error) {
    next(error)
  }
}

async function subirImagen(req, res, next) {
  try {
    const { id } = req.body
    const file = req.file

    const resultado = await controlador.actualizarImagenPerfil(file, id)
    respuesta.success(req, res, resultado, 200)
  } catch (error) {
    next(error)
  }
}

async function cambiarContrasena(req, res, next) {
  try {
    const { id, actualContrasena, nuevaContrasena } = req.body

    if (!id || !actualContrasena || !nuevaContrasena) {
      return respuesta.error(req, res, 'Faltan datos: id, contraseña actual o nueva contraseña', 400)
    }

    const resultado = await controlador.actualizarContrasena(id, actualContrasena, nuevaContrasena)
    respuesta.success(req, res, resultado, 200)
  } catch (err) {
    next(err)
  }
}


async function uno (req,res,next){
    try{
        const items = await controlador.uno(req.params.id)
            respuesta.success(req,res,items,200)
    }
    catch(err){
        next(err)
    }

}

async function agregar(req, res, next) {
  try {
    const resultado = await controlador.agregar(req.body);
    respuesta.success(req, res, 'Item guardado con éxito', 201);
  } catch (err) {
    next(err);
  }
}

async function eliminar (req,res,next){
    try{
        const items = await controlador.eliminar(req.body)
            respuesta.success(req,res,'items eliminado',200)
    }catch(err){
        next(err)
    }
    
}
    
module.exports = router