import { closestPointOnSegment, segmentsIntersect } from "./geometry.js";

export function detectMovingCircleLineHit(ball, previousPosition, segment) {
  const abx = segment.bx - segment.ax;
  const aby = segment.by - segment.ay;
  const length = Math.hypot(abx, aby);

  if (length < 0.000001) {
    return { hit: false, point: null };
  }

  const normalX = -aby / length;
  const normalY = abx / length;
  const prevSide = ((previousPosition.x - segment.ax) * normalX) + ((previousPosition.y - segment.ay) * normalY);
  const nextSide = ((ball.x - segment.ax) * normalX) + ((ball.y - segment.ay) * normalY);
  const sideEpsilon = 0.0001;
  const crossedSides = (
    (prevSide > sideEpsilon && nextSide < -sideEpsilon) ||
    (prevSide < -sideEpsilon && nextSide > sideEpsilon)
  );

  if (!crossedSides) {
    return { hit: false, point: null };
  }

  const crossedSegment = segmentsIntersect(
    previousPosition.x,
    previousPosition.y,
    ball.x,
    ball.y,
    segment.ax,
    segment.ay,
    segment.bx,
    segment.by,
  );

  if (!crossedSegment) {
    return { hit: false, point: null };
  }

  const transition = prevSide / (prevSide - nextSide);
  const hitX = previousPosition.x + ((ball.x - previousPosition.x) * transition);
  const hitY = previousPosition.y + ((ball.y - previousPosition.y) * transition);
  const point = closestPointOnSegment(
    hitX,
    hitY,
    segment.ax,
    segment.ay,
    segment.bx,
    segment.by,
  );

  return {
    hit: true,
    point: {
      x: point.x,
      y: point.y,
    },
  };
}
