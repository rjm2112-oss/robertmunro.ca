/* nav.js – handles navigation panel and section activation */
document.addEventListener('DOMContentLoaded', () => {
    /* Navigation & section activation --------------------------------*/
    const navLinks = document.querySelectorAll('[data-target]');
    const sections = document.querySelectorAll('section');
    const nav      = document.querySelector('.glass-nav');
    const panel    = nav.querySelector('.panel');

    let currentNavIndex = null;        // index of the link that is currently active
    let currentSectionId = null;       // id of the section that is currently shown

    /* ---------------------------------------------------------------- */

    function clearActive(sectionId) {
        document
        .querySelectorAll(`#${sectionId} .post.active`)
        .forEach(p => p.classList.remove('active'));
    }

    function movePanelTo(idx) {
        const linkRect = navLinks[idx].getBoundingClientRect();
        const navRect  = nav.getBoundingClientRect();

        const targetLeft =
        linkRect.left + (linkRect.width / 2)
        - navRect.left
        - (panel.clientWidth / 2);

        panel.style.transform = `translateX(${targetLeft}px)`;
    }

    // Smooth scroll – used only inside the Home section
    function scrollToWithOffset(el, offset = 0) {
        el.scrollIntoView({ behavior: 'auto', block: 'start' });
        setTimeout(() => window.scrollBy(0, offset), 0);
    }

    // Instant (no‑smooth) jump – used when moving between sections
    function scrollToInstantWithOffset(el, offset = 0) {
        el.scrollIntoView({ behavior: 'auto', block: 'start' });

        // Offset it after the layout has settled
        requestAnimationFrame(() => window.scrollBy(0, offset = -1000));
    }

    /* ---------------------------------------------------------------- */

    const THRESHOLD_TOP = nav.offsetHeight / 1; // tweak if you need more room

    function showSection(id, linkIdx = null) {
        // --------- hide the previous section --------------------------------
        sections.forEach(s => s.classList.remove('active'));

        const targetSec = document.getElementById(id);
        if (!targetSec) return;

        targetSec.classList.add('active');

        // remember which section is now active (used to decide on scrolling)
        currentSectionId = id;
        clearActive(id);
        expandFirstInSection(id);

        /* ------------------------------------------------- */
        /* 1️⃣ Only scroll when we’re *not* at the very top of the page   */
        /* ------------------------------------------------- */
        const isAtTop = window.scrollY < THRESHOLD_TOP;

        if (linkIdx !== null) {
            // **no smooth** – instant jump between sections
            // If you want a small offset to keep the section just below the nav,
            // pass `-nav.offsetHeight` as the second argument.
            scrollToInstantWithOffset(targetSec);
        }

        /* ------------------------------------------------- */
        /* 2️⃣ Update panel & active link (always run – we still want it) */
        /* ------------------------------------------------- */
        if (linkIdx !== null) {
            movePanelTo(linkIdx);
            currentNavIndex = linkIdx;
            navLinks.forEach((l, i) =>
            l.classList.toggle('active-link', i === currentNavIndex)
            );
        }
    }

    function expandFirstInSection(sectionId){
        const list = document.querySelector(`#${sectionId} .preview-list`);
        if (!list) return;
        list.querySelectorAll('.post.active').forEach(p=>p.classList.remove('active'));
        const firstPost = list.querySelector('.post:not(.static)');
        if(!firstPost) return;
        firstPost.classList.add('active');
        const detailArea = document.querySelector(`#${sectionId} .post-detail`);
        const title   = firstPost.querySelector('h3').outerHTML;
        const meta    = firstPost.querySelector('.meta')?.outerHTML || '';
        const body    = firstPost.querySelector('.full-body')?.innerHTML || '';
        detailArea.innerHTML = `<article>${title}${meta}<div class="full-body">${body}</div></article>`;
    }

    /* ----------------------------------------------------------------- */
    const initialIdx = 0; // index of navLinks[0]
    showSection(navLinks[initialIdx].dataset.target, initialIdx);

    navLinks.forEach((link, i) => {
        link.addEventListener('click', e => {
            e.preventDefault();
            showSection(link.dataset.target, i);
        });
    });

    /* ----------------------------------------------------------------- */
    /* 3️⃣ Preview‑list clicks – same “no‑scroll‑when‑at‑top” guard     */
    /* ----------------------------------------------------------------- */
    document.querySelectorAll('.preview-list').forEach(list => {
        list.addEventListener('click', e => {
            const post = e.target.closest('.post');
            if (!post || post.classList.contains('static')) return;

            list.querySelectorAll('.post.active')
            .forEach(p => p.classList.remove('active'));
            post.classList.add('active');

            const detailArea = list.nextElementSibling; // .post-detail
            const title   = post.querySelector('h3').outerHTML;
            const meta    = post.querySelector('.meta')?.outerHTML || '';
            const body    = post.querySelector('.full-body')?.innerHTML || '';
            detailArea.innerHTML =
            `<article>${title}${meta}<div class="full-body">${body}</div></article>`;

            /* Only scroll if we’re not already at the top of the page */
            const isAtTop = window.scrollY < THRESHOLD_TOP;
            if (!isAtTop) {
                // Smooth scroll *inside* the Home section
                scrollToWithOffset(detailArea, -600);
            }
        });
    });
});

/* --------------------------------------------------------------
 *   GLASS NAV PANEL – distance → duration (px per second)
 * -------------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
    const nav   = document.querySelector('.glass-nav');
    const panel = nav.querySelector('.panel');
    const links = Array.from(nav.querySelectorAll('a'));
    const count = links.length;

    /* ----------------------------------------------------------
     *       State variables
     *    ---------------------------------------------------------- */
    let currentLeft = 0;          // left offset of the panel (px)
let activeIdx   = -1;         // index of the link that is currently “active”

/* ----------------------------------------------------------
 *       Helper: distance → duration (px per second)
 *    ---------------------------------------------------------- */
const msPerPixel = 1000 / 550;   // ms for each pixel
const minDur     = .85;          // seconds
const maxDur     = 1.25;         // seconds

const durationForDistance = dist => {
    const raw = Math.abs(dist) * msPerPixel / 1000;
    return Math.min(Math.max(raw, minDur), maxDur);
};
/* ----------------------------------------------------------
 *       Move the selector to the link at position `idx`
 *    ---------------------------------------------------------- */
const setPanel = idx => {
    if (idx < 0 || idx >= count) return;

    const linkRect = links[idx].getBoundingClientRect();
    const navRect  = nav.getBoundingClientRect();
    const panelW   = panel.clientWidth;

    // Desired left offset so the panel is centered on the link text
    const targetLeft =
    linkRect.left + (linkRect.width / 2) - navRect.left - (panelW / 2);

    // Animate over a duration that depends on how far we must travel
    const dur = durationForDistance(targetLeft - currentLeft);
    panel.style.transitionDuration = `${dur}s`;

    panel.style.transform = `translateX(${targetLeft}px)`;
    currentLeft = targetLeft;
};

/* ---------- INITIAL POSITION ---------- */
activeIdx = links.findIndex(a => a.hasAttribute('aria-current'));
if (activeIdx !== -1) {
    // Let Safari finish layout first
    requestAnimationFrame(() => setPanel(activeIdx));
} else {
    panel.style.opacity = '0';
}

/* ----------------------------------------------------------
 *       Hover logic – update the selector and remember the index
 *    ---------------------------------------------------------- */
links.forEach((link, i) => {
    link.addEventListener('mouseenter', () => {
        activeIdx = i;
        setPanel(i);
        panel.style.opacity = '1';
    });
});

/* ----------------------------------------------------------
 *       Return to the active section when leaving the nav bar
 *    ---------------------------------------------------------- */
nav.addEventListener('mouseleave', () => {
    const activeLink = nav.querySelector('a.active-link');
    if (!activeLink) return;

    const idx = links.indexOf(activeLink);
    if (idx === -1) return;

    activeIdx = idx;
    setPanel(idx);
    panel.style.opacity = '1';
});

/* ----------------------------------------------------------
 *       Flick / swipe detection
 *    ---------------------------------------------------------- */
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

    // Only consider horizontal flicks that are fast enough
    if (
        Math.abs(deltaX) > minDistance &&
        Math.abs(deltaX) / deltaT >= minSpeed
    ) {
        const dir   = deltaX > 0 ? +1 : -1;     // right or left
        let newIdx  = activeIdx + dir;

        // Clamp to the bounds of the link list
        if (newIdx < 0)    newIdx = 0;
        if (newIdx >= count) newIdx = count - 1;

        if (newIdx !== activeIdx) {
            activeIdx = newIdx;
            setPanel(newIdx);
            panel.style.opacity = '1';
        }
    }

    // Reset
    startX = null;
    startT = null;
};

nav.addEventListener('pointerdown', handlePointerDown, {passive: true});
nav.addEventListener('pointerup',   handlePointerUp);

/* ----------------------------------------------------------
 *       Touch‑only fallback – blocks vertical scroll during horizontal swipe
 *    ---------------------------------------------------------- */
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
}, {passive: false});          // must be non‑passive to call preventDefault()

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
}, {passive: false});

nav.addEventListener('touchend', e => {
    if (!e.changedTouches || e.changedTouches.length !== 1) return;

    const t   = e.changedTouches[0];
    const endX = t.clientX;
    const deltaX = endX - startX;
    const deltaT = performance.now() - startT;

    // Re‑use the same flick logic as for pointer events
    if (
        Math.abs(deltaX) > minDistance &&
        Math.abs(deltaX) / deltaT >= minSpeed
    ) {
        const dir   = deltaX > 0 ? +1 : -1;
        let newIdx  = activeIdx + dir;

        if (newIdx < 0)    newIdx = 0;
        if (newIdx >= count) newIdx = count - 1;

        if (newIdx !== activeIdx) {
            activeNavIndex = newIdx;
            setPanel(newIdx);
            panel.style.opacity = '1';
        }
    }

    // Reset
    startX   = null;
    startY   = null;
    isHorizontalTouch = null;
});
}
});
