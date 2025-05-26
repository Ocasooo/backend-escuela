//Constructor al que inyectar la bd

const db = require('../../DB/mysql.js')
const ctrl = require('./controlador.js')

module.exports= ctrl(db)