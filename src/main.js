
// =============================================================
// CLASE JUGADOR
// Extiende Phaser.Physics.Arcade.Sprite para añadir física
// y control de teclado directamente en el sprite.
// =============================================================
class Player extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, texture) {
        super(scene, x, y, texture);
        scene.add.existing(this);       // añade el sprite a la escena
        scene.physics.add.existing(this); // añade el cuerpo físico

        this.setBounce(0.1);            // pequeño rebote al aterrizar
        this.setCollideWorldBounds(true); // no puede salir del mundo
        this.setDrag(0.9);              // fricción horizontal al soltar tecla
        this.facingLeft = false;        // dirección actual del personaje
    }

    // Se llama cada frame desde la función update() principal
    update(cursors) {
        if (cursors.left.isDown) {
            this.setVelocityX(-180);
            this.setFlipX(true);                  // voltea el sprite a la izquierda
            this.play('knight_run', true);        // animación correr
        } else if (cursors.right.isDown) {
            this.setVelocityX(180);
            this.setFlipX(false);                 // sprite mirando a la derecha
            this.play('knight_run', true);
        } else {
            this.setVelocityX(0);
            if (this.body.touching.down) {
                this.play('knight_idle', true);   // animación reposo si está en el suelo
            }
        }

        // Salto: solo si está tocando el suelo
        if (cursors.up.isDown && this.body.touching.down) {
            this.setVelocityY(-350);
            this.play('knight_roll', true);       // animación voltereta al saltar
        }
    }
}

// =============================================================
// CONFIGURACIÓN DE PHASER
// =============================================================
const config = {
    type: Phaser.AUTO,          // elige WebGL o Canvas automáticamente
    width: 800,
    height: 600,
    parent: 'game-container',   // div del HTML donde se renderiza el canvas
    backgroundColor: 0x87CEEB, // azul cielo de fondo
    render: {
        pixelArt: false,
        antialias: true
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 400 }, // gravedad global hacia abajo
            debug: false
        }
    },
    scene: {
        preload: preload, // carga de recursos
        create: create,   // creación de objetos
        update: update    // lógica por frame
    }
};

const game = new Phaser.Game(config);

// =============================================================
// VARIABLES GLOBALES
// =============================================================
let player;
let enemy;
let enemy2;
let enemy3;
let platforms;
let cursors;       // teclas de dirección
let goal;          // objeto meta (bandera)
let goalReached = false;
let lives = 3;
let audioContext;
let bgmOscillator;
let bgmGain;

// =============================================================
// AUDIO — síntesis de sonido con Web Audio API
// =============================================================

// Inicializa el contexto de audio (necesario por la política de autoplay del navegador)
function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
}

// Arranca la música de fondo; reanuda el contexto si estaba suspendido
function playBackgroundMusic() {
    if (!audioContext) initAudio();
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    playMarioMelody();
}

// Define la secuencia de notas de la melodía (frecuencia en Hz y duración en segundos)
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

// Reproduce las notas una a una usando osciladores; al terminar, reinicia la melodía
function playNotes(notes, index) {
    if (index >= notes.length) {
        setTimeout(() => playNotes(notes, 0), 500); // pausa breve antes de repetir
        return;
    }

    const note = notes[index];
    const osc = audioContext.createOscillator(); // genera la onda sonora
    const gain = audioContext.createGain();       // controla el volumen

    osc.type = 'square';                  // onda cuadrada (sonido retro)
    osc.frequency.value = note.freq;

    // Volumen: empieza en 0.1 y baja hasta casi 0 al final de la nota
    gain.gain.setValueAtTime(0.1, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + note.duration);

    osc.connect(gain);
    gain.connect(audioContext.destination);

    osc.start(audioContext.currentTime);
    osc.stop(audioContext.currentTime + note.duration);

    // Programa la siguiente nota al acabar la actual
    setTimeout(() => playNotes(notes, index + 1), note.duration * 1000);
}

// =============================================================
// COLISIÓN JUGADOR — ENEMIGO
// =============================================================
function handleEnemyCollision(playerObj, enemyObj) {
    // Si el jugador cae sobre el enemigo desde arriba → derrota al enemigo
    if (playerObj.body.velocity.y > 0 && playerObj.body.touching.down === false) {
        enemyObj.setTint(0x888888);          // oscurece el enemigo para indicar derrota
        enemyObj.setVelocity(0, -200);       // el enemigo sale despedido hacia arriba
        playerObj.setVelocityY(-200);        // pequeño rebote del jugador
        playerObj.play('knight_roll', true); // animación de voltereta
    } else {
        // Golpe lateral → pierde una vida
        lives--;
        updateLivesDisplay();

        if (lives <= 0) {
            // Sin vidas: Game Over
            playerObj.setVelocity(0, 0);
            playerObj.play('knight_death', true); // animación de muerte
            playerObj.scene.physics.pause();      // congela la física
            playerObj.scene.scene.pause();        // pausa la escena
            const gameOverOverlay = document.getElementById('game-over-overlay');
            if (gameOverOverlay) {
                gameOverOverlay.classList.add('visible');
            }
        } else {
            // Todavía quedan vidas: reaparece al inicio
            playerObj.play('knight_hit', true);  // animación de golpe recibido
            playerObj.setVelocity(0, 0);
            playerObj.setPosition(100, 450);
        }
    }
}

// Actualiza el contador de vidas en el HTML
function updateLivesDisplay() {
    const livesDisplay = document.getElementById('lives-display');
    if (livesDisplay) {
        livesDisplay.textContent = `❤️ Vidas: ${lives}`;
    }
}

// =============================================================
// PRELOAD — carga de recursos antes de arrancar la escena
// =============================================================
function preload() {
    const graphics = this.add.graphics();

    // --- Plataformas: textura generada por código (ladrillos marrones) ---
    graphics.fillStyle(0x8B4513);            // relleno marrón
    graphics.fillRect(0, 0, 800, 32);
    graphics.lineStyle(2, 0x654321, 1);
    for (let i = 0; i < 800; i += 40) {
        graphics.strokeRect(i, 0, 40, 32);  // líneas de los ladrillos
    }
    graphics.generateTexture('platform', 800, 32);
    graphics.clear();

    // --- Sprite sheet del caballero (knight.png) ---
    // Imagen de 256x256, fotogramas de 32x32 → 8 columnas × 8 filas
    // Fila 0 (frames  0– 3): IDLE  (4 frames)
    // Fila 1 (frames  8–15): RUN   (8 frames)
    // Fila 2 (frames 16–23): ROLL  (8 frames)
    // Fila 3 (frames 24–26): HIT   (3 frames)
    // Fila 4 (frames 32–37): DEATH (6 frames)
    this.load.spritesheet('knight', 'assets/knight.png', { frameWidth: 32, frameHeight: 32 });

    // --- Enemigo: textura generada por código (estilo Goomba) ---
    graphics.fillStyle(0x8B4513);
    graphics.fillCircle(16, 18, 12);        // cuerpo
    graphics.fillStyle(0xFFFFFF);
    graphics.fillCircle(12, 16, 3);         // ojo izquierdo (blanco)
    graphics.fillCircle(20, 16, 3);         // ojo derecho (blanco)
    graphics.fillStyle(0x000000);
    graphics.fillCircle(12, 16, 1.5);       // pupila izquierda
    graphics.fillCircle(20, 16, 1.5);       // pupila derecha
    graphics.generateTexture('enemy', 32, 32);
    graphics.clear();

    // --- Meta: textura generada por código (poste con bandera) ---
    graphics.fillStyle(0x8B4513);
    graphics.fillRect(12, 0, 8, 32);        // poste vertical
    graphics.fillStyle(0xFF0000);
    graphics.fillRect(20, 2, 12, 10);       // bandera roja
    graphics.fillStyle(0xFFD700);
    graphics.fillCircle(26, 8, 2);          // estrella dorada
    graphics.generateTexture('goal', 32, 32);
    graphics.destroy();
}

// =============================================================
// CREATE — construcción de la escena al iniciar
// =============================================================
function create() {
    const levelWidth = 2400; // anchura total del nivel (más grande que la pantalla)

    this.cameras.main.setBackgroundColor(0x87CEEB); // fondo azul cielo
    this.physics.world.setBounds(0, 0, levelWidth, 600); // límites del mundo físico
    this.cameras.main.setBounds(0, 0, levelWidth, 600);  // límites de la cámara

    // --- Animaciones del caballero ---
    this.anims.create({ key: 'knight_idle',  frames: this.anims.generateFrameNumbers('knight', { start: 0,  end: 3  }), frameRate: 8,  repeat: -1 }); // reposo (bucle)
    this.anims.create({ key: 'knight_run',   frames: this.anims.generateFrameNumbers('knight', { start: 16, end: 31 }), frameRate: 10, repeat: -1 }); // correr (bucle)
    this.anims.create({ key: 'knight_roll',  frames: this.anims.generateFrameNumbers('knight', { start: 40, end: 47 }), frameRate: 12, repeat: -1 }); // voltereta (bucle)
    this.anims.create({ key: 'knight_hit',   frames: this.anims.generateFrameNumbers('knight', { start: 48, end: 51 }), frameRate: 8,  repeat: 0  }); // golpe recibido (una vez)
    this.anims.create({ key: 'knight_death', frames: this.anims.generateFrameNumbers('knight', { start: 57, end: 61 }), frameRate: 6,  repeat: 0  }); // muerte (una vez)

    // --- Plataformas estáticas ---
    platforms = this.physics.add.staticGroup();
    platforms.create(1200, 568, 'platform').setScale(3).refreshBody();   // suelo principal
    platforms.create(900,  440, 'platform').setScale(0.5).refreshBody(); // plataforma baja-izquierda
    platforms.create(1350, 320, 'platform').setScale(0.5).refreshBody(); // plataforma central
    platforms.create(1800, 260, 'platform').setScale(0.5).refreshBody(); // plataforma alta
    platforms.create(2200, 380, 'platform').setScale(0.5).refreshBody(); // plataforma cerca de la meta

    // --- Jugador ---
    player = new Player(this, 100, 450, 'knight');
    player.setScale(2); // doble tamaño para que se vea bien en pantalla

    // --- Meta (bandera al final del nivel) ---
    goal = this.physics.add.staticSprite(2350, 520, 'goal');
    goal.setScale(2);

    // --- Enemigos ---
    enemy = this.physics.add.sprite(1600, 340, 'enemy');
    enemy.setBounce(0.8);
    enemy.setCollideWorldBounds(true);
    enemy.setVelocityX(100);   // se mueve hacia la derecha
    enemy.name = 'goomba';

    enemy2 = this.physics.add.sprite(1100, 380, 'enemy');
    enemy2.setBounce(0.8);
    enemy2.setCollideWorldBounds(true);
    enemy2.setVelocityX(-120); // se mueve hacia la izquierda
    enemy2.name = 'goomba';

    enemy3 = this.physics.add.sprite(1950, 200, 'enemy');
    enemy3.setBounce(0.8);
    enemy3.setCollideWorldBounds(true);
    enemy3.setVelocityX(150);
    enemy3.name = 'goomba';

    // --- Colisiones con plataformas ---
    this.physics.add.collider(player, platforms);
    this.physics.add.collider(enemy,  platforms);
    this.physics.add.collider(enemy2, platforms);
    this.physics.add.collider(enemy3, platforms);

    // --- Colisiones jugador con enemigos ---
    this.physics.add.collider(player, enemy,  handleEnemyCollision, null, this);
    this.physics.add.collider(player, enemy2, handleEnemyCollision, null, this);
    this.physics.add.collider(player, enemy3, handleEnemyCollision, null, this);

    // --- Superposición con la meta → victoria ---
    this.physics.add.overlap(player, goal, () => {
        if (goalReached) return; // evita ejecutarse dos veces

        goalReached = true;
        player.setTint(0xFFD700);    // tinte dorado al ganar
        player.setVelocity(0, 0);
        this.physics.pause();
        this.scene.pause();
        const overlay = document.getElementById('victory-overlay');
        if (overlay) overlay.classList.add('visible');
    }, null, this);

    // --- Controles y cámara ---
    cursors = this.input.keyboard.createCursorKeys(); // teclas de dirección
    this.cameras.main.startFollow(player, true, 0.08, 0.08); // cámara sigue al jugador con suavizado

    playBackgroundMusic();
}

// =============================================================
// UPDATE — se ejecuta cada frame
// =============================================================
function update() {
    player.update(cursors);
}
