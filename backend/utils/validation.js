const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function text(value, max, required = false) {
  if (value === undefined || value === null) return required ? null : "";
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  if (required && !cleaned) return null;
  return cleaned.length <= max ? cleaned : null;
}
function date(value, optional = false) {
  if ((value === null || value === "" || value === undefined) && optional) return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0,10) === value ? value : undefined;
}
module.exports = { EMAIL_RE, text, date };
