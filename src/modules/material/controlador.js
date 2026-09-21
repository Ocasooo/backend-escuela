const path = require('path')
const fs = require('fs')
const upload = require('../../middleware/upload.js')
const tabla = 'material'

module.exports = function (dbinyectada) {
  let db = dbinyectada
  if (!db) db = require('../../DB/mysql.js')

  function todos() {
    return db.customQuery(
      `SELECT 
        m.*, 
        am.alumno_id, 
        a.nombre AS alumno_nombre, 
        a.apellido AS alumno_apellido, 
        c.nombre AS curso_nombre, 
        msg.asunto AS mensaje_titulo,
        u.nombre AS unidad_nombre,
        u.orden AS unidad_orden,
        consigna.observacion AS consigna_titulo,
        consigna.id AS consigna_id
      FROM material m
      LEFT JOIN curso c ON m.curso_id = c.id
      LEFT JOIN mensaje msg ON m.mensaje_id = msg.id
      JOIN alumno_material am ON am.material_id = m.id
      LEFT JOIN alumno a ON am.alumno_id = a.id
      LEFT JOIN unidades u ON m.unidad_id = u.id
      LEFT JOIN material consigna ON consigna.carpeta = m.carpeta AND consigna.estado = 'activo' AND consigna.tipo = 'tp'`
    )
  }

async function obtenerMaterialAlumno(alumno_id) {
  return db.customQuery(
    `SELECT c.nombre AS nombre_materia, m.observacion, m.calificacion, m.tipo
     FROM material m
     JOIN alumno_material am ON am.material_id = m.id
     JOIN curso c ON m.curso_id = c.id
     WHERE am.alumno_id = ?`,
    [alumno_id]
  )
}

  function uno(id) {
    return db.customQuery(
      `SELECT m.*, c.nombre AS curso_nombre, msg.asunto AS mensaje_titulo
      FROM material m
      LEFT JOIN curso c ON m.curso_id = c.id
      LEFT JOIN mensaje msg ON m.mensaje_id = msg.id
      WHERE m.id = ?`, [id]
    )
  }

  async function actualizarCalificacion(alumno_id, calificacion, carpeta, material_id) {
    const notaStr = String(calificacion).trim()

    // 1. Si tenemos material_id (ID de la entrega en la tabla material)
    if (material_id) {
      const res = await db.customQuery(
        `UPDATE material SET calificacion = ?, estado = 'calificado' WHERE id = ?`,
        [notaStr, material_id]
      )
      if (res && res.affectedRows > 0) return res
    }

    // 2. Si tenemos alumno_id y carpeta
    if (alumno_id && carpeta) {
      const res = await db.customQuery(
        `UPDATE material m
         JOIN alumno_material am ON am.material_id = m.id
         SET m.calificacion = ?, m.estado = 'calificado'
         WHERE am.alumno_id = ? AND m.carpeta = ?`,
        [notaStr, alumno_id, carpeta]
      )
      if (res && res.affectedRows > 0) return res
    }

    // 3. Fallback: buscar por carpeta en entregas de alumnos
    if (carpeta) {
      const res = await db.customQuery(
        `UPDATE material SET calificacion = ?, estado = 'calificado' 
         WHERE carpeta = ? AND tipo = 'tp' AND estado != 'activo'`,
        [notaStr, carpeta]
      )
      if (res && res.affectedRows > 0) return res
    }

    // 4. Si se pasó id como primer parámetro y no hubo coincidencia previa
    if (alumno_id) {
      const res = await db.customQuery(
        `UPDATE material SET calificacion = ?, estado = 'calificado' WHERE id = ?`,
        [notaStr, alumno_id]
      )
      if (res && res.affectedRows > 0) return res
    }

    return { affectedRows: 0 }
  }

async function agregarExamen(file, observacion, curso_id, alumno_id, calificacion) {
  if (!file || !file.buffer || !file.originalname) {
    throw new Error('Archivo inválido')
  }

  // ✅ Crear carpeta uploads/examenes si no existe
  const carpetaExamenes = path.join(__dirname, '../../uploads/examenes')
  if (!fs.existsSync(carpetaExamenes)) {
    fs.mkdirSync(carpetaExamenes, { recursive: true })
  }

  // ✅ Guardar en uploads/examenes
  const nombreArchivo = Date.now() + '-' + file.originalname
  const ruta = path.join('uploads', 'examenes', nombreArchivo)
  const rutaCompleta = path.join(__dirname, '../../', ruta)

  fs.writeFileSync(rutaCompleta, file.buffer)

  const result = await db.customQuery(
    `INSERT INTO material (observacion, archivo_scan, fecha_subida, curso_id, estado, calificacion, tipo)
     VALUES (?, ?, NOW(), ?, 'enviado', ?, 'examen')`,
    [observacion, ruta, curso_id, calificacion || '----']
  )

  const materialId = result.insertId

  await db.customQuery(
    `INSERT INTO alumno_material (alumno_id, material_id) VALUES (?, ?)`,
    [alumno_id, materialId]
  )

  return {
    id: materialId,
    archivo_scan: ruta
  }
}

async function obtenerExamenesAlumno(alumno_id, curso_id) {
  return db.customQuery(
    `SELECT c.nombre AS nombre_materia, m.observacion, m.calificacion
     FROM material m
     JOIN alumno_material am ON am.material_id = m.id
     JOIN curso c ON m.curso_id = c.id
     WHERE am.alumno_id = ? AND m.curso_id = ? AND m.tipo = 'examen'`,
    [alumno_id, curso_id]
  )
}

async function obtenerExamenesCurso(curso_id) {
  return db.customQuery(
    `SELECT a.dni, a.nombre, a.apellido, m.observacion, m.calificacion,m.id
     FROM material m
     JOIN alumno_material am ON am.material_id = m.id
     JOIN alumno a ON a.id = am.alumno_id
     WHERE m.curso_id = ? AND m.tipo = 'examen'`,
    [curso_id]
  )
}



  async function agregarArchivo(file, curso_id, mensaje_id, observacion, tipo, carpeta, unidad_id, fecha_limite) {
    if (!file || !file.buffer || !file.originalname) {
      throw new Error('Archivo inválido')
    }

    const carpetaUploads = path.join(__dirname, '../../uploads')
    if (!fs.existsSync(carpetaUploads)) {
      fs.mkdirSync(carpetaUploads, { recursive: true })
    }

    const nombreArchivo = Date.now() + '-' + file.originalname
    const ruta = path.join('uploads', nombreArchivo)
    const rutaCompleta = path.join(__dirname, '../../', ruta)

    fs.writeFileSync(rutaCompleta, file.buffer)

    const obs = observacion || file.originalname
    const tip = tipo || 'guia'
    const carp = carpeta || (unidad_id ? `unidad-${unidad_id}-material` : `curso-${curso_id}-material`)
    const flimite = fecha_limite && String(fecha_limite).trim() !== '' ? fecha_limite : null

    const result = await db.customQuery(
      `INSERT INTO material (observacion, carpeta, archivo_scan, fecha_subida, curso_id, unidad_id, estado, calificacion, tipo, mensaje_id, fecha_limite)
      VALUES (?, ?, ?, NOW(), ?, ?, 'activo', '----', ?, ?, ?)`,  
      [obs, carp, ruta, curso_id || null, unidad_id || null, tip, mensaje_id || null, flimite]
    )

    return {
      id: result.insertId,     // ✅ Devuelve el ID insertado
      archivo_scan: ruta       // ✅ Devuelve la ruta relativa
    }
  }

  async function agregarEntrega(file, observacion, carpeta, curso_id, alumno_id, unidad_id) {
    if (!file || !file.buffer || !file.originalname) {
      throw new Error('Archivo inválido')
    }

    const carpetaUploads = path.join(__dirname, '../../uploads')
    if (!fs.existsSync(carpetaUploads)) {
      fs.mkdirSync(carpetaUploads, { recursive: true })
    }

    const nombreArchivo = Date.now() + '-' + file.originalname
    const ruta = path.join('uploads', nombreArchivo)
    const rutaCompleta = path.join(__dirname, '../../', ruta)

    fs.writeFileSync(rutaCompleta, file.buffer)

    // Si el alumno ya tenía una entrega previa para esta misma consigna/carpeta, limpiar la anterior
    const previas = await db.customQuery(
      `SELECT m.id, m.archivo_scan 
       FROM material m
       JOIN alumno_material am ON am.material_id = m.id
       WHERE am.alumno_id = ? AND m.carpeta = ? AND m.estado = 'enviado'`,
      [alumno_id, carpeta]
    )

    if (previas && previas.length > 0) {
      for (const p of previas) {
        if (p.archivo_scan) {
          const rutaVieja = path.join(__dirname, '../../', p.archivo_scan)
          if (fs.existsSync(rutaVieja)) {
            try { fs.unlinkSync(rutaVieja) } catch (e) {}
          }
        }
        await db.customQuery('DELETE FROM alumno_material WHERE material_id = ?', [p.id])
        await db.customQuery('DELETE FROM material WHERE id = ?', [p.id])
      }
    }

    const result = await db.customQuery(
      `INSERT INTO material (observacion, carpeta, archivo_scan, fecha_subida, curso_id, unidad_id, estado, calificacion, tipo)
       VALUES (?, ?, ?, NOW(), ?, ?, 'enviado', '----', 'tp')`,
      [observacion, carpeta, ruta, curso_id || null, unidad_id || null]
    )

    const materialId = result.insertId

    await db.customQuery(
      `INSERT INTO alumno_material (alumno_id, material_id) VALUES (?, ?)`,
      [alumno_id, materialId]
    )

    return {
      id: materialId,
      archivo_scan: ruta
    }
  }

  async function obtenerPorCurso(curso_id) {
    return db.customQuery(
      `SELECT m.*, u.nombre AS unidad_nombre, u.orden AS unidad_orden
       FROM material m
       LEFT JOIN unidades u ON m.unidad_id = u.id
       WHERE m.curso_id = ?
       ORDER BY m.id ASC`,
      [curso_id]
    )
  }

  async function eliminar(data) {
    if (!data || !data.id) {
      throw new Error('Falta el ID del material a eliminar')
    }
    // 1. Obtener información del material para eliminar archivo físico si existe
    const mat = await db.customQuery(`SELECT archivo_scan FROM material WHERE id = ?`, [data.id])
    if (mat && mat.length > 0 && mat[0].archivo_scan) {
      const rutaCompleta = path.join(__dirname, '../../', mat[0].archivo_scan)
      if (fs.existsSync(rutaCompleta)) {
        try { fs.unlinkSync(rutaCompleta) } catch(e) { console.error('Error eliminando archivo físico:', e) }
      }
    }
    // 2. Eliminar referencias en alumno_material
    await db.customQuery(`DELETE FROM alumno_material WHERE material_id = ?`, [data.id])
    // 3. Eliminar de la tabla material
    return db.customQuery(`DELETE FROM material WHERE id = ?`, [data.id])
  }

  async function eliminarPorCarpeta(carpeta) {
  // Primero obtener todos los materiales que tienen esa carpeta, para borrar archivos físicos si es necesario
  const materiales = await db.customQuery(`SELECT archivo_scan FROM material WHERE carpeta = ?`, [carpeta])

  // Eliminar archivos físicos
  materiales.forEach(mat => {
    if (mat.archivo_scan) {
      const rutaCompleta = path.join(__dirname, '../../', mat.archivo_scan)
      if (fs.existsSync(rutaCompleta)) {
        fs.unlinkSync(rutaCompleta)
      }
    }
  })

  // Borrar registros de la tabla alumno_material
  await db.customQuery(`DELETE FROM alumno_material WHERE material_id IN (SELECT id FROM material WHERE carpeta = ?)`, [carpeta])

  // Finalmente, borrar de material
  await db.customQuery(`DELETE FROM material WHERE carpeta = ?`, [carpeta])
}

  async function obtenerTodosLosTPsGestion(personal_id) {
    let filtroCursos = ''
    if (personal_id) {
      const asignados = await db.customQuery(
        `SELECT curso_id FROM curso_has_personal WHERE personal_id = ?`,
        [personal_id]
      )
      if (asignados && asignados.length > 0) {
        const ids = asignados.map(a => a.curso_id).filter(Boolean)
        if (ids.length > 0) {
          filtroCursos = ` AND m.curso_id IN (${ids.join(',')})`
        }
      }
    }

    const consignas = await db.customQuery(
      `SELECT m.id, m.observacion, m.carpeta, m.archivo_scan, m.fecha_subida, m.fecha_limite,
              m.curso_id, m.unidad_id, m.estado,
              c.nombre AS curso_nombre,
              u.nombre AS unidad_nombre, u.orden AS unidad_orden
       FROM material m
       LEFT JOIN curso c ON m.curso_id = c.id
       LEFT JOIN unidades u ON m.unidad_id = u.id
       WHERE m.tipo = 'tp' AND m.estado = 'activo' ${filtroCursos}
       ORDER BY m.fecha_subida DESC`
    )

    const entregas = await db.customQuery(
      `SELECT m.id, m.observacion, m.carpeta, m.archivo_scan, m.fecha_subida, m.calificacion,
              m.estado, m.curso_id, m.unidad_id,
              am.alumno_id,
              a.nombre AS alumno_nombre, a.apellido AS alumno_apellido,
              c.nombre AS curso_nombre,
              u.nombre AS unidad_nombre
       FROM material m
       JOIN alumno_material am ON am.material_id = m.id
       LEFT JOIN alumno a ON am.alumno_id = a.id
       LEFT JOIN curso c ON m.curso_id = c.id
       LEFT JOIN unidades u ON m.unidad_id = u.id
       WHERE m.tipo = 'tp' AND m.estado IN ('enviado', 'calificado') ${filtroCursos}
       ORDER BY m.fecha_subida DESC`
    )

    const ahora = new Date()
    const entregasUsadas = new Set()

    const resultado = consignas.map(c => {
      let vencido = false
      if (c.fecha_limite) {
        const fl = new Date(c.fecha_limite)
        if (!isNaN(fl.getTime())) {
          vencido = fl < ahora
        }
      }

      function normalizar(s) {
        return (s || '')
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[º°]/g, 'o')
          .replace(/[^a-z0-9]/g, '')
      }

      const normC = normalizar(c.observacion)

      const entregasDeEsteTP = entregas.filter(e => {
        let coincide = false
        if (c.carpeta && e.carpeta && c.carpeta === e.carpeta) {
          coincide = true
        } else if (c.curso_id && e.curso_id && c.curso_id === e.curso_id) {
          const normE = normalizar(e.observacion)
          if (normC && normE && (normC === normE || normE.includes(normC) || normC.includes(normE))) {
            coincide = true
          } else if (c.unidad_id && e.unidad_id && c.unidad_id === e.unidad_id) {
            const obsC = (c.observacion || '').toLowerCase().trim()
            const obsE = (e.observacion || '').toLowerCase().trim()
            if (obsC === obsE || obsE.includes(obsC) || obsC.includes(obsE)) {
              coincide = true
            }
          }
        }
        if (coincide) {
          entregasUsadas.add(e.id)
          return true
        }
        return false
      })

      const mapeadas = entregasDeEsteTP.map(e => ({
        id: e.id,
        alumno_id: e.alumno_id || 1,
        alumno: (e.alumno_apellido && e.alumno_nombre) ? `${e.alumno_apellido}, ${e.alumno_nombre}` : (e.alumno_nombre || 'Estudiante'),
        archivo_nombre: e.archivo_scan ? path.basename(e.archivo_scan) : 'resolucion.pdf',
        archivo_scan: e.archivo_scan,
        fecha: e.fecha_subida ? new Date(e.fecha_subida).toLocaleDateString('es-AR') : 'Reciente',
        calificacion: e.calificacion && e.calificacion !== '----' ? e.calificacion : '--',
        estado: e.estado === 'calificado' ? 'calificado' : 'pendiente',
        carpeta: e.carpeta || c.carpeta
      }))

      const pendientes = mapeadas.filter(e => e.estado === 'pendiente').length
      const calificados = mapeadas.filter(e => e.estado === 'calificado').length

      return {
        id: c.id,
        titulo: c.observacion || 'Trabajo Práctico',
        curso: c.curso_nombre || 'Curso General',
        curso_id: c.curso_id,
        unidad: c.unidad_nombre || (c.unidad_id ? `Unidad ${c.unidad_id}` : ''),
        unidad_id: c.unidad_id,
        archivo_consigna: c.archivo_scan,
        archivo_nombre: c.archivo_scan ? path.basename(c.archivo_scan) : 'consigna.pdf',
        fecha_subida: c.fecha_subida,
        fecha_limite: c.fecha_limite,
        carpeta: c.carpeta,
        vencido,
        total_entregas: mapeadas.length,
        pendientes,
        calificados,
        entregas: mapeadas
      }
    })

    // Entregas huérfanas
    const entregasHuerfanas = entregas.filter(e => !entregasUsadas.has(e.id))
    if (entregasHuerfanas.length > 0) {
      const mapaHuerfanas = new Map()
      entregasHuerfanas.forEach(e => {
        const key = `${e.curso_id || 0}_${e.carpeta || e.observacion}`
        if (!mapaHuerfanas.has(key)) {
          mapaHuerfanas.set(key, {
            id: 9000 + e.id,
            titulo: e.observacion || e.carpeta || 'Trabajo Práctico Histórico',
            curso: e.curso_nombre || 'Curso General',
            curso_id: e.curso_id,
            unidad: e.unidad_nombre || '',
            unidad_id: e.unidad_id,
            archivo_consigna: null,
            archivo_nombre: 'archivo.pdf',
            fecha_subida: e.fecha_subida,
            fecha_limite: null,
            carpeta: e.carpeta,
            vencido: false,
            entregas: []
          })
        }
        const grupo = mapaHuerfanas.get(key)
        grupo.entregas.push({
          id: e.id,
          alumno_id: e.alumno_id || 1,
          alumno: (e.alumno_apellido && e.alumno_nombre) ? `${e.alumno_apellido}, ${e.alumno_nombre}` : (e.alumno_nombre || 'Estudiante'),
          archivo_nombre: e.archivo_scan ? path.basename(e.archivo_scan) : 'resolucion.pdf',
          archivo_scan: e.archivo_scan,
          fecha: e.fecha_subida ? new Date(e.fecha_subida).toLocaleDateString('es-AR') : 'Reciente',
          calificacion: e.calificacion && e.calificacion !== '----' ? e.calificacion : '--',
          estado: e.estado === 'calificado' ? 'calificado' : 'pendiente',
          carpeta: e.carpeta
        })
      })

      mapaHuerfanas.forEach(grupo => {
        grupo.total_entregas = grupo.entregas.length
        grupo.pendientes = grupo.entregas.filter(e => e.estado === 'pendiente').length
        grupo.calificados = grupo.entregas.filter(e => e.estado === 'calificado').length
        resultado.push(grupo)
      })
    }

    return resultado
  }

  async function limpiarHistorialTPs(curso_id) {
    let whereCurso = ''
    const params = []
    if (curso_id && curso_id !== 'todos') {
      whereCurso = ' AND curso_id = ?'
      params.push(curso_id)
    }

    // 1. Obtener consignas vencidas
    const vencidos = await db.customQuery(
      `SELECT id, carpeta, archivo_scan FROM material 
       WHERE tipo = 'tp' AND estado = 'activo' AND fecha_limite IS NOT NULL AND fecha_limite < NOW() ${whereCurso}`,
      params
    )

    if (!vencidos || vencidos.length === 0) {
      return { eliminados: 0, mensaje: 'No hay trabajos prácticos vencidos en el historial' }
    }

    const carpetas = vencidos.map(v => v.carpeta).filter(Boolean)
    const idsConsignas = vencidos.map(v => v.id)

    // 2. Obtener entregas de alumnos asociadas a estas carpetas
    let entregasAsociadas = []
    if (carpetas.length > 0) {
      const placeholders = carpetas.map(() => '?').join(',')
      entregasAsociadas = await db.customQuery(
        `SELECT id, archivo_scan FROM material WHERE carpeta IN (${placeholders}) AND tipo = 'tp'`,
        carpetas
      )
    }

    // 3. Eliminar archivos físicos de consignas y entregas
    const todosArchivos = [...vencidos, ...entregasAsociadas]
    for (const item of todosArchivos) {
      if (item.archivo_scan) {
        const posiblesRutas = [
          path.join(__dirname, '../../', item.archivo_scan),
          path.join(__dirname, '../../../', item.archivo_scan),
          path.join(__dirname, '../../uploads', path.basename(item.archivo_scan))
        ]
        posiblesRutas.forEach(p => {
          if (fs.existsSync(p)) {
            try { fs.unlinkSync(p) } catch(e) {}
          }
        })
      }
    }

    // 4. Eliminar referencias de alumno_material
    const todosIds = [...idsConsignas, ...entregasAsociadas.map(e => e.id)]
    if (todosIds.length > 0) {
      const placeholdersIds = todosIds.map(() => '?').join(',')
      await db.customQuery(`DELETE FROM alumno_material WHERE material_id IN (${placeholdersIds})`, todosIds)
      await db.customQuery(`DELETE FROM material WHERE id IN (${placeholdersIds})`, todosIds)
    }

    return { eliminados: vencidos.length + entregasAsociadas.length, consignas_eliminadas: vencidos.length }
  }

  async function eliminarTPConsigna(id) {
    if (!id) throw new Error('ID de consigna requerido')
    const consigna = await db.customQuery(`SELECT id, carpeta, archivo_scan FROM material WHERE id = ?`, [id])
    if (!consigna || consigna.length === 0) return { eliminados: 0 }

    const carp = consigna[0].carpeta
    const subEntregas = carp 
      ? await db.customQuery(`SELECT id, archivo_scan FROM material WHERE carpeta = ? AND id != ?`, [carp, id])
      : []

    const todos = [...consigna, ...subEntregas]
    todos.forEach(item => {
      if (item.archivo_scan) {
        const ruta = path.join(__dirname, '../../', item.archivo_scan)
        if (fs.existsSync(ruta)) {
          try { fs.unlinkSync(ruta) } catch(e) {}
        }
      }
    })

    const ids = todos.map(t => t.id)
    const placeholders = ids.map(() => '?').join(',')
    await db.customQuery(`DELETE FROM alumno_material WHERE material_id IN (${placeholders})`, ids)
    await db.customQuery(`DELETE FROM material WHERE id IN (${placeholders})`, ids)

    return { eliminados: ids.length }
  }

  return {
    todos,
    uno,
    actualizarCalificacion,
    agregarArchivo,
    eliminar,
    upload,
    agregarEntrega,
    obtenerMaterialAlumno,
    agregarExamen,
    obtenerExamenesAlumno,
    obtenerExamenesCurso,
    eliminarPorCarpeta,
    obtenerPorCurso,
    obtenerTodosLosTPsGestion,
    limpiarHistorialTPs,
    eliminarTPConsigna
  }
}
