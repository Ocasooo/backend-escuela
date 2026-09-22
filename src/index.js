const app = require('./app')
const { iniciarAutoResetTimer } = require('./modules/demo/controlador.js')

// Inicializamos el servidor
app.listen(app.get('port'), () => {
  console.log("servidor escuchando en el puerto :", app.get("port"))
  // Iniciar temporizador recurrente de 60 minutos para modo demo
  iniciarAutoResetTimer()
})