/* =====================================================================
   BUSINESS COMPASS — サーバー側の共通処理（Vercel Functions）
   ---------------------------------------------------------------------
   ・ファイル名が「_」で始まるため、このファイル自体は公開APIになりません。
   ・Upstash の接続情報・招待コード・合言葉は、すべて Vercel の環境変数から読みます。
     値をコードに書いたり、ブラウザへ返したりはしません。
   ・ブラウザは Upstash に直接アクセスしません。必ずこの API を経由します。
   ===================================================================== */

const crypto = require('crypto');

/* Upstash の接続情報が入っている環境変数の「名前」（値ではありません）。
   ★本番反映前に、Vercel の nanae プロジェクト → Settings → Environment Variables に
     実際に表示されている名前と一致しているか確認すること。 */
const STORAGE_URL_VAR = 'KV_REST_API_URL';     /* ★要確認 */
const STORAGE_TOKEN_VAR = 'KV_REST_API_TOKEN'; /* ★要確認 */

const KEY_RECORD = 'bc:r:';      /* 回答者ごとの回答（JSON） */
const KEY_INDEX = 'bc:index';    /* 回答者一覧（最終更新順） */

function httpError(status, code) {
  const e = new Error(code);
  e.status = status;
  e.code = code;
  return e;
}

function storageConfig() {
  const url = process.env[STORAGE_URL_VAR];
  const token = process.env[STORAGE_TOKEN_VAR];
  if (!url || !token) throw httpError(503, 'storage_not_configured');
  return { url: url.replace(/\/+$/, ''), token };
}

/* Upstash REST API：1つのコマンド */
async function redis(command) {
  const { url, token } = storageConfig();
  const r = await fetch(url, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify(command)
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw httpError(502, 'storage_error');
  return j.result;
}

/* Upstash REST API：複数のコマンドをまとめて */
async function pipeline(commands) {
  const { url, token } = storageConfig();
  const r = await fetch(url + '/pipeline', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify(commands)
  });
  const j = await r.json().catch(() => null);
  if (!r.ok || !Array.isArray(j) || j.some((x) => x && x.error)) throw httpError(502, 'storage_error');
  return j.map((x) => x.result);
}

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Robots-Tag', 'noindex');
  res.end(JSON.stringify(body));
}

/* 本文（JSON）を上限つきで読む */
async function readJson(req, limitBytes) {
  let body;
  try { body = req.body; } catch (e) { throw httpError(400, 'bad_json'); }
  if (body && typeof body === 'object' && !Buffer.isBuffer(body)) {
    if (Buffer.byteLength(JSON.stringify(body)) > limitBytes) throw httpError(413, 'too_large');
    return body;
  }
  let text = typeof body === 'string' ? body : (Buffer.isBuffer(body) ? body.toString('utf8') : null);
  if (text == null) {
    text = await new Promise((resolve, reject) => {
      let size = 0; const chunks = [];
      req.on('data', (c) => { size += c.length; if (size > limitBytes) { reject(httpError(413, 'too_large')); req.destroy(); } else chunks.push(c); });
      req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      req.on('error', reject);
    });
  }
  if (Buffer.byteLength(text) > limitBytes) throw httpError(413, 'too_large');
  try { return JSON.parse(text || '{}'); } catch (e) { throw httpError(400, 'bad_json'); }
}

function sha256(text) { return crypto.createHash('sha256').update(String(text)).digest('hex'); }

/* 長さに関係なく一定時間で比べる（合言葉・招待コード・トークン用） */
function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || !a || !b) return false;
  return crypto.timingSafeEqual(Buffer.from(sha256(a), 'hex'), Buffer.from(sha256(b), 'hex'));
}

function randomId(bytes) { return crypto.randomBytes(bytes).toString('base64url'); }

function clientIp(req) {
  const xf = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return xf || req.headers['x-real-ip'] || (req.socket && req.socket.remoteAddress) || 'unknown';
}

/* 同じ接続元からの短時間の大量アクセスを止める */
async function rateLimit(name, req, max, windowSec) {
  const slot = Math.floor(Date.now() / 1000 / windowSec);
  const key = 'bc:rl:' + name + ':' + sha256(clientIp(req)).slice(0, 16) + ':' + slot;
  const [count] = await pipeline([['INCR', key], ['EXPIRE', key, windowSec * 2]]);
  return count <= max;
}

module.exports = {
  STORAGE_URL_VAR, STORAGE_TOKEN_VAR, KEY_RECORD, KEY_INDEX,
  httpError, redis, pipeline, send, readJson, sha256, safeEqual, randomId, clientIp, rateLimit
};
