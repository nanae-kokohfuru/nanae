/* =====================================================================
   BUSINESS COMPASS — PRIVATE ANALYSIS（ななえ専用・事業分析カルテ）
   ---------------------------------------------------------------------
   ・本人の83問の回答は「読むだけ」。書き換えることはありません。
   ・ななえの分析は consultant_analysis として、本人の回答とは別の
     保存領域（localStorage: business-compass:analysis:v1）に保存します。
   ・AI による診断・採点・提案・自動生成は行いません。
   ===================================================================== */

(function () {
  var C = window.BC_CONTENT;
  var F = window.BCFields;
  var el = F.el, lines = F.lines, filled = F.filled;

  var CLIENT_KEY = 'business-compass:v2';            /* 本人の回答（読むだけ） */
  var ANALYSIS_KEY = 'business-compass:analysis:v1'; /* 裏カルテ（ここだけに書く） */

  /* ---------- 質問の索引（Q番号は表側と同じ数え方） ---------- */
  var Q = {}, NO = {};
  (function () {
    var n = 0;
    C.chapters.forEach(function (ch) {
      ch.questions.forEach(function (st) {
        if (st.interlude) return;
        (st.items || [st]).forEach(function (q) {
          n += 1; Q[q.id] = q; NO[q.id] = n;
          /* 1問に統合された項目（saveAs）も、元のキーで参照できるようにする（同じQ番号） */
          (q.fields || []).forEach(function (f) {
            if (!f.saveAs) return;
            var sub = f.type === 'choice'
              ? { id: f.saveAs, type: f.multiple ? 'multi' : 'single', options: f.options, label: f.label.replace(/^[AB]｜/, ''), title: f.label, noOther: true }
              : { id: f.saveAs, type: f.type, rows: f.rows, label: f.label.replace(/^[AB]｜/, ''), title: f.label };
            Q[f.saveAs] = sub; NO[f.saveAs] = n;
          });
        });
      });
    });
  })();

  /* ---------- 保存 ---------- */
  function blankAnalysis() {
    function trio() { return { observation: '', risk: '', opportunity: '' }; }
    return {
      assets: {},
      untapped_value: {},
      bottleneck: { areas: [], primary: '', primary_note: '', why: '' },
      business_structure: {
        body_dependency: trio(), owner_dependency: trio(), continuity: trio(),
        knowledge_asset: trio(), decision_structure: trio()
      },
      potential: { types: [] },
      key_lever: {},
      priority: { now: [], next: [], later: [], not_now: [] },
      session_note: '',
      next_compass: ''
    };
  }
  function deepMerge(base, saved) {
    if (!saved || typeof saved !== 'object' || Array.isArray(base)) return saved != null ? saved : base;
    Object.keys(saved).forEach(function (k) {
      base[k] = (base[k] && typeof base[k] === 'object' && !Array.isArray(base[k])) ? deepMerge(base[k], saved[k]) : saved[k];
    });
    return base;
  }
  function loadDoc() {
    var saved = null;
    try { saved = JSON.parse(localStorage.getItem(ANALYSIS_KEY)); } catch (e) {}
    var doc = { version: 1, session_date: '', client_snapshot: null, consultant_analysis: blankAnalysis(), updatedAt: null };
    if (saved && typeof saved === 'object') {
      doc.session_date = saved.session_date || '';
      doc.client_snapshot = saved.client_snapshot || null;
      doc.consultant_analysis = deepMerge(blankAnalysis(), saved.consultant_analysis || {});
      doc.updatedAt = saved.updatedAt || null;
    }
    if (!doc.session_date) doc.session_date = new Date().toISOString().slice(0, 10);
    return doc;
  }
  var doc = loadDoc();
  var A = doc.consultant_analysis;

  var saveTimer = null;
  var statusEl;
  function save(now) {
    clearTimeout(saveTimer);
    if (statusEl) statusEl.textContent = '保存中…';
    saveTimer = setTimeout(function () {
      doc.updatedAt = new Date().toISOString();
      try {
        localStorage.setItem(ANALYSIS_KEY, JSON.stringify(doc));
        if (statusEl) statusEl.textContent = '保存しました ' + new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
      } catch (e) {
        if (statusEl) statusEl.textContent = '保存できませんでした';
      }
    }, now ? 0 : 400);
  }
  window.addEventListener('pagehide', function () { if (saveTimer) { clearTimeout(saveTimer); doc.updatedAt = new Date().toISOString(); try { localStorage.setItem(ANALYSIS_KEY, JSON.stringify(doc)); } catch (e) {} } });

  function getPath(obj, path) {
    return path.split('.').reduce(function (o, k) { return o == null ? undefined : o[k]; }, obj);
  }
  function setPath(obj, path, v) {
    var ps = path.split('.'), cur = obj;
    ps.slice(0, -1).forEach(function (k) { if (!cur[k] || typeof cur[k] !== 'object') cur[k] = {}; cur = cur[k]; });
    cur[ps[ps.length - 1]] = v;
    save();
  }

  /* ---------- 本人の回答（読むだけ） ---------- */
  function clientAnswers() {
    if (doc.client_snapshot && doc.client_snapshot.raw) return doc.client_snapshot.raw;
    try {
      var s = JSON.parse(localStorage.getItem(CLIENT_KEY));
      return (s && s.answers) || {};
    } catch (e) { return {}; }
  }
  var answers = clientAnswers();
  function get(k) { return answers[k]; }

  function summary(id) {
    var q = Q[id];
    if (!q) return null;
    return F.get(q.type).summarize(q, get);
  }
  function summaryText(id) {
    var s = summary(id);
    if (!s) return '';
    if (s.text) return s.text;
    if (s.tags) return s.tags.join('・');
    if (s.items) return s.items.join('、');
    return '';
  }

  /* 表側カルテと同じ見え方で、回答を静かに表示する */
  function rowsNode(rows) {
    return el('dl', { class: 'karte__rows' }, rows.map(function (r) { return [el('dt', { text: r.label }), el('dd', {}, lines(r.text))]; }));
  }
  function answerNode(sum) {
    if (!sum) return el('p', { class: 'karte__empty', text: '未記入' });
    var out = [];
    if (sum.text) out.push(el('p', { class: 'karte__text' }, lines(sum.text)));
    if (sum.tags) out.push(el('ul', { class: 'karte__tags' }, sum.tags.map(function (t) { return el('li', { text: t }); })));
    if (sum.items) out.push(el('ul', { class: 'karte__items' }, sum.items.map(function (t) { return el('li', { text: t }); })));
    if (sum.cards) out.push(el('ol', { class: 'karte__cards' }, sum.cards.map(function (c) { return el('li', {}, rowsNode(c.rows)); })));
    if (sum.rows) out.push(rowsNode(sum.rows));
    if (sum.beforeAfter) out.push(el('div', { class: 'karte__ba' },
      el('p', {}, el('span', { text: 'BEFORE' }), sum.beforeAfter.before || '—'),
      el('p', {}, el('span', { text: 'AFTER' }), sum.beforeAfter.after || '—')));
    if (sum.timeline) out.push(el('ol', { class: 'karte__timeline' }, sum.timeline.map(function (t) {
      return el('li', {}, el('span', { class: 'karte__age', text: t.age || '—' }),
        el('div', {}, t.event ? el('p', { class: 'karte__event', text: t.event }) : null,
          (t.subs || []).map(function (x) { return el('p', { class: 'karte__sub' }, el('span', { text: x.label }), x.text); })));
    })));
    if (sum.route) out.push(el('ul', { class: 'karte__route' }, sum.route.map(function (r) {
      return el('li', {}, el('span', { class: 'karte__tool', text: r.tool }),
        el('span', { class: 'karte__purpose', text: r.purposes.length ? r.purposes.join('・') : '用途未記入' }));
    })));
    return out;
  }
  function answerEntry(id) {
    var q = Q[id];
    if (!q) return null;
    return el('div', { class: 'src__entry' },
      el('dt', { class: 'src__q' }, el('span', { class: 'src__no', text: 'Q' + String(NO[id]).padStart(2, '0') }), q.label || q.title.replace(/\n/g, '')),
      el('dd', { class: 'src__a karte__a' }, answerNode(summary(id))));
  }

  /* SOURCE｜本人の回答を見る（開閉式） */
  function source(groups, title) {
    var count = 0;
    groups.forEach(function (g) { g.ids.forEach(function (id) { if (Q[id] && F.get(Q[id].type).isAnswered(Q[id], get)) count += 1; }); });
    return el('details', { class: 'src' },
      el('summary', { class: 'src__summary' },
        el('span', { class: 'src__label', text: 'SOURCE' }),
        el('span', { class: 'src__title', text: title || '本人の回答を見る' }),
        el('span', { class: 'src__count', text: count + ' 件の回答' }),
        el('span', { class: 'accordion__mark', 'aria-hidden': 'true' })),
      el('div', { class: 'src__body' }, groups.map(function (g) {
        return el('section', { class: 'src__group' },
          el('p', { class: 'src__group-title', text: g.label }),
          el('dl', { class: 'src__list' }, g.ids.map(answerEntry)));
      })));
  }

  /* ---------- 入力パーツ ---------- */
  var uid = 0;
  function nid() { uid += 1; return 'an-' + uid; }
  function grow(t) { t.style.height = 'auto'; t.style.height = t.scrollHeight + 2 + 'px'; }

  function area(path, o) {
    o = o || {};
    var id = nid();
    var t = el('textarea', { id: id, class: 'an-area' + (o.size ? ' an-area--' + o.size : ''), rows: o.rows || 2,
      placeholder: o.placeholder || '', oninput: function () { setPath(A, path, t.value); grow(t); } });
    t.value = getPath(A, path) || '';
    requestAnimationFrame(function () { grow(t); });
    return el('div', { class: 'an-field' + (o.size ? ' an-field--' + o.size : '') },
      el('label', { class: 'an-label', for: id },
        o.en ? el('span', { class: 'an-label__en', text: o.en }) : null,
        el('span', { class: 'an-label__ja' }, lines(o.label || ''))),
      o.question ? el('p', { class: 'an-question' }, lines(o.question)) : null,
      t);
  }

  function chips(path, options, o) {
    o = o || {};
    var name = nid();
    var wrap = el('div', { class: 'tiles tiles--small an-chips', role: o.multiple ? 'group' : 'radiogroup', 'aria-label': o.aria || '' });
    function isOn(v) { var cur = getPath(A, path); return o.multiple ? (cur || []).indexOf(v) >= 0 : cur === v; }
    function refresh() { Array.prototype.forEach.call(wrap.querySelectorAll('input'), function (b) { b.checked = isOn(b.value); }); }
    options.forEach(function (opt) {
      var b = el('input', { type: o.multiple ? 'checkbox' : 'radio', name: name, value: opt, class: 'tile__input', onchange: function () {
        if (o.multiple) {
          var cur = (getPath(A, path) || []).filter(function (x) { return x !== opt; });
          if (b.checked) cur.push(opt);
          cur.sort(function (a, c) { return options.indexOf(a) - options.indexOf(c); });
          setPath(A, path, cur);
        } else {
          setPath(A, path, b.checked ? opt : '');
        }
        refresh();
        if (o.onChange) o.onChange();
      } });
      if (!o.multiple) {
        b.addEventListener('pointerdown', function () { b.dataset.was = b.checked ? '1' : '0'; });
        b.addEventListener('click', function () { if (b.dataset.was === '1') { b.checked = false; setPath(A, path, ''); refresh(); } });
      }
      wrap.appendChild(el('label', { class: 'tile' }, b, el('span', { class: 'tile__text', text: opt })));
    });
    refresh();
    return wrap;
  }

  function list(path, o) {
    var max = o.max || 3;
    var box = el('ol', { class: 'an-list' });
    var add = el('button', { type: 'button', class: 'text-btn an-list__add', onclick: function () {
      var cur = (getPath(A, path) || []).slice(); if (cur.length >= max) return;
      cur.push(''); setPath(A, path, cur); draw(cur.length - 1);
    } }, '＋ 追加');
    function draw(focus) {
      var cur = getPath(A, path) || [];
      if (!cur.length) { cur = ['']; A.priority[path.split('.')[1]] = cur; }
      box.innerHTML = '';
      cur.forEach(function (v, i) {
        var input = el('input', { type: 'text', class: 'an-line', value: v, 'aria-label': o.label + ' ' + (i + 1),
          placeholder: i === 0 ? o.placeholder : '', oninput: function () {
            var all = (getPath(A, path) || []).slice(); all[i] = input.value; setPath(A, path, all);
          } });
        input.value = v || '';
        var rm = cur.length > 1 ? el('button', { type: 'button', class: 'text-btn text-btn--quiet an-list__rm', 'aria-label': o.label + ' ' + (i + 1) + ' を削除', onclick: function () {
          var all = (getPath(A, path) || []).slice(); all.splice(i, 1); setPath(A, path, all); draw();
        } }, '×') : null;
        box.appendChild(el('li', { class: 'an-list__row' }, el('span', { class: 'an-list__no', text: String(i + 1) }), input, rm));
        if (focus === i) requestAnimationFrame(function () { input.focus(); });
      });
      add.hidden = cur.length >= max;
    }
    draw();
    return el('div', { class: 'an-listwrap' }, box, add);
  }

  /* ---------- セクションの枠 ---------- */
  function section(id, no, en, ja, desc, body) {
    return el('section', { class: 'an-sec', id: id, 'aria-labelledby': id + '-h' },
      el('header', { class: 'an-sec__head' },
        el('p', { class: 'an-sec__no', text: no }),
        el('h2', { class: 'an-sec__en', id: id + '-h' }, en),
        el('p', { class: 'an-sec__ja', text: ja }),
        desc ? el('p', { class: 'an-sec__desc' }, lines(desc)) : null),
      el('div', { class: 'an-sec__body' }, body));
  }

  /* ================================================================
     画面
     ================================================================ */
  var root = document.getElementById('analysis');

  function clientInfo() {
    var form = summaryText('business_current.form');
    var info = [
      ['名前', summaryText('profile.name')],
      ['屋号 / 会社名', summaryText('profile.brand_names')],
      ['事業形態', form],
      ['事業年数', summaryText('business_current.years')]
    ];
    var dateId = nid();
    var date = el('input', { type: 'date', id: dateId, class: 'an-date', value: doc.session_date, onchange: function () { doc.session_date = date.value; save(); } });
    return el('dl', { class: 'an-client' },
      info.map(function (r) { return el('div', { class: 'an-client__item' }, el('dt', { text: r[0] }), el('dd', { text: r[1] || '—' })); }),
      el('div', { class: 'an-client__item' }, el('dt', {}, el('label', { for: dateId, text: 'セッション日' })), el('dd', {}, date)));
  }

  function sourceBar() {
    var snap = doc.client_snapshot;
    var file = el('input', { type: 'file', accept: 'application/json,.json', class: 'sr-only', id: 'an-import', onchange: function () {
      var f = file.files[0]; if (!f) return;
      var r = new FileReader();
      r.onload = function () {
        try {
          var j = JSON.parse(r.result);
          var raw = j.raw || j.answers;
          if (!raw || typeof raw !== 'object') throw new Error('no answers');
          doc.client_snapshot = { raw: raw, file: f.name, exportedAt: j.exportedAt || null, loadedAt: new Date().toISOString() };
          save(true);
          setTimeout(function () { location.reload(); }, 50);
        } catch (e) { alert('BUSINESS COMPASS の回答データ（JSON）を選んでください。'); }
      };
      r.readAsText(f);
    } });
    var label = snap
      ? (snap.source === 'cloud'
        ? '送信された回答：' + (snap.name || '名前未入力') + (snap.exportedAt ? '（最終更新 ' + fmt(snap.exportedAt) + '）' : '')
        : '読み込んだ回答ファイル：' + snap.file + (snap.exportedAt ? '（' + new Date(snap.exportedAt).toLocaleDateString('ja-JP') + ' 書き出し）' : ''))
      : 'この端末に保存されている本人の回答';
    return el('div', { class: 'an-srcbar' },
      el('p', { class: 'an-srcbar__label' }, el('span', { class: 'an-srcbar__en', text: 'CLIENT DATA' }), label),
      el('div', { class: 'an-srcbar__actions' },
        el('label', { class: 'text-btn text-btn--light an-srcbar__btn', for: 'an-import' }, '回答ファイル（JSON）を読み込む'), file,
        snap ? el('button', { type: 'button', class: 'text-btn text-btn--light', onclick: function () {
          doc.client_snapshot = null; save(true); setTimeout(function () { location.reload(); }, 50);
        } }, 'この端末の回答に戻す') : null));
  }

  function fmt(iso) {
    if (!iso) return '—';
    var d = new Date(iso);
    if (isNaN(d)) return '—';
    return d.getFullYear() + '/' + (d.getMonth() + 1) + '/' + d.getDate() + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }

  /* ---------- 送信された回答（サーバー）：合言葉 → 回答者一覧 → 読み込み／削除 ---------- */
  var PASS_KEY = 'business-compass:admin-pass'; /* このタブを閉じるまでだけ覚える（sessionStorage） */
  function getPass() { try { return sessionStorage.getItem(PASS_KEY) || ''; } catch (e) { return ''; } }
  function setPass(v) { try { if (v) sessionStorage.setItem(PASS_KEY, v); else sessionStorage.removeItem(PASS_KEY); } catch (e) {} }
  function adminApi(method, query, body) {
    var headers = { 'X-BC-Passphrase': getPass() };
    if (body) headers['Content-Type'] = 'application/json';
    return fetch('/api/bc-admin' + (query || ''), { method: method, headers: headers, body: body ? JSON.stringify(body) : undefined, cache: 'no-store' })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { status: r.status, body: j }; }); },
        function () { return { status: 0, body: {} }; });
  }
  function adminError(r) {
    if (r.status === 401) return '合言葉が違います';
    if (r.status === 429) return '合言葉を何度も間違えたため　しばらく受け付けません　15分ほど待ってからお試しください';
    if (r.status === 503) return '保存先の設定が見つかりません　Vercel の環境変数を確認してください';
    if (r.status === 0) return '通信できませんでした　通信状況をご確認ください';
    return 'うまく読み込めませんでした（' + r.status + '）';
  }

  function cloudPanel() {
    var box = el('div', { class: 'an-cloud' });
    var msg = el('p', { class: 'an-cloud__msg', role: 'status', 'aria-live': 'polite' });

    function drawLogin(text) {
      box.innerHTML = '';
      var id = 'an-pass';
      var input = el('input', { type: 'password', id: id, class: 'an-cloud__pass', autocomplete: 'current-password', placeholder: '合言葉' });
      var form = el('form', { class: 'an-cloud__login', onsubmit: function (e) {
        e.preventDefault();
        if (!input.value) return;
        setPass(input.value);
        drawList();
      } },
        el('label', { class: 'an-cloud__label', for: id }, el('span', { class: 'an-srcbar__en', text: 'RESPONDENTS' }), '送信された回答を見るには　合言葉を入力してください'),
        el('div', { class: 'an-cloud__row' }, input, el('button', { type: 'submit', class: 'btn-line an-cloud__go' }, '回答者一覧を表示')));
      box.appendChild(form);
      msg.textContent = text || '';
      box.appendChild(msg);
    }

    function drawList() {
      box.innerHTML = '';
      msg.textContent = '読み込み中…';
      box.appendChild(msg);
      adminApi('GET', '?action=list').then(function (r) {
        if (r.status !== 200) { if (r.status === 401) setPass(''); drawLogin(adminError(r)); return; }
        var list = r.body.respondents || [];
        box.innerHTML = '';
        var current = doc.client_snapshot && doc.client_snapshot.source === 'cloud' ? doc.client_snapshot.id : null;
        var head = el('div', { class: 'an-cloud__head' },
          el('p', { class: 'an-cloud__label' }, el('span', { class: 'an-srcbar__en', text: 'RESPONDENTS' }), '回答者一覧　' + list.length + '人'),
          el('div', { class: 'an-cloud__tools' },
            el('button', { type: 'button', class: 'text-btn text-btn--light', onclick: drawList }, '最新にする'),
            el('button', { type: 'button', class: 'text-btn text-btn--light', onclick: function () { setPass(''); drawLogin('合言葉を消しました'); } }, '閉じる')));
        box.appendChild(head);
        if (!list.length) { box.appendChild(el('p', { class: 'an-cloud__empty', text: 'まだ送信された回答はありません' })); return; }
        var table = el('table', { class: 'an-cloud__table' },
          el('thead', {}, el('tr', {}, ['回答者', '状況', '送信日時', '最終更新', ''].map(function (h) { return el('th', { scope: 'col', text: h }); }))),
          el('tbody', {}, list.map(function (p) {
            var isCur = p.id === current;
            return el('tr', { class: isCur ? 'is-current' : '' },
              el('td', { class: 'an-cloud__name', 'data-label': '回答者' }, p.name || '（名前未入力）', isCur ? el('span', { class: 'an-cloud__now', text: '表示中' }) : null),
              el('td', { 'data-label': '状況' }, el('span', { class: 'an-cloud__badge is-' + p.status, text: p.status === 'submitted' ? '送信済み' : '回答中' }),
                el('span', { class: 'an-cloud__count', text: p.answered + ' / ' + (p.total || 80) })),
              el('td', { 'data-label': '送信日時', text: fmt(p.submittedAt) }),
              el('td', { 'data-label': '最終更新', text: fmt(p.updatedAt) }),
              el('td', { class: 'an-cloud__actions' },
                el('button', { type: 'button', class: 'btn-line an-cloud__load', onclick: function () { loadOne(p); } }, '読み込む'),
                el('button', { type: 'button', class: 'text-btn text-btn--light an-cloud__del', onclick: function () { removeOne(p); } }, '削除')));
          })));
        box.appendChild(table);
        box.appendChild(msg);
        msg.textContent = '';
      });
    }

    function loadOne(p) {
      msg.textContent = (p.name || '回答者') + ' さんの回答を読み込んでいます…';
      adminApi('GET', '?action=get&id=' + encodeURIComponent(p.id)).then(function (r) {
        if (r.status !== 200) { msg.textContent = adminError(r); return; }
        doc.client_snapshot = { raw: r.body.answers || {}, source: 'cloud', id: r.body.id, name: r.body.name,
          file: (r.body.name || '回答者') + '（送信された回答）', exportedAt: r.body.updatedAt, submittedAt: r.body.submittedAt, loadedAt: new Date().toISOString() };
        save(true);
        setTimeout(function () { location.reload(); }, 50);
      });
    }

    function removeOne(p) {
      var who = p.name || '名前未入力の回答者';
      if (!window.confirm(who + ' さんの回答をサーバーから削除しますか\n削除すると元に戻せません')) return;
      var typed = window.prompt('確認のため「削除」と入力してください');
      if (typed !== '削除') { msg.textContent = '削除を取りやめました'; return; }
      adminApi('POST', '', { action: 'delete', id: p.id }).then(function (r) {
        if (r.status !== 200) { msg.textContent = adminError(r); return; }
        drawList();
      });
    }

    if (getPass()) drawList(); else drawLogin();
    return box;
  }

  /* 80問すべての回答（章ごと） */
  function allAnswers() {
    return source(C.chapters.map(function (ch) {
      var ids = [];
      ch.questions.forEach(function (st) { if (!st.interlude) (st.items || [st]).forEach(function (q) { ids.push(q.id); }); });
      return { label: ch.no + ' ' + ch.en + '　' + ch.ja, ids: ids };
    }), '80問すべての回答を見る');
  }

  function voice(label, en, id, strong) {
    var t = summaryText(id);
    return el('div', { class: 'an-voice' + (strong ? ' an-voice--strong' : '') },
      el('p', { class: 'an-voice__label' }, el('span', { class: 'an-voice__en', text: en }), label,
        el('span', { class: 'an-voice__q', text: 'Q' + NO[id] })),
      el('p', { class: 'an-voice__text' + (t ? '' : ' is-empty') }, t ? lines(t) : '未記入'));
  }

  var NAV = [
    ['assets', 'ASSETS'], ['untapped', 'UNTAPPED VALUE'], ['bottleneck', 'BOTTLENECK'], ['structure', 'STRUCTURE'],
    ['potential', 'POTENTIAL'], ['keylever', 'KEY LEVER'], ['priority', 'PRIORITY'], ['note', 'NOTE']
  ];

  function build() {
    statusEl = el('p', { class: 'an-nav__status', 'aria-live': 'polite', text: doc.updatedAt ? '保存済み' : '' });

    var header = el('header', { class: 'an-head' },
      el('div', { class: 'an-head__inner' },
        el('div', { class: 'an-head__brand' },
          el('p', { class: 'an-head__only', text: 'FOR CONSULTANT USE ONLY' }),
          el('h1', { class: 'an-head__title' }, el('span', { text: 'BUSINESS COMPASS' }), el('span', { class: 'an-head__sub', text: 'PRIVATE ANALYSIS' })),
          el('p', { class: 'an-head__ja', text: 'ななえ専用・事業分析カルテ' })),
        clientInfo()),
      el('div', { class: 'an-head__inner an-head__voices' },
        voice('本人が今日整理したいこと', 'CLIENT’S AGENDA', 'session_goal.today', false),
        voice('本人が感じている最大の急所', 'SELF-PERCEIVED', 'self_perceived_bottleneck.key_one', true)),
      el('div', { class: 'an-head__inner' }, sourceBar(), cloudPanel()));

    var nav = el('nav', { class: 'an-nav', 'aria-label': '裏カルテの目次' },
      el('div', { class: 'an-nav__inner' },
        el('ol', { class: 'an-nav__list' }, NAV.map(function (n) {
          return el('li', {}, el('a', { href: '#' + n[0], class: 'an-nav__link', 'data-target': n[0] }, n[1]));
        })),
        statusEl));

    /* 01 ASSETS */
    var assets = section('assets', '01', 'ASSETS', 'すでに持っている「宝」', 'この人、この事業が\nすでに持っている価値は何か。', [
      source([
        { label: '技術・知識・経験', ids: ['qualifications.backgrounds', 'qualifications.certificates', 'knowledge.fields', 'skills.offerings', 'skills.confident', 'skills.insight', 'life_story.timeline', 'profile.favorite_work'] },
        { label: '実績・証拠', ids: ['proof.types', 'proof.memorable_results', 'proof.accumulated'] },
        { label: '人柄・感情価値', ids: ['emotional_value.feelings', 'emotional_value.customer_words', 'personality_impression.traits', 'emotional_value.takeaway'] },
        { label: '商品・顧客・仕組み', ids: ['products.list', 'customer_current.segments', 'business_structure.team', 'customer_route.tools'] }
      ]),
      el('div', { class: 'an-grid' },
        area('assets.skill', { en: 'SKILL', label: '技術' }),
        area('assets.knowledge', { en: 'KNOWLEDGE', label: '知識' }),
        area('assets.experience', { en: 'EXPERIENCE', label: '経験' }),
        area('assets.proof', { en: 'PROOF', label: '実績・証拠' }),
        area('assets.human_value', { en: 'HUMAN VALUE', label: '人柄・感情価値' }),
        area('assets.customer_asset', { en: 'CUSTOMER ASSET', label: '顧客・コミュニティ' }),
        area('assets.business_asset', { en: 'BUSINESS ASSET', label: '設備・場所・商品・仕組み' }),
        area('assets.other', { en: 'OTHER', label: 'その他' }))
    ]);

    /* 02 UNTAPPED VALUE */
    var untapped = section('untapped', '02', 'UNTAPPED VALUE', '価値の「漏れ」',
      '持っているのに、まだ商品・価格・発信・\n顧客体験・売上へ十分変換されていない価値は何か。', [
      source([
        { label: '商品と価格', ids: ['products.list', 'products.core', 'products.grow', 'products.reduce', 'service_structure.rankings', 'service_structure.wish_products'] },
        { label: '継続と顧客体験', ids: ['service_structure.continuous', 'service_structure.followups', 'customer_route.retention'] },
        { label: '発信と入口', ids: ['customer_route.tools', 'customer_route.main_source', 'customer_route.booking_entry', 'customer_route.feelings'] },
        { label: '数字', ids: ['financial_current.annual_2025', 'financial_current.recent_3months', 'financial_current.best_month', 'financial_current.monthly_customers', 'financial_current.feelings'] }
      ]),
      el('div', { class: 'an-grid' },
        area('untapped_value.skill', { en: 'SKILL', label: '技術の漏れ' }),
        area('untapped_value.knowledge', { en: 'KNOWLEDGE', label: '知識の漏れ' }),
        area('untapped_value.experience', { en: 'EXPERIENCE', label: '経験の漏れ' }),
        area('untapped_value.product', { en: 'PRODUCT', label: '商品の漏れ' }),
        area('untapped_value.price', { en: 'PRICE', label: '価格の漏れ' }),
        area('untapped_value.communication', { en: 'COMMUNICATION', label: '発信の漏れ' }),
        area('untapped_value.continuity', { en: 'CONTINUITY', label: '継続の漏れ' }),
        area('untapped_value.customer_experience', { en: 'CUSTOMER EXPERIENCE', label: '顧客体験の漏れ' }),
        area('untapped_value.other', { en: 'OTHER', label: 'その他' })),
      area('untapped_value.biggest', { en: 'THE BIGGEST', label: '一番大きく眠っている価値', size: 'lg', rows: 4 })
    ]);

    /* 03 BOTTLENECK */
    var BN = ['商品', '価格', '集客', 'リピート / 継続', '導線', '利益', '時間', '本人依存', 'チーム', '意思決定', 'ブランド / 見え方', 'その他'];
    var primaryWrap = el('div', {});
    function drawPrimary() {
      primaryWrap.innerHTML = '';
      primaryWrap.appendChild(chips('bottleneck.primary', BN, { aria: 'PRIMARY BOTTLENECK' }));
    }
    drawPrimary();
    var selfCol = el('div', { class: 'an-compare__col an-compare__col--self' },
      el('p', { class: 'an-compare__head' }, el('span', { text: 'CLIENT VIEW' }), '本人が感じている課題'),
      el('dl', { class: 'src__list' }, ['self_perceived_bottleneck.areas', 'self_perceived_bottleneck.top3', 'self_perceived_bottleneck.key_one'].map(answerEntry)));
    var nanaeCol = el('div', { class: 'an-compare__col an-compare__col--nanae' },
      el('p', { class: 'an-compare__head' }, el('span', { text: 'NANAE’S VIEW' }), 'ななえが見ている本当のボトルネック'),
      el('p', { class: 'an-hint', text: '複数選べます。' }),
      chips('bottleneck.areas', BN, { multiple: true, aria: 'ななえが見ている本当のボトルネック' }),
      area('bottleneck.areas_note', { label: '補足（その他・具体的に）', rows: 1 }));
    var bottleneck = section('bottleneck', '03', 'BOTTLENECK', '事業の「詰まり」',
      '本人が感じている課題と、\n本当に全体を止めているものは、同じとは限らない。', [
      el('div', { class: 'an-compare' }, selfCol, el('span', { class: 'an-compare__arrow', 'aria-hidden': 'true', text: '→' }), nanaeCol),
      source([{ label: 'あわせて見たい本人の言葉', ids: ['self_perceived_bottleneck.wish', 'customer_route.feelings', 'financial_current.feelings', 'business_structure.team', 'future_6m.decrease'] }]),
      el('div', { class: 'an-key' },
        el('p', { class: 'an-label' }, el('span', { class: 'an-label__en', text: 'PRIMARY BOTTLENECK' }), el('span', { class: 'an-label__ja', text: '今、全体を最も止めているもの' })),
        primaryWrap,
        area('bottleneck.primary_note', { label: 'ひとことで（自由記述）', rows: 1 })),
      area('bottleneck.why', { en: 'WHY?', label: 'なぜここが詰まっていると考えたか', size: 'lg', rows: 4 })
    ]);

    /* 04 BUSINESS STRUCTURE */
    var VIEWS = [
      ['body_dependency', '01', 'BODY DEPENDENCY', '肉体依存度', '売上のうち、本人が実際に手や身体を動かさないと生まれない部分はどこか？'],
      ['owner_dependency', '02', 'OWNER DEPENDENCY', '本人依存度', 'この人がいないと止まる仕事・判断・顧客体験は何か？'],
      ['continuity', '03', 'CONTINUITY', '継続収益度', '一度出会ったお客様と、その後も価値提供と売上が続く仕組みはあるか？'],
      ['knowledge_asset', '04', 'KNOWLEDGE ASSET', '眠っている知識資産', '本人の頭の中にあるのに、まだ商品や仕組みになっていない知識・判断・経験は何か？'],
      ['decision_structure', '05', 'DECISION STRUCTURE', '意思決定構造', '事業の重要なことを、誰がどのように決めているか？\n意思決定を止めているものはあるか？']
    ];
    var structure = section('structure', '04', 'BUSINESS STRUCTURE', '事業の「構造」',
      '点数をつけるためではなく、\n観察するための5つの視点。', [
      source([
        { label: '提供の形と体制', ids: ['business_current.form', 'business_current.styles', 'products.list', 'business_structure.team', 'future_1y.team', 'future_1y.time_focus'] },
        { label: '継続', ids: ['service_structure.continuous', 'service_structure.followups', 'customer_route.retention', 'financial_current.monthly_customers'] },
        { label: '頭の中にあるもの', ids: ['knowledge.fields', 'skills.insight', 'proof.accumulated', 'qualifications.backgrounds'] }
      ]),
      VIEWS.map(function (v) {
        return el('article', { class: 'an-view' },
          el('header', { class: 'an-view__head' },
            el('span', { class: 'an-view__no', text: v[1] }),
            el('h3', { class: 'an-view__en', text: v[2] }),
            el('span', { class: 'an-view__ja', text: v[3] })),
          el('p', { class: 'an-question an-view__q' }, lines(v[4])),
          el('div', { class: 'an-view__trio' },
            area('business_structure.' + v[0] + '.observation', { en: 'OBSERVATION', label: '今見えていること' }),
            area('business_structure.' + v[0] + '.risk', { en: 'RISK', label: 'このままだと起こりうること（分析メモ）' }),
            area('business_structure.' + v[0] + '.opportunity', { en: 'OPPORTUNITY', label: '変えた場合の可能性' })));
      })
    ]);

    /* 05 POTENTIAL */
    var potential = section('potential', '05', 'POTENTIAL', 'まだ売上になっていない可能性',
      'ASSETS × CUSTOMER × AFTER × BUSINESS STRUCTURE\nを見ながら、その人固有の可能性を。', [
      source([
        { label: 'お客様と、その先の変化', ids: ['customer_problem.problems', 'customer_desired_future.text', 'provider_possible_future.after_inner', 'provider_possible_future.after_physical', 'provider_possible_future.after_behavior', 'provider_possible_future.after_environment', 'provider_possible_future.after_social_reaction', 'provider_possible_future.after_day_in_life', 'customer_target.want_to_help', 'customer_target.not_fit'] },
        { label: '本人が描いているもの', ids: ['service_structure.wish_products', 'future_6m.grow_product', 'future_1y.business', 'visual_preference.worlds', 'visual_preference.references'] }
      ]),
      chips('potential.types', ['既存商品の再設計', '高単価化', '継続商品', 'ホームケア', '知識商品', 'オンライン化', 'コミュニティ', '物販', '法人向け', '他者へ任せられる商品', '新規事業', 'ブランド再設計', 'その他'], { multiple: true, aria: '可能性の種類' }),
      area('potential.notes', { label: '補足（その他・具体的に）', rows: 1 }),
      area('potential.unique', { en: 'ONLY THIS PERSON', label: 'この人だから作れる可能性', size: 'lg', rows: 5 })
    ]);

    /* 06 KEY LEVER */
    var keylever = section('keylever', '06', 'KEY LEVER', 'ここを動かせば、全体が動く。', null, [
      source([{ label: '本人が望んでいること', ids: ['self_perceived_bottleneck.wish', 'future_1y.ideal_day', 'session_goal.today'] }]),
      el('div', { class: 'an-lever' },
        area('key_lever.lever', { size: 'xl', rows: 4, label: 'KEY LEVER',
          question: '全部を一度に変えないとしたら、\n今、どこを1つ動かすと\n他の問題まで連動して変わるか？' }),
        el('div', { class: 'an-grid an-grid--2' },
          area('key_lever.why', { en: 'WHY THIS?', label: 'なぜ、ここなのか', rows: 3 }),
          area('key_lever.what_changes', { en: 'WHAT CHANGES?', label: 'ここが変わると、何が連動して変わるのか', rows: 3 })))
    ]);

    /* 07 PRIORITY */
    var PR = [['now', 'NOW', '今すぐ'], ['next', 'NEXT', '次に'], ['later', 'LATER', 'そのあと'], ['not_now', 'NOT NOW', '今は、やらない']];
    var priority = section('priority', '07', 'PRIORITY', 'やることより、順番を決める。',
      'やることを増やすカルテではなく、\nやらないことまで決めるカルテ。', [
      el('div', { class: 'an-priority' }, PR.map(function (p) {
        return el('div', { class: 'an-prio an-prio--' + p[0] },
          el('p', { class: 'an-prio__head' }, el('span', { class: 'an-prio__en', text: p[1] }), el('span', { class: 'an-prio__ja', text: p[2] })),
          list('priority.' + p[0], { label: p[1], max: 3, placeholder: p[0] === 'not_now' ? '例：今はSNSを増やさない' : '' }));
      }))
    ]);

    /* SESSION NOTE / NEXT COMPASS */
    var note = section('note', '—', 'SESSION NOTE', '今日の対話で見えたこと', null, [
      area('session_note', { size: 'xl', rows: 6, label: '今日の対話で見えたこと' }),
      area('next_compass', { en: 'NEXT COMPASS', size: 'lg', rows: 4, label: 'クライアントへ渡す1枚の羅針盤に、必ず残したいこと' })
    ]);

    var backup = el('footer', { class: 'an-foot' },
      el('button', { type: 'button', class: 'btn-line', onclick: exportAnalysis }, '裏カルテを書き出す（JSON）'),
      el('p', { class: 'an-foot__note', text: '裏カルテは、本人の回答とは別の場所に、この端末へ自動保存されます。' }));

    root.appendChild(header);
    root.appendChild(nav);
    root.appendChild(el('main', { class: 'an-main' }, el('div', { class: 'an-all' }, allAnswers()), assets, untapped, bottleneck, structure, potential, keylever, priority, note, backup));

    /* ナビ：いま見ているセクションを示す */
    var links = {};
    Array.prototype.forEach.call(document.querySelectorAll('.an-nav__link'), function (a) {
      links[a.dataset.target] = a;
      a.addEventListener('click', function (e) {
        e.preventDefault();
        var t = document.getElementById(a.dataset.target);
        var y = t.getBoundingClientRect().top + window.scrollY - nav.offsetHeight - 8;
        window.scrollTo({ top: y, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
        history.replaceState(null, '', '#' + a.dataset.target);
      });
    });
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          Object.keys(links).forEach(function (k) { links[k].classList.toggle('is-current', k === en.target.id); if (k === en.target.id) links[k].setAttribute('aria-current', 'true'); else links[k].removeAttribute('aria-current'); });
        });
      }, { rootMargin: '-30% 0px -60% 0px' });
      NAV.forEach(function (n) { io.observe(document.getElementById(n[0])); });
    }
  }

  function exportAnalysis() {
    var out = {
      app: 'BUSINESS COMPASS',
      schema: 'business-compass.private-analysis/1',
      exportedAt: new Date().toISOString(),
      session_date: doc.session_date,
      client: { name: summaryText('profile.name'), brand: summaryText('profile.brand_names'), source: doc.client_snapshot ? doc.client_snapshot.file : 'local' },
      consultant_analysis: A
    };
    var blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
    var a = el('a', { href: URL.createObjectURL(blob), download: 'business-compass-private-analysis.json' });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }

  build();
  window.BusinessCompassAnalysis = { doc: doc, save: function () { save(true); } };
})();
