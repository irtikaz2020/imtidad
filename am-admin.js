(function () {
  'use strict';
  var A = window.Am, el = A.el, app = document.getElementById('app'), st = A.store('am-a:');
  var D = { site: null, books: [], data: {}, gloss: { version: 1, terms: [] } }, tab = 'arts', ed = null, filt = { book: '', q: '' };
  var TYPES = ['حدث', 'شخصية', 'مفهوم', 'مكان', 'اختراع', 'كتاب', 'عصر', 'علم'];

  function save() { st.set('state', D); }
  function dl(name, obj) {
    var b = new Blob([JSON.stringify(obj, null, 1)], { type: 'application/json' }), u = URL.createObjectURL(b), a = el('a', { href: u, download: name });
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 3000);
  }
  function allArts() { var o = []; D.books.forEach(function (b) { (D.data[b.id] || []).forEach(function (a) { o.push(a); }); }); return o; }
  function find(t) { var n = A.norm(t); return allArts().filter(function (a) { return [a.title].concat(a.aliases || []).some(function (x) { return A.norm(x) === n; }); })[0]; }

  function boot() {
    var s = st.get('state', null);
    if (s && s.books && s.books.length) { D = s; D.gloss = D.gloss || { version: 1, terms: [] }; render(); return; }
    fresh();
  }
  function fresh() {
    Promise.all([A.load('am-site.json', null), A.load('am-books.json', { books: [] }), A.load('am-glossary.json', { version: 1, terms: [] })]).then(function (r) {
      D.site = r[0] || {}; D.books = r[1].books || []; D.gloss = r[2]; D.data = {};
      return Promise.all(D.books.map(function (b) { return A.load(b.file, []).then(function (d) { D.data[b.id] = Array.isArray(d) ? d : (d.articles || []); }); }));
    }).then(function () { save(); render(); });
  }

  function tabs() {
    var r = el('div', { class: 'row', style: 'margin:12px 0' });
    [['arts', 'المقالات'], ['books', 'الكتب'], ['gloss', 'المصطلحات'], ['miss', 'الناقصة'], ['site', 'الموقع'], ['out', 'التصدير']].forEach(function (t) {
      r.appendChild(el('button', { class: 'chip', 'aria-current': tab === t[0], text: t[1], onclick: function () { tab = t[0]; ed = null; render(); } }));
    });
    return r;
  }
  function render() {
    app.textContent = ''; app.appendChild(tabs());
    ({ arts: ed ? editor : list, books: booksTab, gloss: glossTab, miss: missTab, site: siteTab, out: outTab })[tab]();
  }
  function fld(label, node, hint) { return el('div', null, el('label', { text: label }), node, hint ? el('div', { class: 'hint', text: hint }) : null); }

  function list() {
    var q = el('input', { type: 'text', placeholder: 'بحث في العناوين', value: filt.q, oninput: function (e) { filt.q = e.target.value; draw(); } });
    var bs = el('select', { onchange: function (e) { filt.book = e.target.value; draw(); } }, el('option', { value: '', text: 'كل الكتب' }), D.books.map(function (b) { return el('option', { value: b.id, text: b.name, selected: b.id === filt.book }); }));
    var box = el('div');
    function draw() {
      box.textContent = ''; var n = A.norm(filt.q), c = 0;
      allArts().filter(function (a) { return (!filt.book || a.book === filt.book) && (!n || A.norm(a.title).indexOf(n) > -1); }).sort(function (a, b) { return String(b.updated).localeCompare(String(a.updated)); }).forEach(function (a) {
        c++; box.appendChild(el('div', { class: 'line' }, el('span', { style: 'flex:1', text: a.title }), el('span', { class: 'badge', text: { draft: 'مسودة', published: 'منشور', review: 'مراجعة' }[a.status] || a.status }),
          el('button', { class: 'btn', text: 'تعديل', onclick: function () { ed = JSON.parse(JSON.stringify(a)); ed._orig = a.id; render(); } })));
      });
      if (!c) box.appendChild(el('p', { class: 'hint', text: 'لا مقالات.' }));
    }
    app.appendChild(el('div', { class: 'panel' }, el('button', { class: 'btn primary', text: '+ مقال جديد', onclick: function () { newArt(); } }), q, bs, box)); draw();
  }
  function newArt(title, bookId) {
    ed = { id: '', book: bookId || filt.book || (D.books[0] || {}).id, title: title || '', aliases: [], type: '', from: '', to: '', certainty: 'likely', summary: '', body: '', sources: [], status: 'draft', tr: {}, created: A.today(), updated: A.today(), _orig: null };
    tab = 'arts'; render();
  }
  function editor() {
    var e = ed, f = {};
    function inp(k, type) { var i = el('input', { type: type || 'text', value: e[k] == null ? '' : e[k], inputmode: type === 'number' ? 'numeric' : null, oninput: function (x) { e[k] = x.target.value; } }); return i; }
    var body = el('textarea', { oninput: function (x) { e.body = x.target.value; } }); body.value = e.body;
    function ins(a, b) { var s = body.selectionStart, t = body.selectionEnd, v = body.value, sel = v.slice(s, t) || 'نص'; body.value = v.slice(0, s) + a + sel + b + v.slice(t); e.body = body.value; body.focus(); body.setSelectionRange(s + a.length, s + a.length + sel.length); }
    var tb = el('div', { class: 'tb' }, [['[[ ]]', '[[', ']]'], ['**ب**', '**', '**'], ['*م*', '*', '*'], ['## عنوان', '\n## ', '\n'], ['- قائمة', '\n- ', '\n'], ['> اقتباس', '\n> ', '\n']].map(function (x) { return el('button', { type: 'button', text: x[0], onclick: function () { ins(x[1], x[2]); } }); }));
    var prev = el('div');
    function draw() { prev.textContent = ''; prev.appendChild(A.renderBody(e.body, function (t) { var a = find(t); return a ? { id: a.id, title: a.title } : null; }, function () { return '#'; })); }
    var srcBox = el('div');
    function drawSrc() {
      srcBox.textContent = '';
      e.sources.forEach(function (s, i) {
        srcBox.appendChild(el('div', { class: 'line' }, el('span', { class: 'meta', text: (i + 1) + '.' }), el('input', { type: 'text', placeholder: 'اسم المصدر', value: s.t, oninput: function (x) { s.t = x.target.value; } }), el('input', { type: 'url', placeholder: 'رابط (اختياري)', value: s.u || '', oninput: function (x) { s.u = x.target.value; } }), el('button', { class: 'btn danger', text: '✕', 'aria-label': 'حذف المصدر ' + (i + 1), onclick: function () { e.sources.splice(i, 1); drawSrc(); } })));
      });
    }
    drawSrc();
    var en = e.tr.en = e.tr.en || { title: '', summary: '', body: '', status: 'draft' };
    var al = el('input', { type: 'text', value: (e.aliases || []).join('، '), oninput: function (x) { e.aliases = x.target.value.split(/[،,]/).map(function (s) { return s.trim(); }).filter(Boolean); } });
    var sel = function (k, opts) { return el('select', { onchange: function (x) { e[k] = x.target.value; } }, opts.map(function (o) { return el('option', { value: o[0], text: o[1], selected: o[0] === e[k] }); })); };
    var pn = el('div', { class: 'panel' },
      el('button', { class: 'btn', text: '← رجوع', onclick: function () { ed = null; render(); } }),
      fld('1. العنوان', inp('title')), fld('2. أسماء أخرى (افصلي بفاصلة)', al, 'تُحل بها الروابط [[...]] أيضاً.'),
      fld('3. الكتاب', sel('book', D.books.map(function (b) { return [b.id, b.name]; }))),
      fld('4. النوع', el('select', { onchange: function (x) { e.type = x.target.value; } }, [el('option', { value: '', text: '—' })].concat(TYPES.map(function (t) { return el('option', { value: t, text: t, selected: t === e.type }); })))),
      fld('5. من سنة', inp('from', 'number'), 'سالب لما قبل الميلاد (-500 = 500 ق.م). لا توجد سنة صفر.'), fld('6. إلى سنة', inp('to', 'number')),
      fld('7. درجة اليقين', sel('certainty', [['verified', 'محقَّق'], ['likely', 'مرجَّح'], ['disputed', 'محل خلاف']])),
      fld('8. ملخص', el('textarea', { style: 'min-height:80px', oninput: function (x) { e.summary = x.target.value; } }, e.summary)),
      el('label', { text: '9. النص' }), tb, body, el('div', { class: 'hint', text: 'اكتبي [[عنوان]] لربط صفحة، أو [[عنوان|كلمة تظهر]]. إن لم توجد الصفحة ظهر الرابط أحمر وتجدينه في «الناقصة».' }),
      el('button', { class: 'btn', text: 'معاينة', onclick: draw }), prev,
      el('h3', { text: '10. المصادر' }), srcBox, el('button', { class: 'btn', text: '+ مصدر', onclick: function () { e.sources.push({ t: '', u: '' }); drawSrc(); } }),
      fld('11. الحالة', sel('status', [['draft', 'مسودة (لا تظهر)'], ['review', 'قيد المراجعة'], ['published', 'منشور']])),
      el('h3', { text: '12. الترجمة الإنجليزية (اختياري)' }),
      fld('12.1 العنوان', el('input', { type: 'text', value: en.title, oninput: function (x) { en.title = x.target.value; } })),
      fld('12.2 الملخص', el('textarea', { style: 'min-height:70px;direction:ltr', oninput: function (x) { en.summary = x.target.value; } }, en.summary)),
      fld('12.3 النص (اتركي [[الروابط]] بالعربية كما هي)', el('textarea', { style: 'direction:ltr', oninput: function (x) { en.body = x.target.value; } }, en.body), 'الرابط يتحول لصفحته العربية. ستظهر الترجمة بوصف «قيد المراجعة» حتى تغيري حالتها.'),
      fld('12.4 حالة الترجمة', el('select', { onchange: function (x) { en.status = x.target.value; } }, [['draft', 'قيد المراجعة'], ['reviewed', 'مراجَعة']].map(function (o) { return el('option', { value: o[0], text: o[1], selected: o[0] === en.status }); }))),
      el('div', { class: 'row', style: 'margin-top:14px' }, el('button', { class: 'btn primary', text: 'حفظ', onclick: saveArt }), e._orig ? el('button', { class: 'btn danger', text: 'حذف', onclick: delArt }) : null));
    app.appendChild(pn);
  }
  function saveArt() {
    var e = ed; e.title = (e.title || '').trim(); if (!e.title) { A.say('اكتبي العنوان', true); return; }
    var clash = find(e.title); if (clash && clash.id !== e._orig) { A.say('يوجد مقال بهذا العنوان أو اسمه البديل', true); return; }
    e.from = e.from === '' ? '' : Number(e.from); e.to = e.to === '' ? '' : Number(e.to);
    if (e.from === 0 || e.to === 0) { A.say('لا توجد سنة صفر: استخدمي 1 أو -1', true); return; }
    e.sources = e.sources.filter(function (s) { return (s.t || '').trim() || (s.u || '').trim(); });
    if (e.status === 'published' && !e.sources.length && !confirm('لا مصادر لهذا المقال. تنشرينه هكذا؟')) return;
    if (e.tr.en && !(e.tr.en.title && e.tr.en.body)) delete e.tr.en;
    e.updated = A.today(); var orig = e._orig, oldA = orig ? allArts().filter(function (a) { return a.id === orig; })[0] : null;
    if (!orig) e.id = A.slug(e.title) + '-' + Date.now().toString(36).slice(-3);
    if (oldA && oldA.title !== e.title && (e.aliases || []).indexOf(oldA.title) < 0) { e.aliases = (e.aliases || []).concat(oldA.title); A.say('أُضيف العنوان القديم كاسم بديل حتى لا تنكسر الروابط'); }
    var clean = JSON.parse(JSON.stringify(e)); delete clean._orig;
    if (oldA) { D.data[oldA.book] = D.data[oldA.book].filter(function (a) { return a.id !== orig; }); }
    (D.data[clean.book] = D.data[clean.book] || []).push(clean);
    save(); ed = null; A.say('تم الحفظ. اذهبي إلى «التصدير» لتنزيل ملف الكتاب'); render();
  }
  function delArt() {
    if (!confirm('حذف المقال نهائياً؟')) return;
    D.books.forEach(function (b) { D.data[b.id] = (D.data[b.id] || []).filter(function (a) { return a.id !== ed._orig; }); });
    save(); ed = null; render();
  }
  function missTab() {
    var m = {}; allArts().forEach(function (a) { A.targets(a.body).forEach(function (t) { if (!find(t)) { var k = A.norm(t); (m[k] = m[k] || { t: t, n: 0 }).n++; } }); });
    var l = Object.keys(m).map(function (k) { return m[k]; }).sort(function (a, b) { return b.n - a.n; });
    app.appendChild(el('div', { class: 'panel' }, el('h3', { text: 'صفحات وردت ولم تُكتب' }), l.length ? l.map(function (x) { return el('div', { class: 'line' }, el('span', { style: 'flex:1', text: x.t + ' (' + x.n + ')' }), el('button', { class: 'btn', text: 'اكتبيها', onclick: function () { newArt(x.t); } })); }) : el('p', { class: 'hint', text: 'لا شيء ناقص.' })));
  }
  function booksTab() {
    var p = el('div', { class: 'panel' }, el('h3', { text: 'الكتب' }));
    D.books.forEach(function (b, i) {
      p.appendChild(el('div', { class: 'line' }, el('span', { style: 'flex:1', text: (i + 1) + '. ' + b.name + ' (' + (D.data[b.id] || []).length + ')' }),
        el('select', { onchange: function (x) { b.status = x.target.value; save(); } }, [['planned', 'مخطَّط'], ['writing', 'قيد الكتابة'], ['done', 'مكتمل']].map(function (o) { return el('option', { value: o[0], text: o[1], selected: o[0] === b.status }); }))));
    });
    var n = el('input', { type: 'text', placeholder: 'اسم كتاب جديد' }), d = el('input', { type: 'text', placeholder: 'وصف قصير' }), en = el('select', null, (D.site.encs || []).map(function (e) { return el('option', { value: e.id, text: e.name }); }));
    p.appendChild(el('h3', { text: 'كتاب جديد' })); p.appendChild(n); p.appendChild(d); p.appendChild(en);
    p.appendChild(el('button', { class: 'btn primary', text: 'إضافة', onclick: function () {
      if (!n.value.trim()) return; var id = 'b' + Date.now().toString(36).slice(-4);
      D.books.push({ id: id, name: n.value.trim(), enc: en.value, desc: d.value.trim(), status: 'planned', order: D.books.length + 1, file: 'am-d-' + id + '.json' }); D.data[id] = []; save(); render(); A.say('أُضيف. صدّري am-books.json أيضاً');
    } }));
    app.appendChild(p);
  }
  function glossTab() {
    var g = D.gloss, p = el('div', { class: 'panel' }, el('h3', { text: 'قاموس المصطلحات للترجمة' }), el('p', { class: 'hint', text: 'ثبّتي ترجمة كل مصطلح مرة واحدة، فتتّسق في كل المقالات. هذا أساس الترجمة التي تتحكمين فيها.' }));
    var box = el('div');
    function draw() {
      box.textContent = ''; g.terms.forEach(function (t, i) {
        box.appendChild(el('div', { class: 'line' }, el('span', { class: 'meta', text: (i + 1) + '.' }), el('span', { style: 'flex:1', text: t.ar + ' ← ' + t.en + (t.note ? ' (' + t.note + ')' : '') }), el('button', { class: 'btn danger', text: '✕', 'aria-label': 'حذف المصطلح ' + (i + 1), onclick: function () { g.terms.splice(i, 1); save(); draw(); } })));
      });
    }
    var ar = el('input', { type: 'text', placeholder: 'العربي' }), en = el('input', { type: 'text', placeholder: 'English', style: 'direction:ltr' }), nt = el('input', { type: 'text', placeholder: 'ملاحظة (اختياري)' });
    p.appendChild(box); p.appendChild(ar); p.appendChild(en); p.appendChild(nt);
    p.appendChild(el('button', { class: 'btn primary', text: 'إضافة مصطلح', onclick: function () { if (!ar.value.trim() || !en.value.trim()) return; g.terms.push({ ar: ar.value.trim(), en: en.value.trim(), note: nt.value.trim() }); ar.value = en.value = nt.value = ''; save(); draw(); } }));
    p.appendChild(el('button', { class: 'btn', text: 'تنزيل am-glossary.json', onclick: function () { dl('am-glossary.json', g); } }));
    app.appendChild(p); draw();
  }
  function siteTab() {
    var s = D.site, p = el('div', { class: 'panel' }, el('h3', { text: 'بيانات الموقع' }));
    p.appendChild(fld('1. وصف الموسوعة', el('textarea', { style: 'min-height:100px', oninput: function (x) { s.about = x.target.value; save(); } }, s.about)));
    p.appendChild(fld('2. بنود المنهج (سطر لكل بند)', el('textarea', { oninput: function (x) { s.method = x.target.value.split('\n').filter(Boolean); save(); } }, (s.method || []).join('\n'))));
    p.appendChild(fld('3. نص الانضمام (سطر لكل فقرة)', el('textarea', { style: 'min-height:100px', oninput: function (x) { s.join = x.target.value.split('\n').filter(Boolean); save(); } }, (s.join || []).join('\n'))));
    p.appendChild(fld('4. شروط المشاركة (سطر لكل شرط)', el('textarea', { style: 'min-height:100px', oninput: function (x) { s.joinRules = x.target.value.split('\n').filter(Boolean); save(); } }, (s.joinRules || []).join('\n'))));
    s.contact = s.contact || {};
    p.appendChild(fld('5. إيميل التواصل', el('input', { type: 'text', value: s.contact.email || '', oninput: function (x) { s.contact.email = x.target.value.trim(); save(); } })));
    p.appendChild(fld('6. رابط تيليجرام', el('input', { type: 'url', value: s.contact.telegram || '', oninput: function (x) { s.contact.telegram = x.target.value.trim(); save(); } })));
    app.appendChild(p);
  }
  function outTab() {
    var p = el('div', { class: 'panel' }, el('h3', { text: 'التصدير' }), el('p', { class: 'hint', text: 'نزّلي الملف ثم ارفعيه إلى المستودع بنفس اسمه (استبدال). لا تُرفع أسماء بـ(1).' }));
    p.appendChild(el('button', { class: 'btn', text: 'am-books.json', onclick: function () { dl('am-books.json', { version: 1, books: D.books }); } }));
    p.appendChild(el('button', { class: 'btn', text: 'am-site.json', onclick: function () { dl('am-site.json', D.site); } }));
    p.appendChild(el('button', { class: 'btn', text: 'am-glossary.json', onclick: function () { dl('am-glossary.json', D.gloss); } }));
    D.books.forEach(function (b, i) {
      var n = (D.data[b.id] || []).length;
      p.appendChild(el('div', { class: 'line' }, el('span', { style: 'flex:1', text: (i + 1) + '. ' + b.file + ' — ' + n + ' مقال' }), el('button', { class: 'btn primary', text: 'تنزيل', onclick: function () { dl(b.file, D.data[b.id] || []); } })));
    });
    p.appendChild(el('hr'));
    p.appendChild(el('button', { class: 'btn danger', text: 'تحميل النسخة المنشورة من جديد (يمسح تعديلاتك المحلية)', onclick: function () { if (confirm('يُمسح كل ما لم تصدّريه. متأكدة؟')) { st.del('state'); fresh(); } } }));
    app.appendChild(p);
  }
  boot();
})();
