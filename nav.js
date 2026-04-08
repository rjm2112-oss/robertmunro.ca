/* ────────────────────────────────────────────────────────
 *   NAVIGATION & PANEL
 *   ──────────────────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
    /* ----------------------------------------------------------------- */
    /* 1️⃣ Elements & state                                              */
    /* ----------------------------------------------------------------- */
    const navLinks = Array.from(document.querySelectorAll('[data-target]'));
    const sections = Array.from(document.querySelectorAll('section'));
    const nav      = document.querySelector('.glass-nav');
    const panel    = nav.querySelector('.panel');
    const displacementMap = document.getElementById('glass-displacement');
    const turbulence = document.getElementById('glass-turbulence');

    let currentNavIndex = null;   // index of the link that is currently active
    let currentSectionId = null;  // id of the section that is currently shown

    /* ----------------------------------------------------------------- */
    /* 2️⃣ Helper – “scroll into view” + tiny offset (if you still want it) */
    /* ----------------------------------------------------------------- */
    const scrollToSection = el => {
        el.scrollIntoView({ behavior: 'auto', block: 'start' });
    };

    /** Scroll to the absolute top of the page (used for the Home section). */
    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'auto' });
    };

    /* ----------------------------------------------------------------- */
    /* 3️⃣ Show a section (called from link clicks or initial load)       */
    /* ----------------------------------------------------------------- */
    const showSection = (id, linkIdx = null) => {
        // ---- hide previous sections ------------------------------------
        sections.forEach(s => s.classList.remove('active'));

        const targetSec = document.getElementById(id);
        if (!targetSec) return;

        targetSec.classList.add('active');
        currentSectionId = id;

        /* 3️⃣1. Clear any “active” preview‑list post in this section */
        clearActive(id);

        /* 3️⃣2. Expand the first non‑static post so that the detail area
         *           is populated on load (behaviour you had originally). */
        expandFirstInSection(id);

        /* 3️⃣3. Scroll handling ---------------------------------------
         *   - If this is the Home section, always jump to the absolute
         *     top of the page.
         */
        if (linkIdx !== null) {
            // Adjust 'home' to match your actual Home section id.
            if (id === 'home') {
                scrollToTop();
            }
        }

        /* 3️⃣4. Move the animated panel & set active link -----------------*/
        if (linkIdx !== null) {
            movePanelTo(linkIdx);
            currentNavIndex = linkIdx;
            navLinks.forEach((l, i) =>
                l.classList.toggle('active-link', i === currentNavIndex)
            );
        }
    };

    /* ----------------------------------------------------------------- */
    /* 4️⃣ Clear “active” class from preview‑list posts in a section     */
    /* ----------------------------------------------------------------- */
    const clearActive = sectionId => {
        document
          .querySelectorAll(`#${sectionId} .post.active`)
          .forEach(p => p.classList.remove('active'));
    };

    /* ----------------------------------------------------------------- */
    /* 5️⃣ Move the animated panel under the active link                */
    /* ----------------------------------------------------------------- */
    const movePanelTo = idx => {
        if (idx < 0 || idx >= navLinks.length) return;

        const linkRect = navLinks[idx].getBoundingClientRect();
        const navRect  = nav.getBoundingClientRect();

        // Center panel on the middle of the link text
        const targetLeft =
          linkRect.left + linkRect.width / 2 - navRect.left - panel.clientWidth / 2;

        const distance = targetLeft - currentLeft;
        const dur = durationForDistance(distance);
        panel.style.transitionDuration = `${dur}s`;
        updatePanelMotion(distance, dur);
        panel.style.setProperty('--panel-offset-x', `${targetLeft}px`);
        currentLeft = targetLeft;
    };

    /* ----------------------------------------------------------------- */
    /* 6️⃣ Expand the first non‑static post inside a section             */
    /* ----------------------------------------------------------------- */
    const expandFirstInSection = sectionId => {
        const list = document.querySelector(`#${sectionId} .preview-list`);
        if (!list) return;

        // Remove any existing active flag
        list.querySelectorAll('.post.active').forEach(p => p.classList.remove('active'));

        // Pick the first non‑static post (your original logic)
        const firstPost = list.querySelector('.post:not(.static)');
        if (!firstPost) return;
        firstPost.classList.add('active');

        const detailArea = document.querySelector(`#${sectionId} .post-detail`);
        const title   = firstPost.querySelector('h3').outerHTML;
        const meta    = firstPost.querySelector('.meta')?.outerHTML || '';
        const body    = firstPost.querySelector('.full-body')?.innerHTML || '';

        detailArea.innerHTML = `<article>${title}${meta}<div class="full-body">${body}</div></article>`;
    };

    /* ----------------------------------------------------------------- */
    /* 8️⃣ Link click handler                                           */
    /* ----------------------------------------------------------------- */
    navLinks.forEach((link, i) => {
        link.addEventListener('click', e => {
            e.preventDefault();
            showSection(link.dataset.target, i);
        });
    });

    /* ----------------------------------------------------------------- */
    /* 9️⃣ Preview‑list click – “stay‑at‑top” guard + smooth scroll   */
    /* ----------------------------------------------------------------- */
    document.querySelectorAll('.preview-list').forEach(list => {
        list.addEventListener('click', e => {
            const post = e.target.closest('.post');
            if (!post || post.classList.contains('static')) return;

            // Toggle active flag
            list.querySelectorAll('.post.active').forEach(p => p.classList.remove('active'));
            post.classList.add('active');

            // Populate detail area
            const detailArea = list.nextElementSibling; // .post-detail
            const title   = post.querySelector('h3').outerHTML;
            const meta    = post.querySelector('.meta')?.outerHTML || '';
            const body    = post.querySelector('.full-body')?.innerHTML || '';

            detailArea.innerHTML =
              `<article>${title}${meta}<div class="full-body">${body}</div></article>`;

              /* Scroll only when we’re not already at the top - not using this for now * if (window.scrollY > nav.offsetHeight) {
                  scrollToTop();
        }*/

            scrollToTop();

        });
    });

    /* ----------------------------------------------------------------- */
    /* 10️⃣ PANEL ANIMATION           */
    /* ----------------------------------------------------------------- */

    const links = Array.from(nav.querySelectorAll('a'));
    const count = links.length;

    let currentLeft = 0;
    let activeIdx   = -1; // index of the link that is currently “active”
    let settleTimer = null;
    let warpFrame   = null;
    let warpLevel   = 0;

    /* Distance → duration (px per second) */
    const msPerPixel = 1000 / 550;   // milliseconds per pixel
    const minDur     = .85;          // seconds
    const maxDur     = 1.25;         // seconds

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

    /* Move the selector to the link at position `idx` */
    const setPanel = idx => {
        if (idx < 0 || idx >= count) return;

        const linkRect = links[idx].getBoundingClientRect();
        const navRect  = nav.getBoundingClientRect();
        const panelW   = panel.clientWidth;

        const targetLeft =
          linkRect.left + linkRect.width / 2 - navRect.left - panelW / 2;

        const dur = durationForDistance(targetLeft - currentLeft);
        panel.style.transitionDuration = `${dur}s`;

        updatePanelMotion(targetLeft - currentLeft, dur);
        panel.style.setProperty('--panel-offset-x', `${targetLeft}px`);
        currentLeft = targetLeft;
    };

    /* ----------------------------------------------------------------- */
    /* 7️⃣ Initialise – show the very first section on page load       */
    /* ----------------------------------------------------------------- */
    const initialIdx = 0; // index of navLinks[0]
    showSection(navLinks[initialIdx].dataset.target, initialIdx);

    /* ---------- INITIAL POSITION ---------- */
    activeIdx = links.findIndex(a => a.hasAttribute('aria-current'));
    if (activeIdx !== -1) {
        requestAnimationFrame(() => setPanel(activeIdx));
    } else {
        panel.style.opacity = '0';
    }

    /* Hover logic – update the selector and remember the index */
    links.forEach((link, i) => {
        link.addEventListener('mouseenter', () => {
            activeIdx = i;
            setPanel(i);
            panel.style.opacity = '1';
        });
    });

    /* Return to the active section when leaving the nav bar */
    nav.addEventListener('mouseleave', () => {
        const activeLink = nav.querySelector('a.active-link');
        if (!activeLink) return;

        const idx = links.indexOf(activeLink);
        if (idx === -1) return;

        activeIdx = idx;
        setPanel(idx);
        panel.style.opacity = '1';
    });

    /* Flick / swipe detection */
    let startX   = null;          // X coordinate where the gesture started
    let startT   = null;          // Timestamp when the gesture started

    const minDistance = 30;       // px – minimal distance for a flick
    const minSpeed    = 0.3;      // px/ms (≈300 px/s)

    const handlePointerDown = e => {
        if (e.pointerType === 'mouse' && e.button !== 0) return; // ignore right‑clicks
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

            startX   = null;
            startY   = null;
            isHorizontalTouch = null;
        });
    }
});
