(() => {
  "use strict";

  const ARENA = Object.freeze({
    width: 360,
    height: 640,
  });

  const STORAGE_KEY = "lineSliceBallsEndlessSaveV1";
  const MAX_HEARTS = 2;
  const OBSTACLE_UNLOCK_SLICES = 50;
  const PLAYER_RADIUS = 14;
  const DEFENDER_RADIUS = 15;
  const MAX_DRAG_DISTANCE = 130;
  const MAX_LAUNCH_SPEED = 930;
  const STOP_SPEED = 26;
  const DAMPING = 0.986;
  const WALL_BOUNCE = 0.88;
  const LAUNCH_Y = ARENA.height * 0.84;

  const SKINS = Object.freeze([
    {
      id: "neon_blue",
      name: "Neon Blue",
      price: 0,
      core: "#3dd7ff",
      glow: "rgba(61, 215, 255, 0.9)",
      sparkle: "rgba(182, 245, 255, 0.95)",
    },
    {
      id: "lava_red",
      name: "Lava Red",
      price: 100,
      core: "#ff5b4d",
      glow: "rgba(255, 91, 77, 0.92)",
      sparkle: "rgba(255, 206, 199, 0.95)",
    },
    {
      id: "gold",
      name: "Gold",
      price: 250,
      core: "#efb938",
      glow: "rgba(239, 185, 56, 0.9)",
      sparkle: "rgba(255, 242, 196, 0.95)",
    },
    {
      id: "plasma_purple",
      name: "Plasma Purple",
      price: 500,
      core: "#9c67ff",
      glow: "rgba(156, 103, 255, 0.9)",
      sparkle: "rgba(230, 213, 255, 0.95)",
    },
    {
      id: "toxic_green",
      name: "Toxic Green",
      price: 350,
      core: "#39d86f",
      glow: "rgba(57, 216, 111, 0.92)",
      sparkle: "rgba(202, 255, 221, 0.95)",
    },
  ]);

  const dom = {
    canvas: document.getElementById("gameCanvas"),
    comboValue: document.getElementById("comboValue"),
    coinsValue: document.getElementById("coinsValue"),
    hearts: [...document.querySelectorAll(".heart-slot")],
    screenFlash: document.getElementById("screenFlash"),
    centerBanner: document.getElementById("centerBanner"),
    menuOverlay: document.getElementById("menuOverlay"),
    shopOverlay: document.getElementById("shopOverlay"),
    optionsOverlay: document.getElementById("optionsOverlay"),
    gameOverOverlay: document.getElementById("gameOverOverlay"),
    menuWalletText: document.getElementById("menuWalletText"),
    shopWalletText: document.getElementById("shopWalletText"),
    shopItems: document.getElementById("shopItems"),
    finalScore: document.getElementById("finalScore"),
    bestCombo: document.getElementById("bestCombo"),
    coinsEarned: document.getElementById("coinsEarned"),
    playButton: document.getElementById("playButton"),
    shopButton: document.getElementById("shopButton"),
    optionsButton: document.getElementById("optionsButton"),
    shopBackButton: document.getElementById("shopBackButton"),
    shakeToggleButton: document.getElementById("shakeToggleButton"),
    optionsBackButton: document.getElementById("optionsBackButton"),
    restartButton: document.getElementById("restartButton"),
    gameOverShopButton: document.getElementById("gameOverShopButton"),
    mainMenuButton: document.getElementById("mainMenuButton"),
  };

  const ctx = dom.canvas.getContext("2d");

  const state = {
    overlay: "menu",
    shopReturn: "menu",
    bannerTimeoutId: null,
    shopMessageTimeoutId: null,
    inRun: false,
    canShoot: false,
    repositioning: false,
    player: {
      x: ARENA.width / 2,
      y: LAUNCH_Y,
      vx: 0,
      vy: 0,
      radius: PLAYER_RADIUS,
    },
    defenders: [
      {
        x: ARENA.width * 0.35,
        y: 130,
        targetX: ARENA.width * 0.35,
        targetY: 130,
        retargetAt: 0,
        radius: DEFENDER_RADIUS,
      },
      {
        x: ARENA.width * 0.65,
        y: 170,
        targetX: ARENA.width * 0.65,
        targetY: 170,
        retargetAt: 0,
        radius: DEFENDER_RADIUS,
      },
    ],
    aim: {
      active: false,
      pointerId: null,
      x: 0,
      y: 0,
    },
    shot: {
      active: false,
      sliced: false,
      endingTimer: null,
      sparkleCooldown: 0,
    },
    run: {
      hearts: MAX_HEARTS,
      score: 0,
      combo: 0,
      bestCombo: 0,
      slices: 0,
      coinsEarned: 0,
      difficulty: 0,
      defenderSpeed: 74,
      repositionSpeed: 76,
      lineOscillation: 4,
      obstacleUnlocked: false,
    },
    obstacles: [],
    particles: [],
    effects: {
      lineVibration: 0,
      lineFlash: 0,
      shakeTime: 0,
      shakeStrength: 0,
      flashTime: 0,
      flashDuration: 0,
      flashColor: "rgba(255, 255, 255, 0.4)",
      flashPower: 0,
    },
    profile: null,
    lastTime: 0,
  };

  function loadProfile() {
    const defaults = {
      coins: 0,
      selectedSkin: SKINS[0].id,
      ownedSkins: { [SKINS[0].id]: true },
      options: {
        screenShake: true,
      },
    };

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return defaults;
      }

      const parsed = JSON.parse(raw);
      const ownedSkins = { ...defaults.ownedSkins, ...(parsed.ownedSkins ?? {}) };
      const selectedSkin = ownedSkins[parsed.selectedSkin] ? parsed.selectedSkin : SKINS[0].id;

      return {
        coins: Number.isFinite(parsed.coins) ? Math.max(0, Math.floor(parsed.coins)) : defaults.coins,
        selectedSkin,
        ownedSkins,
        options: {
          screenShake: parsed.options?.screenShake !== false,
        },
      };
    } catch {
      return defaults;
    }
  }

  function saveProfile() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.profile));
    } catch {
      // Ignore storage write failures.
    }
  }

  state.profile = loadProfile();

  function getSkinById(id) {
    return SKINS.find((skin) => skin.id === id) ?? SKINS[0];
  }

  function getActiveSkin() {
    return getSkinById(state.profile.selectedSkin);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function lerp(a, b, t) {
    return a + ((b - a) * t);
  }

  function distance(ax, ay, bx, by) {
    return Math.hypot(bx - ax, by - ay);
  }

  function random(min, max) {
    return min + (Math.random() * (max - min));
  }

  function normalize(x, y) {
    const length = Math.hypot(x, y);
    if (!length) {
      return { x: 0, y: 0 };
    }

    return {
      x: x / length,
      y: y / length,
    };
  }

  function pointToCanvas(event) {
    const rect = dom.canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * ARENA.width,
      y: ((event.clientY - rect.top) / rect.height) * ARENA.height,
    };
  }

  function setOverlay(name) {
    state.overlay = name;
    dom.menuOverlay.classList.toggle("hidden", name !== "menu");
    dom.shopOverlay.classList.toggle("hidden", name !== "shop");
    dom.optionsOverlay.classList.toggle("hidden", name !== "options");
    dom.gameOverOverlay.classList.toggle("hidden", name !== "gameover");
  }

  function updateCoinDisplays() {
    dom.coinsValue.textContent = String(state.profile.coins);
    dom.menuWalletText.textContent = `Coins: ${state.profile.coins}`;
    dom.shopWalletText.textContent = `Coins: ${state.profile.coins}`;
  }

  function updateComboDisplay(bump = false) {
    const combo = state.run.combo;
    dom.comboValue.textContent = `${combo}x`;

    const glowAlpha = clamp(0.18 + (combo * 0.06), 0.2, 0.72);
    const glowSize = 10 + (combo * 1.8);
    const hue = clamp(188 - (combo * 2), 146, 188);

    dom.comboValue.style.color = combo <= 0
      ? "#18bdd3"
      : `hsl(${hue} 100% 58%)`;
    dom.comboValue.style.textShadow = `0 0 ${glowSize}px rgba(57, 240, 255, ${glowAlpha})`;

    if (bump) {
      dom.comboValue.classList.remove("bump");
      void dom.comboValue.offsetWidth;
      dom.comboValue.classList.add("bump");
    }
  }

  function syncHeartsInstant() {
    dom.hearts.forEach((heart, index) => {
      heart.classList.remove("broken", "healing", "empty");
      heart.classList.add(index < state.run.hearts ? "intact" : "empty");
    });
  }

  function breakHeartAnimation(slotIndex) {
    const heart = dom.hearts[slotIndex];
    if (!heart) {
      return;
    }

    heart.classList.remove("intact", "healing", "empty", "broken");
    void heart.offsetWidth;
    heart.classList.add("broken");

    window.setTimeout(() => {
      heart.classList.remove("broken");
      heart.classList.add("empty");
    }, 470);
  }

  function healHeartAnimation(slotIndex) {
    const heart = dom.hearts[slotIndex];
    if (!heart) {
      return;
    }

    heart.classList.remove("intact", "broken", "empty", "healing");
    heart.classList.add("healing");

    window.setTimeout(() => {
      heart.classList.remove("healing");
      heart.classList.add("intact");
    }, 540);
  }

  function updateShakeToggle() {
    dom.shakeToggleButton.textContent = state.profile.options.screenShake ? "On" : "Off";
  }

  function setShopMessage(message, tone = "normal") {
    if (state.shopMessageTimeoutId) {
      window.clearTimeout(state.shopMessageTimeoutId);
      state.shopMessageTimeoutId = null;
    }

    dom.shopWalletText.textContent = message;
    dom.shopWalletText.style.color = tone === "error" ? "#bb3253" : "#1c5f90";

    state.shopMessageTimeoutId = window.setTimeout(() => {
      dom.shopWalletText.style.color = "#1c5f90";
      updateCoinDisplays();
      state.shopMessageTimeoutId = null;
    }, 1000);
  }

  function buildShop() {
    dom.shopItems.innerHTML = "";

    SKINS.forEach((skin) => {
      const row = document.createElement("div");
      row.className = "shop-item";

      const swatch = document.createElement("div");
      swatch.className = "swatch";
      swatch.style.background = skin.core;
      swatch.style.boxShadow = `0 0 10px ${skin.glow}`;

      const meta = document.createElement("div");
      meta.className = "shop-meta";

      const title = document.createElement("strong");
      title.textContent = skin.name;
      const subtitle = document.createElement("span");

      const owned = Boolean(state.profile.ownedSkins[skin.id]);
      const equipped = state.profile.selectedSkin === skin.id;
      subtitle.textContent = skin.price === 0 ? "Starter" : `${skin.price} coins`;
      meta.append(title, subtitle);

      const action = document.createElement("button");

      if (equipped) {
        action.textContent = "Equipped";
        action.className = "equipped";
        action.disabled = true;
      } else if (owned) {
        action.textContent = "Equip";
      } else {
        action.textContent = `Buy ${skin.price}`;
        action.className = "locked";
      }

      action.addEventListener("click", () => {
        const currentlyOwned = Boolean(state.profile.ownedSkins[skin.id]);

        if (!currentlyOwned) {
          if (state.profile.coins < skin.price) {
            setShopMessage("Not enough coins", "error");
            return;
          }

          state.profile.coins -= skin.price;
          state.profile.ownedSkins[skin.id] = true;
          state.profile.selectedSkin = skin.id;
          saveProfile();
          updateCoinDisplays();
          setShopMessage(`${skin.name} unlocked`, "ok");
          buildShop();
          return;
        }

        state.profile.selectedSkin = skin.id;
        saveProfile();
        buildShop();
      });

      row.append(swatch, meta, action);
      dom.shopItems.appendChild(row);
    });
  }

  function showBanner(text, kind = "info") {
    if (state.bannerTimeoutId) {
      window.clearTimeout(state.bannerTimeoutId);
      state.bannerTimeoutId = null;
    }

    dom.centerBanner.textContent = text;
    dom.centerBanner.classList.remove("hidden", "show");

    if (kind === "miss") {
      dom.centerBanner.style.background = "rgba(255, 63, 95, 0.84)";
    } else if (kind === "slice") {
      dom.centerBanner.style.background = "rgba(28, 189, 219, 0.86)";
    } else if (kind === "warn") {
      dom.centerBanner.style.background = "rgba(255, 156, 72, 0.86)";
    } else {
      dom.centerBanner.style.background = "rgba(63, 137, 218, 0.82)";
    }

    void dom.centerBanner.offsetWidth;
    dom.centerBanner.classList.add("show");

    state.bannerTimeoutId = window.setTimeout(() => {
      dom.centerBanner.classList.add("hidden");
      state.bannerTimeoutId = null;
    }, 450);
  }

  function triggerFlash(color, power, duration) {
    state.effects.flashColor = color;
    state.effects.flashPower = power;
    state.effects.flashDuration = duration;
    state.effects.flashTime = duration;
  }

  function triggerShake(duration, strength) {
    if (!state.profile.options.screenShake) {
      return;
    }

    state.effects.shakeTime = Math.max(state.effects.shakeTime, duration);
    state.effects.shakeStrength = Math.max(state.effects.shakeStrength, strength);
  }

  function spawnParticle(particle) {
    state.particles.push(particle);
    if (state.particles.length > 210) {
      state.particles.splice(0, state.particles.length - 210);
    }
  }

  function emitSliceSparks(point, color, count) {
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = random(80, 240);
      spawnParticle({
        x: point.x,
        y: point.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: random(0.22, 0.46),
        maxLife: 0.46,
        size: random(1.2, 2.8),
        color,
      });
    }
  }

  function emitSparkle() {
    const skin = getActiveSkin();
    const player = state.player;
    const speed = Math.hypot(player.vx, player.vy);
    if (speed < 30) {
      return;
    }

    const dir = normalize(player.vx, player.vy);
    const angleJitter = (Math.random() - 0.5) * 0.9;
    const reverseAngle = Math.atan2(-dir.y, -dir.x) + angleJitter;
    const particleSpeed = random(24, 78);

    spawnParticle({
      x: player.x + random(-3, 3),
      y: player.y + random(-3, 3),
      vx: Math.cos(reverseAngle) * particleSpeed,
      vy: Math.sin(reverseAngle) * particleSpeed,
      life: random(0.12, 0.24),
      maxLife: 0.24,
      size: random(0.8, 1.8),
      color: skin.sparkle,
    });
  }

  function chooseDefenderPair() {
    for (let attempts = 0; attempts < 90; attempts += 1) {
      const first = {
        x: random(44, ARENA.width - 44),
        y: random(82, ARENA.height * 0.35),
      };
      const second = {
        x: random(44, ARENA.width - 44),
        y: random(98, ARENA.height * 0.42),
      };

      if (distance(first.x, first.y, second.x, second.y) >= 120) {
        return [first, second];
      }
    }

    return [
      { x: ARENA.width * 0.32, y: 128 },
      { x: ARENA.width * 0.68, y: 168 },
    ];
  }

  function setDefendersToPair(pair) {
    pair.forEach((point, index) => {
      const defender = state.defenders[index];
      defender.x = point.x;
      defender.y = point.y;
      defender.targetX = point.x;
      defender.targetY = point.y;
      defender.retargetAt = 0;
    });
  }

  function chooseWanderTarget(index) {
    const other = state.defenders[index === 0 ? 1 : 0];

    for (let attempts = 0; attempts < 60; attempts += 1) {
      const x = random(38, ARENA.width - 38);
      const y = random(84, ARENA.height * 0.42);

      if (distance(x, y, other.targetX ?? other.x, other.targetY ?? other.y) < 96) {
        continue;
      }

      return { x, y };
    }

    return {
      x: index === 0 ? ARENA.width * 0.3 : ARENA.width * 0.7,
      y: random(110, 210),
    };
  }

  function scheduleDefenderTarget(index, baseTime = performance.now()) {
    const defender = state.defenders[index];
    const target = chooseWanderTarget(index);
    const retargetDelaySec = Math.max(0.55, 1.8 - (state.run.difficulty * 0.012)) + random(0.15, 0.55);
    defender.targetX = target.x;
    defender.targetY = target.y;
    defender.retargetAt = baseTime + (retargetDelaySec * 1000);
  }

  function planDefenderReposition() {
    scheduleDefenderTarget(0);
    scheduleDefenderTarget(1);
    state.repositioning = false;
  }

  function resetPlayerForShot() {
    state.player.x = ARENA.width / 2;
    state.player.y = LAUNCH_Y;
    state.player.vx = 0;
    state.player.vy = 0;
  }

  function updateDifficulty() {
    const d = state.run.slices;
    state.run.difficulty = d;
    state.run.defenderSpeed = 72 + Math.min(180, d * 1.55);
    state.run.repositionSpeed = 74 + Math.min(195, d * 1.75);
    state.run.lineOscillation = 4 + Math.min(24, d * 0.13);
  }

  function createObstacle(index) {
    for (let attempts = 0; attempts < 70; attempts += 1) {
      const x = random(44, ARENA.width - 44);
      const y = random(ARENA.height * 0.34, ARENA.height * 0.76);

      if (distance(x, y, ARENA.width / 2, LAUNCH_Y) < 110) {
        continue;
      }

      return {
        x,
        y,
        vx: random(-16, 16),
        vy: random(-18, 18),
        radius: 19 + (index * 1.8),
        angle: random(0, Math.PI * 2),
        spin: random(-1.3, 1.3),
      };
    }

    return {
      x: ARENA.width * (index === 0 ? 0.3 : 0.7),
      y: ARENA.height * 0.55,
      vx: 0,
      vy: 0,
      radius: 20,
      angle: 0,
      spin: 0.7,
    };
  }

  function unlockObstaclesIfNeeded() {
    if (state.run.obstacleUnlocked || state.run.slices < OBSTACLE_UNLOCK_SLICES) {
      return;
    }

    state.run.obstacleUnlocked = true;
    state.obstacles = [createObstacle(0), createObstacle(1)];
    showBanner("SPIKES ONLINE", "warn");
  }

  function signedSide(point, lineA, lineB) {
    const normalX = -(lineB.y - lineA.y);
    const normalY = lineB.x - lineA.x;
    return ((point.x - lineA.x) * normalX) + ((point.y - lineA.y) * normalY);
  }

  function segmentIntersection(a, b, c, d) {
    const rX = b.x - a.x;
    const rY = b.y - a.y;
    const sX = d.x - c.x;
    const sY = d.y - c.y;
    const denominator = (rX * sY) - (rY * sX);

    if (Math.abs(denominator) < 0.000001) {
      return null;
    }

    const qPX = c.x - a.x;
    const qPY = c.y - a.y;
    const t = ((qPX * sY) - (qPY * sX)) / denominator;
    const u = ((qPX * rY) - (qPY * rX)) / denominator;

    if (t < 0 || t > 1 || u < 0 || u > 1) {
      return null;
    }

    return {
      x: a.x + (t * rX),
      y: a.y + (t * rY),
    };
  }

  function detectSlice(previous, next) {
    const lineA = state.defenders[0];
    const lineB = state.defenders[1];
    const prevSide = signedSide(previous, lineA, lineB);
    const nextSide = signedSide(next, lineA, lineB);
    const sideEpsilon = 0.01;
    const changedSide = (
      (prevSide > sideEpsilon && nextSide < -sideEpsilon) ||
      (prevSide < -sideEpsilon && nextSide > sideEpsilon)
    );

    if (!changedSide) {
      return null;
    }

    return segmentIntersection(previous, next, lineA, lineB);
  }

  function loseHeart() {
    if (state.run.hearts <= 0) {
      return;
    }

    state.run.hearts -= 1;
    state.run.combo = 0;
    updateComboDisplay();
    breakHeartAnimation(state.run.hearts);
    triggerFlash("rgba(255, 65, 105, 0.58)", 1, 0.18);
    triggerShake(0.16, 6);
    showBanner("MISS", "miss");
  }

  function restoreHeartIfEligible() {
    if (state.run.hearts >= MAX_HEARTS) {
      return;
    }

    if (state.run.slices % 5 !== 0) {
      return;
    }

    const restoreIndex = state.run.hearts;
    state.run.hearts += 1;
    healHeartAnimation(restoreIndex);
    triggerFlash("rgba(63, 245, 178, 0.32)", 0.65, 0.22);
  }

  function onSlice(impactPoint) {
    if (state.shot.sliced) {
      return;
    }

    state.shot.sliced = true;
    state.shot.endingTimer = 0.08;

    state.run.score += 1;
    state.run.combo += 1;
    state.run.bestCombo = Math.max(state.run.bestCombo, state.run.combo);
    state.run.slices += 1;
    state.run.coinsEarned += 1;
    state.profile.coins += 1;

    saveProfile();
    updateCoinDisplays();
    updateComboDisplay(true);
    updateDifficulty();
    unlockObstaclesIfNeeded();
    restoreHeartIfEligible();

    const lineMidpoint = impactPoint ?? {
      x: (state.defenders[0].x + state.defenders[1].x) / 2,
      y: (state.defenders[0].y + state.defenders[1].y) / 2,
    };

    emitSliceSparks(lineMidpoint, "rgba(237, 249, 255, 0.95)", 18);
    state.effects.lineVibration = 16 + (state.run.difficulty * 0.04);
    state.effects.lineFlash = 1;
    triggerShake(0.22, 8 + (state.run.difficulty * 0.04));
    triggerFlash("rgba(255, 255, 255, 0.65)", 0.9, 0.12);
    showBanner("SLICE!", "slice");
  }

  function enterGameOver() {
    state.inRun = false;
    state.canShoot = false;
    state.shot.active = false;
    state.aim.active = false;

    dom.finalScore.textContent = String(state.run.score);
    dom.bestCombo.textContent = `${state.run.bestCombo}x`;
    dom.coinsEarned.textContent = String(state.run.coinsEarned);

    setOverlay("gameover");
    updateCoinDisplays();
  }

  function finalizeShot(missed) {
    state.shot.active = false;
    state.shot.endingTimer = null;
    state.player.vx = 0;
    state.player.vy = 0;

    if (missed) {
      loseHeart();
      if (state.run.hearts <= 0) {
        window.setTimeout(() => {
          enterGameOver();
        }, 260);
        return;
      }
    }

    resetPlayerForShot();
    planDefenderReposition();
    state.canShoot = true;
  }

  function startRun() {
    state.inRun = true;
    state.run.hearts = MAX_HEARTS;
    state.run.score = 0;
    state.run.combo = 0;
    state.run.bestCombo = 0;
    state.run.slices = 0;
    state.run.coinsEarned = 0;
    state.run.obstacleUnlocked = false;
    state.obstacles = [];
    state.particles.length = 0;
    state.effects.lineVibration = 0;
    state.effects.lineFlash = 0;
    state.effects.shakeTime = 0;
    state.effects.shakeStrength = 0;
    state.effects.flashTime = 0;
    state.repositioning = false;
    state.canShoot = true;
    state.shot.active = false;
    state.shot.sliced = false;
    state.shot.endingTimer = null;
    state.aim.active = false;
    updateDifficulty();
    setDefendersToPair(chooseDefenderPair());
    planDefenderReposition();
    resetPlayerForShot();
    syncHeartsInstant();
    updateComboDisplay();
    updateCoinDisplays();
    setOverlay("none");
  }

  function showMenu() {
    state.inRun = false;
    state.shot.active = false;
    state.aim.active = false;
    state.canShoot = false;
    setOverlay("menu");
    updateCoinDisplays();
  }

  function beginShop(returnOverlay) {
    state.shopReturn = returnOverlay;
    buildShop();
    updateCoinDisplays();
    setOverlay("shop");
  }

  function beginOptions() {
    updateShakeToggle();
    setOverlay("options");
  }

  function beginLaunch(pointerPoint) {
    if (!state.inRun || !state.canShoot || state.shot.active) {
      return;
    }

    const pickDistance = distance(pointerPoint.x, pointerPoint.y, state.player.x, state.player.y);
    if (pickDistance > state.player.radius + 18) {
      return;
    }

    state.aim.active = true;
    state.aim.x = pointerPoint.x;
    state.aim.y = pointerPoint.y;
  }

  function launchFromPointer(pointerPoint) {
    const dragX = state.player.x - pointerPoint.x;
    const dragY = state.player.y - pointerPoint.y;
    const dragDistance = Math.hypot(dragX, dragY);
    if (dragDistance < 8) {
      return;
    }

    const direction = normalize(dragX, dragY);
    const scaledDistance = Math.min(dragDistance, MAX_DRAG_DISTANCE);
    const speed = (scaledDistance / MAX_DRAG_DISTANCE) * MAX_LAUNCH_SPEED;

    state.player.vx = direction.x * speed;
    state.player.vy = direction.y * speed;
    state.shot.active = true;
    state.shot.sliced = false;
    state.shot.endingTimer = null;
    state.shot.sparkleCooldown = 0;
    state.canShoot = false;
  }

  function updateReposition(dt) {
    if (!state.inRun) {
      return;
    }

    const now = performance.now();
    const repositionSpeed = state.run.defenderSpeed;

    state.defenders.forEach((defender, index) => {
      if (!Number.isFinite(defender.retargetAt) || now >= defender.retargetAt) {
        scheduleDefenderTarget(index, now);
      }

      const dx = defender.targetX - defender.x;
      const dy = defender.targetY - defender.y;
      const distanceToTarget = Math.hypot(dx, dy);

      if (distanceToTarget > 0.6) {
        const step = Math.min(distanceToTarget, repositionSpeed * dt);
        const dirX = dx / distanceToTarget;
        const dirY = dy / distanceToTarget;
        defender.x += dirX * step;
        defender.y += dirY * step;
      } else {
        defender.x = defender.targetX;
        defender.y = defender.targetY;
        scheduleDefenderTarget(index, now + 90);
      }
    });
  }

  function updateObstacles(dt) {
    if (!state.run.obstacleUnlocked || !state.obstacles.length) {
      return;
    }

    state.obstacles.forEach((obstacle) => {
      obstacle.x += obstacle.vx * dt;
      obstacle.y += obstacle.vy * dt;
      obstacle.angle += obstacle.spin * dt;

      if (obstacle.x < obstacle.radius || obstacle.x > ARENA.width - obstacle.radius) {
        obstacle.vx *= -1;
        obstacle.x = clamp(obstacle.x, obstacle.radius, ARENA.width - obstacle.radius);
      }

      if (obstacle.y < ARENA.height * 0.26 || obstacle.y > ARENA.height - obstacle.radius - 28) {
        obstacle.vy *= -1;
        obstacle.y = clamp(obstacle.y, ARENA.height * 0.26, ARENA.height - obstacle.radius - 28);
      }
    });
  }

  function updateShot(dt) {
    if (!state.shot.active) {
      return;
    }

    const player = state.player;
    const previous = { x: player.x, y: player.y };
    player.x += player.vx * dt;
    player.y += player.vy * dt;

    const dampingFactor = Math.pow(DAMPING, dt * 60);
    player.vx *= dampingFactor;
    player.vy *= dampingFactor;

    if (player.x <= player.radius) {
      player.x = player.radius;
      player.vx = Math.abs(player.vx) * WALL_BOUNCE;
    } else if (player.x >= ARENA.width - player.radius) {
      player.x = ARENA.width - player.radius;
      player.vx = -Math.abs(player.vx) * WALL_BOUNCE;
    }

    if (player.y <= player.radius) {
      player.y = player.radius;
      player.vy = Math.abs(player.vy) * WALL_BOUNCE;
    } else if (player.y >= ARENA.height - player.radius) {
      player.y = ARENA.height - player.radius;
      player.vy = -Math.abs(player.vy) * WALL_BOUNCE;
    }

    state.shot.sparkleCooldown -= dt;
    if (state.shot.sparkleCooldown <= 0) {
      emitSparkle();
      state.shot.sparkleCooldown = 0.018;
    }

    if (!state.shot.sliced) {
      const sliceImpact = detectSlice(previous, player);
      if (sliceImpact) {
        onSlice(sliceImpact);
      }
    }

    if (!state.shot.sliced && state.run.obstacleUnlocked) {
      const obstacleHit = state.obstacles.some((obstacle) => {
        const hitRadius = obstacle.radius + player.radius;
        return distance(player.x, player.y, obstacle.x, obstacle.y) <= hitRadius;
      });

      if (obstacleHit) {
        state.shot.endingTimer = 0;
        state.shot.sliced = false;
        emitSliceSparks({ x: player.x, y: player.y }, "rgba(211, 123, 123, 0.9)", 14);
        showBanner("SPIKE HIT", "miss");
      }
    }

    if (state.shot.endingTimer !== null) {
      state.shot.endingTimer -= dt;
      if (state.shot.endingTimer <= 0) {
        finalizeShot(!state.shot.sliced);
      }
      return;
    }

    const speed = Math.hypot(player.vx, player.vy);
    if (speed <= STOP_SPEED) {
      finalizeShot(!state.shot.sliced);
    }
  }

  function updateParticles(dt) {
    if (!state.particles.length) {
      return;
    }

    state.particles = state.particles.filter((particle) => {
      particle.life -= dt;
      if (particle.life <= 0) {
        return false;
      }

      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vx *= 0.96;
      particle.vy *= 0.96;
      return true;
    });
  }

  function updateEffects(dt) {
    state.effects.lineVibration = Math.max(0, state.effects.lineVibration - (dt * 33));
    state.effects.lineFlash = Math.max(0, state.effects.lineFlash - (dt * 4.4));
    state.effects.shakeTime = Math.max(0, state.effects.shakeTime - dt);

    if (state.effects.shakeTime <= 0) {
      state.effects.shakeStrength = 0;
    }

    if (state.effects.flashTime > 0) {
      state.effects.flashTime = Math.max(0, state.effects.flashTime - dt);
      const ratio = state.effects.flashDuration > 0
        ? state.effects.flashTime / state.effects.flashDuration
        : 0;
      dom.screenFlash.style.background = state.effects.flashColor;
      dom.screenFlash.style.opacity = String(ratio * state.effects.flashPower);
    } else {
      dom.screenFlash.style.opacity = "0";
    }
  }

  function update(dt) {
    updateEffects(dt);

    if (!state.inRun) {
      updateParticles(dt);
      return;
    }

    updateReposition(dt);
    updateObstacles(dt);
    updateShot(dt);
    updateParticles(dt);
  }

  function drawBackdrop() {
    ctx.fillStyle = "#eef3fb";
    ctx.fillRect(0, 0, ARENA.width, ARENA.height);
  }

  function drawDefenderBall(defender) {
    const gradient = ctx.createRadialGradient(
      defender.x - 4,
      defender.y - 5,
      2,
      defender.x,
      defender.y,
      defender.radius,
    );
    gradient.addColorStop(0, "#fff4ec");
    gradient.addColorStop(1, "#ff7a68");

    ctx.save();
    ctx.fillStyle = gradient;
    ctx.shadowColor = "rgba(255, 122, 104, 0.55)";
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(defender.x, defender.y, defender.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawEnergyLine(timeMs) {
    const first = state.defenders[0];
    const second = state.defenders[1];
    const dx = second.x - first.x;
    const dy = second.y - first.y;
    const length = Math.hypot(dx, dy);
    if (length < 0.000001) {
      return;
    }

    const vibe = state.effects.lineVibration;
    const flash = state.effects.lineFlash;

    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "rgba(255, 122, 104, 0.9)";
    ctx.shadowColor = `rgba(255, 122, 104, ${0.28 + (flash * 0.5)})`;
    ctx.shadowBlur = 14 + (flash * 12);
    ctx.lineWidth = 4;
    const shouldZigzag = vibe > 0.08;

    if (!shouldZigzag) {
      ctx.beginPath();
      ctx.moveTo(first.x, first.y);
      ctx.lineTo(second.x, second.y);
      ctx.stroke();
      ctx.restore();
      return;
    }

    const normalX = -dy / length;
    const normalY = dx / length;
    const segments = 16;
    const amplitude = 2.8 + vibe;
    const phase = timeMs * 0.018;
    ctx.beginPath();
    for (let i = 0; i <= segments; i += 1) {
      const t = i / segments;
      const baseX = lerp(first.x, second.x, t);
      const baseY = lerp(first.y, second.y, t);
      const zig = i % 2 === 0 ? -1 : 1;
      const wave = Math.sin(phase + (t * 17));
      const offset = ((zig * 0.6) + (wave * 0.4)) * amplitude;
      const x = baseX + (normalX * offset);
      const y = baseY + (normalY * offset);
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    if (flash > 0) {
      ctx.strokeStyle = `rgba(255, 247, 235, ${flash})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i <= segments; i += 1) {
        const t = i / segments;
        const baseX = lerp(first.x, second.x, t);
        const baseY = lerp(first.y, second.y, t);
        const zig = i % 2 === 0 ? -1 : 1;
        const wave = Math.sin(phase + (t * 18));
        const offset = ((zig * 0.45) + (wave * 0.35)) * amplitude;
        const x = baseX + (normalX * offset);
        const y = baseY + (normalY * offset);
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawPlayer() {
    const skin = getActiveSkin();
    const player = state.player;
    const speed = Math.hypot(player.vx, player.vy);
    const haloPulse = (Math.sin(performance.now() * 0.012) + 1) * 0.5;

    ctx.save();
    if (speed > 15) {
      ctx.globalAlpha = 0.2 + (haloPulse * 0.2);
      ctx.strokeStyle = skin.glow;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.radius + 6 + Math.min(speed / 120, 7), 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    const gradient = ctx.createRadialGradient(
      player.x - (player.radius * 0.4),
      player.y - (player.radius * 0.45),
      player.radius * 0.2,
      player.x,
      player.y,
      player.radius,
    );
    gradient.addColorStop(0, "#ffffff");
    gradient.addColorStop(0.22, "#f2fbff");
    gradient.addColorStop(1, skin.core);
    ctx.fillStyle = gradient;
    ctx.shadowColor = skin.glow;
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawAimGuide() {
    if (!state.aim.active || !state.inRun || !state.canShoot || state.shot.active) {
      return;
    }

    const player = state.player;
    const dragX = player.x - state.aim.x;
    const dragY = player.y - state.aim.y;
    const dragDistance = Math.hypot(dragX, dragY);
    if (dragDistance < 3) {
      return;
    }

    const clampedDistance = Math.min(dragDistance, MAX_DRAG_DISTANCE);
    const scale = clampedDistance / dragDistance;
    const tipX = player.x + (dragX * scale);
    const tipY = player.y + (dragY * scale);
    const powerRatio = clampedDistance / MAX_DRAG_DISTANCE;

    ctx.save();
    ctx.lineCap = "round";
    ctx.strokeStyle = "rgba(16, 57, 99, 0.45)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(player.x, player.y);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();

    ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
    ctx.beginPath();
    ctx.arc(tipX, tipY, 4, 0, Math.PI * 2);
    ctx.fill();

    const meterX = 62;
    const meterY = ARENA.height - 28;
    const meterWidth = ARENA.width - 124;
    const meterHeight = 8;

    ctx.fillStyle = "rgba(16, 57, 99, 0.14)";
    ctx.fillRect(meterX, meterY, meterWidth, meterHeight);

    const meterGradient = ctx.createLinearGradient(meterX, meterY, meterX + meterWidth, meterY);
    meterGradient.addColorStop(0, "#39d2ba");
    meterGradient.addColorStop(1, "#ff9b59");
    ctx.fillStyle = meterGradient;
    ctx.fillRect(meterX, meterY, meterWidth * powerRatio, meterHeight);
    ctx.restore();
  }

  function drawParticles() {
    state.particles.forEach((particle) => {
      const ratio = particle.maxLife > 0 ? particle.life / particle.maxLife : 0;
      const alpha = clamp(ratio, 0, 1);

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  function drawObstacle(obstacle) {
    ctx.save();
    ctx.translate(obstacle.x, obstacle.y);
    ctx.rotate(obstacle.angle);

    const spikes = 11;
    for (let i = 0; i < spikes; i += 1) {
      const angle = (Math.PI * 2 * i) / spikes;
      const x = Math.cos(angle) * obstacle.radius;
      const y = Math.sin(angle) * obstacle.radius;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.fillStyle = "#596270";
      ctx.beginPath();
      ctx.moveTo(0, -4.5);
      ctx.lineTo(8.2, 0);
      ctx.lineTo(0, 4.5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    const orb = ctx.createRadialGradient(-4, -5, 2, 0, 0, obstacle.radius - 2);
    orb.addColorStop(0, "#abb3c2");
    orb.addColorStop(1, "#4c5565");
    ctx.fillStyle = orb;
    ctx.beginPath();
    ctx.arc(0, 0, obstacle.radius - 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawObstacles() {
    state.obstacles.forEach(drawObstacle);
  }

  function render(timeMs) {
    ctx.save();
    ctx.clearRect(0, 0, ARENA.width, ARENA.height);

    const shakeStrength = state.effects.shakeStrength;
    if (state.effects.shakeTime > 0 && shakeStrength > 0 && state.profile.options.screenShake) {
      const intensity = shakeStrength * (state.effects.shakeTime / Math.max(0.001, 0.22));
      const offsetX = (Math.random() - 0.5) * intensity;
      const offsetY = (Math.random() - 0.5) * intensity;
      ctx.translate(offsetX, offsetY);
    }

    drawBackdrop();
    drawEnergyLine(timeMs);
    drawDefenderBall(state.defenders[0]);
    drawDefenderBall(state.defenders[1]);
    drawObstacles();
    drawPlayer();
    drawParticles();
    drawAimGuide();
    ctx.restore();
  }

  function frame(now) {
    if (!state.lastTime) {
      state.lastTime = now;
    }

    const dt = Math.min((now - state.lastTime) / 1000, 1 / 24);
    state.lastTime = now;

    update(dt);
    render(now);
    window.requestAnimationFrame(frame);
  }

  dom.canvas.addEventListener("pointerdown", (event) => {
    if (state.overlay !== "none") {
      return;
    }

    const point = pointToCanvas(event);
    beginLaunch(point);
    if (state.aim.active) {
      state.aim.pointerId = event.pointerId;
      state.aim.x = point.x;
      state.aim.y = point.y;
      dom.canvas.setPointerCapture?.(event.pointerId);
    }
  });

  dom.canvas.addEventListener("pointermove", (event) => {
    if (!state.aim.active || event.pointerId !== state.aim.pointerId) {
      return;
    }

    const point = pointToCanvas(event);
    state.aim.x = point.x;
    state.aim.y = point.y;
  });

  function releaseAim(event) {
    if (!state.aim.active || event.pointerId !== state.aim.pointerId) {
      return;
    }

    const point = pointToCanvas(event);
    state.aim.active = false;
    state.aim.pointerId = null;
    launchFromPointer(point);
  }

  dom.canvas.addEventListener("pointerup", releaseAim);
  dom.canvas.addEventListener("pointercancel", (event) => {
    if (state.aim.active && event.pointerId === state.aim.pointerId) {
      state.aim.active = false;
      state.aim.pointerId = null;
    }
  });
  dom.canvas.addEventListener("pointerleave", releaseAim);

  dom.playButton.addEventListener("click", () => {
    startRun();
  });

  dom.shopButton.addEventListener("click", () => {
    beginShop("menu");
  });

  dom.optionsButton.addEventListener("click", () => {
    beginOptions();
  });

  dom.shopBackButton.addEventListener("click", () => {
    setOverlay(state.shopReturn);
    updateCoinDisplays();
  });

  dom.optionsBackButton.addEventListener("click", () => {
    setOverlay("menu");
  });

  dom.shakeToggleButton.addEventListener("click", () => {
    state.profile.options.screenShake = !state.profile.options.screenShake;
    updateShakeToggle();
    saveProfile();
  });

  dom.restartButton.addEventListener("click", () => {
    startRun();
  });

  dom.gameOverShopButton.addEventListener("click", () => {
    beginShop("gameover");
  });

  dom.mainMenuButton.addEventListener("click", () => {
    showMenu();
  });

  updateCoinDisplays();
  updateComboDisplay();
  syncHeartsInstant();
  updateShakeToggle();
  buildShop();
  showMenu();
  window.requestAnimationFrame(frame);
})();
