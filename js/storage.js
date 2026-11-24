window.MG = window.MG || {};

MG.Storage = (function () {
    const KEY = 'monsif_mario_classic_save_v1';

    function defaultData() {
        return {
            lastWorld: 1,
            lastLevel: 1,
            unlockedWorld: 1,
            unlockedLevel: 1,
            highScore: 0,
            totalCoins: 0,
            enemiesDefeated: 0,
            starsByLevel: {}, // e.g. "1-1": [true, false, true]
            achievements: {}, // e.g. "first_step": true
            settings: {
                music: true,
                musicVolume: 0.45,
                sfx: true,
                sfxVolume: 0.75,
                touchMode: 'auto'
            }
        };
    }

    let state = load();

    function load() {
        try {
            const raw = localStorage.getItem(KEY);
            if (!raw) return defaultData();
            const parsed = JSON.parse(raw);
            const def = defaultData();
            return {
                ...def,
                ...parsed,
                settings: { ...def.settings, ...(parsed.settings || {}) },
                starsByLevel: parsed.starsByLevel || {},
                achievements: parsed.achievements || {}
            };
        } catch (e) {
            return defaultData();
        }
    }

    function save() {
        try {
            localStorage.setItem(KEY, JSON.stringify(state));
        } catch (e) {
            // Ignore storage quota errors
        }
    }

    function get() {
        return state;
    }

    function isLevelUnlocked(world, level) {
        if (world < state.unlockedWorld) return true;
        if (world === state.unlockedWorld && level <= state.unlockedLevel) return true;
        return false;
    }

    function unlockNext(world, level) {
        let nextW = world;
        let nextL = level + 1;
        if (nextL > MG.CONSTANTS.LEVELS_PER_WORLD) {
            nextW = world + 1;
            nextL = 1;
        }
        if (nextW <= MG.CONSTANTS.TOTAL_WORLDS) {
            if (nextW > state.unlockedWorld || (nextW === state.unlockedWorld && nextL > state.unlockedLevel)) {
                state.unlockedWorld = nextW;
                state.unlockedLevel = nextL;
            }
            state.lastWorld = nextW;
            state.lastLevel = nextL;
        }
        save();
    }

    function setLastPlayed(world, level) {
        state.lastWorld = world;
        state.lastLevel = level;
        save();
    }

    function recordLevelStars(world, level, collectedArr) {
        const key = `${world}-${level}`;
        const prev = state.starsByLevel[key] || [false, false, false];
        state.starsByLevel[key] = [
            prev[0] || !!collectedArr[0],
            prev[1] || !!collectedArr[1],
            prev[2] || !!collectedArr[2]
        ];
        save();
    }

    function getLevelStarsCount(world, level) {
        const arr = state.starsByLevel[`${world}-${level}`];
        if (!arr) return 0;
        return arr.filter(Boolean).length;
    }

    function getTotalStars() {
        let total = 0;
        for (const k in state.starsByLevel) {
            total += state.starsByLevel[k].filter(Boolean).length;
        }
        return total;
    }

    function addStats({ score = 0, coins = 0, enemies = 0 }) {
        if (score > state.highScore) state.highScore = score;
        state.totalCoins += coins;
        state.enemiesDefeated += enemies;
        checkAchievements();
        save();
    }

    function unlockAchievement(id) {
        if (!state.achievements[id]) {
            state.achievements[id] = true;
            save();
            return true;
        }
        return false;
    }

    function checkAchievements() {
        const newly = [];
        if (state.totalCoins >= 100 && unlockAchievement('coin_collector')) newly.push('coin_collector');
        if (state.totalCoins >= 500 && unlockAchievement('rich_hero')) newly.push('rich_hero');
        if (getTotalStars() >= 15 && unlockAchievement('star_hunter')) newly.push('star_hunter');
        if (state.enemiesDefeated >= 20 && unlockAchievement('fire_master')) newly.push('fire_master');
        if (state.unlockedWorld >= 5 && unlockAchievement('halfway')) newly.push('halfway');
        return newly;
    }

    function updateSettings(partial) {
        state.settings = { ...state.settings, ...partial };
        save();
    }

    function resetAll() {
        const currentSettings = { ...state.settings };
        state = defaultData();
        state.settings = currentSettings;
        save();
    }

    return {
        get,
        save,
        isLevelUnlocked,
        unlockNext,
        setLastPlayed,
        recordLevelStars,
        getLevelStarsCount,
        getTotalStars,
        addStats,
        unlockAchievement,
        checkAchievements,
        updateSettings,
        resetAll
    };
})();
