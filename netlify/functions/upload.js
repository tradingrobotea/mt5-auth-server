// netlify/functions/upload.js
// 接收 EA 上传数据 → 存入 Netlify Blobs
// 访问：POST /.netlify/functions/upload?code=xxx&account=yyy

const CODE_LIST = [
  { code: "123456", expire: "2026-06-30" },
  { code: "3456",   expire: "2026-08-01" },
  { code: "VIP888", expire: "2027-01-01" },
];
const ACCOUNT_LIST = [
  { account: "78000801", expire: "2026-06-30" },
  { account: "88888888", expire: "2026-12-31" },
];

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
  if (event.httpMethod !== "POST")
    return respond(405, { status: "error", message: "method_not_allowed" });

  const p       = event.queryStringParameters || {};
  const code    = (p.code    || "").trim();
  const account = (p.account || "").trim();

  if (!isAuthorized(code, account))
    return respond(403, { status: "error", message: "unauthorized" });

  let payload;
  try { payload = JSON.parse(event.body || "{}"); }
  catch { return respond(400, { status: "error", message: "invalid_json" }); }

  if (!payload.account)
    return respond(400, { status: "error", message: "missing_account" });

  payload.serverTime = new Date().toISOString();

  try {
    // 动态 require，Netlify 部署时才加载
    const { getStore } = require("@netlify/blobs");
    const store = getStore("account-data");
    await store.setJSON(`account_data/${payload.account}`, payload);
  } catch (err) {
    console.error("[upload] Blob写入失败:", err.message);
    return respond(500, { status: "error", message: "storage_error: " + err.message });
  }

  return respond(200, {
    status:     "ok",
    message:    "uploaded",
    account:    payload.account,
    serverTime: payload.serverTime,
  });
};
