window.MG = window.MG || {};

MG.Sprites = (function () {
    const T = MG.CONSTANTS.TILE_SIZE;
    const TILE = MG.CONSTANTS.TILE;

    function drawBackground(ctx, theme, camX, timeSec) {
        const W = MG.CONSTANTS.VIEW_WIDTH;
        const H = MG.CONSTANTS.VIEW_HEIGHT;

        // Sky gradient
        const grad = ctx.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, theme.skyTop);
        grad.addColorStop(1, theme.skyBottom);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);

        // Sun / Moon / Stars
        if (theme.id === 3 || theme.id === 6 || theme.id === 7 || theme.id === 8) {
            // Twinkling stars or embers
            ctx.fillStyle = theme.id >= 7 ? 'rgba(251, 146, 60, 0.6)' : 'rgba(255, 255, 255, 0.45)';
            for (let i = 0; i < 28; i++) {
                const sx = ((i * 173 - camX * 0.1) % W + W) % W;
                const sy = (i * 67) % (H * 0.65);
                const r = (i % 2) + 1;
                ctx.fillRect(sx, sy, r, r);
            }
        } else {
            // Sun
            ctx.fillStyle = 'rgba(254, 240, 138, 0.85)';
            ctx.beginPath();
            ctx.arc(W - 110, 82, 34, 0, Math.PI * 2);
            ctx.fill();
        }

        // Parallax Clouds
        if (theme.id !== 3 && theme.id !== 8) {
            ctx.fillStyle = theme.id === 7 ? 'rgba(120, 53, 15, 0.4)' : 'rgba(255, 255, 255, 0.72)';
            for (let i = 0; i < 6; i++) {
                const cx = ((i * 260 - camX * 0.22) % (W + 200) + (W + 200)) % (W + 200) - 100;
                const cy = 65 + (i % 3) * 42;
                ctx.beginPath();
                ctx.arc(cx, cy, 22, 0, Math.PI * 2);
                ctx.arc(cx + 22, cy - 8, 26, 0, Math.PI * 2);
                ctx.arc(cx + 46, cy, 20, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Parallax Hills / Mountains / Pyramids / Silhouettes
        ctx.fillStyle = theme.id === 4 ? 'rgba(180, 83, 9, 0.35)' :
                        theme.id === 5 ? 'rgba(186, 230, 253, 0.45)' :
                        theme.id >= 6 ? 'rgba(0, 0, 0, 0.28)' : 'rgba(22, 163, 74, 0.28)';

        for (let i = 0; i < 6; i++) {
            const hx = ((i * 280 - camX * 0.38) % (W + 320) + (W + 320)) % (W + 320) - 160;
            const hHeight = 90 + (i % 3) * 45;
            ctx.beginPath();
            if (theme.id === 4 || theme.id === 5 || theme.id === 7) {
                // Pyramids / Peaks
                ctx.moveTo(hx, H);
                ctx.lineTo(hx + 110, H - hHeight - 40);
                ctx.lineTo(hx + 220, H);
            } else {
                // Rolling hills
                ctx.arc(hx + 110, H, hHeight + 35, Math.PI, 0);
            }
            ctx.fill();
        }
    }

    function drawTile(ctx, id, x, y, theme, timeSec, bumpOffset = 0) {
        const dy = y + bumpOffset;
        switch (id) {
            case TILE.GROUND:
                ctx.fillStyle = theme.groundBody;
                ctx.fillRect(x, dy, T, T);
                ctx.fillStyle = theme.groundTop;
                ctx.fillRect(x, dy, T, 9);
                ctx.fillStyle = 'rgba(0,0,0,0.14)';
                ctx.fillRect(x + 4, dy + 14, 8, 6);
                ctx.fillRect(x + 20, dy + 22, 9, 7);
                break;

            case TILE.ICE:
                ctx.fillStyle = '#0284c7';
                ctx.fillRect(x, dy, T, T);
                ctx.fillStyle = '#e0f2fe';
                ctx.fillRect(x, dy, T, 10);
                ctx.fillStyle = 'rgba(255,255,255,0.5)';
                ctx.fillRect(x + 5, dy + 14, 12, 4);
                ctx.fillRect(x + 18, dy + 24, 10, 4);
                break;

            case TILE.QUICKSAND:
                ctx.fillStyle = '#d97706';
                ctx.fillRect(x, dy, T, T);
                ctx.fillStyle = '#fbbf24';
                const wave = Math.sin(timeSec * 4 + x * 0.1) * 2;
                ctx.fillRect(x, dy + 2 + wave, T, 6);
                ctx.fillStyle = '#92400e';
                ctx.fillRect(x + 6, dy + 18, 6, 4);
                ctx.fillRect(x + 22, dy + 26, 7, 4);
                break;

            case TILE.BRICK:
                ctx.fillStyle = theme.brickColor;
                ctx.fillRect(x, dy, T, T);
                ctx.strokeStyle = 'rgba(0,0,0,0.35)';
                ctx.lineWidth = 2;
                ctx.strokeRect(x + 1, dy + 1, T - 2, T - 2);
                ctx.beginPath();
                ctx.moveTo(x, dy + T / 2);
                ctx.lineTo(x + T, dy + T / 2);
                ctx.moveTo(x + T / 2, dy);
                ctx.lineTo(x + T / 2, dy + T / 2);
                ctx.moveTo(x + T / 4, dy + T / 2);
                ctx.lineTo(x + T / 4, dy + T);
                ctx.stroke();
                break;

            case TILE.QUESTION_COIN:
            case TILE.QUESTION_POWER:
            case TILE.QUESTION_STAR:
            case TILE.QUESTION_1UP: {
                const pulse = Math.sin(timeSec * 6) > 0 ? '#fbbf24' : '#f59e0b';
                ctx.fillStyle = pulse;
                ctx.fillRect(x, dy, T, T);
                ctx.strokeStyle = '#78350f';
                ctx.lineWidth = 2;
                ctx.strokeRect(x + 1, dy + 1, T - 2, T - 2);
                ctx.fillStyle = '#78350f';
                ctx.font = 'bold 20px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('?', x + T / 2, dy + T / 2 + 1);
                break;
            }

            case TILE.USED_BLOCK:
                ctx.fillStyle = '#475569';
                ctx.fillRect(x, dy, T, T);
                ctx.strokeStyle = '#1e293b';
                ctx.lineWidth = 2;
                ctx.strokeRect(x + 1, dy + 1, T - 2, T - 2);
                break;

            case TILE.PIPE_TOP_L:
            case TILE.PIPE_TOP_R:
            case TILE.SECRET_PIPE_L:
            case TILE.SECRET_PIPE_R: {
                const isSecret = id === TILE.SECRET_PIPE_L || id === TILE.SECRET_PIPE_R;
                ctx.fillStyle = isSecret ? '#eab308' : '#16a34a';
                ctx.fillRect(x, dy, T, T);
                ctx.fillStyle = isSecret ? '#fef08a' : '#4ade80';
                ctx.fillRect(x + 4, dy + 2, 8, T - 4);
                ctx.strokeStyle = '#052e16';
                ctx.lineWidth = 2;
                ctx.strokeRect(x, dy, T, T);
                break;
            }

            case TILE.PIPE_BODY_L:
            case TILE.PIPE_BODY_R:
                ctx.fillStyle = '#15803d';
                ctx.fillRect(x + 2, dy, T - 4, T);
                ctx.fillStyle = '#4ade80';
                ctx.fillRect(x + 6, dy, 6, T);
                ctx.strokeStyle = '#052e16';
                ctx.lineWidth = 2;
                ctx.strokeRect(x + 2, dy, T - 4, T);
                break;

            case TILE.SPIKE:
                ctx.fillStyle = '#cbd5e1';
                for (let i = 0; i < 3; i++) {
                    const sx = x + i * (T / 3);
                    ctx.beginPath();
                    ctx.moveTo(sx, dy + T);
                    ctx.lineTo(sx + T / 6, dy + 8);
                    ctx.lineTo(sx + T / 3, dy + T);
                    ctx.closePath();
                    ctx.fill();
                }
                break;

            case TILE.LAVA: {
                ctx.fillStyle = '#dc2626';
                ctx.fillRect(x, dy + 6, T, T - 6);
                ctx.fillStyle = '#fb923c';
                const lv = Math.sin(timeSec * 5 + x * 0.2) * 3;
                ctx.fillRect(x, dy + 4 + lv, T, 6);
                break;
            }

            case TILE.BRIDGE:
                ctx.fillStyle = '#92400e';
                ctx.fillRect(x, dy, T, 12);
                ctx.fillStyle = '#b45309';
                ctx.fillRect(x + 2, dy + 2, T - 4, 4);
                break;

            case TILE.CHECKPOINT:
                ctx.fillStyle = '#cbd5e1';
                ctx.fillRect(x + T / 2 - 2, dy, 4, T);
                ctx.fillStyle = '#3b82f6';
                ctx.beginPath();
                ctx.moveTo(x + T / 2 + 2, dy + 2);
                ctx.lineTo(x + T - 2, dy + 10);
                ctx.lineTo(x + T / 2 + 2, dy + 18);
                ctx.closePath();
                ctx.fill();
                break;

            case TILE.GOAL_POLE:
                ctx.fillStyle = '#e2e8f0';
                ctx.fillRect(x + T / 2 - 3, dy, 6, T);
                ctx.fillStyle = '#22c55e';
                ctx.fillRect(x + T / 2 + 3, dy + 4, 14, 10);
                break;
        }
    }

    function drawPlayer(ctx, p, timeSec) {
        if (p.invincibleTimer > 0 && Math.floor(timeSec * 16) % 2 === 0 && p.starTimer <= 0) {
            return; // Blink when hurt
        }

        ctx.save();
        const cx = p.x + p.w / 2;
        const cy = p.y + p.h / 2;
        ctx.translate(cx, cy);
        ctx.scale(p.facing, 1);

        // Star power rainbow aura
        if (p.starTimer > 0) {
            const hue = (timeSec * 360) % 360;
            ctx.shadowColor = `hsl(${hue}, 100%, 60%)`;
            ctx.shadowBlur = 14;
        }

        const w = p.w;
        const h = p.h;
        const legSwing = p.onGround && Math.abs(p.vx) > 20 ? Math.sin(timeSec * 18) * 5 : 0;

        // Colors based on power state
        const hatColor = p.state === 'fire' ? '#f8fafc' : '#ef4444';
        const shirtColor = p.state === 'fire' ? '#ef4444' : '#ef4444';
        const overallColor = p.state === 'fire' ? '#f97316' : '#2563eb';

        // Boots / Legs
        ctx.fillStyle = '#78350f';
        ctx.fillRect(-w * 0.35 + legSwing, h * 0.28, w * 0.3, h * 0.22);
        ctx.fillRect(w * 0.05 - legSwing, h * 0.28, w * 0.3, h * 0.22);

        // Overalls / Torso
        ctx.fillStyle = overallColor;
        ctx.fillRect(-w * 0.36, -h * 0.06, w * 0.72, h * 0.38);

        // Shirt sleeves
        ctx.fillStyle = shirtColor;
        ctx.fillRect(-w * 0.44, -h * 0.04, w * 0.16, h * 0.24);
        ctx.fillRect(w * 0.28, -h * 0.04, w * 0.16, h * 0.24);

        // Head
        ctx.fillStyle = '#fed7aa';
        ctx.fillRect(-w * 0.32, -h * 0.38, w * 0.64, h * 0.34);

        // Eye
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(w * 0.08, -h * 0.28, 4, 6);

        // Mustache
        ctx.fillStyle = '#451a03';
        ctx.fillRect(w * 0.02, -h * 0.16, w * 0.28, 4);

        // Cap
        ctx.fillStyle = hatColor;
        ctx.fillRect(-w * 0.38, -h * 0.5, w * 0.76, h * 0.16);
        ctx.fillRect(-w * 0.2, -h * 0.52, w * 0.65, h * 0.08);

        // Cap emblem
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(-2, -h * 0.47, 7, 6);

        ctx.restore();
    }

    function drawEnemy(ctx, e, timeSec) {
        ctx.save();
        ctx.translate(e.x + e.w / 2, e.y + e.h / 2);
        ctx.scale(e.vx >= 0 ? 1 : -1, 1);

        const w = e.w;
        const h = e.h;
        const bob = Math.sin(timeSec * 10 + e.x * 0.05) * 2;

        if (e.type === 'walker') {
            ctx.fillStyle = '#92400e';
            ctx.beginPath();
            ctx.arc(0, -2, w * 0.46, Math.PI, 0);
            ctx.lineTo(w * 0.46, h * 0.28);
            ctx.lineTo(-w * 0.46, h * 0.28);
            ctx.closePath();
            ctx.fill();
            // Eyes
            ctx.fillStyle = '#fff';
            ctx.fillRect(-7, -6, 5, 6);
            ctx.fillRect(2, -6, 5, 6);
            ctx.fillStyle = '#000';
            ctx.fillRect(-5, -4, 3, 4);
            ctx.fillRect(4, -4, 3, 4);
            // Feet
            ctx.fillStyle = '#451a03';
            ctx.fillRect(-10, h * 0.28 + bob * 0.5, 8, 6);
            ctx.fillRect(2, h * 0.28 - bob * 0.5, 8, 6);
        } else if (e.type === 'flyer') {
            const wingY = Math.sin(timeSec * 20) * 6;
            // Wings
            ctx.fillStyle = '#e2e8f0';
            ctx.beginPath();
            ctx.ellipse(-10, -4 + wingY, 10, 5, -0.3, 0, Math.PI * 2);
            ctx.ellipse(10, -4 + wingY, 10, 5, 0.3, 0, Math.PI * 2);
            ctx.fill();
            // Body
            ctx.fillStyle = '#7c3aed';
            ctx.beginPath();
            ctx.arc(0, 0, w * 0.38, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fef08a';
            ctx.fillRect(2, -4, 5, 5);
        } else if (e.type === 'shooter') {
            ctx.fillStyle = '#15803d';
            ctx.fillRect(-w * 0.36, -h * 0.2, w * 0.72, h * 0.7);
            ctx.fillStyle = '#dc2626';
            ctx.beginPath();
            ctx.arc(0, -h * 0.22, w * 0.44, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.fillRect(4, -h * 0.3, 6, 6);
        } else if (e.type === 'runner') {
            ctx.fillStyle = '#ea580c';
            ctx.beginPath();
            ctx.roundRect(-w * 0.45, -h * 0.35, w * 0.9, h * 0.7, 8);
            ctx.fill();
            ctx.fillStyle = '#fef08a';
            ctx.fillRect(4, -8, 6, 5);
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(-10, h * 0.25 + bob, 8, 6);
            ctx.fillRect(4, h * 0.25 - bob, 8, 6);
        } else if (e.type === 'armored') {
            // Metallic spiked shell
            ctx.fillStyle = '#334155';
            ctx.beginPath();
            ctx.arc(0, 4, w * 0.48, Math.PI, 0);
            ctx.fill();
            // Top spikes
            ctx.fillStyle = '#e2e8f0';
            for (let i = -1; i <= 1; i++) {
                ctx.beginPath();
                ctx.moveTo(i * 9 - 4, -8);
                ctx.lineTo(i * 9, -18);
                ctx.lineTo(i * 9 + 4, -8);
                ctx.fill();
            }
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(5, 2, 5, 5);
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(-10, h * 0.25, 8, 6);
            ctx.fillRect(4, h * 0.25, 8, 6);
        }
        ctx.restore();
    }

    function drawBoss(ctx, b, timeSec) {
        ctx.save();
        if (b.hitFlash > 0 && Math.floor(timeSec * 20) % 2 === 0) {
            ctx.filter = 'brightness(2)';
        }
        ctx.translate(b.x + b.w / 2, b.y + b.h / 2);
        ctx.scale(b.facing, 1);

        const w = b.w;
        const h = b.h;
        const colors = ['#16a34a', '#059669', '#6366f1', '#d97706', '#0284c7', '#64748b', '#dc2626', '#7e22ce'];
        const bodyColor = colors[(b.world - 1) % colors.length];

        // Body
        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        ctx.roundRect(-w * 0.45, -h * 0.42, w * 0.9, h * 0.84, 14);
        ctx.fill();

        // Crown / Horns
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.moveTo(-18, -h * 0.42);
        ctx.lineTo(-10, -h * 0.62);
        ctx.lineTo(0, -h * 0.45);
        ctx.lineTo(10, -h * 0.62);
        ctx.lineTo(18, -h * 0.42);
        ctx.closePath();
        ctx.fill();

        // Angry Eyes
        ctx.fillStyle = '#fff';
        ctx.fillRect(4, -h * 0.22, 12, 10);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(9, -h * 0.2, 6, 7);

        // Mouth / Fangs
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, h * 0.05, 22, 10);
        ctx.fillStyle = '#fff';
        ctx.fillRect(3, h * 0.05, 4, 5);
        ctx.fillRect(14, h * 0.05, 4, 5);

        ctx.restore();
    }

    function drawCollectible(ctx, c, timeSec) {
        ctx.save();
        const cx = c.x + c.w / 2;
        const cy = c.y + c.h / 2 + Math.sin(timeSec * 5 + c.x * 0.1) * 2;
        ctx.translate(cx, cy);

        if (c.type === 'coin') {
            const scaleX = Math.max(0.25, Math.abs(Math.cos(timeSec * 4 + c.x * 0.05)));
            ctx.scale(scaleX, 1);
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath();
            ctx.arc(0, 0, 11, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#b45309';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.fillStyle = '#fef08a';
            ctx.fillRect(-2, -6, 4, 12);
        } else if (c.type === 'hidden_star' || c.type === 'star') {
            ctx.fillStyle = c.type === 'hidden_star' ? '#fde047' : '#facc15';
            ctx.shadowColor = '#facc15';
            ctx.shadowBlur = 10;
            drawStarShape(ctx, 0, 0, 5, 13, 6);
            ctx.fill();
        } else if (c.type === 'mushroom') {
            ctx.fillStyle = '#fef3c7';
            ctx.fillRect(-6, 0, 12, 11);
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(0, 0, 13, Math.PI, 0);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(-5, -6, 3, 0, Math.PI * 2);
            ctx.arc(5, -5, 3, 0, Math.PI * 2);
            ctx.fill();
        } else if (c.type === 'fire_flower') {
            ctx.fillStyle = '#22c55e';
            ctx.fillRect(-3, 2, 6, 10);
            ctx.fillStyle = '#f97316';
            ctx.beginPath();
            ctx.arc(0, -4, 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fef08a';
            ctx.beginPath();
            ctx.arc(0, -4, 5, 0, Math.PI * 2);
            ctx.fill();
        } else if (c.type === 'oneup') {
            ctx.fillStyle = '#22c55e';
            ctx.beginPath();
            ctx.arc(0, 0, 12, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 11px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('1UP', 0, 1);
        }
        ctx.restore();
    }

    function drawStarShape(ctx, cx, cy, spikes, outerRadius, innerRadius) {
        let rot = (Math.PI / 2) * 3;
        const step = Math.PI / spikes;
        ctx.beginPath();
        ctx.moveTo(cx, cy - outerRadius);
        for (let i = 0; i < spikes; i++) {
            ctx.lineTo(cx + Math.cos(rot) * outerRadius, cy + Math.sin(rot) * outerRadius);
            rot += step;
            ctx.lineTo(cx + Math.cos(rot) * innerRadius, cy + Math.sin(rot) * innerRadius);
            rot += step;
        }
        ctx.closePath();
    }

    return {
        drawBackground,
        drawTile,
        drawPlayer,
        drawEnemy,
        drawBoss,
        drawCollectible
    };
})();
