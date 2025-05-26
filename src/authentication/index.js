const jwt = require('jsonwebtoken')
const config = require('../config.js')
const error = require('../middleware/errors.js')

const secret = config.jwt.secret

function asignarToken(data){
     return jwt.sign(data, secret, { expiresIn: '1h' })
}

function verificarToken(token){
    return jwt.verify(token,secret)
}

const chequearToken = {
    confirmarToken: function(req,id){ //Decodificamos la cabecera
        const decoficado = decodificarCabecera(req)
        if(decoficado.id !== id){
            throw error('No tienes privilegios para hacer esto',401)
        }
    }
}

function obtenerToken(autorizacion){
    if(!autorizacion){
        throw error('No viene token',401)
    }

    if(autorizacion.indexOf('Bearer') === -1){
        throw error('Formato invalido',401)
    }

    let token = autorizacion.replace('Bearer','').trim()
    return token
}

function decodificarCabecera(req){
    const autorizacion = req.headers.authorization || ''
    const token = obtenerToken(autorizacion)

    try {
        const decodificado = verificarToken(token)
        req.user = decodificado
        return decodificado
    } catch (err) {
        throw new Error('Token inválido o expirado')
    }
}


module.exports = {
    asignarToken,
    chequearToken
}