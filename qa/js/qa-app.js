/* ============================================================
   ここらぼ Q&A辞典（テスト版） — 表示ロジック
   データは js/qa-data.js（QA_GENRES / QA_DATA）を参照するのみ。
   ここから先はデータの中身を一切ハードコードしない。
   ============================================================ */
(function () {
  "use strict";

  const genreLabelMap = Object.fromEntries(QA_GENRES.map((g) => [g.id, g.label]));
  const genresWithData = new Set(QA_DATA.map((q) => q.genre));

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
    return `${item.askerName}${area}からの質問💌`;
  }

  function matchesQuery(item, q) {
    if (!q) return true;
    const haystack = [
      item.title,
      genreLabelMap[item.genre],
      item.teaser,
      item.askerName,
      item.askerArea,
      ...item.question,
    ].join(" ").toLowerCase();
    return haystack.includes(q.toLowerCase());
  }

  function getFilteredData() {
    return QA_DATA.filter((item) => {
      if (state.genre && item.genre !== state.genre) return false;
      if (!matchesQuery(item, state.query.trim())) return false;
      return true;
    });
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
    if (state.genre) parts.push(`「${genreLabelMap[state.genre]}」`);
    if (state.query.trim()) parts.push(`「${escapeHtml(state.query.trim())}」`);
    filterText.textContent = `${parts.join("×")} で絞り込み中`;
  }

  function renderCollapsed(item) {
    return `
      <p class="qa-card__tag">${escapeHtml(genreLabelMap[item.genre])}</p>
      <h2 class="qa-card__title">${escapeHtml(item.title)}</h2>
      <p class="qa-card__asker">${escapeHtml(askerLine(item))}</p>
      <p class="qa-card__teaser">${escapeHtml(item.teaser)}</p>
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
        ${item.question.map((line) => `<p class="qa-section__line">${escapeHtml(line)}</p>`).join("")}
      </div>

      <div class="qa-section qa-section--seruko">
        <p class="qa-section__label">👀 せるこ視点</p>
        <p class="qa-section__line">${escapeHtml(item.approval)}</p>
        <p class="qa-callout qa-callout--shift">
          <span class="qa-callout__icon" aria-hidden="true">✦</span>${escapeHtml(item.shift)}
        </p>
      </div>

      <div class="qa-section qa-section--points">
        <p class="qa-section__label">🚀 次元上昇ポイント</p>
        <ul class="qa-points">
          ${item.points.map((p) => `<li>${escapeHtml(p)}</li>`).join("")}
        </ul>
      </div>

      <div class="qa-callout qa-callout--action">
        <p class="qa-callout__label">👣 今日の一歩</p>
        <p class="qa-callout__line">${escapeHtml(item.action)}</p>
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
