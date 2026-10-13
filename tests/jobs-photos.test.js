// T27: у каждой вакансии своё фото, плаката вакансий больше нет.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const SITE = path.join(__dirname, '..', 'site');
const read = (rel) => fs.readFileSync(path.join(SITE, rel), 'utf8');
const data = require('../site/assets/js/data.js');

test('плаката вакансий нет ни в разметке, ни в файлах', () => {
  for (const rel of ['index.html', 'jobs.html', 'assets/js/jobs.js', 'assets/css/index.css', 'assets/css/jobs.css']) {
    assert.doesNotMatch(read(rel), /vakansii-poster|jobs-teaser__poster|jobs__poster/, rel);
  }
  assert.ok(!fs.existsSync(path.join(SITE, 'assets/img/index/vakansii-poster.webp')));
  assert.ok(!fs.existsSync(path.join(SITE, 'assets/img/jobs/vakansii-poster.webp')));
});

test('у каждой вакансии фото 720 и 400 на главной и в jobs.js', () => {
  const index = read('index.html');
  const js = read('assets/js/jobs.js');
  for (const job of data.jobs) {
    for (const f of ['job-' + job.id + '.webp', 'job-' + job.id + '-sm.webp']) {
      assert.ok(fs.existsSync(path.join(SITE, 'assets/img/jobs', f)), f);
    }
    assert.ok(index.includes('job-' + job.id + '-sm.webp 400w, assets/img/jobs/job-' + job.id + '.webp 720w'), 'srcset ' + job.id);
    assert.match(js, new RegExp('\\s' + job.id + ": '[^']{20,}'"), 'alt для ' + job.id);
  }
  const imgs = index.match(/<img class="job-card__photo"[^>]*>/g) || [];
  assert.equal(imgs.length, data.jobs.length);
  for (const tag of imgs) {
    assert.match(tag, /loading="lazy"/);
    assert.match(tag, /alt="[^"]{20,}"/);
  }
});

test('звонок по вакансиям остаётся на главной и на странице вакансий', () => {
  assert.match(read('index.html'), /class="jobs-teaser__call[\s\S]*?data-phone[\s\S]*?data-tel[^>]*>Позвонить</);
  const js = read('assets/js/jobs.js');
  assert.match(js, /Звоните прямо сейчас/);
  assert.match(js, /jobs__call-btn/);
});
