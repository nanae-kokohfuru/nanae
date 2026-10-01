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
    if (['cover', 'consent', 'index', 'final', 'mine'].indexOf(cursor) >= 0) return true;
    if (cursor.indexOf('door:') === 0) return !!findChapter(cursor.slice(5));
    if (cursor.indexOf('q:') === 0) return !!steps[cursor.slice(2)];
    return false;
  }

  function render(cursor) {
    var parts = cursor.split(':');
    if (cursor === 'cover') return coverScreen();
    if (cursor === 'consent') return consentScreen();
    if (cursor === 'index') return indexScreen();
    if (cursor === 'final') return remoteOn() ? sendScreen() : finalScreen();
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

  function finalScreen() {
    var c = C.final;
    var s = screenShell('final', 'ivory', c.eyebrow);
    var answered = totalAnswered();
    var total = allQuestions.length;
    var name = S.answer('profile.name');
    var brand = S.answer('profile.brand_names');

    s.appendChild(el('div', { class: 'final__hero' },
      el('div', { class: 'final__media' }, photo('final', 'photo--final'), el('div', { class: 'veil veil--final' })),
      el('div', { class: 'final__heroInner' },
        el('p', { class: 'eyebrow eyebrow--light', text: c.eyebrow }),
        el('h1', { class: 'final__title', tabindex: '-1', 'data-focus': '' }, lines(c.title)),
        el('div', { class: 'final__body' }, c.body.map(function (t) { return el('p', { text: t }); })))));

    s.appendChild(el('div', { class: 'page page--wide final__summary' },
      el('div', { class: 'final__overview' },
        el('div', { class: 'final__rose' }, compassRose()),
        el('div', { class: 'final__meta' },
          el('p', { class: 'eyebrow', text: 'KARTE' }),
          el('h2', { class: 'final__name' }, name ? name + ' さん' : 'あなた', brand ? el('span', { text: brand }) : null),
          el('dl', { class: 'final__stats' },
            el('dt', { text: '記入した問い' }), el('dd', {}, el('strong', { text: String(answered) }), ' / ' + total),
            el('dt', { text: '最終更新' }), el('dd', { text: S.state.updatedAt ? new Date(S.state.updatedAt).toLocaleDateString('ja-JP') : '—' })),
          el('p', { class: 'final__next' }, lines(
            '次のステップでは　このカルテをもとに\n「BUSINESS COMPASS — 1枚の経営羅針盤」を作成します')))),

      karteNode(),

      el('div', { class: 'final__actions' },
        el('button', { type: 'button', class: 'btn-line', onclick: function () { window.print(); } }, '印刷・PDFで保存'),
        el('button', { type: 'button', class: 'btn-line', onclick: downloadJSON }, '回答データを書き出す'),
        el('button', { type: 'button', class: 'text-btn', onclick: function () { go('index'); } }, '目次へ'),
        el('button', { type: 'button', class: 'text-btn text-btn--quiet', onclick: confirmReset }, 'すべて消去して最初から')),
      copyright()
    ));
    return s;
  }

  /* 80問の回答を章ごとのシートで並べる（最終画面と「私の回答を見る」で共用） */
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

  function finalHero(c) {
    return el('div', { class: 'final__hero' },
      el('div', { class: 'final__media' }, photo('final', 'photo--final'), el('div', { class: 'veil veil--final' })),
      el('div', { class: 'final__heroInner' },
        el('p', { class: 'eyebrow eyebrow--light', text: c.eyebrow }),
        el('h1', { class: 'final__title', tabindex: '-1', 'data-focus': '' }, lines(c.title)),
        el('div', { class: 'final__body' }, c.body.map(function (t) { return el('p', { text: t }); }))));
  }

  function formatDateTime(iso) {
    var d = new Date(iso);
    if (isNaN(d)) return '';
    return d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日 ' +
      String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }

  /* ================================================================
     招待リンクから開いた回答者の最終画面：「回答をななえに送る」
     ================================================================ */
  function sendScreen() {
    var c = C.final, t = C.send;
    var s = screenShell('final', 'ivory', c.eyebrow);
    s.appendChild(finalHero(c));

    var status = el('p', { class: 'send__status', role: 'status', 'aria-live': 'polite' });
    var btn = goldButton(t.button, doSend);
    btn.classList.add('send__btn');
    var label = btn.querySelector('.btn-gold__label');
    var done = el('div', { class: 'send__done', hidden: true },
      el('p', { class: 'send__done-title' }, el('span', { class: 'send__mark', 'aria-hidden': 'true' }), t.doneTitle),
      el('p', { class: 'send__done-body' }, lines(t.doneBody)),
      el('p', { class: 'send__done-at' }));
    function showDone(at) {
      done.hidden = false;
      done.querySelector('.send__done-at').textContent = at ? t.sentAt + '　' + formatDateTime(at) : '';
      label.textContent = t.resend;
      hint.textContent = t.resendHint;
    }
    var hint = el('p', { class: 'send__hint', text: t.hint });

    function doSend() {
      if (btn.disabled) return;
      btn.disabled = true;
      btn.classList.add('is-sending');
      done.hidden = true;
      label.textContent = t.sending;
      status.className = 'send__status';
      status.textContent = t.sendingNote;
      window.BCRemote.submit(remotePayload).then(function (r) {
        btn.disabled = false;
        btn.classList.remove('is-sending');
        if (r.ok) {
          status.textContent = '';
          showDone(r.submittedAt);
          done.focus && done.setAttribute('tabindex', '-1');
          done.focus && done.focus({ preventScroll: false });
        } else {
          label.textContent = window.BCRemote.submittedAt() ? t.resend : t.button;
          status.className = 'send__status is-error';
          status.textContent = r.reason === 'invite' ? t.errorInvite : t.error;
        }
      });
    }

    s.appendChild(el('div', { class: 'page page--send' },
      el('section', { class: 'send', 'aria-labelledby': 'send-title' },
        el('p', { class: 'eyebrow', text: 'SEND' }),
        el('h2', { class: 'send__title', id: 'send-title' }, lines(t.title)),
        el('p', { class: 'send__count' }, '記入した問い　', el('strong', { text: String(totalAnswered()) }), ' / ' + TOTAL),
        btn,
        status,
        hint,
        done,
        el('div', { class: 'send__links' },
          el('button', { type: 'button', class: 'btn-line', onclick: function () { go('mine'); } }, t.mine),
          el('button', { type: 'button', class: 'text-btn', onclick: function () { go('index'); } }, '目次へ'))),
      copyright()));
    if (window.BCRemote.submittedAt()) showDone(window.BCRemote.submittedAt());
    return s;
  }

  /* ================================================================
     私の回答を見る（80問を読みやすいシートで）
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
        el('button', { type: 'button', class: 'btn-line', onclick: function () { go('final'); } }, '← 戻る'),
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
