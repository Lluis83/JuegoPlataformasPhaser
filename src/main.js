

class Player extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, texture) {
        super(scene, x, y, texture);
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setBounce(0.1);
        this.setCollideWorldBounds(true);
        this.setDrag(0.9);
        this.facingLeft = false;
    }

    update(cursors) {
        if (cursors.left.isDown) {
            this.setVelocityX(-180);
            this.facingLeft = true;
            this.setScale(-1, 1);
        } else if (cursors.right.isDown) {
            this.setVelocityX(180);
            this.facingLeft = false;
            this.setScale(1, 1);
        } else {
            this.setVelocityX(0);
        }

        if (cursors.up.isDown && this.body.touching.down) {
            this.setVelocityY(-350);
        }
    }
}
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-container',
    backgroundColor: 0x87CEEB,
    render: {
        pixelArt: false,
        antialias: true
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 400 },
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

const game = new Phaser.Game(config);

let player;
let enemy;
let enemy2;
let enemy3;
let platforms;
let cursors;
let goal;
let goalReached = false;
let lives = 3;
let audioContext;
let bgmOscillator;
let bgmGain;

// Crear contexto de audio
function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
}

// Función para reproducir la melodía de fondo
function playBackgroundMusic() {
    if (!audioContext) initAudio();
    
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    
    // Crear osciladores y ganancias para la melodía
    playMarioMelody();
}

// Melodía simplificada de Super Mario
function playMarioMelody() {
    const notes = [
        { freq: 330, duration: 0.15 },
        { freq: 330, duration: 0.15 },
        { freq: 330, duration: 0.15 },
        { freq: 262, duration: 0.1 },
        { freq: 330, duration: 0.15 },
        { freq: 392, duration: 0.3 },
        { freq: 196, duration: 0.3 },
        { freq: 262, duration: 0.15 },
        { freq: 196, duration: 0.1 },
        { freq: 165, duration: 0.15 },
        { freq: 220, duration: 0.15 },
        { freq: 247, duration: 0.1 },
        { freq: 262, duration: 0.4 },
        { freq: 330, duration: 0.15 },
        { freq: 330, duration: 0.15 },
        { freq: 330, duration: 0.15 },
        { freq: 262, duration: 0.1 },
        { freq: 330, duration: 0.15 },
        { freq: 392, duration: 0.3 },
        { freq: 196, duration: 0.3 },
        { freq: 262, duration: 0.15 },
        { freq: 196, duration: 0.1 },
        { freq: 165, duration: 0.15 },
        { freq: 220, duration: 0.15 },
        { freq: 247, duration: 0.1 },
        { freq: 262, duration: 0.4 },
        { freq: 392, duration: 0.15 },
        { freq: 494, duration: 0.15 },
        { freq: 523, duration: 0.2 },
        { freq: 440, duration: 0.2 },
        { freq: 392, duration: 0.15 },
        { freq: 330, duration: 0.15 },
        { freq: 294, duration: 0.15 },
        { freq: 262, duration: 0.3 }
    ];
    
    playNotes(notes, 0);
}

function playNotes(notes, index) {
    if (index >= notes.length) {
        // Repetir la melodía
        setTimeout(() => playNotes(notes, 0), 500);
        return;
    }
    
    const note = notes[index];
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    
    osc.type = 'square';
    osc.frequency.value = note.freq;
    
    gain.gain.setValueAtTime(0.1, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + note.duration);
    
    osc.connect(gain);
    gain.connect(audioContext.destination);
    
    osc.start(audioContext.currentTime);
    osc.stop(audioContext.currentTime + note.duration);
    
    setTimeout(() => playNotes(notes, index + 1), note.duration * 1000);
}

// Handle collision with any enemy
function handleEnemyCollision(playerObj, enemyObj) {
    if (playerObj.body.velocity.y > 0 && playerObj.body.touching.down === false) {
        // Jump on enemy - defeat it
        enemyObj.setTint(0x888888);
        enemyObj.setVelocity(0, -200);
        playerObj.setVelocityY(-200);
    } else {
        // Hit from side - lose a life
        lives--;
        updateLivesDisplay();
        
        if (lives <= 0) {
            // Game Over
            playerObj.setVelocity(0, 0);
            playerObj.scene.physics.pause();
            playerObj.scene.scene.pause();
            const gameOverOverlay = document.getElementById('game-over-overlay');
            if (gameOverOverlay) {
                gameOverOverlay.classList.add('visible');
            }
        } else {
            // Respawn player at start
            playerObj.setVelocity(0, 0);
            playerObj.setPosition(100, 450);
            playerObj.setTint(0xffffff);
        }
    }
}

function updateLivesDisplay() {
    const livesDisplay = document.getElementById('lives-display');
    if (livesDisplay) {
        livesDisplay.textContent = `❤️ Vidas: ${lives}`;
    }
}

function preload() {
    // Create graphics with Super Mario theme
    let graphics = this.add.graphics();
    
    // Platforms - Brown brick style
    graphics.fillStyle(0x8B4513); // Brown
    graphics.fillRect(0, 0, 800, 32);
    graphics.lineStyle(2, 0x654321, 1);
    for (let i = 0; i < 800; i += 40) {
        graphics.strokeRect(i, 0, 40, 32);
    }
    graphics.generateTexture('platform', 800, 32);
    graphics.clear();
    
    // Player - Mario style (red with yellow buttons)
    graphics.fillStyle(0xFF0000); // Red
    graphics.fillRect(0, 8, 32, 24);
    graphics.fillStyle(0xFFFF00); // Yellow buttons
    graphics.fillCircle(8, 16, 3);
    graphics.fillCircle(24, 16, 3);
    graphics.fillStyle(0xFDBD00); // Skin color
    graphics.fillRect(8, 2, 16, 8); // Head
    graphics.fillStyle(0x000000);
    graphics.fillCircle(12, 5, 1.5);
    graphics.fillCircle(16, 5, 1.5);
    graphics.generateTexture('player', 32, 32);
    graphics.clear();
    
    // Enemy - Goomba style
    graphics.fillStyle(0x8B4513); // Brown
    graphics.fillCircle(16, 18, 12);
    graphics.fillStyle(0xFFFFFF);
    graphics.fillCircle(12, 16, 3);
    graphics.fillCircle(20, 16, 3);
    graphics.fillStyle(0x000000);
    graphics.fillCircle(12, 16, 1.5);
    graphics.fillCircle(20, 16, 1.5);
    graphics.generateTexture('enemy', 32, 32);
    graphics.clear();
    
    // Goal/Flag - Meta estilo Super Mario
    graphics.fillStyle(0x8B4513); // Poste marrón
    graphics.fillRect(12, 0, 8, 32);
    graphics.fillStyle(0xFF0000); // Bandera roja
    graphics.fillRect(20, 2, 12, 10);
    graphics.fillStyle(0xFFD700); // Estrella dorada
    graphics.fillCircle(26, 8, 2);
    graphics.generateTexture('goal', 32, 32);
    graphics.destroy();
}

function create() {
    const levelWidth = 2400;

    // Set sky blue background
    this.cameras.main.setBackgroundColor(0x87CEEB);

    this.physics.world.setBounds(0, 0, levelWidth, 600);
    this.cameras.main.setBounds(0, 0, levelWidth, 600);

    platforms = this.physics.add.staticGroup();
    platforms.create(1200, 568, 'platform').setScale(3).refreshBody();
    platforms.create(900, 440, 'platform').setScale(0.5).refreshBody();
    platforms.create(1350, 320, 'platform').setScale(0.5).refreshBody();
    platforms.create(1800, 260, 'platform').setScale(0.5).refreshBody();
    platforms.create(2200, 380, 'platform').setScale(0.5).refreshBody();

    player = new Player(this, 100, 450, 'player');

    // Create goal at the end of the level
    goal = this.physics.add.staticSprite(2350, 520, 'goal');
    goal.setScale(2);

    enemy = this.physics.add.sprite(1600, 340, 'enemy');
    enemy.setBounce(0.8);
    enemy.setCollideWorldBounds(true);
    enemy.setVelocityX(100);
    enemy.name = 'goomba';

    // Create second enemy
    enemy2 = this.physics.add.sprite(1100, 380, 'enemy');
    enemy2.setBounce(0.8);
    enemy2.setCollideWorldBounds(true);
    enemy2.setVelocityX(-120);
    enemy2.name = 'goomba';

    // Create third enemy
    enemy3 = this.physics.add.sprite(1950, 200, 'enemy');
    enemy3.setBounce(0.8);
    enemy3.setCollideWorldBounds(true);
    enemy3.setVelocityX(150);
    enemy3.name = 'goomba';

    this.physics.add.collider(player, platforms);
    this.physics.add.collider(enemy, platforms);
    this.physics.add.collider(enemy2, platforms);
    this.physics.add.collider(enemy3, platforms);
    // Bird doesn't collide with platforms, it flies

    this.physics.add.collider(player, enemy, handleEnemyCollision, null, this);
    this.physics.add.collider(player, enemy2, handleEnemyCollision, null, this);
    this.physics.add.collider(player, enemy3, handleEnemyCollision, null, this);

    // Collision with goal
    this.physics.add.overlap(player, goal, () => {
        if (goalReached) {
            return;
        }

        goalReached = true;
        player.setTint(0xFFD700);
        player.setVelocity(0, 0);
        this.physics.pause();
        this.scene.pause();
        const overlay = document.getElementById('victory-overlay');
        if (overlay) {
            overlay.classList.add('visible');
        }
    }, null, this);

    cursors = this.input.keyboard.createCursorKeys();
    this.cameras.main.startFollow(player, true, 0.08, 0.08);
    
    // Reproducir música de fondo
    playBackgroundMusic();
}

function update() {
    player.update(cursors);
}