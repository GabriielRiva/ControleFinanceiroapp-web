import * as pdfjsLib from 'pdfjs-dist';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

// Extrai o texto de todas as páginas de um PDF (File do <input type="file">).
//
// pdf.js entrega o texto em pequenos "itens" — cada item tem um `hasEOL`
// indicando se ali termina a linha visual do PDF. Só quebramos linha quando
// hasEOL é true, preservando a linha visual real do documento (quebrar em
// todo item bagunça tabelas: "31/10 SALDO DO DIA 178,72C" viraria 5 linhas soltas).
export async function extractPdfText(file) {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    for (const item of content.items) {
      fullText += item.str;
      if (item.hasEOL) fullText += '\n';
    }
  }
  return fullText;
}
