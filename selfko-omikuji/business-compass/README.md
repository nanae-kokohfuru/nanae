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
- 裏カルテの保存は `business-compass:analysis:v1` に1人分（複数クライアント対応はしない）

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

## 回答データ（JSON 書き出し）

最終画面の「回答データを書き出す」で、次の形の JSON が得られます（`BusinessCompass.exportData()` と同じ）。

- `data` … 質問ID で階層化した回答。例：`profile.name`、`products.list`、`customer_desired_future.text`（お客様が望む未来）、`provider_possible_future.after_inner`（あなたが起こせる変化）、`self_perceived_bottleneck.*`（本人が感じている課題）、`future_6m.*`、`future_1y.*`
- `questions` … 83問それぞれの Q番号・章・小見出し・質問文・入力形式・回答済みか・値
- `raw` … 保存されている生データ（復元用）

商品など他の回答を参照する選択は、書き出し時に商品名へ変換されます。
Q39（好きなもの・場所）は1件ずつのデータなので、後から画像を足す場合は各項目に `image` を追加できます。

## ななえ専用・裏カルテ（PRIVATE ANALYSIS）

`analysis.html` を直接開きます（例：`https://…/business-compass/analysis.html`）。
クライアント側の画面からはリンクしておらず、検索エンジンにも載らない設定（noindex）です。本格的な認証はまだありません。

- 本人の83問の回答は**読むだけ**。書き換えません
  - 同じ端末で回答した場合はそのまま参照
  - 別の端末で回答した場合は、本人が書き出した回答ファイル（JSON）を「回答ファイルを読み込む」で参照
- ななえの分析は `localStorage` の `business-compass:analysis:v1` に自動保存（本人の回答 `business-compass:v2` とは別）
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

- `window.BusinessCompass.exportData()` が章ごとに整理された回答データを返します（最終画面の「回答データを書き出す」と同じ JSON）。PDF 生成・AI 分析・「1枚の経営羅針盤」生成はこのデータを入力にできます
- 最終画面の「印刷・PDFで保存」は印刷用 CSS でカルテのみを出力します

## 現時点の仕様メモ

- 章扉の写真：CURRENT・ROUTE（コンパス）、STORY・FUTURE（本と舟）。ABOUT YOU・VALUE・CUSTOMER・SERVICE・NUMBER・KEY POINT は写真なしの無地ウォルナット
- Deep Bordeaux の重要な問い：Q70（KEY POINT）・Q82（FUTURE の最後の重要な問い）
- Q83（最後の質問）は通常の明るい画面。「LAST QUESTION」の表示つき。「旅を終える」でカルテ完了へ
- 各章扉の一言は仮確定の文言のまま
- 同意画面は無料モニター用の「安心して書いてもらうための確認画面」。チェック1つ（上記の内容を確認しました）で開始。任意チェック・規約類はなし
