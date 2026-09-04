// --- Firebase 設定 ---
const firebaseConfig = {
    apiKey: "AIzaSyAIRFvaF397DOiNARhoG6B7w-xdT7bGNFk",
    authDomain: "sf-minigame.firebaseapp.com",
    projectId: "sf-minigame",
    storageBucket: "sf-minigame.firebasestorage.app",
    messagingSenderId: "751927738343",
    appId: "1:751927738343:web:91d5911881454d7c414742"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// --- サイバーパーティクル背景アニメーション ---
const canvas = document.getElementById('matrix-bg');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const particles = [];
const particleCount = 60;

for (let i = 0; i < particleCount; i++) {
    particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        radius: Math.random() * 2 + 1,
        color: Math.random() > 0.5 ? '#ff2a2a' : '#00f0ff'
    });
}

function renderBackground() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    for (let i = 0; i < particleCount; i++) {
        let p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = p.color;
        ctx.fill();

        for (let j = i + 1; j < particleCount; j++) {
            let p2 = particles[j];
            let dist = Math.hypot(p.x - p2.x, p.y - p2.y);
            if (dist < 120) {
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.strokeStyle = `rgba(255, 42, 42, ${1 - dist / 120})`;
                ctx.lineWidth = 0.5;
                ctx.stroke();
            }
        }
    }
    requestAnimationFrame(renderBackground);
}
renderBackground();

// --- グローバル変数 ---
let playerName = "未設定";
let deviceId = 'DEV-' + Math.floor(1000 + Math.random() * 9000);
let currentStageIndex = 0;
let correctStageCount = 0;
let stageFirstTry = true;
let startTime = Date.now();
let stageQueue = [];

const NODE_NAMES = ['NODE-A', 'NODE-B', 'NODE-C', 'NODE-D', 'NODE-E', 'NODE-F'];
const GAME_NAMES_JP = {
    'g1': 'システム再起動 (記憶)',
    'g2': '反射神経テスト',
    'g3': 'メモリ配置記憶',
    'g4': '周波数チューニング',
    'g5': 'ルート探索'
};

function setScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    setTimeout(() => {
        document.getElementById(screenId).classList.add('active');
    }, 50);
}

// --- iPad名の固定化と保持ロジック ---
function initDeviceAccount() {
    const savedIpadName = localStorage.getItem('ipad_device_name');

    if (savedIpadName) {
        playerName = savedIpadName;
        startClientMode();
    } else {
        setScreen('screen-name');
    }
}

function submitName() {
    const input = document.getElementById('player-name-input').value.trim();
    if (!input) {
        alert("iPad名（例: iPad-01）を入力してください。");
        return;
    }
    
    playerName = input;
    localStorage.setItem('ipad_device_name', playerName);
    startClientMode();
}

function updateState(statusText, problemType = '-') {
    document.getElementById('player-display').innerText = `端末 // ${playerName}`;
    document.getElementById('stage-counter').innerText = `ステージ ${currentStageIndex}/12`;
    document.getElementById('status-badge').innerText = statusText;
    
    const sessionData = {
        ipadName: playerName,
        status: statusText,
        problemType: problemType,
        stage: currentStageIndex,
        time: startTime,
        lastActive: Date.now()
    };

    db.collection("terminal_sessions").doc(deviceId).set(sessionData);
}

function startClientMode() {
    setScreen('screen-start');
    updateState('状態: 準備完了', '待機中');
    correctStageCount = 0;
    currentStageIndex = 0;
    buildStageQueue();
}

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

    const problemName = GAME_NAMES_JP[stage.type] || '-';

    if (stage.type === 'g1') runG1(stage.level, problemName);
    else if (stage.type === 'g2') runG2(stage.level, problemName);
    else if (stage.type === 'g3') runG3(stage.level, problemName);
    else if (stage.type === 'g4') runG4(stage.level, problemName);
    else if (stage.type === 'g5') runG5(stage.level, problemName);
}

// --- GAME 1: REBOOT ---
let g1Seq = [];
let g1Step = 0;
let g1AcceptInput = false;

function runG1(level, problemName) {
    setScreen('screen-g1');
    updateState(`プレイ中 (${currentStageIndex}/12)`, problemName);
    g1AcceptInput = false;
    g1Step = 0;

    const grid = document.getElementById('g1-nodes');
    grid.innerHTML = '';
    
    const names = [...NODE_NAMES].sort(() => Math.random() - 0.5).slice(0, 4);
    names.forEach(name => {
        const btn = document.createElement('button');
        btn.className = 'reboot-node';
        btn.innerText = name;
        btn.onclick = () => onG1NodeClick(btn, name, problemName);
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

function onG1NodeClick(element, name, problemName) {
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
        setTimeout(() => runG1(stageQueue[currentStageIndex - 1].level, problemName), 900);
    }
}

// --- GAME 2: REFLEX ---
let reflexState = 'WAIT';
let reflexTimer = null;

function runG2(level, problemName) {
    setScreen('screen-g2');
    updateState(`プレイ中 (${currentStageIndex}/12)`, problemName);
    
    const box = document.getElementById('reflex-box');
    const txt = document.getElementById('reflex-text');
    const sub = document.getElementById('reflex-subtext');

    box.classList.remove('active-push');
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
            box.classList.add('active-push');
            txt.innerText = 'PUSH!';
            txt.style.color = 'var(--accent-red)';
        }
    }, delay);
}

function handleReflexTap() {
    const box = document.getElementById('reflex-box');
    const txt = document.getElementById('reflex-text');

    box.classList.remove('active-push');

    const problemName = GAME_NAMES_JP['g2'];

    if (reflexState === 'WAIT') {
        stageFirstTry = false;
        clearTimeout(reflexTimer);
        txt.innerText = 'EARLY!';
        txt.style.color = 'var(--accent-red)';
        setTimeout(() => runG2(stageQueue[currentStageIndex - 1].level, problemName), 900);
    } else if (reflexState === 'TRAP') {
        stageFirstTry = false;
        clearTimeout(reflexTimer);
        txt.innerText = 'PENALTY!';
        txt.style.color = 'var(--accent-red)';
        setTimeout(() => runG2(stageQueue[currentStageIndex - 1].level, problemName), 900);
    } else if (reflexState === 'PUSH') {
        txt.innerText = 'SUCCESS';
        txt.style.color = 'var(--accent-blue)';
        reflexState = 'DONE';
        if (stageFirstTry) correctStageCount++;
        setTimeout(nextStage, 600);
    }
}

// --- GAME 3: MEMORY CORE ---
let memoryTarget = [];
let memoryUserSelection = [];

function runG3(level, problemName) {
    setScreen('screen-g3');
    updateState(`プレイ中 (${currentStageIndex}/12)`, problemName);

    const grid = document.getElementById('g3-grid');
    grid.innerHTML = '';
    memoryTarget = [];
    memoryUserSelection = [];

    for (let i = 0; i < 16; i++) {
        const tile = document.createElement('div');
        tile.className = 'memory-tile';
        tile.onclick = () => onMemoryTileClick(i, problemName);
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

function onMemoryTileClick(idx, problemName) {
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
        setTimeout(() => runG3(stageQueue[currentStageIndex - 1].level, problemName), 900);
    }
}

// --- GAME 4: FREQUENCY TUNE ---
let g4Target = 0;
let g4Current = 0;

function runG4(level, problemName) {
    setScreen('screen-g4');
    updateState(`プレイ中 (${currentStageIndex}/12)`, problemName);

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

// --- GAME 5: PATH FINDER (多パターン問題追加) ---
let g5UserPath = [];
let currentPathAnswer = '';

// PATH FINDER 問題データベース（4パターン）
const PATH_PROBLEMS = [
    {
        cells: ['S', '', '', '#', '#', '', '', '', 'G'],
        answer: '→→↓↓'
    },
    {
        cells: ['S', '#', '', '', '#', '', '', '', 'G'],
        answer: '↓↓→→'
    },
    {
        cells: ['S', '', '#', '', '', '#', '', '', 'G'],
        answer: '→↓↓→'
    },
    {
        cells: ['S', '', '', '', '#', '#', '', '', 'G'],
        answer: '↓↓→→'
    }
];

function runG5(level, problemName) {
    setScreen('screen-g5');
    updateState(`プレイ中 (${currentStageIndex}/12)`, problemName);

    g5UserPath = [];
    document.getElementById('g5-user-path').innerText = '入力: -';
    document.getElementById('g5-status').innerText = 'SからGへの正しいルートを入力してください';

    const grid = document.getElementById('g5-grid');
    grid.innerHTML = '';

    // ランダムに問題パターンを選択
    const problem = PATH_PROBLEMS[Math.floor(Math.random() * PATH_PROBLEMS.length)];
    currentPathAnswer = problem.answer;

    problem.cells.forEach(c => {
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
    if (g5UserPath.length < 8) {
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
    if (inputStr === currentPathAnswer) {
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
    updateState('状態: 暴走発生', '全システム停止');
    document.getElementById('app-container').classList.add('alert-mode');
    document.getElementById('status-badge').classList.add('badge-accent');
    document.getElementById('status-badge').innerText = '状態: 緊急警告';
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

// --- 次のお客さんへのリセット（iPad名は保持） ---
function resetTerminal() {
    document.getElementById('app-container').classList.remove('alert-mode');
    document.getElementById('status-badge').classList.remove('badge-accent');
    
    currentStageIndex = 0;
    correctStageCount = 0;
    startTime = Date.now();
    
    startClientMode();
}

// --- ADMIN DASHBOARD ---
let adminInterval = null;
let unsubscribeAdmin = null;

function startAdminMode() {
    setScreen('screen-admin');
    adminInterval = setInterval(refreshAdminUI, 1000);

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

        let progressJapanese = '未開始';
        if (dev.stage > 0 && dev.stage <= 12) {
            progressJapanese = `ステージ ${dev.stage} / 12`;
        } else if (dev.stage > 12) {
            progressJapanese = '全ステージ完了';
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight: bold; color: #fff;">${dev.ipadName || 'iPad未設定'}</td>
            <td>${dev.problemType || '-'}</td>
            <td><span class="badge ${dev.status && (dev.status.includes('暴走') || dev.status.includes('緊急')) ? 'badge-accent' : ''}">${progressJapanese}</span></td>
            <td style="font-family: monospace;">${elapsedMin}分 ${elapsedSec.toString().padStart(2, '0')}秒</td>
        `;
        list.appendChild(tr);
    });
}
