window.MG = window.MG || {};

MG.Audio = (function () {
    let ctx = null;
    let musicTimer = null;
    let currentTheme = 'overworld';
    let stepIndex = 0;

    // Original 8-bit melodies (MIDI note numbers, 0 = rest)
    const MELODIES = {
        overworld: [72, 0, 76, 79, 0, 76, 72, 0, 74, 77, 81, 0, 79, 76, 74, 0],
        forest:    [69, 72, 76, 0, 74, 72, 69, 0, 67, 71, 74, 0, 72, 71, 69, 0],
        cave:      [60, 0, 63, 67, 0, 63, 60, 0, 58, 0, 62, 65, 0, 62, 58, 0],
        desert:    [64, 65, 68, 71, 68, 65, 64, 0, 62, 64, 65, 68, 65, 64, 62, 0],
        ice:       [76, 79, 83, 0, 81, 79, 76, 0, 74, 78, 81, 0, 79, 76, 74, 0],
        castle:    [57, 60, 64, 57, 60, 64, 56, 59, 64, 56, 59, 64, 55, 59, 62, 0],
        lava:      [52, 55, 59, 64, 59, 55, 52, 0, 50, 53, 57, 62, 57, 53, 50, 0],
        final:     [48, 55, 51, 55, 54, 55, 51, 55, 48, 55, 51, 55, 60, 59, 58, 55]
    };

    const BASSLINES = {
        overworld: [48, 55, 48, 55, 53, 60, 55, 43],
        forest:    [45, 52, 45, 52, 43, 50, 45, 52],
        cave:      [36, 43, 36, 43, 34, 41, 34, 41],
        desert:    [40, 47, 40, 47, 38, 45, 40, 47],
        ice:       [52, 59, 52, 59, 50, 57, 52, 59],
        castle:    [45, 45, 44, 44, 43, 43, 41, 40],
        lava:      [40, 40, 43, 43, 38, 38, 41, 40],
        final:     [36, 36, 39, 39, 42, 42, 43, 43]
    };

    function ensureCtx() {
        if (!ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return null;
            ctx = new AudioCtx();
        }
        if (ctx.state === 'suspended') {
            ctx.resume().catch(() => {});
        }
        return ctx;
    }

    function midiToFreq(midi) {
        return 440 * Math.pow(2, (midi - 69) / 12);
    }

    function playTone(freq, duration, type = 'square', volume = 0.2, slideTo = null, delay = 0) {
        const settings = MG.Storage.get().settings;
        if (!settings.sfx) return;
        const c = ensureCtx();
        if (!c) return;

        const now = c.currentTime + delay;
        const osc = c.createOscillator();
        const gain = c.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, now);
        if (slideTo) {
            osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), now + duration);
        }

        const vol = Math.max(0.001, volume * settings.sfxVolume);
        gain.gain.setValueAtTime(vol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        osc.connect(gain);
        gain.connect(c.destination);

        osc.start(now);
        osc.stop(now + duration + 0.02);
    }

    function playMusicNote(freq, duration, type, volume) {
        const settings = MG.Storage.get().settings;
        if (!settings.music) return;
        const c = ensureCtx();
        if (!c) return;

        const now = c.currentTime;
        const osc = c.createOscillator();
        const gain = c.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, now);

        const vol = Math.max(0.001, volume * settings.musicVolume);
        gain.gain.setValueAtTime(vol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        osc.connect(gain);
        gain.connect(c.destination);

        osc.start(now);
        osc.stop(now + duration + 0.01);
    }

    function startMusic(theme = 'overworld') {
        currentTheme = MELODIES[theme] ? theme : 'overworld';
        stopMusic();
        stepIndex = 0;

        const tempoMs = currentTheme === 'final' || currentTheme === 'lava' ? 175 : 210;
        musicTimer = setInterval(() => {
            const settings = MG.Storage.get().settings;
            if (!settings.music) return;
            const melody = MELODIES[currentTheme];
            const bass = BASSLINES[currentTheme];

            const note = melody[stepIndex % melody.length];
            if (note > 0) {
                playMusicNote(midiToFreq(note), tempoMs / 1000 * 0.85, 'square', 0.14);
            }
            if (stepIndex % 2 === 0) {
                const bNote = bass[(stepIndex / 2) % bass.length];
                if (bNote > 0) {
                    playMusicNote(midiToFreq(bNote), tempoMs / 1000 * 1.6, 'triangle', 0.22);
                }
            }
            stepIndex++;
        }, tempoMs);
    }

    function stopMusic() {
        if (musicTimer) {
            clearInterval(musicTimer);
            musicTimer = null;
        }
    }

    const sfx = {
        jump(isBig = false) {
            playTone(isBig ? 240 : 300, 0.16, 'square', 0.2, isBig ? 520 : 620);
        },
        coin() {
            playTone(988, 0.07, 'square', 0.22);
            playTone(1319, 0.22, 'square', 0.22, null, 0.065);
        },
        stomp() {
            playTone(280, 0.11, 'sawtooth', 0.24, 90);
        },
        powerup() {
            const notes = [523, 659, 784, 1046];
            notes.forEach((n, i) => playTone(n, 0.09, 'square', 0.2, null, i * 0.065));
        },
        fireball() {
            playTone(680, 0.09, 'sawtooth', 0.18, 220);
        },
        brickBreak() {
            playTone(180, 0.08, 'sawtooth', 0.24, 65);
            playTone(120, 0.09, 'square', 0.2, 50, 0.04);
        },
        bump() {
            playTone(150, 0.08, 'triangle', 0.25, 90);
        },
        pipe() {
            playTone(420, 0.12, 'square', 0.2, 160);
            playTone(320, 0.14, 'square', 0.2, 110, 0.1);
        },
        hurt() {
            playTone(360, 0.14, 'sawtooth', 0.26, 120);
            playTone(220, 0.18, 'sawtooth', 0.24, 80, 0.1);
        },
        die() {
            const notes = [440, 415, 392, 349, 294];
            notes.forEach((n, i) => playTone(n, 0.14, 'square', 0.22, null, i * 0.11));
        },
        oneUp() {
            const notes = [330, 392, 659, 523, 587, 784];
            notes.forEach((n, i) => playTone(n, 0.09, 'square', 0.2, null, i * 0.07));
        },
        star() {
            playTone(784, 0.1, 'square', 0.22);
            playTone(988, 0.1, 'square', 0.22, null, 0.08);
            playTone(1175, 0.18, 'square', 0.22, null, 0.16);
        },
        bossHit() {
            playTone(210, 0.15, 'sawtooth', 0.28, 70);
        },
        levelClear() {
            const notes = [523, 659, 784, 1046, 784, 1046];
            notes.forEach((n, i) => playTone(n, i === 5 ? 0.35 : 0.11, 'square', 0.22, null, i * 0.1));
        },
        gameOver() {
            const notes = [392, 349, 330, 261];
            notes.forEach((n, i) => playTone(n, 0.24, 'triangle', 0.28, null, i * 0.2));
        },
        victory() {
            const notes = [523, 587, 659, 784, 880, 1046, 1319];
            notes.forEach((n, i) => playTone(n, i === 6 ? 0.5 : 0.13, 'square', 0.24, null, i * 0.11));
        }
    };

    return {
        ensureCtx,
        startMusic,
        stopMusic,
        sfx
    };
})();
