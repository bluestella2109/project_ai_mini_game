// ==========================================
// グローバル変数・状態管理
// ==========================================
let currentStage = 0;
let correctStageCount = 0;
let timerInterval = null;
let stageStartTime = 0;

// 背景アニメーション用
const canvas = document.getElementById('matrix-bg');
const ctx = canvas.getContext('2d');
let particles = [];
const particleCount = 40;

// ==========================================
// 初期化＆背景パーティクル（赤系統一）
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
            color: Math.random() > 0.4 ? '#ff1133' : '#ff5566' // 赤・朱系のみ
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
// 画面切り替え制御
// ==========================================
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(screenId);
    if (target) target.classList.add('active');
}

// ゲーム開始
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
// STAGE 1: 再起動ノード連打
// ==========================================
let rebootTargetCount = 5;
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
            nextStage();
        } else {
            highlightRandomNode();
        }
    }
}

// ==========================================
// STAGE 2: 反射測定
// ==========================================
let reflexTimeout = null;
let reflexReady = false;

function initStage2() {
    const box = document.getElementById('reflex-box');
    box.innerText = 'WAIT...';
    box.classList.remove('active-push');
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
    if (reflexReady) {
        const reactionTime = Date.now() - stageStartTime;
        if (reactionTime < 600) {
            correctStageCount++;
        }
        clearTimeout(reflexTimeout);
        nextStage();
    } else {
        box.innerText = 'TOO FAST!';
        clearTimeout(reflexTimeout);
        setTimeout(initStage2, 1000);
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
    
    // 3つのランダム位置を生成
    while (memorySequence.length < 3) {
        const idx = Math.floor(Math.random() * 16);
        if (!memorySequence.includes(idx)) memorySequence.push(idx);
    }
    
    // パターンを一瞬点灯
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
        const isCorrect = memorySequence.every((val, i) => userSequence.includes(val));
        if (isCorrect) correctStageCount++;
        setTimeout(nextStage, 300);
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
    if (Math.abs(currentFreq - targetFreq) <= 3) {
        correctStageCount++;
    }
    nextStage();
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
    if (currentPathInput.length === 3) {
        correctStageCount++; // 簡易解答判定
        nextStage();
    }
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

    // 「教室でAIを討伐せよ」のミッション表示を生成・更新
    let missionElem = document.getElementById('mission-instruction');
    if (!missionElem) {
        missionElem = document.createElement('div');
        missionElem.id = 'mission-instruction';
        missionElem.className = 'mission-instruction';
        const scoreBox = document.querySelector('.result-score-box');
        if (scoreBox) scoreBox.appendChild(missionElem);
    }
    
    missionElem.innerText = '【FINAL MISSION】教室へ向かい、暴走AIを討伐せよ！';
}
