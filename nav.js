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
    const SOLITAIRE_FULLSCREEN_THEME_COLOR = '#0b5e2c';
    const MINESWEEPER_FULLSCREEN_THEME_COLOR = '#c0c0c0';

    const panel = nav.querySelector('.panel');
    if (!panel) return;

    const navLinks = Array.from(nav.querySelectorAll('[data-target]'));
    const sections = Array.from(document.querySelectorAll('section'));
    const displacementMap = document.getElementById('glass-displacement');
    const mapBlur = document.getElementById('glass-map-blur');
    const sideDisplacementMap = document.getElementById('side-glass-displacement');
    const sideMapBlur = document.getElementById('side-glass-map-blur');
    const sideList = document.querySelector('#section1 .preview-list');
    const sidePanel = sideList?.querySelector('.side-panel');
    const sidePosts = sideList ? Array.from(sideList.querySelectorAll('.post:not(.static)')) : [];
    const supportsHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    let currentNavIndex = null;
    let pendingSectionDetailFrame = null;
    let layoutSyncFrame = null;

    const getDetailTetrisFrame = () =>
        document.querySelector('#section1 .post-detail iframe[src="tetris.html"]');

    const getDetailTetrisFullscreenButton = () =>
        document.querySelector('#section1 .post-detail .tetris-website-fullscreen-btn');

    const updateTetrisFullscreenButtonLabel = expanded => {
        const button = getDetailTetrisFullscreenButton();
        if (!button) return;
        button.textContent = expanded ? 'Exit Fullscreen' : 'Fullscreen';
    };

    const getPostSignature = container => {
        if (!container) return '';

        const title = container.querySelector('h3')?.textContent?.trim() || '';
        const meta = container.querySelector('.meta')?.innerHTML?.trim() || '';
        const body = container.querySelector('.full-body')?.innerHTML?.trim() || '';

        return `${title}|||${meta}|||${body}`;
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
        } else if (document.body.classList.contains(SOLITAIRE_WEBSITE_FULLSCREEN_CLASS)) {
            themeColor = SOLITAIRE_FULLSCREEN_THEME_COLOR;
        } else if (document.body.classList.contains(MINESWEEPER_WEBSITE_FULLSCREEN_CLASS)) {
            themeColor = MINESWEEPER_FULLSCREEN_THEME_COLOR;
        }
        themeColorMeta.setAttribute('content', themeColor);
        document.documentElement.style.backgroundColor = themeColor;
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

        const nextSignature = getPostSignature(post);
        const currentArticle = detailArea.querySelector('article');
        if (currentArticle && getPostSignature(currentArticle) === nextSignature) {
            updateTetrisFullscreenButtonLabel(false);
            return;
        }

        const title = post.querySelector('h3').outerHTML;
        const meta = post.querySelector('.meta')?.outerHTML || '';
        const body = post.querySelector('.full-body')?.innerHTML || '';

        detailArea.innerHTML = `<article>${title}${meta}<div class="full-body">${body}</div></article>`;
        updateTetrisFullscreenButtonLabel(false);
    };

    const clearPendingSectionDetail = () => {
        if (pendingSectionDetailFrame === null) return;

        window.cancelAnimationFrame(pendingSectionDetailFrame);
        pendingSectionDetailFrame = null;
    };

    const showSection = (id, linkIdx = null) => {
        clearPendingSectionDetail();

        sections.forEach(s => s.classList.remove('active'));
        clearTetrisWebsiteFullscreen();
        clearSolitaireWebsiteFullscreen();
        clearMinesweeperWebsiteFullscreen();

        const targetSec = document.getElementById(id);
        if (!targetSec) return;

        targetSec.classList.add('active');

        clearActive(id);

        if (linkIdx !== null) {
            setActiveNavLink(linkIdx);
        }

        // Let the new section and pill paint before rebuilding the detail pane.
        pendingSectionDetailFrame = window.requestAnimationFrame(() => {
            pendingSectionDetailFrame = null;
            expandFirstInSection(id);
        });
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

    const movePanelTo = (idx, instant = false) => {
        if (idx < 0 || idx >= navLinks.length) return;

        const targetLeft = getPanelTargetLeft(idx);
        const distance = targetLeft - currentLeft;

        if (instant) {
            panel.style.transitionDuration = '0s';
            panel.style.setProperty('--panel-center-x', `${targetLeft + panel.clientWidth / 2}px`);
            panel.style.setProperty('--panel-offset-x', `${targetLeft}px`);
            panel.style.setProperty('--panel-shift-x', '0px');
            panel.style.setProperty('--panel-scale-x', '1');
            panel.style.setProperty('--panel-scale-y', '1');
            panel.style.setProperty('--panel-tilt', '0deg');
            panel.style.setProperty('--panel-travel', '0');
            currentLeft = targetLeft;

            applyStaticNavRefractionTarget();
            animateWarpTo(restingWarp, 0);

            return 0;
        }

        // Keep an in-flight desktop hover transition alive when the target is unchanged.
        if (Math.abs(distance) < 0.5) {
            currentLeft = targetLeft;
            return 0;
        }

        const dur = durationForDistance(distance);
        panel.style.transitionDuration = `${dur}s`;
        nav.style.setProperty('--panel-center-x', `${targetLeft + panel.clientWidth / 2}px`);
        updatePanelMotion(distance, dur);
        panel.style.setProperty('--panel-offset-x', `${targetLeft}px`);
        currentLeft = targetLeft;

        return dur;
    };

    const setActiveNavLink = linkIdx => {
        if (linkIdx < 0 || linkIdx >= navLinks.length) return;

        const duration = movePanelTo(linkIdx);
        currentNavIndex = linkIdx;
        activeIdx = linkIdx;
        navLinks.forEach((l, i) =>
            l.classList.toggle('active-link', i === currentNavIndex)
        );

        return duration;
    };

    const expandFirstInSection = sectionId => {
        const list = document.querySelector(`#${sectionId} .preview-list`);
        if (!list) return;

        list.querySelectorAll('.post.active').forEach(p => p.classList.remove('active'));

        const firstPost = list.querySelector('.post:not(.static)');
        if (!firstPost) return;
        firstPost.classList.add('active');
        activeSidePost = firstPost;
        moveSidePanelTo(firstPost, true);

        const detailArea = document.querySelector(`#${sectionId} .post-detail`);
        renderPostDetail(firstPost, detailArea);
    };

    navLinks.forEach((link, i) => {
        link.addEventListener('click', e => {
            e.preventDefault();
            showSection(link.dataset.target);
            setActiveNavLink(i);
        });
    });

    document.querySelectorAll('.preview-list').forEach(list => {
        list.addEventListener('click', e => {
            const post = e.target.closest('.post');
            if (!post || post.classList.contains('static')) return;

            list.querySelectorAll('.post.active').forEach(p => p.classList.remove('active'));
            post.classList.add('active');
            activeSidePost = post;
            clearSideHoverDelay();
            moveSidePanelTo(post);

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
    const smoothDamp = (current, target, velocity, smoothTime, deltaTime) => {
        const time = Math.max(0.0001, smoothTime);
        const omega = 2 / time;
        const x = omega * deltaTime;
        const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
        const change = current - target;
        const temp = (velocity + omega * change) * deltaTime;

        return [
            target + (change + temp) * exp,
            (velocity - omega * temp) * exp
        ];
    };

    const navRefractionState = {
        frame: null,
        lastNow: 0,
        shift: 0,
        shiftVelocity: 0,
        drift: 0,
        driftVelocity: 0,
        glint: 0,
        glintVelocity: 0,
        lens: 0,
        lensVelocity: 0,
        lensCounter: 0,
        lensCounterVelocity: 0,
        targetShift: 0,
        targetDrift: 0,
        targetGlint: 0,
        targetLens: 0,
        targetLensCounter: 0
    };

    const applyNavRefraction = (shift, drift, glint, lens, lensCounter) => {
        panel.style.setProperty('--panel-glint-shift', `${glint.toFixed(2)}px`);
        panel.style.setProperty('--panel-lens-shift', `${lens.toFixed(2)}px`);
        panel.style.setProperty('--panel-lens-counter-shift', `${lensCounter.toFixed(2)}px`);
        nav.style.setProperty('--nav-liquid-shift', `${shift.toFixed(2)}px`);
        nav.style.setProperty('--nav-liquid-drift', `${drift.toFixed(2)}px`);
    };

    const stepNavRefraction = now => {
        const deltaTime = navRefractionState.lastNow === 0
            ? 0.016
            : Math.min((now - navRefractionState.lastNow) / 1000, 0.033);
        navRefractionState.lastNow = now;

        [navRefractionState.shift, navRefractionState.shiftVelocity] = smoothDamp(
            navRefractionState.shift,
            navRefractionState.targetShift,
            navRefractionState.shiftVelocity,
            0.11,
            deltaTime
        );
        [navRefractionState.drift, navRefractionState.driftVelocity] = smoothDamp(
            navRefractionState.drift,
            navRefractionState.targetDrift,
            navRefractionState.driftVelocity,
            0.13,
            deltaTime
        );
        [navRefractionState.glint, navRefractionState.glintVelocity] = smoothDamp(
            navRefractionState.glint,
            navRefractionState.targetGlint,
            navRefractionState.glintVelocity,
            0.10,
            deltaTime
        );
        [navRefractionState.lens, navRefractionState.lensVelocity] = smoothDamp(
            navRefractionState.lens,
            navRefractionState.targetLens,
            navRefractionState.lensVelocity,
            0.10,
            deltaTime
        );
        [navRefractionState.lensCounter, navRefractionState.lensCounterVelocity] = smoothDamp(
            navRefractionState.lensCounter,
            navRefractionState.targetLensCounter,
            navRefractionState.lensCounterVelocity,
            0.12,
            deltaTime
        );

        const motion = Math.min(Math.abs(navRefractionState.targetShift) / 14, 1);
        const shimmer = Math.sin(now * 0.0028) * motion * 0.28;
        const counterShimmer = Math.sin(now * 0.0034 + 1.35) * motion * 0.16;
        const nextShift = navRefractionState.shift + shimmer * 0.18;
        const nextDrift = navRefractionState.drift - counterShimmer * 0.18;
        const nextGlint = navRefractionState.glint + shimmer;
        const nextLens = navRefractionState.lens + shimmer * 0.62;
        const nextLensCounter = navRefractionState.lensCounter - counterShimmer;

        applyNavRefraction(
            nextShift,
            nextDrift,
            nextGlint,
            nextLens,
            nextLensCounter
        );

        const settled =
            Math.abs(navRefractionState.shift - navRefractionState.targetShift) < 0.03 &&
            Math.abs(navRefractionState.drift - navRefractionState.targetDrift) < 0.03 &&
            Math.abs(navRefractionState.glint - navRefractionState.targetGlint) < 0.03 &&
            Math.abs(navRefractionState.lens - navRefractionState.targetLens) < 0.03 &&
            Math.abs(navRefractionState.lensCounter - navRefractionState.targetLensCounter) < 0.03 &&
            Math.abs(navRefractionState.shiftVelocity) < 0.02 &&
            Math.abs(navRefractionState.driftVelocity) < 0.02 &&
            Math.abs(navRefractionState.glintVelocity) < 0.02 &&
            Math.abs(navRefractionState.lensVelocity) < 0.02 &&
            Math.abs(navRefractionState.lensCounterVelocity) < 0.02;

        if (!settled) {
            navRefractionState.frame = window.requestAnimationFrame(stepNavRefraction);
            return;
        }

        applyNavRefraction(
            navRefractionState.targetShift,
            navRefractionState.targetDrift,
            navRefractionState.targetGlint,
            navRefractionState.targetLens,
            navRefractionState.targetLensCounter
        );
        navRefractionState.frame = null;
        navRefractionState.lastNow = 0;
    };

    const setNavRefractionTarget = (shift, drift, glint, lens, lensCounter) => {
        navRefractionState.targetShift = shift;
        navRefractionState.targetDrift = drift;
        navRefractionState.targetGlint = glint;
        navRefractionState.targetLens = lens;
        navRefractionState.targetLensCounter = lensCounter;

        if (navRefractionState.frame !== null) {
            return;
        }

        navRefractionState.frame = window.requestAnimationFrame(stepNavRefraction);
    };

    const restingWarp = 16;
    const staticNavRefraction = {
        shift: 2.4,
        drift: -0.38,
        glint: -0.9,
        lens: 1.48,
        lensCounter: -0.7
    };
    const sideRestingWarp = 16;
    let sideWarpFrame = null;
    let sideWarpLevel = 0;
    let activeSidePost = null;
    let sideSettleTimer = null;
    let sideHoverDelayTimer = null;
    const sidePanelBasePadding = 42;
    const fallbackSidePanelMinHeight = 72;
    const fallbackSidePanelMaxHeight = 132;
    const sideHoverDelayMs = 0;
    let sidePanelCurrentTop = 0;
    let sidePanelCurrentHeight = fallbackSidePanelMinHeight;
    let sidePanelTargetTop = 0;
    let sidePanelTargetHeight = fallbackSidePanelMinHeight;
    let sidePanelTopVelocity = 0;
    let sidePanelHeightVelocity = 0;
    let sidePanelMotionFrame = null;
    let sidePanelMotionLastNow = 0;

    const getSidePanelHeightRange = () => {
        if (!sideList) {
            return {
                minHeight: fallbackSidePanelMinHeight,
                maxHeight: fallbackSidePanelMaxHeight
            };
        }

        const sideStyles = window.getComputedStyle(sideList);
        const minHeightRaw = Number.parseFloat(sideStyles.getPropertyValue('--side-panel-min-height'));
        const maxHeightRaw = Number.parseFloat(sideStyles.getPropertyValue('--side-panel-max-height'));
        const minHeight = Number.isFinite(minHeightRaw)
            ? minHeightRaw
            : fallbackSidePanelMinHeight;
        const maxHeight = Number.isFinite(maxHeightRaw)
            ? maxHeightRaw
            : fallbackSidePanelMaxHeight;

        return {
            minHeight,
            maxHeight: Math.max(minHeight, maxHeight)
        };
    };

    const clearSideHoverDelay = () => {
        window.clearTimeout(sideHoverDelayTimer);
        sideHoverDelayTimer = null;
    };

    const applySidePanelPlacement = (top, height) => {
        if (!sidePanel || !sideList) return;

        sidePanelCurrentTop = top;
        sidePanelCurrentHeight = height;
        sidePanel.style.height = `${height.toFixed(2)}px`;
        sideList.style.setProperty('--side-panel-y', `${top.toFixed(2)}px`);
        sideList.style.setProperty('--side-panel-highlight-y', `${top.toFixed(2)}px`);
        sideList.style.setProperty('--side-panel-highlight-height', `${height.toFixed(2)}px`);
    };

    const stopSidePanelMotion = () => {
        if (sidePanelMotionFrame !== null) {
            window.cancelAnimationFrame(sidePanelMotionFrame);
            sidePanelMotionFrame = null;
        }

        sidePanelMotionLastNow = 0;
        sidePanelTopVelocity = 0;
        sidePanelHeightVelocity = 0;
    };

    const stepSidePanelMotion = now => {
        if (!sidePanel || !sideList) {
            stopSidePanelMotion();
            return;
        }

        const deltaTime = sidePanelMotionLastNow === 0
            ? 0.016
            : Math.min((now - sidePanelMotionLastNow) / 1000, 0.05);
        sidePanelMotionLastNow = now;

        [sidePanelCurrentTop, sidePanelTopVelocity] = smoothDamp(
            sidePanelCurrentTop,
            sidePanelTargetTop,
            sidePanelTopVelocity,
            0.26,
            deltaTime
        );
        [sidePanelCurrentHeight, sidePanelHeightVelocity] = smoothDamp(
            sidePanelCurrentHeight,
            sidePanelTargetHeight,
            sidePanelHeightVelocity,
            0.30,
            deltaTime
        );

        applySidePanelPlacement(sidePanelCurrentTop, sidePanelCurrentHeight);

        const settled =
            Math.abs(sidePanelCurrentTop - sidePanelTargetTop) < 0.16 &&
            Math.abs(sidePanelCurrentHeight - sidePanelTargetHeight) < 0.16 &&
            Math.abs(sidePanelTopVelocity) < 0.08 &&
            Math.abs(sidePanelHeightVelocity) < 0.08;

        if (!settled) {
            sidePanelMotionFrame = window.requestAnimationFrame(stepSidePanelMotion);
            return;
        }

        applySidePanelPlacement(sidePanelTargetTop, sidePanelTargetHeight);
        stopSidePanelMotion();
    };

    const startSidePanelMotion = () => {
        if (sidePanelMotionFrame !== null) return;

        sidePanelMotionFrame = window.requestAnimationFrame(stepSidePanelMotion);
    };

    const setSideGlassStrength = strength => {
        const maxWarp = 56;
        const clamped = Math.max(sideRestingWarp, Math.min(maxWarp, strength));
        const normalized = (clamped - sideRestingWarp) / (maxWarp - sideRestingWarp);

        sideWarpLevel = clamped;

        if (sideDisplacementMap) {
            sideDisplacementMap.setAttribute('scale', clamped.toFixed(2));
        }

        if (sideMapBlur) {
            sideMapBlur.setAttribute('stdDeviation', (0.95 - normalized * 0.32).toFixed(2));
        }
    };

    const animateSideGlassTo = (target, durationMs, easing = easeOutCubic) => {
        const start = sideWarpLevel;
        const change = target - start;
        const startedAt = performance.now();

        if (sideWarpFrame !== null) {
            window.cancelAnimationFrame(sideWarpFrame);
        }

        if (durationMs <= 0 || change === 0) {
            setSideGlassStrength(target);
            sideWarpFrame = null;
            return;
        }

        const step = now => {
            const elapsed = now - startedAt;
            const progress = Math.min(elapsed / durationMs, 1);
            const eased = easing(progress);

            setSideGlassStrength(start + change * eased);

            if (progress < 1) {
                sideWarpFrame = window.requestAnimationFrame(step);
                return;
            }

            sideWarpFrame = null;
        };

        sideWarpFrame = window.requestAnimationFrame(step);
    };

    const updateSidePanelMotion = distance => {
        if (!sideList) return;

        const travelMs = Math.min(Math.max(Math.abs(distance) * 1.15, 420), 860);
        const rampUpMs = Math.max(180, Math.min(travelMs * 0.38, 320));
        const rampDownMs = Math.max(520, Math.min(travelMs * 1.05, 940));

        sideList.style.setProperty('--side-panel-scale-x', '1');
        sideList.style.setProperty('--side-panel-scale-y', '1');
        sideList.style.setProperty('--side-panel-glint-shift', '0px');
        animateSideGlassTo(sideRestingWarp, rampUpMs, easeOutCubic);

        window.clearTimeout(sideSettleTimer);
        sideSettleTimer = window.setTimeout(() => {
            sideList.style.setProperty('--side-panel-shift-y', '0px');
            sideList.style.setProperty('--side-panel-scale-x', '1');
            sideList.style.setProperty('--side-panel-scale-y', '1');
            sideList.style.setProperty('--side-panel-glint-shift', '0px');
            animateSideGlassTo(sideRestingWarp, rampDownMs, easeInOutSine);
        }, travelMs);
    };

    const moveSidePanelTo = (post, instant = false) => {
        if (!sidePanel || !sideList || !post || !sideList.contains(post)) return;

        const heading = post.querySelector('h3');
        const headingTop = heading ? post.offsetTop + heading.offsetTop : post.offsetTop;
        const headingHeight = heading ? heading.offsetHeight : post.offsetHeight;
        const { minHeight, maxHeight } = getSidePanelHeightRange();
        const panelHeight = Math.min(
            maxHeight,
            Math.max(headingHeight + sidePanelBasePadding, minHeight)
        );
        const rawTargetTop = headingTop + (headingHeight / 2) - (panelHeight / 2);
        const maxTargetTop = Math.max(0, sideList.scrollHeight - panelHeight);
        const targetTop = Math.max(0, Math.min(rawTargetTop, maxTargetTop));
        const distance = targetTop - sidePanelCurrentTop;

        sidePanelTargetTop = targetTop;
        sidePanelTargetHeight = panelHeight;
        sidePanel.style.opacity = '1';

        if (instant) {
            stopSidePanelMotion();
            applySidePanelPlacement(targetTop, panelHeight);
            sideList.style.setProperty('--side-panel-shift-y', '0px');
            sideList.style.setProperty('--side-panel-scale-x', '1');
            sideList.style.setProperty('--side-panel-scale-y', '1');
            sideList.style.setProperty('--side-panel-glint-shift', '0px');
            sideList.style.setProperty('--side-panel-highlight-opacity', '0.24');
            setSideGlassStrength(sideRestingWarp);
            return;
        }

        startSidePanelMotion();
        sideList.style.setProperty('--side-panel-highlight-opacity', '0.30');

        updateSidePanelMotion(distance);
    };

    sidePosts.forEach(post => {
        post.addEventListener('mouseenter', () => {
            clearSideHoverDelay();

            sideHoverDelayTimer = window.setTimeout(() => {
                if (!post.matches(':hover')) return;
                moveSidePanelTo(post);
            }, sideHoverDelayMs);
        });
    });

    sideList?.addEventListener('mouseleave', () => {
        clearSideHoverDelay();
        if (!activeSidePost) return;
        moveSidePanelTo(activeSidePost);
    });

    const setWarpStrength = strength => {
        const maxWarp = 88;
        const clamped = Math.max(restingWarp, Math.min(maxWarp, strength));
        const normalized = (clamped - restingWarp) / (maxWarp - restingWarp);

        warpLevel = clamped;
        panel.style.setProperty('--panel-warp', normalized.toFixed(3));
        panel.style.setProperty('--panel-blur', `${(0.75 + normalized * 0.75).toFixed(2)}px`);
        panel.style.setProperty('--panel-saturation', '1.72');
        panel.style.setProperty('--panel-brightness', '0.97');
        panel.style.setProperty('--panel-glint-opacity', '0.08');
        panel.style.setProperty('--panel-lens-opacity', '0.045');
        panel.style.setProperty('--panel-lens-edge-opacity', '0.03');
        nav.style.setProperty('--panel-warp', normalized.toFixed(3));
        nav.style.setProperty('--nav-hot-alpha', '0.075');
        nav.style.setProperty('--nav-hot-size', '13%');
        nav.style.setProperty('--nav-saturation', '1.12');
        nav.style.setProperty('--nav-y-shift', '0px');
        nav.style.setProperty('--nav-scale', '1.01');

        if (displacementMap) {
            displacementMap.setAttribute('scale', clamped.toFixed(2));
        }

        if (mapBlur) {
            mapBlur.setAttribute('stdDeviation', (0.95 - normalized * 0.32).toFixed(2));
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

    const applyStaticNavRefractionTarget = () => {
        setNavRefractionTarget(
            staticNavRefraction.shift,
            staticNavRefraction.drift,
            staticNavRefraction.glint,
            staticNavRefraction.lens,
            staticNavRefraction.lensCounter
        );
    };

    const updatePanelMotion = (distance, durationSeconds) => {
        const travel = Math.min(Math.abs(distance) / Math.max(nav.clientWidth, 1), 1);
        const peakWarp = restingWarp;
        const travelMs = Math.max(durationSeconds * 1000, 320);
        const rampUpMs = 0;
        const rampDownMs = 0;
        const settleDuration = Math.max(0.2, Math.min(durationSeconds * 0.36, 0.48));

        panel.style.setProperty('--panel-shift-x', '0px');
        panel.style.setProperty('--panel-scale-x', '1');
        panel.style.setProperty('--panel-scale-y', '1');
        panel.style.setProperty('--panel-tilt', '0deg');
        panel.style.setProperty('--panel-travel', travel.toFixed(3));
        applyStaticNavRefractionTarget();
        animateWarpTo(peakWarp, rampUpMs, easeOutCubic);

        window.clearTimeout(settleTimer);
        settleTimer = window.setTimeout(() => {
            panel.style.transitionDuration = `${settleDuration}s`;
            panel.style.setProperty('--panel-shift-x', '0px');
            panel.style.setProperty('--panel-scale-x', '1');
            panel.style.setProperty('--panel-scale-y', '1');
            panel.style.setProperty('--panel-tilt', '0deg');
            panel.style.setProperty('--panel-travel', '0');
            applyStaticNavRefractionTarget();
            animateWarpTo(restingWarp, rampDownMs, easeInOutSine);
        }, travelMs);
    };

    const setPanel = (idx, instant = false) => movePanelTo(idx, instant);

    const syncGlassPanels = () => {
        layoutSyncFrame = null;

        if (activeIdx !== -1) {
            setPanel(activeIdx, true);
        }

        if (activeSidePost) {
            moveSidePanelTo(activeSidePost, true);
        }
    };

    const scheduleGlassPanelSync = () => {
        if (layoutSyncFrame !== null) return;

        layoutSyncFrame = window.requestAnimationFrame(syncGlassPanels);
    };

    if (!supportsHover) {
        window.addEventListener('resize', scheduleGlassPanelSync);
        window.addEventListener('orientationchange', scheduleGlassPanelSync);
    }

    const initialIdx = 0;
    showSection(navLinks[initialIdx].dataset.target, initialIdx);

    activeIdx = navLinks.findIndex(a => a.hasAttribute('aria-current'));
    if (activeIdx !== -1) {
        requestAnimationFrame(() => setPanel(activeIdx));
    } else {
        panel.style.opacity = '0';
    }

    if (supportsHover) {
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
    }

    let startX = null;
    let startY = null;
    let startT = null;
    let isHorizontalTouch = null;

    const resetSwipeState = () => {
        startX = null;
        startY = null;
        startT = null;
        isHorizontalTouch = null;
    };

    const minDistance = 30;
    const minSpeed = 0.3;

    const handlePointerDown = e => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        resetSwipeState();
        startX = e.clientX;
        startT = performance.now();

        if (e.pointerType !== 'mouse' && nav.setPointerCapture) {
            try {
                nav.setPointerCapture(e.pointerId);
            } catch (error) {
                // Ignore capture failures and fall back to the regular pointer path.
            }
        }
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

        if (e.pointerType !== 'mouse' && nav.releasePointerCapture) {
            try {
                nav.releasePointerCapture(e.pointerId);
            } catch (error) {
                // Ignore release failures.
            }
        }

        resetSwipeState();
    };

    nav.addEventListener('pointerdown', handlePointerDown, { passive: true });
    nav.addEventListener('pointerup',   handlePointerUp);
    nav.addEventListener('pointercancel', resetSwipeState);

    /* Touch‑only fallback – blocks vertical scroll during horizontal swipe */
    if (!window.PointerEvent && 'ontouchstart' in window) {
        nav.addEventListener('touchstart', e => {
            if (e.touches.length !== 1) return;

            resetSwipeState();
            const t = e.touches[0];
            startX   = t.clientX;
            startY   = t.clientY;
            startT   = performance.now();
            isHorizontalTouch = null; // reset
        }, { passive: false });

        nav.addEventListener('touchmove', e => {
            if (!e.touches || e.touches.length !== 1 || startX === null || startY === null) return;

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

        nav.addEventListener('touchcancel', resetSwipeState);

        nav.addEventListener('touchend', e => {
            if (!e.changedTouches || e.changedTouches.length !== 1 || startX === null || startT === null) {
                resetSwipeState();
                return;
            }

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

            resetSwipeState();
        });
    }
});
