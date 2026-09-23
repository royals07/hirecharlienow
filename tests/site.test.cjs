const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { JSDOM, VirtualConsole } = require("jsdom");

const root = path.resolve(__dirname, "..");
const flush = () => new Promise((resolve) => setImmediate(resolve));
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((a, b) => {
    resolve = a;
    reject = b;
  });
  return { promise, resolve, reject };
};
const snap = (key, value) => ({
  key,
  val: () => value,
  numChildren: () => Object.keys(value || {}).length,
  forEach: (fn) =>
    Object.entries(value || {}).forEach(([k, v]) => fn(snap(k, v))),
});

function mockFirebase() {
  const handlers = new Map(),
    writes = [],
    reads = [],
    removed = [],
    disconnects = [];
  const control = {
    handlers,
    writes,
    reads,
    removed,
    disconnects,
    data: {},
    push: () => Promise.resolve(),
    set: () => Promise.resolve(),
  };
  const ref = (name) => ({
    child: (key) => ref(name + "/" + key),
    orderByChild: (key) => {
      reads.push([name, "orderByChild", key]);
      return ref(name);
    },
    limitToLast: (count) => {
      reads.push([name, "limitToLast", count]);
      return ref(name);
    },
    startAt: () => ref(name),
    on: (event, fn) => {
      const key = name + ":" + event;
      handlers.set(key, [...(handlers.get(key) || []), fn]);
      return fn;
    },
    off: (event, fn) => {
      for (const [key, callbacks] of handlers)
        if (
          key.startsWith(name + ":") &&
          (!event || key === name + ":" + event)
        )
          handlers.set(key, fn ? callbacks.filter((x) => x !== fn) : []);
    },
    once: (event, fn) => {
      fn(snap(name, control.data[name] || {}));
      return Promise.resolve();
    },
    push: (data) => {
      writes.push({ op: "push", path: name, data });
      return control.push(name, data);
    },
    set: (data) => {
      writes.push({ op: "set", path: name, data });
      return control.set(name, data);
    },
    remove: () => {
      removed.push(name);
      return Promise.resolve();
    },
    onDisconnect: () => ({
      remove: () => {
        disconnects.push(name);
        return Promise.resolve();
      },
    }),
    transaction: (fn) => {
      writes.push({ op: "transaction", path: name, data: fn(0) });
      return Promise.resolve();
    },
  });
  const database = () => ({ ref });
  database.ServerValue = { TIMESTAMP: { ".sv": "timestamp" } };
  control.firebase = {
    initializeApp: (config) => {
      control.config = config;
    },
    database,
  };
  control.emit = (name, event, key, value) =>
    (handlers.get(name + ":" + event) || []).forEach((fn) =>
      fn(snap(key, value)),
    );
  return control;
}

function page(file, setup = () => {}) {
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", (e) => {
    if (e.type !== "css parsing") errors.push(e);
  });
  const dom = new JSDOM(fs.readFileSync(path.join(root, file), "utf8"), {
    url: "https://hirecharlienow.com/" + file,
    runScripts: "outside-only",
    virtualConsole,
  });
  const w = dom.window,
    timers = [];
  w.matchMedia = () => ({ matches: false, addEventListener() {} });
  w.setInterval = (fn, ms) => {
    timers.push({ fn, ms });
    return timers.length;
  };
  w.clearInterval = () => {};
  w.setTimeout = () => 0;
  w.clearTimeout = () => {};
  const context = new Proxy(
    {},
    {
      get: (obj, key) => obj[key] ?? (() => {}),
      set: (obj, key, value) => ((obj[key] = value), true),
    },
  );
  w.HTMLCanvasElement.prototype.getContext = () => context;
  w.HTMLCanvasElement.prototype.toDataURL = () => "data:image/png;base64,test";
  w.HTMLElement.prototype.scrollIntoView = () => {};
  const alerts = [];
  w.alert = (message) => alerts.push(message);
  let plays = 0;
  w.Audio = class {
    play() {
      plays++;
      return Promise.resolve();
    }
  };
  setup(w);
  const run = (source, filename = "inline.js") =>
    vm.runInContext(source, dom.getInternalVMContext(), { filename });
  for (const script of w.document.scripts) {
    const src = script.getAttribute("src");
    if (src && /^https?:/.test(src)) continue;
    run(
      src ? fs.readFileSync(path.join(root, src), "utf8") : script.textContent,
      src || file,
    );
  }
  return {
    dom,
    w,
    run,
    errors,
    timers,
    alerts,
    plays: () => plays,
    $: (selector) => w.document.querySelector(selector),
    close: () => dom.window.close(),
  };
}
const submit = (p, selector) =>
  p
    .$(selector)
    .dispatchEvent(
      new p.w.Event("submit", { bubbles: true, cancelable: true }),
    );
const key = (p, selector, value) =>
  p
    .$(selector)
    .dispatchEvent(
      new p.w.KeyboardEvent("keydown", {
        key: value,
        bubbles: true,
        cancelable: true,
      }),
    );
let passed = 0;
async function test(name, run) {
  try {
    await run();
    passed++;
    console.log("PASS " + name);
  } catch (e) {
    console.error("FAIL " + name + "\n" + e.stack);
    process.exitCode = 1;
  }
}

(async () => {
  await test("contact form keeps failed messages and posts original Formspree payload", async () => {
    const requests = [];
    let ok = false;
    const p = page("contact.html", (w) => {
      w.fetch = async (url, options) => {
        requests.push({ url, options });
        return { ok };
      };
    });
    p.$("#name").value = "Test Visitor";
    p.$("#email").value = "visitor@example.test";
    p.$("#message").value = "Draft saved for retry";
    submit(p, "#contact-form");
    await flush();
    assert.equal(requests[0].url, "https://formspree.io/f/mlgwdzlw");
    assert.equal(
      requests[0].options.body.get("message"),
      "Draft saved for retry",
    );
    assert.equal(p.$("#message").value, "Draft saved for retry");
    assert.match(p.$("#form-status").textContent, /could not be sent/);
    assert.equal(p.$("[type=submit]").disabled, false);
    ok = true;
    submit(p, "#contact-form");
    await flush();
    assert.equal(p.$("#message").value, "");
    assert.match(p.$("#form-status").textContent, /Message sent/);
    assert.deepEqual(p.errors, []);
    p.close();
  });
  await test("motion preference, quiet default, mobile navigation and sharing", async () => {
    let copied = "";
    const p = page("index.html", (w) => {
      w.matchMedia = () => ({ matches: true });
      Object.defineProperty(w.navigator, "clipboard", {
        value: {
          writeText: async (text) => {
            copied = text;
          },
        },
      });
    });
    assert.equal(p.w.document.documentElement.dataset.motion, "off");
    assert.equal(
      p.$("[data-sound-toggle]").getAttribute("aria-pressed"),
      "false",
    );
    p.$("[data-party]").click();
    assert.equal(p.w.document.body.classList.contains("party"), false);
    p.$("[data-menu]").click();
    assert.equal(p.$("[data-menu]").getAttribute("aria-expanded"), "true");
    p.$("#navlinks a").click();
    assert.equal(p.$("[data-menu]").getAttribute("aria-expanded"), "false");
    p.$("[data-share]").click();
    await flush();
    assert.match(copied, /hirecharlienow.com/);
    p.$("[data-sound-toggle]").click();
    assert.equal(p.w.localStorage.getItem("charlie.sound"), "on");
    assert.deepEqual(p.errors, []);
    p.close();
  });
  await test("chat handles unavailable SDK", async () => {
    const p = page("chat.html");
    assert.equal(p.$("#join-chat button").disabled, true);
    assert.match(p.$("#chat-status").textContent, /could not load/);
    p.close();
  });
  await test("chat keeps messages safe, preserves drafts, blocks duplicate sends and disconnects", async () => {
    const f = mockFirebase();
    const p = page("chat.html", (w) => {
      w.firebase = f.firebase;
    });
    p.$("#username-input").value = "Charlie";
    p.$("#chat-location").value = "melbourne";
    submit(p, "#join-chat");
    await flush();
    assert.equal(p.$("#chat-room").hidden, false);
    f.emit(".info/connected", "value", "connected", true);
    await flush();
    assert.match(f.writes[0].path, /^presence\/user_/);
    assert.equal(f.writes[0].data.festival, "melbourne");
    f.emit("chat", "child_added", "a", {
      username: "Charlie",
      message: "<img src=x onerror=alert(1)>",
      festival: "melbourne",
      timestamp: 1000,
    });
    f.emit("chat", "child_added", "b", {
      username: "Visitor",
      message: "Welcome",
      timestamp: 2000,
    });
    assert.equal(p.$("#chat-messages img"), null);
    assert.equal(p.$("#chat-messages strong").textContent, "Charlie");
    assert.equal(p.$("#chat-messages").textContent.includes("👑"), false);
    f.push = () => Promise.reject(new Error("offline"));
    p.$("#chat-input").value = "A trip to Melbourne";
    submit(p, "#send-chat");
    await flush();
    assert.equal(p.$("#chat-input").value, "A trip to Melbourne");
    assert.equal(p.$("#send-btn").disabled, false);
    const pending = deferred();
    f.push = () => pending.promise;
    const before = f.writes.length;
    submit(p, "#send-chat");
    submit(p, "#send-chat");
    assert.equal(f.writes.length, before + 1);
    assert.equal(p.$("#send-btn").disabled, true);
    pending.resolve();
    await flush();
    assert.equal(p.$("#chat-input").value, "");
    assert.equal(f.writes.at(-1).path, "chat");
    p.$("#leave-chat").click();
    assert.equal(p.$("#join-chat").hidden, false);
    assert.equal(f.removed.length, 1);
    assert.equal([...f.handlers.values()].flat().length, 0);
    assert.deepEqual(p.errors, []);
    p.close();
  });
  await test("chat moderation updates keep chronological message order", async () => {
    const f = mockFirebase();
    const p = page("chat.html", (w) => {
      w.firebase = f.firebase;
    });
    p.$("#username-input").value = "Visitor";
    submit(p, "#join-chat");
    f.emit("chat", "child_added", "a", {
      username: "First",
      message: "Initial",
      timestamp: 1000,
    });
    f.emit("chat", "child_added", "b", {
      username: "Next",
      message: "Later",
      timestamp: 2000,
    });
    f.emit("chat", "child_changed", "a", {
      username: "First",
      message: "Updated",
      timestamp: 1000,
    });
    assert.equal(p.$("#chat-messages").firstElementChild.id, "msg-a");
    assert.equal(p.$("#msg-a p").textContent, "Updated");
    f.emit("chat", "child_removed", "a", null);
    assert.equal(p.$("#msg-a"), null);
    p.close();
  });
  await test("game starts, keyboard prevents scrolling and audio follows settings", async () => {
    const f = mockFirebase();
    f.data.flappyCharlieScores = {
      a: {
        name: "<img src=x onerror=alert(1)>",
        score: "<svg>",
        timestamp: 1000,
      },
    };
    const p = page("flappycharlie.html", (w) => {
      w.firebase = f.firebase;
    });
    assert.equal(p.$("#alltime-leaderboard img"), null);
    assert.equal(p.$(".player-score").textContent, "0");
    assert.equal(p.$("#canvas").tabIndex, 0);
    const event = new p.w.KeyboardEvent("keydown", {
      key: " ",
      keyCode: 32,
      cancelable: true,
    });
    p.$("#canvas").dispatchEvent(event);
    assert.equal(event.defaultPrevented, true);
    assert.equal(p.plays(), 0);
    assert.equal(p.run("state.curr === state.Play"), true);
    p.run("gameLoop()");
    p.w.localStorage.setItem("charlie.sound", "on");
    p.run("bird.flap()");
    assert.equal(p.plays(), 1);
    assert.deepEqual(p.errors, []);
    p.close();
  });
  await test("score submit retains UI on failure and blocks duplicate pending writes", async () => {
    const f = mockFirebase();
    const p = page("flappycharlie.html", (w) => {
      w.firebase = f.firebase;
    });
    p.run("currentGameScore=7");
    p.$("#player-name").value = "Visitor";
    p.$("#score-submit").style.display = "block";
    f.push = () => Promise.reject(new Error("offline"));
    await p.w.submitScore();
    assert.equal(p.$("#score-submit").style.display, "block");
    assert.match(p.alerts.at(-1), /could not be submitted/);
    const pending = deferred();
    f.push = () => pending.promise;
    const before = f.writes.length;
    const first = p.w.submitScore();
    const second = p.w.submitScore();
    assert.equal(f.writes.length, before + 1);
    pending.resolve();
    await Promise.all([first, second]);
    assert.equal(p.$("#score-submit").style.display, "none");
    assert.equal(f.writes.at(-1).path, "flappyCharlieScores");
    assert.equal(f.writes.at(-1).data.score, 7);
    assert.deepEqual(p.errors, []);
    p.close();
  });
  await test("pixel canvas supports keyboard and counts only successful writes", async () => {
    const f = mockFirebase();
    const p = page("pixelart.html", (w) => {
      w.firebase = f.firebase;
    });
    await flush();
    assert.equal(
      p.w.document.querySelectorAll("#color-palette button").length,
      16,
    );
    const red = p.w.document.querySelectorAll("#color-palette button")[2];
    red.click();
    assert.equal(red.getAttribute("aria-pressed"), "true");
    key(p, "#pixel-canvas", "ArrowRight");
    key(p, "#pixel-canvas", "ArrowDown");
    f.set = (name) =>
      name.startsWith("pixelCanvas/")
        ? Promise.reject(new Error("offline"))
        : Promise.resolve();
    key(p, "#pixel-canvas", "Enter");
    await flush();
    assert.equal(p.$("#your-pixels").textContent, "0");
    assert.match(p.$("#cooldown-timer").textContent, /Could not save/);
    assert.equal(f.writes.at(-1).path, "pixelCanvas/pixels/1_1");
    assert.equal(f.writes.at(-1).data.color, "#FF0000");
    f.set = () => Promise.resolve();
    key(p, "#pixel-canvas", "Enter");
    await flush();
    assert.equal(p.$("#your-pixels").textContent, "1");
    assert.equal(p.w.localStorage.getItem("myPixelCount"), "1");
    const before = f.writes.length;
    key(p, "#pixel-canvas", "Enter");
    await flush();
    assert.equal(f.writes.length, before);
    assert.equal(f.writes.filter((x) => x.op === "transaction").length, 1);
    assert.deepEqual(p.errors, []);
    p.close();
  });
  console.log(
    `${passed}/8 integration checks passed. Network calls were mocked; no messages, pixels or scores were sent.`,
  );
})();
