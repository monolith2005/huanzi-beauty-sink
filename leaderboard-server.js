const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT || 8787);
const DATA_FILE = path.join(__dirname, "leaderboard-data.json");
const PK_SECONDS_PER_LEVEL = 20;
const VALID_PK_LEVELS = new Set([5, 10]);
const AVATARS = ["粉", "金", "星", "花", "月", "心"];
const pkMatches = new Map();
const waitingByRoom = new Map();
const matchmakingQueues = new Map();

function readRecords() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch (_) {
    return [];
  }
}

function writeRecords(records) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(records.slice(0, 100), null, 2));
}

function normalize(record) {
  return {
    id: String(record.id || Date.now()),
    avatar: String(record.avatar || "粉").slice(0, 2),
    name: String(record.name || "匿名玩家").slice(0, 12),
    score: Math.max(0, Number(record.score) || 0),
    durationSeconds: Math.max(60, Number(record.durationSeconds) || 60),
    createdAt: record.createdAt || new Date().toISOString(),
  };
}

function sortRecords(records) {
  return records.sort((a, b) =>
    b.score - a.score ||
    b.durationSeconds - a.durationSeconds ||
    String(b.createdAt).localeCompare(String(a.createdAt))
  );
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(JSON.stringify(payload));
}

function readBody(req, limit = 8192) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > limit) {
        reject(new Error("body too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(body || "{}"));
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function uid(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

function roomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 4; i += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return waitingByRoom.has(code) ? roomCode() : code;
}

function normalizeTargetLevels(value) {
  const levels = Number(value);
  return VALID_PK_LEVELS.has(levels) ? levels : 5;
}

function normalizePlayer(player = {}) {
  return {
    id: uid("player"),
    avatar: AVATARS.includes(player.avatar) ? player.avatar : String(player.avatar || AVATARS[0]).slice(0, 2),
    name: String(player.name || "匿名玩家").slice(0, 12),
    completedLevels: 0,
    finished: false,
    left: false,
    ready: false,
    updatedAt: Date.now(),
  };
}

function publicPlayer(player) {
  if (!player) return null;
  return {
    id: player.id,
    avatar: player.avatar,
    name: player.name,
    completedLevels: player.completedLevels,
    finished: player.finished,
    left: player.left,
    ready: player.ready,
    updatedAt: player.updatedAt,
  };
}

function publicMatch(match, playerId) {
  const players = match.players.map(publicPlayer);
  const self = players.find((player) => player.id === playerId) || null;
  const opponent = players.find((player) => player.id !== playerId) || null;
  const remainingMs = match.deadline ? Math.max(0, match.deadline - Date.now()) : match.totalSeconds * 1000;
  return {
    matchId: match.id,
    roomCode: match.roomCode || "",
    mode: match.mode,
    status: match.status,
    targetLevels: match.targetLevels,
    totalSeconds: match.totalSeconds,
    startedAt: match.startedAt || null,
    deadline: match.deadline || null,
    remainingSeconds: Math.ceil(remainingMs / 1000),
    players,
    self,
    opponent,
    result: match.result || null,
  };
}

function createMatch({ mode, targetLevels, roomCode: code, firstPlayer }) {
  const totalSeconds = targetLevels * PK_SECONDS_PER_LEVEL;
  const match = {
    id: uid("match"),
    mode,
    roomCode: code || "",
    targetLevels,
    totalSeconds,
    status: "waiting",
    players: [firstPlayer],
    startedAt: null,
    deadline: null,
    result: null,
    createdAt: Date.now(),
  };
  pkMatches.set(match.id, match);
  return match;
}

function startMatch(match, secondPlayer) {
  if (secondPlayer && !match.players.some((player) => player.id === secondPlayer.id)) {
    match.players.push(secondPlayer);
  }
  // Both players in the room — go to lobby waiting for ready
  match.status = "lobby";
  return match;
}

function startGame(match) {
  match.status = "active";
  match.startedAt = Date.now();
  match.deadline = match.startedAt + match.totalSeconds * 1000;
  return match;
}

function finishMatch(match, result) {
  if (match.status === "finished") return match;
  match.status = "finished";
  match.result = { ...result, finishedAt: Date.now() };
  if (match.roomCode) waitingByRoom.delete(match.roomCode);
  for (const [levels, queuedMatch] of matchmakingQueues.entries()) {
    if (queuedMatch.id === match.id) matchmakingQueues.delete(levels);
  }
  return match;
}

function resolveExpired(match, forceExpire = false) {
  if (match.status !== "active") return match;
  if (!forceExpire && Date.now() < match.deadline) return match;
  const [a, b] = match.players;
  if (!b) return match;
  if (a.completedLevels > b.completedLevels) {
    return finishMatch(match, { type: "winner", winnerId: a.id, reason: "timeup" });
  }
  if (b.completedLevels > a.completedLevels) {
    return finishMatch(match, { type: "winner", winnerId: b.id, reason: "timeup" });
  }
  return finishMatch(match, { type: "draw", reason: "timeup" });
}

function updatePlayerProgress(match, playerId, completedLevels, finished) {
  const player = match.players.find((entry) => entry.id === playerId);
  if (!player) return false;
  player.completedLevels = Math.max(player.completedLevels, Math.min(match.targetLevels, Number(completedLevels) || 0));
  player.finished = Boolean(finished) || player.completedLevels >= match.targetLevels;
  player.updatedAt = Date.now();
  if (player.finished) {
    finishMatch(match, { type: "winner", winnerId: player.id, reason: "finished" });
  } else {
    resolveExpired(match);
  }
  return true;
}

function leaveMatch(match, playerId) {
  const player = match.players.find((entry) => entry.id === playerId);
  if (!player) return false;
  player.left = true;
  player.updatedAt = Date.now();
  const opponent = match.players.find((entry) => entry.id !== playerId);
  if (match.status === "waiting") {
    finishMatch(match, { type: "cancelled", reason: "left" });
  } else if (match.status === "lobby" || match.status === "active") {
    // Leaving during lobby or gameplay = opponent wins
    finishMatch(match, { type: "winner", winnerId: opponent.id, reason: "left" });
  }
  return true;
}

function readyPlayer(match, playerId) {
  const player = match.players.find((entry) => entry.id === playerId);
  if (!player) return false;
  player.ready = true;
  player.updatedAt = Date.now();
  // If all players are ready, start the game
  if (match.players.length >= 2 && match.players.every((p) => p.ready)) {
    startGame(match);
  }
  return true;
}

function forfeitPlayer(match, playerId) {
  const player = match.players.find((entry) => entry.id === playerId);
  if (!player) return false;
  player.finished = true;
  player.updatedAt = Date.now();
  const opponent = match.players.find((entry) => entry.id !== playerId);
  if (opponent) {
    finishMatch(match, { type: "winner", winnerId: opponent.id, reason: "forfeit" });
  }
  return true;
}

function removeStaleWaitingMatches() {
  const now = Date.now();
  for (const [code, match] of waitingByRoom.entries()) {
    if (now - match.createdAt > 30 * 60 * 1000 || match.status !== "waiting") {
      waitingByRoom.delete(code);
    }
  }
  for (const [levels, match] of matchmakingQueues.entries()) {
    if (now - match.createdAt > 5 * 60 * 1000 || match.status !== "waiting") {
      matchmakingQueues.delete(levels);
    }
  }
}

async function handlePk(req, res, url) {
  removeStaleWaitingMatches();

  if (req.method === "POST" && url.pathname === "/pk/rooms") {
    const body = await readBody(req);
    const targetLevels = normalizeTargetLevels(body.targetLevels);
    const player = normalizePlayer(body.player);
    const code = roomCode();
    const match = createMatch({ mode: "room", targetLevels, roomCode: code, firstPlayer: player });
    waitingByRoom.set(code, match);
    sendJson(res, 200, {
      roomCode: code,
      matchId: match.id,
      playerId: player.id,
      status: match.status,
      totalSeconds: match.totalSeconds,
      match: publicMatch(match, player.id),
    });
    return true;
  }

  const roomJoin = url.pathname.match(/^\/pk\/rooms\/([A-Z0-9]{4})\/join$/);
  if (req.method === "POST" && roomJoin) {
    const code = roomJoin[1];
    const match = waitingByRoom.get(code);
    if (!match || match.status !== "waiting") {
      sendJson(res, 404, { error: "room not found" });
      return true;
    }
    const body = await readBody(req);
    const player = normalizePlayer(body.player);
    startMatch(match, player);
    waitingByRoom.delete(code);
    sendJson(res, 200, {
      roomCode: code,
      matchId: match.id,
      playerId: player.id,
      status: "lobby",
      totalSeconds: match.totalSeconds,
      match: publicMatch(match, player.id),
    });
    return true;
  }

  if (req.method === "POST" && url.pathname === "/pk/matchmaking") {
    const body = await readBody(req);
    const targetLevels = normalizeTargetLevels(body.targetLevels);
    const player = normalizePlayer(body.player);
    const waiting = matchmakingQueues.get(targetLevels);
    if (waiting && waiting.status === "waiting") {
      startMatch(waiting, player);
      matchmakingQueues.delete(targetLevels);
      sendJson(res, 200, {
        matchId: waiting.id,
        playerId: player.id,
        status: "lobby",
        totalSeconds: waiting.totalSeconds,
        match: publicMatch(waiting, player.id),
      });
      return true;
    }
    const match = createMatch({ mode: "matchmaking", targetLevels, firstPlayer: player });
    matchmakingQueues.set(targetLevels, match);
    sendJson(res, 200, {
      matchId: match.id,
      playerId: player.id,
      status: "waiting",
      totalSeconds: match.totalSeconds,
      match: publicMatch(match, player.id),
    });
    return true;
  }

  const matchRoute = url.pathname.match(/^\/pk\/matches\/([^/]+)$/);
  if (matchRoute) {
    const match = pkMatches.get(matchRoute[1]);
    if (!match) {
      sendJson(res, 404, { error: "match not found" });
      return true;
    }

    if (req.method === "GET") {
      const playerId = url.searchParams.get("playerId") || "";
      resolveExpired(match, url.searchParams.get("forceExpire") === "1");
      sendJson(res, 200, { match: publicMatch(match, playerId) });
      return true;
    }

    if (req.method === "POST" && url.pathname.endsWith(matchRoute[1])) {
      const body = await readBody(req);
      if (url.searchParams.get("action") === "noop") {
        sendJson(res, 200, { match: publicMatch(match, body.playerId) });
        return true;
      }
    }
  }

  const progressRoute = url.pathname.match(/^\/pk\/matches\/([^/]+)\/progress$/);
  if (req.method === "POST" && progressRoute) {
    const match = pkMatches.get(progressRoute[1]);
    if (!match) {
      sendJson(res, 404, { error: "match not found" });
      return true;
    }
    const body = await readBody(req);
    if (!updatePlayerProgress(match, body.playerId, body.completedLevels, body.finished)) {
      sendJson(res, 404, { error: "player not found" });
      return true;
    }
    sendJson(res, 200, { match: publicMatch(match, body.playerId) });
    return true;
  }

  const leaveRoute = url.pathname.match(/^\/pk\/matches\/([^/]+)\/leave$/);
  if (req.method === "POST" && leaveRoute) {
    const match = pkMatches.get(leaveRoute[1]);
    if (!match) {
      sendJson(res, 404, { error: "match not found" });
      return true;
    }
    const body = await readBody(req);
    if (!leaveMatch(match, body.playerId)) {
      sendJson(res, 404, { error: "player not found" });
      return true;
    }
    sendJson(res, 200, { match: publicMatch(match, body.playerId) });
    return true;
  }

  // Ready — mark player ready; if both ready, start game
  const readyRoute = url.pathname.match(/^\/pk\/matches\/([^/]+)\/ready$/);
  if (req.method === "POST" && readyRoute) {
    const match = pkMatches.get(readyRoute[1]);
    if (!match) {
      sendJson(res, 404, { error: "match not found" });
      return true;
    }
    const body = await readBody(req);
    if (!readyPlayer(match, body.playerId)) {
      sendJson(res, 404, { error: "player not found" });
      return true;
    }
    sendJson(res, 200, { match: publicMatch(match, body.playerId) });
    return true;
  }

  // Forfeit — instant loss
  const forfeitRoute = url.pathname.match(/^\/pk\/matches\/([^/]+)\/forfeit$/);
  if (req.method === "POST" && forfeitRoute) {
    const match = pkMatches.get(forfeitRoute[1]);
    if (!match) {
      sendJson(res, 404, { error: "match not found" });
      return true;
    }
    const body = await readBody(req);
    if (!forfeitPlayer(match, body.playerId)) {
      sendJson(res, 404, { error: "player not found" });
      return true;
    }
    sendJson(res, 200, { match: publicMatch(match, body.playerId) });
    return true;
  }

  return false;
}

const server = http.createServer((req, res) => {
  if (req.method === "OPTIONS") {
    sendJson(res, 204, {});
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  handlePk(req, res, url).then((handled) => {
    if (handled) return;

    if (url.pathname !== "/leaderboard") {
      sendJson(res, 404, { error: "not found" });
      return;
    }

    if (req.method === "GET") {
      sendJson(res, 200, { records: sortRecords(readRecords()).slice(0, 100) });
      return;
    }

    if (req.method === "POST") {
      readBody(req).then((body) => {
      try {
        const record = normalize(body);
        const records = sortRecords([...readRecords(), record]);
        writeRecords(records);
        sendJson(res, 200, { records: records.slice(0, 100) });
      } catch (_) {
        sendJson(res, 400, { error: "bad request" });
      }
      }).catch(() => sendJson(res, 400, { error: "bad request" }));
      return;
    }

    sendJson(res, 405, { error: "method not allowed" });
  }).catch(() => {
    if (!res.headersSent) {
      sendJson(res, 400, { error: "bad request" });
    } else {
      res.end();
    }
    });
});

server.listen(PORT, () => {
  console.log(`Leaderboard server: http://localhost:${PORT}/leaderboard`);
});
