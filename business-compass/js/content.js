/* =====================================================================
   BUSINESS COMPASS — CONTENT
   ---------------------------------------------------------------------
   画面の文言・画像・章・質問はすべてこのファイルで管理します。
   UI（app.js / fields.js）を書き換えずに、ここを編集するだけで
   質問の追加・並べ替え・文言変更ができます。

   ■ 質問ID（id）について
   id は「意味を持つキー」です（例：'profile.name'、'provider_possible_future.after_inner'）。
   回答はこの id で保存・書き出しされるため、質問の並び順や
   Q番号（表示用。並び順から自動採番）が変わっても、データの意味は壊れません。
   書き出し（JSON）の data は、id の「.」で階層化されます。
   ※ 一度使った id は変更しないでください（保存済みの回答と対応しなくなります）。

   ■ 章の questions に置けるもの
   1. 質問           { id, type, title, ... }
   2. 1画面のまとまり { id, items: [質問, 質問...], layout: 'stack' | 'board', title?, hint? }
      … 小さな質問を1画面に自然にまとめ、体感の負荷を下げるためのもの。
   3. 間奏（説明画面） { id, interlude: true, eyebrow, title, subtitle, body: [...] }

   ■ 質問オブジェクトの共通項目
     title:       質問文（\n で改行）
     label:       カルテ一覧で使う短い見出し（省略時は title）
     hint:        質問文の下の小さな補足
     placeholder: 入力欄の例文
     lead:        質問の前に置く短いガイド
     section:     { en, ja } 章の中の小見出し（VALUE の A〜E など）
     variant:     'aftermap' … AFTER MAP の画面デザインにする
     feature:     true … Deep Bordeaux の「重要な問い」画面にする
     required:    true … 未入力では次へ進めない

   ■ type 一覧
   text / textarea / number / url / date
   currency   … 金額。unit: '万円' | '円'、unknown: true で「わからない」を選べる
   single     … 単一選択タイル
   multi      … 複数選択タイル
                options: [...]  または  groups: [{ label, options }]
                optionsFrom: 他の回答から選択肢をつくる
                  { list: 'products.list', labelField: 'name' } … くり返し入力の各項目から
                  { selected: '質問ID', fallback: '質問ID' }    … 他の複数選択で選んだものから
                  { routeTools: 'customer_route.tools' }          … ROUTE で選んだ道具から
                extraOptions: 動的な選択肢の後ろに足す固定の選択肢
                emptyNote: { text, goto, link } … 元の回答が空のときの案内
                exclusive: ['いない'] … 他と同時に選べない選択肢
                max: 3（maxSoft: true で「おすすめ」表示のみ・制限なし）
                followups: [{ when?: { anyOf | notOnly }, fields: [...] }]
                  … 条件を満たしたときだけ出る追加欄（when なしは常に表示）
                perOption: { title, fields } … 選んだ選択肢ごとの詳細欄
                「その他」を選ぶと、自動で「その他の内容」欄が出ます
   repeat     … くり返し入力。fields: [...]、min / max / addLabel / itemEn
                fields が1つなら行形式、複数ならカード形式
   timeline   … STORY のタイムラインカード。prompts: [...]
   route      … ROUTE の「使っている道具」＋「用途」
   beforeAfter… AFTER MAP の BEFORE → AFTER
   guided     … 考えるヒントつきの自由記述。guides: [...]
   ranking    … 商品ごとの「一番」を選ぶ。categories: [{ id, label }]
   group      … 小さな入力をいくつか並べる（直近3ヶ月の売上など）
   scale      … 段階評価

   小さな入力（fields の中）で使える type：
   text / textarea / number / url / date / currency / choice（multiple 可）/ repeat
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

    /* ============================ 01 ABOUT YOU ============================ */
    {
      id: 'about', no: '01', en: 'ABOUT YOU', ja: 'あなた自身の整理',
      doorTitle: 'あなたについて',
      quote: '事業のことを考える前に、\nまず、あなたという人から。',
      questions: [
        { id: 'about.s1', layout: 'stack', items: [
          { id: 'profile.name', type: 'text', title: 'お名前を教えてください。', label: 'お名前',
            placeholder: '例：山田 花子', autocomplete: 'name', required: true },
          { id: 'profile.brand_names', type: 'text', title: '活動名・会社名・屋号を教えてください。', label: '活動名・会社名・屋号',
            hint: '複数ある場合は、すべてどうぞ。', placeholder: '例：atelier ○○／株式会社○○' }
        ] },
        { id: 'about.s2', layout: 'stack', items: [
          { id: 'profile.birthday', type: 'date', title: '生年月日を教えてください。', label: '生年月日' },
          { id: 'profile.residence', type: 'text', title: 'お住まいを教えてください。', label: 'お住まい',
            hint: '都道府県・市区町村くらいで大丈夫です。番地は不要です。', placeholder: '東京都清瀬市' }
        ] },
        { id: 'profile.family', type: 'textarea', rows: 2, title: 'ご家族について教えてください。', label: 'ご家族',
          placeholder: '例）夫、子ども2人' },
        { id: 'about.links', layout: 'stack', title: 'あなたの活動が見える場所', hint: 'あるものだけで大丈夫です。', items: [
          { id: 'profile.instagram', type: 'text', title: 'Instagram の URL またはアカウント名', label: 'Instagram',
            placeholder: '@account または https://instagram.com/…' },
          { id: 'profile.line', type: 'url', title: '公式LINE の URL', label: '公式LINE', placeholder: 'https://lin.ee/…' },
          { id: 'profile.other_links', type: 'repeat', title: 'その他、使っているHP・予約ページなど', label: 'その他のページ',
            itemEn: 'PAGE', max: 6, addLabel: '＋ ページを追加',
            fields: [
              { id: 'name', type: 'text', label: '名称', placeholder: '例：ホームページ／予約ページ' },
              { id: 'url', type: 'url', label: 'URL', placeholder: 'https://' }
            ] }
        ] },
        { id: 'profile.favorite_work', type: 'textarea', rows: 2, label: '一番楽しかった仕事',
          title: '起業前も含めて、これまでで一番楽しかった・\nワクワクした仕事やアルバイトは何ですか？',
          placeholder: '例：学生時代のカフェのアルバイト。常連さんと話すのが楽しかった' },
        { id: 'profile.hobbies', type: 'textarea', rows: 2, label: '好きなこと・趣味',
          title: '仕事以外で好きなこと、趣味、推し、\nつい時間を使ってしまうものはありますか？',
          placeholder: '例：旅行、器集め、韓国ドラマ' }
      ]
    },

    /* ============================ 02 CURRENT ============================ */
    {
      id: 'current', no: '02', en: 'CURRENT', ja: '事業の現在地整理',
      doorTitle: 'いま立っている場所',
      quote: '地図を広げる前に、\nまず、自分がどこにいるのかを知る。',
      questions: [
        { id: 'business_current.form', type: 'single', title: '現在の事業形態を教えてください。', label: '事業形態',
          options: ['個人事業主', '法人', '会社員＋副業', 'その他'] },
        { id: 'business_current.styles', type: 'multi', title: '現在の事業スタイルで、\n当てはまるものをすべて選んでください。', label: '事業スタイル',
          options: ['店舗', 'サロン', '教室・スクール', 'オンライン講座', 'コンサルティング', 'コーチング・カウンセリング',
                    'セッション・施術', '物販', 'EC', 'イベント', 'コミュニティ・会員制', '法人向けサービス', 'その他'] },
        { id: 'business_current.years', type: 'single', title: '事業を始めて、\nどのくらいですか？', label: '事業歴',
          options: ['1年未満', '1〜3年', '3〜5年', '5〜10年', '10年以上'] },
        { id: 'business_structure.team', type: 'multi', title: '現在、一緒に事業をしている人はいますか？', label: '一緒に事業をしている人',
          hint: '複数選べます。',
          options: ['いない', '家族', 'ビジネスパートナー', '正社員', 'パート・アルバイト', '業務委託・外注', 'その他'],
          exclusive: ['いない'],
          followups: [{
            when: { notOnly: ['いない'] },
            fields: [
              { id: 'count', key: 'total', type: 'number', label: '合計人数', unit: '名', placeholder: '3' },
              { id: 'members', type: 'repeat', label: '誰が、どんな役割を？', itemLabel: 'メンバー', itemEn: 'MEMBER',
                max: 10, addLabel: '＋ 人を追加',
                fields: [
                  { id: 'who', type: 'text', label: '誰が', placeholder: '例：夫／外注デザイナー' },
                  { id: 'role', type: 'text', label: '主な役割', placeholder: '例：経理・予約管理' }
                ] }
            ]
          }] },
        { id: 'products.list', type: 'repeat', label: '商品・サービス',
          title: '現在提供している商品・サービスを\n教えてください。',
          hint: 'ここで入力した商品は、このあとの質問でも使います。価格はだいたいで大丈夫です。',
          itemEn: 'SERVICE', max: 12, addLabel: '＋ 商品・サービスを追加',
          fields: [
            { id: 'name', type: 'text', label: '商品・サービス名', placeholder: '例：パーソナルカラー診断' },
            { id: 'summary', type: 'text', label: '内容（一言でOK）', placeholder: '例：似合う色を診断し、買い物リストを作る' },
            { id: 'price', type: 'currency', unit: '円', label: '価格', placeholder: '22000' },
            { id: 'form', type: 'choice', label: '提供形式', options: ['単発', '継続', 'コース', '月額', 'その他'] },
            { id: 'place', type: 'choice', label: '提供場所', options: ['対面', 'オンライン', '両方', 'その他'] }
          ] },
        { id: 'products.core', type: 'single', title: '今、一番中心になっている商品・サービスはどれですか？', label: '中心の商品',
          optionsFrom: { list: 'products.list', labelField: 'name' },
          emptyNote: { text: '商品・サービスがまだ入力されていません。', goto: 'q:products.list', link: '商品を入力する' } },
        { id: 'current.products', layout: 'stack', items: [
          { id: 'products.grow', type: 'multi', title: 'これから、もっと育てたいと思っているものは？', label: '育てたいもの',
            optionsFrom: { list: 'products.list', labelField: 'name' },
            extraOptions: ['まだ決まっていない'], exclusive: ['まだ決まっていない'] },
          { id: 'products.reduce', type: 'multi', title: '逆に、今後減らしたい・見直したいものは？', label: '減らしたい・見直したいもの',
            optionsFrom: { list: 'products.list', labelField: 'name' },
            extraOptions: ['特になし'], exclusive: ['特になし'] }
        ] }
      ]
    },

    /* ============================ 03 STORY ============================ */
    {
      id: 'story', no: '03', en: 'STORY', ja: 'これまでの歩み・人生の棚卸し',
      doorTitle: 'ここまでの物語',
      quote: 'これまで歩いてきた道の中に、\n次の事業の種は眠っています。',
      questions: [
        { id: 'life_story.origin', type: 'multi', title: '今の仕事を始めたきっかけとして、\n近いものを選んでください。', label: '始めたきっかけ',
          options: ['昔から好きだった', '得意だった', '資格や技術を身につけた', '人から頼まれるようになった',
                    '自分自身の経験や悩みがきっかけ', '家族・家業がきっかけ', '働き方を変えたかった', '独立したかった',
                    '収入を作りたかった', '偶然の出会い', 'その他'],
          followups: [{ fields: [
            { id: 'note', type: 'textarea', rows: 2, label: 'もう少し教えてください（任意）', placeholder: '例：自分の肌荒れがきっかけで、化粧品を学び始めた' }
          ] }] },
        { id: 'life_story.timeline', type: 'timeline', label: '今につながる出来事',
          title: 'これまでの人生・仕事で\n「今の自分につながっている」と思う出来事を\n教えてください。',
          hint: '大きな出来事でなくても構いません。心が動いたことを、年齢順に。',
          min: 1, max: 5,
          prompts: [
            { id: 'event', type: 'text', label: '何があった？', placeholder: '例：会社を辞めて、はじめて自分の名前で仕事をした' },
            { id: 'feeling', type: 'textarea', rows: 2, label: 'そのとき、どんな気持ちだった？', short: '気持ち' },
            { id: 'learning', type: 'textarea', rows: 2, label: 'その経験から何を学んだ？', short: '学んだこと' },
            { id: 'value', key: 'value_since', type: 'textarea', rows: 2, label: 'それ以来、大切にするようになったことは？', short: '大切にしたこと' }
          ] },
        { id: 'life_story.proud', type: 'textarea', title: 'これまでで\n「私、よく頑張ったな」と思う経験は？', label: 'よく頑張った経験',
          lead: '少しだけ、ここは考えてみてください。', rows: 3 },
        { id: 'story.hard', layout: 'stack', hint: '書けるほうだけで大丈夫です。', items: [
          { id: 'life_story.hardest', type: 'textarea', rows: 3, title: 'これまでで、一番しんどかった・悔しかった経験は？', label: 'しんどかった・悔しかった経験' },
          { id: 'life_story.turning_point', type: 'textarea', rows: 3, title: '人生や仕事の大きな転機になった出来事は？', label: '大きな転機' }
        ] },
        { id: 'life_story.reasons', type: 'multi', title: '今この仕事を続けている理由として、\n近いものを選んでください。', label: '続けている理由',
          options: ['この仕事そのものが好き', 'お客様の変化を見るのが好き', '自分の技術や経験を役立てたい', '家族や会社を守りたい',
                    '収入を作りたい', '自分らしく働きたい', '社会に伝えたいことがある', 'まだうまく言葉にできない', 'その他'],
          followups: [{ fields: [
            { id: 'note', type: 'textarea', rows: 2, label: 'もう少し話せそうなら教えてください。（任意）' }
          ] }] }
      ]
    },

    /* ============================ 04 VALUE ============================ */
    {
      id: 'value', no: '04', en: 'VALUE', ja: 'あなたがすでに持っているものの整理',
      doorTitle: '手放さないもの',
      quote: '強みは、たいてい\n本人にとっては「当たり前」の中にある。',
      questions: [
        /* A｜持っている知識・経験 */
        { id: 'qualifications.backgrounds', type: 'multi', section: { en: 'A', ja: '持っている知識・経験' },
          title: 'これまで身につけてきたものを選んでください。', label: '身につけてきたもの',
          hint: '仕事以外で身についたものも、どうぞ。',
          options: ['資格・免許', '専門知識', '専門技術', '業界経験', '接客経験', '営業経験', '教える経験',
                    'コーチング・カウンセリング経験', 'マネジメント経験', '商品開発', '企画', '発信・SNS',
                    'デザイン・クリエイティブ', '経営', '子育て・家庭での経験', '自分自身の人生経験', 'その他'],
          perOption: {
            title: 'よければ、少しだけ詳しく',
            hint: 'わかる項目だけで大丈夫です。',
            fields: [
              { id: 'detail', type: 'text', label: '具体的には？', placeholder: '例：アパレル販売' },
              { id: 'years', type: 'number', label: '何年くらい？', unit: '年', placeholder: '8' },
              { id: 'people', type: 'number', label: '何人くらいに？', unit: '人', placeholder: '300' }
            ]
          } },
        { id: 'value.learned', layout: 'stack', section: { en: 'A', ja: '持っている知識・経験' }, hint: 'あるものだけで大丈夫です。', items: [
          { id: 'qualifications.certificates', type: 'repeat', title: '持っている資格・免許・認定があれば教えてください。', label: '資格・免許・認定',
            itemLabel: '資格', max: 10, addLabel: '＋ 追加',
            fields: [{ id: 'text', type: 'text', placeholder: '例：○○協会認定講師' }] },
          { id: 'knowledge.fields', type: 'repeat', title: 'これまで特に深く学んできた知識・分野は？', label: '深く学んできた分野',
            itemLabel: '分野', max: 10, addLabel: '＋ 追加',
            fields: [{ id: 'text', type: 'text', placeholder: '例：色彩心理、栄養学、マーケティング' }] }
        ] },

        /* B｜実際にできること */
        { id: 'skills.offerings', type: 'repeat', section: { en: 'B', ja: '実際にできること' },
          title: 'あなたがお客様に実際に\n提供できることを教えてください。', label: '提供できること',
          hint: '動詞で書くと書きやすくなります。例：整える／教える／診断する／施術する／作る／デザインする／言語化する／提案する／伴走する／改善する',
          itemLabel: 'できること', max: 5, addLabel: '＋ もうひとつ',
          fields: [{ id: 'text', type: 'text', placeholder: '例：似合う色を診断する' }] },
        { id: 'skills.confident', type: 'multi', section: { en: 'B', ja: '実際にできること' },
          title: 'その中で「これはかなり自信がある」と\n思うものは？', label: '特に自信があること',
          optionsFrom: { list: 'skills.offerings', labelField: 'text' },
          emptyNote: { text: 'ひとつ前の質問で「できること」を書くと、ここに表示されます。', goto: 'q:skills.offerings', link: '書きに戻る' } },
        { id: 'skills.insight', type: 'textarea', rows: 2, section: { en: 'B', ja: '実際にできること' },
          title: '経験を重ねたからこそ\n「人より早く気づける・わかる」と思うことは\nありますか？', label: '人より早く気づけること',
          placeholder: '例：表情や声のトーンで、疲れの原因がだいたいわかる' },

        /* C｜その力を支えている事実 */
        { id: 'proof.types', type: 'multi', section: { en: 'C', ja: 'その力を支えている事実' },
          title: 'あなたの力やサービスの価値を裏付けるものとして、\n当てはまるものを選んでください。', label: '裏付けになるもの',
          options: ['資格・認定', '経験年数', '提供人数', 'お客様の成果・変化', 'リピート', '紹介', '口コミ', '受賞歴',
                    'メディア掲載', '販売実績', '売上実績', '企業・団体との仕事', '自分自身の体験', 'その他'],
          perOption: {
            title: '具体的な数字や内容があれば',
            hint: 'だいたいで構いません。',
            fields: [{ id: 'detail', type: 'text', label: '数字・実績・内容', placeholder: '例：のべ1,200人／リピート率7割' }]
          } },
        { id: 'value.proof', layout: 'stack', section: { en: 'C', ja: 'その力を支えている事実' }, items: [
          { id: 'proof.memorable_results', type: 'textarea', rows: 3, title: 'これまでのお客様の成果や変化で、\n特に印象に残っているものは？', label: '印象に残っている成果・変化',
            placeholder: '例：自信がなかった方が、半年後に自分のお店を開いた' },
          { id: 'proof.accumulated', type: 'textarea', rows: 2, title: '「これだけは積み重ねてきた」と言える\n経験や実績はありますか？', label: '積み重ねてきたこと',
            placeholder: '例：10年間、毎月欠かさず講座を開いてきた' }
        ] },

        /* D｜あなたと関わることで生まれる感情 */
        { id: 'emotional_value.feelings', type: 'multi', section: { en: 'D', ja: 'あなたと関わることで生まれるもの' },
          title: 'お客様や周りの人から\n「あなたといると、こんな気持ちになる」と\n言われるものを選んでください。', label: 'あなたといると生まれる気持ち',
          max: 5, maxSoft: true,
          options: ['安心する', '元気になる', '前向きになる', '落ち着く', '勇気が出る', '本音を話せる', '楽しい', '背中を押される',
                    '癒される', '頭が整理される', '自信が出る', '刺激をもらう', '自分らしくいられる', 'その他'] },
        { id: 'emotional_value.customer_words', type: 'repeat', section: { en: 'D', ja: 'あなたと関わることで生まれるもの' },
          title: '実際にお客様から言われた、\n印象に残っている言葉があれば教えてください。', label: 'お客様から言われた言葉',
          itemLabel: '言葉', max: 3, addLabel: '＋ もうひとつ',
          fields: [{ id: 'text', type: 'text', placeholder: '例：「話すと頭がすっきりする」' }] },
        { id: 'personality_impression.traits', type: 'multi', section: { en: 'D', ja: 'あなたと関わることで生まれるもの' },
          title: 'あなた自身は、周りから\nどんな人・どんな雰囲気だと言われることが多いですか？', label: '周りから言われる雰囲気',
          options: ['明るい', '穏やか', 'エネルギッシュ', '知的', '親しみやすい', '上品', '個性的', '頼れる', '包容力がある',
                    'ストイック', '面白い', '芯がある', '行動力がある', '安心感がある', 'その他'],
          noOther: true,
          followups: [{ fields: [
            { id: 'note', type: 'text', label: 'ほかにも、実際によく言われる言葉があれば（任意）', placeholder: '例：「ぶれないね」' }
          ] }] },

        /* E｜好きな世界・感性 */
        { id: 'visual_preference.colors', type: 'multi', section: { en: 'E', ja: '好きな世界・感性' },
          title: 'あなたが心惹かれる色を選んでください。', label: '心惹かれる色',
          options: [
            { value: '白', label: '白', swatch: '#FBFAF7' }, { value: '黒', label: '黒', swatch: '#1F1B19' },
            { value: 'アイボリー', label: 'アイボリー', swatch: '#F1EBE1' }, { value: 'ベージュ', label: 'ベージュ', swatch: '#D8C7AE' },
            { value: 'ブラウン', label: 'ブラウン', swatch: '#6B4A3A' }, { value: 'ゴールド', label: 'ゴールド', swatch: '#A8844F' },
            { value: 'シルバー', label: 'シルバー', swatch: '#B9B9B6' }, { value: '赤', label: '赤', swatch: '#A3302A' },
            { value: 'ボルドー', label: 'ボルドー', swatch: '#4A1F22' }, { value: 'ピンク', label: 'ピンク', swatch: '#D9A5A4' },
            { value: 'ブルー', label: 'ブルー', swatch: '#4E6A85' }, { value: 'グリーン', label: 'グリーン', swatch: '#686657' },
            'その他'
          ] },
        { id: 'visual_preference.worlds', type: 'multi', section: { en: 'E', ja: '好きな世界・感性' },
          title: 'あなたが心惹かれる世界観を選んでください。', label: '心惹かれる世界観',
          options: ['ナチュラル', 'モード', 'ラグジュアリー', 'クラシック', 'ミニマル', 'エレガント', 'カジュアル', 'ポップ',
                    '和', 'アート', 'ヴィンテージ', '都会的', '自然', '温かい', '静かな', '力強い', 'その他'] },
        { id: 'visual_preference.references', type: 'repeat', section: { en: 'E', ja: '好きな世界・感性' },
          title: '好きなブランド・お店・ホテル・雑誌・映画・場所・\nInstagram などがあれば教えてください。', label: '好きなもの・場所',
          hint: 'あるものだけで大丈夫です。', itemEn: 'FAVORITE', max: 8, addLabel: '＋ もうひとつ',
          fields: [
            { id: 'name', type: 'text', label: '名前', placeholder: '例：アマン京都／雑誌 Kinfolk' },
            { id: 'url', type: 'url', label: 'URL（あれば）', placeholder: 'https://' }
          ] },
        { id: 'emotional_value.takeaway', type: 'multi', section: { en: 'E', ja: '好きな世界・感性' },
          title: '仕事を通して、お客様にどんな「感覚」を\n持ち帰ってほしいですか？', label: '持ち帰ってほしい感覚',
          max: 3, maxSoft: true,
          options: ['安心', '自信', '希望', '自由', '喜び', '美しさ', '心地よさ', '誇らしさ', 'ワクワク', '落ち着き',
                    '勇気', '自分らしさ', '可能性', 'その他'] }
      ]
    },

    /* ============================ 05 CUSTOMER ============================ */
    {
      id: 'customer', no: '05', en: 'CUSTOMER', ja: 'お客様と、その先にある変化の整理',
      doorTitle: '大切にしたい人',
      quote: '誰のための仕事なのかが見えると、\n言葉も、商品も、道も変わる。',
      questions: [
        { id: 'customer_current.segments', type: 'multi', title: '現在多いお客様について、\n当てはまるものを選んでください。', label: '現在多いお客様',
          groups: [
            { label: '年代', options: ['20代', '30代', '40代', '50代', '60代以上'] },
            { label: 'どんな方が多い？', options: ['女性中心', '男性中心', '経営者', '会社員', '専門職', '子育て中', '主婦・主夫', '法人', 'その他'] }
          ] },
        { id: 'customer_problem.problems', type: 'repeat', title: 'お客様は、どんなことで困って\nあなたのところへ来ますか？', label: 'お客様の困りごと',
          itemLabel: '困りごと', max: 5, addLabel: '＋ もうひとつ',
          fields: [{ id: 'text', type: 'text', placeholder: '例：自分に似合う服がわからない' }] },
        { id: 'customer_problem.tried', type: 'textarea', rows: 2, title: 'あなたのところへ来る前に、\nすでに試していること・使っているものはありますか？', label: 'すでに試していること',
          placeholder: '例：YouTubeで独学、他のサロン、本' },
        { id: 'customer_desired_future.text', type: 'textarea', rows: 3, title: 'そのお客様自身は\n「本当はどうなりたい」と思っていると思いますか？', label: 'お客様が望んでいる未来',
          hint: 'お客様ご本人が思い描いている未来を、あなたから見た言葉で。',
          placeholder: '例：毎朝迷わずに服を選んで、自信を持って人前に出たい' },

        /* ---- AFTER MAP ---- */
        { id: 'aftermap.intro', interlude: true, variant: 'aftermap',
          eyebrow: 'AFTER MAP', title: 'BEFORE → AFTER',
          subtitle: 'あなたなら、その方を\nどこまで連れていけますか？',
          body: [
            'お客様自身が望んでいる未来と、あなたが実際に力になれる未来は、同じとは限りません。',
            'あなたの経験・知識・技術を使ったとき、その方にはどんな変化が起こせそうでしょうか。',
            '正解ではなく、今思う範囲で書いてください。'
          ],
          cta: 'MAP をひらく' },
        { id: 'provider_possible_future.after_inner', type: 'beforeAfter', variant: 'aftermap', mapNo: 1,
          title: '心・内面の変化', label: '心・内面の変化',
          before: { label: '今はどんな気持ち・考え方・状態？', placeholder: '例：自分に自信がなく、人の目が気になる' },
          after: { label: 'どんな気持ち・自分になれそう？', placeholder: '例：「これが私」と思えて、堂々としていられる' } },
        { id: 'provider_possible_future.after_physical', type: 'beforeAfter', variant: 'aftermap', mapNo: 2,
          title: '身体・見た目・能力・状態の変化', label: '身体・見た目・能力・状態の変化',
          hint: '美容・健康だけでなく、スキル・能力・仕事の状態など、ご自身の事業に合わせて考えてください。',
          before: { label: '今はどんな状態？', placeholder: '例：顔色がくすんで見え、疲れて見られる' },
          after: { label: 'どんな状態になれそう？', placeholder: '例：顔色が明るく見え、若々しい印象になる' } },
        { id: 'provider_possible_future.after_behavior', type: 'beforeAfter', variant: 'aftermap', mapNo: 3,
          title: '行動・毎日の変化', label: '行動・毎日の変化',
          before: { label: '今は何ができていない？\nどんな毎日？', placeholder: '例：服選びに毎朝20分迷っている' },
          after: { label: '何ができるようになる？\n毎日はどう変わる？', placeholder: '例：5分で服が決まり、朝に余裕ができる' } },
        { id: 'provider_possible_future.after_environment', type: 'beforeAfter', variant: 'aftermap', mapNo: 4,
          title: '環境・仕事・人間関係の変化', label: '環境・仕事・人間関係の変化',
          before: { label: '今は周囲や環境と\nどんな関係？', placeholder: '例：職場で意見を言えず、遠慮している' },
          after: { label: '家族・仕事・人間関係・環境は\nどう変わる？', placeholder: '例：打ち合わせで自分から提案できるようになる' } },
        { id: 'provider_possible_future.after_social_reaction', type: 'repeat', variant: 'aftermap', mapNo: 5,
          title: 'その変化が起きたとき、\n周りの人からは何と言われると思いますか？', label: '周りから言われそうな言葉',
          itemLabel: '言葉', max: 3, addLabel: '＋ もうひとつ',
          fields: [{ id: 'text', type: 'text', placeholder: '例：「最近なんか楽しそうだね」「雰囲気変わったね」' }] },
        { id: 'provider_possible_future.after_day_in_life', type: 'guided', variant: 'aftermap', mapNo: 6,
          title: 'そのお客様の\n「6ヶ月後のある1日」を想像してみてください。', label: '6ヶ月後のある1日',
          hint: 'すべてに答える必要はありません。浮かんだ場面を、ひとつの文章でどうぞ。',
          guides: ['朝起きたとき、どんな気持ち？', '鏡を見てどう感じる？', '何をしている？', '仕事はどうなっている？',
                   '家族や周りとの関係は？', '人から何と言われる？', '夜、どんな気持ちで眠る？'],
          placeholder: '例：朝、クローゼットを開けるのが楽しみになっている。…', rows: 6 },

        { id: 'customer.target', layout: 'stack', items: [
          { id: 'customer_target.want_to_help', type: 'textarea', rows: 3, title: 'これから、もっとこんな人の力になりたいと\n思うのはどんな人ですか？', label: 'もっと力になりたい人',
            placeholder: '例：子育てがひと段落して、自分の仕事を始めたい40代の女性' },
          { id: 'customer_target.not_fit', type: 'textarea', rows: 2, title: '逆に「自分では一番力になれないかもしれない」と\n思うのはどんな人ですか？（任意）', label: '力になれないかもしれない人',
            placeholder: '例：すぐに答えだけを欲しい方' }
        ] }
      ]
    },

    /* ============================ 06 SERVICE ============================ */
    {
      id: 'service', no: '06', en: 'SERVICE', ja: '商品・サービスの整理',
      doorTitle: '差し出しているもの',
      quote: '商品とは、あなたが\nお客様に手渡している「変化」のこと。',
      questions: [
        { id: 'service_structure.rankings', type: 'ranking', title: '現在の商品・サービスについて、\nそれぞれ一番近いものを選んでください。', label: '商品ごとの「一番」',
          hint: '同じ商品を何度選んでも大丈夫です。',
          optionsFrom: { list: 'products.list', labelField: 'name' }, extraOptions: ['わからない'],
          emptyNote: { text: '02 CURRENT で商品・サービスを入力すると、ここで選べるようになります。', goto: 'q:products.list', link: '商品を入力する' },
          categories: [
            { id: 'most_chosen', label: '一番よく選ばれている' },
            { id: 'most_appreciated', label: '一番お客様に喜ばれている' },
            { id: 'most_confident', label: '一番自信がある' },
            { id: 'most_profitable', label: '一番利益が残りやすいと感じる' },
            { id: 'most_to_grow', label: '一番これから育てたい' }
          ] },
        { id: 'service_structure.continuous', type: 'single', title: '継続して利用できる商品・サービスはありますか？', label: '継続して利用できる商品',
          options: ['ある', 'ない', '今考えている', 'よくわからない'],
          followups: [{ when: { anyOf: ['ある'] }, fields: [
            { id: 'products', type: 'choice', multiple: true, label: 'どの商品・サービスですか？',
              optionsFrom: { list: 'products.list', labelField: 'name' },
              emptyNote: { text: '02 CURRENT で商品を入力すると、ここで選べます。' } }
          ] }] },
        { id: 'service_structure.followups', type: 'multi', title: 'サービス提供後、お客様へのフォローとして\n行っているものを選んでください。', label: '提供後のフォロー',
          options: ['次回来店の案内', 'LINE', 'メール', '電話', 'SNS', 'ホームケアの提案', '継続コースの案内', 'コミュニティ',
                    '資料・動画等の提供', '特にしていない', 'その他'],
          exclusive: ['特にしていない'] },
        { id: 'service_structure.wish_products', type: 'textarea', rows: 3, title: '本当は「こんな商品やサービスもやってみたい」と\n思っているものはありますか？', label: 'やってみたい商品・サービス',
          placeholder: '例：少人数で旅をしながら学ぶリトリート' }
      ]
    },

    /* ============================ 07 ROUTE ============================ */
    {
      id: 'route', no: '07', en: 'ROUTE', ja: '集客・お客様との出会い方の整理',
      doorTitle: 'お客様と出会う道',
      quote: '道を増やす前に、\n今どこを歩いているのかを知る。',
      questions: [
        { id: 'customer_route.tools', type: 'route', title: '現在使っているものを\nすべて選んでください。', label: '使っているもの',
          hint: 'タップで選択。選んだものには、あとから用途を添えられます。',
          tools: ['Instagram', 'Facebook', 'Threads', 'TikTok', 'YouTube', 'X', 'ブログ', 'note', 'ホームページ',
                  'Googleビジネスプロフィール', 'Hot Pepper Beauty', 'STORES', 'BASE', 'Shopify', 'ストアカ', 'ココナラ',
                  '公式LINE', 'Lステップ', 'エルメ', 'UTAGE', 'メルマガ', 'WEB広告', 'チラシ', '看板', 'イベント',
                  '紹介', '口コミ', 'その他'],
          purposesTitle: 'これは主に何に使っていますか？',
          purposes: ['認知', '発信', '問い合わせ', '予約', '教育', '販売', '顧客フォロー'] },
        { id: 'customer_route.main_source', type: 'single', title: '今、新しいお客様が一番多く来る\nきっかけは何ですか？', label: '新しいお客様の一番の入口',
          optionsFrom: { routeTools: 'customer_route.tools' }, extraOptions: ['わからない'],
          emptyNote: { text: 'ひとつ前の質問で使っているものを選ぶと、ここに表示されます。', goto: 'q:customer_route.tools', link: '選びに戻る' } },
        { id: 'customer_route.booking_entry', type: 'multi', title: '予約・申込みは、主にどこから入りますか？', label: '予約・申込みの入口',
          optionsFrom: { routeTools: 'customer_route.tools' }, extraOptions: ['その他'] },
        { id: 'customer_route.retention', type: 'single', title: '一度来てくれたお客様と、\nその後もつながる仕組みはありますか？', label: 'その後もつながる仕組み',
          options: ['かなりある', '一応ある', 'あまりない', 'ない', 'わからない'] },
        { id: 'customer_route.feelings', type: 'multi', title: '集客について、今の感覚に近いものを選んでください。', label: '集客についての感覚',
          options: ['もっと新規のお客様と出会いたい', 'リピーターを増やしたい', '発信しているが反応が弱い', '紹介・口コミに偏っている',
                    '集客経路が多すぎて整理したい', '何をやればいいかわからない', '発信や集客に使う時間が足りない',
                    '今は集客には困っていない', 'その他'] }
      ]
    },

    /* ============================ 08 NUMBER ============================ */
    {
      id: 'number', no: '08', en: 'NUMBER', ja: '事業のお金の現在地整理',
      doorTitle: '数字が語ること',
      quote: '数字は、評価ではなく\n現在地を教えてくれる地図の縮尺。',
      doorNote: [
        'ここは誰かに評価されるための数字ではありません。',
        '今の事業を一緒に正しく見るための現在地です。',
        '正確にわからないものは、おおよそでも大丈夫です。'
      ],
      questions: [
        { id: 'financial_current.annual_2025', type: 'currency', unit: '万円', unknown: true,
          title: '2025年の年間売上（年商）を教えてください。', label: '2025年の年商', placeholder: '960' },
        { id: 'financial_current.recent_3months', type: 'group', inline: true, title: '直近3ヶ月の売上を教えてください。', label: '直近3ヶ月の売上',
          fields: [
            { id: 'm1', key: 'one_month_ago', type: 'currency', unit: '万円', unknown: true, label: '1ヶ月前', placeholder: '80' },
            { id: 'm2', key: 'two_months_ago', type: 'currency', unit: '万円', unknown: true, label: '2ヶ月前', placeholder: '75' },
            { id: 'm3', key: 'three_months_ago', type: 'currency', unit: '万円', unknown: true, label: '3ヶ月前', placeholder: '90' }
          ] },
        { id: 'financial_current.best_month', type: 'currency', unit: '万円', unknown: true,
          title: 'これまでの最高月商を教えてください。', label: '最高月商', placeholder: '150' },
        { id: 'financial_current.monthly_customers', type: 'number', unit: '人',
          title: '現在、1ヶ月に利用してくださるお客様は\nおよそ何人ですか？', label: '1ヶ月のお客様の人数', placeholder: '40' },
        { id: 'financial_current.feelings', type: 'multi', title: '事業のお金について、\n今の感覚に近いものを選んでください。', label: 'お金についての感覚',
          options: ['売上をもっと増やしたい', '利益をもっと残したい', '売上はあるが忙しすぎる', '経費をもっと把握したい',
                    '商品ごとの利益がよくわからない', '数字を見るのが少し苦手', '収入の波を小さくしたい',
                    '現状には比較的満足している', 'その他'] }
      ]
    },

    /* ============================ 09 KEY POINT ============================ */
    /* ここは「本人が感じている課題」。分析者が判断する急所とは区別して
       self_perceived_bottleneck として保存します。 */
    {
      id: 'keypoint', no: '09', en: 'KEY POINT', ja: '今感じていること・急所の整理',
      doorTitle: '見えにくい急所',
      quote: 'うまくいかない理由はいくつもある。\nけれど、急所はたいてい一つ。',
      questions: [
        { id: 'self_perceived_bottleneck.areas', type: 'multi', title: '今「もう少し整えたい」と感じるものを\nすべて選んでください。', label: '整えたいと感じるもの',
          options: ['事業の方向性', 'コンセプト', '商品', '価格', '新規集客', 'リピート', 'Instagram', 'ホームページ', '公式LINE',
                    '予約導線', '販売・提案', '売上', '利益', '時間', 'チーム', '家族との役割分担', '外注', '優先順位',
                    '自分自身の役割', '今後の展開', 'その他'] },
        { id: 'self_perceived_bottleneck.top3', type: 'multi', title: 'その中で、今一番気になっているものを\n3つまで選んでください。', label: '一番気になっているもの（3つまで）',
          max: 3, optionsFrom: { selected: 'self_perceived_bottleneck.areas', keepOther: true },
          emptyNote: { text: 'ひとつ前の質問で選ぶと、ここに表示されます。', goto: 'q:self_perceived_bottleneck.areas', link: '選びに戻る' } },
        { id: 'self_perceived_bottleneck.key_one', type: 'single', title: 'さらに1つだけ選ぶなら、\n「ここが変わったら他も動きそう」と感じるものは？', label: '変わったら他も動きそうなもの',
          optionsFrom: { selected: 'self_perceived_bottleneck.top3', fallback: 'self_perceived_bottleneck.areas', keepOther: true },
          emptyNote: { text: '前の質問で選ぶと、ここに表示されます。', goto: 'q:self_perceived_bottleneck.areas', link: '選びに戻る' } },
        { id: 'self_perceived_bottleneck.wish', type: 'textarea', feature: true, label: '一番うれしい変化',
          title: '本当は、\n何が変わったら\n一番うれしいですか？', rows: 4 }
      ]
    },

    /* ============================ 10 FUTURE ============================ */
    {
      id: 'future', no: '10', en: 'FUTURE', ja: '半年後・1年後の未来整理',
      doorTitle: '次に見たい景色',
      quote: '正解ではなく、\nあなたが本当に行きたい場所へ。',
      questions: [
        { id: 'future.6m.a', layout: 'board', section: { en: '6 MONTHS LATER', ja: '半年後' },
          title: '半年後の景色', items: [
          { id: 'future_6m.monthly_sales', type: 'currency', unit: '万円', title: '理想の月商', label: '半年後の理想の月商', placeholder: '100' },
          { id: 'future_6m.grow_product', type: 'single', title: '一番育っていてほしい商品・サービス', label: '半年後に育っていてほしい商品',
            optionsFrom: { list: 'products.list', labelField: 'name' }, extraOptions: ['まだない新しい商品'],
            followups: [{ when: { anyOf: ['まだない新しい商品'] }, fields: [
              { id: 'new_product', type: 'text', label: 'どんな商品・サービス？', placeholder: '例：オンラインの継続講座' }
            ] }] }
        ] },
        { id: 'future.6m.b', layout: 'board', section: { en: '6 MONTHS LATER', ja: '半年後' },
          title: '半年後の、あなたの毎日', items: [
          { id: 'future_6m.increase', type: 'textarea', rows: 2, title: '今より増やしたいもの', label: '半年後に増やしたいもの', placeholder: '例：新規のお客様、休日' },
          { id: 'future_6m.decrease', type: 'textarea', rows: 2, title: '今より減らしたいもの', label: '半年後に減らしたいもの', placeholder: '例：夜のDM対応' },
          { id: 'future_6m.feeling', type: 'textarea', rows: 2, title: 'どんな気持ちで仕事をしていたい？', label: '半年後の仕事の気持ち', placeholder: '例：余白を持って、楽しみながら' }
        ] },
        { id: 'future.1y.a', layout: 'board', section: { en: 'ONE YEAR LATER', ja: '1年後' },
          title: '1年後の事業', items: [
          { id: 'future_1y.annual_sales', type: 'currency', unit: '万円', title: '理想の年間売上', label: '1年後の理想の年商', placeholder: '1500' },
          { id: 'future_1y.business', type: 'textarea', rows: 3, title: 'どんな事業になっていたらうれしい？', label: '1年後の事業の姿',
            placeholder: '例：講座が柱になり、紹介だけで満席が続いている' }
        ] },
        { id: 'future.1y.b', layout: 'board', section: { en: 'ONE YEAR LATER', ja: '1年後' },
          title: '1年後の、働き方', items: [
          { id: 'future_1y.team', type: 'textarea', rows: 2, title: '誰と、どんな体制で働いていたい？', label: '1年後の体制', placeholder: '例：アシスタント1名と、外注チーム' },
          { id: 'future_1y.time_focus', type: 'textarea', rows: 2, title: 'あなた自身は、何に一番時間を使っていたい？', label: '1年後に時間を使いたいこと', placeholder: '例：新しい講座づくり' },
          { id: 'future_1y.customer_words', type: 'textarea', rows: 2, title: 'お客様から、どんな言葉をもらっていたい？', label: '1年後にもらいたい言葉', placeholder: '例：「人生が変わった」' }
        ] },
        { id: 'future_1y.life', type: 'textarea', rows: 3, section: { en: 'ONE YEAR LATER', ja: '1年後' },
          title: '仕事以外の時間や暮らしは、\nどうなっていたいですか？', label: '1年後の暮らし',
          placeholder: '例：年に2回は家族で旅行に行き、週末は仕事をしない' },
        { id: 'future_1y.ideal_day', type: 'textarea', feature: true, label: '1年後に生きていたい毎日',
          title: '売上も、\n時間も、\n家族も、\n一度ぜんぶわがままに\n叶えていいとしたら。\n\n1年後、\nあなたはどんな毎日を\n生きていたいですか？', rows: 5 },
        { id: 'session_goal.today', type: 'textarea', feature: true, eyebrow: 'LAST QUESTION', label: 'セッションで整理されていたら最高なこと',
          title: '今日、ななえと話し終わったとき、\n何が整理されていたら\n最高ですか？', rows: 4 }
      ]
    }
  ]
};
