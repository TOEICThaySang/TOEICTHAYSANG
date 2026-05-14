/* ═══════════════════════════════════════════════════════════════
   TOEICThaySang — exam-engine.js (ES Module)
   Auth: Google Sign-In → kiểm tra whitelist.js → vào làm bài
   Không dùng Firestore. Lịch sử lưu localStorage.
═══════════════════════════════════════════════════════════════ */

import { initializeApp, getApps, getApp }
  from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged }
  from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js';
import { getFirestore, collection, addDoc, query, where, orderBy, getDocs, getDoc, doc }
  from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js';

// ── Firebase — dùng app đã init bởi auth.js, hoặc tự init nếu chạy độc lập ──
const fbApp = getApps().length ? getApp() : initializeApp({
  apiKey:            'AIzaSyCZsFnaI6k4lxUkQOCcfxjEWyvtAJGfa_8',
  authDomain:        'toeic-thay-sang.firebaseapp.com',
  projectId:         'toeic-thay-sang',
  storageBucket:     'toeic-thay-sang.firebasestorage.app',
  messagingSenderId: '30478577148',
  appId:             '1:30478577148:web:6cae530feb9abdf2a59679',
});
const auth = getAuth(fbApp);
const db   = getFirestore(fbApp);

// ── GUARD: phải có EXAM_DATA ──
if (typeof EXAM_DATA === 'undefined') {
  document.body.innerHTML =
    '<div style="padding:40px;font-family:sans-serif;color:#dc2626">Lỗi: Không tìm thấy EXAM_DATA.</div>';
  throw new Error('EXAM_DATA missing');
}
const ED = EXAM_DATA;

// ── WHITELIST — đọc từ biến EXAM_WHITELIST (định nghĩa trong whitelist.js) ──
const WHITELIST = (typeof EXAM_WHITELIST !== 'undefined') ? EXAM_WHITELIST : [];

function isAllowed(email) {
  if (!email) return false;
  return WHITELIST.map(e => e.toLowerCase().trim())
                  .includes(email.toLowerCase().trim());
}

// ══════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════
const el   = id => document.getElementById(id);
const make = (tag, cls, html) => {
  const e = document.createElement(tag);
  if (cls)              e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
};

// ── SVG icon helpers ──
const _ic = (sz, st, inner) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${sz}" height="${sz}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="${st}">${inner}</svg>`;
const IC = {
  // button icons (15 px)
  clipboard: _ic(15,'vertical-align:-2px;margin-right:5px','<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>'),
  image:     _ic(15,'vertical-align:-2px;margin-right:5px','<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>'),
  arrowUp:   _ic(15,'vertical-align:-2px;margin-right:5px','<line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>'),
  arrowDown: _ic(15,'vertical-align:-2px;margin-right:5px','<line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>'),
  timer:     _ic(15,'vertical-align:-2px;margin-right:5px','<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>'),
  play:      `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="none" style="vertical-align:-2px;margin-right:5px"><polygon points="5 3 19 12 5 21 5 3"/></svg>`,
  // inline text icons (13 px)
  check:     _ic(13,'vertical-align:-1px;margin-right:4px','<polyline points="20 6 9 17 4 12"/>'),
  xmark:     _ic(13,'vertical-align:-1px;margin-right:4px','<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>'),
  lightbulb: _ic(13,'vertical-align:-1px;margin-right:4px','<line x1="9" y1="21" x2="15" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/>'),
  flagInline:`<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="none" style="vertical-align:-1px;margin-right:4px"><path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z"/></svg>`,
  // modal title icons (18 px)
  barChart:  _ic(18,'vertical-align:-3px;margin-right:7px','<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>'),
  folder:    _ic(18,'vertical-align:-3px;margin-right:7px','<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>'),
  send:      _ic(18,'vertical-align:-3px;margin-right:7px','<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>'),
  // mode-tab icons (16 px)
  target:    _ic(16,'vertical-align:-2px;margin-right:6px','<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>'),
  fileText:  _ic(16,'vertical-align:-2px;margin-right:6px','<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>'),
  // standalone large icons
  warning:   `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  books:     `<svg xmlns="http://www.w3.org/2000/svg" width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`,
  sliders:   `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>`,
};
const fmtTime = sec => {
  const m = Math.floor(sec / 60).toString().padStart(2,'0');
  const s = (sec % 60).toString().padStart(2,'0');
  return `${m}:${s}`;
};
const escHtml = str => String(str)
  .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');
const youtubeEmbed = (url, autoplay=false) => {
  if (!url) return '';
  let vid='', params=[];
  const m1=url.match(/youtu\.be\/([^?&]+)/);
  const m2=url.match(/[?&]v=([^&]+)/);
  const m3=url.match(/\/embed\/([^?&]+)/);
  if (m1) vid=m1[1]; else if (m2) vid=m2[1]; else if (m3) vid=m3[1];
  vid = (vid||'').split('?')[0];
  const t=url.match(/[?&]t=(\d+)/);
  if (t) params.push('start='+t[1]);
  params.push('enablejsapi=1','rel=0','modestbranding=1','iv_load_policy=3');
  if (autoplay) params.push('autoplay=1');
  const qs=params.length?'?'+params.join('&'):'';
  if (vid) return `https://www.youtube.com/embed/${vid}${qs}`;
  if (url.includes('/embed/')) return url+(autoplay?(url.includes('?')?'&':'?')+'autoplay=1':'');
  return url;
};

// Preconnect YouTube sớm để giảm thời gian khởi tạo iframe
(()=>{ ['https://www.youtube.com','https://i.ytimg.com'].forEach(h=>{ const l=document.createElement('link'); l.rel='preconnect'; l.href=h; document.head.appendChild(l); }); })();

// Lưu DOM refs của left tab theo sk — để toggle không cần re-render
const leftTabRefs = {};

// Cache lite-yt DOM nodes ngoài examBody — di chuyển node trong same document không reload iframe
const _lytByVid = {};
const _lytCache = (() => {
  const d = document.createElement('div');
  // Đủ lớn để YouTube player hoạt động bình thường; left:-9999px để ẩn khỏi màn hình
  d.style.cssText = 'position:fixed;top:0;left:-9999px;width:640px;height:360px;overflow:hidden;pointer-events:none;';
  document.body.appendChild(d);
  return d;
})();


// ── Lịch sử làm bài (localStorage) ──
function getHistory(examId) {
  try {
    return JSON.parse(localStorage.getItem('hist_' + examId) || '[]')
               .sort((a,b) => b.savedAt - a.savedAt);
  } catch(e) { return []; }
}
function saveHistory(R) {
  try {
    const key  = 'hist_' + R.examId;
    const list = JSON.parse(localStorage.getItem(key) || '[]');
    list.unshift({ ...R, savedAt: Date.now() });
    localStorage.setItem(key, JSON.stringify(list.slice(0,10)));
  } catch(e) {}
}
async function saveResultToFirestore(R) {
  if (!currentUser) return;
  try {
    await addDoc(collection(db, 'results'), {
      uid: currentUser.uid, email: currentUser.email,
      displayName: currentUser.displayName || '',
      examId: R.examId, examTitle: R.examTitle,
      mode: R.mode, selectedParts: R.selectedParts,
      answers: R.answers || {}, flags: R.flags || {},
      partResults: R.partResults,
      totalCorrect: R.totalCorrect, totalQ: R.totalQ,
      totalWrong: R.totalWrong, totalBlank: R.totalBlank,
      elapsed: R.elapsed, score: R.totalCorrect * 5,
      pct: R.totalQ>0 ? Math.round(R.totalCorrect/R.totalQ*100) : 0,
      examUrl: R.examUrl || window.location.href,
      createdAt: new Date(),
    });
  } catch(e) { console.error('Firestore save error:', e); }
}
function enterReviewFromHistory(r) {
  state = {
    mode: r.mode || 'test', selectedParts: r.selectedParts || [],
    timeLimit: 0, secondsLeft: 0, timerMode: 'down',
    screens: buildScreens(r.selectedParts || []),
    currentIdx: 0, answers: r.answers || {}, flags: r.flags || {},
    timerInterval: null, started: true, finished: true, startTime: null,
    showSolution: {}, showTrans: {}, showImg: {}, leftTab: {}, videoQ: {}, sheetFilter: 'all',
  };
  renderExamPage();
  enterReviewMode(r);
}

// ══════════════════════════════════════════════════════════════
// STATE
// ══════════════════════════════════════════════════════════════
let currentUser = null;
let state = {
  mode: null, selectedParts: [], timeLimit: 0, timerMode: 'down',
  screens: [], currentIdx: 0, answers: {}, flags: {}, lastRevealedQ: null, scrollToQ: null,
  timerInterval: null, secondsLeft: 0,
  started: false, finished: false, startTime: null,
  showSolution: {}, showTrans: {}, showImg: {}, sheetFilter: 'all', leftTab: {}, videoQ: {},
};
const LS_KEY = 'prog_' + ED.id;
function saveProgress() {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({
      mode: state.mode, selectedParts: state.selectedParts,
      timeLimit: state.timeLimit, secondsLeft: state.secondsLeft,
      timerMode: state.timerMode,
      currentIdx: state.currentIdx, answers: state.answers,
      flags: state.flags, startTime: state.startTime, savedAt: Date.now(),
    }));
  } catch(e) {}
}
function loadProgress() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)); } catch(e) { return null; }
}
function clearProgress() { localStorage.removeItem(LS_KEY); }

// ══════════════════════════════════════════════════════════════
// EXAM DATA HELPERS
// ══════════════════════════════════════════════════════════════
function getPartQuestions(p) {
  const part = ED.parts[String(p)];
  if (!part) return [];
  if (part.questions) return part.questions.map(q => q.q);
  if (part.groups)    return part.groups.flatMap(g => g.questions.map(q => q.q));
  return [];
}
function getQuestionData(qNum) {
  for (let p = 1; p <= 7; p++) {
    const part = ED.parts[String(p)];
    if (!part) continue;
    if (part.questions) {
      const q = part.questions.find(q => q.q === qNum);
      if (q) return { part: p, q };
    }
    if (part.groups) {
      for (const g of part.groups) {
        const q = g.questions.find(q => q.q === qNum);
        if (q) return { part: p, group: g, q };
      }
    }
  }
  return null;
}
function countAnswered(qNums) { return qNums.filter(q => state.answers[q]).length; }
function screenKey(sc) {
  if (sc.q)     return `p${sc.part}_q${sc.q.q}`;
  if (sc.group) return `p${sc.part}_g${sc.groupIdx}`;
  return `p${sc.part}`;
}

// ══════════════════════════════════════════════════════════════
// BUILD SCREENS
// ══════════════════════════════════════════════════════════════
function buildScreens(parts) {
  const screens = [];
  parts.forEach(pNum => {
    const part = ED.parts[String(pNum)];
    if (!part) return;
    if ([1,2,5].includes(pNum) && part.questions)
      part.questions.forEach(q => screens.push({ type:`p${pNum}`, part:pNum, q }));
    if ([3,4,6,7].includes(pNum) && part.groups)
      part.groups.forEach((g,gi) => screens.push({ type:`p${pNum}`, part:pNum, group:g, groupIdx:gi }));
  });
  return screens;
}

// ══════════════════════════════════════════════════════════════
// 1. AUTH GATE
// ══════════════════════════════════════════════════════════════
function renderAuthGate(notRegistered) {
  document.body.innerHTML = '';
  document.body.className = 'auth-page';
  const card = make('div','auth-card');
  card.innerHTML = `
    <div class="auth-lock-icon">${IC.books}</div>
    <div class="auth-title">TOEIC Thầy Sang</div>
    <div class="auth-sub" ${notRegistered ? 'style="color:#dc2626;font-weight:600"' : ''}>
      ${notRegistered
        ? 'Tài khoản chưa đăng ký.<br>Liên hệ giáo viên để đăng ký luyện thi.'
        : 'Vui lòng đăng nhập để tiếp tục.'}
    </div>
    <button class="btn-google-login" id="btnGoogle">
      <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google">
      Đăng nhập bằng Google
    </button>`;
  document.body.appendChild(card);

  card.querySelector('#btnGoogle').addEventListener('click', async () => {
    const btn = card.querySelector('#btnGoogle');
    btn.disabled = true;
    btn.innerHTML = `<img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt=""> Đang đăng nhập...`;
    try {
      const result  = await signInWithPopup(auth, new GoogleAuthProvider());
      const user    = result.user;
      if (isAllowed(user.email)) {
        currentUser = user;
        renderSelectPage();
      } else {
        await signOut(auth);
        renderAuthGate(true);
      }
    } catch(e) {
      btn.disabled = false;
      btn.innerHTML = `<img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google"> Đăng nhập bằng Google`;
    }
  });
}

// ══════════════════════════════════════════════════════════════
// 2. TRANG CHỌN PART
// ══════════════════════════════════════════════════════════════
function renderSelectPage() {
  document.body.innerHTML = '';
  document.body.className = '';

  const page = make('div','select-page');
  const card = make('div','select-card');
  const tabs = make('div','mode-tabs');
  tabs.innerHTML = `
    <button class="mode-tab active" data-mode="practice">
      <span class="mode-tab-label">${IC.target}Luyện tập</span>
      <span class="mode-tab-note">Luyện tập trọn đề hoặc theo part, xem bài giải tự do</span>
    </button>
    <button class="mode-tab" data-mode="test">
      <span class="mode-tab-label">${IC.fileText}Thi thử</span>
      <span class="mode-tab-note">Thi thử trọn đề hoặc theo part, xem bài giải chỉ khi hoàn thành</span>
    </button>`;
  card.appendChild(tabs);

  const body = make('div','select-body');

  // Lịch sử
  const history = getHistory(ED.id);
  if (history.length > 0) {
    const last = history[0];
    const date = new Date(last.savedAt).toLocaleDateString('vi-VN');
    const hw   = make('div','');
    hw.style.cssText = 'background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:10px 14px;font-size:13px;color:#15803d;margin-bottom:16px;display:flex;align-items:center;justify-content:space-between';
    hw.innerHTML = `
      <span>${IC.check}Lần cuối: <b>${last.totalCorrect}/${last.totalQ} câu đúng</b> — ${date}</span>
      <button id="btnHistory" style="background:none;border:none;font-size:12px;color:#15803d;cursor:pointer;text-decoration:underline;font-weight:600">Xem lịch sử</button>`;
    body.appendChild(hw);
    hw.querySelector('#btnHistory').addEventListener('click', () => showHistoryModal());
  }

  body.appendChild(make('div','select-section-label','Chọn part'));

  const partGrid = make('div','part-grid');
  [1,2,3,4,5,6,7].forEach(p => {
    const btn = make('button','part-btn');
    btn.dataset.part = p;
    btn.innerHTML = `<span class="part-btn-label">Part ${p}</span>`;
    partGrid.appendChild(btn);
  });
  body.appendChild(partGrid);

  const selectAllBtn = make('button','select-all-btn','Chọn tất cả');
  body.appendChild(selectAllBtn);

  const fullNote = make('div','exam-full-note',IC.timer+'Thi thử trọn đề: thời gian cố định <b>120 phút</b>.');
  body.appendChild(fullNote);
  body.appendChild(make('div','select-divider'));

  const timeLabel = make('div','select-section-label','Thời gian làm bài');
  body.appendChild(timeLabel);

  const timeSection = make('div','time-section');
  const timerModeGroup = make('div','timer-mode-group');
  const btnTimerUp   = make('button','timer-mode-btn',IC.arrowUp+'Đếm lên');
  const btnTimerDown = make('button','timer-mode-btn',IC.arrowDown+'Đếm ngược');
  timerModeGroup.appendChild(btnTimerUp);
  timerModeGroup.appendChild(btnTimerDown);
  timeSection.appendChild(timerModeGroup);

  const countdownWrap = make('div','countdown-wrap');
  const timeGrid = make('div','time-grid');
  const timeMins = [5,10,15,20,25,30,35,40,45,50,55,60,65,70,75,120];
  timeMins.forEach(m => {
    const btn = make('button','time-grid-btn', m + ' phút');
    btn.dataset.min = m;
    timeGrid.appendChild(btn);
  });
  countdownWrap.appendChild(timeGrid);
  countdownWrap.style.display = 'none';
  timeSection.appendChild(countdownWrap);
  body.appendChild(timeSection);
  body.appendChild(make('div','select-divider'));

  const btnStart = make('button','btn-start','Bắt đầu');
  btnStart.disabled = true;
  body.appendChild(btnStart);


  card.appendChild(body);
  page.appendChild(card);
  document.body.appendChild(page);

  // ── Logic ──
  let selParts = [], selMinutes = 0, curMode = 'practice', timerMode = null;

  function isFullTest() { return curMode === 'test' && selParts.length === 7; }
  function updateUI() {
    const full = isFullTest();
    fullNote.classList.toggle('visible', full);
    timeSection.style.display = full ? 'none' : '';
    timeLabel.style.display   = full ? 'none' : '';
    const timeReady = full || timerMode === 'up' || (timerMode === 'down' && selMinutes > 0);
    const ready = selParts.length > 0 && timeReady;
    btnStart.disabled  = !ready;
    btnStart.className = 'btn-start' + (ready ? ' ready' : '');
    btnStart.textContent = 'Bắt đầu';
  }

  tabs.querySelectorAll('.mode-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.querySelectorAll('.mode-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active'); curMode = tab.dataset.mode; updateUI();
    });
  });

  partGrid.querySelectorAll('.part-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = parseInt(btn.dataset.part);
      if (selParts.includes(p)) { selParts=selParts.filter(x=>x!==p); btn.classList.remove('selected'); }
      else { selParts.push(p); btn.classList.add('selected'); }
      selParts.sort((a,b)=>a-b);
      selectAllBtn.classList.toggle('active', selParts.length===7);
      updateUI();
    });
  });

  selectAllBtn.addEventListener('click', () => {
    if (selParts.length===7) { selParts=[]; partGrid.querySelectorAll('.part-btn').forEach(b=>b.classList.remove('selected')); selectAllBtn.classList.remove('active'); }
    else { selParts=[1,2,3,4,5,6,7]; partGrid.querySelectorAll('.part-btn').forEach(b=>b.classList.add('selected')); selectAllBtn.classList.add('active'); }
    updateUI();
  });

  btnTimerUp.addEventListener('click', () => {
    timerMode = 'up';
    btnTimerUp.classList.add('active');
    btnTimerDown.classList.remove('active');
    countdownWrap.style.display = 'none';
    updateUI();
  });

  btnTimerDown.addEventListener('click', () => {
    timerMode = 'down';
    btnTimerDown.classList.add('active');
    btnTimerUp.classList.remove('active');
    countdownWrap.style.display = '';
    updateUI();
  });

  timeGrid.querySelectorAll('.time-grid-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selMinutes = parseInt(btn.dataset.min) || 0;
      timeGrid.querySelectorAll('.time-grid-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      updateUI();
    });
  });

  btnStart.addEventListener('click', () => {
    if (btnStart.disabled) return;
    const seconds = isFullTest() ? 120*60 : (timerMode === 'up' ? 0 : selMinutes*60);
    startExam(curMode, selParts, seconds, timerMode === 'up' ? 'up' : 'down');
  });

  const saved = loadProgress();
  if (saved && saved.answers && Object.keys(saved.answers).length>0) showResumeModal(saved);
}

async function showHistoryModal() {
  const overlay = make('div','modal-overlay show');
  overlay.innerHTML = `
    <div class="modal-box" style="max-width:540px;text-align:left">
      <div class="modal-title" style="text-align:center">${IC.barChart}Lịch sử làm bài</div>
      <div id="histList" style="margin:16px 0;max-height:340px;overflow-y:auto">
        <div style="text-align:center;color:#64748b;padding:24px;font-size:13px">Đang tải...</div>
      </div>
      <div class="modal-actions"><button class="modal-btn confirm" id="closeHist">Đóng</button></div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.querySelector('#closeHist').addEventListener('click', () => overlay.remove());

  let records = [];
  if (currentUser) {
    try {
      const q = query(collection(db,'results'),
        where('uid','==',currentUser.uid),
        where('examId','==',ED.id),
        orderBy('createdAt','desc'));
      const snap = await getDocs(q);
      records = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch(e) { console.error('Firestore history:', e); }
  }
  if (!records.length) records = getHistory(ED.id);

  const listEl = overlay.querySelector('#histList');
  if (!records.length) {
    listEl.innerHTML = '<div style="text-align:center;color:#64748b;padding:24px;font-size:13px">Chưa có lịch sử làm bài.</div>';
    return;
  }
  listEl.innerHTML = '';
  records.forEach(r => {
    const ts = r.createdAt?.toDate ? r.createdAt.toDate() : new Date(r.savedAt||0);
    const date = ts.toLocaleString('vi-VN');
    const pct  = r.totalQ>0 ? Math.round(r.totalCorrect/r.totalQ*100) : 0;
    const row  = make('div','');
    row.style.cssText = 'display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid #e2e8f0;font-size:13px';
    const info = make('div','');
    info.style.flex = '1';
    info.innerHTML = `<div style="font-weight:600;color:#1e293b">${r.mode==='practice'?'Luyện tập':'Thi thử'} — Part ${(r.selectedParts||[]).join(', ')}</div>
      <div style="color:#64748b;font-size:12px;margin-top:2px">${date}</div>`;
    const score = make('div','');
    score.style.cssText = 'font-weight:700;color:#1e40af;white-space:nowrap';
    score.textContent = `${r.totalCorrect}/${r.totalQ} (${pct}%)`;
    row.appendChild(info); row.appendChild(score);
    if (r.answers) {
      const btn = make('button','modal-btn confirm','Xem lại');
      btn.style.cssText = 'padding:4px 14px;font-size:12px;flex-shrink:0';
      btn.addEventListener('click', () => { overlay.remove(); enterReviewFromHistory(r); });
      row.appendChild(btn);
    }
    listEl.appendChild(row);
  });
}

// ══════════════════════════════════════════════════════════════
// RESUME MODAL
// ══════════════════════════════════════════════════════════════
function showResumeModal(saved) {
  const overlay = make('div','modal-overlay show');
  const total   = Object.keys(saved.answers).length;
  const date    = new Date(saved.savedAt).toLocaleString('vi-VN');
  overlay.innerHTML = `
    <div class="modal-box">
      <div class="modal-title">${IC.folder}Tiếp tục bài làm?</div>
      <div class="resume-info">
        <b>${saved.mode==='practice'?'Luyện tập':'Thi thử'}</b> — Part ${saved.selectedParts.join(', ')}<br>
        Đã trả lời: <b>${total} câu</b> &nbsp;·&nbsp; Lưu lúc: ${date}
      </div>
      <div class="modal-actions">
        <button class="modal-btn cancel" id="resumeNo">Bắt đầu mới</button>
        <button class="modal-btn confirm" id="resumeYes">Tiếp tục</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.querySelector('#resumeYes').addEventListener('click', () => {
    overlay.remove();
    Object.assign(state, {
      mode:saved.mode, selectedParts:saved.selectedParts,
      timeLimit:saved.timeLimit, secondsLeft:saved.secondsLeft,
      timerMode:saved.timerMode||'down',
      currentIdx:saved.currentIdx, answers:saved.answers,
      flags:saved.flags||{}, startTime:saved.startTime,
      screens:buildScreens(saved.selectedParts),
      showSolution:{}, showTrans:{}, showImg:{}, leftTab:{}, videoQ:{},
    });
    renderExamPage();
  });
  overlay.querySelector('#resumeNo').addEventListener('click', () => { overlay.remove(); clearProgress(); });
}

// ══════════════════════════════════════════════════════════════
// BẮT ĐẦU LÀM BÀI
// ══════════════════════════════════════════════════════════════
function startExam(mode, parts, seconds, timerMode) {
  state = {
    mode, selectedParts:parts, timeLimit:seconds, secondsLeft:seconds,
    timerMode: timerMode || 'down',
    screens:buildScreens(parts), currentIdx:0, answers:{}, flags:{},
    timerInterval:null, started:true, finished:false,
    startTime:Date.now(), showSolution:{}, showTrans:{}, showImg:{}, leftTab:{}, videoQ:{},
  };
  renderExamPage();
}

// ══════════════════════════════════════════════════════════════
// RENDER TRANG LÀM BÀI
// ══════════════════════════════════════════════════════════════
function renderExamPage() {
  document.body.innerHTML = '';
  document.body.className = 'exam-page';

  const topbar = make('div','topbar');
  topbar.innerHTML = `
    <button class="topbar-exit-btn" id="btnExit" title="Thoát"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg></button>
    <div class="topbar-logo">TOEIC Thầy Sang</div>
    <div class="topbar-title">${ED.title}</div>
    <div class="topbar-right">
      <div class="timer" id="timerDisplay">${fmtTime(state.secondsLeft)}</div>
      <div class="review-group">
        <button class="rg-btn rg-prev" id="btnNavPrev" title="Câu trước" disabled>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6z"/></svg>
        </button>
        <button class="rg-btn rg-sheet" id="btnSheet" title="Phiếu đáp án">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="15" height="15"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
        </button>
        <button class="rg-btn rg-next" id="btnNavNext" title="Câu sau">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z"/></svg>
        </button>
      </div>
      <button class="topbar-btn submit-btn" id="btnSubmit">Nộp bài</button>
    </div>`;
  document.body.appendChild(topbar);

  const sheetOverlay = make('div','answer-sheet-overlay');
  sheetOverlay.id = 'sheetOverlay';
  sheetOverlay.innerHTML = `
    <div class="answer-sheet">
      <div class="answer-sheet-head">
        <div class="answer-sheet-head-title">Review đáp án</div>
        <div class="answer-sheet-legend">
          <div class="legend-item"><div class="legend-dot answered"></div> Đã chọn</div>
          <div class="legend-item"><div class="legend-dot unanswered"></div> Bỏ trống</div>
          <div class="legend-item">${IC.flagInline} Đánh dấu</div>
        </div>
        <div class="sheet-filters" id="sheetFilters">
          <button class="sheet-filter-btn active" data-filter="all">Tất cả</button>
          <button class="sheet-filter-btn" data-filter="unanswered">Bỏ trống</button>
          <button class="sheet-filter-btn" data-filter="wrong">Câu sai</button>
          <button class="sheet-filter-btn" data-filter="flagged">Đánh dấu</button>
        </div>
      </div>
      <div class="answer-sheet-body" id="sheetBody"></div>
    </div>`;
  document.body.appendChild(sheetOverlay);

  const examBody = make('div','exam-body');
  examBody.id = 'examBody';
  document.body.appendChild(examBody);

  const confirmOverlay = make('div','modal-overlay');
  confirmOverlay.id = 'confirmOverlay';
  confirmOverlay.innerHTML = `
    <div class="modal-box">
      <div class="modal-title">${IC.send}Nộp bài?</div>
      <div class="modal-body" id="confirmBody"></div>
      <div class="modal-actions">
        <button class="modal-btn cancel" id="confirmCancel">Làm tiếp</button>
        <button class="modal-btn confirm" id="confirmOk">Nộp bài</button>
      </div>
    </div>`;
  document.body.appendChild(confirmOverlay);

  const exitOverlay = make('div','modal-overlay');
  exitOverlay.id = 'exitOverlay';
  exitOverlay.innerHTML = `
    <div class="modal-box">
      <div class="modal-title"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:7px"><polyline points="15 18 9 12 15 6"/></svg>Thoát bài thi?</div>
      <div class="modal-body">Tiến độ làm bài sẽ được lưu lại. Bạn có thể quay lại tiếp tục sau.</div>
      <div class="modal-actions">
        <button class="modal-btn cancel" id="exitCancel">Ở lại</button>
        <button class="modal-btn confirm" id="exitOk">Thoát</button>
      </div>
    </div>`;
  document.body.appendChild(exitOverlay);

  const warningOverlay = make('div','warning-overlay');
  warningOverlay.id = 'warningOverlay';
  warningOverlay.innerHTML = `
    <div class="warning-box">
      <div class="warning-icon">${IC.warning}</div>
      <div class="warning-text">Còn 2 phút!</div>
      <div class="warning-sub">Kiểm tra lại bài làm của bạn.</div>
    </div>`;
  document.body.appendChild(warningOverlay);

  el('btnSheet').addEventListener('click', ()=>toggleSheet());
  el('btnNavPrev').addEventListener('click', ()=>{
    if (state.currentIdx > 0) { state.currentIdx--; renderScreen(state.currentIdx); renderSheet(); saveProgress(); }
  });
  el('btnNavNext').addEventListener('click', goNext);
  sheetOverlay.addEventListener('click', e=>{ if(e.target===sheetOverlay) toggleSheet(false); });
  sheetOverlay.querySelectorAll('.sheet-filter-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{ state.sheetFilter=btn.dataset.filter; applySheetFilter(); });
  });
  el('btnSubmit').addEventListener('click', showConfirmModal);
  el('confirmCancel').addEventListener('click', ()=>confirmOverlay.classList.remove('show'));
  el('confirmOk').addEventListener('click', ()=>{ confirmOverlay.classList.remove('show'); submitExam(); });
  el('btnExit').addEventListener('click', ()=>{
    if (state.finished) { window.location.href = window.location.pathname; return; }
    exitOverlay.classList.add('show');
  });
  el('exitCancel').addEventListener('click', ()=>exitOverlay.classList.remove('show'));
  el('exitOk').addEventListener('click', ()=>{ window.location.href = window.location.pathname; });
  document.addEventListener('keydown', handleKeydown);

  renderScreen(state.currentIdx);
  renderSheet();
  if (!state.finished) startTimer();
  renderSettingsPanel();
}

// ══════════════════════════════════════════════════════════════
// SETTINGS PANEL
// ══════════════════════════════════════════════════════════════
function renderSettingsPanel() {
  const FONT_STEPS = [12, 14, 16, 18, 20];
  const savedIdx     = parseInt(localStorage.getItem('tts_font_idx') ?? '2', 10);
  const savedSpacing = localStorage.getItem('tts_spacing') === '1';
  if (localStorage.getItem('tts_autoplay') === null)
    localStorage.setItem('tts_autoplay', state.finished ? '0' : '1');

  let fontIdx = (savedIdx >= 0 && savedIdx < FONT_STEPS.length) ? savedIdx : 2;
  document.documentElement.style.setProperty('--ef', FONT_STEPS[fontIdx] + 'px');
  if (savedSpacing) document.body.classList.add('exam-wide-spacing');

  const existingFab   = el('settingsFab');
  const existingPanel = el('settingsPanel');
  if (existingFab)   existingFab.remove();
  if (existingPanel) existingPanel.remove();

  const fab = document.createElement('button');
  fab.id = 'settingsFab';
  fab.className = 'settings-fab';
  fab.title = 'Tuỳ chọn hiển thị';
  fab.innerHTML = IC.sliders;

  const panel = document.createElement('div');
  panel.id = 'settingsPanel';
  panel.className = 'settings-panel';

  const syncPanel = () => {
    const fontDisp = panel.querySelector('.sp-font-val');
    if (fontDisp) fontDisp.textContent = FONT_STEPS[fontIdx] + 'px';
    const spBtn = panel.querySelector('[data-sp="spacing"]');
    if (spBtn) spBtn.classList.toggle('on', document.body.classList.contains('exam-wide-spacing'));
    const fsBtn = panel.querySelector('[data-sp="fullscreen"]');
    if (fsBtn) fsBtn.classList.toggle('on', !!document.fullscreenElement);
    const apBtn = panel.querySelector('[data-sp="autoplay"]');
    if (apBtn) apBtn.classList.toggle('on', localStorage.getItem('tts_autoplay') !== '0');
    const ratioVal = parseInt(localStorage.getItem('tts_left_ratio') || '50');
    panel.querySelectorAll('.sp-ratio-btn').forEach(b => {
      b.classList.toggle('active', parseInt(b.dataset.ratio) === ratioVal);
    });
  };

  panel.innerHTML = `
    <div class="sp-title">${IC.sliders} Tuỳ chọn</div>
    <div class="sp-row">
      <span class="sp-label">Cỡ chữ</span>
      <div class="sp-font-ctrl">
        <button class="sp-btn" data-sp="font-">A−</button>
        <span class="sp-font-val">${FONT_STEPS[fontIdx]}px</span>
        <button class="sp-btn" data-sp="font+">A+</button>
      </div>
    </div>
    <div class="sp-row">
      <span class="sp-label">Giãn dòng</span>
      <button class="sp-toggle-btn" data-sp="spacing" aria-label="Giãn dòng">
        <span class="sp-toggle-track"><span class="sp-toggle-thumb"></span></span>
      </button>
    </div>
    <div class="sp-row">
      <span class="sp-label">Toàn màn hình</span>
      <button class="sp-toggle-btn" data-sp="fullscreen" aria-label="Toàn màn hình">
        <span class="sp-toggle-track"><span class="sp-toggle-thumb"></span></span>
      </button>
    </div>
    <div class="sp-row">
      <span class="sp-label">Tự phát audio</span>
      <button class="sp-toggle-btn" data-sp="autoplay" aria-label="Tự phát audio">
        <span class="sp-toggle-track"><span class="sp-toggle-thumb"></span></span>
      </button>
    </div>
    <div class="sp-row">
      <span class="sp-label">Tỷ lệ bố cục</span>
      <div class="sp-ratio-ctrl">
        <button class="sp-ratio-btn" data-sp="ratio" data-ratio="50" title="Đều 50:50">½</button>
        <button class="sp-ratio-btn" data-sp="ratio" data-ratio="65" title="Rộng 65:35">⅔</button>
        <button class="sp-ratio-btn" data-sp="ratio" data-ratio="72" title="Tối đa 72:28">¾</button>
      </div>
    </div>
    <div class="sp-divider"></div>
    <div class="sp-section-label">Phím tắt</div>
    <div class="sp-shortcuts">
      <div class="sp-sc-row"><kbd class="sp-key-wide">Enter</kbd><span>Câu tiếp theo</span></div>
      <div class="sp-sc-row"><kbd class="sp-key-wide">Space</kbd><span>Tạm ngưng / tiếp tục</span></div>
      <div class="sp-sc-row"><kbd>←</kbd><span>−3 giây</span></div>
      <div class="sp-sc-row"><kbd>→</kbd><span>+3 giây</span></div>
      <div class="sp-sc-row"><kbd>↑</kbd><span>Cuộn lên (cột bài)</span></div>
      <div class="sp-sc-row"><kbd>↓</kbd><span>Cuộn xuống (cột bài)</span></div>
    </div>
  `;

  panel.addEventListener('click', (e) => {
    const sp = e.target.closest('[data-sp]')?.dataset.sp;
    if (!sp) return;
    if (sp === 'font-') {
      if (fontIdx > 0) { fontIdx--; document.documentElement.style.setProperty('--ef', FONT_STEPS[fontIdx] + 'px'); localStorage.setItem('tts_font_idx', fontIdx); }
    } else if (sp === 'font+') {
      if (fontIdx < FONT_STEPS.length - 1) { fontIdx++; document.documentElement.style.setProperty('--ef', FONT_STEPS[fontIdx] + 'px'); localStorage.setItem('tts_font_idx', fontIdx); }
    } else if (sp === 'spacing') {
      document.body.classList.toggle('exam-wide-spacing');
      localStorage.setItem('tts_spacing', document.body.classList.contains('exam-wide-spacing') ? '1' : '0');
    } else if (sp === 'autoplay') {
      const cur = localStorage.getItem('tts_autoplay') !== '0';
      localStorage.setItem('tts_autoplay', cur ? '0' : '1');
    } else if (sp === 'fullscreen') {
      if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen();
    } else if (sp === 'ratio') {
      const pct = parseInt(e.target.closest('[data-ratio]')?.dataset.ratio || '50');
      localStorage.setItem('tts_left_ratio', pct);
      const leftPanel = document.querySelector('.screen-left');
      if (leftPanel) leftPanel.style.width = pct + '%';
    }
    syncPanel();
  });

  document.addEventListener('fullscreenchange', syncPanel);

  fab.addEventListener('click', (e) => {
    e.stopPropagation();
    panel.classList.toggle('open');
  });
  document.addEventListener('click', (e) => {
    if (!panel.contains(e.target) && e.target !== fab) panel.classList.remove('open');
  });

  const topbarLogo = document.querySelector('.topbar-logo');
  if (topbarLogo) topbarLogo.after(fab);
  else document.body.appendChild(fab);
  document.body.appendChild(panel);
  syncPanel();
}

// ══════════════════════════════════════════════════════════════
// RENDER MÀN HÌNH
// ══════════════════════════════════════════════════════════════
function goNext() {
  if (state.currentIdx >= state.screens.length - 1) return;
  state.currentIdx++;
  renderScreen(state.currentIdx);
  renderSheet();
  saveProgress();
}

function lytCache_save() {
  const body = el('examBody');
  if (!body) return;
  body.querySelectorAll('.lite-yt').forEach(lytEl => {
    const vid = lytEl.dataset.vid;
    if (!vid) return;
    const iframe = lytEl.querySelector('iframe');
    if (iframe) ytPostMsg(iframe, 'pauseVideo');
    _lytByVid[vid] = lytEl;
    _lytCache.appendChild(lytEl);
  });
}

// ══════════════════════════════════════════════════════════════
// CLOZE GAME — Nghe Khuyết (Part 1–4)
// ══════════════════════════════════════════════════════════════
const clozeState = {};

function clozeTokenize(text, partNum) {
  const tokens = [];
  const lines = (text || '').split('\n');
  lines.forEach((rawLine, li) => {
    if (li > 0) tokens.push({ type: 'br' });
    const line = rawLine.trim();
    if (!line) return;
    let rest = line;
    if ([3, 4].includes(partNum)) {
      const sm = rest.match(/^([A-Za-z]+\s*:)\s*/);
      if (sm) {
        tokens.push({ type: 'fixed', text: sm[1] });
        tokens.push({ type: 'space', text: ' ' });
        rest = rest.slice(sm[0].length);
      }
      // Tách câu: dấu .?! + space + chữ hoa / dấu ngoặc
      const sentences = rest.split(/(?<=[.?!])\s+(?=[A-Z("])/);
      sentences.forEach((sent, si) => {
        if (si > 0) tokens.push({ type: 'sentbr' });
        clozeWords(sent, tokens);
      });
    } else {
      const om = rest.match(/^\(([A-D])\)\s*/);
      if (om) {
        tokens.push({ type: 'fixed', text: `(${om[1]})` });
        tokens.push({ type: 'space', text: ' ' });
        rest = rest.slice(om[0].length);
      }
      clozeWords(rest, tokens);
    }
  });
  return tokens;
}

function clozeWords(text, tokens) {
  const re = /\(\d+\)|[A-Za-z][A-Za-z'’-]*|[ \t]+|[^\w\s]+/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const t = m[0];
    if (/^\(\d+\)$/.test(t))      tokens.push({ type: 'fixed', text: t });
    else if (/^[ \t]+$/.test(t))  tokens.push({ type: 'space', text: ' ' });
    else if (/^[A-Za-z]/.test(t)) tokens.push({ type: 'word',  text: t, eligible: t.length > 2 });
    else                           tokens.push({ type: 'punct', text: t });
  }
}

function clozeSelectBlanks(tokens, pct) {
  const eligible = tokens.map((t, i) => t.eligible ? i : -1).filter(i => i >= 0);
  const count = Math.max(1, Math.round(eligible.length * pct / 100));
  return new Set(eligible.slice().sort(() => Math.random() - 0.5).slice(0, count));
}

function buildClozeDisplay(tokens, blankedSet, openedSet, onReveal) {
  const wrap = make('div', 'cloze-display');
  let line = make('div', 'cloze-line');
  wrap.appendChild(line);
  tokens.forEach((tok, idx) => {
    if (tok.type === 'br' || tok.type === 'sentbr') {
      line = make('div', 'cloze-line' + (tok.type === 'sentbr' ? ' cloze-sentline' : ''));
      wrap.appendChild(line); return;
    }
    if (tok.type === 'word' && blankedSet.has(idx)) {
      const w = Math.max(40, tok.text.length * 9 + 8);
      const isOpen = openedSet.has(idx);
      const pill = make('span', 'cloze-pill' + (isOpen ? ' opened' : ''));
      pill.style.width = w + 'px';
      const inner = make('span', 'cloze-pill-inner');
      const front = make('span', 'cloze-pill-front', '···');
      const back  = make('span', 'cloze-pill-back',  isOpen ? tok.text : '');
      inner.appendChild(front); inner.appendChild(back); pill.appendChild(inner);
      if (!isOpen) pill.addEventListener('click', () => {
        openedSet.add(idx); back.textContent = tok.text;
        pill.classList.add('opened'); pill.style.cursor = 'default';
        onReveal();
      }, { once: true });
      line.appendChild(pill);
    } else {
      const sp = make('span', tok.type === 'fixed' ? 'cloze-fixed' : '', tok.text);
      if (tok.type === 'space') sp.style.whiteSpace = 'pre';
      line.appendChild(sp);
    }
  });
  return wrap;
}

function buildClozeScorePanel(sk) {
  const r = 26, cx = 34, cy = 34, C = +(2 * Math.PI * r).toFixed(1);
  const panel = make('div', 'cloze-score-panel');
  panel.id = 'clozeScore_' + sk;
  panel.innerHTML =
    `<svg width="68" height="68" viewBox="0 0 68 68">` +
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#e2e8f0" stroke-width="6"/>` +
    `<circle class="score-ring" cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#6366f1"` +
    ` stroke-width="6" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C}"` +
    ` transform="rotate(-90 ${cx} ${cy})" style="transition:stroke-dashoffset .4s ease,stroke .4s ease"/>` +
    `<text class="score-pct" x="${cx}" y="${cy+5}" text-anchor="middle" fill="#1e3a5f"` +
    ` font-size="13" font-weight="700">0%</text></svg>` +
    `<div class="score-info"><span class="score-count">0/0</span><span class="score-hint">ô đã mở</span></div>`;
  return panel;
}

function clozeUpdateScore(sk, opened, total) {
  const panel = document.getElementById('clozeScore_' + sk);
  if (!panel) return;
  const pct = total > 0 ? Math.round(opened / total * 100) : 0;
  const r = 26, C = +(2 * Math.PI * r).toFixed(1);
  const ring = panel.querySelector('.score-ring');
  if (ring) { ring.style.strokeDashoffset = (C * (1 - pct / 100)).toFixed(1); ring.style.stroke = pct === 100 ? '#22c55e' : '#6366f1'; }
  const p = panel.querySelector('.score-pct'); if (p) p.textContent = pct + '%';
  const c = panel.querySelector('.score-count'); if (c) c.textContent = opened + '/' + total;
  const h = panel.querySelector('.score-hint'); if (h) h.textContent = pct === 100 ? '🎉 Xong!' : 'ô đã mở';
}

function buildClozeGame(scriptText, partNum, sk, solKey, rightEl, leftEl) {
  const cs = clozeState[sk] || (clozeState[sk] = { active: false, percent: 30, tokens: null, blankedSet: null, openedSet: null });
  if (!cs.tokens) {
    cs.tokens    = clozeTokenize(scriptText, partNum);
    cs.blankedSet = clozeSelectBlanks(cs.tokens, cs.percent);
    cs.openedSet  = new Set();
  }

  const banner = make('div', 'cloze-banner' + (cs.active ? ' active' : ''));
  banner.innerHTML = cs.active ? `<span class="cloze-x">✕</span> Thoát game` : `🎮 Chơi Nghe Khuyết`;

  const scorePanel = buildClozeScorePanel(sk);
  scorePanel.style.display = cs.active ? '' : 'none';
  rightEl.insertBefore(scorePanel, rightEl.firstChild);

  const gameArea = make('div', 'cloze-area');
  gameArea.style.display = cs.active ? '' : 'none';

  const controls = make('div', 'cloze-controls');
  const pctBtns = [30, 50, 70].map(pct => {
    const btn = make('button', 'cloze-pct-btn' + (cs.percent === pct ? ' active' : ''), pct + '%');
    btn.addEventListener('click', () => {
      cs.percent = pct; cs.blankedSet = clozeSelectBlanks(cs.tokens, pct); cs.openedSet = new Set();
      pctBtns.forEach(b => b.classList.toggle('active', b === btn));
      refresh();
    });
    return btn;
  });
  pctBtns.forEach(b => controls.appendChild(b));
  const redoBtn = make('button', 'cloze-redo-btn', '🔀 Làm lại');
  redoBtn.addEventListener('click', () => { cs.blankedSet = clozeSelectBlanks(cs.tokens, cs.percent); cs.openedSet = new Set(); refresh(); });
  controls.appendChild(redoBtn);
  gameArea.appendChild(controls);

  let displayEl = null;
  const refresh = () => {
    if (displayEl) displayEl.remove();
    displayEl = buildClozeDisplay(cs.tokens, cs.blankedSet, cs.openedSet, () => clozeUpdateScore(sk, cs.openedSet.size, cs.blankedSet.size));
    gameArea.appendChild(displayEl);
    clozeUpdateScore(sk, cs.openedSet.size, cs.blankedSet.size);
  };
  if (cs.active) refresh();

  banner.addEventListener('click', () => {
    cs.active = !cs.active;
    banner.classList.toggle('active', cs.active);
    banner.innerHTML = cs.active ? `<span class="cloze-x">✕</span> Thoát game` : `🎮 Chơi Nghe Khuyết`;
    gameArea.style.display = cs.active ? '' : 'none';
    scorePanel.style.display = cs.active ? '' : 'none';
    // Ẩn/hiện biGrid script và ảnh
    const scriptEl = leftEl.querySelector('[data-scriptsk]');
    if (scriptEl) scriptEl.style.display = (cs.active ? 'none' : (state.showSolution[solKey] ? '' : 'none'));
    const imgEl = leftEl.querySelector('.exam-img');
    if (imgEl) imgEl.style.display = cs.active ? 'none' : '';
    if (cs.active && !displayEl) refresh();
  });

  return { banner, gameArea };
}

function renderScreen(idx) {
  const autoplayQ = state.lastRevealedQ; state.lastRevealedQ = null;
  const prevAudio = document.querySelector('audio');
  if (prevAudio) prevAudio.pause();
  const prevScrollTop = document.querySelector('.screen-right')?.scrollTop || 0;
  const examBody = el('examBody'); if (!examBody) return;
  lytCache_save();
  examBody.innerHTML = '';
  const sc=state.screens[idx]; if (!sc) return;
  const isPractice = state.mode==='practice';
  const isTest     = state.mode==='test';
  const sk         = screenKey(sc);
  const showSol    = isPractice || state.finished;

  const screenEl = make('div','exam-screen active');
  const left     = make('div','screen-left');
  left.style.width = (parseInt(localStorage.getItem('tts_left_ratio') || '50')) + '%';
  const right    = make('div','screen-right');

  if (sc.type==='p1') {
    const q=sc.q;
    left.appendChild(buildAudioBlock(q.mp3, sk));
    if (q.img) { const img=make('img','exam-img'); img.src=q.img; img.alt=`Câu ${q.q}`; if (clozeState[sk]?.active) img.style.display='none'; left.appendChild(img); }
    right.appendChild(buildQHeader(q.q,1,sk,showSol));
    right.appendChild(buildOptionsAll(q.q,['A','B','C','D'],sk,null,null,null));
    if (showSol && q.script) {
      const { banner, gameArea } = buildClozeGame(q.script,1,sk,'q'+q.q,right,left);
      left.appendChild(banner); left.appendChild(gameArea);
    }
    if (showSol && (q.script || q.trans)) {
      const sg = buildScriptBiGrid(q.script, q.trans);
      sg.dataset.scriptsk = 'q'+q.q;
      if (!state.showSolution['q'+q.q] || clozeState[sk]?.active) sg.style.display = 'none';
      left.appendChild(sg);
    }
  }
  if (sc.type==='p2') {
    const q=sc.q;
    left.appendChild(buildAudioBlock(q.mp3, sk));
    right.appendChild(buildQHeader(q.q,2,sk,showSol));
    right.appendChild(buildOptionsAll(q.q,['A','B','C'],sk,null,null,null));
    if (showSol && q.script) {
      const { banner, gameArea } = buildClozeGame(q.script,2,sk,'q'+q.q,right,left);
      left.appendChild(banner); left.appendChild(gameArea);
    }
    if (showSol && (q.script || q.trans)) {
      const sg = buildScriptBiGrid(q.script, q.trans);
      sg.dataset.scriptsk = 'q'+q.q;
      if (!state.showSolution['q'+q.q] || clozeState[sk]?.active) sg.style.display = 'none';
      left.appendChild(sg);
    }
  }
  if (sc.type==='p3') {
    const g=sc.group;
    left.appendChild(buildAudioBlock(g.mp3, sk));
    if (g.img) { const img=make('img','exam-img'); img.src=g.img; img.alt='Ảnh Part 3'; if (clozeState[sk]?.active) img.style.display='none'; left.appendChild(img); }
    const p3SolKey='q'+g.questions[0].q;
    const p3AllQNums=g.questions.map(q=>q.q);
    g.questions.forEach((q)=>right.appendChild(buildGroupQBlock(q,3,showSol,sk,showSol,p3AllQNums)));
    if (showSol && g.script) {
      const { banner, gameArea } = buildClozeGame(g.script,3,sk,p3SolKey,right,left);
      left.appendChild(banner); left.appendChild(gameArea);
    }
    if (showSol) {
      const sg = buildScriptBiGrid(g.script, g.trans);
      sg.dataset.scriptsk = sk;
      if (!state.showSolution[p3SolKey] || clozeState[sk]?.active) sg.style.display = 'none';
      left.appendChild(sg);
    }
  }
  if (sc.type==='p4') {
    const g=sc.group;
    left.appendChild(buildAudioBlock(g.mp3, sk));
    if (g.img) { const img=make('img','exam-img'); img.src=g.img; img.alt='Ảnh Part 4'; if (clozeState[sk]?.active) img.style.display='none'; left.appendChild(img); }
    const p4SolKey='q'+g.questions[0].q;
    const p4AllQNums=g.questions.map(q=>q.q);
    g.questions.forEach((q)=>right.appendChild(buildGroupQBlock(q,4,showSol,sk,showSol,p4AllQNums)));
    if (showSol && g.script) {
      const { banner, gameArea } = buildClozeGame(g.script,4,sk,p4SolKey,right,left);
      left.appendChild(banner); left.appendChild(gameArea);
    }
    if (showSol) {
      const sg = buildScriptBiGrid(g.script, g.trans);
      sg.dataset.scriptsk = sk;
      if (!state.showSolution[p4SolKey] || clozeState[sk]?.active) sg.style.display = 'none';
      left.appendChild(sg);
    }
  }
  if (sc.type==='p5') {
    const q=sc.q;
    const solShown   = showSol && !!state.showSolution['q'+q.q];
    const transShown = showSol && !!state.showTrans['q'+q.q];
    if (solShown && q.videoUrl) {
      left.appendChild(buildVideoLoader(q.videoUrl, autoplayQ===q.q));
    } else { left.classList.add('empty'); }
    right.appendChild(buildQHeader(q.q,5,sk,showSol));
    if (q.enQ) right.appendChild(make('div','q-text', q.enQ.replace(/ (---+)/g,'&nbsp;<span style="white-space:nowrap">$1</span>')));
    if (showSol && q.fullSent)  { const fsEl=make('div','full-sent-en', escHtml(q.fullSent)); if(!transShown) fsEl.style.display='none'; right.appendChild(fsEl); }
    if (showSol && q.transSent) { const tsEl=make('div','full-sent-vi', escHtml(q.transSent)); if(!transShown) tsEl.style.display='none'; right.appendChild(tsEl); }
    const optList5 = buildOptionsAll(q.q,['A','B','C','D'],sk,null,null,showSol?q.noteOpts:null);
    if (!transShown) optList5.querySelectorAll('.opt-note').forEach(el => el.style.display='none');
    right.appendChild(optList5);
  }
  if (sc.type==='p6') {
    const g=sc.group;
    buildLeftTabs(left,g,sk,false,showSol);
    g.questions.forEach(q=>{
      const qKey='q'+q.q;
      const solShown6  = showSol && !!state.showSolution[qKey];
      const transShown6 = showSol && !!state.showTrans[qKey];
      const qw=make('div','q-block'); qw.style.cssText='padding-bottom:8px';
      if (q.q === state.scrollToQ) qw.dataset.autoq = '1';
      qw.appendChild(buildQHeader(q.q,6,sk,showSol));
      const rawViTrans6 = [q.viQ||'',...(q.viOpts||[])];
      const viTrans6 = rawViTrans6.some(Boolean) ? rawViTrans6 : null;
      const notes6   = q.noteOpts?.some(Boolean) ? q.noteOpts : null;
      const optList6 = buildOptionsAll(q.q,['A','B','C','D'],sk,[q.enQ,...(q.enOpts||[])],viTrans6,notes6);
      if (!transShown6) optList6.querySelectorAll('.opt-trans,.opt-note').forEach(el => el.style.display='none');
      qw.appendChild(optList6);
      right.appendChild(qw);
    });
  }
  if (sc.type==='p7') {
    const g=sc.group;
    buildLeftTabs(left,g,sk,true,showSol);
    g.questions.forEach(q=>{
      const qKey='q'+q.q;
      const solShown7  = showSol && !!state.showSolution[qKey];
      const transShown7 = showSol && !!state.showTrans[qKey];
      const qw=make('div','q-block'); qw.style.cssText='padding-bottom:8px';
      if (q.q === state.scrollToQ) qw.dataset.autoq = '1';
      qw.appendChild(buildQHeader(q.q,7,sk,showSol));
      if(q.enQ) qw.appendChild(make('div','q-text',q.enQ));
      if(q.viQ) {
        const qtr7 = make('div','q-trans',escHtml(q.viQ));
        qtr7.dataset.vifor = String(q.q);
        if(!transShown7) qtr7.style.display = 'none';
        qw.appendChild(qtr7);
      }
      // noteOpts[0] = ghi chú câu hỏi; noteOpts[1..4] = ghi chú đáp án A/B/C/D
      const notes7raw = q.noteOpts?.some(Boolean) ? q.noteOpts : null;
      const noteQ7    = notes7raw?.[0] || null;
      const noteOpts7 = notes7raw?.length > 1 ? notes7raw.slice(1) : null;
      if (noteQ7) {
        const qnote7 = make('div','q-note', escHtml(noteQ7));
        qnote7.dataset.vifor = String(q.q);
        if (!transShown7) qnote7.style.display = 'none';
        qw.appendChild(qnote7);
      }
      const viOpts7 = q.viOpts?.some(Boolean) ? q.viOpts : null;
      const optList7 = buildOptionsAll(q.q,['A','B','C','D'],sk,null,viOpts7, noteOpts7?.some(Boolean) ? noteOpts7 : null);
      if (!transShown7) optList7.querySelectorAll('.opt-trans,.opt-note').forEach(el => el.style.display='none');
      qw.appendChild(optList7);
      right.appendChild(qw);
    });
  }

  // Cập nhật trạng thái nút mũi tên trên topbar
  const _tbPrev = el('btnNavPrev');
  const _tbNext = el('btnNavNext');
  if (_tbPrev) _tbPrev.disabled = idx===0 || (isTest && [1,2,3,4].includes(sc.part));
  if (_tbNext) _tbNext.disabled = idx>=state.screens.length-1;

  screenEl.appendChild(left);
  if (!left.classList.contains('empty')) {
    const resizer = make('div','screen-resizer');
    screenEl.appendChild(resizer);
    initResizer(screenEl, left, resizer);
  }
  screenEl.appendChild(right);
  el('examBody').appendChild(screenEl);
  state.scrollToQ = null;
  const newRight = document.querySelector('.screen-right');
  [document.querySelector('.screen-right'), document.querySelector('.screen-left')].forEach(panel => {
    if (!panel) return;
    let _t;
    panel.addEventListener('scroll', () => {
      panel.classList.add('is-scrolling');
      clearTimeout(_t);
      _t = setTimeout(() => panel.classList.remove('is-scrolling'), 900);
    }, { passive: true });
  });
  const scrollTarget = document.querySelector('.screen-right .q-block[data-autoq]');
  if (scrollTarget) {
    requestAnimationFrame(() => scrollTarget.scrollIntoView({behavior:'smooth', block:'start'}));
  } else if (newRight) {
    newRight.scrollTop = prevScrollTop;
  } else {
    window.scrollTo(0,0);
  }
  const titleEl = document.querySelector('.topbar-title');
  if (titleEl) titleEl.textContent = `${ED.title} — Part ${sc.part}`;
  const audio = document.querySelector('audio');
  if (audio && !state.finished) {
    if (localStorage.getItem('tts_autoplay') !== '0') audio.play().catch(()=>{});
    if ([1,2,3,4].includes(sc.part) && idx < state.screens.length - 1) {
      audio.addEventListener('ended', () => {
        if (state.currentIdx === idx) goNext();
      }, { once: true });
    }
  }
  preloadNextAudio(idx);
}

function preloadNextAudio(currentIdx) {
  [1, 2].forEach(offset => {
    const next = state.screens[currentIdx + offset];
    if (!next || ![1,2,3,4].includes(next.part)) return;
    const url = next.q?.mp3 || next.group?.mp3;
    if (!url) return;
    const a = new Audio();
    a.preload = 'auto';
    a.src = url;
  });
}

function splitParas(text) {
  const paras = [];
  let cur = [];
  for (const line of (text||'').split('\n')) {
    if (line.trim() === '') {
      if (cur.length) { paras.push(cur.join('\n')); cur = []; }
    } else {
      cur.push(line);
    }
  }
  if (cur.length) paras.push(cur.join('\n'));
  return paras;
}


function extractYtVid(url) {
  if (!url) return '';
  const m1 = url.match(/youtu\.be\/([^?&]+)/);
  const m2 = url.match(/[?&]v=([^&]+)/);
  const m3 = url.match(/\/embed\/([^?&]+)/);
  return (m1?.[1] || m2?.[1] || m3?.[1] || '').split('?')[0];
}
function extractYtTs(url) {
  const m = url?.match(/[?&]t=(\d+)/);
  return m ? parseInt(m[1]) : 0;
}
function ytPostMsg(iframe, func, args=[]) {
  try { iframe.contentWindow.postMessage(JSON.stringify({event:'command',func,args}), '*'); } catch(e) {}
}

function buildVideoLoader(url, activateNow) {
  const vid = extractYtVid(url);

  // Cache hit: reuse existing DOM node — moving node in same document does NOT reload iframes
  const cached = vid ? _lytByVid[vid] : null;
  if (cached) {
    const prevUrl = cached._lytUrl;
    cached._lytUrl = url;
    const iframe = cached.querySelector('iframe');
    if (cached.classList.contains('lyt-loaded')) {
      if (activateNow && iframe) {
        if (prevUrl === url) {
          // Same URL (ví dụ: Part 5 toggle sol cùng câu) → tiếp tục từ vị trí đã pause
          queueMicrotask(() => ytPostMsg(iframe, 'playVideo'));
        } else {
          // URL khác (cross-group hoặc cross-question) → reload iframe đúng timestamp
          iframe.src = youtubeEmbed(url, true);
          cached.classList.remove('lyt-loaded');
          iframe.addEventListener('load', () => cached.classList.add('lyt-loaded'), { once: true });
        }
      }
    } else if (cached.classList.contains('lyt-activated')) {
      if (activateNow && iframe) iframe.src = youtubeEmbed(url, true);
    } else if (activateNow) {
      cached.classList.add('lyt-activated');
      const newIframe = document.createElement('iframe');
      newIframe.src             = youtubeEmbed(url, true);
      newIframe.allow           = 'autoplay; fullscreen; picture-in-picture';
      newIframe.allowFullscreen = true;
      newIframe.addEventListener('load', () => cached.classList.add('lyt-loaded'));
      cached.appendChild(newIframe);
    }
    return cached;
  }

  // No cache: create fresh element
  const lytEl = make('div', 'lite-yt');
  lytEl.dataset.vid = vid;
  lytEl._lytUrl = url; // mutable — updated by cache path if same vid requested later
  if (vid) _lytByVid[vid] = lytEl;

  if (vid) {
    const img = document.createElement('img');
    img.src     = `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`;
    img.alt     = '';
    img.loading = 'eager';
    lytEl.appendChild(img);
  }

  const playBtn = make('button', 'lyt-playbtn');
  playBtn.setAttribute('aria-label', 'Phát video');
  lytEl.appendChild(playBtn);

  const loadingEl = make('div', 'lyt-loading');
  loadingEl.innerHTML = '<div class="lyt-spin"></div><span>Đang tải video...</span>';
  lytEl.appendChild(loadingEl);

  function activate() {
    if (lytEl.classList.contains('lyt-activated')) return;
    lytEl.classList.add('lyt-activated');
    const src = youtubeEmbed(lytEl._lytUrl, true); // reads current url, not stale closure
    const iframe = document.createElement('iframe');
    iframe.src             = src;
    iframe.allow           = 'autoplay; fullscreen; picture-in-picture';
    iframe.allowFullscreen = true;
    iframe.addEventListener('load', () => lytEl.classList.add('lyt-loaded'));
    lytEl.appendChild(iframe);
  }

  lytEl.addEventListener('click', activate);
  if (activateNow) activate();
  return lytEl;
}

function buildLeftTabs(left, g, sk, isP7, showSol) {
  const hasBi     = !!(g.fullPassEN || g.fullPassVI);
  const rawTab    = state.leftTab[sk] || 'passage';
  const canGrid   = showSol && hasBi;
  const activeTab = (['passage','grid','video'].includes(rawTab) && (rawTab !== 'grid' || canGrid)) ? rawTab : 'passage';

  const tabBar = make('div','left-tab-bar');
  const tabPassageBtn = make('button','left-tab-btn'+(activeTab==='passage'?' active':''),'Đề bài');
  const tabGridBtn    = canGrid ? make('button','left-tab-btn'+(activeTab==='grid'?' active':''),'Dịch bài') : null;
  const tabVideoBtn   = make('button','left-tab-btn'+(activeTab==='video'?' active':''),'Video giải');
  tabBar.appendChild(tabPassageBtn);
  if (tabGridBtn) tabBar.appendChild(tabGridBtn);
  tabBar.appendChild(tabVideoBtn);

  left.appendChild(tabBar);

  // Pane: đề bài
  const passagePane = make('div','left-tab-pane');
  passagePane.style.display = activeTab==='passage' ? '' : 'none';
  if (g.title) passagePane.appendChild(make('p','passage-title',g.title));
  if (isP7 && g.imgs && g.imgs.length>0) {
    const cnt=g.imgs.filter(Boolean).length;
    const grid=make('div',`exam-img-grid${cnt===2?' two':cnt>=3?' three':''}`);
    g.imgs.forEach((src,i)=>{ if(!src) return; const img=make('img','exam-img'); img.src=src; img.alt=`Ảnh ${i+1}`; grid.appendChild(img); });
    passagePane.appendChild(grid);
  } else if (!isP7 && g.img) {
    const img=make('img','exam-img'); img.src=g.img; img.alt='Ảnh đề'; img.style.cssText='width:100%;max-height:none';
    passagePane.appendChild(img);
  }
  left.appendChild(passagePane);

  // Pane: cột đôi (grid)
  let gridPane = null;
  if (hasBi) {
    const enLines = (g.fullPassEN||'').split('\n');
    const viLines = (g.fullPassVI||'').split('\n');
    const maxLen  = Math.max(enLines.length, viLines.length);

    gridPane = make('div','left-tab-pane biGrid-pane');
    gridPane.style.display = activeTab==='grid' ? '' : 'none';
    let rowIdx = 0;
    for (let i = 0; i < maxLen; i++) {
      const en = (enLines[i] || '').trim();
      const vi = (viLines[i] || '').trim();
      if (!en && !vi) {
        const spacer = make('div','biGrid-spacer');
        spacer.style.gridColumn = '1 / -1';
        gridPane.appendChild(spacer);
      } else {
        const stripe = rowIdx % 2 === 1 ? ' biGrid-stripe' : '';
        const enCell = make('div','biGrid-cell biGrid-en'+stripe);
        const viCell = make('div','biGrid-cell biGrid-vi'+stripe);
        enCell.textContent = en;
        viCell.textContent = vi;
        gridPane.appendChild(enCell);
        gridPane.appendChild(viCell);
        rowIdx++;
      }
    }
    left.appendChild(gridPane);
  }

  // Pane: video
  const videoPane = make('div','left-tab-pane');
  videoPane.style.display = activeTab==='video' ? '' : 'none';
  const activeQNum = state.videoQ[sk];
  const activeQ = g.questions.find(q=>q.q===activeQNum);
  if (activeQ && activeQ.videoUrl && activeTab === 'video') {
    videoPane.appendChild(buildVideoLoader(activeQ.videoUrl, true));
  } else {
    videoPane.appendChild(make('div','video-placeholder',`Bấm ${IC.lightbulb}Xem video giải để xem video giải thích.`));
  }
  left.appendChild(videoPane);

  const showPane = (tab) => {
    passagePane.style.display = tab==='passage' ? '' : 'none';
    if (gridPane) gridPane.style.display = tab==='grid' ? '' : 'none';
    videoPane.style.display   = tab==='video'   ? '' : 'none';
    tabPassageBtn.classList.toggle('active', tab==='passage');
    if (tabGridBtn) tabGridBtn.classList.toggle('active', tab==='grid');
    tabVideoBtn.classList.toggle('active', tab==='video');
  };

  tabPassageBtn.addEventListener('click',()=>{
    pauseVideoInPane(videoPane); state.leftTab[sk]='passage'; showPane('passage');
  });
  if (tabGridBtn) tabGridBtn.addEventListener('click',()=>{
    pauseVideoInPane(videoPane); state.leftTab[sk]='grid'; showPane('grid');
  });
  tabVideoBtn.addEventListener('click',()=>{
    state.leftTab[sk]='video'; showPane('video');
  });

  leftTabRefs[sk] = { passagePane, gridPane, videoPane, tabPassageBtn, tabGridBtn, tabVideoBtn, g };
}

function switchToVideoTab(sk, qNum) {
  const refs = leftTabRefs[sk]; if (!refs) return;
  const { passagePane, videoPane, tabPassageBtn, tabVideoBtn, g } = refs;
  const q = g.questions.find(qq => qq.q === qNum);
  if (state.videoQ[sk] !== qNum) {
    const newVid = extractYtVid(q?.videoUrl || '');
    const lytEl  = videoPane.querySelector('.lite-yt');
    const iframe = lytEl?.querySelector('iframe');
    const sameVideo = lytEl && lytEl.dataset.vid === newVid && newVid;

    if (sameVideo && iframe && lytEl.classList.contains('lyt-loaded')) {
      // Cùng video, đã load xong → seekTo ngay lập tức
      const ts = extractYtTs(q.videoUrl);
      ytPostMsg(iframe, 'seekTo', [ts, true]);
      ytPostMsg(iframe, 'playVideo');
    } else if (sameVideo && iframe) {
      // Cùng video, đang load → đổi src cho đúng timestamp
      iframe.src = youtubeEmbed(q.videoUrl, true);
    } else {
      // Video khác hoặc chưa có → tạo mới
      videoPane.innerHTML = '';
      if (q?.videoUrl) {
        videoPane.appendChild(buildVideoLoader(q.videoUrl, true));
      } else {
        videoPane.appendChild(make('div','video-placeholder',`Bấm ${IC.lightbulb}Xem video giải để xem video giải thích.`));
      }
    }
    state.videoQ[sk] = qNum;
  }
  passagePane.style.display = 'none';
  if (refs.gridPane)   refs.gridPane.style.display   = 'none';
  if (refs.tabGridBtn) refs.tabGridBtn.classList.remove('active');
  videoPane.style.display = '';
  tabPassageBtn.classList.remove('active'); tabVideoBtn.classList.add('active');
  state.leftTab[sk] = 'video'; state.videoQ[sk] = qNum;
}

function pauseVideoInPane(pane) {
  const iframe = pane?.querySelector('iframe');
  if (iframe) try { iframe.contentWindow.postMessage(JSON.stringify({event:'command',func:'pauseVideo',args:[]}), '*'); } catch(e) {}
}

function switchToPassageTab(sk) {
  const refs = leftTabRefs[sk]; if (!refs) return;
  const { passagePane, videoPane, tabPassageBtn, tabVideoBtn } = refs;
  pauseVideoInPane(videoPane);
  passagePane.style.display = '';
  if (refs.gridPane)   refs.gridPane.style.display   = 'none';
  videoPane.style.display = 'none';
  tabPassageBtn.classList.add('active');
  if (refs.tabGridBtn) refs.tabGridBtn.classList.remove('active');
  tabVideoBtn.classList.remove('active');
  state.leftTab[sk] = 'passage';
}

function buildMediaLeft(left, g, isPractice, sk, isP7) {
  const showVideo = isPractice && state.showSolution[sk] && !state.showImg[sk];
  if (showVideo) {
    const firstQ=g.questions[0];
    if (firstQ && firstQ.videoUrl) { left.appendChild(buildVideoLoader(firstQ.videoUrl, true)); }
    const btn=make('button','btn-toggle-img',IC.image+'Hiện ảnh đề thi');
    btn.addEventListener('click',()=>{ state.showImg[sk]=true; renderScreen(state.currentIdx); }); left.appendChild(btn);
  } else {
    if (isP7 && g.imgs && g.imgs.length>0) {
      const cnt=g.imgs.filter(Boolean).length;
      const grid=make('div',`exam-img-grid${cnt===2?' two':cnt>=3?' three':''}`);
      g.imgs.forEach((src,i)=>{ if(!src) return; const img=make('img','exam-img'); img.src=src; img.alt=`Ảnh ${i+1}`; grid.appendChild(img); });
      left.appendChild(grid);
    } else if (!isP7 && g.img) {
      const img=make('img','exam-img'); img.src=g.img; img.alt='Ảnh đề'; img.style.width='100%'; img.style.maxHeight='none'; left.appendChild(img);
    }
    if (isPractice && state.showSolution[sk] && state.showImg[sk]) {
      const btn=make('button','btn-toggle-img',IC.play+'Xem video giải');
      btn.style.marginTop='12px';
      btn.addEventListener('click',()=>{ state.showImg[sk]=false; renderScreen(state.currentIdx); }); left.appendChild(btn);
    }
  }
}

function buildGroupQBlock(q, part, isPractice, sk, showSolBtn, groupQNums=null) {
  const qKey = 'q'+q.q;
  const solShown = isPractice && !!state.showSolution[qKey];
  const wrap = make('div','q-block'); wrap.style.cssText='padding-bottom:8px';
  if (q.q === state.scrollToQ) wrap.dataset.autoq = '1';
  wrap.appendChild(buildQHeader(q.q,part,sk,showSolBtn,showSolBtn?groupQNums:null));
  const qNumEl = wrap.querySelector('.q-number');
  if (qNumEl) {
    qNumEl.style.cursor = 'pointer';
    qNumEl.title = 'Cuộn lên đầu câu này';
    qNumEl.addEventListener('click', () => {
      const rightPanel = document.querySelector('.screen-right');
      if (!rightPanel) return;
      const padTop = parseInt(getComputedStyle(rightPanel).paddingTop) || 0;
      const targetTop = wrap.getBoundingClientRect().top - rightPanel.getBoundingClientRect().top + rightPanel.scrollTop - padTop;
      rightPanel.scrollTo({ top: targetTop, behavior: 'smooth' });
    });
  }
  if (q.enQ) wrap.appendChild(make('div','q-text',q.enQ));
  if (isPractice && q.viQ) {
    const qtr = make('div','q-trans', escHtml(q.viQ));
    qtr.dataset.vifor = String(q.q);
    if (!solShown) qtr.style.display = 'none';
    wrap.appendChild(qtr);
  }
  const viOpts = (isPractice && q.viOpts && q.viOpts.some(Boolean)) ? q.viOpts : null;
  const optList = buildOptionsAll(q.q,['A','B','C','D'],sk,null,viOpts,null);
  if (isPractice && !solShown && viOpts) {
    optList.querySelectorAll('.opt-trans').forEach(el => el.style.display='none');
  }
  wrap.appendChild(optList);
  return wrap;
}

function buildViBlock(q, letters) {
  const viOpts = q.viOpts || [];
  if (!q.viQ && !viOpts.some(Boolean)) return null;
  const block = make('div','vi-block');
  if (q.viQ) block.appendChild(make('div','vi-block-q', q.viQ));
  letters.forEach((lt,i) => {
    if (viOpts[i]) block.appendChild(make('div','vi-block-opt', `${lt}. ${viOpts[i]}`));
  });
  return block;
}

function buildAudioBlock(mp3Url, sk) {
  const wrap = make('div', 'audio-wrap');

  const audio = document.createElement('audio');
  audio.id = 'examAudio_' + sk;
  audio.src = mp3Url || '';
  audio.preload = 'metadata';
  wrap.appendChild(audio);

  const SVG_PLAY  = `<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><polygon points="5 3 19 12 5 21 5 3"/></svg>`;
  const SVG_PAUSE = `<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>`;
  const SVG_RW    = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.5"/></svg>`;

  const playBtn = make('button', 'ap-play');
  playBtn.innerHTML = SVG_PLAY;
  playBtn.title = 'Play / Pause (Space)';
  wrap.appendChild(playBtn);

  const rwBtn = make('button', 'ap-rewind');
  rwBtn.innerHTML = SVG_RW + '<span>3s</span>';
  rwBtn.title = 'Tua lại 3 giây (←)';
  wrap.appendChild(rwBtn);

  const barWrap = make('div', 'ap-bar-wrap');
  const bar     = make('div', 'ap-bar');
  const fill    = make('div', 'ap-bar-fill');
  const thumb   = make('div', 'ap-bar-thumb');
  bar.appendChild(fill);
  bar.appendChild(thumb);
  barWrap.appendChild(bar);
  wrap.appendChild(barWrap);

  const timeEl = make('div', 'ap-time', '0:00 / 0:00');
  wrap.appendChild(timeEl);

  const speedWrap = make('div', 'ap-speed-wrap');
  const speedBtn  = make('button', 'ap-speed-btn', '1×');
  const speedDrop = make('div', 'ap-speed-dropdown');
  SPEED_STEPS.forEach(r => {
    const opt = make('button', 'ap-speed-opt', r === 1 ? '1×' : r + '×');
    opt.dataset.rate = r;
    if (r === 1) opt.classList.add('active');
    speedDrop.appendChild(opt);
  });
  speedWrap.appendChild(speedBtn);
  speedWrap.appendChild(speedDrop);
  wrap.appendChild(speedWrap);

  const fmt = s => { const m=Math.floor(s/60); return `${m}:${Math.floor(s%60).toString().padStart(2,'0')}`; };

  const updateBar = () => {
    if (!audio.duration) return;
    const pct = audio.currentTime / audio.duration * 100;
    fill.style.width  = pct + '%';
    thumb.style.left  = pct + '%';
    timeEl.textContent = `${fmt(audio.currentTime)} / ${fmt(audio.duration)}`;
  };

  audio.addEventListener('loadedmetadata', () => { timeEl.textContent = `0:00 / ${fmt(audio.duration)}`; });
  audio.addEventListener('timeupdate', updateBar);
  audio.addEventListener('play',  () => { playBtn.innerHTML = SVG_PAUSE; playBtn.classList.add('playing'); });
  audio.addEventListener('pause', () => { playBtn.innerHTML = SVG_PLAY;  playBtn.classList.remove('playing'); });
  audio.addEventListener('ended', () => { playBtn.innerHTML = SVG_PLAY;  playBtn.classList.remove('playing'); });

  playBtn.addEventListener('click', () => { audio.paused ? audio.play().catch(()=>{}) : audio.pause(); });
  rwBtn.addEventListener('click',   () => { audio.currentTime = Math.max(0, audio.currentTime - 3); });

  let seeking = false;
  const seek = clientX => {
    const r = bar.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
    if (audio.duration) audio.currentTime = pct * audio.duration;
  };
  bar.addEventListener('mousedown', e => { seeking = true; seek(e.clientX); });
  document.addEventListener('mousemove', e => { if (seeking) seek(e.clientX); });
  document.addEventListener('mouseup', () => { seeking = false; });
  bar.addEventListener('touchstart', e => seek(e.touches[0].clientX), { passive: true });
  bar.addEventListener('touchmove',  e => seek(e.touches[0].clientX), { passive: true });

  speedBtn.addEventListener('click', e => { e.stopPropagation(); speedDrop.classList.toggle('open'); });
  speedDrop.addEventListener('click', e => {
    const opt = e.target.closest('[data-rate]');
    if (!opt) return;
    const rate = parseFloat(opt.dataset.rate);
    audio.playbackRate = rate;
    speedBtn.textContent = rate === 1 ? '1×' : rate + '×';
    speedDrop.querySelectorAll('.ap-speed-opt').forEach(o => o.classList.toggle('active', o === opt));
    speedDrop.classList.remove('open');
  });
  document.addEventListener('click', () => speedDrop.classList.remove('open'));

  return wrap;
}

function formatScript(text) {
  const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  return text.split('\n').map(line => {
    const m = line.match(/^\(([A-D])\)\s*(.*)/);
    if (m) return `<div class="script-opt"><span class="script-opt-badge">${m[1]}</span><span>${esc(m[2])}</span></div>`;
    return line.trim() ? `<div class="script-line">${esc(line)}</div>` : '';
  }).join('');
}

function buildScriptBlock(script, trans) {
  const frag=document.createDocumentFragment();
  if (script) { const b=make('div','script-box'); b.innerHTML=`<div class="script-label">Script</div>${formatScript(script)}`; frag.appendChild(b); }
  if (trans)  { const b=make('div','script-box vi'); b.innerHTML=`<div class="script-label" style="color:rgba(245,197,24,0.6)">Dịch</div>${formatScript(trans)}`; frag.appendChild(b); }
  return frag;
}

function buildScriptBiGrid(enText, viText) {
  const enLines = (enText || '').split('\n');
  const viLines = (viText || '').split('\n');
  const maxLen  = Math.max(enLines.length, viLines.length);
  const grid = make('div', 'left-tab-pane biGrid-pane');
  let rowIdx = 0;
  for (let i = 0; i < maxLen; i++) {
    const en = (enLines[i] || '').trim();
    const vi = (viLines[i] || '').trim();
    if (!en && !vi) {
      const spacer = make('div', 'biGrid-spacer');
      spacer.style.gridColumn = '1 / -1';
      grid.appendChild(spacer);
    } else {
      const stripe = rowIdx % 2 === 1 ? ' biGrid-stripe' : '';
      const enCell = make('div', 'biGrid-cell biGrid-en' + stripe);
      const viCell = make('div', 'biGrid-cell biGrid-vi' + stripe);
      enCell.textContent = en;
      viCell.textContent = vi;
      grid.appendChild(enCell);
      grid.appendChild(viCell);
      rowIdx++;
    }
  }
  return grid;
}

function parseScriptOpts(script, trans) {
  const parse = (text) => {
    if (!text) return { question: '', opts: [] };
    const opts = [];
    let question = '';
    for (const line of text.split('\n')) {
      const m = line.match(/^\(?([A-D])\)?\s+(.*)/);
      if (m) opts[m[1].charCodeAt(0) - 65] = m[2].trim();
      else if (!opts.length && line.trim()) question += (question ? ' ' : '') + line.trim();
    }
    return { question, opts };
  };
  const en = parse(script), vi = parse(trans);
  return { enQ: en.question, viQ: vi.question, enOpts: en.opts, viOpts: vi.opts };
}

const IC_SHOW = `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
const IC_HIDE = `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;

const IC_TRANS_SHOW = `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`;
const IC_TRANS_HIDE = `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><line x1="4" y1="4" x2="20" y2="20" stroke-width="2.5"/></svg>`;

function buildQHeader(qNum, part, sk, showSolBtn, groupQNums=null) {
  const wrap=make('div','q-header');
  wrap.appendChild(make('div','q-number',String(qNum)));
  if (showSolBtn) {
    const keys = groupQNums ? groupQNums.map(n=>'q'+n) : ['q'+qNum];
    const isShown = keys.every(k=>state.showSolution[k]);
    const solLabel = [1,2,3,4].includes(part) ? ['Đáp án','Ẩn đáp án'] : ['Video giải','Ẩn video'];
    const solHtml  = (shown) => shown ? `${IC_HIDE}<span>${solLabel[1]}</span>` : `${IC_SHOW}<span>${solLabel[0]}</span>`;
    const solBtn=make('button','btn-solution',solHtml(isShown));
    solBtn.dataset.solq = qNum;
    solBtn.addEventListener('click',()=>{
      const next=!keys.every(k=>state.showSolution[k]);
      keys.forEach(k=>state.showSolution[k]=next);
      state.lastRevealedQ = next ? qNum : null;
      if ([6,7].includes(part)) {
        // Nếu mở câu mới, đóng câu đang mở trong cùng nhóm (radio button)
        if (next) {
          const groupQs = state.screens[state.currentIdx]?.group?.questions?.map(q=>q.q) || [];
          groupQs.forEach(otherQn => {
            if (otherQn === qNum || !state.showSolution['q'+otherQn]) return;
            state.showSolution['q'+otherQn] = false;
            const otherBtn = document.querySelector(`[data-solq="${otherQn}"]`);
            if (otherBtn) otherBtn.innerHTML = solHtml(false);
          });
        }
        // Toggle trực tiếp trên DOM — iframe không bị rebuild, video không reload
        solBtn.innerHTML = solHtml(next);
        if (next) {
          switchToVideoTab(sk, qNum);
          const firstQNum  = keys[0].slice(1);
          const qBlock     = document.querySelector(`[data-solq="${firstQNum}"]`)?.closest('.q-block');
          const rightPanel = document.querySelector('.screen-right');
          if (qBlock && rightPanel) {
            const padTop    = parseInt(getComputedStyle(rightPanel).paddingTop) || 0;
            const targetTop = qBlock.getBoundingClientRect().top - rightPanel.getBoundingClientRect().top + rightPanel.scrollTop - padTop;
            rightPanel.scrollTo({ top: targetTop, behavior: 'smooth' });
          }
        } else    switchToPassageTab(sk);
      } else if ([1,2,3,4].includes(part)) {
        if ([3,4].includes(part)) {
          const sbWrap = document.querySelector(`[data-scriptsk="${sk}"]`);
          if (sbWrap && !clozeState[sk]?.active) sbWrap.style.display = next ? '' : 'none';
        }
        const _rp      = [3,4].includes(part) ? document.querySelector('.screen-right') : null;
        const _qBlock  = _rp ? document.querySelector(`[data-solq="${qNum}"]`)?.closest('.q-block') : null;
        const _beforeY = _qBlock ? _qBlock.getBoundingClientRect().top : 0;
        keys.forEach(k => {
          const qn = parseInt(k.slice(1));
          const btn = document.querySelector(`[data-solq="${qn}"]`);
          if (btn) btn.innerHTML = solHtml(next);
          if ([1,2].includes(part)) {
            const sg = document.querySelector(`[data-scriptsk="q${qn}"]`);
            if (sg && !clozeState[sk]?.active) sg.style.display = next ? '' : 'none';
          } else {
            const qtr = document.querySelector(`.q-trans[data-vifor="${qn}"]`);
            if (qtr) qtr.style.display = next ? '' : 'none';
            document.querySelectorAll(`.options-list[data-qlist="${qn}"] .opt-trans,.options-list[data-qlist="${qn}"] .opt-note`).forEach(el => el.style.display = next ? '' : 'none');
          }
          const optList = document.querySelector(`.options-list[data-qlist="${qn}"]`);
          if (optList) applyOptionColors(optList, state.answers[qn], getQuestionData(qn)?.q.answer, next);
        });
        if (_rp && _qBlock) {
          if (next) {
            requestAnimationFrame(() => {
              const padTop    = parseInt(getComputedStyle(_rp).paddingTop) || 0;
              const targetTop = _qBlock.getBoundingClientRect().top - _rp.getBoundingClientRect().top + _rp.scrollTop - padTop;
              _rp.scrollTo({ top: targetTop, behavior: 'smooth' });
            });
          } else {
            requestAnimationFrame(() => {
              const afterY = _qBlock.getBoundingClientRect().top;
              _rp.scrollTop += afterY - _beforeY;
            });
          }
        }
      } else {
        renderScreen(state.currentIdx);
      }
    });
    wrap.appendChild(solBtn);

    // Nút Đáp án — chỉ cho Part 5, 6, 7
    if ([5,6,7].includes(part)) {
      const isTransShown = !!state.showTrans['q'+qNum];
      const transHtml = (shown) => shown
        ? `${IC_TRANS_HIDE}<span>Ẩn đáp án</span>`
        : `${IC_TRANS_SHOW}<span>Đáp án</span>`;
      const transBtn = make('button','btn-trans',transHtml(isTransShown));
      transBtn.dataset.transq = qNum;
      transBtn.addEventListener('click', () => {
        const nextTrans = !state.showTrans['q'+qNum];
        state.showTrans['q'+qNum] = nextTrans;
        transBtn.innerHTML = transHtml(nextTrans);
        // Chấm màu đúng/sai — result mode luôn giữ màu dù ẩn dịch
        const shouldColor = state.finished || nextTrans;
        const optList = document.querySelector(`.options-list[data-qlist="${qNum}"]`);
        if (optList) applyOptionColors(optList, state.answers[qNum], getQuestionData(qNum)?.q.answer, shouldColor);
        if (part === 5) {
          document.querySelectorAll('.screen-right .full-sent-en, .screen-right .full-sent-vi').forEach(el => el.style.display = nextTrans ? '' : 'none');
          document.querySelectorAll(`.options-list[data-qlist="${qNum}"] .opt-note`).forEach(el => el.style.display = nextTrans ? '' : 'none');
        } else {
          const qtr = document.querySelector(`.q-trans[data-vifor="${qNum}"]`);
          if (qtr) qtr.style.display = nextTrans ? '' : 'none';
          const qnote = document.querySelector(`.q-note[data-vifor="${qNum}"]`);
          if (qnote) qnote.style.display = nextTrans ? '' : 'none';
          document.querySelectorAll(`.options-list[data-qlist="${qNum}"] .opt-trans,.options-list[data-qlist="${qNum}"] .opt-note`).forEach(el => el.style.display = nextTrans ? '' : 'none');
          if (nextTrans) {
            const qBlock = document.querySelector(`[data-transq="${qNum}"]`)?.closest('.q-block');
            const rightPanel = document.querySelector('.screen-right');
            if (qBlock && rightPanel) {
              const padTop = parseInt(getComputedStyle(rightPanel).paddingTop) || 0;
              const targetTop = qBlock.getBoundingClientRect().top - rightPanel.getBoundingClientRect().top + rightPanel.scrollTop - padTop;
              rightPanel.scrollTo({ top: targetTop, behavior: 'smooth' });
            }
          }
        }
      });
      wrap.appendChild(transBtn);
    }
  }
  const flagBtn=make('button','q-flag-btn'+(state.flags[qNum]?' flagged':''));
  flagBtn.innerHTML=`<svg viewBox="0 0 24 24"><path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z"/></svg>`;
  if (!state.finished) flagBtn.addEventListener('click',()=>{ state.flags[qNum]=!state.flags[qNum]; flagBtn.classList.toggle('flagged',!!state.flags[qNum]); renderSheet(); saveProgress(); });
  else flagBtn.style.pointerEvents='none';
  wrap.appendChild(flagBtn); return wrap;
}

function applyOptionColors(list, chosen, correct, showSol) {
  list.querySelectorAll('.option-item').forEach(it => {
    const lt = it.dataset.letter;
    it.className = 'option-item';
    if (showSol && correct) {
      if (lt === chosen && lt === correct)          it.classList.add('correct');
      else if (lt === chosen && lt !== correct)     it.classList.add('wrong');
      else if (lt === correct && chosen !== correct) it.classList.add('missed-correct');
    } else {
      if (lt === chosen) it.classList.add('selected');
    }
  });
}

function initResizer(screenEl, left, resizer) {
  resizer.innerHTML = `<svg class="resize-grip" viewBox="0 0 16 26" xmlns="http://www.w3.org/2000/svg">
    <rect x="0.75" y="0.75" width="14.5" height="24.5" rx="7.25" fill="white" stroke="#e2e8f0" stroke-width="1.5"/>
    <circle cx="5.5" cy="6.5"  r="1.5" fill="#94a3b8"/>
    <circle cx="10.5" cy="6.5"  r="1.5" fill="#94a3b8"/>
    <circle cx="5.5" cy="13"   r="1.5" fill="#94a3b8"/>
    <circle cx="10.5" cy="13"   r="1.5" fill="#94a3b8"/>
    <circle cx="5.5" cy="19.5" r="1.5" fill="#94a3b8"/>
    <circle cx="10.5" cy="19.5" r="1.5" fill="#94a3b8"/>
  </svg>`;
  const MIN_PCT = 50, MAX_PCT = 72;
  let dragging = false, startX = 0, startW = 0;

  const stopDrag = () => {
    if (dragging) {
      const pct = Math.round(left.offsetWidth / screenEl.offsetWidth * 100);
      localStorage.setItem('tts_left_ratio', pct);
      document.querySelectorAll('.sp-ratio-btn').forEach(b => {
        b.classList.toggle('active', parseInt(b.dataset.ratio) === pct);
      });
    }
    dragging = false;
    resizer.classList.remove('dragging');
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  };

  resizer.addEventListener('pointerdown', e => {
    e.preventDefault();
    dragging = true;
    startX = e.clientX;
    startW = left.offsetWidth / screenEl.offsetWidth * 100;
    resizer.setPointerCapture(e.pointerId);
    resizer.classList.add('dragging');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  });

  resizer.addEventListener('pointermove', e => {
    if (!dragging) return;
    const pct = Math.min(MAX_PCT, Math.max(MIN_PCT, startW + (e.clientX - startX) / screenEl.offsetWidth * 100));
    left.style.width = pct + '%';
  });

  resizer.addEventListener('pointerup', stopDrag);
  resizer.addEventListener('pointercancel', stopDrag);

  resizer.addEventListener('dblclick', () => {
    left.style.width = '50%';
    localStorage.setItem('tts_left_ratio', '50');
    document.querySelectorAll('.sp-ratio-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.ratio === '50');
    });
  });
}

function buildOptions(qNum, letters, sk, optsOverride) {
  const qd=getQuestionData(qNum);
  const opts=optsOverride
    ? optsOverride.map(o=>o?String(o).replace(/^[A-D]\.\s*/,''):'')
    : (qd?(qd.q.enOpts||[]).map(o=>o?String(o).replace(/^(?:\([A-D]\)|[A-D]\.)\s*/,''):''):[]);
  const correct = qd ? qd.q.answer : null;
  const showSol = state.finished || (state.mode==='practice' && !!state.showTrans['q'+qNum]);
  const list=make('div','options-list');
  list.dataset.qlist = qNum;
  letters.forEach((letter,i)=>{
    const item=make('div','option-item');
    item.dataset.q=qNum; item.dataset.letter=letter;
    item.appendChild(make('div','opt-radio'));
    item.appendChild(make('div','opt-label',letter+'.'));
    item.appendChild(make('div','opt-text',opts[i]||''));
    list.appendChild(item);
  });
  applyOptionColors(list, state.answers[qNum], correct, showSol);
  if (!state.finished) {
    list.querySelectorAll('.option-item').forEach(item => {
      item.addEventListener('click',()=>{
        state.answers[qNum] = item.dataset.letter;
        applyOptionColors(list, state.answers[qNum], correct, showSol);
        renderSheet(); saveProgress();
      });
    });
  } else {
    list.style.pointerEvents = 'none';
  }
  return list;
}

function buildOptionsWithNotes(qNum, letters, sk, optsOverride, noteOpts) {
  return buildOptionsAll(qNum, letters, sk, optsOverride, null, noteOpts);
}

function buildOptionsAll(qNum, letters, sk, optsOverride, viTrans, noteOpts) {
  const stripPfx = s => String(s).replace(/^(?:\([A-D]\)|[A-D][.)]\s*)/, '').trim();
  const list = buildOptions(qNum, letters, sk, optsOverride);
  list.querySelectorAll('.option-item').forEach((item, i) => {
    if (viTrans && viTrans[i])  item.appendChild(make('div','opt-trans', escHtml(stripPfx(viTrans[i]))));
    if (noteOpts && noteOpts[i]) item.appendChild(make('div','opt-note',  escHtml(stripPfx(noteOpts[i]))));
  });
  return list;
}

// ══════════════════════════════════════════════════════════════
// PHIẾU TÔ
// ══════════════════════════════════════════════════════════════
function buildPartStats(partScreens) {
  let correct=0, wrong=0, blank=0, flagged=0;
  partScreens.forEach(({sc})=>{
    const qNums=sc.q?[sc.q.q]:sc.group?sc.group.questions.map(q=>q.q):[];
    qNums.forEach(qn=>{
      const qd=getQuestionData(qn), ans=state.answers[qn];
      if (!ans) blank++;
      else if (ans===qd?.q.answer) correct++;
      else wrong++;
      if (state.flags[qn]) flagged++;
    });
  });
  const card=make('div','part-stats-card');
  card.innerHTML=
    `<span class="part-stats-item correct">${IC.check}${correct} đúng</span>`+
    `<span class="part-stats-item wrong">${IC.xmark}${wrong} sai</span>`+
    `<span class="part-stats-item unanswered">— ${blank} bỏ trống</span>`+
    (flagged?`<span class="part-stats-item flagged">${IC.flagInline}${flagged} đánh dấu</span>`:'');
  return card;
}

function renderSheet() {
  const body=el('sheetBody'); if (!body) return;
  body.innerHTML='';
  const canReveal = state.finished || state.mode==='practice';
  const hintText = canReveal
    ? `${IC.lightbulb}Bấm "số câu" để hiện ngay bài giải câu đó!`
    : '• Bấm số câu (Part 5–7) để nhảy đến câu hỏi';
  body.appendChild(make('div','sheet-hint', hintText));
  const isTest = state.mode==='test';
  const currentPart = state.screens[state.currentIdx]?.part;
  if (!state.openParts) state.openParts = new Set([currentPart]);
  state.openParts.add(currentPart);
  const byPart={};
  state.screens.forEach((sc,idx)=>{ const p=sc.part; if(!byPart[p]) byPart[p]=[]; byPart[p].push({sc,idx}); });
  Object.keys(byPart).sort((a,b)=>a-b).forEach(p=>{
    const pNum=parseInt(p);
    const isOpen=state.openParts.has(pNum);
    const letters=pNum===2?['A','B','C']:['A','B','C','D'];
    const isListening=[1,2,3,4].includes(pNum);
    let cr=0,wr=0,bl=0,fl=0;
    byPart[p].forEach(({sc})=>{
      const qs=sc.q?[sc.q.q]:sc.group?sc.group.questions.map(q=>q.q):[];
      qs.forEach(qn=>{ const qd=getQuestionData(qn),ans=state.answers[qn];
        if(!ans) bl++; else if(qd&&ans===qd.q.answer) cr++; else wr++;
        if(state.flags[qn]) fl++;
      });
    });
    const section=make('div','sheet-part-section'); section.dataset.part=p;
    const hdr=make('div','sheet-part-header'+(isOpen?' open':''));
    hdr.innerHTML=`<span class="sheet-part-name">Part ${p}</span>`+
      `<span class="sheet-part-stats-inline">`+
        `<span class="spsi-correct">${cr} đúng</span>`+
        `<span class="spsi-sep">·</span>`+
        `<span class="spsi-wrong">${wr} sai</span>`+
        `<span class="spsi-sep">·</span>`+
        `<span class="spsi-blank">${bl} trống</span>`+
        (fl?`<span class="spsi-sep">·</span><span class="spsi-flag">${fl} ⚑</span>`:'')+
      `</span>`+
      `<svg class="sheet-chevron" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`;
    const bodyEl=make('div','sheet-part-body'); if(!isOpen) bodyEl.classList.add('collapsed');
    byPart[p].forEach(({sc,idx})=>{
      const qNums=sc.q?[sc.q.q]:sc.group?sc.group.questions.map(q=>q.q):[];
      qNums.forEach(qNum=>{
        const showSol=state.finished||(state.mode==='practice'&&!!state.showSolution['q'+qNum]);
        const qd=getQuestionData(qNum),correct=qd?qd.q.answer:null,chosen=state.answers[qNum];
        const row=make('div','sheet-row');
        row.dataset.answered=chosen?'true':'false';
        row.dataset.result=chosen?(chosen===correct?'correct':'wrong'):'unanswered';
        row.dataset.flagged=state.flags[qNum]?'true':'false';
        if(isTest&&isListening) row.classList.add('no-jump');
        else row.addEventListener('click',()=>{ state.currentIdx=idx; state.scrollToQ=qNum; renderScreen(state.currentIdx); renderSheet(); toggleSheet(false); });
        const qnumEl=make('div','sheet-qnum',String(qNum));
        if(canReveal) qnumEl.addEventListener('click',e=>{
          e.stopPropagation(); state.currentIdx=idx; state.scrollToQ=qNum;
          const part=sc.part;
          if([3,4].includes(part)) qNums.forEach(qn=>{state.showSolution['q'+qn]=true;});
          else state.showSolution['q'+qNum]=true;
          if(part===5) state.lastRevealedQ=qNum;
          else if([6,7].includes(part)){const sk=screenKey(sc);state.leftTab[sk]='video';state.videoQ[sk]=qNum;}
          renderScreen(state.currentIdx); renderSheet(); toggleSheet(false);
        });
        row.appendChild(qnumEl);
        const opts=make('div','sheet-opts');
        letters.forEach(lt=>{ const opt=make('div','sheet-opt',lt);
          if(showSol&&correct){ if(lt===chosen&&lt===correct) opt.classList.add('correct-ans'); else if(lt===chosen&&lt!==correct) opt.classList.add('wrong-ans'); else if(lt===correct&&chosen!==correct) opt.classList.add('missed-ans'); }
          else { if(chosen===lt) opt.classList.add('chosen'); }
          opts.appendChild(opt);
        });
        row.appendChild(opts);
        const flag=make('div','sheet-flag'+(state.flags[qNum]?' flagged':''));
        flag.innerHTML=`<svg viewBox="0 0 24 24"><path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z"/></svg>`;
        row.appendChild(flag); bodyEl.appendChild(row);
      });
    });
    hdr.addEventListener('click',()=>{
      const nowCollapsed=bodyEl.classList.toggle('collapsed');
      hdr.classList.toggle('open',!nowCollapsed);
      if(!nowCollapsed) state.openParts.add(pNum); else state.openParts.delete(pNum);
    });
    section.appendChild(hdr); section.appendChild(bodyEl); body.appendChild(section);
  });
  applySheetFilter();
}

function applySheetFilter() {
  const f=state.sheetFilter||'all';
  document.querySelectorAll('#sheetBody .sheet-row').forEach(row=>{
    let show=true;
    if(f==='unanswered') show=row.dataset.answered==='false';
    else if(f==='wrong')  show=row.dataset.result==='wrong';
    else if(f==='flagged') show=row.dataset.flagged==='true';
    row.style.display=show?'':'none';
  });
  document.querySelectorAll('#sheetBody .sheet-part-section').forEach(sec=>{
    const hasVisible=Array.from(sec.querySelectorAll('.sheet-row')).some(r=>r.style.display!=='none');
    sec.style.display=hasVisible?'':'none';
    if(f!=='all' && hasVisible){
      sec.querySelector('.sheet-part-body')?.classList.remove('collapsed');
      sec.querySelector('.sheet-part-header')?.classList.add('open');
    }
  });
  document.querySelectorAll('.sheet-filter-btn').forEach(btn=>btn.classList.toggle('active',btn.dataset.filter===f));
}

function toggleSheet(force) {
  const o=el('sheetOverlay'); if(!o) return;
  if(force===false) o.classList.remove('open'); else o.classList.toggle('open');
}

// ══════════════════════════════════════════════════════════════
// TIMER
// ══════════════════════════════════════════════════════════════
function startTimer() {
  if (state.timerInterval) clearInterval(state.timerInterval);
  let warned=false;
  state.timerInterval=setInterval(()=>{
    if (state.timerMode==='up') {
      state.secondsLeft++;
      const td=el('timerDisplay');
      if (td) { td.textContent=fmtTime(state.secondsLeft); td.className='timer'; }
    } else {
      state.secondsLeft--;
      const td=el('timerDisplay');
      if (td) { td.textContent=fmtTime(state.secondsLeft); td.className=state.secondsLeft<=60?'timer danger':state.secondsLeft<=300?'timer warning':'timer'; }
      if (state.secondsLeft===120 && !warned) { warned=true; const wo=el('warningOverlay'); if(wo){wo.classList.add('show');setTimeout(()=>wo.classList.remove('show'),5000);} }
      if (state.secondsLeft<=0) { clearInterval(state.timerInterval); submitExam(); }
    }
    if (state.secondsLeft%15===0) saveProgress();
  },1000);
}

const SPEED_STEPS=[0.5,0.75,1,1.25,1.5,1.75,2];
function handleKeydown(e) {
  if (['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)) return;
  if (e.code==='Enter' || e.code==='NumpadEnter') { e.preventDefault(); goNext(); return; }
  if (e.code==='ArrowUp' || e.code==='ArrowDown') {
    e.preventDefault();
    document.querySelector('.screen-right')?.scrollBy({ top: e.code==='ArrowDown' ? 80 : -80 });
    return;
  }
  if (state.mode==='test' && !state.finished) return;
  const audio=document.querySelector('audio'); if (!audio) return;
  if (e.code==='Space')     { e.preventDefault(); audio.paused?audio.play():audio.pause(); }
  if (e.code==='ArrowLeft') { e.preventDefault(); audio.currentTime=Math.max(0,audio.currentTime-3); }
  if (e.code==='ArrowRight'){ e.preventDefault(); audio.currentTime+=3; }
}

// ══════════════════════════════════════════════════════════════
// SUBMIT
// ══════════════════════════════════════════════════════════════
function showConfirmModal() {
  const allQs=state.screens.flatMap(sc=>sc.q?[sc.q.q]:sc.group?sc.group.questions.map(q=>q.q):[]);
  const answered=countAnswered(allQs), unanswered=allQs.length-answered;
  const body=el('confirmBody');
  if (body) body.innerHTML=`Tổng số câu: <b>${allQs.length}</b><br>Đã trả lời: <b>${answered}</b><br>
    ${unanswered>0?`<span style="color:#dc2626">Chưa trả lời: <b>${unanswered} câu</b></span>`:`<span style="color:#16a34a">Đã trả lời đủ tất cả câu!</span>`}`;
  el('confirmOverlay').classList.add('show');
}

function submitExam() {
  clearInterval(state.timerInterval);
  state.finished=true;

  const elapsed=state.startTime ? Math.round((Date.now()-state.startTime)/1000) : 0;
  const allQs=state.screens.flatMap(sc=>sc.q?[sc.q.q]:sc.group?sc.group.questions.map(q=>q.q):[]);
  const partResults={};
  for (let p=1;p<=7;p++) {
    const pQs=getPartQuestions(p).filter(q=>allQs.includes(q)); if (!pQs.length) continue;
    const correct=pQs.filter(q=>{ const qd=getQuestionData(q); return qd&&state.answers[q]===qd.q.answer; }).length;
    const answered=pQs.filter(q=>state.answers[q]).length;
    partResults[p]={total:pQs.length, correct, wrong:answered-correct, blank:pQs.length-answered};
  }
  const totalCorrect=Object.values(partResults).reduce((s,r)=>s+r.correct,0);
  const totalAnswered=allQs.filter(q=>state.answers[q]).length;
  const totalWrong=totalAnswered-totalCorrect;
  const totalBlank=allQs.length-totalAnswered;
  const totalFlagged=allQs.filter(q=>state.flags[q]).length;

  const R={
    examId:ED.id, examTitle:ED.title, mode:state.mode, selectedParts:state.selectedParts,
    answers:state.answers, flags:state.flags, partResults, totalCorrect,
    totalQ:allQs.length, totalWrong, totalBlank, totalFlagged, elapsed, timeLimit:state.timeLimit,
    examUrl:window.location.href,
  };

  saveHistory(R);
  saveResultToFirestore(R);
  clearProgress();

  const resultKey='result_'+ED.id+'_'+Date.now();
  localStorage.setItem(resultKey, JSON.stringify(R));
  const root=typeof PATH_TO_ROOT!=='undefined'?PATH_TO_ROOT:'../../../';
  window.open(root+'exams/result.html?key='+encodeURIComponent(resultKey), '_blank');

  enterReviewMode(R);
}

function enterReviewMode(R) {
  state.mode='practice'; state.finished=true;
  const timerEl=el('timerDisplay'); if (timerEl) timerEl.style.display='none';
  const submitEl=el('btnSubmit'); if (submitEl) submitEl.style.display='none';
  const topRight=document.querySelector('.topbar-right');
  if (topRight) {
    const label=make('span','',IC.check+'Đã nộp — Chế độ xem lại');
    label.style.cssText='font-size:13px;color:rgba(255,255,255,0.7);order:-1';
    topRight.insertBefore(label, topRight.firstChild);
  }
  const leg=document.querySelector('.answer-sheet-legend');
  if (leg) leg.innerHTML=`
    <div class="legend-item"><div class="legend-dot correct"></div> Đúng</div>
    <div class="legend-item"><div class="legend-dot wrong"></div> Sai</div>
    <div class="legend-item"><div class="legend-dot missed"></div> Bỏ trống (đáp án đúng)</div>
    <div class="legend-item">${IC.flagInline} Đánh dấu</div>`;
  window._fullReview = function() {
    renderScreen(state.currentIdx);
    renderSheetReview();
  };
  window._selectPage = function() { renderSelectPage(); };

  renderSheetReview();
  renderScreen(state.currentIdx);
}

function renderSheetReview() {
  const body=el('sheetBody'); if (!body) return;
  body.innerHTML='';
  const byPart={};
  state.screens.forEach((sc,idx)=>{ const p=sc.part; if(!byPart[p]) byPart[p]=[]; byPart[p].push({sc,idx}); });
  Object.keys(byPart).sort((a,b)=>a-b).forEach(p=>{
    body.appendChild(make('div','answer-sheet-part-label',`Part ${p}`));
    body.appendChild(buildPartStats(byPart[p]));
    const letters=parseInt(p)===2?['A','B','C']:['A','B','C','D'];
    byPart[p].forEach(({sc,idx})=>{
      const qNums=sc.q?[sc.q.q]:sc.group?sc.group.questions.map(q=>q.q):[];
      qNums.forEach(qNum=>{
        const qd=getQuestionData(qNum),correct=qd?qd.q.answer:null,chosen=state.answers[qNum];
        const row=make('div','sheet-row');
        row.dataset.answered = chosen ? 'true' : 'false';
        row.dataset.result = chosen ? (chosen===correct?'correct':'wrong') : 'unanswered';
        row.dataset.flagged = state.flags[qNum] ? 'true' : 'false';
        row.addEventListener('click',()=>{ state.currentIdx=idx; renderScreen(state.currentIdx); toggleSheet(false); });
        row.appendChild(make('div','sheet-qnum',String(qNum)));
        const opts=make('div','sheet-opts');
        letters.forEach(lt=>{
          const opt=make('div','sheet-opt',lt);
          if      (lt===chosen && lt===correct)      opt.classList.add('correct-ans');
          else if (lt===chosen && lt!==correct)      opt.classList.add('wrong-ans');
          else if (lt===correct && chosen!==correct) opt.classList.add('missed-ans');
          opts.appendChild(opt);
        });
        row.appendChild(opts);
        const flag=make('div','sheet-flag'+(state.flags[qNum]?' flagged':''));
        flag.innerHTML=`<svg viewBox="0 0 24 24"><path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z"/></svg>`;
        row.appendChild(flag); body.appendChild(row);
      });
    });
  });
  applySheetFilter();
}

// ══════════════════════════════════════════════════════════════
// KHỞI ĐỘNG
// ══════════════════════════════════════════════════════════════
document.body.innerHTML=`
  <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;
    background:linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%)">
    <div style="text-align:center;color:rgba(255,255,255,0.7);font-family:'Segoe UI',sans-serif">
      <div style="width:40px;height:40px;border:3px solid rgba(255,255,255,0.2);
        border-top-color:#f5c518;border-radius:50%;animation:spin 0.75s linear infinite;
        margin:0 auto 16px"></div>
      <div style="font-size:14px">Đang tải...</div>
    </div>
    <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
  </div>`;

async function loadAndReview(docId) {
  try {
    const snap = await getDoc(doc(db, 'results', docId));
    if (snap.exists()) { enterReviewFromHistory({ id: snap.id, ...snap.data() }); }
    else { renderSelectPage(); }
  } catch(e) { console.error('loadAndReview:', e); renderSelectPage(); }
}

function startApp() {
  const reviewDocId = new URLSearchParams(location.search).get('reviewDoc');
  if (reviewDocId) { loadAndReview(reviewDocId); } else { renderSelectPage(); }
}

if (window._ttsAuthReady) {
  window._ttsAuthReady.then(({ user, whitelisted }) => {
    if (!user)        { renderAuthGate(false); return; }
    if (!whitelisted) { renderAuthGate(true);  return; }
    currentUser = user;
    startApp();
  });
} else {
  // DEV MODE — auth.js chưa load
  currentUser = { email: 'test@test.com', uid: 'dev' };
  startApp();
}
