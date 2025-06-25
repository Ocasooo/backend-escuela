const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const SECRET = process.env.JWT_SECRET || 'claveSuperSecreta'

module.exports = function (dbinyectada) {
  let db = dbinyectada
  if (!db) {
    db = require('../../DB/mysql.js')
  }

  async function login({ correo, contrasena }) {
    // Buscar en alumno
    let user = await db.query('personal', { correo: correo })
    let tipo = 'personal'

    // Si no está en alumno, buscar en personal
    if (!user) {
      user = await db.query('alumno', { correo: correo })
      tipo = 'alumno'
    }

    if (!user || !user.contrasena) {
      throw new Error('Correo o contraseña incorrectos')
    }

    // Comparar con bcrypt
    await bcrypt.compare(contrasena, user.contrasena)
      .then(res => {
        // Crear token
        const payload = {
          tipo,
          correo: user.correo,
          id: user.id,
          nombre: user.nombre,
          apellido: user.apellido,
          rol: user.ocupacion
        }
      })
      .catch(err =>{
        throw new Error(err)
      })

    // Crear token
    const payload = {
      tipo,
      correo: user.correo,
      id: user.id,
      nombre: user.nombre,
      apellido: user.apellido
    }

    const token = jwt.sign(payload, SECRET, { expiresIn: '1h' })

    return {
      mensaje: 'Login exitoso',
      token,
      usuario: payload
    }
  }

  return {
    login
  }
}
