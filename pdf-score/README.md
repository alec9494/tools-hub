# PDF 分數辨識

上傳學生作業 PDF → 用 Gemini API 自動辨識右下角紅筆分數 → 輸出 Google 試算表。

## 線上版
https://script.google.com/macros/s/AKfycbxaqPaf0r0ZHsQdp4lWjFTEfGC4hB9DiVjVEGXU-oivuIKV1Jc1rwgnJw8fCHSE45Ch/exec

## 檔案
- [`index.html`](index.html) — 前端拖放上傳介面
- [`Code.gs`](Code.gs) — 後端 Apps Script(Gemini 呼叫、PDF 處理、試算表寫入)

## 部署(若要重建)
1. [Apps Script](https://script.google.com) 新增專案
2. 貼 `Code.gs` 與 `index.html`
3. 執行 `setGeminiApiKey()` 存入 Gemini API 金鑰(改完記得把金鑰從程式碼刪掉)
4. 執行 `setup()` 建立 Drive 資料夾與觸發器
5. 部署為網頁應用程式 → 執行身分:我 / 任何人可存取

## 使用流程
- **網頁上傳**:打開上線網址 → 拖入 PDF → 等 30 秒~2 分鐘 → 看到試算表連結
- **資料夾上傳**:把 PDF 拖進 Drive 的「成績 PDF 上傳區」資料夾,觸發器每分鐘自動處理
