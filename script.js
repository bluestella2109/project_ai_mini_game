// ==========================================
// 1. FIREBASE 初期設定
// ※ ご自身の Firebase コンソールの設定値に置き換えてください
// ==========================================
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Firebaseの初期化
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const DEVICES_COLLECTION = "project_ai_devices";

// ==========================================
// グローバル変数・状態管理
// ==========================================
let totalQuestions = 12;
let currentQuestionIndex = 0;
let correctStageCount = 0;

// 端末識別用ID
let deviceId = "DEV-" + Math.floor(Math.random() * 8999 + 1000);
let currentOwnerName = "未設定";
let gameStartTime = null;
let timerInterval = null;
let elapsedTimeSec = 0;

// 背景パーティクル
const canvas = document.getElementById('matrix-bg');
const ctx = canvas.getContext('2d');
let particles = [];
const particleCount = 40;

// ステージ進行順序 (各3回ずつ＝計12問)
const stageOrder = [1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4];

// 管理者画面のリアルタイム受信用リスト
let realTimeDevicesStore = {};
let unsubscribeAdminListener = null;

// ==========================================
// FIREBASE 通信処理 (Firestore)
// ==========================================

// 各iPad（子機）の現在の進捗をFirestoreへ保存/更新
function sendDeviceStateToFirebase() {
    const currentStageNumber = currentQuestionIndex < totalQuestions ? stageOrder[currentQuestionIndex] : "COMPLETE";
    const statusText = currentQuestionIndex < totalQuestions ? `STAGE ${currentQuestionIndex + 1} / ${totalQuestions} (Stage ${currentStageNumber})` : "全ミッション完了";

    const payload = {
        deviceId: deviceId,
        ownerName: currentOwnerName,
        statusText: statusText,
        elapsedTimeSec: elapsedTimeSec,
        lastActive: firebase.firestore.FieldValue.serverTimestamp()
    };

    // ドキュメントIDを deviceId に固定してアップサート
    db.collection(DEVICES_COLLECTION).doc(deviceId).set(payload, { merge: true })
        .catch(err => console.error("Firebase update error:", err));
}

// 管理者（親機）用：Firestoreの全端末データをリアルタイム購読
function setupAdminFirebaseListener() {
    if (unsubscribeAdminListener) unsubscribeAdminListener();

    unsubscribeAdminListener = db.collection(DEVICES_COLLECTION)
        .onSnapshot((snapshot) => {
            realTimeDevicesStore = {};
            snapshot.forEach((doc) => {
                realTimeDevicesStore[doc.id] = doc.data();
            });
            renderAdminContent();
        }, (error) => {
            console.error("Firebase listen error:", error);
        });
}

// ==========================================
// 背景パーティクル
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
// 画面切り替え & 全画面フィードバック
// ==========================================
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(screenId);
    if (target) target.classList.add('active');
}

function showFeedback(isSuccess, detailText, callback) {
    setTimeout(() => {
        const overlay = document.getElementById('feedback-overlay');
        const textElem = document.getElementById('feedback-text');
        const subElem = document.getElementById('feedback-sub');

        overlay.className = 'feedback-overlay ' + (isSuccess ? 'success' : 'failed');
        textElem.innerText = isSuccess ? '成功' : '失敗';
        subElem.innerText = detailText || (isSuccess ? 'STAGE CLEAR' : 'STAGE FAILED');

        overlay.classList.add('show');

        setTimeout(() => {
            overlay.classList.remove('show');
            setTimeout(() => {
                if (callback) callback();
            }, 400);
        }, 1200);

    }, 300);
}

// ==========================================
// モード選択 & ゲーム制御
// ==========================================
function goToModeSelection() {
    const inputVal = document.getElementById('account-name-input').value.trim();
    currentOwnerName = inputVal !== "" ? inputVal : "OPERATOR-01";
    showScreen('screen-mode-select');
}

function openAdminFromStart() {
    setupAdminFirebaseListener();
    showAdminScreen();
}

function startGame() {
    currentQuestionIndex = 0;
    correctStageCount = 0;
    elapsedTimeSec = 0;

    if (timerInterval) clearInterval(timerInterval);
    gameStartTime = Date.now();
    
    // 1秒ごとおよび状態更新ごとにFirebaseへ同期
    timerInterval = setInterval(() => {
        elapsedTimeSec = Math.floor((Date.now() - gameStartTime) / 1000);
        sendDeviceStateToFirebase();
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
    sendDeviceStateToFirebase();

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
// STAGE 1: ボタン順番記憶（5ステップ）
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

    instruction.innerText = "光るボタンの順番を記憶せよ（5回）";

    for (let i = 0; i < 4; i++) {
        const btn = document.createElement('button');
        btn.className = 'reboot-node';
        btn.innerText = `BUTTON 0${i + 1}`;
        btn.dataset.index = i;
        btn.onclick = () => handleStage1Click(i, btn);
        grid.appendChild(btn);
    }

    while (stage1Sequence.length < 5) {
        const randomIndex = Math.floor(Math.random() * 4);
        stage1Sequence.push(randomIndex);
    }

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
            }, 250);
        }, 500);
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
        isStage1AcceptingInput = false;
        showFeedback(false, "SEQUENCE ERROR", () => nextQuestion());
        return;
    }

    if (stage1UserInputs.length === stage1Sequence.length) {
        isStage1AcceptingInput = false;
        correctStageCount++;
        showFeedback(true, "CLEAR", () => nextQuestion());
    }
}

// ==========================================
// STAGE 2: 反射測定 / DON'T TOUCH (3回に1回)
// ==========================================
let reflexTimeout = null;
let reflexReady = false;
let reflexStartTime = 0;
let isDontTouchRound = false;
let dontTouchSuccessTimeout = null;

function initStage2() {
    const box = document.getElementById('reflex-box');
    const timeDisplay = document.getElementById('reflex-time-display');
    const instruction = document.getElementById('stage2-instruction');
    
    box.innerText = 'WAIT...';
    box.className = '';
    timeDisplay.innerText = '';
    reflexReady = false;

    isDontTouchRound = (currentQuestionIndex % 3 === 1);

    if (isDontTouchRound) {
        instruction.innerText = "指示に従え！「DON'T TOUCH」のときは押すな！";
    } else {
        instruction.innerText = "「PUSH!」が表示された瞬間に画面をタップせよ";
    }

    const randomDelay = Math.random() * 2000 + 1500;
    reflexTimeout = setTimeout(() => {
        reflexReady = true;
        reflexStartTime = Date.now();

        if (isDontTouchRound) {
            box.innerText = "DON'T TOUCH!";
            box.classList.add('active-dont-touch');

            dontTouchSuccessTimeout = setTimeout(() => {
                if (reflexReady) {
                    reflexReady = false;
                    correctStageCount++;
                    showFeedback(true, "AVOID SUCCESS", () => nextQuestion());
                }
            }, 1500);

        } else {
            box.innerText = 'PUSH!';
            box.classList.add('active-push');
        }
    }, randomDelay);
}

function handleReflexClick() {
    const box = document.getElementById('reflex-box');
    const timeDisplay = document.getElementById('reflex-time-display');

    if (reflexReady) {
        if (isDontTouchRound) {
            clearTimeout(dontTouchSuccessTimeout);
            reflexReady = false;
            showFeedback(false, "TOUCHED ERROR!", () => nextQuestion());
        } else {
            const reactionTimeMs = Date.now() - reflexStartTime;
            const reactionTimeSec = (reactionTimeMs / 1000).toFixed(3);
            
            timeDisplay.innerText = `反応時間: ${reactionTimeSec} 秒`;
            clearTimeout(reflexTimeout);

            const isSuccess = reactionTimeMs <= 1000;
            if (isSuccess) correctStageCount++;

            setTimeout(() => {
                showFeedback(isSuccess, `${reactionTimeSec} 秒`, () => nextQuestion());
            }, 500);
        }
    } else {
        box.innerText = 'フライング！';
        clearTimeout(reflexTimeout);
        if (dontTouchSuccessTimeout) clearTimeout(dontTouchSuccessTimeout);
        showFeedback(false, "早すぎます！", () => nextQuestion());
    }
}

// ==========================================
// STAGE 3: 記憶パターン照合（3〜7個のランダム）
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

    const targetCount = Math.floor(Math.random() * 5) + 3;

    while (memorySequence.length < targetCount) {
        const idx = Math.floor(Math.random() * 16);
        if (!memorySequence.includes(idx)) memorySequence.push(idx);
    }

    setTimeout(() => {
        const tiles = document.querySelectorAll('.memory-tile');
        memorySequence.forEach(idx => tiles[idx].classList.add('lit'));
        setTimeout(() => {
            tiles.forEach(t => t.classList.remove('lit'));
        }, 900);
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
    targetFreq = Math.floor(Math.random() * 701) + 300;
    currentFreq = 300;
    document.getElementById('tune-target-val').innerText = targetFreq;
    document.getElementById('tune-current-val').innerText = currentFreq;
}

function adjustFrequency(amount) {
    currentFreq += amount;
    if (currentFreq < 0) currentFreq = 0;
    if (currentFreq > 1500) currentFreq = 1500;
    document.getElementById('tune-current-val').innerText = currentFreq;
}

function submitFrequency() {
    const isSuccess = Math.abs(currentFreq - targetFreq) <= 5;
    if (isSuccess) correctStageCount++;
    showFeedback(isSuccess, `誤差: ${Math.abs(currentFreq - targetFreq)}`, () => nextQuestion());
}

// ==========================================
// リザルト表示
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
// 管理者画面 描画
// ==========================================
function showAdminScreen() {
    showScreen('screen-admin');
    renderAdminContent();
}

function renderAdminContent() {
    const container = document.getElementById('screen-admin');
    const activeDevices = Object.values(realTimeDevicesStore);

    let cardsHtml = '';
    if (activeDevices.length === 0) {
        cardsHtml = `<div style="color: #8a9bbd; grid-column: 1 / -1; text-align: center; padding: 40px;">現在アクセス中の端末はありません (待機中...)</div>`;
    } else {
        activeDevices.forEach(dev => {
            cardsHtml += `
                <div class="node-card">
                    <div class="node-header">
                        <span class="node-name">持ち主: ${dev.ownerName || '未設定'}</span>
                        <span class="node-status-badge online">● LIVE</span>
                    </div>
                    <div class="node-main-status">使用中 (IN USE)</div>
                    <div class="node-sub-status">${dev.statusText || '-'}</div>
                    <div class="node-meta-grid">
                        <div>
                            <div class="node-meta-item">端末ID</div>
                            <div class="node-meta-value">${dev.deviceId}</div>
                        </div>
                        <div>
                            <div class="node-meta-item">経過時間</div>
                            <div class="node-meta-value">${formatTimer(dev.elapsedTimeSec || 0)}</div>
                        </div>
                    </div>
                </div>
            `;
        });
    }

    const html = `
        <div class="admin-container">
            <div class="admin-header">
                <div class="admin-title">全AI防壁 リアルタイム接続モニタ (${activeDevices.length}台接続中)</div>
                <button class="btn btn-accent" style="padding: 6px 12px; font-size: 0.9rem;" onclick="location.reload()">トップへ戻る</button>
            </div>
            <div class="admin-grid">
                ${cardsHtml}
            </div>
        </div>
    `;

    container.innerHTML = html;
}
