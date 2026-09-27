(() => {
  "use strict";
  const text = (value, label, limit, required = true) => {
    if (
      typeof value !== "string" ||
      value.length > limit ||
      (required && !value.trim())
    ) {
      throw new Error(`Please check ${label}.`);
    }
    return value.trim();
  };
  function validDate(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
      return false;
    const date = new Date(value + "T12:00:00Z");
    return (
      Number.isFinite(date.getTime()) &&
      date.toISOString().slice(0, 10) === value
    );
  }
  function safeMedia(value, kind) {
    value = text(value, `${kind} link`, 1000, false);
    if (!value) return "";
    if (
      /^assets\/[a-zA-Z0-9_./-]+$/.test(value) &&
      !value.split("/").includes("..")
    ) {
      const allowed =
        kind === "film" ? /\.(mp4|webm)$/i : /\.(jpg|jpeg|png|webp)$/i;
      if (allowed.test(value)) return value;
    }
    let url;
    try {
      url = new URL(value);
    } catch {
      throw new Error(`Use a full HTTPS ${kind} link.`);
    }
    if (url.protocol !== "https:" || url.username || url.password)
      throw new Error(`Use a full HTTPS ${kind} link.`);
    if (kind === "film" && !mediaDetails(url.href))
      throw new Error("Use a direct MP4/WebM, YouTube or Vimeo film link.");
    return url.href;
  }
  function mediaDetails(value) {
    let url;
    try {
      url = new URL(value, "https://hirecharlienow.com/");
    } catch {
      return null;
    }
    if (url.protocol !== "https:") return null;
    if (/\.(mp4|webm)$/i.test(url.pathname))
      return { type: "video", src: value };
    const host = url.hostname.toLowerCase();
    let id;
    if (["youtube.com", "www.youtube.com", "m.youtube.com"].includes(host)) {
      id =
        url.searchParams.get("v") ||
        url.pathname.match(/^\/(?:shorts|embed)\/([\w-]+)/)?.[1];
    } else if (host === "youtu.be") id = url.pathname.slice(1);
    if (id && /^[\w-]{11}$/.test(id))
      return {
        type: "embed",
        src: "https://www.youtube-nocookie.com/embed/" + id,
      };
    if (["vimeo.com", "www.vimeo.com", "player.vimeo.com"].includes(host)) {
      id = url.pathname.match(/(?:^|\/)(\d+)$/)?.[1];
      if (id)
        return { type: "embed", src: "https://player.vimeo.com/video/" + id };
    }
    return null;
  }
  function validate(data) {
    if (
      !data ||
      data.version !== 1 ||
      !data.availability ||
      !Array.isArray(data.tapes) ||
      data.tapes.length > 50
    ) {
      throw new Error(
        "This update needs availability details and no more than 50 archive entries.",
      );
    }
    const availability = {};
    for (const [key, limit] of Object.entries({
      location: 100,
      next: 100,
      status: 100,
      start: 160,
      remote: 220,
    })) {
      availability[key] = text(data.availability[key], key, limit);
    }
    if (!validDate(data.availability.updated))
      throw new Error("Check the availability update date.");
    availability.updated = data.availability.updated;
    const ids = new Set();
    const tapes = data.tapes.map((tape) => {
      if (
        !tape ||
        typeof tape.id !== "string" ||
        !/^[a-z0-9][a-z0-9-]{0,79}$/.test(tape.id) ||
        ids.has(tape.id)
      )
        throw new Error("Each archive entry needs a unique ID.");
      ids.add(tape.id);
      if (!validDate(tape.date))
        throw new Error("Check the date on each archive entry.");
      return {
        id: tape.id,
        title: text(tape.title, "entry title", 120),
        date: tape.date,
        location: text(tape.location, "entry location", 100),
        summary: text(tape.summary, "entry note", 1500),
        video: safeMedia(tape.video || "", "film"),
        poster: safeMedia(tape.poster || "", "image"),
      };
    });
    return { version: 1, availability, tapes };
  }
  function dateLabel(value) {
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(value + "T12:00:00Z"));
  }
  function element(tag, className, value) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (value !== undefined) node.textContent = value;
    return node;
  }
  function cassette(title) {
    const cover = element("div", "cassette-cover");
    cover.setAttribute("aria-hidden", "true");
    cover.append(
      element("span", "cassette-label", "CHARLIE’S TAPE ARCHIVE"),
      element("div", "cassette-reels", "◉ ━━━ ◉"),
      element("span", "cassette-hand", title),
    );
    return cover;
  }
  function tapeCard(tape, { compact = false } = {}) {
    const article = element("article", "tape-card window");
    article.id = "tape-" + tape.id;
    article.append(
      element(
        "div",
        "titlebar",
        (tape.video ? "PLAY / " : "FIELD NOTE / ") + tape.date,
      ),
    );
    if (compact) {
      const cover = element("a", "tape-cover-link");
      cover.href = "archive.html#tape-" + tape.id;
      if (tape.poster) {
        const image = element("img", "tape-poster");
        image.src = tape.poster;
        image.alt = tape.title;
        image.loading = "lazy";
        cover.append(image);
      } else cover.append(cassette(tape.title));
      article.append(cover);
    } else if (tape.video) {
      const media = mediaDetails(tape.video);
      if (media?.type === "video") {
        const video = element("video", "tape-player");
        video.controls = true;
        video.preload = "none";
        video.playsInline = true;
        video.src = media.src;
        video.setAttribute("aria-label", tape.title);
        if (tape.poster) video.poster = tape.poster;
        const fallback = element("a", "", "Open the film");
        fallback.href = media.src;
        video.append(fallback);
        article.append(video);
      } else if (media?.type === "embed") {
        const frame = element("div", "tape-embed");
        const button = element("button", "embed-load", "▶ Load film");
        button.type = "button";
        button.addEventListener("click", () => {
          const iframe = element("iframe", "");
          iframe.title = tape.title;
          iframe.src = media.src;
          iframe.allow = "fullscreen; picture-in-picture";
          iframe.allowFullscreen = true;
          iframe.referrerPolicy = "strict-origin-when-cross-origin";
          frame.replaceChildren(iframe);
        });
        frame.append(button);
        article.append(frame);
      }
    } else if (tape.poster) {
      const image = element("img", "tape-poster");
      image.src = tape.poster;
      image.alt = tape.title;
      image.loading = "lazy";
      article.append(image);
    } else article.append(cassette(tape.title));
    const copy = element("div", "tape-copy");
    copy.append(
      element("p", "eyebrow", tape.location),
      element("h3", "", tape.title),
    );
    const time = element("time", "tape-date", dateLabel(tape.date));
    time.dateTime = tape.date;
    copy.append(time, element("p", "tape-note", tape.summary));
    if (compact) {
      const link = element("a", "section-link", "Open the archive ↗");
      link.href = "archive.html#tape-" + tape.id;
      copy.append(link);
    }
    article.append(copy);
    return article;
  }
  window.CharlieContent = {
    validate,
    safeMedia,
    mediaDetails,
    dateLabel,
    tapeCard,
    element,
  };
  const topic = document.getElementById("enquiry-topic");
  const requested = new URLSearchParams(location.search).get("topic");
  if (topic && [...topic.options].some((option) => option.value === requested))
    topic.value = requested;
  const targets = document.querySelectorAll(
    "[data-availability], [data-tape-list], [data-latest-tape], #editor-form",
  );
  if (!targets.length) return;
  window.charlieContentReady = Promise.resolve()
    .then(() => fetch("data/site-content.json", { cache: "no-cache" }))
    .then((response) => {
      if (!response.ok)
        throw new Error("The latest site update could not be loaded.");
      return response.json();
    })
    .then(validate)
    .then((data) => {
      document.querySelectorAll("[data-availability]").forEach((node) => {
        const key = node.dataset.availability;
        if (key === "updated") {
          node.textContent = dateLabel(data.availability.updated);
          node.dateTime = data.availability.updated;
        } else if (Object.hasOwn(data.availability, key))
          node.textContent = data.availability[key];
      });
      const tapes = [...data.tapes].sort((a, b) =>
        b.date.localeCompare(a.date),
      );
      const archive = document.querySelector("[data-tape-list]");
      function render(filter = "all") {
        if (!archive) return;
        const visible = tapes.filter(
          (tape) =>
            filter === "all" ||
            (filter === "film" ? !!tape.video : !tape.video),
        );
        archive.replaceChildren(...visible.map((tape) => tapeCard(tape)));
        if (!visible.length)
          archive.append(
            element(
              "p",
              "empty-state",
              filter === "film"
                ? "The first film is still to come. Explore the field notes in the meantime."
                : "No entries here yet. The next chapter is on its way.",
            ),
          );
        document
          .querySelectorAll("[data-tape-filter]")
          .forEach((button) =>
            button.setAttribute(
              "aria-pressed",
              String(button.dataset.tapeFilter === filter),
            ),
          );
      }
      render();
      document
        .querySelectorAll("[data-tape-filter]")
        .forEach((button) =>
          button.addEventListener("click", () =>
            render(button.dataset.tapeFilter),
          ),
        );
      const latest = document.querySelector("[data-latest-tape]");
      if (latest && tapes[0])
        latest.replaceChildren(tapeCard(tapes[0], { compact: true }));
      if (archive && location.hash.startsWith("#tape-"))
        document
          .getElementById(location.hash.slice(1))
          ?.scrollIntoView({ block: "start" });
      return data;
    })
    .catch((error) => {
      const archive = document.querySelector("[data-tape-list]");
      if (archive)
        archive.replaceChildren(
          element(
            "p",
            "empty-state",
            "The archive could not load. Please refresh to try again.",
          ),
        );
      const status = document.getElementById("editor-status");
      if (status) status.textContent = error.message;
      return null;
    });
})();
