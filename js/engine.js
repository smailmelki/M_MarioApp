window.MG = window.MG || {};

MG.Engine = (function () {
    const C = MG.CONSTANTS;
    const T = C.TILE_SIZE;
    const TILE = C.TILE;
    const E = MG.Entities;

    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    let rafId = null;
    let lastTime = 0;
    let timeSec = 0;

    let state = 'menu'; // 'menu' | 'playing' | 'paused' | 'level_clear' | 'gameover' | 'victory'
    let levelData = null;
    let player = null;
    let enemies = [];
    let collectibles = [];
    let platforms = [];
    let projectiles = [];
    let particles = [];
    let floatingTexts = [];
    let boss = null;
    let bumpedBlocks = []; // { r, c, timer }

    let camX = 0;
    let timeLeft = 300;
    let score = 0;
    let coins = 0;
    let lives = C.START_LIVES;
    let levelStars = [false, false, false];
    let enemiesDefeatedThisRun = 0;
    let checkpointPos = null;
    let bossDefeated = false;

    const input = {
        left: false,
        right: false,
        up: false,
        down: false,
        jump: false,
        jumpJustPressed: false,
        run: false,
        fireJustPressed: false
    };

    function setInput(key, val) {
        if (key === 'jump') {
            if (val && !input.jump) input.jumpJustPressed = true;
            input.jump = val;
        } else if (key === 'run') {
            if (val && !input.run) input.fireJustPressed = true;
            input.run = val;
        } else {
            input[key] = val;
        }
    }

    function startNewGame() {
        score = 0;
        coins = 0;
        lives = C.START_LIVES;
        loadLevel(1, 1, true);
    }

    function continueGame() {
        const save = MG.Storage.get();
        score = 0;
        coins = 0;
        lives = C.START_LIVES;
        loadLevel(save.lastWorld || 1, save.lastLevel || 1, true);
    }

    function loadLevel(world, level, resetCheckpoint = true) {
        levelData = MG.Levels.generateLevel(world, level);
        MG.Storage.setLastPlayed(world, level);

        if (resetCheckpoint) {
            checkpointPos = { x: 2 * T, y: 11 * T };
            levelStars = [false, false, false];
        }

        const spawn = checkpointPos || { x: 2 * T, y: 11 * T };
        player = new E.Player(spawn.x, spawn.y);

        enemies = levelData.enemies.map(ed => new E.Enemy(ed.type, ed.x, ed.y, world));
        collectibles = levelData.collectibles.map(cd => new E.Collectible(cd.type, cd.x, cd.y, cd.starIndex ?? -1));
        platforms = levelData.platforms.map(pd => new E.MovingPlatform(pd.x, pd.y, pd.w, pd.h, pd.dx, pd.dy, pd.speed));
        projectiles = [];
        particles = [];
        floatingTexts = [];
        bumpedBlocks = [];
        bossDefeated = false;
        boss = levelData.boss ? new E.Boss(levelData.boss.world, levelData.boss.x, levelData.boss.y) : null;

        timeLeft = levelData.timeLimit;
        enemiesDefeatedThisRun = 0;
        camX = Math.max(0, Math.min(player.x - C.VIEW_WIDTH * 0.35, levelData.cols * T - C.VIEW_WIDTH));

        state = 'playing';
        MG.Audio.ensureCtx();
        MG.Audio.startMusic(levelData.theme.musicTheme);
        MG.UI.onGameStart(levelData);
        updateHud();

        if (!rafId) {
            lastTime = performance.now();
            rafId = requestAnimationFrame(loop);
        }
    }

    function pause() {
        if (state !== 'playing') return;
        state = 'paused';
        MG.Audio.stopMusic();
        MG.UI.showPause(levelData);
    }

    function resume() {
        if (state !== 'paused') return;
        state = 'playing';
        MG.Audio.startMusic(levelData.theme.musicTheme);
        MG.UI.hidePause();
    }

    function stopToMenu() {
        state = 'menu';
        MG.Audio.stopMusic();
        MG.UI.showMainMenu();
    }

    function restartCurrentLevel() {
        if (!levelData) return;
        loadLevel(levelData.world, levelData.level, true);
    }

    function loop(now) {
        const dt = Math.min(0.033, (now - lastTime) / 1000);
        lastTime = now;
        timeSec += dt;

        if (state === 'playing') {
            update(dt);
        }
        render();

        input.jumpJustPressed = false;
        input.fireJustPressed = false;
        rafId = requestAnimationFrame(loop);
    }

    function getTile(r, c) {
        if (r < 0 || r >= levelData.rows || c < 0 || c >= levelData.cols) return TILE.EMPTY;
        return levelData.grid[r][c];
    }

    function setTile(r, c, val) {
        if (r >= 0 && r < levelData.rows && c >= 0 && c < levelData.cols) {
            levelData.grid[r][c] = val;
        }
    }

    function update(dt) {
        // Timer
        timeLeft -= dt;
        if (timeLeft <= 0) {
            timeLeft = 0;
            killPlayer();
            return;
        }

        // Bumped blocks animation
        for (let i = bumpedBlocks.length - 1; i >= 0; i--) {
            bumpedBlocks[i].timer -= dt;
            if (bumpedBlocks[i].timer <= 0) bumpedBlocks.splice(i, 1);
        }

        // Moving platforms
        for (const plat of platforms) {
            plat.update(dt);
        }

        updatePlayer(dt);
        if (state !== 'playing') return;

        updateEnemies(dt);
        updateBoss(dt);
        updateCollectibles(dt);
        updateProjectiles(dt);
        updateParticles(dt);

        // Camera smooth follow with strict bounds (no gaps!)
        const targetCamX = player.x + player.w / 2 - C.VIEW_WIDTH * 0.38;
        const maxCamX = Math.max(0, levelData.cols * T - C.VIEW_WIDTH);
        camX += (targetCamX - camX) * Math.min(1, dt * 8);
        camX = Math.max(0, Math.min(camX, maxCamX));

        updateHud();
    }

    function updatePlayer(dt) {
        if (player.dead) {
            player.deathTimer -= dt;
            player.vy += C.GRAVITY * dt;
            player.y += player.vy * dt;
            if (player.deathTimer <= 0) {
                if (lives > 0) {
                    loadLevel(levelData.world, levelData.level, false);
                } else {
                    state = 'gameover';
                    MG.Audio.stopMusic();
                    MG.Audio.sfx.gameOver();
                    MG.Storage.addStats({ score, coins: 0, enemies: enemiesDefeatedThisRun });
                    MG.UI.showGameOver(score);
                }
            }
            return;
        }

        if (player.invincibleTimer > 0) player.invincibleTimer -= dt;
        if (player.starTimer > 0) player.starTimer -= dt;
        if (player.fireCooldown > 0) player.fireCooldown -= dt;

        // Carry by moving platform
        if (player.ridingPlatform) {
            player.x += player.ridingPlatform.x - player.ridingPlatform.prevX;
            player.y += player.ridingPlatform.y - player.ridingPlatform.prevY;
        }

        // Horizontal movement
        const maxSpeed = (input.run ? C.RUN_SPEED : C.WALK_SPEED) * (player.inQuicksand ? 0.55 : 1) * (player.starTimer > 0 ? 1.15 : 1);
        const accel = player.onGround ? (player.onIce ? C.ICE_ACCEL : C.GROUND_ACCEL) : C.AIR_ACCEL;
        const decel = player.onGround ? (player.onIce ? C.ICE_DECEL : C.GROUND_DECEL) : 450;

        if (input.left && !input.right) {
            player.vx = Math.max(-maxSpeed, player.vx - accel * dt);
            player.facing = -1;
        } else if (input.right && !input.left) {
            player.vx = Math.min(maxSpeed, player.vx + accel * dt);
            player.facing = 1;
        } else {
            if (player.vx > 0) player.vx = Math.max(0, player.vx - decel * dt);
            else if (player.vx < 0) player.vx = Math.min(0, player.vx + decel * dt);
        }

        // Coyote & Jump Buffer
        if (player.onGround) player.coyoteTimer = C.COYOTE_TIME;
        else player.coyoteTimer -= dt;

        if (input.jumpJustPressed) player.jumpBufferTimer = C.JUMP_BUFFER;
        else player.jumpBufferTimer -= dt;

        if (player.jumpBufferTimer > 0 && player.coyoteTimer > 0) {
            player.vy = C.JUMP_VELOCITY;
            player.onGround = false;
            player.coyoteTimer = 0;
            player.jumpBufferTimer = 0;
            player.ridingPlatform = null;
            MG.Audio.sfx.jump(player.state !== 'small');
        }

        // Variable jump height (cut velocity when jump released early)
        if (!input.jump && player.vy < -180) {
            player.vy *= Math.pow(C.JUMP_CUT_MULTIPLIER, dt * 15);
        }

        // Fireball shooting
        if (input.fireJustPressed && player.state === 'fire' && player.fireCooldown <= 0) {
            const playerFireballs = projectiles.filter(p => p.fromPlayer).length;
            if (playerFireballs < 3) {
                projectiles.push(new E.Projectile(
                    player.x + (player.facing > 0 ? player.w : -14),
                    player.y + player.h * 0.4,
                    player.facing * 430,
                    -90,
                    true
                ));
                player.fireCooldown = 0.28;
                MG.Audio.sfx.fireball();
            }
        }

        // Gravity
        const grav = player.inQuicksand ? C.GRAVITY * 0.45 : C.GRAVITY;
        player.vy = Math.min(C.MAX_FALL_SPEED, player.vy + grav * dt);

        // Move X and resolve
        player.x += player.vx * dt;
        player.x = Math.max(0, Math.min(player.x, levelData.cols * T - player.w));
        resolveTileCollisionX(player);

        // Move Y and resolve
        const prevBottom = player.y + player.h;
        player.y += player.vy * dt;
        player.onGround = false;
        player.onIce = false;
        player.inQuicksand = false;
        player.ridingPlatform = null;

        resolveTileCollisionY(player, prevBottom);
        resolvePlatformCollision(player, prevBottom);

        // Secret Pipe Warp (press Down while standing on secret pipe)
        if (input.down && player.onGround) {
            const pCol = Math.floor((player.x + player.w / 2) / T);
            const pRow = Math.floor((player.y + player.h + 2) / T);
            for (const w of levelData.secretWarps) {
                if ((pCol === w.col1 || pCol === w.col2) && pRow === w.topRow) {
                    player.x = w.toCol * T;
                    player.y = w.toRow * T;
                    player.vy = 0;
                    MG.Audio.sfx.pipe();
                    floatingTexts.push(new E.FloatingText(player.x, player.y - 10, 'ممر سري!', '#38bdf8'));
                    break;
                }
            }
        }

        // Check special tiles (Hazards, Checkpoint, Goal)
        checkSpecialTiles();

        // Fell in pit
        if (player.y > levelData.rows * T + 40) {
            killPlayer();
        }
    }

    function resolveTileCollisionX(ent) {
        const topR = Math.floor((ent.y + 3) / T);
        const botR = Math.floor((ent.y + ent.h - 3) / T);
        const leftC = Math.floor(ent.x / T);
        const rightC = Math.floor((ent.x + ent.w) / T);

        for (let r = topR; r <= botR; r++) {
            for (let c = leftC; c <= rightC; c++) {
                const tid = getTile(r, c);
                if (E.isSolidTile(tid) && tid !== TILE.BRIDGE) {
                    if (ent.vx > 0) {
                        ent.x = c * T - ent.w - 0.01;
                        ent.vx = 0;
                    } else if (ent.vx < 0) {
                        ent.x = (c + 1) * T + 0.01;
                        ent.vx = 0;
                    }
                }
            }
        }
    }

    function resolveTileCollisionY(ent, prevBottom) {
        const leftC = Math.floor((ent.x + 3) / T);
        const rightC = Math.floor((ent.x + ent.w - 3) / T);
        const topR = Math.floor(ent.y / T);
        const botR = Math.floor((ent.y + ent.h) / T);

        for (let r = topR; r <= botR; r++) {
            for (let c = leftC; c <= rightC; c++) {
                const tid = getTile(r, c);
                if (!E.isSolidTile(tid)) continue;

                // One-way bridge
                if (tid === TILE.BRIDGE) {
                    if (ent.vy >= 0 && prevBottom <= r * T + 8) {
                        ent.y = r * T - ent.h;
                        ent.vy = 0;
                        ent.onGround = true;
                    }
                    continue;
                }

                if (ent.vy >= 0) {
                    ent.y = r * T - ent.h;
                    ent.vy = 0;
                    ent.onGround = true;
                    if (tid === TILE.ICE) ent.onIce = true;
                    if (tid === TILE.QUICKSAND) ent.inQuicksand = true;
                } else if (ent.vy < 0) {
                    ent.y = (r + 1) * T + 0.01;
                    ent.vy = 0;
                    if (ent === player) {
                        hitBlockFromBelow(r, c, tid);
                    }
                }
            }
        }
    }

    function resolvePlatformCollision(ent, prevBottom) {
        if (ent.vy < 0) return;
        for (const plat of platforms) {
            if (
                ent.x + ent.w > plat.x + 2 &&
                ent.x < plat.x + plat.w - 2 &&
                prevBottom <= plat.y + 10 &&
                ent.y + ent.h >= plat.y
            ) {
                ent.y = plat.y - ent.h;
                ent.vy = 0;
                ent.onGround = true;
                ent.ridingPlatform = plat;
                break;
            }
        }
    }

    function hitBlockFromBelow(r, c, tid) {
        if (tid === TILE.BRICK) {
            if (player.state !== 'small') {
                setTile(r, c, TILE.EMPTY);
                addScore(50);
                MG.Audio.sfx.brickBreak();
                spawnBrickDebris(c * T + T / 2, r * T + T / 2);
            } else {
                bumpedBlocks.push({ r, c, timer: 0.14 });
                MG.Audio.sfx.bump();
            }
        } else if (
            tid === TILE.QUESTION_COIN ||
            tid === TILE.QUESTION_POWER ||
            tid === TILE.QUESTION_STAR ||
            tid === TILE.QUESTION_1UP
        ) {
            setTile(r, c, TILE.USED_BLOCK);
            bumpedBlocks.push({ r, c, timer: 0.14 });

            const bx = c * T + 6;
            const by = (r - 1) * T;

            if (tid === TILE.QUESTION_COIN) {
                collectCoin(bx, by);
            } else if (tid === TILE.QUESTION_POWER) {
                const pType = player.state === 'small' ? 'mushroom' : 'fire_flower';
                collectibles.push(new E.Collectible(pType, bx, by));
                MG.Audio.sfx.powerup();
            } else if (tid === TILE.QUESTION_STAR) {
                collectibles.push(new E.Collectible('star', bx, by));
                MG.Audio.sfx.powerup();
            } else if (tid === TILE.QUESTION_1UP) {
                collectibles.push(new E.Collectible('oneup', bx, by));
                MG.Audio.sfx.powerup();
            }
        } else {
            MG.Audio.sfx.bump();
        }
    }

    function checkSpecialTiles() {
        const leftC = Math.floor((player.x + 4) / T);
        const rightC = Math.floor((player.x + player.w - 4) / T);
        const topR = Math.floor((player.y + 4) / T);
        const botR = Math.floor((player.y + player.h - 4) / T);

        for (let r = topR; r <= botR; r++) {
            for (let c = leftC; c <= rightC; c++) {
                const tid = getTile(r, c);
                if (E.isHazardTile(tid)) {
                    if (player.starTimer <= 0) {
                        hurtPlayer();
                        return;
                    }
                } else if (tid === TILE.CHECKPOINT) {
                    setTile(r, c, TILE.EMPTY);
                    checkpointPos = { x: c * T, y: (r - 1) * T };
                    MG.Audio.sfx.powerup();
                    floatingTexts.push(new E.FloatingText(c * T, r * T - 10, 'نقطة حفظ!', '#38bdf8'));
                } else if (tid === TILE.GOAL_POLE) {
                    completeLevel();
                    return;
                }
            }
        }
    }

    function updateEnemies(dt) {
        for (const e of enemies) {
            if (!e.alive) continue;
            // Only simulate enemies near camera
            if (e.x < camX - 240 || e.x > camX + C.VIEW_WIDTH + 240) continue;

            if (e.type === 'flyer') {
                e.x += e.vx * dt;
                e.y = e.startY + Math.sin(timeSec * 3.5 + e.x * 0.02) * 28;
                if (e.x <= 0 || e.x + e.w >= levelData.cols * T) e.vx *= -1;
            } else if (e.type === 'shooter') {
                e.vx = player.x < e.x ? -0.01 : 0.01;
                e.shootTimer -= dt;
                if (e.shootTimer <= 0) {
                    e.shootTimer = Math.max(1.3, 2.6 - levelData.world * 0.14);
                    const dir = player.x < e.x ? -1 : 1;
                    projectiles.push(new E.Projectile(e.x + e.w / 2, e.y + 8, dir * 210, -40, false));
                }
            } else {
                // Ground enemy
                e.vy = Math.min(C.MAX_FALL_SPEED, e.vy + C.GRAVITY * dt);
                const prevVx = e.vx;
                e.x += e.vx * dt;
                resolveTileCollisionX(e);
                if (e.vx === 0) e.vx = -prevVx; // Bounce off walls

                const prevBot = e.y + e.h;
                e.y += e.vy * dt;
                resolveTileCollisionY(e, prevBot);

                if (e.y > levelData.rows * T + 40) e.alive = false;
            }

            // Player vs Enemy collision
            if (!player.dead && E.aabb(player, e)) {
                if (player.starTimer > 0) {
                    defeatEnemy(e, 200);
                } else {
                    const stomping = player.vy > 0 && (player.y + player.h - player.vy * dt) <= e.y + e.h * 0.55;
                    if (stomping && e.type !== 'armored') {
                        player.vy = C.BOUNCE_VELOCITY;
                        defeatEnemy(e, 150);
                    } else {
                        hurtPlayer();
                    }
                }
            }
        }
    }

    function updateBoss(dt) {
        if (!boss || !boss.alive) return;
        // Activate boss HUD when player is within arena range
        const inArena = Math.abs(player.x - boss.x) < 700;
        MG.UI.updateBossHud(inArena ? boss : null, levelData.theme.bossName);
        if (!inArena) return;

        if (boss.hitFlash > 0) boss.hitFlash -= dt;
        if (boss.invulnTimer > 0) boss.invulnTimer -= dt;

        boss.facing = player.x < boss.x ? -1 : 1;
        boss.actionTimer -= dt;
        boss.shootTimer -= dt;

        // Jump attack
        if (boss.actionTimer <= 0 && boss.onGround) {
            boss.vy = -520;
            boss.vx = boss.facing * (140 + boss.world * 16);
            boss.actionTimer = Math.max(1.1, 2.2 - boss.world * 0.12);
        }

        // Projectile attack
        if (boss.shootTimer <= 0) {
            boss.shootTimer = Math.max(1.0, 2.4 - boss.world * 0.15);
            projectiles.push(new E.Projectile(boss.x + boss.w / 2, boss.y + 18, boss.facing * 260, -30, false));
            if (boss.world >= 5) {
                projectiles.push(new E.Projectile(boss.x + boss.w / 2, boss.y + 18, boss.facing * 230, -160, false));
            }
        }

        boss.vy = Math.min(C.MAX_FALL_SPEED, boss.vy + C.GRAVITY * dt);
        boss.x += boss.vx * dt;
        if (boss.x < boss.arenaMinX) { boss.x = boss.arenaMinX; boss.vx = Math.abs(boss.vx); }
        if (boss.x > boss.arenaMaxX) { boss.x = boss.arenaMaxX; boss.vx = -Math.abs(boss.vx); }

        const prevBot = boss.y + boss.h;
        boss.y += boss.vy * dt;
        boss.onGround = false;
        resolveTileCollisionY(boss, prevBot);

        // Player vs Boss
        if (!player.dead && E.aabb(player, boss)) {
            if (player.starTimer > 0) {
                damageBoss(2);
            } else if (player.vy > 0 && (player.y + player.h - player.vy * dt) <= boss.y + boss.h * 0.45) {
                player.vy = C.BOUNCE_VELOCITY;
                damageBoss(1);
            } else {
                hurtPlayer();
            }
        }
    }

    function damageBoss(amount) {
        if (!boss || !boss.alive || boss.invulnTimer > 0) return;
        boss.hp -= amount;
        boss.hitFlash = 0.35;
        boss.invulnTimer = 0.4;
        MG.Audio.sfx.bossHit();
        spawnSparkles(boss.x + boss.w / 2, boss.y + boss.h / 2, '#f97316', 10);

        if (boss.hp <= 0) {
            boss.alive = false;
            bossDefeated = true;
            addScore(1000 * boss.world);
            MG.Audio.sfx.brickBreak();
            spawnSparkles(boss.x + boss.w / 2, boss.y + boss.h / 2, '#fbbf24', 28);
            MG.UI.updateBossHud(null, '');
            MG.Storage.unlockAchievement('boss_slayer');

            // Spawn Goal Pole in arena
            const goalCol = levelData.cols - 4;
            for (let r = 5; r < 13; r++) {
                setTile(r, goalCol, TILE.GOAL_POLE);
            }
            floatingTexts.push(new E.FloatingText(boss.x, boss.y - 20, 'تم هزيمة الزعيم! اتجه للعلم!', '#22c55e'));
        }
    }

    function updateCollectibles(dt) {
        for (const c of collectibles) {
            if (c.collected) continue;

            if (c.dynamic) {
                c.vy = Math.min(C.MAX_FALL_SPEED, c.vy + C.GRAVITY * dt);
                const prevVx = c.vx;
                c.x += c.vx * dt;
                resolveTileCollisionX(c);
                if (c.vx === 0) c.vx = -prevVx;

                const prevBot = c.y + c.h;
                c.y += c.vy * dt;
                c.onGround = false;
                resolveTileCollisionY(c, prevBot);
                if (c.type === 'star' && c.onGround) {
                    c.vy = -340;
                }
            }

            if (E.aabb(player, c)) {
                c.collected = true;
                if (c.type === 'coin') {
                    collectCoin(c.x, c.y);
                } else if (c.type === 'hidden_star') {
                    if (c.starIndex >= 0 && c.starIndex < 3) levelStars[c.starIndex] = true;
                    addScore(500);
                    MG.Audio.sfx.star();
                    spawnSparkles(c.x + 12, c.y + 12, '#fde047', 16);
                    floatingTexts.push(new E.FloatingText(c.x, c.y - 10, 'نجمة سرية! +500', '#fde047'));
                } else if (c.type === 'mushroom') {
                    if (player.state === 'small') player.setPowerState('big');
                    addScore(300);
                    MG.Audio.sfx.powerup();
                    spawnSparkles(player.x + player.w / 2, player.y + player.h / 2, '#ef4444', 12);
                } else if (c.type === 'fire_flower') {
                    player.setPowerState('fire');
                    addScore(400);
                    MG.Audio.sfx.powerup();
                    spawnSparkles(player.x + player.w / 2, player.y + player.h / 2, '#f97316', 14);
                } else if (c.type === 'star') {
                    player.starTimer = 9.0;
                    addScore(400);
                    MG.Audio.sfx.star();
                } else if (c.type === 'oneup') {
                    lives++;
                    MG.Audio.sfx.oneUp();
                    floatingTexts.push(new E.FloatingText(c.x, c.y - 10, '1UP!', '#22c55e'));
                }
            }
        }
    }

    function updateProjectiles(dt) {
        for (let i = projectiles.length - 1; i >= 0; i--) {
            const p = projectiles[i];
            if (!p.alive) {
                projectiles.splice(i, 1);
                continue;
            }
            p.vy = Math.min(C.MAX_FALL_SPEED, p.vy + (p.fromPlayer ? C.GRAVITY * 0.65 : C.GRAVITY * 0.2) * dt);
            p.x += p.vx * dt;
            p.y += p.vy * dt;

            // Tile hit
            const c = Math.floor((p.x + p.w / 2) / T);
            const r = Math.floor((p.y + p.h / 2) / T);
            const tid = getTile(r, c);
            if (E.isSolidTile(tid) && tid !== TILE.BRIDGE) {
                if (p.fromPlayer && p.bounces < 3 && p.vy > 0) {
                    p.y = r * T - p.h;
                    p.vy = -260;
                    p.bounces++;
                } else {
                    p.alive = false;
                }
            }

            if (p.x < camX - 60 || p.x > camX + C.VIEW_WIDTH + 60 || p.y > levelData.rows * T) {
                p.alive = false;
            }

            if (p.fromPlayer) {
                for (const e of enemies) {
                    if (e.alive && E.aabb(p, e)) {
                        p.alive = false;
                        defeatEnemy(e, 200);
                        break;
                    }
                }
                if (p.alive && boss && boss.alive && E.aabb(p, boss)) {
                    p.alive = false;
                    damageBoss(1);
                }
            } else {
                if (!player.dead && player.starTimer <= 0 && E.aabb(p, player)) {
                    p.alive = false;
                    hurtPlayer();
                }
            }
        }
    }

    function updateParticles(dt) {
        for (let i = particles.length - 1; i >= 0; i--) {
            const pt = particles[i];
            pt.life -= dt;
            if (pt.life <= 0) {
                particles.splice(i, 1);
                continue;
            }
            if (pt.gravity) pt.vy += C.GRAVITY * 0.7 * dt;
            pt.x += pt.vx * dt;
            pt.y += pt.vy * dt;
        }

        for (let i = floatingTexts.length - 1; i >= 0; i--) {
            const ft = floatingTexts[i];
            ft.life -= dt;
            ft.y -= 32 * dt;
            if (ft.life <= 0) floatingTexts.splice(i, 1);
        }
    }

    function defeatEnemy(e, pts) {
        e.alive = false;
        enemiesDefeatedThisRun++;
        addScore(pts);
        MG.Audio.sfx.stomp();
        spawnSparkles(e.x + e.w / 2, e.y + e.h / 2, '#fb923c', 10);
        floatingTexts.push(new E.FloatingText(e.x, e.y - 6, `+${pts}`));
    }

    function collectCoin(x, y) {
        coins++;
        addScore(100);
        MG.Audio.sfx.coin();
        spawnSparkles(x + 10, y + 10, '#fbbf24', 7);
        if (coins >= C.COINS_FOR_1UP) {
            coins -= C.COINS_FOR_1UP;
            lives++;
            MG.Audio.sfx.oneUp();
            floatingTexts.push(new E.FloatingText(x, y - 14, '1UP!', '#22c55e'));
        }
    }

    function addScore(pts) {
        score += pts;
    }

    function hurtPlayer() {
        if (player.invincibleTimer > 0 || player.dead) return;
        if (player.state !== 'small') {
            player.setPowerState('small');
            player.invincibleTimer = 1.6;
            MG.Audio.sfx.hurt();
            spawnSparkles(player.x + player.w / 2, player.y + player.h / 2, '#fff', 10);
        } else {
            killPlayer();
        }
    }

    function killPlayer() {
        if (player.dead) return;
        player.dead = true;
        player.vy = -480;
        player.deathTimer = 1.25;
        lives--;
        MG.Audio.stopMusic();
        MG.Audio.sfx.die();
    }

    function completeLevel() {
        if (state !== 'playing') return;
        const timeBonus = Math.ceil(timeLeft) * 10;
        score += timeBonus;

        MG.Audio.stopMusic();
        MG.Storage.recordLevelStars(levelData.world, levelData.level, levelStars);
        MG.Storage.addStats({ score, coins, enemies: enemiesDefeatedThisRun });

        if (levelData.world === 1 && levelData.level === 1) {
            MG.Storage.unlockAchievement('first_step');
        }

        const isFinalWin = (levelData.world === C.TOTAL_WORLDS && levelData.level === C.LEVELS_PER_WORLD);
        if (isFinalWin) {
            state = 'victory';
            MG.Storage.unlockAchievement('champion');
            MG.Audio.sfx.victory();
            MG.UI.showVictory(score, MG.Storage.get().totalCoins, MG.Storage.getTotalStars());
        } else {
            state = 'level_clear';
            MG.Storage.unlockNext(levelData.world, levelData.level);
            MG.Audio.sfx.levelClear();
            MG.UI.showLevelClear({
                name: levelData.name,
                score,
                timeBonus,
                coins,
                stars: levelStars.filter(Boolean).length,
                world: levelData.world,
                level: levelData.level
            });
        }
    }

    function spawnSparkles(x, y, color, count) {
        for (let i = 0; i < count; i++) {
            const ang = Math.random() * Math.PI * 2;
            const spd = 60 + Math.random() * 180;
            particles.push(new E.Particle(x, y, Math.cos(ang) * spd, Math.sin(ang) * spd, color, 0.45, 5, false));
        }
    }

    function spawnBrickDebris(x, y) {
        for (let i = 0; i < 6; i++) {
            particles.push(new E.Particle(
                x, y,
                (Math.random() - 0.5) * 240,
                -220 - Math.random() * 140,
                levelData.theme.brickColor,
                0.7, 8, true
            ));
        }
    }

    function render() {
        if (!levelData) {
            MG.Sprites.drawBackground(ctx, C.WORLDS[0], timeSec * 25, timeSec);
            return;
        }

        MG.Sprites.drawBackground(ctx, levelData.theme, camX, timeSec);

        ctx.save();
        ctx.translate(-Math.floor(camX), 0);

        const startC = Math.max(0, Math.floor(camX / T) - 1);
        const endC = Math.min(levelData.cols - 1, Math.ceil((camX + C.VIEW_WIDTH) / T) + 1);

        // Draw Tiles
        for (let r = 0; r < levelData.rows; r++) {
            for (let c = startC; c <= endC; c++) {
                const tid = levelData.grid[r][c];
                if (tid === TILE.EMPTY) continue;
                let bumpOffset = 0;
                const b = bumpedBlocks.find(blk => blk.r === r && blk.c === c);
                if (b) bumpOffset = -Math.sin((b.timer / 0.14) * Math.PI) * 8;
                MG.Sprites.drawTile(ctx, tid, c * T, r * T, levelData.theme, timeSec, bumpOffset);
            }
        }

        // Moving Platforms
        for (const plat of platforms) {
            ctx.fillStyle = '#d97706';
            ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
            ctx.fillStyle = '#fbbf24';
            ctx.fillRect(plat.x, plat.y, plat.w, 5);
        }

        // Collectibles
        for (const c of collectibles) {
            if (!c.collected) MG.Sprites.drawCollectible(ctx, c, timeSec);
        }

        // Enemies
        for (const e of enemies) {
            if (e.alive) MG.Sprites.drawEnemy(ctx, e, timeSec);
        }

        // Boss
        if (boss && boss.alive) {
            MG.Sprites.drawBoss(ctx, boss, timeSec);
        }

        // Player
        if (player) {
            MG.Sprites.drawPlayer(ctx, player, timeSec);
        }

        // Projectiles
        for (const p of projectiles) {
            ctx.fillStyle = p.fromPlayer ? '#f97316' : '#a855f7';
            ctx.beginPath();
            ctx.arc(p.x + p.w / 2, p.y + p.h / 2, p.w / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fef08a';
            ctx.beginPath();
            ctx.arc(p.x + p.w / 2, p.y + p.h / 2, p.w / 4, 0, Math.PI * 2);
            ctx.fill();
        }

        // Particles
        for (const pt of particles) {
            ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
            ctx.fillStyle = pt.color;
            ctx.fillRect(pt.x, pt.y, pt.size, pt.size);
        }
        ctx.globalAlpha = 1;

        // Floating Texts
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        for (const ft of floatingTexts) {
            ctx.fillStyle = ft.color;
            ctx.fillText(ft.text, ft.x + 12, ft.y);
        }

        ctx.restore();
    }

    function updateHud() {
        MG.UI.updateHud({
            score,
            coins,
            lives,
            stars: levelStars.filter(Boolean).length,
            world: levelData.world,
            level: levelData.level,
            time: Math.ceil(timeLeft)
        });
    }

    function getState() {
        return state;
    }

    // Start background idle animation
    lastTime = performance.now();
    rafId = requestAnimationFrame(loop);

    return {
        startNewGame,
        continueGame,
        loadLevel,
        pause,
        resume,
        stopToMenu,
        restartCurrentLevel,
        setInput,
        getState
    };
})();
