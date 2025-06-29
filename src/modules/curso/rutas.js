const express = require('express')
const respuesta = require('../../red/respuestas.js')
const { crud, relaciones } = require('./index.js')

const router = express.Router()

// === RUTAS DE RELACIONES ALUMNO ===
router.post('/asignar-alumno', asignarAlumno)
router.delete('/quitar-alumno', quitarAlumno)
router.get('/alumno/:id/cursos', cursosPorAlumno)
router.get('/:id/alumnos', alumnosPorCursoConEstado)
router.get('/resumen', resumenCursosTabla)
router.get('/:id/alumnos-simples', alumnosPorCurso)


// === RUTAS DE RELACIONES PERSONAL ===
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
    const { id_alumno, id_curso } = req.body
    await relaciones.quitarAlumno(id_alumno, id_curso)
    respuesta.success(req, res, 'Alumno quitado', 200)
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




module.exports = router
