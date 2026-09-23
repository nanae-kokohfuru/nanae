/* ============================================================
   ここらぼ Q&A辞典（テスト版） — 表示ロジック
   データは js/qa-data.js（QA_GENRES / QA_DATA）を参照するのみ。
   ここから先はデータの中身を一切ハードコードしない。
   ============================================================ */
(function () {
  "use strict";

  const genreLabelMap = Object.fromEntries(QA_GENRES.map((g) => [g.id, g.label]));
  const genresWithData = new Set(QA_DATA.map((q) => q.genre));

  // ななえ母ちゃんキャラクター画像（回答エリアに小さく登場）
  const CHARACTER_IMG_SRC = "../assets/nanae-mama.png";

  // 1枚の絵をQ&Aごとに少しずつ向き・傾きを変えて使い回すためのポーズ差分
  const CHARACTER_POSES = ["a", "b", "c", "d", "e"];
  function characterPoseOf(item) {
    const index = QA_DATA.indexOf(item);
    return CHARACTER_POSES[index % CHARACTER_POSES.length];
  }

  const state = {
    query: "",
    genre: null,   // 選択中のジャンルID（null = すべて）
    openId: null,  // 開いているカードのid（null = 全部閉じている）
  };

  const genreRow = document.getElementById("qaGenreRow");
  const listEl = document.getElementById("qaList");
  const emptyEl = document.getElementById("qaEmpty");
  const searchInput = document.getElementById("qaSearchInput");
  const filterBar = document.getElementById("qaFilterBar");
  const filterText = document.getElementById("qaFilterText");
  const resetBtn = document.getElementById("qaResetBtn");

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  function askerLine(item) {
    const area = item.askerArea ? `｜${item.askerArea}` : "";
    return `${item.askerName}からの質問${area}`;
  }

  // カード一覧の短い一言＝質問要約の最後の1行を使う
  function teaserOf(item) {
    return item.questionSummary[item.questionSummary.length - 1];
  }

  function matchesQuery(item, q) {
    if (!q) return true;
    const haystack = [
      item.title,
      genreLabelMap[item.genre],
      item.askerName,
      item.askerArea,
      ...item.questionSummary,
      ...(item.hookLine || []),
      ...item.letter,
      ...item.levelUp,
      ...item.action,
    ].join(" ").toLowerCase();
    return haystack.includes(q.toLowerCase());
  }

  function getFilteredData() {
    // QA_DATAへの追加順＝末尾が最新のため、新しい質問が先頭に来るよう反転して表示する
    return QA_DATA.filter((item) => {
      if (state.genre && item.genre !== state.genre) return false;
      if (!matchesQuery(item, state.query.trim())) return false;
      return true;
    }).reverse();
  }

  function renderGenres() {
    genreRow.innerHTML = QA_GENRES.map((g) => {
      const hasData = genresWithData.has(g.id);
      const active = state.genre === g.id;
      const classes = [
        "qa-chip",
        active ? "qa-chip--active" : "",
        hasData ? "" : "qa-chip--soon",
      ].filter(Boolean).join(" ");
      return `
        <button type="button" class="${classes}" data-genre="${g.id}" ${hasData ? "" : "disabled"}>
          <span class="qa-chip__label">${escapeHtml(g.label)}</span>
          ${hasData ? "" : '<span class="qa-chip__soon">準備中</span>'}
        </button>
      `;
    }).join("");
  }

  function renderFilterBar() {
    const hasFilter = Boolean(state.genre || state.query.trim());
    filterBar.hidden = !hasFilter;
    if (!hasFilter) return;
    const parts = [];
    if (state.genre) parts.push(genreLabelMap[state.genre]);
    if (state.query.trim()) parts.push(state.query.trim());
    filterText.textContent = `${parts.join("・")} で絞り込み中`;
  }

  function renderCollapsed(item) {
    return `
      <p class="qa-card__tag">${escapeHtml(genreLabelMap[item.genre])}</p>
      <h2 class="qa-card__title">${escapeHtml(item.title)}</h2>
      <p class="qa-card__asker">${escapeHtml(askerLine(item))}</p>
      <p class="qa-card__teaser">${escapeHtml(teaserOf(item))}</p>
      <button type="button" class="qa-card__cta" data-action="open" data-id="${item.id}">
        回答を見る <span aria-hidden="true">→</span>
      </button>
    `;
  }

  function renderExpanded(item) {
    return `
      <p class="qa-card__tag">${escapeHtml(genreLabelMap[item.genre])}</p>
      <h2 class="qa-card__title">${escapeHtml(item.title)}</h2>
      <p class="qa-card__asker">${escapeHtml(askerLine(item))}</p>

      <div class="qa-section qa-section--question">
        <p class="qa-section__label">こんなご相談</p>
        ${item.questionSummary.map((line) => `<p class="qa-section__line">${escapeHtml(line)}</p>`).join("")}
      </div>

      <div class="qa-answer">
        ${item.characterBubble ? `
        <div class="qa-character-row">
          <img class="qa-character-row__img qa-character-row__img--${characterPoseOf(item)}" src="${CHARACTER_IMG_SRC}" alt="ななえ母ちゃん">
          <p class="qa-bubble">${escapeHtml(item.characterBubble)}</p>
        </div>
        ` : `
        <div class="qa-card__teaser qa-hookline">
          ${item.hookLine.map((line) => `<p class="qa-section__line">${escapeHtml(line)}</p>`).join("")}
        </div>
        `}

        <div class="qa-section qa-section--letter">
          <p class="qa-section__label qa-section__label--letter">💌 チョッピーからのラブレター</p>
          ${item.letter.map((line) => `<p class="qa-section__line">${escapeHtml(line)}</p>`).join("")}
        </div>

        <div class="qa-section qa-section--levelup">
          <p class="qa-section__label">🚀 次元上昇ポイント</p>
          ${item.levelUp.map((line) => `<p class="qa-section__line">${escapeHtml(line)}</p>`).join("")}
        </div>

        <div class="qa-callout qa-callout--action">
          <p class="qa-callout__label">👣 今日の一歩</p>
          ${item.action.map((line) => `<p class="qa-callout__line">${escapeHtml(line)}</p>`).join("")}
        </div>
      </div>

      <button type="button" class="qa-card__close" data-action="close" data-id="${item.id}">
        閉じる ✕
      </button>
    `;
  }

  function renderList() {
    const data = getFilteredData();
    emptyEl.hidden = data.length > 0;

    listEl.innerHTML = data.map((item) => {
      const isOpen = state.openId === item.id;
      return `
        <article class="qa-card ${isOpen ? "qa-card--open" : ""}" data-id="${item.id}">
          ${isOpen ? renderExpanded(item) : renderCollapsed(item)}
        </article>
      `;
    }).join("");
  }

  function renderAll() {
    renderGenres();
    renderFilterBar();
    renderList();
  }

  genreRow.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-genre]");
    if (!btn || btn.disabled) return;
    const id = btn.dataset.genre;
    state.genre = state.genre === id ? null : id;
    renderAll();
  });

  listEl.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    const id = btn.dataset.id;
    if (btn.dataset.action === "open") {
      state.openId = id;
      renderList();
      requestAnimationFrame(() => {
        document.querySelector(`.qa-card[data-id="${id}"]`)
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } else if (btn.dataset.action === "close") {
      state.openId = null;
      renderList();
    }
  });

  let searchTimer = null;
  searchInput.addEventListener("input", (e) => {
    clearTimeout(searchTimer);
    const value = e.target.value;
    searchTimer = setTimeout(() => {
      state.query = value;
      state.openId = null;
      renderAll();
    }, 120);
  });

  resetBtn.addEventListener("click", () => {
    state.query = "";
    state.genre = null;
    state.openId = null;
    searchInput.value = "";
    renderAll();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  renderAll();
})();
