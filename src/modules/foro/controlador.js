const path = require('path')
const fs = require('fs')
const upload = require('../../middleware/upload.js')
const tabla = 'foro'

module.exports = function (dbinyectada) {
  let db = dbinyectada
  if (!db) {
    db = require('../../DB/mysql.js')
  }

  function asegurarDirectorioForo() {
    const dirForo = path.join(__dirname, '../../uploads/foro')
    if (!fs.existsSync(dirForo)) {
      fs.mkdirSync(dirForo, { recursive: true })
    }
    const dirForoRoot = path.join(__dirname, '../../../uploads/foro')
    if (!fs.existsSync(dirForoRoot)) {
      fs.mkdirSync(dirForoRoot, { recursive: true })
    }
    return dirForo
  }

  function guardarArchivoForo(file) {
    if (!file || !file.buffer || !file.originalname) return null
    asegurarDirectorioForo()
    const nombreLimpio = Date.now() + '-' + file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')
    const rutaRelativa = 'uploads/foro/' + nombreLimpio
    const rutaFisica = path.join(__dirname, '../../', rutaRelativa)
    fs.writeFileSync(rutaFisica, file.buffer)
    // También guardar copia en root uploads si existe
    try {
      const rutaRoot = path.join(__dirname, '../../../', rutaRelativa)
      fs.writeFileSync(rutaRoot, file.buffer)
    } catch (e) {}
    return rutaRelativa
  }

  async function determinarAutor(usuario, body) {
    let personal_id = null
    let alumno_id = null

    const rol = (usuario && (usuario.ocupacion || usuario.rol)) ? String(usuario.ocupacion || usuario.rol).toLowerCase() : ''
    const uId = usuario ? usuario.id : null

    if (rol === 'profesor' || rol === 'docente' || rol === 'administrador' || rol === 'admin') {
      personal_id = uId
    } else if (rol === 'alumno' || rol === 'estudiante') {
      alumno_id = uId
    } else {
      // Fallback a body si no viene en el token
      if (body.personal_id) {
        personal_id = Number(body.personal_id)
      } else if (body.alumno_id) {
        alumno_id = Number(body.alumno_id)
      } else if (uId) {
        // Verificar si existe en personal
        const esPersonal = await db.customQuery('SELECT id FROM personal WHERE id = ?', [uId])
        if (esPersonal && esPersonal.length > 0) {
          personal_id = uId
        } else {
          alumno_id = uId
        }
      } else {
        // Si no hay ninguno, asignar por defecto al primer personal
        const primerPersonal = await db.customQuery('SELECT id FROM personal LIMIT 1')
        personal_id = primerPersonal.length > 0 ? primerPersonal[0].id : 1
      }
    }

    return { personal_id, alumno_id }
  }

  async function obtenerPorCurso(curso_id) {
    return db.customQuery(
      `SELECT 
        f.*,
        CASE 
          WHEN f.personal_id IS NOT NULL THEN CONCAT(p.nombre, ' ', p.apellido)
          WHEN f.alumno_id IS NOT NULL THEN CONCAT(a.nombre, ' ', a.apellido)
          ELSE 'Usuario de la Comunidad'
        END AS autor_nombre,
        CASE 
          WHEN f.personal_id IS NOT NULL THEN COALESCE(p.ocupacion, 'Profesor')
          WHEN f.alumno_id IS NOT NULL THEN 'Alumno'
          ELSE 'Miembro'
        END AS autor_rol,
        CASE 
          WHEN f.personal_id IS NOT NULL THEN p.imagen
          WHEN f.alumno_id IS NOT NULL THEN a.imagen
          ELSE NULL
        END AS autor_imagen,
        (SELECT COUNT(*) FROM foro_respuesta fr WHERE fr.foro_id = f.id) AS total_respuestas
      FROM foro f
      LEFT JOIN personal p ON f.personal_id = p.id
      LEFT JOIN alumno a ON f.alumno_id = a.id
      WHERE f.curso_id = ?
      ORDER BY f.fecha_creacion DESC`,
      [curso_id]
    )
  }

  async function obtenerUno(id) {
    const temas = await db.customQuery(
      `SELECT 
        f.*,
        CASE 
          WHEN f.personal_id IS NOT NULL THEN CONCAT(p.nombre, ' ', p.apellido)
          WHEN f.alumno_id IS NOT NULL THEN CONCAT(a.nombre, ' ', a.apellido)
          ELSE 'Usuario de la Comunidad'
        END AS autor_nombre,
        CASE 
          WHEN f.personal_id IS NOT NULL THEN COALESCE(p.ocupacion, 'Profesor')
          WHEN f.alumno_id IS NOT NULL THEN 'Alumno'
          ELSE 'Miembro'
        END AS autor_rol,
        CASE 
          WHEN f.personal_id IS NOT NULL THEN p.imagen
          WHEN f.alumno_id IS NOT NULL THEN a.imagen
          ELSE NULL
        END AS autor_imagen,
        c.nombre AS curso_nombre
      FROM foro f
      LEFT JOIN personal p ON f.personal_id = p.id
      LEFT JOIN alumno a ON f.alumno_id = a.id
      LEFT JOIN curso c ON f.curso_id = c.id
      WHERE f.id = ?`,
      [id]
    )

    if (!temas || temas.length === 0) return null

    const respuestas = await db.customQuery(
      `SELECT 
        fr.*,
        CASE 
          WHEN fr.personal_id IS NOT NULL THEN CONCAT(p.nombre, ' ', p.apellido)
          WHEN fr.alumno_id IS NOT NULL THEN CONCAT(a.nombre, ' ', a.apellido)
          ELSE 'Usuario'
        END AS autor_nombre,
        CASE 
          WHEN fr.personal_id IS NOT NULL THEN COALESCE(p.ocupacion, 'Profesor')
          WHEN fr.alumno_id IS NOT NULL THEN 'Alumno'
          ELSE 'Miembro'
        END AS autor_rol,
        CASE 
          WHEN fr.personal_id IS NOT NULL THEN p.imagen
          WHEN fr.alumno_id IS NOT NULL THEN a.imagen
          ELSE NULL
        END AS autor_imagen
      FROM foro_respuesta fr
      LEFT JOIN personal p ON fr.personal_id = p.id
      LEFT JOIN alumno a ON fr.alumno_id = a.id
      WHERE fr.foro_id = ?
      ORDER BY fr.fecha_creacion ASC`,
      [id]
    )

    return {
      tema: temas[0],
      respuestas: respuestas || []
    }
  }

  async function crearTema(datos, file, usuario) {
    const { curso_id, titulo, contenido, enlace_url } = datos
    if (!curso_id || !titulo || !contenido) {
      throw new Error('Faltan datos requeridos: curso_id, título o contenido')
    }

    const { personal_id, alumno_id } = await determinarAutor(usuario, datos)
    let imagen_url = null
    if (file) {
      imagen_url = guardarArchivoForo(file)
    } else if (datos.imagen_url) {
      imagen_url = datos.imagen_url
    }

    const enlaceLimpio = (enlace_url && enlace_url.trim()) ? enlace_url.trim() : null

    const result = await db.customQuery(
      `INSERT INTO foro (curso_id, alumno_id, personal_id, titulo, contenido, imagen_url, enlace_url, editado, fecha_creacion)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, NOW())`,
      [curso_id, alumno_id, personal_id, titulo.trim(), contenido.trim(), imagen_url, enlaceLimpio]
    )

    return {
      id: result.insertId,
      titulo,
      imagen_url,
      enlace_url: enlaceLimpio
    }
  }

  async function editarTema(id, datos, file, usuario) {
    const existente = await db.customQuery('SELECT * FROM foro WHERE id = ?', [id])
    if (!existente || existente.length === 0) {
      throw new Error('El tema a editar no existe')
    }
    const tema = existente[0]

    // Validar permisos: Los profesores y administradores pueden editar cualquier tema.
    // Los alumnos solo pueden editar sus propios temas.
    const rol = (usuario && (usuario.ocupacion || usuario.rol)) ? String(usuario.ocupacion || usuario.rol).toLowerCase() : ''
    const esDocenteOAdmin = rol === 'profesor' || rol === 'docente' || rol === 'administrador' || rol === 'admin'

    if (!esDocenteOAdmin) {
      if (tema.alumno_id && usuario && Number(tema.alumno_id) !== Number(usuario.id)) {
        throw new Error('No tienes permisos para editar este tema de discusión')
      }
      if (tema.personal_id) {
        throw new Error('No tienes permisos para editar un tema publicado por el cuerpo docente')
      }
    }

    let imagen_url = tema.imagen_url
    if (file) {
      imagen_url = guardarArchivoForo(file)
    } else if (datos.eliminar_imagen === 'true' || datos.eliminar_imagen === true) {
      imagen_url = null
    }

    const titulo = datos.titulo !== undefined ? datos.titulo.trim() : tema.titulo
    const contenido = datos.contenido !== undefined ? datos.contenido.trim() : tema.contenido
    const enlace_url = datos.enlace_url !== undefined ? ((datos.enlace_url && datos.enlace_url.trim()) ? datos.enlace_url.trim() : null) : tema.enlace_url

    await db.customQuery(
      `UPDATE foro 
       SET titulo = ?, contenido = ?, imagen_url = ?, enlace_url = ?, editado = 1
       WHERE id = ?`,
      [titulo, contenido, imagen_url, enlace_url, id]
    )

    return { id, titulo, contenido, imagen_url, enlace_url, editado: 1 }
  }

  async function eliminarTema(id, usuario) {
    const existente = await db.customQuery('SELECT * FROM foro WHERE id = ?', [id])
    if (!existente || existente.length === 0) {
      throw new Error('El tema a eliminar no existe')
    }
    const tema = existente[0]

    const rol = (usuario && (usuario.ocupacion || usuario.rol)) ? String(usuario.ocupacion || usuario.rol).toLowerCase() : ''
    const esDocenteOAdmin = rol === 'profesor' || rol === 'docente' || rol === 'administrador' || rol === 'admin'

    if (!esDocenteOAdmin) {
      if (tema.alumno_id && usuario && Number(tema.alumno_id) !== Number(usuario.id)) {
        throw new Error('No tienes permisos para eliminar este tema')
      }
      if (tema.personal_id) {
        throw new Error('No tienes permisos para eliminar un tema del docente')
      }
    }

    // 1. Eliminar respuestas hijas
    await db.customQuery('DELETE FROM foro_respuesta WHERE foro_id = ?', [id])

    // 2. Eliminar imagen física si existía
    if (tema.imagen_url) {
      try {
        const rutaCompleta = path.join(__dirname, '../../', tema.imagen_url)
        if (fs.existsSync(rutaCompleta)) fs.unlinkSync(rutaCompleta)
      } catch (e) {}
    }

    // 3. Eliminar tema principal
    return db.customQuery('DELETE FROM foro WHERE id = ?', [id])
  }

  async function crearRespuesta(foro_id, datos, file, usuario) {
    const { contenido, parent_id, enlace_url } = datos
    if (!foro_id || !contenido || !contenido.trim()) {
      throw new Error('El contenido del mensaje no puede estar vacío')
    }

    const { personal_id, alumno_id } = await determinarAutor(usuario, datos)
    let imagen_url = null
    if (file) {
      imagen_url = guardarArchivoForo(file)
    }

    const parentIdVal = (parent_id && Number(parent_id) > 0) ? Number(parent_id) : null
    const enlaceLimpio = (enlace_url && enlace_url.trim()) ? enlace_url.trim() : null

    const result = await db.customQuery(
      `INSERT INTO foro_respuesta (foro_id, parent_id, alumno_id, personal_id, contenido, imagen_url, enlace_url, editado, fecha_creacion)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, NOW())`,
      [foro_id, parentIdVal, alumno_id, personal_id, contenido.trim(), imagen_url, enlaceLimpio]
    )

    return {
      id: result.insertId,
      foro_id,
      parent_id: parentIdVal,
      contenido: contenido.trim(),
      imagen_url,
      enlace_url: enlaceLimpio
    }
  }

  async function editarRespuesta(id, datos, file, usuario) {
    const existente = await db.customQuery('SELECT * FROM foro_respuesta WHERE id = ?', [id])
    if (!existente || existente.length === 0) {
      throw new Error('La respuesta a editar no existe')
    }
    const r = existente[0]

    const rol = (usuario && (usuario.ocupacion || usuario.rol)) ? String(usuario.ocupacion || usuario.rol).toLowerCase() : ''
    const esDocenteOAdmin = rol === 'profesor' || rol === 'docente' || rol === 'administrador' || rol === 'admin'

    if (!esDocenteOAdmin) {
      if (r.alumno_id && usuario && Number(r.alumno_id) !== Number(usuario.id)) {
        throw new Error('No tienes permisos para editar esta respuesta')
      }
      if (r.personal_id) {
        throw new Error('No tienes permisos para editar el mensaje de un docente')
      }
    }

    let imagen_url = r.imagen_url
    if (file) {
      imagen_url = guardarArchivoForo(file)
    } else if (datos.eliminar_imagen === 'true' || datos.eliminar_imagen === true) {
      imagen_url = null
    }

    const contenido = datos.contenido !== undefined ? datos.contenido.trim() : r.contenido
    const enlace_url = datos.enlace_url !== undefined ? ((datos.enlace_url && datos.enlace_url.trim()) ? datos.enlace_url.trim() : null) : r.enlace_url

    await db.customQuery(
      `UPDATE foro_respuesta
       SET contenido = ?, imagen_url = ?, enlace_url = ?, editado = 1
       WHERE id = ?`,
      [contenido, imagen_url, enlace_url, id]
    )

    return { id, contenido, imagen_url, enlace_url, editado: 1 }
  }

  async function eliminarRespuesta(id, usuario) {
    const existente = await db.customQuery('SELECT * FROM foro_respuesta WHERE id = ?', [id])
    if (!existente || existente.length === 0) {
      throw new Error('La respuesta a eliminar no existe')
    }
    const r = existente[0]

    const rol = (usuario && (usuario.ocupacion || usuario.rol)) ? String(usuario.ocupacion || usuario.rol).toLowerCase() : ''
    const esDocenteOAdmin = rol === 'profesor' || rol === 'docente' || rol === 'administrador' || rol === 'admin'

    if (!esDocenteOAdmin) {
      if (r.alumno_id && usuario && Number(r.alumno_id) !== Number(usuario.id)) {
        throw new Error('No tienes permisos para eliminar este mensaje')
      }
      if (r.personal_id) {
        throw new Error('No tienes permisos para eliminar el mensaje de un docente')
      }
    }

    // Eliminar también posibles respuestas hijas que respondieron a esta respuesta
    await db.customQuery('DELETE FROM foro_respuesta WHERE parent_id = ?', [id])

    return db.customQuery('DELETE FROM foro_respuesta WHERE id = ?', [id])
  }

  function todos() {
    return db.todos(tabla)
  }

  function uno(id) {
    return db.uno(tabla, id)
  }

  function agregar(body) {
    return db.agregar(tabla, body)
  }

  function eliminar(body) {
    return db.eliminar(tabla, body)
  }

  return {
    todos,
    uno,
    agregar,
    eliminar,
    obtenerPorCurso,
    obtenerUno,
    crearTema,
    editarTema,
    eliminarTema,
    crearRespuesta,
    editarRespuesta,
    eliminarRespuesta,
    upload
  }
}