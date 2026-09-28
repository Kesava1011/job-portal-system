/**
 * pdfGenerator.js
 * Generates standards-compliant, beautifully formatted PDF 1.4 documents from text or resume data
 * without any external binary dependencies. Compatible with all browser PDF viewers (Chromium PDFium,
 * Firefox PDF.js, Safari WebKit PDF, and Adobe Acrobat).
 */

const fs = require('fs');
const path = require('path');

function escapePdfString(str) {
  if (!str) return '';
  return str
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function wrapText(text, maxCharsPerLine = 80) {
  if (!text || text.length <= maxCharsPerLine) {
    return [text];
  }
  const words = text.split(/\s+/);
  const result = [];
  let currentLine = '';

  for (const word of words) {
    if (!currentLine) {
      currentLine = word;
    } else if ((currentLine + ' ' + word).length <= maxCharsPerLine) {
      currentLine += ' ' + word;
    } else {
      result.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) {
    result.push(currentLine);
  }
  return result;
}

/**
 * Creates a valid PDF 1.4 Buffer from plain text lines.
 */
function createPdfFromText(rawText) {
  const rawLines = (rawText || '').split(/\r?\n/);
  
  // PDF Page parameters (Letter: 612 x 792 pt, 0.5 in margins)
  const pageWidth = 612;
  const pageHeight = 792;
  const marginX = 45;
  const marginTop = 45;
  const marginBottom = 45;
  const printableWidth = pageWidth - (marginX * 2); // 522 pt

  // Process and wrap lines
  const formattedItems = [];

  for (let i = 0; i < rawLines.length; i++) {
    const rawLine = rawLines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      formattedItems.push({ type: 'space', height: 8 });
      continue;
    }

    // Skip horizontal divider lines like "=====" or "-----"
    if (/^[=-]{4,}$/.test(trimmed)) {
      formattedItems.push({ type: 'divider', height: 10 });
      continue;
    }

    // First line or name line: "Sample Resume for Alex Johnson" or "Alex Johnson"
    const isDocTitle = i === 0 && !trimmed.includes(':');
    const isHeader = /^[A-Z\s&]{3,}:?$|^[A-Z][a-zA-Z\s&]{2,}:$/.test(trimmed) && trimmed.length < 40;
    const isSubHeader = i === 1 && !trimmed.includes(':') && trimmed.length < 80;

    if (isDocTitle) {
      formattedItems.push({
        type: 'title',
        text: trimmed.replace(/^Sample Resume for\s*/i, '').trim() || trimmed,
        fontSize: 18,
        fontKey: '/F2',
        lineHeight: 24,
      });
      formattedItems.push({ type: 'space', height: 4 });
    } else if (isSubHeader) {
      formattedItems.push({
        type: 'subtitle',
        text: trimmed,
        fontSize: 11,
        fontKey: '/F1',
        lineHeight: 16,
      });
      formattedItems.push({ type: 'space', height: 4 });
    } else if (isHeader) {
      formattedItems.push({ type: 'space', height: 6 });
      formattedItems.push({
        type: 'heading',
        text: trimmed.toUpperCase(),
        fontSize: 12,
        fontKey: '/F2',
        lineHeight: 18,
      });
      formattedItems.push({ type: 'line', height: 4 });
    } else {
      // Body line (bullet point or paragraph)
      const isBullet = trimmed.startsWith('-') || trimmed.startsWith('•') || trimmed.startsWith('*');
      const maxChars = isBullet ? 78 : 82;
      const wrapped = wrapText(trimmed, maxChars);

      for (let w = 0; w < wrapped.length; w++) {
        formattedItems.push({
          type: 'body',
          text: wrapped[w],
          fontSize: 9.5,
          fontKey: isBullet && w === 0 && wrapped[w].startsWith('- ') ? '/F1' : '/F1',
          lineHeight: 14,
          indent: isBullet && w > 0 ? 12 : 0,
        });
      }
    }
  }

  // Paginate items
  const pages = [];
  let currentPage = [];
  let currentY = pageHeight - marginTop;

  for (const item of formattedItems) {
    const itemHeight = item.lineHeight || item.height || 14;

    if (currentY - itemHeight < marginBottom && currentPage.length > 0) {
      pages.push(currentPage);
      currentPage = [];
      currentY = pageHeight - marginTop;
    }

    currentPage.push(item);
    currentY -= itemHeight;
  }

  if (currentPage.length > 0 || pages.length === 0) {
    pages.push(currentPage);
  }

  // Generate PDF Structure
  const totalPages = pages.length;
  const fontNormId = 3 + totalPages;
  const fontBoldId = 4 + totalPages;
  const firstContentId = 5 + totalPages;

  let pdf = '%PDF-1.4\n';
  const offsets = [];

  function writeObj(objNum, body) {
    offsets[objNum] = Buffer.byteLength(pdf, 'utf8');
    pdf += `${objNum} 0 obj\n${body}\nendobj\n`;
  }

  // 1. Catalog
  writeObj(1, '<< /Type /Catalog /Pages 2 0 R >>');

  // 2. Pages list
  const kids = [];
  for (let p = 0; p < totalPages; p++) {
    kids.push(`${3 + p} 0 R`);
  }
  writeObj(2, `<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${totalPages} >>`);

  // Fonts (Helvetica standard Type 1 fonts available in all PDF viewers)
  writeObj(fontNormId, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  writeObj(fontBoldId, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');

  // Page objects & Content streams
  for (let p = 0; p < totalPages; p++) {
    const pageObjId = 3 + p;
    const contentObjId = firstContentId + p;

    // Build Page Object
    writeObj(
      pageObjId,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${fontNormId} 0 R /F2 ${fontBoldId} 0 R >> >> /Contents ${contentObjId} 0 R >>`
    );

    // Build Content Stream
    const streamCommands = [];
    let curY = pageHeight - marginTop;

    for (const item of pages[p]) {
      if (item.type === 'space') {
        curY -= item.height;
        continue;
      }

      if (item.type === 'divider' || item.type === 'line') {
        // Draw subtle horizontal rule
        const lineY = curY - 2;
        streamCommands.push(`0.75 w`);
        streamCommands.push(`0.8 0.8 0.85 RG`); // subtle light slate stroke
        streamCommands.push(`${marginX} ${lineY} m ${marginX + printableWidth} ${lineY} l S`);
        curY -= item.height;
        continue;
      }

      // Text item
      const escaped = escapePdfString(item.text);
      const xPos = marginX + (item.indent || 0);

      streamCommands.push('BT');
      streamCommands.push(`${item.fontKey || '/F1'} ${item.fontSize || 9.5} Tf`);
      if (item.type === 'title') {
        streamCommands.push(`0.08 0.12 0.22 rg`); // Dark navy
      } else if (item.type === 'heading') {
        streamCommands.push(`0.12 0.24 0.54 rg`); // Slate blue
      } else if (item.type === 'subtitle') {
        streamCommands.push(`0.25 0.35 0.45 rg`); // Cool gray
      } else {
        streamCommands.push(`0.15 0.18 0.22 rg`); // Dark body text
      }
      streamCommands.push(`1 0 0 1 ${xPos} ${curY} Tm`);
      streamCommands.push(`(${escaped}) Tj`);
      streamCommands.push('ET');

      curY -= (item.lineHeight || 14);
    }

    const streamContent = streamCommands.join('\n');
    const streamLen = Buffer.byteLength(streamContent, 'utf8');

    writeObj(contentObjId, `<< /Length ${streamLen} >>\nstream\n${streamContent}\nendstream`);
  }

  // Cross-reference table
  const totalObjects = firstContentId + totalPages - 1;
  const startXref = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${totalObjects + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i <= totalObjects; i++) {
    const off = offsets[i] || 0;
    pdf += `${String(off).padStart(10, '0')} 00000 n \n`;
  }

  // Trailer
  pdf += `trailer\n<< /Size ${totalObjects + 1} /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF\n`;

  return Buffer.from(pdf, 'utf8');
}

/**
 * Checks if a file is a valid binary PDF (starts with %PDF-).
 * If not, converts its text into a compliant PDF buffer.
 */
function getValidPdfBuffer(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File does not exist: ${filePath}`);
  }

  const rawBuffer = fs.readFileSync(filePath);
  const isPdf = rawBuffer.length >= 5 && rawBuffer.slice(0, 5).toString('ascii') === '%PDF-';

  if (isPdf) {
    return rawBuffer;
  }

  // It's a text-based resume saved with .pdf extension
  const textContent = rawBuffer.toString('utf8');
  return createPdfFromText(textContent);
}

module.exports = {
  createPdfFromText,
  getValidPdfBuffer,
};
