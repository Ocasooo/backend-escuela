const db = require('../../DB/mysql.js')
const controladorCRUD = require('./controladorCRUD.js')
const relaciones = require('./cursoAsignacion.js')

module.exports = {
  crud: controladorCRUD(db),
  relaciones: relaciones(db)
}
