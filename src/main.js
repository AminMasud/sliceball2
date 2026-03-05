import { detectMovingCircleLineHit } from "./engine/collisions.js";
import { clamp, distance, magnitude, normalize, segmentMidpoint } from "./engine/geometry.js";
import { advanceBall, getSpeed, resolveBallCollision, stopBall } from "./engine/physics.js";
import { chooseCpuShot } from "./game/ai.js";
import {
  ARENA,
  ATTACKER_INDEX,
  BALL_RADIUS,
  MAX_DRAG_DISTANCE,
  MAX_LAUNCH_SPEED,
  PLACEMENT_PADDING,
  PLACEMENT_SPACING,
  STOP_SPEED,
  WIN_SCORE,
  areAllBallsPlaced,
  clearTeamPositions,
  createGameEntities,
  getLineSegment,
  getSelectedBall,
  isAttackerIndex,
  setBallPosition,
  setSelectedBall,
} from "./game/entities.js";
import { Renderer } from "./game/renderer.js";
import { GAME_STATES } from "./game/state.js";

const FREEZE_MS = 150;
const ROUND_PAUSE_MS = 900;
const CPU_THINK_MS = 650;
const BALL_PICK_PADDING = 10;
const MIN_LINE_PIECE_DISTANCE = BALL_RADIUS * 4.1;
const FREE_CPU_MIN_COOLDOWN_MS = 520;
const FREE_CPU_MAX_COOLDOWN_MS = 980;

const canvas = document.querySelector("#gameCanvas");
const playerLabelElement = document.querySelector("#playerLabel");
const cpuLabelElement = document.querySelector("#cpuLabel");
const playerScoreElement = document.querySelector("#playerScore");
const cpuScoreElement = document.querySelector("#cpuScore");
const turnStatusElement = document.querySelector("#turnStatus");
const turnIndicatorElement = document.querySelector("#turnIndicator");
const statusTextElement = document.querySelector("#statusText");
const menuOverlay = document.querySelector("#menuOverlay");
const menuHintElement = document.querySelector("#menuHint");
const optionsPanelElement = document.querySelector("#optionsPanel");
const colorOptionButtons = [...document.querySelectorAll(".color-option")];
const tutorialOverlay = document.querySelector("#tutorialOverlay");
const tutorialButton = document.querySelector("#tutorialButton");
const revealOverlay = document.querySelector("#revealOverlay");
const revealEyebrowElement = document.querySelector("#revealEyebrow");
const revealTitleElement = document.querySelector("#revealTitle");
const revealTextElement = document.querySelector("#revealText");
const revealButton = document.querySelector("#revealButton");
const gameOverOverlay = document.querySelector("#gameOverOverlay");
const winnerTextElement = document.querySelector("#winnerText");
const playButton = document.querySelector("#playButton");
const freeModeButton = document.querySelector("#freeModeButton");
const localMultiplayerButton = document.querySelector("#localMultiplayerButton");
const restartMenuButton = document.querySelector("#restartMenuButton");
const optionsButton = document.querySelector("#optionsButton");
const quitButton = document.querySelector("#quitButton");
const playAgainButton = document.querySelector("#playAgainButton");
const resetButton = document.querySelector("#resetButton");

const DEFAULT_MENU_HINT = "PLAY for solo, FREE MODE for unlimited moves, or LOCAL MULTIPLAYER for two players.";
const OPTIONS_MENU_HINT = "Pick colors for Player 1 and Player 2.";
const TUTORIAL_STORAGE_KEY = "lineSliceBallsTutorialSeenV1";
const COLOR_PRESETS = Object.freeze({
  aqua: {
    core: "#4ec7c2",
    bright: "#ddfffb",
    line: "rgba(78, 199, 194, 0.46)",
    glow: "rgba(78, 199, 194, 0.88)",
    shadow: "rgba(37, 109, 106, 0.34)",
  },
  coral: {
    core: "#ff7b6b",
    bright: "#fff0dc",
    line: "rgba(255, 123, 107, 0.42)",
    glow: "rgba(255, 123, 107, 0.88)",
    shadow: "rgba(135, 62, 54, 0.34)",
  },
  gold: {
    core: "#e6b74b",
    bright: "#fff8d9",
    line: "rgba(230, 183, 75, 0.42)",
    glow: "rgba(230, 183, 75, 0.86)",
    shadow: "rgba(126, 92, 24, 0.34)",
  },
  sky: {
    core: "#6f8de8",
    bright: "#edf2ff",
    line: "rgba(111, 141, 232, 0.42)",
    glow: "rgba(111, 141, 232, 0.86)",
    shadow: "rgba(56, 73, 128, 0.34)",
  },
});
const COLOR_KEYS = Object.freeze(Object.keys(COLOR_PRESETS));

function readTutorialSeen() {
  try {
    return window.localStorage.getItem(TUTORIAL_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function writeTutorialSeen() {
  try {
    window.localStorage.setItem(TUTORIAL_STORAGE_KEY, "1");
  } catch {
    // Ignore storage restrictions.
  }
}

const renderer = new Renderer(canvas);

const game = {
  ...createGameEntities(),
  mode: "cpu",
  state: GAME_STATES.MENU,
  nextState: null,
  roundEndAt: 0,
  cpuThinkAt: 0,
  turn: {
    actor: "player",
    phase: "attacker",
    requiredBallIndex: ATTACKER_INDEX,
  },
  statusText: "Press PLAY to place your pieces.",
  banner: null,
  winnerText: "",
  setup: {
    actor: "player",
    nextPlayerBallIndex: 0,
    awaitingReveal: false,
    revealStage: null,
  },
  aim: {
    dragging: false,
    pointer: { x: 0, y: 0 },
    pointerId: null,
  },
  shot: null,
  effects: {
    sparks: [],
    waves: [],
  },
  settings: {
    optionsOpen: false,
    playerColor: "aqua",
    cpuColor: "coral",
    tutorialSeen: readTutorialSeen(),
    tutorialOpen: false,
  },
  free: {
    nextCpuActionAt: 0,
    shots: {
      player: {
        active: false,
        hitEnemyLine: false,
        hitOwnLine: false,
      },
      cpu: {
        active: false,
        hitEnemyLine: false,
        hitOwnLine: false,
      },
    },
  },
};

applySelectedPalettes();
updateOptionButtons();
renderOptionsPanel();

function setState(state) {
  game.state = state;
  updateHud();
}

function getFallbackColor(excludedColor, preferredColor) {
  if (preferredColor && preferredColor !== excludedColor && COLOR_PRESETS[preferredColor]) {
    return preferredColor;
  }

  return COLOR_KEYS.find((key) => key !== excludedColor) ?? excludedColor;
}

function ensureDistinctTeamColors(changedTeamId = null) {
  if (game.settings.playerColor !== game.settings.cpuColor) {
    return;
  }

  if (changedTeamId === "player") {
    game.settings.cpuColor = getFallbackColor(game.settings.playerColor, "coral");
    return;
  }

  if (changedTeamId === "cpu") {
    game.settings.playerColor = getFallbackColor(game.settings.cpuColor, "aqua");
    return;
  }

  game.settings.cpuColor = getFallbackColor(game.settings.playerColor, "coral");
}

function applySelectedPalettes() {
  ensureDistinctTeamColors();
  game.player.palette = { ...COLOR_PRESETS[game.settings.playerColor] };
  game.cpu.palette = { ...COLOR_PRESETS[game.settings.cpuColor] };
  document.documentElement.style.setProperty("--player", game.player.palette.core);
  document.documentElement.style.setProperty("--cpu", game.cpu.palette.core);
}

function updateOptionButtons() {
  const playerColor = game.settings.playerColor;
  const cpuColor = game.settings.cpuColor;

  colorOptionButtons.forEach((button) => {
    const teamId = button.dataset.team;
    const colorKey = button.dataset.color;
    const selectedKey = teamId === "player"
      ? playerColor
      : cpuColor;
    const blocked = teamId === "player"
      ? colorKey === cpuColor
      : colorKey === playerColor;

    button.dataset.selected = String(colorKey === selectedKey);
    button.dataset.blocked = String(blocked && colorKey !== selectedKey);
    button.disabled = blocked && colorKey !== selectedKey;
  });
}

function renderOptionsPanel() {
  if (!optionsPanelElement) {
    return;
  }

  optionsPanelElement.classList.toggle("hidden", !game.settings.optionsOpen);
}

function showTutorialIfNeeded() {
  if (game.settings.tutorialSeen || !tutorialOverlay) {
    return;
  }

  tutorialOverlay.classList.remove("hidden");
  game.settings.tutorialOpen = true;
}

function hideTutorial() {
  tutorialOverlay?.classList.add("hidden");
  game.settings.tutorialOpen = false;
}

function completeTutorial() {
  game.settings.tutorialSeen = true;
  writeTutorialSeen();
  hideTutorial();
}

function showRevealPrompt(eyebrow, title, text) {
  if (!revealOverlay) {
    return;
  }

  revealEyebrowElement.textContent = eyebrow;
  revealTitleElement.textContent = title;
  revealTextElement.textContent = text;
  revealButton.textContent = "REVEAL";
  revealOverlay.classList.remove("hidden");
}

function hideRevealPrompt() {
  revealOverlay?.classList.add("hidden");
}

function getTurnBallIndex(actor, phase) {
  const team = game[actor];

  if (!team) {
    return ATTACKER_INDEX;
  }

  if (phase === "attacker") {
    setSelectedBall(team, ATTACKER_INDEX);
    return ATTACKER_INDEX;
  }

  if (team.selectedBallIndex !== 0 && team.selectedBallIndex !== 1) {
    setSelectedBall(team, 0);
  }

  return null;
}

function setTurn(actor, phase) {
  game.turn.actor = actor;
  game.turn.phase = phase;
  game.turn.requiredBallIndex = getTurnBallIndex(actor, phase);
}

function setMode(mode) {
  game.mode = mode;
}

function isLocalMode() {
  return game.mode === "local";
}

function isFreeMode() {
  return game.mode === "free";
}

function getScoreLabelText(teamId) {
  if (teamId === "player") {
    return isLocalMode() ? "Player 1" : "Player 1";
  }

  return isLocalMode() ? "Player 2" : "CPU";
}

function getActorName(actor) {
  if (actor === "player") {
    return isLocalMode() ? "Player 1" : "Player 1";
  }

  return isLocalMode() ? "Player 2" : "CPU";
}

function getWinnerText(actor) {
  if (!isLocalMode()) {
    return actor === "player" ? "You Win" : "CPU Wins";
  }

  return actor === "player" ? "Player 1 Wins" : "Player 2 Wins";
}

function getControlledTeam() {
  if (isLocalMode()) {
    return game[game.turn.actor];
  }

  return game.player;
}

function isHumanControlledTurn() {
  return isLocalMode() || isFreeMode() || game.turn.actor === "player";
}

function getTurnTone() {
  if (game.state === GAME_STATES.MENU || game.state === GAME_STATES.ROUND_END || game.state === GAME_STATES.GAME_OVER) {
    return "neutral";
  }

  if (isFreeMode()) {
    return "neutral";
  }

  if (game.state === GAME_STATES.PLAYER_SETUP) {
    if (game.setup.awaitingReveal) {
      return "neutral";
    }

    return game.setup.actor === "cpu" ? "cpu" : "player";
  }

  if (game.turn.actor === "cpu") {
    return "cpu";
  }

  return "player";
}

function getSetupTeam() {
  return game[game.setup.actor];
}

function setMenuHint(text = DEFAULT_MENU_HINT) {
  if (menuHintElement) {
    menuHintElement.textContent = text;
  }
}

function setTeamColor(teamId, colorKey) {
  if (!COLOR_PRESETS[colorKey]) {
    return;
  }

  const otherColor = teamId === "player" ? game.settings.cpuColor : game.settings.playerColor;

  if (colorKey === otherColor) {
    setMenuHint("Players must use different colors.");
    showBanner("NOPE!", {
      subtext: "PICK A DIFFERENT COLOR",
      fill: "#ffd6a8",
      duration: 1000,
    });
    updateOptionButtons();
    return;
  }

  if (teamId === "player") {
    game.settings.playerColor = colorKey;
  } else {
    game.settings.cpuColor = colorKey;
  }

  ensureDistinctTeamColors(teamId);
  applySelectedPalettes();
  updateOptionButtons();
  setMenuHint(OPTIONS_MENU_HINT);
}

function showBanner(text, options = {}) {
  const duration = Math.max(1400, options.duration ?? 1500);

  game.banner = {
    text,
    subtext: options.subtext ?? "",
    fill: options.fill ?? "#ffe062",
    outline: options.outline ?? "#1f3156",
    shadow: options.shadow ?? "rgba(20, 37, 71, 0.2)",
    tilt: options.tilt ?? ((Math.random() - 0.5) * 0.08),
    until: performance.now() + duration,
    duration,
  };
}

function hideOverlays() {
  menuOverlay.classList.add("hidden");
  hideTutorial();
  hideRevealPrompt();
  gameOverOverlay.classList.add("hidden");
}

function showMenu() {
  menuOverlay.classList.remove("hidden");
  hideTutorial();
  hideRevealPrompt();
  gameOverOverlay.classList.add("hidden");
  setMenuHint(game.settings.optionsOpen ? OPTIONS_MENU_HINT : DEFAULT_MENU_HINT);
  renderOptionsPanel();
  updateOptionButtons();
  showTutorialIfNeeded();
}

function stopAllMotion() {
  [game.player, game.cpu].forEach((team) => {
    team.balls.forEach((ball) => {
      stopBall(ball);
    });
  });
}

function getPlacedBalls() {
  return [...game.player.balls, ...game.cpu.balls].filter((ball) => ball.placed);
}

function haveAllBallsSettled() {
  return getPlacedBalls().every((ball) => getSpeed(ball) <= STOP_SPEED);
}

function confineBallToArena(ball) {
  ball.x = clamp(ball.x, ball.radius, ARENA.width - ball.radius);
  ball.y = clamp(ball.y, ball.radius, ARENA.height - ball.radius);
}

function updateAttackerSpin(balls, dt) {
  balls.forEach((ball) => {
    if (ball.role !== "attacker") {
      return;
    }

    const speed = getSpeed(ball);

    if (speed <= 2) {
      return;
    }

    ball.rotation = (ball.rotation + (Math.max(0.08, speed * 0.0022) * dt * 60)) % (Math.PI * 2);
  });
}

function pushLinePiecesApart(team, applyBurst = false) {
  const first = team.balls[0];
  const second = team.balls[1];

  if (!first?.placed || !second?.placed) {
    return false;
  }

  let dx = second.x - first.x;
  let dy = second.y - first.y;
  let gap = Math.hypot(dx, dy);
  let normalX = 0;
  let normalY = 0;

  if (gap === 0) {
    normalX = team.id === "player" ? 1 : -1;
    normalY = 0;
  } else {
    normalX = dx / gap;
    normalY = dy / gap;
  }

  if (gap >= MIN_LINE_PIECE_DISTANCE) {
    return false;
  }

  const overlap = MIN_LINE_PIECE_DISTANCE - gap;
  const pushX = normalX * (overlap / 2);
  const pushY = normalY * (overlap / 2);

  first.x -= pushX;
  first.y -= pushY;
  second.x += pushX;
  second.y += pushY;
  confineBallToArena(first);
  confineBallToArena(second);

  if (applyBurst) {
    const burst = Math.min(220, 90 + (overlap * 9));
    first.vx -= normalX * burst;
    first.vy -= normalY * burst;
    second.vx += normalX * burst;
    second.vy += normalY * burst;
  }

  return true;
}

function isPieceMoving(ball) {
  return getSpeed(ball) > STOP_SPEED;
}

function getRandomFreeCpuDelay() {
  return FREE_CPU_MIN_COOLDOWN_MS + (Math.random() * (FREE_CPU_MAX_COOLDOWN_MS - FREE_CPU_MIN_COOLDOWN_MS));
}

function resetFreeShots() {
  game.free.shots.player.active = false;
  game.free.shots.player.hitEnemyLine = false;
  game.free.shots.player.hitOwnLine = false;
  game.free.shots.cpu.active = false;
  game.free.shots.cpu.hitEnemyLine = false;
  game.free.shots.cpu.hitOwnLine = false;
}

function beginFreeAttackerShot(teamId) {
  const shot = game.free.shots[teamId];

  if (!shot) {
    return;
  }

  shot.active = true;
  shot.hitEnemyLine = false;
  shot.hitOwnLine = false;
}

function finishFreeAttackerShot(teamId) {
  const shot = game.free.shots[teamId];

  if (!shot) {
    return;
  }

  shot.active = false;
  shot.hitEnemyLine = false;
  shot.hitOwnLine = false;
}

function scheduleFreeCpuAction(baseTime = performance.now()) {
  game.free.nextCpuActionAt = baseTime + getRandomFreeCpuDelay();
}

function chooseFreeCpuBall() {
  const available = game.cpu.balls.filter((ball) => ball.placed && !isPieceMoving(ball));

  if (!available.length) {
    return null;
  }

  const attacker = available.find((ball) => ball.index === ATTACKER_INDEX);

  if (attacker && Math.random() < 0.58) {
    return attacker;
  }

  return available[Math.floor(Math.random() * available.length)];
}

function buildFreeCpuVelocity(ball) {
  const playerLine = getLineSegment(game.player);
  const targetCenter = playerLine
    ? segmentMidpoint(playerLine.ax, playerLine.ay, playerLine.bx, playerLine.by)
    : { x: ARENA.width / 2, y: (ARENA.height * 0.75) };
  const target = ball.role === "attacker"
    ? targetCenter
    : {
        x: targetCenter.x + ((Math.random() - 0.5) * 50),
        y: targetCenter.y + 56 + ((Math.random() - 0.5) * 40),
      };
  const angleSpread = ball.role === "attacker" ? 1.0 : 1.5;
  const powerBase = ball.role === "attacker" ? 0.38 : 0.28;
  const powerRange = ball.role === "attacker" ? 0.36 : 0.24;
  const angle = Math.atan2(target.y - ball.y, target.x - ball.x) + ((Math.random() - 0.5) * angleSpread);
  const power = MAX_LAUNCH_SPEED * (powerBase + (Math.random() * powerRange));

  return {
    vx: Math.cos(angle) * power,
    vy: Math.sin(angle) * power,
  };
}

function toCanvasPoint(event) {
  const rect = canvas.getBoundingClientRect();

  return {
    x: ((event.clientX - rect.left) / rect.width) * ARENA.width,
    y: ((event.clientY - rect.top) / rect.height) * ARENA.height,
  };
}

function getPlacementBounds(side, radius) {
  const minX = radius + PLACEMENT_PADDING;
  const maxX = ARENA.width - radius - PLACEMENT_PADDING;

  if (side === "cpu") {
    return {
      minX,
      maxX,
      minY: radius + 34,
      maxY: (ARENA.height / 2) - radius - 42,
    };
  }

  return {
    minX,
    maxX,
    minY: (ARENA.height / 2) + radius + 42,
    maxY: ARENA.height - radius - 34,
  };
}

function clampToBounds(point, bounds) {
  return {
    x: clamp(point.x, bounds.minX, bounds.maxX),
    y: clamp(point.y, bounds.minY, bounds.maxY),
  };
}

function isPlacementValid(team, point, skipBallIndex = null) {
  return team.balls.every((ball) => {
    if (!ball.placed || ball.index === skipBallIndex) {
      return true;
    }

    const movingBall = team.balls[skipBallIndex];
    const requiredGap = movingBall && movingBall.role === "defender" && ball.role === "defender"
      ? Math.max(PLACEMENT_SPACING, MIN_LINE_PIECE_DISTANCE)
      : PLACEMENT_SPACING;

    return distance(point.x, point.y, ball.x, ball.y) >= requiredGap;
  });
}

function randomPointInBounds(bounds) {
  return {
    x: bounds.minX + (Math.random() * (bounds.maxX - bounds.minX)),
    y: bounds.minY + (Math.random() * (bounds.maxY - bounds.minY)),
  };
}

function randomizeTeamPlacement(teamId) {
  const team = game[teamId];
  const bounds = getPlacementBounds(teamId, team.balls[0].radius);

  team.balls.forEach((ball) => {
    let position = null;

    for (let attempts = 0; attempts < 40; attempts += 1) {
      const candidate = clampToBounds(randomPointInBounds(bounds), bounds);

      if (isPlacementValid(team, candidate, ball.index)) {
        position = candidate;
        break;
      }
    }

    if (!position) {
      const spreadX = bounds.maxX - bounds.minX;
      const fallback = {
        x: bounds.minX + (spreadX * ((ball.index + 1) / 4)),
        y: bounds.minY + 40 + (ball.index * 34),
      };
      position = clampToBounds(fallback, bounds);
    }

    setBallPosition(ball, position.x, position.y);
  });

  setSelectedBall(team, ATTACKER_INDEX);
}

function randomizeCpuPlacement() {
  randomizeTeamPlacement("cpu");
}

function randomizePlayerPlacement() {
  randomizeTeamPlacement("player");
}

function getRequiredRole() {
  return game.turn.phase;
}

function getPlayerTurnPrompt() {
  if (isFreeMode()) {
    return "Free mode: move any piece, no turns.";
  }

  if (isLocalMode()) {
    return getRequiredRole() === "attacker"
      ? `${getActorName(game.turn.actor)}: attack with the marked triangle.`
      : `${getActorName(game.turn.actor)}: attack by moving either line piece.`;
  }

  return getRequiredRole() === "attacker"
    ? "Attack with the marked triangle."
    : "Attack by moving either line piece.";
}

function getCpuTurnPrompt() {
  if (isFreeMode()) {
    return "Free mode active.";
  }

  return getRequiredRole() === "attacker"
    ? "CPU attack: marked triangle moving..."
    : "CPU attack: moving a line piece...";
}

function resetMatch(modeOverride = game.mode) {
  const freshState = createGameEntities();
  game.player = freshState.player;
  game.cpu = freshState.cpu;
  applySelectedPalettes();
  setMode(modeOverride);
  clearTeamPositions(game.player);
  clearTeamPositions(game.cpu);
  stopAllMotion();
  game.nextState = null;
  game.roundEndAt = 0;
  game.cpuThinkAt = 0;
  setTurn("player", "attacker");
  game.setup.actor = "player";
  game.setup.awaitingReveal = false;
  game.setup.revealStage = null;
  game.statusText = "Tap two line pieces, then place your triangle attacker.";
  game.banner = null;
  game.winnerText = "";
  game.setup.nextPlayerBallIndex = 0;
  game.aim.dragging = false;
  game.aim.pointerId = null;
  game.shot = null;
  game.effects.sparks.length = 0;
  game.effects.waves.length = 0;
  game.free.nextCpuActionAt = 0;
  resetFreeShots();

  if (isFreeMode()) {
    randomizePlayerPlacement();
    randomizeCpuPlacement();
    setTurn("player", "attacker");
    game.statusText = "Free mode: move any piece. Unlimited moves.";
    scheduleFreeCpuAction(performance.now() + 220);
    setState(GAME_STATES.PLAYER_AIM);
    hideOverlays();
    return;
  }

  setState(GAME_STATES.PLAYER_SETUP);
  hideOverlays();
}

function backToMenu() {
  game.statusText = "Press PLAY to place your pieces.";
  game.banner = null;
  game.winnerText = "";
  game.setup.nextPlayerBallIndex = 0;
  game.setup.awaitingReveal = false;
  game.setup.revealStage = null;
  game.aim.dragging = false;
  game.aim.pointerId = null;
  game.shot = null;
  game.effects.sparks.length = 0;
  game.effects.waves.length = 0;
  game.free.nextCpuActionAt = 0;
  resetFreeShots();

  const freshState = createGameEntities();
  game.player = freshState.player;
  game.cpu = freshState.cpu;
  applySelectedPalettes();
  game.setup.actor = "player";
  setTurn("player", "attacker");

  setState(GAME_STATES.MENU);
  showMenu();
}

function toggleMenuOptions() {
  game.settings.optionsOpen = !game.settings.optionsOpen;
  renderOptionsPanel();
  setMenuHint(game.settings.optionsOpen ? OPTIONS_MENU_HINT : DEFAULT_MENU_HINT);
}

function startCpuMatch() {
  resetMatch("cpu");
}

function startFreeMode() {
  resetMatch("free");
}

function startLocalMatch() {
  resetMatch("local");
}

function handleRevealButton() {
  if (!isLocalMode() || !game.setup.awaitingReveal) {
    return;
  }

  hideRevealPrompt();
  game.setup.awaitingReveal = false;

  if (game.setup.revealStage === "cpu-setup") {
    game.setup.revealStage = null;
    game.statusText = "Player 2: place two line pieces, then the triangle attacker.";
    updateHud();
    return;
  }

  if (game.setup.revealStage === "start-match") {
    game.setup.revealStage = null;
    setTurn("player", "attacker");
    game.statusText = "Player 1: attack with the marked triangle.";
    setState(GAME_STATES.PLAYER_AIM);
  }
}

function beginPlayerTurn() {
  stopAllMotion();
  game.statusText = getPlayerTurnPrompt();
  setState(GAME_STATES.PLAYER_AIM);
}

function beginCpuThink() {
  stopAllMotion();
  game.cpuThinkAt = performance.now() + CPU_THINK_MS;
  game.statusText = getCpuTurnPrompt();
  setState(GAME_STATES.CPU_THINK);
}

function finishRound(nextState, message) {
  game.nextState = nextState;
  game.roundEndAt = performance.now() + ROUND_PAUSE_MS;
  game.statusText = message;
  setState(GAME_STATES.ROUND_END);
}

function finishMatch(winnerText) {
  game.winnerText = winnerText;
  winnerTextElement.textContent = winnerText;
  game.statusText = winnerText;
  setState(GAME_STATES.GAME_OVER);
  showBanner(winnerText.toUpperCase(), {
    subtext: "FIRST TO 3",
    fill: winnerText === "You Win" ? "#ffe062" : "#ffb07e",
    duration: 1100,
  });
  gameOverOverlay.classList.remove("hidden");
}

function updateHud() {
  playerLabelElement.textContent = getScoreLabelText("player");
  cpuLabelElement.textContent = getScoreLabelText("cpu");
  playerScoreElement.textContent = game.player.score;
  cpuScoreElement.textContent = game.cpu.score;
  turnStatusElement.dataset.tone = getTurnTone();

  if (game.state === GAME_STATES.MENU) {
    turnIndicatorElement.textContent = "Ready";
  } else if (isFreeMode() && (game.state === GAME_STATES.PLAYER_AIM || game.state === GAME_STATES.PLAYER_SHOT)) {
    turnIndicatorElement.textContent = "Free Mode";
  } else if (game.state === GAME_STATES.PLAYER_SETUP && game.setup.awaitingReveal) {
    turnIndicatorElement.textContent = game.setup.revealStage === "start-match"
      ? "Reveal Arena"
      : "Hidden Setup";
  } else if (game.state === GAME_STATES.PLAYER_SETUP) {
    turnIndicatorElement.textContent = `${getActorName(game.setup.actor)} Setup`;
  } else if (game.state === GAME_STATES.PLAYER_AIM || game.state === GAME_STATES.PLAYER_SHOT) {
    turnIndicatorElement.textContent = isLocalMode()
      ? `${getActorName(game.turn.actor)} Attack`
      : "Attack";
  } else if (game.state === GAME_STATES.CPU_THINK || game.state === GAME_STATES.CPU_SHOT) {
    turnIndicatorElement.textContent = "CPU Attack";
  } else if (game.state === GAME_STATES.ROUND_END) {
    turnIndicatorElement.textContent = "Round End";
  } else {
    turnIndicatorElement.textContent = "Match Over";
  }

  statusTextElement.textContent = game.statusText;
}

function finishSetupIfReady() {
  const setupTeam = getSetupTeam();

  if (!areAllBallsPlaced(setupTeam)) {
    if (game.setup.nextPlayerBallIndex < ATTACKER_INDEX) {
      game.statusText = `Tap a spot for line piece ${game.setup.nextPlayerBallIndex + 1} of 2.`;
    } else {
      game.statusText = "Tap a spot for your triangle attacker.";
    }
    updateHud();
    return;
  }

  if (isLocalMode() && game.setup.actor === "player") {
    game.setup.actor = "cpu";
    game.setup.nextPlayerBallIndex = 0;
    game.setup.awaitingReveal = true;
    game.setup.revealStage = "cpu-setup";
    game.statusText = "Player 2 setup is hidden. Press REVEAL when ready.";
    showRevealPrompt(
      "Hidden Setup",
      "Player 2 Ready?",
      "Pass the screen, then press REVEAL to place Player 2.",
    );
    updateHud();
    return;
  }

  if (!isLocalMode()) {
    randomizeCpuPlacement();
  }

  if (isLocalMode()) {
    game.setup.awaitingReveal = true;
    game.setup.revealStage = "start-match";
    game.statusText = "Both setups are hidden. Press REVEAL to start.";
    showRevealPrompt(
      "Hidden Setup",
      "Arena Locked",
      "Press REVEAL to show both sides and start Player 1.",
    );
    updateHud();
    return;
  }

  setTurn("player", "attacker");
  game.statusText = "CPU deployed. Attack with the marked triangle.";
  setState(GAME_STATES.PLAYER_AIM);
}

function placePlayerBall(event) {
  const point = toCanvasPoint(event);
  const setupTeam = getSetupTeam();
  const setupActor = game.setup.actor;

  if (setupActor === "player" && point.y <= (ARENA.height / 2) + 18) {
    return;
  }

  if (setupActor === "cpu" && point.y >= (ARENA.height / 2) - 18) {
    return;
  }

  const ball = setupTeam.balls[game.setup.nextPlayerBallIndex];

  if (!ball) {
    return;
  }

  const bounds = getPlacementBounds(setupActor, ball.radius);
  const placement = clampToBounds(point, bounds);

  if (!isPlacementValid(setupTeam, placement, ball.index)) {
    game.statusText = "Leave a little space between your pieces.";
    updateHud();
    return;
  }

  setBallPosition(ball, placement.x, placement.y);
  pushLinePiecesApart(setupTeam);
  game.setup.nextPlayerBallIndex += 1;
  finishSetupIfReady();
}

function findBallIndex(team, point) {
  let bestIndex = null;
  let bestDistance = Infinity;

  team.balls.forEach((ball) => {
    if (!ball.placed) {
      return;
    }

    const gap = distance(point.x, point.y, ball.x, ball.y);

    if (gap <= ball.radius + BALL_PICK_PADDING && gap < bestDistance) {
      bestDistance = gap;
      bestIndex = ball.index;
    }
  });

  return bestIndex;
}

function beginAim(event) {
  if (game.state === GAME_STATES.PLAYER_SETUP) {
    placePlayerBall(event);
    return;
  }

  if (game.state !== GAME_STATES.PLAYER_AIM) {
    return;
  }

  const point = toCanvasPoint(event);

  if (isFreeMode()) {
    const hitIndex = findBallIndex(game.player, point);

    if (hitIndex === null) {
      return;
    }

    const ball = game.player.balls[hitIndex];

    if (!ball?.placed) {
      return;
    }

    if (isPieceMoving(ball)) {
      showBanner("WAIT!", {
        subtext: "THIS PIECE IS STILL MOVING",
        fill: "#ffd6a8",
        duration: 1000,
      });
      return;
    }

    game.turn.actor = "player";
    game.turn.phase = ball.role;
    game.turn.requiredBallIndex = ball.index;
    setSelectedBall(game.player, ball.index);
    game.aim.dragging = true;
    game.aim.pointer = point;
    game.aim.pointerId = event.pointerId;
    canvas.setPointerCapture?.(event.pointerId);
    updateHud();
    return;
  }

  const controlledTeam = getControlledTeam();
  const hitIndex = findBallIndex(controlledTeam, point);

  if (hitIndex === null) {
    return;
  }

  const ball = controlledTeam.balls[hitIndex];

  if (!ball || ball.role !== getRequiredRole()) {
    showBanner("NOPE!", {
      subtext: getRequiredRole() === "attacker" ? "USE THE TRIANGLE" : "PICK A LINE PIECE",
      fill: "#ffd6a8",
      duration: 500,
    });
    game.statusText = getPlayerTurnPrompt();
    updateHud();
    return;
  }

  if (game.turn.requiredBallIndex !== null && hitIndex !== game.turn.requiredBallIndex) {
    showBanner("NOPE!", {
      subtext: "FOLLOW THE MARK",
      fill: "#ffd6a8",
      duration: 550,
    });
    game.statusText = getPlayerTurnPrompt();
    updateHud();
    return;
  }

  setSelectedBall(controlledTeam, hitIndex);
  game.aim.dragging = true;
  game.aim.pointer = point;
  game.aim.pointerId = event.pointerId;
  canvas.setPointerCapture?.(event.pointerId);
  updateHud();
}

function updateAim(event) {
  if (!game.aim.dragging || event.pointerId !== game.aim.pointerId) {
    return;
  }

  game.aim.pointer = toCanvasPoint(event);
}

function cancelAim() {
  game.aim.dragging = false;
  game.aim.pointerId = null;
}

function launchShot(actor, ballIndex, velocity) {
  const team = actor === "player" ? game.player : game.cpu;
  const movingBall = team.balls[ballIndex];

  if (!movingBall?.placed) {
    return;
  }

  if (isFreeMode()) {
    if (isPieceMoving(movingBall)) {
      return;
    }

    game.turn.actor = actor;
    game.turn.phase = movingBall.role;
    game.turn.requiredBallIndex = movingBall.index;
    setSelectedBall(team, ballIndex);
    movingBall.vx = velocity.vx;
    movingBall.vy = velocity.vy;

    if (isAttackerIndex(ballIndex)) {
      beginFreeAttackerShot(actor);
    }

    game.aim.dragging = false;
    game.aim.pointerId = null;
    game.statusText = actor === "player"
      ? "Free mode: shoot any of your pieces anytime."
      : "CPU is active. Keep moving your pieces.";
    setState(GAME_STATES.PLAYER_AIM);
    return;
  }

  if (movingBall.role !== getRequiredRole()) {
    return;
  }

  if (game.turn.requiredBallIndex !== null && ballIndex !== game.turn.requiredBallIndex) {
    return;
  }

  stopAllMotion();
  setSelectedBall(team, ballIndex);
  movingBall.vx = velocity.vx;
  movingBall.vy = velocity.vy;
  game.aim.dragging = false;
  game.aim.pointerId = null;
  game.statusText = actor === "player"
    ? "Shot in motion..."
    : `${getActorName(actor)} fires.`;
  game.shot = {
    actor,
    moverIndex: ballIndex,
    isAttacker: isAttackerIndex(ballIndex),
    hitEnemyLine: false,
    hitOwnLine: false,
    freezeUntil: 0,
  };

  setState((actor === "player" || isLocalMode() || isFreeMode()) ? GAME_STATES.PLAYER_SHOT : GAME_STATES.CPU_SHOT);
}

function releaseAim(event) {
  if (!game.aim.dragging || event.pointerId !== game.aim.pointerId) {
    return;
  }

  const controlledTeam = getControlledTeam();
  const mover = getSelectedBall(controlledTeam);

  if (!mover?.placed) {
    cancelAim();
    return;
  }

  if (isFreeMode() && isPieceMoving(mover)) {
    cancelAim();
    showBanner("WAIT!", {
      subtext: "THIS PIECE IS STILL MOVING",
      fill: "#ffd6a8",
      duration: 1000,
    });
    return;
  }

  const point = toCanvasPoint(event);
  const dragX = mover.x - point.x;
  const dragY = mover.y - point.y;
  const dragDistance = magnitude(dragX, dragY);

  cancelAim();

  if (dragDistance < 8) {
    return;
  }

  const launchDirection = normalize(dragX, dragY);
  const scaledDistance = Math.min(dragDistance, MAX_DRAG_DISTANCE);
  const launchSpeed = (scaledDistance / MAX_DRAG_DISTANCE) * MAX_LAUNCH_SPEED;

  launchShot(controlledTeam.id, mover.index, {
    vx: launchDirection.x * launchSpeed,
    vy: launchDirection.y * launchSpeed,
  });
}

function addSpark(point, color) {
  game.effects.sparks.push({
    x: point.x,
    y: point.y,
    color,
    life: 0.35,
    maxLife: 0.35,
  });
}

function addWave(point, color, strength = 1) {
  game.effects.waves.push({
    x: point.x,
    y: point.y,
    color,
    life: 0.48,
    maxLife: 0.48,
    radius: 10,
    maxRadius: 30 + Math.min(strength * 0.08, 20),
  });
}

function getBallPalette(ball) {
  if (game.player.balls.includes(ball)) {
    return game.player.palette;
  }

  if (game.cpu.balls.includes(ball)) {
    return game.cpu.palette;
  }

  return null;
}

function registerLineHit(kind, impactPoint) {
  if (!game.shot || !game.shot.isAttacker) {
    return;
  }

  if (kind === "enemy") {
    game.shot.hitEnemyLine = true;
  } else {
    game.shot.hitOwnLine = true;
  }

  const activeTeam = game.shot.actor === "player" ? game.player : game.cpu;
  const enemyTeam = game.shot.actor === "player" ? game.cpu : game.player;
  const color = kind === "enemy" ? enemyTeam.palette.glow : activeTeam.palette.glow;

  addSpark(impactPoint, color);
  game.shot.freezeUntil = Math.max(game.shot.freezeUntil, performance.now() + FREEZE_MS);

  if (kind === "enemy") {
    showBanner("SLICE!", {
      subtext: "ENEMY LINE CUT",
      fill: "#ffe062",
      duration: 1000,
    });
  }
}

function registerFreeLineHit(teamId, kind, impactPoint) {
  const shot = game.free.shots[teamId];

  if (!shot || !shot.active) {
    return;
  }

  if (kind === "enemy" && shot.hitEnemyLine) {
    return;
  }

  if (kind === "own" && shot.hitOwnLine) {
    return;
  }

  const activeTeam = game[teamId];
  const enemyTeam = teamId === "player" ? game.cpu : game.player;

  if (kind === "enemy") {
    shot.hitEnemyLine = true;
  } else {
    shot.hitOwnLine = true;
  }

  const color = kind === "enemy" ? enemyTeam.palette.glow : activeTeam.palette.glow;
  addSpark(impactPoint, color);

  if (kind === "enemy") {
    activeTeam.score += 1;
    showBanner("SLICE!", {
      subtext: "+1 ENEMY LINE",
      fill: "#ffe062",
      duration: 1100,
    });
    game.statusText = teamId === "player"
      ? "You scored in free mode."
      : "CPU scored in free mode.";
    updateHud();
  }
}

function inspectLineHit(movingBall, segment, kind, previousPosition) {
  if (!game.shot || !segment) {
    return;
  }

  if (kind === "enemy" && game.shot.hitEnemyLine) {
    return;
  }

  if (kind === "own" && game.shot.hitOwnLine) {
    return;
  }

  const impact = detectMovingCircleLineHit(movingBall, previousPosition, segment);

  if (impact.hit) {
    registerLineHit(kind, impact.point);
  }
}

function resolveShot() {
  if (!game.shot) {
    return;
  }

  const activeTeam = game.shot.actor === "player" ? game.player : game.cpu;
  const movingBall = activeTeam.balls[game.shot.moverIndex];
  const completedPhase = game.turn.phase;
  let message = "";

  if (movingBall) {
    stopBall(movingBall);
  }

  if (isFreeMode()) {
    game.shot = null;
    game.statusText = "Free mode: move any piece. Unlimited moves.";
    setState(GAME_STATES.PLAYER_AIM);
    return;
  }

  if (game.shot.isAttacker && game.shot.hitEnemyLine) {
    activeTeam.score = Math.min(WIN_SCORE, activeTeam.score + 1);
    message = `${getActorName(activeTeam.id)} scores on an enemy-line slice.`;
    showBanner("POINT!", {
      subtext: "ENEMY LINE CUT",
      fill: "#ffe062",
      duration: 1200,
    });
  } else if (game.shot.isAttacker) {
    if (game.shot.hitOwnLine) {
      showBanner("ALMOST!", {
        subtext: "NEED THE ENEMY LINE",
        fill: "#bfeaff",
        duration: 1150,
      });
    } else {
      showBanner("MISS!", {
        subtext: "CUT ENEMY LINE TO SCORE",
        fill: "#ffd6a8",
        duration: 1150,
      });
    }

    message = game.shot.actor === "player"
      ? "No point from the attacker move."
      : `${getActorName(game.shot.actor)} misses the enemy line.`;
  } else {
    showBanner("MOVE!", {
      subtext: "ATTACKER SCORES ONLY",
      fill: "#bfeaff",
      duration: 1000,
    });
    message = game.shot.actor === "player"
      ? "Line piece repositioned."
      : `${getActorName(game.shot.actor)} repositions a line piece.`;
  }

  game.shot = null;
  updateHud();

  if (activeTeam.score >= WIN_SCORE) {
    finishMatch(getWinnerText(activeTeam.id));
    return;
  }

  if (completedPhase === "attacker") {
    setTurn(activeTeam.id, "defender");

    if (isLocalMode()) {
      finishRound(GAME_STATES.PLAYER_AIM, `${message} ${getActorName(activeTeam.id)} attack continues.`);
    } else if (activeTeam.id === "player") {
      finishRound(GAME_STATES.PLAYER_AIM, `${message} Attack continues.`);
    } else {
      finishRound(GAME_STATES.CPU_THINK, `${message} CPU attack continues.`);
    }
  } else {
    const nextActor = activeTeam.id === "player" ? "cpu" : "player";
    setTurn(nextActor, "attacker");

    if (isLocalMode()) {
      finishRound(GAME_STATES.PLAYER_AIM, `${message} ${getActorName(nextActor)}: attacker next.`);
    } else if (nextActor === "cpu") {
      finishRound(GAME_STATES.CPU_THINK, `${message} CPU turn: attacker next.`);
    } else {
      finishRound(GAME_STATES.PLAYER_AIM, `${message} Your turn: attacker next.`);
    }
  }
}

function updateShot(dt) {
  if (!game.shot) {
    return;
  }

  const activeTeam = game.shot.actor === "player" ? game.player : game.cpu;
  const enemyTeam = game.shot.actor === "player" ? game.cpu : game.player;
  const movingBall = activeTeam.balls[game.shot.moverIndex];

  if (!movingBall) {
    return;
  }

  if (performance.now() < game.shot.freezeUntil) {
    return;
  }

  const placedBalls = getPlacedBalls();
  const previousPositions = new Map();

  placedBalls.forEach((ball) => {
    previousPositions.set(ball, { x: ball.x, y: ball.y });

    if (getSpeed(ball) > 0) {
      advanceBall(ball, ARENA, dt);
    }
  });

  for (let pass = 0; pass < 2; pass += 1) {
    for (let firstIndex = 0; firstIndex < placedBalls.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < placedBalls.length; secondIndex += 1) {
        const firstBall = placedBalls[firstIndex];
        const secondBall = placedBalls[secondIndex];
        const collision = resolveBallCollision(firstBall, secondBall);

        if (pass === 0 && collision && collision.impactSpeed >= 65) {
          const firstPalette = getBallPalette(firstBall);
          const secondPalette = getBallPalette(secondBall);
          const sameColor = firstPalette && secondPalette && firstPalette.core === secondPalette.core;
          const color = sameColor
            ? firstPalette.glow
            : "rgba(255, 255, 255, 0.88)";

          addWave({
            x: (firstBall.x + secondBall.x) / 2,
            y: (firstBall.y + secondBall.y) / 2,
          }, color, collision.impactSpeed);
        }
      }
    }
  }

  pushLinePiecesApart(game.player, true);
  pushLinePiecesApart(game.cpu, true);

  placedBalls.forEach((ball) => {
    confineBallToArena(ball);
  });

  updateAttackerSpin(placedBalls, dt);

  if (game.shot.isAttacker) {
    const previousPosition = previousPositions.get(movingBall) ?? { x: movingBall.x, y: movingBall.y };
    inspectLineHit(movingBall, getLineSegment(activeTeam), "own", previousPosition);
    inspectLineHit(movingBall, getLineSegment(enemyTeam), "enemy", previousPosition);
  }

  if (haveAllBallsSettled()) {
    stopAllMotion();
    resolveShot();
  }
}

function updateFreeMotion(dt) {
  const placedBalls = getPlacedBalls();

  if (!placedBalls.length) {
    return;
  }

  const previousPositions = new Map();

  placedBalls.forEach((ball) => {
    previousPositions.set(ball, { x: ball.x, y: ball.y });

    if (getSpeed(ball) > 0) {
      advanceBall(ball, ARENA, dt);
    }
  });

  for (let pass = 0; pass < 2; pass += 1) {
    for (let firstIndex = 0; firstIndex < placedBalls.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < placedBalls.length; secondIndex += 1) {
        const firstBall = placedBalls[firstIndex];
        const secondBall = placedBalls[secondIndex];
        const collision = resolveBallCollision(firstBall, secondBall);

        if (pass === 0 && collision && collision.impactSpeed >= 65) {
          const firstPalette = getBallPalette(firstBall);
          const secondPalette = getBallPalette(secondBall);
          const sameColor = firstPalette && secondPalette && firstPalette.core === secondPalette.core;
          const color = sameColor
            ? firstPalette.glow
            : "rgba(255, 255, 255, 0.88)";

          addWave({
            x: (firstBall.x + secondBall.x) / 2,
            y: (firstBall.y + secondBall.y) / 2,
          }, color, collision.impactSpeed);
        }
      }
    }
  }

  pushLinePiecesApart(game.player, true);
  pushLinePiecesApart(game.cpu, true);

  placedBalls.forEach((ball) => {
    confineBallToArena(ball);

    if (getSpeed(ball) <= STOP_SPEED * 0.35) {
      stopBall(ball);
    }
  });

  updateAttackerSpin(placedBalls, dt);

  ["player", "cpu"].forEach((teamId) => {
    const shot = game.free.shots[teamId];

    if (!shot?.active) {
      return;
    }

    const activeTeam = game[teamId];
    const enemyTeam = teamId === "player" ? game.cpu : game.player;
    const attacker = activeTeam.balls[ATTACKER_INDEX];

    if (!attacker?.placed) {
      finishFreeAttackerShot(teamId);
      return;
    }

    const previousPosition = previousPositions.get(attacker) ?? { x: attacker.x, y: attacker.y };
    const ownSegment = getLineSegment(activeTeam);
    const enemySegment = getLineSegment(enemyTeam);

    if (ownSegment) {
      const ownImpact = detectMovingCircleLineHit(attacker, previousPosition, ownSegment);

      if (ownImpact.hit) {
        registerFreeLineHit(teamId, "own", ownImpact.point);
      }
    }

    if (enemySegment) {
      const enemyImpact = detectMovingCircleLineHit(attacker, previousPosition, enemySegment);

      if (enemyImpact.hit) {
        registerFreeLineHit(teamId, "enemy", enemyImpact.point);
      }
    }

    if (!isPieceMoving(attacker)) {
      finishFreeAttackerShot(teamId);
    }
  });
}

function triggerFreeCpuAction(now = performance.now()) {
  if (now < game.free.nextCpuActionAt) {
    return;
  }

  const ball = chooseFreeCpuBall();

  if (!ball) {
    scheduleFreeCpuAction(now + 120);
    return;
  }

  const velocity = buildFreeCpuVelocity(ball);
  launchShot("cpu", ball.index, velocity);
  scheduleFreeCpuAction(now);
}

function updateEffects(dt) {
  game.effects.sparks = game.effects.sparks.filter((spark) => {
    const nextLife = spark.life - dt;
    spark.life = nextLife;
    return nextLife > 0;
  });

  game.effects.waves = game.effects.waves.filter((wave) => {
    const nextLife = wave.life - dt;
    wave.life = nextLife;
    return nextLife > 0;
  });

  if (game.banner && performance.now() >= game.banner.until) {
    game.banner = null;
  }
}

function updateLoop(dt) {
  updateEffects(dt);

  if (isFreeMode() && game.state !== GAME_STATES.MENU && game.state !== GAME_STATES.GAME_OVER) {
    updateFreeMotion(dt);
    triggerFreeCpuAction(performance.now());
    return;
  }

  if (game.state === GAME_STATES.PLAYER_SHOT || game.state === GAME_STATES.CPU_SHOT) {
    updateShot(dt);
    return;
  }

  if (game.state === GAME_STATES.CPU_THINK && performance.now() >= game.cpuThinkAt) {
    const cpuChoice = chooseCpuShot(game, getRequiredRole());
    launchShot("cpu", cpuChoice.ballIndex, cpuChoice.velocity);
    return;
  }

  if (game.state === GAME_STATES.ROUND_END && performance.now() >= game.roundEndAt) {
    const nextState = game.nextState;
    game.nextState = null;

    if (nextState === GAME_STATES.CPU_THINK) {
      beginCpuThink();
    } else if (nextState === GAME_STATES.PLAYER_AIM) {
      beginPlayerTurn();
    }
  }
}

function frame(now) {
  if (!frame.lastTime) {
    frame.lastTime = now;
  }

  const dt = Math.min((now - frame.lastTime) / 1000, 1 / 24);
  frame.lastTime = now;

  updateLoop(dt);
  renderer.draw(game);
  window.requestAnimationFrame(frame);
}

canvas.addEventListener("pointerdown", beginAim);
canvas.addEventListener("pointermove", updateAim);
canvas.addEventListener("pointerup", releaseAim);
canvas.addEventListener("pointercancel", cancelAim);
canvas.addEventListener("pointerleave", (event) => {
  if (game.aim.dragging && event.pointerId === game.aim.pointerId) {
    releaseAim(event);
  }
});

playButton.addEventListener("click", startCpuMatch);
freeModeButton?.addEventListener("click", startFreeMode);
localMultiplayerButton.addEventListener("click", startLocalMatch);
restartMenuButton.addEventListener("click", () => resetMatch());
optionsButton.addEventListener("click", toggleMenuOptions);
quitButton.addEventListener("click", backToMenu);
tutorialButton?.addEventListener("click", completeTutorial);
colorOptionButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setTeamColor(button.dataset.team, button.dataset.color);
  });
});
revealButton.addEventListener("click", handleRevealButton);
playAgainButton.addEventListener("click", () => resetMatch());
resetButton.addEventListener("click", backToMenu);

updateHud();
showMenu();
window.requestAnimationFrame(frame);
