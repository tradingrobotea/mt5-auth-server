// netlify/functions/auth.js
// 访问：/.netlify/functions/auth?code=xxx&account=yyy

const CODE_LIST = [
  { code: "123456", expire: "2026-06-30" },
  { code: "3456",   expire: "2026-08-01" },
  { code: "VIP888", expire: "2027-01-01" },
];

const ACCOUNT_LIST = [
  { account: "78000801", expire: "2026-06-30" },
  { account: "88888888", expire: "2026-12-31" },
];

const DEFAULT_CONFIG = {
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

exports.handler = async function (event) {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: CORS, body: "" };

  const p       = event.queryStringParameters || {};
  const code    = (p.code    || "").trim();
  const account = (p.account || "").trim();
  const now     = new Date();

  const codeData = CODE_LIST.find(i => i.code === code);
  if (codeData) {
    if (now > new Date(codeData.expire))
      return respond(400, { status: "error", message: "code_expired" });
    return respond(200, { status: "ok", mode: "code", expire: codeData.expire, ...DEFAULT_CONFIG });
  }

  const accData = ACCOUNT_LIST.find(i => i.account === account);
  if (accData) {
    if (now > new Date(accData.expire))
      return respond(400, { status: "error", message: "account_expired" });
    return respond(200, { status: "ok", mode: "account", expire: accData.expire, ...DEFAULT_CONFIG });
  }

  return respond(403, { status: "error", message: "invalid_credentials" });
};
