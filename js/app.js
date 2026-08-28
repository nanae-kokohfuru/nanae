/* ============================================================
   ここらぼ 直伝！魂商品作成キット「はじめの一品編」
   バニラJS / localStorage永続化 / 外部AI API不使用
   ============================================================ */
(() => {
  "use strict";

  /* ---------------------------------------------------------
     0. 定数・状態管理
  --------------------------------------------------------- */
  const STORAGE_KEY = "soulProductKit_v1";
  const TOTAL_STEPS = 10;

  const defaultState = () => ({
    currentStep: 0, // 0 = START, 1-9 = STEP, 10 = 完成
    persona: "",    // 'new' | 'existing_low' | 'existing_high'

    s1_who: "",
    s2_now: "",
    s3_future: "",

    s4_1: "", s4_2: "", s4_3: "",

    s5_skills: [],
    s5_freeform: "",

    s6_style: "",
    s6_style_other: "",
    s6_extras: [],
    s6_extras_other: "",

    s7_count: "",
    s7_count_other: "",
    s7_duration: "",
    s7_duration_other: "",

    s8_range: "",
    s8_price: "",

    s9_name: "",

    sheetTemplate: "",

    photo: "",
    deckPhotos: {},

    finalChecklist: [false, false, false, false, false],
  });

  let state = loadState();

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      return Object.assign(defaultState(), parsed);
    } catch (e) {
      return defaultState();
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      /* 保存容量オーバー等は静かに無視（写真サイズが大きい場合など） */
      showToast("保存容量が上限に近づいています。写真サイズを小さくしてみてね");
    }
  }

  /* ---------------------------------------------------------
     1. DOM ユーティリティ
  --------------------------------------------------------- */
  const app = document.getElementById("app");
  const appHeader = document.getElementById("appHeader");
  const progressFill = document.getElementById("progressFill");
  const progressLabel = document.getElementById("progressLabel");

  function qs(sel, ctx) { return (ctx || document).querySelector(sel); }
  function qsa(sel, ctx) { return Array.from((ctx || document).querySelectorAll(sel)); }
  function esc(str) {
    return String(str || "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  let toastTimer = null;
  function showToast(msg) {
    const toast = document.getElementById("toast");
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2400);
  }

  function scrollTop() { window.scrollTo({ top: 0, behavior: "smooth" }); }

  /* ---------------------------------------------------------
     2. マスコット SVG（オリジナルのシンプルな線画）
  --------------------------------------------------------- */
  function mascotOwl(color) {
    return `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <ellipse cx="32" cy="36" rx="20" ry="22" stroke="${color}" stroke-width="2"/>
      <path d="M14 20 Q32 6 50 20" stroke="${color}" stroke-width="2" fill="none"/>
      <circle cx="24" cy="32" r="6" stroke="${color}" stroke-width="2"/>
      <circle cx="40" cy="32" r="6" stroke="${color}" stroke-width="2"/>
      <circle cx="24" cy="32" r="1.6" fill="${color}"/>
      <circle cx="40" cy="32" r="1.6" fill="${color}"/>
      <path d="M30 40 L32 44 L34 40" stroke="${color}" stroke-width="2" fill="none"/>
      <path d="M20 50 Q32 56 44 50" stroke="${color}" stroke-width="1.6" fill="none"/>
    </svg>`;
  }
  function mascotAlpaca(color) {
    return `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M20 18 Q18 6 26 8 Q24 16 28 18" stroke="${color}" stroke-width="2" fill="none"/>
      <path d="M44 18 Q46 6 38 8 Q40 16 36 18" stroke="${color}" stroke-width="2" fill="none"/>
      <ellipse cx="32" cy="34" rx="18" ry="20" stroke="${color}" stroke-width="2"/>
      <path d="M22 32 Q32 24 42 32" stroke="${color}" stroke-width="1.6" fill="none"/>
      <ellipse cx="26" cy="36" rx="1.6" ry="2" fill="${color}"/>
      <ellipse cx="38" cy="36" rx="1.6" ry="2" fill="${color}"/>
      <path d="M28 44 Q32 47 36 44" stroke="${color}" stroke-width="2" fill="none"/>
      <path d="M18 52 Q32 58 46 52" stroke="${color}" stroke-width="1.6" fill="none"/>
    </svg>`;
  }
  function mascotCat(color) {
    return `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M18 20 L14 8 L26 16 Z" stroke="${color}" stroke-width="2" stroke-linejoin="round" fill="none"/>
      <path d="M46 20 L50 8 L38 16 Z" stroke="${color}" stroke-width="2" stroke-linejoin="round" fill="none"/>
      <ellipse cx="32" cy="36" rx="19" ry="20" stroke="${color}" stroke-width="2"/>
      <circle cx="25" cy="34" r="1.6" fill="${color}"/>
      <circle cx="39" cy="34" r="1.6" fill="${color}"/>
      <path d="M30 40 L32 42 L34 40" stroke="${color}" stroke-width="2" fill="none"/>
      <path d="M14 38 L22 40 M14 44 L22 42" stroke="${color}" stroke-width="1.4"/>
      <path d="M50 38 L42 40 M50 44 L42 42" stroke="${color}" stroke-width="1.4"/>
      <path d="M24 50 Q32 55 40 50" stroke="${color}" stroke-width="1.6" fill="none"/>
    </svg>`;
  }
  const MASCOTS = [mascotOwl, mascotAlpaca, mascotCat];
  function mascotRow() {
    const colors = ["#B67C7C", "#C8996B", "#A8968A"];
    return `<div class="hero__mascots">${MASCOTS.map((m, i) => m(colors[i])).join("")}</div>`;
  }
  function stepMascot(stepNo) {
    const colors = ["#B67C7C", "#C8996B", "#A8968A"];
    const idx = (stepNo - 1) % MASCOTS.length;
    return `<div class="step-mascot">${MASCOTS[idx](colors[idx])}</div>`;
  }

  /* ---------------------------------------------------------
     3. 選択カード生成ヘルパー
  --------------------------------------------------------- */
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

  /* ---------------------------------------------------------
     4. 進捗バー / ヘッダー更新
  --------------------------------------------------------- */
  function updateHeader() {
    if (state.currentStep >= 1 && state.currentStep <= TOTAL_STEPS) {
      appHeader.hidden = false;
      const pct = (state.currentStep / TOTAL_STEPS) * 100;
      progressFill.style.width = pct + "%";
      progressLabel.textContent = `STEP ${state.currentStep} / ${TOTAL_STEPS}`;
      progressFill.parentElement.setAttribute("aria-valuenow", state.currentStep);
    } else {
      appHeader.hidden = true;
    }
  }

  /* ---------------------------------------------------------
     5. 画面ルーター
  --------------------------------------------------------- */
  function render() {
    updateHeader();
    if (state.currentStep === 0) {
      app.innerHTML = renderStart();
      bindStart();
    } else if (state.currentStep >= 1 && state.currentStep <= TOTAL_STEPS) {
      app.innerHTML = renderStep(state.currentStep);
      bindStep(state.currentStep);
    } else {
      app.innerHTML = renderResult();
      bindResult();
    }
    scrollTop();
  }

  /* ---------------------------------------------------------
     6. START 画面
  --------------------------------------------------------- */
  function renderStart() {
    const personaNoteHtml = state.persona && state.persona !== "new"
      ? `<div class="persona-note">新しい商品を作る必要はありません。<br><br>
今の商品を、もう一度このSTEPに当てはめてみよう。<br><br>
答えに詰まったところ、言葉が曖昧になるところ、説明が長くなるところ。<br><br>
そこが、今の商品を磨くポイントです。</div>`
      : "";

    return `
    <div class="card hero">
      ${mascotRow()}
      <p class="hero__brand">ここらぼ直伝！</p>
      <h1 class="hero__title">魂商品作成キット</h1>
      <span class="hero__subtitle">はじめの一品編</span>
      <p class="hero__catch">いきなり完璧な講座を作らなくていい。<br>まず、目の前のひとりを幸せにする<br>「はじめの一品」をつくろう。</p>

      <div class="hero__desc">商品は、頭の中だけで100点にするものではありません。

まず1人に届ける。反応を見る。喜ばれたことを残す。いらなかったものを削る。そして、また届ける。

その繰り返しで、あなたの「魂商品」は育っていきます。

まだ商品がない人は、ゼロから。
すでに商品がある人は、今の商品を見直すために。

商品・発信・集客・セールス。すべての要になる部分を、ここで一度シンプルにしてみよう。</div>

      <p class="persona-title">まず、今のあなたに近いものを選んでね</p>
      <div class="choice-grid" id="personaGrid">
        ${choiceCard({ type: "radio", name: "persona", value: "new", id: "p_new", shape: "round",
          checked: state.persona === "new", label: "① まだ商品・サービスがない", sub: "ゼロから「はじめの一品」を作る" })}
        ${choiceCard({ type: "radio", name: "persona", value: "existing_low", id: "p_low", shape: "round",
          checked: state.persona === "existing_low", label: "② 商品はあるが、まだあまり売っていない", sub: "今の商品をシンプルに整理し直す" })}
        ${choiceCard({ type: "radio", name: "persona", value: "existing_high", id: "p_high", shape: "round",
          checked: state.persona === "existing_high", label: "③ すでに成約経験がある", sub: "今の商品をSTEPに当てはめ、ブラッシュアップする" })}
      </div>
      <div id="personaNote">${personaNoteHtml}</div>

      <p class="warn-msg" id="startWarn">まずは3つから、今のあなたに近いものを選んでね。</p>

      <div class="nav-row" style="margin-top:22px;">
        <button class="btn btn--primary" id="startBtn" type="button">はじめの一品をつくる</button>
      </div>
      ${hasAnyProgress() ? `<div class="restart-row"><button id="continueBtn" type="button">前回の続きから再開する →</button></div>` : ""}
    </div>`;
  }

  function hasAnyProgress() {
    const d = defaultState();
    return Object.keys(d).some((k) => {
      if (k === "currentStep" || k === "finalChecklist") return false;
      const v = state[k];
      if (Array.isArray(v)) return v.length > 0;
      return v && v !== d[k];
    });
  }

  function bindStart() {
    qsa('input[name="persona"]').forEach((input) => {
      input.addEventListener("change", () => {
        state.persona = input.value;
        qs("#startWarn").classList.remove("show");
        saveState();
        qs("#personaNote").innerHTML = state.persona !== "new"
          ? `<div class="persona-note">新しい商品を作る必要はありません。<br><br>
今の商品を、もう一度このSTEPに当てはめてみよう。<br><br>
答えに詰まったところ、言葉が曖昧になるところ、説明が長くなるところ。<br><br>
そこが、今の商品を磨くポイントです。</div>`
          : "";
      });
    });

    qs("#startBtn").addEventListener("click", () => {
      if (!state.persona) {
        qs("#startWarn").classList.add("show");
        return;
      }
      state.currentStep = 1;
      saveState();
      render();
    });

    const cont = qs("#continueBtn");
    if (cont) {
      cont.addEventListener("click", () => {
        state.currentStep = findResumeStep();
        saveState();
        render();
      });
    }
  }

  function findResumeStep() {
    // 未入力の最初のSTEPに戻す（簡易判定）
    if (!state.s1_who) return 1;
    if (!state.s2_now) return 2;
    if (!state.s3_future) return 3;
    if (!state.s4_1 && !state.s4_2 && !state.s4_3) return 4;
    if (state.s5_skills.length === 0 && !state.s5_freeform) return 5;
    if (!state.s6_style) return 6;
    if (!state.s7_count) return 7;
    if (!state.s8_range && !state.s8_price) return 8;
    if (!state.s9_name) return 9;
    if (!state.sheetTemplate) return 10;
    return 11;
  }

  /* ---------------------------------------------------------
     7. STEP 共通シェル
  --------------------------------------------------------- */
  function stepShell({ stepNo, eyebrow, title, bodyHtml, warnId }) {
    return `
    <div class="card">
      ${stepMascot(stepNo)}
      <span class="eyebrow">${esc(eyebrow)}</span>
      <h2 class="step-title">${title}</h2>
      ${bodyHtml}
      ${warnId ? `<p class="warn-msg" id="${warnId}"></p>` : ""}
      <div class="nav-row">
        <button class="btn btn--ghost" id="backBtn" type="button">← 前へ</button>
        <button class="btn btn--primary" id="nextBtn" type="button">${stepNo === TOTAL_STEPS ? "商品ご提案シートを完成させる" : "次へ →"}</button>
      </div>
      <div class="restart-row"><button id="restartBtn" type="button">最初からやり直す</button></div>
    </div>`;
  }

  function renderStep(n) {
    const renderers = {
      1: renderStep1, 2: renderStep2, 3: renderStep3, 4: renderStep4, 5: renderStep5,
      6: renderStep6, 7: renderStep7, 8: renderStep8, 9: renderStep9, 10: renderStep10,
    };
    return renderers[n]();
  }

  function bindStep(n) {
    qs("#backBtn").addEventListener("click", () => {
      state.currentStep = n === 1 ? 0 : n - 1;
      saveState();
      render();
    });
    qs("#restartBtn").addEventListener("click", openResetModal);

    const binders = {
      1: bindStep1, 2: bindStep2, 3: bindStep3, 4: bindStep4, 5: bindStep5,
      6: bindStep6, 7: bindStep7, 8: bindStep8, 9: bindStep9, 10: bindStep10,
    };
    binders[n]();
  }

  /* ---------- STEP 1 ---------- */
  function renderStep1() {
    return stepShell({
      stepNo: 1,
      eyebrow: "STEP 1 ｜ まず「ひとり」を決める",
      title: "まず、誰を助ける？",
      bodyHtml: `
        <p class="step-desc">「子育てに悩むママ」「自信がない女性」では、まだ広すぎます。<br>顔が浮かぶくらい、「ひとり」まで小さくしてみよう。</p>
        <p class="step-question">あなたが、まず助けたいのはどんな場面で、何に困っている人ですか？</p>
        <div class="field">
          <textarea id="s1_who" placeholder="例）朝、学校へ行きたがらない子どもに毎朝イライラしてしまうママ">${esc(state.s1_who)}</textarea>
        </div>
        <div class="example-box">
          <div class="example-box__bad"><span>×</span><span>子育てに悩むママ</span></div>
          <div class="example-box__good"><span>○</span><span>朝、学校へ行きたがらない子どもに毎朝イライラしてしまうママ</span></div>
          <div class="example-box__bad" style="margin-top:10px;"><span>×</span><span>起業に悩んでいる女性</span></div>
          <div class="example-box__good"><span>○</span><span>Instagramを始めたいけれど「私なんかが発信していいの？」と思って投稿ボタンを押せない女性</span></div>
        </div>
        <p class="hint">迷ったら、"昔の私" を思い出してみてもOK。</p>
      `,
      warnId: "warn1",
    });
  }
  function bindStep1() {
    const ta = qs("#s1_who");
    ta.addEventListener("input", () => { state.s1_who = ta.value; saveState(); });
    qs("#nextBtn").addEventListener("click", () => {
      if (!requireText(state.s1_who, "warn1", "まずは、助けたい「ひとり」を書いてみよう。")) return;
      goNext(1);
    });
  }

  /* ---------- STEP 2 ---------- */
  function renderStep2() {
    return stepShell({
      stepNo: 2,
      eyebrow: "STEP 2 ｜「今どこ？」を決める",
      title: "その人は、今どこにいる？",
      bodyHtml: `
        <p class="step-desc">その人の人生全部を一度に助けなくて大丈夫。<br>今回の商品で扱う「最初のひとつ」を決めます。</p>
        <p class="step-question">その人が今、一番困っていることは？</p>
        <div class="field">
          <textarea id="s2_now" placeholder="例）毎朝、子どもと言い合いになってしまい、自己嫌悪で1日が始まる">${esc(state.s2_now)}</textarea>
        </div>
        <div class="note-box">夫婦関係も、自己肯定感も、仕事も、お金も……<br><strong>全部乗せ禁止🤣</strong><br>「はじめの一品」です。定食にしない。</div>
      `,
      warnId: "warn2",
    });
  }
  function bindStep2() {
    const ta = qs("#s2_now");
    ta.addEventListener("input", () => { state.s2_now = ta.value; saveState(); });
    qs("#nextBtn").addEventListener("click", () => {
      if (!requireText(state.s2_now, "warn2", "今、その人が困っていることを書いてみよう。")) return;
      goNext(2);
    });
  }

  /* ---------- STEP 3 ---------- */
  function renderStep3() {
    return stepShell({
      stepNo: 3,
      eyebrow: "STEP 3 ｜「どこへ？」を決める",
      title: "どこへ連れていく？",
      bodyHtml: `
        <p class="step-desc">「幸せになる」「自分らしくなる」「人生が変わる」だけでは、まだ少し大きい。<br>この商品が終わったとき、本人が「変わった！」「できた！」と確認できる状態を考えます。</p>
        <p class="step-question">この商品を受け終わったとき、その人がどうなっていたら最高ですか？</p>
        <div class="field">
          <textarea id="s3_future" placeholder="例）自分の言葉でInstagramを1投稿できる">${esc(state.s3_future)}</textarea>
        </div>
        <div class="example-box">
          <div class="example-box__bad"><span>×</span><span>自信を持てる</span></div>
          <div class="example-box__good"><span>○</span><span>自分の言葉でInstagramを1投稿できる</span></div>
          <div class="example-box__bad" style="margin-top:10px;"><span>×</span><span>子育てが楽になる</span></div>
          <div class="example-box__good"><span>○</span><span>子どもが学校へ行きたがらない朝に、怒鳴る前に子どもの気持ちを聞けるようになる</span></div>
        </div>
        <p class="hint">大変身じゃなくていい。小さくても、本人が"変わった"とわかる未来にしよう。</p>
      `,
      warnId: "warn3",
    });
  }
  function bindStep3() {
    const ta = qs("#s3_future");
    ta.addEventListener("input", () => { state.s3_future = ta.value; saveState(); });
    qs("#nextBtn").addEventListener("click", () => {
      if (!requireText(state.s3_future, "warn3", "受け終わった後の、小さな「変わった！」を書いてみよう。")) return;
      goNext(3);
    });
  }

  /* ---------- STEP 4 ---------- */
  function renderStep4() {
    return stepShell({
      stepNo: 4,
      eyebrow: "STEP 4 ｜私の物語",
      title: "なぜ、あなたが届けるの？",
      bodyHtml: `
        <p class="big-quote">この人を見ていると、<br>なぜか放っておけない。<br>それは、なぜ？</p>
        <div class="field">
          <label class="field__label">① 私自身も昔、こんなことで悩んでいました</label>
          <textarea id="s4_1" placeholder="例）私自身、朝の支度で子どもと毎日ケンカしていました">${esc(state.s4_1)}</textarea>
        </div>
        <div class="field">
          <label class="field__label">② でも、こんな経験・変化・学びがありました</label>
          <textarea id="s4_2" placeholder="例）子どもの気持ちを聞く練習をしたら、朝の空気が変わりました">${esc(state.s4_2)}</textarea>
        </div>
        <div class="field">
          <label class="field__label">③ だから今、こんな人に届けたい</label>
          <textarea id="s4_3" placeholder="例）同じように朝イライラしてしまうママに届けたい">${esc(state.s4_3)}</textarea>
        </div>
        <div class="note-box">資格自慢じゃなくて大丈夫。<br>「なぜ、あなたがこの人を助けたいのか」<br>そこに、あなたの商品にしかない物語があります。</div>
        <p class="big-quote" style="margin-top:22px; font-size:17px;">あなたが歩いてきた道は、<br>誰かの地図になる。</p>
      `,
      warnId: "warn4",
    });
  }
  function bindStep4() {
    ["s4_1", "s4_2", "s4_3"].forEach((id) => {
      const ta = qs("#" + id);
      ta.addEventListener("input", () => { state[id] = ta.value; saveState(); });
    });
    qs("#nextBtn").addEventListener("click", () => {
      if (!state.s4_1.trim() && !state.s4_2.trim() && !state.s4_3.trim()) {
        showWarn("warn4", "3つのうち、ひとつだけでも書いてみよう。");
        return;
      }
      goNext(4);
    });
  }

  /* ---------- STEP 5 ---------- */
  const SKILL_OPTIONS = [
    "話を聞く", "コーチング", "カウンセリング", "セラピー", "診断", "ヨガ・身体", "アロマ",
    "数秘・占術", "潜在意識", "自分自身の経験", "専門知識", "技術を教える", "一緒に実践する",
  ];
  function renderStep5() {
    const cards = SKILL_OPTIONS.map((label, i) => choiceCard({
      type: "checkbox", name: "s5_skill", value: label, id: "s5_" + i,
      checked: state.s5_skills.includes(label), label,
    })).join("");
    return stepShell({
      stepNo: 5,
      eyebrow: "STEP 5 ｜「何を使う？」を決める",
      title: "あなたの何を使って連れていく？",
      bodyHtml: `
        <p class="step-desc">STEP4で、あなたの物語を思い出しました。<br>では次に、STEP1の人をSTEP2の現在地からSTEP3の未来へ連れていくために、あなたの何が使えるでしょう？<br><br>大事なのは「私は何ができる？」だけではなく、「この人がゴールへ行くために本当に何が必要？」です。</p>
        <p class="step-question">最大3つまで選んでね</p>
        <div class="choice-grid">${cards}</div>
        <div class="field" style="margin-top:20px;">
          <label class="field__label">上記にない、あなただけの専門ジャンルは？（任意）</label>
          <textarea id="s5_freeform" placeholder="例）チャイルドケアセラピー、骨盤ケア、風水鑑定　など（複数OK、読点区切りで）">${esc(state.s5_freeform)}</textarea>
          <p class="hint">この欄は3つの制限に含みません。載っていない専門用語・技術名も自由に書いてね。</p>
        </div>
      `,
      warnId: "warn5",
    });
  }
  function bindStep5() {
    const boxes = qsa('input[name="s5_skill"]');

    boxes.forEach((box) => {
      box.addEventListener("change", () => {
        const checked = boxes.filter((b) => b.checked);
        if (checked.length > 3) {
          box.checked = false;
          showWarn("warn5", "ちょっと待った🤣 今回は最大3つ。「持っている資格」ではなく、STEP3のゴールに本当に必要なものを選んでね。");
          return;
        }
        qs("#warn5").classList.remove("show");
        state.s5_skills = boxes.filter((b) => b.checked).map((b) => b.value);
        saveState();
      });
    });

    const freeformInput = qs("#s5_freeform");
    freeformInput.addEventListener("input", () => { state.s5_freeform = freeformInput.value; saveState(); });

    qs("#nextBtn").addEventListener("click", () => {
      if (state.s5_skills.length === 0 && !state.s5_freeform.trim()) {
        showWarn("warn5", "使うものを、最低ひとつ選ぶか書いてみよう。");
        return;
      }
      goNext(5);
    });
  }

  /* ---------- STEP 6 ---------- */
  const STYLE_OPTIONS = ["オンライン1対1", "対面1対1", "少人数レッスン", "技術・実技レッスン", "その他"];
  const EXTRA_OPTIONS = [
    "対話・セッション", "ミニ講義をする", "一緒にワークする", "実技・レッスン", "宿題を出す",
    "資料を渡す", "LINE等で質問サポート", "LINE等で進捗確認", "事前課題", "振り返り",
  ];
  function renderStep6() {
    const styleCards = STYLE_OPTIONS.map((label, i) => choiceCard({
      type: "radio", name: "s6_style", value: label, id: "s6_style_" + i, shape: "round",
      checked: state.s6_style === label, label,
    })).join("");
    const extraCards = EXTRA_OPTIONS.map((label, i) => choiceCard({
      type: "checkbox", name: "s6_extra", value: label, id: "s6_extra_" + i,
      checked: state.s6_extras.includes(label), label,
    })).join("") + choiceCard({
      type: "checkbox", name: "s6_extra", value: "その他", id: "s6_extra_other_cb",
      checked: state.s6_extras.includes("その他"), label: "その他",
    });

    return stepShell({
      stepNo: 6,
      eyebrow: "STEP 6 ｜「どう届ける？」を決める",
      title: "どんな形で届ける？",
      bodyHtml: `
        <p class="step-question">まず、基本スタイルをひとつ選ぼう</p>
        <div class="choice-grid">${styleCards}</div>
        <div class="inline-input" id="s6StyleOtherWrap" ${state.s6_style === "その他" ? "" : "hidden"}>
          <input type="text" id="s6_style_other" placeholder="スタイルを入力" value="${esc(state.s6_style_other)}">
        </div>

        <p class="step-question" style="margin-top:26px;">ゴールまで連れていくために必要なものだけ選ぼう。</p>
        <div class="choice-grid">${extraCards}</div>
        <div class="inline-input" id="s6ExtraOtherWrap" ${state.s6_extras.includes("その他") ? "" : "hidden"}>
          <input type="text" id="s6_extras_other" placeholder="その他の内容を入力" value="${esc(state.s6_extras_other)}">
        </div>

        <div class="note-box">豪華に見せるためにつけない。<br>STEP3のゴールへ連れていくために、本当に必要なものだけ。</div>
      `,
      warnId: "warn6",
    });
  }
  function bindStep6() {
    const styleRadios = qsa('input[name="s6_style"]');
    styleRadios.forEach((r) => {
      r.addEventListener("change", () => {
        state.s6_style = r.value;
        qs("#s6StyleOtherWrap").hidden = r.value !== "その他";
        qs("#warn6").classList.remove("show");
        saveState();
      });
    });
    const styleOtherInput = qs("#s6_style_other");
    styleOtherInput.addEventListener("input", () => { state.s6_style_other = styleOtherInput.value; saveState(); });

    const extraBoxes = qsa('input[name="s6_extra"]');
    extraBoxes.forEach((b) => {
      b.addEventListener("change", () => {
        state.s6_extras = extraBoxes.filter((x) => x.checked).map((x) => x.value);
        qs("#s6ExtraOtherWrap").hidden = !state.s6_extras.includes("その他");
        saveState();
      });
    });
    const extrasOtherInput = qs("#s6_extras_other");
    extrasOtherInput.addEventListener("input", () => { state.s6_extras_other = extrasOtherInput.value; saveState(); });

    qs("#nextBtn").addEventListener("click", () => {
      if (!state.s6_style) {
        showWarn("warn6", "まずは基本スタイルをひとつ選んでみよう。");
        return;
      }
      goNext(6);
    });
  }

  /* ---------- STEP 7 ---------- */
  const COUNT_OPTIONS = ["1回", "2回", "3回", "4回", "その他"];
  const DURATION_OPTIONS = ["30分", "45分", "60分", "90分", "120分", "その他"];
  function renderStep7() {
    const countCards = COUNT_OPTIONS.map((label, i) => choiceCard({
      type: "radio", name: "s7_count", value: label, id: "s7_count_" + i, shape: "round",
      checked: state.s7_count === label, label,
    })).join("");
    const durationCards = DURATION_OPTIONS.map((label, i) => choiceCard({
      type: "radio", name: "s7_duration", value: label, id: "s7_dur_" + i, shape: "round",
      checked: state.s7_duration === label, label,
    })).join("");

    return stepShell({
      stepNo: 7,
      eyebrow: "STEP 7 ｜「何回？」を決める",
      title: "何回あれば、そこまで行ける？",
      bodyHtml: `
        <p class="step-desc">値段を決める前に、STEP2の現在地からSTEP3のゴールまで連れていくために「最低何回必要？」を考えよう。</p>
        <div class="choice-grid">${countCards}</div>
        <div class="inline-input" id="s7CountOtherWrap" ${state.s7_count === "その他" ? "" : "hidden"}>
          <input type="number" min="1" id="s7_count_other" placeholder="回数を入力" value="${esc(state.s7_count_other)}">
        </div>

        <p class="step-question" style="margin-top:26px;">1回あたり、どのくらい？</p>
        <div class="choice-grid">${durationCards}</div>
        <div class="inline-input" id="s7DurationOtherWrap" ${state.s7_duration === "その他" ? "" : "hidden"}>
          <input type="number" min="1" id="s7_duration_other" placeholder="分数を入力" value="${esc(state.s7_duration_other)}">
        </div>

        <div class="note-box">「講座っぽく見せたいから12回」は禁止🤣<br>必要な回数だけでOK。</div>
      `,
      warnId: "warn7",
    });
  }
  function bindStep7() {
    const countRadios = qsa('input[name="s7_count"]');
    countRadios.forEach((r) => {
      r.addEventListener("change", () => {
        state.s7_count = r.value;
        qs("#s7CountOtherWrap").hidden = r.value !== "その他";
        qs("#warn7").classList.remove("show");
        saveState();
      });
    });
    qs("#s7_count_other").addEventListener("input", (e) => { state.s7_count_other = e.target.value; saveState(); });

    const durRadios = qsa('input[name="s7_duration"]');
    durRadios.forEach((r) => {
      r.addEventListener("change", () => {
        state.s7_duration = r.value;
        qs("#s7DurationOtherWrap").hidden = r.value !== "その他";
        saveState();
      });
    });
    qs("#s7_duration_other").addEventListener("input", (e) => { state.s7_duration_other = e.target.value; saveState(); });

    qs("#nextBtn").addEventListener("click", () => {
      if (!state.s7_count || !state.s7_duration) {
        showWarn("warn7", "回数と、1回あたりの時間を選んでみよう。");
        return;
      }
      goNext(7);
    });
  }

  /* ---------- STEP 8 ---------- */
  const PRICE_RANGES = [
    "〜5,000円", "5,000〜10,000円", "10,000〜30,000円",
    "30,000〜50,000円", "50,000〜100,000円", "自分で入力する",
  ];
  function renderStep8() {
    const rangeCards = PRICE_RANGES.map((label, i) => choiceCard({
      type: "radio", name: "s8_range", value: label, id: "s8_range_" + i, shape: "round",
      checked: state.s8_range === label, label,
    })).join("");
    const priceNum = Number(state.s8_price) || 0;

    return stepShell({
      stepNo: 8,
      eyebrow: "STEP 8 ｜「いくら？」を決める",
      title: "まず届けられる価格を決める",
      bodyHtml: `
        <p class="step-desc">ここで「絶対に正しい価格」を決めなくて大丈夫。<br>まずは「この内容なら、今の私でも人に提案してみようと思える」仮価格を決めます。</p>
        <div class="choice-grid">${rangeCards}</div>

        <div class="field" style="margin-top:20px;">
          <label class="field__label">最終的な販売価格</label>
          <input type="number" min="0" step="100" id="s8_price" placeholder="例）15000" value="${esc(state.s8_price)}">
        </div>

        <div class="sheet__price" style="margin-top:8px;">
          <div class="sheet__price-label">今回の仮価格</div>
          <div class="sheet__price-value" id="pricePreview">¥${priceNum.toLocaleString()}</div>
        </div>

        <div class="note-box">正解は、市場に出してみないとわからないこともある。<br>まず決める。届ける。そこから育てよう。</div>
      `,
      warnId: "warn8",
    });
  }
  function bindStep8() {
    const rangeRadios = qsa('input[name="s8_range"]');
    rangeRadios.forEach((r) => {
      r.addEventListener("change", () => {
        state.s8_range = r.value;
        qs("#warn8").classList.remove("show");
        saveState();
      });
    });
    const priceInput = qs("#s8_price");
    priceInput.addEventListener("input", () => {
      state.s8_price = priceInput.value;
      const n = Number(priceInput.value) || 0;
      qs("#pricePreview").textContent = "¥" + n.toLocaleString();
      saveState();
    });

    qs("#nextBtn").addEventListener("click", () => {
      if (!state.s8_range && !state.s8_price) {
        showWarn("warn8", "価格帯を選ぶか、金額を入力してみよう。");
        return;
      }
      goNext(8);
    });
  }

  /* ---------- STEP 9 ---------- */
  function renderStep9() {
    return stepShell({
      stepNo: 9,
      eyebrow: "STEP 9 ｜商品名を決める",
      title: "最後に、名前をつけよう",
      bodyHtml: `
        <p class="step-desc">ここで30分悩まない🤣<br>今回は仮タイトルで大丈夫。</p>
        <p class="step-question">この商品に、今つけるならどんな名前？</p>
        <div class="field">
          <input type="text" id="s9_name" placeholder="例）朝のイライラが手放せる、親子の言葉がけレッスン" value="${esc(state.s9_name)}">
        </div>
        <p class="hint">「（仮）」でもOK！</p>
      `,
      warnId: "warn9",
    });
  }
  function bindStep9() {
    const input = qs("#s9_name");
    input.addEventListener("input", () => { state.s9_name = input.value; saveState(); });
    qs("#nextBtn").addEventListener("click", () => {
      if (!requireText(state.s9_name, "warn9", "仮の名前でいいので、つけてみよう。")) return;
      goNext(9);
    });
  }

  /* ---------- STEP 10 ---------- */
  const SHEET_TEMPLATES = [
    { id: "natural", swatchClass: "template-card__swatch--natural", swatchLabel: "Aa",
      name: "ナチュラル", badge: "おすすめ", desc: "あたたかく、親しみやすい印象に" },
    { id: "simple", swatchClass: "template-card__swatch--simple", swatchLabel: "Aa",
      name: "シンプル", badge: "", desc: "余白を活かした、洗練されたミニマル印象に" },
    { id: "elegant", swatchClass: "template-card__swatch--elegant", swatchLabel: "Aa",
      name: "エレガント", badge: "", desc: "ダーク×ゴールドで、特別な一品感を" },
  ];
  function renderStep10() {
    if (!state.sheetTemplate) state.sheetTemplate = "natural"; // 初回訪問時のおすすめデフォルト
    const cards = SHEET_TEMPLATES.map((t, i) => `
      <label class="template-card" for="tpl_${t.id}">
        <input type="radio" name="sheetTemplate" id="tpl_${t.id}" value="${t.id}" ${state.sheetTemplate === t.id ? "checked" : ""}>
        <div class="template-card__swatch ${t.swatchClass}">${t.swatchLabel}</div>
        <div class="template-card__body">
          <p class="template-card__name">${esc(t.name)} ${t.badge ? `<span class="template-card__badge">${esc(t.badge)}</span>` : ""}</p>
          <p class="template-card__desc">${esc(t.desc)}</p>
        </div>
      </label>`).join("");

    return stepShell({
      stepNo: 10,
      eyebrow: "STEP 10 ｜資料のテイストを選ぶ",
      title: "最後に、資料のテイストを選ぼう",
      bodyHtml: `
        <p class="step-desc">中身はここまで入力した内容そのまま。見せ方だけ選べます。<br>あとからいつでも変更できるので、直感でOK。</p>
        <div class="template-grid">${cards}</div>
        <p class="hint">迷ったら「ナチュラル」でOK。あなたらしさは中身にちゃんと出るから。</p>
      `,
    });
  }
  function bindStep10() {
    qsa('input[name="sheetTemplate"]').forEach((r) => {
      r.addEventListener("change", () => { state.sheetTemplate = r.value; saveState(); });
    });
    qs("#nextBtn").addEventListener("click", () => goNext(10));
  }

  /* ---------- 共通：次へ進む/バリデーション ---------- */
  function requireText(val, warnId, msg) {
    if (!val || !val.trim()) {
      showWarn(warnId, msg);
      return false;
    }
    qs("#" + warnId).classList.remove("show");
    return true;
  }
  function showWarn(id, msg) {
    const el = qs("#" + id);
    el.textContent = msg;
    el.classList.remove("show");
    void el.offsetWidth; // reflow でアニメ再トリガー
    el.classList.add("show");
  }
  function goNext(n) {
    state.currentStep = n === TOTAL_STEPS ? TOTAL_STEPS + 1 : n + 1;
    saveState();
    render();
  }

  /* ---------------------------------------------------------
     8. 完成画面（商品ご提案シート／横A4詳細資料）
  --------------------------------------------------------- */
  function computeDerived() {
    const freeformSkills = state.s5_freeform.split(/[、,\n]/).map((s) => s.trim()).filter(Boolean);
    const skills = [...state.s5_skills, ...freeformSkills];

    const extras = [...state.s6_extras.filter((s) => s !== "その他"),
      ...(state.s6_extras.includes("その他") && state.s6_extras_other ? [state.s6_extras_other] : [])];

    const styleLabel = state.s6_style === "その他" ? (state.s6_style_other || "その他") : state.s6_style;
    const countLabel = state.s7_count === "その他" ? `${state.s7_count_other || "?"}回` : state.s7_count;
    const durationLabel = state.s7_duration === "その他" ? `${state.s7_duration_other || "?"}分` : state.s7_duration;

    const priceNum = Number(state.s8_price) || 0;
    const priceDisplay = priceNum > 0 ? `¥${priceNum.toLocaleString()}` : (state.s8_range || "未定");

    const whyText = [
      state.s4_1 ? `かつての私は、${state.s4_1.trim()}` : "",
      state.s4_2 ? `けれど、${state.s4_2.trim()}` : "",
      state.s4_3 ? `だからこそ、${state.s4_3.trim()}` : "",
    ].filter(Boolean).join("\n\n");

    const productName = state.s9_name || "（仮）はじめの一品";

    return { skills, extras, styleLabel, countLabel, durationLabel, priceDisplay, whyText, productName };
  }

  /* ---------- 横A4・詳細資料（デッキ）の生成 ---------- */
  const DECK_PHOTO_SLOTS = [
    { key: "s1_who", label: "対象者ページ" },
    { key: "s2_now", label: "現在地ページ" },
    { key: "s3_future", label: "目指す未来ページ" },
    { key: "s4_1", label: "物語① ページ" },
    { key: "s4_2", label: "物語② ページ" },
    { key: "s4_3", label: "物語③ ページ" },
  ];

  let deckSplitCount = 0; // 左右交互のレイアウトに使う簡易カウンター

  function statementPageInner(eyebrow, label, value, photoUrl) {
    if (!photoUrl) {
      return `
        <p class="sheet__eyebrow">${esc(eyebrow)}</p>
        <div class="deck-page__center">
          <div>
            <p class="sheet__label" style="text-align:center;">${esc(label)}</p>
            <p class="deck-page__statement">${esc(value)}</p>
          </div>
        </div>`;
    }
    const reverse = deckSplitCount % 2 === 1;
    deckSplitCount += 1;
    return `
      <p class="sheet__eyebrow">${esc(eyebrow)}</p>
      <div class="deck-page__split${reverse ? " deck-page__split--reverse" : ""}">
        <div class="deck-page__photo-col"><img class="deck-page__photo" src="${photoUrl}" alt=""></div>
        <div class="deck-page__text-col">
          <p class="sheet__label">${esc(label)}</p>
          <p class="deck-page__statement deck-page__statement--left">${esc(value)}</p>
        </div>
      </div>`;
  }

  function buildDeckPages() {
    const d = computeDerived();
    const tpl = state.sheetTemplate || "natural";
    const pages = [];
    deckSplitCount = 0;

    pages.push({
      extraClass: "deck-page--cover",
      html: `
        <div class="deck-page__cover-inner">
          <p class="sheet__eyebrow">MY FIRST SOUL PRODUCT</p>
          ${state.photo ? `<img class="sheet__photo" style="width:120px;height:120px;margin:0 auto 22px;" src="${state.photo}" alt="">` : ""}
          <h1 class="sheet__name">${esc(d.productName)}</h1>
          <p class="sheet__name-sub">SOUL PRODUCT PROPOSAL SHEET</p>
        </div>`,
    });

    if (state.s1_who) pages.push({ html: statementPageInner("WHO ｜ 対象者", "この商品を届けたい人", state.s1_who, state.deckPhotos.s1_who) });
    if (state.s2_now) pages.push({ html: statementPageInner("NOW ｜ 現在地", "今、一番困っていること", state.s2_now, state.deckPhotos.s2_now) });
    if (state.s3_future) pages.push({ html: statementPageInner("FUTURE ｜ 目指す未来", "受け終わったときの未来", state.s3_future, state.deckPhotos.s3_future) });
    if (state.s4_1) pages.push({ html: statementPageInner("MY STORY ｜ 私の物語 ①", "私自身も昔、こんなことで悩んでいました", state.s4_1, state.deckPhotos.s4_1) });
    if (state.s4_2) pages.push({ html: statementPageInner("MY STORY ｜ 私の物語 ②", "でも、こんな経験・変化・学びがありました", state.s4_2, state.deckPhotos.s4_2) });
    if (state.s4_3) pages.push({ html: statementPageInner("MY STORY ｜ 私の物語 ③", "だから今、こんな人に届けたい", state.s4_3, state.deckPhotos.s4_3) });

    pages.push({
      html: `
        <p class="sheet__eyebrow">WHAT I OFFER ｜ 提供するもの</p>
        <h2 class="deck-page__heading">使用するスキル・経験　／　サポート内容</h2>
        <div class="deck-page__cols">
          <div>
            <p class="sheet__label">✨ 使用するスキル・経験</p>
            <div class="sheet__tags">${d.skills.map((s) => `<span class="sheet__tag">${esc(s)}</span>`).join("") || "-"}</div>
          </div>
          <div>
            <p class="sheet__label">🤝 サポート内容</p>
            <div class="sheet__tags">${d.extras.map((s) => `<span class="sheet__tag">${esc(s)}</span>`).join("") || "-"}</div>
          </div>
        </div>`,
    });

    pages.push({
      html: `
        <p class="sheet__eyebrow">STRUCTURE ｜ 提供の形</p>
        <h2 class="deck-page__heading">提供スタイル・回数・価格</h2>
        <div class="sheet__grid">
          <div class="sheet__stat"><div class="sheet__stat-label">提供スタイル</div><div class="sheet__stat-value">${esc(d.styleLabel) || "-"}</div></div>
          <div class="sheet__stat"><div class="sheet__stat-label">回数</div><div class="sheet__stat-value">${esc(d.countLabel) || "-"}</div></div>
          <div class="sheet__stat"><div class="sheet__stat-label">1回の時間</div><div class="sheet__stat-value">${esc(d.durationLabel) || "-"}</div></div>
          <div class="sheet__stat"><div class="sheet__stat-label">合計セッション</div><div class="sheet__stat-value">${esc(d.countLabel) || "-"}</div></div>
        </div>
        <div class="sheet__price"><div class="sheet__price-label">PRICE</div><div class="sheet__price-value">${d.priceDisplay}</div></div>`,
    });

    pages.push({
      extraClass: "deck-page--cover",
      html: `
        <div class="deck-page__cover-inner">
          <p class="sheet__eyebrow">THANK YOU</p>
          <h2 class="deck-page__statement">まず、<br>ひとりに届けよう。</h2>
          <p class="sheet__name-sub" style="margin-top:18px;">${esc(d.productName)} ｜ ここらぼ 魂商品作成キット</p>
        </div>`,
    });

    const total = pages.length;
    return {
      total,
      html: pages.map((p, i) => `
        <div class="a4-shell">
          <div class="a4-page sheet sheet--${tpl} ${p.extraClass || ""}" data-page="${i + 1}">
            ${p.html}
            <p class="a4-page__pageno">${i + 1} / ${total}</p>
          </div>
        </div>`).join(""),
    };
  }

  function scaleDeckPages() {
    qsa(".a4-shell").forEach((shell) => {
      const page = shell.querySelector(".a4-page");
      if (!page) return;
      const scale = shell.clientWidth / 1122;
      page.style.transform = `scale(${scale})`;
    });
  }

  function renderResult() {
    const { skills, extras, styleLabel, countLabel, durationLabel, priceDisplay, whyText, productName } = computeDerived();

    const existingChecklist = state.persona && state.persona !== "new" ? `
      <div class="card checklist-card">
        <span class="eyebrow">最終チェック</span>
        <h2 class="step-title" style="font-size:19px;">あなたの商品、前よりシンプルに説明できますか？</h2>
        <div>
          ${finalChecklistLabels().map((label, i) => `
            <label class="checklist-item">
              <input type="checkbox" data-fc="${i}" ${state.finalChecklist[i] ? "checked" : ""}>
              <span>${esc(label)}</span>
            </label>`).join("")}
        </div>
        <p class="hint" style="margin-top:14px;">チェックできなかった場所が、次に磨く場所です。<br>商品を増やす前に、ここを磨こう。</p>
      </div>` : "";

    return `
    <div class="result-banner">
      <div class="result-banner__emoji">🎉</div>
      <h1 class="result-banner__title">はい、一旦完成！！！</h1>
      <div class="result-banner__body">まだ70点でも大丈夫。

商品は、机の上で100点にするものではありません。

ここから人に届けて、話して、喜ばれて、失敗して、直して、また届ける。

そうやって、あなたの商品は育っていきます。

これが、あなたの魂商品のはじまりです。</div>
      <p class="result-banner__final">まず、ひとりに届けよう。</p>
    </div>

    <div class="card photo-upload">
      <div class="photo-upload__preview" id="photoPreview">${state.photo ? `<img src="${state.photo}" alt="">` : "📷"}</div>
      <div>
        <label class="btn btn--outline-gold btn--sm" for="photoInput" style="display:inline-block; cursor:pointer;">写真を選ぶ</label>
        <input type="file" id="photoInput" accept="image/*" style="display:none;">
        <p class="hint" style="margin-top:6px;">シートに丸くレイアウトされます（任意）</p>
      </div>
    </div>

    <div class="template-switch" role="group" aria-label="資料のテイスト切り替え">
      ${SHEET_TEMPLATES.map((t) => `<button type="button" class="template-switch__btn${state.sheetTemplate === t.id ? " is-active" : ""}" data-template-switch="${t.id}">${esc(t.name)}</button>`).join("")}
    </div>

    <div class="sheet-wrap" id="printArea">
      <div class="sheet sheet--${esc(state.sheetTemplate || "natural")}" id="sheetCapture">
        <div class="sheet__inner">
          <p class="sheet__eyebrow">MY FIRST SOUL PRODUCT</p>
          <p class="sheet__title">私の、はじめの一品</p>

          ${state.photo ? `<img class="sheet__photo" src="${state.photo}" alt="">` : ""}
          <h2 class="sheet__name">${esc(productName)}</h2>
          <p class="sheet__name-sub">SOUL PRODUCT PROPOSAL SHEET</p>

          <hr class="sheet__divider">

          <div class="sheet__block">
            <p class="sheet__label">💌 対象者</p>
            <p class="sheet__value">${esc(state.s1_who) || "-"}</p>
          </div>
          <div class="sheet__block">
            <p class="sheet__label">📍 現在地</p>
            <p class="sheet__value">${esc(state.s2_now) || "-"}</p>
          </div>
          <div class="sheet__block">
            <p class="sheet__label">🌿 目指す未来</p>
            <p class="sheet__value">${esc(state.s3_future) || "-"}</p>
          </div>

          <hr class="sheet__divider">

          <div class="sheet__block">
            <p class="sheet__label">🕊 WHY ｜ 私がこの商品を届ける理由</p>
            <p class="sheet__value">${esc(whyText) || "-"}</p>
          </div>

          <hr class="sheet__divider">

          <div class="sheet__block">
            <p class="sheet__label">✨ 使用するスキル・経験</p>
            <div class="sheet__tags">${skills.map((s) => `<span class="sheet__tag">${esc(s)}</span>`).join("") || "-"}</div>
          </div>

          <div class="sheet__block">
            <p class="sheet__label">🤝 サポート内容</p>
            <div class="sheet__tags">${extras.map((s) => `<span class="sheet__tag">${esc(s)}</span>`).join("") || "-"}</div>
          </div>

          <div class="sheet__grid">
            <div class="sheet__stat">
              <div class="sheet__stat-label">提供スタイル</div>
              <div class="sheet__stat-value">${esc(styleLabel) || "-"}</div>
            </div>
            <div class="sheet__stat">
              <div class="sheet__stat-label">回数</div>
              <div class="sheet__stat-value">${esc(countLabel) || "-"}</div>
            </div>
            <div class="sheet__stat">
              <div class="sheet__stat-label">1回の時間</div>
              <div class="sheet__stat-value">${esc(durationLabel) || "-"}</div>
            </div>
            <div class="sheet__stat">
              <div class="sheet__stat-label">合計セッション</div>
              <div class="sheet__stat-value">${esc(countLabel) || "-"}</div>
            </div>
          </div>

          <div class="sheet__price">
            <div class="sheet__price-label">PRICE</div>
            <div class="sheet__price-value">${priceDisplay}</div>
          </div>

          <p class="sheet__footer">ここらぼ 魂商品作成キット ｜ はじめの一品編</p>
        </div>
      </div>
    </div>

    <div class="card result-actions">
      <button class="btn btn--primary" id="downloadImgBtn" type="button">シートを画像で保存する</button>
      <button class="btn btn--outline-gold" id="printBtn" type="button">印刷 / PDFで保存する</button>
      <button class="btn btn--ghost" id="editBtn" type="button">← 入力内容を修正する</button>
    </div>

    ${renderDeckSection()}

    ${existingChecklist}

    <div class="restart-row"><button id="restartBtn" type="button">最初からやり直す</button></div>
    `;
  }

  function renderDeckPhotoPanel() {
    const items = DECK_PHOTO_SLOTS.filter((item) => state[item.key]);
    if (items.length === 0) return "";
    return `
    <div class="card deck-photo-panel">
      <span class="eyebrow">写真を追加（任意）</span>
      <p class="step-desc" style="margin-bottom:14px;">ページごとに写真を差し込むと、資料の印象がぐっと柔らかくなります。</p>
      ${items.map((item) => `
        <div class="deck-photo-row">
          <div class="deck-photo-row__preview">${state.deckPhotos[item.key] ? `<img src="${state.deckPhotos[item.key]}" alt="">` : "🖼"}</div>
          <div class="deck-photo-row__body">
            <p class="deck-photo-row__label">${esc(item.label)}</p>
            <label class="btn btn--outline-gold btn--sm" for="deckPhoto_${item.key}" style="display:inline-block;cursor:pointer;">写真を選ぶ</label>
            <input type="file" id="deckPhoto_${item.key}" data-deck-photo-key="${item.key}" accept="image/*" style="display:none;">
          </div>
        </div>`).join("")}
    </div>`;
  }

  function renderDeckSection() {
    const { total, html } = buildDeckPages();
    return `
    <div class="card deck-intro">
      <span class="eyebrow">詳細版｜横A4</span>
      <h2 class="step-title deck-intro__count" style="font-size:19px;">全${total}ページの詳細資料を見る</h2>
      <p class="step-desc">同じ内容を、商談やSNSでも使いやすい横A4の資料としても書き出せます。</p>
      <button class="btn btn--outline-gold" id="toggleDeckBtn" type="button">${deckExpanded ? "詳細資料を閉じる" : "詳細資料を表示する"}</button>
    </div>
    <div id="deckSection" ${deckExpanded ? "" : "hidden"}>
      ${renderDeckPhotoPanel()}
      <div class="deck" id="deckPrintArea">${html}</div>
      <div class="card result-actions">
        <button class="btn btn--primary" id="printDeckBtn" type="button">詳細資料を印刷 / PDFで保存する（横A4・全${total}ページ）</button>
      </div>
    </div>`;
  }

  let deckResizeBound = false;
  let deckExpanded = false;

  function finalChecklistLabels() {
    return [
      "誰を助ける商品か一言で言える",
      "お客様の「今」が見えている",
      "どこへ連れていくか一言で言える",
      "そのゴールに必要な内容だけになっている",
      "なぜ私が届けるのか言葉にできる",
    ];
  }

  function bindResult() {
    const photoInput = qs("#photoInput");
    photoInput.addEventListener("change", () => {
      const file = photoInput.files[0];
      if (!file) return;
      if (file.size > 4 * 1024 * 1024) {
        showToast("写真サイズが大きすぎます。4MB以下の画像を選んでね");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        state.photo = reader.result;
        saveState();
        render();
      };
      reader.readAsDataURL(file);
    });

    qsa("[data-template-switch]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.sheetTemplate = btn.dataset.templateSwitch;
        saveState();
        render();
      });
    });

    qs("#printBtn").addEventListener("click", () => window.print());

    qs("#toggleDeckBtn").addEventListener("click", () => {
      deckExpanded = !deckExpanded;
      const section = qs("#deckSection");
      const btn = qs("#toggleDeckBtn");
      section.hidden = !deckExpanded;
      btn.textContent = deckExpanded ? "詳細資料を閉じる" : "詳細資料を表示する";
      if (deckExpanded) requestAnimationFrame(scaleDeckPages);
    });

    qs("#printDeckBtn").addEventListener("click", () => {
      document.body.classList.add("print-mode-deck");
      window.print();
    });

    qsa("[data-deck-photo-key]").forEach((input) => {
      input.addEventListener("change", () => {
        const file = input.files[0];
        if (!file) return;
        if (file.size > 4 * 1024 * 1024) {
          showToast("写真サイズが大きすぎます。4MB以下の画像を選んでね");
          return;
        }
        const key = input.dataset.deckPhotoKey;
        const reader = new FileReader();
        reader.onload = () => {
          state.deckPhotos[key] = reader.result;
          saveState();
          render();
        };
        reader.readAsDataURL(file);
      });
    });

    if (!deckResizeBound) {
      window.addEventListener("resize", scaleDeckPages);
      window.addEventListener("afterprint", () => document.body.classList.remove("print-mode-deck"));
      deckResizeBound = true;
    }

    if (deckExpanded) requestAnimationFrame(scaleDeckPages);

    qs("#downloadImgBtn").addEventListener("click", async () => {
      if (typeof window.html2canvas !== "function") {
        showToast("画像保存機能を読み込み中、または利用できません。印刷/PDF保存をお試しください");
        return;
      }
      try {
        showToast("画像を作成しています…");
        const target = qs("#sheetCapture");
        const canvas = await window.html2canvas(target, { scale: 2, backgroundColor: "#FBF6F0", useCORS: true });
        const link = document.createElement("a");
        link.download = (state.s9_name || "soul-product") + ".png";
        link.href = canvas.toDataURL("image/png");
        link.click();
        showToast("画像を保存しました！");
      } catch (e) {
        showToast("画像保存に失敗しました。印刷/PDF保存をお試しください");
      }
    });

    qs("#editBtn").addEventListener("click", () => {
      state.currentStep = 1;
      saveState();
      render();
    });

    qs("#restartBtn").addEventListener("click", openResetModal);

    qsa("[data-fc]").forEach((cb) => {
      cb.addEventListener("change", () => {
        const idx = Number(cb.dataset.fc);
        state.finalChecklist[idx] = cb.checked;
        saveState();
      });
    });
  }

  /* ---------------------------------------------------------
     9. リセットモーダル
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
  resetModal.addEventListener("click", (e) => {
    if (e.target === resetModal) closeResetModal();
  });

  /* ---------------------------------------------------------
     10. 初期化
  --------------------------------------------------------- */
  render();
})();
