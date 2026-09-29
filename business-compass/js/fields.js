/* =====================================================================
   BUSINESS COMPASS — FIELDS
   ---------------------------------------------------------------------
   入力形式ごとの「描画」「回答済み判定」「カルテ用の要約」を
   1か所にまとめたレジストリ。新しい入力形式を増やすときは
   BCFields.types に { render, isAnswered, summarize } を追加します。

   ctx = { get(key), set(key, value), labelledby }
   保存キーは質問ID、または「質問ID.項目ID」。
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
  /* \n を <br> にした行の配列 */
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

  function filled(v) {
    if (v == null) return false;
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === 'object') return Object.keys(v).some(function (k) { return filled(v[k]); });
    return String(v).trim() !== '';
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
    var common = {
      id: id,
      class: type === 'textarea' ? 'ink-area' : 'ink-line',
      placeholder: def.placeholder || '',
      'aria-labelledby': opts.labelledby || null,
      autocomplete: def.autocomplete || 'off',
      oninput: function (e) {
        ctx.set(key, e.target.value);
        if (type === 'textarea') autoGrow(e.target);
        if (opts.onChange) opts.onChange(e.target.value);
      }
    };
    var node;
    if (type === 'textarea') {
      node = el('textarea', Object.assign(common, { rows: def.rows || 3 }));
      node.value = value || '';
      requestAnimationFrame(function () { autoGrow(node); });
    } else {
      if (type === 'number') { common.inputmode = 'decimal'; common.type = 'text'; }
      else if (type === 'url') { common.type = 'url'; common.inputmode = 'url'; common.spellcheck = 'false'; }
      else { common.type = 'text'; }
      node = el('input', common);
      node.value = value || '';
    }
    if (def.unit) {
      return el('div', { class: 'ink-unit' }, node, el('span', { class: 'ink-unit__label', 'aria-hidden': 'true', text: def.unit }));
    }
    return node;
  }

  /* 見出し付きの小さな入力（group / followups / timeline で共用） */
  function labeled(def, key, ctx) {
    var id = nextId('f');
    return el('div', { class: 'sub-field' + (def.type === 'number' ? ' sub-field--short' : '') },
      el('label', { class: 'sub-field__label', for: id }, lines(def.label)),
      input(def, key, ctx, { id: id })
    );
  }

  function formatValue(def, v) {
    if (!filled(v)) return null;
    return def.unit ? v + ' ' + def.unit : String(v);
  }

  /* ---------- 選択タイル ---------- */
  function tiles(options, cfg) {
    var wrap = el('div', { class: 'tiles' + (cfg.small ? ' tiles--small' : '') });
    var name = nextId('opt');
    options.forEach(function (opt) {
      var box = el('input', {
        type: cfg.multiple ? 'checkbox' : 'radio', name: name, value: opt, class: 'tile__input',
        onchange: function () { cfg.onToggle(opt, box.checked); }
      });
      box.checked = cfg.isOn(opt);
      if (!cfg.multiple) {
        /* 選択中のラジオをもう一度押すと解除できるようにする */
        box.addEventListener('click', function () {
          if (box.dataset.was === '1') { box.checked = false; cfg.onToggle(opt, false); }
        });
        box.addEventListener('pointerdown', function () { box.dataset.was = box.checked ? '1' : '0'; });
        box.addEventListener('keydown', function () { box.dataset.was = '0'; });
      }
      wrap.appendChild(el('label', { class: 'tile' }, box, el('span', { class: 'tile__text', text: opt })));
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

  function toggleIn(list, opt, on, q) {
    list = (list || []).slice();
    var ex = q.exclusive || [];
    if (on) {
      if (ex.indexOf(opt) >= 0) list = [];
      else list = list.filter(function (x) { return ex.indexOf(x) < 0; });
      if (list.indexOf(opt) < 0) list.push(opt);
    } else {
      list = list.filter(function (x) { return x !== opt; });
    }
    /* 選択肢の並び順を保つ */
    var order = q.options || q.tools || [];
    return list.sort(function (a, b) { return order.indexOf(a) - order.indexOf(b); });
  }

  function matches(when, value) {
    value = value || [];
    if (when.anyOf) return value.some(function (v) { return when.anyOf.indexOf(v) >= 0; });
    if (when.notOnly) return value.some(function (v) { return when.notOnly.indexOf(v) < 0; });
    return filled(value);
  }

  /* =================================================================== */
  var types = {};

  ['text', 'textarea', 'number', 'url'].forEach(function (t) {
    types[t] = {
      render: function (q, ctx) {
        return el('div', { class: 'field field--' + t }, input(q, q.id, ctx, { labelledby: ctx.labelledby }));
      },
      isAnswered: function (q, get) { return filled(get(q.id)); },
      summarize: function (q, get) {
        var v = formatValue(q, get(q.id));
        return v ? { text: v } : null;
      }
    };
  });

  types.group = {
    render: function (q, ctx) {
      return el('div', { class: 'field field--group', role: 'group', 'aria-labelledby': ctx.labelledby },
        q.fields.map(function (f) { return labeled(f, q.id + '.' + f.id, ctx); }));
    },
    isAnswered: function (q, get) {
      return q.fields.some(function (f) { return filled(get(q.id + '.' + f.id)); });
    },
    summarize: function (q, get) {
      var rows = q.fields.map(function (f) {
        var v = formatValue(f, get(q.id + '.' + f.id));
        return v ? { label: f.label, text: v } : null;
      }).filter(Boolean);
      return rows.length ? { rows: rows } : null;
    }
  };

  types.single = {
    render: function (q, ctx) {
      var t = tiles(q.options, {
        isOn: function (o) { return ctx.get(q.id) === o; },
        onToggle: function (o, on) { ctx.set(q.id, on ? o : ''); t.refresh(); }
      });
      return el('div', { class: 'field field--single', role: 'radiogroup', 'aria-labelledby': ctx.labelledby }, t);
    },
    isAnswered: function (q, get) { return filled(get(q.id)); },
    summarize: function (q, get) { return filled(get(q.id)) ? { text: get(q.id) } : null; }
  };

  types.multi = {
    render: function (q, ctx) {
      var extra = el('div', { class: 'followups' });
      var t = tiles(q.options, {
        multiple: true,
        isOn: function (o) { return (ctx.get(q.id) || []).indexOf(o) >= 0; },
        isDisabled: function (o) {
          var cur = ctx.get(q.id) || [];
          return !!q.max && cur.length >= q.max && cur.indexOf(o) < 0;
        },
        onToggle: function (o, on) {
          ctx.set(q.id, toggleIn(ctx.get(q.id), o, on, q));
          t.refresh();
          syncFollowups();
        }
      });
      var built = [];
      function syncFollowups() {
        (q.followups || []).forEach(function (fu, i) {
          var show = matches(fu.when, ctx.get(q.id));
          if (show && !built[i]) {
            built[i] = el('div', { class: 'followup' },
              fu.fields.map(function (f) { return labeled(f, q.id + '.' + f.id, ctx); }));
            extra.appendChild(built[i]);
          }
          if (built[i]) {
            built[i].hidden = !show;
            if (show) built[i].classList.add('is-shown');
          }
        });
      }
      syncFollowups();
      var head = q.max ? el('p', { class: 'field__note', text: '最大 ' + q.max + ' つまで' }) : null;
      return el('div', { class: 'field field--multi' },
        el('div', { role: 'group', 'aria-labelledby': ctx.labelledby }, head, t), extra);
    },
    isAnswered: function (q, get) { return filled(get(q.id)); },
    summarize: function (q, get) {
      var v = get(q.id);
      if (!filled(v)) return null;
      var out = { tags: v };
      (q.followups || []).forEach(function (fu) {
        if (!matches(fu.when, v)) return;
        out.rows = (out.rows || []).concat(fu.fields.map(function (f) {
          var fv = formatValue(f, get(q.id + '.' + f.id));
          return fv ? { label: f.label, text: fv } : null;
        }).filter(Boolean));
      });
      return out;
    }
  };

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
    }
  };

  /* ---------- STORY：タイムライン ---------- */
  types.timeline = {
    render: function (q, ctx) {
      var min = q.min || 1, max = q.max || 5, p = q.prompts;
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
      function setPart(i, part, val) {
        var items = read();
        items[i] = Object.assign({}, items[i]);
        items[i][part] = val;
        ctx.set(q.id, items);
      }
      function partCtx(i) {
        return {
          get: function (k) { return (read()[i] || {})[k]; },
          set: function (k, v) { setPart(i, k, v); }
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
                el('label', { class: 'sub-field__label', for: ageId }, p.age),
                input({ type: 'number', unit: '歳ごろ', placeholder: '28' }, 'age', c, { id: ageId })),
              labeled({ type: 'text', label: p.event, placeholder: '例：会社を辞めて、はじめて自分の名前で仕事をした' }, 'event', c),
              labeled({ type: 'textarea', label: p.feeling, rows: 2 }, 'feeling', c),
              labeled({ type: 'textarea', label: p.learning, rows: 2 }, 'learning', c)
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
        return { age: it.age ? it.age + '歳ごろ' : '', event: it.event || '', feeling: it.feeling || '', learning: it.learning || '' };
      }) };
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
      var t = tiles(q.tools, {
        multiple: true,
        isOn: function (o) { return read().tools.indexOf(o) >= 0; },
        onToggle: function (o, on) {
          var v = read();
          v.tools = toggleIn(v.tools, o, on, q);
          ctx.set(q.id, v);
          t.refresh();
          drawPanel();
        }
      });
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
              cur.purposes[tool] = toggleIn(cur.purposes[tool], p, on, { options: q.purposes });
              ctx.set(q.id, cur);
              chips.refresh();
            }
          });
          rows.appendChild(el('li', { class: 'route__row' },
            el('span', { class: 'route__tool', id: rowId, text: tool }),
            el('div', { role: 'group', 'aria-labelledby': rowId }, chips)));
        });
        panel.appendChild(rows);
      }
      drawPanel();
      return el('div', { class: 'field field--route' },
        el('div', { role: 'group', 'aria-labelledby': ctx.labelledby }, t), panel);
    },
    isAnswered: function (q, get) { return filled((get(q.id) || {}).tools); },
    summarize: function (q, get) {
      var v = get(q.id) || {};
      if (!filled(v.tools)) return null;
      return { route: v.tools.map(function (tool) {
        return { tool: tool, purposes: (v.purposes || {})[tool] || [] };
      }) };
    }
  };

  window.BCFields = {
    el: el, lines: lines, filled: filled, types: types,
    get: function (type) {
      if (!types[type]) throw new Error('BUSINESS COMPASS: 未対応の入力形式 "' + type + '"');
      return types[type];
    }
  };
})();
