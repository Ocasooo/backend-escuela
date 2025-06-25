module.exports = function (dbinyectada) {
  let db = dbinyectada

  if (!db) {
    db = require('../../DB/mysql.js')
  }

  function asignarAlumno(idAlumno, idCurso) {
    return db.agregar('curso_has_alumno', { alumno_id: idAlumno, curso_id: idCurso })
  }

  function quitarAlumno(idAlumno, idCurso) {
    return db.customQuery(
      `DELETE FROM curso_has_alumno WHERE alumno_id = ? AND curso_id = ?`,
      [idAlumno, idCurso]
    )
  }

  function cursosPorAlumno(idAlumno) {
    return db.customQuery(
      `SELECT c.* FROM curso c
       JOIN curso_has_alumno ca ON c.id = ca.curso_id
       WHERE ca.alumno_id = ?`,
      [idAlumno]
    )
  }

  function asignarPersonal(idPersonal, idCurso) {
    return db.agregar('curso_has_personal', { personal_id: idPersonal, curso_id: idCurso })
  }

  function quitarPersonal(idPersonal, idCurso) {
    return db.customQuery(
      `DELETE FROM curso_has_personal WHERE personal_id = ? AND curso_id = ?`,
      [idPersonal, idCurso]
    )
  }

  function cursosPorPersonal(idPersonal) {
    return db.customQuery(
      `SELECT c.* FROM curso c
       JOIN curso_has_personal cp ON c.id = cp.curso_id
       WHERE cp.personal_id = ?`,
      [idPersonal]
    )
  }

  function obtenerAlumnosConCurso() {
    return db.customQuery(`
      SELECT 
        a.dni,
        a.nombre, 
        a.apellido, 
        GROUP_CONCAT(c.nombre SEPARATOR ', ') AS cursos
      FROM alumno a
      JOIN curso_has_alumno ca ON a.id = ca.alumno_id
      JOIN curso c ON ca.curso_id = c.id
      GROUP BY a.id
    `)
  }

  function alumnosPorCursoConEstado(idCurso) {
    return db.customQuery(`
      SELECT 
        a.dni,
        a.nombre,
        a.apellido,
        cha.estado_terminacion
      FROM curso_has_alumno cha
      JOIN alumno a ON a.id = cha.alumno_id
      WHERE cha.curso_id = ?
    `, [idCurso])
  }

  function resumenCursos() {
  return db.customQuery(`
    SELECT 
      c.id,
      c.nombre,
      c.descripcion,
      COUNT(cha.alumno_id) AS inscriptos,
      SUM(cha.estado_terminacion = 'abandonado') AS abandonos,
      SUM(cha.estado_terminacion = 'aprobado') AS egresados
    FROM curso c
    LEFT JOIN curso_has_alumno cha ON c.id = cha.curso_id
    GROUP BY c.id
  `)
  }

  return {
    asignarAlumno,
    quitarAlumno,
    cursosPorAlumno,
    asignarPersonal,
    quitarPersonal,
    cursosPorPersonal,
    obtenerAlumnosConCurso,
    alumnosPorCursoConEstado,
    resumenCursos
  }
}
