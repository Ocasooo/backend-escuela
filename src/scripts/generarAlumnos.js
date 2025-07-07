const bcrypt = require('bcrypt')

async function generarSQL() {
  const saltRounds = 5
  let sql = 'INSERT INTO alumno (nombre, apellido, contrasena, fecha_nacimiento, correo, dni, domicilio, nacionalidad, nivel_estudio, estado_civil, telefono, ocupacion, programa_social, discapacidad, imagen) VALUES\n'

  for (let i = 1; i <= 100; i++) {
    const hash = await bcrypt.hash('contrasena123', saltRounds)
    const nombre = `Nombre${i}`
    const apellido = `Apellido${i}`
    const correo = `usuario${i}@gmail.com`
    const dni = 30000000 + i
    const domicilio = `Calle Ejemplo ${i}`
    const nacionalidad = 'Argentina'
    const nivel_estudio = i % 2 === 0 ? 'Secundario completo' : 'Universitario'
    const estado_civil = i % 3 === 0 ? 'Casado' : 'Soltero'
    const telefono = `11${Math.floor(Math.random() * 90000000 + 10000000)}`
    const ocupacion = i % 2 === 0 ? 'Estudiante' : 'Empleado'
    const programa_social = i % 5 === 0 ? 'AUH' : null
    const discapacidad = i % 7 === 0 ? 'Visual' : null
    const imagen = null

    sql += `('${nombre}', '${apellido}', '${hash}', '1995-01-01', '${correo}', ${dni}, '${domicilio}', '${nacionalidad}', '${nivel_estudio}', '${estado_civil}', '${telefono}', '${ocupacion}', ${programa_social ? `'${programa_social}'` : 'NULL'}, ${discapacidad ? `'${discapacidad}'` : 'NULL'}, ${imagen ? `'${imagen}'` : 'NULL'})${i < 100 ? ',' : ';'}\n`
  }

  console.log(sql)
}

generarSQL()
