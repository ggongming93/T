/* ════════════════════════════════════════════════════
   구구단 왕국 — app.js
   ════════════════════════════════════════════════════ */

'use strict';

/* ──────────────────────────────────────────
   1. 상수 & 유틸
────────────────────────────────────────── */
const DAN_COLORS = ['c2','c3','c4','c5','c6','c7','c8','c9'];
const DAN_EMOJIS = {2:'🔴',3:'🟠',4:'🟡',5:'🟢',6:'🔵',7:'🟣',8:'🟤',9:'🩷'};

function $(id) { return document.getElementById(id); }
function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  $(id).classList.add('active');
}

/* ──────────────────────────────────────────
   2. 별 파티클 (배경)
────────────────────────────────────────── */
(function initStars() {
  const canvas = $('star-canvas');
  const ctx    = canvas.getContext('2d');
  let W, H, stars = [], shooters = [];

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  // 정지 별 생성
  for (let i = 0; i < 200; i++) {
    stars.push({
      x: Math.random() * 2000,
      y: Math.random() * 2000,
      r: Math.random() * 1.6 + 0.3,
      a: Math.random(),
      da: (Math.random() - 0.5) * 0.015
    });
  }

  // 별똥별 생성
  function addShooter() {
    shooters.push({
      x: Math.random() * W,
      y: Math.random() * H * 0.4,
      vx: rand(4, 10),
      vy: rand(2, 5),
      len: rand(80, 160),
      alpha: 1,
      done: false
    });
  }
  setInterval(addShooter, 2800);

  function draw() {
    ctx.clearRect(0, 0, W, H);

    // 정지 별
    stars.forEach(s => {
      s.a += s.da;
      if (s.a <= 0 || s.a >= 1) s.da *= -1;
      ctx.beginPath();
      ctx.arc(s.x % W, s.y % H, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${s.a.toFixed(2)})`;
      ctx.fill();
    });

    // 별똥별
    shooters = shooters.filter(s => !s.done);
    shooters.forEach(s => {
      ctx.beginPath();
      const grad = ctx.createLinearGradient(s.x, s.y, s.x - s.len, s.y - s.len * 0.5);
      grad.addColorStop(0, `rgba(255,255,255,${s.alpha})`);
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 2;
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x - s.len, s.y - s.len * 0.5);
      ctx.stroke();
      s.x += s.vx; s.y += s.vy;
      s.alpha -= 0.03;
      if (s.alpha <= 0 || s.x > W + 200) s.done = true;
    });

    requestAnimationFrame(draw);
  }
  draw();
})();

/* ──────────────────────────────────────────
   3. 폭죽 (Confetti)
────────────────────────────────────────── */
const confettiCanvas = $('confetti-canvas');
const confettiCtx   = confettiCanvas.getContext('2d');
let confettiPieces  = [];
let confettiActive  = false;

function resizeConfetti() {
  confettiCanvas.width  = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeConfetti);
resizeConfetti();

const CONFETTI_COLORS = ['#ff2d78','#ffe600','#00ffe7','#bf5fff','#00b4ff','#ff8c00','#ff69b4','#00ff88'];

function launchConfetti(count = 120) {
  confettiPieces = [];
  for (let i = 0; i < count; i++) {
    confettiPieces.push({
      x: confettiCanvas.width  * Math.random(),
      y: -10,
      vx: (Math.random() - 0.5) * 6,
      vy: Math.random() * 4 + 3,
      w: rand(8, 16),
      h: rand(5, 10),
      color: CONFETTI_COLORS[rand(0, CONFETTI_COLORS.length - 1)],
      rot: Math.random() * 360,
      drot: (Math.random() - 0.5) * 8,
      alpha: 1,
      done: false
    });
  }
  if (!confettiActive) {
    confettiActive = true;
    animateConfetti();
  }
}

function animateConfetti() {
  confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  confettiPieces = confettiPieces.filter(p => !p.done);

  confettiPieces.forEach(p => {
    p.x   += p.vx;
    p.y   += p.vy;
    p.rot += p.drot;
    p.vy  += 0.12; // gravity
    if (p.y > confettiCanvas.height + 20) { p.done = true; return; }

    confettiCtx.save();
    confettiCtx.globalAlpha = p.alpha;
    confettiCtx.translate(p.x, p.y);
    confettiCtx.rotate(p.rot * Math.PI / 180);
    confettiCtx.fillStyle = p.color;
    confettiCtx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    confettiCtx.restore();
  });

  if (confettiPieces.length > 0) {
    requestAnimationFrame(animateConfetti);
  } else {
    confettiActive = false;
    confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  }
}

/* ──────────────────────────────────────────
   4. 효과음 (Web Audio API)
────────────────────────────────────────── */
let audioCtx = null;

function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playSound(type) {
  try {
    const ctx  = getAudioCtx();
    const gain = ctx.createGain();
    gain.connect(ctx.destination);

    if (type === 'correct') {
      // 명랑한 UP 사운드
      const freqs = [523, 659, 784, 1047];
      freqs.forEach((f, i) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = f;
        osc.connect(gain);
        gain.gain.setValueAtTime(0.18, ctx.currentTime + i * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.1 + 0.18);
        osc.start(ctx.currentTime + i * 0.1);
        osc.stop(ctx.currentTime + i * 0.1 + 0.2);
      });
    } else if (type === 'wrong') {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.connect(gain);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    } else if (type === 'flip') {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.connect(gain);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);
    } else if (type === 'victory') {
      const notes = [523,659,784,659,784,1047];
      notes.forEach((f, i) => {
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.value = f;
        osc.connect(gain);
        gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.2);
        osc.start(ctx.currentTime + i * 0.12);
        osc.stop(ctx.currentTime + i * 0.12 + 0.22);
      });
    }
  } catch(e) { /* 오디오 컨텍스트 실패시 무시 */ }
}

/* ──────────────────────────────────────────
   5. 홈 화면
────────────────────────────────────────── */
let selectedDan = 2; // 현재 선택 단

$('btn-goto-study').addEventListener('click', () => {
  renderStudy(selectedDan);
  showScreen('study');
});

$('btn-goto-quiz').addEventListener('click', () => {
  startQuiz();
  showScreen('quiz');
});

// 홈 단 버튼: 단 선택 후 바로 외우기 모드로
$('home-dan-grid').addEventListener('click', e => {
  const btn = e.target.closest('.dan-btn');
  if (!btn) return;
  selectedDan = parseInt(btn.dataset.dan);
  renderStudy(selectedDan);
  showScreen('study');
});

/* ──────────────────────────────────────────
   6. 외우기 모드
────────────────────────────────────────── */
let studyDan = 2;

function renderStudy(dan) {
  studyDan = dan;
  $('study-title').textContent      = `${dan}단 ${DAN_EMOJIS[dan]}`;
  $('study-dan-indicator').textContent = `${dan}단`;

  const grid  = $('card-grid');
  const color = DAN_COLORS[dan - 2];
  grid.innerHTML = '';

  for (let i = 1; i <= 9; i++) {
    const card  = document.createElement('div');
    card.className = 'flip-card';
    card.dataset.flipped = 'false';

    card.innerHTML = `
      <div class="flip-inner">
        <div class="flip-front">
          <span class="question-text">${dan} × ${i} = ?</span>
          <span class="tap-hint">탭해서 확인!</span>
        </div>
        <div class="flip-back ${color}">
          ${dan} × ${i} = <strong>${dan * i}</strong>
        </div>
      </div>`;

    card.addEventListener('click', () => {
      const isFlipped = card.dataset.flipped === 'true';
      card.dataset.flipped = !isFlipped;
      card.classList.toggle('flipped');
      playSound('flip');
    });

    grid.appendChild(card);
  }
}

$('study-back').addEventListener('click', () => showScreen('home'));

$('study-prev').addEventListener('click', () => {
  studyDan = studyDan > 2 ? studyDan - 1 : 9;
  renderStudy(studyDan);
});
$('study-next').addEventListener('click', () => {
  studyDan = studyDan < 9 ? studyDan + 1 : 2;
  renderStudy(studyDan);
});

/* ──────────────────────────────────────────
   7. 퀴즈 모드
────────────────────────────────────────── */
const TOTAL_QUESTIONS = 10;
let quizState = {};

const CORRECT_MSGS = [
  '🎉 정답! 천재인가요?!',
  '✨ 완벽해요! 최고!',
  '🔥 맞았어요! 대단해!',
  '⭐ 정답! 역시 달라!',
  '🚀 빙고! 우주 최강!',
  '💎 완벽한 정답!',
  '🌟 훌륭해요! 멋져!',
];
const WRONG_MSGS = [
  '💦 아쉬워요... 다시!',
  '😅 조금만 더 생각해봐요!',
  '🤔 틀렸어요! 힘내요!',
  '💪 괜찮아요, 다음엔!',
  '🌈 아쉽네요! 다시 도전!',
];

function generateQuestion() {
  const a = rand(2, 9);
  const b = rand(1, 9);
  const answer = a * b;

  // 오답 보기 생성 (겹치지 않게)
  const wrongs = new Set();
  while (wrongs.size < 3) {
    let w;
    do {
      w = answer + rand(-15, 15);
    } while (w === answer || w <= 0 || w > 81);
    wrongs.add(w);
  }

  const choices = [answer, ...[...wrongs]].sort(() => Math.random() - 0.5);
  return { a, b, answer, choices };
}

function startQuiz() {
  quizState = {
    current: 0,
    stars:   0,
    combo:   0,
    maxCombo:0,
    correct: 0,
    locked:  false,
    questions: Array.from({length: TOTAL_QUESTIONS}, generateQuestion)
  };
  renderQuiz();
}

function renderQuiz() {
  const q   = quizState.questions[quizState.current];
  const num = quizState.current + 1;

  $('question-num').textContent  = `문제 ${num} / ${TOTAL_QUESTIONS}`;
  $('question-text').textContent = `${q.a} × ${q.b} = ?`;
  $('val-stars').textContent   = quizState.stars;
  $('val-combo').textContent   = quizState.combo;
  $('val-progress').textContent = `${num}/${TOTAL_QUESTIONS}`;
  $('progress-bar').style.width = `${((num - 1) / TOTAL_QUESTIONS) * 100}%`;
  $('feedback-msg').textContent  = '';
  $('feedback-msg').style.color  = '';

  // 보기 버튼 초기화
  q.choices.forEach((val, i) => {
    const btn = $(`choice-${i}`);
    btn.textContent = val;
    btn.className   = 'choice-btn';
    btn.disabled    = false;
  });

  quizState.locked = false;
}

async function handleChoice(idx) {
  if (quizState.locked) return;
  quizState.locked = true;

  const q      = quizState.questions[quizState.current];
  const chosen = q.choices[idx];
  const isRight = chosen === q.answer;

  // 버튼 비활성화
  for (let i = 0; i < 4; i++) {
    const btn = $(`choice-${i}`);
    btn.disabled = true;
    if (q.choices[i] === q.answer) btn.classList.add('correct');
    else if (i === idx && !isRight) btn.classList.add('wrong');
  }

  const feedbackEl = $('feedback-msg');

  if (isRight) {
    quizState.correct++;
    quizState.combo++;
    if (quizState.combo > quizState.maxCombo) quizState.maxCombo = quizState.combo;

    // 콤보 보너스
    const bonus = quizState.combo >= 5 ? 3 : quizState.combo >= 3 ? 2 : 1;
    quizState.stars += bonus;

    const msg = CORRECT_MSGS[rand(0, CORRECT_MSGS.length - 1)];
    feedbackEl.textContent = quizState.combo >= 3
      ? `${msg}  🔥${quizState.combo} 콤보!`
      : msg;
    feedbackEl.style.color = '#00ff88';

    playSound('correct');
    if (quizState.combo >= 3) launchConfetti(60);
    else launchConfetti(30);

  } else {
    quizState.combo = 0;
    feedbackEl.textContent = WRONG_MSGS[rand(0, WRONG_MSGS.length - 1)];
    feedbackEl.style.color = '#ff4466';
    playSound('wrong');

    // 화면 흔들림
    $('question-card').classList.add('shake-overlay');
    await sleep(420);
    $('question-card').classList.remove('shake-overlay');
  }

  $('val-stars').textContent  = quizState.stars;
  $('val-combo').textContent  = quizState.combo;

  await sleep(1200);

  quizState.current++;
  if (quizState.current >= TOTAL_QUESTIONS) {
    showResult();
  } else {
    renderQuiz();
  }
}

// 보기 버튼 이벤트
for (let i = 0; i < 4; i++) {
  $(`choice-${i}`).addEventListener('click', () => handleChoice(i));
}

$('quiz-back').addEventListener('click', () => showScreen('home'));

/* ──────────────────────────────────────────
   8. 결과 화면
────────────────────────────────────────── */
const GRADES = [
  { minCorrect:10, trophy:'👑', grade:'구구단 황제!',  msg:'완벽해요! 10문제를 모두 맞혔어요!\n진정한 구구단 왕국의 황제예요! 🌟' },
  { minCorrect: 8, trophy:'🤴', grade:'구구단 왕자!',  msg:'대단해요! 거의 완성이에요!\n조금만 더 연습하면 황제가 될 수 있어요! ✨' },
  { minCorrect: 6, trophy:'🧙', grade:'구구단 마법사!',msg:'잘했어요! 마법 같은 실력이네요!\n계속 연습해봐요! 🌈' },
  { minCorrect: 4, trophy:'⚔️', grade:'구구단 기사!',  msg:'좋은 시작이에요! 더 열심히 하면\n기사에서 왕자가 될 수 있어요! 💪' },
  { minCorrect: 0, trophy:'📚', grade:'구구단 견습생!',msg:'괜찮아요! 처음이 제일 어렵답니다.\n외우기 모드로 먼저 연습해봐요! 📖' },
];

function showResult() {
  const { stars, correct, maxCombo } = quizState;
  const gradeInfo = GRADES.find(g => correct >= g.minCorrect);

  $('result-trophy').textContent = gradeInfo.trophy;
  $('result-grade').textContent  = gradeInfo.grade;
  $('result-msg').textContent    = gradeInfo.msg;
  $('res-stars').textContent     = stars;
  $('res-correct').textContent   = `${correct}/10`;
  $('res-combo').textContent     = maxCombo;

  showScreen('result');
  playSound('victory');
  launchConfetti(correct >= 8 ? 200 : correct >= 6 ? 120 : 60);
}

$('btn-retry').addEventListener('click', () => {
  startQuiz();
  showScreen('quiz');
});
$('btn-result-home').addEventListener('click', () => showScreen('home'));

/* ──────────────────────────────────────────
   9. 초기화
────────────────────────────────────────── */
renderStudy(2);

// 홈 단 버튼 hover 시 선택 단 업데이트
document.querySelectorAll('.dan-btn').forEach(btn => {
  btn.addEventListener('mouseenter', () => {
    selectedDan = parseInt(btn.dataset.dan);
  });
});
