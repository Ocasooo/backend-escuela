const bcrypt = require('bcrypt')
const tabla = 'personal' //APUNTA A LA TABLA
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

    async function editar(id, datos) {
        if (!id) {
            throw new Error('ID no proporcionado')
        }

        const campos = {
            nombre: datos.nombre,
            apellido: datos.apellido,
            ocupacion: datos.ocupacion,
            fecha_nacimiento:datos.fecha_nacimiento,
            correo: datos.correo,
            telefono: datos.telefono,
            dni:datos.dni
        }

        await db.customQuery(
            `UPDATE personal 
            SET nombre = ?, apellido = ?, correo = ?, telefono = ?, ocupacion = ?, fecha_nacimiento = ?, dni = ?
            WHERE id = ?`,
            [campos.nombre, campos.apellido, campos.correo, campos.telefono,campos.ocupacion,campos.fecha_nacimiento,campos.dni, id]
        )

        return { id, ...campos }
    }

    async function editarDatosPersonales(id, datos) {
        if (!id) {
            throw new Error('ID no proporcionado')
        }

        // Preparar query dinámico solo con los campos que queremos
        const campos = {
            nombre: datos.nombre,
            apellido: datos.apellido,
            correo: datos.correo,
            telefono: datos.telefono
        }

        await db.customQuery(
            `UPDATE personal 
            SET nombre = ?, apellido = ?, correo = ?, telefono = ?
            WHERE id = ?`,
            [campos.nombre, campos.apellido, campos.correo, campos.telefono, id]
        )

        return { id, ...campos }
    }

    async function actualizarImagenPerfil(file, id) {
        if (!file || !file.buffer || !file.originalname) {
            throw new Error('Archivo inválido')
        }

        if (!id) {
            throw new Error('ID de personal no proporcionado')
        }

        const nombreArchivo = Date.now() + '-' + file.originalname
        const rutaRelativa = path.join('uploads', 'perfil', nombreArchivo)
        const rutaCompleta = path.join(__dirname, '../../', rutaRelativa)

        // Crear la carpeta si no existe
        fs.mkdirSync(path.dirname(rutaCompleta), { recursive: true })

        fs.writeFileSync(rutaCompleta, file.buffer)

        // Actualizar la ruta de la imagen en la base de datos
        await db.customQuery(
            `UPDATE personal SET imagen = ? WHERE id = ?`,
            [rutaRelativa, id]
        )

        return {
            id,
            imagen: rutaRelativa
        }
        }
    
    async function actualizarContrasena(id, actualContrasena, nuevaContrasena) {
        // Traer datos actuales del personal
        const personal = await db.customQuery(`SELECT * FROM personal WHERE id = ?`, [id])

        if (!personal || personal.length === 0) {
            throw new Error('Personal no encontrado')
        }

        const usuario = personal[0]

        // Validar contraseña actual
        const valid = await bcrypt.compare(actualContrasena, usuario.contrasena)

        if (!valid) {
            throw new Error('Contraseña actual incorrecta')
        }

        // Encriptar nueva contraseña
        const saltRounds = 5
        const hashedNueva = await bcrypt.hash(nuevaContrasena, saltRounds)

        // Actualizar en base de datos
        await db.customQuery(
            `UPDATE personal SET contrasena = ? WHERE id = ?`,
            [hashedNueva, id]
        )

        return { mensaje: 'Contraseña actualizada correctamente' }
    }

    async function eliminar(body) {
        if (!body || !body.id) {
            throw new Error('ID no proporcionado para eliminar')
        }

        const idPersonal = body.id

        // Primero eliminamos de la tabla intermedia
        await db.customQuery(`DELETE FROM curso_has_personal WHERE personal_id = ?`, [idPersonal])

        // Después eliminamos de la tabla 'personal'
        return db.eliminar(tabla, body)
    }

    async function reemplazarContrasena(id, nuevaContrasena) {
        if (!id || !nuevaContrasena) {
            throw new Error('ID y nueva contraseña son requeridos')
        }

        const saltRounds = 5
        const hashedNueva = await bcrypt.hash(nuevaContrasena, saltRounds)

        await db.customQuery(
            `UPDATE personal SET contrasena = ? WHERE id = ?`,
            [hashedNueva, id]
        )

        return { mensaje: 'Contraseña reemplazada correctamente' }
    }


    return {
        todos,
        uno,
        agregar,
        eliminar,
        editar,
        actualizarContrasena,
        actualizarImagenPerfil,
        editarDatosPersonales,
        reemplazarContrasena
    }
}