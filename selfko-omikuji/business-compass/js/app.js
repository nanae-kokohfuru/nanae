/* =====================================================================
   BUSINESS COMPASS — APP
   画面遷移と各画面の組み立て。文言・質問は content.js、
   入力形式は fields.js、保存は store.js が担当します。
   ===================================================================== */

(function () {
  var C = window.BC_CONTENT;
  var F = window.BCFields;
  var S = window.BCStore;
  var el = F.el, lines = F.lines;

  var stage = document.getElementById('stage');
  var announcer = document.getElementById('announcer');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 旅程（章扉 → 質問 … → 最終画面） ---------- */
  /* 章の questions には「質問」「1画面のまとまり（items）」「間奏（interlude）」が入る。
     画面（step）単位で旅程を作り、質問番号は質問単位で振る。 */
  var journey = [];
  var questionNo = {};
  var chapterOf = {};   /* step id / question id → 章 */
  var stepOf = {};      /* question id → step id */
  var steps = {};       /* step id → step */
  (function build() {
    var n = 0;
    C.chapters.forEach(function (ch, ci) {
      ch.index = ci;
      ch.flat = [];
      journey.push('door:' + ch.id);
      ch.questions.forEach(function (st) {
        steps[st.id] = st;
        chapterOf[st.id] = ch;
        journey.push('q:' + st.id);
        if (st.interlude) return;
        (st.items || [st]).forEach(function (q) {
          n += 1;
          questionNo[q.id] = n;
          chapterOf[q.id] = ch;
          stepOf[q.id] = st.id;
          ch.flat.push(q);
          F.get(q.type); /* 未対応の入力形式があれば起動時に気づけるように */
        });
      });
    });
    journey.push('final');
  })();
  var allQuestions = C.chapters.reduce(function (a, ch) { return a.concat(ch.flat); }, []);

  function findChapter(id) { return C.chapters.filter(function (c) { return c.id === id; })[0]; }
  function getter(key) { return S.answer(key); }
  function isAnswered(q) { return F.get(q.type).isAnswered(q, getter); }
  function answeredIn(ch) {
    return ch.flat.filter(isAnswered).length;
  }
  function totalAnswered() {
    return C.chapters.reduce(function (s, ch) { return s + answeredIn(ch); }, 0);
  }
  function pad(n) { return String(n).padStart(2, '0'); }
  var TOTAL = allQuestions.length;
  function rangeOf(ch) {
    return 'Q' + pad(questionNo[ch.flat[0].id]) + '–Q' + pad(questionNo[ch.flat[ch.flat.length - 1].id]);
  }
  function copyright(extra) {
    return el('p', { class: 'copyright' + (extra ? ' ' + extra : ''), text: C.copyright || '© kokofuru' });
  }

  /* ---------- 共通パーツ ---------- */
  function photo(slot, extraClass) {
    var img = C.images[slot];
    if (!img || !img.src || img.pending) return null;
    var node = el('img', { class: 'photo ' + (extraClass || ''), src: img.src, alt: img.alt || '', decoding: 'async' });
    node.style.objectPosition = img.position || '50% 50%';
    /* 画像ファイルがまだ置かれていない場合は、静かな無地に切り替える */
    node.addEventListener('error', function () {
      var screen = node.closest('.screen');
      if (screen && screen.classList.contains('screen--door')) screen.classList.add('screen--door-plain');
      node.remove();
    });
    return node;
  }

  function goldButton(label, onClick, attrs) {
    return el('button', Object.assign({ type: 'button', class: 'btn-gold', onclick: onClick }, attrs || {}),
      el('span', { class: 'btn-gold__label', text: label }),
      el('span', { class: 'btn-gold__arrow', 'aria-hidden': 'true', text: '→' }));
  }

  function heading(tag, text, cls) {
    return el(tag, { class: cls, tabindex: '-1', 'data-focus': '' }, lines(text));
  }

  /* ---------- 画面遷移 ---------- */
  var current = null;
  var leaving = false;

  function go(cursor, opts) {
    opts = opts || {};
    if (leaving) return;
    /* 同意前は先へ進めない */
    if (!S.state.consent.required && cursor !== 'cover' && cursor !== 'consent') cursor = 'consent';
    /* 以前の版で保存された、今はない画面の位置は目次に戻す（回答はそのまま） */
    if (!isValidCursor(cursor)) cursor = 'index';
    S.setCursor(cursor);
    /* 招待リンクから開いた回答者は　画面を進めるたびに静かにサーバーへも途中保存する */
    if (remoteOn() && S.state.consent.required && F.filled(S.answer('profile.name'))) window.BCRemote.schedule(remotePayload);
    var screen = render(cursor);
    if (!current || reduceMotion || opts.instant) { swap(screen); return; }
    leaving = true;
    current.classList.add('is-leaving');
    setTimeout(function () { leaving = false; swap(screen); }, 260);
  }

  function swap(screen) {
    stage.innerHTML = '';
    stage.appendChild(screen);
    current = screen;
    document.body.dataset.tone = screen.dataset.tone || 'ivory';
    window.scrollTo(0, 0);
    requestAnimationFrame(function () {
      screen.classList.add('is-in');
      var h = screen.querySelector('[data-focus]');
      if (h) h.focus({ preventScroll: true });
      if (announcer && screen.dataset.announce) announcer.textContent = screen.dataset.announce;
    });
  }

  function step(delta) {
    var i = journey.indexOf(S.state.cursor);
    var next = journey[i + delta];
    if (i < 0) return go('index');
    if (delta < 0 && i === 0) return go('index');
    go(next || 'final');
  }

  function remoteOn() { return !!(window.BCRemote && window.BCRemote.enabled()); }
  function remotePayload() {
    S.flush();
    return { answers: S.state.answers, consent: !!S.state.consent.required, consentAt: S.state.consent.agreedAt,
      answered: totalAnswered(), total: TOTAL };
  }

  function isValidCursor(cursor) {
    if (['cover', 'consent', 'index', 'final', 'compass', 'mine'].indexOf(cursor) >= 0) return true;
    if (cursor.indexOf('door:') === 0) return !!findChapter(cursor.slice(5));
    if (cursor.indexOf('q:') === 0) return !!steps[cursor.slice(2)];
    return false;
  }

  function render(cursor) {
    var parts = cursor.split(':');
    if (cursor === 'cover') return coverScreen();
    if (cursor === 'consent') return consentScreen();
    if (cursor === 'index') return indexScreen();
    if (cursor === 'final') return finalScreen();
    if (cursor === 'compass') return compassScreen();
    if (cursor === 'mine') return mineScreen();
    if (parts[0] === 'door' && findChapter(parts[1])) return doorScreen(findChapter(parts[1]));
    var sid = cursor.slice(2);
    if (parts[0] === 'q' && steps[sid]) return steps[sid].interlude ? interludeScreen(steps[sid]) : questionScreen(steps[sid]);
    return indexScreen();
  }

  function screenShell(name, tone, announce) {
    return el('section', { class: 'screen screen--' + name, 'data-tone': tone, 'data-announce': announce || '' });
  }

  /* ================================================================
     TOP COVER
     ================================================================ */
  function coverScreen() {
    var c = C.cover;
    var s = screenShell('cover', 'dark', 'BUSINESS COMPASS');
    var hasProgress = S.state.consent.required && totalAnswered() > 0;
    s.appendChild(el('div', { class: 'cover__media' }, photo('cover', 'photo--cover'), el('div', { class: 'veil veil--cover' })));
    s.appendChild(el('div', { class: 'cover__inner' },
      el('p', { class: 'eyebrow eyebrow--light', text: 'A JOURNAL FOR YOUR BUSINESS' }),
      el('h1', { class: 'cover__title', tabindex: '-1', 'data-focus': '' },
        c.titleLines.map(function (t) { return el('span', { text: t }); })),
      el('p', { class: 'cover__tagline' }, c.tagline.map(function (t) { return el('span', { text: t }); })),
      el('span', { class: 'rule rule--gold', 'aria-hidden': 'true' }),
      el('p', { class: 'cover__catch' }, lines(c.catch.join('\n'))),
      el('div', { class: 'cover__body' }, c.body.map(function (t) { return el('p', { text: t }); })),
      el('div', { class: 'cover__actions' },
        goldButton(c.cta, function () { go(S.state.consent.required ? (hasProgress ? resumeTarget() : 'index') : 'consent'); }),
        hasProgress ? el('button', { type: 'button', class: 'text-btn text-btn--light', onclick: function () { go('index'); } }, '目次を見る') : null
      )
    ));
    s.appendChild(copyright('copyright--cover'));
    return s;
  }

  function resumeTarget() {
    for (var i = 0; i < C.chapters.length; i++) {
      var ch = C.chapters[i];
      if (answeredIn(ch) < ch.flat.length) {
        var q = ch.flat.filter(function (x) { return !isAnswered(x); })[0];
        return answeredIn(ch) === 0 ? 'door:' + ch.id : 'q:' + stepOf[q.id];
      }
    }
    return 'final';
  }

  /* ================================================================
     STEP 0：情報のお取り扱い
     ================================================================ */
  function consentScreen() {
    var c = C.consent;
    var s = screenShell('consent', 'ivory', c.title.replace(/\n/g, ''));
    var hasOptional = !!c.optional;
    var cta = goldButton(c.cta, function () {
      if (!req.checked) return;
      S.setConsent({ required: true, optional: hasOptional ? opt.checked : false, agreedAt: new Date().toISOString() });
      go('index');
    });
    var req = el('input', { type: 'checkbox', class: 'check__input', id: 'consent-required', onchange: sync });
    var opt = hasOptional ? el('input', { type: 'checkbox', class: 'check__input', id: 'consent-optional', onchange: sync }) : null;
    req.checked = !!S.state.consent.required;
    if (opt) opt.checked = !!S.state.consent.optional;
    function sync() {
      cta.disabled = !req.checked;
      cta.setAttribute('aria-describedby', req.checked ? '' : 'consent-note');
    }
    sync();

    /* items（アコーディオン）と optional（任意チェック）は、content.js にあるときだけ表示 */
    var items = c.items || [];
    s.appendChild(el('div', { class: 'page page--consent' },
      el('header', { class: 'page__head' },
        el('p', { class: 'eyebrow', text: c.eyebrow }),
        heading('h1', c.title, 'page__title'),
        el('div', { class: 'page__lead consent__body' }, c.intro.map(function (t) { return el('p', {}, lines(t)); }))
      ),
      items.length ? el('div', { class: 'accordion' }, items.map(function (item) {
        return el('details', { class: 'accordion__item' },
          el('summary', { class: 'accordion__summary' },
            el('span', { class: 'accordion__no', text: item.no }),
            el('span', { class: 'accordion__title', text: item.title }),
            el('span', { class: 'accordion__mark', 'aria-hidden': 'true' })),
          el('div', { class: 'accordion__body' }, el('p', { text: item.body })));
      })) : null,
      el('div', { class: 'consent__checks' },
        el('label', { class: 'check', for: 'consent-required' }, req, el('span', { class: 'check__box', 'aria-hidden': 'true' }),
          el('span', { class: 'check__text' }, hasOptional ? el('span', { class: 'badge', text: '必須' }) : null, c.required)),
        hasOptional ? el('label', { class: 'check', for: 'consent-optional' }, opt, el('span', { class: 'check__box', 'aria-hidden': 'true' }),
          el('span', { class: 'check__text' }, el('span', { class: 'badge badge--quiet', text: '任意' }), c.optional)) : null
      ),
      el('div', { class: 'page__actions' },
        cta,
        el('p', { class: 'field__note', id: 'consent-note', text: c.note || 'チェックを入れると進めます' })),
      copyright()
    ));
    return s;
  }

  /* ================================================================
     目次（10章の全体像と現在地）
     ================================================================ */
  function thumb(slot) {
    var img = C.images[slot];
    if (!img || !img.src || img.pending) return el('span', { class: 'chapters__thumb chapters__thumb--plain', 'aria-hidden': 'true' });
    var node = el('img', { class: 'chapters__thumb', src: img.thumb || img.src, alt: '', decoding: 'async' });
    node.style.objectPosition = img.position || '50% 50%';
    node.addEventListener('error', function () {
      node.replaceWith(el('span', { class: 'chapters__thumb chapters__thumb--plain', 'aria-hidden': 'true' }));
    });
    return node;
  }
  function indexScreen() {
    var c = C.index;
    var s = screenShell('index', 'ivory', c.title.replace(/\n/g, ' '));
    var started = totalAnswered() > 0;
    var here = started ? resumeTarget() : null;
    var hereCh = here && here !== 'final' ? chapterOf[here.split(':')[1]] || findChapter(here.split(':')[1]) : null;
    var list = el('ol', { class: 'chapters' }, C.chapters.map(function (ch) {
      var done = answeredIn(ch), total = ch.flat.length;
      var state = done >= total ? 'done' : (hereCh === ch ? 'here' : (done > 0 ? 'partial' : 'todo'));
      var status = state === 'done' ? '完了' : state === 'here' ? '現在地' : state === 'partial' ? done + ' / ' + total : '';
      return el('li', { class: 'chapters__item' },
        el('button', { type: 'button', class: 'chapters__btn is-' + state, onclick: function () { go('door:' + ch.id); },
          'aria-label': ch.no + ' ' + ch.en + ' ' + ch.ja + (status ? ' ' + status : '') },
          el('span', { class: 'chapters__no', text: ch.no }),
          thumb(ch.id),
          el('span', { class: 'chapters__names' },
            el('span', { class: 'chapters__en', text: ch.en }),
            el('span', { class: 'chapters__ja', text: ch.ja }),
            el('span', { class: 'chapters__desc', text: ch.desc + '　' + rangeOf(ch) })),
          el('span', { class: 'chapters__status' }, state === 'done' || state === 'here' ? el('span', { class: 'chapters__mark', 'aria-hidden': 'true' }) : null, status),
          el('span', { class: 'chapters__arrow', 'aria-hidden': 'true', text: '→' })));
    }));
    s.appendChild(el('div', { class: 'page page--wide' },
      el('header', { class: 'page__head page__head--split' },
        el('div', {},
          el('p', { class: 'eyebrow', text: c.eyebrow }),
          heading('h1', c.title, 'page__title page__title--toc')),
        el('div', { class: 'page__aside toc__lead' }, c.body.map(function (t) { return el('p', {}, lines(t)); }))),
      list,
      el('div', { class: 'page__actions page__actions--split' },
        goldButton(started ? 'つづきから' : '最初の章からはじめる', function () { go(started ? resumeTarget() : journey[0]); }),
        started ? el('button', { type: 'button', class: 'text-btn', onclick: function () { go('final'); } }, 'YOUR BUSINESS COMPASS を見る') : null,
        /* 回答は消さずに表紙へ戻る */
        el('button', { type: 'button', class: 'text-btn', onclick: function () { go('cover'); } }, '← 表紙に戻る')),
      copyright()
    ));
    return s;
  }

  /* ================================================================
     章扉
     ================================================================ */
  function doorScreen(ch) {
    var s = screenShell('door', 'dark', ch.no + ' ' + ch.en + ' ' + ch.ja);
    var img = photo(ch.id, 'photo--door');
    s.classList.toggle('screen--door-plain', !img);
    s.appendChild(el('div', { class: 'door__media' }, img, el('div', { class: 'veil veil--door' })));
    s.appendChild(el('div', { class: 'door__inner' },
      el('div', { class: 'door__meta' },
        el('span', { text: 'CHAPTER ' + ch.no + ' / ' + pad(C.chapters.length) }),
        el('span', { text: rangeOf(ch) + ' · ' + ch.flat.length + ' QUESTIONS' })),
      el('p', { class: 'door__no', 'aria-hidden': 'true', text: ch.no }),
      el('h1', { class: 'door__en', tabindex: '-1', 'data-focus': '' }, ch.en,
        el('span', { class: 'sr-only', text: ' ' + ch.ja })),
      el('p', { class: 'door__meaning', 'aria-hidden': 'true', text: ch.en + ' = ' + ch.meaning }),
      el('p', { class: 'door__ja', 'aria-hidden': 'true', text: ch.ja }),
      el('p', { class: 'door__desc', text: ch.desc }),
      el('span', { class: 'rule rule--gold', 'aria-hidden': 'true' }),
      el('blockquote', { class: 'door__quote' }, el('p', {}, lines('「' + ch.quote + '」'))),
      ch.doorNote ? el('div', { class: 'door__note' }, ch.doorNote.map(function (t) { return el('p', { text: t }); })) : null,
      el('div', { class: 'door__actions' },
        goldButton('この章をはじめる', function () { step(1); }),
        el('div', { class: 'door__links' },
          el('button', { type: 'button', class: 'text-btn text-btn--light', onclick: function () { step(-1); } }, '← 前へ'),
          el('button', { type: 'button', class: 'text-btn text-btn--light', onclick: function () { go('index'); } }, '目次')))
    ));
    return s;
  }

  /* ================================================================
     質問（1問の画面／まとまりの画面）と、AFTER MAP の間奏
     ================================================================ */
  function stepTone(st) {
    if (st.feature) return 'bordeaux';
    if (st.variant === 'aftermap') return 'stone';
    return 'ivory';
  }

  /* 今の質問番号（間奏では、次に来る質問の1つ前として数える） */
  function numberAt(st) {
    if (!st.interlude) return questionNo[(st.items || [st])[0].id];
    var i = journey.indexOf('q:' + st.id);
    for (var j = i + 1; j < journey.length; j++) {
      var nx = steps[journey[j].slice(2)];
      if (nx && !nx.interlude) return questionNo[(nx.items || [nx])[0].id] - 1;
    }
    return TOTAL;
  }
  function questionBar(ch, st) {
    var no = numberAt(st);
    var pct = Math.round(no / TOTAL * 100);
    var where = [
      el('span', { class: 'q-bar__count', text: ch.no }),
      el('span', { class: 'q-bar__chapter', text: ch.en }),
      el('span', { class: 'q-bar__ja', text: ch.ja })
    ];
    if (st.variant === 'aftermap') where.push(el('span', { class: 'q-bar__map', text: 'AFTER MAP' }));
    return el('header', { class: 'q-bar' },
      el('div', { class: 'q-bar__row' },
        el('p', { class: 'q-bar__where' }, where),
        el('p', { class: 'q-bar__progress' },
          el('span', { class: 'q-bar__num' }, el('strong', { text: String(no) }), ' / ' + TOTAL),
          el('span', { class: 'q-bar__pct', text: pct + '%' })),
        el('button', { type: 'button', class: 'text-btn q-bar__index', onclick: function () { go('index'); } }, '目次')),
      el('div', { class: 'q-bar__line', role: 'progressbar', 'aria-label': '旅の進み具合',
        'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(pct), 'aria-valuetext': no + ' / ' + TOTAL + '問　' + pct + '%' },
        el('span', { class: 'q-bar__fill', style: 'transform:scaleX(' + no / TOTAL + ')' })));
  }

  function sectionLabel(st) {
    var sec = st.section;
    if (!sec) return null;
    return el('p', { class: 'q__section' },
      el('span', { class: 'q__section-en', text: sec.en }), el('span', { class: 'q__section-ja', text: sec.ja }));
  }

  function questionScreen(st) {
    var ch = chapterOf[st.id];
    var items = st.items || [st];
    var grouped = !!st.items;
    var first = items[0], last = items[items.length - 1];
    var nos = pad(questionNo[first.id]) + (grouped ? ' — ' + pad(questionNo[last.id]) : '');
    var tone = stepTone(st);
    var cls = 'question' + (st.feature ? ' screen--feature' : '') + (st.variant === 'aftermap' ? ' screen--aftermap' : '') +
      (grouped ? ' screen--grouped screen--' + (st.layout || 'stack') : '');
    var s = screenShell(cls, tone, ch.en + ' QUESTION ' + nos);
    var pos = journey.indexOf('q:' + st.id);
    var error = el('p', { class: 'q__error', role: 'alert' });

    function ctxFor(titleId) {
      return {
        labelledby: titleId,
        get: getter,
        set: function (k, v) { S.setAnswer(k, v); error.textContent = ''; }
      };
    }

    var body;
    if (!grouped) {
      var q = st;
      var milestone = (C.milestones || {})[questionNo[q.id]];
      body = el('div', { class: 'q' + (q.lead ? ' q--deep' : '') },
        milestone ? el('p', { class: 'q__milestone', role: 'status' }, el('span', { class: 'q__milestone-pct', text: Math.round(questionNo[q.id] / TOTAL * 100) + '%' }), milestone) : null,
        q.lead ? el('p', { class: 'q__lead', text: q.lead }) : null,
        sectionLabel(q),
        el('p', { class: 'q__no', text: (q.eyebrow ? q.eyebrow + ' · ' : '') + (q.mapNo ? 'MAP ' + pad(q.mapNo) + ' · ' : '') + 'QUESTION ' + nos }),
        el('h1', { class: 'q__title', id: 'q-title', tabindex: '-1', 'data-focus': '' }, lines(q.title)),
        q.hint ? el('p', { class: 'q__hint', text: q.hint }) : null,
        el('div', { class: 'q__field' }, F.get(q.type).render(q, ctxFor('q-title'))),
        error);
    } else {
      var head = [
        sectionLabel(st),
        el('p', { class: 'q__no', text: 'QUESTION ' + nos }),
        st.title
          ? el('h1', { class: 'q__title', tabindex: '-1', 'data-focus': '' }, lines(st.title))
          : el('h1', { class: 'sr-only', tabindex: '-1', 'data-focus': '' }, ch.en + ' QUESTION ' + nos),
        st.hint ? el('p', { class: 'q__hint', text: st.hint }) : null
      ];
      var list = el('div', { class: 'q-items q-items--' + (st.layout || 'stack') }, items.map(function (q) {
        var tid = 'q-title-' + questionNo[q.id];
        return el('section', { class: 'q-item', 'aria-labelledby': tid },
          el('p', { class: 'q-item__no', 'aria-hidden': 'true', text: 'Q' + pad(questionNo[q.id]) }),
          el('h2', { class: 'q-item__title', id: tid }, lines(q.title)),
          q.hint ? el('p', { class: 'q__hint', text: q.hint }) : null,
          el('div', { class: 'q-item__field' }, F.get(q.type).render(q, ctxFor(tid))));
      }));
      body = el('div', { class: 'q' }, head, list, error);
    }

    var isLast = pos === journey.length - 2;
    var nav = el('nav', { class: 'q-nav', 'aria-label': '質問の移動' },
      el('button', { type: 'button', class: 'text-btn q-nav__back', onclick: function () { step(-1); } }, '← 前へ'),
      goldButton(isLast ? '旅を終える' : '次へ', next));

    function next() {
      var missing = items.filter(function (q) { return q.required && !isAnswered(q); });
      if (missing.length) {
        error.textContent = (grouped ? 'Q' + pad(questionNo[missing[0].id]) + ' ' : '') + 'この質問だけは　ご記入をお願いします';
        return;
      }
      S.flush();
      step(1);
    }

    /* Enter で次へ（1行だけの質問のときだけ） */
    body.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.isComposing && e.target.tagName === 'INPUT' && e.target.type !== 'checkbox' && e.target.type !== 'radio') {
        e.preventDefault();
        if (!grouped && ['text', 'url', 'number', 'currency', 'date'].indexOf(st.type) >= 0) next();
      }
    });

    s.appendChild(questionBar(ch, st));
    s.appendChild(el('div', { class: 'q-wrap' }, body, nav));
    return s;
  }

  function interludeScreen(st) {
    var ch = chapterOf[st.id];
    var s = screenShell('question screen--interlude' + (st.variant === 'aftermap' ? ' screen--aftermap' : ''), stepTone(st), st.eyebrow + ' ' + st.title);
    var pos = journey.indexOf('q:' + st.id);
    s.appendChild(questionBar(ch, st));
    s.appendChild(el('div', { class: 'q-wrap' },
      el('div', { class: 'q interlude' },
        el('p', { class: 'eyebrow', text: st.eyebrow }),
        el('h1', { class: 'interlude__title', tabindex: '-1', 'data-focus': '' }, lines(st.title)),
        el('p', { class: 'interlude__sub' }, lines(st.subtitle)),
        el('span', { class: 'rule rule--gold', 'aria-hidden': 'true' }),
        el('div', { class: 'interlude__body' }, st.body.map(function (t) { return el('p', {}, lines(t)); }))),
      el('nav', { class: 'q-nav', 'aria-label': '質問の移動' },
        el('button', { type: 'button', class: 'text-btn q-nav__back', onclick: function () { step(-1); } }, '← 前へ'),
        goldButton(st.cta || '次へ', function () { step(1); }))));
    return s;
  }

  /* ================================================================
     最終画面：YOUR BUSINESS COMPASS
     ================================================================ */
  function rowsNode(rows) {
    return el('dl', { class: 'karte__rows' }, rows.map(function (r) {
      return [el('dt', { text: r.label }), el('dd', {}, lines(r.text))];
    }));
  }
  function summaryNode(sum) {
    if (!sum) return el('p', { class: 'karte__empty', text: '未記入' });
    var out = [];
    if (sum.text) out.push(el('p', { class: 'karte__text' }, lines(sum.text)));
    if (sum.meter != null) out.push(el('span', { class: 'meter', 'aria-hidden': 'true' }, el('span', { style: 'width:' + sum.meter * 100 + '%' })));
    if (sum.tags) out.push(el('ul', { class: 'karte__tags' }, sum.tags.map(function (t) { return el('li', { text: t }); })));
    if (sum.items) out.push(el('ul', { class: 'karte__items' }, sum.items.map(function (t) { return el('li', { text: t }); })));
    if (sum.cards) out.push(el('ol', { class: 'karte__cards' }, sum.cards.map(function (c) { return el('li', {}, rowsNode(c.rows)); })));
    if (sum.rows) out.push(rowsNode(sum.rows));
    if (sum.beforeAfter) out.push(el('div', { class: 'karte__ba' },
      el('p', {}, el('span', { text: 'BEFORE' }), sum.beforeAfter.before || '—'),
      el('p', {}, el('span', { text: 'AFTER' }), sum.beforeAfter.after || '—')));
    if (sum.timeline) out.push(el('ol', { class: 'karte__timeline' }, sum.timeline.map(function (t) {
      return el('li', {},
        el('span', { class: 'karte__age', text: t.age || '—' }),
        el('div', {},
          t.event ? el('p', { class: 'karte__event', text: t.event }) : null,
          (t.subs || []).map(function (x) { return el('p', { class: 'karte__sub' }, el('span', { text: x.label }), x.text); })));
    })));
    if (sum.route) out.push(el('ul', { class: 'karte__route' }, sum.route.map(function (r) {
      return el('li', {}, el('span', { class: 'karte__tool', text: r.tool }),
        el('span', { class: 'karte__purpose', text: r.purposes.length ? r.purposes.join('・') : '用途未記入' }));
    })));
    return out;
  }

  /* 10章の記入量を細い針で示す、静かな羅針盤 */
  function compassRose() {
    var NS = 'http://www.w3.org/2000/svg';
    function svg(tag, attrs) {
      var n = document.createElementNS(NS, tag);
      Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
      return n;
    }
    var root = svg('svg', { viewBox: '-160 -160 320 320', class: 'rose', role: 'img', 'aria-label': '10章の記入状況を示す羅針盤' });
    root.appendChild(svg('circle', { r: 118, class: 'rose__ring' }));
    root.appendChild(svg('circle', { r: 72, class: 'rose__ring rose__ring--inner' }));
    root.appendChild(svg('circle', { r: 3, class: 'rose__pin' }));
    var total = C.chapters.length;
    C.chapters.forEach(function (ch, i) {
      var a = (i / total) * Math.PI * 2 - Math.PI / 2;
      var ratio = answeredIn(ch) / ch.flat.length;
      var len = 20 + ratio * 98;
      var cx = Math.cos(a), cy = Math.sin(a);
      root.appendChild(svg('line', { x1: cx * 10, y1: cy * 10, x2: cx * 118, y2: cy * 118, class: 'rose__axis' }));
      root.appendChild(svg('line', { x1: cx * 10, y1: cy * 10, x2: cx * len, y2: cy * len, class: 'rose__needle' + (ratio >= 1 ? ' is-full' : '') }));
      root.appendChild(svg('circle', { cx: cx * len, cy: cy * len, r: 2.2, class: 'rose__tip' }));
      var label = svg('text', { x: cx * 140, y: cy * 140 + 3, class: 'rose__label', 'text-anchor': Math.abs(cx) < 0.2 ? 'middle' : cx > 0 ? 'start' : 'end' });
      label.textContent = ch.no;
      root.appendChild(label);
    });
    return root;
  }

  /* ================================================================
     完了画面：花火 → おつかれさまでした〜 → 最後の2アクション
     招待リンクから開いた人には「のむら ななえに送る」、
     それ以外の人には「回答を手元に残す（印刷・回答データ）」を並べる
     ================================================================ */
  function finalScreen() {
    var c = C.final;
    var invited = remoteOn();
    var s = screenShell('final', 'ivory', c.title);
    var sky = el('div', { class: 'fin__sky', 'aria-hidden': 'true' });
    s.appendChild(sky);
    if (!reduceMotion) startFireworks(sky);

    s.appendChild(el('div', { class: 'fin' },
      el('header', { class: 'fin__head' },
        el('p', { class: 'fin__eyebrow', text: c.eyebrow }),
        el('h1', { class: 'fin__title', tabindex: '-1', 'data-focus': '' }, c.title),
        el('div', { class: 'fin__rule', 'aria-hidden': 'true' }, el('span', {})),
        el('p', { class: 'fin__message' }, lines(c.message)),
        el('p', { class: 'fin__congrats' },
          el('span', { class: 'fin__spark', 'aria-hidden': 'true', text: '✦' }), c.congrats,
          el('span', { class: 'fin__spark', 'aria-hidden': 'true', text: '✦' })),
        el('p', { class: 'fin__count' }, c.count + '　', el('strong', { text: String(totalAnswered()) }), ' / ' + TOTAL)),
      el('div', { class: 'fin__ctas' },
        compassCta(c),
        invited ? sendCta(c) : keepPanel(c)),
      el('div', { class: 'fin__links' },
        el('button', { type: 'button', class: 'text-btn', onclick: function () { go('index'); } }, '目次へ'),
        invited ? null : el('button', { type: 'button', class: 'text-btn text-btn--quiet', onclick: confirmReset }, 'すべて消去して最初から')),
      copyright()));
    return s;
  }

  function ctaArrow() {
    return el('span', { class: 'cta__arrow', 'aria-hidden': 'true' }, el('span', { text: '→' }));
  }

  /* CTA①：ここまでの回答を整理した BUSINESS COMPASS 骨子を見る */
  function compassCta(c) {
    var t = c.compassCta;
    return el('button', { type: 'button', class: 'cta cta--gold', onclick: function () { go('compass'); } },
      el('span', { class: 'cta__icon' }, ctaIcon('book')),
      el('span', { class: 'cta__text' },
        el('span', { class: 'cta__pre', text: t.pre }),
        el('span', { class: 'cta__mid', text: t.mid }),
        el('span', { class: 'cta__brand', text: t.brand }),
        el('span', { class: 'cta__main', text: t.post })),
      ctaArrow());
  }

  /* CTA②：この回答を のむら ななえに送る（送信の仕組みは BCRemote のまま） */
  function sendCta(c) {
    var t = C.send, sc = c.sendCta;
    var main = el('span', { class: 'cta__main', text: sc.main });
    var btn = el('button', { type: 'button', class: 'cta cta--rose send__btn', onclick: doSend },
      el('span', { class: 'cta__icon' }, ctaIcon('letter')),
      el('span', { class: 'cta__text' },
        el('span', { class: 'cta__pre', text: sc.pre }),
        main,
        el('span', { class: 'cta__orn', 'aria-hidden': 'true' }, el('span', {}))),
      ctaArrow());
    var status = el('p', { class: 'send__status', role: 'status', 'aria-live': 'polite' });
    var hint = el('p', { class: 'send__hint', text: t.hint });
    var done = el('div', { class: 'send__done', hidden: true, tabindex: '-1' },
      el('p', { class: 'send__done-title' }, el('span', { class: 'send__mark', 'aria-hidden': 'true' }), t.doneTitle),
      el('p', { class: 'send__done-body' }, lines(t.doneBody)),
      el('p', { class: 'send__done-at' }));
    function showDone(at) {
      done.hidden = false;
      done.querySelector('.send__done-at').textContent = at ? t.sentAt + '　' + formatDateTime(at) : '';
      hint.textContent = t.resendHint;
    }
    function doSend() {
      if (btn.disabled) return;
      btn.disabled = true;
      btn.classList.add('is-sending');
      done.hidden = true;
      main.textContent = t.sending;
      status.className = 'send__status';
      status.textContent = t.sendingNote;
      window.BCRemote.submit(remotePayload).then(function (r) {
        btn.disabled = false;
        btn.classList.remove('is-sending');
        main.textContent = sc.main;
        if (r.ok) {
          status.textContent = '';
          showDone(r.submittedAt);
          done.focus({ preventScroll: true });
          done.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
        } else {
          status.className = 'send__status is-error';
          status.textContent = r.reason === 'invite' ? t.errorInvite : t.error;
        }
      });
    }
    if (window.BCRemote.submittedAt()) showDone(window.BCRemote.submittedAt());
    return el('div', { class: 'fin__send' }, btn, status, hint, done);
  }

  /* 招待リンクなしで開いた人：回答を手元に残す（印刷・回答データの書き出し） */
  function keepPanel(c) {
    return el('div', { class: 'fin__keep' },
      el('p', { class: 'fin__keep-title', text: c.keepTitle }),
      el('p', { class: 'fin__keep-body', text: c.keepBody }),
      el('div', { class: 'fin__keep-actions' },
        el('button', { type: 'button', class: 'btn-line', onclick: function () {
          go('compass', { instant: true });
          setTimeout(function () { window.print(); }, 300);
        } }, C.compass.print),
        el('button', { type: 'button', class: 'btn-line', onclick: downloadJSON }, '回答データを書き出す')));
  }

  /* CTA の小さな線画（画像ファイルを使わない） */
  function ctaIcon(kind) {
    var NS = 'http://www.w3.org/2000/svg';
    function svg(tag, attrs) {
      var n = document.createElementNS(NS, tag);
      Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
      return n;
    }
    var root = svg('svg', { viewBox: '0 0 80 80', class: 'cta__svg cta__svg--' + kind, 'aria-hidden': 'true', focusable: 'false' });
    if (kind === 'book') {
      var g = svg('g', { transform: 'rotate(-8 40 40)' });
      g.appendChild(svg('rect', { x: 17, y: 12, width: 44, height: 56, rx: 2, class: 'ic-paper' }));
      g.appendChild(svg('rect', { x: 21, y: 16, width: 36, height: 48, rx: 1, class: 'ic-frame' }));
      g.appendChild(svg('circle', { cx: 39, cy: 33, r: 7.5, class: 'ic-frame' }));
      g.appendChild(svg('path', { d: 'M39 25.5 L41 33 L39 40.5 L37 33 Z', class: 'ic-gold' }));
      g.appendChild(svg('path', { d: 'M27 48 H51 M30 53 H48 M32 58 H46', class: 'ic-line' }));
      root.appendChild(g);
      root.appendChild(svg('path', { d: 'M6 62 C 18 52, 30 74, 44 64 S 66 58, 76 66', class: 'ic-ribbon' }));
    } else {
      root.appendChild(svg('path', { d: 'M5 54 C 20 46, 32 70, 50 62 S 70 58, 78 64', class: 'ic-ribbon' }));
      var e = svg('g', { transform: 'rotate(-10 40 40)' });
      e.appendChild(svg('rect', { x: 10, y: 22, width: 60, height: 40, rx: 2, class: 'ic-paper' }));
      e.appendChild(svg('path', { d: 'M10 24 L40 46 L70 24', class: 'ic-frame' }));
      e.appendChild(svg('path', { d: 'M10 62 L32 42 M70 62 L48 42', class: 'ic-line' }));
      e.appendChild(svg('circle', { cx: 40, cy: 46, r: 7, class: 'ic-seal' }));
      e.appendChild(svg('path', { d: 'M40 41.5 V50.5 M40 45 L37.4 43 M40 47.6 L42.6 45.6', class: 'ic-sealmark' }));
      root.appendChild(e);
    }
    return root;
  }

  /* ---------- 花火（完了画面を開いたときに数発だけ打ち上げ、終わったら描画を止める） ---------- */
  function startFireworks(host) {
    var canvas = document.createElement('canvas');
    canvas.className = 'fin__canvas';
    host.appendChild(canvas);
    var ctx = canvas.getContext && canvas.getContext('2d');
    if (!ctx) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W = 0, H = 0;
    function size() {
      W = host.clientWidth || window.innerWidth;
      H = host.clientHeight || 400;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    /* シャンパンゴールド・アンティークゴールド・ごく淡いローズゴールド */
    var COLORS = ['246,232,200', '236,210,152', '214,178,112', '240,208,192', '255,248,232'];
    var PLAN = [
      { t: 250, x: .30, y: .30, s: 1 },
      { t: 1000, x: .72, y: .22, s: 1.05 },
      { t: 1750, x: .50, y: .14, s: 1.25 },
      { t: 2600, x: .16, y: .17, s: .78 },
      { t: 3200, x: .86, y: .32, s: .82 }
    ];
    var DRAG = 0.0021, GRAVITY = 0.000055;
    var rockets = [], sparks = [], flashes = [];
    var clock = 0, last = 0, next = 0, raf = 0, stopped = false, attached = false, waiting = 0;

    function launch(p) {
      var tx = p.x * W, ty = p.y * H;
      rockets.push({ x0: tx + (Math.random() - .5) * W * .06, y0: H * .9, tx: tx, ty: ty, age: 0,
        dur: 950 + Math.random() * 250, s: p.s, trail: [] });
    }
    function burst(r) {
      var small = W < 640;
      var count = Math.round((small ? 56 : 80) * r.s);
      var radius = Math.min(W * (small ? .25 : .17), 230) * r.s;
      var main = COLORS[Math.floor(Math.random() * 3)];
      for (var i = 0; i < count; i++) {
        var a = (i / count) * Math.PI * 2 + Math.random() * .12;
        var ring = Math.random() < .72;
        var v = radius * DRAG * (ring ? .86 + Math.random() * .14 : .25 + Math.random() * .6);
        sparks.push({ x: r.tx, y: r.ty, vx: Math.cos(a) * v, vy: Math.sin(a) * v, age: 0,
          life: 1900 + Math.random() * 1300, w: ring ? 1.4 : 1.1,
          c: Math.random() < .7 ? main : COLORS[Math.floor(Math.random() * COLORS.length)],
          tw: Math.random() < .35 ? Math.random() * 6 : -1 });
      }
      flashes.push({ x: r.tx, y: r.ty, r: radius * .6, age: 0, life: 420 });
    }
    function frame(now) {
      if (stopped) return;
      /* 画面の切り替えが終わって表示されるまで待つ。表示後に画面を離れたら止める */
      if (!canvas.isConnected) {
        if (attached || ++waiting > 240) { stop(); return; }
        raf = requestAnimationFrame(frame);
        return;
      }
      if (!attached) { attached = true; size(); }
      if (document.hidden) { raf = 0; return; }
      var dt = last ? Math.min(now - last, 48) : 16;
      last = now;
      clock += dt;
      while (next < PLAN.length && clock >= PLAN[next].t) launch(PLAN[next++]);

      /* 前のコマを少しずつ消して、光の尾を残す */
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0,0,0,' + (1 - Math.pow(.8, dt / 16.7)).toFixed(3) + ')';
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';

      flashes = flashes.filter(function (f) {
        f.age += dt;
        var k = 1 - f.age / f.life;
        if (k <= 0) return false;
        var g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r);
        g.addColorStop(0, 'rgba(255,226,170,' + (.16 * k * k).toFixed(3) + ')');
        g.addColorStop(1, 'rgba(255,226,170,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.fill();
        return true;
      });

      rockets = rockets.filter(function (r) {
        r.age += dt;
        var k = Math.min(r.age / r.dur, 1);
        var e = 1 - Math.pow(1 - k, 3);
        var x = r.x0 + (r.tx - r.x0) * e, y = r.y0 + (r.ty - r.y0) * e;
        r.trail.push([x, y]);
        if (r.trail.length > 10) r.trail.shift();
        for (var i = 1; i < r.trail.length; i++) {
          ctx.strokeStyle = 'rgba(246,226,186,' + (i / r.trail.length * .5).toFixed(3) + ')';
          ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.moveTo(r.trail[i - 1][0], r.trail[i - 1][1]); ctx.lineTo(r.trail[i][0], r.trail[i][1]); ctx.stroke();
        }
        if (k >= 1) { burst(r); return false; }
        return true;
      });

      var drag = Math.exp(-DRAG * dt);
      sparks = sparks.filter(function (p) {
        p.age += dt;
        if (p.age >= p.life) return false;
        var px = p.x, py = p.y;
        p.vy += GRAVITY * dt;
        p.vx *= drag; p.vy *= drag;
        p.x += p.vx * dt; p.y += p.vy * dt;
        var k = 1 - p.age / p.life;
        var alpha = Math.pow(k, 1.5);
        if (p.tw >= 0 && k < .55) alpha *= .45 + .55 * Math.abs(Math.sin(p.age * .012 + p.tw));
        ctx.strokeStyle = 'rgba(' + p.c + ',' + alpha.toFixed(3) + ')';
        ctx.lineWidth = p.w;
        ctx.beginPath(); ctx.moveTo(px - (p.x - px) * 1.2, py - (p.y - py) * 1.2); ctx.lineTo(p.x, p.y); ctx.stroke();
        return true;
      });

      if (next >= PLAN.length && !rockets.length && !sparks.length && !flashes.length) {
        ctx.clearRect(0, 0, W, H);
        host.classList.add('is-done');
        stop();
        return;
      }
      raf = requestAnimationFrame(frame);
    }
    function onVisible() {
      if (!document.hidden && !raf && !stopped) { last = 0; raf = requestAnimationFrame(frame); }
    }
    function stop() {
      stopped = true;
      if (raf) cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('resize', size);
    }
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('resize', size);
    raf = requestAnimationFrame(frame);
  }

  /* 80問の回答を章ごとのシートで並べる（「80問すべての回答を見る」） */
  function karteNode() {
    return el('div', { class: 'karte' }, C.chapters.map(function (ch) {
      return el('section', { class: 'karte__chapter', 'aria-labelledby': 'karte-' + ch.id },
        el('header', { class: 'karte__head' },
          el('span', { class: 'karte__no', text: ch.no }),
          el('h3', { class: 'karte__en', id: 'karte-' + ch.id }, ch.en, el('span', { class: 'karte__ja', text: ch.ja })),
          el('button', { type: 'button', class: 'text-btn karte__edit', onclick: function () { go('q:' + ch.questions[0].id); },
            'aria-label': ch.en + ' を見直す' }, '見直す')),
        el('dl', { class: 'karte__list' }, karteEntries(ch)));
    }));
  }

  function formatDateTime(iso) {
    var d = new Date(iso);
    if (isNaN(d)) return '';
    return d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日 ' +
      String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }

  /* ================================================================
     骨子シート：本人の回答を10章ごとに整理して見せる
     ・AIによる解釈・要約・追加はしない。書かれた言葉をそのまま、まとまりごとに並べる
     ・content.js の blocks に入っていない質問も「そのほか」に必ず出す（回答は隠れない）
     ================================================================ */
  function findQuestion(id) { return allQuestions.filter(function (q) { return q.id === id; })[0]; }
  function summaryOf(q) { return q ? F.get(q.type).summarize(q, getter) : null; }

  function compassScreen() {
    var c = C.compass;
    var name = S.answer('profile.name');
    var brand = S.answer('profile.brand_names');
    var s = screenShell('compass', 'ivory', c.title);
    s.appendChild(el('div', { class: 'page page--wide cmp' },
      el('header', { class: 'cmp__head' },
        el('p', { class: 'eyebrow', text: c.eyebrow }),
        heading('h1', c.title, 'page__title cmp__title'),
        el('p', { class: 'cmp__who' }, (F.filled(name) ? name + ' さん' : 'あなた'), F.filled(brand) ? el('span', { text: brand }) : null),
        el('p', { class: 'page__lead cmp__lead', text: c.lead }),
        el('p', { class: 'cmp__meta' }, C.final.count + '　', el('strong', { text: String(totalAnswered()) }), ' / ' + TOTAL,
          S.state.updatedAt ? el('span', { text: '最終更新　' + formatDateTime(S.state.updatedAt) }) : null)),
      el('section', { class: 'cmp__overview', 'aria-labelledby': 'cmp-overview' },
        el('div', { class: 'cmp__rose' }, compassRose()),
        el('div', { class: 'cmp__overview-body' },
          el('h2', { class: 'cmp__overview-title', id: 'cmp-overview' }, el('span', { text: 'OVERVIEW' }), c.overview),
          el('ol', { class: 'cmp__index' }, C.chapters.map(function (ch) {
            return el('li', {}, el('button', { type: 'button', class: 'cmp__index-link', onclick: function () {
              var target = document.getElementById('cmp-' + ch.id);
              if (target) target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
            } },
              el('span', { class: 'cmp__index-no', text: ch.no }),
              el('span', { class: 'cmp__index-name' }, el('span', { class: 'cmp__index-en', text: ch.en }), el('span', { class: 'cmp__index-ja', text: ch.ja })),
              el('span', { class: 'cmp__index-val', text: headlineText(summaryOf(findQuestion(c.headline[ch.id]))) || '—' })));
          })))),
      C.chapters.map(compassChapter),
      el('div', { class: 'cmp__foot' },
        el('button', { type: 'button', class: 'cmp__all', onclick: function () { go('mine'); } },
          el('span', { class: 'cmp__all-label', text: c.all }), el('span', { class: 'cmp__all-arrow', 'aria-hidden': 'true', text: '→' })),
        el('div', { class: 'cmp__foot-links' },
          el('button', { type: 'button', class: 'text-btn', onclick: function () { go('final'); } }, '← ' + c.back),
          remoteOn() ? null : el('button', { type: 'button', class: 'text-btn', onclick: function () { window.print(); } }, c.print),
          el('button', { type: 'button', class: 'text-btn', onclick: function () { go('index'); } }, '目次へ'))),
      copyright()));
    return s;
  }

  /* 全体像の行に出す、代表の回答（本人の言葉をそのまま） */
  function headlineText(sum) {
    if (!sum) return '';
    if (sum.text) return sum.text.split('\n')[0];
    if (sum.tags) return sum.tags.join('・');
    if (sum.items) return sum.items.join('・');
    if (sum.rows && sum.rows[0]) return sum.rows[0].text;
    return '';
  }

  function compassChapter(ch) {
    var blocks = (C.compass.blocks[ch.id] || []).map(function (b) {
      return { title: b.title, products: b.products, qs: b.ids.map(findQuestion).filter(Boolean) };
    });
    var used = {};
    blocks.forEach(function (b) { b.qs.forEach(function (q) { used[q.id] = true; }); });
    var rest = ch.flat.filter(function (q) { return !used[q.id]; });
    if (rest.length) blocks.push({ title: 'そのほか', qs: rest });
    var n = answeredIn(ch);
    var body = blocks.map(compassBlock).filter(Boolean);
    return el('section', { class: 'cmp__chapter', id: 'cmp-' + ch.id, 'aria-labelledby': 'cmp-h-' + ch.id },
      el('header', { class: 'cmp__ch-head' },
        el('span', { class: 'cmp__ch-no', text: ch.no }),
        el('div', { class: 'cmp__ch-names' },
          el('h2', { class: 'cmp__ch-en', id: 'cmp-h-' + ch.id }, ch.en, el('span', { class: 'cmp__ch-ja', text: ch.ja })),
          el('p', { class: 'cmp__ch-desc', text: ch.desc })),
        el('div', { class: 'cmp__ch-side' },
          el('span', { class: 'cmp__ch-count', text: n + ' / ' + ch.flat.length }),
          el('button', { type: 'button', class: 'text-btn cmp__edit', onclick: function () { go('q:' + ch.questions[0].id); },
            'aria-label': ch.en + ' を見直す' }, '見直す'))),
      body.length ? body : el('p', { class: 'cmp__empty', text: C.compass.empty }));
  }

  /* 短い答え（ひとこと・選んだもの）は並べて、長い答え（文章・一覧・地図）は1行ずつ */
  function entryKind(q, sum) {
    if (q.feature) return 'feature';
    var keys = Object.keys(sum).filter(function (k) { return sum[k] != null; });
    if (keys.length === 1 && keys[0] === 'text') return q.type !== 'textarea' && sum.text.length <= 20 && sum.text.indexOf('\n') < 0 ? 'fact' : 'long';
    if (keys.length === 1 && keys[0] === 'tags') return 'chips';
    return 'long';
  }

  function compassBlock(b) {
    var entries = b.qs.map(function (q) { return { q: q, sum: summaryOf(q) }; }).filter(function (e) { return e.sum; });
    if (!entries.length) return null;
    var out = [];
    if (b.products) {
      var p = productsNode(entries);
      if (p) { out.push(p.node); entries = p.rest; }
    }
    var grid = null;
    entries.forEach(function (e) {
      var kind = entryKind(e.q, e.sum);
      var label = el('p', { class: 'cmp__label', text: e.q.label || e.q.title.replace(/\n/g, '') });
      if (kind === 'fact' || kind === 'chips') {
        if (!grid) { grid = el('div', { class: 'cmp__facts' }); out.push(grid); }
        grid.appendChild(el('div', { class: 'cmp__fact' + (kind === 'chips' ? ' cmp__fact--wide' : '') },
          label, el('div', { class: 'cmp__value' }, summaryNode(e.sum))));
        return;
      }
      grid = null;
      out.push(el('div', { class: 'cmp__entry' + (kind === 'feature' ? ' cmp__entry--feature' : '') },
        label, el('div', { class: 'cmp__body' }, summaryNode(e.sum))));
    });
    /* 2列に並べたとき　ひとつだけ余る短い答えは横幅いっぱいにして　空きマスを作らない */
    out.forEach(function (node) {
      if (!node.classList.contains('cmp__facts')) return;
      var run = [];
      Array.prototype.slice.call(node.children).concat([null]).forEach(function (cell) {
        if (cell && !cell.classList.contains('cmp__fact--wide')) { run.push(cell); return; }
        if (run.length % 2) run[run.length - 1].classList.add('cmp__fact--wide');
        run = [];
      });
    });
    return el('div', { class: 'cmp__block' },
      el('h3', { class: 'cmp__block-title' }, el('span', { 'aria-hidden': 'true' }), b.title),
      out);
  }

  /* 商品・サービス：1つずつカードにし、「中心」「育てたい」「見直したい」を印で添える
     商品に結びつかない答え（「まだ決まっていない」など）は、ふつうの項目として残す */
  function productsNode(entries) {
    var listQ = findQuestion('products.list');
    var items = (S.answer('products.list') || []).filter(F.filled);
    var listSum = summaryOf(listQ);
    if (!items.length || !listSum || !listSum.cards) return null;
    var core = S.answer('products.core');
    var grow = S.answer('products.grow') || [];
    var reduce = S.answer('products.reduce') || [];
    var ids = items.map(function (it) { return it._id; });
    var nameLabel = listQ.fields[0].label;
    var cards = items.map(function (it, i) {
      var rows = (listSum.cards[i] || { rows: [] }).rows;
      var nameRow = rows.filter(function (r) { return r.label === nameLabel; })[0];
      var marks = [];
      if (core === it._id) marks.push(['core', '中心']);
      if (grow.indexOf(it._id) >= 0) marks.push(['grow', '育てたい']);
      if (reduce.indexOf(it._id) >= 0) marks.push(['reduce', '見直したい']);
      return el('li', { class: 'cmp__product' + (core === it._id ? ' is-core' : '') },
        el('p', { class: 'cmp__product-name', text: nameRow ? nameRow.text : '（名称未記入）' }),
        marks.length ? el('ul', { class: 'cmp__marks' }, marks.map(function (m) {
          return el('li', { class: 'cmp__mark cmp__mark--' + m[0], text: m[1] });
        })) : null,
        rowsNode(rows.filter(function (r) { return r !== nameRow; })));
    });
    /* 商品カードに印として載らなかった答えは、そのまま項目として残す */
    var rest = entries.filter(function (e) {
      if (e.q.id === 'products.list') return false;
      var v = S.answer(e.q.id);
      var vals = Array.isArray(v) ? v : [v];
      return vals.some(function (x) { return F.filled(x) && ids.indexOf(x) < 0; });
    }).map(function (e) {
      if (!Array.isArray(S.answer(e.q.id))) return e;
      var left = (S.answer(e.q.id) || []).filter(function (x) { return ids.indexOf(x) < 0; });
      return { q: e.q, sum: { tags: left } };
    });
    return { node: el('ol', { class: 'cmp__products' }, cards), rest: rest };
  }

  /* ================================================================
     80問すべての回答を見る（質問ごとのシート）
     ================================================================ */
  function mineScreen() {
    var name = S.answer('profile.name');
    var s = screenShell('mine', 'ivory', C.send.mineTitle);
    s.appendChild(el('div', { class: 'page page--wide mine' },
      el('header', { class: 'page__head' },
        el('p', { class: 'eyebrow', text: 'MY ANSWERS' }),
        heading('h1', C.send.mineTitle, 'page__title'),
        el('p', { class: 'mine__meta' }, (name ? name + ' さん　' : '') + '記入した問い ' + totalAnswered() + ' / ' + TOTAL),
        el('p', { class: 'page__lead', text: C.send.mineLead })),
      karteNode(),
      el('div', { class: 'final__actions' },
        el('button', { type: 'button', class: 'btn-line', onclick: function () { go('compass'); } }, '← 骨子へ戻る'),
        el('button', { type: 'button', class: 'text-btn', onclick: function () { go('final'); } }, '完了画面へ'),
        el('button', { type: 'button', class: 'text-btn', onclick: function () { go('index'); } }, '目次へ')),
      copyright()));
    return s;
  }

  /* 章ごとのカルテ。VALUE の A〜E や AFTER MAP には小見出しを添える */
  function karteEntries(ch) {
    var out = [], lastSec = null;
    ch.flat.forEach(function (q) {
      var st = steps[stepOf[q.id]];
      var sec = st.section || q.section;
      var secKey = sec ? sec.en + sec.ja : (q.variant === 'aftermap' ? 'aftermap' : null);
      if (secKey && secKey !== lastSec) {
        out.push(el('div', { class: 'karte__subhead' },
          sec ? [el('span', { text: sec.en }), sec.ja] : [el('span', { text: 'AFTER MAP' }), 'あなたが起こせる変化']));
      }
      lastSec = secKey;
      var sum = F.get(q.type).summarize(q, getter);
      out.push(el('div', { class: 'karte__entry' + (q.feature ? ' is-feature' : '') + (sum ? '' : ' is-empty') },
        el('dt', { class: 'karte__q', text: q.label || q.title.replace(/\n/g, '') }),
        el('dd', { class: 'karte__a' }, summaryNode(sum))));
    });
    return out;
  }

  /* ---------- 書き出し（PDF生成・AI分析・BUSINESS COMPASS 生成への受け渡し用） ----------
     data      … 質問ID（意味を持つキー）で階層化した回答。Q番号が変わっても意味は変わらない
     questions … 表示順・質問文・入力形式つきの一覧（分析時に「何を聞いたか」を参照するため）
     raw       … 保存されている生データ（復元用） */
  function setPath(obj, path, value) {
    var parts = path.split('.');
    var cur = obj;
    parts.slice(0, -1).forEach(function (p) { cur = cur[p] = cur[p] || {}; });
    cur[parts[parts.length - 1]] = value;
  }
  function exportData() {
    var data = {};
    var questions = [];
    C.chapters.forEach(function (ch) {
      ch.flat.forEach(function (q) {
        var t = F.get(q.type);
        var value = t.value(q, getter);
        var entries = t.entries ? t.entries(q, getter) : null;
        if (entries) entries.forEach(function (e) { if (e.value != null) setPath(data, e.key, e.value); });
        else if (value != null) setPath(data, q.id, value);
        var st = steps[stepOf[q.id]];
        var sec = st.section || q.section;
        questions.push({
          id: q.id, no: questionNo[q.id],
          chapter: ch.en, section: sec ? sec.ja : (q.variant === 'aftermap' ? 'AFTER MAP' : null),
          question: q.title.replace(/\n/g, ''), label: q.label || null,
          type: q.type, feature: !!q.feature,
          answered: t.isAnswered(q, getter), value: value
        });
      });
    });
    return {
      app: 'BUSINESS COMPASS',
      schema: 'business-compass.karte/2',
      questionSet: '80',
      exportedAt: new Date().toISOString(),
      updatedAt: S.state.updatedAt,
      consent: S.state.consent,
      progress: { answered: totalAnswered(), total: allQuestions.length },
      data: data,
      questions: questions,
      raw: S.state.answers
    };
  }

  function downloadJSON() {
    var blob = new Blob([JSON.stringify(exportData(), null, 2)], { type: 'application/json' });
    var a = el('a', { href: URL.createObjectURL(blob), download: 'business-compass.json' });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }

  function confirmReset() {
    var dlg = document.getElementById('resetDialog');
    if (dlg && dlg.showModal) dlg.showModal();
    else if (window.confirm('入力した内容をすべて消去しますか')) doReset();
  }
  function doReset() { S.reset(); current = null; go('cover', { instant: true }); }

  /* ---------- 起動 ---------- */
  S.init();
  var dlg = document.getElementById('resetDialog');
  if (dlg) {
    dlg.addEventListener('close', function () { if (dlg.returnValue === 'reset') doReset(); });
  }
  F.nav.go = go;
  window.BusinessCompass = { go: go, exportData: exportData, content: C, store: S };
  go(S.state.cursor || 'cover', { instant: true });
})();
