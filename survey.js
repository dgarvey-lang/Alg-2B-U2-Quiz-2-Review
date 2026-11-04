/* "What do you need more help on?" survey.
 * Sends each student's answers to the teacher's Google Sheet through a
 * Google Apps Script web app (see teacher/survey-apps-script.gs and the README). */

// ===== TEACHER SETUP: paste your Apps Script web app URL between the quotes =====
const SURVEY_URL = 'https://script.google.com/a/macros/pinkertonacademy.org/s/AKfycby7ZE3ia2O88QBMMh1VP342UkRJ0qTe3mU8a1cVgX-fHYeLqBbHhPftbzfH1VD0VX00/exec';
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

  form.addEventListener('submit', e => {
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

    // The school-only web app needs the student's Google sign-in, which a
    // background request from this page can't carry. Opening it in a new tab
    // does; the tab records the answers and shows a thank-you message.
    const url = SURVEY_URL + (SURVEY_URL.includes('?') ? '&' : '?') + data.toString();
    const tab = window.open(url, '_blank');
    if (tab) {
      say('✓ A new tab opened to send your answers. If it asks, sign in with your school Google account. When it says “Thanks,” you’re done.', 'right');
      btn.textContent = 'Submit again';
    } else {
      msg.className = 'feedback error';
      msg.innerHTML = '⚠ Your browser blocked the new tab. <a target="_blank" rel="noopener">Tap here to send your answers</a>.';
      msg.querySelector('a').href = url;
    }
  });
})();
