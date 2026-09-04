// --- Firebase 設定 ---
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    databaseURL: "https://YOUR_PROJECT.firebaseio.com",
    projectId: "YOUR_PROJECT",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_ID",
    appId: "YOUR_APP_ID"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

const app = {
    deviceId: 'ID-' + Math.random().toString(36).substr(2, 4).toUpperCase(),
    startTime: null,
    currentMission: 0,

    init() {
        this.drawBackground();
        window.addEventListener('resize', () => this.drawBackground());
    },

    // 背景描画（デジタルレイン＋グリッド）
    drawBackground() {
        const canvas = document.getElementById('bg-canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        function draw() {
            ctx.fillStyle = 'rgba(0, 8, 20, 0.1)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // グリッド線
            ctx.strokeStyle = 'rgba(0, 242, 255, 0.05)';
            for(let x=0; x<canvas.width; x+=40) {
                ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,canvas.height); ctx.stroke();
            }
            for(let y=0; y<canvas.height; y+=40) {
                ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(canvas.width,y); ctx.stroke();
            }
        }
        setInterval(draw, 50);
    },

    // プレイヤー開始
    initPlayer() {
        this.startTime = Date.now();
        document.getElementById('display-id').innerText = this.deviceId;
        this.showScreen('screen-game');
        this.nextMission();
    },

    showScreen(id) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(id).classList.add('active');
    },

    updateFirebase(status) {
        db.ref('devices/' + this.deviceId).set({
            status: status,
            startTime: this.startTime,
            lastSeen: Date.now()
        });
    },

    // --- ミッション管理 ---
    nextMission() {
        this.currentMission++;
        if (this.currentMission > 4) {
            this.triggerFinalAlert();
            return;
        }
        
        const area = document.getElementById('game-canvas-area');
        document.getElementById('mission-num').innerText = "0" + this.currentMission;
        
        if (this.currentMission === 1) this.gameReboot(area);
        if (this.currentMission === 2) this.gameReflex(area);
        if (this.currentMission === 3) this.gameMemory(area);
        if (this.currentMission === 4) this.gameDrone(area);
    },

    // 1. SYSTEM REBOOT
    gameReboot(area) {
        this.updateFirebase("M1: REBOOTING");
        document.getElementById('mission-title').innerText = "SYSTEM REBOOT";
        area.innerHTML = `<div class="node-grid">
            <div class="node-btn" id="nb-POWER">POWER</div>
            <div class="node-btn" id="nb-NETWORK">NETWORK</div>
            <div class="node-btn" id="nb-CORE">CORE</div>
            <div class="node-btn" id="nb-MEMORY">MEMORY</div>
        </div><p id="hint">ORDER: POWER > NETWORK > CORE > MEMORY</p>`;
        
        const order = ["POWER", "NETWORK", "CORE", "MEMORY"];
        let step = 0;
        order.forEach(id => {
            document.getElementById('nb-'+id).onclick = (e) => {
                if(id === order[step]) {
                    e.target.classList.add('active');
                    step++;
                    if(step === 4) setTimeout(() => this.nextMission(), 500);
                } else {
                    alert("SEQUENCE ERROR");
                    location.reload();
                }
            };
        });
    },

    // 2. NEURAL REFLEX
    gameReflex(area) {
        this.updateFirebase("M2: REFLEX");
        document.getElementById('mission-title').innerText = "NEURAL REFLEX";
        area.innerHTML = `<div id="reflex-target" class="start-circle-outer" style="width:200px;height:200px">WAIT</div>`;
        const target = document.getElementById('reflex-target');
        
        setTimeout(() => {
            target.innerHTML = "PUSH!!";
            target.style.borderColor = "#ff0055";
            const start = Date.now();
            target.onclick = () => {
                const diff = (Date.now() - start) / 1000;
                target.innerHTML = diff + "s";
                setTimeout(() => this.nextMission(), 1000);
            };
        }, 2000 + Math.random() * 2000);
    },

    // 3. MEMORY CORE
    gameMemory(area) {
        this.updateFirebase("M3: MEMORY");
        document.getElementById('mission-title').innerText = "MEMORY CORE";
        area.innerHTML = `<div class="node-grid" id="mem-grid"></div>`;
        const grid = document.getElementById('mem-grid');
        for(let i=0; i<4; i++) grid.innerHTML += `<div class="node-btn" id="m-${i}">?</div>`;
        
        // 簡易ロジック: 2番目が光る
        setTimeout(() => {
            document.getElementById('m-1').classList.add('active');
            setTimeout(() => {
                document.getElementById('m-1').classList.remove('active');
                document.querySelectorAll('.node-btn').forEach((btn, idx) => {
                    btn.onclick = () => { if(idx===1) this.nextMission(); };
                });
            }, 1000);
        }, 500);
    },

    // 4. DRONE CONTROL
    gameDrone(area) {
        this.updateFirebase("M4: DRONE");
        document.getElementById('mission-title').innerText = "DRONE CONTROL";
        area.innerHTML = `<div style="border:1px solid #00f2ff; width:300px; height:200px; position:relative;">
            <div id="drone" style="position:absolute; left:10px; top:10px;">[D]</div>
            <div style="position:absolute; right:10px; bottom:10px; color:#ff0055;">[GOAL]</div>
        </div>
        <button class="node-btn" style="margin-top:20px" onclick="app.nextMission()">MANUAL OVERRIDE (GOAL)</button>`;
    },

    triggerFinalAlert() {
        this.updateFirebase("AI TAKEOVER");
        this.showScreen('screen-alert');
        document.body.classList.add('alert-screen-active');
    },

    // --- 管理者モード ---
    showAdminLogin() {
        const pass = prompt("ADMIN PASSWORD:");
        if(pass === "1234") { // パスワードは任意
            this.showScreen('screen-admin');
            this.runAdminMonitor();
        }
    },

    runAdminMonitor() {
        db.ref('devices').on('value', (snapshot) => {
            const data = snapshot.val();
            const list = document.getElementById('admin-device-list');
            list.innerHTML = "";
            for(let id in data) {
                const device = data[id];
                const waitSec = Math.floor((Date.now() - device.startTime) / 1000);
                list.innerHTML += `
                    <div class="device-card">
                        <h3>${id}</h3>
                        <p>STATUS: <span class="status-online">${device.status}</span></p>
                        <p>WAIT TIME: ${waitSec}s</p>
                        <div style="width:100%; height:5px; background:#111;">
                            <div style="width:${(waitSec/300)*100}%; background:var(--primary); height:100%;"></div>
                        </div>
                    </div>
                `;
            }
        });
    }
};

app.init();
