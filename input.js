export class InputManager {
    constructor() {
        this.keys = {
            left: false,
            right: false,
            jump: false,
            shoot: false
        };
        this.setupEventListeners();
    }

    setupEventListeners() {
        window.addEventListener('keydown', (event) => this.handleKeyEvent(event, true));
        window.addEventListener('keyup', (event) => this.handleKeyEvent(event, false));
    }

    handleKeyEvent(event, isPressed) {
        switch (event.key) {
            case 'ArrowLeft':
            case 'a':
            case 'A':
                this.keys.left = isPressed;
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                this.keys.right = isPressed;
                break;
            case ' ': // Spacebar
            case 'ArrowUp':
            case 'w':
            case 'W':
                this.keys.jump = isPressed;
                break;
            case 'e':
            case 'E':
                this.keys.shoot = isPressed;
                break;
        }
    }
}