const db = require('../../DB/mysql.js')
const controladorCRUD = require('./controladorCRUD.js')
const relaciones = require('./cursoAsignacion.js')
const extra = require('./controladorExtra.js') // ✅ nuevo

module.exports = {
  crud: controladorCRUD(db),
  relaciones: relaciones(db),
  extra: extra(db) // ✅ agregar
}
