window.MG = window.MG || {};

MG.CONSTANTS = {
    VIEW_WIDTH: 960,
    VIEW_HEIGHT: 540,
    TILE_SIZE: 36,

    // Physics
    GRAVITY: 1650,
    MAX_FALL_SPEED: 780,
    WALK_SPEED: 225,
    RUN_SPEED: 345,
    GROUND_ACCEL: 1950,
    GROUND_DECEL: 1700,
    ICE_ACCEL: 650,
    ICE_DECEL: 260,
    AIR_ACCEL: 1250,
    JUMP_VELOCITY: -610,
    JUMP_CUT_MULTIPLIER: 0.48,
    COYOTE_TIME: 0.1,
    JUMP_BUFFER: 0.12,
    BOUNCE_VELOCITY: -440,

    // Gameplay
    START_LIVES: 3,
    COINS_FOR_1UP: 100,
    DEFAULT_TIME: 300,
    TOTAL_WORLDS: 8,
    LEVELS_PER_WORLD: 5,

    // Tile IDs
    TILE: {
        EMPTY: 0,
        GROUND: 1,
        BRICK: 2,
        QUESTION_COIN: 3,
        QUESTION_POWER: 4,
        QUESTION_STAR: 5,
        QUESTION_1UP: 6,
        USED_BLOCK: 7,
        PIPE_TOP_L: 8,
        PIPE_TOP_R: 9,
        PIPE_BODY_L: 10,
        PIPE_BODY_R: 11,
        SPIKE: 12,
        ICE: 13,
        QUICKSAND: 14,
        LAVA: 15,
        BRIDGE: 16,
        CHECKPOINT: 17,
        GOAL_POLE: 18,
        SECRET_PIPE_L: 19,
        SECRET_PIPE_R: 20,
        HIDDEN_COIN_BLOCK: 21
    },

    // World Themes
    WORLDS: [
        {
            id: 1,
            name: 'السهول الخضراء',
            desc: 'سهول مشمسة مثالية لتعلم أساسيات القفز وجمع العملات.',
            skyTop: '#38bdf8',
            skyBottom: '#bae6fd',
            groundTop: '#22c55e',
            groundBody: '#92400e',
            brickColor: '#b45309',
            accentColor: '#16a34a',
            musicTheme: 'overworld',
            friction: 1.0,
            bossName: 'ملك الفطر العملاق'
        },
        {
            id: 2,
            name: 'الغابات المسحورة',
            desc: 'غابات كثيفة مع منصات متحركة وأعداء أكثر نشاطاً.',
            skyTop: '#065f46',
            skyBottom: '#6ee7b7',
            groundTop: '#15803d',
            groundBody: '#5c3a21',
            brickColor: '#78350f',
            accentColor: '#10b981',
            musicTheme: 'forest',
            friction: 1.0,
            bossName: 'حارس الأشجار الطائر'
        },
        {
            id: 3,
            name: 'الكهوف المظلمة',
            desc: 'كهوف عميقة مليئة بالفخاخ والممرات الضيقة والوحوش.',
            skyTop: '#0f172a',
            skyBottom: '#1e293b',
            groundTop: '#475569',
            groundBody: '#1e293b',
            brickColor: '#334155',
            accentColor: '#38bdf8',
            musicTheme: 'cave',
            friction: 1.0,
            bossName: 'خفاش الكريستال'
        },
        {
            id: 4,
            name: 'الصحراء الذهبية',
            desc: 'كثبان رملية ورمال متحركة تبطئ الحركة وتسحبك للأسفل.',
            skyTop: '#f97316',
            skyBottom: '#fde68a',
            groundTop: '#eab308',
            groundBody: '#a16207',
            brickColor: '#ca8a04',
            accentColor: '#f59e0b',
            musicTheme: 'desert',
            friction: 0.92,
            bossName: 'عقرب الرمال المدرع'
        },
        {
            id: 5,
            name: 'عالم الجليد',
            desc: 'أرضيات جليدية زلقة تتطلب تحكماً دقيقاً في القفز والوقوف.',
            skyTop: '#0284c7',
            skyBottom: '#e0f2fe',
            groundTop: '#bae6fd',
            groundBody: '#0369a1',
            brickColor: '#38bdf8',
            accentColor: '#7dd3fc',
            musicTheme: 'ice',
            friction: 0.25,
            bossName: 'عملاق الصقيع'
        },
        {
            id: 6,
            name: 'القلاع الحصينة',
            desc: 'حصون حجرية تحرسها الأعداء المدرّعون والفخاخ القاتلة.',
            skyTop: '#18181b',
            skyBottom: '#3f3f46',
            groundTop: '#71717a',
            groundBody: '#27272a',
            brickColor: '#52525b',
            accentColor: '#a855f7',
            musicTheme: 'castle',
            friction: 1.0,
            bossName: 'الفارس الحديدي'
        },
        {
            id: 7,
            name: 'عالم الحمم البركانية',
            desc: 'قفزات صعبة فوق بحيرات الحمم المشتعلة والخطر المستمر.',
            skyTop: '#450a0a',
            skyBottom: '#991b1b',
            groundTop: '#7f1d1d',
            groundBody: '#291515',
            brickColor: '#57534e',
            accentColor: '#f97316',
            musicTheme: 'lava',
            friction: 1.0,
            bossName: 'تنين الحمم'
        },
        {
            id: 8,
            name: 'القلعة النهائية',
            desc: 'التحدي الأصعب! اختبر كل مهاراتك لمواجهة الزعيم الأخير.',
            skyTop: '#09090b',
            skyBottom: '#3b0764',
            groundTop: '#6b21a8',
            groundBody: '#1e1b4b',
            brickColor: '#4c1d95',
            accentColor: '#ef4444',
            musicTheme: 'final',
            friction: 1.0,
            bossName: 'الإمبراطور المظلم (الزعيم الأخير)'
        }
    ],

    ACHIEVEMENTS: [
        { id: 'first_step', icon: '🏃', title: 'البداية الموفقة', desc: 'أنهِ المستوى الأول 1-1' },
        { id: 'coin_collector', icon: '🪙', title: 'جامع الكنوز', desc: 'اجمع 100 عملة إجمالاً' },
        { id: 'rich_hero', icon: '💰', title: 'ثروة المملكة', desc: 'اجمع 500 عملة إجمالاً' },
        { id: 'star_hunter', icon: '⭐', title: 'صائد النجوم', desc: 'اجمع 15 نجمة مخفية' },
        { id: 'boss_slayer', icon: '⚔️', title: 'قاهر الزعماء', desc: 'اهزم أول زعيم عالم' },
        { id: 'fire_master', icon: '🔥', title: 'سيد النار', desc: 'اقضِ على 20 عدواً' },
        { id: 'halfway', icon: '🏔️', title: 'منتصف الرحلة', desc: 'افتح العالم الخامس' },
        { id: 'champion', icon: '👑', title: 'بطل الممالك الثمانية', desc: 'أنهِ اللعبة واهزم الزعيم الأخير' }
    ]
};
