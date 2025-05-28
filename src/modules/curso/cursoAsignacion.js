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

  return {
    asignarAlumno,
    quitarAlumno,
    cursosPorAlumno,
    asignarPersonal,
    quitarPersonal,
    cursosPorPersonal
  }
}
