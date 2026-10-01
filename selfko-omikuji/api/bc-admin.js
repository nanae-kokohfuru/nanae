/* =====================================================================
   /api/bc-admin — ななえ専用（裏カルテ）
   ---------------------------------------------------------------------
   ・合言葉（環境変数 BC_ADMIN_PASSPHRASE）を X-BC-Passphrase ヘッダーで受け取り、
     一致したときだけ応答します。URL には合言葉を載せません。
   ・合言葉を何度も間違えると、しばらく受け付けなくなります。
   GET  ?action=list        回答者一覧（名前・状況・送信日時・最終更新）
   GET  ?action=get&id=...  1人分の回答
   GET  ?action=status      保存先の接続確認
   POST { action: 'delete', id }  回答者の削除
   ===================================================================== */

const bc = require('./_bc.js');

const MAX_FAILS = 8;
const LOCK_SEC = 15 * 60;

function summary(r) {
  return {
    id: r.id, name: r.name || '', status: r.status || 'in_progress',
    answered: r.answered || 0, total: r.total || 0,
    createdAt: r.createdAt || null, updatedAt: r.updatedAt || null, submittedAt: r.submittedAt || null
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); return bc.send(res, 405, { error: 'method_not_allowed' }); }
  try {
    const passphrase = process.env.BC_ADMIN_PASSPHRASE;
    if (!passphrase) return bc.send(res, 503, { error: 'not_configured' });

    const failKey = 'bc:af:' + bc.sha256(bc.clientIp(req)).slice(0, 16);
    const fails = Number(await bc.redis(['GET', failKey])) || 0;
    if (fails >= MAX_FAILS) return bc.send(res, 429, { error: 'locked' });

    if (!bc.safeEqual(String(req.headers['x-bc-passphrase'] || ''), passphrase)) {
      await bc.pipeline([['INCR', failKey], ['EXPIRE', failKey, LOCK_SEC]]);
      return bc.send(res, 401, { error: 'passphrase' });
    }

    const url = new URL(req.url, 'http://local');
    const body = req.method === 'POST' ? await bc.readJson(req, 4096) : {};
    const action = req.method === 'POST' ? body.action : url.searchParams.get('action');
    const id = req.method === 'POST' ? body.id : url.searchParams.get('id');
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
