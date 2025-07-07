const bcrypt = require('bcrypt')
const fs = require('fs')

async function generarSQLPersonal() {
  const saltRounds = 5
  let sql = 'INSERT INTO personal (ocupacion, nombre, apellido, contrasena, fecha_nacimiento, correo, dni, telefono, imagen) VALUES\n'

  for (let i = 1; i <= 50; i++) {
    const hash = await bcrypt.hash('contrasena123', saltRounds)
    let ocupacion = ''
    if (i <= 30) {
      ocupacion = 'Profesor'
    } else if (i <= 35) {
      ocupacion = 'Secretario'
    } else {
      const ocupacionesExtra = ['Director', 'Vicedirector', 'Preceptor', 'Bibliotecario', 'Bedel']
      ocupacion = ocupacionesExtra[(i - 36) % ocupacionesExtra.length]
    }

    const nombre = `PersonalNombre${i}`
    const apellido = `PersonalApellido${i}`
    const correo = `personal${i}@gmail.com`
    const dni = 40000000 + i
    const telefono = `11${Math.floor(Math.random() * 90000000 + 10000000)}`
    const imagen = null

    sql += `('${ocupacion}', '${nombre}', '${apellido}', '${hash}', '1985-01-01', '${correo}', ${dni}, '${telefono}', NULL)${i < 50 ? ',' : ';'}\n`
  }

  // Escribir en archivo
  fs.writeFileSync('inserts_personal.sql', sql)
  console.log('✅ Archivo inserts_personal.sql generado correctamente.')
}

generarSQLPersonal()
