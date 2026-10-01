/* =====================================================================
   BUSINESS COMPASS — REMOTE（回答をななえに送る）
   ---------------------------------------------------------------------
   ・回答はこれまでどおり、まずこの端末（localStorage）に保存されます。
     通信できなくても回答は消えません。
   ・招待リンク（?invite=…）から開いたときだけ、サーバーへの保存が有効になります。
     招待コードはこの端末に覚えておくので、次からはリンクなしで開いても大丈夫です。
   ・サーバーとのやりとりは /api/bc-save だけです（保存専用・読み出しなし）。
   ・回答者ID とトークンは、この端末に保存します。同じ端末からの保存は
     同じ回答者として上書きされるので、回答者が増えることはありません。
   ===================================================================== */

(function () {
  var KEY = 'business-compass:remote';
  var ENDPOINT = '/api/bc-save';

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; }
  }
  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }
  var state = load();

  /* 招待リンクのコードを覚えて、アドレスバーからは消す */
  try {
    var url = new URL(window.location.href);
    var invite = url.searchParams.get('invite');
    if (invite) {
      state.invite = invite.slice(0, 200);
      persist();
      url.searchParams.delete('invite');
      window.history.replaceState(null, '', url.pathname + url.search + url.hash);
    }
  } catch (e) {}

  var timer = null;
  var inflight = null;

  function enabled() { return !!state.invite; }

  function post(kind, payload) {
    var body = Object.assign({}, payload, { kind: kind, invite: state.invite, id: state.id || null, token: state.token || null });
    return fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
      credentials: 'same-origin'
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) { return { status: r.status, body: j }; });
    });
  }

  function attempt(kind, payload, retried) {
    return post(kind, payload).then(function (r) {
      if (r.status === 200 && r.body && r.body.ok) {
        state.id = r.body.id;
        if (r.body.token) state.token = r.body.token;
        state.lastSyncAt = r.body.updatedAt;
        if (r.body.submittedAt) state.submittedAt = r.body.submittedAt;
        persist();
        return { ok: true, submittedAt: state.submittedAt || null };
      }
      /* この端末の回答者情報が無効になっていた場合だけ、1度だけ新しく登録し直す */
      if (r.status === 403 && r.body && r.body.error === 'token' && !retried) {
        delete state.id; delete state.token; persist();
        return attempt(kind, payload, true);
      }
      return { ok: false, reason: (r.body && r.body.error) || ('http_' + r.status) };
    }, function () {
      return { ok: false, reason: 'network' };
    });
  }

  /* 同時に2つ送らない（回答者が二重に作られないように） */
  function queue(kind, getPayload) {
    var run = function () { return attempt(kind, getPayload()); };
    var p = (inflight || Promise.resolve()).then(run, run);
    inflight = p.then(function (x) { if (inflight === p) inflight = null; return x; });
    return p;
  }

  window.BCRemote = {
    enabled: enabled,
    submittedAt: function () { return state.submittedAt || null; },
    /* 途中保存：画面を進めたあと、少し待ってから静かに送る（失敗しても何も表示しない） */
    schedule: function (getPayload) {
      if (!enabled()) return;
      clearTimeout(timer);
      timer = setTimeout(function () { queue('autosave', getPayload); }, 1500);
    },
    /* 「回答をななえに送る」 */
    submit: function (getPayload) {
      clearTimeout(timer);
      return queue('submit', getPayload);
    }
  };
})();
