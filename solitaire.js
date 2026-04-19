const SUITS = ["clubs", "diamonds", "hearts", "spades"];
const COLORS = {
    clubs: "black",
    diamonds: "red",
    hearts: "red",
    spades: "black"
};
const SUIT_SYMBOLS = {
    clubs: "&clubs;",
    diamonds: "&diams;",
    hearts: "&hearts;",
    spades: "&spades;"
};
const RANK_LABELS = ["", "A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const GAME_MODES = [
    {
        id: "draw-3",
        label: "Draw 3",
        drawCount: 3,
        redeals: Infinity,
        scoring: "standard"
    },
    {
        id: "draw-1",
        label: "Draw 1",
        drawCount: 1,
        redeals: Infinity,
        scoring: "standard"
    },
    {
        id: "vegas",
        label: "Vegas",
        drawCount: 3,
        redeals: 0,
        scoring: "vegas"
    }
];

const state = {
    stock: [],
    waste: [],
    foundations: [],
    tableau: [],
    selected: null,
    score: 0,
    moves: 0,
    startTime: 0,
    won: false,
    gameModeIndex: 0,
    redealsUsed: 0
};

let foundationArea;
let tableauRow;
let stockPile;
let wastePile;
let scoreEl;
let movesEl;
let timerEl;
let victoryBanner;
let boardEl;
let boardStageEl;
let fullscreenBtn;
let drawModeBtn;
let shellEl;
let timerHandle = null;
let boardScaleFrame = null;
let boardResizeObserver = null;
let websiteFullscreenActive = false;
let parentFullscreenObserver = null;
let lastFullscreenTouchTime = 0;
const IS_FILE_ORIGIN = window.location.protocol === "file:";
const MESSAGE_TARGET_ORIGIN = window.location.origin === "null" || IS_FILE_ORIGIN ? "*" : window.location.origin;
const WEBSITE_FULLSCREEN_CLASS = "solitaire-website-fullscreen";
const SHOULD_AUTOSTART_VICTORY_TEST = new URLSearchParams(window.location.search).get("celebrationTest") === "1";
const DRONE_SHOW_INTRO_FADE_IN_MS = 2000;
const DRONE_SHOW_OUTRO_FADE_MS = 1000;
const SHOULD_LOAD_LATE_GAME_PREVIEW = new URLSearchParams(window.location.search).get("lateGamePreview") === "1";
const DRONE_SHOW_DURATION_MIN_MS = 26000;
const DRONE_SHOW_DURATION_MAX_MS = 32000;
const DRONE_SHOW_DRONE_COUNT = 240;
const DRONE_SHOW_FIGURES_PER_DISPLAY = 4;
const DRONE_SHOW_BOAT_POSITIONS = [0.22, 0.74];
const DRONE_SHOW_BIRD_TIERS = [
    {
        minScore: 0,
        id: "western-sandpiper",
        name: "Western Sandpiper",
        rarity: "shoreline common",
        palette: [
            { hue: 32, sat: 58, light: 88 },
            { hue: 176, sat: 78, light: 76 },
            { hue: 198, sat: 92, light: 70 },
            { hue: 252, sat: 90, light: 80 }
        ]
    },
    {
        minScore: 55,
        id: "rufous-hummingbird",
        name: "Rufous Hummingbird",
        rarity: "coastal flash",
        palette: [
            { hue: 24, sat: 92, light: 82 },
            { hue: 48, sat: 94, light: 78 },
            { hue: 102, sat: 88, light: 72 },
            { hue: 148, sat: 88, light: 72 },
            { hue: 188, sat: 92, light: 74 },
            { hue: 226, sat: 90, light: 76 },
            { hue: 320, sat: 84, light: 78 }
        ]
    },
    {
        minScore: 80,
        id: "great-blue-heron",
        name: "Great Blue Heron",
        rarity: "coastal familiar",
        palette: [
            { hue: 206, sat: 52, light: 84 },
            { hue: 216, sat: 84, light: 72 },
            { hue: 196, sat: 62, light: 62 }
        ]
    },
    {
        minScore: 130,
        id: "bald-eagle",
        name: "Bald Eagle",
        rarity: "iconic raptor",
        palette: [
            { hue: 46, sat: 88, light: 88 },
            { hue: 28, sat: 84, light: 72 },
            { hue: 14, sat: 82, light: 66 },
            { hue: 214, sat: 90, light: 74 }
        ]
    },
    {
        minScore: 175,
        id: "barred-owl",
        name: "Barred Owl",
        rarity: "nocturnal uncommon",
        palette: [
            { hue: 40, sat: 74, light: 84 },
            { hue: 26, sat: 72, light: 72 },
            { hue: 12, sat: 68, light: 66 },
            { hue: 232, sat: 76, light: 76 }
        ]
    },
    {
        minScore: 205,
        id: "beaver",
        name: "Beaver",
        rarity: "creekside bonus",
        palette: [
            { hue: 26, sat: 54, light: 82 },
            { hue: 34, sat: 62, light: 68 },
            { hue: 196, sat: 70, light: 72 }
        ]
    },
    {
        minScore: 230,
        id: "stellers-jay",
        name: "Steller's Jay",
        rarity: "bonus regional prize",
        palette: [
            { hue: 236, sat: 94, light: 82 },
            { hue: 214, sat: 96, light: 72 },
            { hue: 198, sat: 98, light: 66 },
            { hue: 168, sat: 100, light: 72 }
        ]
    },
    {
        minScore: 260,
        id: "spirit-bear",
        name: "Spirit Bear",
        rarity: "highest prestige",
        palette: [
            { hue: 194, sat: 56, light: 94 },
            { hue: 208, sat: 84, light: 84 },
            { hue: 176, sat: 70, light: 76 }
        ]
    }
];
let droneShowBirdPool = [];
let lastDroneShowBirdIds = [];
const victoryFx = {
    canvas: null,
    ctx: null,
    rafId: null,
    loopTimerId: null,
    clearTimerId: null,
    active: false,
    completed: false,
    width: 0,
    height: 0,
    dpr: 1,
    startTime: 0,
    endTime: 0,
    lastTs: 0,
    fadeAlpha: 0,
    nextLaunchAt: 0,
    stageIndex: 0,
    sceneStamp: "",
    bird: null,
    birds: [],
    currentBirdIndex: 0,
    drones: [],
    boats: [],
    stars: [],
    formations: null,
    shells: [],
    particles: [],
    halos: []
};

document.addEventListener("DOMContentLoaded", () => {
    foundationArea = document.getElementById("foundation-area");
    tableauRow = document.getElementById("tableau-row");
    stockPile = document.getElementById("stock-pile");
    wastePile = document.getElementById("waste-pile");
    scoreEl = document.getElementById("score");
    movesEl = document.getElementById("moves");
    timerEl = document.getElementById("timer");
    victoryBanner = document.getElementById("victory-banner");
    boardEl = document.getElementById("board");
    boardStageEl = document.getElementById("board-stage");
    fullscreenBtn = document.getElementById("fullscreen-btn");
    drawModeBtn = document.getElementById("draw-mode-btn");
    shellEl = document.querySelector(".solitaire-shell");

    document.getElementById("new-game-btn").addEventListener("click", newGame);
    document.getElementById("victory-new-game-btn").addEventListener("click", newGame);
    drawModeBtn.addEventListener("click", cycleGameMode);
    fullscreenBtn.addEventListener("click", handleFullscreenButtonClick);
    fullscreenBtn.addEventListener("touchend", handleFullscreenButtonTouch, { passive: false });
    boardEl.addEventListener("click", handleBoardClick);
    boardEl.addEventListener("dblclick", handleBoardDoubleClick);
    window.addEventListener("message", handleParentMessage);
    window.addEventListener("resize", handleViewportResize);
    if (window.visualViewport) {
        window.visualViewport.addEventListener("resize", handleViewportResize);
        window.visualViewport.addEventListener("scroll", scheduleBoardScale);
    }

    if ("ResizeObserver" in window) {
        boardResizeObserver = new ResizeObserver(() => {
            scheduleBoardScale();
            resizeVictoryCanvas();
        });
        boardResizeObserver.observe(boardEl);
        boardResizeObserver.observe(boardStageEl);
    }

    initVictoryFireworks();
    newGame();
    if (SHOULD_LOAD_LATE_GAME_PREVIEW) {
        loadLateGamePreview();
    }
    if (SHOULD_AUTOSTART_VICTORY_TEST) {
        window.setTimeout(() => {
            startVictoryCelebration();
        }, 700);
    }
    initParentFullscreenObserver();
    requestWebsiteFullscreenState();
});

function newGame() {
    const deck = shuffle(createDeck());
    const mode = getCurrentGameMode();
    state.stock = [];
    state.waste = [];
    state.foundations = Array.from({ length: 4 }, () => []);
    state.tableau = Array.from({ length: 7 }, () => []);
    state.selected = null;
    state.score = mode.scoring === "vegas" ? -52 : 0;
    state.moves = 0;
    state.won = false;
    state.redealsUsed = 0;
    state.startTime = Date.now();
    stopVictoryCelebration();

    for (let pileIndex = 0; pileIndex < 7; pileIndex += 1) {
        for (let cardIndex = 0; cardIndex <= pileIndex; cardIndex += 1) {
            const card = deck.pop();
            card.faceUp = cardIndex === pileIndex;
            state.tableau[pileIndex].push(card);
        }
    }

    while (deck.length) {
        const card = deck.pop();
        card.faceUp = false;
        state.stock.push(card);
    }

    if (timerHandle) {
        window.clearInterval(timerHandle);
    }

    timerHandle = window.setInterval(updateTimer, 1000);
    setStatus(`Fresh ${mode.label} deal. Build down in alternating colors and send the aces home.`);
    render();
    updateTimer();
}

function loadLateGamePreview() {
    const makeCard = (suit, rank) => ({
        id: `${suit}-${rank}`,
        suit,
        rank,
        faceUp: true
    });

    stopVictoryCelebration();
    state.gameModeIndex = 0;
    state.selected = null;
    state.stock = [];
    state.waste = [];
    state.foundations = [
        Array.from({ length: 13 }, (_, index) => makeCard("clubs", index + 1)),
        Array.from({ length: 13 }, (_, index) => makeCard("diamonds", index + 1)),
        Array.from({ length: 13 }, (_, index) => makeCard("hearts", index + 1)),
        Array.from({ length: 13 }, (_, index) => makeCard("spades", index + 1))
    ];
    state.tableau = Array.from({ length: 7 }, () => []);
    state.score = 312;
    state.moves = 104;
    state.redealsUsed = 0;
    state.won = true;
    state.startTime = Date.now() - ((6 * 60) + 8) * 1000;

    render();
    updateTimer();
}

function createDeck() {
    const deck = [];

    SUITS.forEach((suit) => {
        for (let rank = 1; rank <= 13; rank += 1) {
            deck.push({
                id: `${suit}-${rank}`,
                suit,
                rank,
                faceUp: false
            });
        }
    });

    return deck;
}

function shuffle(deck) {
    const nextDeck = [...deck];

    for (let index = nextDeck.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        [nextDeck[index], nextDeck[swapIndex]] = [nextDeck[swapIndex], nextDeck[index]];
    }

    return nextDeck;
}

function handleBoardClick(event) {
    const pileEl = event.target.closest(".pile");
    const cardEl = event.target.closest(".card");

    if (!pileEl) {
        clearSelection();
        return;
    }

    const pileRole = pileEl.dataset.role;

    if (pileRole === "stock") {
        handleStockClick();
        return;
    }

    if (cardEl) {
        handleCardClick(cardEl);
        return;
    }

    if ((pileRole === "tableau" || pileRole === "foundation") && state.selected) {
        const moved = attemptMoveSelectedTo(pileRole, Number(pileEl.dataset.index));
        if (!moved) {
            setStatus("That move does not fit there.");
            render();
        }
        return;
    }

    clearSelection();
}

function handleBoardDoubleClick(event) {
    const cardEl = event.target.closest(".card");
    if (!cardEl) {
        return;
    }

    const source = sourceFromCard(cardEl);
    if (!source) {
        return;
    }

    const cards = peekSourceCards(source);
    if (cards.length !== 1) {
        return;
    }

    if (source.type === "tableau") {
        const pile = state.tableau[source.pile];
        if (source.index !== pile.length - 1) {
            return;
        }
    }

    const moved = autoMoveToFoundation(source);
    if (!moved) {
        setStatus("No foundation can take that card yet.");
        render();
    }
}

function handleStockClick() {
    clearSelection(false);
    const mode = getCurrentGameMode();

    if (state.stock.length) {
        const drawCount = Math.min(mode.drawCount, state.stock.length);

        for (let drawIndex = 0; drawIndex < drawCount; drawIndex += 1) {
            const card = state.stock.pop();
            card.faceUp = true;
            state.waste.push(card);
        }

        state.moves += 1;
        setStatus(`Drew ${drawCount} card${drawCount === 1 ? "" : "s"} from the stock.`);
        render();
        return;
    }

    if (state.waste.length) {
        if (state.redealsUsed >= mode.redeals) {
            setStatus(`${mode.label} allows only one pass through the stock.`);
            render();
            return;
        }

        while (state.waste.length) {
            const card = state.waste.pop();
            card.faceUp = false;
            state.stock.push(card);
        }

        state.redealsUsed += 1;
        state.moves += 1;
        setStatus("Turned the waste back over into the stock.");
        render();
        return;
    }

    setStatus("No cards left in the stock or waste.");
    render();
}

function handleCardClick(cardEl) {
    const source = sourceFromCard(cardEl);
    if (!source) {
        return;
    }

    if (state.selected) {
        if (sameSource(source, state.selected)) {
            clearSelection();
            return;
        }

        if (source.type === "tableau" && source.index === state.tableau[source.pile].length - 1) {
            if (attemptMoveSelectedTo("tableau", source.pile)) {
                return;
            }
        }

        if (source.type === "foundation") {
            if (attemptMoveSelectedTo("foundation", source.pile)) {
                return;
            }
        }
    }

    if (!canSelectSource(source)) {
        setStatus("That card cannot move yet.");
        render();
        return;
    }

    state.selected = source;
    setStatus("Card selected. Click a tableau pile or foundation to move it.");
    render();
}

function sourceFromCard(cardEl) {
    const role = cardEl.dataset.cardRole;

    if (role === "waste") {
        return { type: "waste" };
    }

    if (role === "foundation") {
        return { type: "foundation", pile: Number(cardEl.dataset.pileIndex) };
    }

    if (role === "tableau") {
        return {
            type: "tableau",
            pile: Number(cardEl.dataset.pileIndex),
            index: Number(cardEl.dataset.cardIndex)
        };
    }

    return null;
}

function canSelectSource(source) {
    if (source.type === "waste") {
        return state.waste.length > 0;
    }

    if (source.type === "foundation") {
        return state.foundations[source.pile].length > 0;
    }

    if (source.type === "tableau") {
        const pile = state.tableau[source.pile];
        const movingCards = pile.slice(source.index);
        return movingCards.length > 0 && movingCards.every((card) => card.faceUp);
    }

    return false;
}

function peekSourceCards(source) {
    if (source.type === "waste") {
        return state.waste.length ? [state.waste[state.waste.length - 1]] : [];
    }

    if (source.type === "foundation") {
        const foundation = state.foundations[source.pile];
        return foundation.length ? [foundation[foundation.length - 1]] : [];
    }

    if (source.type === "tableau") {
        return state.tableau[source.pile].slice(source.index);
    }

    return [];
}

function attemptMoveSelectedTo(targetType, targetIndex) {
    const source = state.selected;
    if (!source) {
        return false;
    }

    if (source.type === targetType && source.pile === targetIndex) {
        return false;
    }

    const cards = peekSourceCards(source);
    if (!cards.length) {
        return false;
    }

    if (targetType === "foundation" && canMoveToFoundation(cards, targetIndex)) {
        applyMove(source, targetType, targetIndex);
        return true;
    }

    if (targetType === "tableau" && canMoveToTableau(cards, targetIndex)) {
        applyMove(source, targetType, targetIndex);
        return true;
    }

    return false;
}

function autoMoveToFoundation(source) {
    const cards = peekSourceCards(source);
    if (cards.length !== 1) {
        return false;
    }

    for (let foundationIndex = 0; foundationIndex < state.foundations.length; foundationIndex += 1) {
        if (canMoveToFoundation(cards, foundationIndex)) {
            state.selected = source;
            applyMove(source, "foundation", foundationIndex, { autoMove: true });
            return true;
        }
    }

    return false;
}

function canMoveToFoundation(cards, foundationIndex) {
    if (cards.length !== 1) {
        return false;
    }

    const [card] = cards;
    const foundation = state.foundations[foundationIndex];
    const topCard = foundation[foundation.length - 1];

    if (!topCard) {
        return card.rank === 1;
    }

    return topCard.suit === card.suit && card.rank === topCard.rank + 1;
}

function canMoveToTableau(cards, tableauIndex) {
    const targetPile = state.tableau[tableauIndex];
    const targetCard = targetPile[targetPile.length - 1];
    const movingCard = cards[0];

    if (!targetCard) {
        return movingCard.rank === 13;
    }

    if (!targetCard.faceUp) {
        return false;
    }

    return COLORS[targetCard.suit] !== COLORS[movingCard.suit] && movingCard.rank === targetCard.rank - 1;
}

function applyMove(source, targetType, targetIndex, options = {}) {
    const cards = removeSourceCards(source);
    if (!cards.length) {
        return;
    }

    if (targetType === "foundation") {
        state.foundations[targetIndex].push(...cards);
    } else {
        state.tableau[targetIndex].push(...cards);
    }

    const revealed = revealTableauCard(source);
    updateScore(source, targetType, revealed);
    state.moves += 1;
    state.selected = null;

    const movedCard = cards[0];
    if (options.autoMove) {
        setStatus(`${cardName(movedCard)} moved up to the foundation.`);
    } else {
        setStatus(`${cardName(movedCard)} moved successfully.`);
    }

    checkForWin();
    if (state.won) {
        setStatus("You won. The entire deck made it home.");
    }
    render();
}

function removeSourceCards(source) {
    if (source.type === "waste") {
        const card = state.waste.pop();
        return card ? [card] : [];
    }

    if (source.type === "foundation") {
        const card = state.foundations[source.pile].pop();
        return card ? [card] : [];
    }

    if (source.type === "tableau") {
        return state.tableau[source.pile].splice(source.index);
    }

    return [];
}

function revealTableauCard(source) {
    if (source.type !== "tableau") {
        return false;
    }

    const pile = state.tableau[source.pile];
    const topCard = pile[pile.length - 1];

    if (topCard && !topCard.faceUp) {
        topCard.faceUp = true;
        return true;
    }

    return false;
}

function updateScore(source, targetType, revealed) {
    const mode = getCurrentGameMode();

    if (mode.scoring === "vegas") {
        let scoreDelta = 0;

        if ((source.type === "waste" || source.type === "tableau") && targetType === "foundation") {
            scoreDelta += 5;
        }

        if (source.type === "foundation" && targetType === "tableau") {
            scoreDelta -= 5;
        }

        state.score += scoreDelta;
        return;
    }

    let scoreDelta = 0;

    if ((source.type === "waste" || source.type === "tableau") && targetType === "foundation") {
        scoreDelta += 10;
    }

    if (source.type === "waste" && targetType === "tableau") {
        scoreDelta += 5;
    }

    if (source.type === "foundation" && targetType === "tableau") {
        scoreDelta -= 15;
    }

    if (revealed) {
        scoreDelta += 5;
    }

    state.score = Math.max(0, state.score + scoreDelta);
}

function checkForWin() {
    const wasWon = state.won;
    const foundationCards = state.foundations.reduce((count, pile) => count + pile.length, 0);
    state.won = foundationCards === 52;
    if (state.won && !wasWon) {
        startVictoryCelebration();
    }
}

function clearSelection(shouldRender = true) {
    if (!state.selected) {
        return;
    }

    state.selected = null;
    if (shouldRender) {
        setStatus("Selection cleared.");
        render();
    }
}

function sameSource(left, right) {
    return left.type === right.type && left.pile === right.pile && left.index === right.index;
}

function cardName(card) {
    return `${RANK_LABELS[card.rank]} of ${card.suit}`;
}

function render() {
    renderHud();
    renderStock();
    renderWaste();
    renderFoundations();
    renderTableau();
    applyVictoryFxClasses();
    victoryBanner.classList.toggle("show", shouldShowVictoryBanner());
    scheduleBoardScale();
}

function renderHud() {
    scoreEl.textContent = String(state.score);
    movesEl.textContent = String(state.moves);
    if (drawModeBtn) {
        drawModeBtn.textContent = getCurrentGameMode().label;
    }
}

function renderStock() {
    stockPile.innerHTML = "";
    stockPile.dataset.role = "stock";
    stockPile.classList.remove("selected-slot");
    const mode = getCurrentGameMode();

    const slot = document.createElement("div");
    slot.className = "slot";
    if (state.stock.length) {
        slot.textContent = "";
    } else if (state.waste.length && state.redealsUsed < mode.redeals) {
        slot.textContent = "Redeal";
    } else if (state.waste.length) {
        slot.textContent = "No Redeal";
    } else {
        slot.textContent = "";
    }
    stockPile.appendChild(slot);

    if (state.stock.length) {
        const cardEl = createBackCard();
        cardEl.style.top = "0";
        stockPile.appendChild(cardEl);
    }
}

function renderWaste() {
    wastePile.innerHTML = "";
    wastePile.dataset.role = "waste";
    wastePile.classList.remove("selected-slot");
    const mode = getCurrentGameMode();

    const slot = document.createElement("div");
    slot.className = "slot";
    slot.textContent = "Waste";
    wastePile.appendChild(slot);

    if (!state.waste.length) {
        return;
    }

    const visibleCards = state.waste.slice(-Math.min(mode.drawCount, 3));
    const wasteFanOffset = getWasteFanOffset();
    visibleCards.forEach((card, index) => {
        const cardEl = createFaceCard(card);
        cardEl.dataset.cardRole = "waste";
        cardEl.style.left = `${index * wasteFanOffset}px`;
        cardEl.style.top = "0";
        cardEl.style.zIndex = String(40 + index);
        if (index !== visibleCards.length - 1) {
            cardEl.style.pointerEvents = "none";
        }
        if (state.selected && state.selected.type === "waste" && index === visibleCards.length - 1) {
            cardEl.classList.add("selected");
        }
        wastePile.appendChild(cardEl);
    });
}

function renderFoundations() {
    foundationArea.innerHTML = "";

    state.foundations.forEach((pile, pileIndex) => {
        const pileEl = document.createElement("div");
        pileEl.className = "pile";
        pileEl.dataset.role = "foundation";
        pileEl.dataset.index = String(pileIndex);

        const slot = document.createElement("div");
        slot.className = "slot";
        slot.innerHTML = "A";
        pileEl.appendChild(slot);

        const topCard = pile[pile.length - 1];
        if (topCard) {
            const cardEl = createFaceCard(topCard);
            cardEl.dataset.cardRole = "foundation";
            cardEl.dataset.pileIndex = String(pileIndex);
            cardEl.style.top = "0";
            cardEl.style.zIndex = "80";
            if (state.selected && state.selected.type === "foundation" && state.selected.pile === pileIndex) {
                cardEl.classList.add("selected");
            }
            if (isFoundationHighlighted(pileIndex)) {
                cardEl.classList.add("available-target");
            }
            pileEl.appendChild(cardEl);
        } else if (isFoundationHighlighted(pileIndex)) {
            pileEl.classList.add("selected-slot");
        }

        foundationArea.appendChild(pileEl);
    });
}

function renderTableau() {
    tableauRow.innerHTML = "";

    state.tableau.forEach((pile, pileIndex) => {
        const pileEl = document.createElement("div");
        pileEl.className = "pile tableau-pile";
        pileEl.dataset.role = "tableau";
        pileEl.dataset.index = String(pileIndex);

        const slot = document.createElement("div");
        slot.className = "slot";
        slot.textContent = "King";
        pileEl.appendChild(slot);

        let topOffset = 0;
        pile.forEach((card, cardIndex) => {
            const cardEl = card.faceUp ? createFaceCard(card) : createBackCard();
            cardEl.dataset.cardRole = "tableau";
            cardEl.dataset.pileIndex = String(pileIndex);
            cardEl.dataset.cardIndex = String(cardIndex);
            cardEl.style.top = `${topOffset}px`;
            cardEl.style.zIndex = String(100 + cardIndex);

            if (card.faceUp && isSelectedTableauCard(pileIndex, cardIndex)) {
                cardEl.classList.add("selected");
            }

            if (card.faceUp && isTableauDropTarget(pileIndex, cardIndex)) {
                cardEl.classList.add("available-target");
            }

            if (!card.faceUp) {
                cardEl.style.pointerEvents = "none";
            }

            pileEl.appendChild(cardEl);
            topOffset += card.faceUp ? 30 : 18;
        });

        if (!pile.length && isTableauEmptyTarget(pileIndex)) {
            pileEl.classList.add("selected-slot");
        }

        tableauRow.appendChild(pileEl);
    });
}

function isFoundationHighlighted(pileIndex) {
    if (!state.selected) {
        return false;
    }

    const cards = peekSourceCards(state.selected);
    return canMoveToFoundation(cards, pileIndex);
}

function isSelectedTableauCard(pileIndex, cardIndex) {
    return Boolean(
        state.selected &&
        state.selected.type === "tableau" &&
        state.selected.pile === pileIndex &&
        cardIndex >= state.selected.index
    );
}

function isTableauDropTarget(pileIndex, cardIndex) {
    if (!state.selected) {
        return false;
    }

    const pile = state.tableau[pileIndex];
    if (!pile.length || cardIndex !== pile.length - 1) {
        return false;
    }

    return canMoveToTableau(peekSourceCards(state.selected), pileIndex);
}

function isTableauEmptyTarget(pileIndex) {
    if (!state.selected) {
        return false;
    }

    return state.tableau[pileIndex].length === 0 && canMoveToTableau(peekSourceCards(state.selected), pileIndex);
}

function createFaceCard(card) {
    const cardEl = document.createElement("div");
    const rankClass = card.rank === 10 ? " is-ten" : "";
    cardEl.className = `card ${COLORS[card.suit]} ${card.suit}`;
    cardEl.setAttribute("aria-label", cardName(card));
    cardEl.innerHTML = `
        <div class="card-corner top-left">
            <span class="card-rank${rankClass}">${RANK_LABELS[card.rank]}</span>
            <span class="card-suit">${SUIT_SYMBOLS[card.suit]}</span>
        </div>
        <div class="card-center"><span class="card-center-symbol">${SUIT_SYMBOLS[card.suit]}</span></div>
        <div class="card-corner bottom-right">
            <span class="card-rank${rankClass}">${RANK_LABELS[card.rank]}</span>
            <span class="card-suit">${SUIT_SYMBOLS[card.suit]}</span>
        </div>
    `;
    return cardEl;
}

function createBackCard() {
    const cardEl = document.createElement("div");
    cardEl.className = "card back";
    return cardEl;
}

function setStatus(message) {
    void message;
}

function getCurrentGameMode() {
    return GAME_MODES[state.gameModeIndex] || GAME_MODES[0];
}

function cycleGameMode() {
    state.gameModeIndex = (state.gameModeIndex + 1) % GAME_MODES.length;
    const mode = getCurrentGameMode();
    setStatus(`Mode switched to ${mode.label}.`);
    newGame();
}

function getWasteFanOffset() {
    return parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--waste-fan-offset")) || 16;
}

function updateTimer() {
    const elapsedSeconds = Math.floor((Date.now() - state.startTime) / 1000);
    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;
    timerEl.textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function shouldShowVictoryBanner() {
    if (!state.won) {
        return false;
    }

    return !victoryFx.active && victoryFx.completed;
}

function applyVictoryFxClasses() {
    if (!boardEl) {
        return;
    }

    boardEl.classList.toggle("win-active", victoryFx.active);
    document.body.classList.toggle("is-victory-celebrating", victoryFx.active);
}

function initVictoryFireworks() {
    if (!boardEl || victoryFx.canvas) {
        return;
    }

    const canvas = document.getElementById("board-fireworks-canvas");
    if (!canvas) {
        return;
    }

    victoryFx.canvas = canvas;
    victoryFx.ctx = canvas.getContext("2d");
    resizeVictoryCanvas();
}

function resizeVictoryCanvas() {
    if (!victoryFx.canvas || !victoryFx.ctx || !boardEl) {
        return;
    }

    const rect = boardEl.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    const dpr = Math.min(2, window.devicePixelRatio || 1);

    if (victoryFx.width === width && victoryFx.height === height && victoryFx.dpr === dpr) {
        return;
    }

    victoryFx.width = width;
    victoryFx.height = height;
    victoryFx.dpr = dpr;
    victoryFx.canvas.width = Math.max(1, Math.floor(width * dpr));
    victoryFx.canvas.height = Math.max(1, Math.floor(height * dpr));
    victoryFx.canvas.style.width = `${width}px`;
    victoryFx.canvas.style.height = `${height}px`;
    victoryFx.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    victoryFx.sceneStamp = "";
}

function startVictoryCelebration() {
    initVictoryFireworks();
    if (!victoryFx.ctx || !victoryFx.canvas) {
        return;
    }

    cancelVictoryLoop();
    if (victoryFx.clearTimerId) {
        window.clearTimeout(victoryFx.clearTimerId);
        victoryFx.clearTimerId = null;
    }

    resizeVictoryCanvas();
    const now = performance.now();
    const duration =
        DRONE_SHOW_DURATION_MIN_MS +
        Math.random() * (DRONE_SHOW_DURATION_MAX_MS - DRONE_SHOW_DURATION_MIN_MS);
    const birds = getDroneShowBirdSequenceForScore(state.score);
    const featuredBird = birds[birds.length - 1];

    victoryFx.active = true;
    victoryFx.completed = false;
    victoryFx.startTime = now;
    victoryFx.endTime = now + duration;
    victoryFx.lastTs = 0;
    victoryFx.fadeAlpha = 0;
    victoryFx.nextLaunchAt = 0;
    victoryFx.stageIndex = 0;
    victoryFx.bird = birds[0] ?? null;
    victoryFx.birds = birds;
    victoryFx.currentBirdIndex = 0;
    victoryFx.sceneStamp = "";
    victoryFx.formations = null;
    victoryFx.boats.length = 0;
    victoryFx.stars.length = 0;
    victoryFx.drones = createDroneFleet(DRONE_SHOW_DRONE_COUNT, birds[0] ?? DRONE_SHOW_BIRD_TIERS[0]);
    victoryFx.shells.length = 0;
    victoryFx.particles.length = 0;
    victoryFx.halos.length = 0;
    seedDroneShowScene();
    if (victoryFx.formations?.launch) {
        for (let index = 0; index < victoryFx.drones.length; index += 1) {
            const launchPoint = victoryFx.formations.launch[index % victoryFx.formations.launch.length];
            victoryFx.drones[index].x = launchPoint.x;
            victoryFx.drones[index].y = launchPoint.y;
            victoryFx.drones[index].size = launchPoint.size;
            victoryFx.drones[index].alpha = launchPoint.alpha;
        }
    }
    setStatus(
        featuredBird.id === "spirit-bear"
            ? `You won. Four random figures will appear, ending with Spirit Bear as the ${featuredBird.rarity} finale.`
            : `You won. Four random figures will appear across the sky.`
    );
    applyVictoryFxClasses();

    scheduleVictoryLoop();
    render();
}

function stopVictoryCelebration(options = {}) {
    cancelVictoryLoop();

    if (victoryFx.clearTimerId) {
        window.clearTimeout(victoryFx.clearTimerId);
        victoryFx.clearTimerId = null;
    }

    const completed = Boolean(options.completed);
    victoryFx.active = false;
    victoryFx.completed = state.won && completed;
    victoryFx.lastTs = 0;
    victoryFx.fadeAlpha = 0;
    victoryFx.stageIndex = 0;
    victoryFx.sceneStamp = "";
    victoryFx.bird = null;
    victoryFx.birds.length = 0;
    victoryFx.currentBirdIndex = 0;
    victoryFx.formations = null;
    victoryFx.drones.length = 0;
    victoryFx.boats.length = 0;
    victoryFx.stars.length = 0;
    victoryFx.shells.length = 0;
    victoryFx.particles.length = 0;
    victoryFx.halos.length = 0;
    applyVictoryFxClasses();

    if (victoryFx.ctx && victoryFx.width > 0 && victoryFx.height > 0) {
        if (completed) {
            victoryFx.clearTimerId = window.setTimeout(() => {
                victoryFx.clearTimerId = null;
                if (victoryFx.ctx) {
                    victoryFx.ctx.clearRect(0, 0, victoryFx.width, victoryFx.height);
                }
            }, 650);
        } else {
            victoryFx.ctx.clearRect(0, 0, victoryFx.width, victoryFx.height);
        }
    }
}

function tickVictoryFireworks(timestamp) {
    if (!victoryFx.active || !victoryFx.ctx) {
        return;
    }

    if (!victoryFx.lastTs) {
        victoryFx.lastTs = timestamp;
    }

    const dt = Math.min(40, Math.max(10, timestamp - victoryFx.lastTs));
    victoryFx.lastTs = timestamp;

    const elapsed = timestamp - victoryFx.startTime;
    const totalDuration = Math.max(1, victoryFx.endTime - victoryFx.startTime);
    const progress = clamp(elapsed / totalDuration, 0, 1);
    seedDroneShowScene();
    const isInLaunchWindow = timestamp < victoryFx.endTime;
    updateDroneFleet(dt, progress);
    drawDroneShow(elapsed, progress);

    if (!isInLaunchWindow && elapsed >= totalDuration + DRONE_SHOW_OUTRO_FADE_MS) {
        stopVictoryCelebration({ completed: true });
        render();
        return;
    }

    scheduleVictoryLoop();
}

function scheduleVictoryLoop() {
    victoryFx.rafId = window.requestAnimationFrame(tickVictoryFireworks);
}

function cancelVictoryLoop() {
    if (victoryFx.rafId) {
        window.cancelAnimationFrame(victoryFx.rafId);
        victoryFx.rafId = null;
    }

    if (victoryFx.loopTimerId) {
        window.clearTimeout(victoryFx.loopTimerId);
        victoryFx.loopTimerId = null;
    }
}

function getDroneShowBirdForScore(score) {
    for (let index = DRONE_SHOW_BIRD_TIERS.length - 1; index >= 0; index -= 1) {
        if (score >= DRONE_SHOW_BIRD_TIERS[index].minScore) {
            return DRONE_SHOW_BIRD_TIERS[index];
        }
    }

    return DRONE_SHOW_BIRD_TIERS[0];
}

function getDroneShowBirdById(id) {
    return DRONE_SHOW_BIRD_TIERS.find((bird) => bird.id === id) ?? DRONE_SHOW_BIRD_TIERS[0];
}

function refillDroneShowBirdPool(excludeIds = []) {
    const excluded = new Set(excludeIds);
    const leadingCount = Math.min(DRONE_SHOW_FIGURES_PER_DISPLAY, DRONE_SHOW_BIRD_TIERS.length);

    for (let attempt = 0; attempt < 12; attempt += 1) {
        const nextPool = shuffle(DRONE_SHOW_BIRD_TIERS);
        if (!excludeIds.length || !nextPool.slice(0, leadingCount).some((bird) => excluded.has(bird.id))) {
            droneShowBirdPool = nextPool;
            return;
        }
    }

    droneShowBirdPool = shuffle(DRONE_SHOW_BIRD_TIERS);
}

function getDroneShowBirdSequenceForScore(score) {
    void score;
    const selection = [];
    const targetCount = Math.min(DRONE_SHOW_FIGURES_PER_DISPLAY, DRONE_SHOW_BIRD_TIERS.length);

    while (selection.length < targetCount) {
        if (!droneShowBirdPool.length) {
            refillDroneShowBirdPool(selection.length === 0 ? lastDroneShowBirdIds : []);
        }

        const nextBird = droneShowBirdPool.shift();
        if (!nextBird || selection.some((bird) => bird.id === nextBird.id)) {
            continue;
        }

        selection.push(nextBird);
    }

    lastDroneShowBirdIds = selection.map((bird) => bird.id);
    return selection;
}

function seedDroneShowScene() {
    if (!victoryFx.birds.length || !victoryFx.width || !victoryFx.height) {
        return;
    }

    const sceneStamp = `${victoryFx.width}x${victoryFx.height}:${victoryFx.birds.map((bird) => bird.id).join(",")}`;
    if (victoryFx.sceneStamp === sceneStamp) {
        return;
    }

    victoryFx.sceneStamp = sceneStamp;
    victoryFx.boats = buildDroneShowBoats();
    victoryFx.stars = buildDroneShowStars();
    victoryFx.formations = buildDroneShowFormations(victoryFx.birds);
}

function buildDroneShowBoats() {
    const waterline = victoryFx.height * 0.76;
    return [
        {
            type: "barge",
            x: victoryFx.width * DRONE_SHOW_BOAT_POSITIONS[1],
            y: waterline + 4,
            length: victoryFx.width * 0.12,
            height: 9,
            cabinWidth: victoryFx.width * 0.018,
            cabinHeight: 7,
            lightPhase: 0.9
        },
        {
            type: "sailboat",
            x: victoryFx.width * DRONE_SHOW_BOAT_POSITIONS[0],
            y: waterline + 14,
            length: victoryFx.width * 0.082,
            height: 12,
            cabinWidth: victoryFx.width * 0.016,
            cabinHeight: 8,
            mastHeight: victoryFx.height * 0.12,
            sailHeight: victoryFx.height * 0.09,
            lightPhase: 0.2
        }
    ];
}

function buildDroneShowStars() {
    const stars = [];
    for (let index = 0; index < 36; index += 1) {
        const seed = noise(index * 17.23);
        stars.push({
            x: victoryFx.width * (0.08 + 0.84 * noise(seed * 19.7)),
            y: victoryFx.height * (0.05 + 0.32 * noise(seed * 27.1 + 4)),
            size: 0.7 + noise(seed * 13.2 + 8) * 1.6,
            alpha: 0.16 + noise(seed * 21.4 + 2) * 0.35
        });
    }
    return stars;
}

function createDroneFleet(count, bird) {
    return Array.from({ length: count }, (_, index) => {
        const boatIndex = index % DRONE_SHOW_BOAT_POSITIONS.length;
        const palette = bird.palette[index % bird.palette.length];
        return {
            x: 0,
            y: 0,
            size: 1.8,
            alpha: 0.12,
            detail: 0,
            hue: palette.hue,
            sat: palette.sat,
            light: palette.light,
            boatIndex,
            seedA: noise(index * 3.71 + 1),
            seedB: noise(index * 7.17 + 2),
            seedC: noise(index * 11.13 + 3),
            phase: noise(index * 5.81 + 6) * Math.PI * 2
        };
    });
}

function buildDroneShowFormations(birds) {
    const firstBird = birds[0] ?? DRONE_SHOW_BIRD_TIERS[0];
    const finalBird = birds[birds.length - 1] ?? firstBird;
    return {
        launch: buildLaunchFormation(DRONE_SHOW_DRONE_COUNT, firstBird),
        figures: birds.map((bird, index) => {
            const layout = getDroneShowFigureLayout(bird.id);
            const direction = index % 2 === 0 ? 1 : -1;
            const centerXA = direction > 0 ? layout.centerXA : layout.centerXD;
            const centerXB = direction > 0 ? layout.centerXB : layout.centerXC;
            const centerXC = direction > 0 ? layout.centerXC : layout.centerXB;
            const centerXD = direction > 0 ? layout.centerXD : layout.centerXA;
            return {
                bird,
                poseA: buildShowFormation(bird, {
                    flap: layout.flapA + index * layout.flapDriftA,
                    bank: layout.bankA * direction + direction * index * 0.02,
                    centerX: centerXA + direction * index * 0.018,
                    centerY: layout.centerYA,
                    scale: layout.scaleA
                }),
                poseB: buildShowFormation(bird, {
                    flap: layout.flapB + index * layout.flapDriftB,
                    bank: layout.bankB * direction + direction * index * 0.016,
                    centerX: centerXB + direction * index * 0.014,
                    centerY: layout.centerYB,
                    scale: layout.scaleB
                }),
                poseC: buildShowFormation(bird, {
                    flap: layout.flapC + index * layout.flapDriftC,
                    bank: layout.bankC * direction + direction * index * 0.012,
                    centerX: centerXC + direction * index * 0.01,
                    centerY: layout.centerYC,
                    scale: layout.scaleC
                }),
                poseD: buildShowFormation(bird, {
                    flap: layout.flapD + index * layout.flapDriftD,
                    bank: layout.bankD * direction + direction * index * 0.008,
                    centerX: centerXD + direction * index * 0.008,
                    centerY: layout.centerYD,
                    scale: layout.scaleD
                })
            };
        }),
        exit: buildExitFormation(DRONE_SHOW_DRONE_COUNT, finalBird)
    };
}

function getDroneShowFigureLayout(id) {
    switch (id) {
        case "western-sandpiper":
            return {
                flapA: -0.02,
                flapB: 0.01,
                flapC: -0.008,
                flapD: 0.012,
                flapDriftA: 0.005,
                flapDriftB: 0.004,
                flapDriftC: 0.002,
                flapDriftD: 0.0015,
                bankA: -0.05,
                bankB: -0.018,
                bankC: 0.014,
                bankD: 0.042,
                centerXA: 0.35,
                centerXB: 0.42,
                centerXC: 0.49,
                centerXD: 0.57,
                centerYA: 0.41,
                centerYB: 0.408,
                centerYC: 0.4,
                centerYD: 0.392,
                scaleA: 0.29,
                scaleB: 0.302,
                scaleC: 0.298,
                scaleD: 0.29
            };
        case "rufous-hummingbird":
            return {
                flapA: -0.12,
                flapB: 0.1,
                flapC: -0.06,
                flapD: 0.12,
                flapDriftA: 0.014,
                flapDriftB: 0.012,
                flapDriftC: 0.009,
                flapDriftD: 0.008,
                bankA: -0.07,
                bankB: -0.015,
                bankC: 0.022,
                bankD: 0.065,
                centerXA: 0.36,
                centerXB: 0.43,
                centerXC: 0.5,
                centerXD: 0.57,
                centerYA: 0.4,
                centerYB: 0.39,
                centerYC: 0.382,
                centerYD: 0.374,
                scaleA: 0.31,
                scaleB: 0.322,
                scaleC: 0.318,
                scaleD: 0.31
            };
        case "great-blue-heron":
            return {
                flapA: -0.08,
                flapB: 0.05,
                flapC: 0.02,
                flapD: 0.1,
                flapDriftA: 0.01,
                flapDriftB: 0.008,
                flapDriftC: 0.006,
                flapDriftD: 0.004,
                bankA: -0.06,
                bankB: -0.01,
                bankC: 0.028,
                bankD: 0.06,
                centerXA: 0.38,
                centerXB: 0.44,
                centerXC: 0.5,
                centerXD: 0.56,
                centerYA: 0.37,
                centerYB: 0.35,
                centerYC: 0.34,
                centerYD: 0.325,
                scaleA: 0.355,
                scaleB: 0.367,
                scaleC: 0.363,
                scaleD: 0.355
            };
        case "bald-eagle":
            return {
                flapA: -0.015,
                flapB: 0.01,
                flapC: -0.006,
                flapD: 0.014,
                flapDriftA: 0.004,
                flapDriftB: 0.003,
                flapDriftC: 0.002,
                flapDriftD: 0.0015,
                bankA: -0.04,
                bankB: -0.008,
                bankC: 0.02,
                bankD: 0.048,
                centerXA: 0.37,
                centerXB: 0.44,
                centerXC: 0.51,
                centerXD: 0.59,
                centerYA: 0.39,
                centerYB: 0.38,
                centerYC: 0.376,
                centerYD: 0.368,
                scaleA: 0.255,
                scaleB: 0.265,
                scaleC: 0.262,
                scaleD: 0.255
            };
        case "barred-owl":
            return {
                flapA: 0,
                flapB: 0,
                flapC: 0,
                flapD: 0,
                flapDriftA: 0,
                flapDriftB: 0,
                flapDriftC: 0,
                flapDriftD: 0,
                bankA: -0.03,
                bankB: -0.012,
                bankC: 0.014,
                bankD: 0.032,
                centerXA: 0.37,
                centerXB: 0.44,
                centerXC: 0.51,
                centerXD: 0.585,
                centerYA: 0.4,
                centerYB: 0.39,
                centerYC: 0.386,
                centerYD: 0.378,
                scaleA: 0.255,
                scaleB: 0.265,
                scaleC: 0.262,
                scaleD: 0.255
            };
        case "beaver":
            return {
                flapA: 0,
                flapB: 0,
                flapC: 0,
                flapD: 0,
                flapDriftA: 0,
                flapDriftB: 0,
                flapDriftC: 0,
                flapDriftD: 0,
                bankA: -0.025,
                bankB: -0.008,
                bankC: 0.014,
                bankD: 0.026,
                centerXA: 0.36,
                centerXB: 0.43,
                centerXC: 0.5,
                centerXD: 0.58,
                centerYA: 0.45,
                centerYB: 0.442,
                centerYC: 0.434,
                centerYD: 0.426,
                scaleA: 0.305,
                scaleB: 0.317,
                scaleC: 0.313,
                scaleD: 0.305
            };
        case "stellers-jay":
            return {
                flapA: -0.05,
                flapB: 0.03,
                flapC: -0.015,
                flapD: 0.052,
                flapDriftA: 0.008,
                flapDriftB: 0.006,
                flapDriftC: 0.004,
                flapDriftD: 0.003,
                bankA: -0.05,
                bankB: -0.01,
                bankC: 0.018,
                bankD: 0.046,
                centerXA: 0.38,
                centerXB: 0.44,
                centerXC: 0.5,
                centerXD: 0.555,
                centerYA: 0.38,
                centerYB: 0.37,
                centerYC: 0.362,
                centerYD: 0.348,
                scaleA: 0.34,
                scaleB: 0.352,
                scaleC: 0.348,
                scaleD: 0.34
            };
        default:
            return {
                flapA: 0,
                flapB: 0,
                flapC: 0,
                flapD: 0,
                flapDriftA: 0,
                flapDriftB: 0,
                flapDriftC: 0,
                flapDriftD: 0,
                bankA: -0.04,
                bankB: -0.01,
                bankC: 0.018,
                bankD: 0.042,
                centerXA: 0.37,
                centerXB: 0.44,
                centerXC: 0.51,
                centerXD: 0.585,
                centerYA: 0.41,
                centerYB: 0.4,
                centerYC: 0.398,
                centerYD: 0.388,
                scaleA: 0.27,
                scaleB: 0.28,
                scaleC: 0.277,
                scaleD: 0.27
            };
    }
}

function buildLaunchFormation(count, bird) {
    return Array.from({ length: count }, (_, index) => {
        const boat = victoryFx.boats[index % victoryFx.boats.length];
        const lane = Math.floor(index / victoryFx.boats.length);
        const paletteEntry = bird.palette[index % bird.palette.length];
        return {
            x: boat.x + ((lane % 7) - 3) * 5 + (noise(index * 2.11) - 0.5) * 8,
            y: boat.y - 10 - lane * 2.2 - noise(index * 3.13) * 16,
            size: 1.4 + noise(index * 5.4) * 1.2,
            alpha: 0.22 + noise(index * 7.6) * 0.16,
            detail: 0,
            colorIndex: index % bird.palette.length,
            hue: paletteEntry.hue,
            sat: paletteEntry.sat,
            light: paletteEntry.light
        };
    });
}

function buildExitFormation(count, bird) {
    return Array.from({ length: count }, (_, index) => {
        const paletteEntry = bird.palette[index % bird.palette.length];
        return {
            x: victoryFx.width * (0.08 + 0.84 * noise(index * 8.19 + 1)),
            y: victoryFx.height * (0.04 + 0.22 * noise(index * 5.27 + 3)),
            size: 0.6 + noise(index * 4.17 + 2) * 1.1,
            alpha: 0.02 + noise(index * 9.41 + 7) * 0.06,
            detail: 0,
            colorIndex: index % bird.palette.length,
            hue: paletteEntry.hue,
            sat: paletteEntry.sat,
            light: paletteEntry.light
        };
    });
}

function buildShowFormation(bird, pose) {
    const points = stylizeDroneShowPoints(
        bird.id,
        getDroneShowReferenceShape(bird, pose) ?? getDroneShowFallbackShape(bird.id, pose)
    );
    return normalizeTargetPoints(
        transformFormationPoints(points, bird.palette, pose),
        DRONE_SHOW_DRONE_COUNT,
        getDroneShowTargetJitter(bird.id)
    );
}

function getDroneShowTargetJitter(id) {
    switch (id) {
        case "western-sandpiper":
        case "rufous-hummingbird":
        case "great-blue-heron":
        case "beaver":
        case "stellers-jay":
            return 0.2;
        case "bald-eagle":
            return 0.5;
        case "barred-owl":
            return 0.52;
        case "spirit-bear":
            return 0.5;
        default:
            return 0.7;
    }
}

function getDroneShowReferenceShape(bird, pose) {
    const bakedShapes = typeof DRONE_SHOW_REFERENCE_SHAPES !== "undefined"
        ? DRONE_SHOW_REFERENCE_SHAPES
        : null;
    const cachedShape = bakedShapes?.[bird.id];
    if (!cachedShape?.length) {
        return null;
    }

    return cachedShape.map((point) => {
        const x = point[0];
        const y = point[1];
        const colorIndex = point[2];
        const alpha = point[3];
        const size = point[4];
        const flapStrength = getDroneShowFlapStrength(bird.id);
        const wingWarp = bird.id === "spirit-bear"
            ? 0
            : pose.flap * (Math.abs(x) * flapStrength - flapStrength * 0.18);
        const bodyLift = bird.id === "spirit-bear" ? 0 : pose.flap * x * flapStrength * 0.18;

        return {
            x: x * (1 + pose.flap * 0.03) + bodyLift,
            y: y + wingWarp,
            colorIndex,
            alpha,
            size
        };
    });
}

function getDroneShowFlapStrength(id) {
    switch (id) {
        case "western-sandpiper":
            return 0;
        case "rufous-hummingbird":
            return 0;
        case "great-blue-heron":
            return 0.026;
        case "bald-eagle":
            return 0;
        case "barred-owl":
            return 0;
        case "beaver":
            return 0;
        case "stellers-jay":
            return 0.018;
        default:
            return 0;
    }
}

function stylizeDroneShowPoints(id, points) {
    if (
        id === "western-sandpiper" ||
        id === "great-blue-heron" ||
        id === "beaver" ||
        id === "stellers-jay"
    ) {
        return emphasizeDroneShowOutline(id, points);
    }
    return emphasizeDroneShowPortrait(id, points);
}

function emphasizeDroneShowPortrait(id, points) {
    const center = points.reduce(
        (acc, point) => ({
            x: acc.x + point.x,
            y: acc.y + point.y
        }),
        { x: 0, y: 0 }
    );
    center.x /= Math.max(1, points.length);
    center.y /= Math.max(1, points.length);

    const config = getDroneShowPortraitConfig(id);

    return points.map((point) => {
        const isEdge = point.alpha >= 0.95;
        const dx = point.x - center.x;
        const dy = point.y - center.y;
        const distance = Math.hypot(dx, dy) || 1;
        let x = point.x;
        let y = point.y + config.lift;
        let size = point.size;
        let alpha = point.alpha;

        if (isEdge) {
            x += (dx / distance) * config.edgeBoostX;
            y += (dy / distance) * config.edgeBoostY;
            size *= config.edgeSize;
            alpha = 1;
        } else {
            x = center.x + dx * config.innerScaleX;
            y = center.y + dy * config.innerScaleY + config.innerLift;
            size *= config.innerSize;
            alpha = Math.min(1, alpha * config.innerAlpha);
        }

        return {
            ...point,
            x,
            y,
            size,
            alpha
        };
    });
}

function getDroneShowPortraitConfig(id) {
    switch (id) {
        case "western-sandpiper":
            return {
                edgeBoostX: 0.01,
                edgeBoostY: 0.008,
                edgeSize: 1.04,
                innerScaleX: 1,
                innerScaleY: 1,
                innerSize: 0.82,
                innerAlpha: 1.02,
                innerLift: -0.002,
                lift: -0.008
            };
        case "rufous-hummingbird":
            return {
                edgeBoostX: 0,
                edgeBoostY: 0,
                edgeSize: 1,
                innerScaleX: 1,
                innerScaleY: 1,
                innerSize: 1,
                innerAlpha: 1,
                innerLift: 0,
                lift: 0
            };
        case "bald-eagle":
            return {
                edgeBoostX: 0.011,
                edgeBoostY: 0.009,
                edgeSize: 1.05,
                innerScaleX: 1,
                innerScaleY: 1,
                innerSize: 0.8,
                innerAlpha: 1.04,
                innerLift: -0.001,
                lift: -0.006
            };
        case "barred-owl":
            return {
                edgeBoostX: 0.009,
                edgeBoostY: 0.009,
                edgeSize: 1.05,
                innerScaleX: 1,
                innerScaleY: 1,
                innerSize: 0.8,
                innerAlpha: 1.04,
                innerLift: -0.001,
                lift: -0.004
            };
        default:
            return {
                edgeBoostX: 0.011,
                edgeBoostY: 0.01,
                edgeSize: 1.04,
                innerScaleX: 1,
                innerScaleY: 1,
                innerSize: 0.81,
                innerAlpha: 1.03,
                innerLift: -0.001,
                lift: -0.002
            };
    }
}

function applyCuteBirdTransform(x, y, size, config) {
    const headWeight = gaussian2d(x, y, config.headX, config.headY, 0.24, 0.22);
    x = config.headX + (x - config.headX) * (1 + config.headWidth * headWeight);
    y = config.headY + (y - config.headY) * (1 + config.headHeight * headWeight);
    size += headWeight * 0.035;

    const crownWeight = gaussian2d(x, y, config.headX - config.frontSign * 0.02, config.headY - 0.12, 0.22, 0.12);
    y -= crownWeight * config.crownLift;

    const cheekWeight = gaussian2d(x, y, config.headX - config.frontSign * 0.05, config.headY + 0.06, 0.2, 0.16);
    x -= config.frontSign * cheekWeight * config.cheekPuff;
    y += cheekWeight * 0.012;

    const beakDepth = Math.max(0, config.frontSign * x - config.beakLimit);
    if (beakDepth > 0) {
        x -= config.frontSign * beakDepth * config.beakPull;
        y += beakDepth * config.beakDrop;
    }

    const bellyWeight = gaussian2d(x, y, config.frontSign * 0.02, 0.22, 0.55, 0.26);
    y += config.bellyLift * bellyWeight;

    const chestWeight = gaussian2d(x, y, config.frontSign * 0.12, 0.02, 0.4, 0.24);
    x -= config.frontSign * chestWeight * 0.02;
    y += chestWeight * 0.018;

    const tailWeight = gaussian2d(x, y, -config.frontSign * 0.68, 0.02, 0.32, 0.24);
    x += config.frontSign * tailWeight * config.tailTuck;

    const wingWeight = gaussian2d(x, y, 0, -0.38, 0.48, 0.24);
    y += wingWeight * 0.022;

    return { x, y, size };
}

function applyCuteOwlTransform(x, y, size) {
    const headWeight = gaussian2d(x, y, 0, -0.22, 0.34, 0.24);
    x *= 1 + headWeight * 0.075;
    y = -0.22 + (y + 0.22) * (1 + headWeight * 0.095);
    size += headWeight * 0.045;

    const browWeight = gaussian2d(x, y, 0, -0.32, 0.28, 0.12);
    y -= browWeight * 0.024;

    const cheekWeight = gaussian2d(Math.abs(x), y, 0.18, -0.08, 0.14, 0.16);
    x *= 1 + cheekWeight * 0.04;
    y += cheekWeight * 0.014;

    const bodyWeight = gaussian2d(x, y, 0, 0.14, 0.44, 0.32);
    y += bodyWeight * 0.055;
    x *= 1 - bodyWeight * 0.03;

    const wingTipWeight = gaussian2d(Math.abs(x), y, 0.86, -0.08, 0.18, 0.24);
    x *= 1 - wingTipWeight * 0.045;

    return { x, y, size };
}

function applyCuteBearTransform(x, y, size) {
    const headWeight = gaussian2d(x, y, -0.72, -0.02, 0.28, 0.22);
    x = -0.72 + (x + 0.72) * (1 + headWeight * 0.11);
    y = -0.02 + (y + 0.02) * (1 + headWeight * 0.075);
    size += headWeight * 0.035;

    const foreheadWeight = gaussian2d(x, y, -0.76, -0.14, 0.18, 0.12);
    y -= foreheadWeight * 0.022;

    const cheekWeight = gaussian2d(x, y, -0.74, 0.02, 0.2, 0.16);
    x -= cheekWeight * 0.022;
    y += cheekWeight * 0.012;

    if (x < -0.88) {
        x = -0.88 + (x + 0.88) * 0.66;
    }

    const bodyWeight = gaussian2d(x, y, -0.05, 0.08, 0.66, 0.3);
    y += bodyWeight * 0.04;
    x += bodyWeight * 0.012;

    const legWeight = gaussian2d(x, y, -0.02, 0.52, 0.56, 0.18);
    y -= legWeight * 0.018;

    return { x, y, size };
}

function emphasizeDroneShowOutline(id, points) {
    const center = points.reduce(
        (acc, point) => ({
            x: acc.x + point.x,
            y: acc.y + point.y
        }),
        { x: 0, y: 0 }
    );
    center.x /= Math.max(1, points.length);
    center.y /= Math.max(1, points.length);

    const config = getDroneShowOutlineConfig(id);

    return points.map((point) => {
        const isEdge = point.alpha >= 0.95;
        let x = point.x;
        let y = point.y;
        let size = point.size;
        let alpha = point.alpha;

        if (!isEdge) {
            return {
                ...point,
                alpha: point.alpha,
                size: point.size * 0.84
            };
        }

        const dx = x - center.x;
        const dy = y - center.y;
        const distance = Math.hypot(dx, dy) || 1;
        const radialBoost = config.radialBoost * (0.7 + Math.min(1.1, distance * 0.45));
        x += (dx / distance) * radialBoost;
        y += (dy / distance) * radialBoost * 0.78;
        size *= config.edgeSize;

        const headWeight = gaussian2d(
            x,
            y,
            config.headCenter.x,
            config.headCenter.y,
            config.headRadius.x,
            config.headRadius.y
        );
        x = config.headCenter.x + (x - config.headCenter.x) * (1 + config.headExpandX * headWeight);
        y = config.headCenter.y + (y - config.headCenter.y) * (1 + config.headExpandY * headWeight) - config.headLift * headWeight;
        size += headWeight * 0.045;

        const outlineWeight = gaussian2d(x, y, 0, 0.04, 0.88, 0.62);
        alpha = Math.min(1, alpha * (1 + outlineWeight * 0.06));

        return {
            ...point,
            x,
            y,
            size,
            alpha
        };
    });
}

function getDroneShowOutlineConfig(id) {
    switch (id) {
        case "western-sandpiper":
            return {
                radialBoost: 0.016,
                edgeSize: 1.11,
                headCenter: { x: -0.56, y: -0.06 },
                headRadius: { x: 0.22, y: 0.18 },
                headExpandX: 0.065,
                headExpandY: 0.04,
                headLift: 0.012
            };
        case "rufous-hummingbird":
            return {
                radialBoost: 0.013,
                edgeSize: 1.08,
                headCenter: { x: 0.56, y: -0.06 },
                headRadius: { x: 0.16, y: 0.13 },
                headExpandX: 0.022,
                headExpandY: 0.018,
                headLift: 0.004
            };
        case "great-blue-heron":
            return {
                radialBoost: 0.011,
                edgeSize: 1.06,
                headCenter: { x: 0.54, y: -0.08 },
                headRadius: { x: 0.18, y: 0.14 },
                headExpandX: 0.024,
                headExpandY: 0.018,
                headLift: 0.005
            };
        case "bald-eagle":
            return {
                radialBoost: 0.016,
                edgeSize: 1.11,
                headCenter: { x: 0.5, y: -0.07 },
                headRadius: { x: 0.2, y: 0.16 },
                headExpandX: 0.065,
                headExpandY: 0.032,
                headLift: 0.012
            };
        case "barred-owl":
            return {
                radialBoost: 0.015,
                edgeSize: 1.12,
                headCenter: { x: 0, y: -0.2 },
                headRadius: { x: 0.28, y: 0.2 },
                headExpandX: 0.05,
                headExpandY: 0.05,
                headLift: 0.013
            };
        case "beaver":
            return {
                radialBoost: 0.014,
                edgeSize: 1.08,
                headCenter: { x: -0.46, y: -0.03 },
                headRadius: { x: 0.18, y: 0.15 },
                headExpandX: 0.028,
                headExpandY: 0.022,
                headLift: 0.004
            };
        case "stellers-jay":
            return {
                radialBoost: 0.012,
                edgeSize: 1.07,
                headCenter: { x: -0.5, y: -0.09 },
                headRadius: { x: 0.22, y: 0.18 },
                headExpandX: 0.028,
                headExpandY: 0.022,
                headLift: 0.006
            };
        default:
            return {
                radialBoost: 0.015,
                edgeSize: 1.1,
                headCenter: { x: -0.72, y: -0.04 },
                headRadius: { x: 0.24, y: 0.18 },
                headExpandX: 0.05,
                headExpandY: 0.032,
                headLift: 0.01
            };
    }
}

function gaussian2d(x, y, cx, cy, rx, ry) {
    const dx = (x - cx) / rx;
    const dy = (y - cy) / ry;
    return Math.exp(-(dx * dx + dy * dy));
}

function getDroneShowFallbackShape(id, pose) {
    const builder = getDroneShowFallbackBuilder(id);
    return builder(pose);
}

function getDroneShowFallbackBuilder(id) {
    switch (id) {
        case "rufous-hummingbird":
            return buildRufousHummingbirdShape;
        case "great-blue-heron":
            return buildGreatBlueHeronShape;
        case "bald-eagle":
            return buildBaldEagleShape;
        case "barred-owl":
            return buildBarredOwlShape;
        case "beaver":
            return buildBeaverShape;
        case "stellers-jay":
            return buildStellersJayShape;
        case "spirit-bear":
            return buildSpiritBearShape;
        default:
            return buildWesternSandpiperShape;
    }
}

function getDroneShowMotionPhase(progress) {
    const forms = victoryFx.formations;
    if (!forms?.figures?.length) {
        return {
            phase: "idle",
            transitionT: 0,
            isTransition: false,
            figureIndex: 0,
            localProgress: 0
        };
    }

    const figures = forms.figures;
    const launchWindow = 0.12;
    const finaleWindowStart = 0.9;

    if (progress < launchWindow) {
        return {
            phase: "launch",
            transitionT: smoothstep(0, launchWindow, progress),
            isTransition: true,
            figureIndex: 0,
            localProgress: 0
        };
    }

    if (progress >= finaleWindowStart) {
        return {
            phase: "exit",
            transitionT: smoothstep(finaleWindowStart, 1, progress),
            isTransition: true,
            figureIndex: figures.length - 1,
            localProgress: 1
        };
    }

    const figureProgress = clamp((progress - launchWindow) / (finaleWindowStart - launchWindow), 0, 0.999999);
    const figureIndex = Math.min(figures.length - 1, Math.floor(figureProgress * figures.length));
    const localProgress = (figureProgress - figureIndex / figures.length) * figures.length;
    const timing = getDroneShowFigureTiming(figureIndex);

    if (localProgress < timing.entryEnd) {
        return {
            phase: "figure-entry",
            transitionT: smoothstep(0, timing.entryEnd, localProgress),
            isTransition: true,
            figureIndex,
            localProgress
        };
    }

    if (localProgress < timing.holdAEnd) {
        return {
            phase: "hold-a",
            transitionT: 0,
            isTransition: false,
            figureIndex,
            localProgress
        };
    }

    if (localProgress < timing.morphABEnd) {
        return {
            phase: "morph-ab",
            transitionT: smoothstep(timing.holdAEnd, timing.morphABEnd, localProgress),
            isTransition: true,
            figureIndex,
            localProgress
        };
    }

    if (localProgress < timing.holdBEnd) {
        return {
            phase: "hold-b",
            transitionT: 0,
            isTransition: false,
            figureIndex,
            localProgress
        };
    }

    if (localProgress < timing.morphBCEnd) {
        return {
            phase: "morph-bc",
            transitionT: smoothstep(timing.holdBEnd, timing.morphBCEnd, localProgress),
            isTransition: true,
            figureIndex,
            localProgress
        };
    }

    if (localProgress < timing.holdCEnd) {
        return {
            phase: "hold-c",
            transitionT: 0,
            isTransition: false,
            figureIndex,
            localProgress
        };
    }

    if (localProgress < timing.morphCDEnd) {
        return {
            phase: "morph-cd",
            transitionT: smoothstep(timing.holdCEnd, timing.morphCDEnd, localProgress),
            isTransition: true,
            figureIndex,
            localProgress
        };
    }

    return {
        phase: "hold-d",
        transitionT: 0,
        isTransition: false,
        figureIndex,
        localProgress
    };
}

function getDroneShowFigureTiming(figureIndex) {
    if (figureIndex <= 0) {
        return {
            entryEnd: 0.14,
            holdAEnd: 0.2375,
            morphABEnd: 0.455,
            holdBEnd: 0.56,
            morphBCEnd: 0.72,
            holdCEnd: 0.825,
            morphCDEnd: 0.96
        };
    }

    return {
        entryEnd: 0.13,
        holdAEnd: 0.46,
        morphABEnd: 0.57,
        holdBEnd: 0.65,
        morphBCEnd: 0.775,
        holdCEnd: 0.855,
        morphCDEnd: 0.96
    };
}

function updateDroneFleet(dt, progress) {
    const targets = buildCurrentDroneTargets(progress);
    const motionPhase = getDroneShowMotionPhase(progress);
    const dtScale = dt / 16.6667;
    const transitionPulse = motionPhase.isTransition ? Math.sin(motionPhase.transitionT * Math.PI) : 0;
    const isLaunch = motionPhase.phase === "launch";
    const isEntryHold = motionPhase.phase === "hold-a";
    const baseEase = isLaunch
        ? mix(0.05, 0.082, motionPhase.transitionT)
        : motionPhase.isTransition
            ? mix(0.018, 0.032, transitionPulse)
            : isEntryHold
                ? 0.064
                : 0.017;
    const settleEase = isLaunch
        ? mix(0.082, 0.12, motionPhase.transitionT)
        : motionPhase.isTransition
            ? mix(0.036, 0.058, transitionPulse)
            : isEntryHold
                ? 0.094
                : 0.034;

    for (let index = 0; index < victoryFx.drones.length; index += 1) {
        const drone = victoryFx.drones[index];
        const target = targets[index] ?? targets[targets.length - 1];
        if (!target) {
            continue;
        }

        const dx = target.x - drone.x;
        const dy = target.y - drone.y;
        const distanceFactor = clamp(Math.hypot(dx, dy) / Math.max(48, victoryFx.width * 0.12), 0.72, 1.16);
        const positionCap = isLaunch ? 0.24 : isEntryHold ? 0.17 : 0.105;
        const positionEase = Math.min(positionCap, (baseEase * distanceFactor) * dtScale + 0.006);

        drone.x += dx * positionEase;
        drone.y += dy * positionEase;
        drone.size += (target.size - drone.size) * settleEase * dtScale;
        drone.alpha += (target.alpha - drone.alpha) * (settleEase * 0.96) * dtScale;
        drone.detail += ((target.detail ?? 0) - (drone.detail ?? 0)) * (settleEase * 0.9) * dtScale;
        drone.hue += shortestHueDistance(drone.hue, target.hue) * (settleEase * 0.82) * dtScale;
        drone.sat += (target.sat - drone.sat) * (settleEase * 0.8) * dtScale;
        drone.light += (target.light - drone.light) * (settleEase * 0.8) * dtScale;
    }
}

function buildCurrentDroneTargets(progress) {
    const forms = victoryFx.formations;
    if (!forms?.figures?.length) {
        return [];
    }

    const figures = forms.figures;
    const launchWindow = 0.12;
    const finaleWindowStart = 0.9;
    const motionPhase = getDroneShowMotionPhase(progress);

    if (progress < launchWindow) {
        victoryFx.currentBirdIndex = 0;
        victoryFx.bird = figures[0].bird;
        return interpolateTargets(forms.launch, figures[0].poseA, motionPhase.transitionT);
    }

    if (progress >= finaleWindowStart) {
        victoryFx.currentBirdIndex = figures.length - 1;
        victoryFx.bird = figures[figures.length - 1].bird;
        return interpolateTargets(figures[figures.length - 1].poseD, forms.exit, motionPhase.transitionT);
    }

    const figureIndex = motionPhase.figureIndex;
    const figure = figures[figureIndex];
    const previousFigure = figureIndex > 0 ? figures[figureIndex - 1] : null;

    victoryFx.currentBirdIndex = figureIndex;
    victoryFx.bird = figure.bird;

    if (motionPhase.phase === "figure-entry") {
        const from = previousFigure ? previousFigure.poseD : figure.poseA;
        return interpolateTargets(from, figure.poseA, motionPhase.transitionT);
    }

    if (motionPhase.phase === "hold-a") {
        return figure.poseA;
    }

    if (motionPhase.phase === "morph-ab") {
        return interpolateTargets(figure.poseA, figure.poseB, motionPhase.transitionT);
    }

    if (motionPhase.phase === "hold-b") {
        return figure.poseB;
    }

    if (motionPhase.phase === "morph-bc") {
        return interpolateTargets(figure.poseB, figure.poseC, motionPhase.transitionT);
    }

    if (motionPhase.phase === "hold-c") {
        return figure.poseC;
    }

    if (motionPhase.phase === "morph-cd") {
        return interpolateTargets(figure.poseC, figure.poseD, motionPhase.transitionT);
    }

    return figure.poseD;
}

function interpolateTargets(from, to, t) {
    const maxLength = Math.max(from.length, to.length);
    const targets = new Array(maxLength);

    for (let index = 0; index < maxLength; index += 1) {
        const start = from[index % from.length];
        const end = to[index % to.length];
        targets[index] = {
            x: mix(start.x, end.x, t),
            y: mix(start.y, end.y, t),
            size: mix(start.size, end.size, t),
            alpha: mix(start.alpha, end.alpha, t),
            detail: mix(start.detail ?? 0, end.detail ?? 0, t),
            colorIndex: t < 0.5 ? start.colorIndex : end.colorIndex,
            hue: start.hue + shortestHueDistance(start.hue, end.hue) * t,
            sat: mix(start.sat, end.sat, t),
            light: mix(start.light, end.light, t)
        };
    }

    return targets;
}

function drawDroneShow(elapsed, progress) {
    const ctx = victoryFx.ctx;
    if (!ctx) {
        return;
    }

    const waterline = victoryFx.height * 0.76;
    const isOutlineFigure =
        victoryFx.bird?.id === "western-sandpiper" ||
        victoryFx.bird?.id === "great-blue-heron" ||
        victoryFx.bird?.id === "beaver" ||
        victoryFx.bird?.id === "stellers-jay";
    const introFade = smoothstep(0, DRONE_SHOW_INTRO_FADE_IN_MS, elapsed);
    const deepNight = smoothstep(0.18, 0.82, progress);
    const finaleFade = smoothstep(0.88, 1, progress);
    victoryFx.fadeAlpha = 0.1 + deepNight * 0.2 + finaleFade * 0.12;

    ctx.clearRect(0, 0, victoryFx.width, victoryFx.height);
    ctx.save();
    ctx.globalAlpha = introFade;
    drawDroneBackdrop(ctx, elapsed, waterline);
    if (victoryFx.fadeAlpha > 0.001) {
        ctx.fillStyle = `rgba(0, 0, 0, ${victoryFx.fadeAlpha.toFixed(3)})`;
        ctx.fillRect(0, 0, victoryFx.width, victoryFx.height);
    }

    for (let pass = 0; pass < 2; pass += 1) {
        for (let index = 0; index < victoryFx.drones.length; index += 1) {
            const drone = victoryFx.drones[index];
            const detailFactor = clamp(drone.detail ?? 0, 0, 1);
            const isDetailPass = detailFactor > 0.35;
            if ((pass === 0 && isDetailPass) || (pass === 1 && !isDetailPass)) {
                continue;
            }

            const shimmer = 0.965 + 0.035 * Math.sin(elapsed * 0.0032 + drone.phase);
            const alpha = Math.max(0, Math.min(1, drone.alpha * shimmer));
            if (alpha <= 0.01) {
                continue;
            }

            const baseRadius = isOutlineFigure ? 0.62 : 0.76;
            const sizeFactor = isOutlineFigure ? 0.66 + shimmer * 0.025 : 0.84 + shimmer * 0.045;
            const detailRadius = Math.max(0.24, drone.size * (0.34 + shimmer * 0.018));
            const radius = mix(
                Math.max(baseRadius, drone.size * sizeFactor),
                detailRadius,
                detailFactor
            );
            const baseSat = Math.max(18, drone.sat - 10);
            const baseLight = Math.min(92, drone.light + 2);
            const droneSat = mix(baseSat, Math.max(10, baseSat - 14), detailFactor);
            const droneLight = mix(baseLight, Math.min(98, baseLight + 10), detailFactor);
            const fillAlpha = alpha * mix(1, 0.54, detailFactor);
            const glowAlpha = Math.min(
                isOutlineFigure ? 0.055 : 0.11,
                fillAlpha * mix(isOutlineFigure ? 0.06 : 0.095, 0.01, detailFactor)
            );
            ctx.shadowColor = `hsla(${drone.hue}, ${droneSat}%, ${droneLight}%, ${glowAlpha})`;
            ctx.shadowBlur = mix(
                isOutlineFigure ? 0.08 + radius * 0.08 : 0.38 + radius * 0.24,
                0.02 + radius * 0.035,
                detailFactor
            );
            ctx.fillStyle = `hsla(${drone.hue}, ${droneSat}%, ${droneLight}%, ${Math.min(1, fillAlpha)})`;
            ctx.beginPath();
            ctx.arc(drone.x, drone.y, radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;

            if (drone.y < waterline - 8) {
                const reflectionAlpha = fillAlpha
                    * mix(isOutlineFigure ? 0.003 : 0.005, 0.0018, detailFactor)
                    * (1 - (waterline - drone.y) / Math.max(120, waterline));
                if (reflectionAlpha > 0.01) {
                    ctx.fillStyle = `hsla(${drone.hue}, ${droneSat}%, ${Math.min(88, droneLight)}%, ${reflectionAlpha})`;
                    ctx.beginPath();
                    ctx.ellipse(
                        drone.x,
                        waterline + (waterline - drone.y) * 0.16,
                        radius * mix(0.28, 0.2, detailFactor),
                        radius * mix(0.85, 0.56, detailFactor),
                        0,
                        0,
                        Math.PI * 2
                    );
                    ctx.fill();
                }
            }
        }
    }

    ctx.restore();
}

function drawDroneBackdrop(ctx, elapsed, waterline) {
    const skyGradient = ctx.createLinearGradient(0, 0, 0, waterline);
    skyGradient.addColorStop(0, "#020611");
    skyGradient.addColorStop(0.5, "#071427");
    skyGradient.addColorStop(1, "#0a1d31");
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, victoryFx.width, waterline);

    const horizonGlow = ctx.createLinearGradient(0, waterline - 70, 0, waterline + 30);
    horizonGlow.addColorStop(0, "rgba(38, 89, 132, 0)");
    horizonGlow.addColorStop(1, "rgba(38, 89, 132, 0.28)");
    ctx.fillStyle = horizonGlow;
    ctx.fillRect(0, waterline - 70, victoryFx.width, 100);

    for (let index = 0; index < victoryFx.stars.length; index += 1) {
        const star = victoryFx.stars[index];
        const pulse = 0.82 + 0.18 * Math.sin(elapsed * 0.0012 + index);
        ctx.fillStyle = `rgba(226, 237, 255, ${star.alpha * pulse})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
    }

    const waterGradient = ctx.createLinearGradient(0, waterline, 0, victoryFx.height);
    waterGradient.addColorStop(0, "#081627");
    waterGradient.addColorStop(0.4, "#06101d");
    waterGradient.addColorStop(1, "#02060d");
    ctx.fillStyle = waterGradient;
    ctx.fillRect(0, waterline, victoryFx.width, victoryFx.height - waterline);

    ctx.lineWidth = 1;
    for (let index = 0; index < 12; index += 1) {
        const y = waterline + 10 + index * 12;
        const alpha = 0.04 + index * 0.01;
        ctx.strokeStyle = `rgba(108, 174, 214, ${alpha})`;
        ctx.beginPath();
        for (let x = 0; x <= victoryFx.width + 20; x += 20) {
            const waveY = y + Math.sin((x + elapsed * 0.06 + index * 12) * 0.024) * (1.8 + index * 0.12);
            if (x === 0) {
                ctx.moveTo(x, waveY);
            } else {
                ctx.lineTo(x, waveY);
            }
        }
        ctx.stroke();
    }

    for (let index = 0; index < victoryFx.boats.length; index += 1) {
        drawDroneBoat(ctx, victoryFx.boats[index], elapsed);
    }
}

function drawDroneBoat(ctx, boat, elapsed) {
    if (boat.type === "barge") {
        drawDroneBarge(ctx, boat, elapsed);
        return;
    }

    drawDroneSailboat(ctx, boat, elapsed);
}

function drawDroneBarge(ctx, boat, elapsed) {
    ctx.fillStyle = "#020409";
    ctx.beginPath();
    ctx.moveTo(boat.x - boat.length * 0.52, boat.y);
    ctx.lineTo(boat.x - boat.length * 0.46, boat.y + boat.height);
    ctx.lineTo(boat.x + boat.length * 0.42, boat.y + boat.height);
    ctx.lineTo(boat.x + boat.length * 0.5, boat.y);
    ctx.closePath();
    ctx.fill();

    ctx.fillRect(boat.x - boat.cabinWidth * 0.5, boat.y - boat.cabinHeight, boat.cabinWidth, boat.cabinHeight);

    const lightAlpha = 0.16 + 0.08 * Math.sin(elapsed * 0.0014 + boat.lightPhase);
    ctx.fillStyle = `rgba(255, 223, 158, ${lightAlpha})`;
    for (let index = 0; index < 4; index += 1) {
        const lightX = boat.x - boat.length * 0.24 + index * boat.length * 0.16;
        const lightY = boat.y + boat.height * 0.26 + (index % 2) * 1.2;
        ctx.fillRect(lightX, lightY, 1.8, 1.8);
    }

    ctx.strokeStyle = `rgba(96, 180, 220, ${0.04 + lightAlpha * 0.1})`;
    ctx.beginPath();
    ctx.moveTo(boat.x - boat.length * 0.14, boat.y + boat.height);
    ctx.lineTo(boat.x - boat.length * 0.12, boat.y + 20);
    ctx.moveTo(boat.x + boat.length * 0.08, boat.y + boat.height);
    ctx.lineTo(boat.x + boat.length * 0.1, boat.y + 18);
    ctx.stroke();
}

function drawDroneSailboat(ctx, boat, elapsed) {
    ctx.fillStyle = "#020409";
    ctx.beginPath();
    ctx.moveTo(boat.x - boat.length * 0.54, boat.y + 1);
    ctx.lineTo(boat.x - boat.length * 0.36, boat.y + boat.height);
    ctx.lineTo(boat.x + boat.length * 0.36, boat.y + boat.height);
    ctx.lineTo(boat.x + boat.length * 0.52, boat.y + 1);
    ctx.closePath();
    ctx.fill();

    ctx.fillRect(boat.x - boat.cabinWidth * 0.46, boat.y - boat.cabinHeight + 2, boat.cabinWidth, boat.cabinHeight - 1);

    ctx.strokeStyle = "rgba(178, 198, 214, 0.42)";
    ctx.lineWidth = 1.15;
    ctx.beginPath();
    ctx.moveTo(boat.x, boat.y - boat.cabinHeight - 2);
    ctx.lineTo(boat.x, boat.y - boat.mastHeight);
    ctx.stroke();

    ctx.fillStyle = "rgba(194, 206, 214, 0.14)";
    ctx.beginPath();
    ctx.moveTo(boat.x, boat.y - boat.mastHeight + 4);
    ctx.lineTo(boat.x + boat.length * 0.26, boat.y - boat.sailHeight);
    ctx.lineTo(boat.x + boat.length * 0.04, boat.y - boat.cabinHeight - 2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "rgba(194, 206, 214, 0.08)";
    ctx.beginPath();
    ctx.moveTo(boat.x - 2, boat.y - boat.mastHeight + 10);
    ctx.lineTo(boat.x - boat.length * 0.16, boat.y - boat.sailHeight * 0.72);
    ctx.lineTo(boat.x - boat.length * 0.02, boat.y - boat.cabinHeight + 1);
    ctx.closePath();
    ctx.fill();

    const lightAlpha = 0.22 + 0.12 * Math.sin(elapsed * 0.0021 + boat.lightPhase);
    ctx.fillStyle = `rgba(255, 223, 158, ${lightAlpha})`;
    ctx.fillRect(boat.x - 4.5, boat.y - boat.cabinHeight + 5, 3.2, 3.2);

    ctx.strokeStyle = `rgba(90, 174, 214, ${0.07 + lightAlpha * 0.12})`;
    ctx.beginPath();
    ctx.moveTo(boat.x, boat.y + boat.height);
    ctx.lineTo(boat.x, boat.y + 26);
    ctx.stroke();
}

function drawDroneShowCaption(ctx) {
    void ctx;
}

function buildWesternSandpiperShape(pose) {
    const points = [];
    const flap = pose.flap;
    pushStroke(points, [[-1.08, -0.04 - flap * 0.24], [-0.8, -0.23 - flap * 0.1], [-0.48, -0.15], [-0.16, -0.04]], 30, 1, 0.96, 1.02);
    pushStroke(points, [[-0.18, -0.03], [0.12, -0.05 + flap * 0.04], [0.4, 0]], 18, 0, 0.96, 1.04);
    pushEllipse(points, 0.12, 0.02, 0.27, 0.12, 32, 0.08, 0, 0.98, 1.12);
    pushEllipse(points, 0.38, -0.04, 0.09, 0.06, 12, 0, 1, 1, 0.98);
    pushStroke(points, [[0.43, -0.05], [0.72, -0.01]], 14, 2, 0.94, 0.9);
    pushStroke(points, [[-0.12, -0.03], [-0.42, -0.14 + flap * 0.18], [-0.74, 0.03 + flap * 0.28], [-1, 0.12 + flap * 0.34]], 28, 1, 0.94, 0.98);
    pushStroke(points, [[-0.04, 0.1], [-0.22, 0.16], [-0.38, 0.2]], 12, 0, 0.84, 0.82);
    pushStroke(points, [[0.08, 0.12], [0.04, 0.34]], 8, 2, 0.72, 0.72);
    pushStroke(points, [[0.2, 0.12], [0.23, 0.36]], 8, 2, 0.72, 0.72);
    return points;
}

function buildRufousHummingbirdShape(pose) {
    const points = [];
    const flap = pose.flap;
    pushStroke(points, [[-0.22, 0.02], [-0.54, -0.18 - flap * 0.5], [-0.88, -0.5 - flap * 0.28]], 24, 1, 0.96, 0.92);
    pushStroke(points, [[-0.16, 0.04], [-0.48, 0.22 + flap * 0.32], [-0.82, 0.5 + flap * 0.2]], 22, 1, 0.94, 0.9);
    pushEllipse(points, 0.06, 0.02, 0.22, 0.11, 24, 0.08, 0, 0.98, 1.08);
    pushEllipse(points, 0.28, -0.04, 0.08, 0.06, 10, 0, 1, 1, 0.94);
    pushStroke(points, [[0.32, -0.05], [0.82, -0.12]], 16, 2, 0.94, 0.82);
    pushStroke(points, [[-0.1, 0.03], [-0.34, 0.12], [-0.56, 0.2]], 14, 0, 0.9, 0.9);
    pushStroke(points, [[-0.18, 0.06], [-0.4, 0.26], [-0.62, 0.46]], 16, 0, 0.84, 0.8);
    pushStroke(points, [[-0.2, -0.01], [-0.4, -0.22], [-0.62, -0.42]], 16, 0, 0.84, 0.8);
    pushStroke(points, [[0, 0.1], [-0.02, 0.32]], 8, 2, 0.72, 0.7);
    pushStroke(points, [[0.1, 0.1], [0.14, 0.3]], 8, 2, 0.72, 0.7);
    return points;
}

function buildGreatBlueHeronShape(pose) {
    const points = [];
    const flap = pose.flap;
    pushStroke(points, [[-0.74, -0.05 - flap * 0.24], [-0.46, -0.34 - flap * 0.08], [-0.16, -0.15], [0.02, -0.02]], 30, 1, 0.94, 1.02);
    pushStroke(points, [[0.06, -0.02], [0.18, -0.22], [0.08, -0.38], [0.22, -0.56], [0.36, -0.66]], 22, 0, 0.96, 1);
    pushStroke(points, [[0.36, -0.66], [0.68, -0.62]], 10, 2, 0.94, 0.92);
    pushEllipse(points, -0.03, 0.03, 0.22, 0.1, 22, 0.12, 0, 0.95, 1.05);
    pushStroke(points, [[0.02, -0.02], [0.3, -0.14 + flap * 0.1], [0.58, -0.05 + flap * 0.22], [0.82, 0.08 + flap * 0.3]], 26, 1, 0.9, 0.96);
    pushStroke(points, [[-0.08, 0.11], [-0.1, 0.56]], 10, 2, 0.76, 0.68);
    pushStroke(points, [[0.02, 0.11], [0.02, 0.58]], 10, 2, 0.76, 0.68);
    pushStroke(points, [[-0.08, 0.58], [-0.15, 0.74]], 6, 2, 0.68, 0.62);
    pushStroke(points, [[0.02, 0.58], [0.08, 0.74]], 6, 2, 0.68, 0.62);
    return points;
}

function buildBaldEagleShape(pose) {
    const points = [];
    const flap = pose.flap;
    pushStroke(points, [[-1.18, -0.03 + flap * 0.05], [-0.82, -0.28 - flap * 0.18], [-0.46, -0.15], [-0.14, -0.04]], 34, 1, 0.96, 1.12);
    pushStroke(points, [[-0.16, -0.03], [0.05, -0.14], [0.22, -0.11], [0.34, -0.03]], 16, 0, 0.96, 1.04);
    pushEllipse(points, 0.06, 0.03, 0.24, 0.13, 28, 0.08, 0, 0.98, 1.12);
    pushEllipse(points, 0.34, -0.04, 0.1, 0.08, 12, 0, 1, 1, 1);
    pushStroke(points, [[0.4, -0.03], [0.6, 0.01]], 10, 2, 0.94, 0.88);
    pushStroke(points, [[0.02, -0.02], [0.36, -0.18 + flap * 0.08], [0.74, -0.24 - flap * 0.16], [1.16, -0.06 + flap * 0.04]], 34, 1, 0.96, 1.12);
    pushStroke(points, [[-0.2, 0.1], [-0.46, 0.22]], 12, 0, 0.82, 0.76);
    pushStroke(points, [[0.1, 0.11], [0.04, 0.24]], 8, 2, 0.74, 0.72);
    pushStroke(points, [[0.18, 0.11], [0.14, 0.25]], 8, 2, 0.74, 0.72);
    return points;
}

function buildBarredOwlShape(pose) {
    const points = [];
    const flap = pose.flap;
    pushStroke(points, [[-0.94, 0.02 + flap * 0.08], [-0.62, -0.12 - flap * 0.1], [-0.28, -0.12], [-0.02, -0.02]], 28, 1, 0.94, 1);
    pushEllipse(points, 0.02, -0.16, 0.2, 0.18, 22, 0, 1, 0.96, 1.04);
    pushEllipse(points, 0.03, 0.08, 0.3, 0.25, 38, 0, 0, 0.94, 1.14);
    pushStroke(points, [[0.06, -0.02], [0.32, -0.12], [0.68, -0.08 - flap * 0.08], [0.92, 0.04 + flap * 0.08]], 28, 1, 0.94, 1);
    pushEllipse(points, -0.04, -0.17, 0.05, 0.05, 8, 0, 2, 1, 0.66);
    pushEllipse(points, 0.1, -0.17, 0.05, 0.05, 8, 0, 2, 1, 0.66);
    pushStroke(points, [[0.04, -0.11], [0.08, -0.06]], 6, 2, 0.92, 0.68);
    pushStroke(points, [[-0.05, 0.28], [-0.08, 0.48]], 8, 2, 0.68, 0.66);
    pushStroke(points, [[0.14, 0.28], [0.18, 0.48]], 8, 2, 0.68, 0.66);
    return points;
}

function buildStellersJayShape(pose) {
    const points = [];
    const flap = pose.flap;
    pushStroke(points, [[-0.88, -0.02 - flap * 0.22], [-0.62, -0.2 - flap * 0.1], [-0.34, -0.12], [-0.08, -0.03]], 28, 1, 0.96, 1);
    pushEllipse(points, 0.08, 0.02, 0.2, 0.12, 24, 0.08, 0, 0.96, 1.08);
    pushEllipse(points, 0.28, -0.07, 0.08, 0.07, 10, 0, 1, 1, 0.98);
    pushStroke(points, [[0.3, -0.14], [0.24, -0.34], [0.38, -0.22]], 10, 2, 0.98, 0.92);
    pushStroke(points, [[0.35, -0.06], [0.58, -0.01]], 10, 2, 0.94, 0.86);
    pushStroke(points, [[-0.08, -0.03], [0.22, -0.12 + flap * 0.06], [0.52, -0.22 - flap * 0.12], [0.78, -0.05]], 24, 1, 0.94, 0.96);
    pushStroke(points, [[-0.08, 0.04], [-0.38, 0.18], [-0.72, 0.38]], 24, 1, 0.92, 0.94);
    pushStroke(points, [[0.03, 0.1], [-0.28, 0.28], [-0.6, 0.52]], 20, 0, 0.84, 0.82);
    pushStroke(points, [[0.06, 0.11], [0.02, 0.28]], 8, 2, 0.72, 0.68);
    pushStroke(points, [[0.16, 0.11], [0.16, 0.28]], 8, 2, 0.72, 0.68);
    return points;
}

function buildSpiritBearShape() {
    const points = [];
    pushEllipse(points, -0.1, 0.08, 0.42, 0.22, 54, 0.08, 0, 0.96, 1.16);
    pushEllipse(points, 0.36, -0.02, 0.16, 0.14, 20, 0, 1, 1, 1.04);
    pushStroke(points, [[0.46, -0.03], [0.64, 0.02]], 12, 2, 0.92, 0.9);
    pushStroke(points, [[-0.34, 0.16], [-0.42, 0.62]], 12, 0, 0.8, 0.8);
    pushStroke(points, [[-0.04, 0.16], [-0.08, 0.66]], 12, 0, 0.8, 0.8);
    pushStroke(points, [[0.2, 0.16], [0.18, 0.64]], 12, 0, 0.8, 0.8);
    pushStroke(points, [[0.42, 0.12], [0.38, 0.58]], 12, 0, 0.8, 0.8);
    pushStroke(points, [[-0.42, 0.03], [-0.62, -0.02], [-0.8, 0.04]], 14, 1, 0.86, 0.82);
    pushEllipse(points, 0.38, -0.04, 0.04, 0.04, 8, 0, 2, 1, 0.64);
    pushEllipse(points, 0.48, -0.02, 0.025, 0.025, 6, 0, 2, 1, 0.56);
    return points;
}

function transformFormationPoints(points, palette, pose) {
    const scale = Math.min(victoryFx.width, victoryFx.height) * pose.scale;
    const cos = Math.cos(pose.bank);
    const sin = Math.sin(pose.bank);
    const paletteEntry = palette[Math.floor(palette.length / 2)] ?? palette[0];
    return points.map((point) => {
        const px = point.x * scale;
        const py = point.y * scale;
        const x = px * cos - py * sin + victoryFx.width * pose.centerX;
        const y = px * sin + py * cos + victoryFx.height * pose.centerY;
        return {
            x,
            y,
            size: Math.max(0.7, point.size * (0.9 + scale * 0.0086)),
            alpha: point.alpha,
            detail: point.alpha < 0.95 ? 1 : 0,
            colorIndex: point.colorIndex,
            hue: paletteEntry.hue,
            sat: paletteEntry.sat,
            light: paletteEntry.light
        };
    });
}

function normalizeTargetPoints(points, count, jitter = 0.9) {
    if (points.length === count) {
        return points;
    }

    const output = [];
    for (let index = 0; index < count; index += 1) {
        const source = points[Math.floor((index / count) * points.length) % points.length];
        output.push({
            x: source.x + (noise(index * 6.1) - 0.5) * jitter,
            y: source.y + (noise(index * 8.7 + 1) - 0.5) * jitter,
            size: source.size,
            alpha: source.alpha,
            detail: source.detail ?? 0,
            colorIndex: source.colorIndex,
            hue: source.hue,
            sat: source.sat,
            light: source.light
        });
    }

    return output;
}

function pushStroke(target, coords, count, colorIndex = 0, alpha = 1, size = 1) {
    const sampled = samplePolyline(coords, count);
    for (let index = 0; index < sampled.length; index += 1) {
        target.push({
            x: sampled[index].x,
            y: sampled[index].y,
            colorIndex,
            alpha,
            size
        });
    }
}

function pushEllipse(target, cx, cy, rx, ry, count, rotation = 0, colorIndex = 0, alpha = 1, size = 1) {
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    for (let index = 0; index < count; index += 1) {
        const theta = (Math.PI * 2 * index) / count;
        const ex = Math.cos(theta) * rx;
        const ey = Math.sin(theta) * ry;
        target.push({
            x: cx + ex * cos - ey * sin,
            y: cy + ex * sin + ey * cos,
            colorIndex,
            alpha,
            size
        });
    }
}

function samplePolyline(points, count) {
    const segments = [];
    let totalLength = 0;

    for (let index = 1; index < points.length; index += 1) {
        const start = points[index - 1];
        const end = points[index];
        const length = Math.hypot(end[0] - start[0], end[1] - start[1]);
        if (length <= 0) {
            continue;
        }
        segments.push({ start, end, length, distance: totalLength });
        totalLength += length;
    }

    if (!segments.length || totalLength <= 0) {
        return [{ x: points[0][0], y: points[0][1] }];
    }

    const sampled = [];
    for (let index = 0; index < count; index += 1) {
        const distance = totalLength * (count === 1 ? 0 : index / (count - 1));
        const segment = segments.find((entry) => distance <= entry.distance + entry.length) ?? segments[segments.length - 1];
        const local = (distance - segment.distance) / segment.length;
        sampled.push({
            x: mix(segment.start[0], segment.end[0], local),
            y: mix(segment.start[1], segment.end[1], local)
        });
    }

    return sampled;
}

function shortestHueDistance(from, to) {
    let diff = to - from;
    while (diff > 180) {
        diff -= 360;
    }
    while (diff < -180) {
        diff += 360;
    }
    return diff;
}

function noise(seed) {
    const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
    return value - Math.floor(value);
}

function mix(start, end, amount) {
    return start + (end - start) * amount;
}

function smoothstep(min, max, value) {
    if (value <= min) {
        return 0;
    }
    if (value >= max) {
        return 1;
    }

    const t = (value - min) / (max - min);
    return t * t * (3 - 2 * t);
}

function getFireworkStage(progress) {
    const index = FIREWORK_STAGES.findIndex((stage) => progress <= stage.until);
    const safeIndex = index === -1 ? FIREWORK_STAGES.length - 1 : index;
    return {
        ...FIREWORK_STAGES[safeIndex],
        index: safeIndex
    };
}

function spawnStageTransition(stage) {
    if (stage.index === 0) {
        return;
    }

    spawnLaunchVolley(stage, { transition: true });
}

function spawnLaunchVolley(stage, options = {}) {
    const transition = Boolean(options.transition);
    switch (stage.pattern) {
        case "fan":
            spawnFanVolley(stage, transition);
            return;
        case "crossfire":
            spawnCrossfireVolley(stage, transition);
            return;
        case "bouquet":
            spawnBouquetVolley(stage, transition);
            return;
        case "grand-finale":
            spawnFinaleVolley(stage, transition);
            return;
        default:
            spawnSingleVolley(stage, transition);
    }
}

function spawnSingleVolley(stage, transition) {
    const baseX = victoryFx.width * (0.2 + Math.random() * 0.6);
    const totalShells = transition ? 2 : (Math.random() < 0.24 ? 2 : 1);

    for (let index = 0; index < totalShells; index += 1) {
        const offset = totalShells > 1 ? (index - (totalShells - 1) / 2) * (48 + Math.random() * 26) : 0;
        launchShell(baseX + offset, { stage });
    }
}

function spawnFanVolley(stage, transition) {
    const centerX = victoryFx.width * (0.26 + Math.random() * 0.48);
    const count = transition ? 4 : (Math.random() < 0.55 ? 3 : 2);
    const baseHue = pickHue();

    for (let index = 0; index < count; index += 1) {
        const spread = count === 1 ? 0 : (index - (count - 1) / 2) / ((count - 1) / 2 || 1);
        launchShell(centerX + spread * (56 + Math.random() * 38), {
            stage,
            hue: jitterHue(baseHue, 16),
            vx: spread * (1.1 + Math.random() * 0.9)
        });
    }
}

function spawnCrossfireVolley(stage, transition) {
    const baseHue = pickHue();
    const positions = [
        { x: victoryFx.width * 0.16, vx: 1.45 + Math.random() * 0.9 },
        { x: victoryFx.width * 0.5, vx: -0.25 + Math.random() * 0.5 },
        { x: victoryFx.width * 0.84, vx: -(1.45 + Math.random() * 0.9) }
    ];

    for (let index = 0; index < positions.length; index += 1) {
        const launch = positions[index];
        launchShell(launch.x, {
            stage,
            hue: jitterHue(baseHue, 20 + index * 5),
            vx: launch.vx
        });
    }

    if (transition) {
        launchShell(victoryFx.width * (0.32 + Math.random() * 0.36), {
            stage,
            type: "crossette",
            hue: jitterHue(baseHue, 8)
        });
    }
}

function spawnBouquetVolley(stage, transition) {
    const baseHue = pickHue();
    const centerX = victoryFx.width * (0.28 + Math.random() * 0.44);
    const count = transition ? 5 : 4;

    for (let index = 0; index < count; index += 1) {
        const offset = (index - (count - 1) / 2) * (36 + Math.random() * 26);
        const preferredType = index === Math.floor(count / 2) ? "pistil" : pickFrom(stage.types);
        launchShell(centerX + offset, {
            stage,
            type: preferredType,
            hue: jitterHue(baseHue, 24),
            secondaryHue: jitterHue(baseHue + 140, 18),
            burstScale: pickRange([stage.burstScaleRange[0], stage.burstScaleRange[1] + 0.08])
        });
    }
}

function spawnFinaleVolley(stage, transition) {
    const count = transition ? 8 : (Math.random() < 0.55 ? 6 : 7);
    const baseHue = pickHue();
    const startX = victoryFx.width * 0.1;
    const endX = victoryFx.width * 0.9;

    for (let index = 0; index < count; index += 1) {
        const ratio = count === 1 ? 0.5 : index / (count - 1);
        const typeCycle = ["willow", "pistil", "crossette", "ring", "palm", "chrysanthemum"];
        launchShell(startX + (endX - startX) * ratio, {
            stage,
            type: typeCycle[index % typeCycle.length],
            hue: jitterHue(baseHue + ratio * 140, 18),
            secondaryHue: jitterHue(baseHue + 180, 18),
            vx: (-0.8 + ratio * 1.6) * (0.65 + Math.random() * 0.35),
            burstScale: pickRange([stage.burstScaleRange[0] + 0.08, stage.burstScaleRange[1] + 0.16]),
            targetY: victoryFx.height * (stage.yRange[0] + (1 - ratio) * 0.06 + Math.random() * 0.06)
        });
    }
}

function launchShell(x, options = {}) {
    const stage = options.stage ?? FIREWORK_STAGES[0];
    const heightFactor = Math.min(1.25, Math.max(0.92, victoryFx.height / 740));
    const startX = clamp(x, victoryFx.width * 0.08, victoryFx.width * 0.92);
    const yRange = options.yRange ?? stage.yRange ?? [0.16, 0.6];
    const hue = options.hue ?? pickHue();
    const shell = {
        x: startX,
        y: victoryFx.height + 12,
        vx: (options.vx ?? (-0.9 + Math.random() * 1.8)) * heightFactor,
        vy: (options.vy ?? -(6.6 + Math.random() * 1.9)) * heightFactor,
        targetY: options.targetY ?? victoryFx.height * (yRange[0] + Math.random() * (yRange[1] - yRange[0])),
        age: 0,
        maxAge: 920 + Math.random() * 600,
        hue,
        secondaryHue: options.secondaryHue ?? jitterHue(hue + 140, 22),
        type: options.type ?? pickFrom(stage.types ?? FIREWORK_TYPES),
        burstScale: options.burstScale ?? pickRange(stage.burstScaleRange ?? [0.88, 1.16]),
        trailLength: options.trailLength ?? stage.trailLength ?? 16,
        trail: []
    };

    victoryFx.shells.push(shell);
}

function updateShells(dt, dtScale) {
    const gravity = 0.078 * dtScale;

    for (let index = victoryFx.shells.length - 1; index >= 0; index -= 1) {
        const shell = victoryFx.shells[index];
        shell.age += dt;
        shell.vy += gravity;
        shell.x += shell.vx * dtScale;
        shell.y += shell.vy * dtScale;
        shell.trail.push({ x: shell.x, y: shell.y });
        if (shell.trail.length > shell.trailLength) {
            shell.trail.shift();
        }

        const shouldExplode =
            shell.y <= shell.targetY ||
            shell.vy >= -0.4 ||
            shell.age >= shell.maxAge ||
            shell.x <= -32 ||
            shell.x >= victoryFx.width + 32;

        if (shouldExplode) {
            explodeShell(shell);
            victoryFx.shells.splice(index, 1);
        }
    }
}

function explodeShell(shell) {
    const burstScale = shell.burstScale ?? (0.88 + Math.random() * 0.42);
    if (shell.type === "ring") {
        spawnRingBurst(shell, burstScale);
        return;
    }

    if (shell.type === "palm") {
        spawnPalmBurst(shell, burstScale);
        return;
    }

    if (shell.type === "chrysanthemum") {
        spawnChrysanthemumBurst(shell, burstScale);
        return;
    }

    if (shell.type === "willow") {
        spawnWillowBurst(shell, burstScale);
        return;
    }

    if (shell.type === "crossette") {
        spawnCrossetteBurst(shell, burstScale);
        return;
    }

    if (shell.type === "pistil") {
        spawnPistilBurst(shell, burstScale);
        return;
    }

    spawnPeonyBurst(shell, burstScale);
}

function spawnPeonyBurst(shell, scale) {
    const count = 64 + Math.floor(Math.random() * 36);
    const baseSpeed = (2.1 + Math.random() * 1.6) * scale;
    for (let i = 0; i < count; i += 1) {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.13;
        const speed = baseSpeed * (0.56 + Math.random() * 0.58);
        createParticle(shell, angle, speed, {
            life: 1100 + Math.random() * 850,
            size: 1.8 + Math.random() * 2.7,
            hue: jitterHue(shell.hue, 18),
            gravity: 0.036 + Math.random() * 0.028
        });
    }
    spawnFlashHalo(shell, {
        radius: 42 + Math.random() * 16,
        lineWidth: 3 + Math.random() * 1.5,
        alpha: 0.18
    });
    spawnSparkleHalo(shell, 24 + Math.floor(Math.random() * 18));
}

function spawnRingBurst(shell, scale) {
    const count = 56 + Math.floor(Math.random() * 30);
    const baseSpeed = (2.8 + Math.random() * 1.4) * scale;
    const tilt = Math.random() * Math.PI * 2;
    for (let i = 0; i < count; i += 1) {
        const theta = (Math.PI * 2 * i) / count;
        const angle = theta + tilt;
        const speed = baseSpeed * (0.88 + Math.random() * 0.2);
        createParticle(shell, angle, speed, {
            life: 1000 + Math.random() * 700,
            size: 2.2 + Math.random() * 2.1,
            hue: jitterHue(shell.hue, 10),
            gravity: 0.028 + Math.random() * 0.024,
            drag: 0.988
        });
    }
    spawnFlashHalo(shell, {
        radius: 48 + Math.random() * 22,
        lineWidth: 2.6 + Math.random() * 1.2,
        alpha: 0.16
    });
    spawnSparkleHalo(shell, 14 + Math.floor(Math.random() * 12));
}

function spawnChrysanthemumBurst(shell, scale) {
    const petals = 14 + Math.floor(Math.random() * 8);
    for (let petal = 0; petal < petals; petal += 1) {
        const baseAngle = (Math.PI * 2 * petal) / petals + Math.random() * 0.08;
        for (let branch = 0; branch < 5; branch += 1) {
            const angle = baseAngle + (-0.22 + Math.random() * 0.44);
            const speed = (1.7 + Math.random() * 2.1) * scale * (0.78 + branch * 0.1);
            createParticle(shell, angle, speed, {
                life: 1080 + Math.random() * 760,
                size: 1.9 + Math.random() * 2.3,
                hue: jitterHue(shell.hue + branch * 6, 16),
                gravity: 0.032 + Math.random() * 0.026,
                twinkle: 0.45 + Math.random() * 0.5
            });
        }
    }
    spawnFlashHalo(shell, {
        radius: 44 + Math.random() * 20,
        lineWidth: 3.2 + Math.random() * 1.4,
        alpha: 0.17
    });
    spawnSparkleHalo(shell, 26 + Math.floor(Math.random() * 14));
}

function spawnPalmBurst(shell, scale) {
    const fronds = 10 + Math.floor(Math.random() * 5);
    for (let frond = 0; frond < fronds; frond += 1) {
        const angle = -Math.PI / 2 + (-0.5 + Math.random()) * 1.15;
        const speed = (2.5 + Math.random() * 1.6) * scale;
        for (let step = 0; step < 8; step += 1) {
            createParticle(shell, angle + (-0.03 + Math.random() * 0.06), speed * (0.66 + step * 0.08), {
                life: 920 + Math.random() * 720,
                size: 1.7 + Math.random() * 1.9,
                hue: jitterHue(shell.hue + step * 3, 12),
                gravity: 0.058 + Math.random() * 0.03,
                drag: 0.982,
                twinkle: 0.28 + Math.random() * 0.42
            });
        }
    }
    spawnFlashHalo(shell, {
        radius: 38 + Math.random() * 16,
        lineWidth: 2.4 + Math.random() * 1.1,
        alpha: 0.14
    });
    spawnSparkleHalo(shell, 20 + Math.floor(Math.random() * 10));
}

function spawnSparkleHalo(shell, count) {
    for (let i = 0; i < count; i += 1) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.9 + Math.random() * 1.7;
        createParticle(shell, angle, speed, {
            life: 340 + Math.random() * 380,
            size: 1 + Math.random() * 1.2,
            hue: 42 + Math.random() * 24,
            sat: 90 + Math.random() * 10,
            light: 72 + Math.random() * 18,
            gravity: 0.018 + Math.random() * 0.016,
            drag: 0.986,
            twinkle: 0.8 + Math.random() * 0.8
        });
    }
}

function spawnWillowBurst(shell, scale) {
    const branches = 26 + Math.floor(Math.random() * 12);
    for (let index = 0; index < branches; index += 1) {
        const angle = (-Math.PI * 0.92) + (Math.PI * 1.84 * index) / branches + (-0.08 + Math.random() * 0.16);
        const speed = (1.4 + Math.random() * 1.6) * scale;
        createParticle(shell, angle, speed, {
            life: 1500 + Math.random() * 900,
            size: 2.1 + Math.random() * 2.2,
            hue: jitterHue(42, 10),
            sat: 84 + Math.random() * 10,
            light: 62 + Math.random() * 16,
            gravity: 0.05 + Math.random() * 0.028,
            drag: 0.992,
            twinkle: 0.18 + Math.random() * 0.26,
            trail: true,
            trailLength: 9,
            trailAlpha: 0.24 + Math.random() * 0.1
        });
    }
    spawnFlashHalo(shell, {
        hue: 42,
        radius: 52 + Math.random() * 24,
        lineWidth: 3.8 + Math.random() * 1.6,
        alpha: 0.22,
        life: 480 + Math.random() * 180
    });
    spawnSparkleHalo(shell, 30 + Math.floor(Math.random() * 12));
}

function spawnCrossetteBurst(shell, scale) {
    const stars = 22 + Math.floor(Math.random() * 10);
    for (let index = 0; index < stars; index += 1) {
        const angle = (Math.PI * 2 * index) / stars + Math.random() * 0.12;
        const speed = (1.8 + Math.random() * 1.4) * scale;
        createParticle(shell, angle, speed, {
            life: 720 + Math.random() * 260,
            size: 2 + Math.random() * 1.8,
            hue: jitterHue(shell.hue, 10),
            gravity: 0.028 + Math.random() * 0.02,
            drag: 0.989,
            trail: true,
            trailLength: 6,
            trailAlpha: 0.18,
            splitAt: 0.48 + Math.random() * 0.12,
            splitCount: 4,
            splitSpeed: 1.2 + Math.random() * 0.6,
            splitHueJitter: 18
        });
    }
    spawnFlashHalo(shell, {
        radius: 46 + Math.random() * 20,
        lineWidth: 3 + Math.random() * 1.3,
        alpha: 0.16
    });
}

function spawnPistilBurst(shell, scale) {
    const outerCount = 60 + Math.floor(Math.random() * 20);
    const outerSpeed = (2.2 + Math.random() * 1.2) * scale;
    for (let index = 0; index < outerCount; index += 1) {
        const angle = (Math.PI * 2 * index) / outerCount + Math.random() * 0.1;
        createParticle(shell, angle, outerSpeed * (0.74 + Math.random() * 0.34), {
            life: 1200 + Math.random() * 760,
            size: 2 + Math.random() * 2.2,
            hue: jitterHue(shell.hue, 12),
            gravity: 0.032 + Math.random() * 0.022,
            twinkle: 0.22 + Math.random() * 0.24
        });
    }

    const innerCount = 24 + Math.floor(Math.random() * 10);
    const innerSpeed = (1.4 + Math.random() * 0.9) * scale;
    for (let index = 0; index < innerCount; index += 1) {
        const angle = (Math.PI * 2 * index) / innerCount + Math.random() * 0.16;
        createParticle(shell, angle, innerSpeed * (0.84 + Math.random() * 0.28), {
            life: 860 + Math.random() * 420,
            size: 2.2 + Math.random() * 1.9,
            hue: jitterHue(shell.secondaryHue, 10),
            sat: 88 + Math.random() * 10,
            light: 68 + Math.random() * 16,
            gravity: 0.026 + Math.random() * 0.018,
            twinkle: 0.42 + Math.random() * 0.48
        });
    }

    spawnFlashHalo(shell, {
        hue: shell.secondaryHue,
        radius: 54 + Math.random() * 22,
        lineWidth: 3.6 + Math.random() * 1.4,
        alpha: 0.18
    });
    spawnSparkleHalo(shell, 18 + Math.floor(Math.random() * 12));
}

function spawnFlashHalo(origin, options = {}) {
    victoryFx.halos.push({
        x: origin.x,
        y: origin.y,
        age: 0,
        life: options.life ?? (380 + Math.random() * 140),
        radius: 0,
        targetRadius: options.radius ?? (40 + Math.random() * 16),
        lineWidth: options.lineWidth ?? 3,
        hue: options.hue ?? origin.hue,
        sat: options.sat ?? 92,
        light: options.light ?? 70,
        alpha: options.alpha ?? 0.16
    });
}

function createParticle(shell, angle, speed, options = {}) {
    const hue = options.hue ?? shell.hue;
    victoryFx.particles.push({
        x: shell.x,
        y: shell.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        age: 0,
        life: options.life ?? 900,
        size: options.size ?? 2,
        hue,
        sat: options.sat ?? (84 + Math.random() * 14),
        light: options.light ?? (54 + Math.random() * 24),
        gravity: options.gravity ?? 0.03,
        drag: options.drag ?? 0.984,
        twinkle: options.twinkle ?? (Math.random() < 0.55 ? 0.2 + Math.random() * 0.7 : 0),
        trail: options.trail ? [] : null,
        trailLength: options.trailLength ?? 6,
        trailAlpha: options.trailAlpha ?? 0.2,
        splitAt: options.splitAt ?? null,
        splitCount: options.splitCount ?? 0,
        splitSpeed: options.splitSpeed ?? 0,
        splitHueJitter: options.splitHueJitter ?? 12
    });
}

function updateParticles(dt, dtScale) {
    for (let index = victoryFx.particles.length - 1; index >= 0; index -= 1) {
        const particle = victoryFx.particles[index];
        particle.age += dt;
        particle.vx *= Math.pow(particle.drag, dtScale);
        particle.vy *= Math.pow(particle.drag, dtScale);
        particle.vy += particle.gravity * dtScale;
        particle.x += particle.vx * dtScale;
        particle.y += particle.vy * dtScale;

        if (particle.trail) {
            particle.trail.push({ x: particle.x, y: particle.y });
            if (particle.trail.length > particle.trailLength) {
                particle.trail.shift();
            }
        }

        if (particle.splitAt && particle.age >= particle.life * particle.splitAt) {
            splitParticle(particle);
            victoryFx.particles.splice(index, 1);
            continue;
        }

        if (
            particle.age >= particle.life ||
            particle.x < -60 ||
            particle.x > victoryFx.width + 60 ||
            particle.y > victoryFx.height + 80
        ) {
            victoryFx.particles.splice(index, 1);
        }
    }
}

function splitParticle(particle) {
    const baseAngle = Math.atan2(particle.vy, particle.vx);
    for (let index = 0; index < particle.splitCount; index += 1) {
        const angle = baseAngle + (Math.PI * 2 * index) / particle.splitCount + Math.random() * 0.08;
        createParticle(
            {
                x: particle.x,
                y: particle.y,
                hue: particle.hue
            },
            angle,
            particle.splitSpeed * (0.86 + Math.random() * 0.26),
            {
                life: 520 + Math.random() * 260,
                size: Math.max(1, particle.size * 0.78),
                hue: jitterHue(particle.hue, particle.splitHueJitter),
                sat: particle.sat,
                light: Math.min(86, particle.light + 8),
                gravity: 0.026 + Math.random() * 0.02,
                drag: 0.985,
                twinkle: 0.22 + Math.random() * 0.34,
                trail: true,
                trailLength: 4,
                trailAlpha: 0.16
            }
        );
    }

    spawnFlashHalo(particle, {
        radius: 18 + Math.random() * 10,
        lineWidth: 1.8 + Math.random() * 0.8,
        alpha: 0.12,
        life: 240 + Math.random() * 80
    });
}

function updateHalos(dt, dtScale) {
    for (let index = victoryFx.halos.length - 1; index >= 0; index -= 1) {
        const halo = victoryFx.halos[index];
        halo.age += dt;
        const progress = halo.age / halo.life;
        halo.radius = halo.targetRadius * (0.22 + progress * 0.78) * (0.94 + dtScale * 0.02);

        if (halo.age >= halo.life) {
            victoryFx.halos.splice(index, 1);
        }
    }
}

function drawVictoryFireworks(elapsed) {
    const ctx = victoryFx.ctx;
    if (!ctx) {
        return;
    }

    victoryFx.fadeAlpha = Math.min(0.9, (elapsed / 1200) * 0.9);

    ctx.clearRect(0, 0, victoryFx.width, victoryFx.height);
    ctx.fillStyle = `rgba(0, 0, 0, ${victoryFx.fadeAlpha.toFixed(3)})`;
    ctx.fillRect(0, 0, victoryFx.width, victoryFx.height);

    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    for (let i = 0; i < victoryFx.shells.length; i += 1) {
        const shell = victoryFx.shells[i];
        drawShellTrail(shell);
        ctx.fillStyle = `hsla(${shell.hue}, 98%, 66%, 0.95)`;
        ctx.shadowColor = `hsla(${shell.hue}, 98%, 62%, 0.9)`;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(shell.x, shell.y, 2.1, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.shadowBlur = 0;
    for (let i = 0; i < victoryFx.halos.length; i += 1) {
        const halo = victoryFx.halos[i];
        const progress = halo.age / halo.life;
        const alpha = Math.max(0, halo.alpha * (1 - progress));
        if (alpha <= 0.01) {
            continue;
        }

        ctx.strokeStyle = `hsla(${halo.hue}, ${halo.sat}%, ${halo.light}%, ${alpha})`;
        ctx.lineWidth = Math.max(0.8, halo.lineWidth * (1 - progress * 0.5));
        ctx.beginPath();
        ctx.arc(halo.x, halo.y, halo.radius, 0, Math.PI * 2);
        ctx.stroke();
    }

    ctx.shadowBlur = 0;
    for (let i = 0; i < victoryFx.particles.length; i += 1) {
        const particle = victoryFx.particles[i];
        const lifeRatio = 1 - particle.age / particle.life;
        const twinkleFactor = particle.twinkle
            ? 0.62 + 0.38 * Math.sin((elapsed + particle.x + particle.y) * 0.03 * particle.twinkle)
            : 1;
        const alpha = Math.max(0, lifeRatio * twinkleFactor);
        if (alpha <= 0.01) {
            continue;
        }

        const radius = Math.max(0.7, particle.size * (0.55 + lifeRatio * 0.75));
        if (particle.trail && particle.trail.length > 1) {
            for (let idx = 1; idx < particle.trail.length; idx += 1) {
                const prev = particle.trail[idx - 1];
                const point = particle.trail[idx];
                const trailAlpha = alpha * particle.trailAlpha * (idx / particle.trail.length);
                ctx.strokeStyle = `hsla(${particle.hue}, ${particle.sat}%, ${particle.light}%, ${trailAlpha})`;
                ctx.lineWidth = Math.max(0.7, radius * 0.7);
                ctx.beginPath();
                ctx.moveTo(prev.x, prev.y);
                ctx.lineTo(point.x, point.y);
                ctx.stroke();
            }
        }

        ctx.fillStyle = `hsla(${particle.hue}, ${particle.sat}%, ${particle.light}%, ${Math.min(1, alpha)})`;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, radius, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
}

function drawShellTrail(shell) {
    const ctx = victoryFx.ctx;
    if (!ctx || shell.trail.length < 2) {
        return;
    }

    for (let idx = 1; idx < shell.trail.length; idx += 1) {
        const prev = shell.trail[idx - 1];
        const point = shell.trail[idx];
        const alpha = idx / shell.trail.length;
        ctx.strokeStyle = `hsla(${shell.hue}, 95%, 70%, ${(alpha * 0.4).toFixed(3)})`;
        ctx.lineWidth = 1.2 + alpha * 1.4;
        ctx.beginPath();
        ctx.moveTo(prev.x, prev.y);
        ctx.lineTo(point.x, point.y);
        ctx.stroke();
    }
}

function pickHue() {
    return FIREWORKS_PALETTE[Math.floor(Math.random() * FIREWORKS_PALETTE.length)];
}

function pickFrom(items) {
    return items[Math.floor(Math.random() * items.length)];
}

function pickRange(range) {
    return range[0] + Math.random() * (range[1] - range[0]);
}

function jitterHue(hue, amount) {
    let nextHue = hue + (-amount + Math.random() * amount * 2);
    if (nextHue < 0) {
        nextHue += 360;
    }
    if (nextHue >= 360) {
        nextHue -= 360;
    }
    return nextHue;
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function toggleWebsiteFullscreen() {
    const parentDocument = getParentDocument();
    if (parentDocument?.body) {
        const expanded = !parentDocument.body.classList.contains(WEBSITE_FULLSCREEN_CLASS);
        parentDocument.body.classList.toggle(WEBSITE_FULLSCREEN_CLASS, expanded);
        applyWebsiteFullscreenState(expanded);
        return;
    }

    const parentWindow = getParentWindow();
    if (!parentWindow) {
        websiteFullscreenActive = !websiteFullscreenActive;
        applyWebsiteFullscreenState(websiteFullscreenActive);
        return;
    }

    try {
        if (typeof parentWindow.setSolitaireWebsiteFullscreen === "function") {
            parentWindow.setSolitaireWebsiteFullscreen(!websiteFullscreenActive);
            return;
        }
    } catch (error) {
        // Cross-origin parents under file:// fall through to postMessage.
    }

    parentWindow.postMessage(
        {
            type: "solitaire:toggle-website-fullscreen",
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

function handleViewportResize() {
    updateFullscreenButtonLabel();
    scheduleBoardScale();
    resizeVictoryCanvas();
}

function handleParentMessage(event) {
    if (!event.data) {
        return;
    }

    if (
        event.origin !== "null" &&
        event.origin !== "file://" &&
        event.origin !== window.location.origin
    ) {
        return;
    }

    if (event.data.type !== "solitaire:website-fullscreen-state") {
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
        if (typeof parentWindow.getSolitaireWebsiteFullscreen === "function") {
            applyWebsiteFullscreenState(Boolean(parentWindow.getSolitaireWebsiteFullscreen()));
            return;
        }
    } catch (error) {
        // Cross-origin parents under file:// fall through to postMessage.
    }

    parentWindow.postMessage(
        {
            type: "solitaire:request-website-fullscreen-state"
        },
        MESSAGE_TARGET_ORIGIN
    );
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

function initParentFullscreenObserver() {
    const parentDocument = getParentDocument();
    if (!parentDocument?.body || !("MutationObserver" in window)) {
        return;
    }

    parentFullscreenObserver = new MutationObserver(() => {
        applyWebsiteFullscreenState(parentDocument.body.classList.contains(WEBSITE_FULLSCREEN_CLASS));
    });

    parentFullscreenObserver.observe(parentDocument.body, {
        attributes: true,
        attributeFilter: ["class"]
    });
}

function applyWebsiteFullscreenState(expanded) {
    websiteFullscreenActive = expanded;
    document.body.classList.toggle("is-website-fullscreen", expanded);
    updateFullscreenButtonLabel();
    scheduleBoardScale();
}

function updateFullscreenButtonLabel() {
    if (!fullscreenBtn) {
        return;
    }

    if (websiteFullscreenActive) {
        fullscreenBtn.textContent = "Exit Fullscreen";
        return;
    }

    fullscreenBtn.textContent = "Fullscreen";
}

function scheduleBoardScale() {
    if (boardScaleFrame) {
        window.cancelAnimationFrame(boardScaleFrame);
    }

    boardScaleFrame = window.requestAnimationFrame(() => {
        boardScaleFrame = null;
        updateBoardScale();
    });
}

function updateBoardScale() {
    if (!boardEl || !boardStageEl) {
        return;
    }

    if (websiteFullscreenActive) {
        boardEl.style.height = "";
    }

    const boardStyles = window.getComputedStyle(boardEl);
    const paddingX = parseFloat(boardStyles.paddingLeft) + parseFloat(boardStyles.paddingRight);
    const paddingY = parseFloat(boardStyles.paddingTop) + parseFloat(boardStyles.paddingBottom);
    const naturalWidth = Math.ceil(boardStageEl.scrollWidth);
    const naturalHeight = Math.ceil(boardStageEl.scrollHeight);
    const boardRect = boardEl.getBoundingClientRect();
    let availableWidth = Math.max(0, boardEl.clientWidth - paddingX);
    let scale = naturalWidth > 0 ? Math.min(1, availableWidth / naturalWidth) : 1;

    if (websiteFullscreenActive) {
        const viewport = window.visualViewport;
        const viewportWidth = viewport ? viewport.width : window.innerWidth;
        const viewportHeight = viewport ? viewport.height : window.innerHeight;
        const fitSlackX = viewportWidth <= 768 ? Math.max(18, Math.ceil(viewportWidth * 0.05)) : 10;
        const fitSlackY = viewportWidth <= 768 ? 8 : 10;
        const availableViewportWidth = Math.max(
            0,
            viewportWidth - boardRect.left - paddingX - fitSlackX
        );
        const availableViewportHeight = Math.max(
            0,
            viewportHeight - boardRect.top - paddingY - fitSlackY
        );

        if (naturalWidth > 0 && availableViewportWidth > 0) {
            availableWidth = Math.min(availableWidth, availableViewportWidth);
            scale = Math.min(scale, availableWidth / naturalWidth);
        }

        if (availableViewportHeight > 0) {
            scale = Math.min(scale, availableViewportHeight / naturalHeight);
        }
    }

    scale = Math.max(scale, 0.01);

    boardStageEl.style.transform = `scale(${scale})`;
    boardEl.style.height = `${Math.ceil(naturalHeight * scale + paddingY)}px`;
    resizeVictoryCanvas();

    syncFrameHeight();
}

function syncFrameHeight() {
    const frameEl = window.frameElement;
    if (!frameEl || !shellEl || websiteFullscreenActive) {
        return;
    }

    const nextHeight = Math.ceil(shellEl.getBoundingClientRect().height);
    frameEl.height = String(nextHeight);
    frameEl.style.height = `${nextHeight}px`;
}
