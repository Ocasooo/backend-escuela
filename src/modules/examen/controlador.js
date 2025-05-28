const tabla = 'examen' //APUNTA A LA TABLA

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
    
    function examenConInfo() {
    const query = `
        SELECT e.*, a.nombre AS nombre_alumno, c.nombre AS nombre_curso
        FROM examen e
        JOIN alumno a ON e.alumno_id = a.id
        JOIN curso c ON e.curso_id = c.id
    `
    return db.customQuery(query)
    }



    return {
        todos,
        uno,
        agregar,
        eliminar,
        examenConInfo
    }
}