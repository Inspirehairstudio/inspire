/* =========================================================
   Inspire Hair Studio — shared site script
   Renders header, menu, booking sheet and footer on every
   page, plus the team, home carousel and profile sections.
   ========================================================= */
(function () {
  "use strict";
  var D = window.INSPIRE || { shop: {}, team: [] };
  var S = D.shop, TEAM = D.team;

  /* ---------- helpers ---------- */
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  var P = {
    menu: '<path d="M4 8h16M4 16h16"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/>',
    pin: '<path d="M12 22s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    back: '<path d="M15 6l-6 6 6 6"/>',
    instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.8" fill="currentColor"/>',
    facebook: '<path d="M15 3h-2.5A3.5 3.5 0 0 0 9 6.5V9H6.5v3.5H9V21h3.5v-8.5H15l.5-3.5h-3V7a1 1 0 0 1 1-1H15z"/>',
    tiktok: '<path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5"/><path d="M14 3c.5 2.6 2.3 4.3 5 4.6"/>',
    star: '<path d="M12 2l3 6.6 7.2.7-5.4 4.8 1.6 7.1L12 17.6 5.6 21.2l1.6-7.1L1.8 9.3 9 8.6z" fill="currentColor" stroke="none"/>'
  };
  function icon(name, cls) {
    return '<svg class="icon ' + (cls || "") + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + P[name] + "</svg>";
  }
  function socials() {
    var out = [];
    [["instagram", "Instagram"], ["facebook", "Facebook"], ["tiktok", "TikTok"]].forEach(function (s) {
      var url = S.socials && S.socials[s[0]];
      if (url) out.push({ key: s[0], label: s[1], url: url });
    });
    return out;
  }
  function socialLinks(wrapCls) {
    return socials().map(function (s) {
      return '<a href="' + esc(s.url) + '" target="_blank" rel="noopener" aria-label="' + s.label + '">' + icon(s.key) + "</a>";
    }).join("");
  }
  window.InspireUI = { esc: esc, icon: icon };

  /* ---------- live data from the admin portal (Supabase) ---------- */
  var CFG = window.INSPIRE_SUPABASE || {};
  var LIVE = !!(CFG.url && CFG.anonKey);
  function sbGet(path) {
    return fetch(CFG.url + "/rest/v1/" + path, { headers: { apikey: CFG.anonKey, Authorization: "Bearer " + CFG.anonKey } })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); });
  }
  function thumbOf(url) { return /\/?images2\/[^/]+\.jpg$/.test(url || "") && url.indexOf("-sm.jpg") < 0 ? url.replace(".jpg", "-sm.jpg") : url; }
  function loadLive() {
    var cols = "id,slug,name,first_name,role,kind,is_owner,short_line,bio,tags,app,book_url,photo_url,status,status_note,work_days,sort_order";
    return Promise.all([
      sbGet("barbers?select=" + cols + "&visible=eq.true&order=sort_order.asc,name.asc"),
      sbGet("services?select=barber_id,name,price,duration,note,sort_order&order=sort_order.asc"),
      sbGet("photos?select=barber_id,url,created_at&visible=eq.true&order=created_at.desc"),
      sbGet("shop_settings?select=banner_on,banner_text,hours,hours_note&id=eq.1")
    ]).then(function (r) {
      var team = r[0].map(function (b) {
        return {
          dbId: b.id, id: b.slug, name: b.name, first: b.first_name, role: b.role, kind: b.kind, owner: b.is_owner,
          photo: b.photo_url, thumb: thumbOf(b.photo_url), short: b.short_line, bio: b.bio, tags: b.tags || [],
          app: b.app, bookUrl: b.book_url, status: b.status, statusNote: b.status_note, workDays: b.work_days,
          services: r[1].filter(function (s) { return s.barber_id === b.id; }).map(function (s) { return { name: s.name, price: s.price, time: s.duration, note: s.note }; }),
          photos: r[2].filter(function (p) { return p.barber_id === b.id; }).map(function (p) { return p.url; })
        };
      });
      return { team: team, shop: r[3][0] || null };
    });
  }
  function trackBook(slug) {
    if (!LIVE) return;
    var m = TEAM.filter(function (x) { return x.id === slug; })[0];
    if (!m || !m.dbId) return;
    try {
      fetch(CFG.url + "/rest/v1/book_taps", {
        method: "POST", keepalive: true,
        headers: { apikey: CFG.anonKey, Authorization: "Bearer " + CFG.anonKey, "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify({ barber_id: m.dbId, source: page || "site" })
      });
    } catch (e) {}
  }
  var STATUS = { open: ["Taking new clients", "#2f8f5b"], booked: ["Booked up this week", "#c98a1b"], away: ["Away", "#8a857c"] };
  function statusText(m) { var s = STATUS[m.status]; if (!s) return ""; return s[0] + (m.status === "away" && m.statusNote ? " · back " + m.statusNote : ""); }
  function statusBadge(m, cls) {
    var s = STATUS[m.status]; if (!s) return "";
    return '<span class="' + cls + '"><span class="dot" style="background:' + s[1] + '"></span>' + esc(statusText(m)) + "</span>";
  }
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("[data-book-id]");
    if (a) trackBook(a.getAttribute("data-book-id"));
  });

  /* ---------- header ---------- */
  var page = document.body.getAttribute("data-page") || "";
  var NAV = [
    ["ourteam.html", "Our team", "team"],
    ["gallery.html", "Gallery", "gallery"],
    ["reviews.html", "Reviews", "reviews"],
    ["events.html", "Events", "events"],
    ["contact.html", "Contact", "contact"]
  ];
  var headerEl = document.getElementById("site-header");
  if (headerEl) {
    headerEl.outerHTML =
      '<header class="site-header"><div class="wrap">' +
      '<a class="brand" href="index.html" aria-label="Inspire Hair Studio home"><img src="images2/inspirehairstudioslogo.png" alt="Inspire Hair Studio" width="92" height="38"></a>' +
      '<nav class="header-nav" aria-label="Main">' +
      NAV.map(function (n) {
        return '<a href="' + n[0] + '"' + (page === n[2] ? ' aria-current="page"' : "") + ">" + n[1] + "</a>";
      }).join("") +
      "</nav>" +
      '<div class="header-actions">' +
      '<div class="header-social">' + socialLinks() + "</div>" +
      '<button type="button" class="btn btn-primary btn-pill header-book shine" data-book-open>Book now</button>' +
      '<button type="button" class="icon-btn menu-toggle" aria-label="Open menu" aria-expanded="false" aria-controls="site-menu" data-menu-open>' + icon("menu") + "</button>" +
      "</div></div></header>";
  }

  /* ---------- menu + sheet + lightbox shells ---------- */
  var shell = document.createElement("div");
  shell.innerHTML =
    '<div class="menu" id="site-menu" role="dialog" aria-modal="true" aria-label="Menu">' +
    '<div class="menu-top"><img src="images2/inspirehairstudioslogo.png" class="logo-white" alt="Inspire Hair Studio" width="92" height="38">' +
    '<button type="button" class="icon-btn" aria-label="Close menu" data-menu-close>' + icon("close") + "</button></div>" +
    "<nav>" +
    NAV.map(function (n) { return '<a href="' + n[0] + '" data-menu-close>' + n[1] + "</a>"; }).join("") +
    '<a href="index.html#visit" data-menu-close>Visit</a>' +
    "</nav>" +
    '<div class="menu-bottom">' +
    '<button type="button" class="btn btn-white btn-block shine shine-dark" data-menu-close data-book-open>Book an appointment</button>' +
    '<a class="btn btn-ghost-light btn-block" href="' + esc(S.phoneHref) + '">Call ' + esc(S.phone) + "</a>" +
    '<div class="menu-meta"><span>' + esc(S.hours) + '</span><div class="social-circles">' + socialLinks() + "</div></div>" +
    "</div></div>" +
    '<div class="sheet" id="book-sheet" aria-hidden="true">' +
    '<button type="button" class="sheet-backdrop" aria-label="Close" data-sheet-close tabindex="-1"></button>' +
    '<div class="sheet-panel" role="dialog" aria-modal="true" aria-labelledby="sheet-title">' +
    '<div class="sheet-grab"></div>' +
    '<div class="sheet-head"><h2 id="sheet-title">Who are you booking with?</h2>' +
    '<button type="button" class="icon-btn" aria-label="Close" data-sheet-close>' + icon("close") + "</button></div>" +
    '<p class="sheet-note">Each barber and stylist books through their own app.</p>' +
    '<div id="sheet-picks"></div>' +
    '<a class="sheet-call" href="' + esc(S.phoneHref) + '">Not sure? Call ' + esc(S.phone) + "</a>" +
    "</div></div>" +
    '<div class="lightbox" id="lightbox" role="dialog" aria-modal="true" aria-label="Photo">' +
    '<button type="button" class="icon-btn" aria-label="Close photo" data-lightbox-close>' + icon("close") + "</button>" +
    '<img alt="">' +
    "</div>";
  while (shell.firstChild) document.body.appendChild(shell.firstChild);

  function renderPicks() {
    var el = document.getElementById("sheet-picks"); if (!el) return;
    el.innerHTML = TEAM.map(function (m) {
      return '<a class="pick" href="' + esc(m.bookUrl) + '" target="_blank" rel="noopener" data-book-id="' + esc(m.id) + '">' +
        '<img src="' + esc(m.thumb) + '" alt="" loading="lazy">' +
        '<span class="pick-text"><span class="pick-name">' + esc(m.name) + '</span><span class="pick-meta">' + esc(m.role) + " · books on " + esc(m.app) + (m.status && m.status !== "open" ? " · " + esc(statusText(m)) : "") + "</span></span>" +
        '<span class="pick-cta">Book</span></a>';
    }).join("");
  }
  var menu = document.getElementById("site-menu");
  var sheet = document.getElementById("book-sheet");
  var lightbox = document.getElementById("lightbox");
  var lastFocus = null;

  function lock(on) { document.body.classList.toggle("locked", on); }
  function openMenu() { lastFocus = document.activeElement; menu.classList.add("open"); lock(true); setExpanded(true); menu.querySelector("[data-menu-close]").focus(); }
  function closeMenu() { menu.classList.remove("open"); setExpanded(false); if (!sheet.classList.contains("open")) lock(false); }
  function setExpanded(v) { var t = document.querySelector("[data-menu-open]"); if (t) t.setAttribute("aria-expanded", v ? "true" : "false"); }
  function openSheet() { lastFocus = lastFocus || document.activeElement; sheet.classList.add("open"); sheet.setAttribute("aria-hidden", "false"); lock(true); setTimeout(function () { var c = sheet.querySelector(".sheet-head [data-sheet-close]"); if (c) c.focus(); }, 50); }
  function closeSheet() { sheet.classList.remove("open"); sheet.setAttribute("aria-hidden", "true"); lock(false); if (lastFocus && lastFocus.focus) lastFocus.focus(); lastFocus = null; }
  function openLightbox(src, alt) { var img = lightbox.querySelector("img"); img.src = src; img.alt = alt || ""; lightbox.classList.add("open"); lock(true); lightbox.querySelector("button").focus(); }
  function closeLightbox() { lightbox.classList.remove("open"); lock(false); }

  document.addEventListener("click", function (e) {
    var t = e.target.closest ? e.target : null;
    if (!t) return;
    if (t.closest("[data-menu-open]")) { openMenu(); return; }
    if (t.closest("[data-book-open]")) { e.preventDefault(); if (menu.classList.contains("open")) closeMenu(); openSheet(); return; }
    if (t.closest("[data-menu-close]")) { closeMenu(); }
    if (t.closest("[data-sheet-close]")) { closeSheet(); }
    if (t.closest("[data-lightbox-close]") || t === lightbox) { closeLightbox(); }
    var ph = t.closest("[data-photo]");
    if (ph) openLightbox(ph.getAttribute("data-photo"), ph.getAttribute("data-alt"));
  });
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (lightbox.classList.contains("open")) closeLightbox();
    else if (sheet.classList.contains("open")) closeSheet();
    else if (menu.classList.contains("open")) closeMenu();
  });
  if (location.hash === "#book") openSheet();
  /* Directions: iPhones/iPads open Apple Maps navigation, everyone else Google Maps */
  if (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) {
    document.querySelectorAll("[data-directions]").forEach(function (a) {
      a.href = "https://maps.apple.com/?daddr=201+Sunset+Blvd,+Sherman,+TX+75092&dirflg=d";
    });
  }
  var fm = document.getElementById("full-menu");
  if (fm && window.matchMedia("(min-width: 820px)").matches) fm.open = true;

  /* ---------- footer ---------- */
  var footerEl = document.getElementById("site-footer");
  if (footerEl) {
    footerEl.outerHTML =
      '<footer class="site-footer"><div class="wrap">' +
      '<div><img src="images2/inspirehairstudioslogo.png" class="logo-white" alt="Inspire Hair Studio" width="97" height="40"></div>' +
      '<nav class="footer-links" aria-label="Footer">' +
      '<a href="ourteam.html">Our team</a><a href="reviews.html">Reviews</a>' +
      '<a href="gallery.html">Gallery</a><a href="events.html">Events</a>' +
      '<a href="contact.html">Contact</a><a href="#book" data-book-open>Book online</a>' +
      "</nav>" +
      '<div class="stack" style="gap:16px">' +
      '<div class="social-circles">' + socialLinks() + "</div>" +
      '<p class="footer-small">' + esc(S.street) + ", " + esc(S.cityLine) + '<br><a href="' + esc(S.phoneHref) + '">' + esc(S.phone) + "</a> · <span data-shop-hours>" + esc(S.hours) + "</span><br>© " + new Date().getFullYear() + " Inspire Hair Studio</p>" +
      "</div></div></footer>";
  }

  /* ---------- home: team carousel ---------- */
  var car = document.getElementById("team-carousel");
  function renderCarousel() {
    if (!car) return;
    car.innerHTML = TEAM.map(function (m) {
      return '<a class="mini" href="barber.html?id=' + esc(m.id) + '">' +
        '<img src="' + esc(m.thumb) + '" alt="' + esc(m.name) + ', ' + esc(m.role.toLowerCase()) + ' at Inspire Hair Studio" loading="lazy">' +
        "<span><strong>" + esc(m.name) + "</strong><br><span>" + esc(m.short) + "</span></span></a>";
    }).join("");
  }

  /* ---------- team page ---------- */
  function svcRows(list) {
    return list.map(function (s) {
      var meta = s.time ? esc(s.time) + " · " : "";
      return '<div class="svc"><span class="svc-name">' + esc(s.name) + (s.note ? "<small>" + esc(s.note) + "</small>" : "") + "</span>" +
        '<span class="svc-meta">' + meta + "<strong>" + esc(s.price) + "</strong></span></div>";
    }).join("");
  }
  var list = document.getElementById("team-list");
  var filter = "all";
  var open = {};
  function renderTeam() {
    if (!list) return;
    list.innerHTML = TEAM.filter(function (m) { return filter === "all" || m.kind === filter; }).map(function (m) {
        var isOpen = !!open[m.id];
        var shown = isOpen ? m.services : m.services.slice(0, 3);
        var more = m.services.length > 3
          ? '<button type="button" class="svc-toggle" data-toggle="' + esc(m.id) + '" aria-expanded="' + isOpen + '">' + (isOpen ? "Show less −" : "All " + m.services.length + " services +") + "</button>"
          : "";
        return '<article class="member">' +
          '<a class="member-photo" href="barber.html?id=' + esc(m.id) + '" aria-label="View ' + esc(m.first) + '’s profile">' +
          '<img src="' + esc(m.photo) + '" alt="' + esc(m.name) + ' at Inspire Hair Studio" loading="lazy">' +
          (m.owner || m.status ? '<span class="badge tl">' + (m.status ? statusBadge(m, "badge-status") : "") + (m.owner ? (m.status ? " · " : "") + "Owner" : "") + "</span>" : "") +
          '<span class="badge br">View profile ' + icon("arrow", "icon-sm") + "</span></a>" +
          '<div class="stack" style="gap:6px"><div class="eyebrow muted">' + esc(m.role) + "</div>" +
          '<h2><a href="barber.html?id=' + esc(m.id) + '">' + esc(m.name) + "</a></h2>" +
          '<p class="member-bio">' + esc(m.bio) + "</p></div>" +
          '<div class="tags">' + m.tags.map(function (t) { return '<span class="tag">' + esc(t) + "</span>"; }).join("") + "</div>" +
          '<div class="svc-list">' + svcRows(shown) + more + "</div>" +
          '<div class="btn-group two">' +
          '<a class="btn btn-outline" href="barber.html?id=' + esc(m.id) + '">View profile</a>' +
          '<a class="btn btn-primary" href="' + esc(m.bookUrl) + '" target="_blank" rel="noopener" data-book-id="' + esc(m.id) + '">Book ' + esc(m.first) + "</a></div>" +
          '<p class="books-on">Books on ' + esc(m.app) + "</p></article>";
      }).join("");
  }
  if (list) {
    list.addEventListener("click", function (e) {
      var b = e.target.closest("[data-toggle]");
      if (!b) return;
      var id = b.getAttribute("data-toggle");
      open[id] = !open[id];
      renderTeam();
    });
    document.querySelectorAll("[data-filter]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        filter = btn.getAttribute("data-filter");
        document.querySelectorAll("[data-filter]").forEach(function (b) { b.setAttribute("aria-pressed", b === btn ? "true" : "false"); });
        renderTeam();
      });
    });
  }

  /* ---------- barber profile ---------- */
  var prof = document.getElementById("profile");
  function renderProfile(final) {
    if (!prof) return;
    var id = new URLSearchParams(location.search).get("id");
    var m = TEAM.filter(function (x) { return x.id === id; })[0];
    if (!m && LIVE && !final) { prof.innerHTML = '<div class="wrap" style="padding:80px 20px;color:var(--muted)">Loading…</div>'; return; }
    m = m || TEAM[0];
    if (!m) return;
    document.title = m.name + " · " + m.role + " at Inspire Hair Studio | Sherman, TX";
    var canon = document.querySelector('link[rel="canonical"]');
    if (canon) canon.setAttribute("href", canon.getAttribute("href").split("?")[0] + "?id=" + m.id);
    var md = document.querySelector('meta[name="description"]');
    if (md) md.setAttribute("content", "Book with " + m.name + ", " + m.role.toLowerCase() + " at Inspire Hair Studio in Sherman, TX. " + m.bio);
    var others = TEAM.filter(function (x) { return x.id !== m.id; });
    var cheapest = m.services[0] || { price: "" };
    prof.innerHTML =
      '<div class="profile-wrap wrap">' +
      '<section class="profile-hero">' +
      '<img src="' + esc(m.photo) + '" alt="' + esc(m.name) + ' at Inspire Hair Studio">' +
      '<div class="profile-hero-text">' +
      (m.status ? statusBadge(m, "status") : (m.owner ? '<span class="status"><span class="dot"></span>Owner</span>' : "")) +
      "<h1>" + esc(m.name) + "</h1>" +
      '<span class="role">' + esc(m.role) + " · Inspire Hair Studio</span></div></section>" +
      '<div class="wrap profile-body">' +
      '<div class="stack" style="gap:10px">' +
      '<a class="btn btn-primary btn-block shine" href="' + esc(m.bookUrl) + '" target="_blank" rel="noopener" data-book-id="' + esc(m.id) + '">Book with ' + esc(m.first) + "</a>" +
      '<p class="books-on" style="margin-top:0">Books on ' + esc(m.app) + " · opens in a new tab</p></div>" +
      '<section class="stack" style="padding-top:28px;gap:16px">' +
      '<p class="lede" style="color:var(--ink-2)">' + esc(m.bio) + "</p>" +
      '<div class="tags">' + m.tags.map(function (t) { return '<span class="tag">' + esc(t) + "</span>"; }).join("") + "</div>" +
      (m.workDays ? '<div class="stack" style="gap:8px"><span class="eyebrow muted">In the chair</span><div class="days">' + ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(function (d, i) { return '<span class="day' + (m.workDays[i] ? " on" : "") + '">' + d + "</span>"; }).join("") + "</div></div>" : "") +
      "</section>" +
      (m.photos && m.photos.length
        ? '<section style="padding-top:40px"><div class="section-head row"><h2 class="section-title" style="font-size:28px">Recent work</h2><span style="font-size:13px;color:var(--muted)">Tap to view</span></div>' +
          '<div class="photo-grid">' + m.photos.map(function (p) {
            return '<button type="button" data-photo="' + esc(p) + '" data-alt="Work by ' + esc(m.name) + '" aria-label="View photo"><img src="' + esc(thumbOf(p)) + '" alt="Work by ' + esc(m.name) + '" loading="lazy"></button>';
          }).join("") + "</div></section>"
        : "") +
      '<section style="padding-top:40px"><h2 class="section-title" style="font-size:28px;margin-bottom:12px">Services</h2>' +
      '<div class="svc-list" style="border-bottom:1px solid var(--line)">' + svcRows(m.services) + "</div></section>" +
      '<section class="stack" style="padding-top:32px;gap:12px"><div class="eyebrow muted">Also at Inspire</div><div class="others">' +
      others.map(function (o) {
        return '<a class="other" href="barber.html?id=' + esc(o.id) + '"><img src="' + esc(o.thumb) + '" alt="" loading="lazy"><span><strong>' + esc(o.name) + "</strong><span>" + esc(o.role) + "</span></span></a>";
      }).join("") + "</div></section>" +
      "</div></div>" +
      '<div class="book-bar"><div class="wrap">' +
      '<img src="' + esc(m.thumb) + '" alt="">' +
      '<div class="book-bar-text"><strong>' + esc(m.name) + "</strong><span>" + (cheapest.price ? "From " + esc(cheapest.price) + (cheapest.time ? " · " + esc(cheapest.time) : "") : esc(m.role)) + "</span></div>" +
      '<a class="btn btn-primary btn-pill" href="' + esc(m.bookUrl) + '" target="_blank" rel="noopener" data-book-id="' + esc(m.id) + '">Book</a>' +
      "</div></div>";
  }

  /* ---------- render, then refresh with live data ---------- */
  function renderBanner(shop) {
    var old = document.getElementById("site-banner"); if (old) old.remove();
    if (!shop || !shop.banner_on || !shop.banner_text) return;
    var b = document.createElement("div");
    b.id = "site-banner"; b.className = "site-banner"; b.setAttribute("role", "status");
    b.textContent = shop.banner_text;
    var h = document.querySelector(".site-header");
    document.body.insertBefore(b, h || document.body.firstChild);
  }
  function renderAll(final) { renderPicks(); renderCarousel(); renderTeam(); renderProfile(final); }
  renderAll(false);
  if (LIVE) {
    loadLive().then(function (d) {
      if (d.team.length) { TEAM = d.team; window.INSPIRE.team = d.team; }
      renderAll(true);
      if (d.shop) {
        renderBanner(d.shop);
        document.querySelectorAll("[data-shop-hours]").forEach(function (el) { el.textContent = d.shop.hours; });
      }
    }).catch(function () { renderAll(true); });
  }
})();
