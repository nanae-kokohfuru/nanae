/* ============================================================
   ここらぼ 直伝！魂商品作成ミラクルキット
   商品をカタチにする10の扉
   バニラJS / localStorage永続化 / 外部AI API不使用
   ------------------------------------------------------------
   コード構成（役割ごと）:
     0. 定数・状態管理（data / storage）
     1. DOM ユーティリティ・UI部品（UI）
     2. 画面ルーター
     3. START / SELF 1
     4. 扉1〜10（UI）
     5. 完成画面・商品設計シート（export）
     6. チョッピー（nanaeAI）総評エンジン（analysis / analysisProvider）
     7. リセットモーダル・初期化
   ============================================================ */
(() => {
  "use strict";

  /* ---------------------------------------------------------
     0. 定数・状態管理
  --------------------------------------------------------- */
  const STORAGE_KEY = "soulProductMiracleKit_v1";
  const TOTAL_DOORS = 10;

  const defaultState = () => ({
    screen: "start", // start | self1 | door | complete
    doorIndex: 1,     // 1-10（screen === "door" のときのみ意味を持つ）

    self1_choice: "", // new | polish | grow

    // 扉1（せるこ・2）：ひとりを見つける
    d1_who: "",       // 昔の私 / 実際のお客様・過去のお客様 / 身近にいてなぜか放っておけない人
    d1_situation: "",
    d1_moment: "",
    d1_words: "",

    // 扉2（せるこ・3）：悩みの奥の壁
    d2_pain: "",
    d2_hidden: "",
    d2_wish: "",

    // 扉3（せるこ・4）：行き先決定
    d3_inner: "",
    d3_action: "",
    d3_reality: "",
    d3_voice: "",
    d3_scene: "",

    // 扉4（せるこ・5）：私が届ける理由
    d4_before: "",
    d4_turning: ["", "", ""],
    d4_turning_used: "",
    d4_journey: "",
    d4_after: "",
    d4_why: "",

    // 扉5（せるこ・6）：何を使って連れていく？
    d5_categories: [],      // 選択した大分類
    d5_freeform: {},        // { カテゴリ名: 自由記入テキスト }
    d5_primary: "",         // 表に出す主役（大分類名ひとつ）
    d5_supporting: [],      // 支えるチカラ（大分類名、最大2つ）

    // 扉6（せるこ・7）：どうやって届ける？
    d6_size: "",
    d6_place: "",
    d6_place_other: "",
    d6_during: [],
    d6_during_other: "",
    d6_between: [],
    d6_between_other: "",

    // 扉7：行き先までの道のり
    d7_steps: ["", "", "", ""],
    d7_count: "",
    d7_duration: "",

    // 扉8：価格を決める
    d8_time_checks: [],
    d8_time_hours: "",
    d8_min_price: "",
    d8_future_value: "",
    d8_price: "",

    // 扉9：名前をつける
    d9_check: [false, false, false],
    d9_name: "",

    // 扉10：買う理由
    d10_facts: [],
    d10_facts_detail: ["", "", ""],
    d10_passion: "",
    d10_promise_checks: [],
    d10_promise: "",

    sheetTemplate: "natural",
    photo: "",
    finalChecklist: [false, false, false, false, false, false, false],
  });

  let state = loadState();

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      const merged = Object.assign(defaultState(), parsed);
      // ネストしたデフォルト値を保護（古いデータからの復元時に壊れないように）
      merged.d4_turning = Array.isArray(parsed.d4_turning) ? parsed.d4_turning : ["", "", ""];
      merged.d7_steps = Array.isArray(parsed.d7_steps) ? parsed.d7_steps : ["", "", "", ""];
      merged.d9_check = Array.isArray(parsed.d9_check) ? parsed.d9_check : [false, false, false];
      merged.d10_facts_detail = Array.isArray(parsed.d10_facts_detail) ? parsed.d10_facts_detail : ["", "", ""];
      merged.finalChecklist = Array.isArray(parsed.finalChecklist) && parsed.finalChecklist.length === 7
        ? parsed.finalChecklist : [false, false, false, false, false, false, false];
      merged.d5_freeform = parsed.d5_freeform && typeof parsed.d5_freeform === "object" ? parsed.d5_freeform : {};
      return merged;
    } catch (e) {
      return defaultState();
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      showToast("保存容量が上限に近づいています。写真サイズを小さくしてみてね", 2600);
    }
  }

  /* ---------------------------------------------------------
     1. DOM ユーティリティ・UI部品
  --------------------------------------------------------- */
  const app = document.getElementById("app");
  const appHeader = document.getElementById("appHeader");
  const progressFill = document.getElementById("progressFill");
  const progressLabel = document.getElementById("progressLabel");
  const progressDoor = document.getElementById("progressDoor");

  function qs(sel, ctx) { return (ctx || document).querySelector(sel); }
  function qsa(sel, ctx) { return Array.from((ctx || document).querySelectorAll(sel)); }
  function esc(str) {
    return String(str || "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }
  function nl2br(str) { return esc(str).replace(/\n/g, "<br>"); }

  let toastTimer = null;
  function showToast(msg, duration) {
    const toast = document.getElementById("toast");
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), duration || 2400);
  }

  function scrollTop() { window.scrollTo({ top: 0, behavior: "smooth" }); }

  /* ---- マスコット（公式キャラクター実画像。改変せずそのまま使用） ---- */
  const MASCOT_IMG_SRC = "assets/mascot-trio.png";
  function mascotImg(className) {
    return `<img src="${MASCOT_IMG_SRC}" alt="ここらぼ公式キャラクター" class="${className}">`;
  }
  // 各扉の小さな装飾には、公式キャラクター実画像を使い回す（新規キャラクターは描かない）
  function doorMascot() {
    return `<div class="step-mascot">${mascotImg("step-mascot__img")}</div>`;
  }

  /* ---- 選択カード生成ヘルパー ---- */
  function choiceCard({ type, name, value, id, checked, label, sub, shape }) {
    return `
      <label class="choice-card" data-shape="${shape || "square"}" for="${id}">
        <input type="${type}" id="${id}" name="${name}" value="${esc(value)}" ${checked ? "checked" : ""}>
        <span class="choice-card__mark"></span>
        <span>
          <span class="choice-card__text">${esc(label)}</span>
          ${sub ? `<span class="choice-card__sub">${esc(sub)}</span>` : ""}
        </span>
      </label>`;
  }

  function primarySupportCard({ type, name, value, id, checked, label }) {
    return `
      <label class="primary-support-card" for="${id}">
        <input type="${type}" id="${id}" name="${name}" value="${esc(value)}" ${checked ? "checked" : ""}>
        <span class="primary-support-card__mark"></span>
        <span class="choice-card__text">${esc(label)}</span>
      </label>`;
  }

  /* ---- 回答の振り返りカード（前の扉の答えを自動表示・再入力させない） ---- */
  function recapCard(title, rows) {
    const filtered = rows.filter((r) => r.value);
    if (filtered.length === 0) return "";
    return `
      <div class="recap-card">
        <p class="recap-card__title">${esc(title)}</p>
        ${filtered.map((r) => `<p class="recap-card__row"><b>${esc(r.label)}</b>　${nl2br(r.value)}</p>`).join("")}
      </div>`;
  }

  /* ---- 価格の3桁区切り整形 ---- */
  function formatYen(n) {
    const num = Number(String(n).replace(/[^\d]/g, "")) || 0;
    return num.toLocaleString();
  }

  /* ---------------------------------------------------------
     2. 進捗（完成度メーター）
  --------------------------------------------------------- */
  const MILESTONE_TEXT = {
    10: "10％\nまずひとり見えた",
    30: "30％\n商品の骨が見えてきた",
    50: "50％\nおお、商品になってきた😍",
    70: "70％\nかなりつながってきた",
    90: "90％\n我が子まもなく誕生🤣",
    100: "100％\n魂商品 爆誕🎉",
  };

  function doorsRemainingLabel(remaining) {
    if (remaining <= 0) return "";
    if (remaining === 1) return "ラスト1個";
    if (remaining === 5) return "もう半分";
    return `あと${remaining}つ`;
  }

  function updateHeader() {
    if (state.screen === "door") {
      appHeader.hidden = false;
      const doneDoors = state.doorIndex - 1;
      const pct = doneDoors * 10;
      progressFill.style.width = pct + "%";
      progressLabel.textContent = `魂商品 完成度 ${pct}％`;
      const remaining = TOTAL_DOORS - doneDoors;
      progressDoor.textContent = `扉 ${state.doorIndex} / ${TOTAL_DOORS}　${doorsRemainingLabel(remaining)}`;
      progressFill.parentElement.setAttribute("aria-valuenow", pct);
    } else if (state.screen === "complete") {
      appHeader.hidden = false;
      progressFill.style.width = "100%";
      progressLabel.textContent = "魂商品 完成度 100％";
      progressDoor.textContent = "";
    } else {
      appHeader.hidden = true;
    }
  }

  /* ---------------------------------------------------------
     3. 画面ルーター
  --------------------------------------------------------- */
  function render() {
    updateHeader();
    if (state.screen === "start") { app.innerHTML = renderStart(); bindStart(); }
    else if (state.screen === "self1") { app.innerHTML = renderSelf1(); bindSelf1(); }
    else if (state.screen === "door") { app.innerHTML = renderDoor(state.doorIndex); bindDoor(state.doorIndex); }
    else { app.innerHTML = renderComplete(); bindComplete(); }
    scrollTop();
  }

  /* ---------------------------------------------------------
     4. START 画面
  --------------------------------------------------------- */
  function renderStart() {
    return `
    <div class="card hero">
      ${mascotImg("hero__mascot-img")}
      <p class="hero__brand">ここらぼ直伝！</p>
      <h1 class="hero__title">魂商品作成<br>ミラクルキット</h1>
      <span class="hero__subtitle">商品をカタチにする10の扉</span>
      <p class="hero__catch">チョッピー（nanaeAI）が<br>あなたのモヤモヤを<br>一緒に整理します</p>

      <div class="hero__desc">商品がまだない人は
ここからカタチに。

すでにある人は
もっとくっきり。

10個の問いに答えながら
あなたの商品に一本の芯を通していこう。</div>

      <div class="nav-row" style="margin-top:22px;">
        <button class="btn btn--primary" id="startBtn" type="button">はじめる</button>
      </div>
      ${hasAnyProgress() ? `<div class="restart-row"><button id="continueBtn" type="button">前回の続きから再開する →</button></div>` : ""}
    </div>`;
  }

  function hasAnyProgress() {
    return state.screen !== "start";
  }

  function bindStart() {
    qs("#startBtn").addEventListener("click", () => {
      state.screen = "self1";
      saveState();
      render();
    });
    const cont = qs("#continueBtn");
    if (cont) {
      cont.addEventListener("click", () => { render(); });
    }
  }

  /* ---------------------------------------------------------
     4-2. SELF 1（現在地確認・10の扉には含まない）
  --------------------------------------------------------- */
  const SELF1_OPTIONS = [
    { id: "new", label: "① まだ商品・サービスがない", sub: "ゼロから　誰に何を届けるかをカタチにする",
      msg: "いいね。\n何もないからこそ自由に作れる。\n\nまずは\nひとりを幸せにする商品から始めよう。",
      btn: "商品をカタチにする" },
    { id: "polish", label: "② 商品はある。もう一度　磨きたい", sub: "今の商品をシンプルに整理して　選ばれる理由をくっきりさせる",
      msg: "商品があるなら\n材料はもうある。\n\n足す前に\nいったん磨こう。\n\nぼやけているところが見えたら\n商品はもっと強くなる。",
      btn: "今の商品を磨いてみる" },
    { id: "grow", label: "③ 売れている商品を　もっと育てたい", sub: "実際のお客様の反応をもとに　今の商品を再点検してブラッシュアップする",
      msg: "売れたから完成\nではありません。\n\nお客様に届けた今だから\n見える答えがあります。\n\n売れた商品を\nさらに育てよう。",
      btn: "売れた商品をもう一度ひらく" },
  ];

  function renderSelf1() {
    const chosen = SELF1_OPTIONS.find((o) => o.id === state.self1_choice);
    return `
    <div class="card self1-card">
      ${doorMascot()}
      <span class="self1-eyebrow">SELF 1</span>
      <h2 class="step-title">まず　今の商品はどこにいる？</h2>
      <p class="step-desc">正解も優劣もありません。<br>今いる場所がわかれば、ここからやることが見えてきます。</p>
      <div class="choice-grid">
        ${SELF1_OPTIONS.map((o) => choiceCard({
          type: "radio", name: "self1", value: o.id, id: "self1_" + o.id, shape: "round",
          checked: state.self1_choice === o.id, label: o.label, sub: o.sub,
        })).join("")}
      </div>
      <div id="self1Note">${chosen ? `<div class="persona-note">${nl2br(chosen.msg)}</div>` : ""}</div>
      <p class="warn-msg" id="warnSelf1">まずは、今のあなたに近いものを選んでね。</p>
      <div class="nav-row" style="margin-top:22px;">
        <button class="btn btn--primary" id="self1NextBtn" type="button">${chosen ? esc(chosen.btn) : "扉をひらく"}</button>
      </div>
      <div class="restart-row"><button id="restartBtn" type="button">最初からやり直す</button></div>
    </div>`;
  }

  function bindSelf1() {
    qsa('input[name="self1"]').forEach((input) => {
      input.addEventListener("change", () => {
        state.self1_choice = input.value;
        saveState();
        render();
      });
    });
    qs("#self1NextBtn").addEventListener("click", () => {
      if (!state.self1_choice) { showWarn("warnSelf1", "まずは、今のあなたに近いものを選んでね。"); return; }
      state.screen = "door";
      state.doorIndex = 1;
      saveState();
      render();
    });
    qs("#restartBtn").addEventListener("click", openResetModal);
  }

  /* ---------------------------------------------------------
     5. 扉 共通シェル
  --------------------------------------------------------- */
  function doorShell({ n, badge, title, bodyHtml, warnId }) {
    return `
    <div class="card">
      ${doorMascot()}
      <p class="door-progress-mini">扉 ${n} / ${TOTAL_DOORS}</p>
      <span class="eyebrow">${esc(badge)}</span>
      <h2 class="step-title">${title}</h2>
      ${bodyHtml}
      ${warnId ? `<p class="warn-msg" id="${warnId}"></p>` : ""}
      <div class="nav-row">
        <button class="btn btn--ghost" id="backBtn" type="button">← 前へ</button>
        <button class="btn btn--primary" id="nextBtn" type="button">${n === TOTAL_DOORS ? "扉を完成させる" : "次へ →"}</button>
      </div>
      <div class="restart-row"><button id="restartBtn" type="button">最初からやり直す</button></div>
    </div>`;
  }

  function renderDoor(n) {
    const renderers = {
      1: renderDoor1, 2: renderDoor2, 3: renderDoor3, 4: renderDoor4, 5: renderDoor5,
      6: renderDoor6, 7: renderDoor7, 8: renderDoor8, 9: renderDoor9, 10: renderDoor10,
    };
    return renderers[n]();
  }
  function bindDoor(n) {
    qs("#backBtn").addEventListener("click", () => {
      if (n === 1) { state.screen = "self1"; }
      else { state.doorIndex = n - 1; }
      saveState();
      render();
    });
    qs("#restartBtn").addEventListener("click", openResetModal);
    const binders = {
      1: bindDoor1, 2: bindDoor2, 3: bindDoor3, 4: bindDoor4, 5: bindDoor5,
      6: bindDoor6, 7: bindDoor7, 8: bindDoor8, 9: bindDoor9, 10: bindDoor10,
    };
    binders[n]();
  }

  function goNextDoor(n) {
    const before = n - 1;
    const after = n;
    saveState();
    // 節目メッセージ
    if (MILESTONE_TEXT[after * 10] && after * 10 > before * 10) {
      showToast(MILESTONE_TEXT[after * 10].split("\n").slice(1).join(" "), 3200);
    }
    if (n === TOTAL_DOORS) {
      state.screen = "complete";
    } else {
      state.doorIndex = n + 1;
    }
    saveState();
    render();
  }

  function requireText(val, warnId, msg) {
    if (!val || !val.trim()) { showWarn(warnId, msg); return false; }
    qs("#" + warnId).classList.remove("show");
    return true;
  }
  function showWarn(id, msg) {
    const el = qs("#" + id);
    el.textContent = msg;
    el.classList.remove("show");
    void el.offsetWidth;
    el.classList.add("show");
  }

  /* ---------------------------------------------------------
     扉1（せるこ・2）｜推したい！助けたい！ひとりを見つける
  --------------------------------------------------------- */
  const D1_WHO_OPTIONS = ["昔の私", "実際のお客様・過去のお客様", "身近にいて　なぜか放っておけない人"];
  function renderDoor1() {
    const whoCards = D1_WHO_OPTIONS.map((label, i) => choiceCard({
      type: "radio", name: "d1_who", value: label, id: "d1_who_" + i, shape: "round",
      checked: state.d1_who === label, label,
    })).join("");
    return doorShell({
      n: 1, badge: "せるこ・2", title: "推したい！助けたい！ひとりを見つける",
      bodyHtml: `
        <p class="step-desc">商品は、みんなのためにつくろうとするとぼやけます。<br>まずは、たったひとり。<br><br>細かいペルソナ設定はまだいりません。<br>今は、その人の顔や毎日が少し浮かべばOK。</p>

        <p class="step-question">まず　誰を思い浮かべる？</p>
        <div class="choice-grid">${whoCards}</div>

        <div class="field" style="margin-top:22px;">
          <label class="field__label">その人は今どんな状況で、どんな毎日を送っていますか？</label>
          <textarea id="d1_situation" placeholder="例）30代。子育てをしながら起業を始めたばかり。やりたいことはあるけれど、何から発信すればいいかわからない。">${esc(state.d1_situation)}</textarea>
          <p class="hint">年齢・家族構成・年収・趣味などを大量に埋めなくてOK。今が見える一文で大丈夫。</p>
        </div>

        <div class="field">
          <label class="field__label">その人が今、いちばん困っている一場面は？</label>
          <textarea id="d1_moment" placeholder="例）Instagramを開くけれど、何を投稿したらいいかわからず、今日も閉じてしまう">${esc(state.d1_moment)}</textarea>
          <p class="hint">その場面を、写真1枚にするとしたら？</p>
        </div>

        <div class="field">
          <label class="field__label">そのとき、その人は何て言ってそう？</label>
          <textarea id="d1_words" placeholder="例）何から始めたらいいかわからない">${esc(state.d1_words)}</textarea>
        </div>
      `,
      warnId: "warn1",
    });
  }
  function bindDoor1() {
    qsa('input[name="d1_who"]').forEach((r) => { r.addEventListener("change", () => { state.d1_who = r.value; saveState(); }); });
    ["d1_situation", "d1_moment", "d1_words"].forEach((id) => {
      const el = qs("#" + id);
      el.addEventListener("input", () => { state[id] = el.value; saveState(); });
    });
    qs("#nextBtn").addEventListener("click", () => {
      if (!state.d1_who) { showWarn("warn1", "まず、誰を思い浮かべるか選んでみよう。"); return; }
      if (!requireText(state.d1_situation, "warn1", "その人の今の状況を書いてみよう。")) return;
      if (!requireText(state.d1_moment, "warn1", "困っている一場面を書いてみよう。")) return;
      showToast("お、見えてきた👀", 2200);
      goNextDoor(1);
    });
  }

  /* ---------------------------------------------------------
     扉2（せるこ・3）｜その悩みの奥の壁
  --------------------------------------------------------- */
  function renderDoor2() {
    const recap = recapCard("見つけた、ひとり", [
      { label: "その人", value: state.d1_situation },
      { label: "困っている場面", value: state.d1_moment },
      { label: "その人の言葉", value: state.d1_words },
    ]);
    return doorShell({
      n: 2, badge: "せるこ・3", title: "その悩みの奥の壁",
      bodyHtml: `
        <p class="step-desc">問題定義の根っこを見つけます</p>
        ${recap}
        <p class="step-desc">表面に見えている悩みだけで商品を作ると、少し浅くなります。<br>その奥にある怖さ・痛み・恥・思い込み。全部掘らなくて大丈夫。<br><br>今回は、この商品で越える一番大きな壁を、ひとつ見つけます。</p>

        <div class="field">
          <label class="field__label">この状態が続いたら、その人がいちばんつらいのは何？</label>
          <textarea id="d2_pain" placeholder="例）発信できない→このまま誰にも見つけてもらえず、仕事にならない気がして怖い">${esc(state.d2_pain)}</textarea>
        </div>

        <div class="field">
          <label class="field__label">もう一歩だけ深く見る（任意）</label>
          <textarea id="d2_hidden" placeholder="人にはちょっと言いにくいけれど、本人が心の中で怖がっていることは？">${esc(state.d2_hidden)}</textarea>
        </div>

        <div class="field">
          <label class="field__label">本当は、何を変えたいと思っている？</label>
          <textarea id="d2_wish" placeholder="ここでは、次の未来提示を完成させなくてよい。問題の根っこを一言でつかむ。">${esc(state.d2_wish)}</textarea>
        </div>
      `,
      warnId: "warn2",
    });
  }
  function bindDoor2() {
    ["d2_pain", "d2_hidden", "d2_wish"].forEach((id) => {
      const el = qs("#" + id);
      el.addEventListener("input", () => { state[id] = el.value; saveState(); });
    });
    qs("#nextBtn").addEventListener("click", () => {
      if (!requireText(state.d2_pain, "warn2", "いちばんつらいことを書いてみよう。")) return;
      if (!requireText(state.d2_wish, "warn2", "本当は何を変えたいか、書いてみよう。")) return;
      showToast("よし。救いたい場所が見えてきた。", 2200);
      goNextDoor(2);
    });
  }

  /* ---------------------------------------------------------
     扉3（せるこ・4）｜行き先決定
  --------------------------------------------------------- */
  function renderDoor3() {
    const recap = recapCard("越えたい壁", [
      { label: "いちばんつらいこと", value: state.d2_pain },
      { label: "本当に変えたいこと", value: state.d2_wish },
    ]);
    return doorShell({
      n: 3, badge: "せるこ・4", title: "行き先決定",
      bodyHtml: `
        <p class="step-desc">未来提示をくっきりさせます</p>
        ${recap}
        <p class="step-desc">この商品を受けたあと、その人の人生に何が起きていたら最高か。<br>「幸せになる」「自信がつく」「自分らしくなる」で止めない。<br><br>未来を4段階で、少しずつくっきりさせます。</p>

        <div class="field">
          <label class="field__label">① 内面はどう変わる？</label>
          <textarea id="d3_inner" placeholder="例）自信が持てる、自分を責めなくなる、発信が怖くなくなる">${esc(state.d3_inner)}</textarea>
        </div>
        <div class="field">
          <label class="field__label">② その結果、具体的に何ができるようになる？</label>
          <textarea id="d3_action" placeholder="例）自分の言葉でInstagramを投稿できる">${esc(state.d3_action)}</textarea>
        </div>
        <div class="field">
          <label class="field__label">③ その結果、現実や生活はどう変わる？</label>
          <textarea id="d3_reality" placeholder="例）問い合わせが届くようになり、月に数件の個別相談が入る">${esc(state.d3_reality)}</textarea>
        </div>
        <div class="field">
          <label class="field__label">④ 周りの人から、何て言われたら最高？</label>
          <textarea id="d3_voice" placeholder="例）最近、楽しそうだね">${esc(state.d3_voice)}</textarea>
        </div>
        <div class="field">
          <label class="field__label">行き先を写真1枚にすると？</label>
          <textarea id="d3_scene" placeholder="いつ・どこで・誰が・何をしていて・どんな言葉が聞こえる？を一文で">${esc(state.d3_scene)}</textarea>
        </div>
        <div class="note-box">未来は、物語にするともっと届く。<br>情報だけではなく、物語で伝える。<br>次の扉で、あなた自身の物語を整理します。</div>
      `,
      warnId: "warn3",
    });
  }
  function bindDoor3() {
    ["d3_inner", "d3_action", "d3_reality", "d3_voice", "d3_scene"].forEach((id) => {
      const el = qs("#" + id);
      el.addEventListener("input", () => { state[id] = el.value; saveState(); });
    });
    qs("#nextBtn").addEventListener("click", () => {
      if (!requireText(state.d3_inner, "warn3", "内面の変化を書いてみよう。")) return;
      if (!requireText(state.d3_action, "warn3", "できるようになることを書いてみよう。")) return;
      showToast("行き先、くっきりしてきた。", 2200);
      goNextDoor(3);
    });
  }

  /* ---------------------------------------------------------
     扉4（せるこ・5）｜私が届ける理由
  --------------------------------------------------------- */
  function renderDoor4() {
    return doorShell({
      n: 4, badge: "せるこ・5", title: "私が届ける理由",
      bodyHtml: `
        <p class="step-desc">なぜ？物語を整理</p>
        <p class="step-desc">なぜ、あなたがこの商品を届けるの？<br>資格や肩書きより先に、あなたが歩いてきた道を振り返ります。<br><br>あなたの経験は、4つに分けるとひとつの物語になります。</p>

        <div class="field">
          <label class="field__label">ビフォー｜あの頃の私は？</label>
          <textarea id="d4_before" placeholder="どんなことで悩み、何に困っていましたか？一場面が見えるように。">${esc(state.d4_before)}</textarea>
        </div>

        <p class="step-question">ターニングポイント｜私を変えた突破口は？（最大3つ）</p>
        <p class="hint" style="margin-top:0;margin-bottom:12px;">方法・スキルとの出会い（コーチング・アロマ・ヨガ・数秘・発信など）／考え方・学びとの出会い（心理学・自分を責めない考え方など）／人・出来事・経験（メンター・家族・離婚・病気・転職・お客様の一言など）。転機はひとつでなくてOK。</p>
        <div class="field"><input type="text" id="d4_turning_0" placeholder="① 突破口" value="${esc(state.d4_turning[0])}"></div>
        <div class="field"><input type="text" id="d4_turning_1" placeholder="② 突破口" value="${esc(state.d4_turning[1])}"></div>
        <div class="field"><input type="text" id="d4_turning_2" placeholder="③ 突破口" value="${esc(state.d4_turning[2])}"></div>

        <div class="field" id="turningUsedWrap" ${state.d4_turning.some((t) => t.trim()) ? "" : "hidden"}>
          <label class="field__label">この中で、今回の商品にも活かしたい突破口はどれ？</label>
          <div class="choice-grid" id="turningUsedGrid"></div>
        </div>

        <div class="field">
          <label class="field__label">ジャーニー｜そこから何をした？</label>
          <textarea id="d4_journey" placeholder="何を試した？何を学んだ？どんな失敗があった？何を続けた？成功談だけでなくてもいい。">${esc(state.d4_journey)}</textarea>
        </div>

        <div class="field">
          <label class="field__label">アフター｜そして今、どう変わった？</label>
          <textarea id="d4_after" placeholder="内面だけでなく、行動や現実がどう変わったか">${esc(state.d4_after)}</textarea>
        </div>

        <div class="field">
          <label class="field__label">だから私は、この人に届けたい</label>
          <textarea id="d4_why" placeholder="自由記入">${esc(state.d4_why)}</textarea>
        </div>

        <p class="big-quote">あなたの過去は、ただの昔話じゃない。<br>あなたが歩いてきた道は、誰かの地図になる。</p>
      `,
      warnId: "warn4",
    });
  }
  function bindDoor4() {
    function renderTurningUsed() {
      const wrap = qs("#turningUsedWrap");
      const grid = qs("#turningUsedGrid");
      const filled = state.d4_turning.map((t, i) => ({ t, i })).filter((x) => x.t.trim());
      wrap.hidden = filled.length === 0;
      grid.innerHTML = filled.map(({ t, i }) => choiceCard({
        type: "radio", name: "d4_turning_used", value: t, id: "turning_used_" + i, shape: "round",
        checked: state.d4_turning_used === t, label: t,
      })).join("");
      qsa('input[name="d4_turning_used"]', grid).forEach((r) => {
        r.addEventListener("change", () => { state.d4_turning_used = r.value; saveState(); });
      });
    }
    renderTurningUsed();

    qs("#d4_before").addEventListener("input", (e) => { state.d4_before = e.target.value; saveState(); });
    [0, 1, 2].forEach((i) => {
      qs(`#d4_turning_${i}`).addEventListener("input", (e) => {
        state.d4_turning[i] = e.target.value;
        saveState();
        renderTurningUsed();
      });
    });
    ["d4_journey", "d4_after", "d4_why"].forEach((id) => {
      const el = qs("#" + id);
      el.addEventListener("input", () => { state[id] = el.value; saveState(); });
    });

    qs("#nextBtn").addEventListener("click", () => {
      if (!requireText(state.d4_before, "warn4", "あの頃のあなたについて書いてみよう。")) return;
      if (!state.d4_turning.some((t) => t.trim())) { showWarn("warn4", "突破口を、ひとつだけでも書いてみよう。"); return; }
      if (!requireText(state.d4_why, "warn4", "だから届けたい、その理由を書いてみよう。")) return;
      goNextDoor(4);
    });
  }

  /* ---------------------------------------------------------
     扉5（せるこ・6）｜何を使って連れていく？
  --------------------------------------------------------- */
  const CATEGORY_OPTIONS = [
    { name: "対話・傾聴", example: "" },
    { name: "コーチング", example: "" },
    { name: "カウンセリング", example: "" },
    { name: "セラピー・心のケア", example: "" },
    { name: "心理学・自己理解・自己啓発", example: "心理学 自己肯定感 インナーチャイルド 感情整理" },
    { name: "潜在意識", example: "" },
    { name: "ジャーナリング・内省", example: "" },
    { name: "占術・スピリチュアル", example: "数秘 星読み チャクラ カード エネルギーワーク" },
    { name: "身体・健康・美容", example: "" },
    { name: "料理・食・発酵", example: "料理 パン 和菓子 麹 発酵 薬膳" },
    { name: "講師・教育", example: "" },
    { name: "診断・分析", example: "" },
    { name: "制作・クリエイティブ", example: "デザイン 写真 動画 ライティング Web イラスト" },
    { name: "ビジネス・ブランディング", example: "" },
    { name: "自分自身の経験", example: "" },
    { name: "その他", example: "" },
  ];

  function renderDoor5() {
    const cards = CATEGORY_OPTIONS.map((c, i) => choiceCard({
      type: "checkbox", name: "d5_cat", value: c.name, id: "d5_cat_" + i,
      checked: state.d5_categories.includes(c.name), label: c.name,
    })).join("");

    return doorShell({
      n: 5, badge: "せるこ・6", title: "何を使って連れていく？",
      bodyHtml: `
        <p class="step-desc">あなたができることは、全部捨てなくて大丈夫。必要なら全部使っていい。<br><br>でも、お客様から見える場所に全部並べると「結局、何の人？」になります🤣<br><br>今回決めるのは、何を捨てるかではなく、何を前に出すか。</p>

        <p class="step-question">① まず、持っているものを全部出す</p>
        <div class="choice-grid">${cards}</div>
        <div id="d5FreeformArea"></div>

        <div id="d5PrimaryArea" style="margin-top:26px;"></div>
        <div id="d5SupportArea" style="margin-top:22px;"></div>
        <div id="d5RestArea" style="margin-top:18px;"></div>
        <div id="d5ConceptArea" style="margin-top:20px;"></div>
      `,
      warnId: "warn5",
    });
  }

  function bindDoor5() {
    function renderFreeform() {
      const area = qs("#d5FreeformArea");
      area.innerHTML = state.d5_categories.map((catName) => {
        const cat = CATEGORY_OPTIONS.find((c) => c.name === catName);
        const ph = cat && cat.example ? `例）${cat.example}` : "自由に書いてね";
        return `
          <div class="field category-freeform">
            <label class="field__label">${esc(catName)}　の中で、具体的には？</label>
            <input type="text" data-freeform-cat="${esc(catName)}" placeholder="${esc(ph)}" value="${esc(state.d5_freeform[catName] || "")}">
          </div>`;
      }).join("");
      qsa("[data-freeform-cat]", area).forEach((input) => {
        input.addEventListener("input", () => {
          state.d5_freeform[input.dataset.freeformCat] = input.value;
          saveState();
        });
      });
    }

    function renderPrimarySupport() {
      const primaryArea = qs("#d5PrimaryArea");
      const supportArea = qs("#d5SupportArea");
      const restArea = qs("#d5RestArea");
      const conceptArea = qs("#d5ConceptArea");

      if (state.d5_categories.length === 0) {
        primaryArea.innerHTML = "";
        supportArea.innerHTML = "";
        restArea.innerHTML = "";
        conceptArea.innerHTML = "";
        return;
      }

      primaryArea.innerHTML = `
        <p class="step-question">② 表に出す主役</p>
        <p class="step-desc" style="margin-bottom:12px;">この未来へ連れていくために、一番力を発揮するものはどれ？（1つだけ）</p>
        <div class="primary-support-grid">
          ${state.d5_categories.map((c, i) => primarySupportCard({
            type: "radio", name: "d5_primary", value: c, id: "d5_primary_" + i,
            checked: state.d5_primary === c, label: c,
          })).join("")}
        </div>`;

      const supportCandidates = state.d5_categories.filter((c) => c !== state.d5_primary);
      supportArea.innerHTML = state.d5_primary ? `
        <p class="step-question">③ 支えるチカラ（あと2つまで）</p>
        <div class="primary-support-grid">
          ${supportCandidates.map((c, i) => primarySupportCard({
            type: "checkbox", name: "d5_support", value: c, id: "d5_support_" + i,
            checked: state.d5_supporting.includes(c), label: c,
          })).join("")}
        </div>` : "";

      const rest = state.d5_categories.filter((c) => c !== state.d5_primary && !state.d5_supporting.includes(c));
      restArea.innerHTML = rest.length ? `
        <div class="note-box">
          <p style="margin-bottom:8px;">選ばなかったものも、全部あなたの財産。<br>必要なときに、裏側で使えばいい。</p>
          <div class="sheet__tags">${rest.map((r) => `<span class="sheet__tag">${esc(r)}</span>`).join("")}</div>
          <p class="big-quote" style="margin-top:16px; font-size:16px;">裏で総力戦。<br>表はシンプル。</p>
        </div>` : "";

      conceptArea.innerHTML = state.d5_primary ? buildConceptFragmentHtml() : "";
    }

    function bindPrimarySupport() {
      qsa('input[name="d5_primary"]').forEach((r) => {
        r.addEventListener("change", () => {
          state.d5_primary = r.value;
          state.d5_supporting = state.d5_supporting.filter((s) => s !== r.value);
          saveState();
          renderPrimarySupport();
          bindPrimarySupport();
        });
      });
      qsa('input[name="d5_support"]').forEach((cb) => {
        cb.addEventListener("change", () => {
          const boxes = qsa('input[name="d5_support"]');
          const checked = boxes.filter((b) => b.checked);
          if (checked.length > 2) {
            cb.checked = false;
            showToast("支えるチカラは、あと2つまで選んでね");
            return;
          }
          state.d5_supporting = checked.map((b) => b.value);
          saveState();
          renderPrimarySupport();
          bindPrimarySupport();
        });
      });
    }

    qsa('input[name="d5_cat"]').forEach((cb) => {
      cb.addEventListener("change", () => {
        state.d5_categories = qsa('input[name="d5_cat"]').filter((b) => b.checked).map((b) => b.value);
        if (state.d5_primary && !state.d5_categories.includes(state.d5_primary)) state.d5_primary = "";
        state.d5_supporting = state.d5_supporting.filter((s) => state.d5_categories.includes(s));
        saveState();
        renderFreeform();
        renderPrimarySupport();
        bindPrimarySupport();
      });
    });

    renderFreeform();
    renderPrimarySupport();
    bindPrimarySupport();

    qs("#nextBtn").addEventListener("click", () => {
      if (state.d5_categories.length === 0) { showWarn("warn5", "使うものを、最低ひとつ選んでみよう。"); return; }
      if (!state.d5_primary) { showWarn("warn5", "表に出す主役を、ひとつ選んでみよう。"); return; }
      goNextDoor(5);
    });
  }

  function buildConceptFragmentHtml() {
    const who = state.d1_situation || state.d1_moment || "この人";
    const wall = state.d2_pain || state.d2_wish || "その壁";
    const future = state.d3_action || state.d3_scene || "その未来";
    const story = state.d4_turning_used || state.d4_why || "私の経験";
    const support = state.d5_supporting.length ? state.d5_supporting.join("と") : "";
    const text = `私は
${who}の
「${wall}」という壁を
「${state.d5_primary}」を主役に${support ? `\n「${support}」も使いながら` : ""}
「${future}」という未来へ連れていく。

その背景には
「${story}」という私の物語がある。`;
    return `
      <div class="concept-fragment">
        <p class="concept-fragment__label">⑤ コンセプトのかけら</p>
        <p class="concept-fragment__text">${nl2br(text)}</p>
      </div>`;
  }

  /* ---------------------------------------------------------
     扉6（せるこ・7）｜どうやって届ける？
  --------------------------------------------------------- */
  const D6_SIZE_OPTIONS = [
    { v: "1対1", sub: "ひとりに合わせて、じっくり伴走できる" },
    { v: "2〜5名ほどの少人数", sub: "一人ひとりと距離が近く、対話や個別フォローもしやすい" },
    { v: "6〜10名ほどのグループ", sub: "仲間との学びや気づきも活かしながら、一緒に進められる" },
    { v: "10名以上", sub: "多くの人へ一度に知識や体験を届けられる" },
    { v: "まだわからない", sub: "" },
  ];
  const D6_PLACE_OPTIONS = ["Zoomなどオンライン", "リアルで直接会う", "オンライン＋リアル両方", "その他"];
  const D6_DURING_OPTIONS = [
    { v: "話を聞く・対話する", sub: "悩みや気持ち、今の状況を整理する" },
    { v: "知識や考え方を伝える", sub: "必要な知識、方法、考え方をわかりやすく教える" },
    { v: "質問しながら答えを引き出す", sub: "本人の気づきや答えを一緒に見つける" },
    { v: "一緒にワークする", sub: "書く、考える、整理するなどその場でアウトプットする" },
    { v: "実際にやって見せる・一緒に練習する", sub: "料理、ヨガ、撮影、デザイン、話し方など" },
    { v: "診断・分析して伝える", sub: "今の状態、特徴、改善ポイントなどを伝える" },
    { v: "その他", sub: "" },
  ];
  const D6_BETWEEN_OPTIONS = [
    { v: "質問できるようにする", sub: "LINE、チャットなど" },
    { v: "途中経過を確認する", sub: "できたこと、困ったことなどを報告してもらう" },
    { v: "家でやる小さな課題を出す", sub: "" },
    { v: "振り返りをしてもらう", sub: "" },
    { v: "見返せる資料を渡す", sub: "テキスト、チェックリスト、動画など" },
    { v: "特になし", sub: "会っている時間だけで完結" },
    { v: "その他", sub: "" },
  ];

  function renderDoor6() {
    const sizeCards = D6_SIZE_OPTIONS.map((o, i) => choiceCard({
      type: "radio", name: "d6_size", value: o.v, id: "d6_size_" + i, shape: "round",
      checked: state.d6_size === o.v, label: o.v, sub: o.sub,
    })).join("");
    const placeCards = D6_PLACE_OPTIONS.map((v, i) => choiceCard({
      type: "radio", name: "d6_place", value: v, id: "d6_place_" + i, shape: "round",
      checked: state.d6_place === v, label: v,
    })).join("");
    const duringCards = D6_DURING_OPTIONS.map((o, i) => choiceCard({
      type: "checkbox", name: "d6_during", value: o.v, id: "d6_during_" + i,
      checked: state.d6_during.includes(o.v), label: o.v, sub: o.sub,
    })).join("");
    const betweenCards = D6_BETWEEN_OPTIONS.map((o, i) => choiceCard({
      type: "checkbox", name: "d6_between", value: o.v, id: "d6_between_" + i,
      checked: state.d6_between.includes(o.v), label: o.v, sub: o.sub,
    })).join("");

    return doorShell({
      n: 6, badge: "せるこ・7", title: "どうやって届ける？",
      bodyHtml: `
        <p class="step-desc">商品を受け取る場面をつくろう</p>
        <p class="step-desc">ここまでで、誰に・どんな悩みを・どんな未来へ・何を使って届けるかが見えてきました。<br>次は、お客様が実際にどんな形でこの商品を受けるのかを決めます。</p>

        <p class="step-question">① 何人くらいに届ける？</p>
        <div class="choice-grid">${sizeCards}</div>
        <div class="note-box">講座・セッション・レッスンという名前は、まだ決めなくてOK。<br>1人でも講座はできます。10人でもグループセッションはできます。<br><br>大切なのは呼び方ではなく、誰に・どんな関わり方で・行き先まで届けるか。<br><br>はじめて商品を届ける人は、最初から大人数にしなくても大丈夫。1対1や少人数だと、お客様がどこで困るのか・何を喜ぶのかがよく見えます。まず近くで届ける→磨く→人数を増やす。商品を育ててから大きくしても遅くありません。</div>

        <p class="step-question" style="margin-top:26px;">② どこで届ける？</p>
        <div class="choice-grid">${placeCards}</div>
        <div class="inline-input" id="d6PlaceOtherWrap" ${state.d6_place === "その他" ? "" : "hidden"}>
          <input type="text" id="d6_place_other" placeholder="どこで届けるか入力" value="${esc(state.d6_place_other)}">
        </div>

        <p class="step-question" style="margin-top:26px;">③ 一緒にいる時間に何をする？</p>
        <p class="step-desc">お客様が未来へ進むために、あなたと一緒にやることを選びます。必要なものだけでOK。</p>
        <div class="choice-grid">${duringCards}</div>
        <div class="inline-input" id="d6DuringOtherWrap" ${state.d6_during.includes("その他") ? "" : "hidden"}>
          <input type="text" id="d6_during_other" placeholder="その他の内容を入力" value="${esc(state.d6_during_other)}">
        </div>

        <p class="step-question" style="margin-top:26px;">④ 会っていない時間に何を支える？</p>
        <p class="step-desc">セッションやレッスンの間にも実践してほしい場合は、必要なものだけ追加します。</p>
        <div class="choice-grid">${betweenCards}</div>
        <div class="inline-input" id="d6BetweenOtherWrap" ${state.d6_between.includes("その他") ? "" : "hidden"}>
          <input type="text" id="d6_between_other" placeholder="その他の内容を入力" value="${esc(state.d6_between_other)}">
        </div>

        <div class="note-box">盛りすぎ注意。<br>資料も動画もLINEも宿題も、全部つけなくて大丈夫。<br><br>豪華に見えるかではなく、お客様が行き先にたどり着くために本当に必要か？　それだけで選ぼう。</div>
      `,
      warnId: "warn6",
    });
  }
  function bindDoor6() {
    qsa('input[name="d6_size"]').forEach((r) => { r.addEventListener("change", () => { state.d6_size = r.value; saveState(); }); });
    qsa('input[name="d6_place"]').forEach((r) => {
      r.addEventListener("change", () => {
        state.d6_place = r.value;
        qs("#d6PlaceOtherWrap").hidden = r.value !== "その他";
        saveState();
      });
    });
    qs("#d6_place_other").addEventListener("input", (e) => { state.d6_place_other = e.target.value; saveState(); });

    qsa('input[name="d6_during"]').forEach((cb) => {
      cb.addEventListener("change", () => {
        state.d6_during = qsa('input[name="d6_during"]').filter((b) => b.checked).map((b) => b.value);
        qs("#d6DuringOtherWrap").hidden = !state.d6_during.includes("その他");
        saveState();
      });
    });
    qs("#d6_during_other").addEventListener("input", (e) => { state.d6_during_other = e.target.value; saveState(); });

    qsa('input[name="d6_between"]').forEach((cb) => {
      cb.addEventListener("change", () => {
        state.d6_between = qsa('input[name="d6_between"]').filter((b) => b.checked).map((b) => b.value);
        qs("#d6BetweenOtherWrap").hidden = !state.d6_between.includes("その他");
        saveState();
      });
    });
    qs("#d6_between_other").addEventListener("input", (e) => { state.d6_between_other = e.target.value; saveState(); });

    qs("#nextBtn").addEventListener("click", () => {
      if (!state.d6_size) { showWarn("warn6", "何人くらいに届けるか選んでみよう。"); return; }
      if (!state.d6_place) { showWarn("warn6", "どこで届けるか選んでみよう。"); return; }
      goNextDoor(6);
    });
  }

  /* ---------------------------------------------------------
     扉7｜行き先までの道のりをつくる
  --------------------------------------------------------- */
  const D7_COUNT_OPTIONS = ["1回", "2回", "3回", "4回", "5回以上", "まだわからない"];
  const D7_DURATION_OPTIONS = ["30分", "45分", "60分", "90分", "120分", "その他", "まだ決めなくてOK"];

  function renderDoor7() {
    const recap = recapCard("ここまでの道しるべ", [
      { label: "現在地", value: state.d1_moment },
      { label: "問題の根っこ", value: state.d2_pain },
      { label: "行き先", value: state.d3_action },
      { label: "届け方", value: [state.d6_size, state.d6_place].filter(Boolean).join(" / ") },
    ]);
    const countCards = D7_COUNT_OPTIONS.map((v, i) => choiceCard({
      type: "radio", name: "d7_count", value: v, id: "d7_count_" + i, shape: "round",
      checked: state.d7_count === v, label: v,
    })).join("");
    const durationCards = D7_DURATION_OPTIONS.map((v, i) => choiceCard({
      type: "radio", name: "d7_duration", value: v, id: "d7_dur_" + i, shape: "round",
      checked: state.d7_duration === v, label: v,
    })).join("");

    return doorShell({
      n: 7, badge: "扉7", title: "行き先までの道のりをつくる",
      bodyHtml: `
        ${recap}
        <p class="step-desc">その未来まで行くために、何を知る？　何をやる？　何ができるようになる？<br>必要な順番を、小さく分けてみます。</p>

        <p class="step-question">行き先までに必要なことを、最大4つ</p>
        <div class="field"><input type="text" id="d7_step_0" placeholder="① まず" value="${esc(state.d7_steps[0])}"></div>
        <div class="field"><input type="text" id="d7_step_1" placeholder="② 次に" value="${esc(state.d7_steps[1])}"></div>
        <div class="field"><input type="text" id="d7_step_2" placeholder="③ その次に" value="${esc(state.d7_steps[2])}"></div>
        <div class="field"><input type="text" id="d7_step_3" placeholder="④ 必要なら" value="${esc(state.d7_steps[3])}"></div>
        <p class="hint">全部埋めなくてOK。</p>

        <p class="step-question" style="margin-top:26px;">では、何回くらい必要そう？</p>
        <div class="choice-grid">${countCards}</div>
        <div class="note-box">書いた数＝回数ではありません。1回でいくつか進んでもOK。<br>実践する時間が必要なら、次回まで間を空けてもOK。<br><br>行き先まで、本当に必要な回数だけ。豪華に見せるために増やさない🤣</div>

        <p class="step-question" style="margin-top:26px;">1回あたりの時間は？（任意）</p>
        <div class="choice-grid">${durationCards}</div>
      `,
      warnId: "warn7",
    });
  }
  function bindDoor7() {
    [0, 1, 2, 3].forEach((i) => {
      qs(`#d7_step_${i}`).addEventListener("input", (e) => { state.d7_steps[i] = e.target.value; saveState(); });
    });
    qsa('input[name="d7_count"]').forEach((r) => { r.addEventListener("change", () => { state.d7_count = r.value; saveState(); }); });
    qsa('input[name="d7_duration"]').forEach((r) => { r.addEventListener("change", () => { state.d7_duration = r.value; saveState(); }); });

    qs("#nextBtn").addEventListener("click", () => {
      if (!state.d7_steps.some((s) => s.trim())) { showWarn("warn7", "行き先までの道のりを、ひとつだけでも書いてみよう。"); return; }
      if (!state.d7_count) { showWarn("warn7", "何回くらい必要そうか、選んでみよう。"); return; }
      goNextDoor(7);
    });
  }

  /* ---------------------------------------------------------
     扉8｜価格を決める
  --------------------------------------------------------- */
  const D8_TIME_OPTIONS = [
    "セッション・講義をする時間", "事前に考える・準備する時間", "資料や教材をつくる時間",
    "質問やフォローをする時間", "振り返り・添削・確認をする時間", "移動・場所の準備", "その他",
  ];
  const D8_FUTURE_OPTIONS = [
    { v: "small", label: "小さな一歩をつくる商品" },
    { v: "daily", label: "日常にわかりやすい変化をつくる商品" },
    { v: "big", label: "長年の悩みを大きく変える商品" },
  ];
  const PRICE_PRESETS = [3000, 5000, 10000, 15000, 20000, 30000, 50000, 75000, 100000, 150000, 200000, 300000, 500000];

  function renderDoor8() {
    const timeCards = D8_TIME_OPTIONS.map((v, i) => choiceCard({
      type: "checkbox", name: "d8_time", value: v, id: "d8_time_" + i,
      checked: state.d8_time_checks.includes(v), label: v,
    })).join("");
    const futureCards = D8_FUTURE_OPTIONS.map((o) => choiceCard({
      type: "radio", name: "d8_future", value: o.v, id: "d8_future_" + o.v, shape: "round",
      checked: state.d8_future_value === o.v, label: o.label,
    })).join("");
    const priceNum = Number(state.d8_price) || 0;

    return doorShell({
      n: 8, badge: "扉8", title: "この商品、いくらで届ける？",
      bodyHtml: `
        <p class="step-desc">いきなり金額を決めなくて大丈夫。<br>価格を考えるときは、まず3つの価値から見てみよう。</p>

        <p class="step-question">① あなたが使う時間と労力</p>
        <p class="step-desc">お客様と直接話す時間だけが仕事ではありません。</p>
        <div class="choice-grid">${timeCards}</div>
        <div class="field" style="margin-top:16px;">
          <label class="field__label">全部合わせると、ひとりのお客様にどのくらい時間を使いそう？</label>
          <input type="text" id="d8_time_hours" placeholder="約　時間" value="${esc(state.d8_time_hours)}">
        </div>
        <div class="field">
          <label class="field__label">その時間と労力に対して、正直これくらいはいただきたい金額</label>
          <input type="text" id="d8_min_price" placeholder="¥" value="${esc(state.d8_min_price)}">
        </div>

        <p class="step-question" style="margin-top:26px;">② あなたが渡している知識・経験・技術</p>
        <div class="note-box">あなたがそこまで来るために、学んできたこと・資格・専門技術・お金をかけて身につけたこと・何年も積み重ねた経験・失敗してわかったこと・お客様を支えてきた実績があります。<br><br>あなたが何年もかけて得たものを、お客様はショートカットして受け取れる。その価値も、忘れないでね。</div>

        <p class="step-question" style="margin-top:26px;">③ お客様が手にする未来の価値</p>
        <div class="choice-grid">${futureCards}</div>

        <p class="step-question" style="margin-top:26px;">今回の価格を決めよう</p>
        <p class="step-desc">安いから売れる、ではありません。高ければ価値がある、でもありません。<br>今のあなたが「この内容なら、この価格で喜んで届けたい」と思える金額を、まず決めよう。</p>
        <div class="price-preset-grid" id="pricePresetGrid">
          ${PRICE_PRESETS.map((p) => `<button type="button" class="price-preset-btn${priceNum === p ? " is-active" : ""}" data-price="${p}">${p.toLocaleString()}円</button>`).join("")}
        </div>
        <div class="price-custom-row">
          <input type="text" inputmode="numeric" id="d8_price" placeholder="自分で金額を入力">
          <span class="hint" style="margin:0;">円</span>
        </div>
        <div class="sheet__price" style="margin-top:14px;">
          <div class="sheet__price-label">今回の価格</div>
          <div class="sheet__price-value" id="pricePreview">¥${priceNum.toLocaleString()}</div>
        </div>
        <div class="note-box">これは最終価格じゃなくていい。<br>まず届ける。お客様の反応を見る。商品を磨く。実績が増える。<br>そのたびに、価格を見直していい。</div>
      `,
      warnId: "warn8",
    });
  }
  function bindDoor8() {
    qsa('input[name="d8_time"]').forEach((cb) => {
      cb.addEventListener("change", () => { state.d8_time_checks = qsa('input[name="d8_time"]').filter((b) => b.checked).map((b) => b.value); saveState(); });
    });
    qs("#d8_time_hours").addEventListener("input", (e) => { state.d8_time_hours = e.target.value; saveState(); });
    qs("#d8_min_price").addEventListener("input", (e) => { state.d8_min_price = e.target.value; saveState(); });
    qsa('input[name="d8_future"]').forEach((r) => { r.addEventListener("change", () => { state.d8_future_value = r.value; saveState(); }); });

    const priceInput = qs("#d8_price");
    priceInput.value = state.d8_price ? formatYen(state.d8_price) : "";

    function setPrice(n) {
      state.d8_price = String(n);
      priceInput.value = formatYen(n);
      qs("#pricePreview").textContent = "¥" + formatYen(n);
      qsa(".price-preset-btn").forEach((btn) => btn.classList.toggle("is-active", Number(btn.dataset.price) === n));
      saveState();
    }

    qsa(".price-preset-btn").forEach((btn) => {
      btn.addEventListener("click", () => setPrice(Number(btn.dataset.price)));
    });
    priceInput.addEventListener("input", () => {
      const digits = priceInput.value.replace(/[^\d]/g, "");
      const n = Number(digits) || 0;
      priceInput.value = digits ? formatYen(digits) : "";
      state.d8_price = digits;
      qs("#pricePreview").textContent = "¥" + n.toLocaleString();
      qsa(".price-preset-btn").forEach((b) => b.classList.toggle("is-active", Number(b.dataset.price) === n));
      saveState();
    });

    qs("#nextBtn").addEventListener("click", () => {
      if (!state.d8_price || Number(state.d8_price) <= 0) { showWarn("warn8", "価格を決めてみよう（プリセットか自由入力で）。"); return; }
      goNextDoor(8);
    });
  }

  /* ---------------------------------------------------------
     扉9｜この魂商品に名前をつける
  --------------------------------------------------------- */
  const D9_CHECK_LABELS = [
    "初めて見た人でも何の商品かなんとなくわかる",
    "お客様が見て「私のことかも」と思える",
    "行き先や変化が想像できる",
  ];
  function renderDoor9() {
    return doorShell({
      n: 9, badge: "扉9", title: "我が子に、最初の名前を。",
      bodyHtml: `
        <p class="step-desc">ここまで一生懸命考えてきた商品。誰を助けたいか、どんな壁を越えるか、どんな未来へ連れていくか、なぜ私が届けるのか、何を使って、どう届けるのか。<br><br>少しずつ、ひとつの商品になってきました。<br>ここで一度、この我が子に名前をつけてみよう。</p>

        <div class="note-box">名前は、かっこよさより伝わりやすさ。<br><br>ありがちなのが、謎の英語・聞いたことのない造語・自分だけ気分が上がる自己満ポエムタイトル🤣<br><br>でも、お客様が見た瞬間に「何のサービス？」「私に関係ある？」「どうなれるの？」がわからなければもったいない。<br><br>誰のための商品か・何が変わるのか・どんな行き先へ行けるのか。このどれかが伝わる名前を考えてみよう。</div>

        <p class="step-question">名前をつける前の3チェック</p>
        <div class="choice-grid">
          ${D9_CHECK_LABELS.map((label, i) => `
            <label class="checklist-item"><input type="checkbox" data-d9check="${i}" ${state.d9_check[i] ? "checked" : ""}><span>${esc(label)}</span></label>`).join("")}
        </div>

        <div class="field" style="margin-top:20px;">
          <label class="field__label">今、この商品につけるなら、どんな名前？</label>
          <input type="text" id="d9_name" placeholder="例）朝のイライラが手放せる、親子の言葉がけレッスン" value="${esc(state.d9_name)}">
        </div>
        <p class="hint">仮タイトルでOK。届けているうちに、もっといい名前が降りてきたら変えていい。今は、まず呼べる名前をつけよう。</p>
        <p class="big-quote" style="font-size:17px;">あなたが好きな名前　×　お客様に伝わる名前<br>その真ん中を探そう。</p>
      `,
      warnId: "warn9",
    });
  }
  function bindDoor9() {
    qsa("[data-d9check]").forEach((cb) => {
      cb.addEventListener("change", () => { state.d9_check[Number(cb.dataset.d9check)] = cb.checked; saveState(); });
    });
    const input = qs("#d9_name");
    input.addEventListener("input", () => { state.d9_name = input.value; saveState(); });
    qs("#nextBtn").addEventListener("click", () => {
      if (!requireText(state.d9_name, "warn9", "仮の名前でいいので、つけてみよう。")) return;
      goNextDoor(9);
    });
  }

  /* ---------------------------------------------------------
     扉10｜あなたから買う理由を見つける
  --------------------------------------------------------- */
  const D10_FACT_OPTIONS = [
    "資格・専門知識", "学んできたこと", "実務・活動年数", "お客様を支援した人数",
    "販売・提供した実績", "お客様の成果・変化", "自分自身の経験・ビフォーアフター",
    "仕事・生活・子育てなどの実体験", "その他",
  ];
  const D10_PROMISE_OPTIONS = [
    "丁寧に話を聞く", "一人ひとりに向き合う", "自分が経験したことを惜しみなく伝える",
    "一緒に実践する", "最後まで誠実に届ける", "その他",
  ];
  function renderDoor10() {
    const factCards = D10_FACT_OPTIONS.map((v, i) => choiceCard({
      type: "checkbox", name: "d10_fact", value: v, id: "d10_fact_" + i,
      checked: state.d10_facts.includes(v), label: v,
    })).join("");
    const promiseCards = D10_PROMISE_OPTIONS.map((v, i) => choiceCard({
      type: "checkbox", name: "d10_promise_cb", value: v, id: "d10_promise_cb_" + i,
      checked: state.d10_promise_checks.includes(v), label: v,
    })).join("");
    return doorShell({
      n: 10, badge: "扉10", title: "あなたから買う理由を見つける",
      bodyHtml: `
        <p class="step-desc">この商品を支えている、あなたの宝物</p>
        <p class="step-desc">ここまでで、あなたの魂商品がカタチになりました。最後にもうひとつ。<br><br>同じような商品やサービスがあったとしても、あなたから受けたい理由はどこにある？<br><br>ここでは、商品を支えている事実・経験・情熱を集めます。資格の数を競うページではありません。お客様が安心して「あなたにお願いしたい」と思える材料を見つけます。</p>

        <p class="step-question">① 支える事実（最大3つ）</p>
        <div class="choice-grid">${factCards}</div>
        <div class="field" style="margin-top:14px;">
          <input type="text" id="d10_fact_detail_0" placeholder="① 関係する事実" value="${esc(state.d10_facts_detail[0])}">
        </div>
        <div class="field"><input type="text" id="d10_fact_detail_1" placeholder="② 関係する事実" value="${esc(state.d10_facts_detail[1])}"></div>
        <div class="field"><input type="text" id="d10_fact_detail_2" placeholder="③ 関係する事実" value="${esc(state.d10_facts_detail[2])}"></div>

        <div class="field" style="margin-top:22px;">
          <label class="field__label">② 情熱｜それでも、なぜ届けたい？</label>
          <textarea id="d10_passion" placeholder="例）昔の私みたいな人に、同じ遠回りをしてほしくない">${esc(state.d10_passion)}</textarea>
        </div>

        <p class="step-question" style="margin-top:22px;">③ お客様に約束できること</p>
        <p class="step-desc">実績がまだ少なくても大丈夫。今のあなたが、お客様に約束できることは何？</p>
        <div class="choice-grid">${promiseCards}</div>
        <div class="field" style="margin-top:14px;">
          <label class="field__label">私がお客様に約束すること</label>
          <textarea id="d10_promise" placeholder="自由記入">${esc(state.d10_promise)}</textarea>
        </div>

        <p class="big-quote">あなたの商品を選ぶ理由は、資格ひとつ、実績ひとつではありません。<br>歩いてきた道。身につけた力。積み重ねた事実。そして届けたいという情熱。<br>その全部が、あなたの信用になる。</p>
      `,
      warnId: "warn10",
    });
  }
  function bindDoor10() {
    qsa('input[name="d10_fact"]').forEach((cb) => {
      cb.addEventListener("change", () => {
        const checked = qsa('input[name="d10_fact"]').filter((b) => b.checked);
        if (checked.length > 3) { cb.checked = false; showToast("支える事実は、最大3つまで"); return; }
        state.d10_facts = checked.map((b) => b.value);
        saveState();
      });
    });
    [0, 1, 2].forEach((i) => {
      qs(`#d10_fact_detail_${i}`).addEventListener("input", (e) => { state.d10_facts_detail[i] = e.target.value; saveState(); });
    });
    qs("#d10_passion").addEventListener("input", (e) => { state.d10_passion = e.target.value; saveState(); });
    qsa('input[name="d10_promise_cb"]').forEach((cb) => {
      cb.addEventListener("change", () => { state.d10_promise_checks = qsa('input[name="d10_promise_cb"]').filter((b) => b.checked).map((b) => b.value); saveState(); });
    });
    qs("#d10_promise").addEventListener("input", (e) => { state.d10_promise = e.target.value; saveState(); });

    qs("#nextBtn").addEventListener("click", () => {
      if (!requireText(state.d10_passion, "warn10", "それでも届けたい理由を書いてみよう。")) return;
      goNextDoor(10);
    });
  }

  /* ---------------------------------------------------------
     6. チョッピー（nanaeAI）総評エンジン
        外部AI APIは使用しない。ルールベースの analysisProvider。
        将来、安全なサーバーサイドAIに差し替え可能なようにモジュール化。
  --------------------------------------------------------- */
  const analysisProvider = {
    // ルールベース総評（外部API不使用）
    run(s) {
      const primary = s.d5_primary || "あなたの得意なこと";
      const supporting = s.d5_supporting.join("・");
      const who = s.d1_situation || s.d1_moment || "今回のお客様";
      const wall = s.d2_pain || s.d2_wish || "";
      const future = s.d3_action || s.d3_scene || "";

      const core = `今回の回答を見ると、軸になっているのは「${primary}」。\n${who ? `そして届けたい相手は、${who}。` : ""}\nここがブレていないから、他がまだ粗くても十分伝わる。`;

      const frontValue = `一番前に出すなら「${primary}」。\n${supporting ? `「${supporting}」は、名前で説明するより「一緒にやってみたらこうなった」で見せる方が伝わりやすそう。` : "支えるチカラが決まると、説明がもっと短くなる。"}`;

      const conceptCore = wall && future
        ? `「${wall}」という壁を、「${primary}」で越えて、「${future}」まで連れていく。\nこの組み合わせが、今回のコンセプトの核になりそう。`
        : `扉2・扉3の回答が増えるほど、コンセプトの核はもっとくっきりしてくるはず。`;

      const restCount = (s.d5_categories || []).length - 1 - (s.d5_supporting ? s.d5_supporting.length : 0);
      const diffSeed = restCount > 0
        ? `裏に${restCount}個、まだ表に出していない力がある。ここが、他の商品との違いになる種かもしれない。`
        : `扉5で選んだ「${primary}」の掛け合わせ自体が、あなたにしかできない組み合わせ。`;

      const overload = [];
      if ((s.d6_during || []).length >= 5) overload.push("一緒にいる時間にやること");
      if ((s.d6_between || []).length >= 4) overload.push("会っていない時間のサポート");
      if ((s.d5_categories || []).length >= 6) overload.push("使うスキル・経験");
      const overloadText = overload.length
        ? `正直、盛り込みすぎてる可能性があるのは「${overload.join("」「")}」。\n全部やらなくていい。まずは「${primary}」が生きる分だけで十分。`
        : `今のところ、盛り込みすぎている感じはしない。このくらいの分量が、お客様にも伝わりやすい。`;

      const entryPoint = s.d1_moment
        ? `お客様に伝わりやすい入口は「${s.d1_moment}」という場面。\nここから始まる話は、多くの人が「わかる」って言いそう。`
        : `扉1の「困っている場面」が具体的になるほど、入口はもっと見つけやすくなる。`;

      const wordSeed = s.d1_words
        ? `お客様の心に届きそうな言葉の種は「${s.d1_words}」。\nこの言葉、そのまま商品の説明文に使えそう。`
        : `扉1で拾った「その人の言葉」が、そのまま一番刺さるコピーになることが多い。`;

      const nameHint = s.d9_name
        ? (/^[a-zA-Z\s]+$/.test(s.d9_name.trim())
            ? `商品名「${s.d9_name}」は、英語だけだと少し伝わりにくいかも。日本語で「誰の・何が変わる」を一言足すと、もっと入口が広くなりそう。`
            : `商品名「${s.d9_name}」、悪くない。${future ? `「${future}」が一言入ると、さらに伝わりやすくなるかも。` : ""}`)
        : `扉9で名前が決まると、ここにもヒントが出せる。`;

      const nextStep = `爆速1ミリでやるなら、扉1で見つけた「${s.d1_moment || "その人が困っている場面"}」を、そのままひとこと誰かに話してみること。\n反応があった言葉が、次の一歩の答えになる。`;

      return [
        { label: "① 今、この商品の芯", body: core },
        { label: "② 一番前に出したい価値", body: frontValue },
        { label: "③ コンセプトの核になりそうな組み合わせ", body: conceptCore },
        { label: "④ 他の商品との違いになりそうな種", body: diffSeed },
        { label: "⑤ 盛り込みすぎている可能性があるもの", body: overloadText },
        { label: "⑥ お客様に伝わりやすい入口候補", body: entryPoint },
        { label: "⑦ お客様の心に届きそうな言葉の種", body: wordSeed },
        { label: "⑧ 商品名の改善ヒント", body: nameHint },
        { label: "⑨ 次に試す、爆速1ミリ", body: nextStep },
      ];
    },
  };

  /* ---------------------------------------------------------
     7. 完成画面・商品設計シート「MY SOUL PRODUCT」
  --------------------------------------------------------- */
  const SHEET_TEMPLATES = [
    { id: "natural", swatchClass: "template-card__swatch--natural", swatchLabel: "Aa", name: "ナチュラル", badge: "おすすめ", desc: "温かい、やわらかい、自然体" },
    { id: "simple", swatchClass: "template-card__swatch--simple", swatchLabel: "Aa", name: "シンプル", badge: "", desc: "余白、洗練、すっきり" },
    { id: "elegant", swatchClass: "template-card__swatch--elegant", swatchLabel: "Aa", name: "エレガント", badge: "", desc: "上品、女性らしい、落ち着き" },
  ];

  function skillTags() {
    return state.d5_categories.map((c) => {
      const detail = state.d5_freeform[c];
      return detail ? `${c}（${detail}）` : c;
    });
  }

  function renderComplete() {
    const productName = state.d9_name || "（仮）魂商品";
    const deliverStyle = [state.d6_size, state.d6_place === "その他" ? state.d6_place_other : state.d6_place].filter(Boolean).join(" / ");
    const countLabel = state.d7_count || "-";
    const durationLabel = state.d7_duration && state.d7_duration !== "まだ決めなくてOK" ? state.d7_duration : "";
    const priceNum = Number(state.d8_price) || 0;
    const journeySteps = state.d7_steps.filter((s) => s.trim());
    const existingChecklist = state.self1_choice && state.self1_choice !== "new" ? renderExistingChecklist() : "";
    const analysis = analysisProvider.run(state);

    return `
    <div class="result-banner">
      <div class="result-banner__emoji">🎉</div>
      <h1 class="result-banner__title">はい、一旦完成！！！</h1>
      <div class="result-banner__body">まだ70点でも大丈夫。

商品は、机の上で100点にするものではありません。

ここから人に届けて、話して、喜ばれて、失敗して、直して、また届ける。

そうやって、あなたの商品は育っていきます。</div>
      <p class="result-banner__final">まず、ひとりに届けよう。</p>
    </div>

    <div class="card photo-upload">
      <div class="photo-upload__preview" id="photoPreview">${state.photo ? `<img src="${state.photo}" alt="">` : "📷"}</div>
      <div>
        <label class="btn btn--outline-gold btn--sm" for="photoInput" style="display:inline-block; cursor:pointer;">写真を選ぶ</label>
        <input type="file" id="photoInput" accept="image/*" style="display:none;">
        <p class="hint" style="margin-top:6px;">あなたらしい写真を1枚入れてみよう（任意）</p>
      </div>
    </div>

    <div class="template-switch" role="group" aria-label="資料のデザイン切り替え">
      ${SHEET_TEMPLATES.map((t) => `<button type="button" class="template-switch__btn${state.sheetTemplate === t.id ? " is-active" : ""}" data-template-switch="${t.id}">${esc(t.name)}</button>`).join("")}
    </div>

    <div class="sheet-wrap" id="printArea">
      <div class="sheet sheet--${esc(state.sheetTemplate || "natural")}" id="sheetCapture">
        <div class="sheet__inner">
          ${mascotImg("sheet__mascot-img")}
          <p class="sheet__eyebrow">MY SOUL PRODUCT</p>
          <p class="sheet__title">私の魂商品</p>
          ${state.photo ? `<img class="sheet__photo" src="${state.photo}" alt="">` : ""}
          <h2 class="sheet__name">${esc(productName)}</h2>
          <p class="sheet__name-sub">SOUL PRODUCT DESIGN SHEET</p>

          <hr class="sheet__divider">
          <div class="sheet__block"><p class="sheet__label">💌 誰に届けるか</p><p class="sheet__value">${esc(state.d1_situation) || "-"}</p></div>
          <div class="sheet__block"><p class="sheet__label">📍 現在の状況</p><p class="sheet__value">${esc(state.d1_moment) || "-"}</p></div>
          <div class="sheet__block"><p class="sheet__label">🧱 問題の根っこ</p><p class="sheet__value">${esc(state.d2_pain) || "-"}</p></div>
          <div class="sheet__block"><p class="sheet__label">🌿 連れていく未来</p><p class="sheet__value">${esc(state.d3_action) || "-"}</p></div>
          ${state.d3_scene ? `<div class="sheet__block"><p class="sheet__label">🖼 未来の一枚の景色</p><p class="sheet__value">${esc(state.d3_scene)}</p></div>` : ""}

          <hr class="sheet__divider">
          <div class="sheet__block"><p class="sheet__label">🕊 私が届ける理由</p><p class="sheet__value">${esc(state.d4_why) || "-"}</p></div>
          <div class="sheet__grid">
            <div class="sheet__stat"><div class="sheet__stat-label">ビフォー</div><div class="sheet__stat-value" style="font-size:13px;">${esc(state.d4_before) || "-"}</div></div>
            <div class="sheet__stat"><div class="sheet__stat-label">ターニングポイント</div><div class="sheet__stat-value" style="font-size:13px;">${esc(state.d4_turning_used) || "-"}</div></div>
            <div class="sheet__stat"><div class="sheet__stat-label">ジャーニー</div><div class="sheet__stat-value" style="font-size:13px;">${esc(state.d4_journey) || "-"}</div></div>
            <div class="sheet__stat"><div class="sheet__stat-label">アフター</div><div class="sheet__stat-value" style="font-size:13px;">${esc(state.d4_after) || "-"}</div></div>
          </div>

          <hr class="sheet__divider">
          <div class="sheet__block"><p class="sheet__label">✨ 表に出す主役</p><div class="sheet__tags"><span class="sheet__tag">${esc(state.d5_primary) || "-"}</span></div></div>
          <div class="sheet__block"><p class="sheet__label">🤝 支えるチカラ</p><div class="sheet__tags">${state.d5_supporting.map((s) => `<span class="sheet__tag">${esc(s)}</span>`).join("") || "-"}</div></div>

          <div class="sheet__grid">
            <div class="sheet__stat"><div class="sheet__stat-label">届け方</div><div class="sheet__stat-value" style="font-size:14px;">${esc(deliverStyle) || "-"}</div></div>
            <div class="sheet__stat"><div class="sheet__stat-label">回数</div><div class="sheet__stat-value">${esc(countLabel)}</div></div>
            ${durationLabel ? `<div class="sheet__stat"><div class="sheet__stat-label">1回の時間</div><div class="sheet__stat-value">${esc(durationLabel)}</div></div>` : ""}
          </div>
          ${journeySteps.length ? `<div class="sheet__block"><p class="sheet__label">🗺 行き先までの道のり</p><p class="sheet__value">${journeySteps.map((s, i) => `${i + 1}. ${esc(s)}`).join("\n")}</p></div>` : ""}

          <div class="sheet__price">
            <div class="sheet__price-label">PRICE</div>
            <div class="sheet__price-value">¥${priceNum.toLocaleString()}</div>
          </div>

          <hr class="sheet__divider">
          <div class="sheet__block"><p class="sheet__label">🏅 支える事実</p><p class="sheet__value">${esc(state.d10_facts_detail.filter((f) => f.trim()).join(" / ")) || "-"}</p></div>
          <div class="sheet__block"><p class="sheet__label">🔥 情熱</p><p class="sheet__value">${esc(state.d10_passion) || "-"}</p></div>
          <div class="sheet__block"><p class="sheet__label">🤍 お客様への約束</p><p class="sheet__value">${esc(state.d10_promise) || "-"}</p></div>

          <p class="sheet__footer">ここらぼ 魂商品作成ミラクルキット</p>
        </div>
      </div>
    </div>

    <div class="card result-actions">
      <button class="btn btn--primary" id="downloadImgBtn" type="button">シートを画像で保存する</button>
      <button class="btn btn--outline-gold" id="printBtn" type="button">印刷 / PDFで保存する</button>
      <button class="btn btn--ghost" id="editBtn" type="button">← 入力内容を修正する</button>
    </div>

    <div class="card chotty-card">
      <div class="chotty-card__intro">
        ${mascotImg("chotty-card__intro-img")}
        <div>
          <span class="eyebrow" style="margin-bottom:4px;">チョッピー（nanaeAI）総評</span>
          <p class="step-desc" style="margin-bottom:0;">チョッピー（nanaeAI）が、あなたの商品を読み解きます</p>
        </div>
      </div>
      ${analysis.map((a) => `
        <div class="chotty-item">
          <p class="chotty-item__label">${esc(a.label)}</p>
          <p class="chotty-item__body">${nl2br(a.body)}</p>
        </div>`).join("")}
      <p class="hint">※ 市場調査は行っていません。今回の回答から見える仮説として読んでね。</p>
    </div>

    ${existingChecklist}

    <div class="restart-row"><button id="restartBtn" type="button">最初からやり直す</button></div>`;
  }

  function renderExistingChecklist() {
    const labels = [
      "誰を助ける商品か一言で言える",
      "お客様の今が見えている",
      "どこへ連れていくか一言で言える",
      "その未来に必要な内容だけになっている",
      "なぜ私が届けるのか言葉にできる",
      "何を前に出す商品か決まっている",
      "お客様から見える入口がシンプルになった",
    ];
    return `
      <div class="card checklist-card">
        <span class="eyebrow">最終チェック</span>
        <h2 class="step-title" style="font-size:19px;">あなたの商品、前よりシンプルに説明できますか？</h2>
        <div>
          ${labels.map((label, i) => `
            <label class="checklist-item">
              <input type="checkbox" data-fc="${i}" ${state.finalChecklist[i] ? "checked" : ""}>
              <span>${esc(label)}</span>
            </label>`).join("")}
        </div>
        <p class="hint" style="margin-top:14px;">チェックできなかった場所が、次に磨く場所。<br>商品を増やす前に、まずここを磨こう。</p>
      </div>`;
  }

  function bindComplete() {
    const photoInput = qs("#photoInput");
    photoInput.addEventListener("change", () => {
      const file = photoInput.files[0];
      if (!file) return;
      if (file.size > 4 * 1024 * 1024) { showToast("写真サイズが大きすぎます。4MB以下の画像を選んでね"); return; }
      const reader = new FileReader();
      reader.onload = () => { state.photo = reader.result; saveState(); render(); };
      reader.readAsDataURL(file);
    });

    qsa("[data-template-switch]").forEach((btn) => {
      btn.addEventListener("click", () => { state.sheetTemplate = btn.dataset.templateSwitch; saveState(); render(); });
    });

    qs("#printBtn").addEventListener("click", () => window.print());

    qs("#downloadImgBtn").addEventListener("click", async () => {
      if (typeof window.html2canvas !== "function") { showToast("画像保存機能を読み込み中、または利用できません。印刷/PDF保存をお試しください"); return; }
      try {
        showToast("画像を作成しています…");
        const target = qs("#sheetCapture");
        const canvas = await window.html2canvas(target, { scale: 2, backgroundColor: "#FBF6F0", useCORS: true });
        const link = document.createElement("a");
        link.download = (state.d9_name || "soul-product") + ".png";
        link.href = canvas.toDataURL("image/png");
        link.click();
        showToast("画像を保存しました！");
      } catch (e) {
        showToast("画像保存に失敗しました。印刷/PDF保存をお試しください");
      }
    });

    qs("#editBtn").addEventListener("click", () => {
      state.screen = "door";
      state.doorIndex = 1;
      saveState();
      render();
    });

    qs("#restartBtn").addEventListener("click", openResetModal);

    qsa("[data-fc]").forEach((cb) => {
      cb.addEventListener("change", () => {
        state.finalChecklist[Number(cb.dataset.fc)] = cb.checked;
        saveState();
      });
    });
  }

  /* ---------------------------------------------------------
     8. リセットモーダル
  --------------------------------------------------------- */
  const resetModal = document.getElementById("resetModal");
  function openResetModal() { resetModal.hidden = false; }
  function closeResetModal() { resetModal.hidden = true; }

  document.getElementById("resetCancelBtn").addEventListener("click", closeResetModal);
  document.getElementById("resetConfirmBtn").addEventListener("click", () => {
    state = defaultState();
    saveState();
    closeResetModal();
    render();
    showToast("最初からやり直しました");
  });
  resetModal.addEventListener("click", (e) => { if (e.target === resetModal) closeResetModal(); });

  /* ---------------------------------------------------------
     9. 初期化
  --------------------------------------------------------- */
  render();
})();
