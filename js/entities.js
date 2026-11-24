window.MG = window.MG || {};

MG.Entities = (function () {
    const C = MG.CONSTANTS;
    const T = C.TILE_SIZE;
    const TILE = C.TILE;

    function aabb(a, b) {
        return a.x < b.x + b.w &&
               a.x + a.w > b.x &&
               a.y < b.y + b.h &&
               a.y + a.h > b.y;
    }

    function isSolidTile(id) {
        return (
            id === TILE.GROUND ||
            id === TILE.BRICK ||
            id === TILE.QUESTION_COIN ||
            id === TILE.QUESTION_POWER ||
            id === TILE.QUESTION_STAR ||
            id === TILE.QUESTION_1UP ||
            id === TILE.USED_BLOCK ||
            id === TILE.PIPE_TOP_L ||
            id === TILE.PIPE_TOP_R ||
            id === TILE.PIPE_BODY_L ||
            id === TILE.PIPE_BODY_R ||
            id === TILE.ICE ||
            id === TILE.QUICKSAND ||
            id === TILE.BRIDGE ||
            id === TILE.SECRET_PIPE_L ||
            id === TILE.SECRET_PIPE_R
        );
    }

    function isHazardTile(id) {
        return id === TILE.SPIKE || id === TILE.LAVA;
    }

    class Player {
        constructor(x, y) {
            this.x = x;
            this.y = y;
            this.w = 26;
            this.h = 34;
            this.vx = 0;
            this.vy = 0;
            this.facing = 1;
            this.state = 'small'; // 'small' | 'big' | 'fire'
            this.onGround = false;
            this.onIce = false;
            this.inQuicksand = false;
            this.coyoteTimer = 0;
            this.jumpBufferTimer = 0;
            this.invincibleTimer = 0;
            this.starTimer = 0;
            this.fireCooldown = 0;
            this.dead = false;
            this.deathTimer = 0;
            this.ridingPlatform = null;
        }

        setPowerState(newState) {
            const wasBig = this.state !== 'small';
            const willBeBig = newState !== 'small';
            this.state = newState;
            if (!wasBig && willBeBig) {
                this.y -= 14;
                this.w = 30;
                this.h = 48;
            } else if (wasBig && !willBeBig) {
                this.y += 14;
                this.w = 26;
                this.h = 34;
            }
        }
    }

    class Enemy {
        constructor(type, x, y, world) {
            this.type = type; // 'walker', 'flyer', 'shooter', 'runner', 'armored'
            this.x = x;
            this.y = y;
            this.w = 30;
            this.h = 30;
            this.world = world;
            const speedScale = 1 + (world - 1) * 0.06;
            const baseSpeed = type === 'runner' ? 145 : type === 'shooter' ? 0 : type === 'flyer' ? 85 : 72;
            this.vx = -baseSpeed * speedScale;
            this.vy = 0;
            this.startY = y;
            this.alive = true;
            this.shootTimer = 1.5 + Math.random() * 1.5;
            this.onGround = false;
        }
    }

    class Boss {
        constructor(world, x, y) {
            this.world = world;
            this.x = x;
            this.y = y;
            this.w = 56;
            this.h = 56;
            this.vx = -90 - world * 10;
            this.vy = 0;
            this.facing = -1;
            this.maxHp = 3 + world;
            this.hp = this.maxHp;
            this.alive = true;
            this.hitFlash = 0;
            this.invulnTimer = 0;
            this.actionTimer = 1.8;
            this.shootTimer = 2.0;
            this.onGround = false;
            this.arenaMinX = x - 340;
            this.arenaMaxX = x + 120;
        }
    }

    class MovingPlatform {
        constructor(x, y, w, h, dx, dy, speed) {
            this.startX = x;
            this.startY = y;
            this.x = x;
            this.y = y;
            this.prevX = x;
            this.prevY = y;
            this.w = w;
            this.h = h;
            this.dx = dx;
            this.dy = dy;
            this.speed = speed;
            this.t = 0;
        }

        update(dt) {
            this.prevX = this.x;
            this.prevY = this.y;
            this.t += dt * this.speed;
            const factor = (Math.sin(this.t) + 1) * 0.5;
            this.x = this.startX + this.dx * factor;
            this.y = this.startY + this.dy * factor;
        }
    }

    class Collectible {
        constructor(type, x, y, starIndex = -1) {
            this.type = type; // 'coin', 'mushroom', 'fire_flower', 'star', 'oneup', 'hidden_star'
            this.x = x;
            this.y = y;
            this.w = 24;
            this.h = 24;
            this.vx = (type === 'mushroom' || type === 'star' || type === 'oneup') ? 95 : 0;
            this.vy = (type === 'mushroom' || type === 'star' || type === 'oneup') ? -180 : 0;
            this.collected = false;
            this.starIndex = starIndex;
            this.dynamic = (type === 'mushroom' || type === 'star' || type === 'oneup');
        }
    }

    class Projectile {
        constructor(x, y, vx, vy, fromPlayer = true) {
            this.x = x;
            this.y = y;
            this.w = 14;
            this.h = 14;
            this.vx = vx;
            this.vy = vy;
            this.fromPlayer = fromPlayer;
            this.alive = true;
            this.bounces = 0;
        }
    }

    class Particle {
        constructor(x, y, vx, vy, color, life = 0.5, size = 5, gravity = true) {
            this.x = x;
            this.y = y;
            this.vx = vx;
            this.vy = vy;
            this.color = color;
            this.life = life;
            this.maxLife = life;
            this.size = size;
            this.gravity = gravity;
        }
    }

    class FloatingText {
        constructor(x, y, text, color = '#fbbf24') {
            this.x = x;
            this.y = y;
            this.text = text;
            this.color = color;
            this.life = 0.85;
        }
    }

    return {
        aabb,
        isSolidTile,
        isHazardTile,
        Player,
        Enemy,
        Boss,
        MovingPlatform,
        Collectible,
        Projectile,
        Particle,
        FloatingText
    };
})();
