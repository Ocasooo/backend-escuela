function err (mensaje,code){
    let e = new Error(mensaje)

    if(code){
        e.statusCpde = code
    }
    
    return e
}

module.exports ={
    err
}