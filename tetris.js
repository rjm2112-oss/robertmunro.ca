/* tetris.js --------------------------------------------------------------*/

const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;

/* ---------- Colors & Shapes ------------------------------------------- */
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
    null,
[[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
[[2, 0, 0], [2, 2, 2], [0, 0, 0]],
[[0, 0, 3], [3, 3, 3], [0, 0, 0]],
[[4, 4], [4, 4]],   // <-- updated O‑piece (true 2×2 block)
[[0, 5, 5], [5, 5, 0], [0, 0, 0]],
[[0, 6, 0], [6, 6, 6], [0, 0, 0]],
[[7, 7, 0], [0, 7, 7], [0, 0, 0]]
];

/* ---------- Game state ----------------------------------------------- */
let board = Array(ROWS).fill().map(() => Array(COLS).fill(0));
let currentPiece = null;
let nextPiece = null;
let score = 0;
let level = 1;
let lines = 0;
let gameOver = false;
let isPaused = false;
let dropStart = 0;
let lastTime = 0;
let gameSpeed = 1000;   // ms per automatic row drop

let ctx, nextCtx, tetrisCanvas, nextCanvas;

/* ---------- Flashing / Clearing --------------------------------------- */
let clearingRows = null;
let flashCount = 0;
let lastFlashTime = 0;
let isFlashing = false;
let pendingScoreData = null;

const FLASH_INTERVAL_MS = 120;

/* ---------- Counter for colour changes ------------------------------- */
let rowsClearedSinceLastChange = 0;   // <-- NEW

/* ------------------------------------------------------------------------ */
/* ----------  Eye‑colour helpers --------------------------------------- */
const MAX_HUE = 360;          // degrees in a colour wheel
let currentHue = 0;           // start with the original hue

/**
 * Pick a new hue and apply it to the iris.
 * The change is random but stays within natural‑eye ranges (≈30–120°).
 */
function changeEyeColor() {
    const step = Math.floor(Math.random() * 90) + 30;   // 30 – 119°
    currentHue = (currentHue + step) % MAX_HUE;

    const iris = document.querySelector('.iris');
    if (iris) {
        iris.style.filter = `hue-rotate(${currentHue}deg)`;
    }
}

/* ------------------------------------------------------------------------ */
/* ---------- New helper: map level → drop speed -------------------------- */
function getSpeedForLevel(lvl) {
    // Base speed at level 1 is 1000 ms.
    // Each subsequent level multiplies the base by `speedFactor`.
    const speedFactor = 0.9;          // < 1 → faster each level

    return Math.max(200, 1000 * Math.pow(speedFactor, lvl - 1));
}
/* ------------------------------------------------------------------------ */
/* ---------- Initialization ------------------------------------------------ */
function init() {
    tetrisCanvas = document.getElementById('tetris-board');
    nextCanvas   = document.getElementById('next-canvas');

    if (!tetrisCanvas || !nextCanvas) return;

    ctx = tetrisCanvas.getContext('2d');
    nextCtx = nextCanvas.getContext('2d');

    document.getElementById('start-btn').addEventListener('click', restartGame);
    document.getElementById('pause-btn').addEventListener('click', togglePause);

    resetGame();
}

/* ---------- Rendering ---------------------------------------------------- */
function drawBoard() {
    ctx.clearRect(0, 0, tetrisCanvas.width, tetrisCanvas.height);

    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            if (board[y][x]) {
                ctx.fillStyle = COLORS[board[y][x]];
                ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE,
                             BLOCK_SIZE - 1, BLOCK_SIZE - 1);
            }
        }
    }

    // Draw the moving piece
    if (currentPiece) {
        for (let y = 0; y < currentPiece.shape.length; y++) {
            for (let x = 0; x < currentPiece.shape[y].length; x++) {
                if (!currentPiece.shape[y][x]) continue;
                ctx.fillStyle = COLORS[currentPiece.shape[y][x]];
                ctx.fillRect(
                    (currentPiece.position.x + x) * BLOCK_SIZE,
                             (currentPiece.position.y + y) * BLOCK_SIZE,
                             BLOCK_SIZE - 1, BLOCK_SIZE - 1
                );
            }
        }
    }

    // If we are flashing a clear, overlay white on the rows while "on"
    if (isFlashing && flashCount % 2 === 1 && clearingRows) {
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        for (let row of clearingRows) {
            ctx.fillRect(
                0,
                row * BLOCK_SIZE,
                tetrisCanvas.width,
                BLOCK_SIZE
            );
        }
    }
}

function drawNextPiece() {
    nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);

    if (!nextPiece) return;

    const offsetX = Math.floor((nextCanvas.width - BLOCK_SIZE * nextPiece.shape[0].length) / 2);
    const offsetY = Math.floor((nextCanvas.height - BLOCK_SIZE * nextPiece.shape.length) / 2);

    for (let y = 0; y < nextPiece.shape.length; y++) {
        for (let x = 0; x < nextPiece.shape[y].length; x++) {
            if (!nextPiece.shape[y][x]) continue;
            nextCtx.fillStyle = COLORS[nextPiece.shape[y][x]];
            nextCtx.fillRect(
                offsetX + x * BLOCK_SIZE,
                offsetY + y * BLOCK_SIZE,
                BLOCK_SIZE - 1, BLOCK_SIZE - 1
            );
        }
    }
}

/* ---------- Game logic --------------------------------------------------- */
function collision() {
    if (!currentPiece) return true;

    for (let y = 0; y < currentPiece.shape.length; y++) {
        for (let x = 0; x < currentPiece.shape[y].length; x++) {
            if (!currentPiece.shape[y][x]) continue;

            const newX = currentPiece.position.x + x;
            const newY = currentPiece.position.y + y;

            if (newX < 0 || newX >= COLS || newY >= ROWS) return true;
            if (newY < 0) continue; // above the board is fine

            if (board[newY][newX]) return true;
        }
    }
    return false;
}

function rotate() {
    const originalShape = JSON.parse(JSON.stringify(currentPiece.shape));

    for (let y = 0; y < currentPiece.shape.length; y++) {
        for (let x = 0; x < y; x++) {
            [currentPiece.shape[x][y], currentPiece.shape[y][x]] =
            [currentPiece.shape[y][x], currentPiece.shape[x][y]];
        }
    }

    for (let i = 0; i < currentPiece.shape.length; i++) {
        currentPiece.shape[i] = currentPiece.shape[i].reverse();
    }

    if (collision()) currentPiece.shape = originalShape;
}

function movePiece(dx, dy) {
    if (!currentPiece) return false;

    currentPiece.position.x += dx;
    currentPiece.position.y += dy;

    if (collision()) {
        currentPiece.position.x -= dx;
        currentPiece.position.y -= dy;
        return false;
    }
    return true;
}

function hardDrop() { while (movePiece(0, 1)) {} }

function lockPiece() {
    if (!currentPiece) return;

    for (let y = 0; y < currentPiece.shape.length; y++) {
        for (let x = 0; x < currentPiece.shape[y].length; x++) {
            if (!currentPiece.shape[y][x]) continue;
            const boardY = currentPiece.position.y + y;
            const boardX = currentPiece.position.x + x;

            if (boardY >= 0) {
                board[boardY][boardX] = currentPiece.shape[y][x];
            }
        }
    }

    checkLines();

    currentPiece = nextPiece;
    nextPiece   = generateRandomPiece();
}

function checkLines() {
    const rowsToClear = [];

    for (let y = ROWS - 1; y >= 0; y--) {
        if (board[y].every(cell => cell !== 0)) {
            rowsToClear.push(y);
        }
    }

    if (rowsToClear.length > 0) {
        /* ----- Scoring logic ------------------------------------------- */
        const points = [0, 100, 300, 500, 800][rowsToClear.length] * level;
        pendingScoreData = { points, lines: rowsToClear.length };

        /* ----- Flash‑clear state --------------------------------------- */
        clearingRows = rowsToClear;
        isFlashing   = true;
        flashCount   = 0;          // start with “off”
        lastFlashTime= performance.now();

        /* ---------- NEW: Colour change logic --------------------------- */
        rowsClearedSinceLastChange += rowsToClear.length;
        while (rowsClearedSinceLastChange >= 5) {
            rowsClearedSinceLastChange -= 5;
            changeEyeColor();           // <-- call each time two lines are cleared
        }

        /* ----- Existing eye‑rotation trigger ------------------------ */
        if (rowsToClear.length > 0) {
            triggerEyeRotation();
        }
    }
}

function finalizeClearing() {
    if (!clearingRows) return;

    // 1️⃣ Build a new board that contains only the non‑cleared rows
    const keep = Array.from({ length: ROWS }, (_, i) => !clearingRows.includes(i));
    const newBoard = [];
    for (let y = 0; y < ROWS; ++y) {
        if (keep[y]) newBoard.push(board[y]);          // copy existing row
    }

    // 2️⃣ Prepend empty rows equal to the number of cleared lines
    while (newBoard.length < ROWS) {
        newBoard.unshift(Array(COLS).fill(0));
    }
    board = newBoard;   // replace old board


    /* ----- Apply score / level updates ----------------------------- */
    if (pendingScoreData) {
        const { points, lines: cleared } = pendingScoreData;
        score += points;

        // Update the cumulative line count first
        lines += cleared;

        // Calculate new level based on total lines cleared
        const newLevel = Math.floor(lines / 10) + 1;   // levels start at 1

        if (newLevel > level) {
            level = newLevel;
            gameSpeed = getSpeedForLevel(level);      // <-- NEW line
        }

        updateStats();
    }

    /* ----- Reset flash state --------------------------------------- */
    clearingRows = null;
    isFlashing = false;
    flashCount = 0;
    lastFlashTime = 0;
    pendingScoreData = null;
}

function generateRandomPiece() {
    const type = Math.floor(Math.random() * 7) + 1;
    return {
        shape: JSON.parse(JSON.stringify(SHAPES[type])),
        position: { x: Math.floor(COLS / 2) - Math.floor(SHAPES[type][0].length / 2), y: 0 }
    };
}

function resetGame() {
    board = Array(ROWS).fill().map(() => Array(COLS).fill(0));
    currentPiece = generateRandomPiece();
    nextPiece   = generateRandomPiece();

    score = 0;
    level = 1;
    lines = 0;

    rowsClearedSinceLastChange = 0;          // <-- reset counter

    gameOver = false;
    isPaused = false;
    gameSpeed = 1000;

    updateStats();

    if (collision()) {
        gameOver = true;
    }
}

function restartGame() {
    resetGame();
    isPaused = false;
    dropStart = performance.now();
}

function togglePause() {
    isPaused = !isPaused;
    if (!isPaused) {
        dropStart = performance.now();
        lastTime  = performance.now();
    }
}

function updateStats() {
    document.getElementById('score').textContent = score;
    document.getElementById('level').textContent = level;
    document.getElementById('lines').textContent = lines;
}

/* ------------------------------------------------------------------------ */
/* ---------- Game loop --------------------------------------------------- */
function gameLoop(timestamp) {
    requestAnimationFrame(gameLoop);

    if (isPaused || gameOver) return;

    /* ----- Flash‑clear handling --------------------------------------- */
    if (isFlashing) {
        drawBoard();
        drawNextPiece();

        if (timestamp - lastFlashTime > FLASH_INTERVAL_MS) {      // 120 ms per on/off cycle
            flashCount++;
            lastFlashTime = timestamp;

            if (flashCount >= 4) {         // two full white flashes
                finalizeClearing();
                return;
            }
        }
        return;   // nothing else happens while flashing
    }

    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;

    if (timestamp - dropStart > gameSpeed) {
        if (!movePiece(0, 1)) {
            lockPiece();

            if (collision()) gameOver = true;
        }
        dropStart = timestamp;
    }

    drawBoard();
    drawNextPiece();
}

/* ------------------------------------------------------------------------ */
/* ---------- Input handling --------------------------------------------- */
function setupInput() {
    document.addEventListener('keydown', e => {
        if (isPaused || gameOver) return;

        switch (e.key) {
            case '8':  rotate();  break;
            case '4':  movePiece(-1, 0);  break;
            case '5':  movePiece(0, 1); break;
            case '6':  movePiece(1, 0); break;

            case ' ':          hardDrop(); lockPiece(); break;

            case 'i':  rotate();  break;
            case 'j':  movePiece(-1, 0);  break;
            case 'k':  movePiece(0, 1); break;
            case 'l':  movePiece(1, 0); break;

            case 'w':  rotate();  break;
            case 'a':  movePiece(-1, 0);  break;
            case 's':  movePiece(0, 1); break;
            case 'd':  movePiece(1, 0); break;
        }
    });
}

/* ------------------------------------------------------------------------ */
/* ---------- Bootstrap --------------------------------------------------- */
window.addEventListener('load', () => {
    init();
    setupInput();
    requestAnimationFrame(gameLoop);
});
