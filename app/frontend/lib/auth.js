const { SignJWT, jwtVerify } = require("jose");

const AUTH_COOKIE_NAME = "fp_auth";

const AUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: 60 * 60 * 24 * 7,
};

function getSecret() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET env var not set");
  return new TextEncoder().encode(s);
}

async function generateJWT(payload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}

async function verifyJWT(token) {
  const { payload } = await jwtVerify(token, getSecret());
  return payload;
}

async function getUserFromRequest(req) {
  try {
    const token = req.cookies?.[AUTH_COOKIE_NAME];
    if (!token) return null;
    return await verifyJWT(token);
  } catch {
    return null;
  }
}

function serializeCookie(name, value, options) {
  let str = `${name}=${value}`;
  if (options.maxAge !== undefined) str += `; Max-Age=${options.maxAge}`;
  if (options.path) str += `; Path=${options.path}`;
  if (options.httpOnly) str += `; HttpOnly`;
  if (options.secure) str += `; Secure`;
  if (options.sameSite) str += `; SameSite=${options.sameSite}`;
  return str;
}

function setCookie(res, token) {
  res.setHeader("Set-Cookie", serializeCookie(AUTH_COOKIE_NAME, token, AUTH_COOKIE_OPTIONS));
}

function clearCookie(res) {
  res.setHeader("Set-Cookie", serializeCookie(AUTH_COOKIE_NAME, "", { ...AUTH_COOKIE_OPTIONS, maxAge: 0 }));
}

module.exports = { generateJWT, verifyJWT, getUserFromRequest, setCookie, clearCookie, AUTH_COOKIE_NAME, AUTH_COOKIE_OPTIONS };
