export async function handler(event, context) {

  try {

    const params = event.queryStringParameters || {};

    const code = params.code || "";
    const account = params.account || "";

    const now = new Date();

    // ==============================
    // 数据源（可换数据库）
    // ==============================
    const validCode = "123456";
    const codeExpire = new Date("2026-2-31");

    const validCode = "3456";
    const codeExpire = new Date("2026-12-31");


    const allowedAccounts = ["78000801", "88888888"];
    const accountExpire = new Date("2026-06-30");

    // ==============================
    // 响应基础结构
    // ==============================
    let response = {
      status: "error",
      mode: "none",
      message: "invalid"
    };

    // ==============================
    // 双通道判断（关键优化）
    // ==============================

    let codeValid = false;
    let accountValid = false;

    // -------- code校验 --------
    if (code) {
      if (code === validCode && now <= codeExpire) {
        codeValid = true;
      }
    }

    // -------- account校验 --------
    if (account) {
      if (allowedAccounts.includes(account) && now <= accountExpire) {
        accountValid = true;
      }
    }

    // ==============================
    // 成功逻辑（任意通过即可）
    // ==============================
    if (codeValid || accountValid) {

      response = {
        status: "ok",
        mode: codeValid ? "code" : "account",
        expire: codeValid ? codeExpire.toISOString().split("T")[0]
                          : accountExpire.toISOString().split("T")[0],
        trade: true,
        symbol: "BTCUSD"
      };
    }

    // ==============================
    // 失败原因细分（给MT5更清晰）
    // ==============================
    else {

      if (code || account) {

        if (code && code !== validCode) {
          response.message = "invalid_code";
        }
        else if (account && !allowedAccounts.includes(account)) {
          response.message = "invalid_account";
        }
        else {
          response.message = "expired";
        }
      }
      else {
        response.message = "missing_params";
      }
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache"
      },
      body: JSON.stringify(response)
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
