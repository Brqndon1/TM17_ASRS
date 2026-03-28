const fs = require('fs');
const path = require('path');
const marked = require('marked');
const puppeteer = require('puppeteer');

(async () => {
  try {
    const mdPath = path.join(process.cwd(), 'docs', 'audit-report.md');
    const md = fs.readFileSync(mdPath, 'utf8');
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>ASRS Audit Report</title><style>
      body{font-family: Arial, Helvetica, sans-serif; padding:36px; color:#222}
      pre{background:#f8f8f8;padding:12px;border-radius:6px;overflow:auto}
      code{background:#f1f1f1;padding:2px 4px;border-radius:4px}
      h1,h2,h3{color:#111}
      table{border-collapse:collapse}
      th,td{padding:6px;border:1px solid #ddd}
    </style></head><body>${marked(md)}</body></html>`;

    const htmlPath = path.join(process.cwd(), 'docs', 'audit-report.html');
    fs.writeFileSync(htmlPath, html, 'utf8');

    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdfPath = path.join(process.cwd(), 'docs', 'audit-report.pdf');
    await page.pdf({ path: pdfPath, format: 'A4', printBackground: true, margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' } });

    await browser.close();
    console.log('PDF created at', pdfPath);
  } catch (err) {
    console.error('Failed to create PDF:', err);
    process.exit(1);
  }
})();
