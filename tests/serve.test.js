'use strict';
// tools/serve.js — статический сервер предпросмотра: MIME, Range, 404, выход за корень.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');

const serve = require(path.join(__dirname, '..', 'tools', 'serve.js'));
const SITE = path.join(__dirname, '..', 'site');

test('serve.js: страницы, фото и ролик с правильным MIME, Range для mp4, 404', async () => {
  const server = serve.createServer(SITE);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + server.address().port;
  try {
    let res = await fetch(base + '/kitchen.html');
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /^text\/html/);
    await res.arrayBuffer();

    res = await fetch(base + '/assets/img/kitchens/loft--dark-oak.webp?r=1');
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('content-type'), 'image/webp');
    const size = fs.statSync(path.join(SITE, 'assets/img/kitchens/loft--dark-oak.webp')).size;
    assert.equal((await res.arrayBuffer()).byteLength, size);

    res = await fetch(base + '/assets/js/kitchen-accordion.js');
    assert.match(res.headers.get('content-type'), /javascript/);
    await res.arrayBuffer();

    const mp4 = fs.readdirSync(path.join(SITE, 'assets/video')).find((f) => f.endsWith('.mp4'));
    res = await fetch(base + '/assets/video/' + mp4, { headers: { Range: 'bytes=0-99' } });
    assert.equal(res.status, 206);
    assert.equal(res.headers.get('content-type'), 'video/mp4');
    assert.match(res.headers.get('content-range'), /^bytes 0-99\/\d+$/);
    assert.equal((await res.arrayBuffer()).byteLength, 100);

    res = await fetch(base + '/nope.webp');
    assert.equal(res.status, 404);
    await res.arrayBuffer();
    res = await fetch(base + '/..%2f..%2fpackage.json');
    assert.notEqual(res.status, 200);
    await res.arrayBuffer();
  } finally {
    await new Promise((r) => server.close(r));
  }
});
