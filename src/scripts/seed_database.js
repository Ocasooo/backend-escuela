// src/scripts/seed_database.js
const mysql = require('mysql2')
const bcrypt = require('bcrypt')
const fs = require('fs')
const path = require('path')
const config = require('../config.js')

function limpiarCarpetasUploads() {
  const carpetas = [
    path.join(__dirname, '../../uploads'),
    path.join(__dirname, '../../uploads/examenes'),
    path.join(__dirname, '../../uploads/perfil'),
    path.join(__dirname, '../../uploads/foro'),
    path.join(__dirname, '../uploads')
  ]

  carpetas.forEach(dir => {
    if (!fs.existsSync(dir)) {
      try { fs.mkdirSync(dir, { recursive: true }) } catch (_) {}
      return
    }
    try {
      const archivos = fs.readdirSync(dir)
      for (const arch of archivos) {
        if (arch === '.gitkeep') continue
        const rutaCompleta = path.join(dir, arch)
        try {
          const stat = fs.statSync(rutaCompleta)
          if (stat.isFile()) {
            fs.unlinkSync(rutaCompleta)
          }
        } catch (_) {}
      }
    } catch (_) {}
  })
}

function seedDatabase(isStandalone = false) {
  return new Promise((resolve, reject) => {
    const dbName = config.mysql.database || 'ejemplo'
    console.log(`\n🌱 [Seed]: Conectando y poblando la base de datos '${dbName}'...`)

    // Limpiar archivos temporales subidos por usuarios
    limpiarCarpetasUploads()

    const connConfig = {
      host: config.mysql.host,
      port: config.mysql.port,
      user: config.mysql.user,
      password: config.mysql.password,
      database: dbName,
      multipleStatements: true
    }
    if (config.mysql.ssl) {
      connConfig.ssl = config.mysql.ssl
    }
    const conexion = mysql.createConnection(connConfig)

    conexion.connect(async (err) => {
      if (err) {
        console.error('❌ Error de conexión:', err.message)
        if (isStandalone) process.exit(1)
        return reject(err)
      }

    try {
      const saltRounds = 5
      // 1. Password para admin: "admin"
      const passAdmin = await bcrypt.hash('admin', saltRounds)
      // Password general de prueba: "123456"
      const passComun = await bcrypt.hash('123456', saltRounds)

      // 2. Limpiar tablas existentes en orden de claves foráneas
      await queryPromise(conexion, 'SET FOREIGN_KEY_CHECKS = 0;')
      await queryPromise(conexion, `
        CREATE TABLE IF NOT EXISTS \`foro_respuesta\` (
          \`id\` INT AUTO_INCREMENT PRIMARY KEY,
          \`foro_id\` INT NOT NULL,
          \`parent_id\` INT NULL,
          \`alumno_id\` INT NULL,
          \`personal_id\` INT NULL,
          \`contenido\` TEXT NOT NULL,
          \`imagen_url\` VARCHAR(500) NULL,
          \`enlace_url\` VARCHAR(500) NULL,
          \`editado\` TINYINT DEFAULT 0,
          \`fecha_creacion\` DATETIME DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_fr_foro (\`foro_id\`),
          INDEX idx_fr_parent (\`parent_id\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `)
      const tablas = [
        'alumno_material', 'curso_has_personal', 'curso_has_alumno',
        'curso_asignacion', 'aula_horario', 'examen', 'foro_respuesta', 'foro',
        'mensaje', 'material', 'unidades', 'curso_html',
        'horario', 'aula', 'curso', 'alumno', 'personal'
      ]
      for (const t of tablas) {
        await queryPromise(conexion, `TRUNCATE TABLE \`${t}\`;`)
      }
      await queryPromise(conexion, 'SET FOREIGN_KEY_CHECKS = 1;')
      console.log('🧹 Tablas limpiadas correctamente.')

      // 3. Crear Personal (Admin con admin@admin.com / admin, más docentes)
      console.log('👤 Creando personal y docentes...')
      await queryPromise(
        conexion,
        `INSERT INTO personal (id, ocupacion, nombre, apellido, contrasena, fecha_nacimiento, correo, dni, telefono) VALUES
         (1, 'Administrador', 'Franco', 'Makula', ?, '1990-01-01', 'admin@admin.com', 35123456, '3794998877'),
         (2, 'Profesor', 'Roberto', 'Gómez', ?, '1985-05-15', 'profesor@escuela.edu.ar', 28456123, '3794556677'),
         (3, 'Profesor', 'Marcos', 'Benítez', ?, '1988-08-20', 'mbenitez@escuela.edu.ar', 30123987, '3794667788'),
         (4, 'Profesor', 'Laura', 'Méndez', ?, '1992-03-10', 'lmendez@escuela.edu.ar', 32456789, '3794778899'),
         (5, 'Secretario', 'Martín', 'Sosa', ?, '1983-11-25', 'secretaria@escuela.edu.ar', 27654321, '3794889900');`,
        [passAdmin, passComun, passComun, passComun, passComun]
      )

      // 4. Crear Alumnos
      console.log('🎓 Creando estudiantes...')
      await queryPromise(
        conexion,
        `INSERT INTO alumno (id, nombre, apellido, contrasena, fecha_nacimiento, correo, dni, telefono, domicilio, nacionalidad, nivel_estudio, estado_civil, ocupacion) VALUES
         (1, 'Juan Manuel', 'González', ?, '1998-10-20', 'alumno@escuela.edu.ar', 41234567, '3794112233', 'Av. Sarmiento 1234', 'Argentina', 'Secundario completo', 'Soltero', 'Estudiante'),
         (2, 'María Belén', 'Pérez', ?, '1999-04-12', 'mperez@escuela.edu.ar', 42345678, '3794223344', 'Calle San Martín 567', 'Argentina', 'Terciario en curso', 'Soltera', 'Empleada'),
         (3, 'Lucas', 'Rodríguez', ?, '1997-07-30', 'lrodriguez@escuela.edu.ar', 40987654, '3794334455', 'B° San Jerónimo Mza 4', 'Argentina', 'Secundario completo', 'Soltero', 'Estudiante'),
         (4, 'Sofía', 'Fernández', ?, '2000-12-05', 'sfernandez@escuela.edu.ar', 43123789, '3794445566', 'Calle Junín 890', 'Argentina', 'Universitario', 'Soltera', 'Estudiante'),
         (5, 'Carlos', 'Ruiz', ?, '1996-02-18', 'cruiz@escuela.edu.ar', 39876543, '3794556677', 'Av. 3 de Abril 2341', 'Argentina', 'Secundario completo', 'Casado', 'Empleado'),
         (6, 'Valeria', 'Díaz', ?, '2001-09-14', 'vdiaz@escuela.edu.ar', 44567890, '3794667788', 'Calle Belgrano 432', 'Argentina', 'Secundario completo', 'Soltera', 'Estudiante'),
         (7, 'Joaquín', 'Albornoz', ?, '1999-11-22', 'jalbornoz@escuela.edu.ar', 45123111, '3794778811', 'Av. Armenia 3040', 'Argentina', 'Secundario completo', 'Soltero', 'Estudiante'),
         (8, 'Camila', 'Navarro', ?, '2000-06-18', 'cnavarro@escuela.edu.ar', 45876222, '3794889922', 'Calle España 1150', 'Argentina', 'Terciario en curso', 'Soltera', 'Empleada'),
         (9, 'Ignacio', 'Herrera', ?, '1998-03-05', 'iherrera@escuela.edu.ar', 43981333, '3794990033', 'Av. Cazadores 1820', 'Argentina', 'Universitario', 'Soltero', 'Estudiante'),
         (10, 'Lucía', 'Romero', ?, '2002-08-14', 'lromero@escuela.edu.ar', 46234444, '3794001144', 'Calle Salta 720', 'Argentina', 'Secundario completo', 'Soltera', 'Estudiante');`,
        [passComun, passComun, passComun, passComun, passComun, passComun, passComun, passComun, passComun, passComun]
      )

      // 5. Crear Cursos
      console.log('📚 Creando cursos...')
      await queryPromise(
        conexion,
        `INSERT INTO curso (id, nombre, descripcion) VALUES
         (1, 'Electricidad Industrial y Domiciliaria', 'Instalaciones eléctricas de baja tensión, tableros de comando, cálculo de conductores y normas IRAM.'),
         (2, 'Programación Web y Bases de Datos', 'Desarrollo web full stack con TypeScript, Node.js, Express, bases de datos relacionales MySQL y diseño UI.'),
         (3, 'Electrónica Digital y Microcontroladores', 'Diseño de circuitos lógicos, microcontroladores PIC/Arduino y automatismos básicos.'),
         (4, 'Refrigeración y Climatización', 'Diagnóstico, carga de fluidos refrigerantes y mantenimiento preventivo de equipos frío/calor.'),
         (5, 'Tornería y Mecánica Industrial', 'Mecanizado de piezas, uso de torno paralelo, fresadora e instrumentos de medición de precisión.');`
      )

      // 6. Asignar Profesores a Cursos (con Franco Makula como Admin y Docente en todos los cursos)
      console.log('👨‍🏫 Asignando docentes a cursos...')
      await queryPromise(
        conexion,
        `INSERT INTO curso_has_personal (personal_id, curso_id) VALUES
         (1, 1), -- Franco Makula (Admin + Docente)
         (1, 2),
         (1, 3),
         (1, 4),
         (1, 5),
         (2, 1), -- Roberto Gómez en Electricidad
         (2, 4), -- Roberto Gómez en Refrigeración
         (2, 5), -- Roberto Gómez en Tornería
         (3, 2), -- Marcos Benítez en Programación
         (3, 5), -- Marcos Benítez en Tornería
         (4, 1), -- Laura Méndez en Electricidad
         (4, 3); -- Laura Méndez en Electrónica`
      )

      // 7. Matricular Alumnos a Cursos con Estados y Notas
      console.log('📋 Matriculando estudiantes y notas de cursado...')
      await queryPromise(
        conexion,
        `INSERT INTO curso_has_alumno (alumno_id, curso_id, anio, estado_terminacion, estado, nota) VALUES
         -- ==============================================================
         -- CICLO LECTIVO ACTUAL 2026 (CURSANDO ACTIVO, SIN NOTA CERRADA)
         -- ==============================================================
         -- Curso 1: Electricidad Industrial
         (1, 1, 2026, 'cursando', 'cursando', NULL),
         (2, 1, 2026, 'cursando', 'cursando', NULL),
         (3, 1, 2026, 'cursando', 'cursando', NULL),
         (7, 1, 2026, 'cursando', 'cursando', NULL),
         (8, 1, 2026, 'cursando', 'cursando', NULL),

         -- Curso 2: Programación Web y Bases de Datos
         (1, 2, 2026, 'cursando', 'cursando', NULL),
         (2, 2, 2026, 'cursando', 'cursando', NULL),
         (4, 2, 2026, 'cursando', 'cursando', NULL),
         (9, 2, 2026, 'cursando', 'cursando', NULL),
         (10, 2, 2026, 'cursando', 'cursando', NULL),

         -- Curso 3: Electrónica Digital y Microcontroladores
         (3, 3, 2026, 'cursando', 'cursando', NULL),
         (4, 3, 2026, 'cursando', 'cursando', NULL),
         (5, 3, 2026, 'cursando', 'cursando', NULL),
         (7, 3, 2026, 'cursando', 'cursando', NULL),

         -- Curso 4: Refrigeración y Climatización
         (5, 4, 2026, 'cursando', 'cursando', NULL),
         (6, 4, 2026, 'cursando', 'cursando', NULL),
         (8, 4, 2026, 'cursando', 'cursando', NULL),
         (9, 4, 2026, 'cursando', 'cursando', NULL),

         -- Curso 5: Tornería y Mecánica Industrial
         (2, 5, 2026, 'cursando', 'cursando', NULL),
         (3, 5, 2026, 'cursando', 'cursando', NULL),
         (6, 5, 2026, 'cursando', 'cursando', NULL),
         (10, 5, 2026, 'cursando', 'cursando', NULL),

         -- ==============================================================
         -- CICLOS ANTERIORES HISTÓRICOS (CON NOTAS ASIGNADAS)
         -- ==============================================================
         -- Ciclo 2025
         (1, 1, 2025, 'aprobado', 'aprobado', 8.50),
         (4, 1, 2025, 'desaprobado', 'desaprobado', 4.50),
         (3, 2, 2025, 'aprobado', 'aprobado', 9.00),
         (5, 2, 2025, 'desaprobado', 'desaprobado', 5.00),
         (6, 3, 2025, 'aprobado', 'aprobado', 7.50),

         -- Ciclo 2024 (Egresados e históricos)
         (1, 3, 2024, 'finalizado', 'egresado', 9.00),
         (2, 3, 2024, 'finalizado', 'egresado', 10.00),
         (5, 1, 2024, 'aprobado', 'aprobado', 8.00),
         (6, 1, 2024, 'aprobado', 'aprobado', 7.80);`
      )

      // 8. Crear Unidades Temáticas
      console.log('📖 Creando unidades temáticas...')
      await queryPromise(
        conexion,
        `INSERT INTO unidades (id, curso_id, nombre, descripcion, orden) VALUES
         -- Curso 1: Electricidad
         (1, 1, 'Unidad 1: Fundamentos de la Corriente Alterna', 'Leyes de Kirchhoff, cálculo de impedancia, potencia activa, reactiva y aparente.', 1),
         (2, 1, 'Unidad 2: Tableros Eléctricos y Protecciones', 'Termomagnéticas, disyuntores diferenciales, puesta a tierra y normas AEA.', 2),
         (3, 1, 'Unidad 3: Motores Eléctricos y Automatización', 'Motores monofásicos y trifásicos, contactores y esquemas de arranque.', 3),
         -- Curso 2: Programación Web
         (4, 2, 'Unidad 1: Arquitectura Web y TypeScript', 'Fundamentos del desarrollo web moderno, componentes y tipado estricto.', 1),
         (5, 2, 'Unidad 2: Backend con Node.js y Express', 'Diseño de endpoints REST, autenticación JWT y middleware de seguridad.', 2),
         (6, 2, 'Unidad 3: Bases de Datos Relacionales', 'Modelado relacional, consultas SQL parametrizadas e integridad referencial.', 3),
         -- Curso 3: Electrónica Digital
         (7, 3, 'Unidad 1: Lógica Digital y Compuertas', 'Álgebra de Boole, tablas de verdad, simplificación de Karnaugh y compuertas lógicas.', 1),
         (8, 3, 'Unidad 2: Microcontroladores y Arquitectura Arduino', 'Arquitectura AVR/ARM, puertos de entrada/salida y temporizadores por interrupción.', 2),
         (9, 3, 'Unidad 3: Sensores, Actuadores y PWM', 'Adquisición de señales analógicas, modulación de ancho de pulso y control de potencia.', 3),
         -- Curso 4: Refrigeración y Climatización
         (10, 4, 'Unidad 1: Termodinámica y Ciclo de Compresión', 'Principios termodinámicos, estados del refrigerante, presión de evaporación y condensación.', 1),
         (11, 4, 'Unidad 2: Circuitos y Automatismos Frigoríficos', 'Termostatos, presostatos, relevos térmicos y contactores en equipos split y comerciales.', 2),
         (12, 4, 'Unidad 3: Detección de Fugas, Vacío y Carga de Gas', 'Uso de bomba de vacío, vacuómetro digital, manómetros manifold y balanza de carga.', 3),
         -- Curso 5: Tornería y Mecánica Industrial
         (13, 5, 'Unidad 1: Metrología y Mediciones de Precisión', 'Uso correcto de calibre pie de rey, micrómetro exterior y reloj comparador.', 1),
         (14, 5, 'Unidad 2: Torno Paralelo: Cilindrado y Frenteado', 'Cinemática de la máquina, selección de herramientas de corte y velocidades de mecanizado.', 2),
         (15, 5, 'Unidad 3: Roscado y Fresado de Piezas', 'Tablas de pasos de roscas métricas y Whitworth, fresado frontal y seguridad en taller.', 3);`
      )

      // 9. Crear Aulas y Horarios
      console.log('🏫 Creando aulas y horarios...')
      await queryPromise(
        conexion,
        `INSERT INTO aula (id, nombre) VALUES
         (1, 'Taller de Electricidad'),
         (2, 'Laboratorio de Informática'),
         (3, 'Aula Teórica 1'),
         (4, 'Taller de Mecánica y Tornería');`
      )

      await queryPromise(
        conexion,
        `INSERT INTO horario (id, dia, hora_inicio, hora_fin) VALUES
         (1, 'Lunes', '18:30:00', '21:30:00'),
         (2, 'Miércoles', '18:30:00', '21:30:00'),
         (3, 'Martes', '14:00:00', '18:00:00'),
         (4, 'Jueves', '14:00:00', '18:00:00'),
         (5, 'Viernes', '08:00:00', '12:00:00'),
         (6, 'Sábados', '08:30:00', '12:30:00');`
      )

      await queryPromise(
        conexion,
        `INSERT INTO aula_horario (aula_id, horario_id) VALUES
         (1, 1), (1, 2), (2, 3), (2, 4), (3, 5), (4, 4), (1, 3);`
      )

      await queryPromise(
        conexion,
        `INSERT INTO curso_asignacion (curso_id, aula_id, horario_id) VALUES
         (1, 1, 1),
         (1, 1, 2),
         (2, 2, 3),
         (2, 2, 4),
         (3, 3, 5),
         (4, 1, 3),
         (5, 4, 4);`
      )

      // 10. Materiales, Trabajos Prácticos y Generación de Archivos Físicos Reales
      console.log('📑 Generando archivos PDF reales y poblando materiales...')
      const { generarPDF } = require('./pdf_generator.js');

      // Generar PDFs de Guías y Enunciados
      generarPDF('uploads/guia_corriente_alterna.pdf', {
        title: 'Guía Práctica de Corriente Alterna y Circuitos RLC',
        course: 'Electricidad Industrial y Domiciliaria',
        unit: 'Unidad 1: Fundamentos de la Corriente Alterna',
        type: 'Material Didáctico Teórico',
        paragraphs: [
          'Esta guía aborda los fundamentos de la generación y distribución de corriente alterna senoidal.',
          'Se estudian los conceptos de valor eficaz, impedancia compleja y factor de potencia.'
        ],
        items: [
          'Leyes de Kirchhoff aplicadas a circuitos de corriente alterna.',
          'Cálculo de impedancia Z = R + j(XL - XC).',
          'Determinación de potencia activa (kW), reactiva (kVAR) y aparente (kVA).',
          'Compensación del factor de potencia mediante banco de capacitores.'
        ]
      });

      generarPDF('uploads/tp1_enunciado.pdf', {
        title: 'TP N° 1 - Ley de Ohm y Circuitos Serie-Paralelo',
        course: 'Electricidad Industrial y Domiciliaria',
        unit: 'Unidad 1: Fundamentos de la Corriente Alterna',
        type: 'Trabajo Práctico Evaluativo - Enunciado',
        paragraphs: [
          'Consigna práctica de resolución y análisis de circuitos eléctricos mixtos.',
          'El estudiante deberá realizar los cálculos teóricos y contrastar con valores de laboratorio.'
        ],
        items: [
          'Calcular la corriente total en un circuito mixto con alimentación de 220V.',
          'Calcular la caída de tensión en cada una de las resistencias del circuito.',
          'Esquematizar el conexionado con instrumental de medición (voltímetro y amperímetro).',
          'Entregar el informe con conclusiones técnicas y gráficos correspondientes.'
        ]
      });

      generarPDF('uploads/manual_tableros_aea.pdf', {
        title: 'Manual de Tableros Eléctricos y Normas AEA',
        course: 'Electricidad Industrial y Domiciliaria',
        unit: 'Unidad 2: Tableros Eléctricos y Protecciones',
        type: 'Normativa Técnica y Manual de Aplicación',
        paragraphs: [
          'Guía de diseño y ejecución de tableros de distribución conforme a la norma AEA 90364-7-771.',
          'Criterios para la elección de envolventes, barras colectoras y dispositivos de protección.'
        ],
        items: [
          'Selección de interruptores termomagnéticos curvas B, C y D.',
          'Disyuntores diferenciales de alta sensibilidad (30 mA) para protección de personas.',
          'Puesta a tierra de protección y medición de resistencia de jabalina con telurímetro.',
          'Codificación de colores y sección mínima de conductores según reglamentación.'
        ]
      });

      generarPDF('uploads/tp2_enunciado.pdf', {
        title: 'TP N° 2 - Dimensionamiento de Conductores y Protecciones',
        course: 'Electricidad Industrial y Domiciliaria',
        unit: 'Unidad 2: Tableros Eléctricos y Protecciones',
        type: 'Trabajo Práctico Evaluativo - Enunciado',
        paragraphs: [
          'Dimensionamiento de una instalación eléctrica para taller mecánico de 15 kW de potencia instalada.',
          'Se debe contemplar factor de simultaneidad y futura ampliación.'
        ],
        items: [
          'Determinar la corriente de proyecto Ib para cada circuito terminal.',
          'Calcular la sección de conductores considerando caída de tensión máxima admisible (3%).',
          'Verificar corriente admisible Iz del conductor frente a la corriente nominal In de la termomagnética.',
          'Diseñar el esquema unifilar del tablero general y tableros seccionales.'
        ]
      });

      generarPDF('uploads/guia_motores.pdf', {
        title: 'Esquemas de Conexión de Motores Trifásicos',
        course: 'Electricidad Industrial y Domiciliaria',
        unit: 'Unidad 3: Motores Eléctricos y Automatización',
        type: 'Material Didáctico de Cátedra',
        paragraphs: [
          'Principios de operación del motor de inducción trifásico tipo jaula de ardilla.',
          'Esquemas de fuerza y mando para automatización mediante contactores y pulsadores.'
        ],
        items: [
          'Interpretación de la placa de bornes y conexionado estrella-triángulo.',
          'Selección de relé térmico de sobrecarga y fusible de respaldo.',
          'Circuito de enclavamiento eléctrico para inversión de marcha.',
          'Temporizadores neumáticos y electrónicos para arranque secuencial.'
        ]
      });

      generarPDF('uploads/tp3_enunciado.pdf', {
        title: 'TP N° 3 - Arranque Estrella-Triángulo de Motores',
        course: 'Electricidad Industrial y Domiciliaria',
        unit: 'Unidad 3: Motores Eléctricos y Automatización',
        type: 'Trabajo Práctico Evaluativo - Enunciado',
        paragraphs: [
          'Diseño y simulación del arranque a tensión reducida de un motor trifásico de 10 HP.',
          'Reducción del pico de corriente de arranque para evitar caídas de tensión en la red.'
        ],
        items: [
          'Calcular la corriente nominal del motor y la corriente durante el arranque en estrella.',
          'Dibujar el diagrama de conexión de potencia con los 3 contactores (Línea, Estrella, Triángulo).',
          'Dibujar el diagrama de mando con pulsadores marcha/parada y temporizador.',
          'Describir la secuencia cronológica de operación de los contactores.'
        ]
      });

      generarPDF('uploads/guia_typescript.pdf', {
        title: 'Manual de TypeScript y Configuración de Proyecto',
        course: 'Programación Web y Bases de Datos',
        unit: 'Unidad 1: Arquitectura Web y TypeScript',
        type: 'Guía de Desarrollo y Buenas Prácticas',
        paragraphs: [
          'Introducción al tipado estricto en JavaScript y su aplicación en entornos backend.',
          'Configuración del compilador tsc, tsconfig.json y dependencias de desarrollo.'
        ],
        items: [
          'Definición de interfaces, types, enums y tipos genéricos.',
          'Uso de async/await y manejo estricto de excepciones.',
          'Estructura modular de carpetas (controllers, services, repositories).',
          'Compilación a JavaScript ES6 para despliegue en producción.'
        ]
      });

      generarPDF('uploads/tp1_web.pdf', {
        title: 'TP N° 1 - Creación de Servidor Express y Rutas',
        course: 'Programación Web y Bases de Datos',
        unit: 'Unidad 1: Arquitectura Web y TypeScript',
        type: 'Trabajo Práctico Evaluativo - Enunciado',
        paragraphs: [
          'Desarrollo de una API RESTful con Express para gestión de cursos y alumnos.',
          'Implementación de operaciones CRUD completas y validación de payload.'
        ],
        items: [
          'Configurar proyecto Node.js con package.json y dependencias express y cors.',
          'Implementar endpoints GET, POST, PUT y DELETE para el recurso cursos.',
          'Crear middleware de manejo de errores centralizado.',
          'Documentar las rutas y ejemplos de solicitud/respuesta en formato JSON.'
        ]
      });

      generarPDF('uploads/guia_seguridad.pdf', {
        title: 'Guía de Arquitectura de Endpoints y Seguridad',
        course: 'Programación Web y Bases de Datos',
        unit: 'Unidad 2: Backend con Node.js y Express',
        type: 'Manual de Seguridad y Autenticación',
        paragraphs: [
          'Estándares de seguridad para servicios web y protección de datos sensibles.',
          'Autenticación sin estado (Stateless) mediante JSON Web Tokens (JWT).'
        ],
        items: [
          'Hashing unidireccional de contraseñas con algoritmo bcrypt y salting.',
          'Estructura del token JWT (Header, Payload, Signature) y expiración.',
          'Middleware de verificación de token en cabecera Authorization: Bearer.',
          'Control de acceso basado en roles (RBAC): Admin, Profesor, Alumno.'
        ]
      });

      generarPDF('uploads/tp2_web.pdf', {
        title: 'TP N° 2 - Autenticación con JWT y Roles',
        course: 'Programación Web y Bases de Datos',
        unit: 'Unidad 2: Backend con Node.js y Express',
        type: 'Trabajo Práctico Evaluativo - Enunciado',
        paragraphs: [
          'Implementación del módulo de seguridad y autenticación para la aplicación escolar.',
          'Creación de endpoints de login, renovación de token y protección de recursos.'
        ],
        items: [
          'Ruta POST /api/login con verificación de credenciales contra la base de datos.',
          'Generación y firmado de JWT con payload seguro (sin passwords ni datos sensibles).',
          'Middleware requiereRol(rol) para restringir el acceso a administradores y profesores.',
          'Pruebas de endpoints con Postman o script de test automatizado.'
        ]
      });

      // Generar PDFs de Resoluciones Reales de Alumnos
      generarPDF('uploads/entrega_tp1_alumno1.pdf', {
        title: 'Resolución TP N° 1 - González, Juan Manuel',
        course: 'Electricidad Industrial y Domiciliaria',
        unit: 'Unidad 1: Fundamentos de la Corriente Alterna',
        type: 'Resolución de Alumno - Calificación: 9.00',
        paragraphs: [
          'Alumno: Juan Manuel González | Legajo: 2024-001 | Fecha de entrega: 10/04/2024',
          'Docente a cargo: Ing. Roberto Gómez | Estado: Calificado (Nota: 9.00)'
        ],
        items: [
          'Circuito 1: Resistencia equivalente Req = 48.5 ohms. Corriente total It = 4.53 A.',
          'Circuito 2: Caída de tensión en R1 = 98V, en R2 = 122V. Se cumple ley de tensiones.',
          'Medición práctica: Desvío del 2.3% respecto al valor teórico debido a tolerancia de componentes.',
          'Conclusión: Se verifican experimentalmente las relaciones de la Ley de Ohm.'
        ]
      });

      generarPDF('uploads/entrega_tp1_alumno2.pdf', {
        title: 'Resolución TP N° 1 - Pérez, María Belén',
        course: 'Electricidad Industrial y Domiciliaria',
        unit: 'Unidad 1: Fundamentos de la Corriente Alterna',
        type: 'Resolución de Alumno - Calificación: 8.50',
        paragraphs: [
          'Alumna: María Belén Pérez | Legajo: 2024-002 | Fecha de entrega: 11/04/2024',
          'Docente a cargo: Ing. Roberto Gómez | Estado: Calificado (Nota: 8.50)'
        ],
        items: [
          'Desarrollo matemático completo de los nodos del circuito mixto.',
          'Potencia disipada calculada: P = 998 Watts.',
          'Gráficos de caída de potencial incluidos en hoja adjunta.',
          'Devolución docente: Excelente memoria de cálculo, verificar escala en esquema unifilar.'
        ]
      });

      generarPDF('uploads/entrega_tp2_alumno1.pdf', {
        title: 'Resolución TP N° 2 - González, Juan Manuel',
        course: 'Electricidad Industrial y Domiciliaria',
        unit: 'Unidad 2: Tableros Eléctricos y Protecciones',
        type: 'Resolución de Alumno - Pendiente de Calificación',
        paragraphs: [
          'Alumno: Juan Manuel González | Legajo: 2024-001 | Fecha de entrega: Reciente',
          'Docente a cargo: Ing. Roberto Gómez | Estado: Entregado - Pendiente de corrección'
        ],
        items: [
          'Cálculo de carga total: 15 kW con factor de simultaneidad 0.75 resulta en 11.25 kW.',
          'Conductor seleccionado: Cable Cu 6 mm2 tipo IRAM 2178 para acometida principal.',
          'Protección seleccionada: Interruptor termomagnético tetrapolar de 40A curva C.',
          'Protección diferencial: Disyuntor 4x40A 30mA clase AC.'
        ]
      });

      generarPDF('uploads/entrega_tp2_alumno2.pdf', {
        title: 'Resolución TP N° 2 - Pérez, María Belén',
        course: 'Electricidad Industrial y Domiciliaria',
        unit: 'Unidad 2: Tableros Eléctricos y Protecciones',
        type: 'Resolución de Alumno - Pendiente de Calificación',
        paragraphs: [
          'Alumna: María Belén Pérez | Legajo: 2024-002 | Fecha de entrega: Reciente',
          'Docente a cargo: Ing. Roberto Gómez | Estado: Entregado - Pendiente de corrección'
        ],
        items: [
          'Cálculo de conductores por caída de tensión máxima de 1.8% menor al límite de 3%.',
          'Esquema unifilar detallado con barra de tierra y jabalina de cobre de 1.5 metros.',
          'Verificación de selectividad amperométrica y cronométrica en protecciones.',
          'Planilla de cargas por circuito monofásico y trifásico.'
        ]
      });

      generarPDF('uploads/entrega_tp2_alumno3.pdf', {
        title: 'Resolución TP N° 2 - Rodríguez, Carlos',
        course: 'Electricidad Industrial y Domiciliaria',
        unit: 'Unidad 2: Tableros Eléctricos y Protecciones',
        type: 'Resolución de Alumno - Pendiente de Calificación',
        paragraphs: [
          'Alumno: Carlos Rodríguez | Legajo: 2024-003 | Fecha de entrega: Reciente',
          'Docente a cargo: Ing. Roberto Gómez | Estado: Entregado - Pendiente de corrección'
        ],
        items: [
          'Memoria descriptiva de la instalación del taller de tornería.',
          'Dimensionamiento de cañerías de hierro semipesado según sección de conductores.',
          'Cálculo de corriente de cortocircuito presunta en bornes de tablero general.',
          'Plan de mantenimiento preventivo y ensayo periódico del pulsador del disyuntor.'
        ]
      });

      generarPDF('uploads/entrega_tp1_alumno1_web.pdf', {
        title: 'Resolución TP N° 1 - González, Juan Manuel (Web)',
        course: 'Programación Web y Bases de Datos',
        unit: 'Unidad 1: Arquitectura Web y TypeScript',
        type: 'Resolución de Alumno - Calificación: 9.50',
        paragraphs: [
          'Alumno: Juan Manuel González | Legajo: 2024-001 | Fecha de entrega: 15/04/2024',
          'Docente a cargo: Ing. Marcos Benítez | Estado: Calificado (Nota: 9.50)'
        ],
        items: [
          'Servidor montado en Express con soporte para TypeScript y ESM.',
          'Rutas REST implementadas con validación de DTOs y códigos de estado HTTP 200/201/400/500.',
          'Pruebas de integración ejecutadas con éxito para todos los verbos HTTP.',
          'Repositorio Git con commits atómicos y documentación README detallada.'
        ]
      });

      generarPDF('uploads/entrega_tp1_alumno2_web.pdf', {
        title: 'Resolución TP N° 1 - Pérez, María Belén (Web)',
        course: 'Programación Web y Bases de Datos',
        unit: 'Unidad 1: Arquitectura Web y TypeScript',
        type: 'Resolución de Alumno - Calificación: 9.00',
        paragraphs: [
          'Alumna: María Belén Pérez | Legajo: 2024-002 | Fecha de entrega: 16/04/2024',
          'Docente a cargo: Ing. Marcos Benítez | Estado: Calificado (Nota: 9.00)'
        ],
        items: [
          'Estructura en capas: Router -> Controller -> Service -> Model.',
          'Middleware para captura global de errores y formateo de respuestas JSON.',
          'Archivo de configuración dotenv con variables de entorno parametrizadas.',
          'Devolución docente: Código muy prolijo, continuar con la integración de base de datos.'
        ]
      });

      generarPDF('uploads/entrega_tp2_alumno1_web.pdf', {
        title: 'Resolución TP N° 2 - González, Juan Manuel (Web)',
        course: 'Programación Web y Bases de Datos',
        unit: 'Unidad 2: Backend con Node.js y Express',
        type: 'Resolución de Alumno - Pendiente de Calificación',
        paragraphs: [
          'Alumno: Juan Manuel González | Legajo: 2024-001 | Fecha de entrega: Reciente',
          'Docente a cargo: Ing. Marcos Benítez | Estado: Entregado - Pendiente de corrección'
        ],
        items: [
          'Implementación de login con bcrypt.compare y emisión de token JWT firmado.',
          'Middleware de autorización para proteger rutas sensibles según rol de usuario.',
          'Pruebas de seguridad: Bloqueo de acceso con token expirado o firma inválida.',
          'Colección de Postman exportada y adjunta para verificación docente.'
        ]
      });

      // Generar PDFs para Cursos 3, 4 y 5 y resoluciones de alumnos
      generarPDF('uploads/tp1_electronica.pdf', {
        title: 'TP N° 1 - Circuitos Combinacionales y Compuertas',
        course: 'Electrónica Digital y Microcontroladores',
        unit: 'Unidad 1: Lógica Digital y Compuertas',
        type: 'Trabajo Práctico Evaluativo - Enunciado',
        paragraphs: [
          'Análisis y simplificación de funciones booleanas mediante mapas de Karnaugh.',
          'Implementación práctica con compuertas lógicas integradas TTL/CMOS.'
        ],
        items: [
          'Construir la tabla de verdad para el circuito selector de 4 canales.',
          'Obtener la expresión mínima en suma de productos.',
          'Dibujar el esquema circuital con compuertas NAND y NOR.',
          'Verificar la respuesta en simulador digital.'
        ]
      });

      generarPDF('uploads/tp2_electronica.pdf', {
        title: 'TP N° 2 - Microcontroladores y Entradas/Salidas',
        course: 'Electrónica Digital y Microcontroladores',
        unit: 'Unidad 2: Microcontroladores y Arquitectura Arduino',
        type: 'Trabajo Práctico Evaluativo - Enunciado',
        paragraphs: [
          'Programación en C/C++ de microcontrolador para automatismo industrial.',
          'Control de temporización y lectura antirebote de pulsadores.'
        ],
        items: [
          'Configurar puertos GPIO como entrada con pull-up interno.',
          'Generar secuencia luminosa de advertencia con millis().',
          'Implementar máquina de estados finitos para control de cinta transportadora.'
        ]
      });

      generarPDF('uploads/tp1_refrigeracion.pdf', {
        title: 'TP N° 1 - Medición de Presiones y Sobrecalentamiento',
        course: 'Refrigeración y Climatización',
        unit: 'Unidad 1: Termodinámica y Ciclo de Compresión',
        type: 'Trabajo Práctico Evaluativo - Enunciado',
        paragraphs: [
          'Cálculo de sobrecalentamiento útil y subenfriamiento en circuito de refrigeración.',
          'Diagnóstico del rendimiento térmico de equipo split frío/calor.'
        ],
        items: [
          'Conectar manómetros de baja y alta presión al circuito frigorífico.',
          'Determinar temperatura de evaporación saturada según tabla P-T del gas R410A.',
          'Calcular el sobrecalentamiento SH = T_succion - T_evaporacion.',
          'Evaluar si el valor obtenido se encuentra en el rango admisible (5°C a 8°C).'
        ]
      });

      generarPDF('uploads/tp2_refrigeracion.pdf', {
        title: 'TP N° 2 - Detección de Fugas y Procedimiento de Vacío',
        course: 'Refrigeración y Climatización',
        unit: 'Unidad 3: Detección de Fugas, Vacío y Carga de Gas',
        type: 'Trabajo Práctico Evaluativo - Enunciado',
        paragraphs: [
          'Protocolo de deshidratación y evacuación de humedad en cañerías de refrigeración.',
          'Presurización con nitrógeno seco y ensayo con detector ultrasónico.'
        ],
        items: [
          'Presurizar a 150 PSI con nitrógeno y verificar estanqueidad.',
          'Evacuar con bomba de vacío de doble etapa hasta alcanzar 500 micrones.',
          'Realizar prueba de retención de vacío durante 20 minutos.',
          'Cargar refrigerante en fase líquida utilizando balanza de precisión.'
        ]
      });

      generarPDF('uploads/tp1_torneria.pdf', {
        title: 'TP N° 1 - Metrología y Mediciones de Precisión',
        course: 'Tornería y Mecánica Industrial',
        unit: 'Unidad 1: Metrología y Mediciones de Precisión',
        type: 'Trabajo Práctico Evaluativo - Enunciado',
        paragraphs: [
          'Lectura y aplicación de instrumentos de medición directa para piezas torneadas.',
          'Verificación de tolerancias dimensionales y geométricas según norma ISO.'
        ],
        items: [
          'Medición de diámetros exteriores e interiores con calibre decimal (0.02 mm).',
          'Medición de precisión con micrómetro de exteriores (0.01 mm).',
          'Determinación de planitud y paralelismo con reloj comparador.',
          'Completar la planilla de control de calidad de la muestra.'
        ]
      });

      generarPDF('uploads/tp2_torneria.pdf', {
        title: 'TP N° 2 - Torno Paralelo: Cilindrado y Frenteado',
        course: 'Tornería y Mecánica Industrial',
        unit: 'Unidad 2: Torno Paralelo: Cilindrado y Frenteado',
        type: 'Trabajo Práctico Evaluativo - Enunciado',
        paragraphs: [
          'Operaciones de mecanizado por arranque de viruta en material SAE 1020.',
          'Cálculo de revoluciones por minuto según velocidad de corte de la herramienta.'
        ],
        items: [
          'Centrado de pieza en plato de 3 mordazas autocentrantes.',
          'Frenteado de caras de referencia y perforado de centro para contrapunto.',
          'Cilindrado escalonado en 3 pasadas de desbaste y 1 de terminación.',
          'Verificación de rugosidad superficial y cota final.'
        ]
      });

      // Resoluciones adicionales de alumnos en 2026
      generarPDF('uploads/entrega_tp1_alumno7.pdf', {
        title: 'Resolución TP N° 1 - Albornoz, Joaquín',
        course: 'Electricidad Industrial y Domiciliaria',
        unit: 'Unidad 1: Fundamentos de la Corriente Alterna',
        type: 'Resolución de Alumno - Calificación: 7.50',
        paragraphs: ['Alumno: Joaquín Albornoz | Ciclo 2026', 'Calificado por: Ing. Roberto Gómez (Nota: 7.50)'],
        items: ['Cálculo de ley de Ohm y divisor de tensión completado.', 'Verificación en banco de pruebas experimental.']
      });

      generarPDF('uploads/entrega_tp1_alumno8.pdf', {
        title: 'Resolución TP N° 1 - Navarro, Camila',
        course: 'Electricidad Industrial y Domiciliaria',
        unit: 'Unidad 1: Fundamentos de la Corriente Alterna',
        type: 'Resolución de Alumno - Calificación: 9.20',
        paragraphs: ['Alumna: Camila Navarro | Ciclo 2026', 'Calificado por: Ing. Roberto Gómez (Nota: 9.20)'],
        items: ['Memoria de cálculo impecable y gráficos osciloscópicos adjuntos.']
      });

      generarPDF('uploads/entrega_tp1_alumno3_elect.pdf', {
        title: 'Resolución TP N° 1 - Rodríguez, Lucas (Electrónica)',
        course: 'Electrónica Digital y Microcontroladores',
        unit: 'Unidad 1: Lógica Digital y Compuertas',
        type: 'Resolución de Alumno - Calificación: 8.50',
        paragraphs: ['Alumno: Lucas Rodríguez | Ciclo 2026', 'Calificado por: Prof. Laura Méndez (Nota: 8.50)'],
        items: ['Simplificación booleana correcta y tabla de estados completa.']
      });

      generarPDF('uploads/entrega_tp1_alumno4_elect.pdf', {
        title: 'Resolución TP N° 1 - Fernández, Sofía (Electrónica)',
        course: 'Electrónica Digital y Microcontroladores',
        unit: 'Unidad 1: Lógica Digital y Compuertas',
        type: 'Resolución de Alumno - Calificación: 9.00',
        paragraphs: ['Alumna: Sofía Fernández | Ciclo 2026', 'Calificado por: Prof. Laura Méndez (Nota: 9.00)'],
        items: ['Diagramas lógicos implementados sin fallas de conmutación.']
      });

      generarPDF('uploads/entrega_tp1_alumno5_refrig.pdf', {
        title: 'Resolución TP N° 1 - Ruiz, Carlos (Refrigeración)',
        course: 'Refrigeración y Climatización',
        unit: 'Unidad 1: Termodinámica y Ciclo de Compresión',
        type: 'Resolución de Alumno - Calificación: 8.00',
        paragraphs: ['Alumno: Carlos Ruiz | Ciclo 2026', 'Calificado por: Ing. Roberto Gómez (Nota: 8.00)'],
        items: ['Mediciones de presión de baja en 120 PSI correctas para R410A.']
      });

      generarPDF('uploads/entrega_tp1_alumno6_refrig.pdf', {
        title: 'Resolución TP N° 1 - Díaz, Valeria (Refrigeración)',
        course: 'Refrigeración y Climatización',
        unit: 'Unidad 1: Termodinámica y Ciclo de Compresión',
        type: 'Resolución de Alumno - Calificación: 9.00',
        paragraphs: ['Alumna: Valeria Díaz | Ciclo 2026', 'Calificado por: Ing. Roberto Gómez (Nota: 9.00)'],
        items: ['Excelente informe de rendimiento frigorífico y COP calculado.']
      });

      generarPDF('uploads/entrega_tp1_alumno2_torn.pdf', {
        title: 'Resolución TP N° 1 - Pérez, María Belén (Tornería)',
        course: 'Tornería y Mecánica Industrial',
        unit: 'Unidad 1: Metrología y Mediciones de Precisión',
        type: 'Resolución de Alumno - Calificación: 8.50',
        paragraphs: ['Alumna: María Belén Pérez | Ciclo 2026', 'Calificado por: Ing. Roberto Gómez (Nota: 8.50)'],
        items: ['Control dimensional y rugosidad Ra = 1.6 dentro de tolerancia.']
      });

      generarPDF('uploads/entrega_tp1_alumno10_torn.pdf', {
        title: 'Resolución TP N° 1 - Romero, Lucía (Tornería)',
        course: 'Tornería y Mecánica Industrial',
        unit: 'Unidad 1: Metrología y Mediciones de Precisión',
        type: 'Resolución de Alumno - Calificación: 9.30',
        paragraphs: ['Alumna: Lucía Romero | Ciclo 2026', 'Calificado por: Ing. Roberto Gómez (Nota: 9.30)'],
        items: ['Mecanizado preciso en torno y memoria descriptiva destacada.']
      });

      console.log('✅ Archivos PDF físicos generados exitosamente en la carpeta uploads/.')

      // Insertar materiales en la base de datos
      await queryPromise(
        conexion,
        `INSERT INTO material (id, observacion, carpeta, archivo_scan, fecha_subida, curso_id, unidad_id, estado, calificacion, tipo) VALUES
         -- ==========================================================
         -- CONSIGNAS DE MATERIALES Y TPS
         -- ==========================================================
         -- Curso 1: Electricidad Industrial
         (1, 'Guía Práctica de Corriente Alterna y Circuitos RLC', 'material-u1-elect', 'uploads/guia_corriente_alterna.pdf', NOW(), 1, 1, 'activo', '----', 'guia'),
         (2, 'TP N° 1 - Ley de Ohm y Circuitos Serie-Paralelo', 'tp1-electricidad', 'uploads/tp1_enunciado.pdf', NOW(), 1, 1, 'activo', '----', 'tp'),
         (3, 'Manual de Tableros Eléctricos y Normas AEA', 'material-u2-elect', 'uploads/manual_tableros_aea.pdf', NOW(), 1, 2, 'activo', '----', 'guia'),
         (4, 'TP N° 2 - Dimensionamiento de Conductores y Protecciones', 'tp2-electricidad', 'uploads/tp2_enunciado.pdf', NOW(), 1, 2, 'activo', '----', 'tp'),
         (5, 'Esquemas de Conexión de Motores Trifásicos', 'material-u3-elect', 'uploads/guia_motores.pdf', NOW(), 1, 3, 'activo', '----', 'guia'),
         (6, 'TP N° 3 - Arranque Estrella-Triángulo de Motores', 'tp3-electricidad', 'uploads/tp3_enunciado.pdf', NOW(), 1, 3, 'activo', '----', 'tp'),

         -- Curso 2: Programación Web y Bases de Datos
         (7, 'Manual de TypeScript y Configuración de Proyecto', 'material-u1-web', 'uploads/guia_typescript.pdf', NOW(), 2, 4, 'activo', '----', 'guia'),
         (8, 'TP N° 1 - Creación de Servidor Express y Rutas', 'tp1-web', 'uploads/tp1_web.pdf', NOW(), 2, 4, 'activo', '----', 'tp'),
         (9, 'Guía de Arquitectura de Endpoints y Seguridad', 'material-u2-web', 'uploads/guia_seguridad.pdf', NOW(), 2, 5, 'activo', '----', 'guia'),
         (10, 'TP N° 2 - Autenticación con JWT y Roles', 'tp2-web', 'uploads/tp2_web.pdf', NOW(), 2, 5, 'activo', '----', 'tp'),

         -- Curso 3: Electrónica Digital y Microcontroladores
         (19, 'TP N° 1 - Circuitos Combinacionales y Compuertas', 'tp1-electronica', 'uploads/tp1_electronica.pdf', NOW(), 3, 7, 'activo', '----', 'tp'),
         (20, 'TP N° 2 - Microcontroladores y Entradas/Salidas', 'tp2-electronica', 'uploads/tp2_electronica.pdf', NOW(), 3, 8, 'activo', '----', 'tp'),

         -- Curso 4: Refrigeración y Climatización
         (21, 'TP N° 1 - Medición de Presiones y Sobrecalentamiento', 'tp1-refrigeracion', 'uploads/tp1_refrigeracion.pdf', NOW(), 4, 10, 'activo', '----', 'tp'),
         (22, 'TP N° 2 - Detección de Fugas y Procedimiento de Vacío', 'tp2-refrigeracion', 'uploads/tp2_refrigeracion.pdf', NOW(), 4, 12, 'activo', '----', 'tp'),

         -- Curso 5: Tornería y Mecánica Industrial
         (23, 'TP N° 1 - Metrología y Mediciones de Precisión', 'tp1-torneria', 'uploads/tp1_torneria.pdf', NOW(), 5, 13, 'activo', '----', 'tp'),
         (24, 'TP N° 2 - Torno Paralelo: Cilindrado y Frenteado', 'tp2-torneria', 'uploads/tp2_torneria.pdf', NOW(), 5, 14, 'activo', '----', 'tp'),

         -- ==========================================================
         -- ENTREGAS REALES DE ALUMNOS (CICLO ACTUAL 2026)
         -- ==========================================================
         -- Curso 1: Electricidad Industrial
         (11, 'Resolución TP N° 1 - González Juan Manuel', 'tp1-electricidad', 'uploads/entrega_tp1_alumno1.pdf', NOW(), 1, 1, 'calificado', '9.00', 'tp'),
         (12, 'Resolución TP N° 1 - Pérez María Belén', 'tp1-electricidad', 'uploads/entrega_tp1_alumno2.pdf', NOW(), 1, 1, 'calificado', '8.50', 'tp'),
         (13, 'Resolución TP N° 2 - González Juan Manuel', 'tp2-electricidad', 'uploads/entrega_tp2_alumno1.pdf', NOW(), 1, 2, 'enviado', '----', 'tp'),
         (14, 'Resolución TP N° 2 - Pérez María Belén', 'tp2-electricidad', 'uploads/entrega_tp2_alumno2.pdf', NOW(), 1, 2, 'enviado', '----', 'tp'),
         (15, 'Resolución TP N° 2 - Rodríguez Carlos', 'tp2-electricidad', 'uploads/entrega_tp2_alumno3.pdf', NOW(), 1, 2, 'enviado', '----', 'tp'),
         (25, 'Resolución TP N° 1 - Rodríguez Lucas', 'tp1-electricidad', 'uploads/entrega_tp1_alumno1.pdf', NOW(), 1, 1, 'calificado', '8.00', 'tp'),
         (26, 'Resolución TP N° 1 - Albornoz Joaquín', 'tp1-electricidad', 'uploads/entrega_tp1_alumno7.pdf', NOW(), 1, 1, 'calificado', '7.50', 'tp'),
         (27, 'Resolución TP N° 1 - Navarro Camila', 'tp1-electricidad', 'uploads/entrega_tp1_alumno8.pdf', NOW(), 1, 1, 'calificado', '9.20', 'tp'),
         (28, 'Resolución TP N° 2 - Albornoz Joaquín', 'tp2-electricidad', 'uploads/entrega_tp2_alumno1.pdf', NOW(), 1, 2, 'enviado', '----', 'tp'),
         (29, 'Resolución TP N° 2 - Navarro Camila', 'tp2-electricidad', 'uploads/entrega_tp2_alumno2.pdf', NOW(), 1, 2, 'enviado', '----', 'tp'),

         -- Curso 2: Programación Web
         (16, 'Resolución TP N° 1 - González Juan Manuel (Web)', 'tp1-web', 'uploads/entrega_tp1_alumno1_web.pdf', NOW(), 2, 4, 'calificado', '9.50', 'tp'),
         (17, 'Resolución TP N° 1 - Pérez María Belén (Web)', 'tp1-web', 'uploads/entrega_tp1_alumno2_web.pdf', NOW(), 2, 4, 'calificado', '9.00', 'tp'),
         (18, 'Resolución TP N° 2 - González Juan Manuel (Web)', 'tp2-web', 'uploads/entrega_tp2_alumno1_web.pdf', NOW(), 2, 5, 'enviado', '----', 'tp'),
         (30, 'Resolución TP N° 1 - Fernández Sofía (Web)', 'tp1-web', 'uploads/entrega_tp1_alumno2_web.pdf', NOW(), 2, 4, 'calificado', '8.80', 'tp'),
         (31, 'Resolución TP N° 1 - Herrera Ignacio (Web)', 'tp1-web', 'uploads/entrega_tp1_alumno1_web.pdf', NOW(), 2, 4, 'calificado', '8.00', 'tp'),
         (32, 'Resolución TP N° 1 - Romero Lucía (Web)', 'tp1-web', 'uploads/entrega_tp1_alumno2_web.pdf', NOW(), 2, 4, 'calificado', '9.50', 'tp'),
         (33, 'Resolución TP N° 2 - Herrera Ignacio (Web)', 'tp2-web', 'uploads/entrega_tp2_alumno1_web.pdf', NOW(), 2, 5, 'enviado', '----', 'tp'),
         (34, 'Resolución TP N° 2 - Romero Lucía (Web)', 'tp2-web', 'uploads/entrega_tp2_alumno1_web.pdf', NOW(), 2, 5, 'enviado', '----', 'tp'),

         -- Curso 3: Electrónica Digital
         (35, 'Resolución TP N° 1 - Rodríguez Lucas (Electrónica)', 'tp1-electronica', 'uploads/entrega_tp1_alumno3_elect.pdf', NOW(), 3, 7, 'calificado', '8.50', 'tp'),
         (36, 'Resolución TP N° 1 - Fernández Sofía (Electrónica)', 'tp1-electronica', 'uploads/entrega_tp1_alumno4_elect.pdf', NOW(), 3, 7, 'calificado', '9.00', 'tp'),
         (37, 'Resolución TP N° 1 - Ruiz Carlos (Electrónica)', 'tp1-electronica', 'uploads/entrega_tp1_alumno3_elect.pdf', NOW(), 3, 7, 'calificado', '7.80', 'tp'),
         (38, 'Resolución TP N° 1 - Albornoz Joaquín (Electrónica)', 'tp1-electronica', 'uploads/entrega_tp1_alumno4_elect.pdf', NOW(), 3, 7, 'calificado', '8.20', 'tp'),
         (39, 'Resolución TP N° 2 - Rodríguez Lucas (Electrónica)', 'tp2-electronica', 'uploads/tp2_electronica.pdf', NOW(), 3, 8, 'enviado', '----', 'tp'),
         (40, 'Resolución TP N° 2 - Ruiz Carlos (Electrónica)', 'tp2-electronica', 'uploads/tp2_electronica.pdf', NOW(), 3, 8, 'enviado', '----', 'tp'),

         -- Curso 4: Refrigeración y Climatización
         (41, 'Resolución TP N° 1 - Ruiz Carlos (Refrigeración)', 'tp1-refrigeracion', 'uploads/entrega_tp1_alumno5_refrig.pdf', NOW(), 4, 10, 'calificado', '8.00', 'tp'),
         (42, 'Resolución TP N° 1 - Díaz Valeria (Refrigeración)', 'tp1-refrigeracion', 'uploads/entrega_tp1_alumno6_refrig.pdf', NOW(), 4, 10, 'calificado', '9.00', 'tp'),
         (43, 'Resolución TP N° 1 - Navarro Camila (Refrigeración)', 'tp1-refrigeracion', 'uploads/entrega_tp1_alumno5_refrig.pdf', NOW(), 4, 10, 'calificado', '8.70', 'tp'),
         (44, 'Resolución TP N° 1 - Herrera Ignacio (Refrigeración)', 'tp1-refrigeracion', 'uploads/entrega_tp1_alumno6_refrig.pdf', NOW(), 4, 10, 'calificado', '7.50', 'tp'),
         (45, 'Resolución TP N° 2 - Díaz Valeria (Refrigeración)', 'tp2-refrigeracion', 'uploads/tp2_refrigeracion.pdf', NOW(), 4, 12, 'enviado', '----', 'tp'),
         (46, 'Resolución TP N° 2 - Navarro Camila (Refrigeración)', 'tp2-refrigeracion', 'uploads/tp2_refrigeracion.pdf', NOW(), 4, 12, 'enviado', '----', 'tp'),

         -- Curso 5: Tornería y Mecánica Industrial
         (47, 'Resolución TP N° 1 - Pérez María Belén (Tornería)', 'tp1-torneria', 'uploads/entrega_tp1_alumno2_torn.pdf', NOW(), 5, 13, 'calificado', '8.50', 'tp'),
         (48, 'Resolución TP N° 1 - Rodríguez Lucas (Tornería)', 'tp1-torneria', 'uploads/entrega_tp1_alumno10_torn.pdf', NOW(), 5, 13, 'calificado', '9.00', 'tp'),
         (49, 'Resolución TP N° 1 - Díaz Valeria (Tornería)', 'tp1-torneria', 'uploads/entrega_tp1_alumno2_torn.pdf', NOW(), 5, 13, 'calificado', '8.20', 'tp'),
         (50, 'Resolución TP N° 1 - Romero Lucía (Tornería)', 'tp1-torneria', 'uploads/entrega_tp1_alumno10_torn.pdf', NOW(), 5, 13, 'calificado', '9.30', 'tp'),
         (51, 'Resolución TP N° 2 - Pérez María Belén (Tornería)', 'tp2-torneria', 'uploads/tp2_torneria.pdf', NOW(), 5, 14, 'enviado', '----', 'tp'),
         (52, 'Resolución TP N° 2 - Romero Lucía (Tornería)', 'tp2-torneria', 'uploads/tp2_torneria.pdf', NOW(), 5, 14, 'enviado', '----', 'tp');`
      )

      await queryPromise(
        conexion,
        `INSERT INTO alumno_material (alumno_id, material_id) VALUES
         -- Curso 1
         (1, 11), (2, 12), (1, 13), (2, 14), (3, 15),
         (3, 25), (7, 26), (8, 27), (7, 28), (8, 29),
         -- Curso 2
         (1, 16), (2, 17), (1, 18),
         (4, 30), (9, 31), (10, 32), (9, 33), (10, 34),
         -- Curso 3
         (3, 35), (4, 36), (5, 37), (7, 38), (3, 39), (5, 40),
         -- Curso 4
         (5, 41), (6, 42), (8, 43), (9, 44), (6, 45), (8, 46),
         -- Curso 5
         (2, 47), (3, 48), (6, 49), (10, 50), (2, 51), (10, 52);`
      )

      // 11. Exámenes en línea para Ciclo 2026
      console.log('📝 Creando exámenes en línea...')
      await queryPromise(
        conexion,
        `INSERT INTO examen (id, alumno_id, curso_id, fecha, descripcion, estado) VALUES
         (1, 1, 1, '2026-05-15', 'Primer Parcial Teórico: Seguridad y Protecciones Eléctricas', 'activo'),
         (2, 2, 1, '2026-05-15', 'Primer Parcial Teórico: Seguridad y Protecciones Eléctricas', 'activo'),
         (3, 3, 1, '2026-05-15', 'Primer Parcial Teórico: Seguridad y Protecciones Eléctricas', 'activo'),
         (4, 1, 2, '2026-05-20', 'Evaluación Parcial: APIs y Seguridad en Node.js', 'activo'),
         (5, 2, 2, '2026-05-20', 'Evaluación Parcial: APIs y Seguridad en Node.js', 'activo'),
         (6, 4, 2, '2026-05-20', 'Evaluación Parcial: APIs y Seguridad en Node.js', 'activo'),
         (7, 3, 3, '2026-05-18', 'Evaluación Parcial: Lógica y Microcontroladores', 'activo'),
         (8, 4, 3, '2026-05-18', 'Evaluación Parcial: Lógica y Microcontroladores', 'activo'),
         (9, 5, 4, '2026-05-22', 'Evaluación Teórico-Práctica: Ciclo de Compresión', 'activo'),
         (10, 6, 4, '2026-05-22', 'Evaluación Teórico-Práctica: Ciclo de Compresión', 'activo'),
         (11, 2, 5, '2026-05-25', 'Primer Parcial: Metrología y Torno Paralelo', 'activo'),
         (12, 10, 5, '2026-05-25', 'Primer Parcial: Metrología y Torno Paralelo', 'activo');`
      )

      // 12. Foros y Temas de Discusión
      console.log('💬 Creando foros de consulta y respuestas comunitarias...')
      await queryPromise(
        conexion,
        `INSERT INTO foro (id, curso_id, alumno_id, personal_id, titulo, contenido, fecha_creacion) VALUES
         (1, 1, 1, NULL, 'Consulta sobre el ejercicio 4 del TP N° 2 (Factor de Potencia)', 'Hola profesor y compañeros, tengo una duda con respecto al cálculo de capacitores para corrección del cos φ en el ejercicio 4. ¿Debemos tomar la tabla de la reglamentación AEA 771 o calculamos directamente con la fórmula analítica de potencia reactiva Q = P * (tan φ1 - tan φ2)?', DATE_SUB(NOW(), INTERVAL 4 DAY)),
         (2, 1, NULL, 2, 'Material complementario: Diagramas de conexión de disyuntores diferenciales', 'Estimados estudiantes, les comparto este hilo para debatir sobre las diferencias normativas entre disyuntores de clase AC y clase A para cargas electrónicas e iluminación LED. ¿Qué ventajas observan en la protección de equipos informáticos?', DATE_SUB(NOW(), INTERVAL 3 DAY)),
         (3, 1, 2, NULL, 'Duda sobre la puesta a tierra con jabalina copperweld en suelo arenoso', 'Hola a todos, en una instalación con suelo predominantemente arenoso, la resistencia de dispersión me da superior a los 10 Ohms reglamentarios con una jabalina de 1.5 metros. ¿Qué solución recomiendan implementar según la norma?', DATE_SUB(NOW(), INTERVAL 2 DAY)),
         (4, 2, 2, NULL, 'Duda con los middlewares de autenticación JWT en Express', 'Buenas tardes, estoy estructurando las rutas de la API del proyecto y quería consultar: ¿es mejor verificar el token JWT en cada controlador individualmente o proteger un grupo de rutas montando el middleware a nivel de router?', DATE_SUB(NOW(), INTERVAL 2 DAY)),
         (5, 2, 1, NULL, 'Estrategias de consulta en MySQL: JOINs vs Subconsultas para conteo', 'Estuve optimizando la consulta que trae el listado de temas y el conteo de respuestas. ¿Hay diferencias apreciables de rendimiento entre hacer un LEFT JOIN con GROUP BY versus una subconsulta correlacionada (SELECT COUNT(*) FROM foro_respuesta WHERE foro_id = f.id)?', DATE_SUB(NOW(), INTERVAL 1 DAY));`
      )

      await queryPromise(
        conexion,
        `INSERT INTO foro_respuesta (id, foro_id, parent_id, alumno_id, personal_id, contenido, fecha_creacion) VALUES
         -- Respuestas para Tema 1 (Consulta TP 2 - Electricidad)
         (1, 1, NULL, NULL, 2, 'Hola Juan Manuel. Para ese ejercicio debes aplicar la fórmula analítica primero para obtener la capacidad exacta en microfaradios (µF), y luego seleccionar el valor comercial estandarizado inmediatamente superior.', DATE_SUB(NOW(), INTERVAL 90 HOUR)),
         (2, 1, 1, 1, NULL, 'Excelente profesor, me daba 45.8 µF, entonces voy a redondear al capacitor comercial de 50 µF. ¡Muchas gracias!', DATE_SUB(NOW(), INTERVAL 88 HOUR)),
         (3, 1, 2, NULL, 2, 'Exactamente, 50 µF a 400V es el valor comercial indicado para esa potencia activa y reactiva. Buen trabajo.', DATE_SUB(NOW(), INTERVAL 86 HOUR)),
         (4, 1, NULL, 2, NULL, 'A mí también me dió ese valor. Recuerden verificar también la tensión nominal de aislación de los capacitores según si la red es monofásica o trifásica.', DATE_SUB(NOW(), INTERVAL 80 HOUR)),
         (5, 1, 4, 3, NULL, 'Buen punto María Belén, en la clase anterior el profe recomendó usar al menos 400V para tener margen contra sobretensiones transitorias.', DATE_SUB(NOW(), INTERVAL 78 HOUR)),

         -- Respuestas para Tema 2 (Disyuntores Diferenciales - Electricidad)
         (6, 2, NULL, 3, NULL, 'Los de clase A detectan corrientes de fuga alternas y también continuas pulsantes que producen las fuentes conmutadas de las computadoras, evitando disparos intempestivos o bloqueos.', DATE_SUB(NOW(), INTERVAL 70 HOUR)),
         (7, 2, 6, NULL, 2, 'Así es Carlos. Hoy en día en oficinas y talleres informáticos es una exigencia primordial para evitar averías.', DATE_SUB(NOW(), INTERVAL 68 HOUR)),
         (8, 2, NULL, 1, NULL, '¿En las instalaciones residenciales estándar ya se están colocando obligatoriamente los tipo A o se sigue permitiendo el tipo AC tradicional?', DATE_SUB(NOW(), INTERVAL 60 HOUR)),
         (9, 2, 8, NULL, 2, 'Para viviendas residenciales el tipo AC sigue siendo aceptado por la AEA 771, aunque para circuitos dedicados de climatización inverter o informática se sugiere fuertemente tipo A o F.', DATE_SUB(NOW(), INTERVAL 58 HOUR)),

         -- Respuestas para Tema 3 (Puesta a Tierra - Electricidad)
         (10, 3, NULL, 1, NULL, 'Podés clavar una segunda jabalina en paralelo distanciada el doble de su longitud (unos 3 metros) o usar una jabalina seccionable más larga de 3 metros.', DATE_SUB(NOW(), INTERVAL 40 HOUR)),
         (11, 3, 10, NULL, 2, 'Correcta la respuesta de Juan Manuel. Además, si el suelo es muy seco, se puede mejorar la conductividad del terreno con sales hidrófilas o gel bentonítico.', DATE_SUB(NOW(), INTERVAL 36 HOUR)),

         -- Respuestas para Tema 4 (Middlewares JWT - Desarrollo Web)
         (12, 4, NULL, NULL, 4, 'Hola María Belén. Definitivamente es mucho más limpio y seguro montar el middleware a nivel de router con router.use(verificarToken). Así te aseguras de no olvidar ninguna ruta desprotegida por descuido.', DATE_SUB(NOW(), INTERVAL 42 HOUR)),
         (13, 4, 12, 2, NULL, 'Entendido profesora, ya lo implementé agrupando en un router modular de rutas privadas y quedó muchísimo más ordenado el código.', DATE_SUB(NOW(), INTERVAL 40 HOUR)),
         (14, 4, NULL, 1, NULL, 'Tengan en cuenta excluir las rutas públicas como /login y el endpoint de salud de la API /health antes de aplicar el middleware.', DATE_SUB(NOW(), INTERVAL 35 HOUR)),
         (15, 4, 14, 4, NULL, '¡Buenísimo dato Juan! Justo me estaba dando 401 Unauthorized cuando intentaba hacer el POST al login antes de autenticarme jaja.', DATE_SUB(NOW(), INTERVAL 30 HOUR)),

         -- Respuestas para Tema 5 (MySQL Performance - Desarrollo Web)
         (16, 5, NULL, NULL, 3, 'Excelente consulta Juan Manuel. Si foro_id tiene un índice B-Tree en foro_respuesta, la subconsulta correlacionada en un LIMIT acotado es sumamente rápida porque el motor sólo evalúa las filas de la página actual. En cambio, un JOIN + GROUP BY completo sin filtrar agregaría todas las filas en memoria.', DATE_SUB(NOW(), INTERVAL 20 HOUR)),
         (17, 5, 16, 1, NULL, 'Clarísimo profesor, revisé con EXPLAIN y efectivamente utiliza el índice idx_fr_foro. ¡Muchas gracias!', DATE_SUB(NOW(), INTERVAL 16 HOUR));`
      )

      console.log('\n============================================================')
      console.log('🎉 ¡Base de datos poblada exitosamente con datos de prueba!')
      console.log('============================================================')
      console.log('🔑 CREDENCIALES DE ACCESO:')
      console.log('   👑 ADMINISTRADOR:')
      console.log('      Correo:     admin@admin.com')
      console.log('      Contraseña: admin')
      console.log('')
      console.log('   👨‍🏫 PROFESOR:')
      console.log('      Correo:     profesor@escuela.edu.ar')
      console.log('      Contraseña: 123456')
      console.log('')
      console.log('   🎓 ALUMNO:')
      console.log('      Correo:     alumno@escuela.edu.ar')
      console.log('      Contraseña: 123456')
      console.log('============================================================\n')

      conexion.end()
      if (isStandalone) {
        process.exit(0)
      } else {
        resolve({ success: true, message: 'Base de datos demo restaurada exitosamente' })
      }
    } catch (error) {
      console.error('❌ Error al poblar base de datos:', error)
      conexion.end()
      if (isStandalone) {
        process.exit(1)
      } else {
        reject(error)
      }
    }
  })
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

module.exports = {
  seedDatabase
}

if (require.main === module) {
  seedDatabase(true)
}
