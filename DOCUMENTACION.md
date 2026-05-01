# Documentación — Juego de Plataformas Phaser

## Descripción del juego

Juego de plataformas 2D de desplazamiento lateral desarrollado con **Phaser 3.9** y **JavaScript**. El jugador controla a un caballero con sprite animado que debe recorrer un nivel diseñado con el editor Tiled, esquivar enemigos y alcanzar la bandera al final del mapa para ganar. El jugador dispone de 3 vidas; si las pierde todas, aparece la pantalla de Game Over.

---

## Tecnologías utilizadas

| Tecnología | Versión | Uso |
|---|---|---|
| Phaser | 3.9.0 | Motor del juego (renderizado, física, animaciones, input) |
| JavaScript (ES6+) | — | Lógica del juego |
| HTML5 / CSS3 | — | Estructura de la página y overlays (victoria, game over) |
| Web Audio API | — | Síntesis de música de fondo en tiempo real |
| Tiled Map Editor | 1.12.1 | Diseño visual del nivel |

---

## Estructura del proyecto

```
JuegoPlataformasPhaser/
├── index.html          # Página principal: canvas del juego + overlays HTML
├── src/
│   ├── main.js         # Lógica completa del juego
│   └── styles.css      # Estilos de la página y overlays
└── assets/
    ├── knight.png      # Sprite sheet del jugador (256×256, frames 32×32)
    ├── tileset.png     # Tileset del mapa (256×256, tiles 16×16)
    └── level1.json     # Mapa exportado desde Tiled
```

---

## Clases

### `Player` — `src/main.js`

Extiende `Phaser.Physics.Arcade.Sprite`. Encapsula toda la lógica del personaje jugable.

**Constructor — `constructor(scene, x, y, texture)`**

| Llamada | Efecto |
|---|---|
| `scene.add.existing(this)` | Registra el sprite en la escena para que Phaser lo renderice |
| `scene.physics.add.existing(this)` | Añade un cuerpo de física Arcade al sprite |
| `setBounce(0.1)` | Pequeño rebote al aterrizar sobre una superficie |
| `setCollideWorldBounds(true)` | Impide que el personaje salga de los límites del mundo |
| `setDrag(0.9)` | Fricción horizontal; el personaje frena rápido al soltar la tecla |
| `body.setSize(14, 26)` | Define un hitbox más estrecho que el sprite (28×52 px en pantalla con escala 2×) |
| `body.setOffset(9, 3)` | Centra el hitbox horizontalmente y lo alinea con los pies del sprite |

**Método — `update(cursors)`**

Se invoca cada frame desde la función `update()` global. Gestiona:

- **Movimiento horizontal**: flecha izquierda/derecha → `setVelocityX` ±180 + `setFlipX` para voltear el sprite + animación `knight_run`
- **Reposo**: sin teclas pulsadas → velocidad X = 0 + animación `knight_idle` (solo si está en el suelo)
- **Salto**: flecha arriba + `body.blocked.down` → `setVelocityY(-350)` + animación `knight_roll`

> Se usa `body.blocked.down` en lugar de `body.touching.down` porque el tilemap actúa como superficie estática, no como cuerpo dinámico.

---

## Funciones principales

### `preload()`

Ejecutada por Phaser antes de arrancar la escena. Carga todos los recursos:

| Recurso | Método | Clave |
|---|---|---|
| Mapa Tiled | `this.load.tilemapTiledJSON` | `'map'` |
| Imagen del tileset | `this.load.image` | `'tileset'` |
| Sprite sheet caballero | `this.load.spritesheet` | `'knight'` |
| Textura enemigo | `graphics.generateTexture` | `'enemy'` |
| Textura meta | `graphics.generateTexture` | `'goal'` |

Las texturas del enemigo y la meta se generan por código usando `Phaser.GameObjects.Graphics`, sin necesidad de archivos de imagen externos.

---

### `create()`

Ejecutada una vez cuando la escena arranca. Construye todos los elementos del juego:

1. **Fondo**: color azul cielo (`0x87CEEB`)
2. **Animaciones** del caballero (ver tabla de animaciones)
3. **Tilemap**: carga el mapa desde `assets/level1.json` con `this.make.tilemap`, crea la capa `ground` con colisión y ajusta los límites del mundo y la cámara al tamaño real del mapa
4. **Jugador**: instancia de `Player` en (100, 450), escala 2×
5. **Meta**: sprite estático en el extremo derecho del nivel
6. **Enemigos**: tres sprites dinámicos con velocidad inicial y rebote en los bordes del mundo
7. **Colisores**: jugador↔tilemap, enemigos↔tilemap, jugador↔enemigos, jugador↔meta
8. **Controles**: `createCursorKeys()` + teclas ESC y P para la pausa
9. **Cámara**: sigue al jugador con suavizado (lerp 0.08)
10. **Menú de pausa**: overlay invisible creado con Graphics y Text, fijado a la cámara con `setScrollFactor(0)`

---

### `update()`

Ejecutada cada frame. Realiza dos acciones:

1. Comprueba si se ha pulsado ESC o P (con `Phaser.Input.Keyboard.JustDown`) y llama a `togglePause()`
2. Si el juego no está pausado, delega el movimiento del jugador a `player.update(cursors)`

---

### `togglePause()`

Alterna el estado de pausa:

- Muestra/oculta el overlay semitransparente, el título "PAUSA" y el texto de ayuda
- Llama a `scene.physics.pause()` o `scene.physics.resume()` según el estado

---

### `handleEnemyCollision(playerObj, enemyObj)`

Callback de colisión entre el jugador y un enemigo. Distingue dos casos:

| Condición | Resultado |
|---|---|
| Jugador cae desde arriba (`velocity.y > 0` y no `touching.down`) | Enemigo eliminado (tinte gris + rebote) + rebote del jugador + animación `knight_roll` |
| Golpe lateral | Resta una vida + animación `knight_hit` + reaparece en (100, 450). Si `lives <= 0` → animación `knight_death` + pausa física + pantalla Game Over |

---

### Audio: `initAudio`, `playBackgroundMusic`, `playMarioMelody`, `playNotes`

Genera música de fondo mediante síntesis en tiempo real con la **Web Audio API**, sin archivos de audio externos:

- `initAudio()` — crea el `AudioContext` (necesario por la política de autoplay del navegador)
- `playMarioMelody()` — define una secuencia de notas con frecuencia y duración
- `playNotes(notes, index)` — reproduce las notas una a una usando `OscillatorNode` (onda cuadrada, sonido retro) + `GainNode` para el sobre de volumen; se repite indefinidamente

---

## Animaciones del caballero

El sprite sheet `knight.png` (256×256 px) se divide en frames de 32×32. Con escala 2× se muestran a 64×64 px en pantalla.

| Clave | Frames | FPS | Bucle | Disparador |
|---|---|---|---|---|
| `knight_idle` | 0–3 | 8 | Sí | Sin movimiento y en suelo |
| `knight_run` | 16–31 | 10 | Sí | Flecha izquierda o derecha |
| `knight_roll` | 40–47 | 12 | Sí | Salto o pisada sobre enemigo |

---

## Tilemap

El nivel se diseña con **Tiled Map Editor** y se exporta como JSON a `assets/level1.json`.

| Propiedad | Valor |
|---|---|
| Tamaño del tile | 16×16 px |
| Tamaño del mapa | 75×38 tiles (1200×608 px) |
| Capa de colisión | `ground` |
| Capa decorativa (opcional) | `decorations` |
| Tileset | `tileset` → `assets/tileset.png` |

La colisión se activa con `groundLayer.setCollisionByExclusion([-1])`, que hace colisionables todos los tiles no vacíos.

---

## Variables globales

| Variable | Tipo | Descripción |
|---|---|---|
| `player` | `Player` | Instancia del jugador |
| `enemy`, `enemy2`, `enemy3` | `Phaser.Physics.Arcade.Sprite` | Los tres enemigos |
| `groundLayer` | `Phaser.Tilemaps.StaticTilemapLayer` | Capa del tilemap con colisión |
| `cursors` | `Phaser.Types.Input.Keyboard.CursorKeys` | Teclas de dirección |
| `goal` | `Phaser.Physics.Arcade.Sprite` | Sprite de la meta |
| `goalReached` | `boolean` | Evita que la victoria se dispare más de una vez |
| `lives` | `number` | Vidas restantes (empieza en 3) |
| `isPaused` | `boolean` | Estado actual de la pausa |
| `escKey`, `pKey` | `Phaser.Input.Keyboard.Key` | Teclas de pausa |
| `pauseOverlay`, `pauseTitle`, `pauseHint` | GameObjects de Phaser | Elementos visuales del menú de pausa |
| `scene` | `Phaser.Scene` | Referencia a la escena activa (para usarla en funciones globales) |
| `audioContext` | `AudioContext` | Contexto de la Web Audio API |

---

## Controles

| Tecla | Acción |
|---|---|
| ← Flecha izquierda | Mover a la izquierda |
| → Flecha derecha | Mover a la derecha |
| ↑ Flecha arriba | Saltar |
| ESC / P | Pausar / reanudar el juego |

---

## Mecánicas de juego

- **Sistema de vidas**: el jugador empieza con 3 vidas. Cada golpe lateral de un enemigo resta una vida y reaparece al inicio. Al llegar a 0 vidas aparece la pantalla de Game Over.
- **Victoria**: al tocar la bandera meta aparece la pantalla de victoria y el juego se pausa.
- **Pausa**: ESC o P congela la física y muestra un overlay semitransparente. Volver a pulsar reanuda el juego.
- **Cámara**: sigue al jugador con interpolación suave para evitar movimientos bruscos.
