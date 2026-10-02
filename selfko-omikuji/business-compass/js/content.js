/* =====================================================================
   BUSINESS COMPASS — CONTENT（80問版）
   ---------------------------------------------------------------------
   画面の文言・画像・章・質問はすべてこのファイルで管理します。
   UI（app.js / fields.js）を書き換えずに、ここを編集するだけで
   質問の追加・並べ替え・文言変更ができます。

   ■ 質問ID（id）について
   id は「意味を持つキー」です（例：'profile.name'、'provider_possible_future.after_inner'）。
   回答はこの id で保存・書き出しされるため、質問の並び順や
   Q番号（表示用。並び順から自動採番）が変わっても、データの意味は壊れません。
   ※ 一度使った id は変更しないでください（保存済みの回答と対応しなくなります）。

   ■ 選択肢の value と label
   { value: '保存される値', label: '画面に出す文字' }
   表示の言い回しを変えるときは label だけを変え、value は変えないでください。
   83問版で保存された回答とそのまま対応させるためです。

   ■ 1画面に2つの入力（統合した質問）
   type: 'group' の fields に saveAs: '保存キー' を付けると、
   その項目は独立したキーで保存・書き出しされます（例：profile.instagram / profile.line）。
   fields の type: 'choice' に otherText: true を付けると「その他」選択時に記入欄が出ます。

   ■ 章の questions に置けるもの
   1. 質問           { id, type, title, ... }
   2. 1画面のまとまり { id, items: [質問, 質問...], layout: 'stack' | 'board' }
   3. 間奏（説明画面） { id, interlude: true, eyebrow, title, subtitle, body: [...] }

   ■ type 一覧
   text / textarea / number / url / date / currency / single / multi / group /
   repeat / timeline / route / beforeAfter / guided / ranking / scale
   （詳しい書き方は fields.js 冒頭と、下の実例を参照）

   ■ 表示文章のきまり
   画面に出す日本語には「。」「、」を使わず、改行と全角スペースで区切ります。
   ===================================================================== */

/* 他の質問から参照する選択肢は、ここで一度だけ定義する */
var BC_AREAS = ['事業の方向性', 'コンセプト', '商品', '価格', '新規集客', 'リピート', 'Instagram', 'ホームページ',
  { value: '公式LINE', label: 'LINE' }, '予約導線', '販売・提案', '売上', '利益', '時間', 'チーム',
  { value: '家族との役割分担', label: '家族との役割' }, '外注', '優先順位',
  { value: '自分自身の役割', label: '自分の役割' }, '今後の展開', 'その他'];

var BC_TOOLS = ['Instagram', 'Facebook', 'Threads', 'TikTok', 'YouTube', 'X', 'ブログ', 'note', 'ホームページ',
  'Googleビジネスプロフィール', 'Hot Pepper Beauty', 'STORES', 'BASE', 'Shopify', 'ストアカ', 'ココナラ',
  '公式LINE', 'Lステップ', 'エルメ', 'UTAGE', 'メルマガ', { value: 'WEB広告', label: 'Web広告' }, 'チラシ', '看板', 'イベント',
  '紹介', '口コミ', 'その他'];

window.BC_CONTENT = {

  /* 全体の問題数（目次・進捗メーターに表示） */
  totalLabel: '全80問',

  /* ---------- 画像スロット ----------
     src を差し替えるだけで写真が変わります。position は object-position（写真のどこを見せるか）。
     pending: true の画像は、ファイルを assets/chapters/ に置いてから pending を消すと表示されます
     （それまでは静かな無地の章扉になります）。 */
  images: {
    cover:    { src: 'assets/compass-map.jpg', position: '50% 55%', alt: '古い地図の上に置かれた真鍮のコンパス' },
    about:    { src: 'assets/chapters/01_this-is-me.jpg', thumb: 'assets/chapters/thumbs/01_this-is-me.jpg', position: '50% 40%', alt: '星空に描かれた人生の道のりを見上げる人' },
    current:  { src: 'assets/chapters/02_now.jpg', thumb: 'assets/chapters/thumbs/02_now.jpg', position: '55% 45%', alt: '世界地図にスタートのピンを刺す人' },
    story:    { src: 'assets/chapters/03_story.jpg', thumb: 'assets/chapters/thumbs/03_story.jpg', position: '50% 60%', alt: '開いた本の上を進む小さな舟' },
    value:    { src: 'assets/chapters/04_value.jpg', thumb: 'assets/chapters/thumbs/04_value.jpg', position: '40% 50%', alt: '割れた岩の中で輝くダイヤモンド' },
    customer: { src: 'assets/chapters/05_customer.jpg', thumb: 'assets/chapters/thumbs/05_customer.jpg', position: '50% 50%', alt: 'やわらかな光の中で手を取り合う二人' },
    service:  { src: 'assets/chapters/06_service.jpg', thumb: 'assets/chapters/thumbs/06_service.jpg', position: '50% 50%', alt: 'リボンのかかった贈り物を手渡す手' },
    route:    { src: 'assets/chapters/07_route.jpg', thumb: 'assets/chapters/thumbs/07_route.jpg', position: '50% 50%', alt: '吊り橋の両側から手を伸ばし合う二人' },
    number:   { src: 'assets/chapters/08_money.jpg', thumb: 'assets/chapters/thumbs/08_money.jpg', position: '60% 50%', alt: '紙幣と金の延べ棒' },
    keypoint: { src: 'assets/chapters/09_key.jpg', thumb: 'assets/chapters/thumbs/09_key.jpg', position: '40% 50%', alt: '山道の裂け目の手前で立ち止まる旅人' },
    future:   { src: 'assets/chapters/10_future.jpg', thumb: 'assets/chapters/thumbs/10_future.jpg', position: '40% 50%', alt: '開いた鳥かごから夕日の空へ飛び立つ鳥' },
    final:    { src: 'assets/book-voyage.jpg', position: '50% 20%', alt: '' }
  },

  cover: {
    titleLines: ['BUSINESS', 'COMPASS'],
    tagline: ['Your story.', 'Your business.', 'Your next direction.'],
    catch: ['事業の現在地を知り', '次の景色へ'],
    body: [
      'これは「正解を書くため」のシートではありません',
      'あなた自身と　これまで育ててきた事業を一度ゆっくり見渡し\nこれから進む方向を見つけるための時間です',
      'わからないところは　空欄でも大丈夫',
      '一緒に整理していきましょう'
    ],
    cta: '旅をはじめる',
    resume: 'つづきから'
  },

  /* ---------- 情報のお取り扱い ---------- */
  consent: {
    eyebrow: 'BEFORE WE BEGIN',
    title: '大切な情報の\nお取り扱いについて',
    intro: [
      'BUSINESS COMPASSでは\n今の事業を一緒に整理するために\n売上や商品　ご家族のこと　これまでの経験など\n少しプライベートなこともお伺いします',
      'ご記入いただいた内容や\nセッションの中でお話しいただいたことは\n今回のBUSINESS COMPASSとセッションのためだけに使用します',
      '送信いただいた回答は\n今回のセッションのために安全に保管し\nご本人の許可なく第三者に共有することはありません',
      'ご本人の許可なく\n内容や数字を第三者に共有したり\nSNS・広告・講座などで公開することはありません',
      '答えたくない質問や　まだわからないことは\n無理に書かなくて大丈夫です',
      '安心して\n今の自分と事業を見つめる時間としてお使いください'
    ],
    items: [],
    required: '上記の内容を確認しました',
    cta: 'BUSINESS COMPASSをはじめる',
    note: 'チェックを入れると　はじめられます'
  },

  /* ---------- 目次 ---------- */
  index: {
    eyebrow: 'THE JOURNEY',
    title: '全80問\n10のテーマをめぐります',
    body: [
      'あなた自身のこと\nこれまでのこと\n今の事業\nお客様\n商品\nお金\nそしてこれから',
      '小さな質問に答えながら\nあなたと事業の現在地を見つけていきます',
      'わからないところは\n空欄でも大丈夫です'
    ]
  },

  /* ---------- 節目のひとこと（その質問番号に来たときだけ表示） ---------- */
  milestones: {
    40: '半分まで来ました！',
    60: 'ここまで来たら　あと少し！',
    72: 'いよいよ最後の景色へ'
  },

  /* ---------- 80問を完走したあとの完了画面 ---------- */
  final: {
    eyebrow: 'YOUR BUSINESS COMPASS',
    title: 'おつかれさまでした〜',
    message: 'あなたの事業の羅針盤が\nできました！',
    congrats: 'おめでとうございます',
    count: '記入した問い',
    /* CTA① 本人の控え（骨子シートへ） */
    compassCta: { pre: 'ここまでの回答を整理した', mid: 'あなたの事業の', brand: 'BUSINESS COMPASS', post: '骨子を見る' },
    /* CTA② 招待リンクから開いた人だけ：回答を送る */
    sendCta: { pre: 'この回答を', main: 'のむら ななえに送る' },
    /* 招待リンクなしで開いた人：CTA② の代わりに記録の残し方 */
    keepTitle: '回答を手元に残す',
    keepBody: 'この端末に保存されています\n印刷・PDF　または回答データとして残せます'
  },

  /* ---------- 骨子シート（本人の回答を10章ごとに整理して見せる） ----------
     AIによる解釈・要約はしません。書かれた言葉をそのまま、まとまりごとに並べます。
     blocks の ids に入っていない質問も、章の最後に必ず表示されます（回答が隠れることはありません）。 */
  compass: {
    eyebrow: 'BUSINESS COMPASS',
    title: 'あなたの事業の骨子',
    lead: '80問の回答を　10のテーマに整理しました\nここにある言葉は　すべてあなたが書いたものです',
    overview: '全体像',
    empty: 'まだ記入がありません',
    all: '80問すべての回答を見る',
    back: '完了画面へ戻る',
    print: '印刷・PDFで保存',
    /* 全体像の行に添える、章ごとの代表の回答（本人の回答をそのまま表示） */
    headline: {
      about: 'profile.brand_names', current: 'business_current.form', story: 'life_story.origin',
      value: 'skills.confident', customer: 'customer_current.segments', service: 'service_structure.continuous',
      route: 'customer_route.main_source', number: 'financial_current.annual_2025',
      keypoint: 'self_perceived_bottleneck.key_one', future: 'future_1y.annual_sales'
    },
    blocks: {
      about: [
        { title: 'プロフィール', ids: ['profile.name', 'profile.brand_names', 'profile.birthday', 'profile.residence', 'profile.family'] },
        { title: '発信・つながり', ids: ['profile.contact', 'profile.other_links'] },
        { title: '好きなこと', ids: ['profile.favorite_work', 'profile.hobbies'] }
      ],
      current: [
        { title: '事業のかたち', ids: ['business_current.form', 'business_current.years', 'business_current.styles', 'business_structure.team'] },
        { title: '商品・サービス', products: true, ids: ['products.list', 'products.core', 'products.grow', 'products.reduce'] }
      ],
      story: [
        { title: '原点と続ける理由', ids: ['life_story.origin', 'life_story.reasons'] },
        { title: '今につながる出来事', ids: ['life_story.timeline'] },
        { title: '心に残っている経験', ids: ['life_story.proud', 'life_story.hardest', 'life_story.turning_point'] }
      ],
      value: [
        { title: '持っている知識・経験', ids: ['qualifications.backgrounds', 'qualifications.certificates', 'knowledge.fields'] },
        { title: '実際にできること', ids: ['skills.offerings', 'skills.confident', 'skills.insight'] },
        { title: 'その力を支えている事実', ids: ['proof.types', 'proof.memorable_results', 'proof.accumulated'] },
        { title: 'あなたと関わることで生まれるもの', ids: ['emotional_value.feelings', 'emotional_value.customer_words', 'personality_impression.traits'] },
        { title: '好きな世界・感性', ids: ['visual_preference.style', 'visual_preference.references', 'emotional_value.takeaway'] }
      ],
      customer: [
        { title: '今のお客様', ids: ['customer_current.segments', 'customer_problem.problems', 'customer_problem.tried', 'customer_desired_future.text'] },
        { title: 'AFTER MAP　あなたが起こせる変化', ids: ['provider_possible_future.after_inner', 'provider_possible_future.after_physical',
          'provider_possible_future.after_behavior', 'provider_possible_future.after_environment',
          'provider_possible_future.after_social_reaction', 'provider_possible_future.after_day_in_life'] },
        { title: 'これから力になりたい人', ids: ['customer_target.want_to_help', 'customer_target.not_fit'] }
      ],
      service: [
        { title: '商品ごとの「一番」', ids: ['service_structure.rankings'] },
        { title: '続いていく仕組み', ids: ['service_structure.continuous', 'service_structure.followups'] },
        { title: 'これから作りたいもの', ids: ['service_structure.wish_products'] }
      ],
      route: [
        { title: '出会い方・届け方', ids: ['customer_route.main_source', 'customer_route.booking_entry', 'customer_route.retention', 'customer_route.tools'] },
        { title: '集客についての感覚', ids: ['customer_route.feelings'] }
      ],
      number: [
        { title: '売上とお客様の数', ids: ['financial_current.annual_2025', 'financial_current.best_month', 'financial_current.monthly_customers', 'financial_current.recent_3months'] },
        { title: 'お金についての感覚', ids: ['financial_current.feelings'] }
      ],
      keypoint: [
        { title: '整理したい場所', ids: ['self_perceived_bottleneck.key_one', 'self_perceived_bottleneck.top3', 'self_perceived_bottleneck.areas'] },
        { title: '一番うれしい変化', ids: ['self_perceived_bottleneck.wish'] }
      ],
      future: [
        { title: '6ヶ月後', ids: ['future_6m.monthly_sales', 'future_6m.grow_product', 'future_6m.change', 'future_6m.feeling'] },
        { title: '1年後', ids: ['future_1y.annual_sales', 'future_1y.business', 'future_1y.team', 'future_1y.time_focus', 'future_1y.customer_words', 'future_1y.life'] },
        { title: '生きていたい毎日', ids: ['future_1y.ideal_day'] },
        { title: 'セッションへ', ids: ['session_goal.today'] }
      ]
    }
  },

  copyright: '© kokofuru',

  /* ---------- 回答をのむら ななえに送る（招待リンクから開いたときの完了画面） ---------- */
  send: {
    sending: '送信中…',
    sendingNote: '送信しています　画面を閉じずにお待ちください',
    doneTitle: '送信しました',
    doneBody: 'ありがとうございました\nセッションでお会いできるのを楽しみにしています',
    sentAt: '送信日時',
    hint: 'ボタンを押すと　ここまでの回答が\nのむら ななえに届きます',
    resendHint: '回答を直したときは　もう一度送ってください\n同じ回答として新しい内容に置きかわります',
    error: '回答はこの端末に保存されています\n通信状況をご確認のうえ\nもう一度送信してください',
    errorInvite: '回答はこの端末に保存されています\nのむら ななえから届いたリンクをもう一度開いてから\n送信してください',
    mineTitle: '私の回答',
    mineLead: '80問の回答を　質問ごとに並べています\n直したいところは「見直す」から変更できます'
  },

  /* ---------- 章と質問 ---------- */
  chapters: [

    /* ============================ 01 THIS IS ME ============================ */
    {
      id: 'about', no: '01', en: 'THIS IS ME', meaning: 'これが私', ja: 'あなたについて', desc: '自分自身を知る',
      quote: '事業のことを考える前に\nまず　あなたという人から',
      questions: [
        { id: 'profile.name', type: 'text', title: 'お名前を教えてください', label: 'お名前',
          placeholder: '例：山田 花子', autocomplete: 'name', required: true },
        { id: 'profile.brand_names', type: 'text', title: '活動名・会社名・屋号を教えてください', label: '活動名・会社名・屋号',
          hint: '複数ある場合は　すべてどうぞ', placeholder: '例：atelier ○○／株式会社○○' },
        { id: 'profile.birthday', type: 'date', title: '生年月日を教えてください', label: '生年月日' },
        { id: 'profile.residence', type: 'text', title: 'お住まいを教えてください', label: 'お住まい',
          hint: '都道府県　市区町村まで\n番地は不要です', placeholder: '東京都清瀬市' },
        { id: 'profile.family', type: 'textarea', rows: 2, title: 'ご家族について教えてください', label: 'ご家族',
          placeholder: '例）夫　子ども2人' },
        { id: 'profile.contact', type: 'group', title: '発信・連絡先を教えてください', label: '発信・連絡先',
          hint: 'どちらも任意です　あるものだけで大丈夫です',
          fields: [
            { id: 'instagram', saveAs: 'profile.instagram', type: 'text', label: 'Instagram の URL またはアカウント名', placeholder: '@account または https://instagram.com/…' },
            { id: 'line', saveAs: 'profile.line', type: 'url', label: '公式LINE の URL', placeholder: 'https://lin.ee/…' }
          ] },
        { id: 'profile.other_links', type: 'repeat', title: 'その他のホームページ・予約ページなど', label: 'その他のページ',
          hint: 'あるものだけで大丈夫です', itemEn: 'PAGE', max: 6, addLabel: '＋ ページを追加',
          fields: [
            { id: 'name', type: 'text', label: '名称', placeholder: '例：ホームページ／予約ページ' },
            { id: 'url', type: 'url', label: 'URL', placeholder: 'https://' }
          ] },
        { id: 'profile.favorite_work', type: 'textarea', rows: 2, label: '一番楽しかった仕事',
          title: '起業する前も含めて\nこれまでで一番楽しかった仕事や\nアルバイトは何ですか',
          placeholder: '例：学生時代のカフェのアルバイト\n常連さんと話すのが楽しかった' },
        { id: 'profile.hobbies', type: 'textarea', rows: 2, label: '好きなこと・趣味',
          title: '好きなこと　趣味\nつい時間を使ってしまうことは何ですか',
          hint: '任意です', placeholder: '例：旅行　器集め　韓国ドラマ' }
      ]
    },

    /* ============================ 02 NOW ============================ */
    {
      id: 'current', no: '02', en: 'NOW', meaning: '今', ja: '今の事業', desc: '事業の現在地を知る',
      quote: '地図を広げる前に\nまず　自分がどこにいるのかを知る',
      questions: [
        { id: 'business_current.form', type: 'single', title: '今の事業のかたちは\nどれに近いですか', label: '事業のかたち',
          options: ['個人事業主', '法人', '会社員＋副業', 'その他'] },
        { id: 'business_current.styles', type: 'multi', title: '今の事業に当てはまるものを\n教えてください', label: '事業スタイル',
          hint: '複数選べます',
          options: ['店舗', 'サロン', '教室・スクール', 'オンライン講座', 'コンサルティング', 'コーチング・カウンセリング',
                    'セッション・施術', '物販', 'EC', 'イベント', 'コミュニティ・会員制',
                    { value: '法人向けサービス', label: '法人向け' }, 'その他'] },
        { id: 'business_current.years', type: 'single', title: '今の事業を始めて\nどのくらいですか', label: '事業歴',
          options: ['1年未満', '1〜3年', '3〜5年', '5〜10年', '10年以上'] },
        { id: 'business_structure.team', type: 'multi', title: '一緒に事業をしている人は\nいますか', label: '一緒に事業をしている人',
          hint: '複数選べます',
          options: ['いない', '家族', 'ビジネスパートナー', '正社員', 'パート・アルバイト',
                    { value: '業務委託・外注', label: '外注' }, 'その他'],
          exclusive: ['いない'],
          followups: [{
            when: { notOnly: ['いない'] },
            fields: [
              { id: 'count', key: 'total', type: 'number', label: '合計人数', unit: '名', placeholder: '3' },
              { id: 'members', type: 'repeat', label: '誰がいるか　主な役割', itemLabel: 'メンバー', itemEn: 'MEMBER',
                max: 10, addLabel: '＋ 人を追加',
                fields: [
                  { id: 'who', type: 'text', label: '誰が', placeholder: '例：夫／外注デザイナー' },
                  { id: 'role', type: 'text', label: '主な役割', placeholder: '例：経理・予約管理' }
                ] }
            ]
          }] },
        { id: 'products.list', type: 'repeat', label: '商品・サービス',
          title: '現在の商品・サービスを\n教えてください',
          hint: 'ここで入力した商品は　このあとの質問でも使います\n価格はだいたいで大丈夫です',
          itemEn: 'SERVICE', max: 12, addLabel: '＋ 商品・サービスを追加',
          fields: [
            { id: 'name', type: 'text', label: '商品・サービス名', placeholder: '例：パーソナルカラー診断' },
            { id: 'summary', type: 'text', label: 'ひとことで内容', placeholder: '例：似合う色を診断し　買い物リストを作る' },
            { id: 'price', type: 'currency', unit: '円', label: '価格', placeholder: '22000' },
            { id: 'form', type: 'choice', label: '形式', options: ['単発', '継続', { value: 'コース', label: '講座' }, '月額', 'その他'] },
            { id: 'place', type: 'choice', label: '提供場所', options: ['対面', 'オンライン', '両方', 'その他'] }
          ] },
        { id: 'products.core', type: 'single', title: '今の事業の中心になっている\n商品・サービスはどれですか', label: '中心の商品',
          optionsFrom: { list: 'products.list', labelField: 'name' },
          emptyNote: { text: '商品・サービスがまだ入力されていません', goto: 'q:products.list', link: '商品を入力する' } },
        { id: 'products.grow', type: 'multi', title: 'これからもっと育てたい\n商品・サービスはどれですか', label: '育てたいもの',
          optionsFrom: { list: 'products.list', labelField: 'name' },
          extraOptions: ['まだ決まっていない'], exclusive: ['まだ決まっていない'] },
        { id: 'products.reduce', type: 'multi', title: '減らしたい　見直したい\n商品・サービスはありますか', label: '減らしたい・見直したいもの',
          optionsFrom: { list: 'products.list', labelField: 'name' },
          extraOptions: ['特になし'], exclusive: ['特になし'] }
      ]
    },

    /* ============================ 03 STORY ============================ */
    {
      id: 'story', no: '03', en: 'STORY', meaning: 'これまでの歩み', ja: 'これまでの歩み', desc: '人生と経験の中にあるものを見つける',
      quote: 'これまで歩いてきた道の中に\n次の事業の種は眠っています',
      questions: [
        { id: 'life_story.origin', type: 'multi', title: 'この仕事を始めたきっかけは\n何ですか', label: '始めたきっかけ',
          hint: '複数選べます',
          options: [
            { value: '昔から好きだった', label: '好きだった' }, '得意だった',
            { value: '資格や技術を身につけた', label: '資格・技術を持っていた' },
            { value: '人から頼まれるようになった', label: '人から頼まれた' },
            { value: '自分自身の経験や悩みがきっかけ', label: '自分自身の経験や悩み' },
            { value: '家族・家業がきっかけ', label: '家業だった' },
            '働き方を変えたかった', '独立したかった',
            { value: '収入を作りたかった', label: '収入をつくりたかった' },
            '偶然の出会い', 'その他'],
          followups: [{ fields: [
            { id: 'note', type: 'textarea', rows: 2, label: 'もう少し教えてください（任意）', placeholder: '例：自分の肌荒れがきっかけで化粧品を学び始めた' }
          ] }] },
        { id: 'life_story.timeline', type: 'timeline', label: '今につながる出来事',
          title: '今のあなたにつながっている出来事を\n最大5つ教えてください',
          hint: '大きな出来事でなくても構いません\n心が動いたことを　年齢順に',
          min: 1, max: 5, ageLabel: '何歳頃',
          prompts: [
            { id: 'event', type: 'text', label: '何があった', placeholder: '例：会社を辞めて　はじめて自分の名前で仕事をした' },
            { id: 'feeling', type: 'textarea', rows: 2, label: 'その時どう感じた', short: '感じたこと' },
            { id: 'learning', type: 'textarea', rows: 2, label: '何を学んだ', short: '学んだこと' },
            { id: 'value', key: 'value_since', type: 'textarea', rows: 2, label: '何を大切にするようになった', short: '大切にしたこと' }
          ] },
        { id: 'life_story.proud', type: 'textarea', title: 'これまでを振り返って\n「私　よくやったな」と思う経験は\nありますか', label: 'よくやった経験',
          lead: '少しだけ　ここは考えてみてください', rows: 3 },
        { id: 'life_story.hardest', type: 'textarea', rows: 3, title: 'これまでで特につらかったこと\n悔しかったことはありますか', label: 'つらかったこと・悔しかったこと',
          hint: '任意です　書ける範囲で大丈夫です' },
        { id: 'life_story.turning_point', type: 'textarea', rows: 3, title: '人生や仕事の大きな分岐点になった\n出来事はありますか', label: '大きな分岐点',
          hint: '任意です' },
        { id: 'life_story.reasons', type: 'multi', title: '今もこの仕事を続けている理由に\n近いものを教えてください', label: '続けている理由',
          hint: '複数選べます',
          options: [
            { value: 'この仕事そのものが好き', label: '仕事が好き' },
            { value: 'お客様の変化を見るのが好き', label: 'お客様の変化がうれしい' },
            { value: '自分の技術や経験を役立てたい', label: '自分の経験や技術を生かしたい' },
            '家族や会社を守りたい',
            { value: '収入を作りたい', label: '収入をつくりたい' },
            '自分らしく働きたい', '社会に伝えたいことがある',
            { value: 'まだうまく言葉にできない', label: 'うまく言葉にできない' }, 'その他'],
          followups: [{ fields: [
            { id: 'note', type: 'textarea', rows: 2, label: 'もう少し話せそうなら教えてください（任意）' }
          ] }] }
      ]
    },

    /* ============================ 04 VALUE ============================ */
    {
      id: 'value', no: '04', en: 'VALUE', meaning: '価値', ja: 'あなたの価値', desc: '強み　経験　眠っている価値を発掘する',
      quote: '強みは　たいてい\n本人にとっては「当たり前」の中にある',
      questions: [
        { id: 'qualifications.backgrounds', type: 'multi', section: { en: 'A', ja: '持っている知識・経験' },
          title: 'これまで身につけてきたものを\n教えてください', label: '身につけてきたもの',
          hint: '仕事以外で身についたものも　どうぞ',
          options: ['資格・免許', '専門知識', '専門技術', '業界経験',
            { value: '接客経験', label: '接客' }, { value: '営業経験', label: '営業' },
            { value: '教える経験', label: '教えること' },
            { value: 'コーチング・カウンセリング経験', label: 'コーチング・カウンセリング' },
            '経営', '商品開発', '企画', { value: '発信・SNS', label: 'SNS' }, 'デザイン・クリエイティブ',
            { value: 'マネジメント経験', label: 'マネジメント' },
            { value: '子育て・家庭での経験', label: '子育て・家庭' },
            { value: '自分自身の人生経験', label: '人生経験' }, 'その他'],
          perOption: {
            title: 'よければ　少しだけ詳しく',
            hint: 'わかる項目だけで大丈夫です',
            fields: [
              { id: 'detail', type: 'text', label: '具体的な内容', placeholder: '例：アパレル販売' },
              { id: 'years', type: 'number', label: '年数', unit: '年', placeholder: '8' },
              { id: 'people', type: 'number', label: '経験人数・対応人数の目安', unit: '人', placeholder: '300' }
            ]
          } },
        { id: 'qualifications.certificates', type: 'repeat', section: { en: 'A', ja: '持っている知識・経験' },
          title: '持っている資格・免許・認定などを\n教えてください', label: '資格・免許・認定',
          hint: 'あるものだけで大丈夫です', itemLabel: '資格', max: 10, addLabel: '＋ 追加',
          fields: [{ id: 'text', type: 'text', placeholder: '例：○○協会認定講師' }] },
        { id: 'knowledge.fields', type: 'repeat', section: { en: 'A', ja: '持っている知識・経験' },
          title: '深く学んできた知識や分野を\n教えてください', label: '深く学んできた分野',
          hint: 'あるものだけで大丈夫です', itemLabel: '分野', max: 10, addLabel: '＋ 追加',
          fields: [{ id: 'text', type: 'text', placeholder: '例：色彩心理　栄養学　マーケティング' }] },
        { id: 'skills.offerings', type: 'repeat', section: { en: 'B', ja: '実際にできること' },
          title: 'お客様に提供できる\nあなたの「できること」を教えてください', label: '提供できること',
          hint: '動詞で書くと書きやすくなります\n例：整える／教える／診断する／施術する／作る／デザインする／言葉にする／提案する／伴走する／改善する',
          itemLabel: 'できること', max: 5, addLabel: '＋ もうひとつ',
          fields: [{ id: 'text', type: 'text', placeholder: '例：似合う色を診断する' }] },
        { id: 'skills.confident', type: 'multi', section: { en: 'B', ja: '実際にできること' },
          title: 'その中で\n「これはかなり自信がある」と\n思うものはどれですか', label: '特に自信があること',
          optionsFrom: { list: 'skills.offerings', labelField: 'text' },
          emptyNote: { text: 'ひとつ前の質問で「できること」を書くと　ここに表示されます', goto: 'q:skills.offerings', link: '書きに戻る' } },
        { id: 'skills.insight', type: 'textarea', rows: 2, section: { en: 'B', ja: '実際にできること' },
          title: 'これまでの経験があるからこそ\n人より早く気づけることや\n理解できることはありますか', label: '人より早く気づけること',
          hint: '任意です', placeholder: '例：表情や声のトーンで　疲れの原因がだいたいわかる' },
        { id: 'proof.types', type: 'multi', section: { en: 'C', ja: 'その力を支えている事実' },
          title: 'あなたの経験や実力を\n裏付けているものを教えてください', label: '裏付けになるもの',
          options: ['資格・認定', '経験年数', { value: '提供人数', label: '対応人数' }, 'お客様の成果・変化', 'リピート', '紹介', '口コミ',
                    { value: '受賞歴', label: '受賞' }, 'メディア掲載', { value: '販売実績', label: '販売数' }, '売上実績',
                    { value: '企業・団体との仕事', label: '法人・団体との仕事' },
                    { value: '自分自身の体験', label: '自分自身の経験' }, 'その他'],
          perOption: {
            title: '数字や具体的な内容があれば',
            hint: 'だいたいで構いません',
            fields: [{ id: 'detail', type: 'text', label: '数字・具体的な内容', placeholder: '例：のべ1,200人／リピート率7割' }]
          } },
        { id: 'proof.memorable_results', type: 'textarea', rows: 3, section: { en: 'C', ja: 'その力を支えている事実' },
          title: '特に印象に残っている\nお客様の変化や成果はありますか', label: '印象に残っている成果・変化',
          hint: '任意です', placeholder: '例：自信がなかった方が　半年後に自分のお店を開いた' },
        { id: 'proof.accumulated', type: 'textarea', rows: 2, section: { en: 'C', ja: 'その力を支えている事実' },
          title: '「これだけは積み重ねてきた」と思える\n経験や実績は何ですか', label: '積み重ねてきたこと',
          placeholder: '例：10年間　毎月欠かさず講座を開いてきた' },
        { id: 'emotional_value.feelings', type: 'multi', section: { en: 'D', ja: 'あなたと関わることで生まれるもの' },
          title: 'あなたと一緒にいると\n人はどんな気持ちになると思いますか', label: 'あなたといると生まれる気持ち',
          max: 5, maxSoft: true,
          options: ['安心する', '元気になる', '前向きになる', '落ち着く', '勇気が出る', '本音を話せる', '楽しい', '背中を押される',
                    '癒される', '頭が整理される', '自信が出る', { value: '刺激をもらう', label: '刺激を受ける' }, '自分らしくいられる', 'その他'] },
        { id: 'emotional_value.customer_words', type: 'repeat', section: { en: 'D', ja: 'あなたと関わることで生まれるもの' },
          title: 'お客様から実際に言われて\n印象に残っている言葉はありますか', label: 'お客様から言われた言葉',
          hint: '任意です', itemLabel: '言葉', max: 3, addLabel: '＋ もうひとつ',
          fields: [{ id: 'text', type: 'text', placeholder: '例：「話すと頭がすっきりする」' }] },
        { id: 'personality_impression.traits', type: 'multi', section: { en: 'D', ja: 'あなたと関わることで生まれるもの' },
          title: '周りの人から\nどんな人だと言われることが多いですか', label: '周りから言われる人柄',
          options: ['明るい', { value: '穏やか', label: '落ち着いている' }, 'エネルギッシュ', '知的', '親しみやすい', '上品', '個性的', '頼れる', '包容力がある',
                    'ストイック', '面白い', { value: '芯がある', label: '芯が強い' }, '行動力がある', '安心感がある', 'その他'],
          noOther: true,
          followups: [{ fields: [
            { id: 'note', type: 'text', label: '実際に言われた言葉があれば（任意）', placeholder: '例：「ぶれないね」' }
          ] }] },
        { id: 'visual_preference.style', type: 'group', section: { en: 'E', ja: '好きな世界・感性' },
          title: '惹かれる色・世界観を\n教えてください', label: '惹かれる色・世界観',
          hint: 'それぞれ複数選べます',
          fields: [
            { id: 'colors', saveAs: 'visual_preference.colors', type: 'choice', multiple: true, small: false, otherText: true,
              label: 'A｜惹かれる色',
              options: [
                { value: '白', label: '白', swatch: '#FBFAF7' }, { value: '黒', label: '黒', swatch: '#1F1B19' },
                { value: 'アイボリー', label: 'アイボリー', swatch: '#F1EBE1' }, { value: 'ベージュ', label: 'ベージュ', swatch: '#D8C7AE' },
                { value: 'ブラウン', label: 'ブラウン', swatch: '#6B4A3A' }, { value: 'ゴールド', label: 'ゴールド', swatch: '#A8844F' },
                { value: 'シルバー', label: 'シルバー', swatch: '#B9B9B6' }, { value: '赤', label: '赤', swatch: '#A3302A' },
                { value: 'ボルドー', label: 'ボルドー', swatch: '#4A1F22' }, { value: 'ピンク', label: 'ピンク', swatch: '#D9A5A4' },
                { value: 'ブルー', label: 'ブルー', swatch: '#4E6A85' }, { value: 'グリーン', label: 'グリーン', swatch: '#686657' },
                'その他'] },
            { id: 'worlds', saveAs: 'visual_preference.worlds', type: 'choice', multiple: true, small: false, otherText: true,
              label: 'B｜惹かれる世界観',
              options: ['ナチュラル', 'モード', 'ラグジュアリー', 'クラシック', 'ミニマル', 'エレガント', 'カジュアル', 'ポップ',
                        '和', 'アート', 'ヴィンテージ', '都会的', '自然', { value: '温かい', label: 'あたたかい' },
                        { value: '静かな', label: '静か' }, '力強い', 'その他'] }
          ] },
        { id: 'visual_preference.references', type: 'repeat', section: { en: 'E', ja: '好きな世界・感性' },
          title: '好きなブランド　お店　ホテル　雑誌\n映画　場所　Instagramなどがあれば\n教えてください', label: '好きなもの・場所',
          hint: '任意です　名称またはURLだけでも大丈夫です', itemEn: 'FAVORITE', max: 8, addLabel: '＋ もうひとつ',
          fields: [
            { id: 'name', type: 'text', label: '名称', placeholder: '例：アマン京都／雑誌 Kinfolk' },
            { id: 'url', type: 'url', label: 'URL（あれば）', placeholder: 'https://' }
          ] },
        { id: 'emotional_value.takeaway', type: 'multi', section: { en: 'E', ja: '好きな世界・感性' },
          title: 'お客様に最後に持ち帰ってほしい気持ちは\n何ですか', label: '持ち帰ってほしい気持ち',
          max: 3,
          options: ['安心', '自信', '希望', '自由', '喜び', '美しさ', '心地よさ', '誇らしさ', 'ワクワク', '落ち着き',
                    '勇気', '自分らしさ', '可能性', 'その他'] }
      ]
    },

    /* ============================ 05 CUSTOMER ============================ */
    {
      id: 'customer', no: '05', en: 'CUSTOMER', meaning: 'お客様', ja: 'お客様', desc: '誰をどんな未来へ連れていけるか',
      quote: '誰のための仕事なのかが見えると\n言葉も　商品も　道も変わる',
      questions: [
        { id: 'customer_current.segments', type: 'multi', title: '今のお客様に当てはまるものを\n教えてください', label: '今のお客様',
          hint: '複数選べます',
          options: ['20代', '30代', '40代', '50代', '60代以上',
                    { value: '女性中心', label: '女性' }, { value: '男性中心', label: '男性' },
                    { value: '経営者', label: '起業家' }, '会社員', '専門職', '子育て中', '主婦・主夫', '法人', 'その他'] },
        { id: 'customer_problem.problems', type: 'repeat', title: 'お客様は\nどんな悩みや困りごとを持って\n来られることが多いですか', label: 'お客様の悩み・困りごと',
          itemLabel: '困りごと', max: 5, addLabel: '＋ もうひとつ',
          fields: [{ id: 'text', type: 'text', placeholder: '例：自分に似合う服がわからない' }] },
        { id: 'customer_problem.tried', type: 'textarea', rows: 2, title: 'あなたのところへ来る前に\nお客様がすでに試していることは\nありますか', label: 'すでに試していること',
          hint: '任意です', placeholder: '例：YouTubeで独学　他のサロン　本' },
        { id: 'customer_desired_future.text', type: 'textarea', rows: 3, title: 'お客様自身は\n最終的にどうなりたいと\n言っていますか', label: 'お客様が望んでいる未来',
          hint: 'お客様ご本人が思い描いている未来を　あなたから見た言葉で',
          placeholder: '例：毎朝迷わずに服を選んで　自信を持って人前に出たい' },

        /* ---- AFTER MAP ---- */
        { id: 'aftermap.intro', interlude: true, variant: 'aftermap',
          eyebrow: 'AFTER MAP', title: 'BEFORE → AFTER',
          subtitle: 'あなたなら　その方を\nどこまで連れていけますか',
          body: [
            'お客様自身が望んでいる未来と\nあなたが実際に力になれる未来は\n同じとは限りません',
            'あなたの経験　知識　技術を使ったとき\nその方にはどんな変化が起こせそうでしょうか',
            '正解ではなく\n今思う範囲で大丈夫です'
          ],
          cta: 'MAP をひらく' },
        { id: 'provider_possible_future.after_inner', type: 'beforeAfter', variant: 'aftermap', mapNo: 1,
          title: '心や気持ちは\nどんな状態からどんな状態へ\n変わりそうですか', label: '心・気持ちの変化',
          before: { label: '今はどんな気持ち・考え方・状態', placeholder: '例：自分に自信がなく　人の目が気になる' },
          after: { label: 'どんな気持ち・自分になれそう', placeholder: '例：「これが私」と思えて　堂々としていられる' } },
        { id: 'provider_possible_future.after_physical', type: 'beforeAfter', variant: 'aftermap', mapNo: 2,
          title: '身体　見た目　能力　状態などは\nどんな状態からどんな状態へ\n変わりそうですか', label: '身体・見た目・能力・状態の変化',
          hint: '美容・健康だけでなく　スキル・能力・仕事の状態など\nご自身の事業に合わせて考えてください',
          before: { label: '今はどんな状態', placeholder: '例：顔色がくすんで見え　疲れて見られる' },
          after: { label: 'どんな状態になれそう', placeholder: '例：顔色が明るく見え　若々しい印象になる' } },
        { id: 'provider_possible_future.after_behavior', type: 'beforeAfter', variant: 'aftermap', mapNo: 3,
          title: '行動や日常は\nどんな状態からどんな状態へ\n変わりそうですか', label: '行動・日常の変化',
          before: { label: '今は何ができていない\nどんな毎日', placeholder: '例：服選びに毎朝20分迷っている' },
          after: { label: '何ができるようになる\n毎日はどう変わる', placeholder: '例：5分で服が決まり　朝に余裕ができる' } },
        { id: 'provider_possible_future.after_environment', type: 'beforeAfter', variant: 'aftermap', mapNo: 4,
          title: '環境　仕事　人間関係などは\nどんな状態からどんな状態へ\n変わりそうですか', label: '環境・仕事・人間関係の変化',
          before: { label: '今は周囲や環境とどんな関係', placeholder: '例：職場で意見を言えず　遠慮している' },
          after: { label: '家族・仕事・人間関係・環境は\nどう変わる', placeholder: '例：打ち合わせで自分から提案できるようになる' } },
        { id: 'provider_possible_future.after_social_reaction', type: 'repeat', variant: 'aftermap', mapNo: 5,
          title: '変化したお客様を見て\n周りの人は何と言いそうですか', label: '周りから言われそうな言葉',
          itemLabel: '言葉', max: 3, addLabel: '＋ もうひとつ',
          fields: [{ id: 'text', type: 'text', placeholder: '例：「最近なんか楽しそうだね」「雰囲気変わったね」' }] },
        { id: 'provider_possible_future.after_day_in_life', type: 'guided', variant: 'aftermap', mapNo: 6,
          title: 'そのお客様の6ヶ月後の\nある1日を想像してみてください', label: '6ヶ月後のある1日',
          hint: 'すべてに答える必要はありません\n浮かんだ場面を　ひとつの文章でどうぞ',
          guides: ['朝起きた時の気持ち', '鏡を見た時', '日中何をしているか', '仕事',
                   '家族や人間関係', '周りから何と言われているか', '眠る前の気持ち'],
          placeholder: '例：朝　クローゼットを開けるのが楽しみになっている…', rows: 6 },
        { id: 'customer_target.want_to_help', type: 'textarea', rows: 3, title: 'これから\nもっと力になりたいのは\nどんな人ですか', label: 'もっと力になりたい人',
          placeholder: '例：子育てがひと段落して　自分の仕事を始めたい40代の女性' },
        { id: 'customer_target.not_fit', type: 'textarea', rows: 2, title: '反対に\n今の自分ではあまり力になれないと\n思うのはどんな人ですか', label: '力になれないかもしれない人',
          hint: '任意です', placeholder: '例：すぐに答えだけを欲しい方' }
      ]
    },

    /* ============================ 06 SERVICE ============================ */
    {
      id: 'service', no: '06', en: 'SERVICE', meaning: '商品・サービス', ja: '商品・サービス', desc: '今の商品とこれからの可能性を整理する',
      quote: '商品とは　あなたが\nお客様に手渡している「変化」のこと',
      questions: [
        { id: 'service_structure.rankings', type: 'ranking', title: '今の商品・サービスについて\n教えてください', label: '商品ごとの「一番」',
          hint: 'それぞれ一番近いものを選んでください\n同じ商品を何度選んでも大丈夫です',
          optionsFrom: { list: 'products.list', labelField: 'name' }, extraOptions: ['わからない'],
          emptyNote: { text: '02 NOW で商品・サービスを入力すると　ここで選べるようになります', goto: 'q:products.list', link: '商品を入力する' },
          categories: [
            { id: 'most_chosen', label: '一番選ばれている' },
            { id: 'most_appreciated', label: '一番喜ばれている' },
            { id: 'most_confident', label: '一番自信がある' },
            { id: 'most_profitable', label: '一番利益が残っている感覚がある' },
            { id: 'most_to_grow', label: '一番育てたい' }
          ] },
        { id: 'service_structure.continuous', type: 'single', title: '継続して利用していただく\n商品や仕組みはありますか', label: '継続して利用していただく商品',
          options: ['ある', 'ない', { value: '今考えている', label: '考えている' }, { value: 'よくわからない', label: 'わからない' }],
          followups: [{ when: { anyOf: ['ある'] }, fields: [
            { id: 'products', type: 'choice', multiple: true, label: 'どの商品・サービスですか',
              optionsFrom: { list: 'products.list', labelField: 'name' },
              emptyNote: { text: '02 NOW で商品を入力すると　ここで選べます' } }
          ] }] },
        { id: 'service_structure.followups', type: 'multi', title: 'サービス提供後\nお客様とはどのようにつながっていますか', label: '提供後のつながり',
          options: [{ value: '次回来店の案内', label: '次回来店' }, 'LINE', 'メール', '電話', 'SNS',
                    { value: 'ホームケアの提案', label: 'ホームケア' }, { value: '継続コースの案内', label: '継続講座' }, 'コミュニティ',
                    { value: '資料・動画等の提供', label: '資料・動画' }, { value: '特にしていない', label: '特になし' }, 'その他'],
          exclusive: ['特にしていない'] },
        { id: 'service_structure.wish_products', type: 'textarea', rows: 3, title: 'これから作ってみたい\n商品やサービスはありますか', label: '作ってみたい商品・サービス',
          hint: '任意です', placeholder: '例：少人数で旅をしながら学ぶリトリート' }
      ]
    },

    /* ============================ 07 ROUTE ============================ */
    {
      id: 'route', no: '07', en: 'ROUTE', meaning: '届け方', ja: '届け方', desc: 'お客様との出会い方　つながり方を整理する',
      quote: '道を増やす前に\n今どこを歩いているのかを知る',
      questions: [
        { id: 'customer_route.tools', type: 'route', title: '現在使っている\nお客様との出会い方や届け方を\n教えてください', label: '使っている出会い方・届け方',
          hint: 'タップで選択\n選んだものには　あとから用途を添えられます',
          tools: BC_TOOLS,
          purposesTitle: 'これは主に何に使っていますか',
          purposes: ['認知', '発信', '問い合わせ', '予約', '教育', '販売', '顧客フォロー'] },
        { id: 'customer_route.main_source', type: 'single', title: '新しいお客様との出会いが\n一番多いのはどこですか', label: '新しいお客様の一番の入口',
          optionsFrom: { routeTools: 'customer_route.tools', labels: BC_TOOLS }, extraOptions: ['わからない'],
          emptyNote: { text: 'ひとつ前の質問で選ぶと　ここに表示されます', goto: 'q:customer_route.tools', link: '選びに戻る' } },
        { id: 'customer_route.booking_entry', type: 'multi', title: '予約や申し込みは\n主にどこから入りますか', label: '予約・申し込みの入口',
          optionsFrom: { routeTools: 'customer_route.tools', labels: BC_TOOLS }, extraOptions: ['その他'] },
        { id: 'customer_route.retention', type: 'single', title: '一度来てくださったお客様と\nその後もつながる仕組みはありますか', label: 'その後もつながる仕組み',
          options: ['かなりある', { value: '一応ある', label: '少しある' }, 'あまりない', 'ない', 'わからない'] },
        { id: 'customer_route.feelings', type: 'multi', title: '今の集客について\n近い感覚を教えてください', label: '集客についての感覚',
          options: [{ value: 'もっと新規のお客様と出会いたい', label: '新規をもっと増やしたい' },
                    { value: 'リピーターを増やしたい', label: 'リピートを増やしたい' },
                    { value: '発信しているが反応が弱い', label: '発信しても反応が少ない' },
                    { value: '紹介・口コミに偏っている', label: '紹介に頼っている' },
                    { value: '集客経路が多すぎて整理したい', label: '入口が多すぎる' },
                    { value: '何をやればいいかわからない', label: '何をしたらいいかわからない' },
                    { value: '発信や集客に使う時間が足りない', label: '時間が足りない' },
                    { value: '今は集客には困っていない', label: '集客には困っていない' }, 'その他'] }
      ]
    },

    /* ============================ 08 MONEY ============================ */
    {
      id: 'number', no: '08', en: 'MONEY', meaning: 'お金', ja: 'お金', desc: '売上とお金の現在地を知る',
      quote: '数字は　評価ではなく\n現在地を教えてくれる地図の縮尺',
      doorNote: [
        'ここは誰かに評価されるための数字ではありません',
        '今の事業を一緒に正しく見るための現在地です',
        '正確にわからないものは\nおおよそでも大丈夫です'
      ],
      questions: [
        { id: 'financial_current.annual_2025', type: 'currency', unit: '万円', unknown: true,
          title: '2025年の年間売上を\n教えてください', label: '2025年の年間売上', placeholder: '960' },
        { id: 'financial_current.recent_3months', type: 'group', inline: true, title: '直近3ヶ月の売上を\n教えてください', label: '直近3ヶ月の売上',
          fields: [
            { id: 'm1', key: 'one_month_ago', type: 'currency', unit: '万円', unknown: true, label: '1ヶ月前', placeholder: '80' },
            { id: 'm2', key: 'two_months_ago', type: 'currency', unit: '万円', unknown: true, label: '2ヶ月前', placeholder: '75' },
            { id: 'm3', key: 'three_months_ago', type: 'currency', unit: '万円', unknown: true, label: '3ヶ月前', placeholder: '90' }
          ] },
        { id: 'financial_current.best_month', type: 'currency', unit: '万円', unknown: true,
          title: 'これまでで一番高かった月の売上を\n教えてください', label: '一番高かった月の売上', placeholder: '150' },
        { id: 'financial_current.monthly_customers', type: 'number', unit: '人',
          title: '1ヶ月のお客様数は\nおおよそ何人くらいですか', label: '1ヶ月のお客様数', hint: '任意です', placeholder: '40' },
        { id: 'financial_current.feelings', type: 'multi', title: '今のお金について\n近い感覚を教えてください', label: 'お金についての感覚',
          options: [{ value: '売上をもっと増やしたい', label: '売上を増やしたい' },
                    { value: '利益をもっと残したい', label: '利益を残したい' },
                    { value: '売上はあるが忙しすぎる', label: '売上はあるけれど忙しすぎる' },
                    { value: '経費をもっと把握したい', label: '経費を把握したい' },
                    { value: '商品ごとの利益がよくわからない', label: '商品ごとの利益がわからない' },
                    { value: '数字を見るのが少し苦手', label: '数字を見るのが苦手' },
                    { value: '収入の波を小さくしたい', label: '月ごとの波を小さくしたい' },
                    { value: '現状には比較的満足している', label: '比較的満足している' }, 'その他'] }
      ]
    },

    /* ============================ 09 KEY ============================ */
    /* ここは「本人が感じている課題」。分析者が判断する急所とは区別して
       self_perceived_bottleneck として保存します。 */
    {
      id: 'keypoint', no: '09', en: 'KEY', meaning: '鍵　大切なところ', ja: '事業の急所', desc: '今いちばん整える場所を見つける',
      quote: 'うまくいかない理由はいくつもある\nけれど　急所はたいてい一つ',
      questions: [
        { id: 'self_perceived_bottleneck.areas', type: 'multi', title: '今\n整理したいと感じている場所を\n教えてください', label: '整理したい場所',
          hint: '複数選べます', options: BC_AREAS },
        { id: 'self_perceived_bottleneck.top3', type: 'multi', title: 'その中でも\n特に整理したいものを\n3つ選んでください', label: '特に整理したいもの（3つまで）',
          max: 3, optionsFrom: { selected: 'self_perceived_bottleneck.areas', keepOther: true, labels: BC_AREAS },
          emptyNote: { text: 'ひとつ前の質問で選ぶと　ここに表示されます', goto: 'q:self_perceived_bottleneck.areas', link: '選びに戻る' } },
        { id: 'self_perceived_bottleneck.key_one', type: 'single', title: 'その中で\nここが変わったら他も動きそうだと\n思うものはどれですか', label: '変わったら他も動きそうなもの',
          optionsFrom: { selected: 'self_perceived_bottleneck.top3', fallback: 'self_perceived_bottleneck.areas', keepOther: true, labels: BC_AREAS },
          emptyNote: { text: '前の質問で選ぶと　ここに表示されます', goto: 'q:self_perceived_bottleneck.areas', link: '選びに戻る' } },
        { id: 'self_perceived_bottleneck.wish', type: 'textarea', feature: true, label: '一番うれしい変化',
          title: '本当は\n何が変わったら\n一番うれしいですか', rows: 4 }
      ]
    },

    /* ============================ 10 FUTURE ============================ */
    {
      id: 'future', no: '10', en: 'FUTURE', meaning: '未来', ja: 'これから', desc: '半年後　1年後の未来を描く',
      quote: '正解ではなく\nあなたが本当に行きたい場所へ',
      questions: [
        { id: 'future_6m.monthly_sales', type: 'currency', unit: '万円', section: { en: '6 MONTHS LATER', ja: '6ヶ月後' },
          title: '6ヶ月後\n理想の月商はいくらですか', label: '6ヶ月後の理想の月商', hint: '任意です', placeholder: '100' },
        { id: 'future_6m.grow_product', type: 'single', section: { en: '6 MONTHS LATER', ja: '6ヶ月後' },
          title: '6ヶ月後\nもっと育てていたい商品・サービスは\nどれですか', label: '6ヶ月後に育てていたい商品',
          optionsFrom: { list: 'products.list', labelField: 'name' }, extraOptions: [{ value: 'まだない新しい商品', label: '新しい商品' }],
          followups: [{ when: { anyOf: ['まだない新しい商品'] }, fields: [
            { id: 'new_product', type: 'text', label: 'どんな商品・サービス', placeholder: '例：オンラインの継続講座' }
          ] }] },
        { id: 'future_6m.change', type: 'group', section: { en: '6 MONTHS LATER', ja: '6ヶ月後' },
          title: '6ヶ月後\n今より増やしたいことと\n減らしたいことを教えてください', label: '増やしたいこと・減らしたいこと',
          fields: [
            { id: 'increase', saveAs: 'future_6m.increase', type: 'textarea', rows: 2, label: 'A｜増やしたいこと', placeholder: '例：新規のお客様　休日' },
            { id: 'decrease', saveAs: 'future_6m.decrease', type: 'textarea', rows: 2, label: 'B｜減らしたいこと', placeholder: '例：夜のDM対応' }
          ] },
        { id: 'future_6m.feeling', type: 'textarea', rows: 2, section: { en: '6 MONTHS LATER', ja: '6ヶ月後' },
          title: '6ヶ月後\nどんな気持ちで仕事をしていたいですか', label: '6ヶ月後の仕事の気持ち', placeholder: '例：余白を持って　楽しみながら' },
        { id: 'future_1y.annual_sales', type: 'currency', unit: '万円', section: { en: 'ONE YEAR LATER', ja: '1年後' },
          title: '1年後\n理想の年間売上はいくらですか', label: '1年後の理想の年間売上', hint: '任意です', placeholder: '1500' },
        { id: 'future_1y.business', type: 'textarea', rows: 3, section: { en: 'ONE YEAR LATER', ja: '1年後' },
          title: '1年後\nどんな事業になっていたら最高ですか', label: '1年後の事業の姿',
          placeholder: '例：講座が柱になり　紹介だけで満席が続いている' },
        { id: 'future_1y.team', type: 'textarea', rows: 2, section: { en: 'ONE YEAR LATER', ja: '1年後' },
          title: '1年後\n誰と　どんなチームで\n仕事をしていますか', label: '1年後のチーム', placeholder: '例：アシスタント1名と　外注チーム' },
        { id: 'future_1y.time_focus', type: 'textarea', rows: 2, section: { en: 'ONE YEAR LATER', ja: '1年後' },
          title: '1年後\nあなた自身は\n何に一番時間を使っていますか', label: '1年後に時間を使っていること', placeholder: '例：新しい講座づくり' },
        { id: 'future_1y.customer_words', type: 'textarea', rows: 2, section: { en: 'ONE YEAR LATER', ja: '1年後' },
          title: '1年後\nお客様からどんな言葉を\nもらっていますか', label: '1年後にもらっている言葉', placeholder: '例：「人生が変わった」' },
        { id: 'future_1y.life', type: 'textarea', rows: 3, section: { en: 'ONE YEAR LATER', ja: '1年後' },
          title: '1年後\n仕事以外の時間を\nどんなふうに過ごしていますか', label: '1年後の暮らし',
          placeholder: '例：年に2回は家族で旅行に行き　週末は仕事をしない' },
        { id: 'future_1y.ideal_day', type: 'textarea', feature: true, label: '1年後に生きていたい毎日',
          title: '売上も\n時間も\n家族も\n一度ぜんぶわがままに\n叶えていいとしたら\n\n1年後\nあなたはどんな毎日を\n生きていたいですか', rows: 5 },
        { id: 'session_goal.today', type: 'textarea', eyebrow: 'LAST QUESTION', label: 'セッションで整理されていたら最高なこと',
          title: '今日\nななえと話し終わったとき\n何が整理されていたら最高ですか', rows: 4 }
      ]
    }
  ]
};
