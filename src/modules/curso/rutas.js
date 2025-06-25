const express = require('express')
const respuesta = require('../../red/respuestas.js')
const { crud, relaciones } = require('./index.js') // destructuring

const router = express.Router()

// rutas de relaciones alumno
router.post('/asignar-alumno', asignarAlumno)
router.delete('/quitar-alumno', quitarAlumno)
router.get('/alumno/:id/cursos', cursosPorAlumno)
router.get('/:id/alumnos', alumnosPorCursoConEstado)
router.get('/resumen', resumenCursosTabla)


// rutas de relaciones personal
router.post('/asignar-personal', asignarPersonal)
router.delete('/quitar-personal', quitarPersonal)
router.get('/personal/:id/cursos', cursosPorPersonal)
router.get('/alumnos-con-curso', alumnosConCurso)

// rutas de CRUD
router.get('/', todos)
router.get('/:id', uno)
router.post('/', agregar)
router.put('/:id', editar)
router.put('/', eliminar)

// funciones CRUD
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

// funciones de relaciones
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
    const result = await relaciones.obtenerAlumnosConCurso()
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


module.exports = router
