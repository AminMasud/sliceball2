import { clamp, magnitude } from "../engine/geometry.js";
import { ARENA, DEFENDER_INDICES, MAX_DRAG_DISTANCE, getLineSegment, getSelectedBall } from "./entities.js";
import { GAME_STATES } from "./state.js";

function traceRoundedRect(ctx, x, y, width, height, radius) {
  const safeRadius = Math.min(radius, width / 2, height / 2);

  ctx.moveTo(x + safeRadius, y);
  ctx.lineTo(x + width - safeRadius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  ctx.lineTo(x + width, y + height - safeRadius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  ctx.lineTo(x + safeRadius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  ctx.lineTo(x, y + safeRadius);
  ctx.quadraticCurveTo(x, y, x + safeRadius, y);
}

function traceTriangle(ctx, radius) {
  const topY = -(radius * 1.15);
  const leftX = -(radius * 0.95);
  const rightX = radius * 0.95;
  const baseY = radius * 0.9;

  ctx.moveTo(0, topY);
  ctx.lineTo(rightX, baseY);
  ctx.lineTo(leftX, baseY);
  ctx.closePath();
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
  }

  isTeamVisible(game, teamId) {
    if (game.mode !== "local" || game.state !== GAME_STATES.PLAYER_SETUP) {
      return true;
    }

    if (game.setup.awaitingReveal) {
      return false;
    }

    return teamId === game.setup.actor;
  }

  draw(game) {
    const { ctx } = this;

    ctx.clearRect(0, 0, ARENA.width, ARENA.height);

    this.drawBackdrop(ctx);
    this.drawZones(ctx);
    this.drawMidline(ctx);

    if (this.isTeamVisible(game, game.cpu.id)) {
      this.drawConnection(ctx, game.cpu);
      this.drawTeamBalls(ctx, game.cpu, this.getHighlightIndex(game, game.cpu.id));
    }

    if (this.isTeamVisible(game, game.player.id)) {
      this.drawConnection(ctx, game.player);
      this.drawTeamBalls(ctx, game.player, this.getHighlightIndex(game, game.player.id));
    }

    if (game.aim.dragging) {
      const activeTeam = (game.mode === "local" || game.mode === "free")
        ? game[game.turn.actor]
        : game.player;
      const mover = getSelectedBall(activeTeam);

      if (mover?.placed) {
        this.drawAim(ctx, mover, game.aim.pointer);
      }
    }

    this.drawWaves(ctx, game.effects.waves);
    this.drawSparks(ctx, game.effects.sparks);

    if (game.banner && game.banner.text) {
      this.drawBanner(ctx, game.banner);
    }
  }

  getHighlightIndex(game, teamId) {
    const isAimState = game.state === GAME_STATES.PLAYER_AIM;
    const humanActionState = game.state === GAME_STATES.PLAYER_AIM || game.state === GAME_STATES.PLAYER_SHOT;

    if (humanActionState) {
      if (game.mode === "free") {
        return teamId === game.turn.actor ? game[teamId].selectedBallIndex : null;
      }

      if (game.mode === "local") {
        if (teamId !== game.turn.actor) {
          return null;
        }

        if (isAimState && game.turn.phase === "defender") {
          return DEFENDER_INDICES;
        }

        return game[teamId].selectedBallIndex;
      }

      if (teamId === "player") {
        if (isAimState && game.turn.phase === "defender") {
          return DEFENDER_INDICES;
        }

        return game.player.selectedBallIndex;
      }
    }

    if (teamId === "cpu" && (game.state === GAME_STATES.CPU_THINK || game.state === GAME_STATES.CPU_SHOT)) {
      return game.cpu.selectedBallIndex;
    }

    return null;
  }

  drawBackdrop(ctx) {
    const fill = ctx.createLinearGradient(0, 0, 0, ARENA.height);
    fill.addColorStop(0, "#f8fdfd");
    fill.addColorStop(0.5, "#edf4ff");
    fill.addColorStop(1, "#f7f9ff");
    ctx.fillStyle = fill;
    ctx.fillRect(0, 0, ARENA.width, ARENA.height);

    ctx.fillStyle = "rgba(78, 199, 194, 0.08)";
    ctx.beginPath();
    ctx.ellipse(58, 548, 88, 52, -0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(255, 123, 107, 0.08)";
    ctx.beginPath();
    ctx.ellipse(298, 102, 78, 44, 0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  drawZones(ctx) {
    ctx.fillStyle = "rgba(255, 123, 107, 0.05)";
    ctx.fillRect(0, 0, ARENA.width, ARENA.height / 2);

    ctx.fillStyle = "rgba(78, 199, 194, 0.05)";
    ctx.fillRect(0, ARENA.height / 2, ARENA.width, ARENA.height / 2);
  }

  drawMidline(ctx) {
    ctx.save();
    ctx.setLineDash([7, 8]);
    ctx.strokeStyle = "rgba(24, 49, 83, 0.12)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(18, ARENA.height / 2);
    ctx.lineTo(ARENA.width - 18, ARENA.height / 2);
    ctx.stroke();
    ctx.restore();
  }

  drawConnection(ctx, team) {
    const segment = getLineSegment(team);

    if (!segment) {
      return;
    }

    ctx.save();
    ctx.lineCap = "round";
    ctx.lineWidth = 10;
    ctx.strokeStyle = team.palette.line;
    ctx.shadowColor = team.palette.glow;
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.moveTo(segment.ax, segment.ay);
    ctx.lineTo(segment.bx, segment.by);
    ctx.stroke();
    ctx.restore();
  }

  drawTeamBalls(ctx, team, highlightIndex) {
    team.balls.forEach((ball) => {
      if (!ball.placed) {
        return;
      }

      const active = Array.isArray(highlightIndex)
        ? highlightIndex.includes(ball.index)
        : highlightIndex === ball.index;

      this.drawUnit(ctx, ball, team.palette, active);
    });
  }

  drawUnit(ctx, ball, palette, active) {
    if (ball.role === "attacker") {
      this.drawTriangleUnit(ctx, ball, palette, active);
      return;
    }

    this.drawCircleUnit(ctx, ball, palette, active);
  }

  drawCircleUnit(ctx, ball, palette, active) {
    ctx.save();
    const gradient = ctx.createRadialGradient(
      ball.x - (ball.radius * 0.35),
      ball.y - (ball.radius * 0.4),
      ball.radius * 0.2,
      ball.x,
      ball.y,
      ball.radius,
    );
    gradient.addColorStop(0, palette.bright);
    gradient.addColorStop(1, palette.core);

    ctx.fillStyle = gradient;
    ctx.shadowColor = palette.shadow;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
    ctx.beginPath();
    ctx.arc(
      ball.x - (ball.radius * 0.32),
      ball.y - (ball.radius * 0.35),
      ball.radius * 0.22,
      0,
      Math.PI * 2,
    );
    ctx.fill();

    if (active) {
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.65)";
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.radius + 6, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  drawTriangleUnit(ctx, ball, palette, active) {
    const speed = Math.hypot(ball.vx, ball.vy);

    if (speed > 8) {
      this.drawAttackerHalo(ctx, ball, palette, speed);
    }

    ctx.save();
    ctx.translate(ball.x, ball.y);
    ctx.rotate(ball.rotation ?? 0);

    const gradient = ctx.createLinearGradient(0, -ball.radius, 0, ball.radius);
    gradient.addColorStop(0, palette.bright);
    gradient.addColorStop(1, palette.core);

    ctx.fillStyle = gradient;
    ctx.shadowColor = palette.shadow;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    traceTriangle(ctx, ball.radius);
    ctx.fill();

    ctx.save();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.translate(0, -(ball.radius * 0.08));
    ctx.beginPath();
    traceTriangle(ctx, ball.radius * 0.42);
    ctx.fill();
    ctx.restore();

    if (active) {
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
      ctx.beginPath();
      traceTriangle(ctx, ball.radius + 7);
      ctx.stroke();
    }

    ctx.restore();
  }

  drawAttackerHalo(ctx, ball, palette, speed) {
    const pulse = (Math.sin((performance.now() / 110) + (ball.index * 0.9)) + 1) / 2;
    const directionLength = Math.max(1, Math.hypot(ball.vx, ball.vy));
    const directionX = ball.vx / directionLength;
    const directionY = ball.vy / directionLength;
    const haloRadius = ball.radius + 8 + Math.min(speed / 120, 7);

    ctx.save();
    ctx.globalAlpha = 0.18 + (pulse * 0.1);
    ctx.strokeStyle = palette.glow;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, haloRadius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.globalAlpha = 0.12 + (pulse * 0.08);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, haloRadius + 6, 0, Math.PI * 2);
    ctx.stroke();

    ctx.globalAlpha = 0.18;
    ctx.fillStyle = palette.glow;
    ctx.beginPath();
    ctx.ellipse(
      ball.x - (directionX * (ball.radius * 1.1)),
      ball.y - (directionY * (ball.radius * 1.1)),
      ball.radius * 0.9,
      ball.radius * 0.55,
      Math.atan2(directionY, directionX),
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.restore();
  }

  drawAim(ctx, ball, pointer) {
    const dx = ball.x - pointer.x;
    const dy = ball.y - pointer.y;
    const dragDistance = magnitude(dx, dy);

    if (dragDistance < 3) {
      return;
    }

    const clampedDistance = clamp(dragDistance, 0, MAX_DRAG_DISTANCE);
    const scale = clampedDistance / dragDistance;
    const lineX = ball.x + (dx * scale);
    const lineY = ball.y + (dy * scale);
    const powerRatio = clampedDistance / MAX_DRAG_DISTANCE;

    ctx.save();
    ctx.lineCap = "round";
    ctx.strokeStyle = "rgba(24, 49, 83, 0.42)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(ball.x, ball.y);
    ctx.lineTo(lineX, lineY);
    ctx.stroke();

    ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
    ctx.beginPath();
    ctx.arc(lineX, lineY, 4, 0, Math.PI * 2);
    ctx.fill();

    const meterWidth = 118;
    const meterX = (ARENA.width - meterWidth) / 2;
    const meterY = ARENA.height - 30;

    ctx.fillStyle = "rgba(24, 49, 83, 0.12)";
    ctx.beginPath();
    traceRoundedRect(ctx, meterX, meterY, meterWidth, 8, 999);
    ctx.fill();

    const meterFill = ctx.createLinearGradient(meterX, meterY, meterX + meterWidth, meterY);
    meterFill.addColorStop(0, "#5ad3b8");
    meterFill.addColorStop(1, "#f9a067");
    ctx.fillStyle = meterFill;
    ctx.beginPath();
    traceRoundedRect(ctx, meterX, meterY, meterWidth * powerRatio, 8, 999);
    ctx.fill();
    ctx.restore();
  }

  drawSparks(ctx, sparks) {
    sparks.forEach((spark) => {
      const ratio = spark.life / spark.maxLife;
      const radius = (1 - ratio) * 22;

      ctx.save();
      ctx.globalAlpha = ratio;
      ctx.strokeStyle = spark.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(spark.x, spark.y, radius + 5, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
      ctx.beginPath();
      ctx.arc(spark.x, spark.y, 3 + (ratio * 2), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  drawWaves(ctx, waves) {
    waves.forEach((wave) => {
      const ratio = wave.life / wave.maxLife;
      const radius = wave.radius + ((1 - ratio) * (wave.maxRadius - wave.radius));

      ctx.save();
      ctx.globalAlpha = ratio * 0.85;
      ctx.strokeStyle = wave.color;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(wave.x, wave.y, radius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.globalAlpha = ratio * 0.35;
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.arc(wave.x, wave.y, radius - 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    });
  }

  drawBanner(ctx, banner) {
    const alpha = clamp((banner.until - performance.now()) / banner.duration, 0, 1);

    if (alpha <= 0) {
      return;
    }

    const progress = 1 - alpha;
    const scale = 0.94 + (Math.sin(progress * Math.PI) * 0.08);
    const mainText = banner.text ?? "";
    const subtext = banner.subtext ?? "";

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(ARENA.width / 2, 313);
    ctx.rotate(banner.tilt ?? 0);
    ctx.scale(scale, scale);

    ctx.font = "900 42px Comic Sans MS";
    const mainWidth = ctx.measureText(mainText).width;
    ctx.font = "900 14px Comic Sans MS";
    const subWidth = subtext ? ctx.measureText(subtext).width : 0;
    const plateWidth = Math.max(180, mainWidth + 54, subWidth + 42);
    const plateHeight = subtext ? 88 : 64;

    ctx.fillStyle = "rgba(255, 255, 255, 0.94)";
    ctx.strokeStyle = "rgba(31, 49, 86, 0.16)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    traceRoundedRect(ctx, -plateWidth / 2, -plateHeight / 2, plateWidth, plateHeight, 28);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "rgba(255, 255, 255, 0.96)";
    ctx.beginPath();
    ctx.arc((-plateWidth / 2) + 24, (-plateHeight / 2) + 18, 10, 0, Math.PI * 2);
    ctx.arc((plateWidth / 2) - 24, (plateHeight / 2) - 18, 8, 0, Math.PI * 2);
    ctx.arc((plateWidth / 2) - 42, (-plateHeight / 2) + 14, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.lineJoin = "round";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.font = "900 42px Comic Sans MS";
    ctx.lineWidth = 10;
    ctx.strokeStyle = banner.outline ?? "#1f3156";
    ctx.strokeText(mainText, 0, subtext ? -8 : 0);
    ctx.fillStyle = banner.fill ?? "#ffe062";
    ctx.fillText(mainText, 0, subtext ? -8 : 0);

    ctx.fillStyle = "rgba(255, 255, 255, 0.68)";
    ctx.fillText(mainText, -2, subtext ? -13 : -5);

    if (subtext) {
      ctx.font = "900 14px Comic Sans MS";
      ctx.lineWidth = 5;
      ctx.strokeStyle = "rgba(31, 49, 86, 0.92)";
      ctx.strokeText(subtext, 0, 26);
      ctx.fillStyle = "#ffffff";
      ctx.fillText(subtext, 0, 26);
    }

    ctx.strokeStyle = "rgba(31, 49, 86, 0.22)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo((-plateWidth / 2) + 18, (-plateHeight / 2) + 10);
    ctx.lineTo((-plateWidth / 2) + 36, (-plateHeight / 2) + 3);
    ctx.moveTo((plateWidth / 2) - 18, (-plateHeight / 2) + 6);
    ctx.lineTo((plateWidth / 2) - 34, (-plateHeight / 2) - 2);
    ctx.moveTo((plateWidth / 2) - 16, (plateHeight / 2) - 8);
    ctx.lineTo((plateWidth / 2) - 30, (plateHeight / 2) + 4);
    ctx.stroke();

    ctx.restore();
  }
}
