/**
 * 成績 PDF 自動辨識 → Google 試算表
 *
 * 運作流程:
 *   1. 把 PDF 丟進 Drive「成績 PDF 上傳區」資料夾
 *   2. 每分鐘觸發器自動檢查新檔案
 *   3. 呼叫 Gemini API 辨識每頁紅筆分數
 *   4. 自動建立試算表(標題=PDF 檔名),A 欄依序寫入分數
 *   5. PDF 改名為「xxx_已處理.pdf」避免重複處理
 *
 * 首次使用請依序執行:
 *   (1) setGeminiApiKey()   — 存入 API 金鑰
 *   (2) setup()             — 建立資料夾 + 觸發器
 *   之後只要把 PDF 拖進資料夾即可,不用再動這裡。
 */

// ====== 設定區 ======
const FOLDER_NAME = '成績 PDF 上傳區';
const PROCESSED_SUFFIX = '_已處理';
const GEMINI_MODEL = 'gemini-2.5-flash';
const TRIGGER_MINUTES = 1;        // 幾分鐘檢查一次
const MAX_FILES_PER_RUN = 3;      // 單次執行最多處理幾份,避免超過 Apps Script 6 分鐘上限


// ========== 一次性設定:存 API 金鑰 ==========
// 使用方法:
//   1. 把下面 API_KEY 的 '貼上你的金鑰' 換成 api_config.json 裡的 gemini_api_key
//   2. 執行此函式(會存到 Script Properties)
//   3. 存好後把金鑰從程式碼刪掉(改回 '貼上你的金鑰')避免外洩
function setGeminiApiKey() {
  const API_KEY = '貼上你的金鑰';

  if (API_KEY === '貼上你的金鑰' || !API_KEY) {
    Logger.log('✗ 請先把 API_KEY 換成真正的金鑰再執行');
    return;
  }
  PropertiesService.getScriptProperties().setProperty('GEMINI_API_KEY', API_KEY);
  Logger.log('✓ 已儲存 API 金鑰到 Script Properties');
  Logger.log('  記得把這個函式裡的金鑰刪掉(改回 \'貼上你的金鑰\')以策安全');
}


// ========== 一次性設定:建立資料夾 + 觸發器 ==========
function setup() {
  // 1. 建資料夾(若已存在就重用)
  const folders = DriveApp.getFoldersByName(FOLDER_NAME);
  let folder;
  if (folders.hasNext()) {
    folder = folders.next();
    Logger.log(`✓ 資料夾已存在:${folder.getUrl()}`);
  } else {
    folder = DriveApp.createFolder(FOLDER_NAME);
    Logger.log(`✓ 已建立資料夾:${folder.getUrl()}`);
  }
  PropertiesService.getScriptProperties().setProperty('FOLDER_ID', folder.getId());

  // 2. 刪除舊觸發器(避免重複)
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'processNewPDFs') {
      ScriptApp.deleteTrigger(t);
    }
  });

  // 3. 建立新觸發器
  ScriptApp.newTrigger('processNewPDFs')
    .timeBased()
    .everyMinutes(TRIGGER_MINUTES)
    .create();
  Logger.log(`✓ 已設定每 ${TRIGGER_MINUTES} 分鐘自動檢查`);
  Logger.log(`\n完成!請把 PDF 丟進這個資料夾:\n${folder.getUrl()}`);
}


// ========== 主流程:掃資料夾,處理新 PDF ==========
function processNewPDFs() {
  const props = PropertiesService.getScriptProperties();
  const folderId = props.getProperty('FOLDER_ID');
  const apiKey = props.getProperty('GEMINI_API_KEY');

  if (!folderId) throw new Error('尚未執行 setup(),找不到資料夾');
  if (!apiKey) throw new Error('尚未執行 setGeminiApiKey(),找不到金鑰');

  const folder = DriveApp.getFolderById(folderId);
  const files = folder.getFilesByType(MimeType.PDF);

  let processed = 0;
  while (files.hasNext() && processed < MAX_FILES_PER_RUN) {
    const file = files.next();
    const name = file.getName();

    if (name.includes(PROCESSED_SUFFIX)) continue;  // 跳過已處理

    Logger.log(`處理中:${name}`);
    try {
      const scores = extractScoresFromPDF(file, apiKey);
      const sheetUrl = createSpreadsheet(name, scores, folder);
      const newName = name.replace(/\.pdf$/i, `${PROCESSED_SUFFIX}.pdf`);
      file.setName(newName);
      Logger.log(`  ✓ 完成 ${scores.length} 個分數 → ${sheetUrl}`);
      processed++;
    } catch (e) {
      Logger.log(`  ✗ 失敗:${e.message}`);
      // 失敗的檔案不改名,下次會再試
    }
  }

  if (processed === 0) {
    Logger.log('無新檔案');
  }
}


// ========== 網頁入口:顯示上傳頁面 ==========
function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('成績 PDF 上傳')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}


// ========== 網頁呼叫:處理使用者上傳的 PDF ==========
function processUploadedPDF(base64Data, fileName) {
  const props = PropertiesService.getScriptProperties();
  const apiKey = props.getProperty('GEMINI_API_KEY');
  const folderId = props.getProperty('FOLDER_ID');

  if (!apiKey) throw new Error('尚未設定 Gemini API 金鑰,請先執行 setGeminiApiKey');
  if (!folderId) throw new Error('尚未執行 setup() 建立資料夾');

  const folder = DriveApp.getFolderById(folderId);
  const bytes = Utilities.base64Decode(base64Data);
  const blob = Utilities.newBlob(bytes, 'application/pdf', fileName);

  const scores = extractScoresFromBlob(blob, apiKey);
  const sheetUrl = createSpreadsheet(fileName, scores, folder);

  // 順便把 PDF 存到資料夾(已加後綴,避免觸發器重複處理)
  const savedName = fileName.replace(/\.pdf$/i, `${PROCESSED_SUFFIX}.pdf`);
  folder.createFile(blob).setName(savedName);

  return { count: scores.length, sheetUrl: sheetUrl };
}


// ========== 呼叫 Gemini API 辨識分數(接受 Drive 檔案) ==========
function extractScoresFromPDF(file, apiKey) {
  return extractScoresFromBlob(file.getBlob(), apiKey);
}


// ========== 呼叫 Gemini API 辨識分數(接受 Blob) ==========
function extractScoresFromBlob(blob, apiKey) {
  const pdfBase64 = Utilities.base64Encode(blob.getBytes());

  const prompt =
    '這份 PDF 是學生作業的掃描檔。老師會用「紅筆」在每一頁的「右下角區域」手寫分數。\n' +
    '\n' +
    '辨識範圍限制(非常重要):\n' +
    '  - 只看每頁「右邊 30% × 下面 30%」的區域(也就是右下角四分之一再小一點的方框)\n' +
    '  - 此區域以外的任何文字、數字、標記一律忽略,不要列入\n' +
    '\n' +
    '辨識目標:\n' +
    '  - 只認「紅色手寫」數字(紅筆顏色明顯,與印刷體、鉛筆、原子筆顏色都不同)\n' +
    '  - 黑色、藍色、鉛筆灰、印刷體數字一律忽略\n' +
    '  - 分數可能是整數(85)或帶小數(92.5)\n' +
    '\n' +
    '回傳格式:\n' +
    '  - 純 JSON 陣列:[[頁數, 分數], ...]\n' +
    '  - 範例:[[1, 85], [2, 92.5], [3, 78]]\n' +
    '  - 依 PDF 頁數順序排列\n' +
    '  - 同一頁若有多個紅筆分數就分別列出:[[1, 85], [1, 90]]\n' +
    '  - 某頁的右下角若沒有紅色手寫數字就跳過不列入\n' +
    '\n' +
    '只回覆 JSON,不要加任何說明文字、不要用 markdown 程式碼框包起來。';

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
  const payload = {
    contents: [{
      parts: [
        { inline_data: { mime_type: 'application/pdf', data: pdfBase64 } },
        { text: prompt }
      ]
    }]
  };

  const response = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  if (response.getResponseCode() !== 200) {
    throw new Error(`Gemini API 錯誤 ${response.getResponseCode()}:${response.getContentText().slice(0, 200)}`);
  }

  const result = JSON.parse(response.getContentText());
  const text = (result.candidates?.[0]?.content?.parts?.[0]?.text || '').trim();
  const cleanText = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();

  try {
    const parsed = JSON.parse(cleanText);
    if (!Array.isArray(parsed)) throw new Error('回傳非陣列');
    return parsed;
  } catch (e) {
    throw new Error(`無法解析 Gemini 回覆:「${text.slice(0, 150)}」`);
  }
}


// ========== 建立試算表並寫入分數 ==========
function createSpreadsheet(pdfName, scores, sourceFolder) {
  const title = pdfName.replace(/\.pdf$/i, '');
  const sheet = SpreadsheetApp.create(title);
  const ws = sheet.getActiveSheet();

  if (!scores || scores.length === 0) {
    ws.getRange(1, 1).setValue('(未偵測到任何紅色分數)');
  } else {
    ws.getRange(1, 1, 1, 2).setValues([['頁數', '分數']]).setFontWeight('bold');
    const values = scores.map(([page, score]) => [page, score]);
    ws.getRange(2, 1, values.length, 2).setValues(values);
    ws.autoResizeColumns(1, 2);
  }

  // 把試算表移到 PDF 同一個資料夾
  const ssFile = DriveApp.getFileById(sheet.getId());
  sourceFolder.addFile(ssFile);
  DriveApp.getRootFolder().removeFile(ssFile);

  return sheet.getUrl();
}
