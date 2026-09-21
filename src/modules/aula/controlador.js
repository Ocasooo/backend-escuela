const tablaAula = 'aula'
const tablaHorario = 'horario'
const tablaAulaHorario = 'aula_horario'
const tablaCursoAula = 'curso_asignacion'

module.exports = function (dbinyectada) {
  let db = dbinyectada || require('../../DB/mysql.js')

  function obtenerAulas() {
    return db.customQuery(`SELECT * FROM ${tablaAula}`)
  }

  async function eliminarCursoAsignacion(parametros) {
    let idHorario = null
    let idCurso = null
    let idAula = null

    if (typeof parametros === 'object' && parametros !== null) {
      idHorario = parametros.horario_id || parametros.idHorario || parametros.horarioId
      idCurso = parametros.curso_id || parametros.idCurso || parametros.cursoId || parametros.id
      idAula = parametros.aula_id || parametros.idAula || parametros.aulaId
    } else {
      idCurso = parametros
    }

    // 1️⃣ Si se especifica el horario_id exacto (desasignar un turno específico)
    if (idHorario) {
      await db.customQuery(
        `DELETE FROM ${tablaCursoAula} WHERE horario_id = ?`,
        [idHorario]
      )
      await db.customQuery(
        `DELETE FROM ${tablaAulaHorario} WHERE horario_id = ?`,
        [idHorario]
      )
      await db.customQuery(
        `DELETE FROM ${tablaHorario} WHERE id = ?`,
        [idHorario]
      )
      return { message: 'Turno de aula desasignado correctamente' }
    }

    // 2️⃣ Si se especifica curso y aula (eliminar todas las asignaciones de ese curso en esa aula)
    if (idCurso && idAula) {
      const asignaciones = await db.customQuery(
        `SELECT horario_id FROM ${tablaCursoAula} WHERE curso_id = ? AND aula_id = ?`,
        [idCurso, idAula]
      )
      for (const a of asignaciones) {
        await db.customQuery(
          `DELETE FROM ${tablaCursoAula} WHERE curso_id = ? AND aula_id = ? AND horario_id = ?`,
          [idCurso, idAula, a.horario_id]
        )
        await db.customQuery(
          `DELETE FROM ${tablaAulaHorario} WHERE aula_id = ? AND horario_id = ?`,
          [idAula, a.horario_id]
        )
        await db.customQuery(
          `DELETE FROM ${tablaHorario} WHERE id = ?`,
          [a.horario_id]
        )
      }
      return { message: 'Asignaciones del curso en el aula eliminadas correctamente' }
    }

    // 3️⃣ Si solo se especifica idCurso (eliminar todas las asignaciones del curso)
    if (idCurso) {
      const asignaciones = await db.customQuery(
        `SELECT horario_id, aula_id FROM ${tablaCursoAula} WHERE curso_id = ?`,
        [idCurso]
      )

      if (!asignaciones.length) {
        return { message: 'No se encontraron asignaciones previas para este curso' }
      }

      for (const a of asignaciones) {
        await db.customQuery(
          `DELETE FROM ${tablaCursoAula} WHERE curso_id = ? AND horario_id = ?`,
          [idCurso, a.horario_id]
        )
        await db.customQuery(
          `DELETE FROM ${tablaAulaHorario} WHERE aula_id = ? AND horario_id = ?`,
          [a.aula_id, a.horario_id]
        )
        await db.customQuery(
          `DELETE FROM ${tablaHorario} WHERE id = ?`,
          [a.horario_id]
        )
      }
      return { message: 'Asignaciones del curso eliminadas correctamente' }
    }

    throw new Error('Faltan parámetros para desasignar (se requiere idHorario, idCurso o idAula)')
  }

  async function eliminarAula(idAula) {
    if (!idAula) throw new Error('ID de aula requerido')

    // 1. Obtener los horarios vinculados a esta aula
    const asignaciones = await db.customQuery(
      `SELECT horario_id FROM ${tablaAulaHorario} WHERE aula_id = ?`,
      [idAula]
    )

    // 2. Eliminar de curso_asignacion para esta aula
    await db.customQuery(
      `DELETE FROM ${tablaCursoAula} WHERE aula_id = ?`,
      [idAula]
    )

    // 3. Eliminar de aula_horario
    await db.customQuery(
      `DELETE FROM ${tablaAulaHorario} WHERE aula_id = ?`,
      [idAula]
    )

    // 4. Eliminar horarios que quedaron huérfanos
    for (const a of asignaciones) {
      const enUso = await db.customQuery(
        `SELECT 1 FROM ${tablaAulaHorario} WHERE horario_id = ? LIMIT 1`,
        [a.horario_id]
      )
      if (enUso.length === 0) {
        await db.customQuery(
          `DELETE FROM ${tablaHorario} WHERE id = ?`,
          [a.horario_id]
        )
      }
    }

    // 5. Eliminar el aula
    await db.customQuery(
      `DELETE FROM ${tablaAula} WHERE id = ?`,
      [idAula]
    )

    return { message: 'Aula y sus asignaciones eliminadas correctamente' }
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

    // 0️⃣ Validar solapamiento en la misma aula y mismo día
    const solapadas = await db.customQuery(`
      SELECT c.nombre AS curso_nombre, h.hora_inicio, h.hora_fin
      FROM curso_asignacion ca
      JOIN horario h ON ca.horario_id = h.id
      JOIN curso c ON ca.curso_id = c.id
      WHERE ca.aula_id = ? AND h.dia = ?
      AND h.hora_inicio < ? AND h.hora_fin > ?
    `, [idAula, dia, hora_fin, hora_inicio])

    if (solapadas.length > 0) {
      throw new Error(`El aula ya se encuentra ocupada ese día por '${solapadas[0].curso_nombre}' (${solapadas[0].hora_inicio.slice(0, 5)} a ${solapadas[0].hora_fin.slice(0, 5)} hs)`)
    }

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
      h.id AS horario_id,
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
    eliminarAula,
    agregarHorario,
    agregarHorarioAula,
    agregarCursoAula,
    agregarCursoConAulaYHorario,
    obtenerInfoCompleta,
    eliminarCursoAsignacion
  }
}
