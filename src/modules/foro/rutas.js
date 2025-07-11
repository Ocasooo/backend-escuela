const express = require('express')
const respuesta = require('../../red/respuestas.js')//importamos las repuestas
const controlador = require('./index.js')

const router = express.Router()

//Rutas urls
router.get('/',todos)
router.get('/:id',uno)
router.post('/',agregar)
router.put('/',eliminar)



//funcionalidad
async function todos (req,res,next){
    try{
        const items = await controlador.todos()
            respuesta.success(req,res,items,200)
    }catch(err){
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

async function agregar (req,res,next){
    try{
        const items = await controlador.agregar(req.body)
        if(req.body.id == 0){
            mensaje = 'item guardado con exito'
        }else{
            mensaje = 'item actualizado con exito'
        }
            respuesta.success(req,res,mensaje,201)
    }
    catch(err){
        next(err)
    }

}

async function eliminar (req,re,next){
    try{
        const items = await controlador.eliminar(req.body)
            respuesta.success(req,res,'items eliminado',200)
    }catch(err){
        next(err)
    }
    
}
    
module.exports = router