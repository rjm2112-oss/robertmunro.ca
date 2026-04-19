/* ────────────────────── CONSTANTS ─────────────────────── */
const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;

const COLORS = [
    null,
'#FF0D72',
'#0DC2FF',
'#F538FF',
'#FF8E0D',
'#FFE138',
'#3877FF',
'#B525EF'
];

const SHAPES = [
    null,                         // 0 – unused
[[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
[[2, 0, 0],          [2, 2, 2],          [0, 0, 0]],
[[0, 0, 3],          [3, 3, 3],          [0, 0, 0]],
[[4, 4],             [4, 4]],
[[0, 5, 5],          [5, 5, 0],          [0, 0, 0]],
[[0, 6, 0],          [6, 6, 6],          [0, 0, 0]],
[[7, 7, 0],          [0, 7, 7],          [0, 0, 0]]
];

/* ────────────────────── KEY → ACTION MAP ─────────────────────── */
const KEY_MAP = {
    /* rotate */
    '8': rotate, 'i': rotate, 'w': rotate,
    /* left/right/down */
    '4': () => movePiece(-1,0), 'a': () => movePiece(-1,0), 'j': () => movePiece(-1,0),
    '6': () => movePiece( 1,0), 'l': () => movePiece( 1,0), 'd': () => movePiece( 1,0),
    '5': () => movePiece(0,1),  'k': () => movePiece(0,1),  's': () => movePiece(0,1),

    /* hard‑drop */
    ' ': () => { hardDrop(); dropStart = performance.now(); },

    /* hold/unstow */
    'q': stowOrUnstowPiece, 'e': stowOrUnstowPiece,
    'u': stowOrUnstowPiece, 'o': stowOrUnstowPiece,
    '7': stowOrUnstowPiece, '9': stowOrUnstowPiece
};

/* ────────────────────── HOLD‑LOCK STATE ─────────────────────── */
const HOLD_LOCK_DURATION_MS = 12_000;
let holdLockActive = false;
let holdLockEndTime = 0;

/* ────────────────────── GAME STATE ─────────────────────────── */
let board = Array(ROWS).fill().map(() => Array(COLS).fill(0));
let currentPiece = null;
let nextPiece = null;
let stowedPiece = null;
let score = 0, level = 1, lines = 0;
let gameOver = false, isPaused = true;
let dropStart = 0, lastTime = 0, gameSpeed = 1000;

let ctx, nextCtx, tetrisCanvas, nextCanvas, weatherCanvas, weatherCtx;
let clearingRows = null, flashCount = 0, lastFlashTime = 0, isFlashing = false;
let pendingScoreData = null;
const FLASH_INTERVAL_MS = 120;

let nextFlashing = false, nextFlashCount = 0, lastNextFlashTime = 0;
let rowsClearedSinceLastChange = 0;
let bag = [];
const MAX_HUE = 360;
let currentHue = 0;

let lastStowTime = 0;
const STOW_COOLDOWN_MS = 0;
const WEATHER_SCENE_ADVANCE_LINES = 10;
const WEATHER_TRANSITION_MS = 1800;

const WEATHER_SCENE_DEFAULTS = {
    skyTop: '#02040a',
    skyMid: '#0c1522',
    skyBottom: '#172334',
    moonX: 0.72,
    moonY: 0.16,
    moonSize: 26,
    moonAlpha: 0.14,
    moonGlow: 'rgba(182, 200, 228, 0.08)',
    starCount: 16,
    starOpacity: 0.22,
    cloudBands: [0.16, 0.34, 0.56],
    cloudCount: 6,
    cloudSpeed: 0.3,
    cloudScale: 1,
    cloudColor: 'rgba(29, 40, 57, 0.48)',
    rainCount: 52,
    rainSpeed: 0.92,
    rainLength: [12, 22],
    rainAngle: -0.2,
    rainOpacity: 0.1,
    rainColor: '176, 193, 214',
    fogLayers: 2,
    fogOpacity: 0.1,
    fogSpeed: 0.12,
    lightning: 0,
    lightningGapMin: 0,
    lightningGapMax: 0,
    scenery: 'mountains',
    horizon: 0.76,
    groundColor: '#061019',
    detailColor: 'rgba(118, 142, 168, 0.10)',
    accentColor: 'rgba(198, 214, 234, 0.12)'
};

function createWeatherScene(config) {
    return {
        ...WEATHER_SCENE_DEFAULTS,
        ...config,
        cloudBands: (config.cloudBands ?? WEATHER_SCENE_DEFAULTS.cloudBands).slice(),
        rainLength: (config.rainLength ?? WEATHER_SCENE_DEFAULTS.rainLength).slice()
    };
}

const WEATHER_SCENES = [
    createWeatherScene({
        name: 'Skye Rain Cliffs',
        seed: 0.14,
        scenery: 'cliffs',
        skyMid: '#09111d',
        skyBottom: '#152030',
        moonX: 0.8,
        moonSize: 40,
        moonAlpha: 0.2,
        starCount: 12,
        cloudCount: 7,
        cloudSpeed: 0.34,
        rainCount: 78,
        rainOpacity: 0.16,
        fogLayers: 3,
        fogOpacity: 0.12,
        horizon: 0.76,
        groundColor: '#050d15',
        detailColor: 'rgba(126, 151, 178, 0.10)'
    }),
    createWeatherScene({
        name: 'Black Forest Thunder',
        seed: 0.29,
        scenery: 'pines',
        skyTop: '#01040a',
        skyMid: '#09121e',
        skyBottom: '#111b29',
        moonX: 0.18,
        moonSize: 24,
        moonAlpha: 0.08,
        starCount: 8,
        cloudBands: [0.12, 0.28, 0.42, 0.6],
        cloudCount: 8,
        cloudScale: 1.12,
        cloudColor: 'rgba(19, 27, 41, 0.62)',
        rainCount: 96,
        rainSpeed: 1.12,
        rainLength: [16, 28],
        rainAngle: -0.34,
        rainOpacity: 0.19,
        lightning: 0.76,
        lightningGapMin: 4,
        lightningGapMax: 7.8,
        horizon: 0.73,
        groundColor: '#040a10',
        detailColor: 'rgba(100, 122, 146, 0.08)'
    }),
    createWeatherScene({
        name: 'Atacama Ghost Flats',
        seed: 0.43,
        scenery: 'saltflats',
        skyTop: '#03060d',
        skyMid: '#101926',
        skyBottom: '#1b2636',
        moonX: 0.58,
        moonY: 0.14,
        moonSize: 34,
        moonAlpha: 0.22,
        starCount: 28,
        starOpacity: 0.34,
        cloudBands: [0.24, 0.46],
        cloudCount: 4,
        cloudScale: 0.88,
        rainCount: 0,
        fogLayers: 2,
        fogOpacity: 0.06,
        scenery: 'saltflats',
        horizon: 0.82,
        groundColor: '#08121a',
        detailColor: 'rgba(154, 178, 206, 0.12)',
        accentColor: 'rgba(208, 225, 246, 0.08)'
    }),
    createWeatherScene({
        name: 'Namib Fog Dunes',
        seed: 0.58,
        scenery: 'dunes',
        skyTop: '#04070e',
        skyMid: '#101925',
        skyBottom: '#182432',
        moonX: 0.48,
        moonY: 0.19,
        moonSize: 30,
        moonAlpha: 0.12,
        starCount: 6,
        cloudBands: [0.24, 0.46, 0.64],
        cloudCount: 5,
        rainCount: 10,
        rainSpeed: 0.62,
        rainLength: [9, 14],
        rainAngle: -0.08,
        rainOpacity: 0.04,
        fogLayers: 5,
        fogOpacity: 0.18,
        horizon: 0.79,
        groundColor: '#071019',
        detailColor: 'rgba(134, 152, 173, 0.09)'
    }),
    createWeatherScene({
        name: 'Himalayan Ridge Lightning',
        seed: 0.71,
        scenery: 'mountains',
        skyTop: '#010308',
        skyMid: '#07101b',
        skyBottom: '#111927',
        moonX: 0.84,
        moonY: 0.11,
        moonSize: 14,
        moonAlpha: 0.04,
        starCount: 4,
        cloudBands: [0.1, 0.22, 0.38, 0.56],
        cloudCount: 8,
        cloudSpeed: 0.46,
        cloudScale: 1.18,
        cloudColor: 'rgba(14, 20, 31, 0.68)',
        rainCount: 102,
        rainSpeed: 1.22,
        rainLength: [18, 30],
        rainAngle: -0.38,
        rainOpacity: 0.22,
        lightning: 1,
        lightningGapMin: 2.8,
        lightningGapMax: 5.8,
        horizon: 0.71,
        groundColor: '#04080e',
        detailColor: 'rgba(100, 120, 144, 0.08)'
    }),
    createWeatherScene({
        name: 'Yukon Lake Mist',
        seed: 0.86,
        scenery: 'lake',
        skyTop: '#03060c',
        skyMid: '#0d1620',
        skyBottom: '#182331',
        moonX: 0.22,
        moonSize: 36,
        moonAlpha: 0.18,
        starCount: 18,
        cloudCount: 5,
        cloudScale: 0.92,
        rainCount: 24,
        rainSpeed: 0.72,
        rainLength: [10, 16],
        rainAngle: -0.1,
        rainOpacity: 0.04,
        fogLayers: 4,
        fogOpacity: 0.17,
        horizon: 0.79,
        groundColor: '#08111a',
        detailColor: 'rgba(122, 147, 170, 0.09)'
    }),
    createWeatherScene({
        name: 'Iceland Ash Cone',
        seed: 1.02,
        scenery: 'volcano',
        skyTop: '#020309',
        skyMid: '#0a1018',
        skyBottom: '#141b28',
        moonX: 0.66,
        moonY: 0.14,
        moonSize: 20,
        moonAlpha: 0.05,
        starCount: 3,
        cloudBands: [0.14, 0.26, 0.38, 0.54],
        cloudCount: 8,
        cloudSpeed: 0.42,
        cloudScale: 1.16,
        cloudColor: 'rgba(19, 22, 30, 0.66)',
        rainCount: 38,
        rainSpeed: 0.82,
        rainLength: [12, 18],
        rainAngle: -0.18,
        rainOpacity: 0.05,
        fogLayers: 3,
        fogOpacity: 0.08,
        horizon: 0.77,
        groundColor: '#06090f',
        detailColor: 'rgba(92, 106, 124, 0.08)',
        accentColor: 'rgba(255, 129, 76, 0.12)'
    }),
    createWeatherScene({
        name: 'Carpathian Tree Line',
        seed: 1.17,
        scenery: 'pines',
        skyTop: '#04070d',
        skyMid: '#101825',
        skyBottom: '#1a2533',
        moonX: 0.76,
        moonY: 0.17,
        moonSize: 28,
        moonAlpha: 0.16,
        starCount: 14,
        cloudBands: [0.2, 0.38, 0.56],
        cloudCount: 6,
        cloudSpeed: 0.36,
        rainCount: 72,
        rainSpeed: 0.98,
        rainLength: [13, 22],
        rainAngle: -0.4,
        rainOpacity: 0.14,
        horizon: 0.75,
        groundColor: '#071019',
        detailColor: 'rgba(116, 140, 164, 0.08)'
    }),
    createWeatherScene({
        name: 'Norway Fjord Rain',
        seed: 1.31,
        scenery: 'fjord',
        skyTop: '#02040a',
        skyMid: '#09121d',
        skyBottom: '#152131',
        moonX: 0.7,
        moonY: 0.15,
        moonSize: 22,
        moonAlpha: 0.08,
        starCount: 10,
        cloudBands: [0.16, 0.32, 0.52],
        cloudCount: 7,
        cloudSpeed: 0.28,
        rainCount: 88,
        rainSpeed: 1.02,
        rainLength: [14, 24],
        rainAngle: -0.24,
        rainOpacity: 0.16,
        fogLayers: 3,
        fogOpacity: 0.11,
        horizon: 0.79,
        groundColor: '#050d15',
        detailColor: 'rgba(130, 151, 176, 0.10)'
    }),
    createWeatherScene({
        name: 'Arctic Tundra Gloom',
        seed: 1.46,
        scenery: 'tundra',
        skyTop: '#03060b',
        skyMid: '#101924',
        skyBottom: '#1b2838',
        moonX: 0.34,
        moonY: 0.13,
        moonSize: 30,
        moonAlpha: 0.18,
        starCount: 20,
        starOpacity: 0.3,
        cloudBands: [0.2, 0.42],
        cloudCount: 4,
        rainCount: 6,
        rainSpeed: 0.52,
        rainLength: [8, 12],
        rainAngle: -0.04,
        rainOpacity: 0.03,
        fogLayers: 4,
        fogOpacity: 0.14,
        horizon: 0.81,
        groundColor: '#09111a',
        detailColor: 'rgba(150, 169, 192, 0.10)'
    }),
    createWeatherScene({
        name: 'Sahara Moon Dunes',
        seed: 1.62,
        scenery: 'dunes',
        skyTop: '#04060c',
        skyMid: '#0d1622',
        skyBottom: '#172331',
        moonX: 0.62,
        moonY: 0.18,
        moonSize: 38,
        moonAlpha: 0.19,
        starCount: 22,
        starOpacity: 0.3,
        cloudBands: [0.22, 0.44],
        cloudCount: 4,
        cloudScale: 0.84,
        rainCount: 0,
        fogLayers: 2,
        fogOpacity: 0.07,
        horizon: 0.8,
        groundColor: '#08111a',
        detailColor: 'rgba(140, 157, 180, 0.10)'
    }),
    createWeatherScene({
        name: 'Patagonia Escarpment',
        seed: 1.77,
        scenery: 'cliffs',
        skyTop: '#02050b',
        skyMid: '#0c1521',
        skyBottom: '#172233',
        moonX: 0.18,
        moonY: 0.16,
        moonSize: 26,
        moonAlpha: 0.1,
        starCount: 10,
        cloudBands: [0.16, 0.32, 0.48, 0.62],
        cloudCount: 6,
        cloudSpeed: 0.38,
        rainCount: 64,
        rainSpeed: 1.04,
        rainLength: [12, 22],
        rainAngle: -0.28,
        rainOpacity: 0.13,
        fogLayers: 2,
        fogOpacity: 0.09,
        horizon: 0.74,
        groundColor: '#050c13',
        detailColor: 'rgba(118, 135, 156, 0.09)'
    }),
    createWeatherScene({
        name: 'Amazon Canopy Dark',
        seed: 1.92,
        scenery: 'jungle',
        skyTop: '#02050a',
        skyMid: '#09141d',
        skyBottom: '#132130',
        moonX: 0.74,
        moonY: 0.12,
        moonSize: 18,
        moonAlpha: 0.07,
        starCount: 6,
        starOpacity: 0.12,
        cloudBands: [0.18, 0.3, 0.46, 0.62],
        cloudCount: 7,
        cloudSpeed: 0.24,
        rainCount: 92,
        rainSpeed: 1.08,
        rainLength: [14, 24],
        rainAngle: -0.2,
        rainOpacity: 0.14,
        fogLayers: 4,
        fogOpacity: 0.14,
        horizon: 0.78,
        groundColor: '#051016',
        detailColor: 'rgba(94, 124, 112, 0.12)',
        accentColor: 'rgba(140, 184, 152, 0.10)'
    }),
    createWeatherScene({
        name: 'Dolomite Ravine',
        seed: 2.08,
        scenery: 'canyon',
        skyTop: '#02040a',
        skyMid: '#0d1622',
        skyBottom: '#1b2636',
        moonX: 0.54,
        moonY: 0.15,
        moonSize: 28,
        moonAlpha: 0.12,
        starCount: 16,
        starOpacity: 0.24,
        cloudBands: [0.18, 0.36, 0.56],
        cloudCount: 5,
        rainCount: 22,
        rainSpeed: 0.72,
        rainLength: [10, 16],
        rainAngle: -0.08,
        rainOpacity: 0.03,
        fogLayers: 2,
        fogOpacity: 0.08,
        horizon: 0.77,
        groundColor: '#071019',
        detailColor: 'rgba(134, 149, 170, 0.10)'
    }),
    createWeatherScene({
        name: 'Greenland Glacier Silence',
        seed: 2.23,
        scenery: 'glacier',
        skyTop: '#03060c',
        skyMid: '#0f1823',
        skyBottom: '#1c2939',
        moonX: 0.28,
        moonY: 0.14,
        moonSize: 34,
        moonAlpha: 0.18,
        starCount: 18,
        starOpacity: 0.28,
        cloudBands: [0.22, 0.46],
        cloudCount: 4,
        cloudScale: 0.86,
        rainCount: 0,
        fogLayers: 3,
        fogOpacity: 0.1,
        horizon: 0.81,
        groundColor: '#08111a',
        detailColor: 'rgba(166, 189, 216, 0.14)',
        accentColor: 'rgba(212, 228, 248, 0.10)'
    }),
    createWeatherScene({
        name: 'Okavango Night Marsh',
        seed: 2.39,
        scenery: 'marsh',
        skyTop: '#02050a',
        skyMid: '#0b1520',
        skyBottom: '#162432',
        moonX: 0.64,
        moonY: 0.17,
        moonSize: 24,
        moonAlpha: 0.14,
        starCount: 12,
        starOpacity: 0.18,
        cloudBands: [0.18, 0.38, 0.58],
        cloudCount: 5,
        rainCount: 36,
        rainSpeed: 0.78,
        rainLength: [10, 18],
        rainAngle: -0.12,
        rainOpacity: 0.05,
        fogLayers: 4,
        fogOpacity: 0.16,
        horizon: 0.82,
        groundColor: '#071019',
        detailColor: 'rgba(132, 158, 142, 0.10)',
        accentColor: 'rgba(170, 204, 184, 0.08)'
    }),
    createWeatherScene({
        name: 'Hebridean Shore Squall',
        seed: 2.54,
        scenery: 'shoreline',
        skyTop: '#02040a',
        skyMid: '#0b1420',
        skyBottom: '#162231',
        moonX: 0.74,
        moonY: 0.14,
        moonSize: 18,
        moonAlpha: 0.06,
        starCount: 8,
        cloudBands: [0.14, 0.28, 0.46, 0.62],
        cloudCount: 8,
        cloudSpeed: 0.4,
        cloudScale: 1.1,
        rainCount: 92,
        rainSpeed: 1.16,
        rainLength: [16, 28],
        rainAngle: -0.32,
        rainOpacity: 0.19,
        fogLayers: 2,
        fogOpacity: 0.08,
        horizon: 0.79,
        groundColor: '#050c14',
        detailColor: 'rgba(126, 149, 176, 0.09)'
    }),
    createWeatherScene({
        name: 'Altiplano Storm Plain',
        seed: 2.69,
        scenery: 'saltflats',
        skyTop: '#010308',
        skyMid: '#07101a',
        skyBottom: '#121b29',
        moonX: 0.46,
        moonY: 0.1,
        moonSize: 10,
        moonAlpha: 0.03,
        starCount: 3,
        cloudBands: [0.12, 0.24, 0.4, 0.56],
        cloudCount: 8,
        cloudSpeed: 0.5,
        cloudScale: 1.18,
        cloudColor: 'rgba(16, 22, 34, 0.68)',
        rainCount: 104,
        rainSpeed: 1.24,
        rainLength: [18, 30],
        rainAngle: -0.34,
        rainOpacity: 0.21,
        lightning: 0.88,
        lightningGapMin: 3.2,
        lightningGapMax: 6.4,
        fogLayers: 3,
        fogOpacity: 0.1,
        horizon: 0.8,
        groundColor: '#050c13',
        detailColor: 'rgba(132, 150, 172, 0.12)',
        accentColor: 'rgba(206, 220, 242, 0.08)'
    }),
    createWeatherScene({
        name: 'Basalt Coast Gale',
        seed: 2.85,
        scenery: 'cliffs',
        skyTop: '#02040a',
        skyMid: '#08111b',
        skyBottom: '#121e2c',
        moonX: 0.82,
        moonY: 0.12,
        moonSize: 16,
        moonAlpha: 0.04,
        starCount: 6,
        cloudBands: [0.12, 0.26, 0.42, 0.58],
        cloudCount: 8,
        cloudSpeed: 0.44,
        cloudScale: 1.12,
        cloudColor: 'rgba(17, 24, 37, 0.64)',
        rainCount: 86,
        rainSpeed: 1.08,
        rainLength: [14, 24],
        rainAngle: -0.3,
        rainOpacity: 0.16,
        fogLayers: 3,
        fogOpacity: 0.12,
        horizon: 0.75,
        groundColor: '#04080f',
        detailColor: 'rgba(108, 126, 147, 0.08)'
    }),
    createWeatherScene({
        name: 'Fiordland Peak Squall',
        seed: 3.01,
        scenery: 'mountains',
        skyTop: '#010308',
        skyMid: '#070d17',
        skyBottom: '#111927',
        moonX: 0.54,
        moonY: 0.09,
        moonSize: 12,
        moonAlpha: 0.04,
        starCount: 2,
        starOpacity: 0.08,
        cloudBands: [0.1, 0.22, 0.36, 0.54],
        cloudCount: 9,
        cloudSpeed: 0.54,
        cloudScale: 1.2,
        cloudColor: 'rgba(15, 20, 31, 0.7)',
        rainCount: 112,
        rainSpeed: 1.28,
        rainLength: [18, 32],
        rainAngle: -0.36,
        rainOpacity: 0.24,
        lightning: 0.92,
        lightningGapMin: 3.6,
        lightningGapMax: 7.2,
        horizon: 0.72,
        groundColor: '#04070d',
        detailColor: 'rgba(112, 128, 150, 0.08)'
    })
];

let weatherViewport = { width: 0, height: 0, dpr: 1 };
let weatherSceneStates = [];
let weatherSceneStartIndex = 0;
let activeWeatherSceneIndex = 0;
let previousWeatherSceneIndex = 0;
let lastWeatherSceneTier = 0;
let weatherTransitionStart = 0;
let weatherLastFrameTs = 0;

/* ────────────────────── BUTTON HELPERS ─────────────────────── */
const startBtn = document.getElementById('start-btn');
const pauseBtn = document.getElementById('pause-btn');
const pauseOverlay = document.getElementById('pause-overlay');

startBtn.addEventListener('keydown', e => {
    if (e.code === 'Space') e.preventDefault();
});

pauseBtn.addEventListener('keydown', e => {
    if (e.code === 'Space') e.preventDefault();
});

/* ────────────────────── UTILS ─────────────────────────────── */
function changeEyeColor() {
    const step = Math.floor(Math.random() * 50) + 30;
    currentHue = (currentHue + step) % MAX_HUE;

    const sat = Math.round(60 + Math.random() * 60);
    const bright = Math.round(90 + Math.random() * 10);

    const iris = document.querySelector('.iris');
    if (iris) {
        iris.style.filter =
        `hue-rotate(${currentHue}deg) saturate(${sat}%) brightness(${bright}%)`;
    }
}

function getSpeedForLevel(lvl) {
    const factor = 0.9;
    return Math.max(200, 1000 * Math.pow(factor, lvl - 1));
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function lerp(start, end, t) {
    return start + (end - start) * t;
}

function fract(value) {
    return value - Math.floor(value);
}

function wrap(value, size) {
    return ((value % size) + size) % size;
}

function hash01(value) {
    return fract(Math.sin(value * 127.1) * 43758.5453123);
}

function easeInOut(value) {
    return value * value * (3 - 2 * value);
}

function resizeWeatherCanvas() {
    if (!weatherCanvas || !weatherCtx) return;

    const width = Math.max(window.innerWidth, 1);
    const height = Math.max(window.innerHeight, 1);
    const dpr = window.devicePixelRatio || 1;

    weatherViewport = { width, height, dpr };
    weatherCanvas.width = Math.floor(width * dpr);
    weatherCanvas.height = Math.floor(height * dpr);
    weatherCanvas.style.width = `${width}px`;
    weatherCanvas.style.height = `${height}px`;
    weatherCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function resetWeatherSceneStates(now = performance.now()) {
    const seconds = now / 1000;
    weatherSceneStates = WEATHER_SCENES.map(scene => ({
        flash: 0,
        nextLightningAt: seconds + 2 + Math.random() * Math.max(scene.lightningGapMax, 1),
        secondaryFlashAt: 0,
        secondaryQueued: false,
        boltX: 0.22 + Math.random() * 0.56,
        boltLean: -0.2 + Math.random() * 0.4
    }));
    weatherLastFrameTs = 0;
}

function configureWeatherCycle(now = performance.now()) {
    weatherSceneStartIndex = Math.floor(Math.random() * WEATHER_SCENES.length);
    activeWeatherSceneIndex = weatherSceneStartIndex;
    previousWeatherSceneIndex = weatherSceneStartIndex;
    lastWeatherSceneTier = 0;
    weatherTransitionStart = now;
    resetWeatherSceneStates(now);
}

function transitionWeatherScene(targetIndex, now = performance.now()) {
    const wrappedIndex = wrap(targetIndex, WEATHER_SCENES.length);
    if (wrappedIndex === activeWeatherSceneIndex) return;

    previousWeatherSceneIndex = activeWeatherSceneIndex;
    activeWeatherSceneIndex = wrappedIndex;
    weatherTransitionStart = now;
}

function syncWeatherSceneToLines(now = performance.now()) {
    const tier = Math.floor(lines / WEATHER_SCENE_ADVANCE_LINES);
    if (tier <= lastWeatherSceneTier) return;

    while (lastWeatherSceneTier < tier) {
        lastWeatherSceneTier += 1;
        transitionWeatherScene(weatherSceneStartIndex + lastWeatherSceneTier, now);
    }
}

function updateWeatherSceneStates(ts) {
    const frameScale = weatherLastFrameTs ? clamp((ts - weatherLastFrameTs) / 16.67, 0.5, 3) : 1;
    weatherLastFrameTs = ts;

    const seconds = ts / 1000;

    for (let index = 0; index < WEATHER_SCENES.length; index++) {
        const scene = WEATHER_SCENES[index];
        const state = weatherSceneStates[index];
        if (!state) continue;

        state.flash *= Math.pow(0.84, frameScale);

        if (!scene.lightning) {
            state.flash = 0;
            continue;
        }

        if (seconds >= state.nextLightningAt) {
            state.flash = 0.55 + Math.random() * scene.lightning * 0.65;
            state.nextLightningAt = seconds + scene.lightningGapMin +
                Math.random() * (scene.lightningGapMax - scene.lightningGapMin);
            state.secondaryQueued = Math.random() < 0.58;
            state.secondaryFlashAt = seconds + 0.08 + Math.random() * 0.16;
            state.boltX = 0.18 + Math.random() * 0.64;
            state.boltLean = -0.22 + Math.random() * 0.44;
        }

        if (state.secondaryQueued && seconds >= state.secondaryFlashAt) {
            state.secondaryQueued = false;
            state.flash = Math.max(state.flash, 0.3 + Math.random() * scene.lightning * 0.45);
        }
    }
}

function drawSceneSky(renderCtx, scene, width, height) {
    const gradient = renderCtx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, scene.skyTop);
    gradient.addColorStop(0.52, scene.skyMid);
    gradient.addColorStop(1, scene.skyBottom);
    renderCtx.fillStyle = gradient;
    renderCtx.fillRect(0, 0, width, height);
}

function drawSceneStars(renderCtx, scene, width, height, timeSeconds) {
    if (!scene.starCount) return;

    for (let i = 0; i < scene.starCount; i++) {
        const seed = scene.seed * 103 + i * 17.13;
        const x = hash01(seed) * width;
        const y = hash01(seed + 1) * height * 0.48;
        const radius = 0.55 + hash01(seed + 2) * 1.8;
        const twinkle = 0.42 + 0.58 * (
            0.5 + 0.5 * Math.sin(timeSeconds * (0.7 + hash01(seed + 3) * 1.8) + seed * 12)
        );
        renderCtx.fillStyle = `rgba(226, 234, 255, ${scene.starOpacity * twinkle})`;
        renderCtx.beginPath();
        renderCtx.arc(x, y, radius, 0, Math.PI * 2);
        renderCtx.fill();
    }
}

function drawSceneMoon(renderCtx, scene, width, height) {
    if (!scene.moonAlpha) return;

    const x = width * scene.moonX;
    const y = height * scene.moonY;
    const radius = scene.moonSize;

    const glow = renderCtx.createRadialGradient(x, y, radius * 0.15, x, y, radius * 3.2);
    glow.addColorStop(0, scene.moonGlow);
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    renderCtx.fillStyle = glow;
    renderCtx.beginPath();
    renderCtx.arc(x, y, radius * 3.2, 0, Math.PI * 2);
    renderCtx.fill();

    renderCtx.fillStyle = `rgba(225, 233, 247, ${scene.moonAlpha})`;
    renderCtx.beginPath();
    renderCtx.arc(x, y, radius, 0, Math.PI * 2);
    renderCtx.fill();
}

function drawSceneClouds(renderCtx, scene, width, height, timeSeconds) {
    for (let bandIndex = 0; bandIndex < scene.cloudBands.length; bandIndex++) {
        const band = scene.cloudBands[bandIndex];
        const drift = timeSeconds * scene.cloudSpeed * (40 + bandIndex * 12);

        for (let i = 0; i < scene.cloudCount; i++) {
            const seed = scene.seed * 211 + bandIndex * 59 + i * 13.7;
            const travelWidth = width + 520;
            const x = wrap(hash01(seed) * travelWidth + drift * (0.7 + hash01(seed + 1)), travelWidth) - 260;
            const y = height * band + (hash01(seed + 2) - 0.5) * height * 0.04;
            const radiusX = lerp(100, 230, hash01(seed + 3)) * scene.cloudScale;
            const radiusY = radiusX * lerp(0.16, 0.3, hash01(seed + 4));
            const puffScale = 0.6 + hash01(seed + 5) * 0.5;

            renderCtx.fillStyle = scene.cloudColor;
            renderCtx.beginPath();
            renderCtx.ellipse(x, y, radiusX, radiusY, 0, 0, Math.PI * 2);
            renderCtx.ellipse(x - radiusX * 0.42, y + radiusY * 0.08, radiusX * 0.55, radiusY * 0.86, 0, 0, Math.PI * 2);
            renderCtx.ellipse(x + radiusX * 0.38, y + radiusY * 0.04, radiusX * puffScale, radiusY * 0.78, 0, 0, Math.PI * 2);
            renderCtx.fill();
        }
    }
}

function drawSceneRain(renderCtx, scene, width, height, timeSeconds) {
    if (!scene.rainCount) return;

    renderCtx.lineCap = 'round';

    for (let i = 0; i < scene.rainCount; i++) {
        const seed = scene.seed * 307 + i * 19.41;
        const speed = scene.rainSpeed * lerp(0.85, 1.22, hash01(seed + 1));
        const cycleHeight = height + 160;
        const y = wrap(hash01(seed + 2) * cycleHeight + timeSeconds * speed * 340, cycleHeight) - 80;
        const x = wrap(
            hash01(seed + 3) * (width + 180) + timeSeconds * scene.rainAngle * -90 * (0.4 + hash01(seed + 4)),
            width + 180
        ) - 90;
        const length = lerp(scene.rainLength[0], scene.rainLength[1], hash01(seed + 5));
        const thickness = lerp(0.7, 1.35, hash01(seed + 6));
        const dx = length * scene.rainAngle;
        const alpha = scene.rainOpacity * lerp(0.7, 1.15, hash01(seed + 7));

        renderCtx.strokeStyle = `rgba(${scene.rainColor}, ${alpha})`;
        renderCtx.lineWidth = thickness;
        renderCtx.beginPath();
        renderCtx.moveTo(x, y);
        renderCtx.lineTo(x + dx, y + length);
        renderCtx.stroke();
    }
}

function drawSceneFog(renderCtx, scene, width, height, timeSeconds) {
    for (let i = 0; i < scene.fogLayers; i++) {
        const seed = scene.seed * 401 + i * 29.9;
        const x = wrap(hash01(seed) * (width + 460) + timeSeconds * scene.fogSpeed * (24 + i * 8), width + 460) - 230;
        const y = height * lerp(0.58, 0.9, i / Math.max(scene.fogLayers, 1)) + (hash01(seed + 1) - 0.5) * height * 0.05;
        const radiusX = lerp(200, 420, hash01(seed + 2));
        const radiusY = lerp(30, 62, hash01(seed + 3));
        const alpha = scene.fogOpacity * lerp(0.75, 1.15, hash01(seed + 4));

        renderCtx.fillStyle = `rgba(170, 188, 210, ${alpha})`;
        renderCtx.beginPath();
        renderCtx.ellipse(x, y, radiusX, radiusY, 0, 0, Math.PI * 2);
        renderCtx.ellipse(x + radiusX * 0.45, y + 8, radiusX * 0.7, radiusY * 0.8, 0, 0, Math.PI * 2);
        renderCtx.fill();
    }
}

function drawLakeScene(renderCtx, scene, width, height, horizonY) {
    renderCtx.fillStyle = scene.groundColor;
    renderCtx.beginPath();
    renderCtx.moveTo(0, height);
    renderCtx.lineTo(0, horizonY - 24);
    renderCtx.quadraticCurveTo(width * 0.18, horizonY - 72, width * 0.38, horizonY - 30);
    renderCtx.quadraticCurveTo(width * 0.6, horizonY + 10, width * 0.8, horizonY - 28);
    renderCtx.quadraticCurveTo(width * 0.92, horizonY - 46, width, horizonY - 18);
    renderCtx.lineTo(width, height);
    renderCtx.closePath();
    renderCtx.fill();

    renderCtx.fillStyle = scene.detailColor;
    renderCtx.fillRect(0, horizonY - 4, width, height - horizonY + 4);
}

function drawPineScene(renderCtx, scene, width, height, horizonY) {
    renderCtx.fillStyle = scene.groundColor;
    renderCtx.beginPath();
    renderCtx.moveTo(0, height);
    renderCtx.lineTo(0, horizonY - 8);
    renderCtx.quadraticCurveTo(width * 0.22, horizonY - 44, width * 0.46, horizonY - 10);
    renderCtx.quadraticCurveTo(width * 0.68, horizonY + 18, width, horizonY - 18);
    renderCtx.lineTo(width, height);
    renderCtx.closePath();
    renderCtx.fill();

    renderCtx.fillStyle = scene.detailColor;
    for (let i = 0; i < 16; i++) {
        const seed = scene.seed * 503 + i * 11.7;
        const x = hash01(seed) * width;
        const treeHeight = lerp(24, 72, hash01(seed + 1));
        const baseY = horizonY - lerp(0, 28, hash01(seed + 2));
        renderCtx.beginPath();
        renderCtx.moveTo(x, baseY - treeHeight);
        renderCtx.lineTo(x - treeHeight * 0.22, baseY);
        renderCtx.lineTo(x + treeHeight * 0.22, baseY);
        renderCtx.closePath();
        renderCtx.fill();
    }
}

function drawSaltFlatScene(renderCtx, scene, width, height, horizonY) {
    renderCtx.fillStyle = scene.groundColor;
    renderCtx.fillRect(0, horizonY - 6, width, height - horizonY + 6);

    renderCtx.fillStyle = scene.detailColor;
    renderCtx.beginPath();
    renderCtx.moveTo(0, horizonY - 12);
    renderCtx.lineTo(width * 0.16, horizonY - 28);
    renderCtx.lineTo(width * 0.38, horizonY - 18);
    renderCtx.lineTo(width * 0.56, horizonY - 34);
    renderCtx.lineTo(width * 0.78, horizonY - 20);
    renderCtx.lineTo(width, horizonY - 26);
    renderCtx.lineTo(width, horizonY - 4);
    renderCtx.lineTo(0, horizonY - 4);
    renderCtx.closePath();
    renderCtx.fill();

    renderCtx.fillStyle = scene.accentColor || scene.detailColor;
    renderCtx.fillRect(0, horizonY + 8, width, 3);
    renderCtx.fillRect(width * 0.12, horizonY + 26, width * 0.32, 2);
    renderCtx.fillRect(width * 0.58, horizonY + 20, width * 0.24, 2);
}

function drawDuneScene(renderCtx, scene, width, height, horizonY) {
    renderCtx.fillStyle = scene.groundColor;
    renderCtx.beginPath();
    renderCtx.moveTo(0, height);
    renderCtx.lineTo(0, horizonY + 8);
    renderCtx.bezierCurveTo(width * 0.15, horizonY - 18, width * 0.28, horizonY + 22, width * 0.44, horizonY);
    renderCtx.bezierCurveTo(width * 0.56, horizonY - 20, width * 0.76, horizonY + 16, width, horizonY - 8);
    renderCtx.lineTo(width, height);
    renderCtx.closePath();
    renderCtx.fill();

    renderCtx.fillStyle = scene.detailColor;
    renderCtx.beginPath();
    renderCtx.moveTo(0, height);
    renderCtx.lineTo(0, horizonY + 24);
    renderCtx.bezierCurveTo(width * 0.18, horizonY + 4, width * 0.36, horizonY + 38, width * 0.55, horizonY + 20);
    renderCtx.bezierCurveTo(width * 0.7, horizonY - 2, width * 0.88, horizonY + 30, width, horizonY + 12);
    renderCtx.lineTo(width, height);
    renderCtx.closePath();
    renderCtx.fill();
}

function drawMountainScene(renderCtx, scene, width, height, horizonY) {
    renderCtx.fillStyle = scene.groundColor;
    renderCtx.beginPath();
    renderCtx.moveTo(0, height);
    renderCtx.lineTo(0, horizonY + 24);
    renderCtx.lineTo(width * 0.14, horizonY - 18);
    renderCtx.lineTo(width * 0.28, horizonY - 92);
    renderCtx.lineTo(width * 0.42, horizonY - 26);
    renderCtx.lineTo(width * 0.58, horizonY - 110);
    renderCtx.lineTo(width * 0.74, horizonY - 20);
    renderCtx.lineTo(width * 0.9, horizonY - 84);
    renderCtx.lineTo(width, horizonY - 30);
    renderCtx.lineTo(width, height);
    renderCtx.closePath();
    renderCtx.fill();

    renderCtx.fillStyle = scene.detailColor;
    renderCtx.beginPath();
    renderCtx.moveTo(0, height);
    renderCtx.lineTo(0, horizonY + 36);
    renderCtx.lineTo(width * 0.18, horizonY + 6);
    renderCtx.lineTo(width * 0.36, horizonY - 42);
    renderCtx.lineTo(width * 0.52, horizonY + 10);
    renderCtx.lineTo(width * 0.68, horizonY - 38);
    renderCtx.lineTo(width * 0.84, horizonY + 14);
    renderCtx.lineTo(width, horizonY - 6);
    renderCtx.lineTo(width, height);
    renderCtx.closePath();
    renderCtx.fill();
}

function drawShorelineScene(renderCtx, scene, width, height, horizonY) {
    renderCtx.fillStyle = scene.groundColor;
    renderCtx.beginPath();
    renderCtx.moveTo(0, height);
    renderCtx.lineTo(0, horizonY + 6);
    renderCtx.quadraticCurveTo(width * 0.22, horizonY - 30, width * 0.44, horizonY + 2);
    renderCtx.quadraticCurveTo(width * 0.62, horizonY + 18, width * 0.78, horizonY - 10);
    renderCtx.quadraticCurveTo(width * 0.92, horizonY - 28, width, horizonY - 6);
    renderCtx.lineTo(width, height);
    renderCtx.closePath();
    renderCtx.fill();

    renderCtx.fillStyle = scene.detailColor;
    renderCtx.fillRect(0, horizonY + 12, width, height - horizonY - 12);
}

function drawVolcanoScene(renderCtx, scene, width, height, horizonY) {
    renderCtx.fillStyle = scene.groundColor;
    renderCtx.beginPath();
    renderCtx.moveTo(0, height);
    renderCtx.lineTo(0, horizonY + 14);
    renderCtx.quadraticCurveTo(width * 0.16, horizonY - 8, width * 0.34, horizonY + 18);
    renderCtx.quadraticCurveTo(width * 0.7, horizonY + 40, width, horizonY - 4);
    renderCtx.lineTo(width, height);
    renderCtx.closePath();
    renderCtx.fill();

    renderCtx.fillStyle = scene.detailColor;
    renderCtx.beginPath();
    renderCtx.moveTo(width * 0.16, horizonY + 22);
    renderCtx.lineTo(width * 0.38, horizonY + 22);
    renderCtx.lineTo(width * 0.54, horizonY - 122);
    renderCtx.lineTo(width * 0.7, horizonY + 22);
    renderCtx.lineTo(width * 0.9, horizonY + 22);
    renderCtx.lineTo(width * 0.9, height);
    renderCtx.lineTo(width * 0.16, height);
    renderCtx.closePath();
    renderCtx.fill();

    renderCtx.fillStyle = scene.accentColor || scene.detailColor;
    renderCtx.beginPath();
    renderCtx.moveTo(width * 0.5, horizonY - 108);
    renderCtx.lineTo(width * 0.54, horizonY - 122);
    renderCtx.lineTo(width * 0.58, horizonY - 108);
    renderCtx.quadraticCurveTo(width * 0.54, horizonY - 96, width * 0.5, horizonY - 108);
    renderCtx.fill();

    renderCtx.fillStyle = 'rgba(42, 49, 60, 0.26)';
    renderCtx.beginPath();
    renderCtx.ellipse(width * 0.54, horizonY - 142, 52, 18, 0.08, 0, Math.PI * 2);
    renderCtx.ellipse(width * 0.48, horizonY - 156, 42, 12, -0.16, 0, Math.PI * 2);
    renderCtx.fill();
}

function drawFjordScene(renderCtx, scene, width, height, horizonY) {
    renderCtx.fillStyle = scene.groundColor;
    renderCtx.fillRect(0, horizonY + 8, width, height - horizonY - 8);

    renderCtx.beginPath();
    renderCtx.moveTo(0, height);
    renderCtx.lineTo(0, horizonY - 10);
    renderCtx.lineTo(width * 0.18, horizonY - 120);
    renderCtx.lineTo(width * 0.36, horizonY + 12);
    renderCtx.lineTo(width * 0.28, height);
    renderCtx.closePath();
    renderCtx.fill();

    renderCtx.beginPath();
    renderCtx.moveTo(width, height);
    renderCtx.lineTo(width, horizonY - 16);
    renderCtx.lineTo(width * 0.78, horizonY - 112);
    renderCtx.lineTo(width * 0.58, horizonY + 10);
    renderCtx.lineTo(width * 0.7, height);
    renderCtx.closePath();
    renderCtx.fill();

    renderCtx.fillStyle = scene.detailColor;
    renderCtx.beginPath();
    renderCtx.moveTo(width * 0.26, height);
    renderCtx.lineTo(width * 0.42, horizonY + 12);
    renderCtx.lineTo(width * 0.58, horizonY + 12);
    renderCtx.lineTo(width * 0.72, height);
    renderCtx.closePath();
    renderCtx.fill();

    renderCtx.fillStyle = scene.accentColor || scene.detailColor;
    renderCtx.fillRect(width * 0.34, horizonY + 22, width * 0.32, 3);
}

function drawTundraScene(renderCtx, scene, width, height, horizonY) {
    renderCtx.fillStyle = scene.groundColor;
    renderCtx.beginPath();
    renderCtx.moveTo(0, height);
    renderCtx.lineTo(0, horizonY + 12);
    renderCtx.quadraticCurveTo(width * 0.18, horizonY - 6, width * 0.36, horizonY + 10);
    renderCtx.quadraticCurveTo(width * 0.58, horizonY + 30, width * 0.78, horizonY + 6);
    renderCtx.quadraticCurveTo(width * 0.92, horizonY - 8, width, horizonY + 8);
    renderCtx.lineTo(width, height);
    renderCtx.closePath();
    renderCtx.fill();

    renderCtx.strokeStyle = scene.detailColor;
    renderCtx.lineWidth = 1.4;
    for (let i = 0; i < 26; i++) {
        const seed = scene.seed * 661 + i * 7.4;
        const x = hash01(seed) * width;
        const y = horizonY + lerp(8, 46, hash01(seed + 1));
        renderCtx.beginPath();
        renderCtx.moveTo(x, y);
        renderCtx.lineTo(x + lerp(-6, 6, hash01(seed + 2)), y - lerp(6, 14, hash01(seed + 3)));
        renderCtx.stroke();
    }
}

function drawCanyonScene(renderCtx, scene, width, height, horizonY) {
    renderCtx.fillStyle = scene.groundColor;
    renderCtx.beginPath();
    renderCtx.moveTo(0, height);
    renderCtx.lineTo(0, horizonY - 10);
    renderCtx.lineTo(width * 0.18, horizonY - 46);
    renderCtx.lineTo(width * 0.34, horizonY - 18);
    renderCtx.lineTo(width * 0.46, horizonY - 74);
    renderCtx.lineTo(width * 0.62, horizonY - 16);
    renderCtx.lineTo(width * 0.78, horizonY - 54);
    renderCtx.lineTo(width, horizonY - 20);
    renderCtx.lineTo(width, height);
    renderCtx.closePath();
    renderCtx.fill();

    renderCtx.fillStyle = scene.detailColor;
    renderCtx.beginPath();
    renderCtx.moveTo(width * 0.24, height);
    renderCtx.lineTo(width * 0.34, horizonY + 12);
    renderCtx.lineTo(width * 0.46, horizonY + 34);
    renderCtx.lineTo(width * 0.58, horizonY + 12);
    renderCtx.lineTo(width * 0.74, height);
    renderCtx.closePath();
    renderCtx.fill();

    renderCtx.fillRect(width * 0.1, horizonY + 18, width * 0.18, 4);
    renderCtx.fillRect(width * 0.62, horizonY + 24, width * 0.22, 4);
}

function drawJungleScene(renderCtx, scene, width, height, horizonY) {
    renderCtx.fillStyle = scene.groundColor;
    renderCtx.fillRect(0, horizonY + 24, width, height - horizonY - 24);

    renderCtx.fillStyle = scene.detailColor;
    for (let i = 0; i < 18; i++) {
        const seed = scene.seed * 709 + i * 13.3;
        const x = hash01(seed) * width;
        const canopyY = horizonY - lerp(8, 42, hash01(seed + 1));
        const radiusX = lerp(18, 46, hash01(seed + 2));
        const radiusY = radiusX * lerp(0.5, 0.8, hash01(seed + 3));
        renderCtx.beginPath();
        renderCtx.ellipse(x, canopyY, radiusX, radiusY, 0, 0, Math.PI * 2);
        renderCtx.fill();
    }

    renderCtx.strokeStyle = scene.accentColor || scene.detailColor;
    renderCtx.lineWidth = 2;
    for (let i = 0; i < 12; i++) {
        const seed = scene.seed * 743 + i * 11.1;
        const x = hash01(seed) * width;
        renderCtx.beginPath();
        renderCtx.moveTo(x, horizonY + 32);
        renderCtx.lineTo(x + lerp(-6, 6, hash01(seed + 1)), horizonY - lerp(20, 64, hash01(seed + 2)));
        renderCtx.stroke();
    }
}

function drawGlacierScene(renderCtx, scene, width, height, horizonY) {
    renderCtx.fillStyle = scene.groundColor;
    renderCtx.fillRect(0, horizonY + 10, width, height - horizonY - 10);

    renderCtx.fillStyle = scene.detailColor;
    renderCtx.beginPath();
    renderCtx.moveTo(0, height);
    renderCtx.lineTo(0, horizonY + 20);
    renderCtx.lineTo(width * 0.12, horizonY - 12);
    renderCtx.lineTo(width * 0.24, horizonY + 6);
    renderCtx.lineTo(width * 0.4, horizonY - 28);
    renderCtx.lineTo(width * 0.56, horizonY + 10);
    renderCtx.lineTo(width * 0.72, horizonY - 20);
    renderCtx.lineTo(width * 0.9, horizonY + 14);
    renderCtx.lineTo(width, horizonY - 4);
    renderCtx.lineTo(width, height);
    renderCtx.closePath();
    renderCtx.fill();

    renderCtx.fillStyle = scene.accentColor || scene.detailColor;
    renderCtx.fillRect(width * 0.08, horizonY + 28, width * 0.28, 3);
    renderCtx.fillRect(width * 0.5, horizonY + 20, width * 0.34, 3);
}

function drawMarshScene(renderCtx, scene, width, height, horizonY) {
    renderCtx.fillStyle = scene.groundColor;
    renderCtx.fillRect(0, horizonY + 6, width, height - horizonY - 6);

    renderCtx.fillStyle = scene.detailColor;
    renderCtx.beginPath();
    renderCtx.moveTo(0, height);
    renderCtx.lineTo(0, horizonY + 30);
    renderCtx.quadraticCurveTo(width * 0.18, horizonY + 8, width * 0.34, horizonY + 26);
    renderCtx.quadraticCurveTo(width * 0.52, horizonY + 44, width * 0.68, horizonY + 18);
    renderCtx.quadraticCurveTo(width * 0.82, horizonY + 4, width, horizonY + 22);
    renderCtx.lineTo(width, height);
    renderCtx.closePath();
    renderCtx.fill();

    renderCtx.strokeStyle = scene.accentColor || scene.detailColor;
    renderCtx.lineWidth = 1.2;
    for (let i = 0; i < 28; i++) {
        const seed = scene.seed * 787 + i * 5.8;
        const x = hash01(seed) * width;
        const baseY = horizonY + lerp(16, 54, hash01(seed + 1));
        const tipY = baseY - lerp(10, 28, hash01(seed + 2));
        renderCtx.beginPath();
        renderCtx.moveTo(x, baseY);
        renderCtx.lineTo(x + lerp(-4, 4, hash01(seed + 3)), tipY);
        renderCtx.stroke();
    }
}

function drawCliffScene(renderCtx, scene, width, height, horizonY) {
    renderCtx.fillStyle = scene.groundColor;
    renderCtx.fillRect(0, horizonY + 12, width, height - horizonY - 12);

    renderCtx.beginPath();
    renderCtx.moveTo(0, height);
    renderCtx.lineTo(0, horizonY - 86);
    renderCtx.lineTo(width * 0.18, horizonY - 124);
    renderCtx.lineTo(width * 0.24, horizonY - 12);
    renderCtx.lineTo(width * 0.32, horizonY + 12);
    renderCtx.lineTo(width * 0.32, height);
    renderCtx.closePath();
    renderCtx.fill();

    renderCtx.beginPath();
    renderCtx.moveTo(width * 0.58, height);
    renderCtx.lineTo(width * 0.58, horizonY - 72);
    renderCtx.lineTo(width * 0.74, horizonY - 106);
    renderCtx.lineTo(width * 0.82, horizonY - 8);
    renderCtx.lineTo(width * 0.9, horizonY + 12);
    renderCtx.lineTo(width * 0.9, height);
    renderCtx.closePath();
    renderCtx.fill();

    renderCtx.fillStyle = scene.detailColor;
    renderCtx.fillRect(width * 0.32, horizonY + 20, width * 0.26, 3);
    renderCtx.fillRect(width * 0.9, horizonY + 18, width * 0.1, 2);
}

function drawSceneScenery(renderCtx, scene, width, height) {
    const horizonY = height * scene.horizon;

    switch (scene.scenery) {
        case 'lake':
            drawLakeScene(renderCtx, scene, width, height, horizonY);
            break;
        case 'pines':
            drawPineScene(renderCtx, scene, width, height, horizonY);
            break;
        case 'dunes':
            drawDuneScene(renderCtx, scene, width, height, horizonY);
            break;
        case 'mountains':
            drawMountainScene(renderCtx, scene, width, height, horizonY);
            break;
        case 'shoreline':
            drawShorelineScene(renderCtx, scene, width, height, horizonY);
            break;
        case 'saltflats':
            drawSaltFlatScene(renderCtx, scene, width, height, horizonY);
            break;
        case 'volcano':
            drawVolcanoScene(renderCtx, scene, width, height, horizonY);
            break;
        case 'fjord':
            drawFjordScene(renderCtx, scene, width, height, horizonY);
            break;
        case 'tundra':
            drawTundraScene(renderCtx, scene, width, height, horizonY);
            break;
        case 'canyon':
            drawCanyonScene(renderCtx, scene, width, height, horizonY);
            break;
        case 'jungle':
            drawJungleScene(renderCtx, scene, width, height, horizonY);
            break;
        case 'glacier':
            drawGlacierScene(renderCtx, scene, width, height, horizonY);
            break;
        case 'marsh':
            drawMarshScene(renderCtx, scene, width, height, horizonY);
            break;
        case 'cliffs':
            drawCliffScene(renderCtx, scene, width, height, horizonY);
            break;
        default:
            renderCtx.fillStyle = scene.groundColor;
            renderCtx.fillRect(0, horizonY, width, height - horizonY);
            break;
    }
}

function drawSceneLightning(renderCtx, scene, sceneIndex, width, height) {
    const state = weatherSceneStates[sceneIndex];
    if (!state || state.flash < 0.06) return;

    renderCtx.fillStyle = `rgba(218, 230, 255, ${state.flash * 0.14})`;
    renderCtx.fillRect(0, 0, width, height);

    renderCtx.strokeStyle = `rgba(236, 242, 255, ${state.flash * 0.9})`;
    renderCtx.lineWidth = 2 + state.flash * 2.4;
    renderCtx.beginPath();

    let x = width * state.boltX;
    let y = height * 0.04;
    renderCtx.moveTo(x, y);

    for (let step = 0; step < 7; step++) {
        x += width * (state.boltLean * 0.06 + (hash01(scene.seed * 733 + step * 1.91) - 0.5) * 0.07);
        y += height * (0.06 + hash01(scene.seed * 811 + step * 2.17) * 0.06);
        renderCtx.lineTo(x, y);
    }

    renderCtx.stroke();
}

function drawWeatherScene(renderCtx, sceneIndex, ts, alpha) {
    if (alpha <= 0) return;

    const scene = WEATHER_SCENES[sceneIndex];
    const width = weatherViewport.width;
    const height = weatherViewport.height;
    const timeSeconds = ts / 1000;

    renderCtx.save();
    renderCtx.globalAlpha = alpha;

    drawSceneSky(renderCtx, scene, width, height);
    drawSceneStars(renderCtx, scene, width, height, timeSeconds);
    drawSceneMoon(renderCtx, scene, width, height);
    drawSceneClouds(renderCtx, scene, width, height, timeSeconds);
    drawSceneRain(renderCtx, scene, width, height, timeSeconds);
    drawSceneFog(renderCtx, scene, width, height, timeSeconds);
    drawSceneScenery(renderCtx, scene, width, height);
    drawSceneLightning(renderCtx, scene, sceneIndex, width, height);

    renderCtx.restore();
}

function drawWeatherBackdrop(ts) {
    if (!weatherCtx || !weatherCanvas) return;
    if (!weatherViewport.width || !weatherViewport.height) resizeWeatherCanvas();

    updateWeatherSceneStates(ts);

    const width = weatherViewport.width;
    const height = weatherViewport.height;
    const transitionProgress = activeWeatherSceneIndex === previousWeatherSceneIndex
        ? 1
        : clamp((ts - weatherTransitionStart) / WEATHER_TRANSITION_MS, 0, 1);
    const mix = easeInOut(transitionProgress);

    weatherCtx.clearRect(0, 0, width, height);
    weatherCtx.fillStyle = '#02040a';
    weatherCtx.fillRect(0, 0, width, height);

    if (mix < 1) drawWeatherScene(weatherCtx, previousWeatherSceneIndex, ts, 1 - mix);
    drawWeatherScene(
        weatherCtx,
        activeWeatherSceneIndex,
        ts,
        activeWeatherSceneIndex === previousWeatherSceneIndex ? 1 : mix
    );

    if (transitionProgress >= 1) previousWeatherSceneIndex = activeWeatherSceneIndex;

    const vignette = weatherCtx.createRadialGradient(
        width * 0.5,
        height * 0.38,
        Math.min(width, height) * 0.12,
        width * 0.5,
        height * 0.5,
        Math.max(width, height) * 0.72
    );
    vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vignette.addColorStop(1, 'rgba(0, 0, 0, 0.48)');
    weatherCtx.fillStyle = vignette;
    weatherCtx.fillRect(0, 0, width, height);
}

function isColliding(piece = currentPiece) {
    if (!piece) return true;          // game‑over scenario

    const { shape, position } = piece;

    for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
            if (!shape[y][x]) continue;

            const nx = position.x + x;
            const ny = position.y + y;

            if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
            if (ny < 0) continue;
            if (board[ny][nx]) return true;
        }
    }
    return false;
}

let ghostPiece = null;

function hexToRgba(hex, alpha = 1) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
}

function drawGhostPiece() {
    if (!currentPiece || !ghostPiece) return;
    ctx.lineWidth = 1.5;
    for (let y = 0; y < ghostPiece.shape.length; y++) {
        for (let x = 0; x < ghostPiece.shape[y].length; x++) {
            if (!ghostPiece.shape[y][x]) continue;
            const px = (ghostPiece.position.x + x) * BLOCK_SIZE;
            const py = (ghostPiece.position.y + y) * BLOCK_SIZE;
            ctx.strokeStyle = hexToRgba(COLORS[ghostPiece.shape[y][x]], 0.5);
            ctx.strokeRect(px + 1, py + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2);
        }
    }
}

function updateGhostPiece() {
    if (!currentPiece) { ghostPiece = null; return; }
    ghostPiece = JSON.parse(JSON.stringify(currentPiece));
    while (!isColliding(ghostPiece)) ghostPiece.position.y++;
    ghostPiece.position.y--;
}

/* ────────────────────── SHUFFLE & NEXT PIECE ─────────── */
function shuffle(a) {
    for (let i = a.length - 1; i > 0; --i) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
}

function getNextType() {
    if (!bag.length) {
        bag = [1, 2, 3, 4, 5, 6, 7];
        shuffle(bag);
    }
    return bag.pop();
}

function init() {
    if (window.tetrisRuntimeInitialized) return;
    window.tetrisRuntimeInitialized = true;

    tetrisCanvas = document.getElementById('tetris-board');
    nextCanvas = document.getElementById('next-canvas');
    weatherCanvas = document.getElementById('weather-backdrop');
    if (!tetrisCanvas || !nextCanvas || !weatherCanvas) return;

    ctx = tetrisCanvas.getContext('2d');
    nextCtx = nextCanvas.getContext('2d');
    weatherCtx = weatherCanvas.getContext('2d');

    initAudio();
    resizeWeatherCanvas();
    window.addEventListener('resize', resizeWeatherCanvas);

    document.getElementById('start-btn').addEventListener('click', restartGame);
    document.getElementById('pause-btn').addEventListener('click', togglePause);
    resetGame();
}
/* ────────────────────── INITIALIZATION GUARD ─────────────────────── */
if (!window.tetrisInitialized) {
    window.tetrisInitialized = true;
    init();
}

function generateRandomPiece() {
    const type = getNextType();
    return {
        shape: JSON.parse(JSON.stringify(SHAPES[type])),
        position: { x: Math.floor(COLS / 2) - Math.floor(SHAPES[type][0].length / 2), y: 0 },
        type
    };
}

function activateCurrentPiece(playEyeAnimation = false) {
    if (!currentPiece) return;
    const w = currentPiece.shape[0].length;
    currentPiece.position.x = Math.floor(COLS / 2 - w / 2);
    currentPiece.position.y = 0;
    if (playEyeAnimation) triggerEyeUp();
}

function resetGame() {
    const now = performance.now();
    board = Array(ROWS).fill().map(() => Array(COLS).fill(0));
    bag = [];
    currentPiece = generateRandomPiece();
    nextPiece = generateRandomPiece();
    activateCurrentPiece(false);
    stowedPiece = null;
    score = 0;
    level = 1;
    lines = 0;
    rowsClearedSinceLastChange = 0;
    gameOver = false;
    isPaused = true;
    gameSpeed = 1000;
    updateStats();
    if (isColliding()) gameOver = true;
    ghostPiece = null;
    lastStowTime = 0;
    holdLockActive = false;
    holdLockEndTime = 0;
    configureWeatherCycle(now);
    updatePauseButton();
    updatePauseOverlay();
    drawWeatherBackdrop(now);
}

function restartGame() {
    resetGame();
    dropStart = performance.now();
    lastTime = performance.now();
}

function updatePauseButton() {
    pauseBtn.textContent = isPaused ? 'Resume' : 'Pause';
}

function updatePauseOverlay() {
    if (!pauseOverlay) return;
    pauseOverlay.hidden = !isPaused || gameOver;
}

function togglePause() {
    if (gameOver) return;
    isPaused = !isPaused;
    if (!isPaused) {
        dropStart = performance.now();
        lastTime = performance.now();
    }
    updatePauseButton();
    updatePauseOverlay();
}

function updateStats() {
    document.getElementById('score').textContent = score;
    document.getElementById('level').textContent = level;
    document.getElementById('lines').textContent = lines;
}

/* ────────────────────── DRAWING FUNCTIONS ─────────────── */
function drawBoard(){
    ctx.clearRect(0,0,tetrisCanvas.width,tetrisCanvas.height);
    for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++)
        if(board[y][x]){
            ctx.fillStyle=COLORS[board[y][x]];
            ctx.fillRect(x*BLOCK_SIZE,y*BLOCK_SIZE,BLOCK_SIZE-1,BLOCK_SIZE-1);
        }
        drawGhostPiece();
    if(currentPiece)
        for(let y=0;y<currentPiece.shape.length;y++)
            for(let x=0;x<currentPiece.shape[y].length;x++)
                if(currentPiece.shape[y][x]){
                    ctx.fillStyle=COLORS[currentPiece.shape[y][x]];
                    ctx.fillRect((currentPiece.position.x+x)*BLOCK_SIZE,
                                 (currentPiece.position.y+y)*BLOCK_SIZE,
                                 BLOCK_SIZE-1,BLOCK_SIZE-1);
                }
                if(isFlashing&&flashCount%2===1&&clearingRows){
                    ctx.fillStyle='rgba(255,255,255,0.8)';
                    for(const row of clearingRows)
                        ctx.fillRect(0,row*BLOCK_SIZE,tetrisCanvas.width,BLOCK_SIZE);
                }
}
function drawNextPiece(){
    nextCtx.clearRect(0,0,nextCanvas.width,nextCanvas.height);
    if(!nextPiece)return;
    const shape = nextPiece.shape;
    const shapeWidth = shape[0].length;
    const shapeHeight = shape.length;
    const offsetX=Math.floor((nextCanvas.width - BLOCK_SIZE*shapeWidth)/2);
    const offsetY=Math.floor((nextCanvas.height - BLOCK_SIZE*shapeHeight)/2);
    for(let y=0;y<shape.length;y++){
        for(let x=0;x<shape[y].length;x++){
            if(shape[y][x]){
                nextCtx.fillStyle=COLORS[shape[y][x]];
                nextCtx.fillRect(offsetX+x*BLOCK_SIZE,offsetY+y*BLOCK_SIZE,BLOCK_SIZE-1,BLOCK_SIZE-1);
            }
        }
    }
    if(nextFlashing&&nextFlashCount%2===1){
        nextCtx.fillStyle='rgba(255,255,255,0.4)';
        nextCtx.fillRect(0,0,nextCanvas.width,nextCanvas.height);
    }
}
/* ────────────────────── STOW BOX DRAWING ───────────────────── */
function drawStowPiece(){
    const stowCanvas = document.getElementById('stow-canvas');
    if (!stowCanvas) return;
    const ctx = stowCanvas.getContext('2d');

    ctx.clearRect(0, 0, stowCanvas.width, stowCanvas.height);

    if (gameOver) {
        ctx.font = 'bold 18px Arial';
        ctx.fillStyle = 'red';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('GAME OVER', stowCanvas.width / 2, stowCanvas.height / 2);
        return;   // skip the rest of the function
    }

    if (stowedPiece) {
        const shape = stowedPiece.shape;
        const shapeWidth = shape[0].length;
        const shapeHeight = shape.length;
        const offsetX = Math.floor((stowCanvas.width - BLOCK_SIZE * shapeWidth) / 2);
        const offsetY = Math.floor((stowCanvas.height - BLOCK_SIZE * shapeHeight) / 2);

        for (let y = 0; y < shape.length; y++) {
            for (let x = 0; x < shape[y].length; x++) {
                if (shape[y][x]) {
                    ctx.fillStyle = COLORS[shape[y][x]];
                    ctx.fillRect(offsetX + x * BLOCK_SIZE,
                                 offsetY + y * BLOCK_SIZE,
                                 BLOCK_SIZE - 1, BLOCK_SIZE - 1);
                }
            }
        }
    }

    /* Countdown when a piece is held  */
    if (!stowedPiece && holdLockActive) {
        const remaining = Math.max(0, Math.ceil((holdLockEndTime - performance.now()) / 1000));
        ctx.font = 'bold 24px Arial';
        ctx.fillStyle = 'red';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(remaining.toString(), stowCanvas.width / 2, stowCanvas.height / 2);
    }
}

/* ────────────────────── GAME LOGIC ───────────────────── */
function rotate(){
    const orig=JSON.parse(JSON.stringify(currentPiece.shape));
    for(let y=0;y<currentPiece.shape.length;y++)
        for(let x=0;x<y;x++){
            [currentPiece.shape[x][y],currentPiece.shape[y][x]]=[currentPiece.shape[y][x],currentPiece.shape[x][y]];
        }
        currentPiece.shape=currentPiece.shape.map(r=>r.reverse());
    if(isColliding()) currentPiece.shape = orig;
    else playSound('ROTATE');
}

/**
 * Move the current piece.
 *
 * @param {number} dx  horizontal delta (positive = right)
 * @param {number} dy  vertical   delta (positive = down)
 * @param {boolean} [suppressDropSound=false] – do not play DROP tone while moving
 */
function movePiece(dx,dy,suppressDropSound = false){
    if(!currentPiece)return false;

    currentPiece.position.x+=dx;
    currentPiece.position.y+=dy;

    if(isColliding()){
        currentPiece.position.x-=dx;
        currentPiece.position.y-=dy;
        return false;
    }

    if (!suppressDropSound) playSound('DROP');
    return true;
}

function hardDrop(){
    // mute DROP while the piece is falling rapidly
    while(movePiece(0,1,true)){}
    lockPiece();               // finally drop the piece into place
}
function lockPiece(){
    if(!currentPiece)return;
    for(let y=0;y<currentPiece.shape.length;y++)
        for(let x=0;x<currentPiece.shape[y].length;x++)
            if(currentPiece.shape[y][x]){
                const by=currentPiece.position.y+y,bx=currentPiece.position.x+x;
                if(by>=0)board[by][bx]=currentPiece.shape[y][x];
            }
            checkLines();
        currentPiece=nextPiece;
    activateCurrentPiece();
    nextPiece=generateRandomPiece();
    lastStowTime=0;
}
function stowOrUnstowPiece(){
    if(!currentPiece)return;
    const now=performance.now();
    if(!stowedPiece&&holdLockActive)return;

    playSound(stowedPiece ? 'UNSTOW' : 'STOW');

    if(!stowedPiece){
        // Move current piece into hold
        stowedPiece={
            shape:JSON.parse(JSON.stringify(SHAPES[currentPiece.type])),
            position:{x:0,y:0},
            type:currentPiece.type
        };
        currentPiece=nextPiece;
        nextPiece=generateRandomPiece();
        activateCurrentPiece();
        ghostPiece=null;updateGhostPiece();drawStowPiece();lastStowTime=now;
        triggerEyeDown();return;
    }
    if(now-lastStowTime<STOW_COOLDOWN_MS)return;
    nextPiece=JSON.parse(JSON.stringify(stowedPiece));
    stowedPiece=null;
    holdLockActive=true;holdLockEndTime=performance.now()+HOLD_LOCK_DURATION_MS;
    drawStowPiece();triggerEyeUp();
}

/* ────────────────────── LINE CHECK & CLEARING ─────────── */
function checkLines() {
    const rowsToClear = [];
    for (let y = ROWS - 1; y >= 0; y--) {
        if (board[y].every(cell => cell !== 0)) {
            rowsToClear.push(y);
        }
    }

    playSound('PIECE_LAND');

    if (rowsToClear.length > 0) {
        const points = [0, 100, 300, 500, 800][rowsToClear.length] * level;
        pendingScoreData = { points, lines: rowsToClear.length };
        clearingRows = rowsToClear;
        isFlashing   = true;
        flashCount   = 0;
        lastFlashTime= performance.now();
        rowsClearedSinceLastChange += rowsToClear.length;
        while (rowsClearedSinceLastChange >= 1) {
            rowsClearedSinceLastChange -= 1;
            changeEyeColor();
        }
        if (rowsToClear.length === 4) {
            triggerEyeRotation();   // eye animations are defined elsewhere
        } else {
            triggerDizzyEye();
        }
    }
}

function finalizeClearing(){
    if(!clearingRows)return;
    const keep=Array.from({length:ROWS},(_,i)=>!clearingRows.includes(i));
    const newB=[];
    for(let y=0;y<ROWS;++y)if(keep[y])newB.push(board[y]);
    while(newB.length<ROWS)newB.unshift(Array(COLS).fill(0));
    board=newB;
    if(pendingScoreData){
        score+=pendingScoreData.points;lines+=pendingScoreData.lines;
        const nl=Math.floor(lines/10)+1;if(nl>level){level=nl;gameSpeed=getSpeedForLevel(level);}
        syncWeatherSceneToLines(performance.now());
        updateStats();
    }
    clearingRows=null;isFlashing=false;flashCount=0;lastFlashTime=0;pendingScoreData=null;
}

/* ────────────────────── GAME LOOP ───────────────────── */
function gameLoop(ts){
    requestAnimationFrame(gameLoop);
    drawWeatherBackdrop(ts);
    if(isPaused||gameOver)return;

    if(ts - dropStart > gameSpeed){
        if(!movePiece(0,1)){
            lockPiece();
            if(isColliding()){
                gameOver      = true;   // we couldn't spawn a fresh piece
                triggerEyeDown();
                playSound('GAME_OVER');
                updatePauseOverlay();
            }
        }
        dropStart = ts;
    }

    if(holdLockActive&&performance.now()>=holdLockEndTime)holdLockActive=false;
    if(nextFlashing&&ts-lastNextFlashTime>FLASH_INTERVAL_MS){
        nextFlashCount++;lastNextFlashTime=ts;
        if(nextFlashCount>=4)nextFlashing=false;
    }
    if(isFlashing){drawBoard();drawNextPiece();drawStowPiece();
        if(ts-lastFlashTime>FLASH_INTERVAL_MS){flashCount++;lastFlashTime=ts; if(flashCount>=4)finalizeClearing();}
        return;}
        const dt=ts-lastTime;lastTime=ts;
        if(!currentPiece&&stowedPiece){
            currentPiece=JSON.parse(JSON.stringify(stowedPiece));
            stowedPiece=null;drawStowPiece();updateGhostPiece();
        }
        if(ts-dropStart>gameSpeed){if(!movePiece(0,1)){lockPiece();if(isColliding()){gameOver=true;updatePauseOverlay();}}dropStart=ts;}
        updateGhostPiece();drawBoard();drawNextPiece();drawStowPiece();
}

/* ────────────────────── INPUT HANDLING ───────────────── */
function setupInput() {
    document.addEventListener('keydown', e => {
        if (isPaused || gameOver) return;

        const action = KEY_MAP[e.key];
        if (!action) return;

        action();
    });
}

/* ────────────────────── SOUND SYSTEM ───────────────────── */
const SOUND_CONFIG = {
    DROP: { type: 'sine', frequency: 470, duration: .1, volume: .3 },
    ROTATE: { type: 'complex', frequencies: [560,580], durations: [.3,.28], volume:.25, decay:true },
    PIECE_LAND: { type:'sine',frequency:800,duration:.3,volume:.6 },
    GAME_OVER:{type:'complex',frequencies:[200,300,400],durations:[.8,.7,.6],decay:true},
    STOW: {
        type: 'complex',
        frequencies: [400, 450, 600], // Added harmonics for richness
        durations: [0.15, 0.13, 0.11], // Slightly different durations for each frequency
        volume: 0.3,
        decay: true, // Use exponential decay for smoother sound
        detune: [-2, -1, 0], // Different detunes for each frequency
        waveShapes: ['square', 'sine', 'triangle'], // Different waveforms for complexity
    },

    UNSTOW: {
        type: 'complex',
        frequencies: [550, 600, 700], // Higher frequencies with more spread
        durations: [0.18, 0.16, 0.14],
        volume: 0.35,
        decay: true,
        detune: [5, 3, 1], // Positive detunes for a brighter sound
        waveShapes: ['square', 'sawtooth', 'triangle'],
    }

};

let audioCtx, masterGain;

function initAudio(){
    try{
        audioCtx=new (window.AudioContext||window.webkitAudioContext)();
        masterGain=audioCtx.createGain();masterGain.gain.value=.5;
        masterGain.connect(audioCtx.destination);
    }catch(e){console.log("Web Audio API not supported");}
}

function playSound(name, opts={}) {
    if(!audioCtx||isPaused)return;
    const cfg=SOUND_CONFIG[name]||{}, vol=opts.volume!==undefined?opts.volume:cfg.volume||.5;
    masterGain.gain.value=vol*.5;

    if(cfg.type==='complex') return playComplex(cfg);

    const osc=audioCtx.createOscillator(), g=audioCtx.createGain();
    g.gain.value=vol;g.connect(masterGain);
    osc.type=cfg.type||'sine';

    if(cfg.detune) {
        osc.detune.value = cfg.detune;
    }
    osc.frequency.value=(cfg.frequency||440)+(Math.random()*20-10);
    osc.connect(g);osc.start();osc.stop(audioCtx.currentTime+(cfg.duration||.2));
    g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+(cfg.duration||.2));
}

function playComplex({frequencies,durations,decay}) {
    const t=audioCtx.currentTime;
    frequencies.forEach((f,i)=>{
        const osc=audioCtx.createOscillator(), g=audioCtx.createGain();
        g.gain.value=.5;g.connect(masterGain);
        osc.type='sine';osc.frequency.value=f;
        osc.connect(g);osc.start(t);
        if(decay){
            const d=durations[i]||.5;
            g.gain.exponentialRampToValueAtTime(.001,t+d);
        }else{
            osc.stop(t+(durations[i]||.3));
        }
    });
}


window.addEventListener('load',()=>{
    init();setupInput();requestAnimationFrame(gameLoop);resetGame();
});
