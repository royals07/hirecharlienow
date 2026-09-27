(() => {
  "use strict";
  const form = document.getElementById("editor-form");
  if (!form) return;
  const status = document.getElementById("editor-status");
  const submit = form.querySelector("[type=submit]");
  const restore = document.getElementById("restore-draft");
  const tapes = document.getElementById("editor-tapes");
  const API = window.CharlieContent;
  const draftKey = "charlie.editor.draft.v1";
  let published = null;
  let savedDraft = null;
  let changed = false;
  submit.disabled = true;
  const fieldNames = ["location", "next", "status", "start", "remote"];
  function field(
    label,
    name,
    value,
    { type = "text", max = 200, required = false } = {},
  ) {
    const wrap = API.element("div", "field");
    const input = document.createElement(
      name === "summary" ? "textarea" : "input",
    );
    input.id = "field-" + crypto.randomUUID();
    if (input.tagName === "INPUT") input.type = type;
    input.dataset.field = name;
    input.value = value || "";
    input.maxLength = max;
    input.required = required;
    const title = API.element("label", "", label);
    title.htmlFor = input.id;
    wrap.append(title, input);
    return wrap;
  }
  function addTape(tape) {
    const block = API.element("fieldset", "editor-tape");
    block.dataset.id = tape.id;
    block.append(API.element("legend", "", "Archive entry"));
    const grid = API.element("div", "form-grid");
    grid.append(
      field("Title", "title", tape.title, { max: 120, required: true }),
      field("Place", "location", tape.location, { max: 100, required: true }),
      field("Date", "date", tape.date, {
        type: "date",
        max: 10,
        required: true,
      }),
    );
    block.append(
      grid,
      field("Your note", "summary", tape.summary, {
        max: 1500,
        required: true,
      }),
      field("Film link (optional)", "video", tape.video, { max: 1000 }),
      field("Cover image link (optional)", "poster", tape.poster, {
        max: 1000,
      }),
    );
    const remove = API.element("button", "btn ghost", "Remove this entry");
    remove.type = "button";
    remove.addEventListener("click", () => {
      block.remove();
      saveDraft();
    });
    block.append(remove);
    tapes.append(block);
  }
  function populate(data) {
    for (const name of fieldNames)
      document.getElementById("edit-" + name).value = data.availability[name];
    tapes.replaceChildren();
    data.tapes.forEach(addTape);
    document.getElementById("editor-preview").hidden = true;
  }
  function collect() {
    const availability = { updated: new Date().toISOString().slice(0, 10) };
    for (const name of fieldNames)
      availability[name] = document.getElementById("edit-" + name).value;
    return {
      version: 1,
      availability,
      tapes: [...tapes.children].map((block) => {
        const tape = { id: block.dataset.id };
        block.querySelectorAll("[data-field]").forEach((input) => {
          tape[input.dataset.field] = input.value;
        });
        return tape;
      }),
    };
  }
  function saveDraft() {
    if (!published) return;
    changed = true;
    try {
      localStorage.setItem(draftKey, JSON.stringify(collect()));
      status.textContent =
        "Draft saved on this device. Your public site has not changed.";
    } catch {
      status.textContent =
        "This browser could not save your draft. Download the update to keep a copy.";
    }
  }
  function readDraft() {
    try {
      const data = JSON.parse(localStorage.getItem(draftKey));
      if (
        !data ||
        data.version !== 1 ||
        !data.availability ||
        !Array.isArray(data.tapes) ||
        data.tapes.length > 50
      )
        return null;
      if (
        fieldNames.some(
          (key) =>
            typeof data.availability[key] !== "string" ||
            data.availability[key].length > 300,
        )
      )
        return null;
      if (
        data.tapes.some(
          (tape) =>
            !tape ||
            typeof tape.id !== "string" ||
            !/^[a-z0-9][a-z0-9-]{0,79}$/.test(tape.id) ||
            ["title", "location", "date", "summary", "video", "poster"].some(
              (key) => typeof tape[key] !== "string" || tape[key].length > 2000,
            ),
        )
      )
        return null;
      return data;
    } catch {
      return null;
    }
  }
  window.charlieContentReady?.then((data) => {
    if (!data) {
      status.textContent =
        "Could not load the current site content. Refresh before making an update.";
      return;
    }
    published = data;
    populate(data);
    submit.disabled = false;
    status.textContent =
      "Current content loaded. Changes you make here stay in a local draft.";
    savedDraft = readDraft();
    restore.hidden = !savedDraft;
  });
  form.addEventListener("input", saveDraft);
  document.getElementById("add-tape").addEventListener("click", () => {
    if (!published) return;
    if (tapes.children.length >= 50) {
      status.textContent = "The archive can contain up to 50 entries.";
      return;
    }
    addTape({
      id: "tape-" + crypto.randomUUID(),
      date: new Date().toISOString().slice(0, 10),
    });
    saveDraft();
    tapes.lastElementChild.querySelector("input").focus();
  });
  restore.addEventListener("click", () => {
    if (!savedDraft) return;
    populate(savedDraft);
    restore.hidden = true;
    saveDraft();
  });
  document.getElementById("reset-editor").addEventListener("click", () => {
    if (
      !published ||
      (changed &&
        !window.confirm(
          "Discard these local changes and reload the last fetched site content?",
        ))
    )
      return;
    populate(published);
    changed = false;
    restore.hidden = true;
    try {
      localStorage.removeItem(draftKey);
    } catch {}
    status.textContent =
      "Reloaded the site content. Your public site has not changed.";
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!form.reportValidity() || !published) return;
    try {
      const data = API.validate(collect());
      const summary = document.getElementById("editor-summary");
      summary.replaceChildren(
        API.element(
          "p",
          "",
          data.availability.location + " · Next: " + data.availability.next,
        ),
        API.element(
          "p",
          "",
          data.availability.status + " · " + data.availability.start,
        ),
        API.element("p", "", data.availability.remote),
      );
      document
        .getElementById("editor-tape-preview")
        .replaceChildren(...data.tapes.map((tape) => API.tapeCard(tape)));
      document.getElementById("editor-preview").hidden = false;
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(data, null, 2) + "\n"], {
          type: "application/json",
        }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = "site-content.json";
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      try {
        localStorage.setItem(draftKey, JSON.stringify(data));
      } catch {}
      status.textContent =
        "Update downloaded. Open GitHub below to upload site-content.json and publish it.";
    } catch (error) {
      status.textContent = error.message;
    }
  });
})();
