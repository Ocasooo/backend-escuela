const tabla = 'curso'

module.exports = function (dbinyectada) {
  let db = dbinyectada || require('../../DB/mysql.js')

  function todos() {
    return db.todos(tabla)
  }

  function uno(id) {
    return db.uno(tabla, id)
  }

  function agregar(body) {
    return db.agregar(tabla, body)
  }

  function editar(id, body) {
    return db.editar(tabla, id, body)
  }

  function eliminar(body) {
    return db.eliminar(tabla, body)
  }

  return {
    todos,
    uno,
    agregar,
    editar,
    eliminar
  }
}
