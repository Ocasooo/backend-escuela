module.exports = function (dbinyectada) {
  let db = dbinyectada

  if (!db) {
    db = require('../../DB/mysql.js')
  }

  function asignarAlumno(idAlumno, idCurso) {
    return db.agregar('curso_has_alumno', { alumno_id: idAlumno, curso_id: idCurso })
  }

  function quitarAlumno(idAlumno, idCurso, anio) {
    return db.customQuery(
      `UPDATE curso_has_alumno
      SET estado_terminacion = 'abandonado'
      WHERE alumno_id = ? AND curso_id = ? AND anio = ?`,
      [idAlumno, idCurso, anio]
    )
  }

  function egresarAlumno(idAlumno, nota) {
  return db.customQuery(`
    UPDATE curso_has_alumno
    SET estado_terminacion = 'egresado', nota = ?
    WHERE alumno_id = ? AND estado_terminacion = 'cursando'`,
    [nota, idAlumno]
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

  function resumenAlumnosConCursos() {
    return db.customQuery(`
      SELECT 
        a.dni,
        a.nombre, 
        a.apellido,
        ca.estado, 
        GROUP_CONCAT(c.nombre SEPARATOR ', ') AS cursos
      FROM alumno a
      JOIN curso_has_alumno ca ON a.id = ca.alumno_id
      JOIN curso c ON ca.curso_id = c.id
      GROUP BY a.id
    `)
  }

  function obtenerNotasPorCurso(cursoId) {
    return db.customQuery(`
      SELECT 
        a.id,
        a.dni,
        a.nombre,
        a.apellido,
        cha.nota,
        cha.curso_id
      FROM curso_has_alumno cha
      JOIN alumno a ON cha.alumno_id = a.id
      WHERE cha.curso_id = ?
    `, [cursoId])
  }

  function cargarNota(nota, cursoId, alumnoId) {
    return db.customQuery(`
      UPDATE curso_has_alumno
      SET nota = ?
      WHERE curso_id = ? AND alumno_id = ?
    `, [nota, cursoId, alumnoId])
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
      IFNULL(SUM(cha.estado_terminacion = 'abandonado'), 0) AS abandonos,
      IFNULL(SUM(cha.estado_terminacion = 'aprobado'), 0) AS egresados
    FROM curso c
    LEFT JOIN curso_has_alumno cha ON c.id = cha.curso_id
    GROUP BY c.id;
  `)
  }

  function profesoresPorCurso(idCurso) {
    return db.customQuery(`
      SELECT p.id, p.nombre, p.apellido, p.ocupacion
      FROM curso_has_personal cp
      JOIN personal p ON cp.personal_id = p.id
      WHERE cp.curso_id = ?
    `, [idCurso])
  }

  function profesoresConCursos() {
  return db.customQuery(`
    SELECT 
      p.id AS id_profesor,
      p.nombre AS nombre_profesor,
      p.apellido AS apellido_profesor,
      p.ocupacion,
      c.id AS id_curso,
      c.nombre AS nombre_curso
    FROM curso_has_personal cp
    JOIN personal p ON cp.personal_id = p.id
    JOIN curso c ON cp.curso_id = c.id
    WHERE p.ocupacion = 'profesor'
  `)
}



  function alumnosPorCurso(idCurso) {
    return db.customQuery(`
      SELECT a.id, a.nombre, a.apellido, a.dni
      FROM curso_has_alumno ca
      JOIN alumno a ON ca.alumno_id = a.id
      WHERE ca.curso_id = ?
    `, [idCurso])
  }

    function alumnosConCursos() {
    return db.customQuery(`
      SELECT 
        a.id AS id_alumno,
        c.id AS id_curso,
        a.dni,
        a.nombre,
        a.apellido,
        ca.anio,
        ca.estado_terminacion,
        c.nombre AS curso_nombre
      FROM curso_has_alumno ca
      JOIN alumno a ON ca.alumno_id = a.id
      JOIN curso c ON ca.curso_id = c.id
    `)
  }

  function alumnosDetallePorCurso(idCurso) {
  return db.customQuery(`
    SELECT 
      a.dni,
      a.nombre,
      a.apellido,
      ca.estado_terminacion,
      ca.anio
    FROM curso_has_alumno ca
    JOIN alumno a ON ca.alumno_id = a.id
    WHERE ca.curso_id = ?
  `, [idCurso])
}



  return {
    asignarAlumno,
    quitarAlumno,
    cursosPorAlumno,
    asignarPersonal,
    quitarPersonal,
    cursosPorPersonal,
    resumenAlumnosConCursos,
    alumnosPorCursoConEstado,
    resumenCursos,
    profesoresPorCurso,
    alumnosPorCurso,
    obtenerNotasPorCurso,
    cargarNota,
    alumnosConCursos,
    profesoresConCursos,
    alumnosDetallePorCurso,
    egresarAlumno
  }
}
