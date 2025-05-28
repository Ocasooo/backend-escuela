const bcrypt = require('bcrypt')
const tabla = 'personal' //APUNTA A LA TABLA

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

    async function agregar(body) {
    if (body.contrasena) {
        const saltRounds = 5;
        const hashedPassword = await bcrypt.hash(body.contrasena, saltRounds);
        body.contrasena = hashedPassword;
    }
        return db.agregar(tabla, body);
    }

    async function editar(id, body) {
    if (body.contrasena) {
        const saltRounds = 5;
        const hashedPassword = await bcrypt.hash(body.contrasena, saltRounds);
        body.contrasena = hashedPassword;
    }
        return db.editar(tabla, id, body);
    }

    function eliminar(body){
        return db.eliminar(tabla,body)
    }

    return {
        todos,
        uno,
        agregar,
        eliminar,
        editar
    }
}