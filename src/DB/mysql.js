const mysql = require('mysql2')
const config = require('../config.js')

let pool

if (config.mysql.url) {
    pool = mysql.createPool(config.mysql.url)
} else {
    const dbConfig = {
        host: config.mysql.host,
        port: config.mysql.port,
        user: config.mysql.user,
        password: config.mysql.password,
        database: config.mysql.database,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    }
    if (config.mysql.ssl) {
        dbConfig.ssl = config.mysql.ssl
    }
    pool = mysql.createPool(dbConfig)
}

// Verificar la conexión inicial de forma amigable
pool.getConnection((err, conn) => {
    if (err) {
        console.error('\n❌ [Error MySQL]: No se pudo conectar a la base de datos.')
        console.error(`👉 Host: ${config.mysql.host}:${config.mysql.port} | Base de datos: ${config.mysql.database}`)
        if (err.code === 'ER_ACCESS_DENIED_ERROR') {
            console.error('👉 Causa: Acceso denegado (usuario o contraseña incorrectos).')
            console.error('👉 Solución: Configura las variables MYSQL_USER y MYSQL_PASSWORD correctas en tus variables de entorno.')
        } else if (err.code === 'ECONNREFUSED') {
            console.error('👉 Causa: El servicio MySQL no está iniciado o no escucha en el host/puerto configurado.')
        } else if (err.code === 'ER_BAD_DB_ERROR') {
            console.error(`👉 Causa: La base de datos '${config.mysql.database}' no existe.`)
            console.error(`👉 Solución: Crea la base de datos '${config.mysql.database}' o ejecuta el script de inicialización.`)
        } else {
            console.error('👉 Detalle del error:', err.message)
        }
        console.error('--------------------------------------------------\n')
    } else {
        console.log(`✅ Base de datos MySQL conectada exitosamente (${config.mysql.host}:${config.mysql.port}/${config.mysql.database})`)
        conn.release()
    }
})

const conexion = pool

function todos(tabla){//function para traer todos los datos de la tabla
    return new Promise((resolve,reject) =>{
        conexion.query(`SELECT * FROM ??`, [tabla], (error,result) =>{
            return error ? reject(error) : resolve(result)
        })
    })
}

function uno(tabla,id){//function para traer un dato de la tabla
    return new Promise((resolve,reject) =>{
        conexion.query(`SELECT * FROM ?? WHERE id = ?`, [tabla, id], (error,result) =>{
            return error ? reject(error) : resolve(result)
        })
    })
}

function agregar(tabla, data){
  return new Promise((resolve, reject) =>{
    conexion.query(`INSERT INTO ?? SET ?`, [tabla, data], (error, result) =>{
      return error ? reject(error) : resolve(result);
    });
  });
}

function editar(tabla, id, data){
  return new Promise((resolve, reject) =>{
    conexion.query(`UPDATE ?? SET ? WHERE id = ?`, [tabla, data, id], (error, result) =>{
      return error ? reject(error) : resolve(result);
    });
  });
}

function eliminar(tabla,data){//function para eliminar un dato de la tabla
    return new Promise((resolve,reject) =>{
        conexion.query(`DELETE FROM ?? WHERE id = ?`, [tabla, data.id], (error,result) =>{
            return error ? reject(error) : resolve(result)
        })
    })
}

function query(tabla,consulta){
    return new Promise((resolve,reject) =>{
        conexion.query(`SELECT * FROM ?? WHERE ?`, [tabla, consulta], (error,result) =>{
            return error ? reject(error) : resolve(result[0])
        })
    })
}

function customQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    conexion.query(sql, params, (error, result) => {
      return error ? reject(error) : resolve(result)
    })
  })
}


module.exports = {
    todos,
    uno,
    agregar,
    eliminar,
    query,
    editar,
    customQuery
}