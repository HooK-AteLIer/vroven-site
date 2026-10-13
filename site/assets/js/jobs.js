/* ВРОВЕНЬ: страница вакансий. Карточки собираются из VROVEN.data.jobs. */
(function () {
  'use strict';
  var V = window.VROVEN || {};
  var data = V.data;
  var host = document.getElementById('jobs-list');
  if (!host || !data || !data.jobs) return;

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  // Значение из data.js: строка или { text, placeholder }.
  function fact(tag, item) {
    var n = el(tag, null, item && item.text != null ? item.text : String(item));
    if (item && item.placeholder) n.classList.add('is-placeholder');
    return n;
  }

  function icon(path) {
    var s = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="' + path + '"/></svg>';
    return s;
  }
  var PHONE = 'M5 3.5h3.2l1.6 4.2-2.1 1.4a11 11 0 0 0 7.2 7.2l1.4-2.1 4.2 1.6V19a1.6 1.6 0 0 1-1.7 1.6A16.6 16.6 0 0 1 3.4 5.2 1.6 1.6 0 0 1 5 3.5Z';
  var CHAT = 'M4 20l1.2-3.9A8.2 8.2 0 1 1 8 18.9L4 20Z';

  // Фото к вакансии по id из data.js: кадр 4:3, 720 и 400 px.
  var PHOTOS = {
    painter: 'Штукатур выравнивает стену шпателем по зелёной линии лазерного уровня, за ним рабочий несёт ведро к окну',
    tiler: 'Плиточник на коленях выставляет уровень на уложенной плитке, рядом клей под гребёнку и лазерный нивелир',
    laborer: 'Инструмент на деревянном верстаке: шпатели, валик, строительный уровень, рулетка и рабочие перчатки'
  };

  function photo(id) {
    var img = document.createElement('img');
    var base = 'assets/img/jobs/job-' + id;
    img.className = 'job-card__photo';
    img.src = base + '.webp';
    img.srcset = base + '-sm.webp 400w, ' + base + '.webp 720w';
    img.sizes = '(min-width: 1000px) 31vw, calc(100vw - 32px)';
    img.width = 720; img.height = 540;
    img.loading = 'lazy';
    img.decoding = 'async';
    img.alt = PHOTOS[id];
    return img;
  }

  function card(job) {
    var c = el('article', 'card job-card');
    c.id = 'job-' + job.id;
    if (PHOTOS[job.id]) c.appendChild(photo(job.id));
    c.appendChild(el('p', 'eyebrow', 'Требуется'));
    c.appendChild(el('h2', 'job-card__title', job.title));
    if (job.duties) c.appendChild(el('p', 'job-card__duties', job.duties));

    var dl = el('dl', 'job-card__facts');
    function row(label, content) {
      var wrap = el('div', 'job-card__row');
      wrap.appendChild(el('dt', null, label));
      var dd = el('dd');
      if (Array.isArray(content)) {
        var ul = el('ul', 'job-card__list');
        content.forEach(function (it) { ul.appendChild(fact('li', it)); });
        dd.appendChild(ul);
      } else {
        dd.appendChild(fact('span', content));
      }
      wrap.appendChild(dd);
      dl.appendChild(wrap);
    }
    row('Оплата', job.pay);
    row('График', job.schedule);
    if (job.perks && job.perks.length) row('Что даём', job.perks);
    if (job.requirements && job.requirements.length) row('Что нужно', job.requirements);
    c.appendChild(dl);

    var btns = el('div', 'btn-row job-card__btns');
    var call = el('a', 'btn btn--ghost');
    call.setAttribute('data-tel', '');
    call.href = '#';
    call.innerHTML = icon(PHONE) + 'Позвонить';
    var wa = el('a', 'btn');
    wa.setAttribute('data-lead', 'job');
    wa.setAttribute('data-lead-payload', JSON.stringify({ position: job.title }));
    wa.href = '#';
    wa.innerHTML = icon(CHAT) + 'Откликнуться в WhatsApp';
    btns.appendChild(call); btns.appendChild(wa);
    c.appendChild(btns);
    return c;
  }

  var layout = el('div', 'container jobs');

  // Плашка звонка: подпись, номер и кнопка.
  var callBox = el('aside', 'card jobs__call');
  callBox.setAttribute('aria-label', 'Позвонить по вакансиям');
  var callText = el('div', 'jobs__call-text');
  callText.appendChild(el('span', 'jobs__call-cap', 'Звоните прямо сейчас'));
  var big = el('a', 'jobs__phone');
  big.setAttribute('data-phone', '');
  big.href = '#';
  callText.appendChild(big);
  callBox.appendChild(callText);
  var callBtn = el('a', 'btn jobs__call-btn');
  callBtn.setAttribute('data-tel', '');
  callBtn.href = '#';
  callBtn.innerHTML = icon(PHONE) + 'Позвонить';
  callBox.appendChild(callBtn);

  var list = el('div', 'jobs__cards');
  data.jobs.forEach(function (j) { list.appendChild(card(j)); });

  var note = el('p', 'jobs__note', 'Условия обсуждаем по телефону или в WhatsApp. Работаем в Тюмени и Нижневартовске.');

  layout.appendChild(callBox);
  layout.appendChild(list);
  layout.appendChild(note);
  host.appendChild(layout);

  // core.js уже отработал на DOMContentLoaded: подставим телефон и ссылки новым элементам.
  if (V.refreshLeads) V.refreshLeads();
  if (V.lead) {
    host.querySelectorAll('a[data-tel]').forEach(function (a) {
      a.href = V.lead.telUrl();
      a.setAttribute('aria-label', 'Позвонить ' + data.phone.display);
    });
    host.querySelectorAll('[data-phone]').forEach(function (a) {
      a.textContent = data.phone.display;
      a.href = V.lead.telUrl();
    });
  }
})();
