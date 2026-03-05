import { detectMovingCircleLineHit } from "../engine/collisions.js";
import { distancePointToSegment, segmentMidpoint } from "../engine/geometry.js";
import { advanceBall, getSpeed, stopBall } from "../engine/physics.js";
import { ARENA, ATTACKER_INDEX, MAX_LAUNCH_SPEED, STOP_SPEED, getLineSegment } from "./entities.js";

const SAMPLE_COUNT = 6;
const SIMULATION_STEPS = 220;
const SIMULATION_DT = 1 / 60;

function simulateCandidate(origin, velocity, radius, targetSegment, ownSegment) {
  const ball = {
    x: origin.x,
    y: origin.y,
    vx: velocity.vx,
    vy: velocity.vy,
    radius,
  };

  let bestDistance = Infinity;
  let hitEnemy = false;
  let hitOwn = false;

  for (let step = 0; step < SIMULATION_STEPS; step += 1) {
    const previousPosition = advanceBall(ball, ARENA, SIMULATION_DT);

    if (targetSegment) {
      const lineDistance = distancePointToSegment(
        ball.x,
        ball.y,
        targetSegment.ax,
        targetSegment.ay,
        targetSegment.bx,
        targetSegment.by,
      ) - radius;

      bestDistance = Math.min(bestDistance, lineDistance);
    }

    if (ownSegment && !hitOwn && detectMovingCircleLineHit(ball, previousPosition, ownSegment).hit) {
      hitOwn = true;
    }

    if (targetSegment && !hitEnemy && detectMovingCircleLineHit(ball, previousPosition, targetSegment).hit) {
      hitEnemy = true;
    }

    if (hitEnemy && hitOwn) {
      break;
    }

    if (getSpeed(ball) <= STOP_SPEED) {
      stopBall(ball);
      break;
    }
  }

  return {
    hitEnemy,
    hitOwn,
    bestDistance,
  };
}

function buildVelocity(angle, power) {
  return {
    vx: Math.cos(angle) * power,
    vy: Math.sin(angle) * power,
  };
}

function chooseAttackerFallback(attacker, targetCenter) {
  const baseAngle = Math.atan2(targetCenter.y - attacker.y, targetCenter.x - attacker.x);

  return {
    ballIndex: ATTACKER_INDEX,
    velocity: buildVelocity(baseAngle, MAX_LAUNCH_SPEED * 0.62),
  };
}

function chooseDefenderFallback(game, targetCenter) {
  const defenderIndex = Math.random() < 0.5 ? 0 : 1;
  const ball = game.cpu.balls[defenderIndex];
  const angleOffset = (Math.random() - 0.5) * 0.8;
  const baseAngle = Math.atan2(targetCenter.y - ball.y, targetCenter.x - ball.x);

  return {
    ballIndex: defenderIndex,
    velocity: buildVelocity(baseAngle + angleOffset, MAX_LAUNCH_SPEED * (0.32 + (Math.random() * 0.18))),
  };
}

function scoreAttackerCandidate(result) {
  if (result.hitEnemy) {
    return 2000;
  }

  if (result.hitOwn) {
    return 35;
  }

  return -result.bestDistance;
}

export function chooseCpuShot(game, requiredRole = "attacker") {
  const targetSegment = getLineSegment(game.player);
  const ownSegment = getLineSegment(game.cpu);
  const attacker = game.cpu.balls[ATTACKER_INDEX];
  const targetCenter = targetSegment
    ? segmentMidpoint(
        targetSegment.ax,
        targetSegment.ay,
        targetSegment.bx,
        targetSegment.by,
      )
    : { x: ARENA.width / 2, y: (ARENA.height * 3) / 4 };

  let bestAttacker = null;

  if (requiredRole === "defender") {
    return chooseDefenderFallback(game, targetCenter);
  }

  if (attacker?.placed) {
    const baseAngle = Math.atan2(targetCenter.y - attacker.y, targetCenter.x - attacker.x);

    for (let sampleIndex = 0; sampleIndex < SAMPLE_COUNT; sampleIndex += 1) {
      const angleOffset = (Math.random() - 0.5) * 1.5;
      const power = (0.45 + (Math.random() * 0.5)) * MAX_LAUNCH_SPEED;
      const velocity = buildVelocity(baseAngle + angleOffset, power);
      const result = simulateCandidate(attacker, velocity, attacker.radius, targetSegment, ownSegment);
      const score = scoreAttackerCandidate(result);

      if (result.hitEnemy) {
        return {
          ballIndex: ATTACKER_INDEX,
          velocity,
        };
      }

      if (!bestAttacker || score > bestAttacker.score) {
        bestAttacker = {
          velocity,
          score,
        };
      }
    }
  }

  if (bestAttacker) {
    return {
      ballIndex: ATTACKER_INDEX,
      velocity: bestAttacker.velocity,
    };
  }

  if (attacker?.placed) {
    return chooseAttackerFallback(attacker, targetCenter);
  }

  return chooseDefenderFallback(game, targetCenter);
}
