const tabla = 'curso'

module.exports = function (dbinyectada) {
  let db = dbinyectada || require('../../DB/mysql.js')

  function todos() {
    return db.todos(tabla)
  }

  function uno(id) {
    return db.uno(tabla, id)
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

      // Primero borrar las relaciones hijas
      await db.customQuery('DELETE FROM curso_has_alumno WHERE curso_id = ?', [id])
      await db.customQuery('DELETE FROM curso_has_personal WHERE curso_id = ?', [id])

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
