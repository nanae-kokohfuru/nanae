# BUSINESS COMPASS — デザインプロトタイプ

「事業の現在地を知り、次の景色へ。」

ビルド不要の静的サイトです。`business-compass/index.html` をブラウザで開くか、
このフォルダを静的サーバーで配信すると動きます（例：`npx http-server business-compass`）。

## 画面の流れ

TOP COVER → 情報のお取り扱い（必須同意）→ 10章一覧 → 章扉 → 質問 … → YOUR BUSINESS COMPASS（カルテ一覧）

- 正式質問 83問（Q01〜Q83）を10章に実装。小さな質問は1画面にまとめ、全69画面
- 回答はブラウザ（localStorage）に入力ごとに自動保存。リロードしても同じ画面から再開
- 必須は Q01（お名前）のみ。それ以外は空欄のまま進めます

## ファイル構成

| ファイル | 役割 |
| --- | --- |
| `js/content.js` | **文言・画像・章・質問のすべて**。ここを編集すれば UI を触らずに質問を追加・変更できます |
| `js/fields.js` | 入力形式（text / textarea / number / url / single / multi / scale / group / timeline / route）の描画・判定・カルテ用要約 |
| `js/store.js` | 保存処理。localStorage アダプタを `BCStore.use(adapter)` で DB 用に差し替え可能 |
| `js/app.js` | 画面遷移と各画面の組み立て |
| `css/style.css` | デザイン（カラーはファイル冒頭の CSS 変数） |
| `assets/` | 写真 |

## よくある編集

- **質問を増やす・直す**：`content.js` の各章 `questions` を編集。書式はファイル冒頭のコメント参照
- **質問ID（id）は変更しない**：回答の保存キーです。Q番号は並び順から自動で振り直されるので、並べ替えても回答は壊れません
- **写真を差し替える**：`content.js` の `images` で `src` と `position` を指定。`null` で無地の章扉
- **同意文面を正式版にする**：`content.js` の `consent.items[].body` を差し替え

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

## 今後の拡張ポイント

- `window.BusinessCompass.exportData()` が章ごとに整理された回答データを返します（最終画面の「回答データを書き出す」と同じ JSON）。PDF 生成・AI 分析・「1枚の経営羅針盤」生成はこのデータを入力にできます
- 最終画面の「印刷・PDFで保存」は印刷用 CSS でカルテのみを出力します

## 現時点の仕様メモ

- 章扉の写真：CURRENT・ROUTE（コンパス）、STORY・FUTURE（本と舟）。ABOUT YOU・VALUE・CUSTOMER・SERVICE・NUMBER・KEY POINT は写真なしの無地ウォルナット
- Deep Bordeaux の重要な問い：Q70（KEY POINT）・Q82・Q83（FUTURE）
- 各章扉の一言は仮確定の文言のまま
- 情報のお取り扱いの本文（`consent.items`）は仮文章のまま。正式文面が決まり次第差し替え
