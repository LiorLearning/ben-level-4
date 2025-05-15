export class MathQuiz {
    constructor() {
        this.correctAnswers = 0;
        this.attempts = 0;
        this.currentQuestion = null;
        this.dialog = null;
        this.isActive = false;
    }

    generateQuestion() {
        const operation = Math.random() < 0.5 ? 'multiplication' : 'division';
        let question, answer, options;

        if (operation === 'multiplication') {
            // Harder single-digit facts: both numbers between 3 and 9
            const num1 = Math.floor(Math.random() * 7) + 3; // 3-9
            const num2 = Math.floor(Math.random() * 7) + 3; // 3-9
            answer = num1 * num2;
            question = `${num1} × ${num2} = ?`;
        } else {
            // Division: divisor between 3 and 9, quotient between 3 and 9
            const divisor = Math.floor(Math.random() * 7) + 3; // 3-9
            const quotient = Math.floor(Math.random() * 7) + 3; // 3-9
            const dividend = divisor * quotient;
            answer = quotient;
            question = `${dividend} ÷ ${divisor} = ?`;
        }

        // Generate 4 options
        options = [answer];
        while (options.length < 4) {
            const option = operation === 'multiplication' 
                ? Math.floor(Math.random() * 81) + 9 // 9-89 (covers 3x3 to 9x9)
                : Math.floor(Math.random() * 7) + 3; // 3-9
            if (!options.includes(option)) {
                options.push(option);
            }
        }

        // Shuffle options
        options = options.sort(() => Math.random() - 0.5);

        return {
            question,
            answer,
            options
        };
    }

    createDialog() {
        // Remove existing dialog if any
        if (this.dialog) {
            document.body.removeChild(this.dialog);
        }

        this.dialog = document.createElement('div');
        this.dialog.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.9);
            padding: 20px;
            border-radius: 10px;
            color: white;
            text-align: center;
            z-index: 1000;
            min-width: 300px;
        `;

        const questionElement = document.createElement('div');
        questionElement.style.cssText = `
            font-size: 24px;
            margin-bottom: 20px;
        `;
        this.dialog.appendChild(questionElement);

        const optionsContainer = document.createElement('div');
        optionsContainer.style.cssText = `
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-bottom: 20px;
        `;
        this.dialog.appendChild(optionsContainer);

        const statusElement = document.createElement('div');
        statusElement.style.cssText = `
            font-size: 18px;
            margin-top: 10px;
            color: #aaa;
        `;
        this.dialog.appendChild(statusElement);

        document.body.appendChild(this.dialog);
        return { questionElement, optionsContainer, statusElement };
    }

    showQuestion() {
        const { questionElement, optionsContainer, statusElement } = this.createDialog();
        this.currentQuestion = this.generateQuestion();
        
        questionElement.textContent = this.currentQuestion.question;
        statusElement.textContent = `Correct answers: ${this.correctAnswers}/3`;

        this.currentQuestion.options.forEach((option, index) => {
            const button = document.createElement('button');
            button.textContent = option;
            button.style.cssText = `
                padding: 10px;
                font-size: 18px;
                border: 2px solid #444;
                border-radius: 5px;
                background: #333;
                color: white;
                cursor: pointer;
                transition: all 0.2s;
            `;

            button.addEventListener('mouseover', () => {
                button.style.background = '#444';
            });

            button.addEventListener('mouseout', () => {
                button.style.background = '#333';
            });

            button.addEventListener('click', () => this.handleAnswer(option, button, statusElement));
            optionsContainer.appendChild(button);
        });
    }

    handleAnswer(selectedAnswer, button, statusElement) {
        if (selectedAnswer === this.currentQuestion.answer) {
            this.correctAnswers++;
            button.style.background = '#2ecc71';
            statusElement.textContent = `Correct answers: ${this.correctAnswers}/3`;
            
            if (this.correctAnswers >= 3) {
                setTimeout(() => {
                    this.closeDialog();
                    this.onComplete();
                }, 1000);
            } else {
                setTimeout(() => this.showQuestion(), 1000);
            }
        } else {
            this.attempts++;
            if (this.attempts >= 2) {
                button.style.background = '#e74c3c';
                setTimeout(() => {
                    this.closeDialog();
                    this.onComplete();
                }, 1000);
            } else {
                button.style.background = '#e74c3c';
                statusElement.textContent = `Wrong! Try again. Correct answers: ${this.correctAnswers}/3`;
            }
        }
    }

    closeDialog() {
        if (this.dialog) {
            document.body.removeChild(this.dialog);
            this.dialog = null;
        }
        this.isActive = false;
    }

    start(onComplete) {
        this.correctAnswers = 0;
        this.attempts = 0;
        this.isActive = true;
        this.onComplete = onComplete;
        this.showQuestion();
    }
} 