const mysql = require('mysql')
const config = require('../config.js')

const dbConfig = {
    host : config.mysql.host,
    user : config.mysql.user,
    password : config.mysql.password,
    database : config.mysql.database
}

let conexion;

function conMysql(){
    conexion = mysql.createConnection(dbConfig)
    conexion.connect((err) =>{
        if(err){
            console.log('db error:',err)
            setTimeout(conMysql,200)
        }
        else{
            console.log('base de datos conectada')
        }
    })
    conexion.on('error',err =>{
        console.log('db error:',err)
        if(err.code === 'PROTOCOL_CONNECTION_LOST'){
            conMysql()
        }
        else{
            throw err
        }
    })
}

conMysql()

function todos(tabla){//function para traer todos los datos de la tabla
    return new Promise((resolve,reject) =>{
        conexion.query(`SELECT * FROM ${tabla}`, (error,result) =>{
            return error ? reject(error) : resolve(result)
        })
    })
}

function uno(tabla,id){//function para traer un dato de la tabla
    return new Promise((resolve,reject) =>{
        conexion.query(`SELECT * FROM ${tabla} WHERE id=${id}`, (error,result) =>{
            return error ? reject(error) : resolve(result)
        })
    })
}

// function agregar(tabla,data){//function para eliminar un dato de la tabla
//     return new Promise((resolve,reject) =>{
//         conexion.query(`INSERT INTO ${tabla} SET ? ON DUPLICATE KEY UPDATE ?`,[data,data], (error,result) =>{
//             return error ? reject(error) : resolve(result)
//         })
//     })
// }

function agregar(tabla, data){
  // INSERT normal, sin ON DUPLICATE KEY UPDATE para evitar actualización automática
  return new Promise((resolve, reject) =>{
    conexion.query(`INSERT INTO ${tabla} SET ?`, data, (error, result) =>{
      return error ? reject(error) : resolve(result);
    });
  });
}

function editar(tabla, id, data){
  return new Promise((resolve, reject) =>{
    conexion.query(`UPDATE ${tabla} SET ? WHERE id = ?`, [data, id], (error, result) =>{
      return error ? reject(error) : resolve(result);
    });
  });
}

function eliminar(tabla,data){//function para eliminar un dato de la tabla
    return new Promise((resolve,reject) =>{
        conexion.query(`DELETE FROM ${tabla} WHERE id = ?`,data.id, (error,result) =>{
            return error ? reject(error) : resolve(result)
        })
    })
}

function query(tabla,consulta){//function para eliminar un dato de la tabla
    return new Promise((resolve,reject) =>{
        conexion.query(`SELECT * FROM ${tabla} WHERE ?`,consulta, (error,result) =>{
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