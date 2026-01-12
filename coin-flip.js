/* --------------------------------------------------
 *   coin-flip.js – handles the “Flip!” button & UI
 * -------------------------------------------------- */
(() => {
    /* ---- helper: build a single coin element --------------------------------- */
    function createCoin() {
        const c = document.createElement('div');
        c.className = 'coin-flip';

        const heads = document.createElement('div');
        heads.className = 'coin-heads';
        const himg   = document.createElement('img');
        himg.src      = 'assets/pic5.png';
        heads.appendChild(himg);

        const tails = document.createElement('div');
        tails.className = 'coin-tails';
        const timg   = document.createElement('img');
        timg.src     = 'assets/pic4.png';
        tails.appendChild(timg);

        c.appendChild(heads);
        c.appendChild(tails);
        return c;
    }

    /* ---- start the “fly” animation ------------------------------------------- */
    function startAnimation(coin) {
        coin.style.animation = 'none';          // reset
        void coin.offsetWidth;                  // force re‑flow
        coin.style.animation = 'fly 1.5s ease-out forwards';
        setTimeout(() => setResult(coin), 1500); // 1.5 s later, decide heads/tails
    }

    /* ---- pick a random side & apply the final class --------------------------- */
    function setResult(coin) {
        const heads = Math.random() < 0.5;
        coin.classList.add(heads ? 'result-h' : 'result-t');
        coin.style.animation = 'none';
    }

    /* ---- create & animate a row of n coins ----------------------------------- */
    function flipCoins(n) {
        const wrapper   = document.getElementById('wrapper');
        wrapper.innerHTML = '';                // clear previous run

        let delay        = 0;
        const centerDist = 80;                 // px between coin centres
        const staggerMs  = 260;

        for (let i = 0; i < n; i++) {
            const coin = createCoin();

            /* position the coin horizontally around the centre */
            const leftOffset = (i - (n - 1) / 2) * centerDist;
            coin.style.left   = `calc(50% + ${leftOffset}px - 50px)`; // 50px is half‑coin width
            coin.style.transform = 'translateX(-50%)';

            wrapper.appendChild(coin);
            setTimeout(() => startAnimation(coin), delay); // stagger each one
            delay += staggerMs;
        }
    }

    /* ---- UI wiring ------------------------------------------------------------- */
    let selectedNum = 1;                                   // default # of coins

    const coinBtns = document.querySelectorAll('#numCoinsContainer .coin-btn');
    coinBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            selectedNum = parseInt(btn.dataset.num, 10);
            coinBtns.forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
        });
    });

    document.getElementById('flipBtn').addEventListener('click', () => flipCoins(selectedNum));
})();
