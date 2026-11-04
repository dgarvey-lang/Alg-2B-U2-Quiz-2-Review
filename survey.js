/* "What do you need more help on?" survey.
 * Sends each student's answers to the teacher's Google Sheet through a
 * Google Apps Script web app (see teacher/survey-apps-script.gs and the README). */

// ===== TEACHER SETUP: paste your Apps Script web app URL between the quotes =====
const SURVEY_URL = 'https://script.google.com/macros/s/AKfycbwDbUPt3YWOmChtvMEBfI6yk_BmEamnUVPvw4DuYWD-g7sJOheY8fabvGNEFr3s5B-b/exec';
// ===============================================================================

(function () {
  'use strict';
  const form = document.getElementById('surveyForm');
  if (!form) return;
  const msg = document.getElementById('surveyMsg');
  const btn = form.querySelector('.submitbtn');
  const name = document.getElementById('sName'), period = document.getElementById('sPeriod');
  const ready = document.getElementById('sReady');
  const topics = [...form.querySelectorAll('input[name=topic]')];
  const say = (text, cls) => { msg.textContent = text; msg.className = 'feedback ' + cls; };

  // "I feel ready" and the help topics can't both be checked.
  ready.addEventListener('change', () => { if (ready.checked) topics.forEach(t => { t.checked = false; }); });
  topics.forEach(t => t.addEventListener('change', () => { if (t.checked) ready.checked = false; }));

  // Remember name and period on this device only, so a resubmit is quick.
  try {
    name.value = localStorage.getItem('survey.name') || '';
    period.value = localStorage.getItem('survey.period') || '';
  } catch (e) { /* storage blocked: fine */ }

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const picked = topics.filter(t => t.checked).map(t => t.value);
    if (!name.value.trim()) { say('⚠ Please type your name.', 'error'); name.focus(); return; }
    if (!picked.length && !ready.checked) { say('⚠ Check at least one topic, or “I feel ready on all of these.”', 'error'); return; }
    if (!SURVEY_URL) { say('⚠ This survey isn’t connected yet. Please let your teacher know.', 'error'); return; }

    const prog = window.ReviewChecker && ReviewChecker.progress ? ReviewChecker.progress() : null;
    const data = new URLSearchParams({
      name: name.value.trim(),
      period: period.value.trim(),
      topics: picked.join('|'),
      ready: ready.checked ? 'yes' : '',
      comments: document.getElementById('sComments').value.trim(),
      score: prog ? `${prog.solved.length} / ${prog.total}` : '',
      solved: prog ? prog.solved.join(', ') : '',
    });
    try { localStorage.setItem('survey.name', name.value.trim()); localStorage.setItem('survey.period', period.value.trim()); } catch (err) { /* ignore */ }

    btn.disabled = true; say('Sending…', '');
    try {
      // Apps Script doesn't send CORS headers, so the reply can't be read. A
      // network failure still throws, which is what we need to report.
      await fetch(SURVEY_URL, { method: 'POST', mode: 'no-cors', body: data });
      say(`✓ Thanks, ${name.value.trim().split(/\s+/)[0]}! Your teacher will see your answers.`, 'right');
      btn.textContent = 'Submit again';
    } catch (err) {
      say('✗ Couldn’t send. Check your internet connection and try again.', 'wrong');
    } finally {
      btn.disabled = false;
    }
  });
})();
