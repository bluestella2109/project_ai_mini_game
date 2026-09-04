// --- Firebase 設定 ---
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

let db = null;
if (firebaseConfig.apiKey !== "YOUR_API_KEY") {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
}

// マトリックス背景アニメーション
const canvas = document.getElementById('matrix-bg');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const alphabet = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const fontSize = 14;
const columns = canvas.width / fontSize;
const rainDrops = Array(Math.floor(columns)).fill(1);

function renderMatrix() {
    ctx.fillStyle = 'rgba(3, 8, 20, 0.08)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#00f0ff';
    ctx.font = fontSize + 'px monospace';

    for (let i = 0; i < rainDrops.length; i++) {
        const text = alphabet.charAt(Math.floor(Math.random() * alphabet.length));
        ctx.fillText(text, i * fontSize, rainDrops[i] * fontSize);
        if (rainDrops[i] * fontSize > canvas.height && Math.random() > 0.975) {
            rainDrops[i] = 0;
        }
        rainDrops[i]++;
    }
}
setInterval(renderMatrix, 30);

// グローバル変数
let playerName = "未設定";
let deviceId = 'DEV-' + Math.floor(1000 + Math.random() * 9000);
let currentStageIndex = 0;
let correctStageCount = 0; // 一発正解カウント
let stageFirstTry = true;
let startTime = Date.now();
let stageQueue = [];

const NODE_NAMES = ['CORE', 'MEMORY', 'POWER', 'NETWORK', 'SYSTEM', 'DATA', 'LOGIC', 'NEURAL'];
const GAME_NAMES = {
    'g1': 'SYSTEM REBOOT',
    'g2': 'NEURAL REFLEX',
    'g3': 'MEMORY CORE'
};

function setScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

function updateState(statusText, missionName = '-') {
    document.getElementById('player-display').innerText = `プレイヤー // ${playerName}`;
    document.getElementById('stage-counter').innerText = `ステージ ${currentStageIndex}/12`;
    document.getElementById('status-badge').innerText = statusText;
    
    const sessionData = {
        name: playerName,
        status: statusText,
        mission: missionName,
        stage: currentStageIndex,
        time: startTime,
        lastActive: Date.now()
    };

    if (db) {
        db.collection("terminal_sessions").doc(deviceId).set(sessionData);
    }
    
    const localData = JSON.parse(localStorage.getItem('ai_admin_sync') || '{}');
    localData[deviceId] = sessionData;
    localStorage.setItem('ai_admin_sync', JSON.stringify(localData));
}

function goToNameInput() {
    setScreen('screen-name');
}

function submitName() {
    const input = document.getElementById('player-name-input').value.trim();
    if (!input) {
        alert("名前を入力してください。");
        return;
    }
    playerName = input;
    startClientMode();
}

function startClientMode() {
    setScreen('screen-start');
    updateState('準備完了', '待機中');
    correctStageCount = 0;
    buildStageQueue();
}

function buildStageQueue() {
    const g1 = [1, 2, 3, 4].sort(() => Math.random() - 0.5);
    const g2 = [1, 2, 3, 4].sort(() => Math.random() - 0.5);
    const g3 = [1, 2, 3, 4].sort(() => Math.random() - 0.5);
    
    stageQueue = [];
    for (let i = 0; i < 4; i++) {
        stageQueue.push({ type: 'g1', level: g1[i] });
        stageQueue.push({ type: 'g2', level: g2[i] });
        stageQueue.push({ type: 'g3', level: g3[i] });
    }
    stageQueue.sort(() => Math.random() - 0.5);
}

function nextStage() {
    if (currentStageIndex >= 12) {
        triggerEmergencyMode();
        return;
    }
    const stage = stageQueue[currentStageIndex];
    currentStageIndex++;
    stageFirstTry = true;

    if (stage.type === 'g1') runG1(stage.level);
    else if (stage.type === 'g2') runG2(stage.level);
    else if (stage.type === 'g3') runG3(stage.level);
}

// --- GAME 1: REBOOT ---
let g1Seq = [];
let g1Step = 0;
let g1AcceptInput = false;

function runG1(level) {
    setScreen('screen-g1');
    updateState(`プレイ中 (${currentStageIndex}/12)`, GAME_NAMES['g1']);
    g1AcceptInput = false;
    g1Step = 0;

    const grid = document.getElementById('g1-nodes');
    grid.innerHTML = '';
    
    const names = [...NODE_NAMES].sort(() => Math.random() - 0.5).slice(0, 4);
    names.forEach(name => {
        const btn = document.createElement('button');
        btn.className = 'reboot-node';
        btn.innerText = name;
        btn.onclick = () => onG1NodeClick(btn, name);
        grid.appendChild(btn);
    });

    const seqLength = 2 + level; 
    g1Seq = [];
    for (let i = 0; i < seqLength; i++) {
        g1Seq.push(names[Math.floor(Math.random() * names.length)]);
    }

    document.getElementById('g1-status').innerText = '位置と順番を覚えてください';
    let idx = 0;
    const timer = setInterval(() => {
        if (idx >= g1Seq.length) {
            clearInterval(timer);
            document.getElementById('g1-status').innerText = '順序通りにタップしてください';
            g1AcceptInput = true;
            return;
        }
        flashG1Node(g1Seq[idx]);
        idx++;
    }, 700);
}

function flashG1Node(name) {
    const nodes = document.querySelectorAll('.reboot-node');
    nodes.forEach(n => {
        if (n.innerText === name) {
            n.classList.add('lit');
            setTimeout(() => n.classList.remove('lit'), 400);
        }
    });
}

function onG1NodeClick(element, name) {
    if (!g1AcceptInput) return;

    element.classList.add('tapped');
    setTimeout(() => element.classList.remove('tapped'), 150);

    if (name === g1Seq[g1Step]) {
        g1Step++;
        if (g1Step >= g1Seq.length) {
            if (stageFirstTry) correctStageCount++;
            g1AcceptInput = false;
            setTimeout(nextStage, 600);
        }
    } else {
        stageFirstTry = false;
        g1Step = 0;
        document.getElementById('g1-status').innerText = 'エラー！再試行中...';
        g1AcceptInput = false;
        setTimeout(() => runG1(stageQueue[currentStageIndex - 1].level), 1000);
    }
}

// --- GAME 2: REFLEX ---
let reflexState = 'WAIT';
let reflexTimer = null;
let reflexStartTime = 0;

function runG2(level) {
    setScreen('screen-g2');
    updateState(`プレイ中 (${currentStageIndex}/12)`, GAME_NAMES['g2']);
    
    const box = document.getElementById('reflex-box');
    const txt = document.getElementById('reflex-text');
    const sub = document.getElementById('reflex-subtext');

    txt.innerText = 'WAIT...';
    txt.style.color = 'var(--main-cyan)';
    sub.innerText = '';
    box.style.borderColor = 'var(--main-cyan)';
    reflexState = 'WAIT';

    const delay = 1500 + Math.random() * 2500;
    const isTrap = Math.random() < 0.35;

    reflexTimer = setTimeout(() => {
        if (isTrap) {
            reflexState = 'TRAP';
            txt.innerText = 'DO NOT TOUCH';
            txt.style.color = 'var(--alert-red)';
            box.style.borderColor = 'var(--alert-red)';
            setTimeout(() => {
                if (reflexState === 'TRAP') {
                    if (stageFirstTry) correctStageCount++;
                    nextStage();
                }
            }, 1200);
        } else {
            reflexState = 'PUSH';
            txt.innerText = 'PUSH!';
            txt.style.color = '#00ffaa';
            box.style.borderColor = '#00ffaa';
            reflexStartTime = Date.now();
        }
    }, delay);
}

function handleReflexTap() {
    const txt = document.getElementById('reflex-text');
    const sub = document.getElementById('reflex-subtext');

    if (reflexState === 'WAIT') {
        stageFirstTry = false;
        clearTimeout(reflexTimer);
        txt.innerText = 'EARLY!';
        txt.style.color = 'var(--alert-red)';
        setTimeout(() => runG2(stageQueue[currentStageIndex - 1].level), 1000);
    } else if (reflexState === 'TRAP') {
        stageFirstTry = false;
        clearTimeout(reflexTimer);
        txt.innerText = 'PENALTY!';
        setTimeout(() => runG2(stageQueue[currentStageIndex - 1].level), 1000);
    } else if (reflexState === 'PUSH') {
        const reactionTime = (Date.now() - reflexStartTime) / 1000;
        const aiPercent = Math.max(10, Math.min(99, Math.floor((0.5 - reactionTime) * 200 + 70)));
        txt.innerText = `${reactionTime.toFixed(3)} SEC`;
        sub.innerText = `AI適合率: ${aiPercent}%`;
        reflexState = 'DONE';
        if (stageFirstTry) correctStageCount++;
        setTimeout(nextStage, 1200);
    }
}

// --- GAME 3: MEMORY ---
let memoryTarget = [];
let memoryUserSelection = [];

function runG3(level) {
    setScreen('screen-g3');
    updateState(`プレイ中 (${currentStageIndex}/12)`, GAME_NAMES['g3']);

    const grid = document.getElementById('g3-grid');
    grid.innerHTML = '';
    memoryTarget = [];
    memoryUserSelection = [];

    for (let i = 0; i < 16; i++) {
        const tile = document.createElement('div');
        tile.className = 'memory-tile';
        tile.onclick = () => onMemoryTileClick(i);
        grid.appendChild(tile);
    }

    const count = 1 + level * 2; 
    while (memoryTarget.length < count) {
        let r = Math.floor(Math.random() * 16);
        if (!memoryTarget.includes(r)) memoryTarget.push(r);
    }

    const tiles = document.querySelectorAll('.memory-tile');
    memoryTarget.forEach(idx => tiles[idx].classList.add('lit'));

    document.getElementById('g3-status').innerText = '記憶してください...';
    setTimeout(() => {
        tiles.forEach(t => t.classList.remove('lit'));
        document.getElementById('g3-status').innerText = '点灯していたタイルをタップしてください';
    }, 1800);
}

function onMemoryTileClick(idx) {
    if (memoryUserSelection.includes(idx)) return;
    const tiles = document.querySelectorAll('.memory-tile');

    if (memoryTarget.includes(idx)) {
        memoryUserSelection.push(idx);
        tiles[idx].classList.add('lit');
        if (memoryUserSelection.length === memoryTarget.length) {
            if (stageFirstTry) correctStageCount++;
            setTimeout(nextStage, 600);
        }
    } else {
        stageFirstTry = false;
        document.getElementById('g3-status').innerText = '位置エラー！再挑戦...';
        setTimeout(() => runG3(stageQueue[currentStageIndex - 1].level), 1000);
    }
}

// --- 警告画面 & 解析演出 ---
function triggerEmergencyMode() {
    updateState('暴走発生', '全システム停止');
    document.getElementById('app-container').classList.add('alert-mode');
    document.getElementById('status-badge').classList.add('badge-danger');
    document.getElementById('status-badge').innerText = '緊急警告';
    setScreen('screen-alert');
}

// ③ ローディング＆結果計算処理
function startLoadingPhase() {
    setScreen('screen-result');
    document.getElementById('loading-box').style.display = 'block';
    document.getElementById('result-box').style.display = 'none';

    const progressBar = document.getElementById('progress-bar');
    const loadingStatus = document.getElementById('loading-status');
    let width = 0;

    const interval = setInterval(() => {
        width += Math.random() * 15;
        if (width >= 100) {
            width = 100;
            progressBar.style.width = '100%';
            clearInterval(interval);
            setTimeout(showFinalResult, 600);
        } else {
            progressBar.style.width = width + '%';
            if (width > 60) loadingStatus.innerText = '討伐適合度プロファイルを計算中...';
            else if (width > 30) loadingStatus.innerText = '反射データおよび記憶ログの照合中...';
        }
    }, 200);
}

function showFinalResult() {
    document.getElementById('loading-box').style.display = 'none';
    document.getElementById('result-box').style.display = 'block';

    const percent = Math.round((correctStageCount / 12) * 100);
    document.getElementById('correct-count').innerText = correctStageCount;
    document.getElementById('score-percent').innerText = `${percent}%`;

    let rank = 'RANK C';
    if (percent === 100) rank = 'RANK S+';
    else if (percent >= 80) rank = 'RANK A';
    else if (percent >= 60) rank = 'RANK B';

    document.getElementById('score-rank').innerText = rank;
}

function resetTerminal() {
    document.getElementById('app-container').classList.remove('alert-mode');
    document.getElementById('status-badge').classList.remove('badge-danger');
    deviceId = 'DEV-' + Math.floor(1000 + Math.random() * 9000);
    currentStageIndex = 0;
    correctStageCount = 0;
    playerName = "未設定";
    startTime = Date.now();
    document.getElementById('player-name-input').value = '';
    setScreen('screen-select');
}

// --- ADMIN DASHBOARD (② リアルタイム秒毎更新 & 日本語化) ---
let adminInterval = null;
let unsubscribeAdmin = null;

function startAdminMode() {
    setScreen('screen-admin');
    
    // 1秒ごとにタイマーを再描画（リアルタイム経過時間更新）
    adminInterval = setInterval(refreshAdminUI, 1000);

    if (db) {
        unsubscribeAdmin = db.collection("terminal_sessions").onSnapshot(snapshot => {
            const data = {};
            snapshot.forEach(doc => { data[doc.id] = doc.data(); });
            window.cachedAdminData = data;
            refreshAdminUI();
        });
    }
}

function exitAdmin() {
    if (adminInterval) clearInterval(adminInterval);
    if (unsubscribeAdmin) unsubscribeAdmin();
    setScreen('screen-select');
}

function refreshAdminUI() {
    const data = db ? (window.cachedAdminData || {}) : JSON.parse(localStorage.getItem('ai_admin_sync') || '{}');
    const list = document.getElementById('admin-list');
    list.innerHTML = '';

    Object.keys(data).forEach(id => {
        const dev = data[id];
        const elapsedSecTotal = Math.floor((Date.now() - dev.time) / 1000);
        const elapsedMin = Math.floor(elapsedSecTotal / 60);
        const elapsedSec = elapsedSecTotal % 60;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="color: var(--main-cyan); font-weight: bold;">${dev.name || '未設定'}</td>
            <td>${dev.mission || '-'}</td>
            <td><span class="badge">${dev.status}</span></td>
            <td style="font-family: monospace; font-size: 1.1rem;">${elapsedMin}分 ${elapsedSec.toString().padStart(2, '0')}秒</td>
        `;
        list.appendChild(tr);
    });
}
