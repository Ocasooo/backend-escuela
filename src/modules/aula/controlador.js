const tablaAula = 'aula'
const tablaHorario = 'horario'
const tablaAulaHorario = 'aula_horario'
const tablaCursoAula = 'curso_asignacion'

module.exports = function (dbinyectada) {
  let db = dbinyectada || require('../../DB/mysql.js')

  function obtenerAulas() {
    return db.customQuery(`SELECT * FROM ${tablaAula}`)
  }

  async function eliminarCursoAsignacion(idCurso) {
    // 1️⃣ Obtener la asignación
    const asignacion = await db.customQuery(
        `SELECT horario_id, aula_id FROM ${tablaCursoAula} WHERE curso_id = ?`,
        [idCurso]
    )

    if (!asignacion.length) {
        throw new Error('No se encontró asignación para este curso')
    }

    const idHorario = asignacion[0].horario_id
    const idAula = asignacion[0].aula_id

    // 2️⃣ Eliminar curso_asignacion
    await db.customQuery(
        `DELETE FROM ${tablaCursoAula} WHERE curso_id = ?`,
        [idCurso]
    )

    // 3️⃣ Eliminar aula_horario
    await db.customQuery(
        `DELETE FROM ${tablaAulaHorario} WHERE aula_id = ? AND horario_id = ?`,
        [idAula, idHorario]
    )

    // 4️⃣ Eliminar horario
    await db.customQuery(
        `DELETE FROM ${tablaHorario} WHERE id = ?`,
        [idHorario]
    )

    return { message: 'Asignación eliminada correctamente' }
    }


  function agregarAula(aula) {
    return db.customQuery(
      `INSERT INTO ${tablaAula} (nombre) VALUES (?)`,
      [aula.nombre]
    )
  }

  function agregarHorario(horario) {
    return db.customQuery(
      `INSERT INTO ${tablaHorario} (dia, hora_inicio, hora_fin) VALUES (?, ?, ?)`,
      [horario.dia, horario.hora_inicio, horario.hora_fin]
    )
  }

  function agregarHorarioAula(idAula, idHorario) {
    return db.customQuery(
      `INSERT INTO ${tablaAulaHorario} (aula_id, horario_id) VALUES (?, ?)`,
      [idAula, idHorario]
    )
  }

  function agregarCursoAula(idCurso, idAula, idHorario) {
    return db.customQuery(
      `INSERT INTO ${tablaCursoAula} (curso_id, aula_id, horario_id) VALUES (?, ?, ?)`,
      [idCurso, idAula, idHorario]
    )
  }

  async function agregarCursoConAulaYHorario(body) {
    const { idCurso, idAula, dia, hora_inicio, hora_fin } = body

    // 1️⃣ Insertar horario
    const resultHorario = await db.customQuery(
      `INSERT INTO ${tablaHorario} (dia, hora_inicio, hora_fin) VALUES (?, ?, ?)`,
      [dia, hora_inicio, hora_fin]
    )
    const idHorario = resultHorario.insertId

    // 2️⃣ Insertar aula_horario
    await db.customQuery(
      `INSERT INTO ${tablaAulaHorario} (aula_id, horario_id) VALUES (?, ?)`,
      [idAula, idHorario]
    )

    // 3️⃣ Insertar curso_aula
    await db.customQuery(
      `INSERT INTO ${tablaCursoAula} (curso_id, aula_id, horario_id) VALUES (?, ?, ?)`,
      [idCurso, idAula, idHorario]
    )

    return { message: 'Curso, aula y horario asignados correctamente' }
  }

async function obtenerInfoCompleta() {
  const resultado = await db.customQuery(`
    SELECT 
      a.id AS aula_id,
      a.nombre AS aula_nombre,
      c.id AS curso_id,
      c.nombre AS curso_nombre,
      h.dia,
      h.hora_inicio,
      h.hora_fin
    FROM curso_asignacion ca
    JOIN aula a ON ca.aula_id = a.id
    JOIN curso c ON ca.curso_id = c.id
    JOIN horario h ON ca.horario_id = h.id
  `)

  return resultado
}


  return {
    obtenerAulas,
    agregarAula,
    agregarHorario,
    agregarHorarioAula,
    agregarCursoAula,
    agregarCursoConAulaYHorario,
    obtenerInfoCompleta,
    eliminarCursoAsignacion
  }
}
