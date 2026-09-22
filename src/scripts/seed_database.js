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
         (6, 'Valeria', 'Díaz', ?, '2001-09-14', 'vdiaz@escuela.edu.ar', 44567890, '3794667788', 'Calle Belgrano 432', 'Argentina', 'Secundario completo', 'Soltera', 'Estudiante');`,
        [passComun, passComun, passComun, passComun, passComun, passComun]
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

      // 6. Asignar Profesores a Cursos (con Franco Makula como Admin y Docente en el curso 2)
      console.log('👨‍🏫 Asignando docentes a cursos...')
      await queryPromise(
        conexion,
        `INSERT INTO curso_has_personal (personal_id, curso_id) VALUES
         (2, 1), -- Roberto Gómez en Electricidad
         (1, 2), -- Franco Makula (Admin + Docente) en Programación
         (3, 2), -- Marcos Benítez en Programación
         (4, 3), -- Laura Méndez en Electrónica
         (2, 4); -- Roberto Gómez en Refrigeración`
      )

      // 7. Matricular Alumnos a Cursos con Estados y Notas
      console.log('📋 Matriculando estudiantes y notas de cursado...')
      await queryPromise(
        conexion,
        `INSERT INTO curso_has_alumno (alumno_id, curso_id, anio, estado_terminacion, estado, nota) VALUES
         (1, 1, 2024, 'cursando', 'cursando', 8.50),
         (2, 1, 2024, 'cursando', 'cursando', 9.00),
         (3, 1, 2024, 'cursando', 'cursando', 6.00),
         (4, 1, 2024, 'cursando', 'cursando', 10.00),
         (5, 1, 2024, 'cursando', 'cursando', 5.00),
         (6, 1, 2024, 'cursando', 'cursando', 7.50),
         -- Matriculas en Programación
         (1, 2, 2024, 'cursando', 'cursando', 9.00),
         (2, 2, 2024, 'cursando', 'cursando', 9.50),
         (4, 2, 2024, 'cursando', 'cursando', 8.00),
         -- Egresados anteriores para titulación
         (1, 3, 2023, 'finalizado', 'egresado', 9.00),
         (2, 3, 2023, 'finalizado', 'egresado', 10.00);`
      )

      // 8. Crear Unidades Temáticas
      console.log('📖 Creando unidades temáticas...')
      await queryPromise(
        conexion,
        `INSERT INTO unidades (id, curso_id, nombre, descripcion, orden) VALUES
         (1, 1, 'Unidad 1: Fundamentos de la Corriente Alterna', 'Leyes de Kirchhoff, cálculo de impedancia, potencia activa, reactiva y aparente.', 1),
         (2, 1, 'Unidad 2: Tableros Eléctricos y Protecciones', 'Termomagnéticas, disyuntores diferenciales, puesta a tierra y normas AEA.', 2),
         (3, 1, 'Unidad 3: Motores Eléctricos y Automatización', 'Motores monofásicos y trifásicos, contactores y esquemas de arranque.', 3),
         (4, 2, 'Unidad 1: Arquitectura Web y TypeScript', 'Fundamentos del desarrollo web moderno, componentes y tipado estricto.', 1),
         (5, 2, 'Unidad 2: Backend con Node.js y Express', 'Diseño de endpoints REST, autenticación JWT y middleware de seguridad.', 2),
         (6, 2, 'Unidad 3: Bases de Datos Relacionales', 'Modelado relacional, consultas SQL parametrizadas e integridad referencial.', 3);`
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
         (5, 'Viernes', '08:00:00', '12:00:00');`
      )

      await queryPromise(
        conexion,
        `INSERT INTO aula_horario (aula_id, horario_id) VALUES
         (1, 1), (1, 2), (2, 3), (2, 4), (3, 5);`
      )

      await queryPromise(
        conexion,
        `INSERT INTO curso_asignacion (curso_id, aula_id, horario_id) VALUES
         (1, 1, 1),
         (1, 1, 2),
         (2, 2, 3),
         (2, 2, 4);`
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

      console.log('✅ Archivos PDF físicos generados exitosamente en la carpeta uploads/.')

      // Insertar materiales en la base de datos
      await queryPromise(
        conexion,
        `INSERT INTO material (id, observacion, carpeta, archivo_scan, fecha_subida, curso_id, unidad_id, estado, calificacion, tipo) VALUES
         -- Materiales y TPs de unidades (Curso 1)
         (1, 'Guía Práctica de Corriente Alterna y Circuitos RLC', 'material-u1-elect', 'uploads/guia_corriente_alterna.pdf', NOW(), 1, 1, 'activo', '----', 'guia'),
         (2, 'TP N° 1 - Ley de Ohm y Circuitos Serie-Paralelo', 'tp1-electricidad', 'uploads/tp1_enunciado.pdf', NOW(), 1, 1, 'activo', '----', 'tp'),
         (3, 'Manual de Tableros Eléctricos y Normas AEA', 'material-u2-elect', 'uploads/manual_tableros_aea.pdf', NOW(), 1, 2, 'activo', '----', 'guia'),
         (4, 'TP N° 2 - Dimensionamiento de Conductores y Protecciones', 'tp2-electricidad', 'uploads/tp2_enunciado.pdf', NOW(), 1, 2, 'activo', '----', 'tp'),
         (5, 'Esquemas de Conexión de Motores Trifásicos', 'material-u3-elect', 'uploads/guia_motores.pdf', NOW(), 1, 3, 'activo', '----', 'guia'),
         (6, 'TP N° 3 - Arranque Estrella-Triángulo de Motores', 'tp3-electricidad', 'uploads/tp3_enunciado.pdf', NOW(), 1, 3, 'activo', '----', 'tp'),

         -- Materiales y TPs de unidades (Curso 2)
         (7, 'Manual de TypeScript y Configuración de Proyecto', 'material-u1-web', 'uploads/guia_typescript.pdf', NOW(), 2, 4, 'activo', '----', 'guia'),
         (8, 'TP N° 1 - Creación de Servidor Express y Rutas', 'tp1-web', 'uploads/tp1_web.pdf', NOW(), 2, 4, 'activo', '----', 'tp'),
         (9, 'Guía de Arquitectura de Endpoints y Seguridad', 'material-u2-web', 'uploads/guia_seguridad.pdf', NOW(), 2, 5, 'activo', '----', 'guia'),
         (10, 'TP N° 2 - Autenticación con JWT y Roles', 'tp2-web', 'uploads/tp2_web.pdf', NOW(), 2, 5, 'activo', '----', 'tp'),

         -- Entregas reales de alumnos para evaluación
         (11, 'Resolución TP N° 1 - González Juan Manuel', 'tp1-electricidad', 'uploads/entrega_tp1_alumno1.pdf', NOW(), 1, 1, 'calificado', '9.00', 'tp'),
         (12, 'Resolución TP N° 1 - Pérez María Belén', 'tp1-electricidad', 'uploads/entrega_tp1_alumno2.pdf', NOW(), 1, 1, 'calificado', '8.50', 'tp'),
         (13, 'Resolución TP N° 2 - González Juan Manuel', 'tp2-electricidad', 'uploads/entrega_tp2_alumno1.pdf', NOW(), 1, 2, 'enviado', '----', 'tp'),
         (14, 'Resolución TP N° 2 - Pérez María Belén', 'tp2-electricidad', 'uploads/entrega_tp2_alumno2.pdf', NOW(), 1, 2, 'enviado', '----', 'tp'),
         (15, 'Resolución TP N° 2 - Rodríguez Carlos', 'tp2-electricidad', 'uploads/entrega_tp2_alumno3.pdf', NOW(), 1, 2, 'enviado', '----', 'tp'),
         (16, 'Resolución TP N° 1 - González Juan Manuel (Web)', 'tp1-web', 'uploads/entrega_tp1_alumno1_web.pdf', NOW(), 2, 4, 'calificado', '9.50', 'tp'),
         (17, 'Resolución TP N° 1 - Pérez María Belén (Web)', 'tp1-web', 'uploads/entrega_tp1_alumno2_web.pdf', NOW(), 2, 4, 'calificado', '9.00', 'tp'),
         (18, 'Resolución TP N° 2 - González Juan Manuel (Web)', 'tp2-web', 'uploads/entrega_tp2_alumno1_web.pdf', NOW(), 2, 5, 'enviado', '----', 'tp');`
      )

      await queryPromise(
        conexion,
        `INSERT INTO alumno_material (alumno_id, material_id) VALUES
         (1, 11),
         (2, 12),
         (1, 13),
         (2, 14),
         (3, 15),
         (1, 16),
         (2, 17),
         (1, 18);`
      )

      // 11. Exámenes
      console.log('📝 Creando exámenes en línea...')
      await queryPromise(
        conexion,
        `INSERT INTO examen (id, alumno_id, curso_id, fecha, descripcion, estado) VALUES
         (1, 1, 1, '2024-10-15', 'Primer Parcial Teórico: Seguridad y Protecciones Eléctricas', 'activo'),
         (2, 2, 1, '2024-10-15', 'Primer Parcial Teórico: Seguridad y Protecciones Eléctricas', 'activo'),
         (3, 1, 2, '2024-10-20', 'Evaluación Parcial: APIs y Seguridad en Node.js', 'activo');`
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
