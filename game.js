(() => {
  "use strict";

  const ARENA = Object.freeze({
    width: 360,
    height: 640,
  });

  const STORAGE_KEY = "lineSliceBallsEndlessSaveV1";
  const MAX_HEARTS = 3;
  const OBSTACLE_UNLOCK_SLICES = 25;
  const SECOND_OBSTACLE_UNLOCK_SLICES = 50;
  const ARROW_UNLOCK_SLICES = 75;
  const SPIKE_MIN_SEPARATION = 160;
  const SPIKE_SPEED_BASE = 80;
  const SPIKE_SPEED_SCALE = 1.35;
  const SPIKE_SPEED_MAX = 230;
  const ARROW_WARNING_DURATION = 0.78;
  const ARROW_MIN_DELAY = 1.9;
  const ARROW_MAX_DELAY = 3.8;
  const ARROW_SPEED_BASE = 420;
  const ARROW_SPEED_SCALE = 3.4;
  const ARROW_RADIUS = 8;
  const ARROW_OFFSCREEN_MARGIN = 42;
  const PLAYER_RADIUS = 14;
  const DEFENDER_RADIUS = 15;
  const DEFENDER_MIN_SEPARATION = DEFENDER_RADIUS * 7;
  const DASH_MIN_DURATION = 0.15;
  const DASH_MAX_DURATION = 0.25;
  const DASH_SPEED = 2200;
  const DASH_COOLDOWN = 0.15;
  const NINJA_CHAIN_WINDOW_MS = 1150;
  const NINJA_CHAIN_REQUIRED = 3;
  const NINJA_EVENT_COOLDOWN_MS = 2200;
  const MAX_DASH_PARTICLES = 20;
  const DASH_PARTICLE_MAX_LIFE = 0.6;

  const SKINS = Object.freeze([
    {
      id: "neon_ninja",
      name: "Neon Ninja",
      theme: "Energy",
      colorPrimary: "#3cff7c",
      colorGlow: "rgba(166, 255, 188, 0.9)",
      particleStyle: "sparkle",
      unlockCost: 0,
      colorSecondary: "#1fca5e",
      outline: "#0f3d2a",
      eyeColor: "#effff5",
      trailColor: "rgba(112, 255, 162, 0.9)",
      accentA: "#bcffd2",
      accentB: "#79efa8",
    },
    {
      id: "fire_ninja",
      name: "Fire Ninja",
      theme: "Fire",
      colorPrimary: "#ff6438",
      colorGlow: "rgba(255, 164, 102, 0.9)",
      particleStyle: "fire",
      unlockCost: 150,
      colorSecondary: "#d83a1e",
      outline: "#5c2218",
      eyeColor: "#fff2cb",
      trailColor: "rgba(255, 118, 76, 0.9)",
      accentA: "#ffd18c",
      accentB: "#ff8f55",
    },
    {
      id: "water_ninja",
      name: "Water Ninja",
      theme: "Water",
      colorPrimary: "#36aaff",
      colorGlow: "rgba(128, 220, 255, 0.9)",
      particleStyle: "water",
      unlockCost: 150,
      colorSecondary: "#1d74d8",
      outline: "#144078",
      eyeColor: "#ecfbff",
      trailColor: "rgba(118, 214, 255, 0.88)",
      accentA: "#b2e8ff",
      accentB: "#74cbff",
    },
    {
      id: "lightning_ninja",
      name: "Lightning Ninja",
      theme: "Lightning",
      colorPrimary: "#303341",
      colorGlow: "rgba(255, 228, 108, 0.95)",
      particleStyle: "lightning",
      unlockCost: 250,
      colorSecondary: "#1f2230",
      outline: "#0e1118",
      eyeColor: "#fff8c5",
      trailColor: "rgba(255, 225, 106, 0.92)",
      accentA: "#ffe27e",
      accentB: "#f6c83b",
    },
    {
      id: "earth_ninja",
      name: "Earth Ninja",
      theme: "Earth",
      colorPrimary: "#7e5b40",
      colorGlow: "rgba(178, 142, 104, 0.86)",
      particleStyle: "earth",
      unlockCost: 250,
      colorSecondary: "#5f432f",
      outline: "#352619",
      eyeColor: "#fff1df",
      trailColor: "rgba(180, 145, 106, 0.88)",
      accentA: "#6e9b56",
      accentB: "#9e7c55",
    },
    {
      id: "blossom_ninja",
      name: "Blossom Ninja",
      theme: "Blossom",
      colorPrimary: "#ff82c0",
      colorGlow: "rgba(255, 198, 227, 0.9)",
      particleStyle: "blossom",
      unlockCost: 300,
      colorSecondary: "#db5ea1",
      outline: "#6e2a4b",
      eyeColor: "#fff2fb",
      trailColor: "rgba(255, 183, 221, 0.9)",
      accentA: "#ffd9ec",
      accentB: "#ffc1de",
    },
  ]);

  const LEGACY_SKIN_MAP = Object.freeze({
    neon_blue: "neon_ninja",
    lava_red: "fire_ninja",
    gold: "earth_ninja",
    plasma_purple: "blossom_ninja",
    toxic_green: "lightning_ninja",
  });

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
    menuRecordText: document.getElementById("menuRecordText"),
    shopWalletText: document.getElementById("shopWalletText"),
    shopItems: document.getElementById("shopItems"),
    finalScore: document.getElementById("finalScore"),
    bestCombo: document.getElementById("bestCombo"),
    coinsEarned: document.getElementById("coinsEarned"),
    recordScore: document.getElementById("recordScore"),
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
      y: ARENA.height - PLAYER_RADIUS,
      vx: 0,
      vy: 0,
      radius: PLAYER_RADIUS,
      wall: "bottom",
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
      target: null,
    },
    shot: {
      active: false,
      sliced: false,
      hitObstacle: false,
      startX: 0,
      startY: 0,
      endX: 0,
      endY: 0,
      duration: 0,
      elapsed: 0,
      cooldown: 0,
      sparkleCooldown: 0,
      afterimageCooldown: 0,
      dashParticlesEmitted: 0,
    },
    run: {
      hearts: MAX_HEARTS,
      score: 0,
      combo: 0,
      bestCombo: 0,
      slices: 0,
      quickSliceChain: 0,
      lastSliceAt: 0,
      lastNinjaAt: -99999,
      coinsEarned: 0,
      difficulty: 0,
      defenderSpeed: 74,
      repositionSpeed: 76,
      lineOscillation: 4,
      spikeSpeed: SPIKE_SPEED_BASE,
      obstacleUnlocked: false,
    },
    obstacles: [],
    arrows: {
      unlocked: false,
      timer: 0,
      preview: null,
      active: null,
    },
    particles: [],
    dashTrail: [],
    afterimages: [],
    attachPulses: [],
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
      records: {
        bestScore: 0,
      },
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
      const validSkinIds = new Set(SKINS.map((skin) => skin.id));
      const ownedSkins = { ...defaults.ownedSkins };

      if (parsed.ownedSkins && typeof parsed.ownedSkins === "object") {
        Object.entries(parsed.ownedSkins).forEach(([rawId, isOwned]) => {
          if (!isOwned) {
            return;
          }

          const migratedId = validSkinIds.has(rawId)
            ? rawId
            : LEGACY_SKIN_MAP[rawId];

          if (migratedId && validSkinIds.has(migratedId)) {
            ownedSkins[migratedId] = true;
          }
        });
      }

      const selectedCandidate = (
        validSkinIds.has(parsed.selectedSkin)
          ? parsed.selectedSkin
          : LEGACY_SKIN_MAP[parsed.selectedSkin]
      );
      const selectedSkin = (
        selectedCandidate && ownedSkins[selectedCandidate]
      )
        ? selectedCandidate
        : SKINS[0].id;
      const bestScore = Number.isFinite(parsed.records?.bestScore)
        ? Math.max(0, Math.floor(parsed.records.bestScore))
        : (
          Number.isFinite(parsed.bestScore)
            ? Math.max(0, Math.floor(parsed.bestScore))
            : defaults.records.bestScore
        );

      return {
        coins: Number.isFinite(parsed.coins) ? Math.max(0, Math.floor(parsed.coins)) : defaults.coins,
        selectedSkin,
        ownedSkins,
        records: {
          bestScore,
        },
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

  function getWallAtPoint(x, y, radius = PLAYER_RADIUS) {
    const epsilon = 0.8;
    const minX = radius;
    const maxX = ARENA.width - radius;
    const minY = radius;
    const maxY = ARENA.height - radius;

    if (Math.abs(y - minY) <= epsilon) {
      return "top";
    }
    if (Math.abs(y - maxY) <= epsilon) {
      return "bottom";
    }
    if (Math.abs(x - minX) <= epsilon) {
      return "left";
    }
    if (Math.abs(x - maxX) <= epsilon) {
      return "right";
    }
    return null;
  }

  function clampToWallBounds(point, radius = PLAYER_RADIUS) {
    const minX = radius;
    const maxX = ARENA.width - radius;
    const minY = radius;
    const maxY = ARENA.height - radius;
    point.x = clamp(point.x, minX, maxX);
    point.y = clamp(point.y, minY, maxY);
    point.wall = getWallAtPoint(point.x, point.y, radius) ?? point.wall ?? "bottom";
    return point;
  }

  function rayToWallTarget(start, direction, radius = PLAYER_RADIUS) {
    const minX = radius;
    const maxX = ARENA.width - radius;
    const minY = radius;
    const maxY = ARENA.height - radius;
    const epsilon = 0.0001;
    const candidates = [];

    if (Math.abs(direction.x) > epsilon) {
      const tMinX = (minX - start.x) / direction.x;
      const yAtMinX = start.y + (direction.y * tMinX);
      if (tMinX > epsilon && yAtMinX >= minY - epsilon && yAtMinX <= maxY + epsilon) {
        candidates.push({ t: tMinX, x: minX, y: yAtMinX, wall: "left" });
      }

      const tMaxX = (maxX - start.x) / direction.x;
      const yAtMaxX = start.y + (direction.y * tMaxX);
      if (tMaxX > epsilon && yAtMaxX >= minY - epsilon && yAtMaxX <= maxY + epsilon) {
        candidates.push({ t: tMaxX, x: maxX, y: yAtMaxX, wall: "right" });
      }
    }

    if (Math.abs(direction.y) > epsilon) {
      const tMinY = (minY - start.y) / direction.y;
      const xAtMinY = start.x + (direction.x * tMinY);
      if (tMinY > epsilon && xAtMinY >= minX - epsilon && xAtMinY <= maxX + epsilon) {
        candidates.push({ t: tMinY, x: xAtMinY, y: minY, wall: "top" });
      }

      const tMaxY = (maxY - start.y) / direction.y;
      const xAtMaxY = start.x + (direction.x * tMaxY);
      if (tMaxY > epsilon && xAtMaxY >= minX - epsilon && xAtMaxY <= maxX + epsilon) {
        candidates.push({ t: tMaxY, x: xAtMaxY, y: maxY, wall: "bottom" });
      }
    }

    if (!candidates.length) {
      return null;
    }

    candidates.sort((a, b) => a.t - b.t);
    return clampToWallBounds({
      x: candidates[0].x,
      y: candidates[0].y,
      wall: candidates[0].wall,
    }, radius);
  }

  function resolveDashTargetFromSwipe(point) {
    const swipe = normalize(point.x - state.player.x, point.y - state.player.y);
    if (Math.abs(swipe.x) < 0.0001 && Math.abs(swipe.y) < 0.0001) {
      return null;
    }

    const start = { x: state.player.x, y: state.player.y };
    let target = rayToWallTarget(start, swipe, state.player.radius);
    if (!target) {
      target = rayToWallTarget(start, { x: -swipe.x, y: -swipe.y }, state.player.radius);
    }
    return target;
  }

  function distancePointToSegment(px, py, ax, ay, bx, by) {
    const abx = bx - ax;
    const aby = by - ay;
    const lengthSq = (abx * abx) + (aby * aby);

    if (lengthSq <= 0.000001) {
      return Math.hypot(px - ax, py - ay);
    }

    const apx = px - ax;
    const apy = py - ay;
    const t = clamp(((apx * abx) + (apy * aby)) / lengthSq, 0, 1);
    const closestX = ax + (abx * t);
    const closestY = ay + (aby * t);
    return Math.hypot(px - closestX, py - closestY);
  }

  function segmentHitsObstacle(a, b, obstacle, extraRadius) {
    const hitDistance = obstacle.radius + extraRadius;
    return distancePointToSegment(obstacle.x, obstacle.y, a.x, a.y, b.x, b.y) <= hitDistance;
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
    const bestScore = Math.max(0, Math.floor(state.profile.records?.bestScore ?? 0));
    if (dom.menuRecordText) {
      dom.menuRecordText.textContent = `Record: ${bestScore}`;
    }
    if (dom.recordScore && state.overlay !== "gameover") {
      dom.recordScore.textContent = String(bestScore);
    }
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
      swatch.style.background = skin.colorPrimary;
      swatch.style.boxShadow = `0 0 10px ${skin.colorGlow}`;

      const meta = document.createElement("div");
      meta.className = "shop-meta";

      const title = document.createElement("strong");
      title.textContent = skin.name;
      const subtitle = document.createElement("span");

      const owned = Boolean(state.profile.ownedSkins[skin.id]);
      const equipped = state.profile.selectedSkin === skin.id;
      subtitle.textContent = skin.unlockCost === 0
        ? `${skin.theme} | Starter`
        : `${skin.theme} | ${skin.unlockCost} coins`;
      meta.append(title, subtitle);

      const action = document.createElement("button");

      if (equipped) {
        action.textContent = "Equipped";
        action.className = "equipped";
        action.disabled = true;
      } else if (owned) {
        action.textContent = "Select";
      } else {
        action.textContent = `${skin.unlockCost} Coins`;
        action.className = "locked";
      }

      action.addEventListener("click", () => {
        const currentlyOwned = Boolean(state.profile.ownedSkins[skin.id]);

        if (!currentlyOwned) {
          if (state.profile.coins < skin.unlockCost) {
            setShopMessage("Not enough coins", "error");
            return;
          }

          state.profile.coins -= skin.unlockCost;
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
    } else if (kind === "ninja") {
      dom.centerBanner.style.background = "rgba(56, 210, 255, 0.9)";
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

  function triggerWholeScreenVibration() {
    document.body.classList.remove("ninja-vibe");
    void document.body.offsetWidth;
    document.body.classList.add("ninja-vibe");
    window.setTimeout(() => {
      document.body.classList.remove("ninja-vibe");
    }, 370);

    try {
      if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
        navigator.vibrate([65, 45, 65]);
      }
    } catch {
      // Ignore vibrate API restrictions.
    }
  }

  function triggerNinjaSkills() {
    triggerShake(0.42, 15);
    triggerFlash("rgba(120, 233, 255, 0.7)", 1, 0.2);
    triggerWholeScreenVibration();
    showBanner("NINJA SKILLS", "ninja");
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

  function createDashParticle(skin) {
    const player = state.player;
    const move = normalize(player.vx, player.vy);
    const angleJitter = (Math.random() - 0.5) * 1.05;
    const reverseAngle = Math.atan2(-move.y, -move.x) + angleJitter;
    const style = skin.particleStyle;
    const particleSpeed = random(28, 98);
    const lifeCap = DASH_PARTICLE_MAX_LIFE;

    const base = {
      x: player.x + random(-4, 4),
      y: player.y + random(-4, 4),
      vx: Math.cos(reverseAngle) * particleSpeed,
      vy: Math.sin(reverseAngle) * particleSpeed,
      life: 0.2,
      maxLife: 0.2,
      size: random(1.1, 2.1),
      color: skin.colorGlow,
      shape: "circle",
      rotation: random(0, Math.PI * 2),
      spin: random(-6, 6),
      stretch: 1,
      drag: 0.95,
      gravity: 0,
    };

    if (style === "fire") {
      base.life = random(0.22, 0.46);
      base.maxLife = base.life;
      base.size = random(1.2, 2.8);
      base.color = Math.random() < 0.5 ? skin.accentA : skin.accentB;
      base.shape = "ember";
      base.drag = 0.92;
      base.gravity = -10;
    } else if (style === "water") {
      base.life = random(0.2, 0.44);
      base.maxLife = base.life;
      base.size = random(1.4, 2.6);
      base.color = Math.random() < 0.6 ? skin.accentA : skin.colorGlow;
      base.shape = "droplet";
      base.stretch = 1.35;
      base.drag = 0.94;
      base.gravity = 36;
    } else if (style === "lightning") {
      base.life = random(0.12, 0.24);
      base.maxLife = base.life;
      base.size = random(1, 2.1);
      base.color = skin.accentA;
      base.shape = "spark";
      base.stretch = 1.45;
      base.drag = 0.9;
    } else if (style === "earth") {
      base.life = random(0.22, 0.48);
      base.maxLife = base.life;
      base.size = random(1.6, 3);
      base.color = Math.random() < 0.4 ? skin.accentA : skin.accentB;
      base.shape = "shard";
      base.drag = 0.93;
      base.gravity = 42;
    } else if (style === "blossom") {
      base.life = random(0.26, 0.5);
      base.maxLife = base.life;
      base.size = random(1.6, 2.8);
      base.color = Math.random() < 0.5 ? skin.accentA : skin.accentB;
      base.shape = "petal";
      base.stretch = random(1.25, 1.6);
      base.drag = 0.95;
      base.gravity = 24;
    } else {
      base.life = random(0.14, 0.3);
      base.maxLife = base.life;
      base.size = random(1, 2.1);
      base.color = Math.random() < 0.5 ? skin.accentA : skin.colorGlow;
      base.shape = "sparkle";
      base.drag = 0.95;
    }

    base.life = Math.min(base.life, lifeCap);
    base.maxLife = Math.min(base.maxLife, lifeCap);
    return base;
  }

  function emitDashParticles() {
    const player = state.player;
    const speed = Math.hypot(player.vx, player.vy);
    if (speed < 30) {
      return;
    }

    const remaining = MAX_DASH_PARTICLES - state.shot.dashParticlesEmitted;
    if (remaining <= 0) {
      return;
    }

    const skin = getActiveSkin();
    let spawnCount = 1;
    if (skin.particleStyle === "fire" || skin.particleStyle === "water") {
      spawnCount = 2;
    }
    spawnCount = Math.min(spawnCount, remaining);

    for (let i = 0; i < spawnCount; i += 1) {
      spawnParticle(createDashParticle(skin));
      state.shot.dashParticlesEmitted += 1;
    }
  }

  function chooseDefenderPair() {
    for (let attempts = 0; attempts < 90; attempts += 1) {
      const first = {
        x: random(44, ARENA.width - 44),
        y: random(44, ARENA.height - 44),
      };
      const second = {
        x: random(44, ARENA.width - 44),
        y: random(44, ARENA.height - 44),
      };

      if (distance(first.x, first.y, second.x, second.y) >= DEFENDER_MIN_SEPARATION) {
        return [first, second];
      }
    }

    return [
      { x: ARENA.width * 0.32, y: ARENA.height * 0.35 },
      { x: ARENA.width * 0.68, y: ARENA.height * 0.65 },
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
    enforceDefenderSeparation();
  }

  function chooseWanderTarget(index) {
    const other = state.defenders[index === 0 ? 1 : 0];

    for (let attempts = 0; attempts < 60; attempts += 1) {
      const x = random(38, ARENA.width - 38);
      const y = random(38, ARENA.height - 38);

      if (distance(x, y, other.targetX ?? other.x, other.targetY ?? other.y) < DEFENDER_MIN_SEPARATION) {
        continue;
      }

      return { x, y };
    }

    return {
      x: index === 0 ? ARENA.width * 0.3 : ARENA.width * 0.7,
      y: random(38, ARENA.height - 38),
    };
  }

  function enforceDefenderSeparation() {
    const first = state.defenders[0];
    const second = state.defenders[1];
    let dx = second.x - first.x;
    let dy = second.y - first.y;
    let gap = Math.hypot(dx, dy);

    if (gap >= DEFENDER_MIN_SEPARATION) {
      return;
    }

    if (gap < 0.0001) {
      gap = 0.0001;
      dx = 1;
      dy = 0;
    }

    const nx = dx / gap;
    const ny = dy / gap;
    const overlap = DEFENDER_MIN_SEPARATION - gap;
    const pushX = nx * (overlap / 2);
    const pushY = ny * (overlap / 2);

    first.x -= pushX;
    first.y -= pushY;
    second.x += pushX;
    second.y += pushY;

    first.x = clamp(first.x, first.radius, ARENA.width - first.radius);
    first.y = clamp(first.y, first.radius, ARENA.height - first.radius);
    second.x = clamp(second.x, second.radius, ARENA.width - second.radius);
    second.y = clamp(second.y, second.radius, ARENA.height - second.radius);
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

  function attachPlayerToWall(x, y, wall = null) {
    state.player.x = x;
    state.player.y = y;
    state.player.vx = 0;
    state.player.vy = 0;
    state.player.wall = wall ?? getWallAtPoint(x, y, state.player.radius) ?? state.player.wall ?? "bottom";
  }

  function resetPlayerToStartWall() {
    attachPlayerToWall(ARENA.width / 2, ARENA.height - state.player.radius, "bottom");
  }

  function updateDifficulty() {
    const d = state.run.slices;
    state.run.difficulty = d;
    state.run.defenderSpeed = 72 + Math.min(180, d * 1.55);
    state.run.repositionSpeed = 74 + Math.min(195, d * 1.75);
    state.run.lineOscillation = 4 + Math.min(24, d * 0.13);
    state.run.spikeSpeed = SPIKE_SPEED_BASE + Math.min(SPIKE_SPEED_MAX - SPIKE_SPEED_BASE, d * SPIKE_SPEED_SCALE);
  }

  function getSpikeSeparation(radiusA, radiusB) {
    const bySize = Math.max(radiusA, radiusB) * 8;
    return Math.max(SPIKE_MIN_SEPARATION, bySize);
  }

  function randomSpikeVelocity(speed) {
    const angle = random(0, Math.PI * 2);
    return {
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
    };
  }

  function createObstacle(index, existingObstacles = state.obstacles) {
    const radius = 19 + (index * 1.8);

    for (let attempts = 0; attempts < 70; attempts += 1) {
      const x = random(radius + 14, ARENA.width - radius - 14);
      const y = random(radius + 14, ARENA.height - radius - 14);

      const tooClose = existingObstacles.some((other) => {
        return distance(x, y, other.x, other.y) < getSpikeSeparation(radius, other.radius);
      });

      if (tooClose) {
        continue;
      }

      const speed = random(state.run.spikeSpeed * 0.9, state.run.spikeSpeed * 1.08);
      const velocity = randomSpikeVelocity(speed);
      return {
        x,
        y,
        vx: velocity.vx,
        vy: velocity.vy,
        radius,
        angle: random(0, Math.PI * 2),
        spin: random(-1.3, 1.3),
      };
    }

    const fallbackX = index === 0 ? ARENA.width * 0.22 : ARENA.width * 0.78;
    const fallbackY = index === 0 ? ARENA.height * 0.24 : ARENA.height * 0.76;
    const fallbackVelocity = randomSpikeVelocity(state.run.spikeSpeed);
    return {
      x: clamp(fallbackX, radius + 8, ARENA.width - radius - 8),
      y: clamp(fallbackY, radius + 8, ARENA.height - radius - 8),
      vx: fallbackVelocity.vx,
      vy: fallbackVelocity.vy,
      radius,
      angle: 0,
      spin: 0.7,
    };
  }

  function unlockObstaclesIfNeeded() {
    if (state.run.slices >= OBSTACLE_UNLOCK_SLICES && state.obstacles.length === 0) {
      state.run.obstacleUnlocked = true;
      state.obstacles.push(createObstacle(0, []));
      showBanner("SPIKE ONLINE", "warn");
    }

    if (state.run.slices >= SECOND_OBSTACLE_UNLOCK_SLICES && state.obstacles.length === 1) {
      state.obstacles.push(createObstacle(1, state.obstacles));
      showBanner("DOUBLE SPIKES", "warn");
    }
  }

  function nextArrowDelay() {
    const pressure = Math.min(1.25, state.run.slices * 0.009);
    const minDelay = Math.max(0.95, ARROW_MIN_DELAY - (pressure * 0.4));
    const maxDelay = Math.max(minDelay + 0.25, ARROW_MAX_DELAY - pressure);
    return random(minDelay, maxDelay);
  }

  function createArrowLane() {
    const inset = 22;

    for (let attempts = 0; attempts < 18; attempts += 1) {
      const horizontal = Math.random() < 0.5;
      const forward = Math.random() < 0.5;
      let lane;

      if (horizontal) {
        const y = random(inset, ARENA.height - inset);
        lane = {
          warningStartX: 4,
          warningStartY: y,
          warningEndX: ARENA.width - 4,
          warningEndY: y,
          startX: forward ? -ARROW_OFFSCREEN_MARGIN : ARENA.width + ARROW_OFFSCREEN_MARGIN,
          startY: y,
          endX: forward ? ARENA.width + ARROW_OFFSCREEN_MARGIN : -ARROW_OFFSCREEN_MARGIN,
          endY: y,
        };
      } else {
        const x = random(inset, ARENA.width - inset);
        lane = {
          warningStartX: x,
          warningStartY: 4,
          warningEndX: x,
          warningEndY: ARENA.height - 4,
          startX: x,
          startY: forward ? -ARROW_OFFSCREEN_MARGIN : ARENA.height + ARROW_OFFSCREEN_MARGIN,
          endX: x,
          endY: forward ? ARENA.height + ARROW_OFFSCREEN_MARGIN : -ARROW_OFFSCREEN_MARGIN,
        };
      }

      const playerDistance = distancePointToSegment(
        state.player.x,
        state.player.y,
        lane.warningStartX,
        lane.warningStartY,
        lane.warningEndX,
        lane.warningEndY,
      );
      if (playerDistance < (state.player.radius + 22) && attempts < 17) {
        continue;
      }

      return lane;
    }

    return {
      warningStartX: 4,
      warningStartY: ARENA.height * 0.5,
      warningEndX: ARENA.width - 4,
      warningEndY: ARENA.height * 0.5,
      startX: -ARROW_OFFSCREEN_MARGIN,
      startY: ARENA.height * 0.5,
      endX: ARENA.width + ARROW_OFFSCREEN_MARGIN,
      endY: ARENA.height * 0.5,
    };
  }

  function startArrowWarning() {
    state.arrows.preview = {
      lane: createArrowLane(),
      timeLeft: ARROW_WARNING_DURATION,
    };
  }

  function spawnArrowFromWarning(preview) {
    const lane = preview.lane;
    const dir = normalize(lane.endX - lane.startX, lane.endY - lane.startY);
    const speed = ARROW_SPEED_BASE + Math.min(280, state.run.slices * ARROW_SPEED_SCALE);
    state.arrows.active = {
      x: lane.startX,
      y: lane.startY,
      prevX: lane.startX,
      prevY: lane.startY,
      vx: dir.x * speed,
      vy: dir.y * speed,
      dirX: dir.x,
      dirY: dir.y,
      angle: Math.atan2(dir.y, dir.x),
      radius: ARROW_RADIUS,
      travelled: 0,
      maxTravel: distance(lane.startX, lane.startY, lane.endX, lane.endY) + 30,
    };
  }

  function unlockArrowHazardsIfNeeded() {
    if (state.arrows.unlocked || state.run.slices < ARROW_UNLOCK_SLICES) {
      return;
    }

    state.arrows.unlocked = true;
    state.arrows.timer = random(0.65, 1.15);
    showBanner("ARROWS INBOUND", "warn");
  }

  function handleArrowHit(hitPoint = null) {
    const impact = hitPoint ?? { x: state.player.x, y: state.player.y };
    emitSliceSparks(impact, "rgba(255, 180, 122, 0.95)", 15);
    triggerFlash("rgba(255, 136, 97, 0.55)", 0.92, 0.16);
    triggerShake(0.17, 7);

    state.arrows.active = null;
    state.arrows.timer = nextArrowDelay();

    if (state.shot.active) {
      state.shot.hitObstacle = true;
      finalizeShot(true);
      showBanner("ARROW HIT", "miss");
      return;
    }

    loseHeart();
    showBanner("ARROW HIT", "miss");
    if (state.run.hearts <= 0) {
      window.setTimeout(() => {
        enterGameOver();
      }, 260);
    }
  }

  function signedSide(point, lineA, lineB) {
    const normalX = -(lineB.y - lineA.y);
    const normalY = lineB.x - lineA.x;
    return ((point.x - lineA.x) * normalX) + ((point.y - lineA.y) * normalY);
  }

  function signedDistanceToLine(point, lineA, lineB) {
    const dx = lineB.x - lineA.x;
    const dy = lineB.y - lineA.y;
    const length = Math.hypot(dx, dy);

    if (length < 0.000001) {
      return 0;
    }

    const normalX = -dy / length;
    const normalY = dx / length;
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
    const lineA = { x: state.defenders[0].x, y: state.defenders[0].y };
    const lineB = { x: state.defenders[1].x, y: state.defenders[1].y };
    return segmentIntersection(previous, next, lineA, lineB) || null;
  }

  function getDefenderSegmentSnapshot() {
    return {
      ax: state.defenders[0].x,
      ay: state.defenders[0].y,
      bx: state.defenders[1].x,
      by: state.defenders[1].y,
    };
  }

  function detectSliceDynamic(previous, next, linePrevious, lineCurrent) {
    const prevLine = linePrevious ?? lineCurrent ?? getDefenderSegmentSnapshot();
    const currLine = lineCurrent ?? prevLine;
    const staticHit = segmentIntersection(
      previous,
      next,
      { x: currLine.ax, y: currLine.ay },
      { x: currLine.bx, y: currLine.by },
    );

    if (staticHit) {
      return staticHit;
    }

    const sampleCount = 7;
    let prevSamplePoint = { x: previous.x, y: previous.y };
    let prevLineA = { x: prevLine.ax, y: prevLine.ay };
    let prevLineB = { x: prevLine.bx, y: prevLine.by };

    for (let i = 1; i <= sampleCount; i += 1) {
      const t = i / sampleCount;
      const samplePoint = {
        x: lerp(previous.x, next.x, t),
        y: lerp(previous.y, next.y, t),
      };
      const lineA = {
        x: lerp(prevLine.ax, currLine.ax, t),
        y: lerp(prevLine.ay, currLine.ay, t),
      };
      const lineB = {
        x: lerp(prevLine.bx, currLine.bx, t),
        y: lerp(prevLine.by, currLine.by, t),
      };
      const impact = (
        segmentIntersection(prevSamplePoint, samplePoint, lineA, lineB) ||
        segmentIntersection(prevSamplePoint, samplePoint, prevLineA, prevLineB)
      );

      if (impact) {
        return impact;
      }

      prevSamplePoint = samplePoint;
      prevLineA = lineA;
      prevLineB = lineB;
    }

    return null;
  }

  function loseHeart() {
    if (state.run.hearts <= 0) {
      return;
    }

    state.run.hearts -= 1;
    state.run.combo = 0;
    state.run.quickSliceChain = 0;
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

    state.run.score += 1;
    state.run.combo += 1;
    state.run.bestCombo = Math.max(state.run.bestCombo, state.run.combo);
    state.run.slices += 1;
    const now = performance.now();
    if ((now - state.run.lastSliceAt) <= NINJA_CHAIN_WINDOW_MS) {
      state.run.quickSliceChain += 1;
    } else {
      state.run.quickSliceChain = 1;
    }
    state.run.lastSliceAt = now;
    state.run.coinsEarned += 1;
    state.profile.coins += 1;

    saveProfile();
    updateCoinDisplays();
    updateComboDisplay(true);
    updateDifficulty();
    unlockObstaclesIfNeeded();
    unlockArrowHazardsIfNeeded();
    restoreHeartIfEligible();

    const lineMidpoint = impactPoint ?? {
      x: (state.defenders[0].x + state.defenders[1].x) / 2,
      y: (state.defenders[0].y + state.defenders[1].y) / 2,
    };

    emitSliceSparks(lineMidpoint, "rgba(237, 249, 255, 0.95)", 18);
    state.effects.lineVibration = 11 + (state.run.lineOscillation * 0.9);
    state.effects.lineFlash = 1;
    triggerShake(0.22, 8 + (state.run.difficulty * 0.04));
    triggerFlash("rgba(255, 255, 255, 0.65)", 0.9, 0.12);
    const ninjaReady = (
      state.run.quickSliceChain >= NINJA_CHAIN_REQUIRED &&
      (now - state.run.lastNinjaAt) >= NINJA_EVENT_COOLDOWN_MS
    );

    if (ninjaReady) {
      state.run.lastNinjaAt = now;
      triggerNinjaSkills();
    } else {
      showBanner("SLICE!", "slice");
    }
  }

  function enterGameOver() {
    state.inRun = false;
    state.canShoot = false;
    state.shot.active = false;
    state.aim.active = false;

    const previousRecord = Math.max(0, Math.floor(state.profile.records?.bestScore ?? 0));
    const isNewRecord = state.run.score > previousRecord;
    const recordScore = isNewRecord ? state.run.score : previousRecord;
    if (isNewRecord) {
      state.profile.records = {
        ...(state.profile.records ?? {}),
        bestScore: recordScore,
      };
      saveProfile();
    }

    dom.finalScore.textContent = String(state.run.score);
    dom.bestCombo.textContent = `${state.run.bestCombo}x`;
    dom.coinsEarned.textContent = String(state.run.coinsEarned);
    if (dom.recordScore) {
      dom.recordScore.textContent = String(recordScore);
    }

    setOverlay("gameover");
    updateCoinDisplays();
    if (isNewRecord) {
      showBanner("NEW RECORD", "slice");
    }
  }

  function finalizeShot(missed) {
    const landingPoint = clampToWallBounds({
      x: state.shot.endX,
      y: state.shot.endY,
      wall: getWallAtPoint(state.shot.endX, state.shot.endY, state.player.radius),
    }, state.player.radius);

    attachPlayerToWall(landingPoint.x, landingPoint.y, landingPoint.wall);
    state.shot.active = false;
    state.shot.elapsed = 0;
    state.shot.duration = 0;
    state.shot.cooldown = DASH_COOLDOWN;
    state.shot.hitObstacle = false;
    state.canShoot = false;

    state.attachPulses.push({
      x: state.player.x,
      y: state.player.y,
      life: 0.18,
      maxLife: 0.18,
      radius: state.player.radius * 0.7,
      maxRadius: state.player.radius * 2.5,
      color: getActiveSkin().colorGlow,
    });

    if (missed) {
      loseHeart();
      if (state.run.hearts <= 0) {
        window.setTimeout(() => {
          enterGameOver();
        }, 260);
        return;
      }
    }
  }

  function startRun() {
    state.inRun = true;
    state.run.hearts = MAX_HEARTS;
    state.run.score = 0;
    state.run.combo = 0;
    state.run.bestCombo = 0;
    state.run.slices = 0;
    state.run.quickSliceChain = 0;
    state.run.lastSliceAt = 0;
    state.run.lastNinjaAt = -99999;
    state.run.coinsEarned = 0;
    state.run.obstacleUnlocked = false;
    state.obstacles = [];
    state.arrows.unlocked = false;
    state.arrows.timer = 0;
    state.arrows.preview = null;
    state.arrows.active = null;
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
    state.shot.hitObstacle = false;
    state.shot.elapsed = 0;
    state.shot.duration = 0;
    state.shot.cooldown = 0;
    state.shot.dashParticlesEmitted = 0;
    state.aim.active = false;
    updateDifficulty();
    setDefendersToPair(chooseDefenderPair());
    planDefenderReposition();
    resetPlayerToStartWall();
    state.dashTrail.length = 0;
    state.afterimages.length = 0;
    state.attachPulses.length = 0;
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
    if (!state.inRun || !state.canShoot || state.shot.active || state.shot.cooldown > 0) {
      return;
    }

    state.aim.active = true;
    state.aim.x = pointerPoint.x;
    state.aim.y = pointerPoint.y;
    state.aim.target = resolveDashTargetFromSwipe(pointerPoint);
  }

  function launchFromPointer(pointerPoint) {
    const dragDistance = Math.hypot(pointerPoint.x - state.player.x, pointerPoint.y - state.player.y);
    if (dragDistance < 8) {
      return;
    }

    const target = resolveDashTargetFromSwipe(pointerPoint);

    if (!target) {
      return;
    }

    const dashDistance = distance(state.player.x, state.player.y, target.x, target.y);
    const duration = clamp(dashDistance / DASH_SPEED, DASH_MIN_DURATION, DASH_MAX_DURATION);

    state.shot.active = true;
    state.shot.sliced = false;
    state.shot.hitObstacle = false;
    state.shot.startX = state.player.x;
    state.shot.startY = state.player.y;
    state.shot.endX = target.x;
    state.shot.endY = target.y;
    state.shot.duration = duration;
    state.shot.elapsed = 0;
    state.shot.cooldown = 0;
    state.shot.sparkleCooldown = 0;
    state.shot.afterimageCooldown = 0;
    state.shot.dashParticlesEmitted = 0;
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

    enforceDefenderSeparation();
  }

  function updateObstacles(dt) {
    if (!state.run.obstacleUnlocked || !state.obstacles.length) {
      return;
    }

    const targetSpikeSpeed = state.run.spikeSpeed;
    state.obstacles.forEach((obstacle) => {
      const direction = normalize(obstacle.vx, obstacle.vy);
      if (direction.x === 0 && direction.y === 0) {
        const angle = random(0, Math.PI * 2);
        obstacle.vx = Math.cos(angle) * targetSpikeSpeed;
        obstacle.vy = Math.sin(angle) * targetSpikeSpeed;
      } else {
        const currentSpeed = Math.hypot(obstacle.vx, obstacle.vy);
        const speedBlend = Math.min(1, dt * 3.8);
        const blendedSpeed = currentSpeed + ((targetSpikeSpeed - currentSpeed) * speedBlend);
        obstacle.vx = direction.x * blendedSpeed;
        obstacle.vy = direction.y * blendedSpeed;
      }

      obstacle.x += obstacle.vx * dt;
      obstacle.y += obstacle.vy * dt;
      obstacle.angle += obstacle.spin * dt;

      if (obstacle.x < obstacle.radius || obstacle.x > ARENA.width - obstacle.radius) {
        obstacle.vx *= -1;
        obstacle.x = clamp(obstacle.x, obstacle.radius, ARENA.width - obstacle.radius);
      }

      if (obstacle.y < obstacle.radius || obstacle.y > ARENA.height - obstacle.radius) {
        obstacle.vy *= -1;
        obstacle.y = clamp(obstacle.y, obstacle.radius, ARENA.height - obstacle.radius);
      }
    });

    if (state.obstacles.length >= 2) {
      for (let i = 0; i < state.obstacles.length; i += 1) {
        for (let j = i + 1; j < state.obstacles.length; j += 1) {
          const first = state.obstacles[i];
          const second = state.obstacles[j];
          let dx = second.x - first.x;
          let dy = second.y - first.y;
          let gap = Math.hypot(dx, dy);
          const minGap = getSpikeSeparation(first.radius, second.radius);

          if (gap >= minGap) {
            continue;
          }

          if (gap < 0.0001) {
            gap = 0.0001;
            dx = 1;
            dy = 0;
          }

          const nx = dx / gap;
          const ny = dy / gap;
          const overlap = minGap - gap;
          const pushX = nx * (overlap / 2);
          const pushY = ny * (overlap / 2);

          first.x -= pushX;
          first.y -= pushY;
          second.x += pushX;
          second.y += pushY;

          first.vx -= nx * 20;
          first.vy -= ny * 20;
          second.vx += nx * 20;
          second.vy += ny * 20;

          first.x = clamp(first.x, first.radius, ARENA.width - first.radius);
          first.y = clamp(first.y, first.radius, ARENA.height - first.radius);
          second.x = clamp(second.x, second.radius, ARENA.width - second.radius);
          second.y = clamp(second.y, second.radius, ARENA.height - second.radius);
        }
      }
    }
  }

  function updateArrows(dt) {
    if (!state.inRun || !state.arrows.unlocked) {
      return;
    }

    if (state.arrows.preview) {
      state.arrows.preview.timeLeft -= dt;
      if (state.arrows.preview.timeLeft <= 0) {
        spawnArrowFromWarning(state.arrows.preview);
        state.arrows.preview = null;
      }
      return;
    }

    if (state.arrows.active) {
      const arrow = state.arrows.active;
      arrow.prevX = arrow.x;
      arrow.prevY = arrow.y;
      const stepX = arrow.vx * dt;
      const stepY = arrow.vy * dt;
      arrow.x += stepX;
      arrow.y += stepY;
      arrow.travelled += Math.hypot(stepX, stepY);

      const hitDistance = state.player.radius + arrow.radius;
      const playerHit = distancePointToSegment(
        state.player.x,
        state.player.y,
        arrow.prevX,
        arrow.prevY,
        arrow.x,
        arrow.y,
      ) <= hitDistance;

      if (playerHit) {
        handleArrowHit();
        return;
      }

      if (arrow.travelled >= arrow.maxTravel) {
        state.arrows.active = null;
      }
      return;
    }

    state.arrows.timer -= dt;
    if (state.arrows.timer <= 0) {
      startArrowWarning();
      state.arrows.timer = nextArrowDelay();
    }
  }

  function updateShot(dt, linePrevious, lineCurrent) {
    if (!state.shot.active) {
      return;
    }

    const previous = { x: state.player.x, y: state.player.y };
    state.shot.elapsed = Math.min(state.shot.duration, state.shot.elapsed + dt);
    const t = state.shot.duration > 0 ? state.shot.elapsed / state.shot.duration : 1;
    state.player.x = lerp(state.shot.startX, state.shot.endX, t);
    state.player.y = lerp(state.shot.startY, state.shot.endY, t);
    state.player.vx = (state.shot.endX - state.shot.startX) / Math.max(0.0001, state.shot.duration);
    state.player.vy = (state.shot.endY - state.shot.startY) / Math.max(0.0001, state.shot.duration);

    state.dashTrail.push({
      ax: previous.x,
      ay: previous.y,
      bx: state.player.x,
      by: state.player.y,
      life: 0.2,
      maxLife: 0.2,
      color: getActiveSkin().trailColor,
      style: getActiveSkin().particleStyle,
    });
    if (state.dashTrail.length > 80) {
      state.dashTrail.splice(0, state.dashTrail.length - 80);
    }

    state.shot.sparkleCooldown -= dt;
    if (state.shot.sparkleCooldown <= 0) {
      emitDashParticles();
      const style = getActiveSkin().particleStyle;
      state.shot.sparkleCooldown = style === "lightning" ? 0.008 : 0.012;
    }

    state.shot.afterimageCooldown -= dt;
    if (state.shot.afterimageCooldown <= 0) {
      state.afterimages.push({
        x: state.player.x,
        y: state.player.y,
        life: 0.12,
        maxLife: 0.12,
        radius: state.player.radius,
        color: getActiveSkin().colorGlow,
      });
      if (state.afterimages.length > 40) {
        state.afterimages.splice(0, state.afterimages.length - 40);
      }
      state.shot.afterimageCooldown = 0.018;
    }

    if (!state.shot.sliced) {
      const sliceImpact = detectSliceDynamic(previous, state.player, linePrevious, lineCurrent);
      if (sliceImpact) {
        onSlice(sliceImpact);
      }
    }

    if (!state.shot.sliced && state.run.obstacleUnlocked && !state.shot.hitObstacle) {
      const obstacleHit = state.obstacles.some((obstacle) => {
        return segmentHitsObstacle(
          previous,
          { x: state.player.x, y: state.player.y },
          obstacle,
          state.player.radius,
        );
      });

      if (obstacleHit) {
        state.shot.hitObstacle = true;
        emitSliceSparks({ x: state.player.x, y: state.player.y }, "rgba(211, 123, 123, 0.9)", 14);
        showBanner("SPIKE HIT", "miss");
      }
    }

    if (!state.shot.hitObstacle && state.arrows.active) {
      const arrow = state.arrows.active;
      const dashSegmentEnd = { x: state.player.x, y: state.player.y };
      const arrowDashHit = (
        distancePointToSegment(
          arrow.x,
          arrow.y,
          previous.x,
          previous.y,
          dashSegmentEnd.x,
          dashSegmentEnd.y,
        ) <= (state.player.radius + arrow.radius) ||
        distancePointToSegment(
          arrow.prevX,
          arrow.prevY,
          previous.x,
          previous.y,
          dashSegmentEnd.x,
          dashSegmentEnd.y,
        ) <= (state.player.radius + arrow.radius) ||
        Boolean(segmentIntersection(
          previous,
          dashSegmentEnd,
          { x: arrow.prevX, y: arrow.prevY },
          { x: arrow.x, y: arrow.y },
        ))
      );

      if (arrowDashHit) {
        handleArrowHit({
          x: (state.player.x + arrow.x) * 0.5,
          y: (state.player.y + arrow.y) * 0.5,
        });
        return;
      }
    }

    if (state.shot.elapsed >= state.shot.duration || state.shot.hitObstacle) {
      finalizeShot(!state.shot.sliced || state.shot.hitObstacle);
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
      particle.rotation = (particle.rotation ?? 0) + ((particle.spin ?? 0) * dt);
      if (particle.gravity) {
        particle.vy += particle.gravity * dt;
      }

      const drag = Number.isFinite(particle.drag) ? particle.drag : 0.96;
      particle.vx *= drag;
      particle.vy *= drag;
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

    state.dashTrail = state.dashTrail.filter((trail) => {
      trail.life -= dt;
      return trail.life > 0;
    });

    state.afterimages = state.afterimages.filter((ghost) => {
      ghost.life -= dt;
      return ghost.life > 0;
    });

    state.attachPulses = state.attachPulses.filter((pulse) => {
      pulse.life -= dt;
      return pulse.life > 0;
    });
  }

  function update(dt) {
    updateEffects(dt);

    if (state.shot.cooldown > 0) {
      state.shot.cooldown = Math.max(0, state.shot.cooldown - dt);
      if (state.shot.cooldown <= 0 && state.inRun && !state.shot.active) {
        state.canShoot = true;
      }
    }

    if (!state.inRun) {
      updateParticles(dt);
      return;
    }

    const lineBeforeMove = getDefenderSegmentSnapshot();
    updateReposition(dt);
    const lineAfterMove = getDefenderSegmentSnapshot();
    updateObstacles(dt);
    updateShot(dt, lineBeforeMove, lineAfterMove);
    updateArrows(dt);
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
    const amplitude = 2.4 + (state.run.lineOscillation * 0.22) + vibe;
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
    const timeMs = performance.now();
    const haloPulse = (Math.sin(timeMs * 0.011) + 1) * 0.5;
    const travelStretch = clamp(speed / 1400, 0, 0.16);
    const radiusX = player.radius * (1 + (travelStretch * 0.55));
    const radiusY = player.radius * (1 - (travelStretch * 0.25));
    const eyeTilt = Math.min(0.25, speed / 3000);

    ctx.save();
    const auraRadius = player.radius + 5 + Math.min(speed / 160, 6);
    ctx.globalAlpha = 0.16 + (haloPulse * 0.24);
    ctx.strokeStyle = skin.colorGlow;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(player.x, player.y, auraRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;

    const gradient = ctx.createRadialGradient(
      player.x - (radiusX * 0.4),
      player.y - (radiusY * 0.5),
      player.radius * 0.2,
      player.x,
      player.y,
      player.radius * 1.15,
    );
    gradient.addColorStop(0, "#fffefb");
    gradient.addColorStop(0.18, skin.accentA);
    gradient.addColorStop(0.62, skin.colorPrimary);
    gradient.addColorStop(1, skin.colorSecondary);
    ctx.fillStyle = gradient;
    ctx.shadowColor = skin.colorGlow;
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.ellipse(player.x, player.y, radiusX, radiusY, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = skin.outline;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.ellipse(player.x, player.y, radiusX, radiusY, 0, 0, Math.PI * 2);
    ctx.stroke();

    if (skin.particleStyle === "fire") {
      ctx.fillStyle = skin.accentA;
      ctx.beginPath();
      ctx.moveTo(player.x, player.y - (player.radius * 1.18));
      ctx.quadraticCurveTo(
        player.x + (player.radius * 0.52),
        player.y - (player.radius * 1.76),
        player.x + (player.radius * 0.2),
        player.y - (player.radius * 0.96),
      );
      ctx.quadraticCurveTo(
        player.x,
        player.y - (player.radius * 1.12),
        player.x - (player.radius * 0.24),
        player.y - (player.radius * 0.96),
      );
      ctx.quadraticCurveTo(
        player.x - (player.radius * 0.52),
        player.y - (player.radius * 1.7),
        player.x,
        player.y - (player.radius * 1.18),
      );
      ctx.fill();
    } else if (skin.particleStyle === "water") {
      ctx.fillStyle = skin.accentA;
      ctx.beginPath();
      ctx.moveTo(player.x, player.y - (player.radius * 1.18));
      ctx.quadraticCurveTo(
        player.x + (player.radius * 0.42),
        player.y - (player.radius * 1.55),
        player.x,
        player.y - (player.radius * 1.78),
      );
      ctx.quadraticCurveTo(
        player.x - (player.radius * 0.42),
        player.y - (player.radius * 1.55),
        player.x,
        player.y - (player.radius * 1.18),
      );
      ctx.fill();
    } else if (skin.particleStyle === "lightning") {
      ctx.fillStyle = skin.accentA;
      const spikes = 5;
      for (let i = 0; i < spikes; i += 1) {
        const t = i / (spikes - 1);
        const x = player.x + ((t - 0.5) * player.radius * 1.45);
        const y = player.y - (player.radius * (0.95 + (Math.abs(t - 0.5) * 0.36)));
        ctx.beginPath();
        ctx.moveTo(x - 3.4, y + 1.6);
        ctx.lineTo(x, y - 6.2);
        ctx.lineTo(x + 3.4, y + 1.6);
        ctx.closePath();
        ctx.fill();
      }
    } else if (skin.particleStyle === "earth") {
      ctx.strokeStyle = skin.accentA;
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.arc(player.x, player.y - (player.radius * 0.88), player.radius * 0.58, Math.PI * 1.1, Math.PI * 1.95);
      ctx.stroke();
      ctx.strokeStyle = "rgba(226, 203, 176, 0.65)";
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(player.x - 3, player.y - 5);
      ctx.lineTo(player.x - 6, player.y - 1);
      ctx.lineTo(player.x - 2, player.y + 2);
      ctx.moveTo(player.x + 4, player.y - 4);
      ctx.lineTo(player.x + 1, player.y + 1);
      ctx.stroke();
    } else if (skin.particleStyle === "blossom") {
      ctx.fillStyle = skin.accentA;
      for (let i = 0; i < 3; i += 1) {
        const x = player.x + ((i - 1) * 6.3);
        const y = player.y - (player.radius * 1.05) - (Math.abs(i - 1) * 1.5);
        ctx.beginPath();
        ctx.ellipse(x, y, 3.2, 2.2, 0.5 * i, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#ffe9f6";
      ctx.beginPath();
      ctx.arc(player.x, player.y - (player.radius * 1.03), 1.2, 0, Math.PI * 2);
      ctx.fill();
    }

    const eyeOffsetX = player.radius * 0.34;
    const eyeY = player.y - (player.radius * 0.12);
    const eyeW = player.radius * 0.36;
    const eyeH = player.radius * 0.2;

    ctx.fillStyle = skin.eyeColor;
    ctx.save();
    ctx.translate(player.x - eyeOffsetX, eyeY);
    ctx.rotate(-0.28 - eyeTilt);
    ctx.beginPath();
    ctx.ellipse(0, 0, eyeW, eyeH, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(player.x + eyeOffsetX, eyeY);
    ctx.rotate(0.28 + eyeTilt);
    ctx.beginPath();
    ctx.ellipse(0, 0, eyeW, eyeH, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = "#0b0f15";
    ctx.lineWidth = 1.8;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(player.x - eyeOffsetX - 3.8, eyeY + 1);
    ctx.lineTo(player.x - eyeOffsetX + 3.8, eyeY + 2.1);
    ctx.moveTo(player.x + eyeOffsetX - 3.8, eyeY + 2.1);
    ctx.lineTo(player.x + eyeOffsetX + 3.8, eyeY + 1);
    ctx.stroke();

    ctx.strokeStyle = skin.outline;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(player.x - eyeOffsetX - 5, eyeY - (eyeH + 2.5));
    ctx.lineTo(player.x - eyeOffsetX + 5, eyeY - (eyeH - 0.4));
    ctx.moveTo(player.x + eyeOffsetX - 5, eyeY - (eyeH - 0.4));
    ctx.lineTo(player.x + eyeOffsetX + 5, eyeY - (eyeH + 2.5));
    ctx.stroke();

    ctx.strokeStyle = "rgba(19, 23, 31, 0.85)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(player.x - 3.8, player.y + (player.radius * 0.28));
    ctx.quadraticCurveTo(player.x, player.y + (player.radius * 0.4), player.x + 3.8, player.y + (player.radius * 0.28));
    ctx.stroke();

    ctx.restore();
  }

  function drawAimGuide() {
    if (!state.aim.active || !state.inRun || !state.canShoot || state.shot.active) {
      return;
    }

    const player = state.player;
    const swipeX = state.aim.x - player.x;
    const swipeY = state.aim.y - player.y;
    const dragDistance = Math.hypot(swipeX, swipeY);
    if (dragDistance < 3) {
      return;
    }

    const target = state.aim.target;
    if (!target) {
      return;
    }

    const scorePreviewFactor = clamp(1 - (state.run.score * 0.006), 0.34, 1);
    const previewX = lerp(player.x, target.x, scorePreviewFactor);
    const previewY = lerp(player.y, target.y, scorePreviewFactor);

    ctx.save();
    ctx.lineCap = "round";
    ctx.strokeStyle = "rgba(42, 200, 255, 0.75)";
    ctx.shadowColor = "rgba(42, 200, 255, 0.65)";
    ctx.shadowBlur = 8;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(player.x, player.y);
    ctx.lineTo(previewX, previewY);
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(255, 255, 255, 0.96)";
    ctx.beginPath();
    ctx.arc(target.x, target.y, 4.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(42, 200, 255, 0.36)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(target.x, target.y, state.player.radius + 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawParticles() {
    state.particles.forEach((particle) => {
      const ratio = particle.maxLife > 0 ? particle.life / particle.maxLife : 0;
      const alpha = clamp(ratio, 0, 1);
      const shape = particle.shape ?? "circle";
      const stretch = particle.stretch ?? 1;
      const size = particle.size ?? 1;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = particle.color;

      if (shape === "petal") {
        ctx.translate(particle.x, particle.y);
        ctx.rotate(particle.rotation ?? 0);
        ctx.beginPath();
        ctx.ellipse(0, 0, size * 0.85, size * stretch, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (shape === "spark") {
        ctx.translate(particle.x, particle.y);
        ctx.rotate(particle.rotation ?? 0);
        ctx.fillRect(-size * 0.35, -size * 1.5, size * 0.7, size * 3);
        ctx.fillRect(-size * 1.5, -size * 0.35, size * 3, size * 0.7);
      } else if (shape === "droplet") {
        ctx.translate(particle.x, particle.y);
        ctx.rotate(particle.rotation ?? 0);
        ctx.beginPath();
        ctx.moveTo(0, -(size * stretch));
        ctx.quadraticCurveTo(size * 0.9, -size * 0.1, 0, size * 1.15);
        ctx.quadraticCurveTo(-size * 0.9, -size * 0.1, 0, -(size * stretch));
        ctx.fill();
      } else if (shape === "shard") {
        ctx.translate(particle.x, particle.y);
        ctx.rotate(particle.rotation ?? 0);
        ctx.beginPath();
        ctx.moveTo(-size * 0.4, -size * 0.8);
        ctx.lineTo(size * 0.9, -size * 0.2);
        ctx.lineTo(size * 0.2, size * 1.1);
        ctx.lineTo(-size, size * 0.2);
        ctx.closePath();
        ctx.fill();
      } else if (shape === "ember") {
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, size, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(255, 247, 215, 0.75)";
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, size * 0.45, 0, Math.PI * 2);
        ctx.fill();
      } else if (shape === "sparkle") {
        ctx.translate(particle.x, particle.y);
        ctx.rotate(particle.rotation ?? 0);
        ctx.beginPath();
        ctx.moveTo(0, -size * 1.2);
        ctx.lineTo(size * 0.38, -size * 0.34);
        ctx.lineTo(size * 1.2, 0);
        ctx.lineTo(size * 0.38, size * 0.34);
        ctx.lineTo(0, size * 1.2);
        ctx.lineTo(-size * 0.38, size * 0.34);
        ctx.lineTo(-size * 1.2, 0);
        ctx.lineTo(-size * 0.38, -size * 0.34);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    });
  }

  function drawDashTrail() {
    state.dashTrail.forEach((trail) => {
      const ratio = trail.maxLife > 0 ? trail.life / trail.maxLife : 0;
      if (ratio <= 0) {
        return;
      }

      const style = trail.style ?? "sparkle";
      ctx.save();
      ctx.globalAlpha = ratio;
      ctx.strokeStyle = trail.color;
      ctx.lineCap = "round";

      if (style === "lightning") {
        const dx = trail.bx - trail.ax;
        const dy = trail.by - trail.ay;
        const length = Math.hypot(dx, dy);
        const nx = length > 0.0001 ? -dy / length : 0;
        const ny = length > 0.0001 ? dx / length : 0;
        const segments = 4;
        const amplitude = 1.2 + (ratio * 2.1);
        ctx.lineWidth = 1.8 + (ratio * 2.8);
        ctx.beginPath();
        for (let i = 0; i <= segments; i += 1) {
          const t = i / segments;
          const baseX = lerp(trail.ax, trail.bx, t);
          const baseY = lerp(trail.ay, trail.by, t);
          const offset = i === 0 || i === segments ? 0 : (i % 2 === 0 ? -1 : 1) * amplitude;
          const x = baseX + (nx * offset);
          const y = baseY + (ny * offset);
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      } else if (style === "water") {
        ctx.lineWidth = 2.4 + (ratio * 3);
        ctx.beginPath();
        ctx.moveTo(trail.ax, trail.ay);
        ctx.lineTo(trail.bx, trail.by);
        ctx.stroke();
        ctx.strokeStyle = "rgba(222, 248, 255, 0.75)";
        ctx.lineWidth = 1.1 + ratio;
        ctx.beginPath();
        ctx.moveTo(trail.ax, trail.ay);
        ctx.lineTo(trail.bx, trail.by);
        ctx.stroke();
      } else if (style === "earth") {
        ctx.lineWidth = 2.2 + (ratio * 2.4);
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.moveTo(trail.ax, trail.ay);
        ctx.lineTo(trail.bx, trail.by);
        ctx.stroke();
      } else if (style === "blossom") {
        ctx.lineWidth = 2 + (ratio * 2.8);
        ctx.strokeStyle = trail.color;
        ctx.beginPath();
        ctx.moveTo(trail.ax, trail.ay);
        ctx.lineTo(trail.bx, trail.by);
        ctx.stroke();
      } else {
        ctx.lineWidth = 2 + (ratio * 3);
        ctx.beginPath();
        ctx.moveTo(trail.ax, trail.ay);
        ctx.lineTo(trail.bx, trail.by);
        ctx.stroke();
      }

      ctx.restore();
    });
  }

  function drawAfterimages() {
    state.afterimages.forEach((ghost) => {
      const ratio = ghost.maxLife > 0 ? ghost.life / ghost.maxLife : 0;
      if (ratio <= 0) {
        return;
      }

      ctx.save();
      ctx.globalAlpha = ratio * 0.45;
      ctx.fillStyle = ghost.color;
      ctx.beginPath();
      ctx.arc(ghost.x, ghost.y, ghost.radius * (0.9 + ((1 - ratio) * 0.2)), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  function drawAttachPulses() {
    state.attachPulses.forEach((pulse) => {
      const ratio = pulse.maxLife > 0 ? pulse.life / pulse.maxLife : 0;
      if (ratio <= 0) {
        return;
      }

      const radius = pulse.radius + ((1 - ratio) * (pulse.maxRadius - pulse.radius));
      ctx.save();
      ctx.globalAlpha = ratio * 0.75;
      ctx.strokeStyle = pulse.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(pulse.x, pulse.y, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    });
  }

  function drawArrowWarning(timeMs) {
    const preview = state.arrows.preview;
    if (!preview) {
      return;
    }

    const blinkOn = Math.sin(timeMs * 0.03) > 0;
    const alpha = blinkOn ? 0.95 : 0.22;
    const lane = preview.lane;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.lineCap = "round";
    ctx.strokeStyle = "rgba(255, 165, 92, 0.95)";
    ctx.shadowColor = "rgba(255, 165, 92, 0.88)";
    ctx.shadowBlur = 9;
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 7]);
    ctx.lineDashOffset = -(timeMs * 0.04);
    ctx.beginPath();
    ctx.moveTo(lane.warningStartX, lane.warningStartY);
    ctx.lineTo(lane.warningEndX, lane.warningEndY);
    ctx.stroke();
    ctx.restore();
  }

  function drawActiveArrow() {
    const arrow = state.arrows.active;
    if (!arrow) {
      return;
    }

    const tailX = arrow.x - (arrow.dirX * 22);
    const tailY = arrow.y - (arrow.dirY * 22);
    const wingX = -arrow.dirY;
    const wingY = arrow.dirX;

    ctx.save();
    ctx.strokeStyle = "rgba(255, 191, 138, 0.82)";
    ctx.shadowColor = "rgba(255, 191, 138, 0.82)";
    ctx.shadowBlur = 11;
    ctx.lineCap = "round";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(tailX, tailY);
    ctx.lineTo(arrow.x, arrow.y);
    ctx.stroke();

    const sideLength = 8;
    const backX = arrow.x - (arrow.dirX * 11);
    const backY = arrow.y - (arrow.dirY * 11);
    ctx.fillStyle = "#ffd7a8";
    ctx.beginPath();
    ctx.moveTo(arrow.x + (arrow.dirX * 9), arrow.y + (arrow.dirY * 9));
    ctx.lineTo(backX + (wingX * sideLength), backY + (wingY * sideLength));
    ctx.lineTo(backX - (wingX * sideLength), backY - (wingY * sideLength));
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#ffc37e";
    ctx.beginPath();
    ctx.moveTo(tailX, tailY);
    ctx.lineTo(tailX + (wingX * 6), tailY + (wingY * 6));
    ctx.lineTo(tailX - (wingX * 6), tailY - (wingY * 6));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawArrows(timeMs) {
    drawArrowWarning(timeMs);
    drawActiveArrow();
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
    drawArrows(timeMs);
    drawDashTrail();
    drawAfterimages();
    drawPlayer();
    drawAttachPulses();
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
    state.aim.target = resolveDashTargetFromSwipe(point);
  });

  function releaseAim(event) {
    if (!state.aim.active || event.pointerId !== state.aim.pointerId) {
      return;
    }

    const point = pointToCanvas(event);
    state.aim.target = resolveDashTargetFromSwipe(point);
    state.aim.active = false;
    state.aim.pointerId = null;
    launchFromPointer(point);
    state.aim.target = null;
  }

  dom.canvas.addEventListener("pointerup", releaseAim);
  dom.canvas.addEventListener("pointercancel", (event) => {
    if (state.aim.active && event.pointerId === state.aim.pointerId) {
      state.aim.active = false;
      state.aim.pointerId = null;
      state.aim.target = null;
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
