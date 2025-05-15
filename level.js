import * as THREE from 'three';

const PLATFORM_MATERIAL = new THREE.MeshStandardMaterial({ 
    map: new THREE.TextureLoader().load('assets/texture.png'),
    color: 0x90EE90 // LightGreen tint
}); // LightGreen for top, tan for sides
const GROUND_MATERIAL = new THREE.MeshStandardMaterial({ 
    map: new THREE.TextureLoader().load('assets/texture.png'),
    color: 0xD2B48C // Tan tint
}); // Tan
const COIN_MATERIAL = new THREE.MeshStandardMaterial({ color: 0xFFD700, emissive: 0xccad00 }); // Gold
const MOUNTAIN_MATERIAL = new THREE.MeshStandardMaterial({ color: 0xA9A9A9, flatShading: true }); // DarkGray
const BUSH_MATERIAL = new THREE.MeshStandardMaterial({ color: 0x2E8B57 }); // SeaGreen
const PALM_TRUNK_MATERIAL = new THREE.MeshStandardMaterial({ color: 0x8B4513 }); // SaddleBrown
const PALM_LEAVES_MATERIAL = new THREE.MeshStandardMaterial({ color: 0x006400 }); // DarkGreen
const WATER_MATERIAL = new THREE.MeshStandardMaterial({ 
    color: 0xff4500, // Orange-red base color
    emissive: 0xff0000, // Red glow
    emissiveIntensity: 0.5,
    transparent: true,
    opacity: 0.8,
    roughness: 0.3,
    metalness: 0.7
}); // Lava material
const BOX_MATERIAL = new THREE.MeshStandardMaterial({ color: 0x8B4513 }); // Brown
const KEY_MATERIAL = new THREE.MeshStandardMaterial({ color: 0xFFD700, emissive: 0xccad00 }); // Gold

// Export constants needed by other files
export const GROUND_HEIGHT = 1;
export const GROUND_DEPTH = 2;
export const GROUND_Z = 0;

class LevelElement {
    constructor(mesh) {
        this.mesh = mesh;
        this.boundingBox = new THREE.Box3().setFromObject(this.mesh);
    }
    getBoundingBox() {
        // For static objects, bounding box can be computed once if not transformed
        // For dynamic objects, it should be updated if their mesh.position changes
        this.boundingBox.setFromObject(this.mesh); // Update if necessary, good for moving platforms later
        return this.boundingBox;
    }
}

function createPlatform(scene, x, y, z, width, height, depth, material = PLATFORM_MATERIAL) {
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    scene.add(mesh);
    return new LevelElement(mesh);
}

function createCollectible(scene, x, y, z) {
    const geometry = new THREE.CylinderGeometry(0.3, 0.3, 0.1, 16);
    geometry.rotateX(Math.PI / 2); // Make it stand up
    const mesh = new THREE.Mesh(geometry, COIN_MATERIAL);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    scene.add(mesh);
    return new LevelElement(mesh);
}

function createScenery(scene, totalLength) {
    // Repeat mountains, bushes, and palm trees along the level
    const mountainSpacing = 30;
    const bushSpacing = 18;
    const palmSpacing = 24;
    // Mountains (simple cones or pyramids)
    for (let x = -15; x < totalLength + 30; x += mountainSpacing) {
        const geom = new THREE.ConeGeometry(5 + Math.random() * 2, 10 + Math.random() * 3, 4 + Math.floor(Math.random() * 3));
        const mountain = new THREE.Mesh(geom, MOUNTAIN_MATERIAL);
        mountain.position.set(x, 2 + Math.random() * 2, -15 - Math.random() * 5);
        scene.add(mountain);
    }
    // Bushes (REMOVED)
    // for (let x = -8; x < totalLength + 20; x += bushSpacing) {
    //     const bushGeom = new THREE.SphereGeometry(1.5 + Math.random(), 8, 6);
    //     const bush = new THREE.Mesh(bushGeom, BUSH_MATERIAL);
    //     bush.position.set(x, -0.5 - Math.random() * 0.5, -5 - Math.random() * 2);
    //     scene.add(bush);
    // }
}

export class TreasureBox {
    constructor(scene, x, y, z) {
        // Create a placeholder transparent sprite synchronously
        const placeholderMaterial = new THREE.SpriteMaterial({
            color: 0xffffff,
            opacity: 0.0,
            transparent: true
        });
        this.box = new THREE.Sprite(placeholderMaterial);
        this.box.position.set(x, y + 0.7, z); // Increased y offset for larger box
        scene.add(this.box);
        this.boundingBox = new THREE.Box3().setFromObject(this.box);

        // Load the box texture and update the sprite when loaded
        const textureLoader = new THREE.TextureLoader();
        textureLoader.load('assets/box.png', (boxTexture) => {
            boxTexture.colorSpace = THREE.SRGBColorSpace;
            boxTexture.magFilter = THREE.NearestFilter;
            boxTexture.minFilter = THREE.NearestFilter;
            const boxMaterial = new THREE.SpriteMaterial({
                map: boxTexture,
                transparent: true,
                depthTest: true,
                depthWrite: false,
                alphaTest: 0.1,
                color: 0xffffff,
                opacity: 1.0,
                pixelRatio: window.devicePixelRatio,
                blending: THREE.NormalBlending,
                toneMapped: false,
                colorSpace: THREE.SRGBColorSpace,
                fog: false,
                lights: false
            });
            this.box.material = boxMaterial;
            // Use the image's aspect ratio
            const aspectRatio = boxTexture.image.width / boxTexture.image.height;
            const boxHeight = 1.8; // Increased from 1.2 to 1.8
            this.box.scale.set(boxHeight * aspectRatio, boxHeight, 1);
            this.boundingBox.setFromObject(this.box);
        });

        // Add spherical glow effect
        const glowGeometry = new THREE.SphereGeometry(1.2, 32, 32); // Increased size and better quality
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0xFFD700,
            transparent: true,
            opacity: 0.3,
            side: THREE.BackSide,
            toneMapped: false,
            colorSpace: THREE.SRGBColorSpace
        });
        this.glow = new THREE.Mesh(glowGeometry, glowMaterial);
        this.glow.position.copy(this.box.position);
        this.glow.visible = true;
        scene.add(this.glow);

        // Create the key as a sprite
        this.key = new THREE.Sprite(placeholderMaterial);
        this.key.position.set(x, y + 1.1, z); // Adjusted key position for larger box
        this.key.visible = false;
        scene.add(this.key);

        // Load the key texture and update the sprite when loaded
        textureLoader.load('assets/key.png', (keyTexture) => {
            keyTexture.colorSpace = THREE.SRGBColorSpace;
            keyTexture.magFilter = THREE.NearestFilter;
            keyTexture.minFilter = THREE.NearestFilter;
            const keyMaterial = new THREE.SpriteMaterial({
                map: keyTexture,
                transparent: true,
                depthTest: true,
                depthWrite: false,
                alphaTest: 0.1,
                color: 0xffffff,
                opacity: 1.0,
                pixelRatio: window.devicePixelRatio,
                blending: THREE.NormalBlending,
                toneMapped: false,
                colorSpace: THREE.SRGBColorSpace,
                fog: false,
                lights: false
            });
            this.key.material = keyMaterial;
            // Use the image's aspect ratio
            const aspectRatio = keyTexture.image.width / keyTexture.image.height;
            const keyHeight = 1.8; // Match box height
            this.key.scale.set(keyHeight * aspectRatio, keyHeight, 1);
        });

        this.isOpen = false;
        this.keyBoundingBox = new THREE.Box3().setFromObject(this.key);
        
        // Floating animation properties
        this.initialY = y;
        this.floatAmplitude = 0.2;
        this.floatSpeed = 2.0;
        this.floatTime = Math.random() * Math.PI * 2;
    }

    update(deltaTime) {
        if (!this.isOpen) {
            // Update floating animation
            this.floatTime += deltaTime * this.floatSpeed;
            const newY = this.initialY + Math.sin(this.floatTime) * this.floatAmplitude;
            this.box.position.y = newY;
            this.glow.position.y = newY;
            this.boundingBox.setFromObject(this.box);
        }
    }

    open() {
        if (!this.isOpen) {
            this.isOpen = true;
            this.box.visible = false;
            this.glow.visible = false;
            this.key.visible = true;
        }
    }

    getBoundingBox() {
        return this.boundingBox;
    }

    getKeyBoundingBox() {
        return this.keyBoundingBox;
    }

    isKeyCollected() {
        return this.isOpen && !this.key.visible;
    }

    collectKey() {
        if (this.isOpen) {
            this.key.visible = false;
        }
    }
}

class MovingObstacle {
    constructor(scene, x, y, z, range, speed, platforms) {
        // Create a placeholder transparent sprite synchronously
        const placeholderMaterial = new THREE.SpriteMaterial({
            color: 0xffffff,
            opacity: 0.0,
            transparent: true
        });
        this.mesh = new THREE.Sprite(placeholderMaterial);
        this.mesh.position.set(x, y + 0.4, z);
        scene.add(this.mesh);
        this.boundingBox = new THREE.Box3().setFromObject(this.mesh);

        // Load the toaster texture and update the sprite when loaded
        const textureLoader = new THREE.TextureLoader();
        textureLoader.load('assets/toaster.png', (toasterTexture) => {
            toasterTexture.colorSpace = THREE.SRGBColorSpace;
            toasterTexture.magFilter = THREE.NearestFilter;
            toasterTexture.minFilter = THREE.NearestFilter;
            const spriteMaterial = new THREE.SpriteMaterial({
                map: toasterTexture,
                transparent: true,
                depthTest: true,
                depthWrite: false,
                alphaTest: 0.1,
                color: 0xffffff,
                opacity: 1.0,
                pixelRatio: window.devicePixelRatio,
                blending: THREE.NormalBlending,
                toneMapped: false,
                colorSpace: THREE.SRGBColorSpace,
                fog: false,
                lights: false
            });
            this.mesh.material = spriteMaterial;
            // Use the image's aspect ratio
            const aspectRatio = toasterTexture.image.width / toasterTexture.image.height;
            const toasterHeight = 0.9;
            this.mesh.scale.set(toasterHeight * aspectRatio, toasterHeight, 1);
            this.boundingBox.setFromObject(this.mesh);
        });

        this.range = range;
        this.speed = speed;
        this.originX = x;
        this.direction = 1;
        this.platforms = platforms;
    }
    update(deltaTime) {
        this.mesh.position.x += this.speed * this.direction * deltaTime;
        if (Math.abs(this.mesh.position.x - this.originX) > this.range) {
            this.direction *= -1;
        }
        this.boundingBox.setFromObject(this.mesh);
        // Check collision with platforms (steps/elevated blocks)
        for (const platform of this.platforms) {
            if (platform.getBoundingBox && this.boundingBox.intersectsBox(platform.getBoundingBox())) {
                // Reverse direction and nudge away
                this.direction *= -1;
                this.mesh.position.x += this.speed * this.direction * deltaTime * 2;
                this.boundingBox.setFromObject(this.mesh);
                break;
            }
        }
    }
    getBoundingBox() {
        this.boundingBox.setFromObject(this.mesh);
        return this.boundingBox;
    }
}

class VerticalShooter {
    constructor(scene, x, y, z) {
        // Shooter base
        this.base = new THREE.Mesh(
            new THREE.CylinderGeometry(0.25, 0.25, 0.5, 12),
            new THREE.MeshStandardMaterial({ color: 0x4444cc }) // Blue
        );
        // Position the base so its top aligns with the ground surface
        this.base.position.set(x, y, z + 0.1); // Move slightly forward in z-axis
        scene.add(this.base);

        // Create a placeholder transparent sprite for the projectile
        const placeholderMaterial = new THREE.SpriteMaterial({
            color: 0xffffff,
            opacity: 0.0,
            transparent: true
        });
        this.projectile = new THREE.Sprite(placeholderMaterial);
        this.projectile.visible = false;
        this.projectile.position.z = z + 0.1; // Match the z-position of the base
        scene.add(this.projectile);

        // Load the fireball texture and update the sprite when loaded
        const textureLoader = new THREE.TextureLoader();
        textureLoader.load('assets/fireball.png', (fireballTexture) => {
            fireballTexture.colorSpace = THREE.SRGBColorSpace;
            fireballTexture.magFilter = THREE.NearestFilter;
            fireballTexture.minFilter = THREE.NearestFilter;
            const spriteMaterial = new THREE.SpriteMaterial({
                map: fireballTexture,
                transparent: true,
                depthTest: true,
                depthWrite: false,
                alphaTest: 0.1,
                color: 0xffffff,
                opacity: 1.0,
                pixelRatio: window.devicePixelRatio,
                blending: THREE.NormalBlending,
                toneMapped: false,
                colorSpace: THREE.SRGBColorSpace,
                fog: false,
                lights: false
            });
            this.projectile.material = spriteMaterial;
            // Use the image's aspect ratio
            const aspectRatio = fireballTexture.image.width / fireballTexture.image.height;
            const fireballHeight = 0.6;
            this.projectile.scale.set(fireballHeight * aspectRatio, fireballHeight, 1);
        });

        this.x = x;
        this.y = y + 0.25; // Adjust starting height to be at the top of the base
        this.z = z + 0.1; // Match the z-position
        this.shootInterval = 1.2 + Math.random() * 1.5; // Random interval
        this.shootTimer = Math.random() * this.shootInterval; // Unsynced
        this.projectileActive = false;
        this.projectileY = this.y;
        this.projectileSpeed = 5 + Math.random() * 2;
        this.maxHeight = this.y + 4 + Math.random() * 2;
        this.boundingBox = new THREE.Box3();
    }

    update(deltaTime) {
        this.shootTimer -= deltaTime;
        if (!this.projectileActive && this.shootTimer <= 0) {
            // Fire projectile
            this.projectile.position.set(this.x, this.y, this.z);
            this.projectile.visible = true;
            this.projectileActive = true;
            this.projectileY = this.y;
            this.shootTimer = this.shootInterval;
        }
        if (this.projectileActive) {
            this.projectileY += this.projectileSpeed * deltaTime;
            this.projectile.position.y = this.projectileY;
            if (this.projectileY > this.maxHeight) {
                this.projectile.visible = false;
                this.projectileActive = false;
            }
        }
        // Update bounding box
        if (this.projectile.visible) {
            this.boundingBox.setFromObject(this.projectile);
        } else {
            this.boundingBox.makeEmpty();
        }
    }

    getProjectileBoundingBox() {
        return this.boundingBox;
    }
}

export function createLevelElements(scene) {
    const platforms = [];
    const collectibles = [];
    const lavaBlocks = [];
    const obstacles = [];
    const shooters = [];
    const treasureBoxes = [];
    const groundSections = [];

    // Parameters for the repeating pattern
    const groundLength = 18;
    const lavaLength = 3;
    const numSections = 6; // Number of ground+lava sections
    // Define stepped ground heights (all within jumpable reach)
    const groundYs = [-1, -0.5, -1.2, 0, -0.7, -1];
    const groundZ = GROUND_Z;
    const groundHeight = GROUND_HEIGHT;
    const groundDepth = GROUND_DEPTH;
    const lavaY = -1.3;
    const lavaZ = GROUND_Z;
    const lavaHeight = GROUND_HEIGHT;
    const lavaDepth = GROUND_DEPTH;
    let x = 0;
    const elevatedBlocks = [];
    const elevatedWidth = 2.5;
    const elevatedHeight = 1;
    const elevatedDepth = 2;

    // Store lava and ground section boundaries for random placement
    const lavaSections = [];

    // First ground section
    const groundStart = x;
    const groundEnd = x + groundLength;
    groundSections.push({ start: groundStart, end: groundEnd, y: groundYs[0] });
    const firstGroundY = groundYs[0];
    const firstGroundPlatform = createPlatform(scene, x + groundLength / 2, firstGroundY, groundZ, groundLength, groundHeight, groundDepth, GROUND_MATERIAL);
    platforms.push(firstGroundPlatform);
    // Coins on first ground
    const firstGroundTopY = firstGroundY + groundHeight/2 + 0.3;
    collectibles.push(createCollectible(scene, x + groundLength / 2, firstGroundTopY, groundZ));
    collectibles.push(createCollectible(scene, x + groundLength / 2 - 2, firstGroundTopY, groundZ));
    collectibles.push(createCollectible(scene, x + groundLength / 2 + 2, firstGroundTopY, groundZ));
    x += groundLength;

    // First lava
    const firstLavaStart = x;
    const firstLavaEnd = x + lavaLength;
    lavaSections.push({ start: firstLavaStart, end: firstLavaEnd });
    const firstLavaCenterX = x + lavaLength / 2;
    const firstLavaMesh = new THREE.Mesh(new THREE.BoxGeometry(lavaLength, lavaHeight, lavaDepth), WATER_MATERIAL);
    firstLavaMesh.position.set(firstLavaCenterX, lavaY, lavaZ);
    scene.add(firstLavaMesh);
    lavaBlocks.push(new LevelElement(firstLavaMesh));
    // Floating platform in first lava
    const firstFloatingPlatformY = Math.min(firstGroundY, groundYs[1]) + 1.8;
    const firstFloatingPlatform = createPlatform(scene, firstLavaCenterX, firstFloatingPlatformY, groundZ, 2.5, 0.5, 1.5);
    platforms.push(firstFloatingPlatform);
    const firstFloatingTopY = firstFloatingPlatformY + 0.5/2 + 0.3;
    collectibles.push(createCollectible(scene, firstLavaCenterX, firstFloatingTopY, groundZ));
    x += lavaLength;

    // Second ground section
    const secondGroundStart = x;
    const secondGroundEnd = x + groundLength;
    groundSections.push({ start: secondGroundStart, end: secondGroundEnd, y: groundYs[1] });
    const secondGroundY = groundYs[1];
    const secondGroundPlatform = createPlatform(scene, x + groundLength / 2, secondGroundY, groundZ, groundLength, groundHeight, groundDepth, GROUND_MATERIAL);
    platforms.push(secondGroundPlatform);
    // Coins on second ground
    const secondGroundTopY = secondGroundY + groundHeight/2 + 0.3;
    collectibles.push(createCollectible(scene, x + groundLength / 2, secondGroundTopY, groundZ));
    collectibles.push(createCollectible(scene, x + groundLength / 2 - 2, secondGroundTopY, groundZ));
    collectibles.push(createCollectible(scene, x + groundLength / 2 + 2, secondGroundTopY, groundZ));
    x += groundLength;

    // Special lava-ground-lava patch
    // First lava of the patch
    const patchLava1Start = x;
    const patchLava1End = x + lavaLength;
    lavaSections.push({ start: patchLava1Start, end: patchLava1End });
    const patchLava1CenterX = x + lavaLength / 2;
    const patchLava1Mesh = new THREE.Mesh(new THREE.BoxGeometry(lavaLength, lavaHeight, lavaDepth), WATER_MATERIAL);
    patchLava1Mesh.position.set(patchLava1CenterX, lavaY, lavaZ);
    scene.add(patchLava1Mesh);
    lavaBlocks.push(new LevelElement(patchLava1Mesh));
    // Floating platform in first lava of patch
    const patchLava1FloatingY = Math.min(secondGroundY, groundYs[2]) + 1.8;
    const patchLava1FloatingPlatform = createPlatform(scene, patchLava1CenterX, patchLava1FloatingY, groundZ, 2.5, 0.5, 1.5);
    platforms.push(patchLava1FloatingPlatform);
    const patchLava1FloatingTopY = patchLava1FloatingY + 0.5/2 + 0.3;
    collectibles.push(createCollectible(scene, patchLava1CenterX, patchLava1FloatingTopY, groundZ));
    x += lavaLength;

    // Ground in the middle of the patch
    const patchGroundStart = x;
    const patchGroundEnd = x + groundLength;
    groundSections.push({ start: patchGroundStart, end: patchGroundEnd, y: groundYs[2] });
    const patchGroundY = groundYs[2];
    const patchGroundPlatform = createPlatform(scene, x + groundLength / 2, patchGroundY, groundZ, groundLength, groundHeight, groundDepth, GROUND_MATERIAL);
    platforms.push(patchGroundPlatform);
    // Coins on patch ground
    const patchGroundTopY = patchGroundY + groundHeight/2 + 0.3;
    collectibles.push(createCollectible(scene, x + groundLength / 2, patchGroundTopY, groundZ));
    collectibles.push(createCollectible(scene, x + groundLength / 2 - 2, patchGroundTopY, groundZ));
    collectibles.push(createCollectible(scene, x + groundLength / 2 + 2, patchGroundTopY, groundZ));
    x += groundLength;

    // Second lava of the patch
    const patchLava2Start = x;
    const patchLava2End = x + lavaLength;
    lavaSections.push({ start: patchLava2Start, end: patchLava2End });
    const patchLava2CenterX = x + lavaLength / 2;
    const patchLava2Mesh = new THREE.Mesh(new THREE.BoxGeometry(lavaLength, lavaHeight, lavaDepth), WATER_MATERIAL);
    patchLava2Mesh.position.set(patchLava2CenterX, lavaY, lavaZ);
    scene.add(patchLava2Mesh);
    lavaBlocks.push(new LevelElement(patchLava2Mesh));
    // Floating platform in second lava of patch
    const patchLava2FloatingY = Math.min(patchGroundY, groundYs[3]) + 1.8;
    const patchLava2FloatingPlatform = createPlatform(scene, patchLava2CenterX, patchLava2FloatingY, groundZ, 2.5, 0.5, 1.5);
    platforms.push(patchLava2FloatingPlatform);
    const patchLava2FloatingTopY = patchLava2FloatingY + 0.5/2 + 0.3;
    collectibles.push(createCollectible(scene, patchLava2CenterX, patchLava2FloatingTopY, groundZ));
    x += lavaLength;

    // Add vertical shooters only on the ground section of the patch
    const shooterY = patchGroundY + groundHeight/2; // Place at ground surface level
    const shooterZ = 0;
    const shooterSpacing = 6; // Equal spacing between shooters
    const groundCenterX = patchGroundStart + groundLength/2;
    
    // Place 3 shooters at equal distances on the ground
    shooters.push(new VerticalShooter(scene, groundCenterX - shooterSpacing, shooterY, shooterZ));
    shooters.push(new VerticalShooter(scene, groundCenterX, shooterY, shooterZ));
    shooters.push(new VerticalShooter(scene, groundCenterX + shooterSpacing, shooterY, shooterZ));

    // Continue with remaining sections
    for (let i = 3; i < numSections; i++) {
        // Main ground section
        const groundStart = x;
        const groundEnd = x + groundLength;
        groundSections.push({ start: groundStart, end: groundEnd, y: groundYs[i] });
        // Use stepped ground Y
        const thisGroundY = groundYs[i];
        const groundPlatform = createPlatform(scene, x + groundLength / 2, thisGroundY, groundZ, groundLength, groundHeight, groundDepth, GROUND_MATERIAL);
        platforms.push(groundPlatform);
        // Coins on ground - positioned relative to ground platform
        const groundTopY = thisGroundY + groundHeight/2 + 0.3; // Half height of ground + coin height
        collectibles.push(createCollectible(scene, x + groundLength / 2, groundTopY, groundZ));
        collectibles.push(createCollectible(scene, x + groundLength / 2 - 2, groundTopY, groundZ));
        collectibles.push(createCollectible(scene, x + groundLength / 2 + 2, groundTopY, groundZ));
        x += groundLength;

        // Lava section (skip after last ground)
        if (i < numSections - 1) {
            const lavaStart = x;
            const lavaEnd = x + lavaLength;
            lavaSections.push({ start: lavaStart, end: lavaEnd });
            const lavaCenterX = x + lavaLength / 2;
            const lavaMesh = new THREE.Mesh(new THREE.BoxGeometry(lavaLength, lavaHeight, lavaDepth), WATER_MATERIAL);
            lavaMesh.position.set(lavaCenterX, lavaY, lavaZ);
            scene.add(lavaMesh);
            lavaBlocks.push(new LevelElement(lavaMesh));
            // Floating platform in the middle of the lava
            const nextGroundY = groundYs[i+1] !== undefined ? groundYs[i+1] : thisGroundY;
            const floatingPlatformY = Math.min(thisGroundY, nextGroundY) + 1.8;
            const floatingPlatform = createPlatform(scene, lavaCenterX, floatingPlatformY, groundZ, 2.5, 0.5, 1.5);
            platforms.push(floatingPlatform);
            const floatingTopY = floatingPlatformY + 0.5/2 + 0.3;
            collectibles.push(createCollectible(scene, lavaCenterX, floatingTopY, groundZ));
            x += lavaLength;
        }
    }

    // Place moving obstacles on some ground sections
    for (let i = 0; i < groundSections.length; i++) { // Changed to include all sections
        const section = groundSections[i];
        const y = section.y + groundHeight / 2 + 0.4; // On top of ground
        
        // Skip sections that have vertical shooters
        if (i === 2) continue; // Skip the special patch section with shooters
        
        // Place obstacles in different patterns based on section index
        if (i % 2 === 0) {
            // Even sections: Place two obstacles with different ranges
            const xPos1 = section.start + (section.end - section.start) * 0.25;
            const xPos2 = section.start + (section.end - section.start) * 0.75;
            const range1 = 2 + Math.random() * 2;
            const range2 = 2 + Math.random() * 2;
            const speed1 = 1.5 + Math.random();
            const speed2 = 1.5 + Math.random();
            obstacles.push(new MovingObstacle(scene, xPos1, y, groundZ, range1, speed1, platforms));
            obstacles.push(new MovingObstacle(scene, xPos2, y, groundZ, range2, speed2, platforms));
        } else {
            // Odd sections: Place one obstacle with larger range
            const xPos = section.start + (section.end - section.start) * 0.5;
            const range = 3 + Math.random() * 2;
            const speed = 1.5 + Math.random();
            obstacles.push(new MovingObstacle(scene, xPos, y, groundZ, range, speed, platforms));
        }
    }

    // Add additional floating platforms throughout the level
    // Platform height tiers (in units above ground):
    // TIER_1: 3.0 (easily reachable with single jump)
    // TIER_2: 4.5 (requires double jump)
    // TIER_3: 6.0 (requires precise double jump)
    const TIER_1_HEIGHT = 3.0;
    const TIER_2_HEIGHT = 4.5;
    const TIER_3_HEIGHT = 6.0;

    const floatingPlatforms = [
        // Tier 1 platforms (easily reachable)
        { x: 30, y: firstGroundY + TIER_1_HEIGHT, width: 2.5, height: 0.5, depth: 1.5 },
        { x: 70, y: patchGroundY + TIER_1_HEIGHT, width: 2.5, height: 0.5, depth: 1.5 },
        { x: 110, y: groundYs[4] + TIER_1_HEIGHT, width: 2.5, height: 0.5, depth: 1.5 },

        // Tier 2 platforms (requires double jump)
        { x: 50, y: secondGroundY + TIER_2_HEIGHT, width: 2.5, height: 0.5, depth: 1.5 },
        { x: 90, y: groundYs[3] + TIER_2_HEIGHT, width: 2.5, height: 0.5, depth: 1.5 },
        { x: 130, y: groundYs[5] + TIER_2_HEIGHT, width: 2.5, height: 0.5, depth: 1.5 },

        // Tier 3 platforms (highest, requires precise double jump)
        { x: 40, y: firstGroundY + TIER_3_HEIGHT, width: 2.5, height: 0.5, depth: 1.5 },
        { x: 80, y: patchGroundY + TIER_3_HEIGHT, width: 2.5, height: 0.5, depth: 1.5 },
        { x: 120, y: groundYs[4] + TIER_3_HEIGHT, width: 2.5, height: 0.5, depth: 1.5 }
    ];

    // Create the floating platforms and add collectibles
    floatingPlatforms.forEach(platform => {
        const floatingPlatform = createPlatform(scene, platform.x, platform.y, groundZ, platform.width, platform.height, platform.depth);
        platforms.push(floatingPlatform);
        // Add collectible on top of the platform
        const collectibleY = platform.y + platform.height/2 + 0.3;
        collectibles.push(createCollectible(scene, platform.x, collectibleY, groundZ));
    });

    // Move extra elevated platforms far from lava platforms to avoid stacking
    const lastGroundY = groundYs[groundYs.length-1];
    // Adjust platform positions to be closer and within jumpable distance
    const extraPlatform1 = createPlatform(scene, x + 4, lastGroundY + (groundHeight + 1) / 2, 0, 4, 1, 1.5);
    platforms.push(extraPlatform1);
    const extraPlatform1TopY = lastGroundY + (groundHeight + 1) / 2 + 1/2 + 0.3;
    collectibles.push(createCollectible(scene, x + 4, extraPlatform1TopY, 0));
    
    const extraPlatform2 = createPlatform(scene, x + 10, lastGroundY + (groundHeight + 1) / 2, 0, 3, 1, 1.5);
    platforms.push(extraPlatform2);
    const extraPlatform2TopY = lastGroundY + (groundHeight + 1) / 2 + 1/2 + 0.3;
    collectibles.push(createCollectible(scene, x + 10, extraPlatform2TopY, 0));

    // Add final ground section with arch
    const finalGroundLength = 15;
    const finalGroundY = lastGroundY;
    const finalGroundX = x + 15; // Position after the floating platforms
    
    // Create the ground
    const finalGround = createPlatform(scene, finalGroundX + finalGroundLength/2, finalGroundY, groundZ, finalGroundLength, groundHeight, groundDepth, GROUND_MATERIAL);
    platforms.push(finalGround);
    
    // Create the final stage sprite
    const finalStageX = finalGroundX + finalGroundLength - 2; // Position near the end of the ground
    const finalStageY = finalGroundY + groundHeight + 2; // Position above the ground
    
    // Create a placeholder transparent sprite synchronously
    const placeholderMaterial = new THREE.SpriteMaterial({
        color: 0xffffff,
        opacity: 0.0,
        transparent: true
    });
    const finalStage = new THREE.Sprite(placeholderMaterial);
    finalStage.position.set(finalStageX, finalStageY, groundZ);
    scene.add(finalStage);

    // Load the final stage texture and update the sprite when loaded
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load('assets/final-stage.png', (finalStageTexture) => {
        finalStageTexture.colorSpace = THREE.SRGBColorSpace;
        finalStageTexture.magFilter = THREE.NearestFilter;
        finalStageTexture.minFilter = THREE.NearestFilter;
        const finalStageMaterial = new THREE.SpriteMaterial({
            map: finalStageTexture,
            transparent: true,
            depthTest: true,
            depthWrite: false,
            alphaTest: 0.1,
            color: 0xffffff,
            opacity: 1.0,
            pixelRatio: window.devicePixelRatio,
            blending: THREE.NormalBlending,
            toneMapped: false,
            colorSpace: THREE.SRGBColorSpace,
            fog: false,
            lights: false
        });
        finalStage.material = finalStageMaterial;
        // Use the image's aspect ratio
        const aspectRatio = finalStageTexture.image.width / finalStageTexture.image.height;
        const finalStageHeight = 4; // Increased height for a bigger arch
        finalStage.scale.set(finalStageHeight * aspectRatio, finalStageHeight, 1);
    });

    // Add the final stage to the scene and store it for later use
    const levelEnd = {
        arch: {
            mesh: finalStage,
            position: new THREE.Vector3(finalStageX, finalStageY, groundZ),
            width: 4, // Increased width for collision detection
            height: 4 // Increased height for collision detection
        },
        ground: finalGround
    };

    // Add treasure boxes in specific ground sections
    const boxPlacements = [
        { sectionIndex: 0, offset: 0 },  // First ground section
        { sectionIndex: 1, offset: 0 },  // Second ground section
        { sectionIndex: 3, offset: 0 },  // Fourth ground section (after the special patch)
        { sectionIndex: 4, offset: 0 },  // Fifth ground section
        { sectionIndex: 5, offset: 0 }   // Sixth ground section
    ];

    // Use existing groundSections from levelElements
    console.log('Ground sections:', groundSections); // Debug log for ground sections

    if (groundSections && groundSections.length > 0) {
        boxPlacements.forEach((placement, index) => {
            const section = groundSections[placement.sectionIndex];
            if (section) {
                console.log(`Attempting to place box ${index + 1} in section ${placement.sectionIndex}:`, section);
                const y = 0; // Set all boxes to ground level
                
                // Place box on the ground
                const xPos = section.start + (section.end - section.start) * 0.5;
                const treasureBox = new TreasureBox(scene, xPos, y, GROUND_Z);
                treasureBoxes.push(treasureBox);
                console.log(`Successfully placed box ${index + 1} at x: ${xPos}, y: ${y}, z: ${GROUND_Z}`);
            } else {
                console.error(`Failed to place box ${index + 1}: Section ${placement.sectionIndex} not found`);
            }
        });
    } else {
        console.error('No ground sections available for treasure box placement');
    }

    // Calculate total level length for background
    const totalLength = x + 40; // Increased to accommodate the final section
    createScenery(scene, totalLength);

    return { 
        platforms, 
        collectibles, 
        lavaBlocks,
        obstacles, 
        shooters, 
        treasureBoxes,
        groundSections,
        levelEnd // Export the level end object
    };
}

export function checkCollision(boxA, boxB) {
    return boxA.intersectsBox(boxB);
}

export function checkCollectibleCollision(player, collectible) {
    // More forgiving collision for collectibles (e.g., sphere intersection or larger box)
    // For simplicity, using bounding box intersection.
    return player.getBoundingBox().intersectsBox(collectible.getBoundingBox());
}