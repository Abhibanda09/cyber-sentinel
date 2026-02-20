// server.js
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const PORT = process.env.PORT || 3000;
const LOG_FILE = path.join(__dirname, 'game_logs.json');

// Middleware
app.use(cors());
app.use(express.json());

// ------------------------
// 1️⃣ Telemetry Capture
// ------------------------
app.post('/event', (req, res) => {
    const logEntry = JSON.stringify(req.body) + "\n";
    fs.appendFile(LOG_FILE, logEntry, (err) => {
        if (err) console.error("Write Error:", err);
        else broadcastUpdate(); // Notify clients immediately
    });
    res.status(200).json({ status: 'ok' });
});

// ------------------------
// 2️⃣ Clear Logs
// ------------------------
app.get('/clear', (req, res) => {
    fs.writeFileSync(LOG_FILE, "");
    broadcastUpdate(); // Notify clients immediately
    res.redirect('/stats');
});

// ------------------------
// 3️⃣ Root Health Check
// ------------------------
app.get('/', (req, res) => {
    res.send("🚀 SOC Bridge Online");
});

// ------------------------
// 4️⃣ Stats Calculation
// ------------------------
function computeStats() {
    if (!fs.existsSync(LOG_FILE) || fs.readFileSync(LOG_FILE, 'utf8').trim() === "") {
        return { kills: 0, shots: 0, breaches: 0, integrity: 100, accuracy: 0, logsHtml: "" };
    }

    const rawData = fs.readFileSync(LOG_FILE, 'utf8');
    const lines = rawData.split('\n').filter(l => l.trim() !== "");

    let kills = 0, shots = 0, breaches = 0;
    let logsHtml = "";

    lines.forEach(line => {
        try {
            const e = JSON.parse(line);
            if (e.event_type === 'fire_event') shots++;
            if (e.event_type === 'threat_neutralized') kills++;
            if (e.event_type === 'security_breach') {
                breaches++;
                const time = e.timestamp 
                    ? e.timestamp.split('T')[1]?.split('.')[0] 
                    : "00:00:00";
                logsHtml = `<div style="color:#f87171; font-size:13px; margin:5px 0; border-left:2px solid #f87171; padding-left:10px;">
                    [ ${time} ] ALERT: Perimeter Breach
                </div>` + logsHtml;
            }
        } catch {}
    });

    let integrity = 100 - (breaches * 10) + (kills * 2);
    integrity = Math.min(100, Math.max(0, integrity));
    const accuracy = shots > 0 ? ((kills / shots) * 100).toFixed(1) : 0;

    return { kills, shots, breaches, integrity, accuracy, logsHtml };
}

// ------------------------
// 5️⃣ Analytics Dashboard
// ------------------------
app.get('/stats', (req, res) => {
    const { kills, accuracy, breaches, integrity, logsHtml } = computeStats();
    let barColor = integrity > 70 ? "#00ff00" : (integrity > 35 ? "#ffaa00" : "#ff4444");

    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>SOC Dashboard</title>
<style>
body { background:#0a0e14; color:#00ff00; font-family:'Segoe UI',sans-serif; padding:20px; }
.dashboard { max-width:800px; margin:auto; border:1px solid #1f2937; background:#111821; padding:30px; border-radius:8px; }
.grid { display:grid; grid-template-columns:repeat(3,1fr); gap:15px; margin-bottom:30px; }
.card { background:#0d1117; border:1px solid #1f2937; padding:15px; text-align:center; border-radius:4px; }
.card h2 { font-size:36px; margin:0; color:#fff; font-family:monospace; }
.bar-container { width:100%; background:#070a0e; height:45px; border-radius:4px; border:1px solid #1f2937; overflow:hidden; }
.bar-fill { height:100%; width:${integrity}%; background:${barColor}; transition:0.5s; }
.log-box { background:#000; border:1px solid #1f2937; padding:15px; height:150px; overflow-y:auto; border-radius:4px; font-family:monospace; }
button { padding:15px; border:none; font-weight:bold; cursor:pointer; border-radius:4px; }
.sync-btn { background:#00ff00; color:#000; }
.wipe-btn { background:#310a0a; color:#f87171; border:1px solid #7f1d1d; }
</style>
</head>
<body>
<div class="dashboard">
<h1 style="letter-spacing:5px; font-family:monospace;">SOC COMMAND CENTER</h1>

<div class="grid">
<div class="card"><h2 id="kills">${kills}</h2><label>Malware Neutralized</label></div>
<div class="card"><h2 id="accuracy">${accuracy}%</h2><label>Accuracy</label></div>
<div class="card"><h2 id="breaches" style="color:#f87171;">${breaches}</h2><label>Breaches</label></div>
</div>

<div>
<div style="display:flex; justify-content:space-between;">
<span>SYSTEM INTEGRITY INDEX</span>
<span id="integrity" style="color:${barColor}; font-family:monospace;">${integrity}%</span>
</div>
<div class="bar-container"><div class="bar-fill" id="barFill"></div></div>
</div>

<div class="log-box" id="logBox">
${logsHtml}
<div style="opacity:0.5;">[SYSTEM] Monitoring active...</div>
</div>

<div style="margin-top:20px; display:flex; gap:10px;">
<button class="sync-btn" onclick="location.href='/stats'">Sync</button>
<button class="wipe-btn" onclick="if(confirm('Purge logs?')) location.href='/clear'">Wipe</button>
</div>

</div>

<script>
// WebSocket for live updates
const ws = new WebSocket('ws://' + location.host);

ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    document.getElementById('kills').innerText = data.kills;
    document.getElementById('accuracy').innerText = data.accuracy + '%';
    document.getElementById('breaches').innerText = data.breaches;
    document.getElementById('integrity').innerText = data.integrity + '%';
    document.getElementById('barFill').style.width = data.integrity + '%';
    document.getElementById('barFill').style.background = data.barColor;
    document.getElementById('logBox').innerHTML = data.logsHtml + '<div style="opacity:0.5;">[SYSTEM] Monitoring active...</div>';
};
</script>
</body>
</html>
    `);
});

// ------------------------
// 6️⃣ HTTP + WebSocket Server
// ------------------------
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

function broadcastUpdate() {
    const stats = computeStats();
    stats.barColor = stats.integrity > 70 ? "#00ff00" : (stats.integrity > 35 ? "#ffaa00" : "#ff4444");
    const payload = JSON.stringify(stats);

    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(payload);
        }
    });
}

// ------------------------
// 7️⃣ Start Server
// ------------------------
server.listen(PORT, () => {
    console.log(`🚀 SOC Bridge Online on port ${PORT} with live updates`);
});