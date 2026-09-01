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
    screen: "start", // start | tane | taneResult | self1 | door | market | studio | celebrate | complete
    doorIndex: 1,     // 1-10（screen === "door" のときのみ意味を持つ）

    // START｜やりたいのタネ探し（10の扉にはカウントしない。扉の回答とは別枠で保持する）
    start_q: ["", "", "", "", ""],
    start_tane_selected: "",   // 提示したタネ候補のindex（文字列）、または "other"
    start_tane_other: "",      // 「どれもしっくりこない」を選んだ場合の自由記入

    self1_choice: "", // new | polish | grow

    // 社会科見学（扉にはカウントしない軽い一歩。扉6のあと）
    market_examples: ["", "", ""], // 似た商品・サービスを2〜3個見て気づいたこと（自由記入）
    market_takeaway: "",   // 取り入れたいこと
    market_diff: "",       // 自分はこうしたいと思ったこと

    // 最後の扉は画面の外です｜3人ミニ市場テスト
    market_test_checks: [false, false, false],
    market_test_notes: ["", "", ""],

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
    d7_item_counts: {}, // { 支援内容ラベル: { count: "", duration: "" } }（扉6で選んだ内容ごとに回数・時間を持つ）

    // 扉8：価格を決める
    d8_time_checks: [],
    d8_weekly_hours: "",
    d8_period_weeks: "",
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

    // 横A4詳細資料（デッキ）
    deck: {
      photos: {},     // { pageKey: dataUrl }
      overrides: {},  // { pageKey: { big: "", body: "" } }（原文は上書きしない。表示用の別データ）
      hidden: [],     // 非表示にしたページキー
    },
  });

  let state = loadState();

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      const merged = Object.assign(defaultState(), parsed);
      // ネストしたデフォルト値を保護（古いデータからの復元時に壊れないように）
      // START「やりたいのタネ探し」は今回の新規追加。旧データに存在しなくてもエラーにせず「START未回答」として扱う
      merged.start_q = Array.isArray(parsed.start_q) && parsed.start_q.length === 5 ? parsed.start_q : ["", "", "", "", ""];
      merged.market_examples = Array.isArray(parsed.market_examples) ? parsed.market_examples : ["", "", "", ""];
      merged.market_test_checks = Array.isArray(parsed.market_test_checks) && parsed.market_test_checks.length === 3
        ? parsed.market_test_checks : [false, false, false];
      merged.market_test_notes = Array.isArray(parsed.market_test_notes) && parsed.market_test_notes.length === 3
        ? parsed.market_test_notes : ["", "", ""];
      merged.d4_turning = Array.isArray(parsed.d4_turning) ? parsed.d4_turning : ["", "", ""];
      merged.d7_steps = Array.isArray(parsed.d7_steps) ? parsed.d7_steps : ["", "", "", ""];
      merged.d7_item_counts = parsed.d7_item_counts && typeof parsed.d7_item_counts === "object" ? parsed.d7_item_counts : {};
      // 旧データ（回数・時間が扉全体でひとつだけだった頃）からの移行：
      // 新しい画面は扉6で選んだ内容ごとにしか回数を表示しないため、その各内容に同じ回数・時間を割り当てて
      // 実際に見える場所（扉7の入力欄・完成シートの「回数」欄）に反映されるようにする
      if ((parsed.d7_count || parsed.d7_duration) && Object.keys(merged.d7_item_counts).length === 0) {
        // 旧選択肢は "1回"〜"5回以上" のように「回」を含んだ文字列だったが、新しい表示は count に自動で「回」を付け足すため、
        // 二重に「回回」とならないよう先に取り除く
        const legacyValue = { count: (parsed.d7_count || "").replace(/回/g, ""), duration: (parsed.d7_duration && parsed.d7_duration !== "まだ決めなくてOK") ? parsed.d7_duration : "" };
        const legacyDuring = Array.isArray(parsed.d6_during) ? parsed.d6_during : [];
        const legacyBetween = Array.isArray(parsed.d6_between) ? parsed.d6_between : [];
        const legacyItems = [];
        legacyDuring.forEach((v) => {
          if (v === "その他") { if ((parsed.d6_during_other || "").trim()) legacyItems.push(parsed.d6_during_other.trim()); }
          else legacyItems.push(v);
        });
        legacyBetween.forEach((v) => {
          if (v === "特になし") return;
          if (v === "その他") { if ((parsed.d6_between_other || "").trim()) legacyItems.push(parsed.d6_between_other.trim()); }
          else legacyItems.push(v);
        });
        if (legacyItems.length) {
          legacyItems.forEach((item) => { merged.d7_item_counts[item] = Object.assign({}, legacyValue); });
        } else {
          // 扉6の内容が空のときだけ、情報を失わないよう汎用キーで保持
          merged.d7_item_counts["これまでの内容"] = legacyValue;
        }
      }
      merged.d8_weekly_hours = typeof parsed.d8_weekly_hours === "string" ? parsed.d8_weekly_hours : "";
      merged.d8_period_weeks = typeof parsed.d8_period_weeks === "string" ? parsed.d8_period_weeks : "";
      // 旧データ（合計時間を自由入力していた頃）からの移行：週あたりの目安として引き継ぐ
      if (parsed.d8_time_hours && !merged.d8_weekly_hours) {
        merged.d8_weekly_hours = parsed.d8_time_hours;
      }
      merged.d9_check = Array.isArray(parsed.d9_check) ? parsed.d9_check : [false, false, false];
      merged.d10_facts_detail = Array.isArray(parsed.d10_facts_detail) ? parsed.d10_facts_detail : ["", "", ""];
      merged.finalChecklist = Array.isArray(parsed.finalChecklist) && parsed.finalChecklist.length === 7
        ? parsed.finalChecklist : [false, false, false, false, false, false, false];
      merged.d5_freeform = parsed.d5_freeform && typeof parsed.d5_freeform === "object" ? parsed.d5_freeform : {};
      const deckDefault = { photos: {}, overrides: {}, hidden: [] };
      merged.deck = Object.assign(deckDefault, parsed.deck && typeof parsed.deck === "object" ? parsed.deck : {});
      merged.deck.photos = merged.deck.photos && typeof merged.deck.photos === "object" ? merged.deck.photos : {};
      merged.deck.overrides = merged.deck.overrides && typeof merged.deck.overrides === "object" ? merged.deck.overrides : {};
      merged.deck.hidden = Array.isArray(merged.deck.hidden) ? merged.deck.hidden : [];
      return merged;
    } catch (e) {
      return defaultState();
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      showToast("保存容量が上限に近づいています\n写真サイズを小さくしてみてね", 2600);
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
  function hideToast() {
    clearTimeout(toastTimer);
    document.getElementById("toast").classList.remove("show");
  }

  function scrollTop() { window.scrollTo({ top: 0, behavior: "smooth" }); }

  // 印刷方向の切り替え：@pageは「有効/無効の切り替え」の方がブラウザの
  // 印刷パイプラインで確実に効くため、名前付きページではなくこの方式にしている
  function setPrintOrientation(mode) {
    const portrait = document.getElementById("printPagePortrait");
    const landscape = document.getElementById("printPageLandscape");
    if (!portrait || !landscape) return;
    portrait.disabled = mode === "landscape";
    landscape.disabled = mode !== "landscape";
  }

  /* ---- マスコット（公式キャラクター実画像。改変・描き直しは一切せずそのまま使用） ---- */
  const MASCOT_IMG_SRC = "assets/mascot-trio.png";           // 表紙・完成など「お手紙」ポーズ
  const MASCOT_STUDY_IMG_SRC = "assets/mascot-trio-study.png"; // 扉で一緒に考える「勉強中」ポーズ
  function mascotImg(className, src) {
    return `<img src="${src || MASCOT_IMG_SRC}" alt="ここらぼ公式キャラクター" class="${className}">`;
  }
  // 各扉の小さな装飾には、公式キャラクター実画像を使い回す（新規キャラクターは描かない）
  function doorMascot() {
    return `<div class="step-mascot">${mascotImg("step-mascot__img", MASCOT_STUDY_IMG_SRC)}</div>`;
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
    20: "20％\n悩みの正体がくっきりしてきた",
    30: "30％\n商品の骨が見えてきた",
    40: "40％\n連れていく未来が見えてきた",
    50: "50％\nおお、商品になってきた😍",
    60: "60％\n使う力が定まってきた",
    70: "70％\nかなりつながってきた",
    80: "80％\n値段と名前が見えてきた",
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
      progressLabel.textContent = `10の扉 進捗 ${pct}％`;
      const remaining = TOTAL_DOORS - doneDoors;
      progressDoor.textContent = `扉 ${state.doorIndex} / ${TOTAL_DOORS}　${doorsRemainingLabel(remaining)}`;
      progressFill.parentElement.setAttribute("aria-valuenow", pct);
    } else if (state.screen === "complete") {
      appHeader.hidden = false;
      progressFill.style.width = "100%";
      progressLabel.textContent = "10の扉 全部OPEN！";
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
    if (state.screen === "start") {
      app.className = "app-main";
      app.innerHTML = renderStart(); bindStart();
    } else if (state.screen === "tane") {
      app.className = "app-main app-main--wide";
      app.innerHTML = renderTane(); bindTane();
    } else if (state.screen === "taneResult") {
      app.className = "app-main app-main--wide";
      app.innerHTML = renderTaneResult(); bindTaneResult();
    } else if (state.screen === "self1") {
      app.className = "app-main app-main--wide";
      app.innerHTML = renderSelf1(); bindSelf1();
    } else if (state.screen === "market") {
      app.className = "app-main app-main--wide";
      app.innerHTML = renderMarket(); bindMarket();
    } else if (state.screen === "door") {
      app.className = "app-main app-main--wide";
      app.innerHTML = `<div class="door-layout">
        <div class="door-layout__main">${renderDoor(state.doorIndex)}</div>
        <aside class="door-layout__preview">${renderProductPreview()}</aside>
      </div>`;
      bindDoor(state.doorIndex);
    } else if (state.screen === "studio") {
      app.className = "app-main app-main--studio";
      app.innerHTML = renderStudio(); bindStudio();
    } else if (state.screen === "celebrate") {
      app.className = "app-main";
      app.innerHTML = renderCelebrate(); bindCelebrate();
    } else {
      app.className = "app-main app-main--wide";
      app.innerHTML = renderComplete(); bindComplete();
    }
    scrollTop();
  }

  /* ---- 育っていく商品プレビュー（PC横並びサイドバー） ---- */
  function previewRow(label, value, filled) {
    return `<div class="product-preview__row ${filled ? "is-filled" : "is-empty"}">
      <p class="product-preview__label">${esc(label)}</p>
      <p class="product-preview__value">${filled ? esc(value) : "まだ空欄"}</p>
    </div>`;
  }
  function renderProductPreview() {
    const s = state;
    const rows = [
      ["届けたいひとり", s.d1_situation || s.d1_who],
      ["越える壁", s.d2_pain],
      ["連れていく未来", s.d3_action],
      ["私が届ける理由", s.d4_why],
      ["主役のチカラ", s.d5_primary],
      ["届け方", s.d6_place],
      ["道のり", (s.d7_steps || []).filter((x) => x && x.trim()).join("・")],
      ["価格", s.d8_price ? `${formatYen(s.d8_price)}円` : ""],
      ["商品名", s.d9_name],
      ["信用の材料", s.d10_passion],
    ];
    const doneCount = rows.filter(([, v]) => v && String(v).trim()).length;
    return `
      <div class="product-preview">
        <p class="product-preview__title">育っていく、あなたの商品</p>
        <p class="product-preview__count">${doneCount} / ${rows.length} コまで見えてきた</p>
        <div class="product-preview__list">
          ${rows.map(([label, value]) => previewRow(label, value, value && String(value).trim())).join("")}
        </div>
      </div>`;
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
      <img src="assets/chotnanapt-logo.png" alt="ChotNANAPT" class="hero__chotty-logo">

      <div class="cover-intro">
        <p class="cover-intro__eyebrow">chotoNANAP・チョッピーから<br>親愛なるここらーの皆へ</p>
        <p class="cover-intro__gift">スペシャルプレゼント🎁</p>
        <p class="cover-pullquote">質問に答えていくだけで<br>なんと、最後に<br>魂商品＝ご提案書の叩き台が<br>できちゃう・・・・！！</p>
        <p class="cover-intro__sub">ゴイゴイスーなものを<br>開発してしまいましたよ〜</p>
      </div>

      <p class="hero__catch">チョッピー（nanaeAI）が<br>あなたのモヤモヤを一緒に整理します</p>

      <div class="cover-message">
        <p class="cover-pullquote cover-pullquote--md">目の前のひとりを<br>幸せにする</p>
        <p class="cover-body">まずは、自分の物語でお金をいただく体験をする</p>
        <p class="cover-pullquote cover-pullquote--md">「はじめの一品」を<br>つくってください</p>
        <p class="cover-body">いくら、頭の中で考えても<br>届けてみないと何も始まらない</p>
        <p class="cover-body">いきなり完璧な講座を作らなくていいんです<br>そもそも、魂商品に完成も完璧もないんです</p>
        <p class="cover-body">1人に届ける▶︎反応を見る▶︎ブラッシュアップする▶︎そして、また届ける<br><br>ずっとこの繰り返し</p>
        <p class="cover-body">だからこそ</p>
        <p class="cover-pullquote cover-pullquote--md">魂商品は完璧な状態まで<br>作り込むものではなく<br>７割くらいできたら、いったん出して<br>お客様と一緒に<br>「育てていくもの」</p>
        <p class="cover-body">何ヶ月かかって商品作りをする時代は終焉しました</p>
        <p class="cover-body">ここまで1000人以上の受講生と<br>私自身の実績から<br>全ての叡智をぶっこんで、</p>
        <p class="cover-pullquote cover-pullquote--md">「はじめの一品」キット</p>
        <p class="cover-body">チョッピーAIから贈ります🎁</p>
        <p class="cover-body">今回ここらぼのファイナルシーズン期間限定で<br>無料で使っていただけます！</p>
        <p class="cover-body">時間がない、それでも夢を叶えたい<br><br>そんな国宝&amp;仏の皆が最速で<br>次元上昇できる方法を考えることが<br>ここらぼのミッションです</p>
        <p class="cover-pullquote cover-pullquote--md">だって、ここらー<br>全員可能性の塊だから</p>
        <p class="cover-pullquote cover-pullquote--lg">ほっとけないんだもーーーーん💌</p>
        <p class="cover-closing">では、早速<br>ワックワクでいってみよう！</p>
      </div>

      <div class="hero__desc">商品がまだない人は
ここからカタチに

すでにある人は
もっとくっきり

10個の問いに答えながら
あなたの商品に一本の芯を通していこう</div>

      <div class="goal-box">
        <p class="goal-box__title">このキットのゴール💌</p>
        <p class="goal-box__body">このキットのゴールは<br>完璧な商品を完成させることではありません<br><br>あなたの中にある<br>「やってみたい」を拾って<br><br>それを誰かの喜びにつなげて<br><br>まず人に見せられる<br>「はじめの一品」の叩き台をつくること<br><br>そこから<br>届ける▶︎反応を見る▶︎磨く<br><br>あなたの商品を<br>お客様と一緒に育てていきます</p>
      </div>

      <div class="nav-row" style="margin-top:22px;">
        <button class="btn btn--primary" id="startBtn" type="button">はじめる</button>
      </div>
      ${hasAnyProgress() ? `<div class="restart-row"><button id="continueBtn" type="button">前回の続きから再開する →</button></div>` : ""}

      <p class="ai-disclaimer">このキットは、AIが売れる商品を勝手に作るツールではありません<br>あなたの経験・想い・やってみたいことを、チョッピーと一緒に整理して、まず人に見せられるカタチにするためのキットです<br><br>チョッピーの提案は正解ではありません<br>違和感があれば、あなたの言葉を優先してどんどん書き換えてください<br><br>このキットの利用によって、売上・集客・成果等を保証するものではありません<br>実際のお客様の反応を見ながら、ご自身の判断で商品を育ててください<br><br>法律・医療・健康・金融等に関わる表現や、効果効能・成果保証等を含む商品については、必要に応じて専門家・関係機関にご確認ください</p>
    </div>`;
  }

  function hasAnyProgress() {
    return state.screen !== "start";
  }

  function bindStart() {
    qs("#startBtn").addEventListener("click", () => {
      state.screen = "tane";
      saveState();
      render();
    });
    const cont = qs("#continueBtn");
    if (cont) {
      cont.addEventListener("click", () => { render(); });
    }
  }

  /* ---------------------------------------------------------
     4-1. START｜やりたいのタネ探し（10の扉にはカウントしない）
  --------------------------------------------------------- */
  const TANE_QUESTIONS = [
    { q: "今まで、時間を忘れるくらいハマったことは？", hint: "仕事でも、趣味でも、遊びでもOK\n子どもの頃のことでも大丈夫" },
    { q: "人から「それ得意だよね」「教えて」と言われることは？", hint: "自分では普通だと思っていることも書いてみよう" },
    { q: "お金にならなくても、ついやっちゃうことは？", hint: "頼まれていないのにやっちゃう\n調べちゃう\n作っちゃう\n話しちゃう\nそんなことでもOK" },
    { q: "今まで学んだこと・経験したことの中で\n「これ好きだったな」「もっとやりたいな」と思うものは？", hint: "資格や仕事だけでなく\n人生経験・趣味・子育て・遊びなどもOK" },
    { q: "もし\n「売れる？」\n「私にできる？」\nを一切考えなくていいなら\n何をやってみたい？", hint: "まだ商品になっていなくてOK\n妄想レベルでOK" },
  ];

  function renderTane() {
    const rows = TANE_QUESTIONS.map((tq, i) => `
      <div class="field" style="margin-top:${i === 0 ? 0 : 26}px;">
        <p class="step-question">${nl2br(tq.q)}</p>
        ${tq.hint ? `<p class="hint" style="margin-top:0;margin-bottom:10px;">${nl2br(tq.hint)}</p>` : ""}
        <textarea id="start_q_${i}" placeholder="ここに書いてみよう">${esc(state.start_q[i])}</textarea>
      </div>`).join("");
    return `
    <div class="card">
      ${doorMascot()}
      <span class="eyebrow">START</span>
      <h2 class="step-title">まず「やりたい」のタネを集めよう</h2>
      <p class="step-desc">ここでは<br>「売れるかな？」<br>「私にできるかな？」<br>はいったん横にポイッ🤣<br><br>正解も<br>需要も<br>肩書きも<br>一旦考えなくてOK<br><br>あなたの中にある<br>「ちょっとやってみたい」<br>のタネを集めてみよう</p>
      ${rows}
      <p class="warn-msg" id="warnTane"></p>
      <div class="nav-row" style="margin-top:22px;">
        <button class="btn btn--ghost" id="taneBackBtn" type="button">← 前へ</button>
        <button class="btn btn--primary" id="taneNextBtn" type="button">タネを集めた</button>
      </div>
      <div class="restart-row"><button id="restartBtn" type="button">最初からやり直す</button></div>
    </div>`;
  }
  function bindTane() {
    TANE_QUESTIONS.forEach((_, i) => {
      qs(`#start_q_${i}`).addEventListener("input", (e) => { state.start_q[i] = e.target.value; saveState(); });
    });
    qs("#taneBackBtn").addEventListener("click", () => { state.screen = "start"; saveState(); render(); });
    qs("#restartBtn").addEventListener("click", openResetModal);
    qs("#taneNextBtn").addEventListener("click", () => {
      if (!state.start_q.some((a) => a.trim())) { showWarn("warnTane", "ひとつだけでも書いてみよう"); return; }
      state.screen = "taneResult";
      saveState();
      render();
    });
  }

  // タネの整理：本人の言葉を優先し、AIが勝手に意味を作らない。具体的に書けた回答を最大3つ、本人の言葉のまま提示する
  function taneCandidates() {
    const filled = state.start_q.map((a, i) => ({ i, text: a.trim() })).filter((x) => x.text);
    const picked = filled.slice().sort((a, b) => b.text.length - a.text.length).slice(0, 3);
    picked.sort((a, b) => a.i - b.i);
    return picked.map((x) => truncateText(x.text, 42));
  }

  function renderTaneResult() {
    const candidates = taneCandidates();
    const chosen = state.start_tane_selected;
    return `
    <div class="card">
      ${doorMascot()}
      <span class="eyebrow">START</span>
      <h2 class="step-title">チョッピーが見つけた<br>あなたの「やりたいのタネ」💌</h2>
      <p class="step-desc">5つの回答から、特にくっきり書けていたものを<br>そのままの言葉で並べてみたよ<br><br>もしかするとあなたは<br>これらのどれかに<br>ワクワクする人なのかもしれません<br>（あくまで仮説だから、しっくりこなければ気にしないで）</p>
      <div class="choice-grid">
        ${candidates.map((c, i) => choiceCard({
          type: "radio", name: "tane_choice", value: String(i), id: "tane_choice_" + i, shape: "round",
          checked: chosen === String(i), label: `${["①", "②", "③"][i]} ${c}`,
        })).join("")}
        ${choiceCard({
          type: "radio", name: "tane_choice", value: "other", id: "tane_choice_other", shape: "round",
          checked: chosen === "other", label: "どれもしっくりこない",
        })}
      </div>
      <div class="inline-input" id="taneOtherWrap" ${chosen === "other" ? "" : "hidden"}>
        <input type="text" id="start_tane_other" placeholder="しっくりくる言葉を書いてみよう" value="${esc(state.start_tane_other)}">
      </div>
      <p class="warn-msg" id="warnTaneResult">どれか選んでみよう（しっくりこない、でもOK）</p>
      <div class="nav-row" style="margin-top:22px;">
        <button class="btn btn--ghost" id="taneResultBackBtn" type="button">← 前へ</button>
        <button class="btn btn--primary" id="taneResultNextBtn" type="button">次へ →</button>
      </div>
      <div class="restart-row"><button id="restartBtn" type="button">最初からやり直す</button></div>
    </div>`;
  }
  function bindTaneResult() {
    qsa('input[name="tane_choice"]').forEach((r) => {
      r.addEventListener("change", () => {
        state.start_tane_selected = r.value;
        qs("#taneOtherWrap").hidden = r.value !== "other";
        saveState();
      });
    });
    qs("#start_tane_other")?.addEventListener("input", (e) => { state.start_tane_other = e.target.value; saveState(); });
    qs("#taneResultBackBtn").addEventListener("click", () => { state.screen = "tane"; saveState(); render(); });
    qs("#restartBtn").addEventListener("click", openResetModal);
    qs("#taneResultNextBtn").addEventListener("click", () => {
      if (!state.start_tane_selected) { showWarn("warnTaneResult", "どれか選んでみよう（しっくりこない、でもOK）"); return; }
      state.screen = "self1";
      saveState();
      render();
    });
  }

  /* ---------------------------------------------------------
     4-2. SELF 1（現在地確認・10の扉には含まない）
  --------------------------------------------------------- */
  const SELF1_OPTIONS = [
    { id: "new", label: "① まだ商品・サービスがない", sub: "ゼロから　誰に何を届けるかをカタチにする",
      msg: "何もないからこそ自由に作れる\n\nここから、産み出す喜びを\nワクワクしながら作って行きましょう！\n\nまずは\nひとりを幸せにする商品から始めよう",
      btn: "商品をカタチにする" },
    { id: "polish", label: "② 商品はあるもう一度　磨きたい", sub: "今の商品をシンプルに整理して　選ばれる理由をくっきりさせる",
      msg: "商品があるなら\n材料はもうある\n\n足す前に\nいったん磨こう\n\nぼやけているところが見えたら\n商品はもっと強くなる",
      btn: "今の商品を磨いてみる" },
    { id: "grow", label: "③ 売れている商品を　もっと育てたい", sub: "実際のお客様の反応をもとに　今の商品を再点検してブラッシュアップする",
      msg: "売れたから完成\nではありません\n\nお客様に届けた今だから\n見える答えがあります\n\n売れた商品を\nさらに育てよう",
      btn: "売れた商品をもう一度ひらく" },
  ];

  function renderSelf1() {
    const chosen = SELF1_OPTIONS.find((o) => o.id === state.self1_choice);
    return `
    <div class="card self1-card">
      ${doorMascot()}
      <span class="seko-badge">せるこ1</span>
      <h2 class="step-title">まず　今の商品はどこにいる？</h2>
      <p class="step-desc">正解も優劣もありません<br>今いる場所がわかれば、ここからやることが見えてきます</p>
      <div class="choice-grid">
        ${SELF1_OPTIONS.map((o) => choiceCard({
          type: "radio", name: "self1", value: o.id, id: "self1_" + o.id, shape: "round",
          checked: state.self1_choice === o.id, label: o.label, sub: o.sub,
        })).join("")}
      </div>
      <div id="self1Note">${chosen ? `<div class="persona-note">${nl2br(chosen.msg)}</div>` : ""}</div>
      <p class="warn-msg" id="warnSelf1">まずは、今のあなたに近いものを選んでね</p>
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
      if (!state.self1_choice) { showWarn("warnSelf1", "まずは、今のあなたに近いものを選んでね"); return; }
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
  function doorShell({ n, title, bodyHtml, warnId }) {
    return `
    <div class="card">
      ${doorMascot()}
      <p class="door-progress-mini">扉 ${n} / ${TOTAL_DOORS}</p>
      <span class="seko-badge">せるこ${n + 1}</span>
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
      else if (n === 7) { state.screen = "market"; }
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
    if (n === TOTAL_DOORS) {
      // 最後の扉は専用の完成演出画面へ（節目トーストは出さず、演出そのものに譲る）
      hideToast();
      state.screen = "celebrate";
      saveState();
      render();
      return;
    }
    const before = n - 1;
    const after = n;
    // 扉が開くたびの軽い演出＋10％ごとの節目メッセージ
    const doorOpenLine = `扉${n} OPEN✨`;
    if (MILESTONE_TEXT[after * 10] && after * 10 > before * 10) {
      const milestoneLine = MILESTONE_TEXT[after * 10].split("\n").slice(1).join(" ");
      showToast(`${doorOpenLine}\n${milestoneLine}`, 3400);
    } else {
      showToast(doorOpenLine, 1800);
    }
    if (n === 6) {
      // 扉6のあとは「社会科見学」という軽い一歩をはさむ（扉のカウントには含めない）
      state.screen = "market";
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
        <p class="step-desc">商品は、みんなのためにつくろうとするとぼやけます<br>まずは、たったひとり<br><br>細かいペルソナ設定はまだいりません<br>今は、その人の顔や毎日が少し浮かべばOK</p>

        <p class="step-question">まず　誰を思い浮かべる？</p>
        <div class="choice-grid">${whoCards}</div>

        <div class="field" style="margin-top:22px;">
          <label class="field__label">その人は今どんな状況で、どんな毎日を送っていますか？</label>
          <textarea id="d1_situation" placeholder="例）30代、子育てをしながら起業を始めたばかりで、やりたいことはあるけれど、何から発信すればいいかわからない">${esc(state.d1_situation)}</textarea>
          <p class="hint">年齢・家族構成・年収・趣味などを大量に埋めなくてOK<br>今が見える一文で大丈夫</p>
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
      if (!state.d1_who) { showWarn("warn1", "まず、誰を思い浮かべるか選んでみよう"); return; }
      if (!requireText(state.d1_situation, "warn1", "その人の今の状況を書いてみよう")) return;
      if (!requireText(state.d1_moment, "warn1", "困っている一場面を書いてみよう")) return;
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
        <p class="step-desc">表面に見えている悩みだけで商品を作ると、少し浅くなります<br>その奥にある怖さ・痛み・恥・思い込み<br>全部掘らなくて大丈夫<br><br>今回は、この商品で越える一番大きな壁を、ひとつ見つけます</p>

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
          <textarea id="d2_wish" placeholder="ここでは、次の未来提示を完成させなくてよいので、問題の根っこを一言でつかむ">${esc(state.d2_wish)}</textarea>
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
      if (!requireText(state.d2_pain, "warn2", "いちばんつらいことを書いてみよう")) return;
      if (!requireText(state.d2_wish, "warn2", "本当は何を変えたいか、書いてみよう")) return;
      showToast("よし、救いたい場所が見えてきた", 2200);
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
        <p class="step-desc">この商品を受けたあと、その人の人生に何が起きていたら最高か<br>「幸せになる」「自信がつく」「自分らしくなる」で止めない<br><br>未来を4段階で、少しずつくっきりさせます</p>

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
        <div class="note-box">未来は、物語にするともっと届く<br>情報だけではなく、物語で伝える<br>次の扉で、あなた自身の物語を整理します</div>
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
      if (!requireText(state.d3_inner, "warn3", "内面の変化を書いてみよう")) return;
      if (!requireText(state.d3_action, "warn3", "できるようになることを書いてみよう")) return;
      showToast("行き先、くっきりしてきた", 2200);
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
        <p class="step-desc">なぜ、あなたがこの商品を届けるの？<br>資格や肩書きより先に、あなたが歩いてきた道を振り返ります<br><br>あなたの経験は、4つに分けるとひとつの物語になります</p>

        <div class="field">
          <label class="field__label">ビフォー｜あの頃の私は？</label>
          <textarea id="d4_before" placeholder="どんなことで悩み、何に困っていましたか？一場面が見えるように">${esc(state.d4_before)}</textarea>
        </div>

        <p class="step-question">ターニングポイント｜私を変えた突破口は？（最大3つ）</p>
        <p class="hint" style="margin-top:0;margin-bottom:12px;">方法・スキルとの出会い（コーチング・アロマ・ヨガ・数秘・発信など）／考え方・学びとの出会い（心理学・自分を責めない考え方など）／人・出来事・経験（メンター・家族・離婚・病気・転職・お客様の一言など）<br><br>転機はひとつでなくてOK</p>
        <div class="field"><input type="text" id="d4_turning_0" placeholder="① 突破口" value="${esc(state.d4_turning[0])}"></div>
        <div class="field"><input type="text" id="d4_turning_1" placeholder="② 突破口" value="${esc(state.d4_turning[1])}"></div>
        <div class="field"><input type="text" id="d4_turning_2" placeholder="③ 突破口" value="${esc(state.d4_turning[2])}"></div>

        <div class="field" id="turningUsedWrap" ${state.d4_turning.some((t) => t.trim()) ? "" : "hidden"}>
          <label class="field__label">この中で、今回の商品にも活かしたい突破口はどれ？</label>
          <div class="choice-grid" id="turningUsedGrid"></div>
        </div>

        <div class="field">
          <label class="field__label">ジャーニー｜そこから何をした？</label>
          <textarea id="d4_journey" placeholder="何を試した？何を学んだ？どんな失敗があった？何を続けた？成功談だけでなくてもいい">${esc(state.d4_journey)}</textarea>
        </div>

        <div class="field">
          <label class="field__label">アフター｜そして今、どう変わった？</label>
          <textarea id="d4_after" placeholder="内面だけでなく、行動や現実がどう変わったか">${esc(state.d4_after)}</textarea>
        </div>

        <div class="field">
          <label class="field__label">だから私は、この人に届けたい</label>
          <textarea id="d4_why" placeholder="自由記入">${esc(state.d4_why)}</textarea>
        </div>

        <p class="big-quote">あなたの過去は、ただの昔話じゃない<br>あなたが歩いてきた道は、誰かの地図になる</p>
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
      if (!requireText(state.d4_before, "warn4", "あの頃のあなたについて書いてみよう")) return;
      if (!state.d4_turning.some((t) => t.trim())) { showWarn("warn4", "突破口を、ひとつだけでも書いてみよう"); return; }
      if (!requireText(state.d4_why, "warn4", "だから届けたい、その理由を書いてみよう")) return;
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
        <p class="step-desc">あなたができることは、全部捨てなくて大丈夫<br>必要なら全部使っていい<br><br>でも、お客様から見える場所に全部並べると「結局、何の人？」になります🤣<br><br>今回決めるのは、何を捨てるかではなく、何を前に出すか</p>

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
          <p style="margin-bottom:8px;">選ばなかったものも、全部あなたの財産<br>必要なときに、裏側で使えばいい</p>
          <div class="sheet__tags">${rest.map((r) => `<span class="sheet__tag">${esc(r)}</span>`).join("")}</div>
          <p class="big-quote" style="margin-top:16px; font-size:16px;">裏で総力戦<br>表はシンプル</p>
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
      if (state.d5_categories.length === 0) { showWarn("warn5", "使うものを、最低ひとつ選んでみよう"); return; }
      if (!state.d5_primary) { showWarn("warn5", "表に出す主役を、ひとつ選んでみよう"); return; }
      goNextDoor(5);
    });
  }

  function buildConceptFragmentText() {
    if (!state.d5_primary) return "";
    // 長文が入力されても資料のレイアウトが壊れないよう、各断片は短く丸める
    const cap = (s, max) => {
      const t = (s || "").trim().replace(/\s+/g, " ");
      return t.length > max ? t.slice(0, max - 1) + "…" : t;
    };
    const who = cap(state.d1_situation || state.d1_moment, 34) || "この人";
    const wall = cap(state.d2_pain || state.d2_wish, 34) || "その壁";
    const future = cap(state.d3_action || state.d3_scene, 34) || "その未来";
    const story = cap(state.d4_turning_used || state.d4_why, 34) || "私の経験";
    const support = state.d5_supporting.length ? state.d5_supporting.join("と") : "";
    return `私は
${who}の
「${wall}」という壁を
「${state.d5_primary}」を主役に${support ? `\n「${support}」も使いながら` : ""}
「${future}」という未来へ連れていく

その背景には
「${story}」という私の物語がある`;
  }

  function buildConceptFragmentHtml() {
    const text = buildConceptFragmentText();
    if (!text) return "";
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
        <p class="step-desc">ここまでで、誰に・どんな悩みを・どんな未来へ・何を使って届けるかが見えてきました<br>次は、お客様が実際にどんな形でこの商品を受けるのかを決めます</p>

        <p class="step-question">① 何人くらいに届ける？</p>
        <div class="choice-grid">${sizeCards}</div>
        <div class="note-box">講座・セッション・レッスンという名前は、まだ決めなくてOK<br>1人でも講座はできます<br>10人でもグループセッションはできます<br><br>大切なのは呼び方ではなく、誰に・どんな関わり方で・行き先まで届けるか<br><br>はじめて商品を届ける人は、最初から大人数にしなくても大丈夫<br>1対1や少人数だと、お客様がどこで困るのか・何を喜ぶのかがよく見えます<br>まず近くで届ける→磨く→人数を増やす<br>商品を育ててから大きくしても遅くありません</div>

        <p class="step-question" style="margin-top:26px;">② どこで届ける？</p>
        <div class="choice-grid">${placeCards}</div>
        <div class="inline-input" id="d6PlaceOtherWrap" ${state.d6_place === "その他" ? "" : "hidden"}>
          <input type="text" id="d6_place_other" placeholder="どこで届けるか入力" value="${esc(state.d6_place_other)}">
        </div>

        <p class="step-question" style="margin-top:26px;">③ 一緒にいる時間に何をする？</p>
        <p class="step-desc">お客様が未来へ進むために、あなたと一緒にやることを選びます<br>必要なものだけでOK</p>
        <div class="choice-grid">${duringCards}</div>
        <div class="inline-input" id="d6DuringOtherWrap" ${state.d6_during.includes("その他") ? "" : "hidden"}>
          <input type="text" id="d6_during_other" placeholder="その他の内容を入力" value="${esc(state.d6_during_other)}">
        </div>

        <p class="step-question" style="margin-top:26px;">④ 会っていない時間に何を支える？</p>
        <p class="step-desc">セッションやレッスンの間にも実践してほしい場合は、必要なものだけ追加します</p>
        <div class="choice-grid">${betweenCards}</div>
        <div class="inline-input" id="d6BetweenOtherWrap" ${state.d6_between.includes("その他") ? "" : "hidden"}>
          <input type="text" id="d6_between_other" placeholder="その他の内容を入力" value="${esc(state.d6_between_other)}">
        </div>

        <div class="note-box">盛りすぎ注意<br>資料も動画もLINEも宿題も、全部つけなくて大丈夫<br><br>豪華に見えるかではなく、お客様が行き先にたどり着くために本当に必要か？　それだけで選ぼう</div>
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
      if (!state.d6_size) { showWarn("warn6", "何人くらいに届けるか選んでみよう"); return; }
      if (!state.d6_place) { showWarn("warn6", "どこで届けるか選んでみよう"); return; }
      goNextDoor(6);
    });
  }

  /* ---------------------------------------------------------
     ちょっと社会科見学👀（扉にはカウントしない軽い一歩・扉6のあと）
  --------------------------------------------------------- */
  function renderMarket() {
    const examplePlaceholders = [
      "例）誰に届けている？　何を届けている？　どんな形？　価格は？　どんな見せ方をしている？",
      "例）誰に届けている？　何を届けている？　どんな形？　価格は？　どんな見せ方をしている？",
      "例）誰に届けている？　何を届けている？　どんな形？　価格は？　どんな見せ方をしている？",
    ];
    const rows = state.market_examples.map((v, i) => `
      <div class="field" style="margin-top:${i === 0 ? 0 : 16}px;">
        <label class="field__label">似ている商品・サービス　その${i + 1}（任意）</label>
        <textarea id="market_ex_${i}" placeholder="${esc(examplePlaceholders[i])}" style="min-height:90px;">${esc(v)}</textarea>
      </div>`).join("");
    return `
    <div class="card">
      ${doorMascot()}
      <span class="eyebrow">ちょっと社会科見学👀</span>
      <h2 class="step-title">同じような商品を、2〜3個のぞいてみよう</h2>
      <p class="step-desc">これは正解探しではなく、社会科見学です<br><br>売れている人の正解を探すことでも<br>競合を真似することでもなく<br><br>あなたの妄想を<br>現実世界とつなげてみる時間です</p>
      ${rows}
      <div class="field" style="margin-top:22px;">
        <label class="field__label">見てみて、自分の商品に取り入れたいことは？</label>
        <textarea id="market_takeaway" placeholder="例）写真の見せ方が分かりやすかった">${esc(state.market_takeaway)}</textarea>
      </div>
      <div class="field">
        <label class="field__label">逆に、私はこうしたいと思ったことは？</label>
        <textarea id="market_diff" placeholder="例）もっと価格をシンプルに見せたい">${esc(state.market_diff)}</textarea>
      </div>
      <div class="nav-row" style="margin-top:22px;">
        <button class="btn btn--ghost" id="marketBackBtn" type="button">← 前へ</button>
        <button class="btn btn--primary" id="marketNextBtn" type="button">次へ →</button>
      </div>
      <div class="restart-row"><button id="restartBtn" type="button">最初からやり直す</button></div>
    </div>`;
  }
  function bindMarket() {
    state.market_examples.forEach((_, i) => {
      qs(`#market_ex_${i}`).addEventListener("input", (e) => { state.market_examples[i] = e.target.value; saveState(); });
    });
    qs("#market_takeaway").addEventListener("input", (e) => { state.market_takeaway = e.target.value; saveState(); });
    qs("#market_diff").addEventListener("input", (e) => { state.market_diff = e.target.value; saveState(); });
    qs("#marketBackBtn").addEventListener("click", () => { state.doorIndex = 6; state.screen = "door"; saveState(); render(); });
    qs("#restartBtn").addEventListener("click", openResetModal);
    qs("#marketNextBtn").addEventListener("click", () => {
      state.doorIndex = 7;
      state.screen = "door";
      saveState();
      render();
    });
  }

  /* ---------------------------------------------------------
     扉7｜行き先までの道のりをつくる
  --------------------------------------------------------- */
  const D7_DURATION_OPTIONS = ["", "30分", "45分", "60分", "90分", "120分", "まだ決めなくてOK"];

  // 扉6で選んだ「一緒にいる時間／会っていない時間」の内容ごとに、回数・時間を入力する対象を作る
  function d7SupportItems() {
    const items = [];
    (state.d6_during || []).forEach((v) => {
      if (v === "その他") { if (state.d6_during_other.trim()) items.push(state.d6_during_other.trim()); }
      else items.push(v);
    });
    (state.d6_between || []).forEach((v) => {
      if (v === "特になし") return;
      if (v === "その他") { if (state.d6_between_other.trim()) items.push(state.d6_between_other.trim()); }
      else items.push(v);
    });
    return items;
  }
  function d7ItemValue(item) {
    return state.d7_item_counts[item] || { count: "", duration: "" };
  }
  function d7ItemSummaryLine() {
    return d7SupportItems()
      .map((item) => {
        const v = d7ItemValue(item);
        if (!v.count) return "";
        const dur = v.duration && v.duration !== "まだ決めなくてOK" ? `・${v.duration}` : "";
        return `${item}［${v.count}回${dur}］`;
      })
      .filter(Boolean)
      .join("　");
  }

  function renderDoor7() {
    const recap = recapCard("ここまでの道しるべ", [
      { label: "現在地", value: state.d1_moment },
      { label: "問題の根っこ", value: state.d2_pain },
      { label: "行き先", value: state.d3_action },
      { label: "届け方", value: [state.d6_size, state.d6_place].filter(Boolean).join(" / ") },
    ]);
    const items = d7SupportItems();
    const itemRows = items.length ? items.map((item, i) => {
      const v = d7ItemValue(item);
      return `
      <div class="d7-item-row">
        <p class="d7-item-row__label">${esc(item)}</p>
        <div class="d7-item-row__controls">
          <label class="d7-item-row__field">回数
            <input type="text" inputmode="numeric" class="d7-item-count" data-item="${esc(item)}" placeholder="例）6" value="${esc(v.count)}">回
          </label>
          <label class="d7-item-row__field">1回の時間
            <select class="d7-item-duration" data-item="${esc(item)}">
              ${D7_DURATION_OPTIONS.map((d) => `<option value="${esc(d)}" ${v.duration === d ? "selected" : ""}>${d ? esc(d) : "（選ぶ）"}</option>`).join("")}
            </select>
          </label>
        </div>
      </div>`;
    }).join("") : `
      <p class="hint">扉6で「一緒にいる時間・会っていない時間」に何をするかを選ぶと、ここに回数の入力欄が出てきます</p>`;

    return doorShell({
      n: 7, title: "行き先までの道のりをつくる",
      bodyHtml: `
        ${recap}
        <p class="step-desc">その未来まで行くために、何を知る？　何をやる？　何ができるようになる？<br>必要な順番を、小さく分けてみます</p>

        <p class="step-question">行き先までに必要なことを、最大4つ</p>
        <div class="field"><input type="text" id="d7_step_0" placeholder="① まず" value="${esc(state.d7_steps[0])}"></div>
        <div class="field"><input type="text" id="d7_step_1" placeholder="② 次に" value="${esc(state.d7_steps[1])}"></div>
        <div class="field"><input type="text" id="d7_step_2" placeholder="③ その次に" value="${esc(state.d7_steps[2])}"></div>
        <div class="field"><input type="text" id="d7_step_3" placeholder="④ 必要なら" value="${esc(state.d7_steps[3])}"></div>
        <p class="hint">全部埋めなくてOK</p>

        <p class="step-question" style="margin-top:26px;">扉6で選んだ内容ごとに、何回くらい必要そう？</p>
        <div class="d7-item-list">${itemRows}</div>
        <div class="note-box">書いた数＝回数ではありません<br>1回でいくつか進んでもOK<br>実践する時間が必要なら、次回まで間を空けてもOK<br><br>行き先まで、本当に必要な回数だけ<br>豪華に見せるために増やさない🤣</div>
      `,
      warnId: "warn7",
    });
  }
  function bindDoor7() {
    [0, 1, 2, 3].forEach((i) => {
      qs(`#d7_step_${i}`).addEventListener("input", (e) => { state.d7_steps[i] = e.target.value; saveState(); });
    });
    qsa(".d7-item-count").forEach((el) => {
      el.addEventListener("input", () => {
        const item = el.dataset.item;
        state.d7_item_counts[item] = Object.assign({ count: "", duration: "" }, state.d7_item_counts[item], { count: el.value });
        saveState();
      });
    });
    qsa(".d7-item-duration").forEach((el) => {
      el.addEventListener("change", () => {
        const item = el.dataset.item;
        state.d7_item_counts[item] = Object.assign({ count: "", duration: "" }, state.d7_item_counts[item], { duration: el.value });
        saveState();
      });
    });

    qs("#nextBtn").addEventListener("click", () => {
      if (!state.d7_steps.some((s) => s.trim())) { showWarn("warn7", "行き先までの道のりを、ひとつだけでも書いてみよう"); return; }
      const items = d7SupportItems();
      if (items.length && !items.some((item) => d7ItemValue(item).count)) {
        showWarn("warn7", "何回くらい必要そうか、ひとつだけでも入力してみよう");
        return;
      }
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

  function d8TimeTotal() {
    const weekly = Number(state.d8_weekly_hours) || 0;
    const weeks = Number(state.d8_period_weeks) || 0;
    return weekly * weeks;
  }
  function d8TimeTotalLabel() {
    const total = d8TimeTotal();
    return total > 0 ? `約${total}時間` : "-";
  }

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
        <p class="step-desc">いきなり金額を決めなくて大丈夫<br>価格を考えるときは、まず3つの価値から見てみよう</p>

        <p class="step-question">① あなたが使う時間と労力</p>
        <p class="step-desc">お客様と直接話す時間だけが仕事ではありません</p>
        <div class="choice-grid">${timeCards}</div>
        <div class="d8-time-calc">
          <div class="d8-time-calc__row">
            <label class="field__label">1週間あたり、ひとりのお客様にどのくらい時間を使いそう？</label>
            <div class="d8-time-calc__input"><input type="text" inputmode="numeric" id="d8_weekly_hours" placeholder="例）2" value="${esc(state.d8_weekly_hours)}"><span>時間 / 週</span></div>
          </div>
          <div class="d8-time-calc__row">
            <label class="field__label">それが何週間くらい続きそう？</label>
            <div class="d8-time-calc__input"><input type="text" inputmode="numeric" id="d8_period_weeks" placeholder="例）8" value="${esc(state.d8_period_weeks)}"><span>週間</span></div>
          </div>
          <div class="d8-time-calc__total">
            <span>合計のめやす</span>
            <strong id="d8TimeTotal">${esc(d8TimeTotalLabel())}</strong>
          </div>
        </div>
        <div class="field">
          <label class="field__label">その時間と労力に対して、正直これくらいはいただきたい金額</label>
          <input type="text" id="d8_min_price" placeholder="¥" value="${esc(state.d8_min_price)}">
        </div>

        <p class="step-question" style="margin-top:26px;">② あなたが渡している知識・経験・技術</p>
        <div class="note-box">あなたがそこまで来るために、学んできたこと・資格・専門技術・お金をかけて身につけたこと・何年も積み重ねた経験・失敗してわかったこと・お客様を支えてきた実績があります<br><br>あなたが何年もかけて得たものを、お客様はショートカットして受け取れる<br>その価値も、忘れないでね</div>

        <p class="step-question" style="margin-top:26px;">③ お客様が手にする未来の価値</p>
        <div class="choice-grid">${futureCards}</div>

        <p class="step-question" style="margin-top:26px;">今回の価格を決めよう</p>
        <p class="step-desc">安いから売れる、ではありません<br>高ければ価値がある、でもありません<br>今のあなたが「この内容なら、この価格で喜んで届けたい」と思える金額を、まず決めよう</p>
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
        <div class="note-box">これは最終価格じゃなくていい<br>まず届ける▶︎お客様の反応を見る▶︎商品を磨く▶︎実績が増える<br>そのたびに、価格を見直していい</div>
      `,
      warnId: "warn8",
    });
  }
  function bindDoor8() {
    qsa('input[name="d8_time"]').forEach((cb) => {
      cb.addEventListener("change", () => { state.d8_time_checks = qsa('input[name="d8_time"]').filter((b) => b.checked).map((b) => b.value); saveState(); });
    });
    qs("#d8_weekly_hours").addEventListener("input", (e) => {
      state.d8_weekly_hours = e.target.value;
      qs("#d8TimeTotal").textContent = d8TimeTotalLabel();
      saveState();
    });
    qs("#d8_period_weeks").addEventListener("input", (e) => {
      state.d8_period_weeks = e.target.value;
      qs("#d8TimeTotal").textContent = d8TimeTotalLabel();
      saveState();
    });
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
      if (!state.d8_price || Number(state.d8_price) <= 0) { showWarn("warn8", "価格を決めてみよう（プリセットか自由入力で）"); return; }
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
      n: 9, badge: "扉9", title: "我が子に、最初の名前を",
      bodyHtml: `
        <p class="step-desc">ここまで一生懸命考えてきた商品<br>誰を助けたいか、どんな壁を越えるか、どんな未来へ連れていくか、なぜ私が届けるのか、何を使って、どう届けるのか<br><br>少しずつ、ひとつの商品になってきました<br>ここで一度、この我が子に名前をつけてみよう</p>

        <div class="note-box">名前は、かっこよさより伝わりやすさ<br><br>ありがちなのが、謎の英語・聞いたことのない造語・自分だけ気分が上がる自己満ポエムタイトル🤣<br><br>でも、お客様が見た瞬間に「何のサービス？」「私に関係ある？」「どうなれるの？」がわからなければもったいない<br><br>誰のための商品か・何が変わるのか・どんな行き先へ行けるのかこのどれかが伝わる名前を考えてみよう</div>

        <p class="step-question">名前をつける前の3チェック</p>
        <div class="choice-grid">
          ${D9_CHECK_LABELS.map((label, i) => `
            <label class="checklist-item"><input type="checkbox" data-d9check="${i}" ${state.d9_check[i] ? "checked" : ""}><span>${esc(label)}</span></label>`).join("")}
        </div>

        <div class="field" style="margin-top:20px;">
          <label class="field__label">今、この商品につけるなら、どんな名前？</label>
          <input type="text" id="d9_name" placeholder="例）朝のイライラが手放せる、親子の言葉がけレッスン" value="${esc(state.d9_name)}">
        </div>
        <p class="hint">仮タイトルでOK<br>届けているうちに、もっといい名前が降りてきたら変えていい<br>今は、まず呼べる名前をつけよう</p>
        <p class="big-quote" style="font-size:17px;">あなたが好きな名前　×　お客様に伝わる名前<br>その真ん中を探そう</p>
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
      if (!requireText(state.d9_name, "warn9", "仮の名前でいいので、つけてみよう")) return;
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
        <p class="step-desc">ここまでで、あなたの魂商品がカタチになりました<br>最後にもうひとつ<br><br>同じような商品やサービスがあったとしても、あなたから受けたい理由はどこにある？<br><br>ここでは、商品を支えている事実・経験・情熱を集めます<br>資格の数を競うページではありません<br>お客様が安心して「あなたにお願いしたい」と思える材料を見つけます</p>

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
        <p class="step-desc">実績がまだ少なくても大丈夫<br>今のあなたが、お客様に約束できることは何？</p>
        <div class="choice-grid">${promiseCards}</div>
        <div class="field" style="margin-top:14px;">
          <label class="field__label">私がお客様に約束すること</label>
          <textarea id="d10_promise" placeholder="自由記入">${esc(state.d10_promise)}</textarea>
        </div>

        <p class="big-quote">あなたの商品を選ぶ理由は、資格ひとつ、実績ひとつではありません<br>歩いてきた道・身につけた力・積み重ねた事実・そして届けたいという情熱<br>その全部が、あなたの信用になる</p>
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
      if (!requireText(state.d10_passion, "warn10", "それでも届けたい理由を書いてみよう")) return;
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

      const core = `今回の回答を見ると、軸になっているのは「${primary}」\n${who ? `そして届けたい相手は、${who}` : ""}\nここがブレていないから、他がまだ粗くても十分伝わる`;

      const frontValue = `一番前に出すなら「${primary}」\n${supporting ? `「${supporting}」は、名前で説明するより「一緒にやってみたらこうなった」で見せる方が伝わりやすそう` : "支えるチカラが決まると、説明がもっと短くなる"}`;

      const conceptCore = wall && future
        ? `「${wall}」という壁を、「${primary}」で越えて、「${future}」まで連れていく\nこの組み合わせが、今回のコンセプトの核になりそう`
        : `扉2・扉3の回答が増えるほど、コンセプトの核はもっとくっきりしてくるはず`;

      const restCount = (s.d5_categories || []).length - 1 - (s.d5_supporting ? s.d5_supporting.length : 0);
      const diffSeed = restCount > 0
        ? `裏に${restCount}個、まだ表に出していない力がある\nここが、他の商品との違いになる種かもしれない`
        : `扉5で選んだ「${primary}」の掛け合わせ自体が、あなたにしかできない組み合わせ`;

      const overload = [];
      if ((s.d6_during || []).length >= 5) overload.push("一緒にいる時間にやること");
      if ((s.d6_between || []).length >= 4) overload.push("会っていない時間のサポート");
      if ((s.d5_categories || []).length >= 6) overload.push("使うスキル・経験");
      const overloadText = overload.length
        ? `正直、盛り込みすぎてる可能性があるのは「${overload.join("」「")}」\n全部やらなくていい\nまずは「${primary}」が生きる分だけで十分`
        : `今のところ、盛り込みすぎている感じはしない\nこのくらいの分量が、お客様にも伝わりやすい`;

      const entryPoint = s.d1_moment
        ? `お客様に伝わりやすい入口は「${s.d1_moment}」という場面\nここから始まる話は、多くの人が「わかる」って言いそう`
        : `扉1の「困っている場面」が具体的になるほど、入口はもっと見つけやすくなる`;

      const wordSeed = s.d1_words
        ? `お客様の心に届きそうな言葉の種は「${s.d1_words}」\nこの言葉、そのまま商品の説明文に使えそう`
        : `扉1で拾った「その人の言葉」が、そのまま一番刺さるコピーになることが多い`;

      const nameHint = s.d9_name
        ? (/^[a-zA-Z\s]+$/.test(s.d9_name.trim())
            ? `商品名「${s.d9_name}」は、英語だけだと少し伝わりにくいかも\n日本語で「誰の・何が変わる」を一言足すと、もっと入口が広くなりそう`
            : `商品名「${s.d9_name}」、悪くない${future ? `\n「${future}」が一言入ると、さらに伝わりやすくなるかも` : ""}`)
        : `扉9で名前が決まると、ここにもヒントが出せる`;

      const nextStep = `爆速1ミリでやるなら、扉1で見つけた「${s.d1_moment || "その人が困っている場面"}」を、そのままひとこと誰かに話してみること\n反応があった言葉が、次の一歩の答えになる`;

      // チョッピーは採点する先生ではなく伴走者。売れることは保証せず、断定もしない。
      // 既存の分析結果（本人の入力を再構成しただけで、AIが事実を創作していないもの）を、
      // 「① 素敵なところ／② くっきりさせるならここ／③ 最初に確かめてみたいこと」の3つに整理する。
      const nice = `${core}\n\n${frontValue}\n\n${diffSeed}`;
      const sharpen = `${conceptCore}\n\n${overloadText}\n\n${nameHint}`;
      const tryFirst = `${entryPoint}\n\n${wordSeed}\n\n${nextStep}`;

      return [
        { label: "① この商品の素敵なところ", body: nice },
        { label: "② もっとくっきりさせるならここ", body: sharpen },
        { label: "③ 最初に確かめてみたいこと", body: tryFirst },
      ];
    },
  };

  /* ---------------------------------------------------------
     6-2. 横A4詳細資料（デッキ）
     - 1枚完成シートとは別物。10の扉の内容を、写真＋短いコピー＋本文で
       複数ページの簡易プレゼン資料に再構成する。
     - 原文（state.dX_xxx）は絶対に書き換えない。表示用の文章は
       state.deck.overrides に別データとして保持する（originalAnswer /
       deckText の分離）。
  --------------------------------------------------------- */

  // ルールベースの文章整理（summarizeForDeck）。外部AI APIは使用しない。
  // 将来、安全なサーバーサイドAIに差し替えるときは、この関数の中身だけを
  // 差し替えれば良い構造にしている（意味を変える整理はしない）。
  function cleanupText(str) {
    return (str || "").trim().replace(/\n{3,}/g, "\n").replace(/[ \t]+/g, " ");
  }
  function truncateText(str, max) {
    const s = cleanupText(str);
    if (s.length <= max) return s;
    return s.slice(0, max - 1).trim() + "…";
  }
  const summarizeForDeck = {
    big(text, max) { return truncateText(text, max || 46); },
    body(parts, max) {
      const joined = parts.filter((p) => p && p.trim()).map(cleanupText).join("　");
      return truncateText(joined, max || 170);
    },
  };

  const DECK_PAGES = [
    { key: "cover", label: "表紙", photo: true },
    { key: "who", label: "この商品を届けたい人", photo: true },
    { key: "wall", label: "越える壁", photo: true },
    { key: "future", label: "連れていく未来", photo: true },
    { key: "story1", label: "私が届ける理由（ビフォー）", photo: true },
    { key: "story2", label: "私が届ける理由（アフター）", photo: true },
    { key: "power", label: "この商品で使うチカラ", photo: false },
    { key: "delivery", label: "届け方", photo: true },
    { key: "journey", label: "行き先までの道のり", photo: false },
    { key: "product", label: "商品", photo: false },
    { key: "trust", label: "私から買う理由", photo: true },
    { key: "closing", label: "まとめ", photo: false },
  ];

  const DECK_MASCOT_BY_PAGE = {
    wall: "assets/mascot-devil.png",
    future: "assets/mascot-angel.png",
  };

  function deckOverride(pageKey, field) {
    const ov = state.deck.overrides[pageKey];
    return ov && ov[field] ? ov[field] : "";
  }
  function setDeckOverride(pageKey, field, value) {
    if (!state.deck.overrides[pageKey]) state.deck.overrides[pageKey] = {};
    state.deck.overrides[pageKey][field] = value;
    saveState();
  }
  function clearDeckOverride(pageKey) {
    delete state.deck.overrides[pageKey];
    saveState();
  }
  function deckPhoto(pageKey) { return state.deck.photos[pageKey] || ""; }

  function buildDeckContent(pageKey) {
    const productName = state.d9_name || "（仮）魂商品";
    let big = "", body = "", cards = null;

    switch (pageKey) {
      case "cover":
        big = productName;
        body = summarizeForDeck.body([state.d3_action || state.d1_moment], 60);
        break;
      case "who":
        big = summarizeForDeck.big(state.d1_words || state.d1_moment, 40);
        body = summarizeForDeck.body([state.d1_situation, state.d1_moment]);
        break;
      case "wall":
        big = summarizeForDeck.big(state.d2_pain, 42);
        body = summarizeForDeck.body([state.d2_wish]);
        break;
      case "future":
        cards = [
          { label: "内面の変化", value: truncateText(state.d3_inner, 60) },
          { label: "できるようになること", value: truncateText(state.d3_action, 60) },
          { label: "現実・生活の変化", value: truncateText(state.d3_reality, 60) },
          { label: "まわりの言葉", value: truncateText(state.d3_voice, 60) },
        ].filter((c) => c.value);
        big = summarizeForDeck.big(state.d3_scene || state.d3_action, 46);
        break;
      case "story1":
        big = summarizeForDeck.big(state.d4_before, 42);
        body = summarizeForDeck.body([state.d4_turning_used || state.d4_turning.filter(Boolean).join("、")]);
        break;
      case "story2":
        big = summarizeForDeck.big(state.d4_why, 42);
        body = summarizeForDeck.body([state.d4_journey, state.d4_after]);
        break;
      case "power":
        cards = [
          { label: "表に出す主役", value: state.d5_primary },
          { label: "支えるチカラ", value: state.d5_supporting.join("・") },
          { label: "裏側で使うもの", value: state.d5_categories.filter((c) => c !== state.d5_primary && !state.d5_supporting.includes(c)).join("・") },
        ].filter((c) => c.value);
        break;
      case "delivery":
        big = summarizeForDeck.big([state.d6_size, state.d6_place === "その他" ? state.d6_place_other : state.d6_place].filter(Boolean).join("・"), 40);
        body = summarizeForDeck.body([
          state.d6_during.length ? `一緒にいる時間：${state.d6_during.join("・")}` : "",
          state.d6_between.length ? `会っていない時間：${state.d6_between.join("・")}` : "",
        ], 170);
        break;
      case "journey":
        cards = state.d7_steps.filter((s) => s.trim()).map((s, i) => ({ label: `STEP ${i + 1}`, value: truncateText(s, 50) }));
        body = summarizeForDeck.body([d7ItemSummaryLine()], 60);
        break;
      case "product":
        big = productName;
        body = `¥${(Number(state.d8_price) || 0).toLocaleString()}`;
        break;
      case "trust":
        cards = state.d10_facts_detail.filter((f) => f.trim()).map((f) => ({ label: "支える事実", value: truncateText(f, 50) }));
        big = summarizeForDeck.big(state.d10_passion, 46);
        body = summarizeForDeck.body([state.d10_promise]);
        break;
      case "closing":
        big = `${productName}\n完成`;
        body = summarizeForDeck.body([state.d4_why, state.d10_passion], 140);
        break;
    }

    return {
      big: deckOverride(pageKey, "big") || big,
      body: deckOverride(pageKey, "body") || body,
      cards,
    };
  }

  function deckPageHasContent(key) {
    switch (key) {
      case "cover": return true;
      case "who": return !!(state.d1_situation || state.d1_moment || state.d1_words);
      case "wall": return !!(state.d2_pain || state.d2_wish);
      case "future": return !!(state.d3_inner || state.d3_action || state.d3_reality || state.d3_voice);
      case "story1": return !!(state.d4_before || state.d4_turning_used);
      case "story2": return !!(state.d4_journey || state.d4_after || state.d4_why);
      case "power": return state.d5_categories.length > 0;
      case "delivery": return !!(state.d6_size || state.d6_place);
      case "journey": return state.d7_steps.some((s) => s.trim()) || !!d7ItemSummaryLine();
      case "product": return true;
      case "trust": return !!(state.d10_passion || state.d10_facts_detail.some((f) => f.trim()));
      case "closing": return true;
      default: return false;
    }
  }

  const DECK_LABELS = { who: "WHO｜対象者", wall: "WALL｜越える壁", story1: "STORY｜ビフォー", story2: "STORY｜アフター", delivery: "DELIVERY｜届け方" };

  function renderDeckPageInner(key) {
    const content = buildDeckContent(key);
    const def = DECK_PAGES.find((p) => p.key === key);
    const photoUrl = def.photo ? deckPhoto(key) : "";
    const mascotSrc = DECK_MASCOT_BY_PAGE[key];
    const mascotHtml = mascotSrc ? `<img src="${mascotSrc}" alt="" class="deck-page__mascot-corner">` : "";

    let inner = "";

    if (key === "cover") {
      const coverPhoto = photoUrl || state.photo;
      inner = coverPhoto ? `
        <div class="tpl-photo-text">
          <div class="tpl-photo-text__photo tpl-photo-text__photo--wide"><img class="tpl-photo-text__img" src="${coverPhoto}" alt=""></div>
          <div class="tpl-photo-text__text" style="text-align:center;">
            <img src="assets/mascot-trio.png" alt="" style="width:84px;height:auto;margin:0 auto 16px;">
            <p class="sheet__eyebrow">MY SOUL PRODUCT DECK</p>
            <h1 class="sheet__name" style="font-size:32px;">${esc(content.big)}</h1>
            <p class="sheet__value" style="text-align:center;">${esc(content.body)}</p>
          </div>
        </div>` : `
        <div class="tpl-center">
          <img src="assets/mascot-trio.png" alt="" style="width:110px;height:auto;margin:0 auto 22px;">
          <p class="sheet__eyebrow">MY SOUL PRODUCT DECK</p>
          <h1 class="tpl-center__big">${esc(content.big)}</h1>
          <p class="tpl-center__caption">${esc(content.body)}</p>
        </div>`;
    } else if (key === "future") {
      inner = photoUrl ? `
        <div class="tpl-full-photo">
          <img class="tpl-full-photo__img" src="${photoUrl}" alt="">
          <div class="tpl-full-photo__overlay"><p class="tpl-full-photo__caption">${esc(content.big)}</p></div>
        </div>` : `
        <p class="sheet__eyebrow">FUTURE｜連れていく未来</p>
        <h2 class="deck-page__heading">${esc(content.big) || "連れていく未来"}</h2>
        <div class="tpl-cards">
          ${(content.cards || []).map((c) => `<div class="tpl-cards__card"><p class="tpl-cards__label">${esc(c.label)}</p><p class="tpl-cards__value">${esc(c.value)}</p></div>`).join("") || `<p class="tpl-center__caption">まだ入力がありません</p>`}
        </div>`;
    } else if (key === "power") {
      const conceptText = buildConceptFragmentText();
      inner = `
        <p class="sheet__eyebrow">WHAT I USE｜この商品で使うチカラ</p>
        <h2 class="deck-page__heading">使うチカラ</h2>
        <div class="tpl-cards tpl-cards--2">
          ${(content.cards || []).map((c) => `<div class="tpl-cards__card"><p class="tpl-cards__label">${esc(c.label)}</p><p class="tpl-cards__value">${esc(c.value)}</p></div>`).join("")}
        </div>
        ${conceptText ? `<p class="tpl-center__caption" style="margin-top:20px;">${nl2br(conceptText)}</p>` : ""}`;
    } else if (key === "journey") {
      inner = `
        <p class="sheet__eyebrow">JOURNEY｜行き先までの道のり</p>
        <h2 class="deck-page__heading">行き先までの道のり</h2>
        <div class="tpl-cards tpl-cards--2">
          ${(content.cards || []).map((c) => `<div class="tpl-cards__card"><p class="tpl-cards__label">${esc(c.label)}</p><p class="tpl-cards__value">${esc(c.value)}</p></div>`).join("") || `<p class="tpl-center__caption">まだ入力がありません</p>`}
        </div>
        <p class="tpl-center__caption" style="margin-top:18px;">${esc(content.body)}</p>`;
    } else if (key === "product") {
      inner = `
        <div class="tpl-center">
          <p class="sheet__eyebrow">MY SOUL PRODUCT</p>
          <h2 class="tpl-center__big">${esc(content.big)}</h2>
          <div class="sheet__price" style="margin-top:22px; min-width:280px;">
            <div class="sheet__price-label">PRICE</div>
            <div class="sheet__price-value">${esc(content.body)}</div>
          </div>
        </div>`;
    } else if (key === "trust") {
      inner = photoUrl ? `
        <div class="tpl-photo-text">
          <div class="tpl-photo-text__photo"><img class="tpl-photo-text__img" src="${photoUrl}" alt=""></div>
          <div class="tpl-photo-text__text">
            <p class="sheet__eyebrow">TRUST｜私から買う理由</p>
            <p class="deck-page__statement deck-page__statement--left" style="font-size:26px;">${esc(content.big)}</p>
            ${content.body ? `<p class="sheet__value" style="margin-top:14px;">${esc(content.body)}</p>` : ""}
          </div>
        </div>` : `
        <p class="sheet__eyebrow">TRUST｜私から買う理由</p>
        <h2 class="deck-page__heading">${esc(content.big) || "私から買う理由"}</h2>
        <div class="tpl-cards tpl-cards--2">
          ${(content.cards || []).map((c) => `<div class="tpl-cards__card"><p class="tpl-cards__label">${esc(c.label)}</p><p class="tpl-cards__value">${esc(c.value)}</p></div>`).join("")}
        </div>
        ${content.body ? `<p class="tpl-center__caption" style="margin-top:18px;">${esc(content.body)}</p>` : ""}`;
    } else if (key === "closing") {
      inner = `
        <div class="tpl-center">
          <img src="assets/mascot-trio.png" alt="" style="width:100px;height:auto;margin:0 auto 20px;">
          <p class="sheet__eyebrow">THANK YOU</p>
          <h2 class="tpl-center__big">${nl2br(content.big)}</h2>
          <p class="tpl-center__caption">${esc(content.body)}</p>
        </div>`;
    } else {
      const label = DECK_LABELS[key] || "";
      if (photoUrl) {
        const reverse = ["wall", "story2"].includes(key);
        inner = `
          <p class="sheet__eyebrow">${esc(label)}</p>
          <div class="tpl-photo-text${reverse ? " tpl-photo-text--reverse" : ""}">
            <div class="tpl-photo-text__photo"><img class="tpl-photo-text__img" src="${photoUrl}" alt=""></div>
            <div class="tpl-photo-text__text">
              <p class="deck-page__statement deck-page__statement--left" style="font-size:28px;">${esc(content.big)}</p>
              ${content.body ? `<p class="sheet__value" style="margin-top:14px;">${esc(content.body)}</p>` : ""}
            </div>
          </div>`;
      } else {
        inner = `
          <p class="sheet__eyebrow">${esc(label)}</p>
          <div class="tpl-center">
            <h2 class="tpl-center__big">${esc(content.big)}</h2>
            ${content.body ? `<p class="tpl-center__caption">${esc(content.body)}</p>` : ""}
          </div>`;
      }
    }

    return inner + mascotHtml;
  }

  function buildDeckPages() {
    const tpl = state.sheetTemplate || "natural";
    const visiblePages = DECK_PAGES.filter((p) => deckPageHasContent(p.key) && !state.deck.hidden.includes(p.key));
    const total = visiblePages.length;
    return {
      total,
      pages: visiblePages,
      html: visiblePages.map((p, i) => `
        <div class="a4-shell" data-deck-page="${p.key}">
          <div class="a4-page sheet sheet--${tpl}" data-page="${i + 1}">
            ${renderDeckPageInner(p.key)}
            <p class="a4-page__pageno">${i + 1} / ${total}</p>
          </div>
        </div>`).join(""),
    };
  }

  function renderDeckPhotoControls(pageKey) {
    const has = !!deckPhoto(pageKey);
    return `
      <div class="deck-photo-row__actions">
        <label class="btn btn--outline-gold btn--sm" for="deckPhoto_${pageKey}" style="display:inline-block;cursor:pointer;">${has ? "写真を変更" : "写真を追加"}</label>
        <input type="file" id="deckPhoto_${pageKey}" data-deck-photo-key="${pageKey}" accept="image/*" style="display:none;">
        ${has ? `<button type="button" class="btn btn--ghost btn--sm" data-deck-photo-remove="${pageKey}">削除</button>` : ""}
      </div>`;
  }

  // 完成画面に置く「ご提案書」への導線カード（スタジオは別画面。ここには絶対に本体を並べない）
  function renderDeckIntroCard() {
    const { total } = buildDeckPages();
    return `
    <div class="card deck-intro">
      <span class="eyebrow">実際の相談で使える｜ご提案書</span>
      <h2 class="step-title" style="font-size:19px;">いよいよ、ご提案書の叩き台ができちゃいますよ〜ワクワク</h2>
      <p class="step-desc">ここまでの回答をもとにした、全${total}ページの横A4ご提案書です<br>これは回答をまとめた報告書ではなく、そのままお客様との相談で使える資料の下書きです<br>文章はあとから直せます写真は入れても入れなくても大丈夫</p>
      <div class="note-box">使い方のお約束：ここにある文章は、あなたの回答をもとにした下書きです<br>盛った実績や、言っていない約束を足すことはしません<br>お客様に渡す前に、必ずあなた自身の言葉で読み直してね</div>
      <button class="btn btn--primary" id="openStudioBtn" type="button">ご提案書スタジオを開く</button>
    </div>`;
  }

  // ---- ご提案書スタジオ（PC向け3ペイン編集画面。別スクリーンとして独立） ----
  let studioActivePage = "";
  let studioResizeBound = false;

  function renderStudioEditPanel(pageKey) {
    const content = buildDeckContent(pageKey);
    const hasOverride = !!state.deck.overrides[pageKey];
    const pageInfo = DECK_PAGES.find((p) => p.key === pageKey);
    return `
      <div class="deck-edit-panel deck-edit-panel--studio" data-deck-edit-panel="${pageKey}">
        <p class="studio__edit-title">${esc(pageInfo ? pageInfo.label : "")}</p>
        <div class="deck-edit-panel__row">
          <label class="deck-edit-panel__label">大きく見せる一文</label>
          <textarea data-deck-edit-big="${pageKey}" style="min-height:70px;">${esc(content.big)}</textarea>
        </div>
        <div class="deck-edit-panel__row">
          <label class="deck-edit-panel__label">本文</label>
          <textarea data-deck-edit-body="${pageKey}" style="min-height:120px;">${esc(content.body)}</textarea>
        </div>
        ${renderDeckPhotoControls(pageKey)}
        <div class="deck-edit-panel__actions">
          <button type="button" class="btn btn--primary btn--sm" data-deck-edit-save="${pageKey}">この内容で保存する</button>
          ${hasOverride ? `<button type="button" class="btn btn--ghost btn--sm" data-deck-edit-reset="${pageKey}">元の回答に戻す</button>` : ""}
        </div>
        <hr class="sheet__divider" style="margin:18px 0;">
        <button type="button" class="btn btn--ghost btn--sm" data-studio-toggle-visible="${pageKey}">このページを非表示にする</button>
      </div>`;
  }

  function renderStudio() {
    const tpl = state.sheetTemplate || "natural";
    const { pages } = buildDeckPages();
    const hiddenPages = DECK_PAGES.filter((p) => deckPageHasContent(p.key) && state.deck.hidden.includes(p.key));
    if (!pages.find((p) => p.key === studioActivePage)) {
      studioActivePage = pages[0] ? pages[0].key : "";
    }

    return `
    <div class="studio">
      <div class="studio__topbar">
        <button class="btn btn--ghost btn--sm" id="studioBackBtn" type="button">← 1枚シートに戻る</button>
        <p class="studio__topbar-title">ご提案書スタジオ　全${pages.length}ページ</p>
        <div class="studio__topbar-actions">
          ${SHEET_TEMPLATES.map((t) => `<button type="button" class="template-switch__btn${tpl === t.id ? " is-active" : ""}" data-template-switch="${t.id}">${esc(t.name)}</button>`).join("")}
          <button class="btn btn--primary btn--sm" id="printDeckBtn" type="button">印刷 / PDFで保存</button>
        </div>
      </div>
      <div class="studio__body">
        <aside class="studio__thumbs">
          ${pages.map((p, i) => `
            <div class="studio-thumb${p.key === studioActivePage ? " is-active" : ""}" data-studio-select="${p.key}" role="button" tabindex="0">
              <div class="studio-thumb__frame"><div class="a4-shell"><div class="a4-page sheet sheet--${tpl}">${renderDeckPageInner(p.key)}</div></div></div>
              <div class="studio-thumb__meta"><span class="studio-thumb__no">${i + 1}</span><span class="studio-thumb__label">${esc(p.label)}</span></div>
            </div>`).join("")}
          ${hiddenPages.length ? `
            <div class="studio-thumbs__hidden">
              <p class="hint" style="margin:12px 2px 6px;">非表示（${hiddenPages.length}）</p>
              ${hiddenPages.map((p) => `<button type="button" class="studio-thumb-hidden" data-studio-unhide="${p.key}">${esc(p.label)}　表示に戻す</button>`).join("")}
            </div>` : ""}
        </aside>
        <div class="studio__canvas">
          ${studioActivePage ? `
            <div class="a4-shell" id="studioCanvasShell">
              <div class="a4-page sheet sheet--${tpl}">${renderDeckPageInner(studioActivePage)}</div>
            </div>` : `<p class="hint">まだ表示できるページがありません<br>扉6・扉6以降の内容を入力すると、ここにページが増えていきます</p>`}
        </div>
        <aside class="studio__edit">
          ${studioActivePage ? renderStudioEditPanel(studioActivePage) : ""}
        </aside>
      </div>
    </div>`;
  }

  // 印刷／PDF保存専用：非表示ページを除いた全ページを、印刷用の隠しDOMとして組み立てる
  function buildDeckPrintHtml() {
    const tpl = state.sheetTemplate || "natural";
    const { pages } = buildDeckPages();
    return pages.map((p) => `
      <div class="deck-page-card" data-deck-page-card="${p.key}">
        <div class="a4-shell">
          <div class="a4-page sheet sheet--${tpl}">${renderDeckPageInner(p.key)}</div>
        </div>
      </div>`).join("");
  }

  function scaleStudioPages() {
    qsa(".studio .a4-shell").forEach((shell) => {
      const page = shell.querySelector(".a4-page");
      if (!page) return;
      const scale = shell.clientWidth / 1122;
      page.style.transform = `scale(${scale})`;
    });
  }

  function bindStudio() {
    qs("#studioBackBtn").addEventListener("click", () => {
      state.screen = "complete";
      saveState();
      render();
    });

    if (!studioResizeBound) {
      window.addEventListener("resize", scaleStudioPages);
      window.addEventListener("afterprint", () => {
        document.body.classList.remove("print-mode-deck");
        setPrintOrientation("portrait");
      });
      studioResizeBound = true;
    }
    requestAnimationFrame(scaleStudioPages);

    qs("#printDeckBtn").addEventListener("click", () => {
      let printArea = document.getElementById("deckPrintArea");
      if (!printArea) {
        printArea = document.createElement("div");
        printArea.id = "deckPrintArea";
        document.body.appendChild(printArea);
      }
      printArea.innerHTML = buildDeckPrintHtml();
      document.body.classList.add("print-mode-deck");
      setPrintOrientation("landscape");
      window.print();
    });

    qsa("[data-template-switch]").forEach((btn) => {
      btn.addEventListener("click", () => { state.sheetTemplate = btn.dataset.templateSwitch; saveState(); render(); });
    });

    qsa("[data-studio-select]").forEach((el) => {
      el.addEventListener("click", () => { studioActivePage = el.dataset.studioSelect; render(); });
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); studioActivePage = el.dataset.studioSelect; render(); }
      });
    });
    qsa("[data-studio-unhide]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const key = btn.dataset.studioUnhide;
        state.deck.hidden = state.deck.hidden.filter((k) => k !== key);
        studioActivePage = key;
        saveState();
        render();
      });
    });
    qsa("[data-studio-toggle-visible]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const key = btn.dataset.studioToggleVisible;
        if (!state.deck.hidden.includes(key)) state.deck.hidden.push(key);
        studioActivePage = "";
        saveState();
        showToast("このページを非表示にしました");
        render();
      });
    });

    qsa("[data-deck-edit-save]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const key = btn.dataset.deckEditSave;
        const big = qs(`[data-deck-edit-big="${key}"]`).value;
        const body = qs(`[data-deck-edit-body="${key}"]`).value;
        setDeckOverride(key, "big", big);
        setDeckOverride(key, "body", body);
        showToast("ご提案書に反映しました");
        render();
      });
    });
    qsa("[data-deck-edit-reset]").forEach((btn) => {
      btn.addEventListener("click", () => {
        clearDeckOverride(btn.dataset.deckEditReset);
        showToast("元の回答から作り直しました");
        render();
      });
    });

    qsa("[data-deck-photo-key]").forEach((input) => {
      input.addEventListener("change", () => {
        const file = input.files[0];
        if (!file) return;
        if (file.size > 4 * 1024 * 1024) { showToast("写真サイズが大きすぎます\n4MB以下の画像を選んでね"); return; }
        const key = input.dataset.deckPhotoKey;
        const reader = new FileReader();
        reader.onload = () => {
          state.deck.photos[key] = reader.result;
          saveState();
          render();
        };
        reader.readAsDataURL(file);
      });
    });
    qsa("[data-deck-photo-remove]").forEach((btn) => {
      btn.addEventListener("click", () => {
        delete state.deck.photos[btn.dataset.deckPhotoRemove];
        saveState();
        render();
      });
    });
  }

  /* ---------------------------------------------------------
     6-3. 10の扉 完成演出画面（パンパカパーン）
  --------------------------------------------------------- */
  // 上品な打ち上げ花火を、外部ライブラリなしでCSSアニメーションとして生成する
  // （細い光が上がる→ふわっと開く→余韻の光が落ちて消える、を一度だけ自動再生）
  function fireworkHtml(leftPct, delay) {
    const particleCount = 14;
    const particles = Array.from({ length: particleCount }).map((_, i) => {
      const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.3;
      const radius = 46 + Math.random() * 26;
      const dx = Math.cos(angle) * radius;
      const dy = Math.sin(angle) * radius + 18; // 少し下に余韻で落ちる分を足す
      return `<span class="firework__particle" style="--dx:${dx.toFixed(1)}px; --dy:${dy.toFixed(1)}px; animation-delay:${(delay + 0.62).toFixed(2)}s;"></span>`;
    }).join("");
    return `
      <span class="firework" style="left:${leftPct}%;">
        <span class="firework__trail" style="animation-delay:${delay.toFixed(2)}s;"></span>
        <span class="firework__burst" style="animation-delay:${(delay + 0.6).toFixed(2)}s;">${particles}</span>
      </span>`;
  }
  function renderCelebrate() {
    const fireworks = [fireworkHtml(22, 0), fireworkHtml(50, 0.55), fireworkHtml(78, 0.3)].join("");
    return `
    <div class="celebrate">
      <div class="celebrate__fireworks" aria-hidden="true">${fireworks}</div>
      ${mascotImg("celebrate__mascot", MASCOT_IMG_SRC)}
      <p class="celebrate__bang">パンパカパ〜〜〜ン！！！🎉✨</p>
      <p class="celebrate__pct">10の扉　全部OPEN！！</p>
      <div class="gold-line" style="margin:18px auto;"></div>
      <p class="celebrate__body">ここまで来たあなたへ</p>
      <p class="celebrate__body celebrate__body--emph">10の扉は<br>全部OPENしました</p>
      <p class="celebrate__body">でも<br>魂商品はここで完成ではありません</p>
      <p class="celebrate__body">ここから<br>誰かに届けて<br>反応をもらって<br>少しずつ育てていきます</p>
      <p class="celebrate__body celebrate__body--emph">まずは<br>あなたの「はじめの一品」を<br>カタチにしてみよう</p>
      <p class="celebrate__next">ここからさらに<br>お客様との個別相談で使える<br>ご提案書の叩き台に<br>シンカさせます</p>

      <div class="celebrate__ritual">
        <p class="celebrate__ritual-label">まずはここまでできたら<br>これを声に出してみよう！</p>
        <p class="celebrate__ritual-quote">『私の物語が<br>いったん魂商品になったーーー！<br>めっちゃうれしい〜！』</p>
        <p class="celebrate__ritual-sub">まずひとりに<br>届けてみる💌</p>
      </div>

      <div class="nav-row" style="margin-top:26px;">
        <button class="btn btn--primary" id="celebrateNextBtn" type="button">商品設計シートを見る</button>
      </div>
    </div>`;
  }

  function bindCelebrate() {
    qs("#celebrateNextBtn").addEventListener("click", () => {
      state.screen = "complete";
      saveState();
      render();
    });
  }

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
    const countLabel = d7ItemSummaryLine() || "-";
    const priceNum = Number(state.d8_price) || 0;
    const journeySteps = state.d7_steps.filter((s) => s.trim());
    const existingChecklist = state.self1_choice && state.self1_choice !== "new" ? renderExistingChecklist() : "";
    const analysis = analysisProvider.run(state);

    return `
    <div class="result-banner">
      <div class="result-banner__emoji">🎉</div>
      <h1 class="result-banner__title">はい、ひとまずカタチになった！！！</h1>
      <div class="result-banner__body">まだ70点でも大丈夫

商品は、机の上で100点にするものではありません

ここから人に届けて、話して、喜ばれて、失敗して、直して、また届ける

そうやって、あなたの商品は育っていきます</div>
      <p class="result-banner__final">まず、ひとりに届けよう</p>
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
            <div class="sheet__stat"><div class="sheet__stat-label">回数</div><div class="sheet__stat-value" style="font-size:13px;">${esc(countLabel)}</div></div>
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

    ${renderDeckIntroCard()}

    <div class="card chotty-card">
      <div class="chotty-card__intro">
        ${mascotImg("chotty-card__intro-img")}
        <div>
          <img src="assets/chotnanapt-logo.png" alt="ChotNANAPT" class="chotty-card__logo">
          <span class="eyebrow" style="margin-bottom:4px;">チョッピー（nanaeAI）総評</span>
          <p class="step-desc" style="margin-bottom:0;">チョッピー（nanaeAI）が、あなたの商品を読み解きます</p>
        </div>
      </div>
      ${analysis.map((a) => `
        <div class="chotty-item">
          <p class="chotty-item__label">${esc(a.label)}</p>
          <p class="chotty-item__body">${nl2br(a.body)}</p>
        </div>`).join("")}
      <p class="hint">※ 市場調査は行っていません<br>今回の回答から見える仮説として読んでね</p>
    </div>

    ${renderLastDoorCard()}

    ${existingChecklist}

    <div class="restart-row"><button id="restartBtn" type="button">最初からやり直す</button></div>`;
  }

  const MISSION_BY_TYPE = {
    new: {
      title: "MISSION｜まず1人に見せてみよう",
      body: "「こんなの考えてるんだけど、どう思う？」\nでもOK\n\nできそうなら\n最初の1人に提案してみよう",
    },
    polish: {
      title: "MISSION｜今回変えたところを見せてみよう",
      body: "今回変えたところを\n既存のお客様または見込み客に見せてみよう\n\n「前より分かりやすくなった？」\n「どこが一番気になる？」\n\nなど\nリアルな反応をもらおう",
    },
    grow: {
      title: "MISSION｜次に確かめたいことを1つ決めよう",
      body: "今の商品で\n次に確かめたいことを1つ決めよう\n\n価格\n見せ方\n入口商品\n対象\n販売方法\n訴求\n提供方法など\n\n1つだけ変えて\n市場で小さく実験してみよう",
    },
  };

  function renderLastDoorCard() {
    const mission = MISSION_BY_TYPE[state.self1_choice] || MISSION_BY_TYPE.new;
    return `
    <div class="card last-door-card">
      <span class="eyebrow">🚪最後の扉は、画面の外です</span>
      <p class="step-desc">ここまで来たら<br>次にやることは<br>この画面を眺め続けることではありません🤣<br><br>まず誰かに<br>見せてみよう<br><br>届けてみよう<br><br>聞いてみよう<br><br>商品は<br>人に届けてはじめて<br>育ちはじめます</p>

      <div class="mission-box">
        <p class="mission-box__title">${esc(mission.title)}</p>
        <p class="mission-box__body">${nl2br(mission.body)}</p>
      </div>

      <div class="market-test">
        <p class="market-test__title">3人ミニ市場テスト（任意）</p>
        <p class="hint" style="margin-top:0;margin-bottom:12px;">これをやらないと終われない、という宿題ではありません<br>気が向いたら、軽い実験として使ってみてね</p>
        ${[0, 1, 2].map((i) => `
          <div class="market-test__row">
            <label class="checklist-item">
              <input type="checkbox" data-market-test-check="${i}" ${state.market_test_checks[i] ? "checked" : ""}>
              <span>${i + 1}人目に見せた</span>
            </label>
            <textarea data-market-test-note="${i}" placeholder="反応メモ（任意）" style="min-height:56px;">${esc(state.market_test_notes[i])}</textarea>
          </div>`).join("")}
      </div>
    </div>`;
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
        <p class="hint" style="margin-top:14px;">チェックできなかった場所が、次に磨く場所<br>商品を増やす前に、まずここを磨こう</p>
      </div>`;
  }

  function bindComplete() {
    const photoInput = qs("#photoInput");
    photoInput.addEventListener("change", () => {
      const file = photoInput.files[0];
      if (!file) return;
      if (file.size > 4 * 1024 * 1024) { showToast("写真サイズが大きすぎます\n4MB以下の画像を選んでね"); return; }
      const reader = new FileReader();
      reader.onload = () => { state.photo = reader.result; saveState(); render(); };
      reader.readAsDataURL(file);
    });

    qsa("[data-template-switch]").forEach((btn) => {
      btn.addEventListener("click", () => { state.sheetTemplate = btn.dataset.templateSwitch; saveState(); render(); });
    });

    qs("#printBtn").addEventListener("click", () => { setPrintOrientation("portrait"); window.print(); });

    qs("#downloadImgBtn").addEventListener("click", async () => {
      if (typeof window.html2canvas !== "function") { showToast("画像保存機能を読み込み中、または利用できません\n印刷/PDF保存をお試しください"); return; }
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
        showToast("画像保存に失敗しました\n印刷/PDF保存をお試しください");
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

    qsa("[data-market-test-check]").forEach((cb) => {
      cb.addEventListener("change", () => {
        state.market_test_checks[Number(cb.dataset.marketTestCheck)] = cb.checked;
        saveState();
      });
    });
    qsa("[data-market-test-note]").forEach((el) => {
      el.addEventListener("input", () => {
        state.market_test_notes[Number(el.dataset.marketTestNote)] = el.value;
        saveState();
      });
    });

    qs("#openStudioBtn").addEventListener("click", () => {
      state.screen = "studio";
      saveState();
      render();
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
