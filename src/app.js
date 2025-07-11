const express= require('express')
const config = require('./config') //configuramos express
const morgan = require('morgan')
const cors = require('cors') 
const alumno = require('./modules/alumno/rutas.js') //Ruta de la tabla usuarios
const personal = require('./modules/personal/rutas.js') //Ruta de la tabla usuarios
const curso = require('./modules/curso/rutas.js') //Ruta de la tabla usuarios
const examen = require('./modules/examen/rutas.js') //Ruta de la tabla usuarios
const foro = require('./modules/foro/rutas.js') //Ruta de la tabla usuarios
const mensaje = require('./modules/mensaje/rutas.js') //Ruta de la tabla usuarios
const material = require('./modules/material/rutas.js') //Ruta de la tabla usuarios
const unidades = require('./modules/unidades/rutas.js') //Ruta de la tabla usuarios
const login = require('./modules/login/rutas.js') //Ruta de la tabla usuarios
const aula = require('./modules/aula/rutas.js')
const curso_html = require('./modules/curso_html/rutas.js')
const verificarToken = require('./modules/login/middleware')
const path = require('path')

const app = express()
const error =require('./red/errors.js')

//Middleware
app.use(cors({
  origin: 'http://localhost:4321'
}));
app.use(morgan('dev')) //Nos permite ver facilmente en consola las consultas que se van realizando
app.use(express.json())
app.use(express.urlencoded({extended:true}))

//configuracion
app.set('port',config.app.port) //asignamos un puerto

//rutas
app.use('/uploads', express.static(path.join(__dirname, '/uploads')))

app.use(verificarToken);

app.use('/api/alumno',alumno)
app.use('/api/personal',personal)
app.use('/api/curso',curso)
app.use('/api/examen',examen)
app.use('/api/foro',foro)
app.use('/api/material',material)
app.use('/api/mensaje',mensaje)
app.use('/api/unidades',unidades)
app.use('/api/login',login)
app.use('/api/material',material)
app.use('/api/curso_html',curso_html)
app.use('/api/aula',aula)
app.use(error)



module.exports = app