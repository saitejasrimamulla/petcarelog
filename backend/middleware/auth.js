const jwt = require("jsonwebtoken");
function requireAuth(req, res, next) {
  const token = req.cookies?.petcarelog_token;
  if (!token) return res.status(401).json({ error: "Please log in to continue." });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });
    req.user = { id: payload.sub, name: payload.name, email: payload.email };
    next();
  } catch {
    res.clearCookie("petcarelog_token", cookieOptions());
    return res.status(401).json({ error: "Your session has expired. Please log in again." });
  }
}
function cookieOptions() {
  return { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 1000 * 60 * 60 * 8 };
}
module.exports = { requireAuth, cookieOptions };
