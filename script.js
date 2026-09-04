// ==========================================
// グローバル変数・状態管理
// ==========================================
let totalQuestions = 12; // 全12問
let currentQuestionIndex = 0; // 0 ~ 11
let correctStageCount = 0;

// アカウント/端末管理
let currentAccountName = "OPERATOR-01";
let gameStartTime = null;
let timerInterval = null;
let elapsedTimeSec = 0;

// 背景パーティクル
const canvas = document.getElementById('matrix-bg');
const ctx = canvas.getContext('2d');
let particles = [];
const particleCount = 40;

// ステージ進行順序 (各ステージ3回ずつ＝計12問)
const stageOrder = [1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4];

// ==========================================
// 背景パーティクル（赤系統一）
// ==========================================
function initCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    particles = [];
    for (let i = 0; i < particleCount; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * 1.5,
            vy: (Math.random() - 0.5) * 1.5,
            radius: Math.random() * 2 + 1,
            color: Math.random() > 0.4 ? '#ff1133' : '#ff5566'
        });
    }
}

function drawParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#ff1133';
        ctx.fill();
    });
    requestAnimationFrame(drawParticles);
}

window.addEventListener('resize', initCanvas);
window.addEventListener('DOMContentLoaded', () => {
    initCanvas();
    drawParticles();
});

// ==========================================
// 画面切り替え & 全画面フィードバック（0.3秒待機＋フェードイン）
// ==========================================
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(screenId);
    if (target) target.classList.add('active');
}

function showFeedback(isSuccess, detailText, callback) {
    // 0.3秒間溜めてから、なめらかにフェードイン
    setTimeout(() => {
        const overlay = document.getElementById('feedback-overlay');
        const textElem = document.getElementById('feedback-text');
        const subElem = document.getElementById('feedback-sub');

        overlay.className = 'feedback-overlay ' + (isSuccess ? 'success' : 'failed');
        textElem.innerText = isSuccess ? '成功' : '失敗';
        subElem.innerText = detailText || (isSuccess ? 'STAGE CLEAR' : 'STAGE FAILED');

        // フェードイン適用
        overlay.classList.add('show');

        // 表示後1.2秒でフェードアウトして次へ
        setTimeout(() => {
            overlay.classList.remove('show');
            setTimeout(() => {
                if (callback) callback();
            }, 400); // フェードアウト待ち時間
        }, 1200);

    }, 300);
}

// ==========================================
// ゲーム制御 & タイマー処理
// ==========================================
function startGame() {
    const inputVal = document.getElementById('account-name-input').value.trim();
    if (inputVal !== "") {
        currentAccountName = inputVal;
    } else {
        currentAccountName = "OPERATOR-" + Math.floor(Math.random() * 89 + 10);
    }

    currentQuestionIndex = 0;
    correctStageCount = 0;
    elapsedTimeSec = 0;

    // リアルタイムタイマー開始
    if (timerInterval) clearInterval(timerInterval);
    gameStartTime = Date.now();
    timerInterval = setInterval(() => {
        elapsedTimeSec = Math.floor((Date.now() - gameStartTime) / 1000);
    }, 1000);

    updateStageCounter();
    loadCurrentQuestion();
}

function updateStageCounter() {
    const counter = document.getElementById('stage-counter');
    if (counter) counter.innerText = `STAGE ${currentQuestionIndex + 1} / ${totalQuestions}`;
}

function nextQuestion() {
    currentQuestionIndex++;
    if (currentQuestionIndex >= totalQuestions) {
        clearInterval(timerInterval);
        startLoadingToResult();
    } else {
        updateStageCounter();
        loadCurrentQuestion();
    }
}

function loadCurrentQuestion() {
    const stageType = stageOrder[currentQuestionIndex];
    showScreen(`stage-${stageType}`);
    
    switch(stageType) {
        case 1: initStage1(); break;
        case 2: initStage2(); break;
        case 3: initStage3(); break;
        case 4: initStage4(); break;
    }
}

function formatTimer(totalSec) {
    const m = Math.floor(totalSec / 60).toString().padStart(2, '0');
    const s = (totalSec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

// ==========================================
// STAGE 1: ボタン順番記憶（提示 ➔ 入力）
// ==========================================
let stage1Sequence = [];
let stage1UserInputs = [];
let isStage1AcceptingInput = false;

function initStage1() {
    const grid = document.getElementById('reboot-grid');
    const instruction = document.getElementById('stage1-instruction');
    grid.innerHTML = '';
    stage1Sequence = [];
    stage1UserInputs = [];
    isStage1AcceptingInput = false;

    instruction.innerText = "光るボタンの順番を記憶せよ";

    // BUTTON 1〜4 を作成
    for (let i = 0; i < 4; i++) {
        const btn = document.createElement('button');
        btn.className = 'reboot-node';
        btn.innerText = `BUTTON 0${i + 1}`;
        btn.dataset.index = i;
        btn.onclick = () => handleStage1Click(i, btn);
        grid.appendChild(btn);
    }

    // ランダムに3つのボタンの順番を作成
    while (stage1Sequence.length < 3) {
        const randomIndex = Math.floor(Math.random() * 4);
        stage1Sequence.push(randomIndex);
    }

    // 最初に見本を順に点灯させる
    setTimeout(() => {
        playStage1Sequence(0);
    }, 600);
}

function playStage1Sequence(stepIndex) {
    const nodes = document.querySelectorAll('.reboot-node');
    const instruction = document.getElementById('stage1-instruction');

    if (stepIndex < stage1Sequence.length) {
        const nodeIndex = stage1Sequence[stepIndex];
        nodes[nodeIndex].classList.add('lit');
        
        setTimeout(() => {
            nodes[nodeIndex].classList.remove('lit');
            setTimeout(() => {
                playStage1Sequence(stepIndex + 1);
            }, 300);
        }, 600);
    } else {
        instruction.innerText = "記憶した順番通りにボタンを押せ！";
        isStage1AcceptingInput = true;
    }
}

function handleStage1Click(index, btn) {
    if (!isStage1AcceptingInput) return;

    btn.classList.add('tapped');
    setTimeout(() => btn.classList.remove('tapped'), 150);

    stage1UserInputs.push(index);

    const currentStep = stage1UserInputs.length - 1;
    if (stage1UserInputs[currentStep] !== stage1Sequence[currentStep]) {
        // 間違えた時点で失敗
        isStage1AcceptingInput = false;
        showFeedback(false, "SEQUENCE ERROR", () => nextQuestion());
        return;
    }

    // 全て正しく押した場合
    if (stage1UserInputs.length === stage1Sequence.length) {
        isStage1AcceptingInput = false;
        correctStageCount++;
        showFeedback(true, "CLEAR", () => nextQuestion());
    }
}

// ==========================================
// STAGE 2: 反射測定
// ==========================================
let reflexTimeout = null;
let reflexReady = false;
let reflexStartTime = 0;

function initStage2() {
    const box = document.getElementById('reflex-box');
    const timeDisplay = document.getElementById('reflex-time-display');
    box.innerText = 'WAIT...';
    box.classList.remove('active-push');
    timeDisplay.innerText = '';
    reflexReady = false;
    
    const randomDelay = Math.random() * 2000 + 1500;
    reflexTimeout = setTimeout(() => {
        reflexReady = true;
        box.innerText = 'PUSH!';
        box.classList.add('active-push');
        reflexStartTime = Date.now();
    }, randomDelay);
}

function handleReflexClick() {
    const box = document.getElementById('reflex-box');
    const timeDisplay = document.getElementById('reflex-time-display');

    if (reflexReady) {
        const reactionTimeMs = Date.now() - reflexStartTime;
        const reactionTimeSec = (reactionTimeMs / 1000).toFixed(3);
        
        timeDisplay.innerText = `反応時間: ${reactionTimeSec} 秒`;
        clearTimeout(reflexTimeout);

        const isSuccess = reactionTimeMs < 600;
        if (isSuccess) correctStageCount++;

        setTimeout(() => {
            showFeedback(isSuccess, `${reactionTimeSec} 秒`, () => nextQuestion());
        }, 500);

    } else {
        box.innerText = 'フライング！';
        clearTimeout(reflexTimeout);
        showFeedback(false, "早すぎます！", () => nextQuestion());
    }
}

// ==========================================
// STAGE 3: 記憶パターン照合
// ==========================================
let memorySequence = [];
let userSequence = [];

function initStage3() {
    const grid = document.getElementById('memory-grid');
    grid.innerHTML = '';
    memorySequence = [];
    userSequence = [];
    
    for (let i = 0; i < 16; i++) {
        const tile = document.createElement('div');
        tile.className = 'memory-tile';
        tile.dataset.index = i;
        tile.onclick = () => handleMemoryClick(i);
        grid.appendChild(tile);
    }
    
    while (memorySequence.length < 3) {
        const idx = Math.floor(Math.random() * 16);
        if (!memorySequence.includes(idx)) memorySequence.push(idx);
    }
    
    setTimeout(() => {
        const tiles = document.querySelectorAll('.memory-tile');
        memorySequence.forEach(idx => tiles[idx].classList.add('lit'));
        setTimeout(() => {
            tiles.forEach(t => t.classList.remove('lit'));
        }, 800);
    }, 400);
}

function handleMemoryClick(idx) {
    const tiles = document.querySelectorAll('.memory-tile');
    if (tiles[idx].classList.contains('lit')) return;
    
    tiles[idx].classList.add('lit');
    userSequence.push(idx);
    
    if (userSequence.length === memorySequence.length) {
        const isCorrect = memorySequence.every((val) => userSequence.includes(val));
        if (isCorrect) correctStageCount++;
        showFeedback(isCorrect, "", () => nextQuestion());
    }
}

// ==========================================
// STAGE 4: 周波数チューニング
// ==========================================
let targetFreq = 0;
let currentFreq = 0;

function initStage4() {
    targetFreq = Math.floor(Math.random() * 80) + 10;
    currentFreq = 0;
    document.getElementById('tune-target-val').innerText = targetFreq;
    document.getElementById('tune-current-val').innerText = currentFreq;
}

function adjustFrequency(amount) {
    currentFreq += amount;
    if (currentFreq < 0) currentFreq = 0;
    if (currentFreq > 99) currentFreq = 99;
    document.getElementById('tune-current-val').innerText = currentFreq;
}

function submitFrequency() {
    const isSuccess = Math.abs(currentFreq - targetFreq) <= 3;
    if (isSuccess) correctStageCount++;
    showFeedback(isSuccess, `誤差: ${Math.abs(currentFreq - targetFreq)}`, () => nextQuestion());
}

// ==========================================
// リザルト＆討伐ミッション表示
// ==========================================
function startLoadingToResult() {
    showScreen('screen-loading');
    const progressBar = document.getElementById('progress-bar');
    let progress = 0;
    
    const interval = setInterval(() => {
        progress += 5;
        progressBar.style.width = `${progress}%`;
        if (progress >= 100) {
            clearInterval(interval);
            setTimeout(showFinalResult, 300);
        }
    }, 50);
}

function showFinalResult() {
    showScreen('screen-result');

    const percent = Math.round((correctStageCount / totalQuestions) * 100);
    document.getElementById('correct-count').innerText = correctStageCount;
    document.getElementById('score-percent').innerText = `${percent}%`;

    let rank = 'RANK C';
    if (percent === 100) rank = 'RANK S';
    else if (percent >= 80) rank = 'RANK A';
    else if (percent >= 60) rank = 'RANK B';

    document.getElementById('score-rank').innerText = rank;
}

// ==========================================
// 管理者モニタ画面（現在アクティブな自端末のみ表示＆リアルタイム更新）
// ==========================================
let adminTimerInterval = null;

function showAdminScreen() {
    showScreen('screen-admin');
    renderAdminContent();

    if (adminTimerInterval) clearInterval(adminTimerInterval);
    adminTimerInterval = setInterval(() => {
        const timeElem = document.getElementById('admin-live-timer');
        if (timeElem) {
            timeElem.innerText = formatTimer(elapsedTimeSec);
        }
    }, 1000);
}

function renderAdminContent() {
    const container = document.getElementById('screen-admin');

    const currentStageNumber = currentQuestionIndex < totalQuestions ? stageOrder[currentQuestionIndex] : "COMPLETE";
    const currentProgressText = currentQuestionIndex < totalQuestions ? `STAGE ${currentQuestionIndex + 1} / ${totalQuestions} (Stage ${currentStageNumber})` : "全ミッション完了";

    let html = `
        <div class="admin-container">
            <div class="admin-header">
                <div class="admin-title">全AI防壁 自律稼働状況モニタ</div>
                <button class="btn btn-accent" style="padding: 6px 12px; font-size: 0.9rem;" onclick="startGame()">画面へ戻る</button>
            </div>
            <div class="admin-grid">
                <div class="node-card">
                    <div class="node-header">
                        <span class="node-name">${currentAccountName}</span>
                        <span class="node-status-badge online">● ONLINE</span>
                    </div>
                    <div class="node-main-status">使用中 (IN USE)</div>
                    <div class="node-sub-status">${currentProgressText}</div>
                    <div class="node-meta-grid">
                        <div>
                            <div class="node-meta-item">難易度</div>
                            <div class="node-meta-value">NORMAL</div>
                        </div>
                        <div>
                            <div class="node-meta-item">経過時間</div>
                            <div class="node-meta-value" id="admin-live-timer">${formatTimer(elapsedTimeSec)}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    container.innerHTML = html;
}
