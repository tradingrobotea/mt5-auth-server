// netlify/functions/config.js
// 向 EA 下发云端配置
// 访问：GET /.netlify/functions/config?code=xxx&account=yyy

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
  symbol:             "XAUUSD",
  buy:                true,
  sell:               true,
  tradeEnable:        true,
  sl:                 150,
  tp:                 300,
  gridStep:           50,
  lotMultiplier:      1.5,
  partialCloseProfit: 100,
};

const CORS = {
  "Content-Type":                "application/json",
  "Cache-Control":               "no-cache",
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

exports.handler = async function (event) {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: CORS, body: "" };

  const p       = event.queryStringParameters || {};
  const code    = (p.code    || "").trim();
  const account = (p.account || "").trim();

  if (!isAuthorized(code, account))
    return respond(403, { status: "error", message: "unauthorized" });

  let config = { ...GLOBAL_CONFIG };

  try {
    const { getStore } = require("@netlify/blobs");
    const store = getStore("account-data");

    const globalOverride = await store.get("config/global", { type: "json" }).catch(() => null);
    if (globalOverride) config = { ...config, ...globalOverride };

    if (account) {
      const custom = await store.get(`config/${account}`, { type: "json" }).catch(() => null);
      if (custom) config = { ...config, ...custom };
    }
  } catch (err) {
    console.warn("[config] Blob读取异常，使用默认配置:", err.message);
  }

  return respond(200, {
    status:    "ok",
    account:   account || "unknown",
    updatedAt: new Date().toISOString(),
    ...config,
  });
};
