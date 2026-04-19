# 周老師教學小工具

桃園農工 生物產業機電科 周崇吉老師自製工具集合,公開分享給師生使用。

## 線上工具

| 工具 | 連結 | 託管 |
|---|---|---|
| 🎡 轉盤抽籤 | https://alec9494.github.io/lottery/ | GitHub Pages |
| 📄 PDF 分數辨識 | https://script.google.com/macros/s/AKfycbxaqPaf0r0ZHsQdp4lWjFTEfGC4hB9DiVjVEGXU-oivuIKV1Jc1rwgnJw8fCHSE45Ch/exec | Google Apps Script |
| 📊 學生成績查詢 | https://script.google.com/macros/s/AKfycbwYqu--PaueNk29pIKfbHtTKSc5iIYvMNkZbXKNXeSsjNExIYFnTvRP4oDb8nQBTg6cuA/exec | Google Apps Script |

## Repo 結構

```
小工具匯整/
├── index.html              ← 工具列表首頁(GitHub Pages 入口)
├── README.md               ← 本檔
├── pdf-score/              ← PDF 分數辨識原始碼(Apps Script)
│   ├── README.md
│   ├── Code.gs
│   └── index.html
└── (轉盤工具與成績查詢的程式碼在另外的 repo / Apps Script 專案)
```

相關專案:
- 轉盤工具:https://github.com/alec9494/lottery
- 成績查詢 + 登錄系統:[`../成績登記試算/`](../成績登記試算/)

## 發布到 GitHub Pages

1. 建立新的 GitHub repo,例如 `tools-hub`(或用中文 `小工具匯整`,URL 會被編碼)
2. 把整個 `小工具匯整/` 目錄推上去
3. Repo Settings → Pages → Source 選 `main` branch / `/ (root)`
4. 等 1~2 分鐘,GitHub 會給你網址,例如:
   - `https://alec9494.github.io/tools-hub/`
5. 之後新增工具,只要改 [`index.html`](index.html) 加新卡片即可

## 維護

### 加新工具
編輯 [`index.html`](index.html),複製一張現有 `<a class="card">` 卡片,改 href、icon、標題、描述即可。

### 換工具網址
直接在 [`index.html`](index.html) 修改對應的 `href`。

### 工具下線
給 `<a class="card">` 加 `disabled` class,並把 badge 從 `ok` 改回預設(黃色)。
