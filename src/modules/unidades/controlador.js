const tabla = 'unidades' //APUNTA A LA TABLA

module.exports= function (dbinyectada){
    
    let db = dbinyectada

    if(!db){ //Si llega la db, puedo sacarla directamente de aqui
        db = require('../../DB/mysql.js')
    }

    function todos(){
        return db.todos(tabla)
    }

    function uno(id){
        return db.uno(tabla,id)
    }

    function agregar(body){
        return db.agregar(tabla,body)
    }

    function eliminar(body){
        return db.eliminar(tabla,body)
    }

    return {
        todos,
        uno,
        agregar,
        eliminar
    }
}