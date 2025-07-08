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

    async function reemplazarContrasena(id, nuevaContrasena) {
    if (!id || !nuevaContrasena) {
        throw new Error('ID y nueva contraseña son requeridos')
    }

    const saltRounds = 5
    const hashedNueva = await bcrypt.hash(nuevaContrasena, saltRounds)

    await db.customQuery(
        `UPDATE alumno SET contrasena = ? WHERE id = ?`,
        [hashedNueva, id]
    )

    return { mensaje: 'Contraseña reemplazada correctamente' }
}

async function editarDatosPersonales(id, datos) {
  if (!id) {
    throw new Error('ID no proporcionado')
  }

  const campos = {
    nombre: datos.nombre,
    apellido: datos.apellido,
    correo: datos.correo,
    telefono: datos.telefono
  }

  await db.customQuery(
    `UPDATE alumno 
     SET nombre = ?, apellido = ?, correo = ?, telefono = ?
     WHERE id = ?`,
    [campos.nombre, campos.apellido, campos.correo, campos.telefono, id]
  )

  return { id, ...campos }
}

async function actualizarContrasena(id, actualContrasena, nuevaContrasena) {
    // Traer datos actuales del alumno
    const alumno = await db.customQuery(`SELECT * FROM alumno WHERE id = ?`, [id])

    if (!alumno || alumno.length === 0) {
        throw new Error('Alumno no encontrado')
    }

    const usuario = alumno[0]

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
        `UPDATE alumno SET contrasena = ? WHERE id = ?`,
        [hashedNueva, id]
    )

    return { mensaje: 'Contraseña actualizada correctamente' }
}


    return {
        todos,
        uno,
        agregar,
        eliminar,
        editar,
        actualizarImagenPerfil,
        reemplazarContrasena,
        editarDatosPersonales,
        actualizarContrasena
    }
}