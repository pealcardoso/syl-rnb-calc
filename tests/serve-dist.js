const http = require('http');
const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist');
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
};

http.createServer((req, res) => {
  let urlPath = req.url.split('?')[0];
  if (urlPath === '/') urlPath = '/roundsim.html';
  const filePath = path.join(distDir, urlPath);
  console.log(`${req.method} ${urlPath}`);
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(8080, () => console.log('Serving dist on http://localhost:8080'));
