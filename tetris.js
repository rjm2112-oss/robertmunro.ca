/* ────────────────────── CONSTANTS ─────────────────────── */
const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;
const BOARD_LOGICAL_WIDTH = COLS * BLOCK_SIZE;
const BOARD_LOGICAL_HEIGHT = ROWS * BLOCK_SIZE;
const PREVIEW_LOGICAL_SIZE = 150;
const MIN_DROP_INTERVAL_MS = 200;
const LOCK_DELAY_MS = 500;
const MAX_LOCK_RESETS = 15;

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
let groundedAt = null, lockResetCount = 0;

let ctx, nextCtx, stowCtx, tetrisCanvas, nextCanvas, stowCanvas, weatherCanvas, weatherCtx;
let clearingRows = null, flashCount = 0, lastFlashTime = 0, isFlashing = false;
let pendingScoreData = null;
const FLASH_INTERVAL_MS = 120;
const WEBSITE_FULLSCREEN_CLASS = 'tetris-website-fullscreen';
const TOUCH_DEVICE_CLASS = 'is-touch-device';
const GAME_ZOOM_STEPS = [0.72, 0.85, 1, 1.15, 1.3];
const IS_FILE_ORIGIN = window.location.protocol === 'file:';
const MESSAGE_TARGET_ORIGIN =
    window.location.origin === 'null' || IS_FILE_ORIGIN ? '*' : window.location.origin;
let websiteFullscreenActive = false;
let gameZoomStepIndex = 2;
let gameCanvasResolutionFrame = 0;
let lastFullscreenTouchTime = 0;
let lastTouchControlTime = 0;

let nextFlashing = false, nextFlashCount = 0, lastNextFlashTime = 0;
let rowsClearedSinceLastChange = 0;
let bag = [];
const MAX_HUE = 360;
let currentHue = 0;

let lastStowTime = 0;
const STOW_COOLDOWN_MS = 0;
const WEATHER_SCENE_ADVANCE_LINES = 10;
const WEATHER_TRANSITION_MS = 1800;
const CLOUD_VISIBILITY_BOOST = 1.18;
const RAIN_VISIBILITY_BOOST = 1.2;

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
    detailColor: 'rgba(118, 142, 168, 0.13)',
    accentColor: 'rgba(198, 214, 234, 0.14)'
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
        detailColor: 'rgba(126, 151, 178, 0.13)'
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
        detailColor: 'rgba(100, 122, 146, 0.11)'
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
        detailColor: 'rgba(154, 178, 206, 0.15)',
        accentColor: 'rgba(208, 225, 246, 0.10)'
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
        detailColor: 'rgba(134, 152, 173, 0.12)'
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
        detailColor: 'rgba(100, 120, 144, 0.11)'
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
        detailColor: 'rgba(122, 147, 170, 0.12)'
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
        detailColor: 'rgba(92, 106, 124, 0.11)',
        accentColor: 'rgba(255, 129, 76, 0.14)'
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
        detailColor: 'rgba(116, 140, 164, 0.11)'
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
        detailColor: 'rgba(130, 151, 176, 0.13)'
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
        detailColor: 'rgba(150, 169, 192, 0.13)'
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
        detailColor: 'rgba(140, 157, 180, 0.13)'
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
        detailColor: 'rgba(118, 135, 156, 0.12)'
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
        detailColor: 'rgba(94, 124, 112, 0.15)',
        accentColor: 'rgba(140, 184, 152, 0.12)'
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
        detailColor: 'rgba(134, 149, 170, 0.13)'
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
        detailColor: 'rgba(166, 189, 216, 0.17)',
        accentColor: 'rgba(212, 228, 248, 0.12)'
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
        detailColor: 'rgba(132, 158, 142, 0.13)',
        accentColor: 'rgba(170, 204, 184, 0.10)'
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
        detailColor: 'rgba(126, 149, 176, 0.12)'
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
        detailColor: 'rgba(132, 150, 172, 0.15)',
        accentColor: 'rgba(206, 220, 242, 0.10)'
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
        detailColor: 'rgba(108, 126, 147, 0.11)'
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
        detailColor: 'rgba(112, 128, 150, 0.11)'
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
let audioContext = null;
let audioMasterGain = null;
let audioAvailable = true;
const activeSoundVoices = new Set();

const SOUND_CONFIG = {
    DROP: { type: 'sine', frequency: 470, duration: 0.1, volume: 0.3 },
    ROTATE: { type: 'complex', frequencies: [560, 580], durations: [0.3, 0.28], volume: 0.25, decay: true },
    PIECE_LAND: { type: 'sine', frequency: 800, duration: 0.3, volume: 0.6 },
    GAME_OVER: { type: 'complex', frequencies: [200, 300, 400], durations: [0.8, 0.7, 0.6], volume: 0.5, decay: true },
    STOW: {
        type: 'complex',
        frequencies: [400, 450, 600],
        durations: [0.15, 0.13, 0.11],
        volume: 0.3,
        decay: true,
        detune: [-2, -1, 0],
        waveShapes: ['square', 'sine', 'triangle']
    },
    UNSTOW: {
        type: 'complex',
        frequencies: [550, 600, 700],
        durations: [0.18, 0.16, 0.14],
        volume: 0.35,
        decay: true,
        detune: [5, 3, 1],
        waveShapes: ['square', 'sawtooth', 'triangle']
    }
};

/* ────────────────────── BUTTON HELPERS ─────────────────────── */
const startBtn = document.getElementById('start-btn');
const pauseBtn = document.getElementById('pause-btn');
const fullscreenBtn = document.getElementById('fullscreen-btn');
const pauseOverlay = document.getElementById('pause-overlay');
const pauseResizeControls = document.getElementById('pause-resize-controls');
const gameSizeDownBtn = document.getElementById('game-size-down');
const gameSizeUpBtn = document.getElementById('game-size-up');
const touchControls = document.getElementById('touch-controls');
const touchControlsShell = touchControls?.closest('.touch-controls-shell') ?? null;
const gameContainerEl = document.querySelector('.game-container');
let touchControlsMetricsFrame = 0;
let touchControlsResizeObserver = null;

startBtn.addEventListener('keydown', e => {
    if (e.code === 'Space') e.preventDefault();
});

pauseBtn.addEventListener('keydown', e => {
    if (e.code === 'Space') e.preventDefault();
});

if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', handleFullscreenButtonClick);
    fullscreenBtn.addEventListener('touchend', handleFullscreenButtonTouch, { passive: false });
}

if (gameSizeDownBtn) {
    gameSizeDownBtn.addEventListener('click', () => stepGameZoom(-1));
}

if (gameSizeUpBtn) {
    gameSizeUpBtn.addEventListener('click', () => stepGameZoom(1));
}

if (touchControls) {
    touchControls.addEventListener('click', handleTouchControlsClick);
    touchControls.addEventListener('touchend', handleTouchControlsTouch, { passive: false });
}

window.addEventListener('message', handleParentMessage);

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
    return Math.max(MIN_DROP_INTERVAL_MS, 1000 * Math.pow(factor, lvl - 1));
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

function resizeLogicalCanvas(canvas, renderCtx, logicalWidth, logicalHeight, renderScale, dpr) {
    if (!canvas || !renderCtx) return false;

    const cssWidth = canvas.clientWidth || logicalWidth;
    const cssHeight = canvas.clientHeight || logicalHeight;
    const pixelWidth = Math.max(1, Math.round(cssWidth * renderScale * dpr));
    const pixelHeight = Math.max(1, Math.round(cssHeight * renderScale * dpr));
    const dimensionsChanged = canvas.width !== pixelWidth || canvas.height !== pixelHeight;

    if (dimensionsChanged) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
    }

    renderCtx.setTransform(
        pixelWidth / logicalWidth,
        0,
        0,
        pixelHeight / logicalHeight,
        0,
        0
    );
    renderCtx.imageSmoothingEnabled = false;
    return dimensionsChanged;
}

function syncGameCanvasResolution() {
    gameCanvasResolutionFrame = 0;
    if (!gameContainerEl || !ctx || !nextCtx || !stowCtx) return;

    const unscaledWidth = gameContainerEl.offsetWidth;
    const renderedWidth = gameContainerEl.getBoundingClientRect().width;
    const renderScale = unscaledWidth > 0 ? renderedWidth / unscaledWidth : 1;
    const dpr = Math.max(window.devicePixelRatio || 1, 1);

    resizeLogicalCanvas(
        tetrisCanvas,
        ctx,
        BOARD_LOGICAL_WIDTH,
        BOARD_LOGICAL_HEIGHT,
        renderScale,
        dpr
    );
    resizeLogicalCanvas(
        nextCanvas,
        nextCtx,
        PREVIEW_LOGICAL_SIZE,
        PREVIEW_LOGICAL_SIZE,
        renderScale,
        dpr
    );
    resizeLogicalCanvas(
        stowCanvas,
        stowCtx,
        PREVIEW_LOGICAL_SIZE,
        PREVIEW_LOGICAL_SIZE,
        renderScale,
        dpr
    );

    drawBoard();
    drawNextPiece();
    drawStowPiece();
}

function scheduleGameCanvasResolutionSync() {
    if (gameCanvasResolutionFrame) {
        cancelAnimationFrame(gameCanvasResolutionFrame);
    }
    gameCanvasResolutionFrame = requestAnimationFrame(syncGameCanvasResolution);
}

function getParentWindow() {
    if (window.parent === window) {
        return null;
    }

    try {
        void window.parent.location.href;
        return window.parent;
    } catch (error) {
        return window.parent;
    }
}

function getParentDocument() {
    const parentWindow = getParentWindow();
    if (!parentWindow) {
        return null;
    }

    try {
        return parentWindow.document;
    } catch (error) {
        return null;
    }
}

function detectTouchDevice() {
    return Boolean(
        navigator.maxTouchPoints > 0 ||
        (window.matchMedia && window.matchMedia('(pointer: coarse)').matches)
    );
}

function syncTouchDeviceState() {
    document.body.classList.toggle(TOUCH_DEVICE_CLASS, detectTouchDevice());
    updateGameZoomControls();
    scheduleGameCanvasResolutionSync();
}

function measureTouchControlsHeight() {
    if (!touchControlsShell) {
        return 0;
    }

    const computedDisplay = window.getComputedStyle(touchControlsShell).display;
    if (computedDisplay !== 'none') {
        return touchControlsShell.offsetHeight;
    }

    const previousInlineStyles = {
        display: touchControlsShell.style.display,
        position: touchControlsShell.style.position,
        visibility: touchControlsShell.style.visibility,
        top: touchControlsShell.style.top,
        bottom: touchControlsShell.style.bottom
    };

    touchControlsShell.style.display = 'block';
    touchControlsShell.style.position = 'absolute';
    touchControlsShell.style.visibility = 'hidden';
    touchControlsShell.style.top = '0';
    touchControlsShell.style.bottom = 'auto';

    const measuredHeight = touchControlsShell.offsetHeight;

    touchControlsShell.style.display = previousInlineStyles.display;
    touchControlsShell.style.position = previousInlineStyles.position;
    touchControlsShell.style.visibility = previousInlineStyles.visibility;
    touchControlsShell.style.top = previousInlineStyles.top;
    touchControlsShell.style.bottom = previousInlineStyles.bottom;

    return measuredHeight;
}

function syncTouchControlsMetrics() {
    const measuredHeight = measureTouchControlsHeight();
    if (measuredHeight > 0) {
        document.body.style.setProperty('--touch-controls-height', `${measuredHeight}px`);
    }

    scheduleTouchControlsPositionSync();
}

function updateTouchControlsPosition() {
    touchControlsMetricsFrame = 0;

    if (!touchControlsShell || !gameContainerEl) {
        return;
    }

    const isTouchFullscreen =
        document.body.classList.contains(TOUCH_DEVICE_CLASS) &&
        document.body.classList.contains('is-website-fullscreen');

    if (!isTouchFullscreen) {
        document.body.style.removeProperty('--touch-controls-top');
        return;
    }

    const containerRect = gameContainerEl.getBoundingClientRect();
    const styles = window.getComputedStyle(document.body);
    const scale = parseFloat(styles.getPropertyValue('--game-scale')) || 1;
    const gap = (parseFloat(styles.getPropertyValue('--touch-controls-gap')) || 0) * scale;
    const top = containerRect.bottom + gap;

    document.body.style.setProperty('--touch-controls-top', `${Math.round(top)}px`);
}

function scheduleTouchControlsPositionSync() {
    if (touchControlsMetricsFrame) {
        cancelAnimationFrame(touchControlsMetricsFrame);
    }

    touchControlsMetricsFrame = requestAnimationFrame(() => {
        touchControlsMetricsFrame = requestAnimationFrame(updateTouchControlsPosition);
    });
}

function applyWebsiteFullscreenState(expanded) {
    websiteFullscreenActive = expanded;
    document.body.classList.toggle('is-website-fullscreen', expanded);
    updateGameZoomControls();
    syncTouchControlsMetrics();
    scheduleGameCanvasResolutionSync();
    updateFullscreenButtonLabel();
}

function applyGameZoom() {
    const zoom = GAME_ZOOM_STEPS[gameZoomStepIndex];
    document.body.style.setProperty('--game-zoom', zoom.toString());
    updateGameZoomControls();
    syncTouchControlsMetrics();
    scheduleGameCanvasResolutionSync();
}

function stepGameZoom(direction) {
    if (
        !websiteFullscreenActive ||
        !isPaused ||
        gameOver ||
        document.body.classList.contains(TOUCH_DEVICE_CLASS)
    ) {
        return;
    }

    const nextIndex = clamp(
        gameZoomStepIndex + Math.sign(direction),
        0,
        GAME_ZOOM_STEPS.length - 1
    );
    if (nextIndex === gameZoomStepIndex) {
        return;
    }

    gameZoomStepIndex = nextIndex;
    applyGameZoom();
}

function updateGameZoomControls() {
    const controlsAvailable =
        websiteFullscreenActive &&
        isPaused &&
        !gameOver &&
        !document.body.classList.contains(TOUCH_DEVICE_CLASS);
    const zoomPercent = Math.round(GAME_ZOOM_STEPS[gameZoomStepIndex] * 100);

    if (pauseResizeControls) {
        pauseResizeControls.setAttribute('aria-hidden', controlsAvailable ? 'false' : 'true');
        pauseResizeControls.setAttribute('aria-label', `Resize game, ${zoomPercent} percent`);
    }
    if (gameSizeDownBtn) {
        gameSizeDownBtn.disabled = !controlsAvailable || gameZoomStepIndex === 0;
    }
    if (gameSizeUpBtn) {
        gameSizeUpBtn.disabled = !controlsAvailable || gameZoomStepIndex === GAME_ZOOM_STEPS.length - 1;
    }
}

function updateFullscreenButtonLabel() {
    if (!fullscreenBtn) {
        return;
    }

    fullscreenBtn.textContent = websiteFullscreenActive ? 'Exit Fullscreen' : 'Fullscreen';
}

function toggleWebsiteFullscreen() {
    const parentWindow = getParentWindow();
    if (parentWindow) {
        try {
            if (typeof parentWindow.setTetrisWebsiteFullscreen === 'function') {
                parentWindow.setTetrisWebsiteFullscreen(!websiteFullscreenActive);
                return;
            }
        } catch (error) {
            // Cross-origin parents under file:// fall through to postMessage.
        }
    }

    const parentDocument = getParentDocument();
    if (parentDocument?.body) {
        const expanded = !parentDocument.body.classList.contains(WEBSITE_FULLSCREEN_CLASS);
        parentDocument.body.classList.toggle(WEBSITE_FULLSCREEN_CLASS, expanded);
        applyWebsiteFullscreenState(expanded);
        return;
    }

    if (!parentWindow) {
        applyWebsiteFullscreenState(!websiteFullscreenActive);
        return;
    }

    parentWindow.postMessage(
        {
            type: 'tetris:toggle-website-fullscreen',
            expanded: !websiteFullscreenActive
        },
        MESSAGE_TARGET_ORIGIN
    );
}

function handleFullscreenButtonClick(event) {
    if (Date.now() - lastFullscreenTouchTime < 700) {
        event.preventDefault();
        return;
    }

    toggleWebsiteFullscreen();
}

function handleFullscreenButtonTouch(event) {
    event.preventDefault();
    lastFullscreenTouchTime = Date.now();
    toggleWebsiteFullscreen();
}

function getTouchControlAction(target) {
    if (!(target instanceof Element)) {
        return null;
    }

    const button = target.closest('[data-touch-action]');
    return button?.dataset.touchAction ?? null;
}

function runTouchControl(actionName) {
    if (isPaused || gameOver || isFlashing || !currentPiece) {
        return;
    }

    switch (actionName) {
        case 'left':
            movePiece(-1, 0);
            break;
        case 'right':
            movePiece(1, 0);
            break;
        case 'down':
            movePiece(0, 1);
            break;
        case 'rotate':
            rotate();
            break;
        case 'drop':
            hardDrop();
            dropStart = performance.now();
            break;
        case 'hold':
            stowOrUnstowPiece();
            break;
        default:
            return;
    }

    updateGhostPiece();
    drawBoard();
    drawNextPiece();
    drawStowPiece();
    updatePauseOverlay();
}

function handleTouchControlsClick(event) {
    if (Date.now() - lastTouchControlTime < 700) {
        event.preventDefault();
        return;
    }

    const actionName = getTouchControlAction(event.target);
    if (!actionName) {
        return;
    }

    event.preventDefault();
    primeAudioContext();
    runTouchControl(actionName);
}

function handleTouchControlsTouch(event) {
    const actionName = getTouchControlAction(event.target);
    if (!actionName) {
        return;
    }

    event.preventDefault();
    lastTouchControlTime = Date.now();
    primeAudioContext();
    runTouchControl(actionName);
}

function handleParentMessage(event) {
    if (!event.data) {
        return;
    }

    if (
        event.origin !== 'null' &&
        event.origin !== 'file://' &&
        event.origin !== window.location.origin
    ) {
        return;
    }

    if (event.data.type !== 'tetris:website-fullscreen-state') {
        return;
    }

    applyWebsiteFullscreenState(Boolean(event.data.expanded));
}

function requestWebsiteFullscreenState() {
    const parentDocument = getParentDocument();
    if (parentDocument?.body) {
        applyWebsiteFullscreenState(parentDocument.body.classList.contains(WEBSITE_FULLSCREEN_CLASS));
        return;
    }

    const parentWindow = getParentWindow();
    if (!parentWindow) {
        applyWebsiteFullscreenState(false);
        return;
    }

    try {
        if (typeof parentWindow.getTetrisWebsiteFullscreen === 'function') {
            applyWebsiteFullscreenState(Boolean(parentWindow.getTetrisWebsiteFullscreen()));
            return;
        }
    } catch (error) {
        // Cross-origin parents under file:// fall through to postMessage.
    }

    parentWindow.postMessage(
        {
            type: 'tetris:request-website-fullscreen-state'
        },
        MESSAGE_TARGET_ORIGIN
    );
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

        state.flash *= Math.pow(0.86, frameScale);

        if (!scene.lightning) {
            state.flash = 0;
            continue;
        }

        if (seconds >= state.nextLightningAt) {
            state.flash = 0.34 + Math.random() * scene.lightning * 0.28;
            state.nextLightningAt = seconds + scene.lightningGapMin +
                Math.random() * (scene.lightningGapMax - scene.lightningGapMin);
            state.secondaryQueued = Math.random() < 0.58;
            state.secondaryFlashAt = seconds + 0.08 + Math.random() * 0.16;
            state.boltX = 0.18 + Math.random() * 0.64;
            state.boltLean = -0.22 + Math.random() * 0.44;
        }

        if (state.secondaryQueued && seconds >= state.secondaryFlashAt) {
            state.secondaryQueued = false;
            state.flash = Math.max(state.flash, 0.16 + Math.random() * scene.lightning * 0.18);
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

    const disc = renderCtx.createRadialGradient(
        x - radius * 0.3,
        y - radius * 0.34,
        radius * 0.08,
        x,
        y,
        radius
    );
    disc.addColorStop(0, `rgba(232, 238, 248, ${scene.moonAlpha})`);
    disc.addColorStop(0.68, `rgba(214, 225, 241, ${scene.moonAlpha * 0.72})`);
    disc.addColorStop(1, `rgba(156, 175, 202, ${scene.moonAlpha * 0.25})`);
    renderCtx.fillStyle = disc;
    renderCtx.beginPath();
    renderCtx.arc(x, y, radius, 0, Math.PI * 2);
    renderCtx.fill();
}

function drawFeatheredEllipse(
    renderCtx,
    x,
    y,
    radiusX,
    radiusY,
    color,
    opacity = 1,
    solidCore = 0.3
) {
    if (radiusX <= 0 || radiusY <= 0 || opacity <= 0) return;

    renderCtx.save();
    renderCtx.translate(x, y);
    renderCtx.scale(radiusX / radiusY, 1);
    renderCtx.globalAlpha *= opacity;

    const gradient = renderCtx.createRadialGradient(0, 0, 0, 0, 0, radiusY);
    gradient.addColorStop(0, color);
    gradient.addColorStop(solidCore, color);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    renderCtx.fillStyle = gradient;
    renderCtx.beginPath();
    renderCtx.arc(0, 0, radiusY, 0, Math.PI * 2);
    renderCtx.fill();
    renderCtx.restore();
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

            drawFeatheredEllipse(
                renderCtx,
                x,
                y + radiusY * 0.18,
                radiusX,
                radiusY * 0.88,
                scene.cloudColor,
                0.45 * CLOUD_VISIBILITY_BOOST,
                0.34
            );

            for (let puff = 0; puff < 4; puff++) {
                const puffSeed = seed + 5 + puff * 7.7;
                const offsetX = lerp(-0.62, 0.62, puff / 3) * radiusX;
                const offsetY = (hash01(puffSeed) - 0.68) * radiusY * 0.58;
                const puffRadiusX = radiusX * lerp(0.34, 0.54, hash01(puffSeed + 1));
                const puffRadiusY = radiusY * lerp(0.62, 1.08, hash01(puffSeed + 2));

                drawFeatheredEllipse(
                    renderCtx,
                    x + offsetX,
                    y + offsetY,
                    puffRadiusX,
                    puffRadiusY,
                    scene.cloudColor,
                    0.28 * CLOUD_VISIBILITY_BOOST,
                    0.22
                );
            }
        }
    }
}

function drawSceneRain(renderCtx, scene, width, height, timeSeconds) {
    if (!scene.rainCount) return;

    renderCtx.lineCap = 'round';

    for (let i = 0; i < scene.rainCount; i++) {
        const seed = scene.seed * 307 + i * 19.41;
        const depth = lerp(0.45, 1, hash01(seed + 8));
        const speed = scene.rainSpeed * lerp(0.82, 1.2, hash01(seed + 1)) * lerp(0.72, 1.08, depth);
        const cycleHeight = height + 160;
        const y = wrap(hash01(seed + 2) * cycleHeight + timeSeconds * speed * 340, cycleHeight) - 80;
        const x = wrap(
            hash01(seed + 3) * (width + 180) + timeSeconds * scene.rainAngle * -90 * (0.4 + hash01(seed + 4)),
            width + 180
        ) - 90;
        const length = lerp(scene.rainLength[0], scene.rainLength[1], hash01(seed + 5)) *
            lerp(0.58, 1.04, depth);
        const thickness = lerp(0.45, 1.2, depth) * lerp(0.85, 1.08, hash01(seed + 6));
        const dx = length * scene.rainAngle;
        const alpha = Math.min(
            1,
            scene.rainOpacity * RAIN_VISIBILITY_BOOST * lerp(0.42, 0.94, depth) *
                lerp(0.82, 1.08, hash01(seed + 7))
        );

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
        const color = `rgba(170, 188, 210, ${alpha})`;

        drawFeatheredEllipse(renderCtx, x, y, radiusX, radiusY, color, 0.68, 0.14);
        drawFeatheredEllipse(
            renderCtx,
            x + radiusX * 0.45,
            y + 8,
            radiusX * 0.7,
            radiusY * 0.8,
            color,
            0.5,
            0.1
        );
    }
}

function drawLandscapeHaze(renderCtx, scene, width, height, horizonY) {
    const haze = renderCtx.createLinearGradient(0, horizonY - 90, 0, horizonY + 120);
    haze.addColorStop(0, 'rgba(0, 0, 0, 0)');
    haze.addColorStop(0.48, scene.detailColor);
    haze.addColorStop(1, 'rgba(0, 0, 0, 0)');

    renderCtx.save();
    renderCtx.globalAlpha *= 0.28;
    renderCtx.fillStyle = haze;
    renderCtx.fillRect(0, horizonY - 90, width, 210);
    renderCtx.restore();
}

function drawDistantRidge(
    renderCtx,
    scene,
    width,
    horizonY,
    {
        amplitude = 40,
        baseOffset = 0,
        pointCount = 10,
        opacity = 0.4,
        seedOffset = 0,
        smooth = false
    } = {}
) {
    const points = [];
    for (let index = 0; index <= pointCount; index++) {
        const seed = scene.seed * 877 + seedOffset + index * 13.17;
        const x = width * index / pointCount;
        const broadVariation = 0.5 + 0.5 * Math.sin(scene.seed * 29 + index * 1.31);
        const heightVariation = 0.24 + hash01(seed) * 0.52 + broadVariation * 0.24;
        points.push({
            x,
            y: horizonY + baseOffset - amplitude * heightVariation
        });
    }

    renderCtx.save();
    renderCtx.globalAlpha *= opacity;
    renderCtx.fillStyle = scene.detailColor;
    renderCtx.beginPath();
    renderCtx.moveTo(points[0].x, points[0].y);

    if (smooth && points.length > 2) {
        for (let index = 1; index < points.length - 1; index++) {
            const point = points[index];
            const next = points[index + 1];
            renderCtx.quadraticCurveTo(
                point.x,
                point.y,
                (point.x + next.x) * 0.5,
                (point.y + next.y) * 0.5
            );
        }
        const lastPoint = points[points.length - 1];
        renderCtx.lineTo(lastPoint.x, lastPoint.y);
    } else {
        for (let index = 1; index < points.length; index++) {
            renderCtx.lineTo(points[index].x, points[index].y);
        }
    }

    const ridgeFloor = horizonY + baseOffset + amplitude * 0.35;
    renderCtx.lineTo(width, ridgeFloor);
    renderCtx.lineTo(0, ridgeFloor);
    renderCtx.closePath();
    renderCtx.fill();
    renderCtx.restore();
}

function drawWaterRipples(
    renderCtx,
    scene,
    width,
    topY,
    bottomY,
    count = 8,
    opacity = 0.55
) {
    renderCtx.save();
    renderCtx.globalAlpha *= opacity;
    renderCtx.strokeStyle = scene.accentColor || scene.detailColor;
    renderCtx.lineWidth = 0.8;

    for (let index = 0; index < count; index++) {
        const seed = scene.seed * 929 + index * 17.9;
        const depth = (index + 1) / (count + 1);
        const y = lerp(topY, bottomY, depth);
        const length = width * lerp(0.04, 0.2, depth) * lerp(0.72, 1.2, hash01(seed + 1));
        const x = hash01(seed) * Math.max(1, width - length);
        const lift = lerp(0.2, 1.4, depth) * (hash01(seed + 2) - 0.5);

        renderCtx.beginPath();
        renderCtx.moveTo(x, y);
        renderCtx.quadraticCurveTo(x + length * 0.48, y + lift, x + length, y);
        renderCtx.stroke();
    }

    renderCtx.restore();
}

function drawForegroundShade(renderCtx, width, height, horizonY) {
    const shade = renderCtx.createLinearGradient(0, horizonY, 0, height);
    shade.addColorStop(0, 'rgba(0, 0, 0, 0)');
    shade.addColorStop(0.7, 'rgba(0, 0, 0, 0.025)');
    shade.addColorStop(1, 'rgba(0, 0, 0, 0.1)');
    renderCtx.fillStyle = shade;
    renderCtx.fillRect(0, horizonY, width, height - horizonY);
}

function drawPineSilhouette(renderCtx, x, baseY, treeHeight, color, seed = 0) {
    const lean = (hash01(seed + 0.7) - 0.5) * treeHeight * 0.07;
    const trunkBaseHalfWidth = Math.max(0.7, treeHeight * 0.024);
    const trunkTopHalfWidth = Math.max(0.35, treeHeight * 0.009);
    const branchTips = [];

    renderCtx.fillStyle = color;
    renderCtx.beginPath();
    renderCtx.moveTo(x - trunkBaseHalfWidth, baseY);
    renderCtx.lineTo(x + lean * 0.76 - trunkTopHalfWidth, baseY - treeHeight * 0.82);
    renderCtx.lineTo(x + lean * 0.76 + trunkTopHalfWidth, baseY - treeHeight * 0.82);
    renderCtx.lineTo(x + trunkBaseHalfWidth, baseY);
    renderCtx.closePath();

    const tierCount = hash01(seed + 1.3) > 0.52 ? 6 : 5;
    for (let tier = 0; tier < tierCount; tier++) {
        const progress = tier / Math.max(1, tierCount - 1);
        const tierTop = baseY - treeHeight + treeHeight * tier * (0.72 / tierCount);
        const tierDepth = treeHeight * lerp(0.2, 0.31, progress);
        const centerX = x + lean * (1 - progress * 0.76);
        const baseSpread = treeHeight * lerp(0.055, 0.205, progress);
        const leftSpread = baseSpread * lerp(0.84, 1.14, hash01(seed + tier * 7.1 + 2));
        const rightSpread = baseSpread * lerp(0.84, 1.14, hash01(seed + tier * 7.1 + 3));
        const leftDrop = tierDepth * lerp(0.5, 0.68, hash01(seed + tier * 7.1 + 4));
        const rightDrop = tierDepth * lerp(0.5, 0.68, hash01(seed + tier * 7.1 + 5));

        renderCtx.moveTo(centerX, tierTop);
        renderCtx.quadraticCurveTo(
            centerX - leftSpread * 0.28,
            tierTop + tierDepth * 0.24,
            centerX - leftSpread,
            tierTop + leftDrop
        );
        renderCtx.quadraticCurveTo(
            centerX - leftSpread * 0.4,
            tierTop + tierDepth * 0.78,
            centerX,
            tierTop + tierDepth
        );
        renderCtx.quadraticCurveTo(
            centerX + rightSpread * 0.42,
            tierTop + tierDepth * 0.78,
            centerX + rightSpread,
            tierTop + rightDrop
        );
        renderCtx.quadraticCurveTo(
            centerX + rightSpread * 0.26,
            tierTop + tierDepth * 0.24,
            centerX,
            tierTop
        );
        renderCtx.closePath();

        if (tier >= 2 && tier % 2 === 0) {
            branchTips.push({
                centerX,
                tierTop,
                tierDepth,
                leftSpread,
                rightSpread,
                leftDrop,
                rightDrop
            });
        }
    }
    renderCtx.fill();

    renderCtx.save();
    renderCtx.globalAlpha *= 0.72;
    renderCtx.strokeStyle = color;
    renderCtx.lineCap = 'round';
    renderCtx.lineWidth = Math.max(0.45, treeHeight * 0.007);
    renderCtx.beginPath();
    for (const branch of branchTips) {
        renderCtx.moveTo(branch.centerX, branch.tierTop + branch.tierDepth * 0.55);
        renderCtx.lineTo(
            branch.centerX - branch.leftSpread * 1.08,
            branch.tierTop + branch.leftDrop
        );
        renderCtx.moveTo(branch.centerX, branch.tierTop + branch.tierDepth * 0.58);
        renderCtx.lineTo(
            branch.centerX + branch.rightSpread * 1.08,
            branch.tierTop + branch.rightDrop
        );
    }
    renderCtx.stroke();
    renderCtx.restore();
}

function getPineGroundY(x, width, horizonY) {
    const splitX = width * 0.46;
    if (x <= splitX) {
        const t = clamp(x / Math.max(1, splitX), 0, 1);
        return (1 - t) ** 2 * (horizonY - 8) +
            2 * (1 - t) * t * (horizonY - 44) +
            t ** 2 * (horizonY - 10);
    }

    const t = clamp((x - splitX) / Math.max(1, width - splitX), 0, 1);
    return (1 - t) ** 2 * (horizonY - 10) +
        2 * (1 - t) * t * (horizonY + 18) +
        t ** 2 * (horizonY - 18);
}

function drawBroadleafTreeSilhouette(
    renderCtx,
    scene,
    x,
    baseY,
    treeHeight,
    canopyWidth,
    seed
) {
    const lean = (hash01(seed + 1) - 0.5) * treeHeight * 0.12;
    const crownX = x + lean;
    const crownY = baseY - treeHeight * 0.76;
    const canopyHeight = canopyWidth * lerp(0.55, 0.72, hash01(seed + 2));
    const trunkBaseHalfWidth = Math.max(1, treeHeight * 0.035);
    const trunkTopHalfWidth = Math.max(0.55, treeHeight * 0.012);
    const forkY = baseY - treeHeight * 0.48;

    renderCtx.fillStyle = scene.detailColor;
    renderCtx.beginPath();
    renderCtx.moveTo(x - treeHeight * 0.12, baseY + 3);
    renderCtx.quadraticCurveTo(x - trunkBaseHalfWidth * 1.2, baseY - 2, x - trunkBaseHalfWidth, baseY - 8);
    renderCtx.lineTo(crownX - trunkTopHalfWidth, crownY + canopyHeight * 0.22);
    renderCtx.lineTo(crownX + trunkTopHalfWidth, crownY + canopyHeight * 0.22);
    renderCtx.lineTo(x + trunkBaseHalfWidth, baseY - 8);
    renderCtx.quadraticCurveTo(x + trunkBaseHalfWidth * 1.2, baseY - 2, x + treeHeight * 0.12, baseY + 3);
    renderCtx.lineTo(x, baseY - 1);
    renderCtx.closePath();
    renderCtx.fill();

    renderCtx.save();
    renderCtx.globalAlpha *= 0.78;
    renderCtx.strokeStyle = scene.detailColor;
    renderCtx.lineCap = 'round';
    renderCtx.lineWidth = Math.max(0.65, treeHeight * 0.014);
    renderCtx.beginPath();
    renderCtx.moveTo(x + lean * 0.48, forkY);
    renderCtx.quadraticCurveTo(
        crownX - canopyWidth * 0.12,
        crownY + canopyHeight * 0.38,
        crownX - canopyWidth * 0.32,
        crownY + canopyHeight * 0.05
    );
    renderCtx.moveTo(x + lean * 0.5, forkY - treeHeight * 0.05);
    renderCtx.quadraticCurveTo(
        crownX + canopyWidth * 0.1,
        crownY + canopyHeight * 0.32,
        crownX + canopyWidth * 0.34,
        crownY + canopyHeight * 0.02
    );
    renderCtx.stroke();
    renderCtx.restore();

    const lobes = [
        [0, -0.3, 0.32, 0.35],
        [-0.24, -0.18, 0.34, 0.37],
        [0.25, -0.16, 0.36, 0.36],
        [-0.43, 0.04, 0.31, 0.33],
        [0.44, 0.06, 0.33, 0.33],
        [-0.18, 0.16, 0.38, 0.37],
        [0.19, 0.17, 0.4, 0.36]
    ];

    renderCtx.fillStyle = scene.detailColor;
    renderCtx.beginPath();
    for (let index = 0; index < lobes.length; index++) {
        const [offsetX, offsetY, radiusX, radiusY] = lobes[index];
        const lobeSeed = seed + index * 9.7;
        renderCtx.ellipse(
            crownX + canopyWidth * (offsetX + (hash01(lobeSeed) - 0.5) * 0.08),
            crownY + canopyHeight * (offsetY + (hash01(lobeSeed + 1) - 0.5) * 0.08),
            canopyWidth * radiusX * lerp(0.88, 1.12, hash01(lobeSeed + 2)),
            canopyHeight * radiusY * lerp(0.86, 1.12, hash01(lobeSeed + 3)),
            lerp(-0.2, 0.2, hash01(lobeSeed + 4)),
            0,
            Math.PI * 2
        );
    }
    renderCtx.fill();
}

function drawGroundContours(
    renderCtx,
    scene,
    width,
    topY,
    bottomY,
    {
        count = 6,
        opacity = 0.4,
        seedOffset = 0,
        maxWidth = 0.34,
        bend = 5
    } = {}
) {
    renderCtx.save();
    renderCtx.globalAlpha *= opacity;
    renderCtx.strokeStyle = scene.detailColor;
    renderCtx.lineWidth = 0.75;

    for (let index = 0; index < count; index++) {
        const seed = scene.seed * 1181 + seedOffset + index * 29.3;
        const depth = (index + 1) / (count + 1);
        const y = lerp(topY, bottomY, depth);
        const length = width * lerp(0.1, maxWidth, depth) * lerp(0.72, 1.12, hash01(seed + 1));
        const x = hash01(seed) * Math.max(1, width - length);
        const curve = (hash01(seed + 2) - 0.5) * bend * lerp(0.45, 1, depth);

        renderCtx.beginPath();
        renderCtx.moveTo(x, y);
        renderCtx.bezierCurveTo(
            x + length * 0.3,
            y + curve,
            x + length * 0.68,
            y - curve * 0.45,
            x + length,
            y + curve * 0.15
        );
        renderCtx.stroke();
    }

    renderCtx.restore();
}

function drawTerrainRocks(
    renderCtx,
    scene,
    width,
    topY,
    bottomY,
    {
        count = 10,
        opacity = 0.42,
        seedOffset = 0,
        maxSize = 7
    } = {}
) {
    renderCtx.save();
    renderCtx.globalAlpha *= opacity;
    renderCtx.fillStyle = scene.accentColor || scene.detailColor;

    for (let index = 0; index < count; index++) {
        const seed = scene.seed * 1217 + seedOffset + index * 31.7;
        const depth = lerp(0.12, 0.96, hash01(seed + 1));
        const x = hash01(seed) * width;
        const y = lerp(topY, bottomY, depth);
        const size = lerp(1.5, maxSize, depth) * lerp(0.7, 1.15, hash01(seed + 2));

        renderCtx.beginPath();
        renderCtx.moveTo(x - size, y);
        renderCtx.lineTo(x - size * 0.38, y - size * lerp(0.45, 0.82, hash01(seed + 3)));
        renderCtx.lineTo(x + size * 0.42, y - size * lerp(0.36, 0.68, hash01(seed + 4)));
        renderCtx.lineTo(x + size, y);
        renderCtx.closePath();
        renderCtx.fill();
    }

    renderCtx.restore();
}

function drawGrassTufts(
    renderCtx,
    scene,
    width,
    topY,
    bottomY,
    {
        count = 14,
        opacity = 0.46,
        seedOffset = 0,
        maxHeight = 14
    } = {}
) {
    renderCtx.save();
    renderCtx.globalAlpha *= opacity;
    renderCtx.strokeStyle = scene.accentColor || scene.detailColor;
    renderCtx.lineWidth = 0.8;

    for (let index = 0; index < count; index++) {
        const seed = scene.seed * 1237 + seedOffset + index * 17.3;
        const x = hash01(seed) * width;
        const depth = hash01(seed + 1);
        const baseY = lerp(topY, bottomY, depth);
        const tuftHeight = lerp(3, maxHeight, depth) * lerp(0.72, 1.08, hash01(seed + 2));

        renderCtx.beginPath();
        renderCtx.moveTo(x, baseY);
        renderCtx.lineTo(x - tuftHeight * 0.32, baseY - tuftHeight * 0.78);
        renderCtx.moveTo(x, baseY);
        renderCtx.lineTo(x + tuftHeight * 0.06, baseY - tuftHeight);
        renderCtx.moveTo(x, baseY);
        renderCtx.lineTo(x + tuftHeight * 0.38, baseY - tuftHeight * 0.7);
        renderCtx.stroke();
    }

    renderCtx.restore();
}

function drawLakeScene(renderCtx, scene, width, height, horizonY) {
    drawDistantRidge(renderCtx, scene, width, horizonY, {
        amplitude: 40,
        baseOffset: 4,
        pointCount: 12,
        opacity: 0.42,
        seedOffset: 11,
        smooth: true
    });

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
    drawWaterRipples(renderCtx, scene, width, horizonY + 8, height * 0.94, 10, 0.62);

    renderCtx.save();
    renderCtx.globalAlpha *= 0.9;
    renderCtx.fillStyle = scene.groundColor;
    renderCtx.beginPath();
    renderCtx.moveTo(0, height);
    renderCtx.lineTo(0, horizonY + 22);
    renderCtx.quadraticCurveTo(width * 0.1, horizonY + 14, width * 0.2, horizonY + 48);
    renderCtx.quadraticCurveTo(width * 0.28, horizonY + 76, width * 0.36, height);
    renderCtx.closePath();
    renderCtx.fill();
    renderCtx.beginPath();
    renderCtx.moveTo(width, height);
    renderCtx.lineTo(width, horizonY + 18);
    renderCtx.quadraticCurveTo(width * 0.92, horizonY + 12, width * 0.84, horizonY + 38);
    renderCtx.quadraticCurveTo(width * 0.76, horizonY + 68, width * 0.7, height);
    renderCtx.closePath();
    renderCtx.fill();
    renderCtx.restore();

    drawTerrainRocks(renderCtx, scene, width * 0.34, horizonY + 30, height * 0.95, {
        count: 5,
        opacity: 0.34,
        seedOffset: 17,
        maxSize: 4
    });
}

function drawPineScene(renderCtx, scene, width, height, horizonY) {
    const treeScale = clamp(height / 720, 0.78, 1.45);

    drawDistantRidge(renderCtx, scene, width, horizonY, {
        amplitude: 38,
        baseOffset: 6,
        pointCount: 14,
        opacity: 0.34,
        seedOffset: 23
    });

    renderCtx.fillStyle = scene.groundColor;
    renderCtx.beginPath();
    renderCtx.moveTo(0, height);
    renderCtx.lineTo(0, horizonY - 8);
    renderCtx.quadraticCurveTo(width * 0.22, horizonY - 44, width * 0.46, horizonY - 10);
    renderCtx.quadraticCurveTo(width * 0.68, horizonY + 18, width, horizonY - 18);
    renderCtx.lineTo(width, height);
    renderCtx.closePath();
    renderCtx.fill();

    renderCtx.save();
    renderCtx.globalAlpha *= 0.42;
    for (let i = 0; i < 22; i++) {
        const seed = scene.seed * 503 + i * 11.7;
        const x = ((i + hash01(seed) * 0.84) / 22) * width;
        const treeHeight = lerp(22, 54, hash01(seed + 1)) * treeScale;
        const baseY = getPineGroundY(x, width, horizonY) - lerp(1, 7, hash01(seed + 2)) * treeScale;
        drawPineSilhouette(renderCtx, x, baseY, treeHeight, scene.detailColor, seed);
    }
    renderCtx.restore();

    renderCtx.save();
    renderCtx.globalAlpha *= 0.64;
    for (let i = 0; i < 9; i++) {
        const seed = scene.seed * 547 + i * 19.3;
        const x = ((i + hash01(seed) * 0.82) / 9) * width;
        const treeHeight = lerp(50, 94, hash01(seed + 1)) * treeScale;
        const baseY = getPineGroundY(x, width, horizonY) + lerp(2, 9, hash01(seed + 2)) * treeScale;
        drawPineSilhouette(renderCtx, x, baseY, treeHeight, scene.detailColor, seed);
    }
    renderCtx.restore();

    drawGroundContours(renderCtx, scene, width, horizonY + 16, height * 0.94, {
        count: 5,
        opacity: 0.28,
        seedOffset: 29,
        maxWidth: 0.26,
        bend: 4
    });
    drawGrassTufts(renderCtx, scene, width, horizonY + 20, height * 0.96, {
        count: 18,
        opacity: 0.32,
        seedOffset: 31,
        maxHeight: 11
    });
    drawTerrainRocks(renderCtx, scene, width, horizonY + 28, height * 0.96, {
        count: 8,
        opacity: 0.3,
        seedOffset: 41,
        maxSize: 5
    });
}

function drawSaltFlatScene(renderCtx, scene, width, height, horizonY) {
    drawDistantRidge(renderCtx, scene, width, horizonY, {
        amplitude: 24,
        baseOffset: -2,
        pointCount: 12,
        opacity: 0.46,
        seedOffset: 37
    });

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

    renderCtx.save();
    renderCtx.globalAlpha *= 0.58;
    renderCtx.fillStyle = scene.accentColor || scene.detailColor;
    renderCtx.fillRect(0, horizonY + 8, width, 1.4);
    renderCtx.fillRect(width * 0.12, horizonY + 26, width * 0.32, 1);
    renderCtx.fillRect(width * 0.58, horizonY + 20, width * 0.24, 1);
    renderCtx.restore();

    renderCtx.save();
    renderCtx.globalAlpha *= 0.48;
    renderCtx.strokeStyle = scene.accentColor || scene.detailColor;
    renderCtx.lineWidth = 0.8;
    for (let index = 0; index < 9; index++) {
        const seed = scene.seed * 971 + index * 21.1;
        const startX = width * lerp(0.28, 0.72, hash01(seed));
        const endX = width * lerp(-0.08, 1.08, hash01(seed + 1));
        renderCtx.beginPath();
        renderCtx.moveTo(startX, horizonY + 12);
        renderCtx.quadraticCurveTo(
            lerp(startX, endX, 0.45) + width * (hash01(seed + 2) - 0.5) * 0.08,
            lerp(horizonY + 12, height, 0.45),
            endX,
            height
        );
        renderCtx.stroke();
    }
    renderCtx.restore();
    drawWaterRipples(renderCtx, scene, width, horizonY + 12, height * 0.88, 7, 0.36);

    renderCtx.save();
    renderCtx.globalAlpha *= 0.34;
    renderCtx.strokeStyle = scene.accentColor || scene.detailColor;
    renderCtx.lineWidth = 0.65;
    for (let row = 0; row < 4; row++) {
        const depth = (row + 1) / 5;
        const y = lerp(horizonY + 20, height * 0.94, depth);
        const cellWidth = lerp(width * 0.055, width * 0.16, depth);
        const offset = (row % 2) * cellWidth * 0.42;
        for (let x = -cellWidth + offset; x < width + cellWidth; x += cellWidth) {
            const seed = scene.seed * 1291 + row * 31 + x * 0.07;
            renderCtx.beginPath();
            renderCtx.moveTo(x, y);
            renderCtx.lineTo(x + cellWidth * 0.46, y + (hash01(seed) - 0.5) * 2.4);
            renderCtx.lineTo(x + cellWidth, y + lerp(2, 7, depth));
            renderCtx.stroke();
        }
    }
    renderCtx.restore();

}

function drawDuneScene(renderCtx, scene, width, height, horizonY) {
    renderCtx.save();
    renderCtx.globalAlpha *= 0.34;
    renderCtx.fillStyle = scene.detailColor;
    renderCtx.beginPath();
    renderCtx.moveTo(0, height);
    renderCtx.lineTo(0, horizonY + 4);
    renderCtx.bezierCurveTo(width * 0.18, horizonY - 34, width * 0.34, horizonY + 10, width * 0.5, horizonY - 12);
    renderCtx.bezierCurveTo(width * 0.68, horizonY - 38, width * 0.82, horizonY + 8, width, horizonY - 18);
    renderCtx.lineTo(width, height);
    renderCtx.closePath();
    renderCtx.fill();
    renderCtx.restore();

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

    renderCtx.save();
    renderCtx.globalAlpha *= 0.58;
    renderCtx.strokeStyle = scene.detailColor;
    renderCtx.lineWidth = 0.9;
    renderCtx.beginPath();
    renderCtx.moveTo(0, horizonY + 8);
    renderCtx.bezierCurveTo(width * 0.15, horizonY - 18, width * 0.28, horizonY + 22, width * 0.44, horizonY);
    renderCtx.bezierCurveTo(width * 0.56, horizonY - 20, width * 0.76, horizonY + 16, width, horizonY - 8);
    renderCtx.stroke();
    renderCtx.restore();

    drawGroundContours(renderCtx, scene, width, horizonY + 20, height * 0.94, {
        count: 8,
        opacity: 0.34,
        seedOffset: 53,
        maxWidth: 0.38,
        bend: 6
    });
    drawTerrainRocks(renderCtx, scene, width, horizonY + 42, height * 0.96, {
        count: 5,
        opacity: 0.24,
        seedOffset: 59,
        maxSize: 3.8
    });
}

function drawMountainScene(renderCtx, scene, width, height, horizonY) {
    drawDistantRidge(renderCtx, scene, width, horizonY, {
        amplitude: 92,
        baseOffset: 22,
        pointCount: 13,
        opacity: 0.34,
        seedOffset: 61
    });

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

    renderCtx.save();
    renderCtx.globalAlpha *= 0.62;
    renderCtx.fillStyle = scene.detailColor;
    const mountainFacets = [
        [0.28, -92, 0.22, -46, 0.34, -54],
        [0.58, -110, 0.5, -58, 0.64, -50],
        [0.9, -84, 0.84, -42, 0.95, -38]
    ];
    for (const [peakX, peakY, leftX, leftY, rightX, rightY] of mountainFacets) {
        renderCtx.beginPath();
        renderCtx.moveTo(width * peakX, horizonY + peakY);
        renderCtx.lineTo(width * leftX, horizonY + leftY);
        renderCtx.lineTo(width * rightX, horizonY + rightY);
        renderCtx.closePath();
        renderCtx.fill();
    }
    renderCtx.restore();

    renderCtx.save();
    renderCtx.globalAlpha *= 0.32;
    renderCtx.fillStyle = scene.accentColor || scene.detailColor;
    const snowCaps = [
        [0.28, -92, 0.245, -68, 0.302, -72],
        [0.58, -110, 0.548, -82, 0.608, -84],
        [0.9, -84, 0.872, -62, 0.928, -64]
    ];
    for (const [peakX, peakY, leftX, leftY, rightX, rightY] of snowCaps) {
        renderCtx.beginPath();
        renderCtx.moveTo(width * peakX, horizonY + peakY);
        renderCtx.lineTo(width * leftX, horizonY + leftY);
        renderCtx.lineTo(width * peakX, horizonY + leftY + 6);
        renderCtx.lineTo(width * rightX, horizonY + rightY);
        renderCtx.closePath();
        renderCtx.fill();
    }
    renderCtx.restore();

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

    drawGroundContours(renderCtx, scene, width, horizonY + 26, height * 0.96, {
        count: 5,
        opacity: 0.3,
        seedOffset: 67,
        maxWidth: 0.3,
        bend: 5
    });
    drawTerrainRocks(renderCtx, scene, width, horizonY + 34, height * 0.97, {
        count: 9,
        opacity: 0.28,
        seedOffset: 71,
        maxSize: 5.5
    });
}

function drawShorelineScene(renderCtx, scene, width, height, horizonY) {
    drawDistantRidge(renderCtx, scene, width, horizonY, {
        amplitude: 30,
        baseOffset: 2,
        pointCount: 12,
        opacity: 0.36,
        seedOffset: 79,
        smooth: true
    });

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
    drawWaterRipples(renderCtx, scene, width, horizonY + 18, height * 0.94, 11, 0.58);

    renderCtx.save();
    renderCtx.fillStyle = scene.groundColor;
    renderCtx.beginPath();
    renderCtx.moveTo(0, height);
    renderCtx.lineTo(0, horizonY + 34);
    renderCtx.bezierCurveTo(
        width * 0.12,
        horizonY + 30,
        width * 0.24,
        horizonY + 64,
        width * 0.42,
        height
    );
    renderCtx.closePath();
    renderCtx.fill();
    renderCtx.beginPath();
    renderCtx.moveTo(width, height);
    renderCtx.lineTo(width, horizonY + 28);
    renderCtx.quadraticCurveTo(width * 0.9, horizonY + 24, width * 0.82, height);
    renderCtx.closePath();
    renderCtx.fill();

    renderCtx.globalAlpha *= 0.54;
    renderCtx.strokeStyle = scene.accentColor || scene.detailColor;
    renderCtx.lineWidth = 0.9;
    renderCtx.beginPath();
    renderCtx.moveTo(0, horizonY + 34);
    renderCtx.bezierCurveTo(
        width * 0.12,
        horizonY + 30,
        width * 0.24,
        horizonY + 64,
        width * 0.42,
        height
    );
    renderCtx.stroke();
    renderCtx.beginPath();
    renderCtx.moveTo(width, horizonY + 28);
    renderCtx.quadraticCurveTo(width * 0.9, horizonY + 24, width * 0.82, height);
    renderCtx.stroke();
    renderCtx.restore();

    renderCtx.save();
    renderCtx.beginPath();
    renderCtx.moveTo(0, height);
    renderCtx.lineTo(0, horizonY + 34);
    renderCtx.bezierCurveTo(
        width * 0.12,
        horizonY + 30,
        width * 0.24,
        horizonY + 64,
        width * 0.42,
        height
    );
    renderCtx.lineTo(0, height);
    renderCtx.clip();
    drawTerrainRocks(renderCtx, scene, width * 0.44, horizonY + 42, height * 0.97, {
        count: 9,
        opacity: 0.36,
        seedOffset: 83,
        maxSize: 5
    });
    renderCtx.restore();
}

function drawVolcanoScene(renderCtx, scene, width, height, horizonY) {
    drawDistantRidge(renderCtx, scene, width, horizonY, {
        amplitude: 34,
        baseOffset: 10,
        pointCount: 11,
        opacity: 0.3,
        seedOffset: 97
    });

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
    renderCtx.moveTo(width * 0.12, horizonY + 26);
    renderCtx.lineTo(width * 0.34, horizonY + 14);
    renderCtx.lineTo(width * 0.47, horizonY - 102);
    renderCtx.quadraticCurveTo(width * 0.54, horizonY - 128, width * 0.61, horizonY - 106);
    renderCtx.lineTo(width * 0.73, horizonY + 14);
    renderCtx.lineTo(width * 0.92, horizonY + 28);
    renderCtx.lineTo(width * 0.9, height);
    renderCtx.lineTo(width * 0.12, height);
    renderCtx.closePath();
    renderCtx.fill();

    renderCtx.save();
    renderCtx.globalAlpha *= 0.48;
    renderCtx.fillStyle = scene.detailColor;
    renderCtx.beginPath();
    renderCtx.moveTo(width * 0.54, horizonY - 123);
    renderCtx.lineTo(width * 0.47, horizonY - 102);
    renderCtx.lineTo(width * 0.38, horizonY + 12);
    renderCtx.lineTo(width * 0.52, horizonY - 72);
    renderCtx.closePath();
    renderCtx.fill();
    renderCtx.restore();

    renderCtx.fillStyle = scene.accentColor || scene.detailColor;
    renderCtx.beginPath();
    renderCtx.moveTo(width * 0.48, horizonY - 104);
    renderCtx.quadraticCurveTo(width * 0.54, horizonY - 116, width * 0.6, horizonY - 106);
    renderCtx.quadraticCurveTo(width * 0.54, horizonY - 96, width * 0.48, horizonY - 104);
    renderCtx.fill();

    renderCtx.save();
    renderCtx.globalAlpha *= 0.5;
    renderCtx.strokeStyle = scene.accentColor || scene.detailColor;
    renderCtx.lineWidth = 1.15;
    const lavaChannels = [
        [0.525, -101, 0.49, -48, 0.44, 16],
        [0.565, -102, 0.6, -42, 0.67, 18]
    ];
    for (const [startX, startY, midX, midY, endX, endY] of lavaChannels) {
        renderCtx.beginPath();
        renderCtx.moveTo(width * startX, horizonY + startY);
        renderCtx.quadraticCurveTo(width * midX, horizonY + midY, width * endX, horizonY + endY);
        renderCtx.stroke();
    }
    renderCtx.restore();

    drawGroundContours(renderCtx, scene, width, horizonY + 28, height * 0.96, {
        count: 5,
        opacity: 0.28,
        seedOffset: 101,
        maxWidth: 0.3,
        bend: 4
    });
    drawTerrainRocks(renderCtx, scene, width, horizonY + 28, height * 0.97, {
        count: 12,
        opacity: 0.34,
        seedOffset: 103,
        maxSize: 6
    });

    drawFeatheredEllipse(
        renderCtx,
        width * 0.54,
        horizonY - 142,
        58,
        19,
        'rgba(68, 78, 94, 0.24)',
        0.72,
        0.18
    );
    drawFeatheredEllipse(
        renderCtx,
        width * 0.48,
        horizonY - 158,
        46,
        14,
        'rgba(72, 82, 98, 0.2)',
        0.56,
        0.12
    );
}

function drawFjordScene(renderCtx, scene, width, height, horizonY) {
    drawDistantRidge(renderCtx, scene, width, horizonY, {
        amplitude: 76,
        baseOffset: 16,
        pointCount: 13,
        opacity: 0.34,
        seedOffset: 113
    });

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

    renderCtx.save();
    renderCtx.globalAlpha *= 0.52;
    renderCtx.fillStyle = scene.detailColor;
    renderCtx.beginPath();
    renderCtx.moveTo(width * 0.18, horizonY - 120);
    renderCtx.lineTo(width * 0.12, horizonY - 40);
    renderCtx.lineTo(width * 0.31, horizonY + 6);
    renderCtx.closePath();
    renderCtx.fill();
    renderCtx.beginPath();
    renderCtx.moveTo(width * 0.78, horizonY - 112);
    renderCtx.lineTo(width * 0.66, horizonY - 32);
    renderCtx.lineTo(width * 0.58, horizonY + 10);
    renderCtx.closePath();
    renderCtx.fill();
    renderCtx.restore();

    renderCtx.save();
    renderCtx.globalAlpha *= 0.44;
    renderCtx.strokeStyle = scene.detailColor;
    renderCtx.lineWidth = 0.9;
    const cliffStriations = [
        [0.05, -34, 0.11, 46],
        [0.11, -62, 0.18, 32],
        [0.19, -84, 0.28, 18],
        [0.82, -76, 0.68, 24],
        [0.9, -46, 0.76, 42],
        [0.96, -20, 0.84, 54]
    ];
    for (const [startX, startY, endX, endY] of cliffStriations) {
        renderCtx.beginPath();
        renderCtx.moveTo(width * startX, horizonY + startY);
        renderCtx.lineTo(width * endX, horizonY + endY);
        renderCtx.stroke();
    }
    renderCtx.restore();

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
    drawWaterRipples(renderCtx, scene, width, horizonY + 18, height * 0.94, 9, 0.52);

    renderCtx.save();
    renderCtx.globalAlpha *= 0.32;
    renderCtx.strokeStyle = scene.accentColor || scene.detailColor;
    renderCtx.lineWidth = 1;
    renderCtx.beginPath();
    renderCtx.moveTo(width * 0.19, horizonY - 48);
    renderCtx.lineTo(width * 0.23, horizonY + 7);
    renderCtx.stroke();
    renderCtx.beginPath();
    renderCtx.moveTo(width * 0.8, horizonY - 44);
    renderCtx.lineTo(width * 0.75, horizonY + 8);
    renderCtx.stroke();
    renderCtx.restore();
}

function drawTundraScene(renderCtx, scene, width, height, horizonY) {
    drawDistantRidge(renderCtx, scene, width, horizonY, {
        amplitude: 28,
        baseOffset: 4,
        pointCount: 13,
        opacity: 0.36,
        seedOffset: 137,
        smooth: true
    });

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

    renderCtx.save();
    renderCtx.globalAlpha *= 0.54;
    renderCtx.fillStyle = scene.detailColor;
    for (let index = 0; index < 9; index++) {
        const seed = scene.seed * 1009 + index * 23.7;
        const x = hash01(seed) * width;
        const y = horizonY + lerp(24, 72, hash01(seed + 1));
        const radiusX = lerp(5, 14, hash01(seed + 2));
        const radiusY = radiusX * lerp(0.28, 0.5, hash01(seed + 3));
        renderCtx.beginPath();
        renderCtx.ellipse(x, y, radiusX, radiusY, -0.2 + hash01(seed + 4) * 0.4, 0, Math.PI * 2);
        renderCtx.fill();
    }
    renderCtx.restore();

    drawGroundContours(renderCtx, scene, width, horizonY + 20, height * 0.96, {
        count: 5,
        opacity: 0.28,
        seedOffset: 139,
        maxWidth: 0.28,
        bend: 3
    });

    renderCtx.save();
    renderCtx.globalAlpha *= 0.24;
    renderCtx.fillStyle = scene.accentColor || scene.detailColor;
    for (let index = 0; index < 7; index++) {
        const seed = scene.seed * 1301 + index * 27.1;
        const x = hash01(seed) * width;
        const y = horizonY + lerp(34, 80, hash01(seed + 1));
        const radiusX = lerp(10, 28, hash01(seed + 2));
        renderCtx.beginPath();
        renderCtx.ellipse(x, y, radiusX, radiusX * 0.18, 0, 0, Math.PI * 2);
        renderCtx.fill();
    }
    renderCtx.restore();
}

function drawCanyonScene(renderCtx, scene, width, height, horizonY) {
    drawDistantRidge(renderCtx, scene, width, horizonY, {
        amplitude: 48,
        baseOffset: 12,
        pointCount: 12,
        opacity: 0.32,
        seedOffset: 151
    });

    renderCtx.fillStyle = scene.groundColor;
    renderCtx.beginPath();
    renderCtx.moveTo(0, height);
    renderCtx.lineTo(0, horizonY - 10);
    renderCtx.lineTo(width * 0.11, horizonY - 48);
    renderCtx.lineTo(width * 0.27, horizonY - 48);
    renderCtx.lineTo(width * 0.31, horizonY - 22);
    renderCtx.lineTo(width * 0.41, horizonY - 22);
    renderCtx.lineTo(width * 0.46, horizonY - 72);
    renderCtx.lineTo(width * 0.58, horizonY - 72);
    renderCtx.lineTo(width * 0.63, horizonY - 18);
    renderCtx.lineTo(width * 0.77, horizonY - 18);
    renderCtx.lineTo(width * 0.82, horizonY - 54);
    renderCtx.lineTo(width * 0.94, horizonY - 54);
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

    renderCtx.fillRect(width * 0.1, horizonY + 18, width * 0.18, 1.5);
    renderCtx.fillRect(width * 0.62, horizonY + 24, width * 0.22, 1.5);

    renderCtx.save();
    renderCtx.globalAlpha *= 0.56;
    renderCtx.strokeStyle = scene.detailColor;
    renderCtx.lineWidth = 1;
    const strata = [
        [0.02, 0.29, -30],
        [0.04, 0.31, -16],
        [0.13, 0.4, 8],
        [0.45, 0.61, -48],
        [0.47, 0.63, -34],
        [0.64, 0.94, 2],
        [0.7, 0.98, 18]
    ];
    for (const [startX, endX, offsetY] of strata) {
        renderCtx.beginPath();
        renderCtx.moveTo(width * startX, horizonY + offsetY);
        renderCtx.lineTo(width * endX, horizonY + offsetY + 2);
        renderCtx.stroke();
    }
    renderCtx.restore();

    drawGroundContours(renderCtx, scene, width, horizonY + 32, height * 0.96, {
        count: 5,
        opacity: 0.32,
        seedOffset: 157,
        maxWidth: 0.3,
        bend: 4
    });
    drawTerrainRocks(renderCtx, scene, width, horizonY + 34, height * 0.97, {
        count: 11,
        opacity: 0.34,
        seedOffset: 163,
        maxSize: 6
    });
}

function drawJungleScene(renderCtx, scene, width, height, horizonY) {
    const treeScale = clamp(height / 720, 0.78, 1.45);

    drawDistantRidge(renderCtx, scene, width, horizonY, {
        amplitude: 34,
        baseOffset: 2,
        pointCount: 16,
        opacity: 0.3,
        seedOffset: 173,
        smooth: true
    });

    renderCtx.fillStyle = scene.groundColor;
    renderCtx.fillRect(0, horizonY + 24, width, height - horizonY - 24);

    const distantTrees = [];
    const distantTreeCount = Math.round(clamp(width / 78, 11, 18));
    for (let index = 0; index < distantTreeCount; index++) {
        const seed = scene.seed * 1321 + index * 23.9;
        distantTrees.push({
            seed,
            x: ((index + hash01(seed) * 0.86) / distantTreeCount) * width,
            baseY: horizonY + lerp(30, 54, hash01(seed + 1)) * treeScale,
            height: lerp(48, 86, hash01(seed + 2)) * treeScale,
            canopyWidth: lerp(34, 64, hash01(seed + 3)) * treeScale
        });
    }

    renderCtx.save();
    renderCtx.globalAlpha *= 0.48;
    for (const tree of distantTrees) {
        drawBroadleafTreeSilhouette(
            renderCtx,
            scene,
            tree.x,
            tree.baseY,
            tree.height,
            tree.canopyWidth,
            tree.seed
        );
    }
    renderCtx.restore();

    renderCtx.save();
    renderCtx.globalAlpha *= 0.46;
    renderCtx.strokeStyle = scene.accentColor || scene.detailColor;
    renderCtx.lineCap = 'round';
    renderCtx.lineWidth = Math.max(0.7, treeScale);
    const vineCount = Math.min(9, distantTrees.length);
    for (let index = 0; index < vineCount; index++) {
        const tree = distantTrees[(index * 2 + 1) % distantTrees.length];
        const seed = scene.seed * 743 + index * 11.1;
        const anchorX = tree.x + (hash01(seed) - 0.5) * tree.canopyWidth * 0.72;
        const anchorY = tree.baseY - tree.height * 0.78 +
            (hash01(seed + 1) - 0.5) * tree.canopyWidth * 0.18;
        const drop = lerp(28, 74, hash01(seed + 2)) * treeScale;
        const sway = lerp(-18, 18, hash01(seed + 3)) * treeScale;
        renderCtx.beginPath();
        renderCtx.moveTo(anchorX, anchorY);
        renderCtx.bezierCurveTo(
            anchorX - sway * 0.15,
            anchorY + drop * 0.32,
            anchorX + sway,
            anchorY + drop * 0.68,
            anchorX + sway * 0.58,
            anchorY + drop
        );
        renderCtx.stroke();
    }
    renderCtx.restore();

    const foregroundTreeCount = Math.round(clamp(width / 190, 5, 9));
    renderCtx.save();
    renderCtx.globalAlpha *= 0.7;
    for (let index = 0; index < foregroundTreeCount; index++) {
        const seed = scene.seed * 709 + index * 31.3;
        const x = ((index + hash01(seed) * 0.8) / foregroundTreeCount) * width;
        drawBroadleafTreeSilhouette(
            renderCtx,
            scene,
            x,
            horizonY + lerp(44, 76, hash01(seed + 1)) * treeScale,
            lerp(72, 122, hash01(seed + 2)) * treeScale,
            lerp(58, 96, hash01(seed + 3)) * treeScale,
            seed
        );
    }
    renderCtx.restore();

    renderCtx.save();
    renderCtx.globalAlpha *= 0.42;
    renderCtx.fillStyle = scene.accentColor || scene.detailColor;
    for (let index = 0; index < 16; index++) {
        const seed = scene.seed * 1361 + index * 19.7;
        const side = index % 2;
        const edgeSpan = width * lerp(0.12, 0.24, hash01(seed + 1));
        const x = side === 0 ? hash01(seed) * edgeSpan : width - hash01(seed) * edgeSpan;
        const y = horizonY + lerp(30, 84, hash01(seed + 2)) * treeScale;
        const leafLength = lerp(7, 18, hash01(seed + 3)) * treeScale;
        const angle = lerp(-1.15, 1.15, hash01(seed + 3));

        renderCtx.beginPath();
        renderCtx.ellipse(
            x,
            y,
            leafLength,
            leafLength * 0.34,
            angle,
            0,
            Math.PI * 2
        );
        renderCtx.fill();
        renderCtx.beginPath();
        renderCtx.ellipse(
            x + Math.cos(angle) * leafLength * 0.65,
            y + Math.sin(angle) * leafLength * 0.65,
            leafLength * 0.72,
            leafLength * 0.26,
            -angle,
            0,
            Math.PI * 2
        );
        renderCtx.fill();
    }
    renderCtx.restore();

    drawGroundContours(renderCtx, scene, width, horizonY + 34, height * 0.96, {
        count: 4,
        opacity: 0.22,
        seedOffset: 179,
        maxWidth: 0.24,
        bend: 5
    });
}

function drawGlacierScene(renderCtx, scene, width, height, horizonY) {
    drawDistantRidge(renderCtx, scene, width, horizonY, {
        amplitude: 42,
        baseOffset: 10,
        pointCount: 14,
        opacity: 0.32,
        seedOffset: 191
    });

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

    renderCtx.save();
    renderCtx.globalAlpha *= 0.56;
    renderCtx.fillStyle = scene.accentColor || scene.detailColor;
    const iceFacets = [
        [0.12, -12, 0.05, 22, 0.2, 12],
        [0.4, -28, 0.3, 10, 0.49, 4],
        [0.72, -20, 0.62, 12, 0.8, 8]
    ];
    for (const [peakX, peakY, leftX, leftY, rightX, rightY] of iceFacets) {
        renderCtx.beginPath();
        renderCtx.moveTo(width * peakX, horizonY + peakY);
        renderCtx.lineTo(width * leftX, horizonY + leftY);
        renderCtx.lineTo(width * rightX, horizonY + rightY);
        renderCtx.closePath();
        renderCtx.fill();
    }

    renderCtx.strokeStyle = scene.accentColor || scene.detailColor;
    renderCtx.lineWidth = 0.8;
    for (let index = 0; index < 7; index++) {
        const seed = scene.seed * 1031 + index * 19.9;
        const x = width * lerp(0.08, 0.92, hash01(seed));
        const y = horizonY + lerp(18, 64, hash01(seed + 1));
        renderCtx.beginPath();
        renderCtx.moveTo(x, y);
        renderCtx.lineTo(x + lerp(-18, 18, hash01(seed + 2)), y + lerp(8, 22, hash01(seed + 3)));
        renderCtx.lineTo(x + lerp(-10, 10, hash01(seed + 4)), y + lerp(18, 34, hash01(seed + 5)));
        renderCtx.stroke();
    }
    renderCtx.restore();

    renderCtx.save();
    renderCtx.globalAlpha *= 0.5;
    renderCtx.strokeStyle = scene.accentColor || scene.detailColor;
    renderCtx.lineWidth = 0.9;
    renderCtx.beginPath();
    renderCtx.moveTo(0, horizonY + 20);
    renderCtx.lineTo(width * 0.12, horizonY - 12);
    renderCtx.lineTo(width * 0.24, horizonY + 6);
    renderCtx.lineTo(width * 0.4, horizonY - 28);
    renderCtx.lineTo(width * 0.56, horizonY + 10);
    renderCtx.lineTo(width * 0.72, horizonY - 20);
    renderCtx.lineTo(width * 0.9, horizonY + 14);
    renderCtx.lineTo(width, horizonY - 4);
    renderCtx.stroke();
    renderCtx.restore();

    drawGroundContours(renderCtx, scene, width, horizonY + 30, height * 0.95, {
        count: 5,
        opacity: 0.3,
        seedOffset: 197,
        maxWidth: 0.28,
        bend: 2.5
    });

    renderCtx.save();
    renderCtx.globalAlpha *= 0.32;
    renderCtx.fillStyle = scene.accentColor || scene.detailColor;
    for (let index = 0; index < 6; index++) {
        const seed = scene.seed * 1381 + index * 37.7;
        const x = hash01(seed) * width;
        const y = horizonY + lerp(42, 86, hash01(seed + 1));
        const size = lerp(5, 14, hash01(seed + 2));
        renderCtx.beginPath();
        renderCtx.moveTo(x - size, y);
        renderCtx.lineTo(x - size * 0.3, y - size * 0.42);
        renderCtx.lineTo(x + size * 0.78, y - size * 0.18);
        renderCtx.lineTo(x + size, y);
        renderCtx.closePath();
        renderCtx.fill();
    }
    renderCtx.restore();
}

function drawMarshScene(renderCtx, scene, width, height, horizonY) {
    drawDistantRidge(renderCtx, scene, width, horizonY, {
        amplitude: 20,
        baseOffset: 2,
        pointCount: 14,
        opacity: 0.32,
        seedOffset: 211,
        smooth: true
    });

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

    renderCtx.save();
    renderCtx.globalAlpha *= 0.72;
    renderCtx.fillStyle = scene.groundColor;
    renderCtx.beginPath();
    renderCtx.ellipse(width * 0.22, horizonY + 34, width * 0.16, 9, -0.05, 0, Math.PI * 2);
    renderCtx.ellipse(width * 0.58, horizonY + 46, width * 0.2, 11, 0.03, 0, Math.PI * 2);
    renderCtx.ellipse(width * 0.86, horizonY + 28, width * 0.11, 7, -0.08, 0, Math.PI * 2);
    renderCtx.fill();
    renderCtx.restore();

    renderCtx.save();
    renderCtx.globalAlpha *= 0.46;
    renderCtx.fillStyle = scene.accentColor || scene.detailColor;
    const marshIslands = [
        [0.1, 24, 0.11, 5],
        [0.39, 32, 0.13, 6],
        [0.74, 22, 0.1, 5],
        [0.91, 46, 0.08, 4]
    ];
    for (const [x, yOffset, radiusX, radiusY] of marshIslands) {
        renderCtx.beginPath();
        renderCtx.ellipse(width * x, horizonY + yOffset, width * radiusX, radiusY, 0, 0, Math.PI * 2);
        renderCtx.fill();
    }
    renderCtx.restore();

    drawWaterRipples(renderCtx, scene, width, horizonY + 14, height * 0.9, 9, 0.44);

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

        if (i < 12) {
            renderCtx.fillStyle = scene.accentColor || scene.detailColor;
            renderCtx.beginPath();
            renderCtx.ellipse(
                x + lerp(-4, 4, hash01(seed + 3)),
                tipY + 2,
                1.5,
                3.8,
                -0.12 + hash01(seed + 4) * 0.24,
                0,
                Math.PI * 2
            );
            renderCtx.fill();
        }
    }

    drawGrassTufts(renderCtx, scene, width, horizonY + 24, height * 0.94, {
        count: 12,
        opacity: 0.3,
        seedOffset: 223,
        maxHeight: 13
    });
}

function drawCliffScene(renderCtx, scene, width, height, horizonY) {
    drawDistantRidge(renderCtx, scene, width, horizonY, {
        amplitude: 54,
        baseOffset: 10,
        pointCount: 12,
        opacity: 0.3,
        seedOffset: 233
    });

    renderCtx.fillStyle = scene.groundColor;
    renderCtx.fillRect(0, horizonY + 12, width, height - horizonY - 12);

    renderCtx.beginPath();
    renderCtx.moveTo(0, height);
    renderCtx.lineTo(0, horizonY - 70);
    renderCtx.lineTo(width * 0.08, horizonY - 94);
    renderCtx.lineTo(width * 0.18, horizonY - 124);
    renderCtx.lineTo(width * 0.21, horizonY - 86);
    renderCtx.lineTo(width * 0.23, horizonY - 24);
    renderCtx.lineTo(width * 0.28, horizonY - 8);
    renderCtx.lineTo(width * 0.32, horizonY + 12);
    renderCtx.lineTo(width * 0.32, height);
    renderCtx.closePath();
    renderCtx.fill();

    renderCtx.beginPath();
    renderCtx.moveTo(width * 0.58, height);
    renderCtx.lineTo(width * 0.58, horizonY - 48);
    renderCtx.lineTo(width * 0.64, horizonY - 72);
    renderCtx.lineTo(width * 0.74, horizonY - 106);
    renderCtx.lineTo(width * 0.78, horizonY - 74);
    renderCtx.lineTo(width * 0.81, horizonY - 18);
    renderCtx.lineTo(width * 0.86, horizonY - 6);
    renderCtx.lineTo(width * 0.9, horizonY + 12);
    renderCtx.lineTo(width * 0.9, height);
    renderCtx.closePath();
    renderCtx.fill();

    renderCtx.beginPath();
    renderCtx.moveTo(width * 0.43, height);
    renderCtx.lineTo(width * 0.45, horizonY + 10);
    renderCtx.lineTo(width * 0.48, horizonY - 18);
    renderCtx.lineTo(width * 0.51, horizonY + 8);
    renderCtx.lineTo(width * 0.54, height);
    renderCtx.closePath();
    renderCtx.fill();

    renderCtx.save();
    renderCtx.globalAlpha *= 0.34;
    renderCtx.fillStyle = scene.detailColor;
    const cliffFacets = [
        [0.08, -94, 0.18, -124, 0.2, -12],
        [0.18, -124, 0.23, -24, 0.28, -8],
        [0.64, -72, 0.74, -106, 0.77, -6],
        [0.74, -106, 0.81, -18, 0.86, -6]
    ];
    for (const [ax, ay, bx, by, cx, cy] of cliffFacets) {
        renderCtx.beginPath();
        renderCtx.moveTo(width * ax, horizonY + ay);
        renderCtx.lineTo(width * bx, horizonY + by);
        renderCtx.lineTo(width * cx, horizonY + cy);
        renderCtx.closePath();
        renderCtx.fill();
    }
    renderCtx.restore();

    renderCtx.fillStyle = scene.detailColor;
    renderCtx.fillRect(width * 0.32, horizonY + 20, width * 0.11, 1.5);
    renderCtx.fillRect(width * 0.54, horizonY + 18, width * 0.04, 1.5);
    renderCtx.fillRect(width * 0.9, horizonY + 18, width * 0.1, 1.5);

    renderCtx.save();
    renderCtx.globalAlpha *= 0.56;
    renderCtx.strokeStyle = scene.detailColor;
    renderCtx.lineWidth = 1;
    const cliffMarks = [
        [0.06, -78, 0.1, 18],
        [0.15, -102, 0.2, -8],
        [0.64, -72, 0.7, 6],
        [0.74, -94, 0.79, -10]
    ];
    for (const [startX, startY, endX, endY] of cliffMarks) {
        renderCtx.beginPath();
        renderCtx.moveTo(width * startX, horizonY + startY);
        renderCtx.lineTo(width * endX, horizonY + endY);
        renderCtx.stroke();
    }
    renderCtx.restore();
    drawWaterRipples(renderCtx, scene, width, horizonY + 20, height * 0.92, 7, 0.36);

    renderCtx.save();
    renderCtx.globalAlpha *= 0.34;
    renderCtx.strokeStyle = scene.accentColor || scene.detailColor;
    renderCtx.lineWidth = 0.8;
    const ledges = [
        [0.01, 0.2, -66],
        [0.04, 0.22, -42],
        [0.6, 0.8, -44],
        [0.66, 0.82, -24]
    ];
    for (const [startX, endX, offsetY] of ledges) {
        renderCtx.beginPath();
        renderCtx.moveTo(width * startX, horizonY + offsetY);
        renderCtx.lineTo(width * endX, horizonY + offsetY + 2);
        renderCtx.stroke();
    }
    renderCtx.restore();
}

function drawSceneScenery(renderCtx, scene, width, height) {
    const horizonY = height * scene.horizon;
    drawLandscapeHaze(renderCtx, scene, width, height, horizonY);

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

    drawForegroundShade(renderCtx, width, height, horizonY);
}

function drawSceneLightning(renderCtx, scene, sceneIndex, width, height) {
    const state = weatherSceneStates[sceneIndex];
    if (!state || state.flash < 0.025) return;

    const intensity = clamp(state.flash, 0, 1);
    const boltStartX = width * state.boltX;
    const glowRadius = Math.max(width, height) * 0.62;
    const glow = renderCtx.createRadialGradient(
        boltStartX,
        height * 0.08,
        0,
        boltStartX,
        height * 0.08,
        glowRadius
    );
    glow.addColorStop(0, `rgba(164, 190, 230, ${intensity * 0.055})`);
    glow.addColorStop(0.46, `rgba(126, 158, 206, ${intensity * 0.018})`);
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    renderCtx.fillStyle = glow;
    renderCtx.fillRect(0, 0, width, height);

    const points = [];
    let x = boltStartX;
    let y = height * 0.04;
    points.push({ x, y });

    for (let step = 0; step < 7; step++) {
        x += width * (state.boltLean * 0.06 + (hash01(scene.seed * 733 + step * 1.91) - 0.5) * 0.07);
        y += height * (0.06 + hash01(scene.seed * 811 + step * 2.17) * 0.06);
        points.push({ x, y });
    }

    const strokeBolt = (color, lineWidth) => {
        renderCtx.strokeStyle = color;
        renderCtx.lineWidth = lineWidth;
        renderCtx.beginPath();
        renderCtx.moveTo(points[0].x, points[0].y);
        for (let index = 1; index < points.length; index++) {
            renderCtx.lineTo(points[index].x, points[index].y);
        }
        renderCtx.stroke();
    };

    strokeBolt(`rgba(150, 180, 225, ${intensity * 0.09})`, 5 + intensity * 2);
    strokeBolt(`rgba(222, 232, 248, ${intensity * 0.46})`, 1.1 + intensity * 0.75);

    const branchStart = points[3];
    renderCtx.strokeStyle = `rgba(205, 220, 243, ${intensity * 0.2})`;
    renderCtx.lineWidth = 0.8 + intensity * 0.35;
    renderCtx.beginPath();
    renderCtx.moveTo(branchStart.x, branchStart.y);
    renderCtx.lineTo(
        branchStart.x + width * (state.boltLean * 0.035 - 0.035),
        branchStart.y + height * 0.07
    );
    renderCtx.lineTo(
        branchStart.x + width * (state.boltLean * 0.05 - 0.018),
        branchStart.y + height * 0.13
    );
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
    drawSceneFog(renderCtx, scene, width, height, timeSeconds);
    drawSceneScenery(renderCtx, scene, width, height);
    drawSceneRain(renderCtx, scene, width, height, timeSeconds);
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
    vignette.addColorStop(1, 'rgba(0, 0, 0, 0.43)');
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
    stowCanvas = document.getElementById('stow-canvas');
    weatherCanvas = document.getElementById('weather-backdrop');
    if (!tetrisCanvas || !nextCanvas || !stowCanvas || !weatherCanvas) return;

    ctx = tetrisCanvas.getContext('2d');
    nextCtx = nextCanvas.getContext('2d');
    stowCtx = stowCanvas.getContext('2d');
    weatherCtx = weatherCanvas.getContext('2d');

    resizeWeatherCanvas();
    syncTouchDeviceState();
    syncGameCanvasResolution();
    syncTouchControlsMetrics();
    window.addEventListener('resize', resizeWeatherCanvas);
    window.addEventListener('resize', syncTouchDeviceState);
    window.addEventListener('resize', scheduleGameCanvasResolutionSync);
    window.addEventListener('resize', syncTouchControlsMetrics);
    window.visualViewport?.addEventListener('resize', syncTouchControlsMetrics);
    window.visualViewport?.addEventListener('scroll', syncTouchControlsMetrics);

    if (window.ResizeObserver && !touchControlsResizeObserver && gameContainerEl && touchControlsShell) {
        touchControlsResizeObserver = new ResizeObserver(() => {
            syncTouchControlsMetrics();
        });
        touchControlsResizeObserver.observe(gameContainerEl);
        touchControlsResizeObserver.observe(touchControlsShell);
        touchControlsResizeObserver.observe(document.body);
    }

    document.getElementById('start-btn').addEventListener('click', restartGame);
    document.getElementById('pause-btn').addEventListener('click', togglePause);
    requestWebsiteFullscreenState();
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
    resetPieceLockState();
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
    clearingRows = null;
    pendingScoreData = null;
    isFlashing = false;
    flashCount = 0;
    lastFlashTime = 0;
    nextFlashing = false;
    nextFlashCount = 0;
    lastNextFlashTime = 0;
    gameOver = false;
    isPaused = true;
    gameSpeed = 1000;
    resetPieceLockState();
    updateStats();
    if (isColliding()) gameOver = true;
    ghostPiece = null;
    lastStowTime = 0;
    holdLockActive = false;
    holdLockEndTime = 0;
    suspendAudioContext();
    configureWeatherCycle(now);
    updatePauseButton();
    updatePauseOverlay();
    drawWeatherBackdrop(now);
}

function restartGame() {
    resetGame();
    isPaused = false;
    primeAudioContext();
    updatePauseButton();
    updatePauseOverlay();
    dropStart = performance.now();
    lastTime = performance.now();
}

function updatePauseButton() {
    pauseBtn.textContent = isPaused ? 'Resume' : 'Pause';
}

function updatePauseOverlay() {
    if (!pauseOverlay) return;
    pauseOverlay.hidden = !isPaused || gameOver;
    updateGameZoomControls();
}

function togglePause() {
    if (gameOver) return;
    isPaused = !isPaused;
    if (isPaused) {
        suspendAudioContext();
    } else {
        primeAudioContext();
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
    ctx.clearRect(0,0,BOARD_LOGICAL_WIDTH,BOARD_LOGICAL_HEIGHT);
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
                        ctx.fillRect(0,row*BLOCK_SIZE,BOARD_LOGICAL_WIDTH,BLOCK_SIZE);
                }
}
function drawNextPiece(){
    nextCtx.clearRect(0,0,PREVIEW_LOGICAL_SIZE,PREVIEW_LOGICAL_SIZE);
    if(!nextPiece)return;
    const shape = nextPiece.shape;
    const shapeWidth = shape[0].length;
    const shapeHeight = shape.length;
    const offsetX=Math.floor((PREVIEW_LOGICAL_SIZE - BLOCK_SIZE*shapeWidth)/2);
    const offsetY=Math.floor((PREVIEW_LOGICAL_SIZE - BLOCK_SIZE*shapeHeight)/2);
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
        nextCtx.fillRect(0,0,PREVIEW_LOGICAL_SIZE,PREVIEW_LOGICAL_SIZE);
    }
}
/* ────────────────────── STOW BOX DRAWING ───────────────────── */
function drawStowPiece(){
    if (!stowCanvas || !stowCtx) return;

    stowCtx.clearRect(0, 0, PREVIEW_LOGICAL_SIZE, PREVIEW_LOGICAL_SIZE);

    if (gameOver) {
        stowCtx.font = 'bold 18px Arial';
        stowCtx.fillStyle = 'red';
        stowCtx.textAlign = 'center';
        stowCtx.textBaseline = 'middle';
        stowCtx.fillText('GAME OVER', PREVIEW_LOGICAL_SIZE / 2, PREVIEW_LOGICAL_SIZE / 2);
        return;   // skip the rest of the function
    }

    if (stowedPiece) {
        const shape = stowedPiece.shape;
        const shapeWidth = shape[0].length;
        const shapeHeight = shape.length;
        const offsetX = Math.floor((PREVIEW_LOGICAL_SIZE - BLOCK_SIZE * shapeWidth) / 2);
        const offsetY = Math.floor((PREVIEW_LOGICAL_SIZE - BLOCK_SIZE * shapeHeight) / 2);

        for (let y = 0; y < shape.length; y++) {
            for (let x = 0; x < shape[y].length; x++) {
                if (shape[y][x]) {
                    stowCtx.fillStyle = COLORS[shape[y][x]];
                    stowCtx.fillRect(offsetX + x * BLOCK_SIZE,
                                     offsetY + y * BLOCK_SIZE,
                                     BLOCK_SIZE - 1, BLOCK_SIZE - 1);
                }
            }
        }
    }

    /* Countdown when a piece is held  */
    if (!stowedPiece && holdLockActive) {
        const remaining = Math.max(0, Math.ceil((holdLockEndTime - performance.now()) / 1000));
        stowCtx.font = 'bold 24px Arial';
        stowCtx.fillStyle = 'red';
        stowCtx.textAlign = 'center';
        stowCtx.textBaseline = 'middle';
        stowCtx.fillText(remaining.toString(), PREVIEW_LOGICAL_SIZE / 2, PREVIEW_LOGICAL_SIZE / 2);
    }
}

/* ────────────────────── GAME LOGIC ───────────────────── */
function rotate(){
    if(!currentPiece)return;
    const wasGrounded=isGrounded();
    const orig=JSON.parse(JSON.stringify(currentPiece.shape));
    for(let y=0;y<currentPiece.shape.length;y++)
        for(let x=0;x<y;x++){
            [currentPiece.shape[x][y],currentPiece.shape[y][x]]=[currentPiece.shape[y][x],currentPiece.shape[x][y]];
        }
        currentPiece.shape=currentPiece.shape.map(r=>r.reverse());
    if(isColliding()) currentPiece.shape = orig;
    else {
        noteGroundAdjustment(wasGrounded);
        playSound('ROTATE');
    }
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

    const wasGrounded=dx!==0&&dy===0&&isGrounded();
    currentPiece.position.x+=dx;
    currentPiece.position.y+=dy;

    if(isColliding()){
        currentPiece.position.x-=dx;
        currentPiece.position.y-=dy;
        return false;
    }

    if(dx!==0&&dy===0)noteGroundAdjustment(wasGrounded);
    if (!suppressDropSound) playSound('DROP');
    return true;
}

function resetPieceLockState(){
    groundedAt=null;
    lockResetCount=0;
}

function isGrounded(piece=currentPiece){
    if(!piece)return false;
    piece.position.y++;
    const grounded=isColliding(piece);
    piece.position.y--;
    return grounded;
}

function noteGroundAdjustment(wasGrounded){
    if(!wasGrounded||groundedAt===null||lockResetCount>=MAX_LOCK_RESETS)return;
    groundedAt=performance.now();
    lockResetCount++;
}

function updatePieceLock(ts){
    if(!currentPiece)return;
    if(!isGrounded()){
        groundedAt=null;
        return;
    }

    if(groundedAt===null){
        groundedAt=ts;
        return;
    }

    const effectiveLockDelay=Math.max(LOCK_DELAY_MS,gameSpeed);
    if(ts-groundedAt>=effectiveLockDelay)lockPiece();
}

function hardDrop(){
    // mute DROP while the piece is falling rapidly
    while(movePiece(0,1,true)){}
    lockPiece();               // finally drop the piece into place
}

function finishGame(){
    if(gameOver)return;
    gameOver=true;
    triggerEyeDown();
    playSound('GAME_OVER');
    updatePauseOverlay();
}

function advancePieceQueue(){
    currentPiece=nextPiece;
    activateCurrentPiece();
    nextPiece=generateRandomPiece();
    lastStowTime=0;
    dropStart=performance.now();
    if(isColliding())finishGame();
}

function lockPiece(){
    if(!currentPiece)return;
    for(let y=0;y<currentPiece.shape.length;y++) {
        for(let x=0;x<currentPiece.shape[y].length;x++) {
            if(!currentPiece.shape[y][x]) continue;

            const by=currentPiece.position.y+y,bx=currentPiece.position.x+x;
            if(by>=0)board[by][bx]=currentPiece.shape[y][x];
        }
    }

    const hasPendingClear=checkLines();
    resetPieceLockState();
    if(hasPendingClear){
        currentPiece=null;
        ghostPiece=null;
        return;
    }
    advancePieceQueue();
}
function stowOrUnstowPiece(){
    if(!currentPiece||isFlashing)return;
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
        advancePieceQueue();
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
        return true;
    }
    return false;
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
    advancePieceQueue();
}

/* ────────────────────── GAME LOOP ───────────────────── */
function gameLoop(ts){
    requestAnimationFrame(gameLoop);
    drawWeatherBackdrop(ts);
    if(isPaused||gameOver)return;

    if(holdLockActive&&performance.now()>=holdLockEndTime)holdLockActive=false;
    if(nextFlashing&&ts-lastNextFlashTime>FLASH_INTERVAL_MS){
        nextFlashCount++;lastNextFlashTime=ts;
        if(nextFlashCount>=4)nextFlashing=false;
    }
    if(isFlashing){drawBoard();drawNextPiece();drawStowPiece();
        if(ts-lastFlashTime>FLASH_INTERVAL_MS){flashCount++;lastFlashTime=ts; if(flashCount>=4)finalizeClearing();}
        return;}

    lastTime=ts;
    if(!currentPiece&&stowedPiece){
        currentPiece=JSON.parse(JSON.stringify(stowedPiece));
        stowedPiece=null;
        activateCurrentPiece();
        if(isColliding())finishGame();
        drawStowPiece();
    }
    if(currentPiece&&ts-dropStart>gameSpeed){
        movePiece(0,1);
        dropStart=ts;
    }
    updatePieceLock(ts);
    updateGhostPiece();drawBoard();drawNextPiece();drawStowPiece();
}

/* ────────────────────── INPUT HANDLING ───────────────── */
function setupInput() {
    document.addEventListener('keydown', e => {
        if (isPaused || gameOver || isFlashing || !currentPiece) return;

        const action = KEY_MAP[e.key];
        if (!action) return;

        primeAudioContext();
        action();
    });
}

/* ────────────────────── SOUND SYSTEM ───────────────────── */
function ensureAudioContext() {
    if (!audioAvailable) return null;
    if (audioContext) return audioContext;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
        audioAvailable = false;
        return null;
    }

    try {
        audioContext = new AudioContextClass();
        audioMasterGain = audioContext.createGain();
        audioMasterGain.gain.value = 0.5;
        audioMasterGain.connect(audioContext.destination);
    } catch (error) {
        audioAvailable = false;
        audioContext = null;
        audioMasterGain = null;
    }

    return audioContext;
}

function cleanupVoice(voice) {
    if (!activeSoundVoices.delete(voice)) return;

    try {
        voice.oscillator.disconnect();
    } catch (error) {}

    try {
        voice.gainNode.disconnect();
    } catch (error) {}
}

function stopAllSounds() {
    for (const voice of Array.from(activeSoundVoices)) {
        try {
            voice.oscillator.stop();
        } catch (error) {}
        cleanupVoice(voice);
    }
}

function suspendAudioContext() {
    stopAllSounds();
    if (!audioContext || audioContext.state === 'closed') return;
    if (audioContext.state === 'running') {
        audioContext.suspend().catch(() => {});
    }
}

function primeAudioContext() {
    const context = ensureAudioContext();
    if (!context || context.state === 'closed') return;
    if (context.state !== 'running') {
        context.resume().catch(() => {});
    }
}

function registerVoice(oscillator, gainNode) {
    const voice = { oscillator, gainNode };
    activeSoundVoices.add(voice);
    oscillator.addEventListener('ended', () => cleanupVoice(voice), { once: true });
}

function playComplexSound({ frequencies = [], durations = [], decay = false }) {
    if (!audioContext || !audioMasterGain) return;

    const startTime = audioContext.currentTime;
    frequencies.forEach((frequency, index) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        const duration = durations[index] || 0.5;
        const endTime = startTime + duration;

        gainNode.gain.setValueAtTime(0.5, startTime);
        gainNode.connect(audioMasterGain);
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, startTime);
        oscillator.connect(gainNode);

        registerVoice(oscillator, gainNode);
        oscillator.start(startTime);

        if (decay) {
            gainNode.gain.exponentialRampToValueAtTime(0.001, endTime);
        }

        oscillator.stop(endTime);
    });
}

function playSound(soundName) {
    if (isPaused) return;

    const context = ensureAudioContext();
    const config = SOUND_CONFIG[soundName];
    if (!context || !audioMasterGain || !config || context.state !== 'running') return;

    const volume = config.volume ?? 0.5;
    audioMasterGain.gain.value = volume * 0.5;

    if (config.type === 'complex') {
        playComplexSound(config);
        return;
    }

    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    const duration = config.duration || 0.2;
    const endTime = context.currentTime + duration;

    gainNode.gain.setValueAtTime(volume, context.currentTime);
    gainNode.connect(audioMasterGain);

    oscillator.type = config.type || 'sine';
    if (config.detune) {
        oscillator.detune.value = config.detune;
    }
    oscillator.frequency.setValueAtTime(
        (config.frequency || 440) + (Math.random() * 20 - 10),
        context.currentTime
    );
    oscillator.connect(gainNode);

    registerVoice(oscillator, gainNode);
    oscillator.start();
    gainNode.gain.exponentialRampToValueAtTime(0.001, endTime);
    oscillator.stop(endTime);
}


window.addEventListener('load',()=>{
    init();setupInput();requestAnimationFrame(gameLoop);resetGame();
});
