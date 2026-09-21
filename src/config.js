require('dotenv').config()

const isRemoteHost = Boolean(
  process.env.MYSQL_HOST &&
  process.env.MYSQL_HOST !== 'localhost' &&
  process.env.MYSQL_HOST !== '127.0.0.1'
)

const useSSL = process.env.MYSQL_SSL === 'true' ||
  (isRemoteHost && process.env.MYSQL_SSL !== 'false')

module.exports = {
  app: {
    port: process.env.PORT || 4000
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'clave_secreta_super_segura_efp31_2024'
  },
  mysql: {
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || '3306', 10),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DB || 'ejemplo',
    ssl: useSSL ? { rejectUnauthorized: false } : undefined,
    url: process.env.MYSQL_URL || process.env.DATABASE_URL || null
  },
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:4321'
}