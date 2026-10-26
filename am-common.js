(function () {
  'use strict';
  function add(n, c) {
    if (c == null || c === false) return;
    if (Array.isArray(c)) c.forEach(function (x) { add(n, x); });
    else n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  function el(tag, attrs) {
    var n = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      var v = attrs[k]; if (v == null || v === false) continue;
      if (k === 'text') n.textContent = v;
      else if (k === 'class') n.className = v;
      else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? '' : v);
    }
    for (var i = 2; i < arguments.length; i++) add(n, arguments[i]);
    return n;
  }
  function store(prefix) {
    return {
      get: function (k, d) { try { var v = localStorage.getItem(prefix + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
      set: function (k, v) { try { localStorage.setItem(prefix + k, JSON.stringify(v)); return true; } catch (e) { return false; } },
      del: function (k) { try { localStorage.removeItem(prefix + k); } catch (e) {} }
    };
  }
  function safeUrl(u) { try { var x = new URL(String(u).trim()); return /^https?:$/.test(x.protocol) ? x.href : ''; } catch (e) { return ''; } }
  function load(u, d) { return fetch(u, { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : d; }).catch(function () { return d; }); }
  function uid(p) { return p + Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36); }
  var toast, tt;
  function say(t, bad) {
    toast = toast || document.getElementById('toast'); if (!toast) return;
    clearTimeout(tt); toast.textContent = t; toast.className = 'toast show' + (bad ? ' bad' : ''); tt = setTimeout(function () { toast.className = 'toast'; }, bad ? 7000 : 3500);
  }
  function norm(s) {
    s = String(s || '').toLowerCase().replace(/[ً-ٰٟـ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/\s+/g, ' ').trim();
    return s.replace(/^ال(?=\S{2})/, '');
  }
  function slug(s) { var o = String(s).toLowerCase().trim().replace(/[^a-z0-9ء-ي]+/g, '-').replace(/^-|-$/g, ''); return o || uid('a'); }
  function fmtYear(n) {
    if (n == null || n === '') return '';
    n = Number(n); return (Math.abs(n)).toLocaleString('ar-EG', { useGrouping: false }) + (n < 0 ? ' ق.م' : ' م');
  }
  function century(n) {
    n = Number(n); var c = Math.ceil(Math.abs(n) / 100);
    return 'القرن ' + c.toLocaleString('ar-EG') + (n < 0 ? ' ق.م' : ' م');
  }
  function today() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }

  /* محوّل النص إلى عناصر. resolve(target) => { id, title } | null ; يُستدعى لكل رابط [[...]] */
  var INLINE = /\[\[([^\]]+)\]\]|\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)|\*\*([^*]+)\*\*|\*([^*\n]+)\*/g;
  function inline(text, resolve, hrefFor) {
    var out = [], last = 0, m;
    INLINE.lastIndex = 0;
    while ((m = INLINE.exec(text))) {
      if (m.index > last) out.push(text.slice(last, m.index));
      if (m[1] != null) {
        var parts = m[1].split('|'), target = parts[0].trim(), shown = (parts[1] || parts[0]).trim(), r = resolve(target);
        if (r) out.push(el('a', { class: 'wl', href: hrefFor('a', r.id), text: shown }));
        else out.push(el('a', { class: 'wl miss', href: hrefFor('t', target), title: 'صفحة لم تُكتب بعد', text: shown }));
      } else if (m[2] != null) {
        out.push(el('a', { href: m[3], target: '_blank', rel: 'noopener noreferrer', text: m[2] }));
      } else if (m[4] != null) out.push(el('b', { text: m[4] }));
      else if (m[5] != null) out.push(el('i', { text: m[5] }));
      last = m.index + m[0].length;
    }
    if (last < text.length) out.push(text.slice(last));
    return out;
  }
  function renderBody(text, resolve, hrefFor) {
    var box = el('div', { class: 'art' }), lines = String(text || '').replace(/\r/g, '').split('\n'), i = 0;
    while (i < lines.length) {
      var l = lines[i];
      if (!l.trim()) { i++; continue; }
      var h = l.match(/^(#{2,3})\s+(.+)$/);
      if (h) { box.appendChild(el(h[1].length === 2 ? 'h2' : 'h3', null, inline(h[2], resolve, hrefFor))); i++; continue; }
      if (/^>\s?/.test(l)) { var q = []; while (i < lines.length && /^>\s?/.test(lines[i])) { q.push(lines[i].replace(/^>\s?/, '')); i++; } box.appendChild(el('blockquote', null, inline(q.join(' '), resolve, hrefFor))); continue; }
      if (/^[-*]\s+/.test(l)) { var ul = el('ul'); while (i < lines.length && /^[-*]\s+/.test(lines[i])) { ul.appendChild(el('li', null, inline(lines[i].replace(/^[-*]\s+/, ''), resolve, hrefFor))); i++; } box.appendChild(ul); continue; }
      if (/^\d+[.)]\s+/.test(l)) { var ol = el('ol'); while (i < lines.length && /^\d+[.)]\s+/.test(lines[i])) { ol.appendChild(el('li', null, inline(lines[i].replace(/^\d+[.)]\s+/, ''), resolve, hrefFor))); i++; } box.appendChild(ol); continue; }
      var p = []; while (i < lines.length && lines[i].trim() && !/^(#{2,3}\s|>\s?|[-*]\s+|\d+[.)]\s+)/.test(lines[i])) { p.push(lines[i]); i++; }
      box.appendChild(el('p', null, inline(p.join(' '), resolve, hrefFor)));
    }
    return box;
  }
  /* استخراج أهداف الروابط [[...]] من نص */
  function targets(text) {
    var o = [], re = /\[\[([^\]]+)\]\]/g, m; while ((m = re.exec(String(text || '')))) o.push(m[1].split('|')[0].trim()); return o;
  }
  window.Am = { el: el, store: store, safeUrl: safeUrl, load: load, uid: uid, say: say, norm: norm, slug: slug, fmtYear: fmtYear, century: century, today: today, renderBody: renderBody, targets: targets };
})();
