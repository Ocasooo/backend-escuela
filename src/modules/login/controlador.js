const bcrypt = require('bcrypt');

module.exports = function (dbinyectada) {
  let db = dbinyectada;
  if (!db) {
    db = require('../../DB/mysql.js');
  }

  async function login({ Correo, Contrasena }) {
    // Buscar en alumno
    let user = await db.query('alumno', { Correo });
    let tipo = 'alumno';

    // Si no está en alumno, buscar en personal
    if (!user) {
      user = await db.query('personal', { Correo });
      tipo = 'personal';
    }

    if (!user) {
      throw new Error('Correo o contraseña incorrectos');
    }

    // Comparar contraseña con bcrypt
    const match = await bcrypt.compare(Contrasena, user.Contrasena);
    if (!match) {
      throw new Error('Correo o contraseña incorrectos');
    }

    return {
      mensaje: 'Login exitoso',
      tipo,
      correo: user.Correo,
      id: user.idAlumno || user.idPersonal,
      nombre: user.Nombre,
      apellido: user.Apellido
    };
  }

  return {
    login
  };
};
