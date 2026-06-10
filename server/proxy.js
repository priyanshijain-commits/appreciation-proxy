const express = require("express");
const cors    = require("cors");
const fetch   = (...args) => import("node-fetch").then(({ default: f }) => f(...args));

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── OAuth config ─────────────────────────────────────
const CONFIG = {
  clientId:     "1000.925ZKPS06JYGPCIRXQFC4P46G4X4QI",
  clientSecret: "e1fa207f65225c7b070f96c09dbeed6538a820a6d8",
  refreshToken: "1000.19a9e43e4173a62cfe9b52766aa65621.ef343278b838cbd2ff67c5e8083bc245",
};

let cachedToken    = null;
let tokenExpiresAt = 0;

// ── Get / refresh access token ────────────────────────
async function getAccessToken() {
  if (cachedToken && Date.now() < tokenExpiresAt - 60000) return cachedToken;

  const response = await fetch("https://accounts.zoho.com/oauth/v2/token", {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id:     CONFIG.clientId,
      client_secret: CONFIG.clientSecret,
      refresh_token: CONFIG.refreshToken,
      grant_type:    "refresh_token",
    }),
  });

  const data = await response.json();
  if (!data.access_token) throw new Error("Token refresh failed: " + JSON.stringify(data));

  cachedToken    = data.access_token;
  tokenExpiresAt = Date.now() + (data.expires_in || 3600) * 1000;
  console.log("[Token] Refreshed successfully");
  return cachedToken;
}

// ── POST /token ───────────────────────────────────────
app.post("/token", async (req, res) => {
  try { res.json({ access_token: await getAccessToken() }); }
  catch(e) { res.status(500).json({ error: e.message }); }
});

// ── GET /api/* ────────────────────────────────────────
app.get("/api/*", async (req, res) => {
  try {
    const token   = await getAccessToken();
    const path    = req.params[0];
    const qs      = req.url.includes("?") ? "?" + req.url.split("?")[1] : "";
    const zohoUrl = "https://people.zoho.com/people/api/" + path + qs;
    console.log("[API] Fetching:", zohoUrl);
    const response = await fetch(zohoUrl, {
      headers: { "Authorization": "Zoho-oauthtoken " + token },
    });
    res.json(await response.json());
  } catch(e) {
    console.error("[API] Error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── GET /widget ───────────────────────────────────────
app.get("/widget", (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Appreciation Shoutout</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f5f6fa; color: #333; font-size: 13px; padding: 12px; }
    .widget-header { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; padding-bottom: 12px; border-bottom: 1px solid #f0f0f0; }
    .widget-header h2 { font-size: 15px; font-weight: 600; color: #222; }
    .subtitle { font-size: 11px; color: #888; margin-top: 2px; }
    .loading, .empty { text-align: center; color: #aaa; padding: 30px 0; font-size: 13px; }
    .error { text-align: center; color: #e53e3e; font-size: 12px; background: #fff5f5; border-radius: 8px; padding: 12px; margin-top: 8px; }
    #appreciationList { display: flex; flex-direction: column; gap: 8px; max-height: 340px; overflow-y: auto; padding-right: 2px; }
    #appreciationList::-webkit-scrollbar { width: 4px; }
    #appreciationList::-webkit-scrollbar-thumb { background: #ddd; border-radius: 4px; }
    .item { display: flex; align-items: flex-start; gap: 10px; background: #fafafa; border: 1px solid #f0f0f0; border-radius: 10px; padding: 10px 12px; cursor: pointer; transition: background 0.15s; }
    .item:hover { background: #f0f4ff; border-color: #c7d7ff; box-shadow: 0 2px 8px rgba(99,132,255,0.12); }
    .avatar { flex-shrink: 0; width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; font-size: 12px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
    .item-body { flex: 1; min-width: 0; }
    .name { font-weight: 600; font-size: 13px; color: #222; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .type { display: inline-block; margin-top: 3px; font-size: 10px; font-weight: 600; color: #6366f1; background: #eef2ff; border-radius: 4px; padding: 1px 6px; text-transform: uppercase; }
    .comment { margin-top: 4px; font-size: 12px; color: #555; font-style: italic; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
    .added-by { margin-top: 4px; font-size: 11px; color: #999; }
    .popup-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.45); backdrop-filter: blur(2px); align-items: center; justify-content: center; z-index: 1000; padding: 16px; }
    .popup-overlay.active { display: flex; }
    .popup { background: #fff; border-radius: 16px; padding: 28px 24px 24px; width: 100%; max-width: 360px; position: relative; text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,0.2); animation: popIn 0.2s ease; }
    @keyframes popIn { from { transform: scale(0.92); opacity: 0; } to { transform: scale(1); opacity: 1; } }
    .close-btn { position: absolute; top: 14px; right: 14px; background: #f5f5f5; border: none; border-radius: 50%; width: 28px; height: 28px; font-size: 14px; cursor: pointer; color: #666; display: flex; align-items: center; justify-content: center; }
    .close-btn:hover { background: #eee; }
    .popup-avatar { width: 60px; height: 60px; border-radius: 50%; background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; font-size: 20px; font-weight: 700; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px; }
    .popup h3 { font-size: 17px; font-weight: 700; color: #222; margin-bottom: 4px; }
    .popup-type { display: inline-block; font-size: 11px; font-weight: 600; color: #6366f1; background: #eef2ff; border-radius: 4px; padding: 2px 8px; text-transform: uppercase; margin-bottom: 8px; }
    .popup-comment { font-size: 13px; color: #555; font-style: italic; margin-bottom: 6px; line-height: 1.5; }
    .popup-added-by { font-size: 12px; color: #999; margin-bottom: 16px; }
    .popup label { display: block; text-align: left; font-size: 12px; font-weight: 600; color: #555; margin-bottom: 6px; }
    textarea#wishMessage { width: 100%; min-height: 80px; border: 1.5px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; font-size: 13px; font-family: inherit; resize: vertical; outline: none; color: #333; }
    textarea#wishMessage:focus { border-color: #6366f1; }
    .send-btn { margin-top: 12px; width: 100%; background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; border: none; border-radius: 8px; padding: 10px 0; font-size: 14px; font-weight: 600; cursor: pointer; transition: opacity 0.15s; }
    .send-btn:hover:not(:disabled) { opacity: 0.9; }
    .send-btn:disabled { opacity: 0.6; cursor: default; }
    .success { margin-top: 10px; font-size: 14px; color: #38a169; font-weight: 600; min-height: 20px; }
  </style>
</head>
<body>

  <div class="widget-header">
    <span style="font-size:22px">🏆</span>
    <div>
      <h2>Appreciation Shoutout</h2>
      <div class="subtitle">Employees appreciated for their contributions</div>
    </div>
  </div>

  <div id="appreciationList">
    <p class="loading">Loading…</p>
  </div>

  <div class="popup-overlay" id="popupOverlay">
    <div class="popup">
      <button class="close-btn" onclick="closePopup()">✕</button>
      <div class="popup-avatar" id="popAvatar"></div>
      <h3 id="popName"></h3>
      <div class="popup-type" id="popType"></div>
      <div class="popup-comment" id="popComment"></div>
      <div class="popup-added-by" id="popAddedBy"></div>
      <label for="wishMessage">✉️ Send a wish</label>
      <textarea id="wishMessage" placeholder="Type your congratulations here…"></textarea>
      <button class="send-btn" id="sendBtn" onclick="sendWish()">Send Wish 🎉</button>
      <div class="success" id="successMsg"></div>
    </div>
  </div>

  <script>
    var PROXY_BASE = "https://appreciation-proxy.onrender.com";
    window.onload = function() { loadData(); };

    function loadData() {
      var list = document.getElementById("appreciationList");
      list.innerHTML = "<p class='loading'>Loading…</p>";
      var xhr = new XMLHttpRequest();
      xhr.open("GET", PROXY_BASE + "/api/forms/appreciation_shoutout1/getRecords?page=1&pageSize=200", true);
      xhr.onreadystatechange = function() {
        if (xhr.readyState !== 4) return;
        try {
          var body    = JSON.parse(xhr.responseText);
          var records = (body && body.response && body.response.result) ? body.response.result : [];
          if (!records.length) {
            list.innerHTML = "<p class='empty'>No appreciations yet 🌟</p>";
            return;
          }
          renderRecords(records);
        } catch(e) {
          list.innerHTML = "<p class='error'>Error: " + e.message + "</p>";
        }
      };
      xhr.onerror = function() { list.innerHTML = "<p class='error'>Network error.</p>"; };
      xhr.send();
    }

    function getInitials(name) {
      return name.split(" ").slice(0, 2).map(function(w) { return w[0] || ""; }).join("").toUpperCase();
    }

    function renderRecords(records) {
      var list = document.getElementById("appreciationList");
      list.innerHTML = "";
      records.forEach(function(record) {
        var id      = Object.keys(record)[0];
        var f       = record[id][0];
        var name    = f.nominee_display_name || f.Nominee || "Unknown";
        var type    = f.appreciation_type    || f.Appreciation_Type || "";
        var comment = f.comment              || f.Comment || "";
        var addedBy = (f.AddedBy || "").replace(/^\d+\s*-\s*/, "").replace(/-/g, " ").trim();
        var div = document.createElement("div");
        div.className = "item";
        div.innerHTML =
          '<div class="avatar">' + getInitials(name) + '</div>' +
          '<div class="item-body">' +
            '<div class="name">' + name + '</div>' +
            (type    ? '<div class="type">'               + type    + '</div>' : '') +
            (comment ? '<div class="comment">"'           + comment + '"</div>' : '') +
            (addedBy ? '<div class="added-by">Nominated by: ' + addedBy + '</div>' : '') +
          '</div>';
        div.onclick = function() { openPopup(name, type, comment, addedBy); };
        list.appendChild(div);
      });
    }

    function openPopup(name, type, comment, addedBy) {
      document.getElementById("popAvatar").textContent  = getInitials(name);
      document.getElementById("popName").textContent    = name;
      document.getElementById("popType").textContent    = type;
      document.getElementById("popComment").textContent = comment ? '"' + comment + '"' : "";
      document.getElementById("popAddedBy").textContent = addedBy ? "Nominated by: " + addedBy : "";
      document.getElementById("wishMessage").value      = "";
      document.getElementById("successMsg").textContent = "";
      document.getElementById("sendBtn").disabled       = false;
      document.getElementById("sendBtn").textContent    = "Send Wish 🎉";
      document.getElementById("popupOverlay").classList.add("active");
    }

    function closePopup() {
      document.getElementById("popupOverlay").classList.remove("active");
    }

    function sendWish() {
      var msg = document.getElementById("wishMessage").value.trim();
      if (!msg) return;
      var btn = document.getElementById("sendBtn");
      btn.disabled = true;
      btn.textContent = "Sending…";
      setTimeout(function() {
        document.getElementById("successMsg").textContent = "🎉 Wish sent!";
        setTimeout(closePopup, 1500);
      }, 800);
    }

    document.getElementById("popupOverlay").addEventListener("click", function(e) {
      if (e.target === this) closePopup();
    });
  </script>
</body>
</html>`);
});

// ── Health check ──────────────────────────────────────
app.get("/health", async (req, res) => {
  try {
    const token = await getAccessToken();
    if (!token) throw new Error("No token returned");
    res.json({
      status:      "ok",
      zoho_token:  "valid",
      server_time: new Date().toISOString()
    });
  } catch(e) {
    res.status(500).json({
      status:      "error",
      zoho_token:  "failed",
      message:     e.message,
      server_time: new Date().toISOString()
    });
  }
});

// ── Start server ──────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log("✅ Proxy running on port " + PORT));