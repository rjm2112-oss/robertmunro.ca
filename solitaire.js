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

const state = {
    stock: [],
    waste: [],
    foundations: [],
    tableau: [],
    selected: null,
    score: 0,
    moves: 0,
    startTime: 0,
    won: false
};

let foundationArea;
let tableauRow;
let stockPile;
let wastePile;
let scoreEl;
let movesEl;
let timerEl;
let statusLine;
let victoryBanner;
let boardEl;
let timerHandle = null;

document.addEventListener("DOMContentLoaded", () => {
    foundationArea = document.getElementById("foundation-area");
    tableauRow = document.getElementById("tableau-row");
    stockPile = document.getElementById("stock-pile");
    wastePile = document.getElementById("waste-pile");
    scoreEl = document.getElementById("score");
    movesEl = document.getElementById("moves");
    timerEl = document.getElementById("timer");
    statusLine = document.getElementById("status-line");
    victoryBanner = document.getElementById("victory-banner");
    boardEl = document.getElementById("board");

    document.getElementById("new-game-btn").addEventListener("click", newGame);
    document.getElementById("victory-new-game-btn").addEventListener("click", newGame);
    boardEl.addEventListener("click", handleBoardClick);
    boardEl.addEventListener("dblclick", handleBoardDoubleClick);

    newGame();
});

function newGame() {
    const deck = shuffle(createDeck());
    state.stock = [];
    state.waste = [];
    state.foundations = Array.from({ length: 4 }, () => []);
    state.tableau = Array.from({ length: 7 }, () => []);
    state.selected = null;
    state.score = 0;
    state.moves = 0;
    state.won = false;
    state.startTime = Date.now();

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
    setStatus("Fresh deal. Build down in alternating colors and send the aces home.");
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

    if (state.stock.length) {
        const drawCount = Math.min(3, state.stock.length);

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
        while (state.waste.length) {
            const card = state.waste.pop();
            card.faceUp = false;
            state.stock.push(card);
        }

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
    const foundationCards = state.foundations.reduce((count, pile) => count + pile.length, 0);
    state.won = foundationCards === 52;
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
    victoryBanner.classList.toggle("show", state.won);
}

function renderHud() {
    scoreEl.textContent = String(state.score);
    movesEl.textContent = String(state.moves);
}

function renderStock() {
    stockPile.innerHTML = "";
    stockPile.dataset.role = "stock";
    stockPile.classList.remove("selected-slot");

    const slot = document.createElement("div");
    slot.className = "slot";
    slot.textContent = state.stock.length ? "Stock" : "Redeal";
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

    const slot = document.createElement("div");
    slot.className = "slot";
    slot.textContent = "Waste";
    wastePile.appendChild(slot);

    if (!state.waste.length) {
        return;
    }

    const visibleCards = state.waste.slice(-3);
    visibleCards.forEach((card, index) => {
        const cardEl = createFaceCard(card);
        cardEl.dataset.cardRole = "waste";
        cardEl.style.left = `${index * 16}px`;
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
    cardEl.className = `card ${COLORS[card.suit]}`;
    cardEl.setAttribute("aria-label", cardName(card));
    cardEl.innerHTML = `
        <div class="card-corner top-left">
            <span class="card-rank">${RANK_LABELS[card.rank]}</span>
            <span class="card-suit">${SUIT_SYMBOLS[card.suit]}</span>
        </div>
        <div class="card-center">${SUIT_SYMBOLS[card.suit]}</div>
        <div class="card-corner bottom-right">
            <span class="card-rank">${RANK_LABELS[card.rank]}</span>
            <span class="card-suit">${SUIT_SYMBOLS[card.suit]}</span>
        </div>
    `;
    return cardEl;
}

function createBackCard() {
    const cardEl = document.createElement("div");
    cardEl.className = "card back";
    cardEl.innerHTML = '<div class="card-back-mark">SOL</div>';
    return cardEl;
}

function setStatus(message) {
    statusLine.textContent = message;
}

function updateTimer() {
    const elapsedSeconds = Math.floor((Date.now() - state.startTime) / 1000);
    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;
    timerEl.textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
