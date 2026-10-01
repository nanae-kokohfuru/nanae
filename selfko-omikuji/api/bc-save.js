/* =====================================================================
   POST /api/bc-save — 回答の保存（途中保存と「回答をななえに送る」）
   ---------------------------------------------------------------------
   ・招待コード（環境変数 BC_INVITE_CODE）が一致したときだけ受け付けます。
   ・初回は回答者ID と 回答者だけが持つ秘密のトークン を発行します。
     2回目以降は同じIDとトークンで上書きするので、回答者は増えません。
   ・トークンはハッシュ化して保存し、元の値は回答者の端末にだけ残ります。
   ・このAPIは保存専用です。回答を読み出す機能はありません。
   ===================================================================== */

const bc = require('./_bc.js');

const LIMIT_BYTES = 400 * 1024;
const MAX_KEYS = 800;

function clip(text, n) { return String(text == null ? '' : text).slice(0, n); }
function int(v, max) { const n = Math.floor(Number(v)); return Number.isFinite(n) && n >= 0 ? Math.min(n, max) : 0; }

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return bc.send(res, 405, { error: 'method_not_allowed' }); }
  try {
    const invite = process.env.BC_INVITE_CODE;
    if (!invite) return bc.send(res, 503, { error: 'not_configured' });
    if (!(await bc.rateLimit('save', req, 60, 60))) return bc.send(res, 429, { error: 'too_many_requests' });

    const body = await bc.readJson(req, LIMIT_BYTES);
    if (!bc.safeEqual(String(body.invite || ''), invite)) return bc.send(res, 403, { error: 'invite' });
    if (body.consent !== true) return bc.send(res, 400, { error: 'consent' });

    const answers = body.answers;
    if (!answers || typeof answers !== 'object' || Array.isArray(answers) || Object.keys(answers).length > MAX_KEYS) {
      return bc.send(res, 400, { error: 'answers' });
    }
    const kind = body.kind === 'submit' ? 'submit' : 'autosave';
    const now = new Date().toISOString();

    let id = typeof body.id === 'string' && /^[A-Za-z0-9_-]{16,64}$/.test(body.id) ? body.id : null;
    let record = null;
    let issuedToken = null;
    if (id) {
      const raw = await bc.redis(['GET', bc.KEY_RECORD + id]);
      if (raw) {
        record = JSON.parse(raw);
        if (!bc.safeEqual(bc.sha256(String(body.token || '')), record.tokenHash)) return bc.send(res, 403, { error: 'token' });
      } else {
        id = null; /* 管理側で削除済みなどの場合は、新しい回答者として保存し直す */
      }
    }
    if (!record) {
      id = bc.randomId(18);
      issuedToken = bc.randomId(32);
      record = { id: id, tokenHash: bc.sha256(issuedToken), createdAt: now, status: 'in_progress' };
    }

    record.name = clip(answers['profile.name'], 80).trim();
    record.answers = answers;
    record.answered = int(body.answered, 1000);
    record.total = int(body.total, 1000);
    record.consentAt = clip(body.consentAt, 40) || record.consentAt || null;
    record.updatedAt = now;
    if (kind === 'submit') {
      record.status = 'submitted';
      record.submittedAt = now;
      record.submitCount = (record.submitCount || 0) + 1;
    }

    await bc.pipeline([
      ['SET', bc.KEY_RECORD + id, JSON.stringify(record)],
      ['ZADD', bc.KEY_INDEX, Date.now(), id]
    ]);

    const out = { ok: true, id: id, updatedAt: now, submittedAt: record.submittedAt || null };
    if (issuedToken) out.token = issuedToken;
    return bc.send(res, 200, out);
  } catch (e) {
    return bc.send(res, e.status || 500, { error: e.code || 'server_error' });
  }
};
