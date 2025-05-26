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
        // Verificamos si hay campo "Contrasena"
        if (body.Contrasena) {
            const saltRounds = 5;
            try {
                const hashedPassword = await bcrypt.hash(body.Contrasena, saltRounds);
                body.Contrasena = hashedPassword;
            } catch (error) {
                throw new Error('Error al encriptar la contraseña');
            }
        }

        return db.agregar(tabla, body);
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