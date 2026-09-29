/* =====================================================================
   BUSINESS COMPASS — STORE
   ---------------------------------------------------------------------
   保存先はアダプタで差し替え可能。
   今は localStorage。DB に切り替えるときは、同じ形の
   { load(), save(state), clear() } を持つアダプタを作り、
   BCStore.use(adapter) を呼ぶだけで UI 側は変更不要です。
   ===================================================================== */

(function () {
  var KEY = 'business-compass:v2';

  var localAdapter = {
    load: function () {
      try {
        var saved = JSON.parse(window.localStorage.getItem(KEY));
        if (saved) return saved;
        /* 旧プロトタイプ（v1）の同意だけは引き継ぐ。回答は質問が変わったため引き継がない */
        var old = JSON.parse(window.localStorage.getItem('business-compass:v1'));
        return old && old.consent ? { consent: old.consent } : null;
      } catch (e) { return null; }
    },
    save: function (state) {
      try { window.localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* 保存できない環境でも動作は続ける */ }
    },
    clear: function () {
      try { window.localStorage.removeItem(KEY); } catch (e) {}
    }
  };

  function blank() {
    return {
      version: 1,
      consent: { required: false, optional: false, agreedAt: null },
      answers: {},
      cursor: 'cover',
      updatedAt: null
    };
  }

  var adapter = localAdapter;
  var state = blank();
  var timer = null;

  function merge(saved) {
    var s = blank();
    if (!saved || typeof saved !== 'object') return s;
    s.consent = Object.assign(s.consent, saved.consent || {});
    s.answers = saved.answers && typeof saved.answers === 'object' ? saved.answers : {};
    s.cursor = typeof saved.cursor === 'string' ? saved.cursor : 'cover';
    s.updatedAt = saved.updatedAt || null;
    return s;
  }

  function flush() {
    clearTimeout(timer);
    timer = null;
    state.updatedAt = new Date().toISOString();
    adapter.save(state);
  }

  window.BCStore = {
    use: function (next) { adapter = next; },
    init: function () { state = merge(adapter.load()); return state; },
    get state() { return state; },

    answer: function (key) { return state.answers[key]; },
    setAnswer: function (key, value) {
      state.answers[key] = value;
      clearTimeout(timer);
      timer = setTimeout(flush, 250);
    },
    setConsent: function (patch) { Object.assign(state.consent, patch); flush(); },
    setCursor: function (cursor) { state.cursor = cursor; flush(); },
    flush: flush,
    reset: function () { adapter.clear(); state = blank(); }
  };

  window.addEventListener('pagehide', function () { if (timer) flush(); });
})();
