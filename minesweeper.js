const MODES = [
    { id: "large", label: "Medium", rows: 16, cols: 23, mines: 75 },
    { id: "extra-large", label: "Large", rows: 22, cols: 32, mines: 147 },
    { id: "extreme", label: "Extra Large", rows: 26, cols: 38, mines: 206 }
];

const NUMBER_COLORS = {
    1: "#0000fe",
    2: "#197319",
    3: "#fe0000",
    4: "#010080",
    5: "#810102",
    6: "#008081",
    7: "#000000",
    8: "#7f7f7f"
};

const ICONS = {
    flag: `
        <span class="ms-cell-symbol" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
                <path d="M6 3v17" stroke="#151515" stroke-width="2" stroke-linecap="square"/>
                <path d="M8 4h10l-2.8 3.6L18 11H8z" fill="#d31616" stroke="#7b0000" stroke-width="1"/>
                <path d="M5 20h5" stroke="#151515" stroke-width="2" stroke-linecap="square"/>
            </svg>
        </span>
    `,
    mine: `
        <span class="ms-cell-symbol" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="5.1" fill="#101010"/>
                <circle cx="10.3" cy="10.1" r="1.1" fill="#ffffff" opacity="0.82"/>
                <path d="M12 1.9v4M12 18.1v4M1.9 12h4M18.1 12h4M4.2 4.2l2.8 2.8M17 17l2.8 2.8M19.8 4.2L17 7M7 17l-2.8 2.8" stroke="#101010" stroke-width="1.9" stroke-linecap="round"/>
            </svg>
        </span>
    `,
    misflag: `
        <span class="ms-cell-symbol" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
                <path d="M6 3v17" stroke="#151515" stroke-width="2" stroke-linecap="square"/>
                <path d="M8 4h10l-2.8 3.6L18 11H8z" fill="#d31616" stroke="#7b0000" stroke-width="1"/>
                <path d="M5 20h5" stroke="#151515" stroke-width="2" stroke-linecap="square"/>
                <path d="M6 6l12 12M18 6L6 18" stroke="#7a0000" stroke-width="2.3" stroke-linecap="round"/>
            </svg>
        </span>
    `
};

const WEBSITE_FULLSCREEN_CLASS = "minesweeper-website-fullscreen";
const IS_FILE_ORIGIN = window.location.protocol === "file:";
const MESSAGE_TARGET_ORIGIN = window.location.origin === "null" || IS_FILE_ORIGIN ? "*" : window.location.origin;

const state = {
    modeId: MODES[0].id,
    board: [],
    started: false,
    finished: false,
    won: false,
    flagMode: false,
    flagsUsed: 0,
    revealedSafeCells: 0,
    secondsElapsed: 0,
    timerId: null,
    websiteFullscreenActive: false,
    lastFullscreenTouchTime: 0,
    boardFitFrame: null,
    boardScrollFrame: null,
    transientFace: null
};

const refs = {
    board: null,
    boardShell: null,
    boardViewport: null,
    minesCounter: null,
    timerCounter: null,
    faceBtn: null,
    flagModeBtn: null,
    fullscreenBtn: null,
    modeButtons: []
};

document.addEventListener("DOMContentLoaded", () => {
    refs.board = document.getElementById("ms-board");
    refs.boardShell = document.getElementById("ms-board-shell");
    refs.boardViewport = document.getElementById("board-viewport");
    refs.minesCounter = document.getElementById("mines-counter");
    refs.timerCounter = document.getElementById("timer-counter");
    refs.faceBtn = document.getElementById("face-btn");
    refs.flagModeBtn = document.getElementById("flag-mode-btn");
    refs.fullscreenBtn = document.getElementById("fullscreen-btn");
    refs.modeButtons = Array.from(document.querySelectorAll("[data-mode]"));

    refs.faceBtn.addEventListener("click", resetGame);
    refs.flagModeBtn.addEventListener("click", toggleFlagMode);
    refs.fullscreenBtn.addEventListener("click", handleFullscreenButtonClick);
    refs.fullscreenBtn.addEventListener("touchend", handleFullscreenButtonTouch, { passive: false });
    refs.board.addEventListener("click", handleBoardClick);
    refs.board.addEventListener("contextmenu", handleBoardContextMenu);
    refs.board.addEventListener("pointerdown", handleBoardPointerDown);
    window.addEventListener("pointerup", handleBoardPointerEnd);
    window.addEventListener("pointercancel", handleBoardPointerEnd);

    refs.modeButtons.forEach(button => {
        button.addEventListener("click", () => {
            const modeId = button.dataset.mode;
            if (!modeId || modeId === state.modeId) {
                return;
            }

            state.modeId = modeId;
            resetGame();
        });
    });

    window.addEventListener("resize", handleViewportLayoutChange);
    window.addEventListener("message", handleParentMessage);
    if (window.visualViewport) {
        window.visualViewport.addEventListener("resize", handleViewportLayoutChange);
        window.visualViewport.addEventListener("scroll", handleViewportLayoutChange);
    }

    if ("ResizeObserver" in window) {
        const resizeObserver = new ResizeObserver(() => {
            scheduleBoardFit();
        });
        resizeObserver.observe(refs.boardViewport);
    }

    resetGame();
    requestWebsiteFullscreenState();
    syncResponsiveLayout();
});

function getCurrentMode() {
    return MODES.find(mode => mode.id === state.modeId) || MODES[0];
}

function resetGame() {
    stopTimer();
    state.started = false;
    state.finished = false;
    state.won = false;
    state.flagsUsed = 0;
    state.revealedSafeCells = 0;
    state.secondsElapsed = 0;
    state.flagMode = false;
    state.transientFace = null;
    state.board = createBoard(getCurrentMode());

    updateModeButtons();
    updateFlagModeButton();
    updateFaceButton();
    updateMinesCounter();
    updateTimerCounter();
    renderBoard();
}

function createBoard(mode) {
    return Array.from({ length: mode.rows }, (_, row) =>
        Array.from({ length: mode.cols }, (_, col) => ({
            row,
            col,
            isMine: false,
            adjacent: 0,
            revealed: false,
            flagged: false,
            exploded: false,
            misflagged: false,
            element: null
        }))
    );
}

function renderBoard() {
    const mode = getCurrentMode();
    const fragment = document.createDocumentFragment();

    refs.board.innerHTML = "";
    refs.board.style.gridTemplateColumns = `repeat(${mode.cols}, var(--cell-size))`;
    refs.boardShell.style.setProperty("--board-rows", String(mode.rows));
    refs.boardShell.style.setProperty("--board-cols", String(mode.cols));

    state.board.forEach(row => {
        row.forEach(cell => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "ms-cell is-hidden";
            button.dataset.row = String(cell.row);
            button.dataset.col = String(cell.col);
            button.setAttribute("role", "gridcell");
            button.setAttribute("aria-label", `Row ${cell.row + 1}, Column ${cell.col + 1}`);
            cell.element = button;
            fragment.appendChild(button);
            updateCellElement(cell);
        });
    });

    refs.board.appendChild(fragment);
    scheduleBoardFit();
}

function updateCellElement(cell) {
    if (!cell.element) {
        return;
    }

    const element = cell.element;
    element.className = "ms-cell";
    element.innerHTML = "";
    element.style.color = "";
    delete element.dataset.number;

    if (!cell.revealed) {
        element.classList.add("is-hidden");
        if (cell.flagged) {
            element.classList.add("is-flagged");
            element.innerHTML = ICONS.flag;
        }
        return;
    }

    element.classList.add("is-revealed");

    if (cell.isMine) {
        element.classList.add("is-mine");
        element.innerHTML = ICONS.mine;
        if (cell.exploded) {
            element.classList.add("is-exploded");
        }
        return;
    }

    if (cell.misflagged) {
        element.classList.add("is-misflagged");
        element.innerHTML = ICONS.misflag;
        return;
    }

    if (cell.adjacent > 0) {
        element.dataset.number = String(cell.adjacent);
        element.innerHTML = `<span class="ms-cell-text">${cell.adjacent}</span>`;
        element.style.color = NUMBER_COLORS[cell.adjacent] || "#111";
        return;
    }

    element.style.color = "";
}

function handleBoardClick(event) {
    clearTransientFace();

    const button = event.target.closest(".ms-cell");
    if (!button || state.finished) {
        return;
    }

    const cell = getCellFromButton(button);
    if (!cell) {
        return;
    }

    if (cell.revealed) {
        if (!state.flagMode) {
            chordCell(cell);
        }
        return;
    }

    if (state.flagMode) {
        toggleFlag(cell);
        return;
    }

    revealCell(cell);
}

function handleBoardContextMenu(event) {
    const button = event.target.closest(".ms-cell");
    if (!button) {
        return;
    }

    event.preventDefault();

    if (state.finished) {
        return;
    }

    const cell = getCellFromButton(button);
    if (!cell || cell.revealed) {
        return;
    }

    toggleFlag(cell);
}

function handleBoardPointerDown(event) {
    if (state.finished || event.button !== 0) {
        return;
    }

    const button = event.target.closest(".ms-cell");
    if (!button) {
        return;
    }

    setTransientFace("surprised");
}

function handleBoardPointerEnd() {
    clearTransientFace();
}

function getCellFromButton(button) {
    const row = Number(button.dataset.row);
    const col = Number(button.dataset.col);
    if (!Number.isInteger(row) || !Number.isInteger(col)) {
        return null;
    }

    return state.board[row]?.[col] || null;
}

function toggleFlag(cell) {
    if (cell.revealed) {
        return;
    }

    cell.flagged = !cell.flagged;
    state.flagsUsed += cell.flagged ? 1 : -1;
    updateCellElement(cell);
    updateMinesCounter();
}

function revealCell(cell) {
    if (state.finished || cell.flagged || cell.revealed) {
        return;
    }

    if (!state.started) {
        startGame(cell);
    }

    if (cell.isMine) {
        cell.exploded = true;
        loseGame();
        return;
    }

    const queue = [cell];

    while (queue.length > 0) {
        const current = queue.pop();
        if (!current || current.revealed || current.flagged) {
            continue;
        }

        current.revealed = true;
        state.revealedSafeCells += 1;
        updateCellElement(current);

        if (current.adjacent !== 0) {
            continue;
        }

        getNeighbors(current.row, current.col).forEach(neighbor => {
            if (!neighbor.revealed && !neighbor.flagged && !neighbor.isMine) {
                queue.push(neighbor);
            }
        });
    }

    if (state.revealedSafeCells >= getSafeCellTarget()) {
        winGame();
        return;
    }
}

function chordCell(cell) {
    if (!cell.revealed || cell.adjacent === 0 || state.finished) {
        return;
    }

    const neighbors = getNeighbors(cell.row, cell.col);
    const flaggedCount = neighbors.filter(neighbor => neighbor.flagged).length;
    if (flaggedCount !== cell.adjacent) {
        return;
    }

    neighbors.forEach(neighbor => {
        if (!neighbor.flagged && !neighbor.revealed) {
            revealCell(neighbor);
        }
    });
}

function startGame(safeCell) {
    const mode = getCurrentMode();
    const safeZone = new Set();

    for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
        for (let colOffset = -1; colOffset <= 1; colOffset += 1) {
            const row = safeCell.row + rowOffset;
            const col = safeCell.col + colOffset;
            if (row < 0 || row >= mode.rows || col < 0 || col >= mode.cols) {
                continue;
            }
            safeZone.add(`${row}:${col}`);
        }
    }

    const candidates = [];
    state.board.forEach(row => {
        row.forEach(cell => {
            if (!safeZone.has(`${cell.row}:${cell.col}`)) {
                candidates.push(cell);
            }
        });
    });

    shuffle(candidates);

    for (let index = 0; index < mode.mines; index += 1) {
        candidates[index].isMine = true;
    }

    state.board.forEach(row => {
        row.forEach(cell => {
            if (cell.isMine) {
                return;
            }

            cell.adjacent = getNeighbors(cell.row, cell.col).filter(neighbor => neighbor.isMine).length;
        });
    });

    state.started = true;
    startTimer();
}

function loseGame() {
    state.finished = true;
    state.won = false;
    stopTimer();

    state.board.forEach(row => {
        row.forEach(cell => {
            if (cell.isMine) {
                cell.revealed = true;
            } else if (cell.flagged) {
                cell.revealed = true;
                cell.misflagged = true;
            }
            updateCellElement(cell);
        });
    });

    updateFaceButton();
}

function winGame() {
    state.finished = true;
    state.won = true;
    stopTimer();

    state.board.forEach(row => {
        row.forEach(cell => {
            if (cell.isMine && !cell.flagged) {
                cell.flagged = true;
                updateCellElement(cell);
            }
        });
    });

    state.flagsUsed = getCurrentMode().mines;
    updateMinesCounter();
    updateFaceButton();
}

function getSafeCellTarget() {
    const mode = getCurrentMode();
    return (mode.rows * mode.cols) - mode.mines;
}

function getNeighbors(row, col) {
    const neighbors = [];

    for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
        for (let colOffset = -1; colOffset <= 1; colOffset += 1) {
            if (rowOffset === 0 && colOffset === 0) {
                continue;
            }

            const nextRow = row + rowOffset;
            const nextCol = col + colOffset;
            const neighbor = state.board[nextRow]?.[nextCol];
            if (neighbor) {
                neighbors.push(neighbor);
            }
        }
    }

    return neighbors;
}

function updateModeButtons() {
    refs.modeButtons.forEach(button => {
        button.classList.toggle("is-active", button.dataset.mode === state.modeId);
    });
}

function toggleFlagMode() {
    state.flagMode = !state.flagMode;
    updateFlagModeButton();
}

function updateFlagModeButton() {
    refs.flagModeBtn.innerHTML = `
        <span class="ms-btn-label">
            <span class="ms-btn-icon" aria-hidden="true">${getFlagButtonIcon()}</span>
            <span>Flag Mode: ${state.flagMode ? "On" : "Off"}</span>
        </span>
    `;
    refs.flagModeBtn.classList.toggle("is-active", state.flagMode);
}

function updateFaceButton() {
    if (state.transientFace) {
        refs.faceBtn.innerHTML = getFaceIconMarkup(state.transientFace);
        return;
    }

    if (state.finished && state.won) {
        refs.faceBtn.innerHTML = getFaceIconMarkup("won");
        return;
    }

    if (state.finished) {
        refs.faceBtn.innerHTML = getFaceIconMarkup("lost");
        return;
    }

    refs.faceBtn.innerHTML = getFaceIconMarkup("happy");
}

function setTransientFace(faceName) {
    if (state.finished) {
        return;
    }

    state.transientFace = faceName;
    updateFaceButton();
}

function clearTransientFace() {
    if (state.transientFace === null) {
        return;
    }

    state.transientFace = null;
    updateFaceButton();
}

function startTimer() {
    stopTimer();
    state.timerId = window.setInterval(() => {
        state.secondsElapsed += 1;
        updateTimerCounter();
    }, 1000);
}

function stopTimer() {
    if (state.timerId !== null) {
        window.clearInterval(state.timerId);
        state.timerId = null;
    }
}

function updateMinesCounter() {
    refs.minesCounter.textContent = formatCounter(getCurrentMode().mines - state.flagsUsed);
}

function updateTimerCounter() {
    refs.timerCounter.textContent = formatCounter(state.secondsElapsed);
}

function formatCounter(value) {
    if (value < 0) {
        return `-${String(Math.min(Math.abs(value), 99)).padStart(2, "0")}`;
    }

    return String(Math.min(value, 999)).padStart(3, "0");
}

function shuffle(array) {
    for (let index = array.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        [array[index], array[swapIndex]] = [array[swapIndex], array[index]];
    }
}

function handleViewportLayoutChange() {
    syncResponsiveLayout();
    scheduleBoardFit();
}

function scheduleBoardFit() {
    if (state.boardFitFrame !== null) {
        window.cancelAnimationFrame(state.boardFitFrame);
    }

    state.boardFitFrame = window.requestAnimationFrame(() => {
        state.boardFitFrame = null;
        updateBoardFit();
    });
}

function updateBoardFit() {
    const mode = getCurrentMode();
    if (!refs.boardViewport || !mode) {
        return;
    }

    const boardIsRotated = document.body.classList.contains("is-portrait-rotated");
    const viewportSize = getBoardViewportAvailableSize();
    const nextSize = getFittedCellSize(mode, viewportSize, boardIsRotated);

    refs.board.style.setProperty("--cell-size", `${nextSize}px`);
    scheduleBoardViewportScroll(boardIsRotated);
}

function toggleWebsiteFullscreen() {
    const parentWindow = getParentWindow();
    if (parentWindow) {
        try {
            if (typeof parentWindow.setMinesweeperWebsiteFullscreen === "function") {
                parentWindow.setMinesweeperWebsiteFullscreen(!state.websiteFullscreenActive);
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
        applyWebsiteFullscreenState(!state.websiteFullscreenActive);
        return;
    }

    parentWindow.postMessage(
        {
            type: "minesweeper:toggle-website-fullscreen",
            expanded: !state.websiteFullscreenActive
        },
        MESSAGE_TARGET_ORIGIN
    );
}

function handleFullscreenButtonClick(event) {
    if (Date.now() - state.lastFullscreenTouchTime < 700) {
        event.preventDefault();
        return;
    }

    toggleWebsiteFullscreen();
}

function handleFullscreenButtonTouch(event) {
    event.preventDefault();
    state.lastFullscreenTouchTime = Date.now();
    toggleWebsiteFullscreen();
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
        if (typeof parentWindow.getMinesweeperWebsiteFullscreen === "function") {
            applyWebsiteFullscreenState(Boolean(parentWindow.getMinesweeperWebsiteFullscreen()));
            return;
        }
    } catch (error) {
        // Cross-origin parents under file:// fall through to postMessage.
    }

    parentWindow.postMessage(
        {
            type: "minesweeper:request-website-fullscreen-state"
        },
        MESSAGE_TARGET_ORIGIN
    );
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

    if (event.data.type !== "minesweeper:website-fullscreen-state") {
        return;
    }

    applyWebsiteFullscreenState(Boolean(event.data.expanded));
}

function applyWebsiteFullscreenState(expanded) {
    state.websiteFullscreenActive = expanded;
    document.body.classList.toggle("is-website-fullscreen", expanded);
    syncResponsiveLayout();
    refs.fullscreenBtn.innerHTML = `
        <span class="ms-btn-label">
            <span class="ms-btn-icon" aria-hidden="true">${getFullscreenIcon(expanded)}</span>
            <span>${expanded ? "Exit Fullscreen" : "Fullscreen"}</span>
        </span>
    `;
    scheduleBoardFit();
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

function syncResponsiveLayout() {
    const viewport = window.visualViewport;
    const viewportWidth = viewport ? viewport.width : window.innerWidth;
    const viewportHeight = viewport ? viewport.height : window.innerHeight;
    const isLandscape = viewportWidth > viewportHeight;
    const isTouchCapable = navigator.maxTouchPoints > 0 || "ontouchstart" in window;
    const isPhoneLikeViewport = Math.min(viewportWidth, viewportHeight) <= 540 && viewportWidth <= 960;
    const isMobileDevice = isTouchCapable && isPhoneLikeViewport;
    const useMobileLandscapeLayout =
        state.websiteFullscreenActive &&
        isMobileDevice &&
        isLandscape &&
        isPhoneLikeViewport;

    applyMobileModeRestriction(isMobileDevice);
    const mode = getCurrentMode();
    const viewportSize = getBoardViewportAvailableSize();
    const defaultCellSize = getFittedCellSize(mode, viewportSize, false);
    const rotatedCellSize = getFittedCellSize(mode, viewportSize, true);
    const usePortraitRotatedLayout =
        !useMobileLandscapeLayout &&
        !isLandscape &&
        rotatedCellSize > defaultCellSize;

    document.body.classList.toggle("is-mobile-device", isMobileDevice);
    document.body.classList.toggle("is-mobile-landscape-fullscreen", useMobileLandscapeLayout);
    document.body.classList.toggle("is-portrait-rotated", usePortraitRotatedLayout);
}

function applyMobileModeRestriction(enabled) {
    if (!enabled || state.modeId === MODES[0].id) {
        return;
    }

    state.modeId = MODES[0].id;
    resetGame();
}

function getBoardViewportAvailableSize() {
    if (!refs.boardViewport) {
        return { width: 0, height: 0 };
    }

    const viewportStyles = window.getComputedStyle(refs.boardViewport);
    const width = refs.boardViewport.clientWidth
        - parseFloat(viewportStyles.paddingLeft || 0)
        - parseFloat(viewportStyles.paddingRight || 0);
    const height = refs.boardViewport.clientHeight
        - parseFloat(viewportStyles.paddingTop || 0)
        - parseFloat(viewportStyles.paddingBottom || 0);

    return {
        width: Math.max(width, 0),
        height: Math.max(height, 0)
    };
}

function getFittedCellSize(mode, viewportSize, rotated) {
    if (!mode) {
        return 0;
    }

    const visibleCols = rotated ? mode.rows : mode.cols;
    const visibleRows = rotated ? mode.cols : mode.rows;
    const sizeFromWidth = Math.floor(viewportSize.width / visibleCols);
    const sizeFromHeight = Math.floor(viewportSize.height / visibleRows);
    const minSize = getMinimumCellSize(mode, rotated);
    const maxSize = state.websiteFullscreenActive ? 33 : 30.8;
    const widthFirstMobileFit = shouldPrioritizeBoardWidth(rotated);

    return Math.max(
        minSize,
        widthFirstMobileFit
            ? Math.min(maxSize, sizeFromWidth)
            : Math.min(maxSize, sizeFromWidth, sizeFromHeight)
    );
}

function getMinimumCellSize(mode, rotated) {
    if (mode.id === "extreme") {
        return 13;
    }

    if (rotated && isPhonePortraitViewport()) {
        return 12;
    }

    return 15;
}

function shouldPrioritizeBoardWidth(rotated) {
    return isPhonePortraitViewport() && !rotated;
}

function isPhonePortraitViewport() {
    const viewport = window.visualViewport;
    const viewportWidth = viewport ? viewport.width : window.innerWidth;
    const viewportHeight = viewport ? viewport.height : window.innerHeight;
    const isLandscape = viewportWidth > viewportHeight;
    const isTouchCapable = navigator.maxTouchPoints > 0 || "ontouchstart" in window;
    const isPhoneLikeViewport = Math.min(viewportWidth, viewportHeight) <= 540 && viewportWidth <= 960;

    return isTouchCapable && isPhoneLikeViewport && !isLandscape;
}

function syncBoardViewportScroll(rotated) {
    if (!refs.boardViewport || !refs.boardShell) {
        return;
    }

    if (!rotated) {
        refs.boardShell.style.marginLeft = "0px";
        refs.boardShell.style.width = "";
        refs.boardShell.style.height = "";
        refs.boardViewport.scrollLeft = 0;
        refs.boardViewport.scrollTop = 0;
        return;
    }

    const boardRect = refs.board.getBoundingClientRect();
    const rotatedWidth = Math.ceil(boardRect.width);
    const rotatedHeight = Math.ceil(boardRect.height);

    refs.boardShell.style.width = `${rotatedWidth}px`;
    refs.boardShell.style.height = `${rotatedHeight}px`;

    const viewportWidth = refs.boardViewport.clientWidth;
    const horizontalInset = Math.max(Math.floor((viewportWidth - rotatedWidth) / 2), 0);

    refs.boardShell.style.marginLeft = `${horizontalInset}px`;

    const overflowWidth = Math.max(rotatedWidth - viewportWidth, 0);
    refs.boardViewport.scrollLeft = Math.round(overflowWidth / 2);
    refs.boardViewport.scrollTop = 0;
}

function scheduleBoardViewportScroll(rotated) {
    if (state.boardScrollFrame !== null) {
        window.cancelAnimationFrame(state.boardScrollFrame);
    }

    state.boardScrollFrame = window.requestAnimationFrame(() => {
        state.boardScrollFrame = window.requestAnimationFrame(() => {
            state.boardScrollFrame = null;
            syncBoardViewportScroll(rotated);
        });
    });
}

function getFlagButtonIcon() {
    return `
        <svg viewBox="0 0 24 24" fill="none">
            <path d="M6 2.5v18.5" stroke="#151515" stroke-width="2" stroke-linecap="square"/>
            <path d="M8 4h10l-2.7 3.5L18 11H8z" fill="#d31616" stroke="#7b0000" stroke-width="1"/>
            <path d="M4.6 20.5H10" stroke="#151515" stroke-width="2" stroke-linecap="square"/>
        </svg>
    `;
}

function getFullscreenIcon(expanded) {
    if (expanded) {
        return `
            <svg viewBox="0 0 24 24" fill="none">
                <path d="M8 4H4v4M16 4h4v4M20 16v4h-4M4 16v4h4" stroke="#151515" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter"/>
                <path d="M9 9H5M15 9h4M9 15H5M15 15h4" stroke="#151515" stroke-width="1.5" stroke-linecap="square"/>
            </svg>
        `;
    }

    return `
        <svg viewBox="0 0 24 24" fill="none">
            <path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" stroke="#151515" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter"/>
        </svg>
    `;
}

function getFaceIconMarkup(stateName) {
    const faces = {
        happy: {
            eyes: `<circle cx="9" cy="10" r="1.4" fill="#151515"/><circle cx="15" cy="10" r="1.4" fill="#151515"/>`,
            mouth: `<path d="M8.2 14.2c1.2 2 6.4 2 7.6 0" stroke="#151515" stroke-width="1.8" stroke-linecap="round" fill="none"/>`,
            extras: ""
        },
        won: {
            eyes: `
                <rect x="6.6" y="7.4" width="4.2" height="2.8" rx="1.2" fill="#151515"/>
                <rect x="13.2" y="7.4" width="4.2" height="2.8" rx="1.2" fill="#151515"/>
                <path d="M10.8 8.8h2.4" stroke="#151515" stroke-width="1.3" stroke-linecap="round"/>
            `,
            mouth: `<path d="M7.9 14c1.7 2.6 6.5 2.6 8.2 0" stroke="#151515" stroke-width="1.9" stroke-linecap="round" fill="none"/>`,
            extras: ""
        },
        surprised: {
            eyes: `<circle cx="9" cy="9.5" r="1.4" fill="#151515"/><circle cx="15" cy="9.5" r="1.4" fill="#151515"/>`,
            mouth: `<circle cx="12" cy="15.1" r="2.1" stroke="#151515" stroke-width="1.6" fill="none"/>`,
            extras: ""
        },
        lost: {
            eyes: `
                <path d="M7.7 8.7l2.5 2.5M10.2 8.7l-2.5 2.5M13.8 8.7l2.5 2.5M16.3 8.7l-2.5 2.5" stroke="#151515" stroke-width="1.5" stroke-linecap="round"/>
            `,
            mouth: `<path d="M8.3 16c1.3-2.5 6.1-2.5 7.4 0" stroke="#151515" stroke-width="1.8" stroke-linecap="round" fill="none"/>`,
            extras: `<circle cx="12" cy="17.8" r="1.1" fill="#2f6cff"/>`
        }
    };

    const face = faces[stateName] || faces.happy;
    return `
        <span class="ms-face-glyph" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9.2" fill="#ffd44d" stroke="#151515" stroke-width="1.4"/>
                ${face.eyes}
                ${face.mouth}
                ${face.extras}
            </svg>
        </span>
    `;
}
