const express = require('express')
const { resetDemo, estadoDemo } = require('./controlador.js')

const router = express.Router()

router.post('/reset', resetDemo)
router.post('/', resetDemo)
router.get('/estado', estadoDemo)
router.get('/', estadoDemo)

module.exports = router
