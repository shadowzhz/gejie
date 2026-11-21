// 视觉图腾、场景画卷与轻量化 WebAudio 音效（纯本地零依赖，离线单文件可用）

const SFX_MUTE_KEY = 'gujie_sfx_muted';

export function isSfxMuted() {
  try {
    return globalThis.localStorage?.getItem(SFX_MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

export function toggleSfxMuted() {
  const next = !isSfxMuted();
  try {
    globalThis.localStorage?.setItem(SFX_MUTE_KEY, next ? '1' : '0');
  } catch {
    // 忽略隐私模式存储限制
  }
  return next;
}

let _audioCtx = null;
function getAudioCtx() {
  if (typeof window === 'undefined' || isSfxMuted()) return null;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!_audioCtx) _audioCtx = new Ctx();
  if (_audioCtx.state === 'suspended') _audioCtx.resume().catch(() => {});
  return _audioCtx;
}

function tone(freq, dur, type = 'sine', vol = 0.045, slideTo = null, delay = 0) {
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), now + dur);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(vol, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + dur + 0.02);
  } catch {
    // 忽略音频上下文限制
  }
}

export function playSfx(kind) {
  if (isSfxMuted() || typeof window === 'undefined') return;
  if (kind === 'tap') {
    tone(420, 0.055, 'triangle', 0.025, 240);
  } else if (kind === 'walk') {
    tone(190, 0.08, 'sine', 0.03, 130);
    tone(220, 0.08, 'sine', 0.022, 150, 0.09);
  } else if (kind === 'hit') {
    tone(145, 0.14, 'sawtooth', 0.045, 52);
    tone(95, 0.16, 'triangle', 0.05, 42, 0.02);
  } else if (kind === 'shield') {
    tone(330, 0.16, 'triangle', 0.035, 480);
    tone(520, 0.22, 'sine', 0.025, 440, 0.04);
  } else if (kind === 'heal') {
    tone(440, 0.18, 'sine', 0.03, 554);
    tone(660, 0.24, 'sine', 0.028, 880, 0.08);
  } else if (kind === 'refine') {
    tone(280, 0.15, 'triangle', 0.035, 360);
    tone(540, 0.22, 'sine', 0.025, 680, 0.07);
  } else if (kind === 'win' || kind === 'break') {
    tone(392, 0.18, 'triangle', 0.04, 440);
    tone(523, 0.22, 'triangle', 0.04, 587, 0.1);
    tone(784, 0.36, 'sine', 0.04, 784, 0.2);
  } else if (kind === 'alert') {
    tone(240, 0.18, 'sawtooth', 0.03, 160);
  }
}

export function renderSceneBannerSvg(placeId, night) {
  const skyTop = night ? '#081018' : '#11221e';
  const skyBot = night ? '#101d28' : '#1b312a';
  const ridgeFar = night ? '#13212c' : '#1b312b';
  const ridgeNear = night ? '#0b141b' : '#11201c';
  const moonColor = night ? '#dce6f2' : '#d8b774';
  const moonOpacity = night ? '0.82' : '0.32';

  let motif = '';
  if (placeId === 'zhulin') {
    motif = `
      <g stroke="${night ? '#223b3c' : '#2f5748'}" stroke-width="2.4" stroke-linecap="round" opacity="0.72">
        <line x1="64" y1="120" x2="58" y2="8"/><line x1="86" y1="120" x2="92" y2="12"/>
        <line x1="510" y1="120" x2="518" y2="6"/><line x1="542" y1="120" x2="536" y2="16"/>
        <line x1="566" y1="120" x2="574" y2="10"/>
      </g>
      <g fill="${night ? '#2e514f' : '#40755f'}" opacity="0.55">
        <ellipse cx="62" cy="36" rx="14" ry="3" transform="rotate(-24 62 36)"/>
        <ellipse cx="89" cy="48" rx="15" ry="3" transform="rotate(20 89 48)"/>
        <ellipse cx="516" cy="32" rx="16" ry="3" transform="rotate(18 516 32)"/>
        <ellipse cx="540" cy="54" rx="14" ry="3" transform="rotate(-22 540 54)"/>
      </g>`;
  } else if (placeId === 'xuefu' || placeId === 'huajiu') {
    motif = `
      <path d="M0 0 H600 V34 L540 16 L490 42 L430 14 L360 30 L280 12 L210 38 L140 16 L70 36 L0 20 Z" fill="#080c0d" opacity="0.75"/>
      <path d="M220 120 Q300 45 380 120" fill="none" stroke="${placeId === 'huajiu' ? '#4d8a9c' : '#8a3c36'}" stroke-width="1.4" opacity="0.45"/>`;
  } else if (placeId === 'langchao') {
    motif = `
      <polyline points="420,12 406,36 424,38 408,68" fill="none" stroke="#8ad4f5" stroke-width="1.6" opacity="0.58"/>
      <polyline points="512,18 502,38 515,40 504,60" fill="none" stroke="#8ad4f5" stroke-width="1.2" opacity="0.42"/>`;
  } else {
    motif = `
      <g fill="${ridgeNear}" stroke="#39574b" stroke-width="0.9" opacity="0.82">
        <path d="M432 82 L478 56 L524 82 Z"/>
        <rect x="444" y="82" width="68" height="38"/>
        <path d="M416 62 L478 32 L540 62 Z"/>
      </g>
      <circle cx="478" cy="70" r="3" fill="#e5b869" opacity="${night ? '0.9' : '0.4'}"/>`;
  }

  return `<svg class="stage-art" viewBox="0 0 600 120" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs>
      <linearGradient id="sky-${placeId}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${skyTop}"/>
        <stop offset="100%" stop-color="${skyBot}"/>
      </linearGradient>
    </defs>
    <rect width="600" height="120" fill="url(#sky-${placeId})"/>
    <circle cx="496" cy="34" r="18" fill="${moonColor}" opacity="${moonOpacity}"/>
    <path d="M0 94 Q95 52 195 84 T390 76 T600 88 L600 120 L0 120 Z" fill="${ridgeFar}"/>
    <path d="M0 106 Q130 74 260 98 T510 92 L600 102 L600 120 L0 120 Z" fill="${ridgeNear}"/>
    ${motif}
  </svg>`;
}

export function renderHopeFlowerSvg(step, target) {
  const ratio = Math.max(0, Math.min(1, step / Math.max(1, target)));
  const count = Math.max(2, Math.round(ratio * 18) + 2);
  let motes = '';
  for (let i = 0; i < count; i++) {
    const x = 36 + ((i * 73 + 19) % 328);
    const y = 30 + ((i * 41 + 11) % 92);
    const r = (i % 3) + 1.5;
    motes += `<circle cx="${x}" cy="${y}" r="${r}" fill="#ffe99c" opacity="${(0.35 + (i % 5) * 0.13).toFixed(2)}"/>`;
  }
  const auraR = 14 + ratio * 34;
  return `<svg class="hope-svg" viewBox="0 0 400 145" aria-hidden="true">
    <defs>
      <radialGradient id="hope-aura" cx="50%" cy="55%" r="50%">
        <stop offset="0%" stop-color="#ffe794" stop-opacity="${(0.22 + ratio * 0.55).toFixed(2)}"/>
        <stop offset="65%" stop-color="#5da9c4" stop-opacity="0.18"/>
        <stop offset="100%" stop-color="#081116" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="400" height="145" rx="6" fill="#091318"/>
    <path d="M0 118 Q100 104 200 116 T400 110 L400 145 L0 145 Z" fill="#102530"/>
    <path d="M0 126 Q130 115 260 128 T400 122" fill="none" stroke="#4c8ea8" stroke-width="1.2" opacity="0.5"/>
    <circle cx="200" cy="74" r="${auraR.toFixed(1)}" fill="url(#hope-aura)"/>
    <circle cx="200" cy="74" r="${(4 + ratio * 10).toFixed(1)}" fill="none" stroke="#e9c878" stroke-width="1.2" opacity="0.8"/>
    ${motes}
  </svg>`;
}

export function renderApertureCanvasSvg(player, guList) {
  const rankThemes = {
    1: { wall: '#5e967d', sea: '#2b6f6a', seaHi: '#62b3a3', glow: 'rgba(98, 179, 163, 0.25)', label: '青铜真元海' },
    2: { wall: '#c27959', sea: '#7a3f2d', seaHi: '#d48261', glow: 'rgba(212, 130, 97, 0.25)', label: '赤铁真元海' },
    3: { wall: '#b8c7d1', sea: '#566d7a', seaHi: '#cbdbe6', glow: 'rgba(203, 219, 230, 0.26)', label: '白银真元海' },
    4: { wall: '#dfb86c', sea: '#8a6827', seaHi: '#f0ce7c', glow: 'rgba(240, 206, 124, 0.28)', label: '黄金真元海' }
  };
  const theme = rankThemes[player.rank] || rankThemes[1];
  const seaLevel = Math.max(0.22, Math.min(0.92, (player.hai || 4) / 10));
  const zyFill = player.zyMax ? Math.max(0.08, player.zy / player.zyMax) : 0.5;
  const waveY = Math.round(150 - (100 * seaLevel * (0.45 + 0.55 * zyFill)));

  const orbs = guList.slice(0, 8).map((g, idx) => {
    const angle = (idx / Math.max(1, Math.min(guList.length, 8))) * Math.PI * 1.4 - Math.PI * 0.7;
    const cx = Math.round(200 + Math.sin(angle) * 118);
    const cy = Math.round(74 - Math.cos(angle) * 32 + (idx % 2 ? 12 : -4));
    const isBm = player.benming === g.uid;
    const color = g.weak ? '#b85349' : isBm ? '#e6c173' : theme.seaHi;
    return `<g class="ap-orb">
      <circle cx="${cx}" cy="${cy}" r="${isBm ? 8 : 5.5}" fill="${color}" opacity="0.22"/>
      <circle cx="${cx}" cy="${cy}" r="${isBm ? 4.2 : 3}" fill="${color}" stroke="#0d1413" stroke-width="0.8"/>
    </g>`;
  }).join('');

  return `<svg class="aperture-svg" viewBox="0 0 400 156" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs>
      <clipPath id="aperture-clip">
        <ellipse cx="200" cy="78" rx="178" ry="66"/>
      </clipPath>
      <linearGradient id="sea-grad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${theme.seaHi}" stop-opacity="0.65"/>
        <stop offset="100%" stop-color="${theme.sea}" stop-opacity="0.92"/>
      </linearGradient>
    </defs>
    <ellipse cx="200" cy="78" rx="184" ry="70" fill="${theme.glow}"/>
    <g clip-path="url(#aperture-clip)">
      <rect width="400" height="156" fill="#0b1111"/>
      <path class="ap-wave" d="M-40 ${waveY} Q 40 ${waveY - 8}, 120 ${waveY} T 280 ${waveY} T 440 ${waveY} L440 165 L-40 165 Z" fill="url(#sea-grad)"/>
      <path class="ap-wave2" d="M-40 ${waveY + 4} Q 50 ${waveY + 10}, 140 ${waveY + 3} T 320 ${waveY + 4} T 460 ${waveY + 2} L460 165 L-40 165 Z" fill="${theme.sea}" opacity="0.45"/>
    </g>
    <ellipse cx="200" cy="78" rx="178" ry="66" fill="none" stroke="${theme.wall}" stroke-width="1.6" opacity="0.85"/>
    <ellipse cx="200" cy="78" rx="172" ry="60" fill="none" stroke="${theme.wall}" stroke-width="0.6" stroke-dasharray="4 6" opacity="0.45"/>
    ${orbs}
  </svg>`;
}

export function renderBreakSealSvg(crack, hurt) {
  const crackRatio = Math.max(0, Math.min(1, crack / 100));
  const hurtRatio = Math.max(0, Math.min(1, hurt / 100));
  const strokeColor = hurt >= 70 ? '#d45a4e' : '#cfa968';
  const branches = [
    'M100 22 L95 44 L106 58 L98 76',
    'M100 58 L122 50 L138 62',
    'M100 58 L76 66 L62 56',
    'M98 76 L112 96 L104 114',
    'M98 76 L82 94 L68 106'
  ];
  const visibleCount = Math.ceil(crackRatio * branches.length);
  const paths = branches.slice(0, visibleCount).map((d, i) =>
    `<path d="${d}" fill="none" stroke="#f0d58c" stroke-width="${(1.1 + crackRatio * 1.4).toFixed(1)}" stroke-linecap="round" opacity="${i === visibleCount - 1 ? crackRatio : 0.92}"/>`
  ).join('');
  return `<svg class="break-svg" viewBox="0 0 200 128" aria-hidden="true">
    <circle cx="100" cy="64" r="52" fill="rgba(20, 32, 30, 0.9)" stroke="${strokeColor}" stroke-width="1.5"/>
    <circle cx="100" cy="64" r="44" fill="none" stroke="${strokeColor}" stroke-width="0.7" stroke-dasharray="3 4" opacity="0.6"/>
    <circle cx="100" cy="64" r="48" fill="none" stroke="#c9594d" stroke-width="3" opacity="${(hurtRatio * 0.75).toFixed(2)}"/>
    ${paths}
  </svg>`;
}

export function renderFurnaceCauldronSvg(state, hot, shapeRatio, effectAction) {
  const flameColor = state === 'failure' ? '#c9594d' : hot ? '#f06d4f' : '#e0a04e';
  const glowColor = state === 'success' ? '#f2cf7e' : effectAction === 'vent' ? '#7ebcc9' : flameColor;
  const lidY = effectAction === 'seal' || state === 'success' ? 30 : 12;
  const lidOpacity = effectAction === 'seal' || state === 'success' ? 1 : 0.28;
  return `<svg class="furnace-svg" viewBox="0 0 220 156" aria-hidden="true">
    <defs>
      <radialGradient id="furnace-glow" cx="50%" cy="62%" r="48%">
        <stop offset="0%" stop-color="${glowColor}" stop-opacity="${state === 'ready' ? '0.12' : '0.45'}"/>
        <stop offset="100%" stop-color="#0b1110" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="220" height="156" fill="none"/>
    <ellipse cx="110" cy="126" rx="76" ry="18" fill="none" stroke="#4d6e60" stroke-width="1" stroke-dasharray="4 5" opacity="0.75"/>
    <circle cx="110" cy="86" r="70" fill="url(#furnace-glow)"/>
    <g class="furnace-flame-group" opacity="${state === 'ready' || state === 'aborted' ? 0.15 : 0.9}">
      <path d="M88 124 Q110 92 132 124 Q110 132 88 124 Z" fill="${flameColor}" opacity="0.8"/>
      <path d="M98 124 Q110 102 122 124 Z" fill="#fff0bc" opacity="0.9"/>
    </g>
    <g class="furnace-body">
      <!-- 鼎耳与鼎足 -->
      <path d="M62 64 Q46 52 56 42 Q66 44 68 58" fill="none" stroke="#b89b63" stroke-width="3"/>
      <path d="M158 64 Q174 52 164 42 Q154 44 152 58" fill="none" stroke="#b89b63" stroke-width="3"/>
      <path d="M76 108 L68 132 L76 132 L85 110 Z" fill="#6f5c39" stroke="#a68a54" stroke-width="1"/>
      <path d="M144 108 L152 132 L144 132 L135 110 Z" fill="#6f5c39" stroke="#a68a54" stroke-width="1"/>
      <path d="M107 112 L110 135 L113 112 Z" fill="#59492d"/>
      <!-- 鼎腹 -->
      <path d="M64 56 H156 Q160 112 110 114 Q60 112 64 56 Z" fill="#232c28" stroke="#b5975d" stroke-width="1.6"/>
      <ellipse cx="110" cy="56" rx="46" ry="9" fill="#101816" stroke="#b5975d" stroke-width="1.5"/>
      <!-- 鼎身纹饰 -->
      <path d="M84 74 L110 66 L136 74 L110 96 Z" fill="none" stroke="#cfa968" stroke-width="1" opacity="0.65"/>
      <circle cx="110" cy="80" r="5" fill="none" stroke="#cfa968" stroke-width="1" opacity="0.75"/>
    </g>
    <!-- 蛊影 / 成蛊 -->
    ${shapeRatio > 0.05 || state === 'success' ? `<g opacity="${state === 'success' ? 1 : Math.min(0.95, 0.25 + shapeRatio * 0.7)}">
      <polygon points="110,${state === 'success' ? 24 : 34} 120,${state === 'success' ? 36 : 44} 110,${state === 'success' ? 48 : 54} 100,${state === 'success' ? 36 : 44}" fill="${state === 'success' ? '#f5d27a' : '#8fd4b2'}" stroke="#fff5cc" stroke-width="1"/>
    </g>` : ''}
    <!-- 炉盖 -->
    <g transform="translate(0 ${lidY})" opacity="${lidOpacity}">
      <ellipse cx="110" cy="24" rx="48" ry="8" fill="#3a3f34" stroke="#b5975d" stroke-width="1.3"/>
      <path d="M102 18 Q110 8 118 18" fill="none" stroke="#cfa968" stroke-width="2"/>
    </g>
  </svg>`;
}

export function renderEnemyEmblemSvg(enemyId, rank) {
  const palette = rank >= 3 ? '#d8b36a' : rank === 2 ? '#c47a5b' : '#6ea88e';
  let glyph = '<circle cx="32" cy="32" r="14" fill="none" stroke="currentColor" stroke-width="1.5"/>';
  if (enemyId === 'caoren') {
    glyph = '<line x1="32" y1="14" x2="32" y2="50" stroke="currentColor" stroke-width="2"/><line x1="16" y1="26" x2="48" y2="26" stroke="currentColor" stroke-width="2"/><circle cx="32" cy="18" r="5" fill="none" stroke="currentColor" stroke-width="1.6"/>';
  } else if (enemyId === 'yezhu' || enemyId === 'zhuwang') {
    glyph = '<path d="M18 38 Q32 22 46 38 M20 38 Q15 24 23 20 M44 38 Q49 24 41 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>';
  } else if (enemyId === 'xuefu' || enemyId === 'xuefu_king') {
    glyph = '<path d="M10 26 Q22 18 32 32 Q42 18 54 26 Q44 38 32 42 Q20 38 10 26 Z" fill="none" stroke="currentColor" stroke-width="1.8"/>';
  } else if (enemyId === 'dianlang' || enemyId === 'langwang') {
    glyph = '<polyline points="18,42 26,20 32,32 38,18 46,42" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/>';
  } else if (enemyId === 'tianhe') {
    glyph = '<path d="M10 34 Q24 16 32 28 Q40 16 54 34 M32 28 L32 48" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>';
  } else if (enemyId === 'guyue_yidai') {
    glyph = '<circle cx="32" cy="30" r="12" fill="none" stroke="#c9594d" stroke-width="1.8"/><path d="M24 42 L40 42 M26 28 L30 28 M34 28 L38 28" stroke="#c9594d" stroke-width="1.8"/>';
  } else {
    glyph = '<path d="M32 14 L46 28 L32 48 L18 28 Z" fill="none" stroke="currentColor" stroke-width="1.7"/><circle cx="32" cy="30" r="4" fill="currentColor" opacity="0.6"/>';
  }
  return `<svg class="foe-emblem" viewBox="0 0 64 64" style="color:${palette}" aria-hidden="true">
    <polygon points="32,3 58,18 58,46 32,61 6,46 6,18" fill="#0d1413" stroke="currentColor" stroke-width="1.2" opacity="0.88"/>
    ${glyph}
  </svg>`;
}
