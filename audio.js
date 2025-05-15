export class AudioManager {
    constructor() {
        this.audioFiles = {
            bgm: 'assets/bgm.mp3',
            explosion: 'assets/explosion.mp3',
            hit: 'assets/hit.mp3'
        };
        
        this.audioElements = {};
        this.loadedCount = 0;
        this.totalFiles = Object.keys(this.audioFiles).length;
        this.isLoaded = false;
    }

    async loadAll(onProgress) {
        console.log('Starting audio loading...');
        
        const loadPromises = Object.entries(this.audioFiles).map(([key, path]) => {
            return new Promise((resolve, reject) => {
                console.log(`Loading audio file: ${path}`);
                const audio = new Audio();
                
                // Add multiple event listeners to better track loading state
                audio.addEventListener('canplaythrough', () => {
                    console.log(`Audio file loaded successfully: ${path}`);
                    this.loadedCount++;
                    const progress = (this.loadedCount / this.totalFiles) * 100;
                    onProgress(progress, `Loading audio: ${key} (${Math.round(progress)}%)`);
                    resolve();
                });

                audio.addEventListener('error', (error) => {
                    console.error(`Error loading audio file ${path}:`, error);
                    reject(error);
                });

                audio.addEventListener('loadstart', () => {
                    console.log(`Started loading: ${path}`);
                });

                audio.addEventListener('progress', (event) => {
                    console.log(`Loading progress for ${path}:`, event);
                });

                // Set audio properties before loading
                if (key === 'bgm') {
                    audio.loop = true;
                    audio.volume = 0.5;
                } else {
                    audio.volume = 0.7;
                }

                // Set preload attribute
                audio.preload = 'auto';

                // Load the audio file
                audio.src = path;
                this.audioElements[key] = audio;

                // Force load by attempting to play and immediately pausing
                const playPromise = audio.play();
                if (playPromise !== undefined) {
                    playPromise.then(() => {
                        audio.pause();
                        audio.currentTime = 0;
                    }).catch(error => {
                        console.log(`Initial play attempt failed for ${path}:`, error);
                        // This is expected in some browsers due to autoplay policies
                    });
                }
            });
        });

        try {
            await Promise.all(loadPromises);
            console.log('All audio files loaded successfully');
            this.isLoaded = true;
            return true;
        } catch (error) {
            console.error('Failed to load audio files:', error);
            return false;
        }
    }

    playBGM() {
        if (!this.isLoaded) {
            console.warn('Attempting to play BGM before audio is loaded');
            return;
        }

        const bgm = this.audioElements.bgm;
        if (bgm) {
            console.log('Playing BGM');
            bgm.play().catch(error => {
                console.error('BGM autoplay failed:', error);
                // Try to play on user interaction
                document.addEventListener('click', () => {
                    bgm.play().catch(e => console.error('BGM play failed after click:', e));
                }, { once: true });
            });
        } else {
            console.error('BGM audio element not found');
        }
    }

    stopBGM() {
        const bgm = this.audioElements.bgm;
        if (bgm) {
            console.log('Stopping BGM');
            bgm.pause();
            bgm.currentTime = 0;
        }
    }

    playExplosion() {
        if (!this.isLoaded) {
            console.warn('Attempting to play explosion sound before audio is loaded');
            return;
        }

        const explosion = this.audioElements.explosion;
        if (explosion) {
            console.log('Playing explosion sound');
            explosion.currentTime = 0;
            explosion.play().catch(error => {
                console.error('Explosion sound failed:', error);
            });
        } else {
            console.error('Explosion audio element not found');
        }
    }

    playHit() {
        if (!this.isLoaded) {
            console.warn('Attempting to play hit sound before audio is loaded');
            return;
        }

        const hit = this.audioElements.hit;
        if (hit) {
            console.log('Playing hit sound');
            hit.currentTime = 0;
            hit.play().catch(error => {
                console.error('Hit sound failed:', error);
            });
        } else {
            console.error('Hit audio element not found');
        }
    }
} 