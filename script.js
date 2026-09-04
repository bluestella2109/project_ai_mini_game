// --- Firebase 設定 (設定値反映済み) ---
const firebaseConfig = {
    apiKey: "AIzaSyAIRFvaF397DOiNARhoG6B7w-xdT7bGNFk",
    authDomain: "sf-minigame.firebaseapp.com",
    projectId: "sf-minigame",
    storageBucket: "sf-minigame.firebasestorage.app",
    messagingSenderId: "751927738343",
    appId: "1:751927738343:web:91d5911881454d7c414742"
};

// Firebase 初期化
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// 背景マトリックス
const canvas = document.getElementById('matrix-bg');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const alphabet = '0123456789ABCDEF';
const fontSize = 14;
const columns = canvas.width / fontSize;
const rainDrops = Array(Math.floor(columns)).fill(1);

function renderMatrix() {
    ctx.fillStyle = 'rgba(10, 10, 10, 0.1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
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
setInterval(renderMatrix, 33);

// グローバル変数
let playerName = "未設定";
let deviceId = 'DEV-' + Math.floor(1000 + Math.random() * 9000);
let currentStageIndex = 0;
let correctStageCount = 0;
let stageFirstTry = true;
let startTime = Date.now();
let stageQueue = [];

const NODE_NAMES = ['NODE-A', 'NODE-B', 'NODE-C', 'NODE-D', 'NODE-E', 'NODE-F'];
const GAME_NAMES = {
    'g1': 'SYSTEM REBOOT',
    'g2': 'NEURAL REFLEX',
    'g3': 'MEMORY CORE',
    'g4': 'FREQUENCY TUNE',
    'g5': 'PATH FINDER'
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

    // Firebase Firestoreへ保存
    db.collection("terminal_sessions").doc(deviceId).set(sessionData);
}

function goToNameInput() { setScreen('screen-name'); }

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

// 5種類のゲームを12ステージに割り振る
function buildStageQueue() {
    const games = ['g1', 'g2', 'g3', 'g4', 'g5'];
    stageQueue = [];
    for (let i = 0; i < 12; i++) {
        const type = games[i % games.length];
        const level = Math.floor(i / 3) + 1;
        stageQueue.push({ type, level });
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
    else if (stage.type === 'g4') runG4(stage.level);
    else if (stage.type === 'g5') runG5(stage.level);
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
    }, 650);
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
            setTimeout(nextStage, 500);
        }
    } else {
        stageFirstTry = false;
        g1Step = 0;
        document.getElementById('g1-status').innerText = 'エラー！再試行中...';
        g1AcceptInput = false;
        setTimeout(() => runG1(stageQueue[currentStageIndex - 1].level), 900);
    }
}

// --- GAME 2: REFLEX ---
let reflexState = 'WAIT';
let reflexTimer = null;

function runG2(level) {
    setScreen('screen-g2');
    updateState(`プレイ中 (${currentStageIndex}/12)`, GAME_NAMES['g2']);
    
    const txt = document.getElementById('reflex-text');
    const sub = document.getElementById('reflex-subtext');

    txt.innerText = 'WAIT...';
    txt.style.color = '#fff';
    sub.innerText = '';
    reflexState = 'WAIT';

    const delay = 1500 + Math.random() * 2000;
    const isTrap = Math.random() < 0.3;

    reflexTimer = setTimeout(() => {
        if (isTrap) {
            reflexState = 'TRAP';
            txt.innerText = 'DON\'T PUSH';
            txt.style.color = 'var(--accent-red)';
            setTimeout(() => {
                if (reflexState === 'TRAP') {
                    if (stageFirstTry) correctStageCount++;
                    nextStage();
                }
            }, 1000);
        } else {
            reflexState = 'PUSH';
            txt.innerText = 'PUSH!';
            txt.style.color = 'var(--accent-red)';
        }
    }, delay);
}

function handleReflexTap() {
    const txt = document.getElementById('reflex-text');

    if (reflexState === 'WAIT') {
        stageFirstTry = false;
        clearTimeout(reflexTimer);
        txt.innerText = 'EARLY!';
        txt.style.color = 'var(--accent-red)';
        setTimeout(() => runG2(stageQueue[currentStageIndex - 1].level), 900);
    } else if (reflexState === 'TRAP') {
        stageFirstTry = false;
        clearTimeout(reflexTimer);
        txt.innerText = 'PENALTY!';
        setTimeout(() => runG2(stageQueue[currentStageIndex - 1].level), 900);
    } else if (reflexState === 'PUSH') {
        txt.innerText = 'SUCCESS';
        reflexState = 'DONE';
        if (stageFirstTry) correctStageCount++;
        setTimeout(nextStage, 600);
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

    const count = 2 + level; 
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
    }, 1500);
}

function onMemoryTileClick(idx) {
    if (memoryUserSelection.includes(idx)) return;
    const tiles = document.querySelectorAll('.memory-tile');

    if (memoryTarget.includes(idx)) {
        memoryUserSelection.push(idx);
        tiles[idx].classList.add('lit');
        if (memoryUserSelection.length === memoryTarget.length) {
            if (stageFirstTry) correctStageCount++;
            setTimeout(nextStage, 500);
        }
    } else {
        stageFirstTry = false;
        document.getElementById('g3-status').innerText = 'エラー！再挑戦...';
        setTimeout(() => runG3(stageQueue[currentStageIndex - 1].level), 900);
    }
}

// --- GAME 4: FREQUENCY TUNE ---
let g4Target = 0;
let g4Current = 0;

function runG4(level) {
    setScreen('screen-g4');
    updateState(`プレイ中 (${currentStageIndex}/12)`, GAME_NAMES['g4']);

    g4Target = Math.floor(Math.random() * 80) + 10;
    g4Current = 0;

    document.getElementById('g4-target-val').innerText = g4Target;
    document.getElementById('g4-current-val').innerText = g4Current;
    document.getElementById('g4-status').innerText = '目標の周波数に数値を合わせてください';
}

function adjustTune(val) {
    g4Current = Math.max(0, Math.min(100, g4Current + val));
    document.getElementById('g4-current-val').innerText = g4Current;
}

function submitTune() {
    if (g4Current === g4Target) {
        if (stageFirstTry) correctStageCount++;
        setTimeout(nextStage, 400);
    } else {
        stageFirstTry = false;
        document.getElementById('g4-status').innerText = '周波数不一致！再調整してください';
    }
}

// --- GAME 5: PATH FINDER ---
let g5UserPath = [];

function runG5(level) {
    setScreen('screen-g5');
    updateState(`プレイ中 (${currentStageIndex}/12)`, GAME_NAMES['g5']);

    g5UserPath = [];
    document.getElementById('g5-user-path').innerText = '入力: -';
    document.getElementById('g5-status').innerText = 'SからGへの正しいルートを入力してください';

    const grid = document.getElementById('g5-grid');
    grid.innerHTML = '';

    const cells = [
        'S', '', '',
        '#', '#', '',
        '', '', 'G'
    ];

    cells.forEach(c => {
        const div = document.createElement('div');
        div.className = 'path-cell';
        if (c === 'S') div.classList.add('start');
        if (c === 'G') div.classList.add('goal');
        if (c === '#') div.classList.add('block');
        div.innerText = c;
        grid.appendChild(div);
    });
}

function addPathInput(dir) {
    if (g5UserPath.length < 6) {
        g5UserPath.push(dir);
        document.getElementById('g5-user-path').innerText = '入力: ' + g5UserPath.join(' ');
    }
}

function clearPath() {
    g5UserPath = [];
    document.getElementById('g5-user-path').innerText = '入力: -';
}

function submitPath() {
    const inputStr = g5UserPath.join('');
    if (inputStr === '→→↓↓') {
        if (stageFirstTry) correctStageCount++;
        setTimeout(nextStage, 400);
    } else {
        stageFirstTry = false;
        document.getElementById('g5-status').innerText = 'ルート不整合！やり直してください';
        clearPath();
    }
}

// --- 警告画面 & 解析演出 ---
function triggerEmergencyMode() {
    updateState('暴走発生', '全システム停止');
    document.getElementById('app-container').classList.add('alert-mode');
    document.getElementById('status-badge').classList.add('badge-accent');
    document.getElementById('status-badge').innerText = '緊急警告';
    setScreen('screen-alert');
}

function startLoadingPhase() {
    setScreen('screen-result');
    document.getElementById('loading-box').style.display = 'block';
    document.getElementById('result-box').style.display = 'none';

    const progressBar = document.getElementById('progress-bar');
    const loadingStatus = document.getElementById('loading-status');
    let width = 0;

    const interval = setInterval(() => {
        width += Math.random() * 18;
        if (width >= 100) {
            width = 100;
            progressBar.style.width = '100%';
            clearInterval(interval);
            setTimeout(showFinalResult, 500);
        } else {
            progressBar.style.width = width + '%';
            if (width > 60) loadingStatus.innerText = '討伐適合度プロファイルを計算中...';
            else if (width > 30) loadingStatus.innerText = 'ログデータを集計中...';
        }
    }, 180);
}

function showFinalResult() {
    document.getElementById('loading-box').style.display = 'none';
    document.getElementById('result-box').style.display = 'block';

    const percent = Math.round((correctStageCount / 12) * 100);
    document.getElementById('correct-count').innerText = correctStageCount;
    document.getElementById('score-percent').innerText = `${percent}%`;

    let rank = 'RANK C';
    if (percent === 100) rank = 'RANK S';
    else if (percent >= 80) rank = 'RANK A';
    else if (percent >= 60) rank = 'RANK B';

    document.getElementById('score-rank').innerText = rank;
}

function resetTerminal() {
    document.getElementById('app-container').classList.remove('alert-mode');
    document.getElementById('status-badge').classList.remove('badge-accent');
    deviceId = 'DEV-' + Math.floor(1000 + Math.random() * 9000);
    currentStageIndex = 0;
    correctStageCount = 0;
    playerName = "未設定";
    startTime = Date.now();
    document.getElementById('player-name-input').value = '';
    setScreen('screen-select');
}

// --- ADMIN DASHBOARD ---
let adminInterval = null;
let unsubscribeAdmin = null;

function startAdminMode() {
    setScreen('screen-admin');
    adminInterval = setInterval(refreshAdminUI, 1000);

    // Firestoreからリアルタイム受信
    unsubscribeAdmin = db.collection("terminal_sessions").onSnapshot(snapshot => {
        const data = {};
        snapshot.forEach(doc => { data[doc.id] = doc.data(); });
        window.cachedAdminData = data;
        refreshAdminUI();
    });
}

function exitAdmin() {
    if (adminInterval) clearInterval(adminInterval);
    if (unsubscribeAdmin) unsubscribeAdmin();
    setScreen('screen-select');
}

function refreshAdminUI() {
    const data = window.cachedAdminData || {};
    const list = document.getElementById('admin-list');
    list.innerHTML = '';

    Object.keys(data).forEach(id => {
        const dev = data[id];
        const elapsedSecTotal = Math.floor((Date.now() - dev.time) / 1000);
        const elapsedMin = Math.floor(elapsedSecTotal / 60);
        const elapsedSec = elapsedSecTotal % 60;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight: bold; color: #fff;">${dev.name || '未設定'}</td>
            <td>${dev.mission || '-'}</td>
            <td><span class="badge ${dev.status.includes('暴走') ? 'badge-accent' : ''}">${dev.status}</span></td>
            <td style="font-family: monospace;">${elapsedMin}分 ${elapsedSec.toString().padStart(2, '0')}秒</td>
        `;
        list.appendChild(tr);
    });
}
