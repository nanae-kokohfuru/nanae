/* =====================================================================
   BUSINESS COMPASS — CONTENT
   ---------------------------------------------------------------------
   画面の文言・画像・章・質問はすべてこのファイルで管理します。
   UI（app.js / fields.js）を書き換えずに、ここを編集するだけで
   質問の追加・並べ替え・文言変更ができます。

   ■ 質問オブジェクトの書き方
   {
     id:          一意のID（英数字）。保存データのキーになります。
     type:        入力形式（下記参照）
     title:       質問文（\n で改行）
     label:       カルテ一覧で使う短い見出し（省略時は title）
     hint:        質問文の下に出る小さな補足
     placeholder: 入力欄の例文
     lead:        質問の前に置く短いガイド（深い問いの前などに）
     feature:     true にすると Deep Bordeaux の「重要な問い」画面になる
     required:    true にすると未入力で次へ進めない
   }

   ■ type 一覧
   text / textarea / number / url
     … 1項目の入力。number は unit（単位）を指定可
   single   … 単一選択タイル。options: [...]
   multi    … 複数選択タイル。options: [...]
              exclusive: ['いない'] … 他と同時に選べない選択肢
              max: 3               … 選べる上限
              followups: [{ when: { notOnly: ['いない'] }, fields: [...] }]
                … 条件を満たしたときだけ追加欄を表示
                  when は { anyOf: [...] } / { notOnly: [...] } が使えます
   scale    … 段階評価。steps / minLabel / maxLabel
   group    … 複数の小さな入力を1画面に。fields: [{ id, type, label, unit, placeholder }]
   timeline … STORY用のタイムラインカード。min / max / prompts
   route    … ROUTE用の「使っている道具」＋「用途」選択。tools / purposes
   ===================================================================== */

window.BC_CONTENT = {

  /* ---------- 画像スロット ----------
     src を差し替えるだけで写真が変わります。
     position は object-position（写真のどこを見せるか）。
     src を null にすると、写真なしの静かな無地の扉になります。 */
  images: {
    cover:   { src: 'assets/compass-map.jpg', position: '50% 55%', alt: '古い地図の上に置かれた真鍮のコンパス' },
    about:   null,
    current: { src: 'assets/compass-map.jpg', position: '50% 50%', alt: '' },
    story:   { src: 'assets/book-voyage.jpg', position: '50% 62%', alt: '開いた本の上を進む小さな舟' },
    value:   null,
    customer:null,
    service: null,
    route:   { src: 'assets/compass-map.jpg', position: '30% 70%', alt: '古い地図とコンパス' },
    number:  null,
    keypoint:null,
    future:  { src: 'assets/book-voyage.jpg', position: '50% 8%', alt: '光の差す水辺と遠くへ続く景色' },
    final:   { src: 'assets/book-voyage.jpg', position: '50% 20%', alt: '' }
  },

  cover: {
    titleLines: ['BUSINESS', 'COMPASS'],
    tagline: ['Your story.', 'Your business.', 'Your next direction.'],
    catch: ['事業の現在地を知り、', '次の景色へ。'],
    body: [
      'これは「正解を書くため」のシートではありません。',
      'あなた自身と、これまで育ててきた事業を一度ゆっくり見渡し、これから進む方向を見つけるための時間です。',
      'わからないところは、空欄でも大丈夫。',
      '一緒に整理していきましょう。'
    ],
    cta: '旅をはじめる',
    resume: 'つづきから'
  },

  /* ---------- 情報のお取り扱い ----------
     本文は仮文章です。正式文面ができたら body を差し替えてください。 */
  consent: {
    eyebrow: 'BEFORE WE BEGIN',
    title: '大切な情報の\nお取り扱いについて',
    intro: [
      'ここでは、事業内容・売上・商品・お客様・ご家族やチーム・これまでの経験など、大切な情報をお預かりする場合があります。',
      '安心してお話しいただくための約束を、最初にご確認ください。'
    ],
    items: [
      { no: '01', title: '秘密保持',
        body: 'ご記入いただいた内容は、本セッションの担当者以外に開示することはありません。セッション終了後も、秘密として厳重に取り扱います。（仮文章）' },
      { no: '02', title: '利用目的',
        body: 'お預かりした情報は、事業の整理・経営の現状把握・今後の方向性のご提案のためにのみ利用します。（仮文章）' },
      { no: '03', title: '数値・事業情報の取り扱い',
        body: '売上や経費などの数値は、おおよその値で構いません。正確さよりも、現在地をつかむことを目的としています。（仮文章）' },
      { no: '04', title: '個人・家族・顧客等に関する情報',
        body: 'ご家族・チーム・お客様についての記載は、差し支えない範囲でお書きください。個人が特定される情報は必要ありません。（仮文章）' },
      { no: '05', title: '事例・実績としての使用',
        body: 'ご本人の明確な同意なく、事例・実績・お客様の声として内容を公開することはありません。（仮文章）' },
      { no: '06', title: '外部サービス・AI等の利用',
        body: '整理や分析の補助として外部サービスやAIを利用する場合があります。その際は、個人や企業が特定されない形で取り扱います。（仮文章）' },
      { no: '07', title: '成果物について',
        body: 'セッションで作成したカルテや BUSINESS COMPASS は、ご本人の事業のために自由にご活用いただけます。（仮文章）' },
      { no: '08', title: '本セッションの性質',
        body: '本セッションは事業の整理と方向性の検討を目的としたもので、税務・法務などの専門的な助言に代わるものではありません。（仮文章）' }
    ],
    required: '上記の内容を確認し、情報の取り扱いについて同意します。',
    optional: '個人・企業が特定されないよう匿名化された情報を、本サービスの品質改善・研究開発に利用することに同意します。',
    cta: '同意して、カルテをはじめる'
  },

  index: {
    eyebrow: 'THE JOURNEY',
    title: '10の章をめぐる旅',
    body: 'どの章からはじめても構いません。途中で閉じても、書いた内容はこの端末に残ります。'
  },

  final: {
    eyebrow: 'YOUR BUSINESS COMPASS',
    title: 'ここまでの旅、\nおつかれさまでした。',
    body: [
      'あなたが書いたものは、正解でも評価でもありません。',
      'ここから一緒に、事業の現在地と次に進む方向を整理していきます。'
    ]
  },

  /* ---------- 章と質問 ---------- */
  chapters: [
    {
      id: 'about', no: '01', en: 'ABOUT YOU', ja: 'あなた自身の整理',
      doorTitle: 'あなたについて',
      quote: '事業のことを考える前に、\nまず、あなたという人から。',
      questions: [
        { id: 'name', type: 'text', title: 'お名前を教えてください。', label: 'お名前',
          placeholder: '例：山田 花子', autocomplete: 'name' },
        { id: 'brand', type: 'group', title: '屋号・会社名と、\n活動している地域を教えてください。', label: '屋号・地域',
          fields: [
            { id: 'brand', type: 'text', label: '屋号・会社名', placeholder: '例：atelier ○○' },
            { id: 'area',  type: 'text', label: '主な活動地域', placeholder: '例：福岡市／オンライン中心' }
          ] },
        { id: 'family', type: 'textarea', title: 'ご家族について教えてください。', label: 'ご家族',
          hint: '差し支えない範囲で。事業に使える時間や、大切にしたい暮らしを知るための問いです。',
          placeholder: '例：夫、子ども2人', rows: 2 }
      ]
    },
    {
      id: 'current', no: '02', en: 'CURRENT', ja: '事業の現在地整理',
      doorTitle: 'いま立っている場所',
      quote: '地図を広げる前に、\nまず、自分がどこにいるのかを知る。',
      questions: [
        { id: 'style', type: 'multi', title: '現在の事業スタイルで\n当てはまるものを選んでください。', label: '事業スタイル',
          hint: '複数選べます。',
          options: ['店舗', 'サロン', '教室・スクール', 'オンライン講座', 'コンサルティング', 'コーチング・カウンセリング',
                    'セッション・施術', '物販', 'EC', 'イベント', 'コミュニティ・会員制', '法人向けサービス', 'その他'] },
        { id: 'years', type: 'single', title: '事業をはじめて、\nどのくらいになりますか？', label: '事業歴',
          options: ['準備中', '1年未満', '1〜3年', '3〜5年', '5〜10年', '10年以上'] },
        { id: 'team', type: 'multi', title: '現在、一緒に事業をしている人はいますか？', label: 'チーム',
          hint: '複数選べます。',
          options: ['いない', '家族', 'ビジネスパートナー', '正社員', 'パート・アルバイト', '業務委託・外注'],
          exclusive: ['いない'],
          followups: [{
            when: { notOnly: ['いない'] },
            fields: [
              { id: 'count', type: 'number', label: '人数', unit: '名', placeholder: '3' },
              { id: 'roles', type: 'text', label: '主な役割', placeholder: '例：経理は夫、SNS運用は外注' }
            ]
          }] }
      ]
    },
    {
      id: 'story', no: '03', en: 'STORY', ja: 'これまでの歩み・人生の棚卸し',
      doorTitle: 'ここまでの物語',
      quote: 'これまで歩いてきた道の中に、\n次の事業の種は眠っています。',
      questions: [
        { id: 'timeline', type: 'timeline', label: '人生の出来事',
          title: '今のあなたにつながっている\n出来事を、いくつか残してください。',
          hint: '大きな出来事でなくても構いません。心が動いたことを、年齢順に。',
          min: 1, max: 5,
          prompts: {
            age: '何歳ごろ？', event: '何があった？', feeling: 'そのとき、どう感じた？',
            learning: 'そこから何を学んだ？\n何を大切にするようになった？'
          } },
        { id: 'origin', type: 'single', title: '今の事業をはじめた一番のきっかけは？', label: 'はじめたきっかけ',
          options: ['自分自身の経験から', '好きなことを仕事に', '家族・暮らしの変化', '会社員時代の延長', '人から頼まれて', 'その他'] },
        { id: 'why', type: 'textarea', feature: true, label: '続けてこられた理由',
          title: 'それでも、\nこの仕事を\n続けてこられたのは\nなぜだと思いますか？',
          placeholder: '思いつくままに。', rows: 4 }
      ]
    },
    {
      id: 'value', no: '04', en: 'VALUE', ja: '大切にしていること・強みの整理',
      doorTitle: '手放さないもの',
      quote: '強みは、たいてい\n本人にとっては「当たり前」の中にある。',
      questions: [
        { id: 'words', type: 'multi', title: '仕事をするうえで大切にしている言葉を、\n3つまで選んでください。', label: '大切にしている言葉',
          max: 3,
          options: ['誠実', '美しさ', '自由', '安心', '挑戦', '丁寧さ', '楽しさ', '本質', 'つながり', '成長', '信頼', '豊かさ'] },
        { id: 'praise', type: 'text', title: 'お客様や周りの人から、\nよく言われることは何ですか？', label: 'よく言われること',
          placeholder: '例：説明がわかりやすい、空気がやわらかい' }
      ]
    },
    {
      id: 'customer', no: '05', en: 'CUSTOMER', ja: 'お客様の整理',
      doorTitle: '大切にしたい人',
      quote: '誰のための仕事なのかが見えると、\n言葉も、商品も、道も変わる。',
      questions: [
        { id: 'segment', type: 'single', title: '主なお客様は、個人ですか？法人ですか？', label: '顧客区分',
          options: ['個人', '法人', '両方'] },
        { id: 'ages', type: 'multi', title: 'お客様の中心となる年代を選んでください。', label: '中心の年代',
          hint: '複数選べます。',
          options: ['20代', '30代', '40代', '50代', '60代以上', 'わからない'], exclusive: ['わからない'] },
        { id: 'ideal', type: 'textarea', title: 'この先、一番大切にしたいお客様は\nどんな方ですか？', label: '大切にしたいお客様',
          lead: '少しだけ、ここは考えてみてください。',
          placeholder: '例：自分の感覚を信じたいけれど、一歩踏み出せずにいる40代の女性経営者', rows: 3 }
      ]
    },
    {
      id: 'service', no: '06', en: 'SERVICE', ja: '商品・サービスの整理',
      doorTitle: '差し出しているもの',
      quote: '商品とは、あなたが\nお客様に手渡している「変化」のこと。',
      questions: [
        { id: 'main', type: 'group', title: '今いちばん売れている、\nまたは力を入れている商品を教えてください。', label: '主力商品',
          fields: [
            { id: 'name',  type: 'text',   label: '商品・サービス名', placeholder: '例：個別セッション 3ヶ月' },
            { id: 'price', type: 'number', label: '価格', unit: '円', placeholder: '120000' }
          ] },
        { id: 'delivery', type: 'single', title: '提供の形は？', label: '提供形態',
          options: ['対面', 'オンライン', '対面とオンライン両方', '商品の発送'] },
        { id: 'change', type: 'textarea', title: 'その商品を受け取ったお客様は、\nどう変わりますか？', label: 'お客様の変化',
          placeholder: '例：自分の判断に自信を持って、価格を上げられるようになる', rows: 3 }
      ]
    },
    {
      id: 'route', no: '07', en: 'ROUTE', ja: '集客・お客様との出会い方の整理',
      doorTitle: 'お客様と出会う道',
      quote: '道を増やす前に、\n今どこを歩いているのかを知る。',
      questions: [
        { id: 'tools', type: 'route', title: '今、使っているものを\nすべて選んでください。', label: '使っている道',
          hint: 'タップで選択。選んだものには、あとから用途を添えられます。',
          tools: ['Instagram', 'Facebook', 'Threads', 'TikTok', 'YouTube', 'X', 'ブログ', 'note', 'ホームページ',
                  'Googleビジネスプロフィール', 'Hot Pepper', 'STORES', 'BASE', 'Shopify', 'ストアカ', 'ココナラ',
                  '公式LINE', 'Lステップ', 'エルメ', 'UTAGE', 'メルマガ', 'WEB広告', 'チラシ', '看板', 'イベント',
                  '紹介', '口コミ', 'その他'],
          purposesTitle: 'これは主に何に使っていますか？',
          purposes: ['認知', '発信', '問い合わせ', '予約', '教育', '販売', '顧客フォロー'] },
        { id: 'source', type: 'single', title: '新しいお客様は、\n主にどこから来ていますか？', label: '主な入口',
          options: ['紹介・口コミ', 'SNS', '検索・ホームページ', '広告', 'イベント・対面', 'よくわからない'] },
        { id: 'urls', type: 'group', title: 'よろしければ、\n主なURLを教えてください。', label: 'URL',
          fields: [
            { id: 'site', type: 'url', label: 'ホームページ', placeholder: 'https://' },
            { id: 'sns',  type: 'url', label: 'メインのSNS', placeholder: 'https://instagram.com/…' }
          ] }
      ]
    },
    {
      id: 'number', no: '08', en: 'NUMBER', ja: '事業のお金の整理',
      doorTitle: '数字が語ること',
      quote: '数字は、評価ではなく\n現在地を教えてくれる地図の縮尺。',
      questions: [
        { id: 'sales', type: 'group', title: '直近の売上と経費を、\nおおよそで教えてください。', label: '売上・経費',
          hint: 'だいたいで大丈夫です。わからなければ空欄のままで。',
          fields: [
            { id: 'monthly', type: 'number', label: '月の売上（平均）', unit: '万円', placeholder: '80' },
            { id: 'yearly',  type: 'number', label: '年間の売上',       unit: '万円', placeholder: '960' },
            { id: 'cost',    type: 'number', label: '月の経費（平均）', unit: '万円', placeholder: '30' }
          ] },
        { id: 'trend', type: 'single', title: 'この1年の売上の手応えは？', label: '売上の手応え',
          options: ['伸びている', '横ばい', '下がっている', 'わからない'] },
        { id: 'goal', type: 'number', title: '1年後、月の売上はいくらになっていたら\n安心できそうですか？', label: '目標の月商',
          unit: '万円', placeholder: '120' }
      ]
    },
    {
      id: 'keypoint', no: '09', en: 'KEY POINT', ja: '今感じていること・急所の整理',
      doorTitle: '見えにくい急所',
      quote: 'うまくいかない理由はいくつもある。\nけれど、急所はたいてい一つ。',
      questions: [
        { id: 'issues', type: 'multi', title: '今、気になっていることを選んでください。', label: '気になっていること',
          hint: '複数選べます。',
          options: ['集客', '単価・価格', 'リピート', '商品の設計', '発信', '時間の使い方', '人・チーム', 'お金の管理', '方向性', '体力・気力'] },
        { id: 'satisfaction', type: 'scale', title: '今の事業に、どのくらい満足していますか？', label: '事業への満足度',
          steps: 5, minLabel: 'まったく', maxLabel: 'とても' },
        { id: 'wish', type: 'textarea', feature: true, label: '一番うれしい変化',
          title: '本当は、\n何が変わったら\n一番うれしいですか？', rows: 4 }
      ]
    },
    {
      id: 'future', no: '10', en: 'FUTURE', ja: '半年後・1年後の未来整理',
      doorTitle: '次に見たい景色',
      quote: '正解ではなく、\nあなたが本当に行きたい場所へ。',
      questions: [
        { id: 'half', type: 'textarea', title: '半年後、どんな状態になっていたら\n「よかった」と思えますか？', label: '半年後',
          placeholder: '例：月に2日は完全に休めていて、新しい講座の募集が始まっている', rows: 3 },
        { id: 'year', type: 'textarea', feature: true, label: '1年後の景色',
          title: '1年後、\nあなたはどんな景色の中に\nいたいですか？', rows: 4 }
      ]
    }
  ]
};
