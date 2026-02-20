import Phaser from 'phaser';

export class FilterBeam extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, angle) {
        super(scene, x, y);
        
        // Add to scene and physics
        scene.add.existing(this);
        scene.physics.add.existing(this);

        // Visuals: A small glowing line
        this.setOrigin(0.5);
        const graphics = scene.add.graphics();
        graphics.lineStyle(2, 0x00ff00);
        graphics.lineBetween(0, 0, 10, 0);
        
        // Setup physics based on angle
        this.setRotation(angle);
        this.speed = 600;
        
        // Calculate velocity from angle
        const vx = Math.cos(angle) * this.speed;
        const vy = Math.sin(angle) * this.speed;
        this.setVelocity(vx, vy);

        // Auto-destroy after 2 seconds to save memory
        scene.time.delayedCall(2000, () => this.destroy());
    }
}