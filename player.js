import * as THREE from 'three';
import { checkCollision } from './level.js';

const PLAYER_SPEED = 5;
const JUMP_FORCE = 10;
const GRAVITY = -30;
const PLAYER_WIDTH = 0.4;
const PLAYER_HEIGHT = 0.7;
const RESPAWN_COOLDOWN = 1.0; // 1 second cooldown
const PROJECTILE_SPEED = 15;
const PROJECTILE_COOLDOWN = 0.5; // 0.5 seconds between shots

class Projectile {
    constructor(scene, startPosition, direction) {
        // Create a placeholder transparent sprite synchronously
        const placeholderMaterial = new THREE.SpriteMaterial({
            color: 0xffffff,
            opacity: 0.0,
            transparent: true
        });
        this.mesh = new THREE.Sprite(placeholderMaterial);
        this.mesh.position.copy(startPosition);
        scene.add(this.mesh);
        
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
            this.mesh.material = spriteMaterial;
            // Use the image's aspect ratio
            const aspectRatio = fireballTexture.image.width / fireballTexture.image.height;
            const fireballHeight = 0.6;
            this.mesh.scale.set(fireballHeight * aspectRatio, fireballHeight, 1);
            // Flip the sprite if moving left
            if (direction < 0) {
                this.mesh.scale.x *= -1;
            }
        });
        
        this.velocity = new THREE.Vector3(direction * PROJECTILE_SPEED, 0, 0);
        this.boundingBox = new THREE.Box3().setFromObject(this.mesh);
    }

    update(deltaTime) {
        this.mesh.position.x += this.velocity.x * deltaTime;
        this.boundingBox.setFromObject(this.mesh);
    }

    getBoundingBox() {
        return this.boundingBox;
    }

    destroy(scene) {
        scene.remove(this.mesh);
    }
}

export class Player {
    constructor(scene) {
        // Load the sprite texture and set aspect ratio dynamically
        const textureLoader = new THREE.TextureLoader();
        textureLoader.load('assets/running-hero.png', (spriteTexture) => {
            spriteTexture.colorSpace = THREE.SRGBColorSpace;
            spriteTexture.magFilter = THREE.NearestFilter;
            spriteTexture.minFilter = THREE.NearestFilter;
            const spriteMaterial = new THREE.SpriteMaterial({ 
                map: spriteTexture,
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
            this.mesh = new THREE.Sprite(spriteMaterial);
            // Use the image's aspect ratio
            const aspectRatio = spriteTexture.image.width / spriteTexture.image.height;
            const desiredHeight = 1.7; // Set a reasonable height for the player
            this.mesh.scale.set(desiredHeight * aspectRatio, desiredHeight, 1);
            this.mesh.position.set(0, 1, 0);
            scene.add(this.mesh);
            this.width = desiredHeight * aspectRatio;
            this.height = desiredHeight;
            this.updateBoundingBox();
        });

        this.velocity = new THREE.Vector3();
        this.isOnGround = false;
        this.lastGroundPosition = new THREE.Vector3(0, 1, 0);
        this.isDead = false;
        this.deathTimer = 0;
        this.jumpsRemaining = 3; // Allow 3 jumps
        this.wasJumpPressed = false;
        
        this.boundingBox = new THREE.Box3();

        // Projectile properties
        this.projectiles = [];
        this.shootCooldown = 0;
        this.scene = scene;
        this.audioManager = null; // Will be set from main.js
        this.invincible = false;
        this.invincibleTimer = 0;
        this._blinkTimer = 0; // For blinking effect
    }

    setAudioManager(audioManager) {
        this.audioManager = audioManager;
    }

    updateBoundingBox() {
        // For sprite, create a more precise bounding box
        const halfWidth = this.width / 2;
        const halfHeight = this.height / 2;
        this.boundingBox.set(
            new THREE.Vector3(
                this.mesh.position.x - halfWidth,
                this.mesh.position.y - halfHeight,
                this.mesh.position.z - 0.1
            ),
            new THREE.Vector3(
                this.mesh.position.x + halfWidth,
                this.mesh.position.y + halfHeight,
                this.mesh.position.z + 0.1
            )
        );
    }
    
    getBoundingBox() {
        this.updateBoundingBox();
        return this.boundingBox;
    }

    die() {
        if (!this.isDead && !this.invincible) {
            this.isDead = true;
            this.deathTimer = RESPAWN_COOLDOWN;
            this.mesh.visible = false; // Hide player during death animation
        }
    }

    updateDeathTimer(deltaTime) {
        if (this.isDead) {
            this.deathTimer -= deltaTime;
            if (this.deathTimer <= 0) {
                this.isDead = false;
                this.mesh.visible = true;
                this.mesh.position.copy(this.lastGroundPosition);
                this.velocity.set(0, 0, 0);
                this.isOnGround = false;
                // Set invincibility for 5 seconds after respawn
                this.invincible = true;
                this.invincibleTimer = 5.0;
            }
        }
    }

    shoot() {
        if (this.shootCooldown <= 0) {
            const direction = this.velocity.x >= 0 ? 1 : -1;
            const projectileStart = new THREE.Vector3(
                this.mesh.position.x + (direction * this.width),
                this.mesh.position.y,
                this.mesh.position.z
            );
            this.projectiles.push(new Projectile(this.scene, projectileStart, direction));
            this.shootCooldown = PROJECTILE_COOLDOWN;
            
            // Play hit sound when shooting
            if (this.audioManager) {
                this.audioManager.playHit();
            }
        }
    }

    updateProjectiles(deltaTime, obstacles, treasureBoxes) {
        // Update shoot cooldown
        if (this.shootCooldown > 0) {
            this.shootCooldown -= deltaTime;
        }

        // Update existing projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const projectile = this.projectiles[i];
            projectile.update(deltaTime);

            // Check for collisions with obstacles
            for (let j = obstacles.length - 1; j >= 0; j--) {
                const obstacle = obstacles[j];
                if (checkCollision(projectile.getBoundingBox(), obstacle.getBoundingBox())) {
                    // Remove the obstacle
                    this.scene.remove(obstacle.mesh);
                    obstacles.splice(j, 1);
                    // Remove the projectile
                    projectile.destroy(this.scene);
                    this.projectiles.splice(i, 1);
                    break;
                }
            }

            // Check for collisions with treasure boxes
            if (treasureBoxes) {
                for (const box of treasureBoxes) {
                    if (!box.isOpen && checkCollision(projectile.getBoundingBox(), box.getBoundingBox())) {
                        box.open();
                        // Remove the projectile
                        projectile.destroy(this.scene);
                        this.projectiles.splice(i, 1);
                        break;
                    }
                }
            }

            // Remove projectiles that have gone too far
            if (Math.abs(projectile.mesh.position.x - this.mesh.position.x) > 20) {
                projectile.destroy(this.scene);
                this.projectiles.splice(i, 1);
            }
        }
    }

    update(deltaTime, keys, platforms) {
        if (this.isDead) {
            return;
        }
        
        // Handle shooting
        if (keys.shoot) {
            this.shoot();
        }
        
        // Horizontal movement
        this.velocity.x = 0;
        if (keys.left) {
            this.velocity.x = -PLAYER_SPEED;
        }
        if (keys.right) {
            this.velocity.x = PLAYER_SPEED;
        }

        // Apply gravity
        this.velocity.y += GRAVITY * deltaTime;

        // Multiple jumps with input tracking
        if (keys.jump && !this.wasJumpPressed) {
            if (this.jumpsRemaining > 0) {
                // Apply jump force, stronger for first jump
                const jumpForce = this.jumpsRemaining === 3 ? JUMP_FORCE : JUMP_FORCE * 0.8;
                this.velocity.y = Math.max(jumpForce, this.velocity.y + jumpForce);
                this.jumpsRemaining--;
                this.isOnGround = false;
            }
        }
        this.wasJumpPressed = keys.jump;
        
        // Store previous position for collision resolution
        const previousPosition = this.mesh.position.clone();
        
        // Apply velocity
        this.mesh.position.x += this.velocity.x * deltaTime;
        this.mesh.position.y += this.velocity.y * deltaTime;

        this.updateBoundingBox();

        // Platform collisions with improved ground detection
        platforms.forEach(platform => {
            if (checkCollision(this.getBoundingBox(), platform.getBoundingBox())) {
                const playerBox = this.getBoundingBox();
                const platformBox = platform.getBoundingBox();

                // Improved ground detection with larger tolerance
                const isAbove = playerBox.min.y >= platformBox.max.y - 0.2;
                const wasAbove = previousPosition.y >= platformBox.max.y - this.height / 2;
                
                // Simplified ground collision check
                if (this.velocity.y <= 0 && playerBox.min.y < platformBox.max.y && playerBox.max.y > platformBox.max.y) {
                    // Collision from top
                    this.mesh.position.y = platformBox.max.y + this.height / 2;
                    this.velocity.y = 0;
                    this.isOnGround = true;
                    this.jumpsRemaining = 3; // Reset jumps when landing
                    // Only update last ground position if this is a ground platform
                    if (Math.abs(platformBox.max.y - (-0.5)) < 0.1) {
                        this.lastGroundPosition.copy(this.mesh.position);
                    }
                } else if (playerBox.max.y > platformBox.min.y && playerBox.min.y < platformBox.min.y) {
                    // Hit from bottom
                    if (this.velocity.y > 0) {
                        this.mesh.position.y = platformBox.min.y - this.height/2;
                        this.velocity.y = 0;
                    }
                } else {
                    // Side collision
                    const collisionTolerance = 0.05;
                    const playerCenterX = this.mesh.position.x;
                    const platformCenterX = platform.mesh.position.x;
                    
                    // Check if player is moving towards the platform
                    const isMovingTowards = (this.velocity.x > 0 && playerCenterX < platformCenterX) || 
                                          (this.velocity.x < 0 && playerCenterX > platformCenterX);
                    
                    if (isMovingTowards) {
                        if (this.velocity.x > 0 && playerBox.max.x > platformBox.min.x && playerBox.min.x < platformBox.min.x) {
                            this.mesh.position.x = platformBox.min.x - this.width / 2 - collisionTolerance;
                            this.velocity.x = 0;
                        } else if (this.velocity.x < 0 && playerBox.min.x < platformBox.max.x && playerBox.max.x > platformBox.max.x) {
                            this.mesh.position.x = platformBox.max.x + this.width / 2 + collisionTolerance;
                            this.velocity.x = 0;
                        }
                    }
                }
            }
        });
        
        // Final position update and bounding box update
        this.updateBoundingBox();

        // Update invincibility timer and blinking effect
        if (this.invincible) {
            this.invincibleTimer -= deltaTime;
            this._blinkTimer += deltaTime;
            if (this._blinkTimer > 0.15) {
                this.mesh.visible = !this.mesh.visible;
                this._blinkTimer = 0;
            }
            if (this.invincibleTimer <= 0) {
                this.invincible = false;
                this.mesh.visible = true; // Ensure visible when invincibility ends
            }
        } else {
            this.mesh.visible = true; // Always visible when not invincible
        }
    }
}