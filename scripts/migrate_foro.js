const db = require('../src/DB/mysql.js');

async function migrate() {
  try {
    const colsForo = await db.customQuery('DESCRIBE foro');
    const colNames = colsForo.map(c => c.Field);
    if (!colNames.includes('imagen_url')) {
      await db.customQuery('ALTER TABLE foro ADD COLUMN imagen_url VARCHAR(500) NULL');
      console.log('Columna imagen_url agregada a foro');
    }
    if (!colNames.includes('enlace_url')) {
      await db.customQuery('ALTER TABLE foro ADD COLUMN enlace_url VARCHAR(500) NULL');
      console.log('Columna enlace_url agregada a foro');
    }
    if (!colNames.includes('editado')) {
      await db.customQuery('ALTER TABLE foro ADD COLUMN editado TINYINT DEFAULT 0');
      console.log('Columna editado agregada a foro');
    }

    await db.customQuery(`
      CREATE TABLE IF NOT EXISTS foro_respuesta (
        id INT AUTO_INCREMENT PRIMARY KEY,
        foro_id INT NOT NULL,
        parent_id INT NULL,
        alumno_id INT NULL,
        personal_id INT NULL,
        contenido TEXT NOT NULL,
        imagen_url VARCHAR(500) NULL,
        enlace_url VARCHAR(500) NULL,
        editado TINYINT DEFAULT 0,
        fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_fr_foro (foro_id),
        INDEX idx_fr_parent (parent_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('Tabla foro_respuesta creada o verificada');

    console.log('MIGRACIÓN DE FORO COMPLETADA CON ÉXITO');
    process.exit(0);
  } catch (err) {
    console.error('Error migrando foro:', err);
    process.exit(1);
  }
}

migrate();
