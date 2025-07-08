const express = require('express')
const respuesta = require('../../red/respuestas.js')//importamos las repuestas
const controlador = require('./index.js')
const multer = require('multer')
const upload = multer({ storage: multer.memoryStorage() })

const router = express.Router()

//Rutas urls
router.get('/', todos);
router.post('/subir-imagen', upload.single('imagen'), subirImagen)
router.put('/', eliminar);
router.post('/', agregar);
router.get('/:id', uno);
router.put('/:id', editar);

//funcionalidad

router.patch('/cambiar-contrasena', async (req, res, next) => {
  try {
    const { id, actualContrasena, nuevaContrasena } = req.body

    if (!id || !actualContrasena || !nuevaContrasena) {
      return respuesta.error(req, res, 'Faltan datos: id, contraseña actual o nueva contraseña', 400)
    }

    const resultado = await controlador.actualizarContrasena(id, actualContrasena, nuevaContrasena)
    respuesta.success(req, res, resultado, 200)
  } catch (error) {
    next(error)
  }
})

router.patch('/reemplazar-contrasena', async (req, res, next) => {
    try {
        const { id, nuevaContrasena } = req.body

        if (!id || !nuevaContrasena) {
            return respuesta.error(req, res, 'Faltan datos: id y nueva contraseña', 400)
        }

        await controlador.reemplazarContrasena(id, nuevaContrasena)
        respuesta.success(req, res, 'Contraseña reemplazada correctamente', 200)
    } catch (err) {
        next(err)
    }
})

router.patch('/editarDatosPersonales', async function (req, res, next) {
  try {
    const id = req.body.id
    const datos = {
      nombre: req.body.nombre,
      apellido: req.body.apellido,
      correo: req.body.correo,
      telefono: req.body.telefono
    }

    const result = await controlador.editarDatosPersonales(id, datos)
    respuesta.success(req, res, result, 200)
  } catch (err) {
    next(err)
  }
})


async function todos (req,res,next){
    try{
        const items = await controlador.todos()
            respuesta.success(req,res,items,200)
    }catch(err){
        next(err)
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

async function uno (req,res,next){
    try{
        const items = await controlador.uno(req.params.id)
            respuesta.success(req,res,items,200)
    }
    catch(err){
        next(err)
    }

}

// async function agregar (req,res,next){
//     try{
//         const items = await controlador.agregar(req.body)
//         if(req.body.id == 0){
//             mensaje = 'item guardado con exito'
//         }else{
//             mensaje = 'item actualizado con exito'
//         }
//             respuesta.success(req,res,mensaje,201)
//     }
//     catch(err){
//         next(err)
//     }

// }

async function agregar(req, res, next) {
  try {
    const resultado = await controlador.agregar(req.body);
    respuesta.success(req, res, 'Item guardado con éxito', 201);
  } catch (err) {
    next(err);
  }
}

async function editar(req, res, next) {
  try {
    const id = req.params.id;
    const resultado = await controlador.editar(id, req.body);
    respuesta.success(req, res, 'Item actualizado con éxito', 200);
  } catch (err) {
    next(err);
  }
}

async function eliminar(req, res, next) {
    try {
        await controlador.eliminar(req.body)
        respuesta.success(req, res, 'Elemento eliminado', 200)
    } catch (error) {
        next(error)
    }
}
    
module.exports = router