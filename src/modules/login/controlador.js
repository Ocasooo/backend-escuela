const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const db = require('../../DB/mysql.js')
const SECRET = process.env.JWT_SECRET || 'claveSuperSecreta'

module.exports = function () {
  async function login(datos) {
    const { correo, contrasena } = datos

    // Buscar primero en tabla personal
    let rows = await db.customQuery(`SELECT * FROM personal WHERE correo = ?`, [correo])
    let usuario = rows[0]
    let tabla = 'personal'

    if (!usuario) {
      // Si no existe en personal, buscar en alumno
      rows = await db.customQuery(`SELECT * FROM alumno WHERE correo = ?`, [correo])
      usuario = rows[0]
      tabla = 'alumno'
    }

    if (!usuario) {
      throw new Error('Usuario no encontrado')
    }

    // Verificar contraseña
    const match = await bcrypt.compare(contrasena, usuario.contrasena)
    if (!match) {
      throw new Error('Contraseña incorrecta')
    }

    // Determinar ocupacion correctamente
    let ocupacion = ''
    if (tabla === 'personal') {
      ocupacion = usuario.ocupacion ? usuario.ocupacion.toLowerCase() : 'personal'
    } else {
      ocupacion = 'alumno'
    }

    // Crear token
    const payload = {
      id: usuario.id,
      correo: usuario.correo,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      ocupacion
    }
    const token = jwt.sign(payload, SECRET, { expiresIn: '24h' })

    return {
      token,
      usuario: payload
    }
  }

  return {
    login
  }
}
