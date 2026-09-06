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
    sctx.drawImage(this.animations[this.frame].sprite, -w / 2, -h / 2);
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
          this.score.best = Math.max(
            this.score.curr,
            localStorage.getItem("flappyCharlieBest") || 0
          );
          localStorage.setItem("flappyCharlieBest", this.score.best);
          
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
