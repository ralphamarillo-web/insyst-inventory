const LOGO = "images/logo.png";

async function call(method, url, body) {
  let res;
  try {
    res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  } catch { throw new Error("Cannot reach the server. Start it with: node server.js"); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}
const post = (url, body) => call("POST", url, body);
const db = {
  async login(email, password) { const d = await post("/api/login", { email, password }); localStorage.setItem("insyst_session", JSON.stringify(d.user)); return d.user; },
  async register(name, email, password) { const d = await post("/api/register", { name, email, password }); localStorage.setItem("insyst_session", JSON.stringify(d.user)); return d.user; },
  async session() { try { return JSON.parse(localStorage.getItem("insyst_session")); } catch { return null; } },
  async logout() { localStorage.removeItem("insyst_session"); },
  getProducts: (archived = false) => call("GET", "/api/products?archived=" + archived),
  getProduct: (id) => call("GET", "/api/products/" + id),
  saveProduct: (d, by) => d.id ? call("PUT", "/api/products/" + d.id, { ...d, by }) : call("POST", "/api/products", { ...d, by }),
  archiveProduct: (id, by) => call("DELETE", `/api/products/${id}?by=${encodeURIComponent(by)}`),
  restoreProduct: (id, by) => call("POST", `/api/products/${id}/restore`, { by }),
  getActivities: (limit = 5) => call("GET", "/api/activities?limit=" + limit),
};

const ico = (d) => `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const IC = {
  grid: ico('<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>'),
  box: ico('<path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8M12 13v8"/>'),
  archive: ico('<rect x="3" y="3" width="18" height="5" rx="1"/><path d="M5 8v11a1 1 0 001 1h12a1 1 0 001-1V8M10 12h4"/>'),
  plus: ico('<path d="M12 5v14M5 12h14"/>'),
  search: ico('<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>'),
  alert: ico('<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9L2 18a2 2 0 001.7 3h16.6a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z"/>'),
  layers: ico('<path d="M12 2l10 5-10 5L2 7l10-5z"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>'),
  out: ico('<path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>'),
  undo: ico('<path d="M3 7v6h6"/><path d="M21 17a9 9 0 00-15-6.7L3 13"/>'),
};

const $ = (s, el = document) => el.querySelector(s);
const root = $("#root");
const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const peso = (n) => "₱" + Number(n).toLocaleString("en-PH");
const units = (n) => `${n} unit${n === 1 ? "" : "s"}`;
const LOW = 10, PER_PAGE = 5;
let user = null, state = { q: "", page: 1, cat: "", low: false, sort: { key: "id", dir: 1 } };

function when(iso) {
  const d = new Date(iso), t = new Date();
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).replace(" ", "").toLowerCase();
  const day = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day(t) - day(d)) / 864e5);
  if (diff <= 0) return "Today, " + time;
  if (diff === 1) return "Yesterday, " + time;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + ", " + time;
}
function toast(msg) {
  const t = document.createElement("div"); t.className = "toast"; t.textContent = msg; document.body.appendChild(t);
  setTimeout(() => t.remove(), 2600);
}
function modal(html) {
  const m = document.createElement("div"); m.className = "modal"; m.innerHTML = `<div class="card" role="dialog" aria-modal="true">${html}</div>`;
  m.addEventListener("click", e => { if (e.target === m) m.remove(); });
  document.body.appendChild(m);
  document.addEventListener("keydown", function k(e) { if (e.key === "Escape" || !m.isConnected) { m.remove(); document.removeEventListener("keydown", k); } });
  m.querySelector("button")?.focus(); return m;
}

function shell(active, title, body) {
  root.innerHTML = `
  <div class="app">
    <aside class="side">
      <div class="brand"><img src="${LOGO}" alt=""><span>InSyst.</span></div>
      <h4>Workspace</h4>
      <a class="nav ${active === "dash" ? "on" : ""}" href="#/dashboard">${IC.grid}Dashboard</a>
      <a class="nav ${active === "prod" ? "on" : ""}" href="#/products">${IC.box}Products</a>
      <a class="nav ${active === "arch" ? "on" : ""}" href="#/archived">${IC.archive}Archived</a>
      <div class="foot"><b>Office Supplies</b><small>Small business workspace</small>
        <button class="link serif" id="logout" style="color:#000;font-size:17px">${IC.out}Log out</button></div>
    </aside>
    <div>
      <header class="top"><h3>${title}</h3><div class="who">${esc(user.name)}<span>${esc(user.role)}</span></div></header>
      <main class="main">${body}</main>
    </div>
  </div>`;
  $("#logout").onclick = async () => { await db.logout(); user = null; location.hash = "#/login"; };
}

function loginView(mode = "login") {
  const reg = mode === "register";
  root.innerHTML = `
  <div class="login">
    <section class="login-l">
      <div class="brand"><img src="${LOGO}" alt=""><span>InSyst.</span></div>
      <div class="tag"><small>SMALL BUSINESS SIMPLIFIED</small><h2>Less guesswork.<br>More in stock.</h2></div>
      <p>Your inventory, all in one place</p>
    </section>
    <section class="login-r">
      <form id="f" novalidate>
        <p class="hi">${reg ? "Get started" : "Welcome back"}</p>
        <h1>${reg ? "Create your InSyst account" : "Log in to InSyst"}</h1>
        <p class="sub">${reg ? "Enter your details to set up access." : "Enter your information to access your inventory system."}</p>
        ${reg ? `<label for="name">Full name</label><input class="pill" id="name" autocomplete="name">` : ""}
        <label for="email">Email Address</label>
        <input class="pill" id="email" type="email" autocomplete="username" placeholder="you@example.com">
        <label for="pw">Password</label>
        <div class="field"><input class="pill" id="pw" type="password" autocomplete="${reg ? "new-password" : "current-password"}" placeholder="••••••••"><button type="button" id="eye">Show</button></div>
        ${reg ? "" : `<button type="button" class="link dark" id="forgot">Forgot password</button>`}
        <p class="err" id="err" role="alert"></p>
        <button class="btn wide">${reg ? "Create account" : "Log in"}</button>
        <p style="margin:18px 0 0"><button type="button" class="link" id="swap">${reg ? "Back to log in" : "Register"}</button></p>
        ${reg ? "" : `<div class="hint">Demo account: <b>admin@insyst.ph</b> / <b>admin123</b></div>`}
      </form>
    </section>
  </div>`;
  const err = (m) => $("#err").textContent = m;
  $("#eye").onclick = () => { const p = $("#pw"), s = p.type === "password"; p.type = s ? "text" : "password"; $("#eye").textContent = s ? "Hide" : "Show"; };
  $("#swap").onclick = () => loginView(reg ? "login" : "register");
  if (!reg) $("#forgot").onclick = () => toast("Password reset isn't set up yet. Ask your administrator.");
  $("#f").onsubmit = async (e) => {
    e.preventDefault();
    const email = $("#email").value.trim(), pw = $("#pw").value, name = reg ? $("#name").value.trim() : "";
    if (reg && !name) return err("Enter your full name.");
    if (!/^\S+@\S+\.\S+$/.test(email)) return err("Enter a valid email address.");
    if (!pw || (reg && pw.length < 6)) return err(reg ? "Use a password with at least 6 characters." : "Enter your password.");
    const lb = $(".btn.wide"); lb.disabled = true;
    try {
      user = reg ? await db.register(name, email, pw) : await db.login(email, pw);
      if (!user) return err("Email or password is incorrect.");
      location.hash = "#/dashboard";
    } catch (ex) { err(ex.message); } finally { lb.disabled = false; }
  };
}

async function dashboardView() {
  const [prods, acts] = await Promise.all([db.getProducts(), db.getActivities(5)]);
  const total = prods.reduce((s, p) => s + p.qty, 0), low = prods.filter(p => p.qty <= LOW).length;
  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  shell("dash", "Inventory management", `
    <div class="head"><div><div class="crumb">Overview</div><h1>Welcome back, ${esc(user.name.split(" ")[0])}</h1>
      <p class="lead">Here's what's happening with your inventory today.</p></div><div class="date">${today}</div></div>
    <div class="stats">
      <a class="stat" href="#/products"><div class="ic-chip">${IC.box}</div><span>Total products</span><b>${prods.length}</b><span>Products in your inventory</span></a>
      <a class="stat" href="#/products"><div class="ic-chip">${IC.layers}</div><span>Available stocks</span><b>${total.toLocaleString()}</b><span>Total units in hand</span></a>
      <a class="stat ${low ? "warn" : ""}" href="#/products/low"><div class="ic-chip">${IC.alert}</div><span>Low-stock items</span><b>${low}</b><span>Products with ${LOW} units and lower</span></a>
    </div>
    <h2 class="sec">Recent inventory activities</h2><p class="lead">The latest changes in your products and stocks</p>
    <div class="box"><table><thead><tr><th>Product</th><th>Activity</th><th>Changed by</th><th>When</th></tr></thead><tbody>
      ${acts.length ? acts.map(a => `<tr><td>${esc(a.product)}</td><td>${esc(a.activity)}</td><td>${esc(a.by)}</td><td>${when(a.at)}</td></tr>`).join("")
      : `<tr><td colspan="4" class="empty">No activity yet. Add a product to get started.</td></tr>`}
    </tbody></table></div>`);
}

async function productsView() {
  let allp = await db.getProducts();
  const cats = [...new Set(allp.map(p => p.category))].sort();
  if (state.cat && !cats.includes(state.cat)) state.cat = "";
  shell("prod", "Inventory management", `
    <div class="crumb">Inventory</div>
    <div class="head"><div><h1>Product Management</h1><p class="lead">Search, sort and manage your products.</p></div>
      <a class="btn add" href="#/products/new">${IC.plus}Add product</a></div>
    <div class="tools"><div class="sbox">${IC.search}<input class="search" id="q" placeholder="Search by Product name or ID" aria-label="Search products" value="${esc(state.q)}"></div>
      <select class="sel" id="cat" aria-label="Filter by category"><option value="">All categories</option>${cats.map(c => `<option ${c === state.cat ? "selected" : ""}>${esc(c)}</option>`).join("")}</select>
      ${state.low ? `<button class="chip" id="lowx">Low stock only ✕</button>` : ""}</div>
    <div class="box" id="list"></div>`);
  $("#q").oninput = (e) => { state.q = e.target.value; state.page = 1; draw(); };
  $("#cat").onchange = (e) => { state.cat = e.target.value; state.page = 1; draw(); };
  if (state.low) $("#lowx").onclick = () => location.hash = "#/products";
  const cols = [["id", "ID"], ["name", "Product"], ["category", "Category"], ["price", "Price"], ["qty", "Quantity"]];
  draw();

  function draw() {
    const q = state.q.trim().toLowerCase(), { key, dir } = state.sort;
    const all = allp.filter(p => (!q || p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q)) && (!state.cat || p.category === state.cat) && (!state.low || p.qty <= LOW))
      .sort((a, b) => (typeof a[key] === "number" ? a[key] - b[key] : String(a[key]).localeCompare(String(b[key]))) * dir);
    const pages = Math.max(1, Math.ceil(all.length / PER_PAGE));
    state.page = Math.min(state.page, pages);
    const from = (state.page - 1) * PER_PAGE, rows = all.slice(from, from + PER_PAGE);
    $("#list").innerHTML = `<table><thead><tr>${cols.map(([k, t]) => `<th aria-sort="${key === k ? (dir > 0 ? "ascending" : "descending") : "none"}"><button class="th" data-s="${k}">${t}${key === k ? (dir > 0 ? " ▲" : " ▼") : ""}</button></th>`).join("")}<th>Actions</th></tr></thead><tbody>
      ${rows.length ? rows.map(p => `<tr><td>${p.id}</td><td>${esc(p.name)}</td><td>${esc(p.category)}</td><td>${peso(p.price)}</td>
        <td class="${p.qty <= LOW ? "low" : ""}">${units(p.qty)}</td>
        <td><div class="act"><button data-v="${p.id}">View</button><button data-e="${p.id}">Edit</button><button class="arch" data-a="${p.id}">Archive</button></div></td></tr>`).join("")
        : `<tr><td colspan="6" class="empty">${q || state.cat || state.low ? "No products match your filters." : "No products yet. Select Add product to create one."}</td></tr>`}
      </tbody></table>
      <div class="pager"><span>${all.length ? `Showing ${from + 1}-${from + rows.length} of ${all.length} products` : "Showing 0 products"}</span>
        <div class="pg"><button id="prev" ${state.page <= 1 ? "disabled" : ""}>previous</button>
        ${Array.from({ length: pages }, (_, i) => `<button class="${i + 1 === state.page ? "on" : ""}" data-p="${i + 1}">${i + 1}</button>`).join("")}
        <button id="next" ${state.page >= pages ? "disabled" : ""}>next</button></div></div>`;
    $("#prev").onclick = () => { state.page--; draw(); };
    $("#next").onclick = () => { state.page++; draw(); };
    document.querySelectorAll("[data-p]").forEach(b => b.onclick = () => { state.page = +b.dataset.p; draw(); });
    document.querySelectorAll("[data-s]").forEach(b => b.onclick = () => {
      state.sort = state.sort.key === b.dataset.s ? { key: b.dataset.s, dir: -state.sort.dir } : { key: b.dataset.s, dir: 1 }; draw();
    });
    document.querySelectorAll("[data-e]").forEach(b => b.onclick = () => location.hash = "#/products/edit/" + b.dataset.e);
    document.querySelectorAll("[data-v]").forEach(b => b.onclick = () => {
      const p = allp.find(x => x.id === b.dataset.v);
      const m = modal(`<h3>${esc(p.name)}</h3><dl><dt>ID</dt><dd>${p.id}</dd><dt>Category</dt><dd>${esc(p.category)}</dd><dt>Price</dt><dd>${peso(p.price)}</dd><dt>Quantity</dt><dd>${units(p.qty)}${p.qty <= LOW ? " (low stock)" : ""}</dd></dl><div class="btns"><button class="btn ghost" id="x">Close</button></div>`);
      $("#x", m).onclick = () => m.remove();
    });
    document.querySelectorAll("[data-a]").forEach(b => b.onclick = () => {
      const p = allp.find(x => x.id === b.dataset.a);
      const m = modal(`<h3>Archive ${esc(p.name)}?</h3><p>It moves to the Archived page. You can restore it there.</p><div class="btns"><button class="btn ghost" id="no">Cancel</button><button class="btn" id="yes" style="background:var(--red);border-color:var(--red)">Archive</button></div>`);
      $("#no", m).onclick = () => m.remove();
      $("#yes", m).onclick = async (e) => {
        e.target.disabled = true;
        try { await db.archiveProduct(p.id, user.name); allp = await db.getProducts(); m.remove(); toast(p.name + " archived."); draw(); }
        catch (ex) { e.target.disabled = false; toast(ex.message); }
      };
    });
  }
}

async function archivedView() {
  const items = await db.getProducts(true);
  shell("arch", "Inventory management", `
    <div class="crumb">Inventory</div><h1>Archived products</h1><p class="lead">Restore a product to put it back in your inventory.</p>
    <div class="box" style="margin-top:28px"><table><thead><tr><th>ID</th><th>Product</th><th>Category</th><th>Price</th><th>Quantity</th><th>Actions</th></tr></thead><tbody>
      ${items.length ? items.map(p => `<tr><td>${p.id}</td><td>${esc(p.name)}</td><td>${esc(p.category)}</td><td>${peso(p.price)}</td><td>${units(p.qty)}</td>
        <td><div class="act"><button data-r="${p.id}">${IC.undo} Restore</button></div></td></tr>`).join("")
      : `<tr><td colspan="6" class="empty">No archived products.</td></tr>`}</tbody></table></div>`);
  document.querySelectorAll("[data-r]").forEach(b => b.onclick = async () => {
    b.disabled = true;
    try { await db.restoreProduct(b.dataset.r, user.name); toast("Product restored."); archivedView(); }
    catch (ex) { b.disabled = false; toast(ex.message); }
  });
}

async function formView(id) {
  const p = id ? await db.getProduct(id) : null;
  if (id && !p) { location.hash = "#/products"; return; }
  shell("prod", "Inventory management", `
    <a href="#/products" style="font-size:15px">&lt; back to products</a>
    <h1>Add / edit product</h1><p class="lead">Add a new product or update an existing product's details.</p>
    <form id="f" class="formcard" novalidate>
      <h3>Product details</h3><p class="lead">Keep product information and stock quantities up to date.</p>
      <div class="grid2">
        <div><label for="name">Product name</label><input class="pill" id="name" placeholder="Enter name" value="${p ? esc(p.name) : ""}"><div class="fe" data-f="name"></div></div>
        <div><label for="cat">Category</label><input class="pill" id="cat" placeholder="Enter category" value="${p ? esc(p.category) : ""}"><div class="fe" data-f="cat"></div></div>
        <div><label for="price">Price (Peso)</label><input class="pill" id="price" type="number" min="0" step="0.01" placeholder="Enter price" value="${p ? p.price : ""}"><div class="fe" data-f="price"></div></div>
        <div><label for="qty">Quantity</label><input class="pill" id="qty" type="number" min="0" step="1" placeholder="Enter amount" value="${p ? p.qty : ""}"><div class="fe" data-f="qty"></div></div>
      </div>
      <div class="btns"><button type="button" class="btn ghost" id="cancel">Cancel</button><button class="btn" style="min-width:190px">${p ? "Save changes" : "Add"}</button></div>
    </form>`);
  $("#cancel").onclick = () => location.hash = "#/products";
  $("#f").onsubmit = async (e) => {
    e.preventDefault();
    const v = { name: $("#name").value.trim(), category: $("#cat").value.trim(), price: $("#price").value, qty: $("#qty").value };
    const bad = {};
    if (!v.name) bad.name = "Enter a product name.";
    if (!v.category) bad.cat = "Enter a category.";
    if (v.price === "" || +v.price < 0) bad.price = "Enter a price of 0 or more.";
    if (v.qty === "" || +v.qty < 0 || !Number.isInteger(+v.qty)) bad.qty = "Enter a whole number, 0 or more.";
    document.querySelectorAll("[data-f]").forEach(d => { d.textContent = bad[d.dataset.f] || ""; $("#" + d.dataset.f).classList.toggle("bad", !!bad[d.dataset.f]); });
    if (Object.keys(bad).length) return;
    const sb = $("#f .btn:not(.ghost)"); sb.disabled = true;
    try { await db.saveProduct({ id: p?.id, name: v.name, category: v.category, price: +v.price, qty: +v.qty }, user.name); } catch (ex) { sb.disabled = false; return toast(ex.message); }
    toast(p ? "Changes saved." : "Product added.");
    state.page = 1; location.hash = "#/products";
  };
}

async function route() {
  user = await db.session();
  const h = location.hash || "#/login";
  if (!user && h !== "#/login") { location.hash = "#/login"; return; }
  if (user && h === "#/login") { location.hash = "#/dashboard"; return; }
  if (h === "#/login") return loginView();
  if (h === "#/dashboard") return dashboardView();
  if (h === "#/products" || h === "#/products/low") { state.low = h.endsWith("/low"); state.page = 1; return productsView(); }
  if (h === "#/archived") return archivedView();
  if (h === "#/products/new") return formView();
  if (h.startsWith("#/products/edit/")) return formView(decodeURIComponent(h.split("/").pop()));
  location.hash = "#/dashboard";
}
addEventListener("hashchange", route);
route();
addEventListener("unhandledrejection", (e) => toast(e.reason?.message || "Something went wrong."));
