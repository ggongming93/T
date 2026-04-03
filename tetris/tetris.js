'use strict';
/* ════════════════════════════════════════════════
   네온 테트리스 — tetris.js
   ════════════════════════════════════════════════ */

/* ──────────────────── 상수 ────────────────────── */
const COLS = 10, ROWS = 20;
const BLOCK = 30; // px per cell (will be adjusted for mobile)
const COLORS = {
  I: '#00ffe7', O: '#ffe600', T: '#bf5fff',
  S: '#00ff88', Z: '#ff2d78', J: '#00b4ff', L: '#ff8c00'
};
const GLOW = {
  I: '#00ffe788', O: '#ffe60088', T: '#bf5fff88',
  S: '#00ff8888', Z: '#ff2d7888', J: '#00b4ff88', L: '#ff8c0088'
};

/* 7종 테트로미노 (각 회전 상태) */
const PIECES = {
  I: [
    [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
    [[0,0,1,0],[0,0,1,0],[0,0,1,0],[0,0,1,0]],
    [[0,0,0,0],[0,0,0,0],[1,1,1,1],[0,0,0,0]],
    [[0,1,0,0],[0,1,0,0],[0,1,0,0],[0,1,0,0]],
  ],
  O: [
    [[1,1],[1,1]],
  ],
  T: [
    [[0,1,0],[1,1,1],[0,0,0]],
    [[0,1,0],[0,1,1],[0,1,0]],
    [[0,0,0],[1,1,1],[0,1,0]],
    [[0,1,0],[1,1,0],[0,1,0]],
  ],
  S: [
    [[0,1,1],[1,1,0],[0,0,0]],
    [[0,1,0],[0,1,1],[0,0,1]],
    [[0,0,0],[0,1,1],[1,1,0]],
    [[1,0,0],[1,1,0],[0,1,0]],
  ],
  Z: [
    [[1,1,0],[0,1,1],[0,0,0]],
    [[0,0,1],[0,1,1],[0,1,0]],
    [[0,0,0],[1,1,0],[0,1,1]],
    [[0,1,0],[1,1,0],[1,0,0]],
  ],
  J: [
    [[1,0,0],[1,1,1],[0,0,0]],
    [[0,1,1],[0,1,0],[0,1,0]],
    [[0,0,0],[1,1,1],[0,0,1]],
    [[0,1,0],[0,1,0],[1,1,0]],
  ],
  L: [
    [[0,0,1],[1,1,1],[0,0,0]],
    [[0,1,0],[0,1,0],[0,1,1]],
    [[0,0,0],[1,1,1],[1,0,0]],
    [[1,1,0],[0,1,0],[0,1,0]],
  ],
};

/* Wall Kick 오프셋 (SRS) */
const KICKS = {
  normal: [
    [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
    [[0,0],[1,0],[1,-1],[0,2],[1,2]],
    [[0,0],[1,0],[1,1],[0,-2],[1,-2]],
    [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
  ],
  I: [
    [[0,0],[-2,0],[1,0],[-2,-1],[1,2]],
    [[0,0],[-1,0],[2,0],[-1,2],[2,-1]],
    [[0,0],[2,0],[-1,0],[2,1],[-1,-2]],
    [[0,0],[1,0],[-2,0],[1,-2],[-2,1]],
  ],
};

/* 레벨별 낙하 딜레이 (ms) */
function getLockDelay(level) {
  return Math.max(80, 1000 - (level - 1) * 80);
}
const SCORE_TABLE = [0, 100, 300, 500, 800];

/* ──────────────────── DOM ──────────────────── */
function $(id) { return document.getElementById(id); }
const gameCanvas  = $('game-canvas');
const ctx         = gameCanvas.getContext('2d');
const holdCanvas  = $('hold-canvas');
const holdCtx     = holdCanvas.getContext('2d');
const nextCanvas  = $('next-canvas');
const nextCtx     = nextCanvas.getContext('2d');
const starCanvas  = $('star-canvas');
const starCtx     = starCanvas.getContext('2d');
const confCanvas  = $('confetti-canvas');
const confCtx     = confCanvas.getContext('2d');

/* ──────────────────── 캔버스 크기 ──────────────── */
let BS = BLOCK; // block size, responsive

function resizeAll() {
  starCanvas.width  = confCanvas.width  = window.innerWidth;
  starCanvas.height = confCanvas.height = window.innerHeight;

  // 화면에 맞게 보드 크기 조정
  const maxH = window.innerHeight - 40;
  const maxW = window.innerWidth  - 320; // side panels
  BS = Math.floor(Math.min(maxH / ROWS, maxW / COLS, BLOCK));
  BS = Math.max(BS, 16);

  gameCanvas.width  = BS * COLS;
  gameCanvas.height = BS * ROWS;
}
window.addEventListener('resize', () => { resizeAll(); if (gameState) render(); });
resizeAll();

/* ──────────────────── 별 배경 ──────────────────── */
(function initStars() {
  const stars = Array.from({length:180}, () => ({
    x: Math.random() * 2000,
    y: Math.random() * 2000,
    r: Math.random() * 1.4 + 0.2,
    a: Math.random(),
    da: (Math.random() - 0.5) * 0.012,
  }));
  const shooters = [];
  setInterval(() => {
    shooters.push({
      x: Math.random() * starCanvas.width,
      y: Math.random() * starCanvas.height * 0.3,
      vx: 5 + Math.random() * 7,
      vy: 2 + Math.random() * 4,
      len: 80 + Math.random() * 100,
      alpha: 1, done: false
    });
  }, 3000);
  function loop() {
    starCtx.clearRect(0,0,starCanvas.width,starCanvas.height);
    stars.forEach(s => {
      s.a += s.da;
      if (s.a <= 0 || s.a >= 1) s.da *= -1;
      starCtx.beginPath();
      starCtx.arc(s.x % starCanvas.width, s.y % starCanvas.height, s.r, 0, Math.PI*2);
      starCtx.fillStyle = `rgba(255,255,255,${s.a.toFixed(2)})`;
      starCtx.fill();
    });
    shooters.filter(s => !s.done).forEach(s => {
      const g = starCtx.createLinearGradient(s.x, s.y, s.x - s.len, s.y - s.len*0.5);
      g.addColorStop(0, `rgba(255,255,255,${s.alpha})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      starCtx.beginPath();
      starCtx.strokeStyle = g; starCtx.lineWidth = 1.5;
      starCtx.moveTo(s.x, s.y); starCtx.lineTo(s.x - s.len, s.y - s.len*0.5);
      starCtx.stroke();
      s.x += s.vx; s.y += s.vy; s.alpha -= 0.025;
      if (s.alpha <= 0) s.done = true;
    });
    requestAnimationFrame(loop);
  }
  loop();
})();

/* ──────────────────── 효과음 ──────────────────── */
let audioCtx = null;
function ac() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}
function beep(freq, type, dur, vol=0.12) {
  try {
    const a = ac(), o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, a.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + dur);
    o.connect(g); g.connect(a.destination);
    o.start(); o.stop(a.currentTime + dur);
  } catch(e){}
}
const SFX = {
  move:    () => beep(180, 'square',   0.05, 0.06),
  rotate:  () => beep(320, 'sine',     0.08, 0.09),
  soft:    () => beep(120, 'square',   0.04, 0.05),
  hard:    () => beep(90,  'sawtooth', 0.12, 0.14),
  lock:    () => beep(200, 'square',   0.1,  0.1),
  clear1:  () => beep(520, 'sine',     0.2,  0.12),
  tetris:  () => [523,659,784,1047].forEach((f,i) =>
    setTimeout(() => beep(f,'triangle',0.25,0.15), i*80)),
  levelup: () => [440,550,660,880].forEach((f,i) =>
    setTimeout(() => beep(f,'sine',0.2,0.16), i*90)),
  gameover:() => [300,250,200,160,120].forEach((f,i) =>
    setTimeout(() => beep(f,'sawtooth',0.3,0.1), i*120)),
  hold:    () => beep(260, 'sine',     0.1,  0.1),
};

/* ──────────────────── 폭죽 ──────────────────── */
const CONF_COLORS = ['#ff2d78','#ffe600','#00ffe7','#bf5fff','#00b4ff','#ff8c00','#00ff88'];
let confPieces = [], confActive = false;

function launchConfetti(n=120) {
  for (let i=0; i<n; i++) confPieces.push({
    x: Math.random() * confCanvas.width,
    y: -10,
    vx: (Math.random()-0.5)*8,
    vy: Math.random()*5+3,
    w: 6+Math.random()*10, h:4+Math.random()*8,
    color: CONF_COLORS[Math.floor(Math.random()*CONF_COLORS.length)],
    rot: Math.random()*360, drot:(Math.random()-0.5)*10,
    done: false
  });
  if (!confActive) { confActive = true; animConf(); }
}
function animConf() {
  confCtx.clearRect(0,0,confCanvas.width,confCanvas.height);
  confPieces = confPieces.filter(p=>!p.done);
  confPieces.forEach(p => {
    p.x+=p.vx; p.y+=p.vy; p.vy+=0.15; p.rot+=p.drot;
    if (p.y > confCanvas.height+20) { p.done=true; return; }
    confCtx.save();
    confCtx.translate(p.x,p.y); confCtx.rotate(p.rot*Math.PI/180);
    confCtx.fillStyle = p.color;
    confCtx.fillRect(-p.w/2,-p.h/2,p.w,p.h);
    confCtx.restore();
  });
  if (confPieces.length) requestAnimationFrame(animConf);
  else { confActive=false; confCtx.clearRect(0,0,confCanvas.width,confCanvas.height); }
}

/* ──────────────────── Flash overlay ──────────────── */
function flashScreen(color='#ffffff') {
  const el = $('flash-overlay');
  el.style.background = color;
  el.classList.remove('flash');
  void el.offsetWidth;
  el.classList.add('flash');
}

/* ──────────────────── Level-up popup ─────────────── */
function showLevelup(lv) {
  const el = $('levelup-popup');
  el.textContent = `⬆️ LEVEL ${lv}!`;
  el.classList.remove('show');
  void el.offsetWidth;
  el.classList.add('show');
}

/* ──────────────────── Screen ──────────────────── */
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  $(id).classList.add('active');
}

/* ──────────────────── Best score ──────────────── */
function getBest() { return parseInt(localStorage.getItem('tetrisBest')||'0'); }
function setBest(v) { localStorage.setItem('tetrisBest', v); }

function updateBestDisplay() {
  const b = getBest();
  $('start-best').textContent = b;
  $('best-val').textContent   = b;
}
updateBestDisplay();

/* ══════════════════════════════════════════════════
   GAME STATE
══════════════════════════════════════════════════ */
let gameState  = null;
let rafId      = null;
let lastTime   = 0;
let dropTimer  = 0;
let lockTimer  = 0;
let paused     = false;
let animClearing = false;

const TYPES = ['I','O','T','S','Z','J','L'];

function randomBag() {
  const bag = [...TYPES];
  for (let i=bag.length-1;i>0;i--) {
    const j = Math.floor(Math.random()*(i+1));
    [bag[i],bag[j]] = [bag[j],bag[i]];
  }
  return bag;
}

function initGame() {
  gameState = {
    board:   Array.from({length:ROWS}, () => Array(COLS).fill(null)),
    score:   0,
    level:   1,
    lines:   0,
    bag:     randomBag(),
    nextBag: randomBag(),
    hold:    null,
    canHold: true,
    piece:   null,
    px:0, py:0, rot:0,
  };
  spawnPiece();
  updateUI();
}

function peek(gs, n) {
  const arr = [];
  let b = [...gs.bag], nb = [...gs.nextBag];
  for (let i=0; i<n; i++) {
    if (!b.length) { b = nb; nb = randomBag(); }
    arr.push(b.shift());
  }
  return arr;
}

function spawnPiece() {
  const gs = gameState;
  if (!gs.bag.length) { gs.bag = gs.nextBag; gs.nextBag = randomBag(); }
  gs.piece = gs.bag.shift();
  gs.rot   = 0;
  const shape = PIECES[gs.piece][gs.rot];
  gs.px = Math.floor((COLS - shape[0].length) / 2);
  gs.py = gs.piece === 'I' ? -1 : 0;

  if (!canPlace(gs, gs.px, gs.py, gs.rot)) {
    // 게임 오버
    endGame(); return;
  }
}

function canPlace(gs, px, py, rot) {
  const shape = PIECES[gs.piece][rot % PIECES[gs.piece].length];
  for (let r=0; r<shape.length; r++) {
    for (let c=0; c<shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = px+c, ny = py+r;
      if (nx<0||nx>=COLS||ny>=ROWS) return false;
      if (ny>=0 && gs.board[ny][nx]) return false;
    }
  }
  return true;
}

function lockPiece() {
  const gs = gameState;
  const shape = PIECES[gs.piece][gs.rot % PIECES[gs.piece].length];
  shape.forEach((row,r) => row.forEach((v,c) => {
    if (v) {
      const ny = gs.py+r, nx = gs.px+c;
      if (ny>=0) gs.board[ny][nx] = gs.piece;
    }
  }));
  SFX.lock();
  gs.canHold = true;
  clearLines();
}

function clearLines() {
  const gs = gameState;
  const full = [];
  for (let r=0; r<ROWS; r++) {
    if (gs.board[r].every(c=>c!==null)) full.push(r);
  }
  if (full.length === 0) { spawnPiece(); renderAll(); return; }

  // 라인 클리어 애니메이션
  animClearing = true;
  let flash = 0;
  const flashInterval = setInterval(() => {
    flash++;
    full.forEach(r => {
      for (let c=0;c<COLS;c++) {
        const x=c*BS, y=r*BS;
        if (flash%2===0) {
          ctx.fillStyle='#ffffff';
        } else {
          ctx.fillStyle = gs.board[r][c] ? COLORS[gs.board[r][c]] : '#000';
        }
        ctx.fillRect(x,y,BS,BS);
      }
    });
    if (flash >= 5) {
      clearInterval(flashInterval);
      animClearing = false;
      applyLineClear(full);
    }
  }, 60);
}

function applyLineClear(full) {
  const gs = gameState;
  full.forEach(r => {
    gs.board.splice(r,1);
    gs.board.unshift(Array(COLS).fill(null));
  });

  const n = full.length;
  const add = SCORE_TABLE[n] * gs.level;
  gs.score += add;
  gs.lines += n;

  const prevLevel = gs.level;
  gs.level = Math.floor(gs.lines / 10) + 1;

  if (n === 4) {
    SFX.tetris(); launchConfetti(200); flashScreen('#00ffe7');
  } else {
    SFX.clear1();
    if (n >= 2) launchConfetti(60);
  }

  if (gs.level > prevLevel) {
    SFX.levelup(); showLevelup(gs.level); flashScreen('#ffe60044');
  }

  updateUI();
  spawnPiece();
  renderAll();
}

/* ──────────────────── Move / Rotate ──────────────── */
function moveLeft()  { const gs=gameState; if(canPlace(gs,gs.px-1,gs.py,gs.rot)){gs.px--;SFX.move();lockTimer=0;renderAll();} }
function moveRight() { const gs=gameState; if(canPlace(gs,gs.px+1,gs.py,gs.rot)){gs.px++;SFX.move();lockTimer=0;renderAll();} }
function softDrop()  {
  const gs=gameState;
  if (canPlace(gs,gs.px,gs.py+1,gs.rot)) { gs.py++; gs.score+=1; SFX.soft(); renderAll(); }
  else { lockPiece(); }
}
function hardDrop() {
  const gs=gameState;
  let drop=0;
  while(canPlace(gs,gs.px,gs.py+1,gs.rot)){gs.py++;drop++;}
  gs.score += drop*2;
  SFX.hard();
  lockPiece();
  renderAll();
}
function rotateCW()  { tryRotate(1);  }
function rotateCCW() { tryRotate(-1); }

function tryRotate(dir) {
  const gs = gameState;
  const total = PIECES[gs.piece].length;
  const newRot = ((gs.rot + dir) % total + total) % total;
  const kicks  = (gs.piece==='I' ? KICKS.I : KICKS.normal)[gs.rot];
  for (const [dx,dy] of kicks) {
    if (canPlace(gs, gs.px+dx, gs.py+dy, newRot)) {
      gs.px += dx; gs.py += dy; gs.rot = newRot;
      SFX.rotate(); lockTimer=0; renderAll(); return;
    }
  }
}

function holdPiece() {
  const gs = gameState;
  if (!gs.canHold) return;
  SFX.hold();
  if (gs.hold === null) {
    gs.hold = gs.piece;
    spawnPiece();
  } else {
    const tmp  = gs.hold;
    gs.hold    = gs.piece;
    gs.piece   = tmp;
    gs.rot     = 0;
    const shape = PIECES[gs.piece][0];
    gs.px = Math.floor((COLS - shape[0].length)/2);
    gs.py = 0;
  }
  gs.canHold = false;
  renderAll();
}

/* ──────────────────── Ghost ──────────────────── */
function ghostY() {
  const gs = gameState;
  let gy = gs.py;
  while (canPlace(gs, gs.px, gy+1, gs.rot)) gy++;
  return gy;
}

/* ──────────────────── Render ──────────────────── */
function drawBlock(c, x, y, size, type='solid', alpha=1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  if (type === 'ghost') {
    ctx.strokeStyle = COLORS[c];
    ctx.lineWidth   = 2;
    ctx.setLineDash([4,4]);
    ctx.strokeRect(x+1, y+1, size-2, size-2);
  } else {
    // 메인 블록
    ctx.fillStyle = COLORS[c];
    ctx.shadowColor = GLOW[c];
    ctx.shadowBlur  = 14;
    ctx.fillRect(x+1, y+1, size-2, size-2);
    // 하이라이트
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(x+2, y+2, size-4, 5);
    ctx.fillRect(x+2, y+2, 5, size-4);
    // 테두리
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x+1, y+1, size-2, size-2);
  }
  ctx.restore();
}

function drawMiniBlock(mCtx, c, x, y, size) {
  mCtx.fillStyle = COLORS[c];
  mCtx.shadowColor = GLOW[c];
  mCtx.shadowBlur  = 8;
  mCtx.fillRect(x+1, y+1, size-2, size-2);
  mCtx.shadowBlur = 0;
  mCtx.fillStyle = 'rgba(255,255,255,0.2)';
  mCtx.fillRect(x+1, y+1, size-2, 3);
}

function render() {
  const gs  = gameState;
  if (!gs)  return;

  ctx.clearRect(0,0,gameCanvas.width,gameCanvas.height);

  // 그리드 배경
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 0.5;
  for (let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++) {
    ctx.strokeRect(c*BS, r*BS, BS, BS);
  }

  // 배치된 블록
  for (let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++) {
    if (gs.board[r][c]) drawBlock(gs.board[r][c], c*BS, r*BS, BS);
  }

  if (!gs.piece) return;

  // 고스트
  const gy = ghostY();
  const shape = PIECES[gs.piece][gs.rot % PIECES[gs.piece].length];
  if (gy !== gs.py) {
    shape.forEach((row,r) => row.forEach((v,c) => {
      if (v) drawBlock(gs.piece, (gs.px+c)*BS, (gy+r)*BS, BS, 'ghost', 0.5);
    }));
  }

  // 현재 블록
  shape.forEach((row,r) => row.forEach((v,c) => {
    if (v && gs.py+r >= 0) drawBlock(gs.piece, (gs.px+c)*BS, (gs.py+r)*BS, BS);
  }));
}

function renderNext() {
  const gs = gameState;
  nextCtx.clearRect(0,0,nextCanvas.width,nextCanvas.height);
  const previews = peek(gs, 3);
  const ms = 22;
  previews.forEach((type, idx) => {
    const shape = PIECES[type][0];
    const rows  = shape.length, cols = shape[0].length;
    const ox = Math.floor((4 - cols)/2) * ms + 8;
    const oy = idx * 90 + Math.floor((4 - rows)/2) * ms + 8;
    shape.forEach((row,r) => row.forEach((v,c) => {
      if (v) drawMiniBlock(nextCtx, type, ox+c*ms, oy+r*ms, ms);
    }));
  });
}

function renderHold() {
  holdCtx.clearRect(0,0,holdCanvas.width,holdCanvas.height);
  const gs = gameState;
  if (!gs.hold) return;
  const shape = PIECES[gs.hold][0];
  const ms = 22, rows = shape.length, cols = shape[0].length;
  const ox = Math.floor((4-cols)/2)*ms + 8;
  const oy = Math.floor((3-rows)/2)*ms + 8;
  holdCtx.globalAlpha = gs.canHold ? 1 : 0.35;
  shape.forEach((row,r) => row.forEach((v,c) => {
    if (v) drawMiniBlock(holdCtx, gs.hold, ox+c*ms, oy+r*ms, ms);
  }));
  holdCtx.globalAlpha = 1;
}

function renderAll() { render(); renderNext(); renderHold(); }

function updateUI() {
  const gs = gameState;
  $('score-val').textContent = gs.score.toLocaleString();
  $('level-val').textContent = gs.level;
  $('lines-val').textContent = gs.lines;
  const best = Math.max(getBest(), gs.score);
  $('best-val').textContent  = best.toLocaleString();
}

/* ──────────────────── Game Loop ─────────────────── */
function gameLoop(ts) {
  if (paused || animClearing) { rafId=requestAnimationFrame(gameLoop); return; }
  const dt = ts - lastTime;
  lastTime = ts;

  const gs    = gameState;
  const delay = getLockDelay(gs.level);

  if (canPlace(gs, gs.px, gs.py+1, gs.rot)) {
    dropTimer += dt;
    lockTimer  = 0;
    if (dropTimer >= delay) { gs.py++; dropTimer=0; renderAll(); }
  } else {
    lockTimer += dt;
    if (lockTimer >= 500) { lockTimer=0; lockPiece(); renderAll(); }
  }

  rafId = requestAnimationFrame(gameLoop);
}

function startGame() {
  paused = false; dropTimer=0; lockTimer=0; lastTime=0;
  if (rafId) cancelAnimationFrame(rafId);
  initGame();
  showScreen('game-screen');
  resizeAll();
  render(); renderNext(); renderHold();
  rafId = requestAnimationFrame(ts => { lastTime=ts; rafId=requestAnimationFrame(gameLoop); });
}

function endGame() {
  const gs = gameState;
  if (rafId) cancelAnimationFrame(rafId);
  SFX.gameover();

  const best = getBest();
  const isNew = gs.score > best;
  if (isNew) { setBest(gs.score); launchConfetti(180); }

  $('over-score').textContent = gs.score.toLocaleString();
  $('over-best').textContent  = Math.max(best, gs.score).toLocaleString();
  $('over-lines').textContent = gs.lines;
  $('over-level').textContent = gs.level;
  $('new-record').classList.toggle('show', isNew);

  showScreen('over-screen');
  updateBestDisplay();
}

function togglePause() {
  paused = !paused;
  $('pause-overlay').classList.toggle('visible', paused);
}

/* ──────────────────── Input ─────────────────────── */
let dasDelay = 0, dasInterval = 0;
let dasDir   = 0, dasTimer = 0;
const DAS_DELAY = 150, DAS_SPEED = 50;

const keyMap = {
  ArrowLeft:  () => moveLeft(),
  ArrowRight: () => moveRight(),
  ArrowDown:  () => softDrop(),
  ArrowUp:    () => rotateCW(),
  'z': () => rotateCW(),
  'Z': () => rotateCW(),
  'x': () => rotateCCW(),
  'X': () => rotateCCW(),
  ' ':        () => hardDrop(),
  'c': () => holdPiece(),
  'C': () => holdPiece(),
  'p': () => togglePause(),
  'P': () => togglePause(),
  Escape:     () => togglePause(),
};

document.addEventListener('keydown', e => {
  if (!gameState || !['game-screen'].includes(document.querySelector('.screen.active')?.id)) return;
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') e.preventDefault();
  if (e.key === 'ArrowDown' || e.key === ' ') e.preventDefault();
  if (keyMap[e.key]) keyMap[e.key]();
});

/* ──────────────────── D-Pad buttons ─────────────── */
function dpadBind(id, fn) {
  const el = $(id);
  if (!el) return;
  el.addEventListener('pointerdown', e => { e.preventDefault(); if(gameState && !paused) fn(); });
}
dpadBind('dpad-left',  moveLeft);
dpadBind('dpad-right', moveRight);
dpadBind('dpad-down',  softDrop);
dpadBind('dpad-drop',  hardDrop);
dpadBind('dpad-rcw',   rotateCW);
dpadBind('dpad-rccw',  rotateCCW);
dpadBind('dpad-hold',  holdPiece);

/* ──────────────────── Touch (swipe on board) ──────── */
let touchStartX=0, touchStartY=0, touchMoved=false;
gameCanvas.addEventListener('touchstart', e => {
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
  touchMoved  = false;
}, {passive:true});
gameCanvas.addEventListener('touchend', e => {
  if (!gameState || paused) return;
  const dx = e.changedTouches[0].clientX - touchStartX;
  const dy = e.changedTouches[0].clientY - touchStartY;
  const adx= Math.abs(dx), ady= Math.abs(dy);
  if (adx < 10 && ady < 10) { rotateCW(); return; } // tap
  if (adx > ady) { dx < 0 ? moveLeft() : moveRight(); }
  else           { dy > 0 ? hardDrop() : holdPiece(); }
}, {passive:true});

/* ──────────────────── Buttons ───────────────────── */
$('btn-start').addEventListener('click',   () => startGame());
$('btn-restart').addEventListener('click', () => startGame());
$('btn-menu').addEventListener('click',    () => {
  if (rafId) cancelAnimationFrame(rafId);
  gameState = null;
  showScreen('start-screen');
  updateBestDisplay();
});
