/* =====================================================================
   /api/bc-admin — ななえ専用（裏カルテ）
   ---------------------------------------------------------------------
   ・ログイン：合言葉（環境変数 BC_ADMIN_PASSPHRASE）を POST { action: 'login', passphrase } で受け取り、
     一致したら、このブラウザだけが持つログイン用 Cookie（HttpOnly・Secure・30日）を発行します。
     合言葉そのものはブラウザに保存しません。
   ・合言葉を変更すると、それまでのログインはすべて無効になります（Cookie の照合に合言葉を使うため）。
   ・以前の画面との互換のため、X-BC-Passphrase ヘッダー（encodeURIComponent 済み）でも認証できます。
   ・合言葉は前後の空白・改行を除き、文字の表記をそろえてから比べます（日本語の合言葉も使えます）。
   ・合言葉を何度も間違えると、しばらく受け付けなくなります。
   POST { action: 'login', passphrase }   ログイン
   POST { action: 'logout' }              ログアウト
   GET  ?action=list        回答者一覧（名前・状況・送信日時・最終更新）
   GET  ?action=get&id=...  1人分の回答
   GET  ?action=status      保存先の接続確認
   POST { action: 'delete', id }  回答者の削除
   ===================================================================== */

const bc = require('./_bc.js');

const MAX_FAILS = 8;
const LOCK_SEC = 15 * 60;
const SESSION_SEC = 30 * 24 * 60 * 60;
const COOKIE = 'bc_admin';
const KEY_SESSION = 'bc:sess:';

function summary(r) {
  return {
    id: r.id, name: r.name || '', status: r.status || 'in_progress',
    answered: r.answered || 0, total: r.total || 0,
    createdAt: r.createdAt || null, updatedAt: r.updatedAt || null, submittedAt: r.submittedAt || null
  };
}

/* 合言葉の照合（そのまま／encodeURIComponent 済み のどちらで届いても比べられるように） */
function passMatches(value, passphrase) {
  const raw = typeof value === 'string' ? value : '';
  if (!raw) return false;
  let decoded = raw;
  try { decoded = decodeURIComponent(raw); } catch (e) { /* そのままの値 */ }
  return [raw, decoded].map(bc.normalizeSecret).some((v) => bc.safeEqual(v, passphrase));
}

function readCookie(req, name) {
  const hit = String(req.headers.cookie || '').split(/;\s*/).filter((c) => c.indexOf(name + '=') === 0)[0];
  return hit ? hit.slice(name.length + 1) : '';
}
function setCookie(res, value, maxAge) {
  res.setHeader('Set-Cookie', COOKIE + '=' + value + '; Path=/api/bc-admin; HttpOnly; Secure; SameSite=Strict; Max-Age=' + maxAge);
}
/* セッションの保存キーには合言葉を混ぜる：合言葉を変えると、古いログインは自動で使えなくなる */
function sessionKey(token, passphrase) { return KEY_SESSION + bc.sha256(token + '\n' + passphrase); }

module.exports = async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); return bc.send(res, 405, { error: 'method_not_allowed' }); }
  try {
    const passphrase = bc.normalizeSecret(process.env.BC_ADMIN_PASSPHRASE);
    if (!passphrase) return bc.send(res, 503, { error: 'not_configured' });

    const url = new URL(req.url, 'http://local');
    const body = req.method === 'POST' ? await bc.readJson(req, 4096) : {};
    const action = req.method === 'POST' ? body.action : url.searchParams.get('action');
    const id = req.method === 'POST' ? body.id : url.searchParams.get('id');

    const failKey = 'bc:af:' + bc.sha256(bc.clientIp(req)).slice(0, 16);
    async function locked() { return (Number(await bc.redis(['GET', failKey])) || 0) >= MAX_FAILS; }
    async function failed() { await bc.pipeline([['INCR', failKey], ['EXPIRE', failKey, LOCK_SEC]]); }

    const token = readCookie(req, COOKIE);
    const validToken = /^[A-Za-z0-9_-]{30,100}$/.test(token);

    if (action === 'logout' && req.method === 'POST') {
      if (validToken) await bc.redis(['DEL', sessionKey(token, passphrase)]);
      setCookie(res, '', 0);
      return bc.send(res, 200, { ok: true });
    }

    if (action === 'login' && req.method === 'POST') {
      if (await locked()) return bc.send(res, 429, { error: 'locked' });
      if (!passMatches(body.passphrase, passphrase)) { await failed(); return bc.send(res, 401, { error: 'passphrase' }); }
      const fresh = bc.randomId(32);
      await bc.pipeline([['SET', sessionKey(fresh, passphrase), JSON.stringify({ createdAt: new Date().toISOString() }), 'EX', SESSION_SEC], ['DEL', failKey]]);
      setCookie(res, fresh, SESSION_SEC);
      return bc.send(res, 200, { ok: true });
    }

    /* ログイン済み（Cookie）か、合言葉ヘッダーで認証 */
    let authed = validToken && !!(await bc.redis(['GET', sessionKey(token, passphrase)]));
    if (!authed) {
      const header = String(req.headers['x-bc-passphrase'] || '');
      if (!header) return bc.send(res, 401, { error: 'login' });
      if (await locked()) return bc.send(res, 429, { error: 'locked' });
      if (!passMatches(header, passphrase)) { await failed(); return bc.send(res, 401, { error: 'passphrase' }); }
      authed = true;
    }

    const validId = typeof id === 'string' && /^[A-Za-z0-9_-]{16,64}$/.test(id);

    if (action === 'status') {
      const pong = await bc.redis(['PING']);
      return bc.send(res, 200, { ok: true, storage: pong === 'PONG', storageVars: bc.storageVarNames(), invite: !!process.env.BC_INVITE_CODE });
    }

    if (action === 'list' && req.method === 'GET') {
      const ids = (await bc.redis(['ZREVRANGE', bc.KEY_INDEX, 0, 299])) || [];
      if (!ids.length) return bc.send(res, 200, { respondents: [] });
      const raws = await bc.redis(['MGET'].concat(ids.map((x) => bc.KEY_RECORD + x)));
      const list = (raws || []).map((raw) => { try { return raw ? summary(JSON.parse(raw)) : null; } catch (e) { return null; } }).filter(Boolean);
      return bc.send(res, 200, { respondents: list });
    }

    if (action === 'get' && req.method === 'GET') {
      if (!validId) return bc.send(res, 400, { error: 'id' });
      const raw = await bc.redis(['GET', bc.KEY_RECORD + id]);
      if (!raw) return bc.send(res, 404, { error: 'not_found' });
      const r = JSON.parse(raw);
      return bc.send(res, 200, Object.assign(summary(r), { consentAt: r.consentAt || null, answers: r.answers || {} }));
    }

    if (action === 'delete' && req.method === 'POST') {
      if (!validId) return bc.send(res, 400, { error: 'id' });
      await bc.pipeline([['DEL', bc.KEY_RECORD + id], ['ZREM', bc.KEY_INDEX, id]]);
      return bc.send(res, 200, { ok: true });
    }

    return bc.send(res, 400, { error: 'action' });
  } catch (e) {
    return bc.send(res, e.status || 500, { error: e.code || 'server_error' });
  }
};
