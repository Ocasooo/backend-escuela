// src/scripts/init_db.js
const mysql = require('mysql2')
const bcrypt = require('bcrypt')
const fs = require('fs')
const path = require('path')
const config = require('../config.js')

async function initDatabase() {
  const dbName = config.mysql.database || 'escuela'
  console.log(`🚀 Iniciando creación de base de datos '${dbName}' en MySQL...`)

  // 1. Conexión sin base de datos seleccionada
  const connConfig = {
    host: config.mysql.host,
    port: config.mysql.port,
    user: config.mysql.user,
    password: config.mysql.password,
    multipleStatements: true
  }
  if (config.mysql.ssl) {
    connConfig.ssl = config.mysql.ssl
  }
  const conexion = mysql.createConnection(connConfig)

  conexion.connect(async (err) => {
    if (err) {
      console.error('❌ Error de conexión al servidor MySQL:', err.message)
      process.exit(1)
    }

    try {
      // 2. Crear base de datos
      await queryPromise(conexion, `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`)
      await queryPromise(conexion, `USE \`${dbName}\`;`)
      console.log(`✅ Base de datos '${dbName}' creada o seleccionada exitosamente.`)

      // 3. Ejecutar esquema SQL
      const rutaEsquema = path.join(__dirname, '../../esquema_escuela.sql')
      if (fs.existsSync(rutaEsquema)) {
        let sql = fs.readFileSync(rutaEsquema, 'utf8')
        // Eliminar USE y CREATE DATABASE para que use el dbName de config
        sql = sql.replace(/CREATE DATABASE IF NOT EXISTS[^;]+;/gi, '')
        sql = sql.replace(/USE [^;]+;/gi, '')

        await queryPromise(conexion, sql)
        console.log('✅ Tablas del sistema creadas exitosamente.')
      }

      // 4. Crear usuarios iniciales (Admin, Profesor, Alumno) con contraseñas encriptadas
      const saltRounds = 5
      const passAdmin = await bcrypt.hash('admin123', saltRounds)
      const passComun = await bcrypt.hash('123456', saltRounds)

      // Admin inicial
      await queryPromise(
        conexion,
        `INSERT INTO personal (id, ocupacion, nombre, apellido, contrasena, fecha_nacimiento, correo, dni, telefono)
         VALUES (1, 'Administrador', 'Franco', 'Makula', ?, '1990-01-01', 'admin@escuela.edu.ar', 35123456, '3794998877')
         ON DUPLICATE KEY UPDATE contrasena = VALUES(contrasena)`,
        [passAdmin]
      )

      // Profesor inicial
      await queryPromise(
        conexion,
        `INSERT INTO personal (id, ocupacion, nombre, apellido, contrasena, fecha_nacimiento, correo, dni, telefono)
         VALUES (2, 'Profesor', 'Roberto', 'Gómez', ?, '1985-05-15', 'profesor@escuela.edu.ar', 28456123, '3794556677')
         ON DUPLICATE KEY UPDATE contrasena = VALUES(contrasena)`,
        [passComun]
      )

      // Alumno inicial
      await queryPromise(
        conexion,
        `INSERT INTO alumno (id, nombre, apellido, contrasena, fecha_nacimiento, correo, dni, telefono, domicilio)
         VALUES (1, 'Juan Manuel', 'González', ?, '1998-10-20', 'alumno@escuela.edu.ar', 41234567, '3794112233', 'Av. Sarmiento 1234')
         ON DUPLICATE KEY UPDATE contrasena = VALUES(contrasena)`,
        [passComun]
      )

      // Cursos iniciales
      await queryPromise(
        conexion,
        `INSERT IGNORE INTO curso (id, nombre, descripcion) VALUES
         (1, 'Electricidad Industrial y Domiciliaria', 'Instalaciones eléctricas reglamentarias, cálculo de cargas y protecciones.'),
         (2, 'Programación Web y Bases de Datos', 'Desarrollo web moderno con Node, TypeScript, Tailwind y bases de datos relacionales.'),
         (3, 'Electrónica Digital y Microcontroladores', 'Diseño de circuitos impresos, microcontroladores y programación embebida.')`
      )

      // Asignar docente al curso 1 y 2
      await queryPromise(
        conexion,
        `INSERT IGNORE INTO curso_has_personal (personal_id, curso_id) VALUES (2, 1), (1, 2)`
      )

      // Matricular alumno al curso 1
      await queryPromise(
        conexion,
        `INSERT IGNORE INTO curso_has_alumno (alumno_id, curso_id, anio, estado_terminacion, estado, nota)
         VALUES (1, 1, 2024, 'cursando', 'cursando', 8.5)`
      )

      // Aulas y Horarios iniciales
      await queryPromise(
        conexion,
        `INSERT IGNORE INTO aula (id, nombre) VALUES
         (1, 'Taller de Electricidad'),
         (2, 'Laboratorio de Computación'),
         (3, 'Aula Teórica 1')`
      )

      await queryPromise(
        conexion,
        `INSERT IGNORE INTO horario (id, dia, hora_inicio, hora_fin) VALUES
         (1, 'Lunes', '18:30:00', '21:30:00'),
         (2, 'Miércoles', '18:30:00', '21:30:00'),
         (3, 'Martes', '14:00:00', '18:00:00')`
      )

      console.log('\n🎉 ¡Base de datos inicializada correctamente!')
      console.log('------------------------------------------------------------')
      console.log('🔑 Credenciales creadas:')
      console.log('   - Administrador: admin@escuela.edu.ar | Contraseña: admin123')
      console.log('   - Profesor:      profesor@escuela.edu.ar | Contraseña: 123456')
      console.log('   - Alumno:        alumno@escuela.edu.ar | Contraseña: 123456')
      console.log('------------------------------------------------------------\n')

      conexion.end()
      process.exit(0)
    } catch (error) {
      console.error('❌ Error al inicializar base de datos:', error)
      conexion.end()
      process.exit(1)
    }
  })
}

function queryPromise(con, sql, params = []) {
  return new Promise((resolve, reject) => {
    con.query(sql, params, (err, res) => {
      if (err) return reject(err)
      resolve(res)
    })
  })
}

initDatabase()
