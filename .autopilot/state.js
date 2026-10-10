window.STATE =
{
  "version": 2,
  "slug": "remont-mebel-site",
  "dir": "2026-10-10-remont-mebel-site--wip",
  "title": "Сайт: ремонт под ключ + корпусная мебель (Тюмень, Нижневартовск)",
  "mode": "semi",
  "depth": "normal",
  "tier": "T2",
  "briefFile": "2026-10-10-brief.md",
  "memoryFile": "AGENTS.md",
  "memoryOwner": "autopilot",
  "skillDir": "C:/Users/Anna Shatskih/.claude/skills/autopilot",
  "baseCommit": null,
  "startedAt": "2026-10-10T23:14:47+04:00",
  "updatedAt": "2026-10-10T23:37:07+04:00",
  "finishedAt": null,
  "stages": [
    {
      "id": "preflight",
      "status": "done",
      "startedAt": "2026-10-10T23:14:47+04:00",
      "finishedAt": "2026-10-10T23:14:57+04:00"
    },
    {
      "id": "manifest",
      "status": "done",
      "startedAt": "2026-10-10T23:14:57+04:00",
      "finishedAt": "2026-10-10T23:15:26+04:00"
    },
    {
      "id": "briefing",
      "status": "done",
      "startedAt": "2026-10-10T23:15:26+04:00",
      "finishedAt": "2026-10-10T23:25:02+04:00"
    },
    {
      "id": "spec",
      "status": "done",
      "startedAt": "2026-10-10T23:25:02+04:00",
      "finishedAt": "2026-10-10T23:34:28+04:00"
    },
    {
      "id": "plan",
      "status": "active",
      "startedAt": "2026-10-10T23:34:28+04:00"
    },
    {
      "id": "build",
      "status": "pending"
    },
    {
      "id": "review",
      "status": "pending"
    },
    {
      "id": "final",
      "status": "pending"
    }
  ],
  "requirements": {
    "total": 24,
    "done": 0,
    "inTicket": 24,
    "inSpec": 0,
    "placeholder": 0,
    "deferred": 0,
    "dropped": 0
  },
  "tickets": [
    {
      "id": "01",
      "title": "Каркас сайта: данные, шапка, город, заявка",
      "requirements": [
        "R08",
        "R19",
        "R20i",
        "R21i",
        "R23i"
      ],
      "blockedBy": [],
      "wave": 1,
      "zone": [
        "site/index.html",
        "site/kitchen.html",
        "site/lookbook.html",
        "site/jobs.html",
        "site/assets/js/data.js",
        "site/assets/js/core.js",
        "site/assets/js/lead.js",
        "site/assets/css/site.css",
        "tests/lead.test.js",
        ".claude/launch.json"
      ],
      "review": "да — фундамент",
      "model": "сильная",
      "status": "pending",
      "retries": 0,
      "repairs": 0
    },
    {
      "id": "02",
      "title": "Названия, логотип, визитка, бренд-доска",
      "requirements": [
        "R12",
        "R13",
        "R14",
        "R18"
      ],
      "blockedBy": [],
      "wave": 1,
      "zone": [
        "brand/",
        "docs/naming.md"
      ],
      "review": "нет",
      "model": "сильная",
      "status": "pending",
      "retries": 0,
      "repairs": 0
    },
    {
      "id": "03",
      "title": "Раскладка кухни по размерам",
      "requirements": [
        "R15"
      ],
      "blockedBy": [],
      "wave": 1,
      "zone": [
        "site/assets/js/kitchen-layout.js",
        "tests/kitchen-layout.test.js"
      ],
      "review": "да — фундамент",
      "model": "сильная",
      "status": "pending",
      "retries": 0,
      "repairs": 0
    },
    {
      "id": "04",
      "title": "Главная: услуги, комплект со скидкой, калькулятор, доверие",
      "requirements": [
        "R01",
        "R02",
        "R04",
        "R05",
        "R06",
        "R07",
        "R11",
        "R24i"
      ],
      "blockedBy": [
        "01"
      ],
      "wave": 2,
      "zone": [
        "site/index.html",
        "#hero",
        "site/assets/js/pricing.js",
        "site/assets/js/index.js",
        "site/assets/css/index.css",
        "tests/pricing.test.js"
      ],
      "review": "нет",
      "model": "сильная",
      "status": "pending",
      "retries": 0,
      "repairs": 0
    },
    {
      "id": "05",
      "title": "Конструктор кухни: стили, чертёж, цена, отправка замера",
      "requirements": [
        "R15",
        "R16",
        "R17"
      ],
      "blockedBy": [
        "01",
        "03"
      ],
      "wave": 2,
      "zone": [
        "site/kitchen.html",
        "site/assets/js/kitchen-styles.js",
        "site/assets/js/kitchen-render.js",
        "site/assets/js/kitchen-app.js",
        "site/assets/css/kitchen.css"
      ],
      "review": "нет",
      "model": "сильная",
      "status": "pending",
      "retries": 0,
      "repairs": 0
    },
    {
      "id": "06",
      "title": "Лукбук и вакансии",
      "requirements": [
        "R10",
        "R09"
      ],
      "blockedBy": [
        "01"
      ],
      "wave": 2,
      "zone": [
        "site/lookbook.html",
        "site/jobs.html",
        "site/assets/js/lookbook-data.js",
        "site/assets/js/lookbook.js",
        "site/assets/js/jobs.js",
        "site/assets/css/lookbook.css",
        "site/assets/css/jobs.css",
        "site/assets/img/lookbook/",
        "site/assets/img/jobs/"
      ],
      "review": "нет",
      "model": "обычная",
      "status": "pending",
      "retries": 0,
      "repairs": 0
    },
    {
      "id": "07",
      "title": "Кинематографичный герой и подготовка к публикации",
      "requirements": [
        "R03",
        "R22i",
        "R23i"
      ],
      "blockedBy": [
        "04",
        "05",
        "06"
      ],
      "wave": 3,
      "zone": [
        "site/index.html",
        "#hero",
        "site/assets/js/hero-scrub.js",
        "site/assets/css/hero.css",
        "site/assets/video/",
        "site/assets/img/hero/",
        "site/favicon.svg",
        "site/README.md"
      ],
      "review": "нет",
      "model": "сильная",
      "status": "pending",
      "retries": 0,
      "repairs": 0
    }
  ],
  "tests": null,
  "debt": {
    "placeholders": [],
    "assumptions": [
      "заявки уходят в WhatsApp на номер с плаката — наличие WhatsApp не подтверждено",
      "цены — ориентиры рынка из исследования с меткой «ориентир» до цен заказчика"
    ],
    "emptyEnv": []
  },
  "additions": [],
  "coverage": {
    "found": 3,
    "fixed": 3,
    "deferred": 0,
    "items": []
  },
  "concerns": [],
  "blind": null,
  "beats": [
    "2026-10-10T23:14:47+04:00",
    "2026-10-10T23:14:57+04:00",
    "2026-10-10T23:15:13+04:00",
    "2026-10-10T23:15:26+04:00",
    "2026-10-10T23:16:14+04:00",
    "2026-10-10T23:21:04+04:00",
    "2026-10-10T23:23:43+04:00",
    "2026-10-10T23:25:01+04:00",
    "2026-10-10T23:25:02+04:00",
    "2026-10-10T23:26:58+04:00",
    "2026-10-10T23:28:39+04:00",
    "2026-10-10T23:31:22+04:00",
    "2026-10-10T23:34:26+04:00",
    "2026-10-10T23:34:28+04:00",
    "2026-10-10T23:37:04+04:00",
    "2026-10-10T23:37:05+04:00",
    "2026-10-10T23:37:07+04:00"
  ],
  "rev": 18,
  "waiting": null,
  "waits": [
    {
      "kind": "briefing",
      "from": "2026-10-10T23:16:14+04:00",
      "to": "2026-10-10T23:25:01+04:00"
    },
    {
      "kind": "stop",
      "from": "2026-10-10T23:26:58+04:00",
      "to": "2026-10-10T23:28:39+04:00"
    }
  ],
  "log": [
    {
      "t": "2026-10-10T23:14:47+04:00",
      "k": "init"
    },
    {
      "t": "2026-10-10T23:14:57+04:00",
      "k": "stage",
      "id": "manifest",
      "act": "start"
    },
    {
      "t": "2026-10-10T23:15:26+04:00",
      "k": "stage",
      "id": "briefing",
      "act": "start"
    },
    {
      "t": "2026-10-10T23:16:14+04:00",
      "k": "ask",
      "kind": "briefing",
      "note": "4 вопроса — название, правила скидки и цены, фото лукбука, вид конструктора"
    },
    {
      "t": "2026-10-10T23:21:04+04:00",
      "k": "ask",
      "kind": "briefing",
      "note": "выбор названия: «В Ремонти» или один из 5 новых вариантов"
    },
    {
      "t": "2026-10-10T23:23:43+04:00",
      "k": "ask",
      "kind": "briefing",
      "note": "выбор названия из 5 глубоких вариантов + «В Ремонти»"
    },
    {
      "t": "2026-10-10T23:25:01+04:00",
      "k": "answered",
      "kind": "briefing"
    },
    {
      "t": "2026-10-10T23:25:02+04:00",
      "k": "gate",
      "g": "G1",
      "ok": false,
      "open": 24,
      "total": 24
    },
    {
      "t": "2026-10-10T23:25:02+04:00",
      "k": "stage",
      "id": "spec",
      "act": "start"
    },
    {
      "t": "2026-10-10T23:26:58+04:00",
      "k": "ask",
      "kind": "stop",
      "note": "из папки Claude пропали другие проекты — жду ответа пользователя"
    },
    {
      "t": "2026-10-10T23:28:39+04:00",
      "k": "answered",
      "kind": "stop"
    },
    {
      "t": "2026-10-10T23:31:22+04:00",
      "k": "add",
      "key": "debt.assumptions",
      "n": 2
    },
    {
      "t": "2026-10-10T23:34:26+04:00",
      "k": "gate",
      "g": "G2",
      "ok": true,
      "found": 3,
      "fixed": 3,
      "deferred": 0
    },
    {
      "t": "2026-10-10T23:34:28+04:00",
      "k": "stage",
      "id": "plan",
      "act": "start"
    },
    {
      "t": "2026-10-10T23:37:04+04:00",
      "k": "tier",
      "v": "T2"
    },
    {
      "t": "2026-10-10T23:37:05+04:00",
      "k": "tickets",
      "n": 7
    },
    {
      "t": "2026-10-10T23:37:07+04:00",
      "k": "gate",
      "g": "G3",
      "ok": true,
      "problems": 0
    }
  ],
  "reqList": [
    {
      "id": "R01",
      "text": "«найти в интернете лучшие сайт по ремонту квартир и коммерческих помещений под ключ и изготовлению корпусной мебели»",
      "status": "in-ticket"
    },
    {
      "id": "R02",
      "text": "«проанализировать рекомендации и отзывы людей, на что обращает внимание клиент при заказе данных услуг»",
      "status": "in-ticket"
    },
    {
      "id": "R03",
      "text": "«сайт в котором будет колобарация услуг по ремонту квартир и коммерческих помещений под ключ и изготовлению корпусной мебели»",
      "status": "in-ticket"
    },
    {
      "id": "R04",
      "text": "«ремонту квартир … под ключ»",
      "status": "in-ticket"
    },
    {
      "id": "R05",
      "text": "«коммерческих помещений под ключ»",
      "status": "in-ticket"
    },
    {
      "id": "R06",
      "text": "«корпусной мебели любой сложности собственного производства (кухни, шкафы и тд)»",
      "status": "in-ticket"
    },
    {
      "id": "R07",
      "text": "«разработать интерактив на сайте, например при заказе ремонта скидка на изготовление мебели»",
      "status": "in-ticket"
    },
    {
      "id": "R08",
      "text": "«Сайт будет распространяться в городах Тюмень и Нижневартовск»",
      "status": "in-ticket"
    },
    {
      "id": "R09",
      "text": "«указать информацию что требуются специалисты :маляры, плиточники и разнорабочие»",
      "status": "in-ticket"
    },
    {
      "id": "R10",
      "text": "«Сделать заранее лукбук с фотографиями готовой продукции»",
      "status": "in-ticket"
    },
    {
      "id": "R11",
      "text": "«Как пример можешь взять сайт https://c-b-c.ru»",
      "status": "in-ticket"
    },
    {
      "id": "R12",
      "text": "«предложить 3-5 названий для будущей компании»",
      "status": "in-ticket"
    },
    {
      "id": "R13",
      "text": "«разработать визитную карточку»",
      "status": "in-ticket"
    },
    {
      "id": "R14",
      "text": "«логотип компании»",
      "status": "in-ticket"
    },
    {
      "id": "R15",
      "text": "«конструктор, клиенты приходили с размерами своей кухни»",
      "status": "in-ticket"
    },
    {
      "id": "R16",
      "text": "«на готовый замер накладывать кухни разного стиля неоклассики, классики, модерн, хай тек и тд»",
      "status": "in-ticket"
    },
    {
      "id": "R17",
      "text": "«(посмотри какие есть стили)»",
      "status": "in-ticket"
    },
    {
      "id": "R18",
      "text": "«какая необходима информация, спрашивай»",
      "status": "in-ticket"
    },
    {
      "id": "R19",
      "text": "плакат: «Звоните прямо сейчас! +7 912 410 00 01»",
      "status": "in-ticket"
    },
    {
      "id": "R20i",
      "text": "(подразумевается) заявка с сайта должна куда-то попадать (звонок/мессенджер/почта)",
      "status": "in-ticket"
    },
    {
      "id": "R21i",
      "text": "(подразумевается) контакты и адреса по каждому городу",
      "status": "in-ticket"
    },
    {
      "id": "R22i",
      "text": "(подразумевается) сайт размещается в интернете (хостинг, домен)",
      "status": "in-ticket"
    },
    {
      "id": "R23i",
      "text": "(подразумевается) сайт удобен с телефона",
      "status": "in-ticket"
    },
    {
      "id": "R24i",
      "text": "(подразумевается) итоги исследования отражены в содержании сайта (доверие: договор, гарантия, смета, этапы)",
      "status": "in-ticket"
    }
  ],
  "gates": {
    "G1": {
      "ok": false,
      "at": "2026-10-10T23:25:02+04:00",
      "open": 24,
      "total": 24
    },
    "G2": {
      "ok": true,
      "at": "2026-10-10T23:34:26+04:00",
      "found": 3,
      "fixed": 3,
      "deferred": 0
    },
    "G3": {
      "ok": true,
      "at": "2026-10-10T23:37:07+04:00",
      "problems": 0
    }
  },
  "result": null
}
