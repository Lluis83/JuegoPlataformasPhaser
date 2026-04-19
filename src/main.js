

class Player extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, texture) {
        super(scene, x, y, texture);
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setBounce(0.2);
        this.setCollideWorldBounds(true);
    }

    update(cursors) {
        if (cursors.left.isDown) {
            this.setVelocityX(-160);
        } else if (cursors.right.isDown) {
            this.setVelocityX(160);
        } else {
            this.setVelocityX(0);
        }

        if (cursors.up.isDown && this.body.touching.down) {
            this.setVelocityY(-330);
        }
    }
}
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-container',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 300 },
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
let platforms;
let cursors;

function preload() {
    // Create graphics for platforms and player
    let graphics = this.add.graphics();
    graphics.fillStyle(0x00ff00);
    graphics.fillRect(0, 0, 800, 32);
    graphics.generateTexture('platform', 800, 32);
    graphics.clear();
    graphics.fillStyle(0xff0000);
    graphics.fillRect(0, 0, 32, 32);
    graphics.generateTexture('player', 32, 32);
    graphics.destroy();
}

function create() {
    platforms = this.physics.add.staticGroup();
    platforms.create(400, 568, 'platform');
    platforms.create(600, 400, 'platform').setScale(0.5).refreshBody();
    platforms.create(50, 250, 'platform').setScale(0.5).refreshBody();
    platforms.create(750, 220, 'platform').setScale(0.5).refreshBody();

    player = new Player(this, 100, 450, 'player');

    this.physics.add.collider(player, platforms);

    cursors = this.input.keyboard.createCursorKeys();
}

function update() {
    player.update(cursors);
}