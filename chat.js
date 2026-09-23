(() => {
  "use strict";
  const status = document.getElementById("chat-status");
  if (typeof firebase === "undefined") {
    status.textContent =
      "The chat service could not load. Please try again later or use the contact page.";
    document.querySelector("#join-chat button").disabled = true;
    return;
  }
  const firebaseConfig = {
    apiKey: "AIzaSyAVLUuQhdJ8Co80X4k8YylvrzRAM1bPTXs",
    authDomain: "charlie-guestbook.firebaseapp.com",
    databaseURL:
      "https://charlie-guestbook-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "charlie-guestbook",
    storageBucket: "charlie-guestbook.firebasestorage.app",
    messagingSenderId: "40421298596",
    appId: "1:40421298596:web:0426fdef8f4f3b1c1b3131",
  };

  const badWords = [
    "fuck",
    "shit",
    "ass",
    "bitch",
    "damn",
    "hell",
    "crap",
    "piss",
    "dick",
    "cock",
    "bastard",
    "whore",
    "slut",
    "fag",
    "cunt",
    "asshole",
    "pussy",
    "nigger",
    "nigga",
    "retard",
    "wanker",
    "bollocks",
  ];

  function filterProfanity(text) {
    let filtered = text;
    badWords.forEach((word) => {
      const regex = new RegExp(word, "gi");
      filtered = filtered.replace(regex, "*".repeat(word.length));
    });
    return filtered;
  }

  function containsProfanity(text) {
    const lowerText = text.toLowerCase();
    return badWords.some((word) => lowerText.includes(word));
  }

  firebase.initializeApp(firebaseConfig);
  const database = firebase.database();
  const chatRef = database.ref("chat");
  const presenceRef = database.ref("presence");
  const messageQuery = chatRef.orderByChild("timestamp").limitToLast(50);
  const log = document.getElementById("chat-messages");
  const room = document.getElementById("chat-room");
  const join = document.getElementById("join-chat");
  let user = null,
    lastSent = 0,
    presence = null,
    connectionListener = null,
    sending = false;
  const locationLabels = {
    melbourne: "Melbourne",
    "east-coast": "East coast",
    australia: "Australia",
    visitor: "Visiting",
  };
  function showMessage(snapshot) {
    const data = snapshot.val();
    if (!data || typeof data.message !== "string") return;
    const old = document.getElementById("msg-" + snapshot.key);
    const el = document.createElement("article");
    el.id = "msg-" + snapshot.key;
    el.className = "lounge-message";
    if (data.type === "system") {
      el.classList.add("system-message");
      el.textContent = data.message.slice(0, 350);
    } else {
      const meta = document.createElement("div");
      meta.className = "lounge-meta";
      const name = document.createElement("strong");
      name.textContent = String(data.username || "Visitor").slice(0, 40);
      meta.append(name);
      const place = locationLabels[data.festival];
      if (place) {
        const badge = document.createElement("span");
        badge.textContent = place;
        meta.append(badge);
      }
      const time = document.createElement("time");
      const date = new Date(data.timestamp);
      if (Number.isFinite(date.getTime())) {
        time.dateTime = date.toISOString();
        time.textContent = date.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
      }
      meta.append(time);
      const text = document.createElement("p");
      text.textContent = data.message.slice(0, 1000);
      el.append(meta, text);
    }
    if (old) old.replaceWith(el);
    else log.append(el);
    while (log.children.length > 50) log.firstElementChild.remove();
    log.scrollTop = log.scrollHeight;
  }
  function error() {
    status.textContent =
      "The chat connection is unavailable. Please try again, or contact Charlie directly.";
  }
  join.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("username-input").value.trim();
    if (name.length < 2 || name.length > 20) {
      status.textContent = "Please choose a name with 2–20 characters.";
      return;
    }
    if (containsProfanity(name)) {
      status.textContent = "Please choose a friendly display name.";
      return;
    }
    user = {
      id: "user_" + crypto.randomUUID(),
      name,
      location: document.getElementById("chat-location").value,
    };
    status.textContent = "";
    join.hidden = true;
    room.hidden = false;
    log.replaceChildren();
    presence = presenceRef.child(user.id);
    connectionListener = database
      .ref(".info/connected")
      .on("value", async (snap) => {
        if (!user) return;
        document.getElementById("online-count").textContent = snap.val()
          ? "Connected"
          : "Reconnecting…";
        if (snap.val()) {
          try {
            await presence.onDisconnect().remove();
            await presence.set({
              username: user.name,
              festival: user.location,
              online: true,
              lastSeen: firebase.database.ServerValue.TIMESTAMP,
            });
          } catch {
            error();
          }
        }
      });
    messageQuery.on("child_added", showMessage, error);
    messageQuery.on("child_changed", showMessage, error);
    messageQuery.on("child_removed", (s) =>
      document.getElementById("msg-" + s.key)?.remove(),
    );
    presenceRef.on(
      "value",
      (s) => {
        document.getElementById("online-count").textContent =
          s.numChildren() + " visitors connected";
      },
      error,
    );
    document.getElementById("chat-input").focus();
  });
  document.getElementById("send-chat").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!user || sending) return;
    const input = document.getElementById("chat-input");
    const message = input.value.trim();
    if (!message || message.length > 200) return;
    if (containsProfanity(message)) {
      status.textContent = "Please keep the message friendly.";
      return;
    }
    if (Date.now() - lastSent < 2000) {
      status.textContent = "Give it a moment before sending another message.";
      return;
    }
    const button = document.getElementById("send-btn");
    sending = true;
    button.disabled = true;
    status.textContent = "";
    try {
      await chatRef.push({
        username: user.name,
        userId: user.id,
        festival: user.location,
        message,
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        type: "user",
      });
      input.value = "";
      lastSent = Date.now();
    } catch {
      error();
    } finally {
      sending = false;
      button.disabled = false;
      input.focus();
    }
  });
  document.getElementById("leave-chat").addEventListener("click", () => {
    presence?.remove().catch(() => {});
    user = null;
    messageQuery.off();
    presenceRef.off();
    if (connectionListener)
      database.ref(".info/connected").off("value", connectionListener);
    room.hidden = true;
    join.hidden = false;
    status.textContent = "";
    document.getElementById("username-input").focus();
  });
})();
