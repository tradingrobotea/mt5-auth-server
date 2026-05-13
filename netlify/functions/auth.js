export async function handler(event, context) {

  try {

    const params = event.queryStringParameters || {};

    const code = params.code || "";
    const account = params.account || "";

    const now = new Date();

    // ==============================
    // 模拟数据（实际可改数据库）
    // ==============================

    const validCode = "123456";
    const codeExpire = new Date("2026-12-31");

    const allowedAccounts = ["78000801", "88888888"];
    const accountExpire = new Date("2026-06-30");

    // ==============================
    // 结果对象
    // ==============================
    let result = {
      status: "error",
      mode: "",
      message: ""
    };

    // ==================================================
    // ① 授权码 + 时间限制
    // ==================================================
    if (code) {

      if (code !== validCode) {
        result.message = "invalid_code";
      }
      else if (now > codeExpire) {
        result.message = "code_expired";
      }
      else {
        result = {
          status: "ok",
          mode: "code",
          expire: codeExpire.toISOString().split("T")[0],
          trade: true,
          symbol: "BTCUSD"
        };
      }
    }

    // ==================================================
    // ② 账户 + 时间限制
    // ==================================================
    else if (account) {

      if (!allowedAccounts.includes(account)) {
        result.message = "account_not_allowed";
      }
      else if (now > accountExpire) {
        result.message = "account_expired";
      }
      else {
        result = {
          status: "ok",
          mode: "account",
          expire: accountExpire.toISOString().split("T")[0],
          trade: true,
          symbol: "BTCUSD"
        };
      }
    }

    // ==============================
    // 没参数
    // ==============================
    else {
      result.message = "missing_params";
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache"
      },
      body: JSON.stringify(result)
    };

  } catch (err) {

    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        status: "error",
        message: "server_error"
      })
    };
  }
}

{
  "status": "ok",
  "mode": "code",
  "expire": "2026-12-31",
  "trade": true,
  "symbol": "BTCUSD"
}
