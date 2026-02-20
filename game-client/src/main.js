import Phaser from 'phaser';

// --- DATA BRIDGE ---
const dataEmitter = {
    emit: async (eventType, metadata) => {
        try {
            await fetch('http://localhost:3000/event', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    event_id: crypto.randomUUID(),
                    timestamp: new Date().toISOString(),
                    event_type: eventType,
                    metadata: metadata
                }),
                keepalive: true
            });
        } catch (e) { /* Silent fail to prevent crashes */ }
    }
};

class CyberGame extends Phaser.Scene {
    constructor() {
        super('CyberGame');
    }

    init() {
        this.integrity = 100;
        this.score = 0;
        this.breaches = 0;
        this.shotsFired = 0;
        this.isGameOver = false;
        this.gameStarted = false;
        this.currentPhase = 1;
        this.lastFired = 0; 
        this.eventLogs = ["> PIPELINE SYNCED...", "> AWAITING PROTOCOL"];
    }

    create() {
        this.input.setDefaultCursor('default');

        // --- 1. HIGH CONTRAST VISUALS ---
        this.cameras.main.setBackgroundColor('#000000'); // Pure black for max neon contrast
        this.add.grid(300, 300, 600, 600, 40, 40, 0x000000, 0, 0x00f3ff, 0.1).setDepth(0);
        this.scanLine = this.add.rectangle(300, 0, 600, 2, 0x00f3ff, 0.4).setDepth(5);

        // --- 2. PLAYER (THE CORE) ---
        this.player = this.add.container(300, 300).setDepth(20);
        const outerCore = this.add.rectangle(0, 0, 36, 36, 0x00ff00, 0.15).setStrokeStyle(2, 0x00ff00);
        const innerCore = this.add.rectangle(0, 0, 12, 12, 0x00ff00, 1); // Solid bright core
        this.player.add([outerCore, innerCore]);
        this.physics.add.existing(this.player);
        this.player.body.setCircle(18, -18, -18);

        // --- 3. GROUPS ---
        this.bullets = this.physics.add.group();
        this.enemies = this.physics.add.group();

        // --- 4. HUD & INSTRUCTIONS ---
        this.setupSidebar();
        this.showAuthScreen();

        // --- 5. BUG-FREE COLLISIONS ---
        this.physics.add.overlap(this.bullets, this.enemies, (bullet, enemy) => {
            if (!bullet.active || !enemy.active) return; // Prevents double-hit crashes
            
            bullet.setActive(false).setVisible(false).destroy();
            enemy.setActive(false).setVisible(false).destroy();
            
            this.createImpactSpark(enemy.x, enemy.y);
            this.score += 1;
            this.checkPhaseProgression();
            this.updateTerminal("> THREAT NEUTRALIZED");
            dataEmitter.emit('threat_neutralized', { score: this.score, phase: this.currentPhase });
        });

        this.physics.add.overlap(this.player, this.enemies, (player, enemy) => {
            if (!enemy.active) return;
            enemy.setActive(false).setVisible(false).destroy();
            
            this.breaches++;
            this.integrity -= 10;
            this.updateTerminal("> CRITICAL BREACH!", "#ff0055");
            
            this.cameras.main.shake(150, 0.015);
            this.cameras.main.flash(200, 255, 0, 0, 0.3);
            
            dataEmitter.emit('security_breach', { count: this.breaches });
            if (this.integrity <= 0) this.triggerSystemFailure();
        });

        // --- 6. INPUTS ---
        this.input.on('pointerdown', () => this.attemptFire());
        this.input.keyboard.on('keydown-SPACE', () => this.attemptFire());
    }

    setupSidebar() {
        this.add.rectangle(700, 300, 200, 600, 0x050a0f).setDepth(100);
        this.add.line(600, 300, 0, 0, 0, 600, 0x00f3ff, 0.5).setDepth(101);
        
        this.add.text(610, 20, 'TELEMETRY STREAM', { fontSize: '14px', fill: '#00f3ff', fontFamily: 'monospace', fontWeight: 'bold' }).setDepth(101);
        this.logFeed = this.add.text(610, 50, '', { fontSize: '10px', fill: '#00f3ff', fontFamily: 'monospace', lineSpacing: 8, opacity: 0.9 }).setDepth(101);
        
        this.add.text(610, 480, 'SYSTEM INTEGRITY', { fontSize: '10px', fill: '#ffffff', fontFamily: 'monospace' }).setDepth(101);
        this.integrityBar = this.add.rectangle(610, 495, 180, 8, 0x00ff00).setOrigin(0, 0.5).setDepth(101);
        
        this.phaseLabel = this.add.text(610, 520, 'PHASE: 1', { fontSize: '16px', fill: '#00f3ff', fontFamily: 'monospace', fontWeight: 'bold' }).setDepth(101);
        this.accuracyLabel = this.add.text(610, 550, 'EFFICIENCY: 0%', { fontSize: '12px', fill: '#ffffff', fontFamily: 'monospace' }).setDepth(101);
        
        this.uiBreaches = this.add.text(20, 20, 'BREACHES: 0/10', { fontSize: '18px', fill: '#ffffff', fontFamily: 'monospace', fontWeight: 'bold' }).setDepth(101);
        this.uiScore = this.add.text(20, 45, 'SCORE: 0', { fontSize: '14px', fill: '#00ff00', fontFamily: 'monospace' }).setDepth(101);
    }

    showAuthScreen() {
        this.physics.pause();
        const overlay = this.add.rectangle(400, 300, 800, 600, 0x000000, 0.9).setDepth(1000);
        const panel = this.add.rectangle(400, 300, 500, 320, 0x050a0f).setDepth(1001).setStrokeStyle(2, 0x00f3ff);
        
        const title = this.add.text(400, 180, "CYBER-SENTINEL OPS", { fontSize: '28px', fill: '#00f3ff', fontFamily: 'monospace', fontWeight: 'bold' }).setOrigin(0.5).setDepth(1002);
        
        const protocols = 
            "MISSION: DEFEND CORE FROM MALWARE INTRUSION\n\n" +
            "CONTROLS: [MOUSE] AIM  |  [CLICK/SPACE] FIRE\n\n" +
            "WARNING: THREAT LEVEL ESCALATES DYNAMICALLY.\n" +
            "10 BREACHES = CRITICAL SYSTEM FAILURE.";

        const desc = this.add.text(400, 270, protocols, { fontSize: '13px', fill: '#ffffff', fontFamily: 'monospace', align: 'center', lineSpacing: 8 }).setOrigin(0.5).setDepth(1002);
        
        const btn = this.add.rectangle(400, 380, 240, 50, 0x00ff00).setInteractive({ useHandCursor: true }).setDepth(1002);
        const btnText = this.add.text(400, 380, "AUTHORIZE CORE", { fontSize: '18px', fill: '#000000', fontFamily: 'monospace', fontWeight: 'bold' }).setOrigin(0.5).setDepth(1003);

        // SAFELY STORE UI ELEMENTS TO DESTROY THEM WITHOUT CRASHING
        const authElements = [overlay, panel, title, desc, btn, btnText];

        btn.on('pointerdown', () => {
            this.input.setDefaultCursor('crosshair'); 
            
            // BUG FIX: Explicitly destroy objects instead of querying the scene list
            authElements.forEach(el => el.destroy());
            
            this.physics.resume();
            this.gameStarted = true;
            this.spawnTimer = this.time.addEvent({ delay: 1500, callback: this.spawnMalware, callbackScope: this, loop: true });
        });
    }

    checkPhaseProgression() {
        let newPhase = this.currentPhase;
        if (this.score === 30) newPhase = 2;
        if (this.score === 50) newPhase = 3;
        if (this.score === 80) newPhase = 4;
        if (this.score === 100) newPhase = 5;
        if (this.score === 120) newPhase = 6;

        if (newPhase !== this.currentPhase) {
            this.currentPhase = newPhase;
            this.phaseLabel.setText(`PHASE: ${this.currentPhase}`).setFill('#ff0055');
            this.updateTerminal(`> PHASE ${this.currentPhase} INITIATED`, '#ffff00');
            
            const alert = this.add.text(300, 300, `PHASE ${this.currentPhase}`, { fontSize: '64px', fill: '#00f3ff', fontFamily: 'monospace', fontWeight: 'bold', fontStyle: 'italic' }).setOrigin(0.5).setAlpha(0.6).setDepth(10);
            this.tweens.add({ targets: alert, scale: 2, alpha: 0, duration: 1500, onComplete: () => alert.destroy() });
        }
    }

    attemptFire() {
        if (!this.gameStarted || this.isGameOver) return;
        
        if (this.time.now - this.lastFired < 150) return; // Anti-spam lock
        this.lastFired = this.time.now;

        this.shotsFired++;
        let angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, this.input.x, this.input.y);
        
        const b = this.add.rectangle(this.player.x, this.player.y, 20, 3, 0x00f3ff).setDepth(15).setRotation(angle);
        this.physics.add.existing(b);
        this.bullets.add(b);
        this.physics.velocityFromRotation(angle, 1400, b.body.velocity);
        
        dataEmitter.emit('fire_event', { phase: this.currentPhase });
    }

    spawnMalware() {
        if (this.isGameOver) return;
        let x, y;
        
        if (this.currentPhase === 6 && Math.random() < 0.3) {
            x = Phaser.Math.Between(150, 450); y = Phaser.Math.Between(150, 450);
            this.updateTerminal("> LOCAL INTRUSION", "#ffaa00");
            this.cameras.main.flash(100, 255, 100, 0, 0.1);
        } else {
            x = Math.random() > 0.5 ? -30 : 630;
            y = Phaser.Math.Between(0, 600);
        }

        const m = this.add.rectangle(x, y, 20, 20, 0xff0055, 0.2).setStrokeStyle(2, 0xff0055).setDepth(15);
        this.physics.add.existing(m);
        this.enemies.add(m);
    }

    update(time) {
        if (!this.gameStarted || this.isGameOver) return;

        this.scanLine.y += 3; if (this.scanLine.y > 600) this.scanLine.y = 0;

        const acc = this.shotsFired > 0 ? Math.round((this.score / this.shotsFired) * 100) : 0;
        this.accuracyLabel.setText(`EFFICIENCY: ${acc}%`);
        this.uiScore.setText(`SCORE: ${this.score * 100}`);
        this.uiBreaches.setText(`BREACHES: ${this.breaches}/10`).setFill(this.breaches >= 7 ? '#ff0055' : '#ffffff');
        
        let currentHealth = Math.min(100, Math.max(0, 100 - (this.breaches * 10) + Math.floor(this.score * 0.5)));
        this.integrityBar.width = (currentHealth / 100) * 180;
        this.integrityBar.setFillStyle(currentHealth < 40 ? 0xff0055 : 0x00ff00);

        this.player.setRotation(Phaser.Math.Angle.Between(this.player.x, this.player.y, this.input.x, this.input.y));

        this.enemies.getChildren().forEach(m => {
            if (!m.active) return;
            
            let speed = 90;
            if (this.currentPhase === 2) speed = 90 + ((this.score - 30) * 1.5); 
            if (this.currentPhase >= 3) speed = 160; 
            if (this.currentPhase >= 4) speed = 160 + ((this.score - 80) * 0.5); 

            let angle = Phaser.Math.Angle.Between(m.x, m.y, this.player.x, this.player.y);

            if (this.currentPhase >= 3 && this.currentPhase !== 5) {
                let wobble = Math.sin(time / 150) * 70;
                m.body.setVelocity(
                    Math.cos(angle) * speed + Math.cos(angle + Math.PI/2) * wobble,
                    Math.sin(angle) * speed + Math.sin(angle + Math.PI/2) * wobble
                );
            } else if (this.currentPhase === 5) {
                let sine = Math.sin(time / 200) * 200;
                m.body.setVelocity(
                    Math.cos(angle) * speed + Math.cos(angle + Math.PI/2) * sine,
                    Math.sin(angle) * speed + Math.sin(angle + Math.PI/2) * sine
                );
            } else {
                this.physics.moveToObject(m, this.player, speed);
            }
        });
    }

    updateTerminal(msg, color = '#00f3ff') {
        const timeStr = new Date().toLocaleTimeString().split(' ')[0];
        this.eventLogs.unshift(`[${timeStr}] ${msg}`);
        if (this.eventLogs.length > 20) this.eventLogs.pop();
        this.logFeed.setText(this.eventLogs.join('\n'));
    }

    createImpactSpark(x, y) {
        for (let i = 0; i < 5; i++) {
            const p = this.add.rectangle(x, y, 4, 4, 0x00f3ff).setDepth(14);
            this.physics.add.existing(p);
            p.body.setVelocity(Phaser.Math.Between(-150, 150), Phaser.Math.Between(-150, 150));
            this.tweens.add({ targets: p, scale: 0, alpha: 0, duration: 300, onComplete: () => p.destroy() });
        }
    }

    triggerSystemFailure() {
        this.isGameOver = true;
        this.physics.pause();
        this.spawnTimer.remove();
        this.input.setDefaultCursor('default'); 

        const overlay = this.add.rectangle(400, 300, 800, 600, 0x000000, 0.95).setDepth(5000);
        this.add.text(400, 200, "CRITICAL SYSTEM FAILURE", { fontSize: '38px', fill: '#ff0055', fontFamily: 'monospace', fontWeight: 'bold' }).setOrigin(0.5).setDepth(5001);
        
        const dashBtn = this.add.rectangle(400, 330, 360, 50, 0x00f3ff).setInteractive({ useHandCursor: true }).setDepth(5001);
        this.add.text(400, 330, "VIEW SOC ANALYTICS", { fontSize: '20px', fill: '#000000', fontFamily: 'monospace', fontWeight: 'bold' }).setOrigin(0.5).setDepth(5002);
        dashBtn.on('pointerdown', () => this.renderHighEndDashboard());

        const rebootBtn = this.add.text(400, 420, '[ INITIATE REBOOT ]', { fontSize: '16px', fill: '#ffffff', fontFamily: 'monospace' }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(5001);
        rebootBtn.on('pointerdown', () => this.scene.restart());
    }

    renderHighEndDashboard() {
        // High Contrast Dashboard Background
        this.add.rectangle(400, 300, 800, 600, 0x050a0f, 1).setDepth(10000);
        
        this.add.rectangle(400, 40, 800, 80, 0x09121a).setDepth(10001).setStrokeStyle(1, 0x1e293b);
        this.add.text(40, 40, "SOC COMMAND CENTER // POST-MORTEM REPORT", { fontSize: '20px', fill: '#ffffff', fontFamily: 'monospace', fontWeight: 'bold' }).setOrigin(0, 0.5).setDepth(10002);
        
        const acc = this.shotsFired > 0 ? Math.round((this.score / this.shotsFired) * 100) : 0;
        
        const metrics = [
            { title: "NEUTRALIZED", val: this.score, col: "#00ff00" },
            { title: "EFFICIENCY", val: acc + "%", col: "#00f3ff" },
            { title: "FINAL PHASE", val: "P" + this.currentPhase, col: "#ffff00" }
        ];

        metrics.forEach((m, i) => {
            const xOffset = 150 + (i * 250);
            this.add.rectangle(xOffset, 180, 220, 130, 0x09121a).setStrokeStyle(2, 0x1e293b).setDepth(10001);
            this.add.text(xOffset, 160, m.val, { fontSize: '48px', fill: m.col, fontFamily: 'monospace', fontWeight: 'bold' }).setOrigin(0.5).setDepth(10002);
            this.add.text(xOffset, 215, m.title, { fontSize: '14px', fill: '#ffffff', fontFamily: 'monospace', fontWeight: 'bold' }).setOrigin(0.5).setDepth(10002);
        });

        this.add.rectangle(400, 400, 720, 200, 0x09121a).setStrokeStyle(2, 0x1e293b).setDepth(10001);
        this.add.text(60, 320, "SYSTEM EVENT LOG (SNOWFLAKE SYNC: OK)", { fontSize: '12px', fill: '#00f3ff', fontFamily: 'monospace' }).setDepth(10002);
        this.add.text(60, 350, this.eventLogs.slice(0, 8).join('\n'), { fontSize: '13px', fill: '#00ff00', fontFamily: 'monospace', lineSpacing: 6 }).setDepth(10002);

        const closeBtn = this.add.text(400, 550, '[ CLOSE DASHBOARD ]', { fontSize: '16px', fill: '#ff4444', fontFamily: 'monospace', fontWeight: 'bold' }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(10002);
        closeBtn.on('pointerdown', () => this.scene.restart());
    }
}

new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'app',
    width: 800,
    height: 600,
    roundPixels: true, 
    physics: { default: 'arcade', arcade: { debug: false } },
    scene: [CyberGame]
});