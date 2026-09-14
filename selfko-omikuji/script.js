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

  const img = document.getElementById("resultImg");
  const redrawBtn = document.getElementById("redrawBtn");
  let currentKey = null;

  function pickRandom(excludeKey) {
    const pool = excludeKey ? KEYS.filter((k) => k !== excludeKey) : KEYS;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function showResult(key, fadeMs) {
    currentKey = key;
    img.classList.remove("is-visible");
    img.style.transitionDuration = fadeMs + "ms";
    window.setTimeout(() => {
      img.src = RESULTS[key];
      requestAnimationFrame(() => {
        img.classList.add("is-visible");
      });
    }, fadeMs === 0 ? 0 : 60);
  }

  showResult(pickRandom(), 700);

  redrawBtn.addEventListener("click", () => {
    showResult(pickRandom(currentKey), 400);
  });
})();
