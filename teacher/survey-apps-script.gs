/**
 * Google Apps Script that saves the review page's survey into this Google Sheet.
 * Setup steps are in the repository README ("Seeing survey results").
 *
 * Each submission adds one row to the "Responses" tab:
 * Timestamp | Student | Class period | one column per topic (✔ = wants help) |
 * Feels ready | Comments | Review score | Problems correct
 */

// These must match the checkbox values in index.html.
const TOPICS = [
  'Factoring, leading coefficient 1',
  'Factoring, leading coefficient > 1',
  'Simplifying simple radicals',
  'Radicals with variables',
  'Radicals with negatives',
  'Solving by square rooting',
];

function doPost(e) {
  const p = (e && e.parameter) || {};
  const picked = String(p.topics || '').split('|');
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    getSheet_().appendRow(
      [new Date(), clean_(p.name, 80), clean_(p.period, 20)]
        .concat(TOPICS.map(t => (picked.indexOf(t) >= 0 ? '✔' : '')))
        .concat([p.ready ? '✔' : '', clean_(p.comments, 1000), clean_(p.score, 20), clean_(p.solved, 200)])
    );
  } finally {
    lock.releaseLock();
  }
  return ContentService.createTextOutput('ok');
}

// Opening the web app URL in a browser shows this, so you can tell it's working.
function doGet() {
  return ContentService.createTextOutput('The survey is connected. Responses go to the "Responses" tab of your Sheet.');
}

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName('Responses');
  if (!sh) {
    sh = ss.insertSheet('Responses');
    sh.appendRow(['Timestamp', 'Student', 'Class period'].concat(TOPICS, ['Feels ready', 'Comments', 'Review score', 'Problems correct']));
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, sh.getLastColumn()).setFontWeight('bold').setWrap(true);
  }
  return sh;
}

// Trim, cap the length, and stop text from being read as a spreadsheet formula.
function clean_(v, max) {
  const s = String(v == null ? '' : v).trim().slice(0, max);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}
