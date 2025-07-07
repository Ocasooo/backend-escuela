const express = require('express')
const respuesta = require('../../red/respuestas.js')
const { crud, relaciones } = require('./index.js')

const router = express.Router()

// === RUTAS DE RELACIONES ALUMNO ===
router.post('/egresar-alumno',egresarAlumno)
router.get('/alumnos-cursos', traerAlumnosConCursos)
router.post('/asignar-alumno', asignarAlumno)
router.delete('/quitar-alumno', quitarAlumno)
router.post('/alumnos-por-curso', alumnoDetallePorCurso)
router.get('/alumno/:id/cursos', cursosPorAlumno)
router.get('/:id/notasDelCurso',obtenerNotasPorCurso)
router.patch('/cargarNotaCursado',cargarNotaCursada)
router.get('/:id/alumnos', alumnosPorCursoConEstado)
router.get('/resumen', resumenCursosTabla)
router.get('/:id/alumnos-simples', alumnosPorCurso)


// === RUTAS DE RELACIONES PERSONAL ===
router.get('/profesores-con-cursos', obtenerProfesoresConCursos)
router.post('/asignar-personal', asignarPersonal)
router.delete('/quitar-personal', quitarPersonal)
router.get('/personal/:id/cursos', cursosPorPersonal)
router.get('/alumnos-con-curso', alumnosConCurso)
router.get('/:id/profesores', profesoresPorCurso)

// === RUTAS DE CRUD ===
router.get('/', todos)
router.get('/:id', uno)
router.post('/', agregar)
router.put('/:id', editar)
router.put('/', eliminar)

// === NUEVO: Detalle con validación de usuario ===
router.get('/:id/detalle-con-usuario', detalleConUsuario)

// === FUNCIONES CRUD ===
async function todos(req, res, next) {
  try {
    const items = await crud.todos()
    respuesta.success(req, res, items, 200)
  } catch (err) {
    next(err)
  }
}

 async function egresarAlumno (req, res){
  try {
    const { id_alumno, nota } = req.body

    if (!id_alumno || !nota) {
      return res.status(400).json({ error: 'Faltan datos: id_alumno y nota son obligatorios' })
    }

    await relaciones.egresarAlumno(id_alumno, nota)

    res.status(200).json({ message: 'Alumno egresado correctamente' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error al egresar alumno' })
  }
}



async function alumnoDetallePorCurso (req, res, next) {
  try {
    const { idCurso } = req.body

    if (!idCurso) {
      return respuesta.error(req, res, 'Falta idCurso en el body', 400)
    }

    const alumnos = await relaciones.alumnosDetallePorCurso(idCurso)

    respuesta.success(req, res, alumnos, 200)
  } catch (error) {
    next(error)
  }
}

async function obtenerProfesoresConCursos(req, res, next) {
  try {
    const data = await relaciones.profesoresConCursos()
    respuesta.success(req, res, data, 200)
  } catch (error) {
    next(error)
  }
}

async function uno(req, res, next) {
  try {
    const item = await crud.uno(req.params.id)
    respuesta.success(req, res, item, 200)
  } catch (err) {
    next(err)
  }
}

async function agregar(req, res, next) {
  try {
    await crud.agregar(req.body)
    respuesta.success(req, res, 'Curso agregado con éxito', 201)
  } catch (err) {
    next(err)
  }
}

async function editar(req, res, next) {
  try {
    await crud.editar(req.params.id, req.body)
    respuesta.success(req, res, 'Curso actualizado con éxito', 200)
  } catch (err) {
    next(err)
  }
}

async function eliminar(req, res, next) {
  try {
    await crud.eliminar(req.body)
    respuesta.success(req, res, 'Curso eliminado', 200)
  } catch (err) {
    next(err)
  }
}

// === FUNCIONES DE RELACIONES ===
async function asignarAlumno(req, res, next) {
  try {
    const { id_alumno, id_curso } = req.body
    await relaciones.asignarAlumno(id_alumno, id_curso)
    respuesta.success(req, res, 'Alumno asignado', 201)
  } catch (err) {
    next(err)
  }
}

async function quitarAlumno(req, res, next) {
  try {
    const { id_alumno, id_curso, anio } = req.body

    if (!id_alumno || !id_curso || !anio) {
      return respuesta.error(req, res, 'Faltan datos: id_alumno, id_curso o anio', 400)
    }

    await relaciones.quitarAlumno(id_alumno, id_curso, anio)
    respuesta.success(req, res, 'Alumno marcado como abandonado', 200)
  } catch (err) {
    next(err)
  }
}


async function cursosPorAlumno(req, res, next) {
  try {
    const result = await relaciones.cursosPorAlumno(req.params.id)
    respuesta.success(req, res, result, 200)
  } catch (err) {
    next(err)
  }
}

async function asignarPersonal(req, res, next) {
  try {
    const { id_personal, id_curso } = req.body
    await relaciones.asignarPersonal(id_personal, id_curso)
    respuesta.success(req, res, 'Personal asignado', 201)
  } catch (err) {
    next(err)
  }
}

async function quitarPersonal(req, res, next) {
  try {
    const { id_personal, id_curso } = req.body
    await relaciones.quitarPersonal(id_personal, id_curso)
    respuesta.success(req, res, 'Personal quitado', 200)
  } catch (err) {
    next(err)
  }
}

async function cursosPorPersonal(req, res, next) {
  try {
    const result = await relaciones.cursosPorPersonal(req.params.id)
    respuesta.success(req, res, result, 200)
  } catch (err) {
    next(err)
  }
}

async function alumnosConCurso(req, res, next) {
  try {
    const result = await relaciones.resumenAlumnosConCursos()
    respuesta.success(req, res, result, 200)
  } catch (err) {
    next(err)
  }
}

async function alumnosPorCursoConEstado(req, res, next) {
  try {
    const result = await relaciones.alumnosPorCursoConEstado(req.params.id)
    respuesta.success(req, res, result, 200)
  } catch (err) {
    next(err)
  }
}

async function resumenCursosTabla(req, res, next) {
  try {
    const result = await relaciones.resumenCursos()
    respuesta.success(req, res, result, 200)
  } catch (err) {
    next(err)
  }
}

// === NUEVO: Detalle con validación de usuario ===
async function detalleConUsuario(req, res, next) {
  try {
    const cursoId = req.params.id
    const curso = await crud.uno(cursoId)
    if (!curso) return respuesta.error(req, res, 'Curso no encontrado', 404)

    const usuario = req.usuario
    if (!usuario) return respuesta.error(req, res, 'Usuario no identificado', 401)
    console.log('USUARIO:', usuario)

    let puedeEditar = false
    let tieneAcceso = false

    // Convertir ocupación a minúsculas (para comparar sin problema)
    let ocupacion = ''
    if (usuario.ocupacion) {
      ocupacion = usuario.ocupacion.toLowerCase().trim()
    } else if (usuario.tipo) {
      ocupacion = usuario.tipo.toLowerCase().trim()
    }

    console.log('OCUPACION NORMALIZADA:', ocupacion)

    if (ocupacion === 'administrador') {
      puedeEditar = true
      tieneAcceso = true
    } else if (ocupacion === 'profesor' || ocupacion === 'personal') {
      const cursosAsignados = await relaciones.cursosPorPersonal(usuario.id)
      console.log('CURSOS ASIGNADOS:', cursosAsignados)

      const estaAsignado = cursosAsignados.some(c => c.id == cursoId)
      console.log('ESTA ASIGNADO:', estaAsignado)

      puedeEditar = estaAsignado
      tieneAcceso = true // profesor puede ver siempre
    } else if (ocupacion === 'alumno') {
      const cursosAsignados = await relaciones.cursosPorAlumno(usuario.id)
      const estaAsignado = cursosAsignados.some(c => c.id == cursoId)
      puedeEditar = false
      tieneAcceso = estaAsignado
    }

    if (!tieneAcceso) {
      return respuesta.error(req, res, 'No autorizado', 403)
    }

    respuesta.success(req, res, {
      ...curso,
      puedeEditar,
      tieneAcceso
    }, 200)
  } catch (err) {
    next(err)
  }
}

async function profesoresPorCurso(req, res, next) {
  try {
    const cursoId = req.params.id
    const result = await relaciones.profesoresPorCurso(cursoId)
    respuesta.success(req, res, result, 200)
  } catch (err) {
    next(err)
  }
}

async function alumnosPorCurso(req, res, next) {
  try {
    const cursoId = req.params.id
    const result = await relaciones.alumnosPorCurso(cursoId)
    respuesta.success(req, res, result, 200)
  } catch (err) {
    next(err)
  }
}

async function obtenerNotasPorCurso(req, res, next){
  try {
    const cursoId = Number(req.params.id)

    if (!cursoId || isNaN(cursoId)) {
      respuesta.error(req, res, 'ID de curso inválido', 400)
      return
    }

    const notas = await relaciones.obtenerNotasPorCurso(cursoId)
    respuesta.success(req, res, notas, 200)
  } catch (err) {
    next(err)
  }
}

async function cargarNotaCursada(req, res, next){
  try {
    const { nota, cursoId, alumnoId } = req.body

    if (!nota || !cursoId || !alumnoId) {
      respuesta.error(req, res, 'Faltan datos: nota, cursoId o alumnoId', 400)
      return
    }

    await relaciones.cargarNota(nota, cursoId, alumnoId)
    respuesta.success(req, res, 'Nota actualizada correctamente', 200)
  } catch (err) {
    next(err)
  }
}

async function traerAlumnosConCursos(req, res, next) {
  try {
    const data = await relaciones.alumnosConCursos() // ✅ cambiar controlador → relaciones
    respuesta.success(req, res, data, 200)
  } catch (error) {
    next(error)
  }
}



module.exports = router
