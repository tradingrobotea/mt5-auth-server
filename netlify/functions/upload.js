// netlify/functions/upload.js
// POST /.netlify/functions/upload?code=xxx&account=yyy
//
// 使用 jsonbin.io 免费存储账户数据
// 环境变量需要设置（Netlify -> Environment Variables）:
//   JSONBIN_KEY   = jsonbin.io 的 X-Master-Key
//   JSONBIN_BINID = 存账户数据的 bin ID（一个bin存所有账号的map）

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

// 读取 bin 里的全量数据
async function readBin() {
  const r = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_BINID}/latest`, {
    headers: { "X-Master-Key": JSONBIN_KEY }
  });
  if (!r.ok) throw new Error(`jsonbin read failed: ${r.status}`);
  const j = await r.json();
  return j.record || {};
}

// 写入 bin（全量覆盖）
async function writeBin(data) {
  const r = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_BINID}`, {
    method: "PUT",
    headers: {
      "Content-Type":  "application/json",
      "X-Master-Key":  JSONBIN_KEY,
      "X-Bin-Versioning": "false",   // 不保留版本历史，节省空间
    },
    body: JSON.stringify(data),
  });
  if (!r.ok) throw new Error(`jsonbin write failed: ${r.status}`);
}

exports.handler = async function (event) {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: CORS, body: "" };
  if (event.httpMethod !== "POST")
    return respond(405, { status: "error", message: "method_not_allowed" });

  const p = event.queryStringParameters || {};
  const code    = (p.code    || "").trim();
  const account = (p.account || "").trim();

  if (!isAuthorized(code, account))
    return respond(403, { status: "error", message: "unauthorized" });

  if (!JSONBIN_KEY || !JSONBIN_BINID)
    return respond(500, { status: "error", message: "storage_not_configured" });

  let payload;
  try { payload = JSON.parse(event.body || "{}"); }
  catch { return respond(400, { status: "error", message: "invalid_json" }); }

  if (!payload.account)
    return respond(400, { status: "error", message: "missing_account" });

  payload.serverTime = new Date().toISOString();

  try {
    // 读出全量 → 更新对应账号 → 写回
    const allData = await readBin();
    allData[`account_${payload.account}`] = payload;
    await writeBin(allData);
    console.log(`[upload] 账号 ${payload.account} 保存成功`);
  } catch (err) {
    console.error("[upload] 存储失败:", err.message);
    return respond(500, { status: "error", message: "storage_error: " + err.message });
  }

  return respond(200, {
    status:     "ok",
    message:    "uploaded",
    account:    payload.account,
    serverTime: payload.serverTime,
  });
};
