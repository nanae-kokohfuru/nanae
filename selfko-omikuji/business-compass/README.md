# BUSINESS COMPASS — デザインプロトタイプ

「事業の現在地を知り、次の景色へ。」

ビルド不要の静的サイトです。このフォルダの `index.html` をブラウザで開くか、
このフォルダを静的サーバーで配信すると動きます（例：`npx http-server selfko-omikuji/business-compass`）。

## 公開URLと置き場所

- クライアント用：`https://nanae.vercel.app/business-compass/`
- 裏カルテ：`https://nanae.vercel.app/business-compass/analysis.html`

Vercel の nanae プロジェクトは `selfko-omikuji/` フォルダをサイトのトップ（`/`）として配信しています。
そのため BUSINESS COMPASS は `selfko-omikuji/business-compass/` に置いています（リポジトリ直下に置くと配信されず 404 になります）。

## MONITOR VERSION v1

**モニター実施版として固定：コミット `97537ae`**

1人目のモニターで、次の流れを実際に通して使うための版です。

83問回答（クライアントの端末）→ 回答データ（JSON）を受け取る → 裏カルテで読み込む → 2時間のセッション → 裏カルテ入力

この版に含まれるもの：

- 表側：同意画面、正式質問83問（条件分岐・入力形式・回答データ構造）、カルテ一覧、回答データの JSON 書き出し
- 裏カルテ（`analysis.html`）：本人の回答ファイル（JSON）の読み込み、裏カルテの JSON 書き出し（バックアップ用）
- 裏カルテの保存は回答者ごと（`business-compass:analysis:v1:r:回答者ID`）。回答ファイルから開いた場合は `business-compass:analysis:v1`

追加（2026-10-01、ご依頼により）：章の一覧に「← 表紙に戻る」ボタン。回答は消さずに表紙へ戻れます。

次の指示があるまで、質問の追加・文言変更・UI変更・機能追加は行いません。
実運用のあとで、項目の多さ、足りない分析視点、SOURCE の見せ方、セッション中の入力速度、よく見る場所・使わない場所を確認してから改修します。

## 80問版（2026-10-01）

83問の情報量を保ったまま、3か所を1画面2項目に統合して80問にしました。保存キーは統合前と同じで、別々に保存・書き出しされます。

| 新しい質問 | 1画面にある入力 | 保存キー |
| --- | --- | --- |
| Q06 発信・連絡先 | Instagram／公式LINE | `profile.instagram`／`profile.line` |
| Q36 惹かれる色・世界観 | A 色／B 世界観 | `visual_preference.colors`／`visual_preference.worlds` |
| Q71 増やしたいこと・減らしたいこと | A 増やしたい／B 減らしたい | `future_6m.increase`／`future_6m.decrease` |

章とQ番号：01 THIS IS ME Q01–09／02 NOW Q10–17／03 STORY Q18–23／04 VALUE Q24–38／05 CUSTOMER Q39–50／06 SERVICE Q51–54／07 ROUTE Q55–59／08 MONEY Q60–64／09 KEY Q65–68／10 FUTURE Q69–80

- 同意のあとに目次（全80問・10のテーマ・各章の現在地）を表示
- 質問画面の上部に　章／質問番号 ／80／進捗率／細いプログレスバー
- 節目のひとこと：Q40（50%）・Q60（75%）・Q72（90%）
- 目次から「← 表紙に戻る」（回答は消えず　表紙の「旅をはじめる」で続きから）
- 言い回しを変えた選択肢は、保存される値（value）を83問版のままにしているため、以前の回答もそのまま選択状態で表示されます
- 章扉の画像は `assets/chapters/`（目次用の小さな画像は `assets/chapters/thumbs/`）。06〜10 は画像ファイルが届き次第、ファイルを置いて `content.js` の `pending: true` を消すと表示されます

## ファイル構成

| ファイル | 役割 |
| --- | --- |
| `js/content.js` | **文言・画像・章・質問のすべて**。ここを編集すれば UI を触らずに質問を追加・変更できます |
| `js/fields.js` | 入力形式（text / textarea / number / url / single / multi / scale / group / timeline / route）の描画・判定・カルテ用要約 |
| `js/store.js` | 保存処理。localStorage アダプタを `BCStore.use(adapter)` で DB 用に差し替え可能 |
| `js/app.js` | 画面遷移と各画面の組み立て |
| `analysis.html` / `js/analysis.js` / `css/analysis.css` | ななえ専用・裏カルテ（PRIVATE ANALYSIS） |
| `css/style.css` | デザイン（カラーはファイル冒頭の CSS 変数） |
| `assets/` | 写真 |

## よくある編集

- **質問を増やす・直す**：`content.js` の各章 `questions` を編集。書式はファイル冒頭のコメント参照
- **質問ID（id）は変更しない**：回答の保存キーです。Q番号は並び順から自動で振り直されるので、並べ替えても回答は壊れません
- **写真を差し替える**：`content.js` の `images` で `src` と `position` を指定。`null` で無地の章扉
- **同意画面の文面**：`content.js` の `consent`（`intro` が本文の段落、`required` がチェック文、`cta` がボタン）。`items`（アコーディオン）や `optional`（任意チェック）を足すと、その部分も表示されます

## 質問どうしのつながり（同じことを二度書かせない）

| 元の回答 | 使われる質問 |
| --- | --- |
| Q14 一緒に事業をしている人 | 「いない」以外のときだけ、合計人数・誰が・役割（人数分追加可）を表示 |
| Q15 商品・サービス | Q16 / Q17 / Q18 / Q53 / Q54 / Q72 の選択肢 |
| Q28 提供できること | Q29 の選択肢 |
| Q57 使っているもの | 選んだものだけ用途を表示。Q58 / Q59 の選択肢 |
| Q67 整えたいもの | Q68 の選択肢 → Q69 の選択肢（Q68 が空なら Q67 から） |

元の回答が空のときは、入力しに戻れるリンクを表示します。

## 完了画面と骨子シート

80問を終えると完了画面になります。

- 画面を開いたときに、ゴールド系の花火が5発ほど打ち上がります（6〜7秒で終わり、描画を止めます。端末で「視差効果を減らす」を設定している場合は、動かさず静かな光だけを表示）
- 「おつかれさまでした〜」「あなたの事業の羅針盤が／できました！」「おめでとうございます」
- 大きなボタンが2つ
  - ① 「ここまでの回答を整理した あなたの事業の BUSINESS COMPASS 骨子を見る」→ 骨子シート
  - ② 「この回答を のむら ななえに送る」（招待リンクから開いた人だけ。送信の仕組みは下の「サーバー保存」）
  - 招待リンクなしで開いた人は、②の位置に「印刷・PDFで保存」「回答データを書き出す」が出ます
- 骨子シートは、本人の回答を10章ごとのまとまりで並べたものです。AIによる解釈・要約・追加はしません
  - 章ごとのまとまり（ブロック）は `content.js` の `compass.blocks` で決めています。ここに入っていない質問も、章の最後の「そのほか」に必ず表示されます
  - 全体像（OVERVIEW）の各行に出す代表の回答は `compass.headline` で決めています
  - 最下部の「80問すべての回答を見る」で、質問ごとのシート（私の回答）に進めます
- 花火・CTA・骨子の文言は `content.js` の `final` と `compass` にあります

## 回答データ（JSON 書き出し）

完了画面（招待リンクなし）の「回答データを書き出す」で、次の形の JSON が得られます（`BusinessCompass.exportData()` と同じ）。

- `data` … 質問ID で階層化した回答。例：`profile.name`、`products.list`、`customer_desired_future.text`（お客様が望む未来）、`provider_possible_future.after_inner`（あなたが起こせる変化）、`self_perceived_bottleneck.*`（本人が感じている課題）、`future_6m.*`、`future_1y.*`
- `questions` … 83問それぞれの Q番号・章・小見出し・質問文・入力形式・回答済みか・値
- `raw` … 保存されている生データ（復元用）

商品など他の回答を参照する選択は、書き出し時に商品名へ変換されます。
Q39（好きなもの・場所）は1件ずつのデータなので、後から画像を足す場合は各項目に `image` を追加できます。

## 回答をのむら ななえに送る（サーバー保存）

**新しい回答者には、必ず裏カルテの「招待リンクをコピー」で作ったリンクを送ってください。** 招待コードのない通常のURLから回答した場合、回答はその人の端末にしか残らず、裏カルテには届きません（表紙にもその旨を表示しています）。

- 裏カルテにログイン → 一覧の上の「新しい回答者に送る招待リンク」→「招待リンクをコピー」
- 「テスト用リンクをコピー」で開いて送信した回答は、一覧に「テスト」と表示されます（確認後は削除）
- 招待コードは、全角／半角・大文字／小文字・空白／改行・「+」の違いをそろえてから比べます
- 途中保存に失敗したとき（通信・招待コード）と、ブラウザが回答を保存できない設定のとき（プライベートブラウズ・Cookie のブロックなど）は、画面上部に知らせます
- 「送信しました」は、サーバーが受け取ったと応答したときだけ表示します
- 招待リンクから開いた人も、完了画面の「回答の控えを保存する」で自分の回答を保存できます


招待リンク `https://nanae.vercel.app/business-compass/?invite=招待コード` から開いた回答者だけ、回答がサーバー（Upstash Redis）にも保存されます。

- 回答はこれまでどおり、まずその端末（localStorage）に保存されます。通信できなくても回答は消えません
- 画面を進めるたびに途中保存し、完了画面の「この回答を のむら ななえに送る」で「送信済み」になります
- 同じ端末からの再送信は、同じ回答者として上書きされます（回答者は増えません）
- 骨子シートと「80問すべての回答を見る」で、自分の回答をいつでも確認できます
- 招待リンクなしで開いた場合は送信ボタンは出ません（JSON書き出しはそこに残っています）

サーバー側（`selfko-omikuji/api/`）

| ファイル | 役割 |
| --- | --- |
| `_bc.js` | 共通処理（Upstash への接続、照合、回数制限）。「_」で始まるので公開APIにはなりません |
| `bc-save.js` | `POST /api/bc-save` 回答の保存。招待コードが一致したときだけ受け付けます。保存専用で、読み出しはできません |
| `bc-admin.js` | `/api/bc-admin` ログイン／ログアウト・回答者一覧・回答の取得・削除。ログイン済み（または合言葉が一致）のときだけ応答します |

使う環境変数：`BC_INVITE_CODE`（招待コード）／`BC_ADMIN_PASSPHRASE`（裏カルテの合言葉）／Upstash の接続情報（変数名は `api/_bc.js` 冒頭）。値はコードにもブラウザにも出しません。

保存の形（Upstash）：`bc:r:回答者ID` に1人分（名前・状況・回答・送信日時・最終更新・トークンのハッシュ）、`bc:index` に一覧。回答の中身は端末の `business-compass:v2` と同じ形（semantic key）なので、裏カルテでそのまま読み込めます。

## ななえ専用・裏カルテ（PRIVATE ANALYSIS）

`analysis.html` を直接開きます（`https://nanae.vercel.app/business-compass/analysis.html`）。
クライアント側の画面からはリンクしておらず、検索エンジンにも載らない設定（noindex）です。

- 開くと、まず**回答者一覧**だけを表示します（この端末に残っている回答は表示しません）
  - 初回は合言葉（`BC_ADMIN_PASSPHRASE`）でログイン。以後このブラウザでは**30日間ログインしたまま**です
  - ログインはサーバーが発行する Cookie（HttpOnly・Secure・SameSite=Strict）で保ち、合言葉そのものはブラウザに保存しません
  - 合言葉を変更すると、それまでのログインはすべて無効になります（新しい合言葉でログインし直し）
  - 合言葉は、全角／半角・大文字／小文字・空白や改行・貼り付け時の余分な文字（「BC_ADMIN_PASSPHRASE=」や引用符）の違いをそろえてから比べます（入力方法の違いで失敗しないように）。日本語の合言葉も使えます
  - 合言葉の環境変数は `BC_ADMIN_PASSPHRASE`。名前を少し変えて作り直した場合（`BC_` で始まり `PASS` を含む名前）も合言葉として使えます
  - ログイン画面の「表示」で、入力した文字を確かめられます
- 名前を選ぶと `analysis.html?r=回答者ID` でその人のカルテを開き、サーバーから最新の80問を読み込みます。「80問すべての回答を見る」は最初から開いています
- 本人の80問の回答は**読むだけ**。書き換えません
- ななえの分析は回答者ごとに `localStorage` の `business-compass:analysis:v1:r:回答者ID` に自動保存（以前の版で書いた分析は、その回答者を開いたときに引き継ぎます）
- 回答者の削除は一覧から（確認つき）
- 以前の使い方（本人が書き出した回答ファイル（JSON）を読み込む／この端末の回答を見る）は、一覧の下の「回答ファイル（JSON）から開く」（`analysis.html?local=1`）に残しています。保存先は従来どおり `business-compass:analysis:v1`
- 構成：最上部（名前・屋号・事業形態・事業年数・セッション日／Q83・Q69）→ 01 ASSETS → 02 UNTAPPED VALUE → 03 BOTTLENECK → 04 BUSINESS STRUCTURE → 05 POTENTIAL → 06 KEY LEVER → 07 PRIORITY → SESSION NOTE / NEXT COMPASS
- 各セクションの「SOURCE｜本人の回答を見る」で、関連する本人の回答を開閉して確認
- AI による診断・採点・提案・自動生成は行いません

保存データ：

```
consultant_analysis: {
  assets: { skill, knowledge, experience, proof, human_value, customer_asset, business_asset, other },
  untapped_value: { skill, knowledge, experience, product, price, communication, continuity, customer_experience, other, biggest },
  bottleneck: { areas: [], areas_note, primary, primary_note, why },
  business_structure: {
    body_dependency | owner_dependency | continuity | knowledge_asset | decision_structure: { observation, risk, opportunity }
  },
  potential: { types: [], notes, unique },
  key_lever: { lever, why, what_changes },
  priority: { now: [], next: [], later: [], not_now: [] },
  session_note, next_compass
}
```

## 今後の拡張ポイント

- `window.BusinessCompass.exportData()` が章ごとに整理された回答データを返します（完了画面の「回答データを書き出す」と同じ JSON）。PDF 生成・AI 分析・「1枚の経営羅針盤」生成はこのデータを入力にできます
- 「印刷・PDFで保存」（招待リンクなしの場合）は骨子シートを印刷用 CSS で出力します

## 現時点の仕様メモ

- 章扉の写真：CURRENT・ROUTE（コンパス）、STORY・FUTURE（本と舟）。ABOUT YOU・VALUE・CUSTOMER・SERVICE・NUMBER・KEY POINT は写真なしの無地ウォルナット
- Deep Bordeaux の重要な問い：Q70（KEY POINT）・Q82（FUTURE の最後の重要な問い）
- Q83（最後の質問）は通常の明るい画面。「LAST QUESTION」の表示つき。「旅を終える」でカルテ完了へ
- 各章扉の一言は仮確定の文言のまま
- 同意画面は無料モニター用の「安心して書いてもらうための確認画面」。チェック1つ（上記の内容を確認しました）で開始。任意チェック・規約類はなし
