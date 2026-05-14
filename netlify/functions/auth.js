export async function handler(event, context) {

  try {

    const params = event.queryStringParameters || {};

    const code = params.code || "";
    const account = params.account || "";

    const now = new Date();

    // ==============================
    // 多组授权码（核心）
    // ==============================
    const codeList = [
      { code: "123456", expire: "2026-6-31" },
      { code: "3456",   expire: "2026-08-01" },
      { code: "VIP888", expire: "2027-01-01" }
    ];

    // ==============================
    // 账户列表（可选）
    // ==============================
    const accountList = [
      { account: "78000801", expire: "2026-06-30" },
      { account: "88888888", expire: "2026-12-31" }
    ];

    // ==============================
    // 查找code
    // ==============================
    let codeData = codeList.find(item => item.code === code);

    // ==============================
    // 查找account
    // ==============================
    let accountData = accountList.find(item => item.account === account);

    // ==============================
    // 结果
    // ==============================
    let response = {
      status: "error",
      mode: "none",
      message: "invalid"
    };

    // ==============================
    // code验证
    // ==============================
    if (codeData) {

      let expireDate = new Date(codeData.expire);

      if (now > expireDate) {
        response.message = "code_expired";
      }
      else {
        response = {
          status: "ok",
          mode: "code",
          expire: codeData.expire,
          trade: true,
          symbol: "XAUUSD"
        };
      }
    }

    // ==============================
    // account验证（如果code失败再判断）
    // ==============================
    else if (accountData) {

      let expireDate = new Date(accountData.expire);

      if (now > expireDate) {
        response.message = "account_expired";
      }
      else {
        response = {
          status: "ok",
          mode: "account",
          expire: accountData.expire,
          trade: true,
          symbol: "BTC-USD"
        };
      }
    }

    // ==============================
    // 返回
    // ==============================
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
