import { clamp } from "./geometry.js";

export const PHYSICS = Object.freeze({
  damping: 0.986,
  wallBounce: 0.9,
  pieceBounce: 0.92,
});

export function advanceBall(ball, arena, dt, overrides = {}) {
  const damping = overrides.damping ?? PHYSICS.damping;
  const wallBounce = overrides.wallBounce ?? PHYSICS.wallBounce;
  const previousPosition = { x: ball.x, y: ball.y };

  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;

  const frameFactor = dt * 60;
  const dampingFactor = Math.pow(damping, frameFactor);
  ball.vx *= dampingFactor;
  ball.vy *= dampingFactor;

  const minX = ball.radius;
  const maxX = arena.width - ball.radius;
  const minY = ball.radius;
  const maxY = arena.height - ball.radius;

  if (ball.x <= minX) {
    ball.x = minX;
    ball.vx = Math.abs(ball.vx) * wallBounce;
  } else if (ball.x >= maxX) {
    ball.x = maxX;
    ball.vx = -Math.abs(ball.vx) * wallBounce;
  }

  if (ball.y <= minY) {
    ball.y = minY;
    ball.vy = Math.abs(ball.vy) * wallBounce;
  } else if (ball.y >= maxY) {
    ball.y = maxY;
    ball.vy = -Math.abs(ball.vy) * wallBounce;
  }

  ball.vx = clamp(ball.vx, -1600, 1600);
  ball.vy = clamp(ball.vy, -1600, 1600);

  return previousPosition;
}

export function getSpeed(ball) {
  return Math.hypot(ball.vx, ball.vy);
}

export function stopBall(ball) {
  ball.vx = 0;
  ball.vy = 0;
}

export function resolveBallCollision(ballA, ballB, overrides = {}) {
  const pieceBounce = overrides.pieceBounce ?? PHYSICS.pieceBounce;
  const dx = ballB.x - ballA.x;
  const dy = ballB.y - ballA.y;
  const minDistance = ballA.radius + ballB.radius;
  let distance = Math.hypot(dx, dy);
  let normalX = 0;
  let normalY = 0;

  if (distance === 0) {
    distance = minDistance || 1;
    normalX = 1;
    normalY = 0;
  } else {
    normalX = dx / distance;
    normalY = dy / distance;
  }

  if (distance >= minDistance) {
    return null;
  }

  const overlap = minDistance - distance;
  const correctionX = normalX * (overlap / 2);
  const correctionY = normalY * (overlap / 2);

  ballA.x -= correctionX;
  ballA.y -= correctionY;
  ballB.x += correctionX;
  ballB.y += correctionY;

  const relativeVelocityX = ballB.vx - ballA.vx;
  const relativeVelocityY = ballB.vy - ballA.vy;
  const velocityAlongNormal = (relativeVelocityX * normalX) + (relativeVelocityY * normalY);
  const impactSpeed = Math.max(0, -velocityAlongNormal);

  if (velocityAlongNormal > 0) {
    return {
      impactSpeed,
      normalX,
      normalY,
      overlap,
    };
  }

  const impulse = (-(1 + pieceBounce) * velocityAlongNormal) / 2;
  const impulseX = impulse * normalX;
  const impulseY = impulse * normalY;

  ballA.vx = clamp(ballA.vx - impulseX, -1600, 1600);
  ballA.vy = clamp(ballA.vy - impulseY, -1600, 1600);
  ballB.vx = clamp(ballB.vx + impulseX, -1600, 1600);
  ballB.vy = clamp(ballB.vy + impulseY, -1600, 1600);

  return {
    impactSpeed,
    normalX,
    normalY,
    overlap,
  };
}
