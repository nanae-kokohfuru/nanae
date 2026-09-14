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
  const fireworkLeft = document.getElementById("fireworkLeft");
  const fireworkRight = document.getElementById("fireworkRight");
  let currentKey = null;
  let audioCtx = null;

  // CSSの各アニメーション時間と合わせている
  const SHAKE_MS = 1700; // 箱がガタガタ揺れる時間
  const PAUSE_MS = 700; // 揺れが止まった後の「ため」
  const SPIN_MS = 2190; // ドラムロール(5周・だんだん減速)の時間。omikuji-spin と同じ値
  const LAND_MS = 300; // 正面で止まってポンと着地する時間
  // 最終ラップ(66.67%〜100%)の裏向き区間(そのラップの25%〜75%)の中央あたりで
  // こっそり箱→結果画像に差し替える。1460ms + 730ms*0.5 ≈ 1825ms
  const SWAP_DELAY_MS = 1800;
  const FIREWORK_LEAD_MS = 150; // 着地よりこれだけ早く花火を上げる(着地と同時に見せるため)
  const BUTTON_ENABLE_EXTRA_MS = 350; // 着地後、少し余韻を残してからボタンを戻す

  function pickRandom(excludeKey) {
    const pool = excludeKey ? KEYS.filter((k) => k !== excludeKey) : KEYS;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function triggerFireworks() {
    [fireworkLeft, fireworkRight].forEach((el) => {
      el.classList.remove("is-active");
      void el.offsetWidth; // reflow でアニメーションを再始動させる
      el.classList.add("is-active");
    });
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
  // 揺れの強まりに合わせた「カラカラ…」と、着地の瞬間の「ポン」を鳴らす。
  function scheduleDrawSounds() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!audioCtx) audioCtx = new AC();
      if (audioCtx.state === "suspended") audioCtx.resume();

      const now = audioCtx.currentTime;
      const shakeSeconds = SHAKE_MS / 1000;
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

      // 揺れ→ため→回転を経て、着地する瞬間に合わせて「ポン」
      const t0 =
        now + (SHAKE_MS + PAUSE_MS + SPIN_MS + LAND_MS * 0.55) / 1000;
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
    wrapper.classList.remove("is-shaking");
    img.classList.remove("is-spinning", "is-landing");
    redrawBtn.disabled = true;

    // 1) 箱の絵(添付画像そのもの)を表示し、左右にガタガタッと振る
    img.classList.remove("is-visible");
    img.src = BOX_SRC;
    requestAnimationFrame(() => {
      img.classList.add("is-visible");
      wrapper.classList.add("is-shaking");
    });

    window.setTimeout(() => {
      // 2) 完全に止まる。ここでは何も出さず、一呼吸だけ「ため」を作る
      wrapper.classList.remove("is-shaking");

      window.setTimeout(() => {
        // 3) 箱の絵のまま、だんだん減速しながら5周くるくる回転を始める
        requestAnimationFrame(() => {
          img.classList.add("is-spinning");
        });

        // 最終ラップの「裏を向いていて見えない」区間のうちに、こっそり結果へ差し替える
        window.setTimeout(() => {
          img.src = RESULTS[finalKey];
          currentKey = finalKey;
        }, SWAP_DELAY_MS);

        window.setTimeout(() => {
          // 4) 正面でピタッと止まり、少し拡大してポンと着地
          img.classList.remove("is-spinning");
          requestAnimationFrame(() => {
            img.classList.add("is-landing");
          });

          window.setTimeout(triggerFireworks, LAND_MS - FIREWORK_LEAD_MS);

          window.setTimeout(() => {
            redrawBtn.disabled = false;
          }, LAND_MS + BUTTON_ENABLE_EXTRA_MS);
        }, SPIN_MS);
      }, PAUSE_MS);
    }, SHAKE_MS);
  }

  runDraw(pickRandom());

  redrawBtn.addEventListener("click", () => {
    scheduleDrawSounds();
    runDraw(pickRandom(currentKey));
  });
})();
