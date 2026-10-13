#!/usr/bin/env node
/*
 * Предпросмотр сайта: статический сервер на Node без зависимостей.
 *   node tools/serve.js [порт=8130] [корень=site]
 * Зачем не python -m http.server: на Windows он время от времени рвёт соединения
 * (net::ERR_CONNECTION_RESET), и часть фото конструктора не догружалась.
 * Отдаёт файлы с правильным MIME, поддерживает Range (ролики mp4), не падает на обрыве клиента.
 */
'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.avif': 'image/avif',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.pdf': 'application/pdf',
  '.webmanifest': 'application/manifest+json'
};

function send(res, status, text) {
  if (res.headersSent) { res.destroy(); return; }
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' });
  res.end(text);
}

/* Путь запроса → файл внутри root или null (выход за корень, битая кодировка). */
function resolveFile(root, urlPath) {
  let rel;
  try { rel = decodeURIComponent(urlPath.split('?')[0].split('#')[0]); } catch (e) { return null; }
  if (rel.indexOf('\0') >= 0) return null;
  const file = path.resolve(root, '.' + path.posix.normalize('/' + rel.replace(/\\/g, '/')));
  if (file !== root && !file.startsWith(root + path.sep)) return null;
  return file;
}

/* Range: bytes=start-end → [start, end] или null, если диапазон неверный. */
function parseRange(header, size) {
  const m = /^bytes=(\d*)-(\d*)$/.exec(String(header).trim());
  if (!m || (m[1] === '' && m[2] === '')) return null;
  let start, end;
  if (m[1] === '') { start = Math.max(0, size - Number(m[2])); end = size - 1; }
  else { start = Number(m[1]); end = m[2] === '' ? size - 1 : Math.min(Number(m[2]), size - 1); }
  if (start > end || start >= size) return null;
  return [start, end];
}

function handle(root, req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.setHeader('Allow', 'GET, HEAD'); send(res, 405, 'Method Not Allowed'); return; }
  let file = resolveFile(root, req.url || '/');
  if (!file) { send(res, 400, 'Bad Request'); return; }
  fs.stat(file, (err, st) => {
    if (!err && st.isDirectory()) {
      if (!/\/$/.test((req.url || '/').split('?')[0])) {
        res.writeHead(301, { Location: (req.url || '/').split('?')[0] + '/' });
        res.end();
        return;
      }
      file = path.join(file, 'index.html');
      fs.stat(file, (err2, st2) => serveFile(err2, st2));
      return;
    }
    serveFile(err, st);
  });

  function serveFile(err, st) {
    if (err || !st.isFile()) { send(res, 404, 'Not Found'); return; }
    const headers = {
      'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-cache',
      'Last-Modified': st.mtime.toUTCString()
    };
    let status = 200, start = 0, end = st.size - 1;
    if (req.headers.range) {
      const r = parseRange(req.headers.range, st.size);
      if (!r) {
        res.writeHead(416, { 'Content-Range': 'bytes */' + st.size });
        res.end();
        return;
      }
      [start, end] = r;
      status = 206;
      headers['Content-Range'] = 'bytes ' + start + '-' + end + '/' + st.size;
    }
    headers['Content-Length'] = st.size === 0 ? 0 : end - start + 1;
    res.writeHead(status, headers);
    if (req.method === 'HEAD' || st.size === 0) { res.end(); return; }
    const stream = fs.createReadStream(file, { start, end });
    stream.on('error', () => res.destroy());
    res.on('close', () => stream.destroy());   // клиент ушёл посреди ответа — просто закрываем файл
    stream.pipe(res);
  }
}

function createServer(root) {
  const base = path.resolve(root);
  const server = http.createServer((req, res) => {
    req.on('error', () => {});
    res.on('error', () => {});
    try { handle(base, req, res); } catch (e) { send(res, 500, 'Internal Server Error'); }
  });
  server.keepAliveTimeout = 65000;
  server.on('clientError', (err, socket) => {
    if (socket.writable) socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
    else socket.destroy();
  });
  return server;
}

if (require.main === module) {
  const port = Number(process.argv[2]) || 8130;
  const root = path.resolve(process.argv[3] || path.join(__dirname, '..', 'site'));
  const server = createServer(root);
  server.on('error', (e) => { console.error('serve.js: ' + e.message); process.exit(1); });
  server.listen(port, () => console.log('ВРОВЕНЬ: http://localhost:' + port + '/ (корень ' + root + ')'));
}

module.exports = { createServer, resolveFile, parseRange, MIME };
