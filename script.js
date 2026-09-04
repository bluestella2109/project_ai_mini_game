// --- Firebase Config (④ Firebaseを使う場合ここに自分の設定を貼る) ---
const firebaseConfig = {
    apiKey: "AIzaSyAIRFvaF397DOiNARhoG6B7w-xdT7bGNFk",
    authDomain: "sf-minigame.firebaseapp.com",
    projectId: "sf-minigame",
    storageBucket: "sf-minigame.firebasestorage.app",
    messagingSenderId: "751927738343",
    appId: "1:751927738343:web:91d5911881454d7c414742"
};

let db = null;
// Firebaseが正しく設定されているかチェックして初期化
if (firebaseConfig.apiKey !== "YOUR_API_KEY") {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
}

// Background Matrix Animation
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

// App State Variables
let playerName = "PLAYER";
let deviceId = 'DEV-' + Math.floor(1000 + Math.random() * 9000); // 内部識別用ID
let currentStageIndex = 0;
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

// リアルタイム同期用ステータス更新関数
function updateState(statusText, missionName = '-') {
    document.getElementById('player-display').innerText = `PLAYER // ${playerName}`;
    document.getElementById('stage-counter').innerText = `STAGE ${currentStageIndex}/12`;
    document.getElementById('status-badge').innerText = statusText;
    
    const sessionData = {
        name: playerName,
        status: statusText,
        mission: missionName,
        stage: currentStageIndex,
        time: startTime,
        lastActive: Date.now()
    };

    // 1. Firebaseに送信（設定されている場合）
    if (db) {
        db.collection("terminal_sessions").doc(deviceId).set(sessionData);
    }
    
    // 2. ローカルストレージにも保存（バックアップ）
    const localData = JSON.parse(localStorage.getItem('ai_admin_sync') || '{}');
    localData[deviceId] = sessionData;
    localStorage.setItem('ai_admin_sync', JSON.stringify(localData));
}

// 名前入力画面への推移
function goToNameInput() {
    setScreen('screen-name');
}

// ⑥ 名前入力処理
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
    updateState('READY', '待機中');
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
    updateState(`PLAYING (${currentStageIndex}/12)`, GAME_NAMES['g1']);
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

    // ①「位置と順番を覚えてください」を表示してシーケンス演出
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

// ② タップフィードバック機能の追加
function onG1NodeClick(element, name) {
    if (!g1AcceptInput) return;

    // タップ時の即時視覚フィードバック
    element.classList.add('tapped');
    setTimeout(() => element.classList.remove('tapped'), 150);

    if (name === g1Seq[g1Step]) {
        g1Step++;
        if (g1Step >= g1Seq.length) {
            g1AcceptInput = false;
            setTimeout(nextStage, 600);
        }
    } else {
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
    updateState(`PLAYING (${currentStageIndex}/12)`, GAME_NAMES['g2']);
    
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
                if (reflexState === 'TRAP') nextStage();
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
        clearTimeout(reflexTimer);
        txt.innerText = 'EARLY!';
        txt.style.color = 'var(--alert-red)';
        setTimeout(() => runG2(stageQueue[currentStageIndex - 1].level), 1000);
    } else if (reflexState === 'TRAP') {
        clearTimeout(reflexTimer);
        txt.innerText = 'PENALTY!';
        setTimeout(() => runG2(stageQueue[currentStageIndex - 1].level), 1000);
    } else if (reflexState === 'PUSH') {
        const reactionTime = (Date.now() - reflexStartTime) / 1000;
        const aiPercent = Math.max(10, Math.min(99, Math.floor((0.5 - reactionTime) * 200 + 70)));
        txt.innerText = `${reactionTime.toFixed(3)} SEC`;
        sub.innerText = `AI適合率: ${aiPercent}%`;
        reflexState = 'DONE';
        setTimeout(nextStage, 1200);
    }
}

// --- GAME 3: MEMORY ---
let memoryTarget = [];
let memoryUserSelection = [];

function runG3(level) {
    setScreen('screen-g3');
    updateState(`PLAYING (${currentStageIndex}/12)`, GAME_NAMES['g3']);

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
            setTimeout(nextStage, 600);
        }
    } else {
        document.getElementById('g3-status').innerText = '位置エラー！再挑戦...';
        setTimeout(() => runG3(stageQueue[currentStageIndex - 1].level), 1000);
    }
}

// --- EMERGENCY OVERRIDE ---
function triggerEmergencyMode() {
    updateState('OVERRIDDEN', '暴走発生');
    document.getElementById('app-container').classList.add('alert-mode');
    document.getElementById('status-badge').classList.add('badge-danger');
    document.getElementById('status-badge').innerText = 'EMERGENCY';
    setScreen('screen-alert');
}

function resetTerminal() {
    document.getElementById('app-container').classList.remove('alert-mode');
    document.getElementById('status-badge').classList.remove('badge-danger');
    deviceId = 'DEV-' + Math.floor(1000 + Math.random() * 9000);
    currentStageIndex = 0;
    playerName = "PLAYER";
    startTime = Date.now();
    document.getElementById('player-name-input').value = '';
    setScreen('screen-select');
}

// --- ADMIN DASHBOARD ---
let unsubscribeAdmin = null;

function startAdminMode() {
    setScreen('screen-admin');
    
    // ④ Firebaseによるリアルタイム同期リスナーの登録
    if (db) {
        unsubscribeAdmin = db.collection("terminal_sessions").onSnapshot(snapshot => {
            const data = {};
            snapshot.forEach(doc => { data[doc.id] = doc.data(); });
            renderAdminTable(data);
        });
    } else {
        // バックアップ（1秒ごとのローカル更新）
        setInterval(() => {
            const data = JSON.parse(localStorage.getItem('ai_admin_sync') || '{}');
            renderAdminTable(data);
        }, 1000);
    }
}

// ⑤ 管理者画面からモード選択に戻る
function exitAdmin() {
    if (unsubscribeAdmin) unsubscribeAdmin();
    setScreen('screen-select');
}

function renderAdminTable(data) {
    const list = document.getElementById('admin-list');
    list.innerHTML = '';

    Object.keys(data).forEach(id => {
        const dev = data[id];
        const elapsedMin = Math.floor((Date.now() - dev.time) / 60000);
        const elapsedSec = Math.floor(((Date.now() - dev.time) % 60000) / 1000);

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="color: var(--main-cyan); font-weight: bold;">${dev.name || '未設定'}</td>
            <td>${dev.mission || '-'}</td>
            <td><span class="badge">${dev.status}</span></td>
            <td>${elapsedMin}分 ${elapsedSec}秒</td>
        `;
        list.appendChild(tr);
    });
}
