window.MG = window.MG || {};

MG.UI = (function () {
    const C = MG.CONSTANTS;

    const screens = [
        'screen-main',
        'screen-levels',
        'screen-settings',
        'screen-howto',
        'screen-achievements',
        'screen-pause',
        'screen-level-clear',
        'screen-gameover',
        'screen-victory',
        'screen-confirm'
    ];

    let selectedWorldTab = 1;
    let returnScreenFromSettings = 'screen-main';

    function showScreen(id) {
        screens.forEach(s => {
            const el = document.getElementById(s);
            if (el) el.classList.toggle('hidden', s !== id);
        });
        const playing = (id === null);
        document.getElementById('hud').classList.toggle('hidden', !playing);
        updateTouchControlsVisibility(playing);
    }

    function updateTouchControlsVisibility(isPlaying) {
        const tc = document.getElementById('touch-controls');
        if (!isPlaying) {
            tc.classList.add('hidden');
            return;
        }
        const mode = MG.Storage.get().settings.touchMode;
        const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        const show = mode === 'on' || (mode === 'auto' && isTouchDevice);
        tc.classList.toggle('hidden', !show);
    }

    function refreshMainMenu() {
        const save = MG.Storage.get();
        document.getElementById('menu-highscore').textContent = save.highScore;
        document.getElementById('menu-totalcoins').textContent = save.totalCoins;
        document.getElementById('menu-totalstars').textContent = MG.Storage.getTotalStars();

        const btnContinue = document.getElementById('btn-continue');
        const hasProgress = save.unlockedWorld > 1 || save.unlockedLevel > 1;
        btnContinue.classList.toggle('hidden', !hasProgress);
        document.getElementById('continue-label').textContent = `${save.lastWorld}-${save.lastLevel}`;
    }

    function showMainMenu() {
        document.getElementById('boss-hud').classList.add('hidden');
        refreshMainMenu();
        showScreen('screen-main');
    }

    function onGameStart(levelData) {
        document.getElementById('boss-hud').classList.add('hidden');
        showScreen(null);
        showToast(levelData.name);
    }

    function showPause(levelData) {
        document.getElementById('pause-level-label').textContent = levelData.name;
        showScreen('screen-pause');
    }

    function hidePause() {
        showScreen(null);
    }

    function showLevelClear(info) {
        document.getElementById('boss-hud').classList.add('hidden');
        document.getElementById('clear-level-name').textContent = info.name;
        document.getElementById('clear-score').textContent = info.score;
        document.getElementById('clear-time-bonus').textContent = `+${info.timeBonus}`;
        document.getElementById('clear-coins').textContent = info.coins;
        document.getElementById('clear-stars').textContent = `${info.stars}/3`;
        showScreen('screen-level-clear');
    }

    function showGameOver(score) {
        document.getElementById('boss-hud').classList.add('hidden');
        document.getElementById('gameover-score').textContent = score;
        document.getElementById('gameover-highscore').textContent = MG.Storage.get().highScore;
        showScreen('screen-gameover');
    }

    function showVictory(score, totalCoins, totalStars) {
        document.getElementById('boss-hud').classList.add('hidden');
        document.getElementById('victory-score').textContent = score;
        document.getElementById('victory-coins').textContent = totalCoins;
        document.getElementById('victory-stars').textContent = `${totalStars}/120`;
        showScreen('screen-victory');
    }

    function updateHud({ score, coins, lives, stars, world, level, time }) {
        document.getElementById('hud-score').textContent = String(score).padStart(6, '0');
        document.getElementById('hud-coins').textContent = String(coins).padStart(2, '0');
        document.getElementById('hud-lives').textContent = lives;
        document.getElementById('hud-stars').textContent = `${stars}/3`;
        document.getElementById('hud-world').textContent = `${world}-${level}`;
        document.getElementById('hud-time').textContent = time;
    }

    function updateBossHud(boss, name) {
        const el = document.getElementById('boss-hud');
        if (!boss || !boss.alive) {
            el.classList.add('hidden');
            return;
        }
        el.classList.remove('hidden');
        document.getElementById('boss-name').textContent = name;
        const pct = Math.max(0, (boss.hp / boss.maxHp) * 100);
        document.getElementById('boss-hp-fill').style.width = `${pct}%`;
    }

    let toastTimer = null;
    function showToast(msg) {
        const el = document.getElementById('toast-banner');
        el.textContent = msg;
        el.classList.remove('hidden');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => el.classList.add('hidden'), 2400);
    }

    function renderWorldSelect() {
        const tabs = document.getElementById('worlds-tabs');
        const grid = document.getElementById('levels-grid');
        const desc = document.getElementById('world-description');
        const save = MG.Storage.get();

        tabs.innerHTML = '';
        for (let w = 1; w <= C.TOTAL_WORLDS; w++) {
            const worldInfo = C.WORLDS[w - 1];
            const unlocked = w <= save.unlockedWorld;
            const btn = document.createElement('button');
            btn.className = `world-tab ${w === selectedWorldTab ? 'active' : ''} ${!unlocked ? 'locked' : ''}`;
            btn.textContent = `${w}. ${worldInfo.name}`;
            btn.onclick = () => {
                selectedWorldTab = w;
                renderWorldSelect();
            };
            tabs.appendChild(btn);
        }

        const currentW = C.WORLDS[selectedWorldTab - 1];
        desc.textContent = `${currentW.name}: ${currentW.desc}`;

        grid.innerHTML = '';
        for (let l = 1; l <= C.LEVELS_PER_WORLD; l++) {
            const unlocked = MG.Storage.isLevelUnlocked(selectedWorldTab, l);
            const starsCount = MG.Storage.getLevelStarsCount(selectedWorldTab, l);
            const card = document.createElement('div');
            card.className = `level-card ${!unlocked ? 'locked' : ''} ${l === 5 ? 'boss-level' : ''}`;
            card.innerHTML = `
                <div class="level-num">${selectedWorldTab}-${l}</div>
                <div>${l === 5 ? '👹 الزعيم' : '🏁 مرحلة'}</div>
                <div class="level-stars">${unlocked ? '⭐'.repeat(starsCount) + '☆'.repeat(3 - starsCount) : '🔒 مقفل'}</div>
            `;
            if (unlocked) {
                card.onclick = () => {
                    MG.Engine.loadLevel(selectedWorldTab, l, true);
                };
            }
            grid.appendChild(card);
        }
    }

    function renderAchievements() {
        const list = document.getElementById('achievements-list');
        const save = MG.Storage.get();
        list.innerHTML = '';
        for (const a of C.ACHIEVEMENTS) {
            const unlocked = !!save.achievements[a.id];
            const card = document.createElement('div');
            card.className = `ach-card ${unlocked ? 'unlocked' : ''}`;
            card.innerHTML = `
                <div class="ach-icon">${unlocked ? a.icon : '🔒'}</div>
                <div>
                    <div class="ach-title">${a.title}</div>
                    <div class="ach-desc">${a.desc}</div>
                </div>
            `;
            list.appendChild(card);
        }
    }

    function loadSettingsUI() {
        const s = MG.Storage.get().settings;
        document.getElementById('opt-music').checked = s.music;
        document.getElementById('opt-music-vol').value = Math.round(s.musicVolume * 100);
        document.getElementById('opt-sfx').checked = s.sfx;
        document.getElementById('opt-sfx-vol').value = Math.round(s.sfxVolume * 100);
        document.getElementById('opt-touch').value = s.touchMode;
    }

    function bindEvents() {
        // Main Menu Buttons
        document.getElementById('btn-new-game').onclick = () => MG.Engine.startNewGame();
        document.getElementById('btn-continue').onclick = () => MG.Engine.continueGame();
        document.getElementById('btn-level-select').onclick = () => {
            selectedWorldTab = MG.Storage.get().lastWorld || 1;
            renderWorldSelect();
            showScreen('screen-levels');
        };
        document.getElementById('btn-how-to-play').onclick = () => showScreen('screen-howto');
        document.getElementById('btn-achievements').onclick = () => {
            renderAchievements();
            showScreen('screen-achievements');
        };
        document.getElementById('btn-settings').onclick = () => {
            returnScreenFromSettings = 'screen-main';
            loadSettingsUI();
            showScreen('screen-settings');
        };

        // Back buttons
        document.querySelectorAll('[data-back]').forEach(btn => {
            btn.onclick = () => {
                const target = btn.getAttribute('data-back');
                if (target === 'screen-main' && returnScreenFromSettings === 'screen-pause') {
                    showScreen('screen-pause');
                } else {
                    if (target === 'screen-main') refreshMainMenu();
                    showScreen(target);
                }
            };
        });

        // Settings Inputs
        document.getElementById('opt-music').onchange = (e) => {
            MG.Storage.updateSettings({ music: e.target.checked });
        };
        document.getElementById('opt-music-vol').oninput = (e) => {
            MG.Storage.updateSettings({ musicVolume: Number(e.target.value) / 100 });
        };
        document.getElementById('opt-sfx').onchange = (e) => {
            MG.Storage.updateSettings({ sfx: e.target.checked });
        };
        document.getElementById('opt-sfx-vol').oninput = (e) => {
            MG.Storage.updateSettings({ sfxVolume: Number(e.target.value) / 100 });
        };
        document.getElementById('opt-touch').onchange = (e) => {
            MG.Storage.updateSettings({ touchMode: e.target.value });
        };

        // Reset Progress Confirmation
        document.getElementById('btn-reset-progress').onclick = () => showScreen('screen-confirm');
        document.getElementById('btn-confirm-no').onclick = () => showScreen('screen-settings');
        document.getElementById('btn-confirm-yes').onclick = () => {
            MG.Storage.resetAll();
            refreshMainMenu();
            showScreen('screen-settings');
            showToast('تم مسح التقدم بنجاح');
        };

        // HUD & Pause Buttons
        document.getElementById('btn-hud-pause').onclick = () => MG.Engine.pause();
        document.getElementById('btn-hud-restart').onclick = () => MG.Engine.restartCurrentLevel();
        document.getElementById('btn-resume').onclick = () => MG.Engine.resume();
        document.getElementById('btn-pause-restart').onclick = () => MG.Engine.restartCurrentLevel();
        document.getElementById('btn-pause-settings').onclick = () => {
            returnScreenFromSettings = 'screen-pause';
            loadSettingsUI();
            showScreen('screen-settings');
        };
        document.getElementById('btn-pause-menu').onclick = () => MG.Engine.stopToMenu();

        // Level Clear / Game Over / Victory
        document.getElementById('btn-next-level').onclick = () => {
            const save = MG.Storage.get();
            MG.Engine.loadLevel(save.lastWorld, save.lastLevel, true);
        };
        document.getElementById('btn-clear-replay').onclick = () => MG.Engine.restartCurrentLevel();
        document.getElementById('btn-clear-menu').onclick = () => MG.Engine.stopToMenu();
        document.getElementById('btn-retry').onclick = () => MG.Engine.restartCurrentLevel();
        document.getElementById('btn-gameover-menu').onclick = () => MG.Engine.stopToMenu();
        document.getElementById('btn-victory-levels').onclick = () => {
            renderWorldSelect();
            showScreen('screen-levels');
        };
        document.getElementById('btn-victory-menu').onclick = () => MG.Engine.stopToMenu();

        // Keyboard Input
        window.addEventListener('keydown', (e) => {
            if (e.code === 'ArrowLeft' || e.code === 'KeyA') MG.Engine.setInput('left', true);
            if (e.code === 'ArrowRight' || e.code === 'KeyD') MG.Engine.setInput('right', true);
            if (e.code === 'ArrowDown' || e.code === 'KeyS') MG.Engine.setInput('down', true);
            if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
                MG.Engine.setInput('jump', true);
                if (MG.Engine.getState() === 'playing') e.preventDefault();
            }
            if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyZ' || e.code === 'KeyX') {
                MG.Engine.setInput('run', true);
            }
            if (e.code === 'Escape') {
                if (MG.Engine.getState() === 'playing') MG.Engine.pause();
                else if (MG.Engine.getState() === 'paused') MG.Engine.resume();
            }
            if (e.code === 'KeyR' && MG.Engine.getState() === 'playing') {
                MG.Engine.restartCurrentLevel();
            }
        });

        window.addEventListener('keyup', (e) => {
            if (e.code === 'ArrowLeft' || e.code === 'KeyA') MG.Engine.setInput('left', false);
            if (e.code === 'ArrowRight' || e.code === 'KeyD') MG.Engine.setInput('right', false);
            if (e.code === 'ArrowDown' || e.code === 'KeyS') MG.Engine.setInput('down', false);
            if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') MG.Engine.setInput('jump', false);
            if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyZ' || e.code === 'KeyX') {
                MG.Engine.setInput('run', false);
            }
        });

        // Touch Controls (Pointer events work cleanly across touch + mouse)
        bindTouchBtn('touch-left', 'left');
        bindTouchBtn('touch-right', 'right');
        bindTouchBtn('touch-jump', 'jump');
        bindTouchBtn('touch-fire', 'run');
    }

    function bindTouchBtn(id, inputKey) {
        const el = document.getElementById(id);
        const start = (e) => {
            e.preventDefault();
            el.classList.add('active');
            MG.Engine.setInput(inputKey, true);
        };
        const end = (e) => {
            e.preventDefault();
            el.classList.remove('active');
            MG.Engine.setInput(inputKey, false);
        };
        el.addEventListener('pointerdown', start);
        el.addEventListener('pointerup', end);
        el.addEventListener('pointercancel', end);
        el.addEventListener('pointerleave', end);
    }

    function init() {
        bindEvents();
        showMainMenu();
    }

    return {
        init,
        showMainMenu,
        onGameStart,
        showPause,
        hidePause,
        showLevelClear,
        showGameOver,
        showVictory,
        updateHud,
        updateBossHud,
        showToast
    };
})();
