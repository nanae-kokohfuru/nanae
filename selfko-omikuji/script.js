(function () {
  const BOX_SRC = "assets/box.webp";
  const RESULTS = {
    daikichi: "assets/daikichi.webp",
    metsukichi: "assets/metsukichi.webp",
    "love-kichi": "assets/love-kichi.webp",
  };
  const KEYS = Object.keys(RESULTS);

  [BOX_SRC, ...Object.values(RESULTS)].forEach((src) => {
    const preload = new Image();
    preload.src = src;
  });

  const wrapper = document.getElementById("omikuji");
  const img = document.getElementById("resultImg");
  const redrawBtn = document.getElementById("redrawBtn");
  let currentKey = null;
  let audioCtx = null;

  // CSSの .omikuji.is-shaking のアニメーション時間(0.85s)と合わせている
  const SHAKE_MS = 850;

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

  function runDraw(finalKey) {
    wrapper.classList.remove("is-popping");
    redrawBtn.disabled = true;

    // まず箱の絵(添付画像そのもの)を表示し、左右にガタガタッと振る
    img.classList.remove("is-visible");
    img.src = BOX_SRC;
    requestAnimationFrame(() => {
      img.classList.add("is-visible");
      wrapper.classList.add("is-shaking");
    });

    window.setTimeout(() => {
      wrapper.classList.remove("is-shaking");
      // ピタッと止まった直後に結果を1枚だけポンと出す
      img.classList.remove("is-visible");
      img.src = RESULTS[finalKey];
      currentKey = finalKey;
      requestAnimationFrame(() => {
        img.classList.add("is-visible");
        wrapper.classList.add("is-popping");
      });
      redrawBtn.disabled = false;
    }, SHAKE_MS);
  }

  runDraw(pickRandom());

  redrawBtn.addEventListener("click", () => {
    schedulePonSound(SHAKE_MS / 1000);
    runDraw(pickRandom(currentKey));
  });
})();
