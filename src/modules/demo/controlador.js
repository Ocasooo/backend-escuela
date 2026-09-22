const { seedDatabase } = require('../../scripts/seed_database.js')

let ultimoReset = Date.now()
let ejecutandoReset = false

const COOLDOWN_MS = 2 * 60 * 1000 // 2 minutos entre reinicios manuales
const INTERVALO_AUTO_RESET_MS = 60 * 60 * 1000 // 60 minutos

async function resetDemo(req, res) {
  if (ejecutandoReset) {
    return res.status(409).json({
      error: true,
      status: 409,
      body: 'Ya hay una restauración de la demo en curso, por favor aguarda unos segundos.'
    })
  }

  const tiempoTranscurrido = Date.now() - ultimoReset
  if (tiempoTranscurrido < COOLDOWN_MS) {
    const segundosRestantes = Math.ceil((COOLDOWN_MS - tiempoTranscurrido) / 1000)
    return res.status(429).json({
      error: true,
      status: 429,
      body: `Protección anti-spam: Debes esperar ${segundosRestantes} segundos antes de solicitar otro reinicio manual.`
    })
  }

  try {
    ejecutandoReset = true
    console.log(`\n🔄 [Demo]: Iniciando reinicio manual solicitado desde la web...`)
    await seedDatabase(false)
    ultimoReset = Date.now()
    ejecutandoReset = false

    console.log(`✅ [Demo]: Reinicio manual completado con éxito.`)
    res.json({
      error: false,
      status: 200,
      body: '¡Demo reiniciada con éxito! Todos los datos y archivos volvieron a su estado inicial.'
    })
  } catch (error) {
    ejecutandoReset = false
    console.error(`❌ [Demo Error]: Falló el reinicio manual:`, error)
    res.status(500).json({
      error: true,
      status: 500,
      body: 'Ocurrió un error al restaurar la base de datos de prueba: ' + error.message
    })
  }
}

function estadoDemo(req, res) {
  const tiempoTranscurrido = Date.now() - ultimoReset
  const msHastaSiguiente = Math.max(0, INTERVALO_AUTO_RESET_MS - (tiempoTranscurrido % INTERVALO_AUTO_RESET_MS))
  const minutosRestantes = Math.ceil(msHastaSiguiente / 60000)
  const segundosCooldown = Math.max(0, Math.ceil((COOLDOWN_MS - tiempoTranscurrido) / 1000))

  res.json({
    error: false,
    status: 200,
    body: {
      modoDemo: true,
      minutosRestantesAutoReset: minutosRestantes,
      segundosCooldownManual: segundosCooldown,
      ultimoReset: new Date(ultimoReset).toISOString()
    }
  })
}

function iniciarAutoResetTimer() {
  console.log(`⏱️ [Demo Timer]: Auto-reset programado cada 60 minutos activado.`)
  setInterval(async () => {
    if (ejecutandoReset) return
    try {
      ejecutandoReset = true
      console.log(`\n⏰ [Demo Auto-Reset]: Ejecutando reseteo programado de 1 hora...`)
      await seedDatabase(false)
      ultimoReset = Date.now()
      ejecutandoReset = false
      console.log(`✅ [Demo Auto-Reset]: Base de datos y archivos restaurados exitosamente al estado base.`)
    } catch (err) {
      ejecutandoReset = false
      console.error(`❌ [Demo Auto-Reset Error]:`, err)
    }
  }, INTERVALO_AUTO_RESET_MS)
}

module.exports = {
  resetDemo,
  estadoDemo,
  iniciarAutoResetTimer
}
