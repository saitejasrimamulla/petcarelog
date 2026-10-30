const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const supabase = require("../supabase");
const { requireAuth, cookieOptions } = require("../middleware/auth");
const { EMAIL_RE, text } = require("../utils/validation");
const router = express.Router();

function publicUser(row) { return { id: row.id, name: row.name, email: row.email }; }
function issueToken(res, user) {
  const token = jwt.sign({ sub: user.id, name: user.name, email: user.email }, process.env.JWT_SECRET, { algorithm: "HS256", expiresIn: "8h" });
  res.cookie("petcarelog_token", token, cookieOptions());
}
router.post("/register", async (req, res, next) => {
  try {
    const name = text(req.body.name, 80, true);
    const email = text(req.body.email, 254, true)?.toLowerCase();
    const password = req.body.password;
    if (!name || !email || !EMAIL_RE.test(email) || typeof password !== "string" || password.length < 8 || password.length > 128) {
      return res.status(400).json({ error: "Enter a name, a valid email, and a password between 8 and 128 characters." });
    }
    const { data: existing, error: findError } = await supabase.from("app_users").select("id").eq("email", email).maybeSingle();
    if (findError) throw findError;
    if (existing) return res.status(409).json({ error: "An account with this email already exists." });
    const password_hash = await bcrypt.hash(password, 12);
    const { data, error } = await supabase.from("app_users").insert({ name, email, password_hash }).select("id,name,email").single();
    if (error) {
      if (error.code === "23505") return res.status(409).json({ error: "An account with this email already exists." });
      throw error;
    }
    issueToken(res, data);
    res.status(201).json({ user: publicUser(data) });
  } catch (e) { next(e); }
});
router.post("/login", async (req, res, next) => {
  try {
    const email = text(req.body.email, 254, true)?.toLowerCase();
    const password = req.body.password;
    if (!email || !EMAIL_RE.test(email) || typeof password !== "string" || password.length > 128) return res.status(400).json({ error: "Enter a valid email and password." });
    const { data, error } = await supabase.from("app_users").select("id,name,email,password_hash").eq("email", email).maybeSingle();
    if (error) throw error;
    if (!data || !(await bcrypt.compare(password, data.password_hash))) return res.status(401).json({ error: "Email or password is incorrect." });
    issueToken(res, data);
    res.json({ user: publicUser(data) });
  } catch (e) { next(e); }
});
router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const { data, error } = await supabase.from("app_users").select("id,name,email").eq("id", req.user.id).single();
    if (error || !data) return res.status(401).json({ error: "Account not found. Please log in again." });
    res.json({ user: publicUser(data) });
  } catch (e) { next(e); }
});
router.post("/logout", (req, res) => { res.clearCookie("petcarelog_token", { httpOnly:true, sameSite:"strict", secure:process.env.NODE_ENV === "production", path:"/" }); res.json({ message: "Logged out." }); });
module.exports = router;
