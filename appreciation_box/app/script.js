const CONFIG = {
  clientId:     "1000.925ZKPS06JYGPCIRXQFC4P46G4X4QI",
  clientSecret: "e1fa207f65225c7b070f96c09dbeed6538a820a6d8",
  refreshToken: "1000.19a9e43e4173a62cfe9b52766aa65621.ef343278b838cbd2ff67c5e8083bc245",
  accountsUrl:  "http://localhost:3001/token",
  apiBase:      "http://localhost:3001/api",
  formLinkName: "appreciation_shoutout1",
};

let _accessToken = null;
let _expiresAt   = 0;

async function getToken() {
  const now = Date.now();
  if (_accessToken && now < _expiresAt - 60000) return _accessToken;

  const res = await fetch(CONFIG.accountsUrl, {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id:     CONFIG.clientId,
      client_secret: CONFIG.clientSecret,
      refresh_token: CONFIG.refreshToken,
      grant_type:    "refresh_token",
    }),
  });

  const data = await res.json();
  if (data.error) throw new Error("OAuth error: " + data.error);

  _accessToken = data.access_token;
  _expiresAt   = now + (data.expires_in ?? 3600) * 1000;
  console.log("[Token] New access token acquired.");
  return _accessToken;
}

async function zohoRequest(endpoint) {
  const token = await getToken();
  const res   = await fetch(CONFIG.apiBase + endpoint, {
    headers: {
      "Authorization": "Zoho-oauthtoken " + token,
      "Content-Type":  "application/json",
    },
  });
  if (!res.ok) throw new Error("Zoho API error " + res.status);
  return res.json();
}

async function getAllAppreciations() {
  const data = await zohoRequest("/forms/" + CONFIG.formLinkName + "/getRecords?page=1&pageSize=200");
  return data?.response?.result ?? [];
}

async function loadAppreciations() {
  const list = document.getElementById("appreciationList");

  try {
    const records = await getAllAppreciations();

    if (!records.length) {
      list.innerHTML = "<p>No appreciations found.</p>";
      return;
    }

    list.innerHTML = records.map(record => {
      const recordId = Object.keys(record)[0];
      const fields   = record[recordId][0];

      const name    = fields.nominee_display_name || fields.nominee_name || "Unknown";
      const type    = fields.appreciation_type    || "";
      const comment = fields.comment              || "";
      const addedBy = (fields.AddedBy || "").replace(/^\d+\s*-\s*/, "").replace(/-/g, " ").trim();

      return `
        <div class="item" onclick="openWishBox('${name}', '${type}', '${comment}', '${addedBy}')">
          <div class="name">${name}</div>
          <div class="type">${type}</div>
          <div class="comment">${comment}</div>
          <div class="added-by">Nominated by: ${addedBy}</div>
        </div>
      `;
    }).join("");

  } catch (e) {
    list.innerHTML = `<p style="color:red">Error: ${e.message}</p>`;
    console.error(e);
  }
}

function openWishBox(name, type, comment, addedBy) {
  document.getElementById("popupName").textContent      = name;
  document.getElementById("popupType").textContent      = type;
  document.getElementById("popupComment").textContent   = comment;
  document.getElementById("popupAddedBy").textContent   = addedBy ? "Nominated by: " + addedBy : "";
  document.getElementById("wishMessage").value          = "";
  document.getElementById("successMessage").textContent = "";
  document.getElementById("popupOverlay").style.display = "flex";
}

function closeWishBox() {
  document.getElementById("popupOverlay").style.display = "none";
}

function sendWish() {
  const msg = document.getElementById("wishMessage").value.trim();
  if (!msg) return;
  document.getElementById("successMessage").textContent = "Wish sent!";
  setTimeout(closeWishBox, 1500);
}

loadAppreciations();