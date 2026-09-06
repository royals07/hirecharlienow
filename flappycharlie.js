const RAD = Math.PI / 180;
const scrn = document.getElementById("canvas");
const sctx = scrn.getContext("2d");
scrn.tabIndex = 1;

function isScoreSubmitOpen() {
  const box = document.getElementById('score-submit');
  return box && box.style.display === 'block';
}

scrn.addEventListener("click", () => {
  switch (state.curr) {
    case state.getReady:
      state.curr = state.Play;
      SFX.start.play();
      break;
    case state.Play:
      bird.flap();
      break;
    case state.gameOver:
      if (isScoreSubmitOpen()) return; // don't reset while the score box is open
      state.curr = state.getReady;
      bird.speed = 0;
      bird.y = 100;
      pipe.pipes = [];
      pipe.gap = DIFFICULTY.baseGap;
      pipe.lastSpawn = frames;
      dx = DIFFICULTY.baseDx;
      lastSpeedFlashMilestone = 0;
      pipesSpawned = 0;
      gauntletPipesLeft = 0;
      currentStageIndex = 0;
      scrn.style.filter = "none";
      enemyState.active = false;
      enemyState.lastSpawnFrame = frames;
      UI.score.curr = 0;
      SFX.played = false;
      break;
  }
});

scrn.onkeydown = function keyDown(e) {
  if (e.keyCode == 32 || e.keyCode == 87 || e.keyCode == 38) {
    // Space Key or W key or arrow up
    switch (state.curr) {
      case state.getReady:
        state.curr = state.Play;
        SFX.start.play();
        break;
      case state.Play:
        bird.flap();
        break;
      case state.gameOver:
        if (isScoreSubmitOpen()) return; // don't reset while the score box is open
        state.curr = state.getReady;
        bird.speed = 0;
        bird.y = 100;
        pipe.pipes = [];
        pipe.gap = DIFFICULTY.baseGap;
        pipe.lastSpawn = frames;
        dx = DIFFICULTY.baseDx;
        lastSpeedFlashMilestone = 0;
        pipesSpawned = 0;
        gauntletPipesLeft = 0;
        currentStageIndex = 0;
        scrn.style.filter = "none";
        enemyState.active = false;
        enemyState.lastSpawnFrame = frames;
        UI.score.curr = 0;
        SFX.played = false;
        break;
    }
  }
};

let frames = 0;
let dx = 2;

// --- Visual milestone stages -----------------------------------------
// Since the background/pipes are sprite images, we shift the whole
// canvas's look with a CSS filter rather than swapping art assets.
const STAGES = [
  { min: 0, name: "Day", filter: "none" },
  { min: 10, name: "Sunset", filter: "hue-rotate(-20deg) saturate(1.4) brightness(0.95)" },
  { min: 25, name: "Dusk", filter: "hue-rotate(-60deg) saturate(1.3) brightness(0.8)" },
  { min: 50, name: "Night", filter: "hue-rotate(180deg) saturate(1.5) brightness(0.55) contrast(1.2)" },
  { min: 100, name: "Neon Night", filter: "hue-rotate(260deg) saturate(2) brightness(0.6) contrast(1.4)" },
];

let currentStageIndex = 0;
const milestoneFlash = { text: "", frames: 0 };

function getStageIndex(score) {
  let idx = 0;
  for (let i = 0; i < STAGES.length; i++) {
    if (score >= STAGES[i].min) idx = i;
  }
  return idx;
}

function updateStage() {
  const newIndex = getStageIndex(UI.score.curr);
  if (newIndex !== currentStageIndex) {
    currentStageIndex = newIndex;
    scrn.style.filter = STAGES[currentStageIndex].filter;
    if (newIndex > 0) {
      milestoneFlash.text = STAGES[currentStageIndex].name.toUpperCase();
      milestoneFlash.frames = 90;
    }
  }
}

function drawMilestoneFlash() {
  if (milestoneFlash.frames <= 0) return;
  sctx.save();
  sctx.globalAlpha = Math.min(1, milestoneFlash.frames / 30);
  sctx.fillStyle = "#ffffff";
  sctx.strokeStyle = "#000000";
  sctx.lineWidth = 3;
  sctx.font = "28px Squada One";
  sctx.textAlign = "center";
  sctx.fillText(milestoneFlash.text, scrn.width / 2, 80);
  sctx.strokeText(milestoneFlash.text, scrn.width / 2, 80);
  sctx.restore();
  milestoneFlash.frames--;
}

// --- Difficulty ramp ---------------------------------------------------
// Every DIFFICULTY.step points, speed ticks up and the gap narrows,
// both capped so it never becomes unfair/impossible.
const DIFFICULTY = {
  step: 10,
  baseDx: 2,
  maxDx: 4.5,
  dxStepPer10: 0.25,
  baseGap: 85,
  minGap: 55,
  gapStepPer10: 3,
};

const SPEEDUP_INTERVAL = 10; // flash "SPEED UP!" every 10 points
let lastSpeedFlashMilestone = 0;

function updateDifficulty() {
  const score = UI.score.curr;
  const steps = Math.floor(score / DIFFICULTY.step);
  dx = Math.min(DIFFICULTY.baseDx + steps * DIFFICULTY.dxStepPer10, DIFFICULTY.maxDx);
  pipe.gap = Math.max(DIFFICULTY.baseGap - steps * DIFFICULTY.gapStepPer10, DIFFICULTY.minGap);

  const speedMilestone = Math.floor(score / SPEEDUP_INTERVAL) * SPEEDUP_INTERVAL;
  if (speedMilestone > 0 && speedMilestone !== lastSpeedFlashMilestone) {
    lastSpeedFlashMilestone = speedMilestone;
    milestoneFlash.text = "SPEED UP!";
    milestoneFlash.frames = 70;
  }
}

// --- Obstacle variety ---------------------------------------------------
const MOVING_PIPE_SCORE = 8;  // pipes start drifting up/down past this score
const GAUNTLET_SCORE = 15;    // tight-gap pipe clusters start past this score
const ENEMY_SCORE = 25;       // swooping enemy starts appearing past this score

let pipesSpawned = 0;
let pipesUntilGauntlet = 8;
let gauntletPipesLeft = 0;

const enemyState = {
  active: false,
  x: 0,
  y: 0,
  vx: 0,
  baseY: 0,
  amplitude: 0,
  angle: 0,
  lastSpawnFrame: 0,
  cooldown: 300, // ~6s between swoops at 50fps
};

function updateEnemy() {
  if (state.curr != state.Play) return;
  const score = UI.score.curr;

  if (!enemyState.active) {
    if (score >= ENEMY_SCORE && frames - enemyState.lastSpawnFrame >= enemyState.cooldown) {
      enemyState.active = true;
      enemyState.x = parseFloat(scrn.width) + 20;
      enemyState.baseY = 40 + Math.random() * (scrn.height - 140);
      enemyState.amplitude = 20 + Math.random() * 20;
      enemyState.angle = 0;
      enemyState.vx = dx * 1.8;
    }
    return;
  }

  enemyState.angle += 0.1;
  enemyState.x -= enemyState.vx;
  enemyState.y = enemyState.baseY + Math.sin(enemyState.angle) * enemyState.amplitude;

  const bw = bird.animations[0].sprite;
  const br = parseFloat(bw.width) / 4 + parseFloat(bw.height) / 4;
  const ddx = bird.x - enemyState.x;
  const ddy = bird.y - enemyState.y;
  if (Math.sqrt(ddx * ddx + ddy * ddy) < br + 12) {
    SFX.hit.play();
    state.curr = state.gameOver;
  }

  if (enemyState.x < -30) {
    enemyState.active = false;
    enemyState.lastSpawnFrame = frames;
  }
}

function drawEnemy() {
  if (!enemyState.active) return;
  sctx.save();
  sctx.translate(enemyState.x, enemyState.y);
  const wingFlap = Math.sin(enemyState.angle * 3) * 8;
  sctx.strokeStyle = "#ff3355";
  sctx.lineWidth = 3;
  sctx.beginPath();
  sctx.moveTo(-6, 0);
  sctx.lineTo(-16, -wingFlap);
  sctx.moveTo(6, 0);
  sctx.lineTo(16, -wingFlap);
  sctx.stroke();
  sctx.fillStyle = "#ff3355";
  sctx.beginPath();
  sctx.ellipse(0, 0, 10, 7, 0, 0, Math.PI * 2);
  sctx.fill();
  sctx.fillStyle = "#ffffff";
  sctx.beginPath();
  sctx.arc(5, -2, 2, 0, Math.PI * 2);
  sctx.fill();
  sctx.restore();
}

// --- Meta progression: unlockable bird skins ----------------------------
// Skins are recolors applied via a canvas filter at draw time, plus small
// procedural accessories drawn on top. Neither touches sprite dimensions,
// so the collision box is unaffected by any skin. Unlocked purely by
// comparing against the best score already saved in localStorage.
const BIRD_SKINS = [
  { id: "classic", name: "Classic", unlockScore: 0, filter: "none", swatch: "#f5d90a" },
  { id: "golden", name: "Golden Charlie", unlockScore: 10, filter: "hue-rotate(25deg) saturate(1.8) brightness(1.15)", swatch: "#ffd700", accessory: "crown" },
  { id: "cool", name: "Cool Charlie", unlockScore: 25, filter: "none", swatch: "#1e90ff", accessory: "sunglasses" },
  { id: "evil", name: "Evil Charlie", unlockScore: 50, filter: "grayscale(1) brightness(0.55)", swatch: "#555555", accessory: "evil-eyes" },
  {
    id: "neon",
    name: "Neon Charlie",
    unlockScore: 100,
    swatch: "#00ffff",
    getFilter: (f) => `hue-rotate(${(f * 6) % 360}deg) saturate(3) brightness(1.3)`,
  },
];

// Small procedural accessories drawn on top of the sprite - purely visual,
// drawn in the bird's already-rotated local space. Never touch sprite
// dimensions, so they never affect the collision box.
function drawCrown(w, h) {
  const baseY = -h / 2 + 3;
  const cw = w * 0.7;
  const ch = 7;
  sctx.save();
  sctx.fillStyle = "#ffd700";
  sctx.strokeStyle = "#8a6d00";
  sctx.lineWidth = 1;
  sctx.beginPath();
  sctx.moveTo(-cw / 2, baseY);
  sctx.lineTo(-cw / 2, baseY - ch);
  sctx.lineTo(-cw / 4, baseY - ch / 2);
  sctx.lineTo(0, baseY - ch);
  sctx.lineTo(cw / 4, baseY - ch / 2);
  sctx.lineTo(cw / 2, baseY - ch);
  sctx.lineTo(cw / 2, baseY);
  sctx.closePath();
  sctx.fill();
  sctx.stroke();
  sctx.restore();
}

function drawSunglasses(w, h) {
  const y = -h * 0.15;
  const lensW = w * 0.28;
  const lensH = h * 0.18;
  const gap = w * 0.06;
  sctx.save();
  sctx.fillStyle = "#111111";
  sctx.beginPath();
  sctx.ellipse(-gap / 2 - lensW / 2, y, lensW / 2, lensH / 2, 0, 0, Math.PI * 2);
  sctx.fill();
  sctx.beginPath();
  sctx.ellipse(gap / 2 + lensW / 2, y, lensW / 2, lensH / 2, 0, 0, Math.PI * 2);
  sctx.fill();
  sctx.strokeStyle = "#111111";
  sctx.lineWidth = 2;
  sctx.beginPath();
  sctx.moveTo(-gap / 2, y);
  sctx.lineTo(gap / 2, y);
  sctx.stroke();
  sctx.fillStyle = "rgba(255,255,255,0.5)";
  sctx.beginPath();
  sctx.ellipse(-gap / 2 - lensW * 0.65, y - lensH * 0.15, lensW * 0.15, lensH * 0.15, 0, 0, Math.PI * 2);
  sctx.fill();
  sctx.restore();
}

function drawEvilEyes(w, h) {
  const y = -h * 0.15;
  const gap = w * 0.24;
  const r = Math.max(1.5, w * 0.045);
  sctx.save();
  sctx.fillStyle = "#ff0000";
  sctx.shadowColor = "#ff0000";
  sctx.shadowBlur = 6;
  [-gap / 2, gap / 2].forEach((ox) => {
    sctx.beginPath();
    sctx.arc(ox, y, r, 0, Math.PI * 2);
    sctx.fill();
  });
  sctx.restore();
}

function getBestScore() {
  return parseInt(localStorage.getItem("flappyCharlieBest") || "0");
}

function getSelectedSkinId() {
  return localStorage.getItem("flappyCharlieSkin") || "classic";
}

function setSelectedSkinId(id) {
  localStorage.setItem("flappyCharlieSkin", id);
}

// --- Preview mode --------------------------------------------------------
// Lets a locked skin be viewed on the bird for a few seconds without
// unlocking or selecting it. Purely visual, never touches localStorage.
let previewSkinId = null;
let previewTimer = null;

function previewSkin(id) {
  previewSkinId = id;
  if (previewTimer) clearTimeout(previewTimer);
  previewTimer = setTimeout(() => {
    previewSkinId = null;
    renderSkinSelector();
  }, 5000);
  renderSkinSelector();
}

function getCurrentSkin() {
  if (previewSkinId) {
    const previewedSkin = BIRD_SKINS.find((s) => s.id === previewSkinId);
    if (previewedSkin) return previewedSkin;
  }
  const best = getBestScore();
  const id = getSelectedSkinId();
  const skin = BIRD_SKINS.find((s) => s.id === id && best >= s.unlockScore);
  return skin || BIRD_SKINS[0];
}

function renderSkinSelector() {
  const list = document.getElementById("skin-list");
  if (!list) return;
  const best = getBestScore();
  const selectedId = getSelectedSkinId();
  list.innerHTML = "";
  BIRD_SKINS.forEach((skin) => {
    const unlocked = best >= skin.unlockScore;
    const isPreviewing = previewSkinId === skin.id;
    const wrapper = document.createElement("div");
    wrapper.className = "skin-item";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className =
      "skin-swatch" +
      (skin.id === selectedId && unlocked ? " selected" : "") +
      (isPreviewing ? " previewing" : "") +
      (unlocked ? "" : " locked");
    btn.title = unlocked ? skin.name : `${skin.name} - unlock at ${skin.unlockScore} points (click to preview)`;
    btn.style.backgroundColor = unlocked ? skin.swatch : "#444";
    btn.textContent = unlocked ? "" : "🔒";
    btn.onclick = () => {
      if (!unlocked) {
        previewSkin(skin.id);
        return;
      }
      previewSkinId = null;
      setSelectedSkinId(skin.id);
      renderSkinSelector();
    };
    wrapper.appendChild(btn);

    const label = document.createElement("span");
    label.className = "skin-label";
    label.textContent = unlocked ? skin.name : skin.unlockScore + " pt";
    wrapper.appendChild(label);

    list.appendChild(wrapper);
  });

  const note = document.getElementById("skin-preview-note");
  if (note) {
    const previewed = BIRD_SKINS.find((s) => s.id === previewSkinId);
    note.textContent = previewed ? `Previewing ${previewed.name}...` : "";
  }
}
const state = {
  curr: 0,
  getReady: 0,
  Play: 1,
  gameOver: 2,
};

// Create placeholder audio (you'll need to add actual sound files)
const SFX = {
  start: new Audio(),
  flap: new Audio(),
  score: new Audio(),
  hit: new Audio(),
  die: new Audio(),
  played: false,
};

const gnd = {
  sprite: new Image(),
  x: 0,
  y: 0,
  draw: function () {
    this.y = parseFloat(scrn.height - this.sprite.height);
    sctx.drawImage(this.sprite, this.x, this.y);
  },
  update: function () {
    if (state.curr != state.Play) return;
    this.x -= dx;
    this.x = this.x % (this.sprite.width / 2);
  },
};

const bg = {
  sprite: new Image(),
  x: 0,
  y: 0,
  draw: function () {
    y = parseFloat(scrn.height - this.sprite.height);
    sctx.drawImage(this.sprite, this.x, y);
  },
};

const pipe = {
  top: { sprite: new Image() },
  bot: { sprite: new Image() },
  gap: 85,
  moved: true,
  pipes: [],
  lastSpawn: 0,
  currentInterval: function () {
    return gauntletPipesLeft > 0 ? 55 : 100;
  },
  draw: function () {
    for (let i = 0; i < this.pipes.length; i++) {
      let p = this.pipes[i];
      sctx.drawImage(this.top.sprite, p.x, p.y);
      sctx.drawImage(
        this.bot.sprite,
        p.x,
        p.y + parseFloat(this.top.sprite.height) + p.gap
      );
    }
  },
  update: function () {
    if (state.curr != state.Play) return;

    if (frames - this.lastSpawn >= this.currentInterval()) {
      this.lastSpawn = frames;
      const score = UI.score.curr;

      // Start a "gauntlet" (a short run of tight-gap, closer-together
      // pipes) every 6-10 pipes once the score threshold is reached.
      if (gauntletPipesLeft <= 0 && score >= GAUNTLET_SCORE) {
        pipesSpawned++;
        if (pipesSpawned >= pipesUntilGauntlet) {
          pipesSpawned = 0;
          pipesUntilGauntlet = 6 + Math.floor(Math.random() * 5);
          gauntletPipesLeft = 3;
          milestoneFlash.text = "GAUNTLET!";
          milestoneFlash.frames = 60;
        }
      }

      const inGauntlet = gauntletPipesLeft > 0;
      if (inGauntlet) gauntletPipesLeft--;

      const gapForThisPipe = inGauntlet ? DIFFICULTY.minGap : this.gap;
      const isMoving = !inGauntlet && score >= MOVING_PIPE_SCORE && Math.random() < 0.5;

      this.pipes.push({
        x: parseFloat(scrn.width),
        y: -210 * Math.min(Math.random() + 1, 1.8),
        gap: gapForThisPipe,
        vy: isMoving ? (Math.random() < 0.5 ? 1 : -1) * (0.6 + Math.random() * 0.6) : 0,
        minY: -300,
        maxY: -80,
      });
    }

    this.pipes.forEach((p) => {
      p.x -= dx;
      if (p.vy) {
        p.y += p.vy;
        if (p.y < p.minY || p.y > p.maxY) p.vy *= -1;
      }
    });

    if (this.pipes.length && this.pipes[0].x < -this.top.sprite.width) {
      this.pipes.shift();
      this.moved = true;
    }
  },
};

const bird = {
  animations: [
    { sprite: new Image() },
    { sprite: new Image() },
    { sprite: new Image() },
    { sprite: new Image() },
  ],
  rotatation: 0,
  x: 50,
  y: 100,
  speed: 0,
  gravity: 0.125,
  thrust: 3.6,
  frame: 0,
  draw: function () {
    let h = this.animations[this.frame].sprite.height;
    let w = this.animations[this.frame].sprite.width;
    sctx.save();
    sctx.translate(this.x, this.y);
    sctx.rotate(this.rotatation * RAD);
    const skin = getCurrentSkin();
    sctx.filter = typeof skin.getFilter === "function" ? skin.getFilter(frames) : skin.filter;
    sctx.drawImage(this.animations[this.frame].sprite, -w / 2, -h / 2);
    sctx.filter = "none";
    if (skin.accessory === "crown") {
      drawCrown(w, h);
    } else if (skin.accessory === "sunglasses") {
      drawSunglasses(w, h);
    } else if (skin.accessory === "evil-eyes") {
      drawEvilEyes(w, h);
    }
    sctx.restore();
  },
  update: function () {
    let r = parseFloat(this.animations[0].sprite.width) / 2;
    switch (state.curr) {
      case state.getReady:
        this.rotatation = 0;
        this.y += frames % 10 == 0 ? Math.sin(frames * RAD) : 0;
        this.frame += frames % 10 == 0 ? 1 : 0;
        break;
      case state.Play:
        this.frame += frames % 5 == 0 ? 1 : 0;
        this.y += this.speed;
        this.setRotation();
        this.speed += this.gravity;
        if (this.y + r >= gnd.y || this.collisioned()) {
          state.curr = state.gameOver;
        }

        break;
      case state.gameOver:
        this.frame = 1;
        if (this.y + r < gnd.y) {
          this.y += this.speed;
          this.setRotation();
          this.speed += this.gravity * 2;
        } else {
          this.speed = 0;
          this.y = gnd.y - r;
          this.rotatation = 90;
          if (!SFX.played) {
            SFX.die.play();
            SFX.played = true;
            
            // FIREBASE INTEGRATION: Show score submission popup
            showScoreSubmit();
          }
        }

        break;
    }
    this.frame = this.frame % this.animations.length;
  },
  flap: function () {
    if (this.y > 0) {
      SFX.flap.play();
      this.speed = -this.thrust;
    }
  },
  setRotation: function () {
    if (this.speed <= 0) {
      this.rotatation = Math.max(-25, (-25 * this.speed) / (-1 * this.thrust));
    } else if (this.speed > 0) {
      this.rotatation = Math.min(90, (90 * this.speed) / (this.thrust * 2));
    }
  },
  collisioned: function () {
    if (!pipe.pipes.length) return;
    let bird = this.animations[0].sprite;
    let x = pipe.pipes[0].x;
    let y = pipe.pipes[0].y;
    let r = bird.height / 4 + bird.width / 4;
    let roof = y + parseFloat(pipe.top.sprite.height);
    let floor = roof + pipe.pipes[0].gap;
    let w = parseFloat(pipe.top.sprite.width);
    if (this.x + r >= x) {
      if (this.x + r < x + w) {
        if (this.y - r <= roof || this.y + r >= floor) {
          SFX.hit.play();
          return true;
        }
      } else if (pipe.moved) {
        UI.score.curr++;
        SFX.score.play();
        pipe.moved = false;
      }
    }
  },
};

const UI = {
  getReady: { sprite: new Image() },
  gameOver: { sprite: new Image() },
  tap: [{ sprite: new Image() }, { sprite: new Image() }],
  score: {
    curr: 0,
    best: 0,
  },
  x: 0,
  y: 0,
  tx: 0,
  ty: 0,
  frame: 0,
  draw: function () {
    switch (state.curr) {
      case state.getReady:
        this.y = parseFloat(scrn.height - this.getReady.sprite.height) / 2;
        this.x = parseFloat(scrn.width - this.getReady.sprite.width) / 2;
        this.tx = parseFloat(scrn.width - this.tap[0].sprite.width) / 2;
        this.ty =
          this.y + this.getReady.sprite.height - this.tap[0].sprite.height;
        sctx.drawImage(this.getReady.sprite, this.x, this.y);
        sctx.drawImage(this.tap[this.frame].sprite, this.tx, this.ty);
        break;
      case state.gameOver:
        this.y = parseFloat(scrn.height - this.gameOver.sprite.height) / 2;
        this.x = parseFloat(scrn.width - this.gameOver.sprite.width) / 2;
        this.tx = parseFloat(scrn.width - this.tap[0].sprite.width) / 2;
        this.ty =
          this.y + this.gameOver.sprite.height - this.tap[0].sprite.height;
        sctx.drawImage(this.gameOver.sprite, this.x, this.y);
        sctx.drawImage(this.tap[this.frame].sprite, this.tx, this.ty);
        break;
    }
    this.drawScore();
  },
  drawScore: function () {
    sctx.fillStyle = "#FFFFFF";
    sctx.strokeStyle = "#000000";
    switch (state.curr) {
      case state.Play:
        sctx.lineWidth = "2";
        sctx.font = "35px Squada One";
        sctx.fillText(this.score.curr, scrn.width / 2 - 5, 50);
        sctx.strokeText(this.score.curr, scrn.width / 2 - 5, 50);
        break;
      case state.gameOver:
        sctx.lineWidth = "2";
        sctx.font = "40px Squada One";
        let sc = `SCORE :     ${this.score.curr}`;
        try {
          const previousBest = parseInt(localStorage.getItem("flappyCharlieBest") || "0");
          this.score.best = Math.max(this.score.curr, previousBest);
          localStorage.setItem("flappyCharlieBest", this.score.best);

          if (this.score.best > previousBest) {
            const newlyUnlocked = BIRD_SKINS.filter(
              (s) => s.unlockScore > previousBest && s.unlockScore <= this.score.best
            );
            if (newlyUnlocked.length) {
              milestoneFlash.text = "SKIN UNLOCKED!";
              milestoneFlash.frames = 90;
            }
            renderSkinSelector();
          }
          
          // Update personal best display
          if (typeof personalBest !== 'undefined') {
            personalBest = this.score.best;
            document.getElementById('your-best').textContent = personalBest;
          }
          
          let bs = `BEST  :     ${this.score.best}`;
          sctx.fillText(sc, scrn.width / 2 - 80, scrn.height / 2 + 0);
          sctx.strokeText(sc, scrn.width / 2 - 80, scrn.height / 2 + 0);
          sctx.fillText(bs, scrn.width / 2 - 80, scrn.height / 2 + 30);
          sctx.strokeText(bs, scrn.width / 2 - 80, scrn.height / 2 + 30);
        } catch (e) {
          sctx.fillText(sc, scrn.width / 2 - 85, scrn.height / 2 + 15);
          sctx.strokeText(sc, scrn.width / 2 - 85, scrn.height / 2 + 15);
        }

        break;
    }
  },
  update: function () {
    if (state.curr == state.Play) return;
    this.frame += frames % 10 == 0 ? 1 : 0;
    this.frame = this.frame % this.tap.length;
  },
};

// FIREBASE INTEGRATION: Show score submission popup
function showScoreSubmit() {
  const finalScore = UI.score.curr;
  currentGameScore = finalScore;
  
  document.getElementById('final-score').textContent = finalScore;
  
  // Only show popup if score > 0
  if (finalScore > 0) {
    document.getElementById('score-submit').style.display = 'block';
  }
}

// Load actual sprite images
gnd.sprite.src = "img/ground.png";
bg.sprite.src = "img/BG.png";
pipe.top.sprite.src = "img/toppipe.png";
pipe.bot.sprite.src = "img/botpipe.png";
UI.gameOver.sprite.src = "img/go.png";
UI.getReady.sprite.src = "img/getready.png";
UI.tap[0].sprite.src = "img/tap/t0.png";
UI.tap[1].sprite.src = "img/tap/t1.png";
bird.animations[0].sprite.src = "img/bird/b0.png";
bird.animations[1].sprite.src = "img/bird/b1.png";
bird.animations[2].sprite.src = "img/bird/b2.png";
bird.animations[3].sprite.src = "img/bird/b0.png";

// Sound effects
SFX.start.src = "sfx/start.wav";
SFX.flap.src = "sfx/flap.wav";
SFX.score.src = "sfx/score.wav";
SFX.hit.src = "sfx/hit.wav";
SFX.die.src = "sfx/die.wav";

function gameLoop() {
  update();
  draw();
  frames++;
}

function update() {
  bird.update();
  gnd.update();
  pipe.update();
  UI.update();
  updateStage();
  updateDifficulty();
  updateEnemy();
}

function draw() {
  sctx.fillStyle = "#30c0df";
  sctx.fillRect(0, 0, scrn.width, scrn.height);
  bg.draw();
  pipe.draw();
  drawEnemy();

  bird.draw();
  gnd.draw();
  UI.draw();
  drawMilestoneFlash();
}

setInterval(gameLoop, 20);

renderSkinSelector();
