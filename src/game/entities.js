export const ARENA = Object.freeze({
  width: 360,
  height: 640,
});

export const BALL_RADIUS = 14;
export const MAX_DRAG_DISTANCE = 120;
export const MAX_LAUNCH_SPEED = 860;
export const STOP_SPEED = 28;
export const WIN_SCORE = 3;
export const PLACEMENT_PADDING = 22;
export const PLACEMENT_SPACING = BALL_RADIUS * 2.7;
export const DEFENDER_INDICES = Object.freeze([0, 1]);
export const ATTACKER_INDEX = 2;

function createBall(index) {
  return {
    index,
    role: index === ATTACKER_INDEX ? "attacker" : "defender",
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    rotation: 0,
    radius: BALL_RADIUS,
    placed: false,
  };
}

function createTeam(config) {
  return {
    id: config.id,
    label: config.label,
    palette: config.palette,
    nextDefenderIndex: 0,
    balls: [
      createBall(0),
      createBall(1),
      createBall(2),
    ],
    selectedBallIndex: 2,
    score: 0,
  };
}

export function createGameEntities() {
  return {
    cpu: createTeam({
      id: "cpu",
      label: "CPU",
      palette: {
        core: "#ff7b6b",
        bright: "#fff0dc",
        line: "rgba(255, 123, 107, 0.42)",
        glow: "rgba(255, 123, 107, 0.88)",
        shadow: "rgba(135, 62, 54, 0.34)",
      },
    }),
    player: createTeam({
      id: "player",
      label: "Player",
      palette: {
        core: "#4ec7c2",
        bright: "#ddfffb",
        line: "rgba(78, 199, 194, 0.46)",
        glow: "rgba(78, 199, 194, 0.88)",
        shadow: "rgba(37, 109, 106, 0.34)",
      },
    }),
  };
}

export function clearBall(ball) {
  ball.x = 0;
  ball.y = 0;
  ball.vx = 0;
  ball.vy = 0;
  ball.rotation = 0;
  ball.placed = false;
}

export function clearTeamPositions(team) {
  team.balls.forEach((ball) => {
    clearBall(ball);
  });
}

export function setBallPosition(ball, x, y) {
  ball.x = x;
  ball.y = y;
  ball.vx = 0;
  ball.vy = 0;
  ball.rotation = 0;
  ball.placed = true;
}

export function setSelectedBall(team, ballIndex) {
  team.selectedBallIndex = ballIndex;
}

export function getSelectedBall(team) {
  return team.balls[team.selectedBallIndex];
}

export function getLineSegment(team) {
  const [firstIndex, secondIndex] = DEFENDER_INDICES;
  const firstBall = team.balls[firstIndex];
  const secondBall = team.balls[secondIndex];

  if (!firstBall || !secondBall || !firstBall.placed || !secondBall.placed) {
    return null;
  }

  return {
    ax: firstBall.x,
    ay: firstBall.y,
    bx: secondBall.x,
    by: secondBall.y,
  };
}

export function areAllBallsPlaced(team) {
  return team.balls.every((ball) => ball.placed);
}

export function isAttackerIndex(ballIndex) {
  return ballIndex === ATTACKER_INDEX;
}
