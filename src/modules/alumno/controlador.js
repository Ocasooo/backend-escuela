const bcrypt = require('bcrypt')
const tabla = 'alumno' //APUNTA A LA TABLA
const path = require('path')
const fs = require('fs') // Por si tampoco tenés fs


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

    async function eliminar(body) {
        try {
            const alumnoId = body.id

            // Primero borrar registros hijos
            await db.customQuery(`DELETE FROM curso_has_alumno WHERE alumno_id = ?`, [alumnoId])

            // Ahora borrar en la tabla alumno
            return await db.eliminar(tabla, body)
        } catch (error) {
            console.error('Error al eliminar alumno con referencias:', error)
            throw error
        }
    }



    async function actualizarImagenPerfil(file, id) {
        if (!file || !file.buffer || !file.originalname) {
            throw new Error('Archivo inválido')
        }

        if (!id) {
            throw new Error('ID de alumno no proporcionado')
        }

        const nombreArchivo = Date.now() + '-' + file.originalname
        const rutaRelativa = path.join('uploads', 'perfil', nombreArchivo)
        const rutaCompleta = path.join(__dirname, '../../', rutaRelativa)

        // Crear carpeta si no existe
        fs.mkdirSync(path.dirname(rutaCompleta), { recursive: true })

        fs.writeFileSync(rutaCompleta, file.buffer)

        // Actualizar base de datos
        await db.customQuery(
            `UPDATE alumno SET imagen = ? WHERE id = ?`,
            [rutaRelativa, id]
        )

        return {
            id,
            imagen: rutaRelativa
        }
    }


    return {
        todos,
        uno,
        agregar,
        eliminar,
        editar,
        actualizarImagenPerfil
    }
}