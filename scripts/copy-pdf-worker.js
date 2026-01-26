const fs = require('fs');
const path = require('path');

const workerPath = path.join(__dirname, '../node_modules/pdfjs-dist/build/pdf.worker.min.mjs');
const destPath = path.join(__dirname, '../public/pdf.worker.min.mjs');

console.log(`Copying ${workerPath} to ${destPath}`);

fs.copyFileSync(workerPath, destPath);

console.log('PDF worker copied successfully!');
