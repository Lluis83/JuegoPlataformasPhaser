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