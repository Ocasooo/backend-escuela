const express = require('express')
const config = require('./config')
const morgan = require('morgan')
const cors = require('cors')
const path = require('path')
const fs = require('fs')

const alumno = require('./modules/alumno/rutas.js')
const personal = require('./modules/personal/rutas.js')
const curso = require('./modules/curso/rutas.js')
const examen = require('./modules/examen/rutas.js')
const foro = require('./modules/foro/rutas.js')
const mensaje = require('./modules/mensaje/rutas.js')
const material = require('./modules/material/rutas.js')
const unidades = require('./modules/unidades/rutas.js')
const login = require('./modules/login/rutas.js')
const aula = require('./modules/aula/rutas.js')
const curso_html = require('./modules/curso_html/rutas.js')
const verificarToken = require('./modules/login/middleware')
const error = require('./red/errors.js')

const app = express()

// Asegurar existencia de directorios para subida de archivos
const uploadsDirs = [
  path.join(__dirname, '../uploads'),
  path.join(__dirname, '../uploads/examenes'),
  path.join(__dirname, '../uploads/perfil'),
  path.join(__dirname, '../uploads/foro'),
  path.join(__dirname, 'uploads')
]
uploadsDirs.forEach(dir => {
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  } catch (e) {
    console.warn(`Aviso: No se pudo verificar/crear directorio ${dir}:`, e.message)
  }
})

// Configuración CORS permisiva para desarrollo y producción
app.use(cors({
  origin: true, // Refleja dinámicamente cualquier origen del cliente (localhost, Vercel, etc.)
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
}))

app.use(morgan('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Configuración de servidor
app.set('port', config.app.port)
app.set('etag', false)

// Prevenir almacenamiento en caché obsoleto para toda la API
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  res.set('Pragma', 'no-cache')
  res.set('Expires', '0')
  next()
})

// Archivos estáticos de uploads
app.use('/uploads', express.static(path.join(__dirname, '/uploads')))
app.use('/uploads', express.static(path.join(__dirname, '../uploads')))

// Health check para Render y monitores de servicio
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    servicio: 'API Escuela Técnica EFP N° 31',
    fecha: new Date().toISOString()
  })
})

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' })
})

// Middleware de autenticación para endpoints protegidos
app.use(verificarToken)

// Rutas de la API (compatibilidad total tanto para llamadas con /api/... como sin /api/...)
const modulos = [
  ['/alumno', alumno],
  ['/personal', personal],
  ['/curso', curso],
  ['/examen', examen],
  ['/foro', foro],
  ['/material', material],
  ['/mensaje', mensaje],
  ['/unidades', unidades],
  ['/login', login],
  ['/curso_html', curso_html],
  ['/aula', aula]
]
modulos.forEach(([prefix, router]) => {
  app.use(`/api${prefix}`, router)
  app.use(prefix, router)
})
app.use(error)

module.exports = app