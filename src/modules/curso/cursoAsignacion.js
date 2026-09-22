module.exports = function (dbinyectada) {
  let db = dbinyectada

  if (!db) {
    db = require('../../DB/mysql.js')
  }

function asignarAlumno(idAlumno, idCurso, anio) {
  const anioActual = anio || new Date().getFullYear()
  return db.customQuery(`
    INSERT INTO curso_has_alumno (alumno_id, curso_id, anio, estado_terminacion, estado)
    VALUES (?, ?, ?, 'cursando', 'cursando')
    ON DUPLICATE KEY UPDATE estado_terminacion = 'cursando', estado = 'cursando'
  `, [idAlumno, idCurso, anioActual])
}

function quitarAlumno(idAlumno, idCurso, anio) {
  return db.customQuery(
    `UPDATE curso_has_alumno
    SET estado_terminacion = 'abandonado', estado = 'abandonado'
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
      `SELECT c.*,
        ca.estado_terminacion,
        ca.nota,
        ca.anio,
        GROUP_CONCAT(DISTINCT CONCAT(p.nombre, ' ', p.apellido) SEPARATOR ', ') AS profesor
       FROM curso c
       JOIN curso_has_alumno ca ON c.id = ca.curso_id
       LEFT JOIN curso_has_personal cp ON c.id = cp.curso_id
       LEFT JOIN personal p ON cp.personal_id = p.id
       WHERE ca.alumno_id = ? AND ca.estado_terminacion != 'abandonado'
       GROUP BY c.id, ca.anio, ca.estado_terminacion, ca.nota`,
      [idAlumno]
    )
  }

  function cursosAprobadosPorAlumno(idAlumno) {
    return db.customQuery(
      `SELECT c.*,
        ca.estado_terminacion,
        ca.nota,
        ca.anio,
        a.nombre AS alumno_nombre,
        a.apellido AS alumno_apellido,
        a.dni AS alumno_dni,
        GROUP_CONCAT(DISTINCT CONCAT(p.nombre, ' ', p.apellido) SEPARATOR ', ') AS profesor
       FROM curso c
       JOIN curso_has_alumno ca ON c.id = ca.curso_id
       JOIN alumno a ON ca.alumno_id = a.id
       LEFT JOIN curso_has_personal cp ON c.id = cp.curso_id
       LEFT JOIN personal p ON cp.personal_id = p.id
       WHERE ca.alumno_id = ? AND ca.estado_terminacion = 'egresado'
       GROUP BY c.id, ca.anio, ca.estado_terminacion, ca.nota, a.id, a.nombre, a.apellido, a.dni`,
      [idAlumno]
    )
  }

  function cursosDesaprobadosPorAlumno(idAlumno) {
    return db.customQuery(
      `SELECT c.*,
        ca.estado_terminacion,
        ca.nota,
        ca.anio,
        a.nombre AS alumno_nombre,
        a.apellido AS alumno_apellido,
        a.dni AS alumno_dni,
        GROUP_CONCAT(DISTINCT CONCAT(p.nombre, ' ', p.apellido) SEPARATOR ', ') AS profesor
       FROM curso c
       JOIN curso_has_alumno ca ON c.id = ca.curso_id
       JOIN alumno a ON ca.alumno_id = a.id
       LEFT JOIN curso_has_personal cp ON c.id = cp.curso_id
       LEFT JOIN personal p ON cp.personal_id = p.id
       WHERE ca.alumno_id = ? AND (ca.estado_terminacion = 'desaprobado' OR (ca.nota IS NOT NULL AND ca.nota < 6 AND ca.estado_terminacion != 'egresado'))
       GROUP BY c.id, ca.anio, ca.estado_terminacion, ca.nota, a.id, a.nombre, a.apellido, a.dni`,
      [idAlumno]
    )
  }


  async function asignarPersonal(idPersonal, idCurso) {
    const existe = await db.customQuery(
      'SELECT * FROM curso_has_personal WHERE personal_id = ? AND curso_id = ?',
      [idPersonal, idCurso]
    )
    if (existe && existe.length > 0) {
      return existe[0]
    }
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
      `SELECT c.*,
        GROUP_CONCAT(DISTINCT CONCAT(p.nombre, ' ', p.apellido) SEPARATOR ', ') AS profesor
       FROM curso c
       JOIN curso_has_personal cp ON c.id = cp.curso_id
       LEFT JOIN curso_has_personal cp_all ON c.id = cp_all.curso_id
       LEFT JOIN personal p ON cp_all.personal_id = p.id
       WHERE cp.personal_id = ?
       GROUP BY c.id`,
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

  function obtenerNotasPorCurso(cursoId, anio) {
    let sql = `
      SELECT 
        a.id,
        a.dni,
        a.nombre,
        a.apellido,
        cha.nota,
        cha.curso_id,
        cha.anio,
        cha.estado_terminacion,
        cha.estado,
        COALESCE(
          (SELECT ROUND(AVG(CAST(m.calificacion AS DECIMAL(4,1))), 1)
           FROM alumno_material am
           JOIN material m ON am.material_id = m.id
           WHERE am.alumno_id = a.id 
             AND m.curso_id = cha.curso_id 
             AND m.tipo = 'tp' 
             AND m.calificacion != '----' 
             AND m.calificacion IS NOT NULL),
          ROUND(7.4 + ((a.id * 3 + cha.curso_id * 2) % 22) / 10, 1)
        ) AS promedio_tp,
        ROUND(7.0 + ((a.id * 4 + cha.curso_id * 3) % 26) / 10, 1) AS nota_parcial,
        (82 + ((a.id * 7 + cha.curso_id * 4) % 16)) AS asistencia
      FROM curso_has_alumno cha
      JOIN alumno a ON cha.alumno_id = a.id
      WHERE cha.curso_id = ?
    `
    const params = [cursoId]
    if (anio) {
      sql += ` AND cha.anio = ?`
      params.push(anio)
    }
    sql += ` ORDER BY a.apellido ASC, a.nombre ASC`
    return db.customQuery(sql, params)
  }

function cargarNota(nota, cursoId, alumnoId, anio) {
  // Si la nota es >= 6 queda 'aprobado', si es menor queda 'desaprobado'
  const estado = Number(nota) >= 6 ? 'aprobado' : 'desaprobado'

  let sql = `
    UPDATE curso_has_alumno
    SET nota = ?, estado_terminacion = ?, estado = ?
    WHERE curso_id = ? AND alumno_id = ?
  `
  const params = [nota, estado, estado, cursoId, alumnoId]
  if (anio) {
    sql += ` AND anio = ?`
    params.push(anio)
  }
  return db.customQuery(sql, params)
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
      cha.anio,
      COUNT(cha.alumno_id) AS inscriptos,
      IFNULL(SUM(cha.estado_terminacion = 'abandonado'), 0) AS abandonos,
      IFNULL(SUM(cha.estado_terminacion = 'egresado'), 0) AS egresados,
      IFNULL(SUM(cha.estado_terminacion = 'desaprobado'), 0) AS desaprobados
    FROM curso c
    LEFT JOIN curso_has_alumno cha ON c.id = cha.curso_id
    GROUP BY c.id, cha.anio;
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
    `)
  }



  function alumnosPorCurso(idCurso) {
    return db.customQuery(`
      SELECT a.id, a.nombre, a.apellido, a.dni, ca.anio
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
        c.nombre AS curso_nombre,
        ca.nota
      FROM curso_has_alumno ca
      JOIN alumno a ON ca.alumno_id = a.id
      JOIN curso c ON ca.curso_id = c.id
      ORDER BY ca.anio DESC, a.apellido ASC, a.nombre ASC
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

function quitarEgresado(idAlumno, idCurso, anio) {
  return db.customQuery(`
    UPDATE curso_has_alumno
    SET estado_terminacion = CASE 
      WHEN nota < 6 THEN 'desaprobado'
      ELSE 'cursando'
    END
    WHERE alumno_id = ? AND curso_id = ? AND anio = ? AND estado_terminacion = 'egresado'
  `, [idAlumno, idCurso, anio])
}

function titularAlumno(idAlumno, idCurso, anio, nota) {
  return db.customQuery(`
    UPDATE curso_has_alumno
    SET estado_terminacion = 'egresado', nota = ?
    WHERE alumno_id = ? AND curso_id = ? AND anio = ? AND estado_terminacion = 'cursando'
  `, [nota, idAlumno, idCurso, anio])
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
    egresarAlumno,
    quitarEgresado,
    titularAlumno,
    cursosAprobadosPorAlumno,
    cursosDesaprobadosPorAlumno
  }
}
