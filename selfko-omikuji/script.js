(function () {
  const BOX_SRC = "assets/box.webp";
  const RESULTS = {
    daikichi: "assets/daikichi.webp",
    metsukichi: "assets/metsukichi.webp",
    "love-kichi": "assets/love-kichi.webp",
  };
  const KEYS = Object.keys(RESULTS);
  const STORAGE_KEY = "selfkoOmikujiDaily";

  [BOX_SRC, ...Object.values(RESULTS)].forEach((src) => {
    const preload = new Image();
    preload.src = src;
  });

  const wrapper = document.getElementById("omikuji");
  const img = document.getElementById("resultImg");
  const fireworkLeft = document.getElementById("fireworkLeft");
  const fireworkRight = document.getElementById("fireworkRight");

  // CSSの各アニメーション時間と合わせている
  const SHAKE_MS = 1700; // 箱がガタガタ揺れる時間
  const PAUSE_MS = 700; // 揺れが止まった後の「ため」
  const SPIN_MS = 2190; // ドラムロール(5周・だんだん減速)の時間。omikuji-spin と同じ値
  const LAND_MS = 300; // 正面で止まってポンと着地する時間
  // 最終ラップ(66.67%〜100%)の裏向き区間(そのラップの25%〜75%)の中央あたりで
  // こっそり箱→結果画像に差し替える。1460ms + 730ms*0.5 ≈ 1825ms
  const SWAP_DELAY_MS = 1800;
  const FIREWORK_LEAD_MS = 150; // 着地よりこれだけ早く花火を上げる(着地と同時に見せるため)

  function getJstDateString() {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  }

  function loadSavedResult() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (data && typeof data.date === "string" && KEYS.includes(data.key)) {
        return data;
      }
    } catch (e) {
      // localStorageが使えない環境では毎回抽選にフォールバックする
    }
    return null;
  }

  function saveResult(date, key) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ date, key }));
    } catch (e) {
      // 保存できなくても表示自体は問題なく続行する
    }
  }

  function pickRandom() {
    return KEYS[Math.floor(Math.random() * KEYS.length)];
  }

  function triggerFireworks() {
    [fireworkLeft, fireworkRight].forEach((el) => {
      el.classList.remove("is-active");
      void el.offsetWidth; // reflow でアニメーションを再始動させる
      el.classList.add("is-active");
    });
  }

  // すでに今日の結果が出ている場合は、演出なしでその画像だけを静かに表示する
  function showStatic(key) {
    img.src = RESULTS[key];
    requestAnimationFrame(() => {
      img.classList.add("is-visible");
    });
  }

  // まだ今日の結果が出ていない場合だけ、箱の揺れ→ため→回転→着地のフルの演出を行う
  function runDraw(finalKey) {
    img.classList.remove("is-visible");
    img.src = BOX_SRC;
    requestAnimationFrame(() => {
      img.classList.add("is-visible");
      wrapper.classList.add("is-shaking");
    });

    window.setTimeout(() => {
      wrapper.classList.remove("is-shaking");

      window.setTimeout(() => {
        requestAnimationFrame(() => {
          img.classList.add("is-spinning");
        });

        window.setTimeout(() => {
          img.src = RESULTS[finalKey];
        }, SWAP_DELAY_MS);

        window.setTimeout(() => {
          img.classList.remove("is-spinning");
          requestAnimationFrame(() => {
            img.classList.add("is-landing");
          });
          window.setTimeout(triggerFireworks, LAND_MS - FIREWORK_LEAD_MS);
        }, SPIN_MS);
      }, PAUSE_MS);
    }, SHAKE_MS);
  }

  const today = getJstDateString();
  const saved = loadSavedResult();

  if (saved && saved.date === today) {
    showStatic(saved.key);
  } else {
    const key = pickRandom();
    saveResult(today, key);
    runDraw(key);
  }
})();
