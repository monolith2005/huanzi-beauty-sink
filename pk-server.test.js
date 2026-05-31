const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const test = require("node:test");

const SERVER_URL = "http://127.0.0.1:9876";

let serverProcess;

function request(path, options = {}) {
  return fetch(`${SERVER_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  }).then(async (response) => {
    const json = await response.json();
    return { status: response.status, json };
  });
}

function waitForServer() {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("server did not start")), 4000);
    serverProcess.stdout.on("data", (chunk) => {
      if (String(chunk).includes("Leaderboard server")) {
        clearTimeout(timeout);
        resolve();
      }
    });
    serverProcess.stderr.on("data", (chunk) => {
      reject(new Error(String(chunk)));
    });
  });
}

test.before(async () => {
  serverProcess = spawn(process.execPath, ["leaderboard-server.js"], {
    cwd: __dirname,
    env: { ...process.env, PORT: "9876" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  await waitForServer();
});

test.after(() => {
  serverProcess?.kill();
});

test("room-code pk: join → both ready → first finisher wins", async () => {
  const created = await request("/pk/rooms", {
    method: "POST",
    body: { player: { name: "A", avatar: "粉" }, targetLevels: 5 },
  });
  assert.equal(created.status, 200);
  assert.equal(created.json.status, "waiting");
  assert.equal(created.json.totalSeconds, 100);
  assert.match(created.json.roomCode, /^[A-Z0-9]{4}$/);

  const joined = await request(`/pk/rooms/${created.json.roomCode}/join`, {
    method: "POST",
    body: { player: { name: "B", avatar: "金" } },
  });
  assert.equal(joined.status, 200);
  assert.equal(joined.json.status, "lobby");
  assert.equal(joined.json.matchId, created.json.matchId);

  // Both ready → match becomes active
  await request(`/pk/matches/${created.json.matchId}/ready`, {
    method: "POST",
    body: { playerId: created.json.playerId },
  });
  await request(`/pk/matches/${created.json.matchId}/ready`, {
    method: "POST",
    body: { playerId: joined.json.playerId },
  });

  const progress = await request(`/pk/matches/${created.json.matchId}/progress`, {
    method: "POST",
    body: { playerId: created.json.playerId, completedLevels: 5, finished: true },
  });
  assert.equal(progress.status, 200);
  assert.equal(progress.json.match.status, "finished");
  assert.equal(progress.json.match.result.type, "winner");
  assert.equal(progress.json.match.result.winnerId, created.json.playerId);
});

test("random matchmaking pairs players with same target level", async () => {
  const first = await request("/pk/matchmaking", {
    method: "POST",
    body: { player: { name: "C", avatar: "星" }, targetLevels: 10 },
  });
  assert.equal(first.status, 200);
  assert.equal(first.json.status, "waiting");

  const second = await request("/pk/matchmaking", {
    method: "POST",
    body: { player: { name: "D", avatar: "花" }, targetLevels: 10 },
  });
  assert.equal(second.status, 200);
  assert.equal(second.json.status, "lobby");
  assert.equal(second.json.matchId, first.json.matchId);
});

test("expired match with equal progress is a draw", async () => {
  const created = await request("/pk/rooms", {
    method: "POST",
    body: { player: { name: "E", avatar: "月" }, targetLevels: 5 },
  });
  const joined = await request(`/pk/rooms/${created.json.roomCode}/join`, {
    method: "POST",
    body: { player: { name: "F", avatar: "心" } },
  });

  // Both ready to activate
  await request(`/pk/matches/${created.json.matchId}/ready`, {
    method: "POST",
    body: { playerId: created.json.playerId },
  });
  await request(`/pk/matches/${created.json.matchId}/ready`, {
    method: "POST",
    body: { playerId: joined.json.playerId },
  });

  await request(`/pk/matches/${created.json.matchId}/progress`, {
    method: "POST",
    body: { playerId: created.json.playerId, completedLevels: 2 },
  });
  await request(`/pk/matches/${created.json.matchId}/progress`, {
    method: "POST",
    body: { playerId: joined.json.playerId, completedLevels: 2 },
  });

  const expired = await request(`/pk/matches/${created.json.matchId}?playerId=${created.json.playerId}&forceExpire=1`);
  assert.equal(expired.status, 200);
  assert.equal(expired.json.match.status, "finished");
  assert.equal(expired.json.match.result.type, "draw");
});
