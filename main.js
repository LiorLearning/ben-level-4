import * as THREE from 'three';
import { Player } from './player.js';
import { createLevelElements, checkCollision, checkCollectibleCollision, GROUND_HEIGHT, GROUND_DEPTH, GROUND_Z, TreasureBox } from './level.js';
import { InputManager } from './input.js';
import { MathQuiz } from './mathQuiz.js';
import { UI } from './ui.js';
import { AudioManager } from './audio.js';

const GAME_WIDTH = 16;
const GAME_HEIGHT = 9;
const CAMERA_Z_OFFSET = 15;

let scene, camera, renderer, player, inputManager, audioManager;
let platforms = [], collectibles = [], lavaBlocks = [], obstacles = [], shooters = [], treasureBoxes = [];
let score = 0;
let keysCollected = 0;
let playerLives = 5;
let background;
let levelEnd;
let isPlayerRespawning = false; // Add flag to track respawn state
const scoreElement = document.getElementById('score');
const keysElement = document.getElementById('keys');
const mathQuiz = new MathQuiz();
const ui = new UI();

const clock = new THREE.Clock();
const FIXED_TIME_STEP = 1/60; // 60 physics updates per second
let accumulator = 0;
let gameInitialized = false;
let gamePaused = false;

async function init() {
    // Initialize audio manager
    audioManager = new AudioManager();
    
    // Load audio files with progress updates
    const audioLoaded = await audioManager.loadAll((progress, text) => {
        ui.updateLoadingProgress(progress, text);
    });

    if (!audioLoaded) {
        alert('Failed to load audio files. Please refresh the page to try again.');
        return;
    }

    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // Light Sky Blue

    // Camera
    const aspect = window.innerWidth / window.innerHeight;
    camera = new THREE.OrthographicCamera(
        GAME_WIDTH * aspect / -2, GAME_WIDTH * aspect / 2,
        GAME_HEIGHT / 2, GAME_HEIGHT / -2,
        0.1, 100
    );
    camera.position.set(0, GAME_HEIGHT / 4, CAMERA_Z_OFFSET);
    camera.lookAt(0, GAME_HEIGHT / 4, 0);

    // Load background texture
    const textureLoader = new THREE.TextureLoader();
    const backgroundTexture = textureLoader.load('assets/background.png');
    backgroundTexture.wrapS = THREE.RepeatWrapping;
    backgroundTexture.wrapT = THREE.RepeatWrapping;
    backgroundTexture.repeat.set(1, 1);
    backgroundTexture.colorSpace = THREE.SRGBColorSpace;

    // Create background plane with correct aspect ratio
    const backgroundWidth = GAME_WIDTH * aspect; // Match camera width
    const backgroundHeight = GAME_HEIGHT; // Match camera height
    const backgroundGeometry = new THREE.PlaneGeometry(backgroundWidth, backgroundHeight);
    const backgroundMaterial = new THREE.MeshBasicMaterial({
        map: backgroundTexture,
        depthWrite: false,
        toneMapped: false,
        colorSpace: THREE.SRGBColorSpace,
        fog: false,
        lights: false
    });
    background = new THREE.Mesh(backgroundGeometry, backgroundMaterial);
    background.position.z = -10; // Position behind other elements
    background.position.y = GAME_HEIGHT / 4; // Align with camera center
    scene.add(background);

    // Update background texture repeat based on camera view
    function updateBackgroundRepeat() {
        const viewWidth = camera.right - camera.left;
        const repeatCount = Math.ceil(viewWidth / backgroundWidth);
        backgroundTexture.repeat.set(repeatCount, 1);
    }

    // Call initially and on window resize
    updateBackgroundRepeat();

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7.5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -15;
    directionalLight.shadow.camera.right = 15;
    directionalLight.shadow.camera.top = 15;
    directionalLight.shadow.camera.bottom = -15;
    scene.add(directionalLight);

    // Input
    inputManager = new InputManager();

    // Player
    player = new Player(scene);
    player.setAudioManager(audioManager); // Set audio manager for player

    // Level
    const levelElements = createLevelElements(scene);
    platforms = levelElements.platforms;
    collectibles = levelElements.collectibles;
    lavaBlocks = levelElements.lavaBlocks;
    obstacles = levelElements.obstacles || [];
    shooters = levelElements.shooters || [];
    treasureBoxes = levelElements.treasureBoxes || [];
    levelEnd = levelElements.levelEnd;

    // Handle window resize
    window.addEventListener('resize', onWindowResize, false);

    // Add click handler to start game
    const startGame = () => {
        if (!gameInitialized) {
            gameInitialized = true;
            ui.hideLoadingScreen();
            audioManager.playBGM();
            animate();
            // Remove the click listener after first click
            document.removeEventListener('click', startGame);
        }
    };

    // Add click listener to start game
    document.addEventListener('click', startGame);

    // Show "Click to Start" message
    ui.showStartMessage();
}

function onWindowResize() {
    const aspect = window.innerWidth / window.innerHeight;
    camera.left = GAME_WIDTH * aspect / -2;
    camera.right = GAME_WIDTH * aspect / 2;
    camera.top = GAME_HEIGHT / 2;
    camera.bottom = GAME_HEIGHT / -2;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    updateBackgroundRepeat(); // Update background repeat on resize
}

function resetPlayer() {
    // Only reduce lives if player is not already respawning
    if (!isPlayerRespawning) {
        playerLives--;
        ui.updateHealth(playerLives);
        isPlayerRespawning = true;
        audioManager.playExplosion(); // Play explosion sound when player takes damage
        
        if (playerLives <= 0) {
            // Game over
            audioManager.stopBGM(); // Stop background music on game over
            alert('Game Over!');
            resetLevel();
            return;
        }
    }
    
    player.die();
}

function updateGame(deltaTime) {
    // Skip game updates if math quiz is active or game is paused
    if (mathQuiz.isActive || gamePaused) {
        return;
    }

    // Accumulate time since last frame
    accumulator += deltaTime;
    
    // Update death timer
    player.updateDeathTimer(deltaTime);
    
    // Reset respawn flag when player is no longer dead
    if (isPlayerRespawning && !player.isDead) {
        isPlayerRespawning = false;
    }
    
    // Update physics with fixed time step
    while (accumulator >= FIXED_TIME_STEP) {
        player.update(FIXED_TIME_STEP, inputManager.keys, platforms);
        player.updateProjectiles(FIXED_TIME_STEP, obstacles, treasureBoxes);
        accumulator -= FIXED_TIME_STEP;
    }

    // Camera follow player
    camera.position.x = player.mesh.position.x;
    // Update background position to follow camera
    background.position.x = camera.position.x;
    // Optional: Basic vertical camera movement
    // camera.position.y = Math.max(GAME_HEIGHT / 4, player.mesh.position.y + 1); 

    // Update treasure boxes
    treasureBoxes.forEach(box => {
        box.update(deltaTime);
    });

    // Collectibles
    const collectedIndices = [];
    collectibles.forEach((collectible, index) => {
        collectible.mesh.rotation.y += 0.05; // Make coins spin
        if (checkCollectibleCollision(player, collectible)) {
            scene.remove(collectible.mesh);
            collectedIndices.push(index);
            score += 10;
            scoreElement.textContent = score;
        }
    });

    // Remove collected items (iterate backwards to avoid index issues)
    for (let i = collectedIndices.length - 1; i >= 0; i--) {
        collectibles.splice(collectedIndices[i], 1);
    }
    
    // Lava hazard
    lavaBlocks.forEach(lava => {
        if (checkCollision(player.getBoundingBox(), lava.getBoundingBox()) && !player.invincible) {
            console.log("Player fell in lava!");
            resetPlayer();
        }
    });

    // Update moving obstacles
    obstacles.forEach((obstacle, index) => {
        obstacle.update(deltaTime);
        if (checkCollision(player.getBoundingBox(), obstacle.getBoundingBox()) && !player.invincible) {
            resetPlayer();
        }
    });

    // Update shooters and check collision with player
    shooters.forEach(shooter => {
        shooter.update(deltaTime);
        if (shooter.projectile.visible && checkCollision(player.getBoundingBox(), shooter.getProjectileBoundingBox()) && !player.invincible) {
            resetPlayer();
        }
    });

    // Check for key collection
    treasureBoxes.forEach(box => {
        if (box.isOpen && !box.isKeyCollected()) {
            if (checkCollision(player.getBoundingBox(), box.getKeyBoundingBox())) {
                // Start math quiz instead of immediately collecting the key
                mathQuiz.start(() => {
                    // This callback runs when the quiz is completed
                    box.collectKey();
                    keysCollected++;
                    ui.updateKeys(keysCollected);
                });
            }
        }
    });

    // Check for level completion
    if (levelEnd && keysCollected === 5) {
        // Check if player is at the arch
        const playerBox = player.getBoundingBox();
        const archBox = new THREE.Box3().setFromCenterAndSize(
            levelEnd.arch.position,
            new THREE.Vector3(levelEnd.arch.width, levelEnd.arch.height, 1)
        );
        
        if (playerBox.intersectsBox(archBox)) {
            // Level complete!
            showVillainEndScreen();
            return; // Exit the update loop after end screen
        }
    }

    // Fall off world
    if (player.mesh.position.y < -10 && !player.invincible) {
        resetPlayer();
    }
}

function resetLevel() {
    // Reset player position and lives
    player.reset();
    playerLives = 5;
    ui.updateHealth(playerLives);
    
    // Reset collectibles
    collectibles.forEach(collectible => {
        scene.remove(collectible.mesh);
    });
    collectibles = [];
    
    // Reset treasure boxes
    treasureBoxes.forEach(box => {
        scene.remove(box.box);
        scene.remove(box.glow);
        scene.remove(box.key);
    });
    treasureBoxes = [];
    
    // Reset score and keys
    score = 0;
    keysCollected = 0;
    scoreElement.textContent = score;
    ui.updateKeys(keysCollected);
    
    // Restart background music
    audioManager.playBGM();
    
    // Recreate level elements
    const levelElements = createLevelElements(scene);
    platforms = levelElements.platforms;
    collectibles = levelElements.collectibles;
    lavaBlocks = levelElements.lavaBlocks;
    obstacles = levelElements.obstacles || [];
    shooters = levelElements.shooters || [];
    treasureBoxes = levelElements.treasureBoxes || [];
    levelEnd = levelElements.levelEnd;
}

function animate() {
    if (!gamePaused) {
        requestAnimationFrame(animate);
        const deltaTime = clock.getDelta();
        updateGame(deltaTime);
        renderer.render(scene, camera);
    }
}

function showVillainEndScreen() {
    gamePaused = true;
    // Pause the game loop by not calling animate again
    // Create overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0,0,0,0.92);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        z-index: 3000;
    `;
    // Villain image
    const img = document.createElement('img');
    img.src = 'assets/villain.png';
    img.alt = 'Villain';
    img.style.cssText = `
        width: 220px;
        height: auto;
        margin-bottom: 32px;
        filter: drop-shadow(0 0 24px #000);
    `;
    overlay.appendChild(img);
    // Message
    const msg = document.createElement('div');
    msg.textContent = 'I will be your doom, see you in the next level.. HAHAHA';
    msg.style.cssText = `
        color: #fff;
        font-size: 2.2rem;
        font-weight: bold;
        text-align: center;
        margin-bottom: 40px;
        text-shadow: 2px 2px 8px #000;
        max-width: 90vw;
    `;
    overlay.appendChild(msg);
    // Play again button
    const btn = document.createElement('button');
    btn.textContent = 'Play Again';
    btn.style.cssText = `
        font-size: 1.5rem;
        padding: 16px 48px;
        border-radius: 12px;
        border: none;
        background: #4CAF50;
        color: #fff;
        font-weight: bold;
        cursor: pointer;
        box-shadow: 0 4px 16px #0008;
        transition: background 0.2s;
    `;
    btn.onmouseover = () => btn.style.background = '#388e3c';
    btn.onmouseout = () => btn.style.background = '#4CAF50';
    btn.onclick = () => {
        document.body.removeChild(overlay);
        gamePaused = false;
        resetLevel();
        animate();
    };
    overlay.appendChild(btn);
    document.body.appendChild(overlay);
}

init();