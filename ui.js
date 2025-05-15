export class UI {
    constructor() {
        this.createUI();
    }

    createUI() {
        // Create container for UI elements
        this.container = document.createElement('div');
        this.container.style.cssText = `
            position: fixed;
            top: 32px;
            left: 32px;
            z-index: 1000;
            display: flex;
            gap: 40px;
            font-family: Arial, sans-serif;
        `;

        // Create health panel
        this.healthPanel = document.createElement('div');
        this.healthPanel.style.cssText = `
            background: rgba(0, 0, 0, 0.7);
            padding: 16px 32px;
            border-radius: 14px;
            color: white;
            display: flex;
            align-items: center;
            gap: 16px;
        `;

        // Create health icon
        const healthIcon = document.createElement('img');
        healthIcon.src = 'assets/heart.svg';
        healthIcon.style.cssText = `
            width: 36px;
            height: 36px;
        `;
        this.healthPanel.appendChild(healthIcon);

        // Create health text
        this.healthText = document.createElement('span');
        this.healthText.style.cssText = `
            font-size: 32px;
            font-weight: bold;
        `;
        this.healthPanel.appendChild(this.healthText);

        // Create keys panel
        this.keysPanel = document.createElement('div');
        this.keysPanel.style.cssText = `
            background: rgba(0, 0, 0, 0.7);
            padding: 16px 32px;
            border-radius: 14px;
            color: white;
            display: flex;
            align-items: center;
            gap: 16px;
        `;

        // Create key icon
        const keyIcon = document.createElement('img');
        keyIcon.src = 'assets/key.png';
        keyIcon.style.cssText = `
            width: 36px;
            height: 36px;
        `;
        this.keysPanel.appendChild(keyIcon);

        // Create keys text
        this.keysText = document.createElement('span');
        this.keysText.style.cssText = `
            font-size: 32px;
            font-weight: bold;
        `;
        this.keysPanel.appendChild(this.keysText);

        // Add panels to container
        this.container.appendChild(this.healthPanel);
        this.container.appendChild(this.keysPanel);

        // Add container to document
        document.body.appendChild(this.container);

        // Add villain image to top right
        this.villainImg = document.createElement('img');
        this.villainImg.src = 'assets/villain.png';
        this.villainImg.alt = 'Villain';
        this.villainImg.style.cssText = `
            position: fixed;
            top: 64px;
            right: 64px;
            width: 192px;
            height: auto;
            z-index: 1100;
            pointer-events: none;
            user-select: none;
        `;
        document.body.appendChild(this.villainImg);

        // Initialize values
        this.updateHealth(5);
        this.updateKeys(0);

        // Create loading screen
        this.createLoadingScreen();
    }

    createLoadingScreen() {
        this.loadingScreen = document.createElement('div');
        this.loadingScreen.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 2000;
            color: white;
            font-family: Arial, sans-serif;
        `;

        const title = document.createElement('h1');
        title.textContent = 'Loading Game...';
        title.style.cssText = `
            font-size: 48px;
            margin-bottom: 28px;
            color: #fff;
        `;

        const progressContainer = document.createElement('div');
        progressContainer.style.cssText = `
            width: 300px;
            height: 20px;
            background: #333;
            border-radius: 10px;
            overflow: hidden;
            margin-bottom: 10px;
        `;

        this.progressBar = document.createElement('div');
        this.progressBar.style.cssText = `
            width: 0%;
            height: 100%;
            background: #4CAF50;
            transition: width 0.3s ease;
        `;

        this.progressText = document.createElement('div');
        this.progressText.style.cssText = `
            font-size: 24px;
            color: #fff;
            margin-bottom: 28px;
        `;

        this.startMessage = document.createElement('div');
        this.startMessage.style.cssText = `
            font-size: 32px;
            color: #4CAF50;
            font-weight: bold;
            text-align: center;
            opacity: 0;
            transition: opacity 0.5s ease;
        `;
        this.startMessage.textContent = 'Click anywhere to start';

        progressContainer.appendChild(this.progressBar);
        this.loadingScreen.appendChild(title);
        this.loadingScreen.appendChild(progressContainer);
        this.loadingScreen.appendChild(this.progressText);
        this.loadingScreen.appendChild(this.startMessage);
        document.body.appendChild(this.loadingScreen);
    }

    showStartMessage() {
        this.startMessage.style.opacity = '1';
    }

    updateLoadingProgress(progress, text) {
        this.progressBar.style.width = `${progress}%`;
        this.progressText.textContent = text;
        
        // When loading is complete, show the start message
        if (progress >= 100) {
            this.showStartMessage();
        }
    }

    hideLoadingScreen() {
        this.loadingScreen.style.display = 'none';
    }

    updateHealth(health) {
        this.healthText.textContent = health;
    }

    updateKeys(keys) {
        this.keysText.textContent = `${keys}/5`;
    }
} 