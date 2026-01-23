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
let gameOver = false, isPaused = false;
let dropStart = 0, lastTime = 0, gameSpeed = 1000;

let ctx, nextCtx, tetrisCanvas, nextCanvas;
let clearingRows = null, flashCount = 0, lastFlashTime = 0, isFlashing = false;
let pendingScoreData = null;
const FLASH_INTERVAL_MS = 120;

let nextFlashing = false, nextFlashCount = 0, lastNextFlashTime = 0;
let rowsClearedSinceLastChange = 0;
let bag = [];
const MAX_HUE = 360;
let currentHue = 0;

let isLooking = false, ambientAnimationPaused = false;

let lastStowTime = 0;
const STOW_COOLDOWN_MS = 0;

/* ────────────────────── BUTTON HELPERS ─────────────────────── */
const startBtn = document.getElementById('start-btn');
const pauseBtn = document.getElementById('pause-btn');

startBtn.addEventListener('keydown', e => {
    if (e.code === 'Space') e.preventDefault();
});

pauseBtn.addEventListener('keydown', e => {
    if (e.code === 'Space') e.preventDefault();
});

/* ────────────────────── UTILS ─────────────────────────────── */
function changeEyeColor() {
    const step = Math.floor(Math.random() * 90) + 30;
    currentHue = (currentHue + step) % MAX_HUE;
    const iris = document.querySelector('.iris');
    if (iris) iris.style.filter = `hue-rotate(${currentHue}deg)`;
}

function getSpeedForLevel(lvl) {
    const factor = 0.9;
    return Math.max(200, 1000 * Math.pow(factor, lvl - 1));
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
function shuffle(a){for(let i=a.length-1;i>0;--i){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}}
function getNextType(){if(!bag.length){bag=[1,2,3,4,5,6,7];shuffle(bag)}return bag.pop()}
function init(){
    tetrisCanvas=document.getElementById('tetris-board');
    nextCanvas=document.getElementById('next-canvas');
    if(!tetrisCanvas||!nextCanvas)return;
    ctx=tetrisCanvas.getContext('2d');nextCtx=nextCanvas.getContext('2d');

    // Initialize audio system
    initAudio();

    document.getElementById('start-btn').addEventListener('click',restartGame);
    document.getElementById('pause-btn').addEventListener('click',togglePause);
    resetGame();
}
function generateRandomPiece(){
    const type=getNextType();
    return {
        shape:JSON.parse(JSON.stringify(SHAPES[type])),
        position:{x:Math.floor(COLS/2)-Math.floor(SHAPES[type][0].length/2),y:0},
        type
    };
}
function resetGame(){
    board=Array(ROWS).fill().map(()=>Array(COLS).fill(0));
    bag=[];currentPiece=generateRandomPiece();nextPiece=generateRandomPiece();
    stowedPiece=null;score=0;level=1;lines=0;
    rowsClearedSinceLastChange=0;gameOver=false;isPaused=false;gameSpeed=1000;
    updateStats();
    if(isColliding()) gameOver=true;
    ghostPiece=null;lastStowTime=0;  holdLockActive  = false;
    holdLockEndTime = 0;
}
function restartGame(){resetGame();isPaused=false;dropStart=performance.now();}
function togglePause(){
    isPaused=!isPaused;
    if(!isPaused){dropStart=performance.now();lastTime=performance.now();}
}
function updateStats(){
    document.getElementById('score').textContent=score;
    document.getElementById('level').textContent=level;
    document.getElementById('lines').textContent=lines;
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
    const w=currentPiece.shape[0].length,h=currentPiece.shape.length;
    currentPiece.position.x=Math.floor(COLS/2-w/2);
    currentPiece.position.y=0;
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
        ghostPiece=null;updateGhostPiece();drawStowPiece();lastStowTime=now;
        triggerEyeDown();return;
    }
    if(now-lastStowTime<STOW_COOLDOWN_MS)return;
    const tempNext=nextPiece;
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
        while (rowsClearedSinceLastChange >= 4) {
            rowsClearedSinceLastChange -= 4;
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
        updateStats();
    }
    clearingRows=null;isFlashing=false;flashCount=0;lastFlashTime=0;pendingScoreData=null;
}

/* ────────────────────── GAME LOOP ───────────────────── */
function gameLoop(ts){
    requestAnimationFrame(gameLoop);
    if(isPaused||gameOver)return;

    if(ts - dropStart > gameSpeed){
        if(!movePiece(0,1)){
            lockPiece();
            if(isColliding()){
                gameOver      = true;   // we couldn't spawn a fresh piece
                triggerEyeDown();
                playSound('GAME_OVER');
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
        if(ts-dropStart>gameSpeed){if(!movePiece(0,1)){lockPiece();if(isColliding())gameOver=true;}dropStart=ts;}
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
    PIECE_LAND: { type:'noise',frequency:800,duration:.3,volume:.6 },
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
