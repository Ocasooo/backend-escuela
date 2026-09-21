const tabla = 'curso'

module.exports = function (dbinyectada) {
  let db = dbinyectada || require('../../DB/mysql.js')

  function todos() {
    return db.customQuery(`
      SELECT 
        c.*,
        GROUP_CONCAT(DISTINCT CONCAT(p.nombre, ' ', p.apellido) SEPARATOR ', ') AS profesor
      FROM curso c
      LEFT JOIN curso_has_personal cp ON c.id = cp.curso_id
      LEFT JOIN personal p ON cp.personal_id = p.id
      GROUP BY c.id
    `)
  }

  function uno(id) {
    return db.customQuery(`
      SELECT 
        c.*,
        GROUP_CONCAT(DISTINCT CONCAT(p.nombre, ' ', p.apellido) SEPARATOR ', ') AS profesor
      FROM curso c
      LEFT JOIN curso_has_personal cp ON c.id = cp.curso_id
      LEFT JOIN personal p ON cp.personal_id = p.id
      WHERE c.id = ?
      GROUP BY c.id
    `, [id])
  }

  function agregar(curso) {
    return db.agregar(tabla, curso)
  }

  function editar(id, body) {
    return db.editar(tabla, id, body)
  }

  // 🔥 Eliminar (solo lógica), NO usa req ni res ni next
  async function eliminar(data) {
    try {
      const id = data.id

      // Borrar todas las relaciones hijas antes de borrar el curso
      await db.customQuery('DELETE FROM curso_has_alumno WHERE curso_id = ?', [id])
      await db.customQuery('DELETE FROM curso_has_personal WHERE curso_id = ?', [id])
      await db.customQuery('DELETE FROM curso_asignacion WHERE curso_id = ?', [id])
      await db.customQuery('DELETE FROM material WHERE curso_id = ?', [id])
      await db.customQuery('DELETE FROM examen WHERE curso_id = ?', [id])
      await db.customQuery('DELETE FROM unidades WHERE curso_id = ?', [id])

      // Ahora sí borrar el curso principal
      await db.eliminar(tabla, data)

      return true
    } catch (err) {
      throw err
    }
  }

  return {
    todos,
    uno,
    agregar,
    editar,
    eliminar
  }
}
