// src/scripts/seed_database.js
const mysql = require('mysql2')
const bcrypt = require('bcrypt')
const config = require('../config.js')

async function seedDatabase() {
  const dbName = config.mysql.database || 'ejemplo'
  console.log(`\n🌱 [Seed]: Conectando y poblando la base de datos '${dbName}'...`)

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
      process.exit(1)
    }

    try {
      const saltRounds = 5
      // 1. Password para admin: "admin"
      const passAdmin = await bcrypt.hash('admin', saltRounds)
      // Password general de prueba: "123456"
      const passComun = await bcrypt.hash('123456', saltRounds)

      // 2. Limpiar tablas existentes en orden de claves foráneas
      await queryPromise(conexion, 'SET FOREIGN_KEY_CHECKS = 0;')
      const tablas = [
        'alumno_material', 'curso_has_personal', 'curso_has_alumno',
        'curso_asignacion', 'aula_horario', 'examen', 'foro',
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

      // 12. Foros
      console.log('💬 Creando foros de consulta...')
      await queryPromise(
        conexion,
        `INSERT INTO foro (id, curso_id, alumno_id, titulo, contenido) VALUES
         (1, 1, 1, 'Consulta sobre el ejercicio 4 del TP N° 2', '¿El factor de corrección por temperatura se aplica según tabla 771 de la AEA?'),
         (2, 2, 2, 'Duda con los middleware de autorización', '¿Es necesario verificar el rol en cada ruta o se puede hacer a nivel de router completo?');`
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
      process.exit(0)
    } catch (error) {
      console.error('❌ Error al poblar base de datos:', error)
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

seedDatabase()
