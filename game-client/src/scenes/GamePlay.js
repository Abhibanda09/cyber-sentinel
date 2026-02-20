import Phaser from 'phaser';
import { GamePlay } from './scenes/GamePlay.js';

// Embedded Data Emitter Logic (No import needed!)
const internalEmitter = {
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
            console.log(`✅ Data Sent: ${eventType}`);
        } catch (e) {
            console.warn("Pipeline Offline - Game continuing local-only.");
        }
    }
};

export class GamePlay extends Phaser.Scene {
    constructor() {
        super('GamePlay');
        this.buffer = 100;
        this.score = 0;
        this.isGameOver = false;
    }

    create() {
        this.buffer = 100;
        this.score = 0;
        this.isGameOver = false;
        this.cameras.main.setBackgroundColor('#0d1117');

        // Player (Firewall Node)
        this.player = this.add.rectangle(400, 300, 40, 40, 0x00ff00);
        this.physics.add.existing(this.player);

        // Physics Groups
        this.bullets = this.physics.add.group();
        this.enemies = this.physics.add.group();

        // UI
        this.uiText = this.add.text(20, 20, 'Buffer: 100% | Threats: 0', { 
            fontSize: '18px', 
            fill: '#00ff00',
            fontFamily: 'monospace' 
        });

        // Controls
        this.fireKey = this.input.keyboard.addKey('SPACE');

        // Enemy Spawner (3-second interval for CPU stability)
        this.time.addEvent({
            delay: 3000,
            callback: this.spawnEnemy,
            callbackScope: this,
            loop: true
        });

        // Bullet vs Enemy Collision
        this.physics.add.overlap(this.bullets, this.enemies, (bullet, enemy) => {
            bullet.destroy();
            enemy.destroy();
            this.score++;
            internalEmitter.emit('threat_neutralized', { score: this.score });
        });

        // Player vs Enemy Collision
        this.physics.add.overlap(this.player, this.enemies, (player, enemy) => {
            enemy.destroy();
            this.buffer -= 10;
            internalEmitter.emit('security_breach', { buffer: this.buffer });
            if (this.buffer <= 0) this.handleGameOver();
        });
    }

    update() {
        if (this.isGameOver) return;

        this.uiText.setText(`Buffer: ${this.buffer}% | Threats Filtered: ${this.score}`);

        // Rotate to Mouse
        let angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, this.input.x, this.input.y);
        this.player.setRotation(angle);

        // Fire on Space
        if (Phaser.Input.Keyboard.JustDown(this.fireKey)) {
            this.fireBullet(angle);
        }
    }

    fireBullet(angle) {
        const bullet = this.add.rectangle(this.player.x, this.player.y, 12, 4, 0x00ff00);
        this.physics.add.existing(bullet);
        this.bullets.add(bullet);
        this.physics.velocityFromRotation(angle, 500, bullet.body.velocity);
        internalEmitter.emit('fire_event', { angle: angle.toFixed(2) });
    }

    spawnEnemy() {
        if (this.isGameOver) return;
        const x = Math.random() > 0.5 ? -20 : 820;
        const y = Phaser.Math.Between(0, 600);
        const enemy = this.add.rectangle(x, y, 25, 25, 0xff3333);
        this.physics.add.existing(enemy);
        this.enemies.add(enemy);
        this.physics.moveToObject(enemy, this.player, 80);
    }

    handleGameOver() {
        this.isGameOver = true;
        this.physics.pause();
        this.add.text(400, 300, 'SYSTEM COMPROMISED', { 
            fontSize: '40px', 
            fill: '#ff0000',
            backgroundColor: '#000' 
        }).setOrigin(0.5);
        internalEmitter.emit('game_over', { final_score: this.score });
        this.time.delayedCall(3000, () => this.scene.restart());
    }
}