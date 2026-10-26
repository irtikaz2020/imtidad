(function () {
  'use strict';
  var A = window.Am, el = A.el, app = document.getElementById('app');
  var S = { site: null, books: [], arts: [], byId: {}, byName: {}, lang: 'ar', gloss: [] };
  var CERT = { verified: ['محقَّق', 'v'], likely: ['مرجَّح', 'l'], disputed: ['محل خلاف', 'd'] };

  function enc(id) { return (S.site.encs || []).filter(function (e) { return e.id === id; })[0]; }
  function book(id) { return S.books.filter(function (b) { return b.id === id; })[0]; }
  function hrefFor(k, v) { return k === 'a' ? '#/a/' + encodeURIComponent(v) : '#/t/' + encodeURIComponent(v); }
  function resolve(t) { var a = S.byName[A.norm(t)]; return a ? { id: a.id, title: a.title } : null; }
  function tr(a) { var t = a.tr && a.tr[S.lang]; return (S.lang !== 'ar' && t && t.title && t.body) ? t : null; }

  function indexAll() {
    S.byId = {}; S.byName = {};
    S.arts.forEach(function (a) {
      S.byId[a.id] = a;
      [a.title].concat(a.aliases || []).forEach(function (n) { if (n && !S.byName[A.norm(n)]) S.byName[A.norm(n)] = a; });
    });
  }
  function backlinks(a) {
    var keys = [A.norm(a.title)].concat((a.aliases || []).map(A.norm));
    return S.arts.filter(function (x) {
      return x.id !== a.id && A.targets(x.body).some(function (t) { return keys.indexOf(A.norm(t)) > -1; });
    });
  }
  function missing() {
    var m = {};
    S.arts.forEach(function (a) { A.targets(a.body).forEach(function (t) { if (!resolve(t)) { var k = A.norm(t); (m[k] = m[k] || { t: t, n: 0, from: [] }).n++; m[k].from.push(a); } }); });
    return Object.keys(m).map(function (k) { return m[k]; }).sort(function (a, b) { return b.n - a.n; });
  }
  function theme(color) {
    document.getElementById('top').style.background = color || '';
    var m = document.querySelector('meta[name=theme-color]'); if (m) m.content = color || '#34302b';
  }
  function head(title, sub) { return el('div', null, el('h1', { text: title }), sub ? el('div', { class: 'meta', text: sub }) : null); }
  function crumbs(list) {
    var r = el('div', { class: 'meta row' });
    list.forEach(function (c, i) { if (i) r.appendChild(document.createTextNode('›')); r.appendChild(c.h ? el('a', { href: c.h, text: c.t }) : el('span', { text: c.t })); });
    return r;
  }
  function badge(a) { var c = CERT[a.certainty]; return c ? el('span', { class: 'badge ' + c[1], text: c[0] }) : null; }
  function yrs(a) { if (a.from == null || a.from === '') return ''; var s = A.fmtYear(a.from); if (a.to != null && a.to !== '' && a.to !== a.from) s += ' – ' + A.fmtYear(a.to); return s; }
  function artRow(a) {
    return el('a', { class: 'item', href: hrefFor('a', a.id) }, el('span', null, a.title, ' ', badge(a)), el('span', { class: 'y', text: yrs(a) }));
  }
  function published() { return S.arts.filter(function (a) { return a.status === 'published' || a.status === 'review'; }); }
  function mount(nodes, color) {
    app.textContent = ''; theme(color);
    [].concat(nodes).forEach(function (n) { if (n) app.appendChild(n); });
    app.appendChild(footer()); window.scrollTo(0, 0);
  }
  function footer() {
    var f = el('footer', null, el('div', null, el('a', { href: '#/method', text: 'منهجنا' }), ' · ', el('a', { href: '#/join', text: 'انضم إلينا' }), ' · ', el('a', { href: '#/missing', text: 'صفحات لم تُكتب' }), ' · ', el('a', { href: '#/about', text: 'عن امتداد' })));
    if (S.site.irtikaz) f.appendChild(el('div', null, 'أُنشئ بواسطة ', el('a', { href: S.site.irtikaz, target: '_blank', rel: 'noopener', text: 'ارتكاز' })));
    return f;
  }
  function searchBox(v) {
    var i = el('input', { type: 'text', placeholder: 'ابحث في الموسوعة…', value: v || '', 'aria-label': 'بحث' });
    return el('form', { class: 'row', onsubmit: function (e) { e.preventDefault(); if (i.value.trim()) location.hash = '#/search/' + encodeURIComponent(i.value.trim()); } }, el('div', { style: 'flex:1;min-width:180px' }, i), el('button', { class: 'btn primary', type: 'submit', text: 'بحث' }));
  }

  /* الصفحات */
  function home() {
    var nodes = [el('p', { class: 'summary', text: S.site.about.split('،')[0] + '.' }), searchBox()];
    (S.site.encs || []).forEach(function (e) {
      var bs = S.books.filter(function (b) { return b.enc === e.id; });
      nodes.push(el('h2', { style: 'margin-top:22px;color:' + e.color, text: e.emoji + ' ' + e.name }), el('p', { class: 'meta', text: e.desc }));
      var cards = el('div', { class: 'cards' });
      bs.forEach(function (b) {
        var n = S.arts.filter(function (a) { return a.book === b.id && a.status !== 'draft'; }).length;
        cards.appendChild(el('a', { class: 'card', style: '--c:' + e.color, href: '#/book/' + b.id }, el('b', { text: b.name }), el('div', { class: 'd', text: b.desc || '' }), el('div', { class: 'meta', text: (n ? n + ' مقال' : (b.status === 'planned' ? 'مخطَّط له' : 'لا مقالات بعد')) })));
      });
      nodes.push(cards);
    });
    var recent = published().sort(function (a, b) { return String(b.updated || '').localeCompare(String(a.updated || '')); }).slice(0, 8);
    if (recent.length) nodes.push(el('h3', { text: 'آخر المقالات' }), el('div', { class: 'list' }, recent.map(artRow)));
    mount(nodes);
  }
  function encPage(id) {
    var e = enc(id); if (!e) return nf();
    var cards = el('div', { class: 'cards' });
    S.books.filter(function (b) { return b.enc === id; }).forEach(function (b) { cards.appendChild(el('a', { class: 'card', style: '--c:' + e.color, href: '#/book/' + b.id }, el('b', { text: b.name }), el('div', { class: 'd', text: b.desc || '' }))); });
    mount([crumbs([{ t: 'امتداد', h: '#/' }, { t: e.name }]), head(e.emoji + ' ' + e.name, e.desc), cards], e.color);
  }
  function bookPage(id) {
    var b = book(id); if (!b) return nf(); var e = enc(b.enc);
    var list = S.arts.filter(function (a) { return a.book === id && a.status !== 'draft'; }).sort(function (a, b) { return (a.from == null ? 1e9 : a.from) - (b.from == null ? 1e9 : b.from); });
    mount([crumbs([{ t: 'امتداد', h: '#/' }, { t: e.name, h: '#/enc/' + e.id }, { t: b.name }]), head(b.name, b.desc), list.length ? el('div', { class: 'list' }, list.map(artRow)) : el('p', { class: 'note', text: 'لم تُنشر مقالات في هذا الكتاب بعد.' })], e.color);
  }
  function articlePage(id) {
    var a = S.byId[id]; if (!a || a.status === 'draft') return nf();
    var b = book(a.book), e = b && enc(b.enc), t = tr(a), hasTr = a.tr && a.tr[S.lang] && S.lang !== 'ar';
    var nodes = [crumbs([{ t: 'امتداد', h: '#/' }].concat(e ? [{ t: e.name, h: '#/enc/' + e.id }] : [], b ? [{ t: b.name, h: '#/book/' + b.id }] : []))];
    var langs = {}; S.arts.forEach(function (x) { Object.keys(x.tr || {}).forEach(function (k) { langs[k] = 1; }); });
    if (a.tr && Object.keys(a.tr).some(function (k) { return a.tr[k].title && a.tr[k].body; })) {
      var tg = el('div', { class: 'row', style: 'margin:8px 0' });
      tg.appendChild(el('button', { class: 'chip', 'aria-current': S.lang === 'ar', text: 'العربية', onclick: function () { S.lang = 'ar'; route(); } }));
      Object.keys(a.tr).forEach(function (k) { if (a.tr[k].title && a.tr[k].body) tg.appendChild(el('button', { class: 'chip', 'aria-current': S.lang === k, text: k.toUpperCase(), onclick: function () { S.lang = k; route(); } })); });
      nodes.push(tg);
    }
    var title = t ? t.title : a.title, body = t ? t.body : a.body, sum = t ? t.summary : a.summary;
    nodes.push(el('h1', { text: title }));
    nodes.push(el('div', { class: 'meta' }, badge(a), yrs(a), a.type ? ' · ' + a.type : '', a.updated ? ' · آخر تحديث ' + a.updated : ''));
    if (a.status === 'review') nodes.push(el('div', { class: 'note', text: 'هذا المقال قيد المراجعة وقد يتغير.' }));
    if (t) nodes.push(el('div', { class: 'note', text: (t.status === 'reviewed' ? 'ترجمة مراجَعة.' : 'ترجمة قيد المراجعة — النص العربي هو الأصل.') }));
    if (sum) nodes.push(el('p', { class: 'summary' + (t ? ' tr-en' : ''), text: sum }));
    var bd = A.renderBody(body, resolve, hrefFor); if (t) bd.classList.add('tr-en'); nodes.push(bd);
    if ((a.sources || []).length) {
      var ol = el('ol'); a.sources.forEach(function (s) { var u = A.safeUrl(s.u); ol.appendChild(el('li', null, u ? el('a', { href: u, target: '_blank', rel: 'noopener noreferrer', text: s.t || u }) : (s.t || ''))); });
      nodes.push(el('div', { class: 'src' }, el('h3', { text: 'المصادر' }), ol));
    } else nodes.push(el('div', { class: 'note', text: 'لم تُذكر مصادر لهذا المقال بعد.' }));
    var bl = backlinks(a);
    if (bl.length) nodes.push(el('h3', { text: 'صفحات تشير إلى هذه الصفحة' }), el('div', { class: 'list' }, bl.map(artRow)));
    var em = (S.site.contact || {}).email;
    if (em) nodes.push(el('p', null, el('a', { class: 'btn', href: 'mailto:' + em + '?subject=' + encodeURIComponent('تصحيح في مقال: ' + a.title) + '&body=' + encodeURIComponent('رابط المقال: ' + location.href + '\n\nالخطأ:\n\nالمصدر:'), text: '✎ أبلغ عن خطأ' })));
    mount(nodes, e && e.color);
  }
  function termPage(t) {
    t = decodeURIComponent(t); var r = resolve(t); if (r) { location.replace(hrefFor('a', r.id)); return; }
    mount([crumbs([{ t: 'امتداد', h: '#/' }, { t: 'صفحة لم تُكتب' }]), head(t), el('p', { class: 'note', text: 'هذه الصفحة لم تُكتب بعد. وردت في مقالات الموسوعة كرابط، وستُكتب لاحقاً.' }),
      el('h3', { text: 'وردت في' }), el('div', { class: 'list' }, ((missing().filter(function (m) { return A.norm(m.t) === A.norm(t); })[0] || { from: [] }).from.filter(function (a, i, s) { return s.indexOf(a) === i; })).map(artRow))]);
  }
  function indexPage() {
    var l = published().sort(function (a, b) { return a.title.localeCompare(b.title, 'ar'); });
    mount([crumbs([{ t: 'امتداد', h: '#/' }, { t: 'الفهرس' }]), head('الفهرس الأبجدي', l.length + ' مقال'), l.length ? el('div', { class: 'list' }, l.map(artRow)) : el('p', { class: 'note', text: 'لا مقالات منشورة بعد.' })]);
  }
  function timeline() {
    var l = published().filter(function (a) { return a.from != null && a.from !== ''; }).sort(function (a, b) { return a.from - b.from; }), nodes = [crumbs([{ t: 'امتداد', h: '#/' }, { t: 'الخط الزمني' }]), head('الخط الزمني', 'المقالات المؤرَّخة، مرتبة زمنياً')], cur = null, box;
    if (!l.length) nodes.push(el('p', { class: 'note', text: 'لا مقالات مؤرَّخة بعد.' }));
    l.forEach(function (a) { var c = A.century(a.from); if (c !== cur) { cur = c; nodes.push(el('h3', { text: c })); box = el('div', { class: 'list' }); nodes.push(box); } box.appendChild(artRow(a)); });
    mount(nodes);
  }
  function searchPage(q) {
    q = decodeURIComponent(q); var n = A.norm(q), r = published().filter(function (a) { return A.norm([a.title].concat(a.aliases || [], [a.summary, a.body]).join(' ')).indexOf(n) > -1; });
    r.sort(function (a, b) { return (A.norm(b.title).indexOf(n) > -1) - (A.norm(a.title).indexOf(n) > -1); });
    mount([crumbs([{ t: 'امتداد', h: '#/' }, { t: 'بحث' }]), searchBox(q), head('نتائج «' + q + '»', r.length + ' نتيجة'), el('div', { class: 'list' }, r.map(artRow)), r.length ? null : el('p', { class: 'note', text: 'لا نتائج. ربما لم تُكتب الصفحة بعد.' })]);
  }
  function missingPage() {
    var m = missing();
    mount([crumbs([{ t: 'امتداد', h: '#/' }, { t: 'صفحات لم تُكتب' }]), head('صفحات لم تُكتب بعد', 'روابط وردت في المقالات وليس لها صفحة'), m.length ? el('div', { class: 'list' }, m.map(function (x) { return el('a', { class: 'item', href: hrefFor('t', x.t) }, el('span', { class: 'wl miss', text: x.t }), el('span', { class: 'y', text: x.n + ' إشارة' })); })) : el('p', { class: 'note', text: 'كل الروابط لها صفحات.' })]);
  }
  function textPage(title, paras, lis, ttl2) {
    var n = [crumbs([{ t: 'امتداد', h: '#/' }, { t: title }]), head(title)];
    var box = el('div', { class: 'art' }); paras.forEach(function (p) { box.appendChild(el('p', { text: p })); });
    if (lis && lis.length) { box.appendChild(el('h3', { text: ttl2 })); var ul = el('ul'); lis.forEach(function (x) { ul.appendChild(el('li', { text: x })); }); box.appendChild(ul); }
    n.push(box); return n;
  }
  function methodPage() {
    var n = [crumbs([{ t: 'امتداد', h: '#/' }, { t: 'منهجنا' }]), head('منهجنا في الكتابة')], ol = el('ol', { class: 'art' });
    S.site.method.forEach(function (x) { ol.appendChild(el('li', { text: x })); });
    n.push(ol, el('h3', { text: 'درجات اليقين' }), el('ul', { class: 'art' }, el('li', null, el('span', { class: 'badge v', text: 'محقَّق' }), ' ثبت بمصادر قوية متضافرة.'), el('li', null, el('span', { class: 'badge l', text: 'مرجَّح' }), ' الأدلة ترجّحه ولم تحسمه.'), el('li', null, el('span', { class: 'badge d', text: 'محل خلاف' }), ' اختلف فيه أهل الاختصاص، ونعرض الأقوال.')),
      el('div', { class: 'note', text: 'الدرجة تُكتب على كل مقال. من رأى أن الدرجة أو المعلومة خطأ فليراسلنا مع المصدر.' }));
    mount(n);
  }
  function joinPage() {
    var c = S.site.contact || {}, n = textPage(S.site.joinTitle || 'انضم إلينا', S.site.join || [], S.site.joinRules, 'شروط المشاركة'), r = el('div', { class: 'row', style: 'margin-top:12px' });
    if (c.email) r.appendChild(el('a', { class: 'btn primary', href: 'mailto:' + c.email + '?subject=' + encodeURIComponent('أريد المشاركة في امتداد'), text: '✉ راسلنا' }));
    if (A.safeUrl(c.telegram)) r.appendChild(el('a', { class: 'btn', href: c.telegram, target: '_blank', rel: 'noopener', text: 'تيليجرام' }));
    n.push(r); mount(n);
  }
  function aboutPage() { mount(textPage('عن امتداد', [S.site.about, 'لا حسابات ولا تتبع: المقالات ملفات عامة، ولا يجمع الموقع بيانات عنك.'])); }
  function nf() { mount([head('الصفحة غير موجودة'), el('p', null, el('a', { href: '#/', text: 'العودة للرئيسية' }))]); }

  function route() {
    var h = (location.hash || '#/').slice(2).split('/'), k = h[0] || '', v = h.slice(1).join('/');
    try {
      if (k === '') home(); else if (k === 'enc') encPage(v); else if (k === 'book') bookPage(v); else if (k === 'a') articlePage(decodeURIComponent(v));
      else if (k === 'index') indexPage(); else if (k === 'timeline') timeline(); else if (k === 'search') searchPage(v); else if (k === 'missing') missingPage();
      else if (k === 't') termPage(v); else if (k === 'join') joinPage(); else if (k === 'method') methodPage(); else if (k === 'about') aboutPage(); else nf();
    } catch (e) { A.say('خطأ في عرض الصفحة', true); console.error(e); }
  }

  Promise.all([A.load('am-site.json', null), A.load('am-books.json', { books: [] })]).then(function (r) {
    if (!r[0]) { app.textContent = 'تعذّر تحميل الموقع.'; return; }
    S.site = r[0]; S.books = r[1].books || [];
    document.getElementById('bt').textContent = S.site.name; document.getElementById('tg').textContent = S.site.tagline;
    return Promise.all(S.books.map(function (b) { return A.load(b.file, []).then(function (d) { return (Array.isArray(d) ? d : d.articles || []).map(function (a) { a.book = b.id; return a; }); }); })).then(function (all) {
      S.arts = [].concat.apply([], all); indexAll();
      window.addEventListener('hashchange', route); route();
    });
  });
  if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) navigator.serviceWorker.register('am-sw.js').catch(function () {});
})();
