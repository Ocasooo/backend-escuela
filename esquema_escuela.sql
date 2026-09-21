-- Esquema de la base de datos "escuela" reconstruido a partir del codigo backend
CREATE DATABASE IF NOT EXISTS escuela CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE escuela;

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS alumno_material;
DROP TABLE IF EXISTS curso_has_personal;
DROP TABLE IF EXISTS curso_has_alumno;
DROP TABLE IF EXISTS curso_asignacion;
DROP TABLE IF EXISTS aula_horario;
DROP TABLE IF EXISTS examen;
DROP TABLE IF EXISTS foro;
DROP TABLE IF EXISTS mensaje;
DROP TABLE IF EXISTS material;
DROP TABLE IF EXISTS unidades;
DROP TABLE IF EXISTS curso_html;
DROP TABLE IF EXISTS horario;
DROP TABLE IF EXISTS aula;
DROP TABLE IF EXISTS curso;
DROP TABLE IF EXISTS alumno;
DROP TABLE IF EXISTS personal;

CREATE TABLE personal (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ocupacion VARCHAR(50) NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  apellido VARCHAR(100) NOT NULL,
  contrasena VARCHAR(60) NOT NULL,
  fecha_nacimiento DATE NOT NULL,
  correo VARCHAR(150) NOT NULL UNIQUE,
  dni INT NOT NULL UNIQUE,
  telefono VARCHAR(50) NULL,
  imagen VARCHAR(255) NULL
) ENGINE=InnoDB;

CREATE TABLE alumno (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  apellido VARCHAR(100) NOT NULL,
  contrasena VARCHAR(60) NOT NULL,
  fecha_nacimiento DATE NULL,
  correo VARCHAR(150) NOT NULL UNIQUE,
  dni INT NOT NULL UNIQUE,
  domicilio VARCHAR(255) NULL,
  nacionalidad VARCHAR(100) NULL,
  nivel_estudio VARCHAR(100) NULL,
  estado_civil VARCHAR(50) NULL,
  telefono VARCHAR(50) NULL,
  ocupacion VARCHAR(50) NULL,
  programa_social VARCHAR(100) NULL,
  discapacidad VARCHAR(100) NULL,
  imagen VARCHAR(255) NULL
) ENGINE=InnoDB;

CREATE TABLE curso (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  descripcion TEXT NULL
) ENGINE=InnoDB;

CREATE TABLE curso_has_personal (
  personal_id INT NOT NULL,
  curso_id INT NOT NULL,
  PRIMARY KEY (personal_id, curso_id),
  CONSTRAINT fk_chp_personal FOREIGN KEY (personal_id) REFERENCES personal(id) ON DELETE CASCADE,
  CONSTRAINT fk_chp_curso FOREIGN KEY (curso_id) REFERENCES curso(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE curso_has_alumno (
  alumno_id INT NOT NULL,
  curso_id INT NOT NULL,
  anio INT NOT NULL,
  estado_terminacion VARCHAR(50) NOT NULL DEFAULT 'cursando',
  estado VARCHAR(50) NULL DEFAULT 'cursando',
  nota DECIMAL(5,2) NULL,
  PRIMARY KEY (alumno_id, curso_id, anio),
  CONSTRAINT fk_cha_alumno FOREIGN KEY (alumno_id) REFERENCES alumno(id) ON DELETE CASCADE,
  CONSTRAINT fk_cha_curso FOREIGN KEY (curso_id) REFERENCES curso(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE aula (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE horario (
  id INT AUTO_INCREMENT PRIMARY KEY,
  dia VARCHAR(20) NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL
) ENGINE=InnoDB;

CREATE TABLE aula_horario (
  aula_id INT NOT NULL,
  horario_id INT NOT NULL,
  PRIMARY KEY (aula_id, horario_id),
  CONSTRAINT fk_ah_aula FOREIGN KEY (aula_id) REFERENCES aula(id) ON DELETE CASCADE,
  CONSTRAINT fk_ah_horario FOREIGN KEY (horario_id) REFERENCES horario(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE curso_asignacion (
  curso_id INT NOT NULL,
  aula_id INT NOT NULL,
  horario_id INT NOT NULL,
  PRIMARY KEY (curso_id, aula_id, horario_id),
  CONSTRAINT fk_ca_curso FOREIGN KEY (curso_id) REFERENCES curso(id) ON DELETE CASCADE,
  CONSTRAINT fk_ca_aula FOREIGN KEY (aula_id) REFERENCES aula(id) ON DELETE CASCADE,
  CONSTRAINT fk_ca_horario FOREIGN KEY (horario_id) REFERENCES horario(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE curso_html (
  id INT AUTO_INCREMENT PRIMARY KEY,
  titulo VARCHAR(255) NULL,
  contenido LONGTEXT NULL,
  fecha_creacion DATETIME NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE examen (
  id INT AUTO_INCREMENT PRIMARY KEY,
  alumno_id INT NULL,
  curso_id INT NULL,
  fecha DATE NULL,
  hora_inicio TIME NULL,
  hora_fin TIME NULL,
  duracion_minutos INT NULL DEFAULT 45,
  descripcion TEXT NULL,
  estado VARCHAR(50) NULL,
  preguntas LONGTEXT NULL,
  unidad_id INT NULL,
  CONSTRAINT fk_ex_alumno FOREIGN KEY (alumno_id) REFERENCES alumno(id) ON DELETE SET NULL,
  CONSTRAINT fk_ex_curso FOREIGN KEY (curso_id) REFERENCES curso(id) ON DELETE SET NULL,
  CONSTRAINT fk_ex_unidad FOREIGN KEY (unidad_id) REFERENCES unidades(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE foro (
  id INT AUTO_INCREMENT PRIMARY KEY,
  curso_id INT NULL,
  alumno_id INT NULL,
  personal_id INT NULL,
  titulo VARCHAR(255) NULL,
  contenido TEXT NULL,
  imagen_url VARCHAR(500) NULL,
  enlace_url VARCHAR(500) NULL,
  editado TINYINT DEFAULT 0,
  fecha_creacion DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_fo_curso FOREIGN KEY (curso_id) REFERENCES curso(id) ON DELETE CASCADE,
  CONSTRAINT fk_fo_alumno FOREIGN KEY (alumno_id) REFERENCES alumno(id) ON DELETE SET NULL,
  CONSTRAINT fk_fo_personal FOREIGN KEY (personal_id) REFERENCES personal(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE foro_respuesta (
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
  CONSTRAINT fk_fr_foro FOREIGN KEY (foro_id) REFERENCES foro(id) ON DELETE CASCADE,
  CONSTRAINT fk_fr_parent FOREIGN KEY (parent_id) REFERENCES foro_respuesta(id) ON DELETE CASCADE,
  CONSTRAINT fk_fr_alumno FOREIGN KEY (alumno_id) REFERENCES alumno(id) ON DELETE SET NULL,
  CONSTRAINT fk_fr_personal FOREIGN KEY (personal_id) REFERENCES personal(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE mensaje (
  id INT AUTO_INCREMENT PRIMARY KEY,
  asunto VARCHAR(255) NULL,
  contenido TEXT NULL,
  alumno_id INT NULL,
  personal_id INT NULL,
  curso_id INT NULL,
  fecha_creacion DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ms_alumno FOREIGN KEY (alumno_id) REFERENCES alumno(id) ON DELETE SET NULL,
  CONSTRAINT fk_ms_personal FOREIGN KEY (personal_id) REFERENCES personal(id) ON DELETE SET NULL,
  CONSTRAINT fk_ms_curso FOREIGN KEY (curso_id) REFERENCES curso(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE unidades (
  id INT AUTO_INCREMENT PRIMARY KEY,
  curso_id INT NULL,
  nombre VARCHAR(255) NULL,
  descripcion TEXT NULL,
  orden INT NULL,
  CONSTRAINT fk_un_curso FOREIGN KEY (curso_id) REFERENCES curso(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE material (
  id INT AUTO_INCREMENT PRIMARY KEY,
  observacion TEXT NULL,
  carpeta VARCHAR(255) NULL,
  archivo_scan VARCHAR(255) NULL,
  fecha_subida DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_limite DATETIME NULL,
  curso_id INT NULL,
  unidad_id INT NULL,
  estado VARCHAR(50) NULL DEFAULT 'enviado',
  calificacion VARCHAR(255) NULL DEFAULT '----',
  tipo VARCHAR(50) NULL,
  mensaje_id INT NULL,
  CONSTRAINT fk_ma_curso FOREIGN KEY (curso_id) REFERENCES curso(id) ON DELETE SET NULL,
  CONSTRAINT fk_ma_unidad FOREIGN KEY (unidad_id) REFERENCES unidades(id) ON DELETE SET NULL,
  CONSTRAINT fk_ma_mensaje FOREIGN KEY (mensaje_id) REFERENCES mensaje(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE alumno_material (
  alumno_id INT NOT NULL,
  material_id INT NOT NULL,
  PRIMARY KEY (alumno_id, material_id),
  CONSTRAINT fk_am_alumno FOREIGN KEY (alumno_id) REFERENCES alumno(id) ON DELETE CASCADE,
  CONSTRAINT fk_am_material FOREIGN KEY (material_id) REFERENCES material(id) ON DELETE CASCADE
) ENGINE=InnoDB;


SET FOREIGN_KEY_CHECKS = 1;