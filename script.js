// --- Firebase Config (コピペしてください) ---
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    databaseURL: "https://YOUR_PROJECT.firebaseio.com",
    projectId: "YOUR_PROJECT",
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

const app = {
    uid: 'NODE-' + Math.floor(1000 + Math.random() * 9000),
    startTime: 0,
    timerInterval: null,

    init() {
        document.getElementById('user-id-disp').innerText = this.uid;
        this.createMatrixBg();
    },

    createMatrixBg() {
        const canvas = document.getElementById('matrix-canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth; canvas.height = window.innerHeight;
        const chars = "0123456789ABCDEF";
        const fontSize = 14;
        const columns = canvas.width / fontSize;
        const drops = Array(Math.floor(columns)).fill(1);

        function draw() {
            ctx.fillStyle = "rgba(0, 5, 10, 0.05)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = "#00f2ff";
            ctx.font = fontSize + "px monospace";
            for (let i = 0; i < drops.length; i++) {
                const text = chars.charAt(Math.floor(Math.random() * chars.length));
                ctx.fillText(text, i * fontSize, drops[i] * fontSize);
                if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) drops[i] = 0;
                drops[i]++;
            }
        }
        setInterval(draw, 50);
    }
};

const game = {
    step: 1,
    
    start() {
        app.startTime = Date.now();
        ui.transition('screen-game');
        this.updateStatus("INITIALIZING...");
        this.loadMission(1);
        this.startTimer();
    },

    startTimer() {
        const timerDisp = document.getElementById('live-timer');
        app.timerInterval = setInterval(() => {
            const sec = Math.floor((Date.now() - app.startTime) / 1000);
            const m = String(Math.floor(sec / 60)).padStart(2, '0');
            const s = String(sec % 60).padStart(2, '0');
            timerDisp.innerText = `${m}:${s}`;
            // Firebase送信
            db.ref('sessions/' + app.uid).update({
                wait_sec: sec,
                last_seen: Date.now()
            });
        }, 1000);
    },

    updateStatus(msg) {
        db.ref('sessions/' + app.uid).update({ status: msg });
    },

    loadMission(num) {
        this.step = num;
        document.getElementById('m-num').innerText = "0" + num;
        const container = document.getElementById('game-container');
        container.innerHTML = "";

        switch(num) {
            case 1: this.missionReboot(container); break;
            case 2: this.missionReflex(container); break;
            case 3: this.missionMemory(container); break;
            case 4: this.missionDrone(container); break;
            default: this.finish();
        }
    },

    // 1. SYSTEM REBOOT
    missionReboot(el) {
        document.getElementById('m-name').innerText = "SYSTEM REBOOT";
        this.updateStatus("M1: ノード復旧中");
        el.innerHTML = `<p class="hint">以下の順序でタップせよ: <br>POWER → NETWORK → CORE → MEMORY</p>
                        <div class="node-container" id="nodes"></div>`;
        const order = ["POWER", "NETWORK", "CORE", "MEMORY"];
        let idx = 0;
        order.sort(() => Math.random() - 0.5).forEach(id => {
            const div = document.createElement('div');
            div.className = 'node-item';
            div.innerText = id;
            div.onclick = () => {
                if(id === ["POWER", "NETWORK", "CORE", "MEMORY"][idx]) {
                    div.classList.add('correct');
                    idx++;
                    if(idx === 4) setTimeout(() => this.loadMission(2), 600);
                } else {
                    div.classList.add('wrong');
                    setTimeout(() => this.loadMission(1), 500);
                }
            };
            document.getElementById('nodes').appendChild(div);
        });
    },

    // 2. NEURAL REFLEX
    missionReflex(el) {
        document.getElementById('m-name').innerText = "NEURAL REFLEX";
        this.updateStatus("M2: 反応速度測定");
        el.innerHTML = `<div id="reflex-btn" class="reflex-trigger">WAIT...</div>`;
        const btn = document.getElementById('reflex-btn');
        const delay = 2000 + Math.random() * 3000;
        
        const timeout = setTimeout(() => {
            btn.innerText = "PUSH!!";
            btn.style.background = "var(--cyan)";
            btn.style.color = "var(--bg)";
            const start = performance.now();
            btn.onclick = () => {
                const diff = (performance.now() - start) / 1000;
                let rank = diff < 0.25 ? "S" : diff < 0.35 ? "A" : "B";
                btn.innerHTML = `TIME: ${diff.toFixed(3)}s<br>RANK: ${rank}`;
                setTimeout(() => this.loadMission(3), 1500);
            };
        }, delay);
    },

    // 3. MEMORY CORE
    missionMemory(el) {
        document.getElementById('m-name').innerText = "MEMORY CORE";
        this.updateStatus("M3: 記憶領域テスト");
        el.innerHTML = `<div class="node-container" id="mem-grid" style="grid-template-columns:repeat(3,1fr)"></div>`;
        const grid = document.getElementById('mem-grid');
        for(let i=0; i<9; i++) grid.innerHTML += `<div class="node-item" id="m-${i}">□</div>`;
        
        const targets = [1, 4, 6, 8].sort(() => Math.random() - 0.5);
        targets.forEach(t => document.getElementById('m-'+t).classList.add('correct'));
        
        setTimeout(() => {
            targets.forEach(t => document.getElementById('m-'+t).classList.remove('correct'));
            let count = 0;
            document.querySelectorAll('.node-item').forEach((item, i) => {
                item.onclick = () => {
                    if(targets.includes(i)) {
                        item.classList.add('correct');
                        count++;
                        if(count === targets.length) setTimeout(() => this.loadMission(4), 1000);
                    } else {
                        this.loadMission(3);
                    }
                };
            });
        }, 1500);
    },

    // 4. DRONE CONTROL
    missionDrone(el) {
        document.getElementById('m-name').innerText = "DRONE CONTROL";
        this.updateStatus("M4: ドローン誘導");
        el.innerHTML = `<div id="drone-stage" style="width:300px; height:200px; border:2px solid var(--cyan); position:relative; overflow:hidden;">
            <div id="drone-unit" style="position:absolute; left:10px; top:10px; font-size:12px;">▲DRONE</div>
            <div style="position:absolute; right:10px; bottom:10px; color:var(--red)">[GOAL]</div>
            <div style="position:absolute; left:100px; top:50px; width:20px; height:100px; background:var(--cyan); opacity:0.5;"></div>
        </div>
        <div class="controls" style="margin-top:20px;">
            <button class="cyber-btn" onclick="game.droneMove()">推進力注入 (OVERRIDE)</button>
        </div>`;
    },
    
    droneMove() {
        this.updateStatus("シーケンス完了");
        this.loadMission(5);
    },

    finish() {
        clearInterval(app.timerInterval);
        ui.transition('screen-alert');
        this.updateStatus("AI INVASION COMPLETED");
    }
};

const ui = {
    transition(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(screenId).classList.add('active');
    }
};

const admin = {
    login() {
        const p = prompt("ADMIN KEY:");
        if(p === "admin") {
            ui.transition('screen-admin');
            this.startMonitor();
        }
    },
    startMonitor() {
        db.ref('sessions').on('value', snap => {
            const list = document.getElementById('admin-list');
            list.innerHTML = "";
            const data = snap.val();
            for(let id in data) {
                const s = data[id];
                list.innerHTML += `<div class="card">
                    <strong>${id}</strong><br>
                    状態: ${s.status}<br>
                    待機時間: ${s.wait_sec}秒
                </div>`;
            }
        });
    }
};

app.init();
