module.exports = function (dbinyectada) {
  let db = dbinyectada || require('../../DB/mysql.js')

  async function datosCursoConUsuario(cursoId, usuario) {
    // Obtener datos del curso
    const curso = await db.uno('curso', cursoId)
    if (!curso) return null

    let puedeEditar = false
    let asignado = false

    // Verificar permisos según ocupación
    if (usuario.ocupacion === 'Administrador') {
      puedeEditar = true
      asignado = true
    } else if (usuario.ocupacion === 'Profesor') {
      const cursos = await db.customQuery(
        `SELECT * FROM curso_has_personal WHERE personal_id = ? AND curso_id = ?`,
        [usuario.id, cursoId]
      )
      if (cursos.length > 0) {
        puedeEditar = true
        asignado = true
      }
    } else if (usuario.ocupacion === 'Alumno') {
      const cursos = await db.customQuery(
        `SELECT * FROM curso_has_alumno WHERE alumno_id = ? AND curso_id = ?`,
        [usuario.id, cursoId]
      )
      if (cursos.length > 0) {
        asignado = true
      }
    }

    return {
      ...curso,
      ocupacion: usuario.ocupacion,
      asignado,
      puedeEditar
    }
  }

  return {
    datosCursoConUsuario
  }
}
