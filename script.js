// ==========================================
// グローバル変数・状態管理
// ==========================================
let currentStage = 0;
let correctStageCount = 0;
let stageStartTime = 0;

// 背景パーティクル
const canvas = document.getElementById('matrix-bg');
const ctx = canvas.getContext('2d');
let particles = [];
const particleCount = 40;

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
// 画面切り替え & 全画面フィードバック表示
// ==========================================
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(screenId);
    if (target) target.classList.add('active');
}

function showFeedback(isSuccess, detailText, callback) {
    const overlay = document.getElementById('feedback-overlay');
    const textElem = document.getElementById('feedback-text');
    const subElem = document.getElementById('feedback-sub');

    overlay.className = 'feedback-overlay ' + (isSuccess ? 'success' : 'failed');
    textElem.innerText = isSuccess ? '成功' : '失敗';
    subElem.innerText = detailText || (isSuccess ? 'STAGE CLEAR' : 'STAGE FAILED');

    overlay.style.display = 'flex';

    setTimeout(() => {
        overlay.style.display = 'none';
        if (callback) callback();
    }, 1200);
}

function startGame() {
    currentStage = 1;
    correctStageCount = 0;
    updateStageCounter();
    showScreen('stage-1');
    initStage1();
}

function updateStageCounter() {
    const counter = document.getElementById('stage-counter');
    if (counter) counter.innerText = `STAGE ${currentStage} / 5`;
}

function nextStage() {
    currentStage++;
    updateStageCounter();
    
    if (currentStage > 5) {
        startLoadingToResult();
    } else {
        showScreen(`stage-${currentStage}`);
        initCurrentStage();
    }
}

function initCurrentStage() {
    switch(currentStage) {
        case 2: initStage2(); break;
        case 3: initStage3(); break;
        case 4: initStage4(); break;
        case 5: initStage5(); break;
    }
}

// ==========================================
// STAGE 1: 再起動ノード
// ==========================================
let rebootTargetCount = 3;
let rebootCurrentCount = 0;

function initStage1() {
    rebootCurrentCount = 0;
    const grid = document.getElementById('reboot-grid');
    grid.innerHTML = '';
    
    for (let i = 0; i < 4; i++) {
        const btn = document.createElement('button');
        btn.className = 'reboot-node';
        btn.innerText = `NODE 0${i + 1}`;
        btn.onclick = () => handleRebootClick(btn);
        grid.appendChild(btn);
    }
    highlightRandomNode();
}

function highlightRandomNode() {
    const nodes = document.querySelectorAll('.reboot-node');
    nodes.forEach(n => n.classList.remove('lit'));
    const randomIndex = Math.floor(Math.random() * nodes.length);
    nodes[randomIndex].classList.add('lit');
}

function handleRebootClick(btn) {
    if (btn.classList.contains('lit')) {
        rebootCurrentCount++;
        btn.classList.add('tapped');
        setTimeout(() => btn.classList.remove('tapped'), 100);
        
        if (rebootCurrentCount >= rebootTargetCount) {
            correctStageCount++;
            showFeedback(true, "CLEAR", () => nextStage());
        } else {
            highlightRandomNode();
        }
    } else {
        showFeedback(false, "ERROR", () => nextStage());
    }
}

// ==========================================
// STAGE 2: 反射測定（タイム秒数表示）
// ==========================================
let reflexTimeout = null;
let reflexReady = false;

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
        stageStartTime = Date.now();
    }, randomDelay);
}

function handleReflexClick() {
    const box = document.getElementById('reflex-box');
    const timeDisplay = document.getElementById('reflex-time-display');

    if (reflexReady) {
        const reactionTimeMs = Date.now() - stageStartTime;
        const reactionTimeSec = (reactionTimeMs / 1000).toFixed(3);
        
        timeDisplay.innerText = `反応時間: ${reactionTimeSec} 秒`;
        clearTimeout(reflexTimeout);

        const isSuccess = reactionTimeMs < 600;
        if (isSuccess) correctStageCount++;

        setTimeout(() => {
            showFeedback(isSuccess, `${reactionTimeSec} 秒`, () => nextStage());
        }, 500);

    } else {
        box.innerText = 'フライング！';
        clearTimeout(reflexTimeout);
        showFeedback(false, "早すぎます！", () => nextStage());
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
        showFeedback(isCorrect, "", () => nextStage());
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
    showFeedback(isSuccess, `誤差: ${Math.abs(currentFreq - targetFreq)}`, () => nextStage());
}

// ==========================================
// STAGE 5: パス解析
// ==========================================
let currentPathInput = "";

function initStage5() {
    currentPathInput = "";
    document.getElementById('path-input-display').innerText = "---";
}

function addPathInput(dir) {
    if (currentPathInput.length < 3) {
        currentPathInput += dir;
        document.getElementById('path-input-display').innerText = currentPathInput;
    }
}

function resetPathInput() {
    currentPathInput = "";
    document.getElementById('path-input-display').innerText = "---";
}

function submitPath() {
    const isSuccess = (currentPathInput === "→↓→" || currentPathInput.length === 3);
    if (isSuccess) correctStageCount++;
    showFeedback(isSuccess, "", () => nextStage());
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

    const percent = Math.round((correctStageCount / 5) * 100);
    document.getElementById('correct-count').innerText = correctStageCount;
    document.getElementById('score-percent').innerText = `${percent}%`;

    let rank = 'RANK C';
    if (percent === 100) rank = 'RANK S';
    else if (percent >= 80) rank = 'RANK A';
    else if (percent >= 60) rank = 'RANK B';

    document.getElementById('score-rank').innerText = rank;
}

// ==========================================
// 管理者モニタ画面（画像レイアウト再現）
// ==========================================
function showAdminScreen() {
    showScreen('screen-admin');
    const container = document.getElementById('screen-admin');

    const nodes = [
        { name: "NODE 1 [ALPHA]", status: "ONLINE", title: "使用中 (IN USE)", state: "STAGE 3 実行中", diff: "NORMAL", timer: "01:24" },
        { name: "NODE 2 [BETA]", status: "OFFLINE", title: "空室 (EMPTY)", state: "待機中 (IDLE)", diff: "--", timer: "--" },
        { name: "NODE 3 [CORE]", status: "OFFLINE", title: "空室 (EMPTY)", state: "待機中 (IDLE)", diff: "--", timer: "--" }
    ];

    let html = `
        <div class="admin-container">
            <div class="admin-header">
                <div class="admin-title">全AI防壁 自律稼働状況モニタ</div>
                <button class="btn btn-accent" style="padding: 6px 12px; font-size: 0.9rem;" onclick="startGame()">画面へ戻る</button>
            </div>
            <div class="admin-grid">
    `;

    nodes.forEach(node => {
        const isOnline = node.status === 'ONLINE';
        html += `
            <div class="node-card">
                <div class="node-header">
                    <span class="node-name">${node.name}</span>
                    <span class="node-status-badge ${isOnline ? 'online' : 'offline'}">● ${node.status}</span>
                </div>
                <div class="node-main-status">${node.title}</div>
                <div class="node-sub-status">${node.state}</div>
                <div class="node-meta-grid">
                    <div>
                        <div class="node-meta-item">難易度</div>
                        <div class="node-meta-value">${node.diff}</div>
                    </div>
                    <div>
                        <div class="node-meta-item">タイマー</div>
                        <div class="node-meta-value">${node.timer}</div>
                    </div>
                </div>
            </div>
        `;
    });

    html += `</div></div>`;
    container.innerHTML = html;
}
