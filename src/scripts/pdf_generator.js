const fs = require('fs');
const path = require('path');

/**
 * Genera un archivo PDF 1.4 válido y legible sin dependencias externas.
 * @param {string} relativePath - Ruta relativa desde backend-escuela, ej: 'uploads/guia_tableros.pdf'
 * @param {object} data - Contenido del documento
 */
function generarPDF(relativePath, data) {
  // Asegurar que se guarde tanto en backend-escuela/uploads como en backend-escuela/src/uploads
  const fullPathRoot = path.resolve(__dirname, '../../', relativePath);
  const fullPathSrc = path.resolve(__dirname, '../', relativePath);

  const dirRoot = path.dirname(fullPathRoot);
  const dirSrc = path.dirname(fullPathSrc);

  if (!fs.existsSync(dirRoot)) {
    fs.mkdirSync(dirRoot, { recursive: true });
  }
  if (!fs.existsSync(dirSrc)) {
    fs.mkdirSync(dirSrc, { recursive: true });
  }

  const {
    title = 'Documento Académico',
    course = 'Curso General',
    unit = 'Unidad 1',
    type = 'Material de Cátedra',
    paragraphs = [],
    items = []
  } = data;

  // Sanitizar texto para PDF (solo caracteres ASCII seguros para Helvetica)
  const clean = (str) => {
    if (!str) return '';
    return String(str)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Quitar tildes para compatibilidad estándar con Type1 Helvetica
      .replace(/[()\\]/g, ''); // Escapar paréntesis y backslash
  };

  let stream = 'BT\n';

  // Encabezado institucional
  stream += '/F2 10 Tf\n';
  stream += '50 750 Td\n';
  stream += '(INSTITUTO EDUCATIVO TECNICO - CAMPUS VIRTUAL) Tj\n';

  stream += '/F1 9 Tf\n';
  stream += '0 -14 Td\n';
  stream += '(Ciclo Lectivo 2024 | Departamento Academico y Formacion Profesional) Tj\n';

  // Línea separadora
  stream += '0 -12 Td\n';
  stream += '(_____________________________________________________________________________________) Tj\n';

  // Tipo de documento y Curso
  stream += '0 -26 Td\n';
  stream += '/F2 11 Tf\n';
  stream += '(CURSO: ' + clean(course).toUpperCase() + ') Tj\n';

  stream += '0 -16 Td\n';
  stream += '/F1 10 Tf\n';
  stream += '(' + clean(unit) + '  |  ' + clean(type) + ') Tj\n';

  // Título Principal
  stream += '0 -30 Td\n';
  stream += '/F2 16 Tf\n';
  stream += '(' + clean(title) + ') Tj\n';

  // Línea decorativa
  stream += '0 -15 Td\n';
  stream += '(--------------------------------------------------------------------------------------------------------------------------------) Tj\n';

  // Párrafos introductorios
  stream += '0 -25 Td\n';
  for (const p of paragraphs) {
    stream += '/F1 10 Tf\n';
    stream += '(' + clean(p) + ') Tj\n';
    stream += '0 -16 Td\n';
  }

  // Items / Consignas / Temario
  if (items && items.length > 0) {
    stream += '0 -10 Td\n';
    stream += '/F2 11 Tf\n';
    stream += '(CONTENIDOS Y CONSIGNAS A DESARROLLAR:) Tj\n';
    stream += '0 -18 Td\n';

    for (let i = 0; i < items.length; i++) {
      stream += '/F1 10 Tf\n';
      stream += '(' + (i + 1) + '. ' + clean(items[i]) + ') Tj\n';
      stream += '0 -16 Td\n';
    }
  }

  // Pie de página
  stream += '0 -35 Td\n';
  stream += '/F1 8 Tf\n';
  stream += '(Documento oficial generado por la catedra docente. Prohibida su reproduccion comercial.) Tj\n';

  stream += 'ET\n';

  const streamLength = Buffer.byteLength(stream, 'utf-8');

  const obj1 = '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n';
  const obj2 = '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n';
  const obj3 = '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>\nendobj\n';
  const obj4 = `4 0 obj\n<< /Length ${streamLength} >>\nstream\n${stream}endstream\nendobj\n`;
  const obj5 = '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n';
  const obj6 = '6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n';

  let offset = '%PDF-1.4\n'.length;
  const offsets = [0];

  offsets.push(offset); offset += obj1.length;
  offsets.push(offset); offset += obj2.length;
  offsets.push(offset); offset += obj3.length;
  offsets.push(offset); offset += obj4.length;
  offsets.push(offset); offset += obj5.length;
  offsets.push(offset); offset += obj6.length;

  let xref = 'xref\n0 7\n0000000000 65535 f \n';
  for (let i = 1; i <= 6; i++) {
    xref += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
  }

  const trailer = `trailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n${offset}\n%%EOF\n`;
  const pdfBuffer = Buffer.from('%PDF-1.4\n' + obj1 + obj2 + obj3 + obj4 + obj5 + obj6 + xref + trailer, 'utf-8');

  fs.writeFileSync(fullPathRoot, pdfBuffer);
  fs.writeFileSync(fullPathSrc, pdfBuffer);
  return fullPathSrc;
}

module.exports = { generarPDF };
