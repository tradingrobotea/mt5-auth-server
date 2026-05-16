// netlify/functions/admin.js
// 管理接口 —— 仅供你在浏览器/Postman 使用
//
// GET  ?key=xxx&action=list                       列出所有已上传账号
// GET  ?key=xxx&action=get&account=78000801       查看某账号持仓/资金
// POST ?key=xxx&action=setConfig&account=xxx      设置账号个性化配置
// POST ?key=xxx&action=setGlobalConfig            设置全局配置（紧急停止：tradeEnable:false）
// GET  ?key=xxx&action=deleteConfig&account=xxx   删除账号个性化配置

const ADMIN_KEY = process.env.ADMIN_KEY || "change_me_admin_key";

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
  const key     = (p.key     || "").trim();
  const action  = (p.action  || "").trim();
  const account = (p.account || "").trim();

  if (key !== ADMIN_KEY)
    return respond(403, { status: "error", message: "forbidden" });

  // 动态加载 Blobs（只在 Netlify 环境中有效）
  let store;
  try {
    const { getStore } = require("@netlify/blobs");
    store = getStore("account-data");
  } catch (err) {
    return respond(500, { status: "error", message: "blobs_unavailable: " + err.message });
  }

  // ── list ──────────────────────────────────────────────────────
  if (action === "list") {
    const { blobs } = await store.list({ prefix: "account_data/" });
    const accounts = blobs.map(b => b.key.replace("account_data/", ""));
    return respond(200, { status: "ok", count: accounts.length, accounts });
  }

  // ── get ───────────────────────────────────────────────────────
  if (action === "get") {
    if (!account) return respond(400, { status: "error", message: "missing_account" });
    const data = await store.get(`account_data/${account}`, { type: "json" }).catch(() => null);
    if (!data) return respond(404, { status: "error", message: "not_found" });
    return respond(200, { status: "ok", data });
  }

  // ── setConfig ─────────────────────────────────────────────────
  if (action === "setConfig") {
    if (!account) return respond(400, { status: "error", message: "missing_account" });
    let body;
    try { body = JSON.parse(event.body || "{}"); }
    catch { return respond(400, { status: "error", message: "invalid_json" }); }
    await store.setJSON(`config/${account}`, body);
    return respond(200, { status: "ok", message: "config_saved", account, config: body });
  }

  // ── setGlobalConfig ───────────────────────────────────────────
  if (action === "setGlobalConfig") {
    let body;
    try { body = JSON.parse(event.body || "{}"); }
    catch { return respond(400, { status: "error", message: "invalid_json" }); }
    await store.setJSON("config/global", body);
    return respond(200, { status: "ok", message: "global_config_saved", config: body });
  }

  // ── deleteConfig ──────────────────────────────────────────────
  if (action === "deleteConfig") {
    if (!account) return respond(400, { status: "error", message: "missing_account" });
    await store.delete(`config/${account}`);
    return respond(200, { status: "ok", message: "config_deleted", account });
  }

  return respond(400, { status: "error", message: "unknown_action: " + action });
};
