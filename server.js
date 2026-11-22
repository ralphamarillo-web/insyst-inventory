const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, "public");
const USERS_FILE = path.join(__dirname, "data", "users.json");

function hash(password, salt = crypto.randomBytes(16).toString("hex")) {
  return { salt, hash: crypto.scryptSync(password, salt, 64).toString("hex") };
}
function loadUsers() {
  if (!fs.existsSync(USERS_FILE)) {
    fs.mkdirSync(path.dirname(USERS_FILE), { recursive: true });
    const admin = { id: 1, name: "Stephen Escasa", email: "admin@insyst.ph", role: "Administrator", ...hash("admin123") };
    fs.writeFileSync(USERS_FILE, JSON.stringify([admin], null, 2));
  }
  return JSON.parse(fs.readFileSync(USERS_FILE, "utf8"));
}
const saveUsers = (u) => fs.writeFileSync(USERS_FILE, JSON.stringify(u, null, 2));
const publicUser = (u) => ({ id: u.id, name: u.name, role: u.role });

function send(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (c) => { raw += c; if (raw.length > 1e5) req.destroy(); });
    req.on("end", () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch { reject(new Error("bad json")); } });
  });
}

const PRODUCTS_FILE = path.join(__dirname, "data", "products.json");
const ACTS_FILE = path.join(__dirname, "data", "activities.json");
function loadJson(file, seed) {
  if (!fs.existsSync(file)) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(seed(), null, 2)); }
  return JSON.parse(fs.readFileSync(file, "utf8"));
}
const saveJson = (f, d) => fs.writeFileSync(f, JSON.stringify(d, null, 2));
const seedProducts = () => [
  ["P001", "A4 Bond Paper", "Paper", 3, 132], ["P002", "USB Flash Drive", "File handling", 1850, 15],
  ["P003", "DDR4 64 GB", "Hardware", 3000, 4], ["P004", "Desk", "Stationery", 13000, 3],
  ["P005", "Printer", "Printing", 29000, 32], ["P006", "Ballpen (box)", "Stationery", 180, 7],
  ["P007", "Stapler", "Stationery", 250, 40], ["P008", "Notebook", "Paper", 45, 25],
].map(([id, name, category, price, qty]) => ({ id, name, category, price, qty, archived: false }));
const seedActs = () => [
  ["A4 Bond Paper", "+20 units", "Stephen", 0.3], ["USB Flash Drive", "+5 units", "Stephen", 2.5],
  ["DDR4 64 GB", "+3 units", "Ethan", 13], ["Desk", "+1 unit", "Ethan", 16], ["Printer", "+8 units", "John", 18],
].map(([product, activity, by, h]) => ({ product, activity, by, at: new Date(Date.now() - h * 3600e3).toISOString() }));
function log(product, activity, by) {
  const a = loadJson(ACTS_FILE, seedActs);
  a.unshift({ product, activity, by: String(by || "Unknown").split(" ")[0], at: new Date().toISOString() });
  saveJson(ACTS_FILE, a.slice(0, 100));
}
const unitsText = (n) => `${n} ${Math.abs(n) === 1 ? "unit" : "units"}`;
function checkProduct(b) {
  const name = String(b.name || "").trim(), category = String(b.category || "").trim(), price = Number(b.price), qty = Number(b.qty);
  if (!name || !category) return { error: "Name and category are required." };
  if (b.price === undefined || b.price === "" || !(price >= 0)) return { error: "Price must be 0 or more." };
  if (b.qty === undefined || b.qty === "" || !Number.isInteger(qty) || qty < 0) return { error: "Quantity must be a whole number, 0 or more." };
  return { value: { name, category, price, qty } };
}

async function api(req, res) {
  const u = new URL(req.url, "http://localhost"), p = u.pathname.split("/").filter(Boolean);
  let body = {};
  if (req.method === "POST" || req.method === "PUT") {
    try { body = await readBody(req); } catch { return send(res, 400, { error: "Request body must be valid JSON." }); }
  }
  if (p[1] === "login" || p[1] === "register") return auth(req, res, p[1], body);
  if (p[1] === "products") return products(req, res, p, u, body);
  if (p[1] === "activities" && req.method === "GET") {
    const n = Math.min(Math.max(parseInt(u.searchParams.get("limit")) || 5, 1), 100);
    return send(res, 200, loadJson(ACTS_FILE, seedActs).slice(0, n));
  }
  send(res, 404, { error: "Endpoint not found." });
}

function auth(req, res, action, body) {
  if (req.method !== "POST") return send(res, 405, { error: "Use POST for this endpoint." });
  const email = String(body.email || "").trim().toLowerCase(), password = String(body.password || ""), users = loadUsers();
  if (action === "login") {
    if (!email || !password) return send(res, 400, { error: "Email and password are required." });
    const u = users.find((x) => x.email === email);
    const ok = u && crypto.timingSafeEqual(Buffer.from(hash(password, u.salt).hash), Buffer.from(u.hash));
    if (!ok) return send(res, 401, { error: "Email or password is incorrect." });
    return send(res, 200, { message: "Login successful.", user: publicUser(u) });
  }
  const name = String(body.name || "").trim();
  if (!name || !email || !password) return send(res, 400, { error: "Name, email and password are required." });
  if (!/^\S+@\S+\.\S+$/.test(email)) return send(res, 400, { error: "Enter a valid email address." });
  if (password.length < 6) return send(res, 400, { error: "Password must be at least 6 characters." });
  if (users.some((x) => x.email === email)) return send(res, 409, { error: "That email is already registered." });
  const u = { id: Date.now(), name, email, role: "Staff", ...hash(password) };
  users.push(u); saveUsers(users);
  send(res, 201, { message: "Account created.", user: publicUser(u) });
}

function products(req, res, p, u, body) {
  const all = loadJson(PRODUCTS_FILE, seedProducts), id = p[2], act = p[3], m = req.method;
  if (!id) {
    if (m === "GET") return send(res, 200, all.filter((x) => x.archived === (u.searchParams.get("archived") === "true")));
    if (m === "POST") {
      const c = checkProduct(body); if (c.error) return send(res, 400, { error: c.error });
      const n = all.reduce((mx, x) => Math.max(mx, parseInt(x.id.slice(1))), 0) + 1;
      const prod = { id: "P" + String(n).padStart(3, "0"), ...c.value, archived: false };
      all.push(prod); saveJson(PRODUCTS_FILE, all); log(prod.name, "+" + unitsText(prod.qty), body.by);
      return send(res, 201, prod);
    }
    return send(res, 405, { error: "Method not allowed." });
  }
  const prod = all.find((x) => x.id === id);
  if (!prod) return send(res, 404, { error: "Product not found." });
  if (!act && m === "GET") return send(res, 200, prod);
  if (!act && m === "PUT") {
    const c = checkProduct(body); if (c.error) return send(res, 400, { error: c.error });
    const diff = c.value.qty - prod.qty; Object.assign(prod, c.value); saveJson(PRODUCTS_FILE, all);
    log(prod.name, diff ? (diff > 0 ? "+" : "") + unitsText(diff) : "Details updated", body.by);
    return send(res, 200, prod);
  }
  if (!act && m === "DELETE") {
    prod.archived = true; saveJson(PRODUCTS_FILE, all); log(prod.name, "Archived", u.searchParams.get("by"));
    return send(res, 200, { message: "Product archived.", product: prod });
  }
  if (act === "restore" && m === "POST") {
    prod.archived = false; saveJson(PRODUCTS_FILE, all); log(prod.name, "Restored", body.by);
    return send(res, 200, prod);
  }
  send(res, 405, { error: "Method not allowed." });
}

const TYPES = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".png": "image/png", ".json": "application/json" };
function serve(req, res) {
  const url = req.url.split("?")[0];
  const file = path.normalize(path.join(PUBLIC, url === "/" ? "index.html" : url));
  if (!file.startsWith(PUBLIC)) { res.writeHead(403); return res.end("Forbidden"); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end("Not found"); }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
    res.end(data);
  });
}

http.createServer((req, res) => (req.url.startsWith("/api/") ? api(req, res) : serve(req, res)))
  .listen(PORT, () => console.log(`InSyst running at http://localhost:${PORT}`));
