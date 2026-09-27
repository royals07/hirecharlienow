(() => {
  "use strict";
  const form = document.getElementById("postcard-form");
  const status = document.getElementById("postcard-status");
  const loadStatus = document.getElementById("postcard-load-status");
  const button = form.querySelector("[type=submit]");
  if (typeof firebase === "undefined") {
    loadStatus.textContent =
      "The postbag could not connect. Please try again later.";
    status.textContent =
      "Postcards are temporarily unavailable. You can still use the contact page.";
    button.disabled = true;
    return;
  }
  firebase.initializeApp({
    apiKey: "AIzaSyAVLUuQhdJ8Co80X4k8YylvrzRAM1bPTXs",
    authDomain: "charlie-guestbook.firebaseapp.com",
    databaseURL:
      "https://charlie-guestbook-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "charlie-guestbook",
    storageBucket: "charlie-guestbook.firebasestorage.app",
    messagingSenderId: "40421298596",
    appId: "1:40421298596:web:0426fdef8f4f3b1c1b3131",
  });
  const ref = firebase.database().ref("guestbook");
  const query = ref.orderByChild("timestamp").limitToLast(50);
  const list = document.getElementById("postcard-list");
  const locations = {
    melbourne: "Melbourne",
    "east-coast": "East coast",
    australia: "Australia",
    devon: "Devon / UK",
    online: "Somewhere online",
    other: "Somewhere else",
    latitude: "Latitude · earlier chapter",
    leeds: "Leeds · earlier chapter",
    boomtown: "Boomtown · earlier chapter",
    qr: "Via a QR code",
  };
  const kinds = {
    hello: "",
    coffee: "[Café tip] ",
    music: "[Music tip] ",
    place: "[Place tip] ",
  };
  let posting = false;
  let lastPost = 0;
  try {
    lastPost = Number(localStorage.getItem("lastGuestbookPost")) || 0;
  } catch {}
  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    node.className = className;
    node.textContent = text;
    return node;
  };
  function render(snapshot) {
    const messages = [];
    snapshot.forEach((child) => {
      const data = child.val();
      if (
        data &&
        typeof data.message === "string" &&
        typeof data.name === "string"
      )
        messages.push({ key: child.key, ...data });
    });
    messages.sort(
      (a, b) => (Number(b.timestamp) || 0) - (Number(a.timestamp) || 0),
    );
    list.replaceChildren();
    messages.forEach((data) => {
      const card = el("article", "visitor-postcard", "");
      const top = el("div", "postcard-meta", "");
      top.append(
        el("span", "", locations[data.location] || "A visiting friend"),
        el("span", "postcard-star", "✦"),
      );
      card.append(
        top,
        el("p", "postcard-text", data.message.slice(0, 500)),
        el("strong", "postcard-signature", data.name.slice(0, 40)),
      );
      const date = new Date(data.timestamp);
      if (Number.isFinite(date.getTime())) {
        const time = el(
          "time",
          "",
          date.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          }),
        );
        time.dateTime = date.toISOString();
        card.append(time);
      }
      list.append(card);
    });
    loadStatus.textContent = messages.length
      ? "Latest visitor postcards"
      : "The postbag is empty. Leave the first postcard.";
  }
  function loadError() {
    loadStatus.textContent =
      "The postbag could not load. Use Refresh to try again.";
  }
  query.on("value", render, loadError);
  document.getElementById("refresh-postcards").addEventListener("click", () => {
    loadStatus.textContent = "Opening the postbag…";
    query.once("value", render, loadError);
  });
  const message = document.getElementById("postcard-message");
  message.addEventListener("input", () => {
    document.getElementById("postcard-count").textContent = String(
      message.value.length,
    );
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (posting) return;
    if (!form.reportValidity()) return;
    if (document.getElementById("postcard-website").value) {
      status.textContent = "Please leave the website field blank.";
      return;
    }
    const name = document.getElementById("postcard-name").value.trim();
    const value = message.value.trim();
    if (
      name.length < 2 ||
      name.length > 30 ||
      value.length < 3 ||
      value.length > 180
    ) {
      status.textContent = "Please check your name and postcard.";
      return;
    }
    if (Date.now() - lastPost < 30000) {
      status.textContent =
        "Give it half a minute before posting another postcard.";
      return;
    }
    const place = document.getElementById("postcard-location").value;
    const kind = document.getElementById("postcard-kind").value;
    if (!Object.hasOwn(locations, place) || !Object.hasOwn(kinds, kind)) return;
    posting = true;
    button.disabled = true;
    status.textContent = "Posting your postcard…";
    try {
      await ref.push({
        name,
        message: kinds[kind] + value,
        location: place,
        timestamp: Date.now(),
        visitorNumber: 0,
        emoji: "✦",
      });
      lastPost = Date.now();
      try {
        localStorage.setItem("lastGuestbookPost", String(lastPost));
      } catch {}
      form.reset();
      document.getElementById("postcard-count").textContent = "0";
      status.textContent =
        "Your postcard is posted. Thanks for leaving a little local knowledge!";
    } catch {
      status.textContent =
        "Your postcard could not be posted. It’s still here so you can try again.";
    } finally {
      posting = false;
      button.disabled = false;
    }
  });
})();
