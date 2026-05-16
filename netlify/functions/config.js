// netlify/functions/config.js
// GET /.netlify/functions/config?code=xxx&account=yyy
//
// 优先级：账号级配置 > 全局覆盖 > 代码默认值
// 配置也存在 jsonbin 的同一个 bin 里，key: config_global / config_{account}

const CODE_LIST = [
  { code: "123456", expire: "2026-06-30" },
  { code: "3456",   expire: "2026-08-01" },
  { code: "VIP888", expire: "2027-01-01" },
];
const ACCOUNT_LIST = [
  { account: "78000801", expire: "2026-06-30" },
  { account: "88888888", expire: "2026-12-31" },
];

const GLOBAL_CONFIG = {
  symbol: "XAUUSD", buy: true, sell: true, tradeEnable: true,
  sl: 150, tp: 300, gridStep: 50, lotMultiplier: 1.5, partialCloseProfit: 100,
};

const CORS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-cache",
  "Access-Control-Allow-Origin": "*",
};

function respond(code, body) {
  return { statusCode: code, headers: CORS, body: JSON.stringify(body) };
}

function isAuthorized(code, account) {
  const now = new Date();
  return CODE_LIST.some(i => i.code === code && now <= new Date(i.expire))
      || ACCOUNT_LIST.some(i => i.account === account && now <= new Date(i.expire));
}

const JSONBIN_KEY   = process.env.JSONBIN_KEY   || "";
const JSONBIN_BINID = process.env.JSONBIN_BINID || "";

async function readBin() {
  if (!JSONBIN_KEY || !JSONBIN_BINID) return {};
  try {
    const r = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_BINID}/latest`, {
      headers: { "X-Master-Key": JSONBIN_KEY }
    });
    if (!r.ok) return {};
    const j = await r.json();
    return j.record || {};
  } catch { return {}; }
}

exports.handler = async function (event) {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: CORS, body: "" };

  const p = event.queryStringParameters || {};
  const code    = (p.code    || "").trim();
  const account = (p.account || "").trim();

  if (!isAuthorized(code, account))
    return respond(403, { status: "error", message: "unauthorized" });

  // 从 jsonbin 读出，叠加配置
  const allData = await readBin();

  let config = { ...GLOBAL_CONFIG };
  if (allData.config_global)         config = { ...config, ...allData.config_global };
  if (account && allData[`config_${account}`]) config = { ...config, ...allData[`config_${account}`] };

  return respond(200, {
    status:    "ok",
    account:   account || "unknown",
    updatedAt: new Date().toISOString(),
    ...config,
  });
};
