/* =========================================================
   Inspire Hair Studio — team admin portal
   Barbers edit their own profile, prices, status and photos.
   The owner also manages the team, the site banner and hours.
   Runs in demo mode (fake data, nothing saved) until Supabase
   keys are filled in at the top of js/team.js.
   ========================================================= */
(function () {
  "use strict";

  var CFG = window.INSPIRE_SUPABASE || {};
  var params = new URLSearchParams(location.search);
  var DEMO = !CFG.url || !CFG.anonKey || params.has("demo");
  var app = document.getElementById("app");
  var toastEl = document.getElementById("toast");

  /* ---------------- helpers ---------------- */
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  var ICONS = {
    up: '<path d="M6 15l6-6 6 6"/>', down: '<path d="M6 9l6 6 6-6"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    eyeoff: '<path d="M3 3l18 18M10.6 10.6a3 3 0 0 0 4.2 4.2M9.9 5.1A10.4 10.4 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6C3.8 8.4 2 12 2 12s3.5 7 10 7c1.6 0 3-.4 4.3-1"/>',
    camera: '<path d="M3 7h3l2-3h8l2 3h3v13H3z"/><circle cx="12" cy="13" r="4"/>',
    tag: '<path d="M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
    out: '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"/>',
    edit: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    plus: '<path d="M12 5v14M5 12h14"/>'
  };
  function icon(n) {
    return '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONS[n] + "</svg>";
  }
  var toastTimer;
  function toast(msg, bad) {
    toastEl.textContent = msg;
    toastEl.className = "toast show" + (bad ? " bad" : "");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.className = "toast" + (bad ? " bad" : ""); }, 2600);
  }
  function slugify(s) {
    return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "barber";
  }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function monthStart(offset) {
    var d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); d.setMonth(d.getMonth() + (offset || 0)); return d.toISOString();
  }
  // Shrink photos in the browser before upload (keeps storage small, uploads fast)
  function resizeImage(file, max) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () {
        var s = Math.min(1, max / Math.max(img.width, img.height));
        var c = document.createElement("canvas");
        c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        c.toBlob(function (b) { b ? resolve(b) : reject(new Error("Could not read that photo")); }, "image/jpeg", 0.82);
        URL.revokeObjectURL(img.src);
      };
      img.onerror = function () { reject(new Error("That file isn't a photo we can read")); };
      img.src = URL.createObjectURL(file);
    });
  }
  function siteUrl(p) { // older photo paths said /images2/; those files now live in /images/
    return (p || "").replace(/(^|\/)images2\//, "$1images/");
  }

  /* ---------------- data layer: Supabase ---------------- */
  function supabaseApi() {
    var sb = window.supabase.createClient(CFG.url, CFG.anonKey);
    function ok(r) { if (r.error) throw new Error(r.error.message); return r.data; }
    return {
      onAuth: function (cb) { sb.auth.onAuthStateChange(function (ev, session) { cb(ev, session); }); },
      session: async function () { return ok(await sb.auth.getSession()).session; },
      signIn: async function (email, pw) { return ok(await sb.auth.signInWithPassword({ email: email, password: pw })); },
      signUp: async function (email, pw) {
        return ok(await sb.auth.signUp({ email: email, password: pw, options: { emailRedirectTo: location.origin + location.pathname } }));
      },
      forgot: async function (email) { return ok(await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname })); },
      setPassword: async function (pw) { return ok(await sb.auth.updateUser({ password: pw })); },
      signOut: async function () { await sb.auth.signOut(); },
      claim: async function () { return ok(await sb.rpc("claim_my_barber")); },
      isAdmin: async function () { return !!ok(await sb.rpc("is_admin")); },
      barbers: async function () { return ok(await sb.from("barbers").select("*").order("sort_order").order("name")); },
      updateBarber: async function (id, patch) { return ok(await sb.from("barbers").update(patch).eq("id", id).select().single()); },
      addBarber: async function (row) { return ok(await sb.from("barbers").insert(row).select().single()); },
      deleteBarber: async function (id) { ok(await sb.from("barbers").delete().eq("id", id)); },
      services: async function (bid) { return ok(await sb.from("services").select("*").eq("barber_id", bid).order("sort_order")); },
      saveServices: async function (bid, list, removedIds) {
        if (removedIds.length) ok(await sb.from("services").delete().in("id", removedIds));
        var rows = list.map(function (s, i) {
          var r = { barber_id: bid, name: s.name || "Service", price: s.price || "", duration: s.duration || "", note: s.note || "", sort_order: i + 1 };
          if (s.id) r.id = s.id;
          return r;
        });
        var existing = rows.filter(function (r) { return r.id; });
        var fresh = rows.filter(function (r) { return !r.id; });
        if (existing.length) ok(await sb.from("services").upsert(existing));
        if (fresh.length) ok(await sb.from("services").insert(fresh));
      },
      photos: async function (bid) { return ok(await sb.from("photos").select("*").eq("barber_id", bid).order("created_at", { ascending: false })); },
      uploadFile: async function (bid, blob, kind) {
        var path = bid + "/" + kind + "-" + Date.now() + ".jpg";
        ok(await sb.storage.from("photos").upload(path, blob, { contentType: "image/jpeg", upsert: false }));
        return { path: path, url: sb.storage.from("photos").getPublicUrl(path).data.publicUrl };
      },
      addPhoto: async function (bid, file) { return ok(await sb.from("photos").insert({ barber_id: bid, url: file.url, storage_path: file.path }).select().single()); },
      updatePhoto: async function (id, patch) { ok(await sb.from("photos").update(patch).eq("id", id)); },
      deletePhoto: async function (p) {
        if (p.storage_path) await sb.storage.from("photos").remove([p.storage_path]);
        ok(await sb.from("photos").delete().eq("id", p.id));
      },
      shop: async function () { return ok(await sb.from("shop_settings").select("*").eq("id", 1).single()); },
      updateShop: async function (patch) { patch.updated_at = new Date().toISOString(); return ok(await sb.from("shop_settings").update(patch).eq("id", 1).select().single()); },
      taps: async function (since) { return ok(await sb.rpc("tap_counts", { since: since })) || []; }
    };
  }

  /* ---------------- data layer: demo (in memory) ---------------- */
  function demoApi() {
    var T = (window.INSPIRE && window.INSPIRE.team) || [];
    var n = 0; function id() { n++; return "demo-" + n; }
    var barbers = T.map(function (m, i) {
      return {
        id: id(), slug: m.id, name: m.name, first_name: m.first, role: m.role, kind: m.kind, is_owner: !!m.owner,
        short_line: m.short || "", bio: m.bio, tags: m.tags.slice(), app: m.app, book_url: m.bookUrl,
        photo_url: "../" + m.photo, status: "open", status_note: "", work_days: [false, true, true, true, true, true, true],
        sort_order: (i + 1) * 10, visible: true, email: m.first.toLowerCase() + "@example.com", user_id: null
      };
    });
    var services = [], photos = [];
    T.forEach(function (m, i) {
      m.services.forEach(function (s, j) { services.push({ id: id(), barber_id: barbers[i].id, name: s.name, price: s.price, duration: s.time || "", note: s.note || "", sort_order: j + 1 }); });
      (m.photos || []).forEach(function (p) { photos.push({ id: id(), barber_id: barbers[i].id, url: "../" + p, storage_path: null, visible: true, created_at: new Date().toISOString() }); });
    });
    var shop = { id: 1, banner_on: false, banner_text: "", hours: "Mon – Sat, 9 AM – 7 PM", hours_note: "Closed Sunday" };
    var viewAs = params.get("as") || "owner"; // owner | barber
    var me = viewAs === "barber" ? barbers[1] : barbers[0];
    var fakeTaps = {}; barbers.forEach(function (b, i) { fakeTaps[b.id] = [52, 43, 23, 12][i] || 8; });
    function wait(v) { return new Promise(function (r) { setTimeout(function () { r(clone(v)); }, 120); }); }
    return {
      viewAs: viewAs,
      onAuth: function () {},
      session: async function () { return { user: { id: "demo-user", email: me.email } }; },
      signIn: async function () {}, signUp: async function () {}, forgot: async function () {}, setPassword: async function () {},
      signOut: async function () { toast("Demo mode: sign out does nothing"); },
      claim: async function () { return me.id; },
      isAdmin: async function () { return viewAs !== "barber"; },
      barbers: async function () { return wait(barbers.slice().sort(function (a, b) { return a.sort_order - b.sort_order; })); },
      updateBarber: async function (bid, patch) { var b = barbers.find(function (x) { return x.id === bid; }); Object.assign(b, patch); return wait(b); },
      addBarber: async function (row) { var b = Object.assign({ id: id(), tags: [], status: "open", status_note: "", work_days: [false, true, true, true, true, true, true], photo_url: "", visible: true, is_owner: false, short_line: "", bio: "" }, row); barbers.push(b); return wait(b); },
      deleteBarber: async function (bid) { barbers = barbers.filter(function (b) { return b.id !== bid; }); },
      services: async function (bid) { return wait(services.filter(function (s) { return s.barber_id === bid; }).sort(function (a, b) { return a.sort_order - b.sort_order; })); },
      saveServices: async function (bid, list) {
        services = services.filter(function (s) { return s.barber_id !== bid; });
        list.forEach(function (s, i) { services.push(Object.assign({}, s, { id: s.id || id(), barber_id: bid, sort_order: i + 1 })); });
        return wait(true);
      },
      photos: async function (bid) { return wait(photos.filter(function (p) { return p.barber_id === bid; })); },
      uploadFile: async function (bid, blob) { return { path: null, url: URL.createObjectURL(blob) }; },
      addPhoto: async function (bid, file) { var p = { id: id(), barber_id: bid, url: file.url, visible: true, created_at: new Date().toISOString() }; photos.unshift(p); return p; },
      updatePhoto: async function (pid, patch) { Object.assign(photos.find(function (p) { return p.id === pid; }), patch); },
      deletePhoto: async function (p) { photos = photos.filter(function (x) { return x.id !== p.id; }); },
      shop: async function () { return wait(shop); },
      updateShop: async function (patch) { Object.assign(shop, patch); return wait(shop); },
      taps: async function (since) {
        var lastMonth = since < monthStart(0);
        return wait(barbers.map(function (b) { return { barber_id: b.id, taps: lastMonth ? Math.round(fakeTaps[b.id] * 1.8) : fakeTaps[b.id] }; }));
      }
    };
  }

  var api = DEMO ? demoApi() : supabaseApi();

  /* ---------------- state ---------------- */
  var S = {
    screen: "loading", authMode: "signin", authErr: "", busy: false,
    email: "", isAdmin: false, myId: null, barbers: [], currentId: null,
    tab: "home", services: [], removed: [], photos: [], shop: null,
    tapsNow: {}, tapsPrev: {}, draft: null, dirty: false, addOpen: false
  };
  function current() { return S.barbers.find(function (b) { return b.id === S.currentId; }) || null; }
  function me() { return S.barbers.find(function (b) { return b.id === S.myId; }) || null; }

  /* ---------------- boot ---------------- */
  async function boot() {
    api.onAuth(function (ev) {
      if (ev === "PASSWORD_RECOVERY") { S.screen = "login"; S.authMode = "recovery"; render(); }
      if (ev === "SIGNED_OUT") { S.screen = "login"; S.authMode = "signin"; render(); }
    });
    try {
      var sess = await api.session();
      if (!sess) { S.screen = "login"; render(); return; }
      await enter(sess.user.email);
    } catch (e) { S.screen = "login"; S.authErr = e.message; render(); }
  }

  async function enter(email) {
    S.screen = "loading"; render();
    S.email = email;
    S.myId = await api.claim();
    S.isAdmin = await api.isAdmin();
    if (!S.myId && !S.isAdmin) { S.screen = "noteam"; render(); return; }
    S.barbers = await api.barbers();
    S.currentId = S.myId || (S.barbers[0] && S.barbers[0].id);
    S.screen = "app";
    S.tab = "home";
    await loadCurrent();
    render();
  }

  async function loadCurrent() {
    var b = current(); if (!b) return;
    var res = await Promise.all([api.services(b.id), api.photos(b.id), api.taps(monthStart(0)), api.taps(monthStart(-1)), S.isAdmin ? api.shop() : Promise.resolve(null)]);
    S.services = res[0]; S.removed = []; S.photos = res[1];
    S.tapsNow = {}; res[2].forEach(function (r) { S.tapsNow[r.barber_id] = Number(r.taps); });
    S.tapsPrev = {}; res[3].forEach(function (r) { S.tapsPrev[r.barber_id] = Number(r.taps) - (S.tapsNow[r.barber_id] || 0); });
    S.shop = res[4];
    resetDraft();
  }
  function resetDraft() {
    var b = current();
    S.draft = b ? clone(b) : null;
    S.draftServices = clone(S.services);
    S.dirty = false;
  }

  /* ---------------- views ---------------- */
  function render() {
    if (S.screen === "loading") { app.innerHTML = '<div class="center">Loading…</div>'; return; }
    if (S.screen === "login") { app.innerHTML = loginView(); focusFirst(); return; }
    if (S.screen === "noteam") { app.innerHTML = noTeamView(); return; }
    app.innerHTML = shellView();
    syncSavebar();
  }
  function focusFirst() { var i = app.querySelector("input"); if (i) i.focus(); }

  function loginView() {
    var m = S.authMode;
    var title = { signin: "Team login", signup: "Create your login", forgot: "Reset your password", recovery: "Set a new password", check: "Check your email" }[m];
    var body = "";
    if (m === "check") {
      body = '<p class="sub">We sent a link to <strong>' + esc(S.email) + "</strong>. Open it on this device to finish, then come back here.</p>" +
        '<button class="linkish" data-act="mode" data-mode="signin">Back to login</button>';
    } else {
      body = '<form class="stack" data-form="auth">' +
        (m !== "recovery" ? '<label class="field">Email<input class="input" type="email" name="email" autocomplete="email" required value="' + esc(S.email) + '"></label>' : "") +
        (m !== "forgot" ? '<label class="field">' + (m === "recovery" ? "New password" : "Password") + '<input class="input" type="password" name="password" minlength="8" required autocomplete="' + (m === "signin" ? "current-password" : "new-password") + '"></label>' : "") +
        (m === "signup" ? '<p class="hint">Use the same email Fernando added for you on the team list. At least 8 characters.</p>' : "") +
        (S.authErr ? '<p class="err">' + esc(S.authErr) + "</p>" : "") +
        '<button class="btn btn-primary btn-block" type="submit"' + (S.busy ? " disabled" : "") + ">" +
        ({ signin: "Log in", signup: "Create login", forgot: "Send reset link", recovery: "Save password" }[m]) + "</button></form>" +
        (m === "signin" ? '<button class="linkish" data-act="mode" data-mode="signup">First time? Create your login</button><button class="linkish" data-act="mode" data-mode="forgot">Forgot password?</button>' : "") +
        (m === "signup" || m === "forgot" ? '<button class="linkish" data-act="mode" data-mode="signin">Back to login</button>' : "");
    }
    return '<div class="login"><div class="login-card"><img class="logo" src="/images/inspirehairstudioslogo.png" alt="Inspire Hair Studio">' +
      "<h1>" + title + "</h1>" + body + "</div></div>";
  }

  function noTeamView() {
    return '<div class="login"><div class="login-card"><img class="logo" src="/images/inspirehairstudioslogo.png" alt="Inspire Hair Studio">' +
      "<h1>Almost there</h1><p class=\"sub\">You're logged in as <strong>" + esc(S.email) + "</strong>, but that email isn't on the team list yet. Ask Fernando to add it in the Shop tab, then log in again.</p>" +
      '<button class="btn btn-outline btn-block" data-act="signout">Log out</button></div></div>';
  }

  function shellView() {
    var b = current();
    var tabs = [["home", "Home"], ["prices", "Prices"], ["cuts", "Cuts"], ["profile", "Profile"]];
    if (S.isAdmin) tabs.push(["shop", "Shop"]);
    var editingOther = b && S.myId && b.id !== S.myId;
    var top =
      (DEMO ? '<div class="demo-flag">Demo mode with sample data — nothing is saved. View as: <a href="?demo=1">Owner</a> · <a href="?demo=1&as=barber">Barber</a></div>' : "") +
      '<header class="topbar"><div class="topbar-in"><div class="who">' +
      (b && b.photo_url ? '<img class="avatar" src="' + esc(siteUrl(b.photo_url)) + '" alt="">' : '<span class="avatar"></span>') +
      '<div class="who-text"><strong>' + (S.tab === "shop" ? "Shop admin" : (editingOther ? "Editing " + esc(b.first_name) : "Hey, " + esc((me() || b || {}).first_name || "there"))) + "</strong><span>Inspire team admin</span></div></div>" +
      '<div class="top-actions"><a class="btn btn-ghost btn-sm" href="/barber.html?id=' + esc(b ? b.slug : "") + '" target="_blank" rel="noopener">View live</a>' +
      '<button class="icon-btn" data-act="signout" aria-label="Log out">' + icon("out") + "</button></div></div>" +
      (S.isAdmin && S.tab !== "shop" ? '<div class="switcher"><span>Editing</span><select data-act="switch" aria-label="Choose barber to edit">' +
        S.barbers.map(function (x) { return '<option value="' + esc(x.id) + '"' + (x.id === S.currentId ? " selected" : "") + ">" + esc(x.name) + (x.visible ? "" : " (hidden)") + "</option>"; }).join("") +
        "</select></div>" : "") +
      "</header>";
    var body = { home: homeView, prices: pricesView, cuts: cutsView, profile: profileView, shop: shopView }[S.tab]();
    var nav = '<nav class="nav" aria-label="Sections"><div class="nav-in" style="grid-template-columns:repeat(' + tabs.length + ',minmax(0,1fr))">' +
      tabs.map(function (t) { return '<button data-act="tab" data-tab="' + t[0] + '"' + (S.tab === t[0] ? ' aria-current="page"' : "") + ">" + t[1] + "</button>"; }).join("") + "</div></nav>";
    return '<div class="shell">' + top + '<main class="wrap">' + body + "</main></div>" + nav +
      '<div class="savebar" id="savebar" hidden><div class="savebar-in"><span>Unsaved changes</span><div style="display:flex;gap:6px"><button class="btn btn-sm" style="background:transparent;color:#fff;border-color:rgba(255,255,255,.3)" data-act="discard">Undo</button><button class="btn btn-sm" data-act="publish">Publish</button></div></div></div>';
  }

  function homeView() {
    var b = current(); if (!b) return "";
    var now = S.tapsNow[b.id] || 0, prev = S.tapsPrev[b.id] || 0;
    var change = prev ? Math.round(((now - prev) / prev) * 100) : null;
    var statuses = [["open", "Taking new clients"], ["booked", "Booked up this week"], ["away", "Away / on vacation"]];
    return '<div class="stack">' +
      '<section class="card hero-stat"><span class="sub">This month · taps on your Book button</span>' +
      '<div class="big">' + now + "</div>" +
      '<div class="mini-stats"><div class="mini"><strong>' + prev + "</strong><span>last month</span></div>" +
      '<div class="mini"><strong>' + (change === null ? "—" : (change >= 0 ? "+" : "") + change + "%") + "</strong><span>vs last month (so far)</span></div></div></section>" +
      '<section class="card"><div><h2>Your status</h2><p class="sub">Shows as a badge on your profile and team card.</p></div>' +
      statuses.map(function (s) {
        return '<button class="choice" data-act="status" data-status="' + s[0] + '" aria-pressed="' + (b.status === s[0]) + '"><span class="dot ' + s[0] + '"></span><span style="flex-grow:1">' + s[1] + "</span></button>";
      }).join("") +
      (b.status === "away" ? '<label class="field">Back on (optional)<input class="input" data-status-note value="' + esc(b.status_note) + '" placeholder="e.g. Oct 14"></label><button class="btn btn-outline btn-sm" data-act="save-note">Save</button>' : "") +
      "</section>" +
      '<section class="quick"><button data-act="tab" data-tab="prices">' + icon("tag") + "<strong>Edit prices</strong><span>" + S.services.length + " services</span></button>" +
      '<button data-act="tab" data-tab="cuts">' + icon("camera") + "<strong>Post a cut</strong><span>Shows on your profile</span></button></section>" +
      "</div>";
  }

  function pricesView() {
    var list = S.draftServices;
    return '<div class="stack"><div><h1 class="page-title">Services &amp; prices</h1><p class="sub">Changes go live on the website when you publish.</p></div>' +
      list.map(function (s, i) {
        return '<div class="svc"><div class="svc-top"><input class="input" aria-label="Service name" data-svc="' + i + '" data-k="name" value="' + esc(s.name) + '" placeholder="Service name">' +
          '<div class="svc-tools"><button class="icon-btn" data-act="svc-up" data-i="' + i + '" aria-label="Move up"' + (i === 0 ? " disabled" : "") + ">" + icon("up") + "</button>" +
          '<button class="icon-btn" data-act="svc-del" data-i="' + i + '" aria-label="Remove service">' + icon("trash") + "</button></div></div>" +
          '<div class="row2"><label class="field">Price<input class="input" data-svc="' + i + '" data-k="price" value="' + esc(s.price) + '" placeholder="$45"></label>' +
          '<label class="field">Length<input class="input" data-svc="' + i + '" data-k="duration" value="' + esc(s.duration) + '" placeholder="45 min"></label></div>' +
          '<label class="field">Note <span class="hint">(optional)</span><input class="input" data-svc="' + i + '" data-k="note" value="' + esc(s.note) + '" placeholder="Includes hot towel"></label></div>';
      }).join("") +
      '<button class="add-row" data-act="svc-add">+ Add a service</button></div>';
  }

  function cutsView() {
    return '<div class="stack"><div><h1 class="page-title">Your cuts</h1><p class="sub">Newest show first on your profile.</p></div>' +
      '<label class="upload">' + icon("camera") + "<span>Take or upload photos</span><span class=\"hint\">You can pick several at once</span>" +
      '<input type="file" accept="image/*" multiple data-upload="cut"></label>' +
      (S.photos.length ? '<div class="grid3">' + S.photos.map(function (p) {
        return '<div class="ph' + (p.visible === false ? " hidden" : "") + '"><img src="' + esc(siteUrl(p.url)) + '" alt="" loading="lazy">' +
          '<button data-act="photo-del" data-id="' + esc(p.id) + '" aria-label="Delete photo">' + icon("x") + "</button>" +
          (S.isAdmin ? '<button style="right:auto;left:6px" data-act="photo-vis" data-id="' + esc(p.id) + '" aria-label="' + (p.visible === false ? "Show" : "Hide") + ' photo">' + icon(p.visible === false ? "eyeoff" : "eye") + "</button>" : "") +
          "</div>";
      }).join("") + "</div>" : '<p class="sub">No photos yet.</p>') + "</div>";
  }

  function profileView() {
    var d = S.draft; if (!d) return "";
    var apps = ["Squire", "Booksy", "Vagaro", "theCut", "Square", "GlossGenius", "Other"];
    if (d.app && apps.indexOf(d.app) < 0) apps.unshift(d.app);
    var dayNames = ["S", "M", "T", "W", "T", "F", "S"];
    var days = d.work_days || [false, true, true, true, true, true, true];
    return '<div class="stack"><h1 class="page-title">Profile</h1>' +
      '<section class="card"><div style="display:flex;align-items:center;gap:14px">' +
      (d.photo_url ? '<img src="' + esc(siteUrl(d.photo_url)) + '" alt="" style="width:76px;height:76px;border-radius:999px;object-fit:cover;object-position:50% 20%">' : '<span class="avatar" style="width:76px;height:76px"></span>') +
      '<label class="btn btn-outline btn-sm" style="position:relative">Change photo<input type="file" accept="image/*" data-upload="profile" style="position:absolute;inset:0;opacity:0;cursor:pointer"></label></div>' +
      '<div class="row2"><label class="field">Name on site<input class="input" data-f="name" value="' + esc(d.name) + '"></label>' +
      '<label class="field">First name<input class="input" data-f="first_name" value="' + esc(d.first_name) + '"><span class="hint">For “Book ' + esc(d.first_name || "…") + '”</span></label></div>' +
      '<label class="field">Short line<input class="input" data-f="short_line" value="' + esc(d.short_line) + '" placeholder="Barber · Blends & beards"></label>' +
      '<label class="field">Bio<textarea class="input" data-f="bio" rows="4">' + esc(d.bio) + "</textarea></label>" +
      '<label class="field">Specialties<input class="input" data-f="tags" value="' + esc((d.tags || []).join(", ")) + '" placeholder="Fades, Beard work, Color"><span class="hint">Separate with commas</span></label></section>' +
      '<section class="card"><h2>Booking</h2><div class="row2"><label class="field">Booking app<select class="input" data-f="app">' +
      apps.map(function (a) { return "<option" + (a === d.app ? " selected" : "") + ">" + esc(a) + "</option>"; }).join("") + "</select></label>" +
      '<label class="field">Role<select class="input" data-f="role"><option' + (d.role === "Barber" ? " selected" : "") + '>Barber</option><option' + (d.role === "Stylist" ? " selected" : "") + ">Stylist</option></select></label></div>" +
      '<label class="field">Booking link<input class="input" type="url" data-f="book_url" value="' + esc(d.book_url) + '" placeholder="https://"></label>' +
      '<div class="field">Days you work<div class="days">' + dayNames.map(function (n, i) {
        return '<button class="day" data-act="day" data-i="' + i + '" aria-pressed="' + (!!days[i]) + '" aria-label="' + ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][i] + '">' + n + "</button>";
      }).join("") + "</div></div></section>" +
      (S.isAdmin ? '<section class="card"><h2>Owner settings</h2>' +
        '<label class="field">Login email<input class="input" type="email" data-f="email" value="' + esc(d.email || "") + '"><span class="hint">' + (d.user_id ? "Linked to their login" : "They create a login with this email") + "</span></label>" +
        '<div class="row2"><label class="field">Page address<input class="input" data-f="slug" value="' + esc(d.slug) + '"><span class="hint">barber.html?id=' + esc(d.slug) + "</span></label>" +
        '<label class="field">Type<select class="input" data-f="kind"><option value="barber"' + (d.kind === "barber" ? " selected" : "") + '>Barber</option><option value="stylist"' + (d.kind === "stylist" ? " selected" : "") + ">Stylist</option></select></label></div>" +
        '<div class="card-head"><span>Show “Owner” badge</span><button class="switch" role="switch" aria-checked="' + !!d.is_owner + '" data-act="toggle-f" data-f="is_owner" aria-label="Owner badge"><span></span></button></div>' +
        '<div class="card-head"><span>Show on website</span><button class="switch" role="switch" aria-checked="' + !!d.visible + '" data-act="toggle-f" data-f="visible" aria-label="Show on website"><span></span></button></div>' +
        (d.id !== S.myId ? '<button class="btn btn-danger btn-sm" data-act="remove-barber" style="align-self:flex-start">Remove from team</button>' : "") +
        "</section>" : "") +
      passwordCard() +
      "</div>";
  }

  // Change the password of whoever is logged in (not the barber being viewed)
  function passwordCard() {
    return '<form class="card" data-form="password" autocomplete="on"><div><h2>Your password</h2>' +
      '<p class="sub">Logged in as <strong>' + esc(S.email || "") + '</strong>. This changes your own login only.</p></div>' +
      '<input type="email" name="username" value="' + esc(S.email || "") + '" autocomplete="username" hidden>' +
      '<div class="row2"><label class="field">New password<input class="input" type="password" name="pw1" minlength="6" autocomplete="new-password" required></label>' +
      '<label class="field">Type it again<input class="input" type="password" name="pw2" minlength="6" autocomplete="new-password" required></label></div>' +
      '<span class="hint">At least 6 characters.</span>' +
      '<button class="btn btn-outline btn-sm" type="submit" style="align-self:flex-start">Update password</button></form>';
  }

  function shopView() {
    var sh = S.shop || {};
    var total = 0, max = 1;
    S.barbers.forEach(function (b) { var t = S.tapsNow[b.id] || 0; total += t; if (t > max) max = t; });
    return '<div class="stack"><h1 class="page-title">Shop</h1>' +
      '<section class="card"><div><h2>Booking taps this month</h2><p class="sub">Clients the site sent to each barber’s app</p></div>' +
      '<div style="font-family:var(--display);font-weight:800;font-size:40px;line-height:1">' + total + "</div>" +
      '<div class="bars">' + S.barbers.filter(function (b) { return b.visible; }).map(function (b) {
        var t = S.tapsNow[b.id] || 0;
        return '<div class="bar-row"><img src="' + esc(siteUrl(b.photo_url)) + '" alt=""><div style="display:flex;flex-direction:column;gap:5px"><span style="font-size:14px;font-weight:600">' + esc(b.name) + '</span><div class="bar-track"><div class="bar-fill" style="width:' + Math.round((t / max) * 100) + '%"></div></div></div><strong>' + t + "</strong></div>";
      }).join("") + "</div></section>" +
      '<section class="card"><div class="card-head"><div><h2>Site banner</h2><p class="sub">A strip across the top of every page</p></div>' +
      '<button class="switch" role="switch" aria-checked="' + !!sh.banner_on + '" data-act="banner-toggle" aria-label="Show banner"><span></span></button></div>' +
      '<input class="input" data-shop="banner_text" value="' + esc(sh.banner_text) + '" placeholder="Closed Thursday, Nov 26 for Thanksgiving">' +
      (sh.banner_on && sh.banner_text ? '<div class="banner-preview">' + esc(sh.banner_text) + "</div>" : "") +
      '<label class="field">Hours<input class="input" data-shop="hours" value="' + esc(sh.hours) + '"></label>' +
      '<label class="field">Hours note<input class="input" data-shop="hours_note" value="' + esc(sh.hours_note) + '"></label>' +
      '<button class="btn btn-primary btn-sm" data-act="shop-save" style="align-self:flex-start">Save shop info</button></section>' +
      '<section class="card"><div class="card-head"><h2>Team</h2><button class="btn btn-primary btn-sm" data-act="add-toggle">' + (S.addOpen ? "Cancel" : "+ Add barber") + "</button></div>" +
      (S.addOpen ? addBarberForm() : "") +
      S.barbers.map(function (b, i) {
        return '<div class="member' + (b.visible ? "" : " is-hidden") + '">' + (b.photo_url ? '<img src="' + esc(siteUrl(b.photo_url)) + '" alt="">' : '<span class="avatar"></span>') +
          '<div class="meta"><strong>' + esc(b.name) + '</strong><span><span class="dot ' + (b.visible ? b.status : "") + '" style="' + (b.visible ? "" : "background:#b5b0a6") + '"></span>' +
          (b.visible ? { open: "Taking new clients", booked: "Booked up", away: "Away" }[b.status] : "Hidden from site") + (b.user_id ? "" : " · no login yet") + "</span></div>" +
          '<div class="member-tools"><button class="icon-btn" data-act="move" data-i="' + i + '" aria-label="Move up"' + (i === 0 ? " disabled" : "") + ">" + icon("up") + "</button>" +
          '<button class="icon-btn" data-act="vis" data-id="' + esc(b.id) + '" aria-label="' + (b.visible ? "Hide" : "Show") + '">' + icon(b.visible ? "eye" : "eyeoff") + "</button>" +
          '<button class="icon-btn" data-act="edit" data-id="' + esc(b.id) + '" aria-label="Edit ' + esc(b.name) + '">' + icon("edit") + "</button></div></div>";
      }).join("") + "</section></div>";
  }

  function addBarberForm() {
    return '<form class="stack" data-form="add" style="padding:14px;border-radius:10px;background:var(--soft)">' +
      '<div class="field">Photo<div style="display:flex;align-items:center;gap:14px">' +
      '<span class="avatar" data-pick-preview style="width:76px;height:76px;background:#fff center 20%/cover no-repeat;border:1px dashed #c9c4b8"></span>' +
      '<label class="btn btn-outline btn-sm" style="position:relative;background:#fff">Choose photo<input type="file" name="photo" accept="image/*" data-pick style="position:absolute;inset:0;opacity:0;cursor:pointer"></label></div>' +
      '<span class="hint">A clear portrait, face toward the top. Used on Our team and their profile page.</span></div>' +
      '<div class="row2"><label class="field">Full name on site<input class="input" name="name" required placeholder="Alex R."></label>' +
      '<label class="field">First name<input class="input" name="first_name" required placeholder="Alex"></label></div>' +
      '<div class="row2"><label class="field">Role<select class="input" name="role"><option>Barber</option><option>Stylist</option></select></label>' +
      '<label class="field">Booking app<select class="input" name="app"><option>Squire</option><option>Booksy</option><option>Vagaro</option><option>theCut</option><option>Square</option><option>Other</option></select></label></div>' +
      '<label class="field">Booking link<input class="input" type="url" name="book_url" placeholder="https://"></label>' +
      '<label class="field">Their email<input class="input" type="email" name="email" required placeholder="alex@inspirehairstudios.com"><span class="hint">They’ll create a login with this email at inspirehairstudios.com/admin</span></label>' +
      '<p class="hint">New barbers start hidden so you can add their prices and bio first.</p>' +
      '<button class="btn btn-primary btn-sm" type="submit" style="align-self:flex-start">Add to team</button></form>';
  }

  function syncSavebar() {
    var sb = document.getElementById("savebar");
    if (sb) sb.hidden = !(S.dirty && (S.tab === "prices" || S.tab === "profile"));
  }
  function markDirty() { if (!S.dirty) { S.dirty = true; syncSavebar(); } }
  function guardLeave() { return !S.dirty || confirm("You have unsaved changes. Leave without publishing?"); }

  /* ---------------- actions ---------------- */
  async function run(fn, okMsg) {
    try { S.busy = true; await fn(); if (okMsg) toast(okMsg); }
    catch (e) { toast(e.message || "Something went wrong", true); }
    finally { S.busy = false; }
  }
  async function refreshBarbers() {
    S.barbers = await api.barbers();
  }

  app.addEventListener("submit", async function (e) {
    var f = e.target.closest("form"); if (!f) return;
    e.preventDefault();
    var fd = new FormData(f);
    if (f.dataset.form === "auth") {
      S.authErr = ""; S.busy = true; render();
      var email = (fd.get("email") || S.email || "").trim(), pw = fd.get("password");
      S.email = email;
      try {
        if (S.authMode === "signin") { await api.signIn(email, pw); await enter(email); return; }
        if (S.authMode === "signup") {
          var r = await api.signUp(email, pw);
          if (r && r.session) { await enter(email); return; }
          S.authMode = "check";
        }
        if (S.authMode === "forgot") { await api.forgot(email); S.authMode = "check"; }
        if (S.authMode === "recovery") { await api.setPassword(pw); toast("Password saved"); var s = await api.session(); await enter(s.user.email); return; }
      } catch (err) {
        S.authErr = /Invalid login/i.test(err.message) ? "That email and password don’t match." : err.message;
      }
      S.busy = false; render();
    }
    if (f.dataset.form === "password") {
      var p1 = fd.get("pw1") || "", p2 = fd.get("pw2") || "";
      if (p1.length < 6) { toast("Use at least 6 characters", true); return; }
      if (p1 !== p2) { toast("Those passwords don\u2019t match", true); return; }
      await run(async function () { await api.setPassword(p1); f.reset(); }, "Password updated");
      return;
    }
    if (f.dataset.form === "add") {
      await run(async function () {
        var name = fd.get("name").trim();
        var slug = slugify(fd.get("first_name") || name);
        if (S.barbers.some(function (b) { return b.slug === slug; })) slug = slug + "-" + (S.barbers.length + 1);
        var row = {
          name: name, first_name: fd.get("first_name").trim(), role: fd.get("role"), kind: fd.get("role") === "Stylist" ? "stylist" : "barber",
          app: fd.get("app"), book_url: fd.get("book_url").trim(), email: fd.get("email").trim().toLowerCase(), slug: slug,
          short_line: fd.get("role"), visible: false, sort_order: (S.barbers.length + 1) * 10
        };
        var b = await api.addBarber(row);
        var pic = fd.get("photo");
        if (pic && pic.size) {
          var up = await api.uploadFile(b.id, await resizeImage(pic, 1200), "profile");
          await api.updateBarber(b.id, { photo_url: up.url });
        }
        await refreshBarbers();
        S.addOpen = false; S.currentId = b.id; S.tab = "profile"; await loadCurrent();
      }, "Added. Finish their profile, then turn on “Show on website”.");
      render();
    }
  });

  app.addEventListener("input", function (e) {
    var t = e.target;
    if (t.dataset.svc !== undefined) { S.draftServices[+t.dataset.svc][t.dataset.k] = t.value; markDirty(); return; }
    if (t.dataset.f) {
      var v = t.value;
      if (t.dataset.f === "tags") v = v.split(",").map(function (s) { return s.trim(); }).filter(Boolean);
      S.draft[t.dataset.f] = v; markDirty(); return;
    }
    if (t.dataset.shop) { S.shop[t.dataset.shop] = t.value; return; }
  });

  app.addEventListener("change", async function (e) {
    var t = e.target;
    if (t.dataset.act === "switch") {
      if (!guardLeave()) { t.value = S.currentId; return; }
      S.currentId = t.value; await run(loadCurrent); render(); return;
    }
    if (t.tagName === "SELECT" && t.dataset.f) { S.draft[t.dataset.f] = t.value; markDirty(); return; }
    if (t.dataset.pick !== undefined) {
      var pv = app.querySelector("[data-pick-preview]"), file = t.files && t.files[0];
      if (pv && file) { pv.style.backgroundImage = "url(" + URL.createObjectURL(file) + ")"; pv.style.borderStyle = "solid"; }
      return;
    }
    if (t.dataset.upload) {
      var files = Array.prototype.slice.call(t.files || []); if (!files.length) return;
      var b = current();
      toast(files.length > 1 ? "Uploading " + files.length + " photos…" : "Uploading…");
      await run(async function () {
        for (var i = 0; i < files.length; i++) {
          var blob = await resizeImage(files[i], t.dataset.upload === "profile" ? 1200 : 1600);
          var up = await api.uploadFile(b.id, blob, t.dataset.upload);
          if (t.dataset.upload === "profile") {
            await api.updateBarber(b.id, { photo_url: up.url });
            S.draft.photo_url = up.url;
          } else {
            await api.addPhoto(b.id, up);
          }
        }
        await refreshBarbers();
        S.photos = await api.photos(b.id);
      }, t.dataset.upload === "profile" ? "Profile photo updated" : (files.length > 1 ? "Photos posted" : "Photo posted"));
      render();
    }
  });

  app.addEventListener("click", async function (e) {
    var el = e.target.closest("[data-act]"); if (!el) return;
    var act = el.dataset.act, b = current();
    if (el.tagName === "SELECT") return;
    switch (act) {
      case "mode": S.authMode = el.dataset.mode; S.authErr = ""; render(); break;
      case "signout": if (!guardLeave()) return; await api.signOut(); if (!DEMO) { S.screen = "login"; S.authMode = "signin"; render(); } break;
      case "tab":
        if (el.dataset.tab === S.tab) return;
        if (!guardLeave()) return;
        resetDraft(); S.tab = el.dataset.tab; render(); window.scrollTo(0, 0); break;
      case "status":
        await run(async function () { await api.updateBarber(b.id, { status: el.dataset.status, status_note: el.dataset.status === "away" ? b.status_note : "" }); await refreshBarbers(); resetDraft(); }, "Status updated");
        render(); break;
      case "save-note":
        var note = app.querySelector("[data-status-note]").value.trim();
        await run(async function () { await api.updateBarber(b.id, { status_note: note }); await refreshBarbers(); resetDraft(); }, "Saved");
        render(); break;
      case "svc-add": S.draftServices.push({ name: "", price: "", duration: "", note: "" }); markDirty(); render();
        var ins = app.querySelectorAll('.svc-top .input'); if (ins.length) ins[ins.length - 1].focus(); break;
      case "svc-del":
        var gone = S.draftServices.splice(+el.dataset.i, 1)[0]; if (gone && gone.id) S.removed.push(gone.id); markDirty(); render(); break;
      case "svc-up":
        var i = +el.dataset.i; var L = S.draftServices; var tmp = L[i - 1]; L[i - 1] = L[i]; L[i] = tmp; markDirty(); render(); break;
      case "day":
        var days = (S.draft.work_days || [false, true, true, true, true, true, true]).slice(); days[+el.dataset.i] = !days[+el.dataset.i];
        S.draft.work_days = days; markDirty(); el.setAttribute("aria-pressed", String(days[+el.dataset.i])); break;
      case "toggle-f":
        S.draft[el.dataset.f] = !S.draft[el.dataset.f]; el.setAttribute("aria-checked", String(S.draft[el.dataset.f])); markDirty(); break;
      case "discard": resetDraft(); render(); break;
      case "publish": await publish(); break;
      case "photo-del":
        if (!confirm("Delete this photo from your profile?")) return;
        await run(async function () { await api.deletePhoto(S.photos.find(function (p) { return p.id === el.dataset.id; })); S.photos = await api.photos(b.id); }, "Photo deleted");
        render(); break;
      case "photo-vis":
        var ph = S.photos.find(function (p) { return p.id === el.dataset.id; });
        await run(async function () { await api.updatePhoto(ph.id, { visible: ph.visible === false }); S.photos = await api.photos(b.id); });
        render(); break;
      case "banner-toggle": S.shop.banner_on = !S.shop.banner_on; render(); break;
      case "shop-save":
        await run(async function () { S.shop = await api.updateShop({ banner_on: S.shop.banner_on, banner_text: S.shop.banner_text, hours: S.shop.hours, hours_note: S.shop.hours_note }); }, "Shop info saved");
        render(); break;
      case "add-toggle": S.addOpen = !S.addOpen; render(); break;
      case "move":
        var j = +el.dataset.i; var list = S.barbers.slice(); var t2 = list[j - 1]; list[j - 1] = list[j]; list[j] = t2;
        await run(async function () {
          for (var k = 0; k < list.length; k++) { if (list[k].sort_order !== (k + 1) * 10) await api.updateBarber(list[k].id, { sort_order: (k + 1) * 10 }); }
          await refreshBarbers();
        }, "Order saved");
        render(); break;
      case "vis":
        var target = S.barbers.find(function (x) { return x.id === el.dataset.id; });
        await run(async function () { await api.updateBarber(target.id, { visible: !target.visible }); await refreshBarbers(); }, target.visible ? target.first_name + " hidden from the site" : target.first_name + " is live on the site");
        render(); break;
      case "edit":
        S.currentId = el.dataset.id; S.tab = "profile"; await run(loadCurrent); render(); window.scrollTo(0, 0); break;
      case "remove-barber":
        if (!confirm("Remove " + b.name + " from the team? Their profile, prices and photos will be deleted.")) return;
        await run(async function () { await api.deleteBarber(b.id); await refreshBarbers(); S.currentId = S.myId || S.barbers[0].id; S.tab = "shop"; await loadCurrent(); }, "Removed");
        render(); break;
    }
  });

  async function publish() {
    var b = current();
    if (S.tab === "prices") {
      var clean = S.draftServices.filter(function (s) { return (s.name || "").trim(); });
      await run(async function () { await api.saveServices(b.id, clean, S.removed); S.services = await api.services(b.id); S.removed = []; resetDraft(); }, "Prices are live on the website");
    } else if (S.tab === "profile") {
      var d = S.draft, patch = {};
      ["name", "first_name", "short_line", "bio", "tags", "app", "role", "book_url", "work_days"].forEach(function (k) { patch[k] = d[k]; });
      if (S.isAdmin) ["email", "slug", "kind", "is_owner", "visible"].forEach(function (k) { patch[k] = d[k]; });
      if (patch.slug) patch.slug = slugify(patch.slug);
      if (patch.email === "") patch.email = null;
      await run(async function () { await api.updateBarber(b.id, patch); await refreshBarbers(); resetDraft(); }, "Profile is live on the website");
    }
    render();
  }

  window.addEventListener("beforeunload", function (e) { if (S.dirty) { e.preventDefault(); e.returnValue = ""; } });
  boot();
})();
