const { getUserFromRequest } = require("./auth");

function ok(res, data, status = 200) {
  res.status(status);
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(data, (_, v) => (typeof v === "bigint" ? v.toString() : v)));
}

function err(res, message, status = 400) {
  res.status(status);
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({ error: message }));
}

async function requireAuth(req, res) {
  const user = await getUserFromRequest(req);
  if (!user) {
    err(res, "Unauthorized", 401);
    return null;
  }
  return user;
}

function parsePagination(query) {
  const limit = Math.min(Math.max(parseInt(query.limit) || 20, 1), 100);
  const cursor = query.cursor || undefined;
  return { limit, cursor };
}

function lamportsToSOL(lamports) {
  return (Number(lamports.toString()) / 1_000_000_000).toFixed(4);
}

module.exports = { ok, err, requireAuth, parsePagination, lamportsToSOL };
