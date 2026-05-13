export async function handler(event, context) {

  const params = event.queryStringParameters;

  const code = params.code || "";
  const account = params.account || "";

  // ===== 模拟授权逻辑 =====
  if (code !== "123456") {
    return {
      statusCode: 403,
      body: "INVALID_CODE"
    };
  }

  if (account !== "888888") {
    return {
      statusCode: 403,
      body: "ACCOUNT_ERROR"
    };
  }

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "text/plain"
    },
    body: "OK"
  };
}
