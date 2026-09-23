(() => {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const store = {
    get(k, f) {
      try {
        return localStorage.getItem(k) ?? f;
      } catch {
        return f;
      }
    },
    set(k, v) {
      try {
        localStorage.setItem(k, v);
      } catch {}
    },
  };
  const prefersReduced = matchMedia("(prefers-reduced-motion: reduce)");
  let motion = store.get(
    "charlie.motion",
    prefersReduced.matches ? "off" : "on",
  );
  let sound = store.get("charlie.sound", "off");
  let partyTimer = null;
  function toast(message) {
    const el = $("#toast");
    if (!el) return;
    el.textContent = message;
    clearTimeout(el._timer);
    el._timer = setTimeout(() => (el.textContent = ""), 4000);
  }
  function update() {
    document.documentElement.dataset.motion = motion;
    const m = $("[data-motion-toggle]"),
      s = $("[data-sound-toggle]");
    if (m) {
      m.textContent = "Motion: " + motion;
      m.setAttribute("aria-pressed", motion === "on");
    }
    if (s) {
      s.textContent = "Sound: " + sound;
      s.setAttribute("aria-pressed", sound === "on");
    }
  }
  function beep() {
    if (sound !== "on") return;
    try {
      const Context = window.AudioContext || window.webkitAudioContext;
      const c = new Context();
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = "sine";
      o.frequency.value = 540;
      g.gain.setValueAtTime(0.035, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.075);
      o.connect(g);
      g.connect(c.destination);
      o.start();
      o.stop(c.currentTime + 0.08);
      o.onended = () => c.close();
    } catch {}
  }
  function partyOff() {
    document.body.classList.remove("party");
    clearInterval(partyTimer);
    partyTimer = null;
    document.querySelectorAll(".party-particle").forEach((p) => p.remove());
    const p = $("[data-party]");
    if (p) p.setAttribute("aria-pressed", "false");
  }
  update();
  $("[data-motion-toggle]")?.addEventListener("click", () => {
    motion = motion === "on" ? "off" : "on";
    store.set("charlie.motion", motion);
    if (motion === "off") partyOff();
    update();
  });
  $("[data-sound-toggle]")?.addEventListener("click", () => {
    sound = sound === "on" ? "off" : "on";
    store.set("charlie.sound", sound);
    update();
    beep();
  });
  $("[data-party]")?.addEventListener("click", () => {
    if (document.body.classList.contains("party")) {
      partyOff();
      return;
    }
    if (motion === "off" || prefersReduced.matches) {
      toast("Party time! Animation is paused by your motion settings.");
      return;
    }
    document.body.classList.add("party");
    $("[data-party]").setAttribute("aria-pressed", "true");
    let count = 0;
    partyTimer = setInterval(() => {
      const p = document.createElement("span");
      p.className = "party-particle";
      p.setAttribute("aria-hidden", "true");
      p.textContent = ["✦", "★", "♥", "✧"][count++ % 4];
      p.style.setProperty("--x", Math.random() * 95 + "vw");
      p.style.color = ["#79f3db", "#ff83ce", "#ab9bff"][count % 3];
      document.body.appendChild(p);
      setTimeout(() => p.remove(), 3600);
    }, 400);
    toast("Excellent decision. Party mode is on.");
  });
  document.addEventListener("click", (e) => {
    if (
      e.target.closest("a,button") &&
      !e.target.closest("[data-sound-toggle]")
    )
      beep();
  });
  $("[data-menu]")?.addEventListener("click", () => {
    const menu = $("#navlinks");
    const open = menu.classList.toggle("is-open");
    $("[data-menu]").setAttribute("aria-expanded", open);
  });
  $("#navlinks")?.addEventListener("click", (e) => {
    if (e.target.closest("a")) {
      $("#navlinks").classList.remove("is-open");
      $("[data-menu]")?.setAttribute("aria-expanded", "false");
    }
  });
  $("[data-share]")?.addEventListener("click", async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Charlie Woodhead · Australia edition",
          url: location.href,
        });
      } else {
        await navigator.clipboard.writeText(location.href);
        toast("Link copied. Thanks for passing it on!");
      }
    } catch (e) {
      if (e.name !== "AbortError") toast("Copy the page address to share it.");
    }
  });
  function clock() {
    const el = $("[data-clock]");
    if (el)
      el.textContent =
        new Intl.DateTimeFormat("en-GB", {
          timeZone: "Australia/Melbourne",
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date()) + " MEL";
  }
  clock();
  setInterval(clock, 60000);
  const form = $("#contact-form");
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const status = $("#form-status");
    const button = form.querySelector("[type=submit]");
    button.disabled = true;
    button.textContent = "Sending…";
    status.textContent = "";
    try {
      const response = await fetch(form.action, {
        method: "POST",
        body: new FormData(form),
        headers: { Accept: "application/json" },
      });
      if (!response.ok) throw new Error("send");
      status.textContent = "Message sent. Thanks for getting in touch!";
      form.reset();
    } catch {
      status.replaceChildren(
        document.createTextNode(
          "Your message could not be sent. Please email ",
        ),
      );
      const a = document.createElement("a");
      a.href = "mailto:hirecharlienow@yahoo.com";
      a.textContent = "hirecharlienow@yahoo.com";
      status.append(
        a,
        document.createTextNode(
          " instead. Your message is still here to copy.",
        ),
      );
    } finally {
      button.disabled = false;
      button.textContent = "Send message →";
    }
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) partyOff();
  });
})();
