/* =====================================================================
   BUSINESS COMPASS — FIELDS
   ---------------------------------------------------------------------
   入力形式ごとの「描画」「回答済み判定」「カルテ用の要約」
   「書き出し用の値」を1か所にまとめたレジストリ。
   新しい入力形式を増やすときは BCFields.types に
   { render, isAnswered, summarize, value } を追加します。

   ctx = { get(key), set(key, value), labelledby }
   保存キーは質問ID（意味を持つID）、または「質問ID.項目ID」。
   ===================================================================== */

(function () {

  /* ---------- 小さなDOMヘルパー ---------- */
  function el(tag, props) {
    var node = document.createElement(tag);
    props = props || {};
    Object.keys(props).forEach(function (k) {
      var v = props[k];
      if (v == null || v === false) return;
      if (k === 'class') node.className = v;
      else if (k === 'text') node.textContent = v;
      else if (k.slice(0, 2) === 'on') node.addEventListener(k.slice(2), v);
      else if (v === true) node.setAttribute(k, '');
      else node.setAttribute(k, v);
    });
    for (var i = 2; i < arguments.length; i++) append(node, arguments[i]);
    return node;
  }
  function append(node, child) {
    if (child == null || child === false) return;
    if (Array.isArray(child)) { child.forEach(function (c) { append(node, c); }); return; }
    node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  function lines(str) {
    var out = [];
    String(str || '').split('\n').forEach(function (s, i) {
      if (i) out.push(el('br'));
      out.push(s);
    });
    return out;
  }

  var uid = 0;
  function nextId(prefix) { uid += 1; return 'bc-' + prefix + '-' + uid; }
  function itemId() { return 'i' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  function filled(v) {
    if (v == null) return false;
    if (Array.isArray(v)) return v.some(filled);
    if (typeof v === 'object') return Object.keys(v).some(function (k) { return k !== '_id' && filled(v[k]); });
    return String(v).trim() !== '';
  }
  function clean(v) { return filled(v) ? v : null; }

  var UNKNOWN = 'わからない';
  var OTHER = 'その他';

  /* 他の質問のキーを指すための共有オブジェクト（app.js から設定） */
  var nav = { go: null };

  /* ---------- 選択肢の解決（固定／他の回答から動的に） ---------- */
  function norm(o) { return typeof o === 'string' ? { value: o, label: o } : o; }
  /* 値 → 表示名（{ value, label } の一覧から引く。見つからなければ値そのもの） */
  function labelFrom(list, value) {
    var hit = (list || []).map(norm).filter(function (o) { return o.value === value; })[0];
    return hit ? hit.label : value;
  }
  function withLabels(values, list) {
    return (values || []).map(function (v) { return { value: v, label: labelFrom(list, v) }; });
  }

  function dynamicOptions(src, get) {
    if (!src) return [];
    if (src.list) {
      return (get(src.list) || []).filter(function (it) { return it && filled(it[src.labelField || 'name']); })
        .map(function (it) { return { value: it._id, label: String(it[src.labelField || 'name']).trim() }; });
    }
    if (src.selected) {
      var v = get(src.selected);
      if ((!v || !v.length) && src.fallback) v = get(src.fallback);
      return withLabels((v || []).filter(function (x) { return x !== OTHER || src.keepOther; }), src.labels);
    }
    if (src.routeTools) {
      return withLabels((get(src.routeTools) || {}).tools || [], src.labels);
    }
    return [];
  }
  function resolveOptions(def, get) {
    var base = def.options ? def.options.map(norm) : [];
    if (def.groups) def.groups.forEach(function (g) { base = base.concat(g.options.map(norm)); });
    var dyn = dynamicOptions(def.optionsFrom, get);
    var extra = (def.extraOptions || []).map(norm);
    var seen = {};
    return base.concat(dyn, extra).filter(function (o) {
      if (seen[o.value]) return false; seen[o.value] = true; return true;
    });
  }
  function labelOf(def, get, value) {
    var hit = resolveOptions(def, get).filter(function (o) { return o.value === value; })[0];
    return hit ? hit.label : (def.optionsFrom && def.optionsFrom.list ? null : value);
  }
  function labelsOf(def, get, values) {
    return (values || []).map(function (v) { return labelOf(def, get, v); }).filter(Boolean);
  }

  /* ---------- 基本入力 ---------- */
  function autoGrow(ta) {
    ta.style.height = 'auto';
    ta.style.height = ta.scrollHeight + 2 + 'px';
  }

  function input(def, key, ctx, opts) {
    opts = opts || {};
    var type = def.type;
    var value = ctx.get(key);
    var id = opts.id || nextId('in');
    var numeric = type === 'number' || type === 'currency';
    var common = {
      id: id,
      class: type === 'textarea' ? 'ink-area' : 'ink-line',
      placeholder: def.placeholder || '',
      'aria-labelledby': opts.labelledby || null,
      'aria-label': opts.ariaLabel || null,
      autocomplete: def.autocomplete || 'off',
      oninput: function (e) {
        var v = e.target.value;
        if (numeric) v = v.replace(/[,，\s]/g, '');
        ctx.set(key, v);
        if (type === 'textarea') autoGrow(e.target);
        if (opts.onChange) opts.onChange(v);
      }
    };
    var node;
    if (type === 'textarea') {
      node = el('textarea', Object.assign(common, { rows: def.rows || 3 }));
      node.value = value || '';
      requestAnimationFrame(function () { autoGrow(node); });
    } else {
      if (numeric) { common.inputmode = 'numeric'; common.type = 'text'; }
      else if (type === 'url') { common.type = 'url'; common.inputmode = 'url'; common.spellcheck = 'false'; }
      else if (type === 'date') { common.type = 'date'; common.class += ' ink-line--date'; }
      else { common.type = 'text'; }
      node = el('input', common);
      node.value = value && value !== UNKNOWN ? value : '';
    }
    if (def.unit) {
      return el('div', { class: 'ink-unit' }, node, el('span', { class: 'ink-unit__label', 'aria-hidden': 'true', text: def.unit }));
    }
    return node;
  }

  /* 金額：単位つきの数字＋「わからない」 */
  function currency(def, key, ctx, opts) {
    opts = opts || {};
    var wrap = el('div', { class: 'money' });
    var box = input(Object.assign({}, def, { type: 'currency', unit: def.unit || '万円' }), key, ctx, opts);
    wrap.appendChild(box);
    if (def.unknown) {
      var field = box.querySelector('input');
      var chk = el('input', { type: 'checkbox', class: 'tile__input', onchange: function () {
        ctx.set(key, chk.checked ? UNKNOWN : '');
        sync();
      } });
      chk.checked = ctx.get(key) === UNKNOWN;
      function sync() {
        field.disabled = chk.checked;
        if (chk.checked) field.value = '';
        wrap.classList.toggle('is-unknown', chk.checked);
      }
      field.addEventListener('input', function () { if (chk.checked) { chk.checked = false; sync(); } });
      wrap.appendChild(el('label', { class: 'tile tile--mini money__unknown' }, chk, el('span', { class: 'tile__text', text: UNKNOWN })));
      sync();
    }
    return wrap;
  }
  function formatMoney(def, v) {
    if (!filled(v)) return null;
    if (v === UNKNOWN) return UNKNOWN;
    var n = Number(v);
    return (isNaN(n) ? v : n.toLocaleString('ja-JP')) + ' ' + (def.unit || '万円');
  }

  /* 見出し付きの小さな入力（group / followups / repeat で共用） */
  function labeled(def, key, ctx) {
    var id = nextId('f');
    var isChoice = def.type === 'choice' || def.type === 'repeat';
    var short = def.type === 'number' || def.type === 'currency' || def.type === 'date';
    return el('div', { class: 'sub-field' + (short ? ' sub-field--short' : '') },
      isChoice
        ? el('p', { class: 'sub-field__label', id: id }, lines(def.label))
        : el('label', { class: 'sub-field__label', for: id }, lines(def.label)),
      def.hint ? el('p', { class: 'sub-field__hint', text: def.hint }) : null,
      part(def, key, ctx, { id: id, labelledby: isChoice ? id : null })
    );
  }

  /* 入力パーツの振り分け */
  function part(def, key, ctx, opts) {
    opts = opts || {};
    if (def.type === 'currency') return currency(def, key, ctx, opts);
    if (def.type === 'choice') return choice(def, key, ctx, opts);
    if (def.type === 'repeat') return repeatList(def, key, ctx, opts);
    return input(def, key, ctx, opts);
  }

  function formatValue(def, v, get) {
    if (!filled(v)) return null;
    if (def.type === 'currency') return formatMoney(def, v);
    if (def.type === 'choice') {
      var ls = def.multiple ? labelsOf(def, get, v) : [labelOf(def, get, v)].filter(Boolean);
      return ls.length ? ls.join('・') : null;
    }
    return def.unit ? v + ' ' + def.unit : String(v);
  }
  function partValue(def, v, get) {
    if (!filled(v)) return null;
    if (def.type === 'choice') return def.multiple ? labelsOf(def, get, v) : labelOf(def, get, v);
    if (def.type === 'currency') return v === UNKNOWN ? UNKNOWN : { amount: Number(v), unit: def.unit || '万円' };
    if (def.type === 'repeat') return repeatValue(def, v, get);
    if (def.type === 'number' && !isNaN(Number(v))) return Number(v);
    return v;
  }

  /* ---------- 選択タイル ---------- */
  function tiles(options, cfg) {
    var wrap = el('div', { class: 'tiles' + (cfg.small ? ' tiles--small' : '') });
    var name = nextId('opt');
    options.forEach(function (o) {
      o = norm(o);
      var box = el('input', {
        type: cfg.multiple ? 'checkbox' : 'radio', name: name, value: o.value, class: 'tile__input',
        onchange: function () { cfg.onToggle(o.value, box.checked); }
      });
      if (!cfg.multiple) {
        /* 選択中のラジオをもう一度押すと解除できる */
        box.addEventListener('click', function () {
          if (box.dataset.was === '1') { box.checked = false; cfg.onToggle(o.value, false); }
        });
        box.addEventListener('pointerdown', function () { box.dataset.was = box.checked ? '1' : '0'; });
        box.addEventListener('keydown', function () { box.dataset.was = '0'; });
      }
      var swatch = o.swatch ? el('span', { class: 'swatch', 'aria-hidden': 'true', style: 'background:' + o.swatch }) : null;
      wrap.appendChild(el('label', { class: 'tile' + (swatch ? ' tile--swatch' : '') }, box,
        el('span', { class: 'tile__text' }, swatch, o.label)));
    });
    wrap.refresh = function () {
      Array.prototype.forEach.call(wrap.querySelectorAll('input'), function (b) {
        b.checked = cfg.isOn(b.value);
        b.disabled = cfg.isDisabled ? cfg.isDisabled(b.value) : false;
        b.parentNode.classList.toggle('is-disabled', b.disabled);
      });
    };
    wrap.refresh();
    return wrap;
  }

  function toggleIn(list, opt, on, def, order) {
    list = (list || []).slice();
    var ex = def.exclusive || [];
    if (on) {
      if (ex.indexOf(opt) >= 0) list = [];
      else list = list.filter(function (x) { return ex.indexOf(x) < 0; });
      if (list.indexOf(opt) < 0) list.push(opt);
    } else {
      list = list.filter(function (x) { return x !== opt; });
    }
    return list.sort(function (a, b) { return order.indexOf(a) - order.indexOf(b); });
  }

  function matches(when, value) {
    if (!when) return true;
    var arr = Array.isArray(value) ? value : (filled(value) ? [value] : []);
    if (when.anyOf) return arr.some(function (v) { return when.anyOf.indexOf(v) >= 0; });
    if (when.notOnly) return arr.some(function (v) { return when.notOnly.indexOf(v) < 0; });
    return arr.length > 0;
  }

  /* 他の回答から選択肢を作るとき、元がまだ空ならそっと案内する */
  function emptyNote(def) {
    var n = def.emptyNote;
    if (!n) return null;
    return el('p', { class: 'field__empty' }, n.text,
      n.goto && nav.go ? el('button', { type: 'button', class: 'text-btn', onclick: function () { nav.go(n.goto); } }, n.link || '入力しに戻る') : null);
  }

  /* 小さな選択（repeat / followups の中で使う） */
  function choice(def, key, ctx, opts) {
    var options = resolveOptions(def, ctx.get);
    if (!options.length) return emptyNote(def) || el('p', { class: 'field__empty', text: '選択肢がまだありません' });
    var order = options.map(function (o) { return o.value; });
    var t = tiles(options, {
      multiple: !!def.multiple, small: def.small !== false,
      isOn: function (o) { var v = ctx.get(key); return def.multiple ? (v || []).indexOf(o) >= 0 : v === o; },
      isDisabled: function (o) {
        var cur = ctx.get(key) || [];
        return !!(def.multiple && def.max) && cur.length >= def.max && cur.indexOf(o) < 0;
      },
      onToggle: function (o, on) {
        if (def.multiple) ctx.set(key, toggleIn(ctx.get(key), o, on, def, order));
        else ctx.set(key, on ? o : '');
        t.refresh();
        syncOther();
        if (opts && opts.onChange) opts.onChange();
      }
    });
    /* 「その他」を選んだときだけ出る記入欄（保存キーは「キー.other」） */
    var otherBox = null;
    function syncOther() {
      if (!def.otherText) return;
      var v = ctx.get(key);
      var show = def.multiple ? (v || []).indexOf(OTHER) >= 0 : v === OTHER;
      if (show && !otherBox) {
        otherBox = el('div', { class: 'choice__other is-shown' }, labeled({ type: 'text', label: 'その他の内容', placeholder: '自由にどうぞ' }, key + '.other', ctx));
        wrap.appendChild(otherBox);
      }
      if (otherBox) otherBox.hidden = !show;
    }
    var hasDyn = def.optionsFrom && !dynamicOptions(def.optionsFrom, ctx.get).length;
    var wrap = el('div', { role: def.multiple ? 'group' : 'radiogroup', 'aria-labelledby': opts && opts.labelledby }, t, hasDyn ? emptyNote(def) : null);
    syncOther();
    return wrap;
  }

  /* ---------- くり返し入力（商品・URL・言葉など） ---------- */
  function repeatList(def, key, ctx, opts) {
    var min = def.min == null ? 1 : def.min, max = def.max || 10;
    var compact = def.fields.length === 1;
    var list = el(compact ? 'ul' : 'ol', { class: compact ? 'repeat repeat--compact' : 'repeat' });
    var addBtn = el('button', { type: 'button', class: 'text-btn repeat__add', onclick: function () {
      var items = read(); if (items.length >= max) return;
      items.push({ _id: itemId() }); ctx.set(key, items); draw(items.length - 1);
    } }, def.addLabel || '＋ 追加する');

    function read() {
      var v = ctx.get(key);
      v = Array.isArray(v) ? v.slice() : [];
      var changed = false;
      while (v.length < min) { v.push({ _id: itemId() }); changed = true; }
      v = v.map(function (it) { if (!it._id) { changed = true; return Object.assign({ _id: itemId() }, it); } return it; });
      if (changed) ctx.set(key, v);
      return v;
    }
    function partCtx(i) {
      return {
        get: function (k) {
          var it = read()[i] || {};
          return (k in it || k.indexOf('.') < 0) ? it[k] : ctx.get(k); /* 「章.項目」形式のキーは全体の回答から */
        },
        set: function (k, val) {
          var items = read();
          items[i] = Object.assign({}, items[i]);
          items[i][k] = val;
          ctx.set(key, items);
          if (def.onItemChange) def.onItemChange();
        }
      };
    }
    function draw(focusIndex) {
      var items = read();
      list.innerHTML = '';
      items.forEach(function (item, i) {
        var c = partCtx(i);
        var n = String(i + 1).padStart(2, '0');
        var remove = items.length > min ? el('button', { type: 'button', class: 'text-btn text-btn--quiet repeat__remove',
          'aria-label': (def.itemLabel || '項目') + ' ' + n + ' を削除', onclick: function () {
            var all = read(); all.splice(i, 1); ctx.set(key, all); draw();
          } }, compact ? '×' : '削除') : null;
        if (compact) {
          var f = def.fields[0];
          list.appendChild(el('li', { class: 'repeat__row' },
            el('span', { class: 'repeat__num', 'aria-hidden': 'true', text: n }),
            input(f, f.id, c, { ariaLabel: (def.itemLabel || f.label || '') + ' ' + n }),
            remove));
        } else {
          list.appendChild(el('li', { class: 'repeat__card' },
            el('div', { class: 'repeat__head' },
              el('span', { class: 'repeat__no', text: (def.itemEn || 'ITEM') + ' ' + n }), remove),
            def.fields.map(function (f) { return labeled(f, f.id, c); })));
        }
      });
      addBtn.hidden = items.length >= max;
      if (focusIndex != null) {
        var target = list.children[focusIndex];
        if (target) {
          target.classList.add('is-new');
          var fi = target.querySelector('input, textarea'); if (fi) fi.focus({ preventScroll: true });
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }
    draw();
    return el('div', { class: 'repeat-wrap', role: 'group', 'aria-labelledby': opts && opts.labelledby }, list, addBtn);
  }
  function repeatItems(v) {
    return (Array.isArray(v) ? v : []).filter(filled);
  }
  function repeatValue(def, v, get) {
    var items = repeatItems(v);
    if (!items.length) return null;
    return items.map(function (it) {
      if (def.fields.length === 1) return it[def.fields[0].id];
      var o = { id: it._id };
      def.fields.forEach(function (f) {
        var val = partValue(f, it[f.id], function (k) { return k in it ? it[k] : get(k); });
        if (val != null) o[f.id] = val;
      });
      return o;
    });
  }
  function repeatSummary(def, v, get) {
    var items = repeatItems(v);
    if (!items.length) return null;
    if (def.fields.length === 1) return { items: items.map(function (it) { return it[def.fields[0].id]; }) };
    return { cards: items.map(function (it) {
      var g = function (k) { return k in it ? it[k] : get(k); };
      var rows = def.fields.map(function (f) {
        var t = formatValue(f, it[f.id], g);
        return t ? { label: f.label, text: t } : null;
      }).filter(Boolean);
      return { rows: rows };
    }) };
  }

  /* =================================================================== */
  var types = {};

  /* followups・「その他」・選択肢ごとの詳細を描く共通の仕組み */
  function extras(q, ctx, container) {
    var built = [];
    var blocks = (q.followups || []).slice();
    var opts = resolveOptions(q, ctx.get).map(function (o) { return o.value; });
    if (opts.indexOf(OTHER) >= 0 && !q.noOther) {
      blocks.push({ when: { anyOf: [OTHER] }, fields: [{ id: 'other', type: 'text', label: 'その他の内容', placeholder: '自由にどうぞ' }] });
    }
    var detailBox = q.perOption ? el('div', { class: 'per-option', 'aria-live': 'polite' }) : null;
    if (detailBox) container.appendChild(detailBox);

    function sync() {
      var val = ctx.get(q.id);
      blocks.forEach(function (fu, i) {
        var show = matches(fu.when, val);
        if (show && !built[i]) {
          built[i] = el('div', { class: 'followup' + (fu.when ? '' : ' followup--always') },
            fu.title ? el('p', { class: 'followup__title', text: fu.title }) : null,
            fu.fields.map(function (f) { return labeled(f, q.id + '.' + f.id, ctx); }));
          container.appendChild(built[i]);
        }
        if (built[i]) {
          built[i].hidden = !show;
          if (show && fu.when) built[i].classList.add('is-shown');
        }
      });
      if (detailBox) drawDetails();
    }
    function drawDetails() {
      var sel = (ctx.get(q.id) || []).filter(function (v) { return (q.exclusive || []).indexOf(v) < 0; });
      var dKey = q.id + '.details';
      detailBox.innerHTML = '';
      if (!sel.length) return;
      detailBox.appendChild(el('p', { class: 'route__title' }, el('span', { class: 'eyebrow', text: 'DETAIL' }), q.perOption.title));
      if (q.perOption.hint) detailBox.appendChild(el('p', { class: 'q__hint', text: q.perOption.hint }));
      var rows = el('ul', { class: 'route__list' });
      sel.forEach(function (opt) {
        var label = labelOf(q, ctx.get, opt) || opt;
        var c = {
          get: function (k) { return ((ctx.get(dKey) || {})[opt] || {})[k]; },
          set: function (k, v) {
            var all = Object.assign({}, ctx.get(dKey) || {});
            all[opt] = Object.assign({}, all[opt]); all[opt][k] = v;
            ctx.set(dKey, all);
          }
        };
        rows.appendChild(el('li', { class: 'route__row per-option__row' },
          el('span', { class: 'route__tool', text: label }),
          el('div', { class: 'per-option__fields' }, q.perOption.fields.map(function (f) {
            var id = nextId('d');
            return el('div', { class: 'per-option__field' },
              el('label', { class: 'sub-field__label', for: id, text: f.label }),
              input(f, f.id, c, { id: id }));
          }))));
      });
      detailBox.appendChild(rows);
    }
    sync();
    return sync;
  }
  function extrasSummary(q, get, out) {
    var val = get(q.id);
    var rows = [];
    (q.followups || []).forEach(function (fu) {
      if (!matches(fu.when, val)) return;
      fu.fields.forEach(function (f) {
        var t = f.type === 'repeat' ? null : formatValue(f, get(q.id + '.' + f.id), get);
        if (t) rows.push({ label: f.label, text: t });
        if (f.type === 'repeat') {
          var s = repeatSummary(f, get(q.id + '.' + f.id), get);
          if (s && s.cards) s.cards.forEach(function (c) {
            rows.push({ label: f.itemLabel || f.label, text: c.rows.map(function (r) { return r.text; }).join(' ／ ') });
          });
          if (s && s.items) rows.push({ label: f.label, text: s.items.join('　') });
        }
      });
    });
    var other = get(q.id + '.other');
    if (filled(other) && matches({ anyOf: [OTHER] }, val)) rows.push({ label: 'その他', text: other });
    if (q.perOption) {
      var d = get(q.id + '.details') || {};
      (Array.isArray(val) ? val : []).forEach(function (opt) {
        var t = q.perOption.fields.map(function (f) {
          var v = (d[opt] || {})[f.id];
          return filled(v) ? f.label.replace(/[？?]$/, '') + '：' + v + (f.unit ? f.unit : '') : null;
        }).filter(Boolean);
        if (t.length) rows.push({ label: labelOf(q, get, opt) || opt, text: t.join(' ／ ') });
      });
    }
    if (rows.length) out.rows = (out.rows || []).concat(rows);
    return out;
  }
  function extrasValue(q, get, out) {
    var val = get(q.id);
    (q.followups || []).forEach(function (fu) {
      if (!matches(fu.when, val)) return;
      fu.fields.forEach(function (f) {
        var v = partValue(f, get(q.id + '.' + f.id), get);
        if (v != null) out[f.key || f.id] = v;
      });
    });
    var other = get(q.id + '.other');
    if (filled(other) && matches({ anyOf: [OTHER] }, val)) out.other = other;
    if (q.perOption) {
      var d = get(q.id + '.details') || {};
      var details = {};
      (Array.isArray(val) ? val : []).forEach(function (opt) {
        if (filled(d[opt])) details[labelOf(q, get, opt) || opt] = d[opt];
      });
      if (filled(details)) out.details = details;
    }
    return out;
  }

  /* ---------- 1項目の入力 ---------- */
  ['text', 'textarea', 'number', 'url', 'date', 'currency'].forEach(function (t) {
    types[t] = {
      render: function (q, ctx) {
        return el('div', { class: 'field field--' + t }, part(q, q.id, ctx, { labelledby: ctx.labelledby }));
      },
      isAnswered: function (q, get) { return filled(get(q.id)); },
      summarize: function (q, get) {
        var v = get(q.id);
        if (t === 'date' && filled(v)) {
          var d = new Date(v);
          return { text: isNaN(d) ? v : d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日' };
        }
        var f = formatValue(q, v, get);
        return f ? { text: f } : null;
      },
      value: function (q, get) { return partValue(q, get(q.id), get); }
    };
  });

  /* 小さな入力をいくつか並べる（直近3ヶ月の売上など） */
  /* saveAs があればその独立したキーに、なければ「質問ID.項目ID」に保存する */
  function fieldKey(q, f) { return f.saveAs || q.id + '.' + f.id; }
  function fieldValue(f, key, get) {
    var v = partValue(f, get(key), get);
    var other = get(key + '.other');
    if (f.otherText && v != null && filled(other)) v = { selected: v, other: other };
    return v;
  }
  types.group = {
    render: function (q, ctx) {
      return el('div', { class: 'field field--group' + (q.inline ? ' field--inline' : ''), role: 'group', 'aria-labelledby': ctx.labelledby },
        q.fields.map(function (f) { return labeled(f, fieldKey(q, f), ctx); }));
    },
    isAnswered: function (q, get) {
      return q.fields.some(function (f) { return filled(get(fieldKey(q, f))); });
    },
    summarize: function (q, get) {
      var rows = q.fields.map(function (f) {
        var v = formatValue(f, get(fieldKey(q, f)), get);
        var other = get(fieldKey(q, f) + '.other');
        if (v && f.otherText && filled(other)) v += '（' + other + '）';
        return v ? { label: f.label, text: v } : null;
      }).filter(Boolean);
      return rows.length ? { rows: rows } : null;
    },
    value: function (q, get) {
      var o = {};
      q.fields.forEach(function (f) {
        var v = fieldValue(f, fieldKey(q, f), get);
        if (v != null) o[f.key || f.id] = v;
      });
      return clean(o);
    },
    /* 書き出し用：saveAs のある項目は、それぞれ独立したキーとして書き出す */
    entries: function (q, get) {
      if (!q.fields.some(function (f) { return f.saveAs; })) return null;
      return q.fields.map(function (f) { return { key: fieldKey(q, f), value: fieldValue(f, fieldKey(q, f), get) }; });
    }
  };

  /* ---------- 単一選択 ---------- */
  types.single = {
    render: function (q, ctx) {
      var options = resolveOptions(q, ctx.get);
      var wrap = el('div', { class: 'field field--single' });
      if (q.optionsFrom && !dynamicOptions(q.optionsFrom, ctx.get).length) {
        var n = emptyNote(q); if (n) wrap.appendChild(n);
      }
      var sync;
      var t = tiles(options, {
        isOn: function (o) { return ctx.get(q.id) === o; },
        onToggle: function (o, on) { ctx.set(q.id, on ? o : ''); t.refresh(); if (sync) sync(); }
      });
      wrap.appendChild(el('div', { role: 'radiogroup', 'aria-labelledby': ctx.labelledby }, t));
      sync = extras(q, ctx, wrap);
      return wrap;
    },
    isAnswered: function (q, get) { return filled(get(q.id)); },
    summarize: function (q, get) {
      var v = get(q.id);
      if (!filled(v)) return null;
      var l = labelOf(q, get, v);
      return l ? extrasSummary(q, get, { text: l }) : null;
    },
    value: function (q, get) {
      var v = get(q.id);
      if (!filled(v)) return null;
      var l = labelOf(q, get, v);
      if (!l) return null;
      var more = extrasValue(q, get, {});
      return filled(more) ? Object.assign({ selected: l }, more) : l;
    }
  };

  /* ---------- 複数選択 ---------- */
  types.multi = {
    render: function (q, ctx) {
      var wrap = el('div', { class: 'field field--multi' });
      var options = resolveOptions(q, ctx.get);
      var order = options.map(function (o) { return o.value; });
      if (q.optionsFrom && !dynamicOptions(q.optionsFrom, ctx.get).length) {
        var n = emptyNote(q); if (n) wrap.appendChild(n);
      }
      var sync;
      var all = [];
      var cfg = {
        multiple: true,
        isOn: function (o) { return (ctx.get(q.id) || []).indexOf(o) >= 0; },
        isDisabled: function (o) {
          var cur = ctx.get(q.id) || [];
          return !!q.max && cur.length >= q.max && cur.indexOf(o) < 0;
        },
        onToggle: function (o, on) {
          ctx.set(q.id, toggleIn(ctx.get(q.id), o, on, q, order));
          all.forEach(function (t) { t.refresh(); });
          if (sync) sync();
        }
      };
      var group = el('div', { role: 'group', 'aria-labelledby': ctx.labelledby });
      if (q.max) group.appendChild(el('p', { class: 'field__note', text: (q.maxSoft ? 'おすすめは ' : '最大 ') + q.max + ' つまで' }));
      if (q.groups) {
        q.groups.forEach(function (g) {
          var gid = nextId('g');
          var t = tiles(g.options, cfg); all.push(t);
          group.appendChild(el('div', { class: 'tile-group', role: 'group', 'aria-labelledby': gid },
            el('p', { class: 'tile-group__label', id: gid, text: g.label }), t));
        });
      } else {
        var t = tiles(options, q.max && q.maxSoft ? Object.assign({}, cfg, { isDisabled: null }) : cfg);
        all.push(t);
        group.appendChild(t);
      }
      wrap.appendChild(group);
      sync = extras(q, ctx, wrap);
      return wrap;
    },
    isAnswered: function (q, get) { return filled(get(q.id)); },
    summarize: function (q, get) {
      var v = labelsOf(q, get, get(q.id));
      if (!v.length) return null;
      return extrasSummary(q, get, { tags: v });
    },
    value: function (q, get) {
      var v = labelsOf(q, get, get(q.id));
      if (!v.length) return null;
      var more = extrasValue(q, get, {});
      return filled(more) ? Object.assign({ selected: v }, more) : v;
    }
  };

  /* ---------- 段階評価 ---------- */
  types.scale = {
    render: function (q, ctx) {
      var steps = [];
      for (var i = 1; i <= (q.steps || 5); i++) steps.push(String(i));
      var name = nextId('scale');
      var row = el('div', { class: 'scale__row' });
      steps.forEach(function (s) {
        var r = el('input', { type: 'radio', name: name, value: s, class: 'scale__input', 'aria-label': s + ' / ' + steps.length,
          onchange: function () { ctx.set(q.id, s); } });
        r.checked = ctx.get(q.id) === s;
        row.appendChild(el('label', { class: 'scale__step' }, r, el('span', { class: 'scale__dot', 'aria-hidden': 'true' }), el('span', { class: 'scale__num', text: s })));
      });
      return el('div', { class: 'field field--scale', role: 'radiogroup', 'aria-labelledby': ctx.labelledby },
        row,
        el('div', { class: 'scale__ends', 'aria-hidden': 'true' }, el('span', { text: q.minLabel || '' }), el('span', { text: q.maxLabel || '' })));
    },
    isAnswered: function (q, get) { return filled(get(q.id)); },
    summarize: function (q, get) {
      var v = get(q.id);
      return filled(v) ? { text: v + ' / ' + (q.steps || 5), meter: Number(v) / (q.steps || 5) } : null;
    },
    value: function (q, get) { var v = get(q.id); return filled(v) ? { value: Number(v), of: q.steps || 5 } : null; }
  };

  /* ---------- くり返し入力 ---------- */
  types.repeat = {
    render: function (q, ctx) {
      return el('div', { class: 'field field--repeat' }, repeatList(q, q.id, ctx, { labelledby: ctx.labelledby }));
    },
    isAnswered: function (q, get) { return repeatItems(get(q.id)).length > 0; },
    summarize: function (q, get) { return repeatSummary(q, get(q.id), get); },
    value: function (q, get) { return repeatValue(q, get(q.id), get); }
  };

  /* ---------- STORY：タイムライン ---------- */
  types.timeline = {
    render: function (q, ctx) {
      var min = q.min || 1, max = q.max || 5;
      var list = el('ol', { class: 'timeline' });
      var addBtn = el('button', { type: 'button', class: 'text-btn timeline__add', onclick: function () {
        var items = read(); if (items.length >= max) return;
        items.push({}); ctx.set(q.id, items); draw(items.length - 1);
      } }, '＋ 次の出来事を追加');
      var count = el('p', { class: 'timeline__count', 'aria-live': 'polite' });

      function read() {
        var v = ctx.get(q.id);
        v = Array.isArray(v) ? v.slice() : [];
        while (v.length < min) v.push({});
        return v;
      }
      function partCtx(i) {
        return {
          get: function (k) { return (read()[i] || {})[k]; },
          set: function (k, v) {
            var items = read();
            items[i] = Object.assign({}, items[i]);
            items[i][k] = v;
            ctx.set(q.id, items);
          }
        };
      }
      function draw(focusIndex) {
        var items = read();
        list.innerHTML = '';
        items.forEach(function (item, i) {
          var c = partCtx(i);
          var n = String(i + 1).padStart(2, '0');
          var removeBtn = items.length > min ? el('button', { type: 'button', class: 'text-btn text-btn--quiet timeline__remove',
            'aria-label': '出来事 ' + n + ' を削除', onclick: function () {
              var all = read(); all.splice(i, 1); ctx.set(q.id, all); draw();
            } }, '削除') : null;
          var ageId = nextId('age');
          list.appendChild(el('li', { class: 'timeline__item' },
            el('span', { class: 'timeline__node', 'aria-hidden': 'true' }),
            el('div', { class: 'timeline__card' },
              el('div', { class: 'timeline__head' },
                el('span', { class: 'timeline__no', text: 'EPISODE ' + n }), removeBtn),
              el('div', { class: 'timeline__age' },
                el('label', { class: 'sub-field__label', for: ageId }, q.ageLabel || '何歳ごろ？'),
                input({ type: 'number', unit: '歳ごろ', placeholder: '28' }, 'age', c, { id: ageId })),
              q.prompts.map(function (p) { return labeled(p, p.id, c); })
            )
          ));
        });
        addBtn.hidden = items.length >= max;
        count.textContent = items.length + ' / ' + max;
        if (focusIndex != null) {
          var target = list.children[focusIndex];
          if (target) {
            target.classList.add('is-new');
            var f = target.querySelector('input'); if (f) f.focus({ preventScroll: true });
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      }
      draw();
      return el('div', { class: 'field field--timeline', role: 'group', 'aria-labelledby': ctx.labelledby },
        list, el('div', { class: 'timeline__foot' }, addBtn, count));
    },
    isAnswered: function (q, get) { return filled(get(q.id)); },
    summarize: function (q, get) {
      var items = (get(q.id) || []).filter(filled);
      if (!items.length) return null;
      return { timeline: items.map(function (it) {
        return { age: it.age ? it.age + '歳ごろ' : '', event: it.event || '',
          subs: q.prompts.filter(function (p) { return p.id !== 'event' && filled(it[p.id]); })
            .map(function (p) { return { label: p.short || p.label, text: it[p.id] }; }) };
      }) };
    },
    value: function (q, get) {
      var items = (get(q.id) || []).filter(filled);
      if (!items.length) return null;
      return items.map(function (it) {
        var o = {};
        if (filled(it.age)) o.age = Number(it.age) || it.age;
        q.prompts.forEach(function (p) { if (filled(it[p.id])) o[p.key || p.id] = it[p.id]; });
        return o;
      });
    }
  };

  /* ---------- ROUTE：使っている道＋用途 ---------- */
  types.route = {
    render: function (q, ctx) {
      function read() {
        var v = ctx.get(q.id) || {};
        return { tools: v.tools || [], purposes: v.purposes || {} };
      }
      var panel = el('div', { class: 'route__purposes', 'aria-live': 'polite' });
      var otherBox = el('div', {});
      var toolValues = q.tools.map(function (o) { return norm(o).value; });
      var t = tiles(q.tools, {
        multiple: true,
        isOn: function (o) { return read().tools.indexOf(o) >= 0; },
        onToggle: function (o, on) {
          var v = read();
          v.tools = toggleIn(v.tools, o, on, q, toolValues);
          ctx.set(q.id, v);
          t.refresh();
          drawPanel();
          drawOther();
        }
      });
      var otherBuilt = null;
      function drawOther() {
        var show = read().tools.indexOf(OTHER) >= 0;
        if (show && !otherBuilt) {
          otherBuilt = el('div', { class: 'followup is-shown' }, labeled({ type: 'text', label: 'その他の内容', placeholder: '例：地域の情報誌' }, q.id + '.other', ctx));
          otherBox.appendChild(otherBuilt);
        }
        if (otherBuilt) otherBuilt.hidden = !show;
      }
      function drawPanel() {
        var v = read();
        panel.innerHTML = '';
        if (!v.tools.length) return;
        panel.appendChild(el('p', { class: 'route__title' }, el('span', { class: 'eyebrow', text: 'PURPOSE' }), q.purposesTitle));
        var rows = el('ul', { class: 'route__list' });
        v.tools.forEach(function (tool) {
          var rowId = nextId('tool');
          var chips = tiles(q.purposes, {
            multiple: true, small: true,
            isOn: function (p) { return (read().purposes[tool] || []).indexOf(p) >= 0; },
            onToggle: function (p, on) {
              var cur = read();
              cur.purposes = Object.assign({}, cur.purposes);
              cur.purposes[tool] = toggleIn(cur.purposes[tool], p, on, {}, q.purposes);
              ctx.set(q.id, cur);
              chips.refresh();
            }
          });
          rows.appendChild(el('li', { class: 'route__row' },
            el('span', { class: 'route__tool', id: rowId, text: labelFrom(q.tools, tool) }),
            el('div', { role: 'group', 'aria-labelledby': rowId }, chips)));
        });
        panel.appendChild(rows);
      }
      drawPanel();
      drawOther();
      return el('div', { class: 'field field--route' },
        el('div', { role: 'group', 'aria-labelledby': ctx.labelledby }, t), otherBox, panel);
    },
    isAnswered: function (q, get) { return filled((get(q.id) || {}).tools); },
    summarize: function (q, get) {
      var v = get(q.id) || {};
      if (!filled(v.tools)) return null;
      var other = get(q.id + '.other');
      return { route: v.tools.map(function (tool) {
        return { tool: tool === OTHER && filled(other) ? 'その他（' + other + '）' : labelFrom(q.tools, tool), purposes: (v.purposes || {})[tool] || [] };
      }) };
    },
    value: function (q, get) {
      var v = get(q.id) || {};
      if (!filled(v.tools)) return null;
      var other = get(q.id + '.other');
      return v.tools.map(function (tool) {
        var o = { tool: labelFrom(q.tools, tool), purposes: (v.purposes || {})[tool] || [] };
        if (tool === OTHER && filled(other)) o.detail = other;
        return o;
      });
    }
  };

  /* ---------- AFTER MAP：BEFORE → AFTER ---------- */
  types.beforeAfter = {
    render: function (q, ctx) {
      function side(which, conf) {
        var id = nextId(which);
        return el('div', { class: 'ba__side ba__side--' + which },
          el('p', { class: 'ba__tag', 'aria-hidden': 'true', text: which.toUpperCase() }),
          el('label', { class: 'ba__label', for: id }, lines(conf.label)),
          input({ type: 'textarea', rows: 3, placeholder: conf.placeholder }, q.id + '.' + which, ctx, { id: id }));
      }
      return el('div', { class: 'field field--ba', role: 'group', 'aria-labelledby': ctx.labelledby },
        side('before', q.before),
        el('span', { class: 'ba__arrow', 'aria-hidden': 'true', text: '→' }),
        side('after', q.after));
    },
    isAnswered: function (q, get) { return filled(get(q.id + '.before')) || filled(get(q.id + '.after')); },
    summarize: function (q, get) {
      var b = get(q.id + '.before'), a = get(q.id + '.after');
      if (!filled(b) && !filled(a)) return null;
      return { beforeAfter: { before: filled(b) ? b : '', after: filled(a) ? a : '' } };
    },
    value: function (q, get) {
      var b = get(q.id + '.before'), a = get(q.id + '.after');
      if (!filled(b) && !filled(a)) return null;
      return { before: clean(b), after: clean(a) };
    }
  };

  /* ---------- ガイドつき自由記述 ---------- */
  types.guided = {
    render: function (q, ctx) {
      return el('div', { class: 'field field--guided' },
        el('ul', { class: 'guides', 'aria-label': '考えるヒント' }, q.guides.map(function (g) { return el('li', { text: g }); })),
        input({ type: 'textarea', rows: q.rows || 6, placeholder: q.placeholder }, q.id, ctx, { labelledby: ctx.labelledby }));
    },
    isAnswered: function (q, get) { return filled(get(q.id)); },
    summarize: function (q, get) { var v = get(q.id); return filled(v) ? { text: v } : null; },
    value: function (q, get) { return clean(get(q.id)); }
  };

  /* ---------- 商品ごとの「一番」を選ぶ ---------- */
  types.ranking = {
    render: function (q, ctx) {
      var wrap = el('div', { class: 'field field--ranking' });
      if (!dynamicOptions(q.optionsFrom, ctx.get).length) {
        wrap.appendChild(emptyNote(q));
        return wrap;
      }
      var options = resolveOptions(q, ctx.get);
      var order = options.map(function (o) { return o.value; });
      var rows = el('ul', { class: 'route__list', role: 'group', 'aria-labelledby': ctx.labelledby });
      q.categories.forEach(function (cat) {
        var rid = nextId('rank');
        var chips = tiles(options, {
          small: true,
          isOn: function (o) { return (ctx.get(q.id) || {})[cat.id] === o; },
          onToggle: function (o, on) {
            var v = Object.assign({}, ctx.get(q.id) || {});
            v[cat.id] = on ? o : '';
            ctx.set(q.id, v);
            chips.refresh();
          }
        });
        rows.appendChild(el('li', { class: 'route__row ranking__row' },
          el('span', { class: 'route__tool', id: rid, text: cat.label }),
          el('div', { role: 'radiogroup', 'aria-labelledby': rid }, chips)));
      });
      wrap.appendChild(rows);
      return wrap;
    },
    isAnswered: function (q, get) { return filled(get(q.id)); },
    summarize: function (q, get) {
      var v = get(q.id) || {};
      var rows = q.categories.map(function (c) {
        var l = filled(v[c.id]) ? labelOf(q, get, v[c.id]) : null;
        return l ? { label: c.label, text: l } : null;
      }).filter(Boolean);
      return rows.length ? { rows: rows } : null;
    },
    value: function (q, get) {
      var v = get(q.id) || {};
      var o = {};
      q.categories.forEach(function (c) {
        var l = filled(v[c.id]) ? labelOf(q, get, v[c.id]) : null;
        if (l) o[c.key || c.id] = l;
      });
      return clean(o);
    }
  };

  window.BCFields = {
    el: el, lines: lines, filled: filled, types: types, nav: nav, fieldKey: fieldKey,
    get: function (type) {
      if (!types[type]) throw new Error('BUSINESS COMPASS: 未対応の入力形式 "' + type + '"');
      return types[type];
    }
  };
})();
