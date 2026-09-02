(function(){
  "use strict";

  var QUESTIONS = [
    {
      text: "父方・母方の血縁に、薄毛の方はいらっしゃいますか？",
      options: [
        { label: "いない、あるいは分からない", value: 0 },
        { label: "遠い親戚にいるかもしれない", value: 1 },
        { label: "どちらか一方の家系にいる", value: 2 },
        { label: "両方の家系にいる", value: 3 }
      ]
    },
    {
      text: "最近、枕・ブラシ・排水口にからまる抜け毛の量は？",
      options: [
        { label: "特に気にしたことがない", value: 0 },
        { label: "心なしか、少し増えた気がする", value: 1 },
        { label: "明らかに、以前より増えた", value: 2 },
        { label: "毎日、思わずゾッとする量だ", value: 3 }
      ]
    },
    {
      text: "鏡の前に立ったとき、生え際や頭頂部の地肌が気になりますか？",
      options: [
        { label: "まったく気にならない", value: 0 },
        { label: "光の加減で、たまに気になる", value: 1 },
        { label: "人に指摘されたことがある", value: 2 },
        { label: "自分でも、はっきりと分かる", value: 3 }
      ]
    },
    {
      text: "最近の睡眠・食生活・ストレスの状態は、いかがですか？",
      options: [
        { label: "万全。よく眠り、よく食べている", value: 0 },
        { label: "まあまあ、普通", value: 1 },
        { label: "忙しくて、乱れがち", value: 2 },
        { label: "正直、慢性的にボロボロだ", value: 3 }
      ]
    },
    {
      text: "頭皮のケア（シャンプー選び・マッサージ・紫外線対策など）はしていますか？",
      options: [
        { label: "毎日、丁寧にケアしている", value: 0 },
        { label: "たまに気にする程度", value: 1 },
        { label: "特に何もしていない", value: 2 },
        { label: "帽子・喫煙など、むしろ負担をかけている", value: 3 }
      ]
    }
  ];

  var LEVELS = [
    {
      max: 2,
      num: "1",
      name: "平穏",
      title: "警戒レベル1｜平穏",
      narrative: "静かな朝だ。\n鏡に映るあなたの頭皮に、不穏な影は見当たらない。\n事件性なし——今のところは。",
      voice: "……今のところは、な。気は抜くなよ。",
      advice: [
        "今の生活習慣は、あなたの頭皮にとって味方です。睡眠・食事・ストレスケアを、これからも大切にしてください。",
        "紫外線や摩擦などの外的刺激から頭皮を守る習慣を、引き続き意識するとより安心です。",
        "半年に一度ほど、鏡でご自身の頭皮の変化をチェックする習慣をおすすめします。"
      ]
    },
    {
      max: 5,
      num: "2",
      name: "注意報",
      title: "警戒レベル2｜注意報",
      narrative: "遠くで、小さな異変が囁かれ始めている。\nまだ誰も気づいていない。\nだが、あなたは——気づいてしまった。",
      voice: "静かだからって、油断すんなよ。俺は、もう気づいてる。",
      advice: [
        "睡眠不足や食生活の乱れは、頭皮環境に影響しやすい時期です。生活リズムを一度見直してみましょう。",
        "洗浄力の強すぎるシャンプーは避け、頭皮に優しいケアを意識してみてください。",
        "頭皮マッサージで血行を促す習慣を、今のうちから始めておくと安心です。"
      ]
    },
    {
      max: 9,
      num: "3",
      name: "警報",
      title: "警戒レベル3｜警報",
      narrative: "抜け毛という名の証拠は、もはや無視できない量になっている。\n事態は静かに、しかし確実に進行中だ。",
      voice: "証拠は、揃った。あとは——お前が、どう動くかだ。",
      advice: [
        "一度、皮膚科やAGA専門クリニックで頭皮の状態を相談されることをおすすめします。早めの相談が、後の安心につながります。",
        "喫煙や過度な飲酒は血行を悪くし、頭皮環境に影響することがあります。見直しの良い機会にしてみてください。",
        "育毛剤や頭皮用美容液の使用も、選択肢のひとつとして検討してみましょう。"
      ]
    },
    {
      max: 12,
      num: "4",
      name: "特別警報",
      title: "警戒レベル4｜特別警報",
      narrative: "もはや局地的な問題ではない。\n頭皮全体を巻き込む、大規模な変化の兆しが見えている。\n一刻の猶予も、贅沢かもしれない。",
      voice: "急げ。俺にできるのは、こうして警告することだけだ。",
      advice: [
        "できるだけ早く、皮膚科またはAGA専門クリニックを受診し、専門的な診断を受けることを強くおすすめします。",
        "進行を遅らせる治療法（内服薬・外用薬など）についても、医師に相談してみましょう。",
        "一人で抱え込まず、専門家や信頼できる人に相談することも、心の負担を軽くする大切な一歩です。"
      ]
    },
    {
      max: 15,
      num: "5",
      name: "特別警報・観測史上最大級",
      title: "警戒レベル5｜特別警報（観測史上最大級）",
      narrative: "これは、もはや前例のない事態である。\n観測史上、類を見ない規模の変化が進行中だ。\nしかし——まだ、物語は終わっていない。",
      voice: "ここまで来たら、笑うしかない……なんてな。今すぐ、動け。",
      advice: [
        "できるだけ早く、専門医療機関（皮膚科・AGAクリニック）を受診してください。早期の対応が、今後の選択肢を大きく広げます。",
        "治療法は年々進化しています。自己判断で諦めず、まずは専門家に現状を相談してみましょう。",
        "見た目の変化に心が揺れるのは自然なことです。無理に一人で抱え込まず、周囲や専門家の力を借りてください。"
      ]
    }
  ];

  var app = document.getElementById("app");
  var state = { index: 0, answers: [] };

  function el(tag, className, html){
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (html !== undefined) node.innerHTML = html;
    return node;
  }

  function render(node){
    app.innerHTML = "";
    app.appendChild(node);
  }

  function renderIntro(){
    var card = el("div", "card intro");
    card.appendChild(el("p", "eyebrow", "REPORT NO. 001"));
    card.appendChild(el("h1", null, "はげちゃん診断"));
    card.appendChild(el("p", "sub", "─ その毛根に、光はまだ差しているか ─"));
    card.appendChild(el("p", "lede",
      "深夜、洗面所の鏡の前で、あなたはふと気づいてしまった。\n" +
      "排水口に絡みつく、いつもより多い抜け毛。\n" +
      "これは、単なる偶然か。それとも——。\n\n" +
      "気づけば、はげちゃんがそこに立っている。\n" +
      "無言のまま、あなたの頭皮をじっと見つめている。\n\n" +
      "5つの質問が、あなたの頭皮の「今」を静かに暴き出す。"
    ));

    var meta = el("div", "meta");
    meta.appendChild(el("span", "chip", "⏱ 所要時間 約1分"));
    meta.appendChild(el("span", "chip", "❓ 質問数 5問"));
    meta.appendChild(el("span", "chip", "👆 選ぶだけ・入力不要"));
    card.appendChild(meta);

    var btn = el("button", "btn", "診断を、始める");
    btn.type = "button";
    btn.addEventListener("click", function(){
      state.index = 0;
      state.answers = [];
      renderQuestion();
    });
    card.appendChild(btn);

    render(card);
  }

  function renderQuestion(){
    var q = QUESTIONS[state.index];
    var card = el("div", "card question");

    var progressRow = el("div", "progress-row");
    progressRow.appendChild(el("span", "eyebrow", "CASE FILE"));
    progressRow.appendChild(el("span", "progress-count", "第 " + (state.index + 1) + " 問 / 全 " + QUESTIONS.length + " 問"));
    card.appendChild(progressRow);

    var track = el("div", "progress-track");
    var fill = el("div", "progress-fill");
    fill.style.width = Math.round((state.index / QUESTIONS.length) * 100) + "%";
    track.appendChild(fill);
    card.appendChild(track);

    card.appendChild(el("h2", null, q.text));

    var options = el("div", "options");
    q.options.forEach(function(opt){
      var btn = el("button", "option", opt.label);
      btn.type = "button";
      btn.addEventListener("click", function(){
        selectAnswer(opt.value);
      });
      options.appendChild(btn);
    });
    card.appendChild(options);

    render(card);
  }

  function selectAnswer(value){
    state.answers.push(value);

    var card = el("div", "card analyzing");
    card.appendChild(el("p", "eyebrow", "解析中"));
    card.appendChild(el("p", null, "証言を、記録している" + '<span class="dots"><span></span><span></span><span></span></span>'));
    render(card);

    setTimeout(function(){
      if (state.index + 1 < QUESTIONS.length){
        state.index += 1;
        renderQuestion();
      } else {
        renderResult();
      }
    }, 450);
  }

  function pickLevel(score){
    for (var i = 0; i < LEVELS.length; i++){
      if (score <= LEVELS[i].max) return LEVELS[i];
    }
    return LEVELS[LEVELS.length - 1];
  }

  function renderResult(){
    var score = state.answers.reduce(function(sum, v){ return sum + v; }, 0);
    var maxScore = QUESTIONS.length * 3;
    var level = pickLevel(score);

    var card = el("div", "card result");
    card.appendChild(el("p", "eyebrow", "はげちゃん診断結果 ─ FINAL REPORT"));

    var stamp = el("div", "stamp");
    stamp.appendChild(el("span", "stamp-inner",
      '<span class="stamp-level">LEVEL</span><span class="stamp-num">' + level.num + "</span>"
    ));
    card.appendChild(stamp);

    card.appendChild(el("p", "result-title", level.title));
    card.appendChild(el("p", "result-score", "総合スコア　" + score + " / " + maxScore));
    card.appendChild(el("p", "result-narrative", level.narrative));
    card.appendChild(el("p", "voice-note", "はげちゃん、曰く。「" + level.voice + "」"));

    card.appendChild(el("h3", null, "これからの、対策"));
    var list = el("ul", "advice-list");
    level.advice.forEach(function(text){
      list.appendChild(el("li", null, text));
    });
    card.appendChild(list);

    var actions = el("div", "result-actions");
    var retry = el("button", "btn btn--ghost", "もう一度、診断する");
    retry.type = "button";
    retry.addEventListener("click", renderIntro);
    actions.appendChild(retry);
    card.appendChild(actions);

    render(card);
  }

  renderIntro();
})();
