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

  // CSSの .omikuji.is-shaking / .is-popping のアニメーション時間と合わせている
  const SHAKE_MS = 1600;
  const POP_MS = 320;
  const LINGER_MS = 260; // ポンと出た後、少し余韻を残してからボタンを戻す

  function pickRandom(excludeKey) {
    const pool = excludeKey ? KEYS.filter((k) => k !== excludeKey) : KEYS;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function playNoiseTick(ctx, t, freq, gainPeak) {
    const bufferSize = Math.floor(ctx.sampleRate * 0.045);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const bandpass = ctx.createBiquadFilter();
    bandpass.type = "bandpass";
    bandpass.frequency.value = freq;
    bandpass.Q.value = 1.1;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(gainPeak, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    src.connect(bandpass).connect(gain).connect(ctx.destination);
    src.start(t);
    src.stop(t + 0.06);
  }

  // クリックという「ユーザー操作の瞬間」に同期して発音を予約することで、
  // スマホブラウザの自動再生制限に引っかからないようにしている。
  // 揺れの強まりに合わせた「カラカラ…」と、止まった直後の「ポン」を鳴らす。
  function scheduleDrawSounds(shakeSeconds) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!audioCtx) audioCtx = new AC();
      if (audioCtx.state === "suspended") audioCtx.resume();

      const now = audioCtx.currentTime;
      const fractions = [
        0.12, 0.22, 0.32, 0.41, 0.49, 0.56, 0.63, 0.69, 0.745, 0.79, 0.83,
        0.865, 0.895, 0.92,
      ];
      fractions.forEach((f, idx) => {
        const intensity = idx / (fractions.length - 1);
        playNoiseTick(
          audioCtx,
          now + shakeSeconds * f,
          900 + intensity * 500,
          0.05 + intensity * 0.16
        );
      });

      const t0 = now + shakeSeconds;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, t0);
      osc.frequency.exponentialRampToValueAtTime(660, t0 + 0.15);
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.24, t0 + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.34);
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
      // ピタッと止まった直後に結果を1枚だけくるっとポンと出す
      img.classList.remove("is-visible");
      img.src = RESULTS[finalKey];
      currentKey = finalKey;
      requestAnimationFrame(() => {
        img.classList.add("is-visible");
        wrapper.classList.add("is-popping");
      });
      window.setTimeout(() => {
        redrawBtn.disabled = false;
      }, POP_MS + LINGER_MS);
    }, SHAKE_MS);
  }

  runDraw(pickRandom());

  redrawBtn.addEventListener("click", () => {
    scheduleDrawSounds(SHAKE_MS / 1000);
    runDraw(pickRandom(currentKey));
  });
})();
