const app = require('./app') //Traemos todos los archivos desde app.js

//Inicializamos el servidor
app.listen(app.get('port'),()=>{
    console.log("servidor escuchando en el puerto :",app.get("port"))
})