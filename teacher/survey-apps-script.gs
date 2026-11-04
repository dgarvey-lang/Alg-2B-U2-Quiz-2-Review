/**
 * Google Apps Script that saves the review page's survey into this Google Sheet.
 * Setup steps are in the repository README ("Seeing survey results").
 *
 * Each submission adds one row to the "Responses" tab:
 * Timestamp | Student | Class period | one column per topic (✔ = wants help) |
 * Feels ready | Comments | Review score | Problems correct | School email
 *
 * The survey opens this web app in a new tab (a GET request with the answers
 * in the URL), so a deployment limited to the school's Google accounts works:
 * the student's school sign-in comes along with the request.
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

function doGet(e) {
  const p = (e && e.parameter) || {};
  if (!p.name) {
    // Opening the web app URL by itself shows this, so you can tell it's working.
    return ContentService.createTextOutput('The survey is connected. Responses go to the "Responses" tab of your Sheet.');
  }
  record_(p);
  const first = escape_(String(p.name).trim().split(/\s+/)[0]);
  return HtmlService.createHtmlOutput(
    '<div style="font:20px/1.5 Arial,sans-serif;max-width:520px;margin:15vh auto;padding:0 16px;text-align:center">' +
    '<div style="font-size:56px;color:#1f7a3d">✓</div>' +
    '<h1 style="font-size:26px;margin:8px 0">Thanks, ' + first + '!</h1>' +
    '<p>Your answers were sent to your teacher. You can close this tab.</p></div>'
  ).setTitle('Survey sent');
}

// Kept so a background POST also works if the deployment is ever open to "Anyone".
function doPost(e) {
  record_((e && e.parameter) || {});
  return ContentService.createTextOutput('ok');
}

function record_(p) {
  const picked = String(p.topics || '').split('|');
  let email = '';
  try { email = Session.getActiveUser().getEmail(); } catch (err) { /* not available */ }
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    getSheet_().appendRow(
      [new Date(), clean_(p.name, 80), clean_(p.period, 20)]
        .concat(TOPICS.map(t => (picked.indexOf(t) >= 0 ? '✔' : '')))
        .concat([p.ready ? '✔' : '', clean_(p.comments, 1000), clean_(p.score, 20), clean_(p.solved, 200), email])
    );
  } finally {
    lock.releaseLock();
  }
}

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName('Responses');
  if (!sh) {
    sh = ss.insertSheet('Responses');
    sh.appendRow(['Timestamp', 'Student', 'Class period'].concat(TOPICS, ['Feels ready', 'Comments', 'Review score', 'Problems correct', 'School email']));
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

function escape_(s) {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
