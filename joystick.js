class Joystick {
    constructor(zoneId, baseId, stickId) {
        this.zone = document.getElementById(zoneId);
        this.base = document.getElementById(baseId);
        this.stick = document.getElementById(stickId);
        
        this.active = false;
        this.identifier = null;
        this.origin = { x: 0, y: 0 };
        this.current = { x: 0, y: 0 };
        this.vector = { x: 0, y: 0 }; // Normalized -1 to 1
        
        this.init();
    }

    init() {
        this.zone.addEventListener('touchstart', (e) => this.handleStart(e), { passive: false });
        this.zone.addEventListener('touchmove', (e) => this.handleMove(e), { passive: false });
        this.zone.addEventListener('touchend', (e) => this.handleEnd(e), { passive: false });
        this.zone.addEventListener('touchcancel', (e) => this.handleEnd(e), { passive: false });
    }

    handleStart(e) {
        e.preventDefault();
        if (this.active) return;

        const touch = e.changedTouches[0];
        this.identifier = touch.identifier;
        this.active = true;

        this.origin = { x: touch.clientX, y: touch.clientY };
        this.current = { x: touch.clientX, y: touch.clientY };

        this.base.style.display = 'block';
        this.base.style.left = `${this.origin.x}px`;
        this.base.style.top = `${this.origin.y}px`;
        
        this.updateStickPosition();
    }

    handleMove(e) {
        e.preventDefault();
        if (!this.active) return;

        let touch = null;
        for (let i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === this.identifier) {
                touch = e.changedTouches[i];
                break;
            }
        }

        if (!touch) return;

        this.current = { x: touch.clientX, y: touch.clientY };
        
        // Calculate vector
        const dx = this.current.x - this.origin.x;
        const dy = this.current.y - this.origin.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const maxRadius = 50;

        if (distance > maxRadius) {
            const angle = Math.atan2(dy, dx);
            this.vector.x = Math.cos(angle);
            this.vector.y = Math.sin(angle);
            
            this.current.x = this.origin.x + this.vector.x * maxRadius;
            this.current.y = this.origin.y + this.vector.y * maxRadius;
        } else {
            this.vector.x = dx / maxRadius;
            this.vector.y = dy / maxRadius;
        }

        this.updateStickPosition();
    }

    handleEnd(e) {
        let touchExists = false;
        for (let i = 0; i < e.touches.length; i++) {
            if (e.touches[i].identifier === this.identifier) touchExists = true;
        }

        if (!touchExists) {
            this.active = false;
            this.identifier = null;
            this.vector = { x: 0, y: 0 };
            this.base.style.display = 'none';
        }
    }

    updateStickPosition() {
        const dx = this.current.x - this.origin.x;
        const dy = this.current.y - this.origin.y;
        this.stick.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    }
}
