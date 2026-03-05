export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function magnitude(x, y) {
  return Math.hypot(x, y);
}

export function normalize(x, y) {
  const length = magnitude(x, y);

  if (!length) {
    return { x: 0, y: 0 };
  }

  return { x: x / length, y: y / length };
}

export function distance(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
}

export function closestPointOnSegment(px, py, ax, ay, bx, by) {
  const abx = bx - ax;
  const aby = by - ay;
  const lengthSquared = (abx * abx) + (aby * aby);

  if (!lengthSquared) {
    return { x: ax, y: ay, t: 0 };
  }

  const apx = px - ax;
  const apy = py - ay;
  const t = clamp(((apx * abx) + (apy * aby)) / lengthSquared, 0, 1);

  return {
    x: ax + (abx * t),
    y: ay + (aby * t),
    t,
  };
}

export function distancePointToSegment(px, py, ax, ay, bx, by) {
  const closest = closestPointOnSegment(px, py, ax, ay, bx, by);
  return distance(px, py, closest.x, closest.y);
}

function orientation(ax, ay, bx, by, cx, cy) {
  const value = ((by - ay) * (cx - bx)) - ((bx - ax) * (cy - by));
  const epsilon = 0.000001;

  if (Math.abs(value) < epsilon) {
    return 0;
  }

  return value > 0 ? 1 : 2;
}

function onSegment(ax, ay, bx, by, cx, cy) {
  const epsilon = 0.000001;

  return (
    cx <= Math.max(ax, bx) + epsilon &&
    cx >= Math.min(ax, bx) - epsilon &&
    cy <= Math.max(ay, by) + epsilon &&
    cy >= Math.min(ay, by) - epsilon
  );
}

export function segmentsIntersect(ax, ay, bx, by, cx, cy, dx, dy) {
  const o1 = orientation(ax, ay, bx, by, cx, cy);
  const o2 = orientation(ax, ay, bx, by, dx, dy);
  const o3 = orientation(cx, cy, dx, dy, ax, ay);
  const o4 = orientation(cx, cy, dx, dy, bx, by);

  if (o1 !== o2 && o3 !== o4) {
    return true;
  }

  if (o1 === 0 && onSegment(ax, ay, bx, by, cx, cy)) {
    return true;
  }

  if (o2 === 0 && onSegment(ax, ay, bx, by, dx, dy)) {
    return true;
  }

  if (o3 === 0 && onSegment(cx, cy, dx, dy, ax, ay)) {
    return true;
  }

  if (o4 === 0 && onSegment(cx, cy, dx, dy, bx, by)) {
    return true;
  }

  return false;
}

export function distanceSegmentToSegment(ax, ay, bx, by, cx, cy, dx, dy) {
  if (segmentsIntersect(ax, ay, bx, by, cx, cy, dx, dy)) {
    return 0;
  }

  const d1 = distancePointToSegment(ax, ay, cx, cy, dx, dy);
  const d2 = distancePointToSegment(bx, by, cx, cy, dx, dy);
  const d3 = distancePointToSegment(cx, cy, ax, ay, bx, by);
  const d4 = distancePointToSegment(dx, dy, ax, ay, bx, by);

  return Math.min(d1, d2, d3, d4);
}

export function segmentMidpoint(ax, ay, bx, by) {
  return {
    x: (ax + bx) / 2,
    y: (ay + by) / 2,
  };
}
