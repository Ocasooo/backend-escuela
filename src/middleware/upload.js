// src/middleware/upload.js
const multer = require('multer')
const path = require('path')

const storage = multer.memoryStorage()

const ALLOWED_EXTENSIONS = new Set([
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.txt', '.zip', '.rar', '.jpg', '.jpeg', '.png', '.webp'
])

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase()
  if (ALLOWED_EXTENSIONS.has(ext)) {
    cb(null, true)
  } else {
    cb(new Error(`Tipo de archivo no permitido (${ext}). Solo se permiten documentos, imágenes y archivos comprimidos.`))
  }
}

const upload = multer({
  storage,
  limits: {
    fileSize: 15 * 1024 * 1024 // 15 MB máximo
  },
  fileFilter
})

module.exports = upload
