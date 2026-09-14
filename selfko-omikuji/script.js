(function () {
  const RESULTS = {
    daikichi: "assets/daikichi.webp",
    metsukichi: "assets/metsukichi.webp",
    "love-kichi": "assets/love-kichi.webp",
  };
  const KEYS = Object.keys(RESULTS);

  Object.values(RESULTS).forEach((src) => {
    const preload = new Image();
    preload.src = src;
  });

  const wrapper = document.getElementById("omikuji");
  const img = document.getElementById("resultImg");
  const redrawBtn = document.getElementById("redrawBtn");
  let currentKey = null;
  let audioCtx = null;

  // "くるくる…" の回転間隔(ms)。だんだん間隔が伸びて、最後の1枚で止まる。
  const INITIAL_DELAYS = [90, 100, 120, 150, 190, 220];
  const REDRAW_DELAYS = [80, 100, 130, 160];

  function mod(n, m) {
    return ((n % m) + m) % m;
  }

  function pickRandom(excludeKey) {
    const pool = excludeKey ? KEYS.filter((k) => k !== excludeKey) : KEYS;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // クリックという「ユーザー操作の瞬間」に同期して発音を予約することで、
  // スマホブラウザの自動再生制限に引っかからないようにしている。
  function schedulePonSound(delaySeconds) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!audioCtx) audioCtx = new AC();
      if (audioCtx.state === "suspended") audioCtx.resume();

      const t0 = audioCtx.currentTime + delaySeconds;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, t0);
      osc.frequency.exponentialRampToValueAtTime(660, t0 + 0.15);
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.22, t0 + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.32);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.4);
    } catch (e) {
      // 再生できない環境では黙って諦める
    }
  }

  function runDraw(finalKey, delays) {
    const steps = delays.length;
    const finalIndex = KEYS.indexOf(finalKey);
    const startIndex = mod(finalIndex - (steps - 1), KEYS.length);

    wrapper.classList.remove("is-popping");
    wrapper.classList.add("is-shuffling");
    img.classList.remove("is-visible");
    img.classList.add("is-shuffling");
    redrawBtn.disabled = true;

    let i = 0;
    function showFrame() {
      const idx = mod(startIndex + i, KEYS.length);
      img.src = RESULTS[KEYS[idx]];
      if (i < steps - 1) {
        const wait = delays[i];
        i++;
        window.setTimeout(showFrame, wait);
      } else {
        window.setTimeout(settle, delays[i]);
      }
    }
    function settle() {
      wrapper.classList.remove("is-shuffling");
      img.classList.remove("is-shuffling");
      img.classList.add("is-visible");
      currentKey = finalKey;
      requestAnimationFrame(() => {
        wrapper.classList.add("is-popping");
      });
      redrawBtn.disabled = false;
    }
    showFrame();
  }

  runDraw(pickRandom(), INITIAL_DELAYS);

  redrawBtn.addEventListener("click", () => {
    const totalMs = REDRAW_DELAYS.reduce((a, b) => a + b, 0);
    schedulePonSound(totalMs / 1000);
    runDraw(pickRandom(currentKey), REDRAW_DELAYS);
  });
})();
