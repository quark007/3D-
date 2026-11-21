/*
 * 零依赖静态服务器：把 changzheng/ 作为站点根目录。
 * 用法：node serve.cjs 8080   → http://localhost:8080/march-world/preview.html?3d=1
 * 必须从 changzheng 根提供服务：3D 代码里资源路径是 /assets/... 绝对路径。
 */
'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, 'changzheng');
const port = Number(process.argv[2] || process.env.PORT || 8080);
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.geojson': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json',
  '.bin': 'application/octet-stream', '.ktx2': 'image/ktx2', '.hdr': 'image/vnd.radiance',
  '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav'
};

http.createServer((req, res) => {
  let rel;
  try { rel = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).slice(1) || 'index.html'; }
  catch { res.writeHead(400); return res.end('bad request'); }
  let file = path.resolve(root, rel);
  if (!file.startsWith(root)) { res.writeHead(403); return res.end('forbidden'); }
  try {
    if (fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    const data = fs.readFileSync(file);
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 ' + rel);
  }
}).listen(port, '127.0.0.1', () => {
  console.log('长征星火 3D 交接包预览：http://localhost:' + port);
  console.log('  3D 行走场景  http://localhost:' + port + '/march-world/preview.html?3d=1');
  console.log('  人物样板     http://localhost:' + port + '/march-world/character-preview.html');
  console.log('  3D 场景画廊  http://localhost:' + port + '/world3d-gallery.html');
  console.log('  Ctrl+C 结束');
});
