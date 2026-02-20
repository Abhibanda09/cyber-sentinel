const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const LOG_FILE = path.join(__dirname, 'game_logs.json');

// --- 1. TELEMETRY CAPTURE ---
app.post('/event', (req, res) => {
    const logEntry = JSON.stringify(req.body) + "\n";
    fs.appendFile(LOG_FILE, logEntry, (err) => {
        if (err) console.error("Write Error");
    });
    res.status(200).send({ status: 'ok' });
});

// --- 2. CLEAR LOGS ---
app.get('/clear', (req, res) => {
    fs.writeFileSync(LOG_FILE, ""); 
    res.redirect('/stats'); 
});

// --- 3. ANALYTICS DASHBOARD ---
app.get('/stats', (req, res) => {
    if (!fs.existsSync(LOG_FILE) || fs.readFileSync(LOG_FILE, 'utf8').trim() === "") {
        return res.send(`
            <body style="background:#0a0e14; color:#00ff00; font-family:monospace; display:flex; flex-direction:column; justify-content:center; align-items:center; height:100vh;">
                <h1 style="border: 1px solid #00ff00; padding: 20px;">[!] SYSTEM OFFLINE: NO DATA</h1>
                <p style="color:#4b5563;">Deploy Firewall Core to initiate telemetry stream.</p>
                <button onclick="location.reload()" style="padding:10px 20px; cursor:pointer; background:#00ff00; border:none; font-weight:bold;">RESCAN PIPELINE</button>
            </body>
        `);
    }

    try {
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
                    const time = e.timestamp ? e.timestamp.split('T')[1].split('.')[0] : "00:00:00";
                    logsHtml = '<div style="color:#f87171; font-size:13px; margin:5px 0; border-left:2px solid #f87171; padding-left:10px;">[ ' + time + ' ] ALERT: Perimeter Breach</div>' + logsHtml;
                }
            } catch (err) {}
        });

        // --- EXACT INTEGRITY CALCULATION ---
        // Rewards defense (+2% per kill) and punishes failure (-10% per breach)
        let integrity = 100 - (breaches * 10) + (kills * 2);
        integrity = Math.min(100, Math.max(0, integrity));

        const accuracy = shots > 0 ? ((kills / shots) * 100).toFixed(1) : 0;
        let barColor = integrity > 70 ? "#00ff00" : (integrity > 35 ? "#ffaa00" : "#ff4444");

        res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>SOC Dashboard</title>
    <style>
        body { background: #0a0e14; color: #00ff00; font-family: 'Segoe UI', Tahoma, sans-serif; padding: 20px; }
        .dashboard { max-width: 800px; margin: auto; border: 1px solid #1f2937; background: #111821; padding: 30px; border-radius: 8px; box-shadow: 0 0 30px rgba(0,0,0,0.7); }
        .header { text-align: center; margin-bottom: 30px; }
        .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 30px; }
        .card { background: #0d1117; border: 1px solid #1f2937; padding: 15px; text-align: center; border-radius: 4px; }
        .card h2 { font-size: 36px; margin: 0; color: #fff; font-family: monospace; }
        .card label { font-size: 10px; color: #4b5563; text-transform: uppercase; letter-spacing: 2px; }
        .bar-container { width: 100%; background: #070a0e; height: 45px; border-radius: 4px; border: 1px solid #1f2937; overflow: hidden; margin-top: 10px; }
        .bar-fill { height: 100%; width: ${integrity}%; background-color: ${barColor}; transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1); }
        .log-box { background: #000; border: 1px solid #1f2937; padding: 15px; height: 150px; overflow-y: auto; border-radius: 4px; font-family: 'Courier New', monospace; }
        .footer-btns { display: flex; gap: 10px; margin-top: 20px; }
        button { flex: 1; padding: 15px; border: none; font-weight: bold; cursor: pointer; text-transform: uppercase; border-radius: 4px; transition: 0.3s; }
        .sync-btn { background: #00ff00; color: #000; }
        .wipe-btn { background: #310a0a; color: #f87171; border: 1px solid #7f1d1d; }
    </style>
</head>
<body>
    <div class="dashboard">
        <div class="header">
            <h1 style="margin:0; letter-spacing: 5px; font-family: monospace;">SOC COMMAND CENTER</h1>
            <small style="color:#4b5563;">REAL-TIME TELEMETRY ANALYTICS</small>
        </div>
        <div class="grid">
            <div class="card"><h2>${kills}</h2><label>Malware Neutralized</label></div>
            <div class="card"><h2>${accuracy}%</h2><label>Overall Accuracy</label></div>
            <div class="card"><h2 style="color:#f87171;">${breaches}</h2><label>System Breaches</label></div>
        </div>
        <div style="margin-bottom:30px;">
            <div style="display:flex; justify-content:space-between; font-weight:bold;">
                <span>SYSTEM INTEGRITY INDEX</span>
                <span style="color:${barColor}; font-family: monospace;">${integrity}%</span>
            </div>
            <div class="bar-container"><div class="bar-fill"></div></div>
        </div>
        <div class="log-box">
            <div style="font-size: 11px; color: #4b5563; margin-bottom:10px;">LIVE INCIDENT FEED</div>
            ${logsHtml}
            <div style="color:#00ff00; font-size:13px; opacity: 0.5;">[SYSTEM] Monitoring active...</div>
        </div>
        <div class="footer-btns">
            <button class="sync-btn" onclick="location.href='/stats'">Sync Pipeline</button>
            <button class="wipe-btn" onclick="if(confirm('Purge logs?')) location.href='/clear'">Wipe Data</button>
        </div>
    </div>
</body>
</html>
        `);
    } catch (e) { res.status(500).send("Error: " + e.message); }
});

app.listen(PORT, () => console.log(`🚀 SOC Bridge Online: http://localhost:${PORT}`));