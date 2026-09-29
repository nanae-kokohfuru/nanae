# BUSINESS COMPASS — デザインプロトタイプ

「事業の現在地を知り、次の景色へ。」

ビルド不要の静的サイトです。`business-compass/index.html` をブラウザで開くか、
このフォルダを静的サーバーで配信すると動きます（例：`npx http-server business-compass`）。

## 画面の流れ

TOP COVER → 情報のお取り扱い（必須同意）→ 10章一覧 → 章扉 → 質問 … → YOUR BUSINESS COMPASS（カルテ一覧）

- 全10章 × 2〜3問（計28問）をプロトタイプとして実装
- STORY：タイムラインカード（1〜5件）
- ROUTE：使っている道具のタップ選択 → 道具ごとに用途を選択
- Deep Bordeaux の重要な問い：STORY / KEY POINT / FUTURE の3か所
- 回答は localStorage に自動保存。リロードしても続きから再開

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

- **質問を増やす**：`content.js` の各章 `questions` 配列にオブジェクトを追加するだけ。書式はファイル冒頭のコメント参照
- **写真を差し替える**：`assets/` に画像を置き、`content.js` の `images` で `src` と `position` を指定。`null` にすると写真なしの静かな扉になります
- **同意文面を正式版にする**：`content.js` の `consent.items[].body` を差し替え
- **重要な問いにする**：質問に `feature: true` を付ける

## 今後の拡張ポイント

- `window.BusinessCompass.exportData()` が章ごとに整理された回答データを返します（最終画面の「回答データを書き出す」と同じ JSON）。PDF 生成・AI 分析・「1枚の経営羅針盤」生成はこのデータを入力にできます
- 最終画面の「印刷・PDFで保存」は印刷用 CSS でカルテのみを出力します

## 現時点で確定している仕様（仮確定）

- 章扉の写真：CURRENT・ROUTE（コンパス）、STORY・FUTURE（本と舟）。ABOUT YOU・VALUE・CUSTOMER・SERVICE・NUMBER・KEY POINT は写真なしの無地ウォルナット
- 重要な問い（Deep Bordeaux）と各章扉の一言は、`content.js` に書かれている現在の文言で仮確定
- 情報のお取り扱いの本文（`consent.items`）は仮文章のまま。正式文面が決まり次第差し替え
