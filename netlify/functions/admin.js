// netlify/functions/admin.js
// 管理接口（浏览器/Postman 使用）
//
// GET  ?key=xxx&action=list                       列出所有已上传账号
// GET  ?key=xxx&action=get&account=78000801       查看某账号数据
// GET  ?key=xxx&action=getConfig&account=xxx      查看某账号配置
// POST ?key=xxx&action=setConfig&account=xxx      设置账号个性化配置
// POST ?key=xxx&action=setGlobalConfig            全局配置（紧急停止：tradeEnable:false）
// GET  ?key=xxx&action=deleteConfig&account=xxx   删除账号个性化配置

const ADMIN_KEY     = process.env.ADMIN_KEY     || "change_me_admin_key";
const JSONBIN_KEY   = process.env.JSONBIN_KEY   || "";
const JSONBIN_BINID = process.env.JSONBIN_BINID || "";

const CORS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-cache",
  "Access-Control-Allow-Origin": "*",
};

function respond(code, body) {
  return { statusCode: code, headers: CORS, body: JSON.stringify(body) };
}

async function readBin() {
  const r = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_BINID}/latest`, {
    headers: { "X-Master-Key": JSONBIN_KEY }
  });
  if (!r.ok) throw new Error(`jsonbin read ${r.status}`);
  return (await r.json()).record || {};
}

async function writeBin(data) {
  const r = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_BINID}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "X-Master-Key": JSONBIN_KEY,
      "X-Bin-Versioning": "false",
    },
    body: JSON.stringify(data),
  });
  if (!r.ok) throw new Error(`jsonbin write ${r.status}`);
}

exports.handler = async function (event) {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: CORS, body: "" };

  const p       = event.queryStringParameters || {};
  const key     = (p.key     || "").trim();
  const action  = (p.action  || "").trim();
  const account = (p.account || "").trim();

  if (key !== ADMIN_KEY)
    return respond(403, { status: "error", message: "forbidden" });

  if (!JSONBIN_KEY || !JSONBIN_BINID)
    return respond(500, { status: "error", message: "storage_not_configured: 请在Netlify环境变量中设置 JSONBIN_KEY 和 JSONBIN_BINID" });

  let allData;
  try { allData = await readBin(); }
  catch (err) { return respond(500, { status: "error", message: err.message }); }

  // ── list ──────────────────────────────────────────────────────
  if (action === "list") {
    const accounts = Object.keys(allData)
      .filter(k => k.startsWith("account_"))
      .map(k => k.replace("account_", ""));
    return respond(200, { status: "ok", count: accounts.length, accounts });
  }

  // ── get ───────────────────────────────────────────────────────
  if (action === "get") {
    if (!account) return respond(400, { status: "error", message: "missing_account" });
    const data = allData[`account_${account}`];
    if (!data)   return respond(404, { status: "error", message: "not_found" });
    return respond(200, { status: "ok", data });
  }

  // ── getConfig ─────────────────────────────────────────────────
  if (action === "getConfig") {
    const global  = allData.config_global || {};
    const custom  = account ? (allData[`config_${account}`] || {}) : {};
    return respond(200, { status: "ok", global, custom });
  }

  // ── setConfig ─────────────────────────────────────────────────
  if (action === "setConfig") {
    if (!account) return respond(400, { status: "error", message: "missing_account" });
    let body;
    try { body = JSON.parse(event.body || "{}"); }
    catch { return respond(400, { status: "error", message: "invalid_json" }); }
    allData[`config_${account}`] = body;
    try { await writeBin(allData); }
    catch (err) { return respond(500, { status: "error", message: err.message }); }
    return respond(200, { status: "ok", message: "config_saved", account, config: body });
  }

  // ── setGlobalConfig ───────────────────────────────────────────
  if (action === "setGlobalConfig") {
    let body;
    try { body = JSON.parse(event.body || "{}"); }
    catch { return respond(400, { status: "error", message: "invalid_json" }); }
    allData.config_global = body;
    try { await writeBin(allData); }
    catch (err) { return respond(500, { status: "error", message: err.message }); }
    return respond(200, { status: "ok", message: "global_config_saved", config: body });
  }

  // ── deleteConfig ──────────────────────────────────────────────
  if (action === "deleteConfig") {
    if (!account) return respond(400, { status: "error", message: "missing_account" });
    delete allData[`config_${account}`];
    try { await writeBin(allData); }
    catch (err) { return respond(500, { status: "error", message: err.message }); }
    return respond(200, { status: "ok", message: "config_deleted", account });
  }

  return respond(400, { status: "error", message: "unknown_action: " + action });
};
