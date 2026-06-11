var PROXY_BASE = "https://appreciation-proxy.onrender.com";

// ── Boot ──────────────────────────────────────────────
try {
  ZOHO.embeddedApp.on("PageLoad", function() { loadData(); });
  ZOHO.embeddedApp.init();
} catch(e) {
  loadData();
}

// Fallback if SDK doesn't fire within 3s
setTimeout(function() {
  var list = document.getElementById("appreciationList");
  if (list && list.innerHTML.indexOf("Loading") !== -1) loadData();
}, 3000);

// ── Load data from proxy ──────────────────────────────
function loadData() {
  var list = document.getElementById("appreciationList");
  list.innerHTML = "<p class='loading'>Loading…</p>";

  var xhr = new XMLHttpRequest();
  xhr.open("GET", PROXY_BASE + "/api/forms/appreciation_shoutout1/getRecords?page=1&pageSize=200", true);
  xhr.onreadystatechange = function() {
    if (xhr.readyState !== 4) return;
    try {
      var body    = JSON.parse(xhr.responseText);
      var records = (body && body.response && body.response.result)
        ? body.response.result : [];
      if (!records.length) {
        list.innerHTML = "<p class='empty'>No appreciations yet 🌟</p>";
        return;
      }
      renderRecords(records);
    } catch(e) {
      list.innerHTML = "<p class='error'>Error loading data: " + e.message + "</p>";
    }
  };
  xhr.onerror = function() {
    list.innerHTML = "<p class='error'>Network error. Please try again.</p>";
  };
  xhr.send();
}

// ── Render list ───────────────────────────────────────
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

// ── Popup ─────────────────────────────────────────────
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
  btn.disabled    = true;
  btn.textContent = "Sending…";
  setTimeout(function() {
    document.getElementById("successMsg").textContent = "🎉 Wish sent!";
    setTimeout(closePopup, 1500);
  }, 800);
}

// Close popup on overlay click
document.getElementById("popupOverlay").addEventListener("click", function(e) {
  if (e.target === this) closePopup();
});