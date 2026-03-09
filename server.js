const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;
const TICK_RATE = 1000 / 60;
const SNAPSHOT_RATE = 1000 / 40;
const FAST_INPUT_BROADCAST_MS = 12;
const JUMP_BUFFER_MS = 120;
const COYOTE_MS = 90;
const DEFAULT_ROUND_DURATION_SEC = 180;
const ROUND_VOTE_DURATION_SEC = 30;
const ROUND_DURATION_OPTIONS = [120, 180, 240];
const ROUND_WIN_COINS = 35;
const ROUND_PARTICIPATION_COINS = 6;
const ROUND_KILL_COINS = 3;
const ROUND_WIN_XP = 40;
const ROUND_PARTICIPATION_XP = 8;
const ROUND_KILL_XP = 10;
const WIN_STREAK_BONUS_COINS = 10;
const MOBILE_JUMP_POWER = 15.6;
const SPEED_BUFF_MS = 12000;
const JUMP_BUFF_MS = 12000;
const DAMAGE_BUFF_MS = 12000;
const SHIELD_BUFF_MS = 12000;
const ARMOR_VALUE = 30;
const DEFAULT_ROOM_MAX_PLAYERS = 10;
const MIN_ROOM_MAX_PLAYERS = 2;
const MAX_ROOM_MAX_PLAYERS = 12;

const SERVER_NAME = 'Sky .io Mobile Arena 2.6';
const MIN_CHAT_VERSION = '2.0.0';
const MIN_RECOMMENDED_CLIENT_VERSION = '2.6.0';
const CURRENT_STANDARD_VERSION = '2.6-standard';
const CURRENT_MOD_VERSION = '2.6-mod';
const MAX_CHAT_LEN = 160;
const CHAT_HISTORY_LIMIT = 40;
const SPAM_WINDOW_MS = 8000;
const SPAM_LIMIT = 5;
const TEMP_MUTE_MS = 5 * 60 * 1000;

const STANDARD_CHAT_CHANNEL = 'standard';
const MOD_CHAT_CHANNEL = 'unrestricted';
const MOD_CHAT_LABEL = 'чат без ограничений';
const MOD_CHAT_WARNING = 'Включен канал «чат без ограничений»: сообщения видят только пользователи этой версии. Мат не цензурируется, но спам, повторы, муты и блокировки остаются.';
const DEVICE_LOCK_WARNING = 'На этом устройстве после согласия доступна только версия с «чат без ограничений». Остальные версии должны использовать только тренировку.';
const STORE_PATH = path.join(__dirname, 'moderation_store.json');

const WEAPONS = {
  pistol:  { name: 'Pistol',  damage: 16, ammo: 12, speed: 12, spread: 0.02, pellets: 1, cooldown: 20, color: '#fbbf24' },
  rifle:   { name: 'Rifle',   damage: 10, ammo: 24, speed: 15, spread: 0.01, pellets: 1, cooldown: 8, color: '#38bdf8' },
  shotgun: { name: 'Shotgun', damage: 9, ammo: 8, speed: 11, spread: 0.26, pellets: 5, cooldown: 34, color: '#fb7185' }
};

const MAPS = {
  arena: {
    key: 'arena',
    name: 'Arena',
    world: { width: 2000, height: 1000, gravity: 0.55, floor: 920 },
    platforms: [
      { x: 0, y: 920, w: 2000, h: 80 },
      { x: 160, y: 780, w: 240, h: 24 },
      { x: 520, y: 690, w: 220, h: 24 },
      { x: 830, y: 590, w: 260, h: 24 },
      { x: 1200, y: 740, w: 280, h: 24 },
      { x: 1510, y: 610, w: 220, h: 24 },
      { x: 1440, y: 430, w: 160, h: 24 },
      { x: 280, y: 470, w: 180, h: 24 },
      { x: 660, y: 360, w: 200, h: 24 }
    ],
    spawns: [
      { x: 120, y: 820 },
      { x: 840, y: 540 },
      { x: 1540, y: 560 },
      { x: 320, y: 420 },
      { x: 640, y: 310 },
      { x: 1260, y: 690 }
    ],
    pickups: [
      { type: 'rifle', x: 560, y: 650 },
      { type: 'shotgun', x: 1320, y: 700 },
      { type: 'pistol', x: 340, y: 430 }
    ]
  },
  canyon: {
    key: 'canyon',
    name: 'Canyon',
    world: { width: 2000, height: 1000, gravity: 0.55, floor: 920 },
    platforms: [
      { x: 0, y: 920, w: 300, h: 80 },
      { x: 420, y: 920, w: 360, h: 80 },
      { x: 920, y: 920, w: 300, h: 80 },
      { x: 1360, y: 920, w: 640, h: 80 },
      { x: 140, y: 760, w: 220, h: 24 },
      { x: 520, y: 640, w: 220, h: 24 },
      { x: 870, y: 520, w: 220, h: 24 },
      { x: 1250, y: 660, w: 220, h: 24 },
      { x: 1580, y: 790, w: 220, h: 24 },
      { x: 930, y: 330, w: 180, h: 24 }
    ],
    spawns: [
      { x: 60, y: 840 },
      { x: 510, y: 600 },
      { x: 920, y: 300 },
      { x: 1290, y: 620 },
      { x: 1650, y: 750 }
    ],
    pickups: [
      { type: 'rifle', x: 560, y: 600 },
      { type: 'shotgun', x: 1280, y: 620 },
      { type: 'pistol', x: 980, y: 290 }
    ]
  },
  towers: {
    key: 'towers',
    name: 'Towers',
    world: { width: 2000, height: 1000, gravity: 0.55, floor: 920 },
    platforms: [
      { x: 0, y: 920, w: 2000, h: 80 },
      { x: 130, y: 780, w: 180, h: 24 },
      { x: 130, y: 620, w: 180, h: 24 },
      { x: 130, y: 460, w: 180, h: 24 },
      { x: 520, y: 820, w: 220, h: 24 },
      { x: 520, y: 620, w: 220, h: 24 },
      { x: 900, y: 760, w: 240, h: 24 },
      { x: 900, y: 520, w: 240, h: 24 },
      { x: 1360, y: 820, w: 220, h: 24 },
      { x: 1360, y: 600, w: 220, h: 24 },
      { x: 1720, y: 720, w: 180, h: 24 },
      { x: 1720, y: 500, w: 180, h: 24 }
    ],
    spawns: [
      { x: 100, y: 820 },
      { x: 180, y: 420 },
      { x: 560, y: 580 },
      { x: 930, y: 470 },
      { x: 1380, y: 560 },
      { x: 1740, y: 470 }
    ],
    pickups: [
      { type: 'rifle', x: 560, y: 580 },
      { type: 'shotgun', x: 1450, y: 560 },
      { type: 'pistol', x: 1760, y: 460 }
    ]
  }
};



const SKINS = {
  classic: { key: 'classic', name: 'Classic', rarity: 'обычный', price: 0, bodyColor: '#60a5fa', accentColor: '#ffffff' },
  neon:    { key: 'neon',    name: 'Neon', rarity: 'редкий', price: 40, bodyColor: '#22c55e', accentColor: '#d9f99d' },
  gold:    { key: 'gold',    name: 'Gold', rarity: 'редкий', price: 90, bodyColor: '#f59e0b', accentColor: '#fef3c7' },
  shadow:  { key: 'shadow',  name: 'Shadow', rarity: 'эпик', price: 140, bodyColor: '#6366f1', accentColor: '#e9d5ff' },
  coral:   { key: 'coral',   name: 'Coral', rarity: 'эпик', price: 180, bodyColor: '#fb7185', accentColor: '#ffe4e6' },
  titan:   { key: 'titan',   name: 'Titan', rarity: 'легендарный', price: 260, bodyColor: '#0f172a', accentColor: '#f8fafc' },
  rainbow: { key: 'rainbow', name: 'Rainbow ★', rarity: 'радужный', price: 320, bodyColor: '#8b5cf6', accentColor: '#ffffff' }
};

const PROFANITY_ROOTS = [
  'анус','аборт','бзд','бля','бляд','блудилищ','бордел','вагин','вафлист','вжоп',
  'вздрач','вздроч','вздрюч','въеб','выбляд','выеб','говн','гомик','гомосек','гондон',
  'давалк','дерьм','дилдо','доеб','додроч','долбаеб','долбоеб','допизд','дотрах','дохуя',
  'дрис','дрист','дроч','дрюч','дуроеб','еба','ебан','ебат','ебаш','ебен','ебись','ебит',
  'ебл','ебло','еблы','ебля','ебну','ебуч','жирнозад','жоп','забзд','забляд','задниц',
  'задрач','задроч','задрюч','заеб','залуп','запизд','засран','засрат','засс','затрах',
  'заху','злоеб','издроч','изманд','изъеб','испизд','испражн','исхуя','кака','кастр',
  'клитор','клоак','конч','косоеб','кривохуй','курв','лахудр','лох','лохматк','манд',
  'мастурб','минет','мозгоеб','мокрожоп','моч','мудак','мудил','мудоеб','наеб','надроч',
  'надрист','накак','напизд','насра','насс','натрах','нахуя','недоеб','нищееб','обдрист',
  'обдроч','обосра','обосс','обпизд','обтрах','обхуя','объеб','одинхуй','однохуй','оеб',
  'опедераст','опизд','остоеб','остопизд','остоху','отдрач','отдроч','отпизд','отсос',
  'оттрах','отхуя','отъеб','охуе','охуи','охуя','очко','падл','педераст','педик','педрил',
  'пенис','пердеж','перд','перееб','перетрах','перехуя','пидор','пизд','письк','поеб',
  'побляд','подосра','подосс','подпизд','подроч','подхуя','подъеб','попизд','потаскух',
  'потрах','похер','похуи','похуя','поц','приеб','прижоп','приманд','припизд','прихуя',
  'пробляд','продроч','проеб','пропизд','прохуя','раздроч','разъеб','распизд','расхуя',
  'сдроч','сестроеб','сифил','скурв','сманд','спермат','спизд','стерв','сука','сук','суч',
  'схуя','съеб','твар','трах','триппер','уеб','ублюд','усрач','усс','ухуя','фалл','фекал',
  'хер','херн','хрен','хуе','хуев','хуек','хуеп','хуес','хует','хуи','хуищ','хуй','хуйн',
  'хуя','хуяк','хуяр','хуяч','хуяш','хую','хуюж','целк','черножоп','чернозад','член',
  'шалав','шлюх','шмар'
];

function normalizeProfanityToken(token) {
  return String(token || '').toLowerCase().replace(/ё/g, 'е');
}

function tokenContainsProfanity(token) {
  const normalized = normalizeProfanityToken(token);
  if (!normalized || normalized.length < 3) return false;

  if (
    normalized.includes('долбаеб') ||
    normalized.includes('долбоеб')
  ) {
    return true;
  }

  return PROFANITY_ROOTS.some((root) => normalized.includes(root));
}


function loadStore() {
  try {
    if (!fs.existsSync(STORE_PATH)) {
      return { devices: {} };
    }
    const raw = fs.readFileSync(STORE_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return { devices: {} };
    if (!parsed.devices || typeof parsed.devices !== 'object') parsed.devices = {};
    return parsed;
  } catch {
    return { devices: {} };
  }
}

const moderationStore = loadStore();

function saveStore() {
  try {
    fs.writeFileSync(STORE_PATH, JSON.stringify(moderationStore, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save moderation store:', err.message);
  }
}

function getOrCreateDeviceRecord(deviceKey) {
  if (!moderationStore.devices[deviceKey]) {
    moderationStore.devices[deviceKey] = {
      writeBlocked: false,
      mutedUntil: 0,
      strikes: 0,
      profanityHits: 0,
      modChatOnly: false,
      lastReason: '',
      lastName: '',
      updatedAt: 0,
      coins: 0,
      wins: 0,
      ownedSkins: ['classic'],
      selectedSkin: 'classic'
    };
  }
  const record = moderationStore.devices[deviceKey];
  if (typeof record.modChatOnly !== 'boolean') record.modChatOnly = false;
  return record;
}

function makeFingerprint(remoteAddress, userAgent) {
  return crypto
    .createHash('sha1')
    .update(String(remoteAddress || '') + '|' + String(userAgent || ''))
    .digest('hex');
}

function normalizeClientDeviceId(deviceId) {
  const clean = String(deviceId || '').trim();
  if (!clean) return null;
  if (!/^[a-zA-Z0-9_-]{8,120}$/.test(clean)) return null;
  return clean;
}

function buildDeviceKey(clientDeviceId, remoteAddress, userAgent) {
  const normalized = normalizeClientDeviceId(clientDeviceId);
  if (normalized) {
    return 'client_' + normalized;
  }
  return 'fp_' + makeFingerprint(remoteAddress, userAgent);
}

function getDeviceIdentityKeys(clientDeviceId, remoteAddress, userAgent) {
  const keys = [];
  const normalized = normalizeClientDeviceId(clientDeviceId);
  if (normalized) {
    keys.push('client_' + normalized);
  }
  keys.push('fp_' + makeFingerprint(remoteAddress, userAgent));
  return Array.from(new Set(keys));
}

function getJoinedDeviceState(clientDeviceId, remoteAddress, userAgent) {
  const keys = getDeviceIdentityKeys(clientDeviceId, remoteAddress, userAgent);
  const records = keys.map((key) => ({ key, record: getOrCreateDeviceRecord(key) }));
  return {
    keys,
    primaryKey: buildDeviceKey(clientDeviceId, remoteAddress, userAgent),
    records,
    modChatOnly: records.some(({ record }) => !!record.modChatOnly)
  };
}

function setModChatOnlyForIdentity(keys, value) {
  const uniqueKeys = Array.from(new Set(keys || []));
  for (const key of uniqueKeys) {
    const record = getOrCreateDeviceRecord(key);
    record.modChatOnly = !!value;
    record.updatedAt = Date.now();
  }
  if (uniqueKeys.length) saveStore();
}

function persistPlayerModeration(player, reason = '') {
  const record = getOrCreateDeviceRecord(player.deviceKey);
  record.writeBlocked = !!player.chat.sessionWriteLocked;
  record.mutedUntil = Number(player.chat.mutedUntil || 0);
  record.strikes = Number(player.chat.strikes || 0);
  record.profanityHits = Number(player.chat.profanityHits || 0);
  record.modChatOnly = !!record.modChatOnly;
  record.lastReason = reason || record.lastReason || '';
  record.lastName = player.name || record.lastName || '';
  record.updatedAt = Date.now();
  saveStore();
}



function ensureProgressRecord(record) {
  if (!Number.isFinite(record.coins)) record.coins = 0;
  if (!Number.isFinite(record.wins)) record.wins = 0;
  if (!Number.isFinite(record.xp)) record.xp = 0;
  if (!Array.isArray(record.ownedSkins) || !record.ownedSkins.length) record.ownedSkins = ['classic'];
  record.ownedSkins = Array.from(new Set(record.ownedSkins.filter((key) => !!SKINS[key])));
  if (!record.ownedSkins.includes('classic')) record.ownedSkins.unshift('classic');
  if (!SKINS[record.selectedSkin] || !record.ownedSkins.includes(record.selectedSkin)) record.selectedSkin = 'classic';
  return record;
}

function getSkin(key) {
  return SKINS[key] || SKINS.classic;
}

function getLevelFromXp(xp) {
  const safeXp = Math.max(0, Number(xp || 0));
  return Math.max(1, Math.floor(Math.sqrt(safeXp / 90)) + 1);
}

function getTitleFrame(level) {
  if (level >= 18) return 'радужная';
  if (level >= 12) return 'легендарная';
  if (level >= 8) return 'эпическая';
  if (level >= 4) return 'редкая';
  return 'обычная';
}

function serializeProgression(player) {
  const xp = Number(player.xp || 0);
  const level = getLevelFromXp(xp);
  return {
    coins: Number(player.coins || 0),
    wins: Number(player.wins || 0),
    xp,
    level,
    titleFrame: getTitleFrame(level),
    ownedSkins: Array.isArray(player.ownedSkins) ? Array.from(new Set(player.ownedSkins)) : ['classic'],
    selectedSkin: player.selectedSkin || 'classic'
  };
}

function persistPlayerProgress(player) {
  const record = ensureProgressRecord(getOrCreateDeviceRecord(player.deviceKey));
  record.coins = Number(player.coins || 0);
  record.wins = Number(player.wins || 0);
  record.xp = Number(player.xp || 0);
  record.ownedSkins = Array.isArray(player.ownedSkins) ? Array.from(new Set(player.ownedSkins)) : ['classic'];
  if (!record.ownedSkins.includes('classic')) record.ownedSkins.unshift('classic');
  record.selectedSkin = record.ownedSkins.includes(player.selectedSkin) ? player.selectedSkin : 'classic';
  record.updatedAt = Date.now();
  saveStore();
}

function applySkinToPlayer(player, skinKey) {
  const skin = getSkin(skinKey);
  player.selectedSkin = skin.key;
  player.bodyColor = skin.bodyColor;
  player.accentColor = skin.accentColor;
  player.color = skin.bodyColor;
}


function createRoundState(mapKey) {
  return {
    number: 1,
    phase: 'battle',
    durationSec: DEFAULT_ROUND_DURATION_SEC,
    endsAt: Date.now() + DEFAULT_ROUND_DURATION_SEC * 1000,
    mapVotes: {},
    durationVotes: {},
    votesByPlayer: {},
    winnerNames: [],
    previousWinnerNames: [],
    previousRewardCoins: ROUND_WIN_COINS,
    previousSummary: null,
    mapKey
  };
}

function buildRoomPickups(map) {
  const pickups = map.pickups.map((p) => ({ id: makeId('pickup-'), ...p, r: 16 }));
  const anchors = [
    map.spawns[0] ? { x: map.spawns[0].x + 48, y: map.spawns[0].y - 18 } : null,
    map.spawns[1] ? { x: map.spawns[1].x + 48, y: map.spawns[1].y - 18 } : null,
    map.spawns[2] ? { x: map.spawns[2].x + 40, y: map.spawns[2].y - 28 } : null,
    map.spawns[3] ? { x: map.spawns[3].x + 54, y: map.spawns[3].y - 28 } : null,
    map.spawns[4] ? { x: map.spawns[4].x + 54, y: map.spawns[4].y - 28 } : null
  ].filter(Boolean);
  const bonusTypes = ['medkit', 'armor', 'speed', 'jump', 'damage', 'shield'];
  anchors.forEach((spot, index) => {
    pickups.push({ id: makeId('pickup-'), type: bonusTypes[index % bonusTypes.length], x: spot.x, y: spot.y, r: 16 });
  });
  return pickups;
}

function serializeRound(room, player = null) {
  return {
    roundNumber: room.round.number,
    phase: room.round.phase,
    durationSec: room.round.durationSec,
    voteDurationSec: ROUND_VOTE_DURATION_SEC,
    endsAt: room.round.endsAt,
    mapKey: room.mapKey,
    mapName: room.map.name,
    mapVotes: room.round.mapVotes || {},
    durationVotes: room.round.durationVotes || {},
    myVote: player ? (room.round.votesByPlayer[player.id] || null) : null,
    winnerNames: room.round.winnerNames || [],
    previousWinnerNames: room.round.previousWinnerNames || [],
    rewardCoins: room.round.previousRewardCoins || ROUND_WIN_COINS,
    summary: room.round.previousSummary || null,
    serverNow: Date.now()
  };
}

function createRoundSummary(room, standings, winners) {
  return {
    winnerNames: winners.map((p) => p.name),
    nextRoundInSec: ROUND_VOTE_DURATION_SEC,
    top: standings.slice(0, 3).map((p) => ({
      name: p.name,
      kills: p.kills || 0,
      deaths: p.deaths || 0,
      score: p.score || 0,
      level: getLevelFromXp(p.xp || 0),
      frame: getTitleFrame(getLevelFromXp(p.xp || 0))
    }))
  };
}

function pushKillfeedEvent(room, killer, victim, weaponKey, extraText = '') {
  if (!room.killfeed) room.killfeed = [];
  room.feedSeq = Number(room.feedSeq || 0) + 1;
  room.killfeed.unshift({
    id: room.feedSeq,
    killer,
    victim,
    weaponKey,
    text: extraText || ''
  });
  room.killfeed = room.killfeed.slice(0, 8);
}

function clearExpiredBuffs(player) {
  const now = Date.now();
  if ((player.speedUntil || 0) < now) player.speedUntil = 0;
  if ((player.jumpUntil || 0) < now) player.jumpUntil = 0;
  if ((player.damageUntil || 0) < now) player.damageUntil = 0;
  if ((player.shieldUntil || 0) < now) player.shieldUntil = 0;
}

function sendProgress(socket, player, notice = '') {
  if (!socket || socket.destroyed) return;
  try {
    wsSend(socket, {
      type: 'progress',
      progression: serializeProgression(player),
      notice,
      skins: Object.values(SKINS)
    });
  } catch {}
}

function sendRoundInfo(socket, room, player = null) {
  if (!socket || socket.destroyed) return;
  try {
    wsSend(socket, { type: 'roundInfo', round: serializeRound(room, player) });
  } catch {}
}

function broadcastRoundInfo(room) {
  for (const [id, socket] of room.sockets.entries()) {
    const player = room.players.get(id);
    sendRoundInfo(socket, room, player || null);
  }
}

function countRoomModePlayers(room, mode) {
  let count = 0;
  for (const player of room.players.values()) {
    if (normalizeChatChannel(player.chat.channel) === mode) count += 1;
  }
  return count;
}

function pickWinningValue(counts, fallback) {
  let bestValue = fallback;
  let bestCount = -1;
  for (const [value, count] of Object.entries(counts || {})) {
    const numeric = /^\d+$/.test(value) ? Number(value) : value;
    if (count > bestCount) {
      bestValue = numeric;
      bestCount = count;
    }
  }
  return bestValue;
}

function getRoundWinners(room) {
  const candidates = Array.from(room.players.values());
  if (!candidates.length) return [];
  candidates.sort((a, b) => {
    if ((b.score || 0) !== (a.score || 0)) return (b.score || 0) - (a.score || 0);
    if ((b.kills || 0) !== (a.kills || 0)) return (b.kills || 0) - (a.kills || 0);
    return (a.deaths || 0) - (b.deaths || 0);
  });
  const top = candidates[0];
  if (!top || (top.score || 0) <= 0) return [];
  return candidates.filter((p) => (p.score || 0) === (top.score || 0) && (p.kills || 0) === (top.kills || 0));
}

function broadcastSystemAllChannels(room, text) {
  broadcastSystemToRoom(room, text, STANDARD_CHAT_CHANNEL);
  broadcastSystemToRoom(room, text, MOD_CHAT_CHANNEL);
}


function beginVotePhase(room) {
  if (room.round.phase === 'vote') return;
  const standings = Array.from(room.players.values()).sort((a, b) => {
    if ((b.score || 0) !== (a.score || 0)) return (b.score || 0) - (a.score || 0);
    if ((b.kills || 0) !== (a.kills || 0)) return (b.kills || 0) - (a.kills || 0);
    return (a.deaths || 0) - (b.deaths || 0);
  });
  const winners = getRoundWinners(room);
  room.round.previousWinnerNames = winners.map((p) => p.name);
  room.round.winnerNames = winners.map((p) => p.name);
  room.round.previousRewardCoins = ROUND_WIN_COINS;

  for (const player of room.players.values()) {
    const isWinner = winners.some((w) => w.id === player.id);
    if (isWinner) {
      player.sessionWinStreak = Number(player.sessionWinStreak || 0) + 1;
      player.wins = Number(player.wins || 0) + 1;
    } else {
      player.sessionWinStreak = 0;
    }
    const streakBonus = isWinner && player.sessionWinStreak > 1 ? WIN_STREAK_BONUS_COINS * Math.min(3, player.sessionWinStreak - 1) : 0;
    const coinsGain = ROUND_PARTICIPATION_COINS + Number(player.kills || 0) * ROUND_KILL_COINS + (isWinner ? ROUND_WIN_COINS + streakBonus : 0);
    const xpGain = ROUND_PARTICIPATION_XP + Number(player.kills || 0) * ROUND_KILL_XP + (isWinner ? ROUND_WIN_XP : 0);
    player.coins = Number(player.coins || 0) + coinsGain;
    player.xp = Number(player.xp || 0) + xpGain;
    persistPlayerProgress(player);
    const notice = isWinner
      ? `Победа в раунде: +${coinsGain} монет · +${xpGain} XP`
      : `Раунд завершён: +${coinsGain} монет · +${xpGain} XP`;
    sendProgress(room.sockets.get(player.id), player, notice);
  }

  room.round.previousSummary = createRoundSummary(room, standings, winners);

  if (winners.length) {
    broadcastSystemAllChannels(room, `Раунд #${room.round.number} выигран. Победитель: ${winners.map((p) => p.name).join(', ')}.`);
  } else {
    broadcastSystemAllChannels(room, `Раунд #${room.round.number} завершён без победителя.`);
  }

  room.round.phase = 'vote';
  room.round.endsAt = Date.now() + ROUND_VOTE_DURATION_SEC * 1000;
  room.round.mapVotes = {};
  room.round.durationVotes = {};
  room.round.votesByPlayer = {};
  broadcastSystemAllChannels(room, `Перерыв: ${ROUND_VOTE_DURATION_SEC} секунд на голосование в панели.`);
  broadcastRoundInfo(room);
}

function resetRoomMap(room, mapKey) {
  const map = cloneMap(mapKey);
  room.mapKey = map.key;
  room.map = map;
  room.world = { ...map.world };
  room.pickups = buildRoomPickups(map);
  room.bullets = [];
}

function startNextRound(room) {
  const nextMapKey = pickWinningValue(room.round.mapVotes, room.mapKey);
  const nextDurationSec = Number(pickWinningValue(room.round.durationVotes, room.round.durationSec || DEFAULT_ROUND_DURATION_SEC)) || DEFAULT_ROUND_DURATION_SEC;
  resetRoomMap(room, nextMapKey);
  room.round.number += 1;
  room.round.phase = 'battle';
  room.round.durationSec = ROUND_DURATION_OPTIONS.includes(nextDurationSec) ? nextDurationSec : DEFAULT_ROUND_DURATION_SEC;
  room.round.endsAt = Date.now() + room.round.durationSec * 1000;
  room.round.mapVotes = {};
  room.round.durationVotes = {};
  room.round.votesByPlayer = {};
  room.round.winnerNames = [];
  room.round.previousSummary = null;

  for (const player of room.players.values()) {
    player.score = 0;
    player.kills = 0;
    player.deaths = 0;
    respawnPlayer(room, player);
  }

  broadcastSystemAllChannels(room, `Начался раунд #${room.round.number}. Карта: ${room.map.name}.`);
  broadcastRoundInfo(room);
  broadcastState(room);
}

function updateRoomRound(room) {
  const now = Date.now();
  if (room.round.phase === 'battle' && now >= room.round.endsAt) {
    beginVotePhase(room);
    return;
  }
  if (room.round.phase === 'vote' && now >= room.round.endsAt) {
    startNextRound(room);
  }
}

function applyRoomVote(room, player, mapKey, durationSec) {
  if (room.round.phase !== 'vote') return false;
  const cleanMapKey = MAPS[mapKey] ? mapKey : room.mapKey;
  const cleanDurationSec = ROUND_DURATION_OPTIONS.includes(Number(durationSec)) ? Number(durationSec) : DEFAULT_ROUND_DURATION_SEC;
  room.round.votesByPlayer[player.id] = { mapKey: cleanMapKey, durationSec: cleanDurationSec };

  const mapVotes = {};
  const durationVotes = {};
  for (const vote of Object.values(room.round.votesByPlayer)) {
    mapVotes[vote.mapKey] = (mapVotes[vote.mapKey] || 0) + 1;
    durationVotes[vote.durationSec] = (durationVotes[vote.durationSec] || 0) + 1;
  }
  room.round.mapVotes = mapVotes;
  room.round.durationVotes = durationVotes;
  broadcastRoundInfo(room);
  return true;
}


const rooms = new Map();

function normalizeRoomName(name) {
  return String(name || 'arena').trim().slice(0, 20) || 'arena';
}

function sanitizeRoomCode(code) {
  return String(code || '').trim().slice(0, 12);
}

function sanitizeMaxPlayers(maxPlayers) {
  const n = Number(maxPlayers || DEFAULT_ROOM_MAX_PLAYERS);
  if (!Number.isFinite(n)) return DEFAULT_ROOM_MAX_PLAYERS;
  return clamp(Math.round(n), MIN_ROOM_MAX_PLAYERS, MAX_ROOM_MAX_PLAYERS);
}

function roomPublicInfo(room) {
  return {
    room: room.name,
    mapKey: room.mapKey,
    mapName: room.map.name,
    players: room.players.size,
    maxPlayers: room.maxPlayers || DEFAULT_ROOM_MAX_PLAYERS,
    modPlayers: countRoomModePlayers(room, MOD_CHAT_CHANNEL),
    phase: room.round.phase,
    roundEndsInSec: Math.max(0, Math.ceil((room.round.endsAt - Date.now()) / 1000)),
    isPrivate: !!room.isPrivate
  };
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }


if (req.url === '/rooms' || req.url === '/mod-rooms') {
  const onlyMod = req.url === '/mod-rooms';
  const data = Array.from(rooms.values())
    .filter((room) => !room.isPrivate)
    .map((room) => roomPublicInfo(room))
    .filter((room) => !onlyMod || room.modPlayers > 0);
  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ server: SERVER_NAME, rooms: data, currentStandardVersion: CURRENT_STANDARD_VERSION, currentModVersion: CURRENT_MOD_VERSION }, null, 2));
  return;
}

  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(`${SERVER_NAME} is running.
`);
});


function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function makeId(prefix = '') {
  return prefix + crypto.randomBytes(6).toString('hex');
}

function randomColor() {
  const colors = ['#22c55e', '#60a5fa', '#f472b6', '#f59e0b', '#a78bfa', '#34d399', '#f43f5e'];
  return colors[Math.floor(Math.random() * colors.length)];
}

function semverToParts(v) {
  return String(v || '0.0.0').split('.').slice(0, 3).map((n) => parseInt(n, 10) || 0);
}

function semverGte(a, b) {
  const pa = semverToParts(a);
  const pb = semverToParts(b);
  for (let i = 0; i < 3; i++) {
    if (pa[i] > pb[i]) return true;
    if (pa[i] < pb[i]) return false;
  }
  return true;
}

function semverLt(a, b) {
  return !semverGte(a, b);
}

function isOldClientVersion(version) {
  return semverLt(version, MIN_RECOMMENDED_CLIENT_VERSION);
}

function normalizeName(name) {
  const clean = String(name || 'Player').trim().replace(/\s+/g, ' ').slice(0, 16);
  return clean || 'Player';
}

function ensureUniqueName(room, baseName, excludeId = null) {
  const original = normalizeName(baseName);
  const taken = new Set(
    Array.from(room.players.values())
      .filter((p) => p.id !== excludeId)
      .map((p) => p.name.toLowerCase())
  );

  if (!taken.has(original.toLowerCase())) return original;

  for (let i = 2; i < 100; i++) {
    const suffix = '_' + i;
    const candidate = (original.slice(0, Math.max(1, 16 - suffix.length)) + suffix).slice(0, 16);
    if (!taken.has(candidate.toLowerCase())) return candidate;
  }

  return ('Player_' + Math.floor(Math.random() * 999)).slice(0, 16);
}

function normalizeChatChannel(value) {
  return String(value || '').trim().toLowerCase() === MOD_CHAT_CHANNEL
    ? MOD_CHAT_CHANNEL
    : STANDARD_CHAT_CHANNEL;
}

function getEntryChannel(entry) {
  return normalizeChatChannel(entry && entry.channel);
}

function cloneMap(mapKey) {
  const map = MAPS[mapKey] || MAPS.arena;
  return {
    key: map.key,
    name: map.name,
    world: { ...map.world },
    platforms: map.platforms.map((p) => ({ ...p })),
    spawns: map.spawns.map((s) => ({ ...s })),
    pickups: map.pickups.map((p) => ({ ...p }))
  };
}


function createRoom(name, requestedMapKey = 'arena', options = {}) {
  const map = cloneMap(requestedMapKey);
  const room = {
    name,
    mapKey: map.key,
    map,
    world: { ...map.world },
    players: new Map(),
    sockets: new Map(),
    bullets: [],
    pickups: buildRoomPickups(map),
    chatHistory: [],
    killfeed: [],
    feedSeq: 0,
    lastStateBroadcastAt: 0,
    fastStateTimer: null,
    round: createRoundState(map.key),
    maxPlayers: sanitizeMaxPlayers(options.maxPlayers),
    isPrivate: !!options.isPrivate,
    accessCode: sanitizeRoomCode(options.accessCode)
  };
  rooms.set(name, room);
  return room;
}

function getRoom(name, requestedMapKey, options = {}) {
  const roomName = normalizeRoomName(name);
  return rooms.get(roomName) || createRoom(roomName, requestedMapKey, options);
}

function getSpawnPoint(room) {
  return room.map.spawns[Math.floor(Math.random() * room.map.spawns.length)];
}

function createPlayer(room, id, rawName, clientVersion, deviceKey, requestedChatChannel = STANDARD_CHAT_CHANNEL) {
  const spawn = getSpawnPoint(room);
  const uniqueName = ensureUniqueName(room, rawName);
  const chatRead = semverGte(clientVersion, MIN_CHAT_VERSION);
  const deviceRecord = getOrCreateDeviceRecord(deviceKey);

  const chatChannel = normalizeChatChannel(requestedChatChannel);
  const progress = ensureProgressRecord(deviceRecord);

  const player = {
    id,
    name: uniqueName,
    x: spawn.x,
    y: spawn.y,
    w: 34,
    h: 46,
    vx: 0,
    vy: 0,
    speed: 0.78,
    maxSpeed: 5.4,
    jumpPower: MOBILE_JUMP_POWER,
    friction: 0.82,
    onGround: false,
    facing: 1,
    aimAngle: 0,
    hp: 100,
    score: 0,
    kills: 0,
    deaths: 0,
    color: randomColor(),
    dead: false,
    respawnTimer: 0,
    shootCooldown: 0,
    weaponKey: 'pistol',
    ammo: WEAPONS.pistol.ammo,
    wantPickup: false,
    lastGroundedAt: Date.now(),
    lastJumpQueuedAt: 0,
    deviceKey,
    input: {
      left: false,
      right: false,
      jump: false,
      shoot: false,
      pickup: false,
      aimX: 460,
      aimY: 290
    },

clientVersion: String(clientVersion || '0.0.0'),
coins: Number(progress.coins || 0),
wins: Number(progress.wins || 0),
xp: Number(progress.xp || 0),
ownedSkins: Array.isArray(progress.ownedSkins) ? Array.from(new Set(progress.ownedSkins)) : ['classic'],
selectedSkin: progress.selectedSkin || 'classic',
bodyColor: getSkin(progress.selectedSkin || 'classic').bodyColor,
accentColor: getSkin(progress.selectedSkin || 'classic').accentColor,
level: getLevelFromXp(progress.xp || 0),
titleFrame: getTitleFrame(getLevelFromXp(progress.xp || 0)),
sessionWinStreak: 0,
sessionKillStreak: 0,
armor: 0,
speedUntil: 0,
jumpUntil: 0,
damageUntil: 0,
shieldUntil: 0,
rivals: {},
chat: {
      canRead: chatRead,
      channel: chatChannel,
      mutedUntil: Number(deviceRecord.mutedUntil || 0),
      sessionWriteLocked: !!deviceRecord.writeBlocked,
      strikes: Number(deviceRecord.strikes || 0),
      profanityHits: Number(deviceRecord.profanityHits || 0),
      recentTimestamps: [],
      lastNormalized: '',
      lastAt: 0
    }
  };

  applySkinToPlayer(player, player.selectedSkin);

  deviceRecord.lastName = player.name;
  deviceRecord.updatedAt = Date.now();
  saveStore();

  return player;
}

function rectsIntersect(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function canPlayerWriteChat(player) {
  return player.chat.canRead && !player.chat.sessionWriteLocked && Date.now() >= player.chat.mutedUntil;
}

function chatWriteReason(player) {
  if (!player.chat.canRead) return `Обнови игру до версии ${MIN_CHAT_VERSION} для чата.`;
  if (player.chat.sessionWriteLocked) return 'На этом устройстве чат заблокирован за нарушения.';
  if (Date.now() < player.chat.mutedUntil) {
    const sec = Math.max(1, Math.ceil((player.chat.mutedUntil - Date.now()) / 1000));
    return `Писать в чат временно нельзя: ${sec} сек.`;
  }
  if (normalizeChatChannel(player.chat.channel) === MOD_CHAT_CHANNEL) {
    return 'Активен канал «чат без ограничений». Мат не цензурируется, но спам и повторы модерируются.';
  }
  return 'Можно писать.';
}

function censorText(text) {
  return String(text || '').replace(/[A-Za-zА-Яа-яЁё]+/gu, (token) => {
    return tokenContainsProfanity(token)
      ? '*'.repeat(Math.max(3, token.length))
      : token;
  });
}

function pushChatHistory(room, entry) {
  room.chatHistory.push(entry);
  if (room.chatHistory.length > CHAT_HISTORY_LIMIT) {
    room.chatHistory.splice(0, room.chatHistory.length - CHAT_HISTORY_LIMIT);
  }
}

function wsSend(socket, data, opcode = 0x1) {
  const payload = Buffer.isBuffer(data)
    ? data
    : Buffer.from(typeof data === 'string' ? data : JSON.stringify(data));

  let header;
  if (payload.length < 126) {
    header = Buffer.alloc(2);
    header[0] = 0x80 | opcode;
    header[1] = payload.length;
  } else if (payload.length < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x80 | opcode;
    header[1] = 126;
    header.writeUInt16BE(payload.length, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x80 | opcode;
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

function attachSocketHandlers(socket, handlers) {
  let buffer = Buffer.alloc(0);

  socket.on('data', (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);

    while (true) {
      const frame = parseFrame(buffer);
      if (!frame) break;
      buffer = buffer.subarray(frame.bytesUsed);

      if (frame.opcode === 0x8) {
        try { socket.end(); } catch {}
        handlers.onClose();
        return;
      }

      if (frame.opcode === 0x9) {
        try { wsSend(socket, frame.payload, 0xA); } catch {}
        continue;
      }

      if (frame.opcode === 0x1) {
        try {
          handlers.onMessage(frame.payload.toString('utf8'));
        } catch {}
      }
    }
  });

  socket.on('close', handlers.onClose);
  socket.on('end', handlers.onClose);
  socket.on('error', handlers.onClose);
}

function sendSystemMessage(socket, text) {
  try {
    wsSend(socket, { type: 'system', text, at: Date.now() });
  } catch {}
}

function sendChatState(socket, player) {
  wsSend(socket, {
    type: 'chatState',
    canRead: player.chat.canRead,
    canWrite: canPlayerWriteChat(player),
    reason: chatWriteReason(player),
    minimumVersion: MIN_CHAT_VERSION,
    channel: normalizeChatChannel(player.chat.channel),
    chatLabel: normalizeChatChannel(player.chat.channel) === MOD_CHAT_CHANNEL ? MOD_CHAT_LABEL : 'Чат'
  });
}

function sendCompatJoinBlocked(socket, reason, systemText = '') {
  const statusText = 'не подключено, нужна специальная версия';

  try {
    wsSend(socket, {
      type: 'chatState',
      canRead: false,
      canWrite: false,
      reason,
      minimumVersion: MIN_CHAT_VERSION,
      channel: STANDARD_CHAT_CHANNEL,
      chatLabel: 'Неправильная версия',
      statusText,
      connectionText: statusText,
      onlineState: 'offline',
      modeLabel: 'training'
    });
  } catch {}

  try {
    wsSend(socket, {
      type: 'status',
      status: 'offline',
      state: 'offline',
      text: statusText,
      label: statusText,
      reason,
      code: 'wrong_version',
      trainingOnly: true
    });
  } catch {}

  try {
    wsSend(socket, {
      type: 'connectionStatus',
      online: false,
      status: 'offline',
      text: statusText,
      reason,
      code: 'wrong_version',
      trainingOnly: true
    });
  } catch {}

  if (systemText) sendSystemMessage(socket, systemText);

  try {
    wsSend(socket, {
      type: 'joinRejected',
      reason,
      trainingOnly: true,
      status: 'wrong_version',
      statusText,
      connectionText: statusText,
      label: statusText
    });
  } catch {}
}

function broadcastChat(room, entry) {
  const channel = getEntryChannel(entry);
  for (const [id, socket] of room.sockets.entries()) {
    const player = room.players.get(id);
    if (!player || !player.chat.canRead || socket.destroyed) continue;
    if (normalizeChatChannel(player.chat.channel) !== channel) continue;
    try {
      wsSend(socket, { type: 'chat', entry });
    } catch {}
  }
}

function broadcastSystemToRoom(room, text, channel = STANDARD_CHAT_CHANNEL) {
  const entry = {
    id: makeId('sys-'),
    from: 'Сервер',
    text,
    at: Date.now(),
    system: true,
    channel: normalizeChatChannel(channel)
  };
  pushChatHistory(room, entry);
  broadcastChat(room, entry);
}

function applyModerationStrike(room, player, socket, reason) {
  player.chat.strikes += 1;
  persistPlayerModeration(player, reason);

  if (player.chat.strikes >= 4) {
    player.chat.sessionWriteLocked = true;
    persistPlayerModeration(player, 'permanent_write_block');
    sendSystemMessage(socket, 'Чат переведен в режим только чтение на этом устройстве за повторные нарушения.');
    sendChatState(socket, player);
    return;
  }

  if (player.chat.strikes >= 2) {
    player.chat.mutedUntil = Date.now() + TEMP_MUTE_MS;
    persistPlayerModeration(player, 'temporary_mute');
    sendSystemMessage(socket, `Чат временно ограничен за ${reason}.`);
    sendChatState(socket, player);
    return;
  }

  sendSystemMessage(socket, `Предупреждение: ${reason}.`);
  sendChatState(socket, player);
}

function handleChatMessage(room, player, socket, rawText) {
  if (!player.chat.canRead) {
    sendChatState(socket, player);
    return;
  }

  if (!canPlayerWriteChat(player)) {
    sendChatState(socket, player);
    return;
  }

  const trimmed = String(rawText || '').replace(/\s+/g, ' ').trim().slice(0, MAX_CHAT_LEN);
  if (!trimmed) return;

  const now = Date.now();
  const channel = normalizeChatChannel(player.chat.channel);
  const isModChannel = channel === MOD_CHAT_CHANNEL;

  player.chat.recentTimestamps = player.chat.recentTimestamps.filter((t) => now - t < SPAM_WINDOW_MS);
  player.chat.recentTimestamps.push(now);

  const normalized = trimmed.toLowerCase();

  if (player.chat.recentTimestamps.length > SPAM_LIMIT) {
    applyModerationStrike(room, player, socket, 'спам');
    return;
  }

  if (player.chat.lastNormalized === normalized && now - player.chat.lastAt < 2500) {
    applyModerationStrike(room, player, socket, 'повтор сообщений');
    return;
  }

  player.chat.lastNormalized = normalized;
  player.chat.lastAt = now;

  let text = trimmed;

  if (!isModChannel) {
    text = censorText(trimmed);
    const hadProfanity = text !== trimmed;

    if (hadProfanity) {
      player.chat.profanityHits += 1;
      persistPlayerModeration(player, 'profanity');
      sendSystemMessage(socket, 'Мат в чате цензурируется автоматически.');

      if (player.chat.profanityHits >= 3) {
        player.chat.sessionWriteLocked = true;
        persistPlayerModeration(player, 'permanent_write_block_profanity');
        sendSystemMessage(socket, 'За повторный мат чат переведен в режим только чтение на этом устройстве.');
        sendChatState(socket, player);
        return;
      }
    }
  }

  const entry = {
    id: makeId('chat-'),
    from: player.name,
    text,
    at: now,
    system: false,
    channel
  };

  pushChatHistory(room, entry);
  broadcastChat(room, entry);
}

function moveAndCollide(room, p) {
  p.x += p.vx;
  let box = { x: p.x, y: p.y, w: p.w, h: p.h };

  for (const plat of room.map.platforms) {
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

  for (const plat of room.map.platforms) {
    if (rectsIntersect(box, plat)) {
      if (p.vy > 0) {
        p.y = plat.y - p.h;
        p.vy = 0;
        p.onGround = true;
        p.lastGroundedAt = Date.now();
      } else if (p.vy < 0) {
        p.y = plat.y + plat.h;
        p.vy = 0;
      }
      box.y = p.y;
    }
  }

  p.x = clamp(p.x, 0, room.world.width - p.w);
  if (p.y > room.world.height + 220) {
    damagePlayer(room, p, 999, null);
  }
}


function updatePlayer(room, p) {
  if (p.dead) {
    p.respawnTimer -= 1;
    if (p.respawnTimer <= 0) respawnPlayer(room, p);
    return;
  }

  const now = Date.now();
  clearExpiredBuffs(p);
  p.level = getLevelFromXp(p.xp || 0);
  p.titleFrame = getTitleFrame(p.level);

  const currentSpeed = (p.speedUntil || 0) > now ? p.speed * 1.18 : p.speed;
  const currentMaxSpeed = (p.speedUntil || 0) > now ? p.maxSpeed * 1.16 : p.maxSpeed;
  const currentJumpPower = (p.jumpUntil || 0) > now ? p.jumpPower * 1.14 : p.jumpPower;

  if (p.shootCooldown > 0) p.shootCooldown -= 1;
  p.vy += room.world.gravity;

  const input = p.input;
  if (input.left) p.vx -= currentSpeed;
  if (input.right) p.vx += currentSpeed;
  if (!input.left && !input.right) p.vx *= p.friction;
  p.vx = clamp(p.vx, -currentMaxSpeed, currentMaxSpeed);

  const canBufferedJump = p.onGround || (now - (p.lastGroundedAt || 0) <= COYOTE_MS);
  if (p.lastJumpQueuedAt && now - p.lastJumpQueuedAt <= JUMP_BUFFER_MS && canBufferedJump) {
    p.vy = -currentJumpPower;
    p.onGround = false;
    p.lastGroundedAt = 0;
    p.lastJumpQueuedAt = 0;
  } else if (p.lastJumpQueuedAt && now - p.lastJumpQueuedAt > JUMP_BUFFER_MS) {
    p.lastJumpQueuedAt = 0;
  }

  const centerX = p.x + p.w / 2;
  const centerY = p.y + p.h / 2;
  const cameraX = clamp(centerX - 460, 0, Math.max(0, room.world.width - 920));
  const cameraY = clamp(centerY - 290, 0, Math.max(0, room.world.height - 580));
  const worldAimX = clamp((input.aimX || 460) + cameraX, 0, room.world.width);
  const worldAimY = clamp((input.aimY || 290) + cameraY, 0, room.world.height);

  const dx = worldAimX - centerX;
  const dy = worldAimY - centerY;
  p.aimAngle = Math.atan2(dy, dx);
  if (Math.abs(dx) > 2) p.facing = dx >= 0 ? 1 : -1;

  if (input.shoot) {
    tryShoot(room, p, Math.cos(p.aimAngle), Math.sin(p.aimAngle));
  }

  p.wantPickup = !!input.pickup;
  moveAndCollide(room, p);

  if (p.lastJumpQueuedAt && Date.now() - p.lastJumpQueuedAt <= JUMP_BUFFER_MS && p.onGround) {
    p.vy = -currentJumpPower;
    p.onGround = false;
    p.lastGroundedAt = 0;
    p.lastJumpQueuedAt = 0;
    moveAndCollide(room, p);
  }

  handlePickup(room, p);
}


function tryShoot(room, p, dirX, dirY) {
  if (p.dead || p.shootCooldown > 0 || p.ammo <= 0) return;

  const weapon = WEAPONS[p.weaponKey];
  const damageBoosted = (p.damageUntil || 0) > Date.now();
  p.shootCooldown = weapon.cooldown;
  p.ammo -= 1;

  for (let i = 0; i < weapon.pellets; i++) {
    const spread = (Math.random() - 0.5) * weapon.spread;
    const angle = Math.atan2(dirY || 0, dirX || p.facing) + spread;

    room.bullets.push({
      id: makeId('b'),
      ownerId: p.id,
      x: p.x + p.w / 2 + Math.cos(angle) * 20,
      y: p.y + p.h / 2 + Math.sin(angle) * 6,
      vx: Math.cos(angle) * weapon.speed,
      vy: Math.sin(angle) * weapon.speed,
      damage: damageBoosted ? Math.round(weapon.damage * 1.35) : weapon.damage,
      life: 70,
      color: damageBoosted ? '#f97316' : weapon.color
    });
  }

  if (p.ammo <= 0) {
    p.weaponKey = 'pistol';
    p.ammo = WEAPONS.pistol.ammo;
  }
}



function handlePickup(room, p) {
  if (p.dead) return;
  const centerX = p.x + p.w / 2;
  const centerY = p.y + p.h / 2;

  for (let i = room.pickups.length - 1; i >= 0; i--) {
    const item = room.pickups[i];
    const dx = centerX - item.x;
    const dy = centerY - item.y;
    if (dx * dx + dy * dy >= 42 * 42) continue;

    let consumed = false;
    if (item.type === 'medkit') {
      if (p.hp >= 100) continue;
      p.hp = clamp(p.hp + 45, 0, 100);
      consumed = true;
    } else if (item.type === 'armor') {
      p.armor = Math.min(ARMOR_VALUE, Number(p.armor || 0) + 20);
      consumed = true;
    } else if (item.type === 'speed') {
      p.speedUntil = Date.now() + SPEED_BUFF_MS;
      consumed = true;
    } else if (item.type === 'jump') {
      p.jumpUntil = Date.now() + JUMP_BUFF_MS;
      consumed = true;
    } else if (item.type === 'damage') {
      p.damageUntil = Date.now() + DAMAGE_BUFF_MS;
      consumed = true;
    } else if (item.type === 'shield') {
      p.shieldUntil = Date.now() + SHIELD_BUFF_MS;
      consumed = true;
    } else {
      if (!p.wantPickup) continue;
      p.weaponKey = item.type;
      p.ammo = WEAPONS[item.type].ammo;
      consumed = true;
    }

    if (!consumed) continue;
    const removed = room.pickups.splice(i, 1)[0];
    setTimeout(() => {
      const existingRoom = rooms.get(room.name);
      if (!existingRoom) return;
      existingRoom.pickups.push({
        id: makeId('pickup-'),
        type: removed.type,
        x: removed.x,
        y: removed.y,
        r: 16
      });
    }, removed.type === 'medkit' ? 9000 : 8500);
    break;
  }
}


function damagePlayer(room, target, amount, attackerId) {
  if (target.dead) return;

  const now = Date.now();
  if ((target.shieldUntil || 0) > now) {
    amount *= 0.6;
  }
  if (target.armor > 0) {
    const absorbed = Math.min(target.armor, Math.ceil(amount * 0.45));
    target.armor -= absorbed;
    amount -= absorbed;
  }

  target.hp -= amount;
  if (target.hp <= 0) {
    target.dead = true;
    target.respawnTimer = 120;
    target.hp = 0;
    target.deaths += 1;
    target.sessionKillStreak = 0;

    if (attackerId && room.players.has(attackerId) && attackerId !== target.id) {
      const attacker = room.players.get(attackerId);
      attacker.score += 1;
      attacker.kills += 1;
      attacker.sessionKillStreak = Number(attacker.sessionKillStreak || 0) + 1;
      attacker.rivals[target.id] = (attacker.rivals[target.id] || 0) + 1;
      const revenge = (target.rivals[attacker.id] || 0) >= 2;
      const domination = (attacker.rivals[target.id] || 0) >= 3;
      let extraText = '';
      if (attacker.sessionKillStreak === 2) extraText = 'двойное убийство';
      else if (attacker.sessionKillStreak === 3) extraText = 'тройное убийство';
      else if (attacker.sessionKillStreak >= 4) extraText = `серия ${attacker.sessionKillStreak}`;
      if (revenge) extraText = extraText ? extraText + ' · месть' : 'месть';
      if (domination) extraText = extraText ? extraText + ' · доминация' : 'доминация';
      pushKillfeedEvent(room, attacker.name, target.name, attacker.weaponKey, extraText);
      target.rivals[attacker.id] = 0;
    }
  }
}

function respawnPlayer(room, p) {
  const spawn = getSpawnPoint(room);
  p.dead = false;
  p.hp = 100;
  p.armor = 0;
  p.speedUntil = 0;
  p.jumpUntil = 0;
  p.damageUntil = 0;
  p.shieldUntil = 0;
  p.x = spawn.x;
  p.y = spawn.y;
  p.vx = 0;
  p.vy = 0;
  p.onGround = false;
  p.lastGroundedAt = Date.now();
  p.lastJumpQueuedAt = 0;
  p.weaponKey = 'pistol';
  p.ammo = WEAPONS.pistol.ammo;
}

function updateBullets(room) {
  room.bullets = room.bullets.filter((b) => {
    b.x += b.vx;
    b.y += b.vy;
    b.life -= 1;
    if (b.life <= 0) return false;

    for (const plat of room.map.platforms) {
      if (b.x > plat.x && b.x < plat.x + plat.w && b.y > plat.y && b.y < plat.y + plat.h) {
        return false;
      }
    }

    for (const p of room.players.values()) {
      if (p.id === b.ownerId || p.dead) continue;
      if (b.x > p.x && b.x < p.x + p.w && b.y > p.y && b.y < p.y + p.h) {
        damagePlayer(room, p, b.damage, b.ownerId);
        return false;
      }
    }

    return true;
  });
}

function serializeWelcome(room, player) {
  return {
    type: 'welcome',
    id: player.id,
    actualName: player.name,
    room: room.name,
    mapKey: room.mapKey,
    mapName: room.map.name,
    world: room.world,
    platforms: room.map.platforms,
    pickups: room.pickups,
    capabilities: {
      chat: true,
      moderation: true,
      chatChannel: normalizeChatChannel(player.chat.channel),
      chatLabel: normalizeChatChannel(player.chat.channel) === MOD_CHAT_CHANNEL ? MOD_CHAT_LABEL : 'Чат',
      uncensoredChat: normalizeChatChannel(player.chat.channel) === MOD_CHAT_CHANNEL
    },
    serverName: SERVER_NAME,
    minimumChatVersion: MIN_CHAT_VERSION,
    currentStandardVersion: CURRENT_STANDARD_VERSION,
    currentModVersion: CURRENT_MOD_VERSION,
    roomInfo: roomPublicInfo(room),
    round: serializeRound(room, player),
    progression: serializeProgression(player),
    skins: Object.values(SKINS)
  };
}

function serializeState(room) {
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
      kills: p.kills,
      deaths: p.deaths,
      color: p.color,
      dead: p.dead,
      respawnTimer: p.respawnTimer,
      weaponKey: p.weaponKey,
      ammo: p.ammo,
      wins: p.wins || 0,
      xp: p.xp || 0,
      level: getLevelFromXp(p.xp || 0),
      titleFrame: getTitleFrame(getLevelFromXp(p.xp || 0)),
      armor: p.armor || 0,
      buffs: {
        shield: (p.shieldUntil || 0) > Date.now(),
        speed: (p.speedUntil || 0) > Date.now(),
        jump: (p.jumpUntil || 0) > Date.now(),
        damage: (p.damageUntil || 0) > Date.now()
      },
      skinKey: p.selectedSkin || 'classic',
      bodyColor: p.bodyColor || p.color,
      accentColor: p.accentColor || '#ffffff'
    };
  }

  return {
    type: 'state',
    room: room.name,
    roomInfo: roomPublicInfo(room),
    mapKey: room.mapKey,
    mapName: room.map.name,
    players,
    bullets: room.bullets,
    pickups: room.pickups,
    killfeed: room.killfeed || [],
    round: serializeRound(room),
    serverNow: Date.now()
  };
}

function scheduleFastBroadcast(room) {
  if (!room || room.fastStateTimer) return;
  const now = Date.now();
  const wait = Math.max(0, FAST_INPUT_BROADCAST_MS - (now - (room.lastStateBroadcastAt || 0)));
  room.fastStateTimer = setTimeout(() => {
    room.fastStateTimer = null;
    if (!rooms.has(room.name)) return;
    broadcastState(room);
  }, wait);
}

function broadcastState(room) {
  room.lastStateBroadcastAt = Date.now();
  const payload = JSON.stringify(serializeState(room));
  for (const socket of room.sockets.values()) {
    if (socket.destroyed) continue;
    try { wsSend(socket, payload); } catch {}
  }
}

function tickRoom(room) {
  updateRoomRound(room);
  for (const p of room.players.values()) {
    updatePlayer(room, p);
  }
  updateBullets(room);
}

function cleanupRoom(roomName) {
  const room = rooms.get(roomName);
  if (!room) return;
  if (room.players.size === 0 && room.sockets.size === 0) {
    if (room.fastStateTimer) {
      clearTimeout(room.fastStateTimer);
      room.fastStateTimer = null;
    }
    rooms.delete(roomName);
  }
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
  try { socket.setNoDelay(true); } catch {}
  try { socket.setKeepAlive(true, 15000); } catch {}

  const remoteAddress = req.socket.remoteAddress || '';
  const userAgent = req.headers['user-agent'] || '';

  let room = null;
  let playerId = null;
  let closed = false;

  const safeClose = () => {
    if (closed) return;
    closed = true;

    if (room && playerId) {
      const player = room.players.get(playerId);
      const name = player ? player.name : 'Игрок';
      delete room.round.votesByPlayer[playerId];
      room.players.delete(playerId);
      room.sockets.delete(playerId);
      if (player && player.chat.canRead) {
        broadcastSystemToRoom(room, `${name} вышел из комнаты.`, player.chat.channel);
      }
      broadcastRoundInfo(room);
      cleanupRoom(room.name);
    }
  };

  attachSocketHandlers(socket, {
    onMessage: (text) => {
      let msg;
      try {
        msg = JSON.parse(text);
      } catch {
        return;
      }

      if (msg.type === 'join') {
        const requestedMaxPlayers = sanitizeMaxPlayers(msg.maxPlayers);
        const requestedPrivate = !!msg.privateRoom;
        const requestedCode = sanitizeRoomCode(msg.privateCode);
        room = getRoom(msg.room, msg.mapKey, { maxPlayers: requestedMaxPlayers, isPrivate: requestedPrivate, accessCode: requestedCode });
        if (room.isPrivate && room.accessCode && room.accessCode !== requestedCode) {
          sendCompatJoinBlocked(socket, 'Неверный код приватной комнаты.', 'Сервер: неверный код комнаты.');
          setTimeout(() => { try { socket.end(); } catch {} }, 600);
          return;
        }
        if (room.players.size >= room.maxPlayers) {
          sendCompatJoinBlocked(socket, 'Комната заполнена.', 'Сервер: комната уже заполнена.');
          setTimeout(() => { try { socket.end(); } catch {} }, 600);
          return;
        }
        playerId = makeId('p-');

        const joinedDeviceState = getJoinedDeviceState(msg.deviceId, remoteAddress, userAgent);
        const deviceKey = joinedDeviceState.primaryKey;
        const requestedChannel = normalizeChatChannel(msg.desiredChatMode);
        const wantsModChat = requestedChannel === MOD_CHAT_CHANNEL;
        const consentAccepted = !!msg.modConsentAccepted;

        if (joinedDeviceState.modChatOnly && !wantsModChat) {
          sendCompatJoinBlocked(
            socket,
            'Неправильная версия: это устройство привязано к «чат без ограничений». Для онлайна нужна модовая версия, остальные версии доступны только в тренировке.',
            'Сервер: это устройство уже привязано к версии «чат без ограничений». Открой модовую версию для онлайна.'
          );
          setTimeout(() => {
            try { socket.end(); } catch {}
          }, 900);
          return;
        }

        if (wantsModChat) {
          if (!consentAccepted) {
            sendCompatJoinBlocked(
              socket,
              'Сначала нужно согласиться с предупреждением для «чат без ограничений».',
              'Сервер: вход в «чат без ограничений» доступен только после согласия с предупреждением.'
            );
            setTimeout(() => {
              try { socket.end(); } catch {}
            }, 900);
            return;
          }

          setModChatOnlyForIdentity(joinedDeviceState.keys, true);
        }

        const player = createPlayer(room, playerId, msg.name, msg.clientVersion, deviceKey, requestedChannel);

        room.players.set(playerId, player);
        room.sockets.set(playerId, socket);

        wsSend(socket, serializeWelcome(room, player));
        sendChatState(socket, player);
        sendProgress(socket, player);
        sendRoundInfo(socket, room, player);

        if (player.chat.sessionWriteLocked) {
          sendSystemMessage(socket, 'Это устройство уже находится в режиме только чтение за прошлые нарушения.');
        } else if (Date.now() < player.chat.mutedUntil) {
          sendSystemMessage(socket, 'На этом устройстве еще действует временное ограничение чата.');
        }

        if (player.chat.canRead) {
          wsSend(socket, {
            type: 'chatHistory',
            entries: room.chatHistory.filter((entry) => getEntryChannel(entry) === normalizeChatChannel(player.chat.channel))
          });
        }

        if (player.name !== normalizeName(msg.name)) {
          sendSystemMessage(socket, `Имя занято, выдан новый ник: ${player.name}`);
        }

        if (!player.chat.canRead) {
          sendSystemMessage(socket, `Чат доступен только с версии ${MIN_CHAT_VERSION}+`);
        }


sendSystemMessage(socket, `Сервер: ваша версия клиента ${player.clientVersion}. Актуальные версии: ${CURRENT_STANDARD_VERSION} и ${CURRENT_MOD_VERSION}.`);
if (isOldClientVersion(player.clientVersion)) {
  sendSystemMessage(socket, `Сервер: у вас старая версия клиента (${player.clientVersion}). Рекомендуется обновиться до ${CURRENT_STANDARD_VERSION} / ${CURRENT_MOD_VERSION}.`);
  if (player.chat.canRead) {
    broadcastSystemToRoom(room, `${player.name} использует старую версию клиента (${player.clientVersion}).`, normalizeChatChannel(player.chat.channel));
  }
}

if (player.chat.canRead) {
  if (normalizeChatChannel(player.chat.channel) === MOD_CHAT_CHANNEL) {
    broadcastSystemToRoom(room, `${player.name} вошел в канал «${MOD_CHAT_LABEL}». ${MOD_CHAT_WARNING}`, MOD_CHAT_CHANNEL);
  } else {
    broadcastSystemToRoom(room, `${player.name} вошел в комнату.`, STANDARD_CHAT_CHANNEL);
    if (countRoomModePlayers(room, MOD_CHAT_CHANNEL) > 0) {
      broadcastSystemToRoom(room, `${player.name} вошел в комнату (отказан от канала «${MOD_CHAT_LABEL}»).`, MOD_CHAT_CHANNEL);
    }
  }
}
        return;
      }

      if (!room || !playerId || !room.players.has(playerId)) return;

      const player = room.players.get(playerId);

      if (msg.type === 'input') {
        const nextLeft = !!msg.left;
        const nextRight = !!msg.right;
        const nextJump = !!msg.jump;
        const nextShoot = !!msg.shoot;
        const nextPickup = !!msg.pickup;
        const nextAimX = Number.isFinite(msg.aimX) ? msg.aimX : 460;
        const nextAimY = Number.isFinite(msg.aimY) ? msg.aimY : 290;

        const movementChanged =
          player.input.left !== nextLeft ||
          player.input.right !== nextRight ||
          player.input.jump !== nextJump ||
          player.input.shoot !== nextShoot ||
          player.input.pickup !== nextPickup;

        const jumpPressed = nextJump && !player.input.jump;

        player.input.left = nextLeft;
        player.input.right = nextRight;
        player.input.jump = nextJump;
        player.input.shoot = nextShoot;
        player.input.pickup = nextPickup;
        player.input.aimX = nextAimX;
        player.input.aimY = nextAimY;

        if (jumpPressed) {
          player.lastJumpQueuedAt = Date.now();
          if (player.onGround || Date.now() - (player.lastGroundedAt || 0) <= COYOTE_MS) {
            player.vy = -player.jumpPower;
            player.onGround = false;
            player.lastGroundedAt = 0;
          }
        }

        if (movementChanged || jumpPressed) {
          scheduleFastBroadcast(room);
        }
        return;
      }

      if (msg.type === 'chat') {
        handleChatMessage(room, player, socket, msg.text);
        return;
      }

      if (msg.type === 'voteRoundSettings') {
        if (applyRoomVote(room, player, msg.mapKey, msg.durationSec)) {
          sendSystemMessage(socket, 'Голос учтен.');
        }
        return;
      }

      if (msg.type === 'buySkin') {
        const skin = SKINS[msg.skinKey];
        if (!skin || skin.price <= 0) return;
        if (player.ownedSkins.includes(skin.key)) {
          sendProgress(socket, player, 'Скин уже куплен');
          return;
        }
        if ((player.coins || 0) < skin.price) {
          sendProgress(socket, player, 'Не хватает монет');
          return;
        }
        player.coins -= skin.price;
        player.ownedSkins.push(skin.key);
        persistPlayerProgress(player);
        sendProgress(socket, player, `Куплен скин ${skin.name}`);
        return;
      }

      if (msg.type === 'selectSkin') {
        const skin = SKINS[msg.skinKey];
        if (!skin || !player.ownedSkins.includes(skin.key)) {
          sendProgress(socket, player, 'Сначала купи этот скин');
          return;
        }
        applySkinToPlayer(player, skin.key);
        persistPlayerProgress(player);
        sendProgress(socket, player, `Выбран скин ${skin.name}`);
        scheduleFastBroadcast(room);
        return;
      }

      if (msg.type === 'rename') {
        const oldName = player.name;
        player.name = ensureUniqueName(room, msg.name, player.id);
        persistPlayerModeration(player, 'rename');
        wsSend(socket, { type: 'renamed', actualName: player.name });
        if (oldName !== player.name) {
          broadcastSystemToRoom(room, `${oldName} теперь известен как ${player.name}.`, player.chat.channel);
        }
        return;
      }
    },
    onClose: safeClose
  });
});

setInterval(() => {
  for (const room of rooms.values()) tickRoom(room);
}, TICK_RATE);

setInterval(() => {
  for (const room of rooms.values()) broadcastState(room);
}, SNAPSHOT_RATE);

server.listen(PORT, () => {
  console.log(`${SERVER_NAME} listening on ws://localhost:${PORT}`);
});