// src/modules/examen/index.js

const db = require('../../DB/mysql.js')
const ctrl = require('./controlador.js')

module.exports = ctrl(db)
