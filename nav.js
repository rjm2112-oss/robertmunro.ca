document.addEventListener('DOMContentLoaded', () => {
    const TETRIS_WEBSITE_FULLSCREEN_CLASS = 'tetris-website-fullscreen';
    const SOLITAIRE_WEBSITE_FULLSCREEN_CLASS = 'solitaire-website-fullscreen';
    const MINESWEEPER_WEBSITE_FULLSCREEN_CLASS = 'minesweeper-website-fullscreen';
    const IS_FILE_ORIGIN = window.location.protocol === 'file:';
    const MESSAGE_TARGET_ORIGIN = window.location.origin === 'null' || IS_FILE_ORIGIN ? '*' : window.location.origin;
    const nav = document.querySelector('.glass-nav');
    if (!nav) return;

    const ensureMetaTag = name => {
        let meta = document.querySelector(`meta[name="${name}"]`);
        if (meta) return meta;

        meta = document.createElement('meta');
        meta.name = name;
        document.head.appendChild(meta);
        return meta;
    };

    const themeColorMeta = ensureMetaTag('theme-color');
    const defaultThemeColor =
        getComputedStyle(document.documentElement).getPropertyValue('--background-color').trim() || '#033561';
    const TETRIS_FULLSCREEN_THEME_COLOR = '#000000';
    const MINESWEEPER_FULLSCREEN_THEME_COLOR = '#a6a6a6';

    const panel = nav.querySelector('.panel');
    if (!panel) return;

    const navLinks = Array.from(nav.querySelectorAll('[data-target]'));
    const sections = Array.from(document.querySelectorAll('section'));
    const displacementMap = document.getElementById('glass-displacement');
    const turbulence = document.getElementById('glass-turbulence');

    let currentNavIndex = null;

    const getDetailTetrisFrame = () =>
        document.querySelector('#section1 .post-detail iframe[src="tetris.html"]');

    const getDetailTetrisFullscreenButton = () =>
        document.querySelector('#section1 .post-detail .tetris-website-fullscreen-btn');

    const updateTetrisFullscreenButtonLabel = expanded => {
        const button = getDetailTetrisFullscreenButton();
        if (!button) return;
        button.textContent = expanded ? 'Exit Fullscreen' : 'Fullscreen';
    };

    const syncTetrisWebsiteFullscreenState = expanded => {
        const tetrisFrame = getDetailTetrisFrame();
        if (!tetrisFrame?.contentWindow) return;

        tetrisFrame.contentWindow.postMessage(
            {
                type: 'tetris:website-fullscreen-state',
                expanded
            },
            MESSAGE_TARGET_ORIGIN
        );
    };

    const updateBrowserThemeColor = () => {
        let themeColor = defaultThemeColor;
        if (document.body.classList.contains(TETRIS_WEBSITE_FULLSCREEN_CLASS)) {
            themeColor = TETRIS_FULLSCREEN_THEME_COLOR;
        } else if (document.body.classList.contains(MINESWEEPER_WEBSITE_FULLSCREEN_CLASS)) {
            themeColor = MINESWEEPER_FULLSCREEN_THEME_COLOR;
        }
        themeColorMeta.setAttribute('content', themeColor);
    };

    const setTetrisWebsiteFullscreen = expanded => {
        document.body.classList.toggle(TETRIS_WEBSITE_FULLSCREEN_CLASS, expanded);
        updateBrowserThemeColor();
        updateTetrisFullscreenButtonLabel(expanded);
        syncTetrisWebsiteFullscreenState(expanded);
    };

    const clearTetrisWebsiteFullscreen = () => {
        setTetrisWebsiteFullscreen(false);
    };

    const getDetailSolitaireFrame = () =>
        document.querySelector('#section1 .post-detail iframe[src="solitaire.html"]');

    const syncSolitaireWebsiteFullscreenState = expanded => {
        const solitaireFrame = getDetailSolitaireFrame();
        if (!solitaireFrame?.contentWindow) return;

        solitaireFrame.contentWindow.postMessage(
            {
                type: 'solitaire:website-fullscreen-state',
                expanded
            },
            MESSAGE_TARGET_ORIGIN
        );
    };

    const setSolitaireWebsiteFullscreen = expanded => {
        document.body.classList.toggle(SOLITAIRE_WEBSITE_FULLSCREEN_CLASS, expanded);
        updateBrowserThemeColor();
        syncSolitaireWebsiteFullscreenState(expanded);
    };

    const clearSolitaireWebsiteFullscreen = () => {
        setSolitaireWebsiteFullscreen(false);
    };

    const getDetailMinesweeperFrame = () =>
        document.querySelector('#section1 .post-detail iframe[src="minesweeper.html"]');

    const syncMinesweeperWebsiteFullscreenState = expanded => {
        const minesweeperFrame = getDetailMinesweeperFrame();
        if (!minesweeperFrame?.contentWindow) return;

        minesweeperFrame.contentWindow.postMessage(
            {
                type: 'minesweeper:website-fullscreen-state',
                expanded
            },
            MESSAGE_TARGET_ORIGIN
        );
    };

    const setMinesweeperWebsiteFullscreen = expanded => {
        document.body.classList.toggle(MINESWEEPER_WEBSITE_FULLSCREEN_CLASS, expanded);
        updateBrowserThemeColor();
        syncMinesweeperWebsiteFullscreenState(expanded);
    };

    const clearMinesweeperWebsiteFullscreen = () => {
        setMinesweeperWebsiteFullscreen(false);
    };

    window.setTetrisWebsiteFullscreen = expanded => {
        setTetrisWebsiteFullscreen(Boolean(expanded));
    };

    window.getTetrisWebsiteFullscreen = () =>
        document.body.classList.contains(TETRIS_WEBSITE_FULLSCREEN_CLASS);

    window.setSolitaireWebsiteFullscreen = expanded => {
        setSolitaireWebsiteFullscreen(Boolean(expanded));
    };

    window.getSolitaireWebsiteFullscreen = () =>
        document.body.classList.contains(SOLITAIRE_WEBSITE_FULLSCREEN_CLASS);

    window.setMinesweeperWebsiteFullscreen = expanded => {
        setMinesweeperWebsiteFullscreen(Boolean(expanded));
    };

    window.getMinesweeperWebsiteFullscreen = () =>
        document.body.classList.contains(MINESWEEPER_WEBSITE_FULLSCREEN_CLASS);

    updateBrowserThemeColor();

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'auto' });
    };

    const renderPostDetail = (post, detailArea) => {
        if (!post || !detailArea) return;

        clearTetrisWebsiteFullscreen();
        clearSolitaireWebsiteFullscreen();
        clearMinesweeperWebsiteFullscreen();
        const title = post.querySelector('h3').outerHTML;
        const meta = post.querySelector('.meta')?.outerHTML || '';
        const body = post.querySelector('.full-body')?.innerHTML || '';

        detailArea.innerHTML = `<article>${title}${meta}<div class="full-body">${body}</div></article>`;
        updateTetrisFullscreenButtonLabel(false);
    };

    const showSection = (id, linkIdx = null) => {
        sections.forEach(s => s.classList.remove('active'));
        clearTetrisWebsiteFullscreen();
        clearSolitaireWebsiteFullscreen();
        clearMinesweeperWebsiteFullscreen();

        const targetSec = document.getElementById(id);
        if (!targetSec) return;

        targetSec.classList.add('active');

        clearActive(id);
        expandFirstInSection(id);

        if (linkIdx !== null) {
            movePanelTo(linkIdx);
            currentNavIndex = linkIdx;
            navLinks.forEach((l, i) =>
                l.classList.toggle('active-link', i === currentNavIndex)
            );
        }
    };

    const clearActive = sectionId => {
        document
          .querySelectorAll(`#${sectionId} .post.active`)
          .forEach(p => p.classList.remove('active'));
    };

    const getPanelTargetLeft = idx => {
        const linkRect = navLinks[idx].getBoundingClientRect();
        const navRect = nav.getBoundingClientRect();
        return linkRect.left + linkRect.width / 2 - navRect.left - panel.clientWidth / 2;
    };

    const movePanelTo = idx => {
        if (idx < 0 || idx >= navLinks.length) return;

        const targetLeft = getPanelTargetLeft(idx);
        const distance = targetLeft - currentLeft;
        const dur = durationForDistance(distance);
        panel.style.transitionDuration = `${dur}s`;
        updatePanelMotion(distance, dur);
        panel.style.setProperty('--panel-offset-x', `${targetLeft}px`);
        currentLeft = targetLeft;
    };

    const expandFirstInSection = sectionId => {
        const list = document.querySelector(`#${sectionId} .preview-list`);
        if (!list) return;

        list.querySelectorAll('.post.active').forEach(p => p.classList.remove('active'));

        const firstPost = list.querySelector('.post:not(.static)');
        if (!firstPost) return;
        firstPost.classList.add('active');

        const detailArea = document.querySelector(`#${sectionId} .post-detail`);
        renderPostDetail(firstPost, detailArea);
    };

    navLinks.forEach((link, i) => {
        link.addEventListener('click', e => {
            e.preventDefault();
            showSection(link.dataset.target, i);
        });
    });

    document.querySelectorAll('.preview-list').forEach(list => {
        list.addEventListener('click', e => {
            const post = e.target.closest('.post');
            if (!post || post.classList.contains('static')) return;

            list.querySelectorAll('.post.active').forEach(p => p.classList.remove('active'));
            post.classList.add('active');

            const detailArea = list.nextElementSibling;
            renderPostDetail(post, detailArea);
            scrollToTop();
        });
    });

    document.addEventListener('click', event => {
        const button = event.target.closest('.tetris-website-fullscreen-btn');
        if (!button) return;

        setTetrisWebsiteFullscreen(!document.body.classList.contains(TETRIS_WEBSITE_FULLSCREEN_CLASS));
    });

    window.addEventListener('message', event => {
        if (!event.data) return;
        if (
            event.origin !== 'null' &&
            event.origin !== 'file://' &&
            event.origin !== window.location.origin
        ) return;

        const tetrisFrame = getDetailTetrisFrame();
        if (tetrisFrame && event.source === tetrisFrame.contentWindow) {
            if (event.data.type === 'tetris:toggle-website-fullscreen') {
                const nextState = typeof event.data.expanded === 'boolean'
                    ? event.data.expanded
                    : !document.body.classList.contains(TETRIS_WEBSITE_FULLSCREEN_CLASS);
                setTetrisWebsiteFullscreen(nextState);
                return;
            }

            if (event.data.type === 'tetris:request-website-fullscreen-state') {
                syncTetrisWebsiteFullscreenState(
                    document.body.classList.contains(TETRIS_WEBSITE_FULLSCREEN_CLASS)
                );
                return;
            }
        }

        const solitaireFrame = getDetailSolitaireFrame();
        if (solitaireFrame && event.source === solitaireFrame.contentWindow) {
            if (event.data.type === 'solitaire:toggle-website-fullscreen') {
                const nextState = typeof event.data.expanded === 'boolean'
                    ? event.data.expanded
                    : !document.body.classList.contains(SOLITAIRE_WEBSITE_FULLSCREEN_CLASS);
                setSolitaireWebsiteFullscreen(nextState);
                return;
            }

            if (event.data.type === 'solitaire:request-website-fullscreen-state') {
                syncSolitaireWebsiteFullscreenState(
                    document.body.classList.contains(SOLITAIRE_WEBSITE_FULLSCREEN_CLASS)
                );
                return;
            }
        }

        const minesweeperFrame = getDetailMinesweeperFrame();
        if (!minesweeperFrame || event.source !== minesweeperFrame.contentWindow) return;

        if (event.data.type === 'minesweeper:toggle-website-fullscreen') {
            const nextState = typeof event.data.expanded === 'boolean'
                ? event.data.expanded
                : !document.body.classList.contains(MINESWEEPER_WEBSITE_FULLSCREEN_CLASS);
            setMinesweeperWebsiteFullscreen(nextState);
            return;
        }

        if (event.data.type === 'minesweeper:request-website-fullscreen-state') {
            syncMinesweeperWebsiteFullscreenState(
                document.body.classList.contains(MINESWEEPER_WEBSITE_FULLSCREEN_CLASS)
            );
        }
    });

    const count = navLinks.length;

    let currentLeft = 0;
    let activeIdx = -1;
    let settleTimer = null;
    let warpFrame = null;
    let warpLevel = 0;

    const msPerPixel = 1000 / 550;
    const minDur = 0.85;
    const maxDur = 1.25;

    const durationForDistance = dist => {
        const raw = Math.abs(dist) * msPerPixel / 1000;
        return Math.min(Math.max(raw, minDur), maxDur);
    };

    const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
    const easeInOutSine = t => -(Math.cos(Math.PI * t) - 1) / 2;

    const setWarpStrength = strength => {
        const clamped = Math.max(0, Math.min(56, strength));
        const normalized = clamped / 56;

        warpLevel = clamped;
        panel.style.setProperty('--panel-warp', normalized.toFixed(3));

        if (displacementMap) {
            displacementMap.setAttribute('scale', clamped.toFixed(2));
        }

        if (turbulence) {
            const freqX = 0.008 + normalized * 0.003;
            const freqY = 0.06 + normalized * 0.012;
            turbulence.setAttribute(
                'baseFrequency',
                `${freqX.toFixed(4)} ${freqY.toFixed(4)}`
            );
        }
    };

    const animateWarpTo = (target, durationMs, easing = easeOutCubic) => {
        const start = warpLevel;
        const change = target - start;
        const startedAt = performance.now();

        if (warpFrame !== null) {
            window.cancelAnimationFrame(warpFrame);
        }

        if (durationMs <= 0 || change === 0) {
            setWarpStrength(target);
            warpFrame = null;
            return;
        }

        const step = now => {
            const elapsed = now - startedAt;
            const progress = Math.min(elapsed / durationMs, 1);
            const eased = easing(progress);

            setWarpStrength(start + change * eased);

            if (progress < 1) {
                warpFrame = window.requestAnimationFrame(step);
                return;
            }

            warpFrame = null;
        };

        warpFrame = window.requestAnimationFrame(step);
    };

    const updatePanelMotion = (distance, durationSeconds) => {
        const direction = distance === 0 ? 0 : Math.sign(distance);
        const travel = Math.min(Math.abs(distance) / Math.max(nav.clientWidth, 1), 1);
        const shiftPx = Math.max(-14, Math.min(14, distance * 0.055));
        const tiltDeg = Math.max(-0.18, Math.min(0.18, direction * travel * 0.18));
        const peakWarp = distance === 0
            ? 0
            : Math.min(56, 8 + Math.abs(distance) * 0.036 + travel * 18);
        const travelMs = Math.max(durationSeconds * 1000, 320);
        const rampUpMs = Math.max(140, Math.min(travelMs * 0.42, 280));
        const rampDownMs = Math.max(420, Math.min(travelMs * 0.9, 700));

        panel.style.setProperty('--panel-shift-x', `${shiftPx}px`);
        panel.style.setProperty('--panel-tilt', `${tiltDeg}deg`);
        panel.style.setProperty('--panel-travel', travel.toFixed(3));
        animateWarpTo(peakWarp, rampUpMs, easeOutCubic);

        window.clearTimeout(settleTimer);
        settleTimer = window.setTimeout(() => {
            panel.style.setProperty('--panel-shift-x', '0px');
            panel.style.setProperty('--panel-tilt', '0deg');
            panel.style.setProperty('--panel-travel', '0');
            animateWarpTo(0, rampDownMs, easeInOutSine);
        }, travelMs);
    };

    const setPanel = idx => movePanelTo(idx);

    const initialIdx = 0;
    showSection(navLinks[initialIdx].dataset.target, initialIdx);

    activeIdx = navLinks.findIndex(a => a.hasAttribute('aria-current'));
    if (activeIdx !== -1) {
        requestAnimationFrame(() => setPanel(activeIdx));
    } else {
        panel.style.opacity = '0';
    }

    navLinks.forEach((link, i) => {
        link.addEventListener('mouseenter', () => {
            activeIdx = i;
            setPanel(i);
            panel.style.opacity = '1';
        });
    });

    nav.addEventListener('mouseleave', () => {
        const activeLink = nav.querySelector('a.active-link');
        if (!activeLink) return;

        const idx = navLinks.indexOf(activeLink);
        if (idx === -1) return;

        activeIdx = idx;
        setPanel(idx);
        panel.style.opacity = '1';
    });

    let startX = null;
    let startT = null;

    const minDistance = 30;
    const minSpeed = 0.3;

    const handlePointerDown = e => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        startX = e.clientX;
        startT = performance.now();
    };

    const handlePointerUp = e => {
        if (startX === null) return;

        const endX   = e.clientX;
        const deltaX = endX - startX;
        const deltaT = performance.now() - startT;

        if (
            Math.abs(deltaX) > minDistance &&
            Math.abs(deltaX) / deltaT >= minSpeed
        ) {
            const dir   = deltaX > 0 ? +1 : -1;     // right or left
            let newIdx  = activeIdx + dir;

            if (newIdx < 0)    newIdx = 0;
            if (newIdx >= count) newIdx = count - 1;

            if (newIdx !== activeIdx) {
                activeIdx = newIdx;
                setPanel(newIdx);
                panel.style.opacity = '1';
            }
        }

        startX = null;
        startT = null;
    };

    nav.addEventListener('pointerdown', handlePointerDown, { passive: true });
    nav.addEventListener('pointerup',   handlePointerUp);

    /* Touch‑only fallback – blocks vertical scroll during horizontal swipe */
    if ('ontouchstart' in window) {
        let startY = null;           // Y coordinate at touchstart (for direction test)
        let isHorizontalTouch = null; // unknown until we see the first move

        nav.addEventListener('touchstart', e => {
            if (e.touches.length !== 1) return;

            const t = e.touches[0];
            startX   = t.clientX;
            startY   = t.clientY;
            startT   = performance.now();
            isHorizontalTouch = null; // reset
        }, { passive: false });

        nav.addEventListener('touchmove', e => {
            if (!e.touches || e.touches.length !== 1) return;

            const t   = e.touches[0];
            const dx  = t.clientX - startX;
            const dy  = t.clientY - startY;

            // Decide direction only once
            if (isHorizontalTouch === null) {
                isHorizontalTouch = Math.abs(dx) > Math.abs(dy);
            }

            // If a horizontal swipe is detected, block vertical scrolling
            if (isHorizontalTouch) {
                e.preventDefault();
            }
        }, { passive: false });

        nav.addEventListener('touchend', e => {
            if (!e.changedTouches || e.changedTouches.length !== 1) return;

            const t   = e.changedTouches[0];
            const endX = t.clientX;
            const deltaX = endX - startX;
            const deltaT = performance.now() - startT;

            if (
                Math.abs(deltaX) > minDistance &&
                Math.abs(deltaX) / deltaT >= minSpeed
            ) {
                const dir   = deltaX > 0 ? +1 : -1;
                let newIdx  = activeIdx + dir;

                if (newIdx < 0)    newIdx = 0;
                if (newIdx >= count) newIdx = count - 1;

                if (newIdx !== activeIdx) {
                    activeIdx = newIdx;
                    setPanel(newIdx);
                    panel.style.opacity = '1';
                }
            }

            startX = null;
            startY = null;
            isHorizontalTouch = null;
        });
    }
});
