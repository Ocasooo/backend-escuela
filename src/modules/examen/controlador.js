const tabla = 'examen' //APUNTA A LA TABLA

module.exports= function (dbinyectada){
    
    let db = dbinyectada

    if(!db){ //Si llega la db, puedo sacarla directamente de aqui
        db = require('../../DB/mysql.js')
    }

    function todos(){
        return db.customQuery(`
            SELECT e.*, c.nombre AS nombre_curso, u.nombre AS unidad_nombre 
            FROM examen e 
            LEFT JOIN curso c ON e.curso_id = c.id 
            LEFT JOIN unidades u ON e.unidad_id = u.id 
            ORDER BY e.id DESC
        `)
    }

    async function uno(id){
        const rows = await db.customQuery(`
            SELECT e.*, c.nombre AS nombre_curso, u.nombre AS unidad_nombre 
            FROM examen e 
            LEFT JOIN curso c ON e.curso_id = c.id 
            LEFT JOIN unidades u ON e.unidad_id = u.id 
            WHERE e.id = ?
        `, [id])
        return rows[0] || null
    }

    function obtenerPorCurso(curso_id){
        return db.customQuery(`
            SELECT e.*, c.nombre AS nombre_curso, u.nombre AS unidad_nombre 
            FROM examen e 
            LEFT JOIN curso c ON e.curso_id = c.id 
            LEFT JOIN unidades u ON e.unidad_id = u.id 
            WHERE e.curso_id = ? 
            ORDER BY e.id DESC
        `, [curso_id])
    }

    function agregar(body){
        const datos = { ...body }
        if (datos.preguntas && typeof datos.preguntas !== 'string') {
            datos.preguntas = JSON.stringify(datos.preguntas)
        }
        return db.agregar(tabla, datos)
    }

    function editar(id, body){
        const datos = { ...body }
        if (datos.preguntas && typeof datos.preguntas !== 'string') {
            datos.preguntas = JSON.stringify(datos.preguntas)
        }
        return db.editar(tabla, id, datos)
    }

    function eliminar(body){
        return db.eliminar(tabla, body)
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
        obtenerPorCurso,
        agregar,
        editar,
        eliminar,
        examenConInfo
    }
}