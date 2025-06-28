const tabla = 'curso_html'

module.exports = function (dbinyectada) {
  let db = dbinyectada
  if (!db) db = require('../../DB/mysql.js')

  function todos() {
    return db.todos(tabla)
  }

  function uno(id) {
    return db.uno(tabla, id)
  }

  function eliminar(data) {
    return db.eliminar(tabla, data)
  }

  function porCursoId(cursoId) {
    return db.query(tabla, { id: cursoId })
  }

  async function guardar(data) {
    const existente = await db.query(tabla, { id: data.id })
    if (existente) {
      return db.editar(tabla, data.id, data) // UPDATE
    } else {
      return db.agregar(tabla, data) // INSERT
    }
  }

  return {
    todos,
    uno,
    eliminar,
    porCursoId,
    guardar
  }
}
