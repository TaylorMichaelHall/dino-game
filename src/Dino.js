import { CONFIG } from './Constants.js';

export class Dino {
    constructor(game) {
        this.game = game;
        this.width = 40;
        this.height = 40;
        this.x = 50;
        this.y = this.game.height / 2;
        this.velocity = 0;

        // Tuned for "Floaty" but responsive feel using deltaTime
        this.gravity = CONFIG.GRAVITY;
        this.jumpStrength = CONFIG.JUMP_STRENGTH;
        this.maxVelocity = CONFIG.MAX_FALL_SPEED;

        this.radius = 20; // For circular collision approximation

        this.types = ['Raptor', 'Pterosaur', 'T-Rex'];
        this.colors = CONFIG.DINO_COLORS; // Green, Orange, Red, Black

        this.level = 0; // 0=Raptor, 1=Pterosaur, 2=T-Rex
        this.colorIndex = 0;

        this.invulnerable = false;
        this.invulnerableTimer = 0;
        this.flashSpeed = CONFIG.FLASH_SPEED; // seconds
        this.timeSinceLastFlash = 0;
        this.visible = true;
    }

    update(deltaTime) {
        // Physics (Pixels per second)
        this.velocity += this.gravity * deltaTime;

        // Cap falling speed for smoother feel
        if (this.velocity > this.maxVelocity) this.velocity = this.maxVelocity;

        this.y += this.velocity * deltaTime;

        // Ground/Ceiling collision
        if (this.y + (this.height * 0.8) > this.game.height) {
            this.y = this.game.height - (this.height * 0.8);
            this.velocity = 0;
        }
        if (this.y < 0) {
            this.y = 0;
            this.velocity = 0;
        }

        // Invulnerability Logic
        if (this.invulnerable) {
            this.invulnerableTimer -= deltaTime;
            this.timeSinceLastFlash += deltaTime;
            if (this.timeSinceLastFlash >= this.flashSpeed) {
                this.visible = !this.visible;
                this.timeSinceLastFlash = 0;
            }
            if (this.invulnerableTimer <= 0) {
                this.invulnerable = false;
                this.visible = true;
            }
        }
    }

    draw(ctx) {
        if (!this.visible) return;

        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);

        // Rotate based on velocity (scaled for pixels/sec)
        const rotation = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, (this.velocity * 0.0015)));
        ctx.rotate(rotation);

        const color = this.getCurrentColor();
        ctx.fillStyle = color;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;

        const type = this.types[this.level];

        // Scale down slightly to fit the 40x40 box better with complex paths
        ctx.scale(0.8, 0.8);

        if (type === 'Raptor') {
            this.drawRaptor(ctx);
        } else if (type === 'Pterosaur') {
            this.drawPterosaur(ctx);
        } else if (type === 'T-Rex') {
            this.drawTRex(ctx);
        }

        ctx.restore();
    }

    getCurrentColor() {
        return this.colors[this.colorIndex % this.colors.length];
    }

    getNextColor() {
        // Look ahead logic for cycling
        let nextIndex = this.colorIndex + 1;
        return this.colors[nextIndex % this.colors.length];
    }

    jump() {
        this.velocity = this.jumpStrength;
    }

    upgrade() {
        this.level++;
        if (this.level >= this.types.length) {
            this.level = 0;
            this.colorIndex++;
        }
    }

    getDinoName() {
        return this.types[this.level];
    }

    takeDamage() {
        this.invulnerable = true;
        this.invulnerableTimer = CONFIG.INVULNERABLE_DURATION; // 1 second
    }

    reset() {
        this.y = this.game.height / 2;
        this.velocity = 0;
        this.level = 0;
        this.colorIndex = 0;
        this.invulnerable = false;
        this.visible = true;
    }

    // --- High Fidelity Shapes ---

    drawRaptor(ctx) {
        // High-Fidelity Raptor
        ctx.beginPath();
        // Tail (S-curve)
        ctx.moveTo(-20, 0);
        ctx.quadraticCurveTo(-35, -15, -50, -5);
        ctx.quadraticCurveTo(-35, 5, -20, 10);

        // Body (Lean)
        ctx.lineTo(-5, 15);
        ctx.quadraticCurveTo(5, 18, 15, 10); // Chest

        // Neck & Head
        ctx.lineTo(15, -5); // Neck up
        ctx.quadraticCurveTo(18, -15, 25, -18); // Head top
        ctx.lineTo(35, -15); // Snout tip
        ctx.lineTo(35, -8); // Jaw front
        ctx.lineTo(25, -5); // Under jaw
        ctx.quadraticCurveTo(15, -5, 10, 5); // Throat

        // Back
        ctx.lineTo(-10, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Eye
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(25, -12, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Arm (Claw)
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(10, 5);
        ctx.lineTo(18, 3);
        ctx.lineTo(22, 6);
        ctx.stroke();

        // Strong Leg (Digitigrade)
        ctx.beginPath();
        ctx.moveTo(-5, 10);
        ctx.lineTo(-10, 25); // Thigh
        ctx.lineTo(0, 32);  // Toe
        ctx.stroke();
    }

    drawPterosaur(ctx) {
        // High-Fidelity Pterosaur
        // Body (Small/Aerodynamic)
        ctx.beginPath();
        ctx.moveTo(-10, 0);
        ctx.quadraticCurveTo(0, 10, 15, 0);
        ctx.lineTo(10, -5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Head & Crest
        ctx.beginPath();
        ctx.moveTo(10, -3);
        ctx.lineTo(15, -25); // Crest Tip
        ctx.lineTo(15, -5); // Back of head
        ctx.lineTo(35, -8); // Beak Tip
        ctx.lineTo(15, 2);  // Jaw
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Wings (Large & Dynamic)
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(10, -40, 40, -50, 55, -45); // Top of wing
        ctx.quadraticCurveTo(30, -10, -5, 5); // Membrane bottom
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Eye
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(18, -4, 2, 0, Math.PI * 2);
        ctx.fill();

        // Feet (Tucked)
        ctx.beginPath();
        ctx.moveTo(-5, 5);
        ctx.lineTo(-12, 12);
        ctx.stroke();
    }

    drawTRex(ctx) {
        // Massive Head and Body
        ctx.beginPath();

        // Tail
        ctx.moveTo(-20, 15);
        ctx.quadraticCurveTo(-45, 30, -60, 10); // Extends further back and curves
        ctx.quadraticCurveTo(-45, 0, -20, -5); // Back

        // Back hump
        ctx.quadraticCurveTo(-5, -15, 10, -20);

        // Head (Boxy)
        ctx.lineTo(15, -30); // Neck up
        ctx.lineTo(35, -30); // Snout
        ctx.lineTo(35, -15); // Jaw front
        ctx.lineTo(20, -15); // Jaw back
        ctx.lineTo(15, -10); // Throat

        // Belly
        ctx.quadraticCurveTo(10, 15, 0, 20);
        ctx.lineTo(-20, 15);

        ctx.fill();
        ctx.stroke();

        // Eye
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(25, -22, 3, 0, Math.PI * 2);
        ctx.fill();

        // Tiny Arm
        ctx.strokeStyle = '#fff';
        ctx.beginPath();
        ctx.moveTo(10, 5);
        ctx.lineTo(18, 10);
        ctx.stroke();

        // Big Leg
        ctx.beginPath();
        ctx.moveTo(-5, 15);
        ctx.lineTo(0, 30);
        ctx.lineTo(10, 30);
        ctx.stroke();
    }
}
