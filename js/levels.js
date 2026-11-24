window.MG = window.MG || {};

MG.Levels = (function () {
    const C = MG.CONSTANTS;
    const TILE = C.TILE;
    const T = C.TILE_SIZE;
    const ROWS = 15; // 15 * 36 = 540

    function createRng(seed) {
        let a = seed >>> 0;
        return function () {
            a |= 0;
            a = (a + 0x6D2B79F5) | 0;
            let t = Math.imul(a ^ (a >>> 15), 1 | a);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    function getLevelName(world, level) {
        const w = C.WORLDS[world - 1];
        if (level === 5) return `${w.name} - مواجهة ${w.bossName}`;
        return `${w.name} - المرحلة ${level}`;
    }

    function generateLevel(world, level) {
        const rng = createRng(world * 1337 + level * 97);
        const isBossLevel = (level === 5);
        const cols = 105 + world * 6 + level * 4;
        const grid = Array.from({ length: ROWS }, () => new Array(cols).fill(TILE.EMPTY));

        const enemies = [];
        const collectibles = [];
        const platforms = [];
        const secretWarps = []; // { fromCol, toCol, toRow }
        let boss = null;

        // Ground type based on world
        const groundTile = world === 5 ? TILE.ICE : TILE.GROUND;
        const hazardPitTile = world >= 7 ? TILE.LAVA : (world === 4 ? TILE.QUICKSAND : TILE.EMPTY);

        function fillGround(cStart, cEnd, topRow = 13) {
            for (let c = cStart; c < cEnd && c < cols; c++) {
                for (let r = topRow; r < ROWS; r++) {
                    grid[r][c] = groundTile;
                }
            }
        }

        function addPipe(c, height) {
            const topRow = 13 - height;
            if (topRow < 5 || c + 1 >= cols) return;
            grid[topRow][c] = TILE.PIPE_TOP_L;
            grid[topRow][c + 1] = TILE.PIPE_TOP_R;
            for (let r = topRow + 1; r < 13; r++) {
                grid[r][c] = TILE.PIPE_BODY_L;
                grid[r][c + 1] = TILE.PIPE_BODY_R;
            }
        }

        function addSecretPipe(c, height, targetCol, targetRow) {
            const topRow = 13 - height;
            if (topRow < 5 || c + 1 >= cols) return;
            grid[topRow][c] = TILE.SECRET_PIPE_L;
            grid[topRow][c + 1] = TILE.SECRET_PIPE_R;
            for (let r = topRow + 1; r < 13; r++) {
                grid[r][c] = TILE.PIPE_BODY_L;
                grid[r][c + 1] = TILE.PIPE_BODY_R;
            }
            secretWarps.push({ col1: c, col2: c + 1, topRow, toCol: targetCol, toRow: targetRow });
        }

        function pickEnemyType() {
            const r = rng();
            if (world === 1) return r < 0.78 ? 'walker' : 'flyer';
            if (world === 2) return r < 0.5 ? 'walker' : r < 0.8 ? 'flyer' : 'runner';
            if (world === 3) return r < 0.35 ? 'walker' : r < 0.65 ? 'flyer' : 'shooter';
            if (world === 4 || world === 5) {
                if (r < 0.3) return 'walker';
                if (r < 0.55) return 'runner';
                if (r < 0.8) return 'flyer';
                return 'shooter';
            }
            // Worlds 6, 7, 8 include armored enemies
            if (r < 0.22) return 'walker';
            if (r < 0.42) return 'runner';
            if (r < 0.62) return 'flyer';
            if (r < 0.8) return 'shooter';
            return 'armored';
        }

        // 1. Safe Starting Area
        fillGround(0, 12, 13);
        // Helpful starter blocks in 1-1
        if (world === 1 && level === 1) {
            grid[9][6] = TILE.QUESTION_POWER;
            grid[9][8] = TILE.BRICK;
            grid[9][9] = TILE.QUESTION_COIN;
            grid[9][10] = TILE.BRICK;
            collectibles.push({ type: 'coin', x: 8 * T + 6, y: 8 * T });
            collectibles.push({ type: 'coin', x: 9 * T + 6, y: 8 * T });
        }

        // 2. Build Mid-Level Chunks
        const checkpointCol = Math.floor(cols * 0.48);
        const endZoneStart = isBossLevel ? cols - 22 : cols - 12;

        let col = 12;
        let starPlaced = 0;
        let secretPlaced = false;

        while (col < endZoneStart - 6) {
            // Checkpoint Zone
            if (col <= checkpointCol && col + 8 >= checkpointCol) {
                fillGround(col, col + 8, 13);
                grid[12][checkpointCol] = TILE.CHECKPOINT;
                grid[9][checkpointCol - 2] = TILE.QUESTION_POWER;
                col += 8;
                continue;
            }

            const chunkType = Math.floor(rng() * 6);
            const segLen = 8 + Math.floor(rng() * 5);

            if (chunkType === 0) {
                // Classic blocks + enemies
                fillGround(col, col + segLen, 13);
                const blockRow = 9;
                for (let b = col + 2; b < col + segLen - 2; b++) {
                    const br = rng();
                    if (br < 0.25) grid[blockRow][b] = TILE.QUESTION_COIN;
                    else if (br < 0.35) grid[blockRow][b] = TILE.QUESTION_POWER;
                    else if (br < 0.7) grid[blockRow][b] = TILE.BRICK;
                    if (rng() < 0.45) {
                        collectibles.push({ type: 'coin', x: b * T + 6, y: (blockRow - 1) * T + 4 });
                    }
                }
                if (rng() < 0.75) {
                    enemies.push({ type: pickEnemyType(), x: (col + 4) * T, y: 12 * T });
                }
                col += segLen;
            } else if (chunkType === 1) {
                // Gap / Hazard pit (with optional bridge or moving platform)
                fillGround(col, col + 3, 13);
                const gapW = Math.min(4, 2 + Math.floor(world / 3));
                if (hazardPitTile !== TILE.EMPTY) {
                    for (let g = col + 3; g < col + 3 + gapW; g++) {
                        grid[14][g] = hazardPitTile;
                    }
                }
                if (gapW >= 3 && rng() < 0.65) {
                    platforms.push({
                        x: (col + 3) * T,
                        y: 11 * T,
                        w: T * 2,
                        h: 16,
                        dx: (gapW - 1) * T,
                        dy: 0,
                        speed: 1.4 + world * 0.1
                    });
                } else {
                    // Coin arc over gap
                    for (let g = 0; g < gapW; g++) {
                        collectibles.push({ type: 'coin', x: (col + 3 + g) * T + 6, y: 10 * T });
                    }
                }
                fillGround(col + 3 + gapW, col + 6 + gapW, 13);
                col += 6 + gapW;
            } else if (chunkType === 2) {
                // Pipe & Secret Pipe
                fillGround(col, col + 10, 13);
                const pHeight = 2 + Math.floor(rng() * 2);
                if (!secretPlaced && col > 20 && col < endZoneStart - 25) {
                    addSecretPipe(col + 2, pHeight, col + 6, 4);
                    // Elevated bonus platform above
                    for (let sc = col + 5; sc < col + 10; sc++) {
                        grid[6][sc] = TILE.BRICK;
                        collectibles.push({ type: 'coin', x: sc * T + 6, y: 5 * T });
                    }
                    if (starPlaced < 3) {
                        collectibles.push({ type: 'hidden_star', x: (col + 7) * T + 6, y: 4 * T, starIndex: starPlaced });
                        starPlaced++;
                    }
                    secretPlaced = true;
                } else {
                    addPipe(col + 2, pHeight);
                    if (rng() < 0.6) {
                        enemies.push({ type: pickEnemyType(), x: (col + 6) * T, y: 12 * T });
                    }
                }
                col += 10;
            } else if (chunkType === 3) {
                // Elevated platform + Spikes/Traps (stronger in caves/castles)
                fillGround(col, col + 10, 13);
                if (world >= 2 && rng() < 0.65) {
                    grid[12][col + 4] = TILE.SPIKE;
                    grid[12][col + 5] = TILE.SPIKE;
                }
                // Safe bridge/blocks above spikes
                for (let b = col + 2; b <= col + 7; b++) {
                    grid[9][b] = b === col + 4 ? TILE.QUESTION_STAR : TILE.BRIDGE;
                    collectibles.push({ type: 'coin', x: b * T + 6, y: 8 * T });
                }
                if (starPlaced < 3 && rng() < 0.5) {
                    collectibles.push({ type: 'hidden_star', x: (col + 4) * T + 6, y: 6 * T, starIndex: starPlaced });
                    starPlaced++;
                }
                col += 10;
            } else if (chunkType === 4) {
                // Cave / Narrow ceiling or vertical moving platform
                fillGround(col, col + 10, 13);
                if (world === 3 || world === 6 || world === 8) {
                    // Low ceiling for narrow passage
                    for (let c = col + 1; c < col + 8; c++) {
                        grid[5][c] = TILE.BRICK;
                        grid[6][c] = TILE.BRICK;
                    }
                }
                platforms.push({
                    x: (col + 3) * T,
                    y: 11 * T,
                    w: T * 2.5,
                    h: 16,
                    dx: 0,
                    dy: -3 * T,
                    speed: 1.3 + world * 0.08
                });
                grid[6][col + 7] = TILE.QUESTION_1UP;
                enemies.push({ type: 'flyer', x: (col + 6) * T, y: 8 * T });
                col += 10;
            } else {
                // Staircase & Runner/Shooter challenge
                fillGround(col, col + 10, 13);
                for (let s = 0; s < 3; s++) {
                    for (let r = 12 - s; r < 13; r++) {
                        grid[r][col + 2 + s] = TILE.BRICK;
                    }
                }
                enemies.push({ type: world >= 3 ? 'shooter' : 'walker', x: (col + 7) * T, y: 12 * T });
                if (world >= 2) {
                    enemies.push({ type: 'runner', x: (col + 8) * T, y: 12 * T });
                }
                col += 10;
            }
        }

        // Ensure all 3 hidden stars exist in the level
        while (starPlaced < 3) {
            const sCol = Math.floor(20 + (starPlaced + 1) * ((endZoneStart - 30) / 4));
            collectibles.push({
                type: 'hidden_star',
                x: sCol * T + 6,
                y: 7 * T,
                starIndex: starPlaced
            });
            starPlaced++;
        }

        // 3. End Zone (Goal Pole OR Boss Arena)
        fillGround(endZoneStart, cols, 13);
        if (isBossLevel) {
            // Flat arena with a couple of tactical platforms
            for (let b = endZoneStart + 4; b <= endZoneStart + 7; b++) {
                grid[9][b] = TILE.BRIDGE;
            }
            for (let b = endZoneStart + 12; b <= endZoneStart + 15; b++) {
                grid[9][b] = TILE.BRIDGE;
            }
            boss = {
                world,
                x: (cols - 8) * T,
                y: 11 * T
            };
        } else {
            // Goal Pole
            const goalCol = cols - 6;
            for (let r = 5; r < 13; r++) {
                grid[r][goalCol] = TILE.GOAL_POLE;
            }
        }

        return {
            world,
            level,
            name: getLevelName(world, level),
            theme: C.WORLDS[world - 1],
            cols,
            rows: ROWS,
            grid,
            enemies,
            collectibles,
            platforms,
            secretWarps,
            boss,
            isBossLevel,
            checkpointCol,
            timeLimit: Math.max(180, C.DEFAULT_TIME - (world - 1) * 10)
        };
    }

    return {
        generateLevel,
        getLevelName
    };
})();
