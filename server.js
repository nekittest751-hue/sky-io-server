const http = require('http');
const crypto = require('crypto');

const PORT = process.env.PORT || 8080;
const TICK_RATE = 1000 / 60;
const SNAPSHOT_RATE = 1000 / 20;

const world = { width: 2000, height: 1000, gravity: 0.55, floor: 920 };
const platforms = [
  { x: 0, y: 920, w: 2000, h: 80 },
  { x: 160, y: 780, w: 240, h: 24 },
  { x: 520, y: 690, w: 220, h: 24 },
  { x: 830, y: 590, w: 260, h: 24 },
  { x: 1200, y: 740, w: 280, h: 24 },
  { x: 1510, y: 610, w: 220, h: 24 },
  { x: 1440, y: 430, w: 160, h: 24 },
  { x: 280, y: 470, w: 180, h: 24 },
  { x: 660, y: 360, w: 200, h: 24 }
];

const weaponStats = {
  pistol:  { name: 'Pistol',  damage: 16, ammo: 12, speed: 12, spread: 0.02, pellets: 1, cooldown: 20, color: '#fbbf24' },
  rifle:   { name: 'Rifle',   damage: 10, ammo: 24, speed: 15, spread: 0.01, pellets: 1, cooldown: 8,  color: '#38bdf8' },
  shotgun: { name: 'Shotgun', damage: 9,  ammo: 8,  speed: 11, spread: 0.26, pellets: 5, cooldown: 34, color: '#fb7185' }
};

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Sky .io WebSocket server is running.\n');
});

const rooms = new Map();

function rand(min, max) { return Math.random() * (max - min) + min; }
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function makeId(prefix = '') { return prefix + crypto.randomBytes(6).toString('hex'); }

function randomColor() {
  const colors = ['#22c55e', '#60a5fa', '#f472b6', '#f59e0b', '#a78bfa', '#34d399'];
  return colors[Math.floor(Math.random() * colors.length)];
}

function getSpawnPoint() {
  const points = [
    { x: 120, y: 820 },
    { x: 840, y: 540 },
    { x: 1540, y: 560 },
    { x: 320, y: 420 },
    { x: 640, y: 310 },
    { x: 1260, y: 690 }
  ];
  return points[Math.floor(Math.random() * points.length)];
}

function createRoom(name) {
  const room = {
    name,
    players: new Map(),
    sockets: new Map(),
    bullets: [],
    pickups: []
  };
  spawnInitialPickups(room);
  rooms.set(name, room);
  return room;
}

function getRoom(name) {
  const key = (name || 'arena').slice(0, 16);
  return rooms.get(key) || createRoom(key);
}

function spawnPickup(room, type, x, y) {
  room.pickups.push({ id: makeId('pickup-'), type, x, y, r: 16 });
}

function spawnInitialPickups(room) {
  spawnPickup(room, 'rifle', 560, 650);
  spawnPickup(room, 'shotgun', 1320, 700);
  spawnPickup(room, 'pistol', 340, 430);
}

function createPlayer(id, name) {
  const spawn = getSpawnPoint();
  return {
    id,
    name: (name || 'Player').slice(0, 16),
    x: spawn.x,
    y: spawn.y,
    w: 34,
    h: 46,
    vx: 0,
    vy: 0,
    speed: 0.78,
    maxSpeed: 5.4,
    jumpPower: 12.5,
    friction: 0.82,
    onGround: false,
    facing: 1,
    aimAngle: 0,
    hp: 100,
    score: 0,
    color: randomColor(),
    dead: false,
    respawnTimer: 0,
    shootCooldown: 0,
    weaponKey: 'pistol',
    ammo: weaponStats.pistol.ammo,
    wantPickup: false,
    input: {
      left: false,
      right: false,
      jump: false,
      shoot: false,
      pickup: false,
      aimX: 460,
      aimY: 290
    }
  };
}

function rectsIntersect(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function moveAndCollide(p) {
  p.x += p.vx;
  let box = { x: p.x, y: p.y, w: p.w, h: p.h };
  for (const plat of platforms) {
    if (rectsIntersect(box, plat)) {
      if (p.vx > 0) p.x = plat.x - p.w;
      if (p.vx < 0) p.x = plat.x + plat.w;
      p.vx = 0;
      box.x = p.x;
    }
  }

  p.y += p.vy;
  p.onGround = false;
  box = { x: p.x, y: p.y, w: p.w, h: p.h };
  for (const plat of platforms) {
    if (rectsIntersect(box, plat)) {
      if (p.vy > 0) {
        p.y = plat.y - p.h;
        p.vy = 0;
        p.onGround = true;
      } else if (p.vy < 0) {
        p.y = plat.y + plat.h;
        p.vy = 0;
      }
      box.y = p.y;
    }
  }

  p.x = clamp(p.x, 0, world.width - p.w);
  if (p.y > world.height + 220) damagePlayer(p, 999, null, null);
}

function updatePlayer(room, p) {
  if (p.dead) {
    p.respawnTimer -= 1;
    if (p.respawnTimer <= 0) respawnPlayer(p);
    return;
  }

  if (p.shootCooldown > 0) p.shootCooldown -= 1;
  p.vy += world.gravity;

  const input = p.input;
  if (input.left) p.vx -= p.speed;
  if (input.right) p.vx += p.speed;
  if (!input.left && !input.right) p.vx *= p.friction;
  p.vx = clamp(p.vx, -p.maxSpeed, p.maxSpeed);

  if (input.jump && p.onGround) {
    p.vy = -p.jumpPower;
    p.onGround = false;
  }

  const centerX = p.x + p.w / 2;
  const centerY = p.y + p.h / 2;
  const worldAimX = clamp(input.aimX || 460, 0, 920) + clamp(centerX - 460, 0, world.width - 920);
  const worldAimY = clamp(input.aimY || 290, 0, 580) + clamp(centerY - 290, 0, world.height - 580);
  const dx = worldAimX - centerX;
  const dy = worldAimY - centerY;
  p.aimAngle = Math.atan2(dy, dx);
  if (Math.abs(dx) > 2) p.facing = dx >= 0 ? 1 : -1;

  if (input.shoot) {
    tryShoot(room, p, Math.cos(p.aimAngle), Math.sin(p.aimAngle));
  }

  p.wantPickup = !!input.pickup;
  moveAndCollide(p);
  handlePickup(room, p);
}

function tryShoot(room, p, dirX, dirY) {
  if (p.dead || p.shootCooldown > 0 || p.ammo <= 0) return;
  const weapon = weaponStats[p.weaponKey];
  p.shootCooldown = weapon.cooldown;
  p.ammo -= 1;

  for (let i = 0; i < weapon.pellets; i++) {
    const spread = (Math.random() - 0.5) * weapon.spread;
    const angle = Math.atan2(dirY || 0, dirX || p.facing) + spread;
    p.aimAngle = angle;
    room.bullets.push({
      id: makeId('b'),
      ownerId: p.id,
      x: p.x + p.w / 2 + Math.cos(angle) * 20,
      y: p.y + p.h / 2 + Math.sin(angle) * 6,
      vx: Math.cos(angle) * weapon.speed,
      vy: Math.sin(angle) * weapon.speed,
      damage: weapon.damage,
      life: 70,
      color: weapon.color
    });
  }

  if (p.ammo <= 0) {
    p.weaponKey = 'pistol';
    p.ammo = weaponStats.pistol.ammo;
  }
}

function handlePickup(room, p) {
  if (!p.wantPickup || p.dead) return;
  const centerX = p.x + p.w / 2;
  const centerY = p.y + p.h / 2;

  for (let i = room.pickups.length - 1; i >= 0; i--) {
    const item = room.pickups[i];
    const dx = centerX - item.x;
    const dy = centerY - item.y;
    if (dx * dx + dy * dy < 42 * 42) {
      p.weaponKey = item.type;
      p.ammo = weaponStats[item.type].ammo;
      room.pickups.splice(i, 1);
      setTimeout(() => {
        if (rooms.has(room.name)) spawnPickup(room, item.type, item.x, item.y);
      }, 6000);
      break;
    }
  }
}

function updateBullets(room) {
  room.bullets = room.bullets.filter((b) => {
    b.x += b.vx;
    b.y += b.vy;
    b.life -= 1;
    if (b.life <= 0) return false;

    for (const plat of platforms) {
      if (b.x > plat.x && b.x < plat.x + plat.w && b.y > plat.y && b.y < plat.y + plat.h) {
        return false;
      }
    }

    for (const p of room.players.values()) {
      if (p.id === b.ownerId || p.dead) continue;
      if (b.x > p.x && b.x < p.x + p.w && b.y > p.y && b.y < p.y + p.h) {
        const attacker = room.players.get(b.ownerId) || null;
        damagePlayer(p, b.damage, b.ownerId, attacker);
        return false;
      }
    }

    return true;
  });
}

function damagePlayer(target, amount, attackerId, attacker) {
  if (target.dead) return;
  target.hp -= amount;
  if (target.hp <= 0) {
    target.dead = true;
    target.respawnTimer = 120;
    target.hp = 0;
    if (attackerId && attacker && attackerId !== target.id) {
      attacker.score += 1;
    }
  }
}

function respawnPlayer(p) {
  const spawn = getSpawnPoint();
  p.dead = false;
  p.hp = 100;
  p.x = spawn.x;
  p.y = spawn.y;
  p.vx = 0;
  p.vy = 0;
  p.weaponKey = 'pistol';
  p.ammo = weaponStats.pistol.ammo;
}

function serializeRoom(room) {
  const players = {};
  for (const [id, p] of room.players.entries()) {
    players[id] = {
      id: p.id,
      name: p.name,
      x: Math.round(p.x * 100) / 100,
      y: Math.round(p.y * 100) / 100,
      w: p.w,
      h: p.h,
      vx: Math.round(p.vx * 100) / 100,
      vy: Math.round(p.vy * 100) / 100,
      facing: p.facing,
      aimAngle: p.aimAngle,
      hp: p.hp,
      score: p.score,
      color: p.color,
      dead: p.dead,
      respawnTimer: p.respawnTimer,
      shootCooldown: p.shootCooldown,
      weaponKey: p.weaponKey,
      ammo: p.ammo
    };
  }

  return {
    type: 'state',
    players,
    bullets: room.bullets,
    pickups: room.pickups
  };
}

function wsSend(socket, data) {
  const payload = Buffer.from(typeof data === 'string' ? data : JSON.stringify(data));
  let header;

  if (payload.length < 126) {
    header = Buffer.alloc(2);
    header[0] = 0x81;
    header[1] = payload.length;
  } else if (payload.length < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(payload.length, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x81;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(payload.length), 2);
  }

  socket.write(Buffer.concat([header, payload]));
}

function parseFrame(buffer) {
  if (buffer.length < 2) return null;

  const firstByte = buffer[0];
  const secondByte = buffer[1];
  const opcode = firstByte & 0x0f;
  const masked = (secondByte & 0x80) !== 0;

  let offset = 2;
  let payloadLength = secondByte & 0x7f;

  if (payloadLength === 126) {
    if (buffer.length < 4) return null;
    payloadLength = buffer.readUInt16BE(2);
    offset = 4;
  } else if (payloadLength === 127) {
    if (buffer.length < 10) return null;
    const bigLen = buffer.readBigUInt64BE(2);
    if (bigLen > BigInt(Number.MAX_SAFE_INTEGER)) return null;
    payloadLength = Number(bigLen);
    offset = 10;
  }

  const maskLength = masked ? 4 : 0;
  const totalLength = offset + maskLength + payloadLength;
  if (buffer.length < totalLength) return null;

  let payload = buffer.subarray(offset + maskLength, totalLength);

  if (masked) {
    const mask = buffer.subarray(offset, offset + 4);
    const unmasked = Buffer.alloc(payloadLength);
    for (let i = 0; i < payloadLength; i++) {
      unmasked[i] = payload[i] ^ mask[i % 4];
    }
    payload = unmasked;
  }

  return {
    opcode,
    payload,
    bytesUsed: totalLength
  };
}

function attachSocketHandlers(socket, onMessage, onClose) {
  let buffer = Buffer.alloc(0);

  socket.on('data', (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);

    while (true) {
      const frame = parseFrame(buffer);
      if (!frame) break;

      buffer = buffer.subarray(frame.bytesUsed);

      if (frame.opcode === 0x8) {
        try { socket.end(); } catch {}
        onClose();
        return;
      }

      if (frame.opcode === 0x1) {
        try {
          onMessage(frame.payload.toString('utf8'));
        } catch {}
      }
    }
  });

  socket.on('close', onClose);
  socket.on('end', onClose);
  socket.on('error', onClose);
}

function broadcastState(room) {
  const payload = JSON.stringify(serializeRoom(room));
  for (const socket of room.sockets.values()) {
    if (!socket.destroyed) {
      try { wsSend(socket, payload); } catch {}
    }
  }
}

function tickRoom(room) {
  for (const p of room.players.values()) updatePlayer(room, p);
  updateBullets(room);
}

function cleanupRoom(roomName) {
  const room = rooms.get(roomName);
  if (!room) return;
  if (room.players.size === 0 && room.sockets.size === 0) rooms.delete(roomName);
}

server.on('upgrade', (req, socket) => {
  const key = req.headers['sec-websocket-key'];
  if (!key) {
    socket.destroy();
    return;
  }

  const accept = crypto
    .createHash('sha1')
    .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
    .digest('base64');

  const headers = [
    'HTTP/1.1 101 Switching Protocols',
    'Upgrade: websocket',
    'Connection: Upgrade',
    `Sec-WebSocket-Accept: ${accept}`,
    '\r\n'
  ];

  socket.write(headers.join('\r\n'));

  let room = null;
  let playerId = null;
  let closed = false;

  const safeClose = () => {
    if (closed) return;
    closed = true;
    if (room && playerId) {
      room.players.delete(playerId);
      room.sockets.delete(playerId);
      cleanupRoom(room.name);
    }
  };

  attachSocketHandlers(
    socket,
    (text) => {
      let msg;
      try {
        msg = JSON.parse(text);
      } catch {
        return;
      }

      if (msg.type === 'join') {
        room = getRoom(msg.room);
        playerId = makeId('p-');
        const player = createPlayer(playerId, msg.name);
        room.players.set(playerId, player);
        room.sockets.set(playerId, socket);
        wsSend(socket, { type: 'welcome', id: playerId });
        return;
      }

      if (msg.type === 'input' && room && playerId && room.players.has(playerId)) {
        const player = room.players.get(playerId);
        player.input.left = !!msg.left;
        player.input.right = !!msg.right;
        player.input.jump = !!msg.jump;
        player.input.shoot = !!msg.shoot;
        player.input.pickup = !!msg.pickup;
        player.input.aimX = Number.isFinite(msg.aimX) ? msg.aimX : 460;
        player.input.aimY = Number.isFinite(msg.aimY) ? msg.aimY : 290;
      }
    },
    safeClose
  );
});

setInterval(() => {
  for (const room of rooms.values()) tickRoom(room);
}, TICK_RATE);

setInterval(() => {
  for (const room of rooms.values()) broadcastState(room);
}, SNAPSHOT_RATE);

server.listen(PORT, () => {
  console.log(`Sky .io WebSocket server listening on ws://localhost:${PORT}`);
});