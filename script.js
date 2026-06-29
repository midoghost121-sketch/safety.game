// ============================================================
// محاكاة السلامة والصحة المهنية - محطة مياه الشرب المصرية
// ============================================================

// ===== ثوابت عامة =====
const TILE = 40;                  // حجم البلاطة
const MAP_COLS = 50;              // عدد الأعمدة
const MAP_ROWS = 38;              // عدد الصفوف
const MAP_W = MAP_COLS * TILE;    // عرض الخريطة
const MAP_H = MAP_ROWS * TILE;   // ارتفاع الخريطة
const PLAYER_SIZE = 28;           // حجم اللاعب
const PLAYER_SPEED = 3;           // سرعة الحركة
const GAME_TIME = 600;            // وقت اللعبة بالثواني (10 دقائق)

// ===== عناصر DOM =====
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const miniCanvas = document.getElementById('minimap');
const miniCtx = miniCanvas.getContext('2d');

// ===== حالة اللعبة =====
let gameState = {
    running: false,
    paused: false,
    score: 0,
    health: 100,
    time: GAME_TIME,
    safetyPercent: 0,
    discoveredHazards: [],
    completedScenarios: [],
    equippedPPE: [],
    currentSection: '',
    totalHazards: 0,
    educationShown: []
};

// ===== اللاعب =====
let player = {
    x: 680,
    y: 510,
    w: PLAYER_SIZE,
    h: PLAYER_SIZE,
    vx: 0,
    vy: 0,
    dir: 'down',      // اتجاه النظر
    frame: 0,
    frameTimer: 0
};

// ===== التحكم =====
let keys = {};
let touchDirs = {};
let interactPressed = false;

// ===== الكاميرا =====
let camera = { x: 0, y: 0, w: 0, h: 0 };

// ===== أقسام المحطة =====
const sections = [
    {
        id: 'intake',
        name: 'مأخذ المياه',
        x: 2, y: 2, w: 14, h: 10,
        color: '#1a5276',
        borderColor: '#2980b9',
        icon: '🚰',
        items: [
            { type: 'pump', x: 5, y: 4, label: 'مضخة سحب' },
            { type: 'pump', x: 9, y: 4, label: 'مضخة سحب' },
            { type: 'filter', x: 7, y: 7, label: 'مصفاة ميكانيكية' },
            { type: 'barrier', x: 3, y: 8, label: 'مانع حشائش' },
            { type: 'barrier', x: 12, y: 8, label: 'مانع حشائش' },
            { type: 'warning', x: 14, y: 3, label: 'لوحة تحذير' }
        ]
    },
    {
        id: 'chlorine',
        name: 'غرفة الكلور',
        x: 18, y: 2, w: 12, h: 10,
        color: '#1a4731',
        borderColor: '#27ae60',
        icon: '☣️',
        items: [
            { type: 'cylinder', x: 20, y: 4, label: 'أسطوانة كلور' },
            { type: 'cylinder', x: 23, y: 4, label: 'أسطوانة كلور' },
            { type: 'cylinder', x: 26, y: 4, label: 'أسطوانة كلور' },
            { type: 'sensor', x: 22, y: 7, label: 'حساس تسرب' },
            { type: 'vent', x: 25, y: 8, label: 'نظام تهوية' },
            { type: 'warning', x: 28, y: 3, label: 'تحذير: مواد كيميائية' }
        ]
    },
    {
        id: 'sedimentation',
        name: 'أحواض الترسيب والترشيح',
        x: 2, y: 14, w: 22, h: 10,
        color: '#1a3c5e',
        borderColor: '#3498db',
        icon: '🏊',
        items: [
            { type: 'basin', x: 4, y: 16, label: 'حوض ترسيب 1' },
            { type: 'basin', x: 10, y: 16, label: 'حوض ترسيب 2' },
            { type: 'basin', x: 16, y: 16, label: 'حوض ترشيح' },
            { type: 'pipe', x: 8, y: 20, label: 'مواسير' },
            { type: 'pipe', x: 14, y: 20, label: 'مواسير' },
            { type: 'valve', x: 20, y: 18, label: 'محبس' }
        ]
    },
    {
        id: 'pumps',
        name: 'غرفة الطلمبات والكهرباء',
        x: 32, y: 2, w: 16, h: 14,
        color: '#4a1a1a',
        borderColor: '#e74c3c',
        icon: '⚡',
        items: [
            { type: 'bigpump', x: 35, y: 5, label: 'طلمبة رئيسية 1' },
            { type: 'bigpump', x: 40, y: 5, label: 'طلمبة رئيسية 2' },
            { type: 'bigpump', x: 45, y: 5, label: 'طلمبة رئيسية 3' },
            { type: 'panel', x: 34, y: 10, label: 'لوحة كهرباء رئيسية' },
            { type: 'panel', x: 38, y: 10, label: 'لوحة تحكم' },
            { type: 'panel', x: 42, y: 10, label: 'لوحة توزيع' },
            { type: 'fire_ext', x: 46, y: 12, label: 'طفاية حريق' },
            { type: 'warning', x: 33, y: 3, label: 'خطر صعق كهربائي' }
        ]
    },
    {
        id: 'lab',
        name: 'المعمل',
        x: 32, y: 18, w: 14, h: 10,
        color: '#3d1a4a',
        borderColor: '#9b59b6',
        icon: '🔬',
        items: [
            { type: 'bench', x: 35, y: 20, label: 'طاولة تحليل' },
            { type: 'bench', x: 40, y: 20, label: 'طاولة كيمياء' },
            { type: 'chemical', x: 34, y: 24, label: 'خزانة كيماويات' },
            { type: 'chemical', x: 38, y: 24, label: 'محاليل' },
            { type: 'microscope', x: 42, y: 22, label: 'أجهزة معملية' },
            { type: 'eyewash', x: 44, y: 26, label: 'محطة غسيل عيون' }
        ]
    }
];

// ===== المخاطر =====
const hazards = [
    // مأخذ المياه
    { id: 'h1', section: 'intake', x: 6, y: 5, type: 'fall', name: 'خطر السقوط', desc: 'حافة غير محمية بجوار مأخذ المياه. خطر السقوط في المياه.', icon: '⬇️', severity: 4, likelihood: 3, requiredPPE: ['helmet','harness','boots'], discovered: false },
    { id: 'h2', section: 'intake', x: 10, y: 6, type: 'slip', name: 'خطر الانزلاق', desc: 'أرضية مبللة وزلقة حول المضخات.', icon: '💧', severity: 3, likelihood: 4, requiredPPE: ['helmet','boots'], discovered: false },
    { id: 'h3', section: 'intake', x: 8, y: 4, type: 'mechanical', name: 'أجزاء دوارة', desc: 'أجزاء دوارة مكشوفة في المضخة بدون غطاء حماية.', icon: '⚙️', severity: 5, likelihood: 3, requiredPPE: ['helmet','gloves','boots'], discovered: false },
    { id: 'h4', section: 'intake', x: 13, y: 5, type: 'electrical', name: 'خطر كهربائي', desc: 'كابل كهربائي مكشوف بالقرب من المياه.', icon: '⚡', severity: 5, likelihood: 3, requiredPPE: ['helmet','gloves','boots'], discovered: false },

    // غرفة الكلور
    { id: 'h5', section: 'chlorine', x: 21, y: 5, type: 'chemical_leak', name: 'تسرب كلور', desc: 'تسرب غاز الكلور من أسطوانة. رائحة نفاذة وخطر اختناق.', icon: '☁️', severity: 5, likelihood: 4, requiredPPE: ['scba','gloves','goggles','boots'], discovered: false },
    { id: 'h6', section: 'chlorine', x: 24, y: 6, type: 'suffocation', name: 'خطر اختناق', desc: 'نقص الأكسجين في غرفة الكلور المغلقة.', icon: '😵', severity: 5, likelihood: 3, requiredPPE: ['scba','helmet'], discovered: false },
    { id: 'h7', section: 'chlorine', x: 27, y: 5, type: 'chemical_burn', name: 'حروق كيميائية', desc: 'تلامس مباشر مع محلول الكلور المركز.', icon: '🔥', severity: 4, likelihood: 3, requiredPPE: ['gloves','goggles','mask','boots'], discovered: false },

    // أحواض الترسيب
    { id: 'h8', section: 'sedimentation', x: 5, y: 17, type: 'fall', name: 'خطر السقوط في الحوض', desc: 'حافة حوض الترسيب بدون حواجز كافية.', icon: '⬇️', severity: 5, likelihood: 3, requiredPPE: ['helmet','harness','boots'], discovered: false },
    { id: 'h9', section: 'sedimentation', x: 11, y: 18, type: 'drowning', name: 'خطر الغرق', desc: 'مياه عميقة في حوض الترسيب بدون معدات إنقاذ قريبة.', icon: '🌊', severity: 5, likelihood: 2, requiredPPE: ['helmet','harness'], discovered: false },
    { id: 'h10', section: 'sedimentation', x: 17, y: 19, type: 'slip', name: 'انزلاق', desc: 'أرضية رطبة ومغطاة بالطحالب حول أحواض الترشيح.', icon: '💧', severity: 3, likelihood: 4, requiredPPE: ['helmet','boots'], discovered: false },

    // غرفة الطلمبات
    { id: 'h11', section: 'pumps', x: 36, y: 6, type: 'electrocution', name: 'صعق كهربائي', desc: 'لوحة كهرباء مفتوحة بجوار الطلمبات. خطر صعق كهربائي شديد.', icon: '⚡', severity: 5, likelihood: 4, requiredPPE: ['helmet','gloves','boots'], discovered: false },
    { id: 'h12', section: 'pumps', x: 41, y: 7, type: 'noise', name: 'ضوضاء مرتفعة', desc: 'مستوى الضوضاء يتجاوز 85 ديسيبل بجوار الطلمبات.', icon: '🔊', severity: 3, likelihood: 5, requiredPPE: ['helmet','ear_protection'], discovered: false },
    { id: 'h13', section: 'pumps', x: 43, y: 11, type: 'fire', name: 'خطر حريق', desc: 'ارتفاع حرارة المحركات مع وجود مواد قابلة للاشتعال.', icon: '🔥', severity: 5, likelihood: 3, requiredPPE: ['helmet','gloves','boots'], discovered: false },

    // المعمل
    { id: 'h14', section: 'lab', x: 36, y: 21, type: 'chemical', name: 'مواد كيميائية خطرة', desc: 'مواد كيميائية غير مخزنة بشكل صحيح. خطر تفاعل كيميائي.', icon: '⚗️', severity: 4, likelihood: 3, requiredPPE: ['gloves','goggles','mask'], discovered: false },
    { id: 'h15', section: 'lab', x: 41, y: 23, type: 'glass', name: 'زجاج مكسور', desc: 'أدوات زجاجية مكسورة على طاولة التحليل.', icon: '💉', severity: 3, likelihood: 3, requiredPPE: ['gloves','goggles','boots'], discovered: false },
    { id: 'h16', section: 'lab', x: 39, y: 25, type: 'fumes', name: 'أبخرة ضارة', desc: 'أبخرة كيميائية متصاعدة من التجارب بدون استخدام شفاط.', icon: '💨', severity: 4, likelihood: 4, requiredPPE: ['mask','goggles'], discovered: false }
];

// ===== السيناريوهات =====
const scenarios = [
    {
        id: 's1',
        section: 'chlorine',
        triggerX: 22, triggerY: 8,
        title: 'سيناريو طوارئ: عامل في غرفة الكلور',
        desc: 'عامل دخل غرفة الكلور بدون أي معدات حماية شخصية وبدأ يشعر بضيق في التنفس. ماذا تفعل؟',
        choices: [
            { text: 'أدخل فوراً لإنقاذه بدون معدات', correct: false, feedback: 'خطأ! لا تدخل أبداً بدون معدات الحماية المناسبة. ستصبح ضحية ثانية.' },
            { text: 'ألبس SCBA وأدخل لإخراجه وأبلغ الطوارئ', correct: true, feedback: 'صحيح! يجب ارتداء جهاز التنفس المستقل SCBA قبل الدخول وإبلاغ الطوارئ.' },
            { text: 'أتصل بالإدارة وأنتظر التعليمات', correct: false, feedback: 'خطأ جزئياً! الوقت حرج. يجب التصرف فوراً مع ارتداء المعدات المناسبة.' },
            { text: 'أفتح باب الغرفة فقط وأنادي عليه', correct: false, feedback: 'خطأ! فتح الباب قد ينشر الغاز. يجب ارتداء المعدات أولاً.' }
        ],
        completed: false
    },
    {
        id: 's2',
        section: 'pumps',
        triggerX: 37, triggerY: 11,
        title: 'سيناريو طوارئ: تسرب مياه بجوار لوحة كهرباء',
        desc: 'لاحظت تسرب مياه بالقرب من لوحة الكهرباء الرئيسية. الأرضية مبللة والكابلات قريبة من المياه.',
        choices: [
            { text: 'أمسح المياه فوراً بنفسي', correct: false, feedback: 'خطأ! لا تقترب من المياه القريبة من مصدر كهرباء.' },
            { text: 'أفصل التيار الكهربائي أولاً ثم أتعامل مع التسرب', correct: true, feedback: 'صحيح! يجب فصل التيار أولاً (LOTO) ثم التعامل مع التسرب.' },
            { text: 'أضع لافتة تحذير وأترك المكان', correct: false, feedback: 'خطأ جزئياً! اللافتة مهمة لكن يجب فصل الكهرباء فوراً لمنع خطر الصعق.' },
            { text: 'أستمر في العمل بحذر', correct: false, feedback: 'خطأ خطير! هذا الموقف يمثل خطر صعق كهربائي فوري.' }
        ],
        completed: false
    },
    {
        id: 's3',
        section: 'sedimentation',
        triggerX: 8, triggerY: 16,
        title: 'سيناريو طوارئ: عامل على ارتفاع بدون حزام',
        desc: 'لاحظت عاملاً يقوم بصيانة على حافة حوض الترسيب على ارتفاع 3 أمتار بدون حزام أمان.',
        choices: [
            { text: 'أتركه يكمل عمله لأنه خبير', correct: false, feedback: 'خطأ! الخبرة لا تمنع الحوادث. إجراءات السلامة إلزامية للجميع.' },
            { text: 'أطلب منه التوقف فوراً وارتداء حزام الأمان (Harness)', correct: true, feedback: 'صحيح! يجب إيقاف العمل فوراً حتى يتم ارتداء معدات الوقاية من السقوط.' },
            { text: 'أبلغ المدير بعد انتهاء العمل', correct: false, feedback: 'خطأ! يجب التدخل فوراً. لا تنتظر حتى يقع الحادث.' },
            { text: 'أساعده في العمل لينتهي أسرع', correct: false, feedback: 'خطأ! الاقتراب بدون معدات يزيد عدد المعرضين للخطر.' }
        ],
        completed: false
    },
    {
        id: 's4',
        section: 'sedimentation',
        triggerX: 15, triggerY: 17,
        title: 'سيناريو: ارتفاع العكارة',
        desc: 'لاحظت ارتفاع مستوى العكارة في أحواض الترسيب وتغير لون المياه بشكل واضح.',
        choices: [
            { text: 'أتجاهل الأمر لأنه طبيعي', correct: false, feedback: 'خطأ! ارتفاع العكارة يشير لمشكلة في عملية المعالجة.' },
            { text: 'أوقف جميع محطات الضخ فوراً', correct: false, feedback: 'خطأ! إيقاف المحطة بالكامل ليس الحل الأول.' },
            { text: 'أبلغ مهندس التشغيل وآخذ عينات للتحليل فوراً', correct: true, feedback: 'صحيح! يجب إبلاغ المسؤول وأخذ عينات لتحديد السبب وضبط جرعات الكيماويات.' },
            { text: 'أزيد جرعة الكلور فقط', correct: false, feedback: 'خطأ! الكلور لا يعالج العكارة. المشكلة في مرحلة الترسيب أو التخثر.' }
        ],
        completed: false
    },
    {
        id: 's5',
        section: 'pumps',
        triggerX: 44, triggerY: 8,
        title: 'سيناريو طوارئ: حريق صغير بغرفة الطلمبات',
        desc: 'اندلع حريق صغير في لوحة التحكم الكهربائية بغرفة الطلمبات. ماذا تفعل أولاً؟',
        choices: [
            { text: 'أستخدم الماء لإطفاء الحريق', correct: false, feedback: 'خطأ خطير! لا تستخدم الماء أبداً على حرائق الكهرباء.' },
            { text: 'أفصل الكهرباء وأستخدم طفاية CO2 المناسبة', correct: true, feedback: 'صحيح! أولاً فصل الكهرباء ثم استخدام طفاية CO2 أو بودرة جافة للحرائق الكهربائية.' },
            { text: 'أهرب من المكان فوراً', correct: false, feedback: 'خطأ! يجب محاولة السيطرة إذا كان الحريق صغيراً مع تنبيه الآخرين.' },
            { text: 'أغطي الحريق ببطانية', correct: false, feedback: 'خطأ! البطانية لا تناسب الحرائق الكهربائية.' }
        ],
        completed: false
    }
];

// ===== معدات الوقاية الشخصية =====
const ppeItems = [
    { id: 'helmet', name: 'خوذة', icon: '⛑️' },
    { id: 'gloves', name: 'قفازات', icon: '🧤' },
    { id: 'goggles', name: 'نظارة واقية', icon: '🥽' },
    { id: 'harness', name: 'حزام أمان', icon: '🦺' },
    { id: 'mask', name: 'كمامة', icon: '😷' },
    { id: 'scba', name: 'SCBA', icon: '🫁' },
    { id: 'boots', name: 'حذاء أمان', icon: '👢' },
    { id: 'ear_protection', name: 'حماية أذن', icon: '🎧' }
];

// ===== المعلومات التعليمية =====
const educationalContent = [
    {
        id: 'edu_hazard',
        title: 'ما هو الخطر (Hazard)؟',
        content: `<h4>تعريف الخطر - Hazard</h4>
        <p>الخطر هو أي مصدر أو موقف أو فعل يمكن أن يسبب ضرراً للإنسان أو الممتلكات أو البيئة.</p>
        <h4>أنواع المخاطر في محطات المياه:</h4>
        <ul>
        <li>مخاطر فيزيائية (سقوط، انزلاق، ضوضاء)</li>
        <li>مخاطر كيميائية (كلور، مواد كاوية)</li>
        <li>مخاطر كهربائية (صعق، حريق)</li>
        <li>مخاطر بيولوجية (بكتيريا، فيروسات)</li>
        <li>مخاطر ميكانيكية (أجزاء دوارة، ضغط)</li>
        </ul>`,
        triggerSection: 'intake'
    },
    {
        id: 'edu_risk',
        title: 'تقييم المخاطر (Risk Assessment)',
        content: `<h4>ما هو تقييم المخاطر؟</h4>
        <p>عملية منهجية لتحديد المخاطر وتقييم مستوى الخطورة لاتخاذ إجراءات الحماية المناسبة.</p>
        <h4>خطوات تقييم المخاطر:</h4>
        <ul>
        <li>1. تحديد الأخطار (Identify Hazards)</li>
        <li>2. تحديد من يتأثر وكيف</li>
        <li>3. تقييم المخاطر (Severity × Likelihood)</li>
        <li>4. تحديد إجراءات التحكم</li>
        <li>5. المراجعة والتحديث</li>
        </ul>
        <h4>مستوى الخطورة = الشدة × الاحتمالية</h4>`,
        triggerSection: 'sedimentation'
    },
    {
        id: 'edu_ppe',
        title: 'معدات الوقاية الشخصية (PPE)',
        content: `<h4>Personal Protective Equipment</h4>
        <p>معدات الوقاية الشخصية هي خط الدفاع الأخير لحماية العامل من المخاطر.</p>
        <h4>أنواع PPE في محطات المياه:</h4>
        <ul>
        <li>⛑️ خوذة - حماية الرأس من السقوط</li>
        <li>🧤 قفازات - حماية اليدين من الكيماويات</li>
        <li>🥽 نظارة واقية - حماية العيون</li>
        <li>🦺 حزام أمان - منع السقوط من الارتفاعات</li>
        <li>😷 كمامة - حماية من الأبخرة</li>
        <li>🫁 SCBA - جهاز تنفس مستقل للأماكن الخطرة</li>
        <li>👢 حذاء أمان - حماية القدم</li>
        <li>🎧 حماية أذن - حماية من الضوضاء</li>
        </ul>`,
        triggerSection: 'chlorine'
    },
    {
        id: 'edu_loto',
        title: 'نظام القفل والعلامة (LOTO)',
        content: `<h4>Lock Out / Tag Out</h4>
        <p>إجراء أمان يضمن فصل الطاقة عن المعدات أثناء الصيانة لمنع التشغيل المفاجئ.</p>
        <h4>خطوات LOTO:</h4>
        <ul>
        <li>1. إبلاغ جميع العاملين المتأثرين</li>
        <li>2. إيقاف المعدات بالطريقة الطبيعية</li>
        <li>3. فصل مصادر الطاقة</li>
        <li>4. وضع القفل والعلامة الشخصية</li>
        <li>5. التأكد من عدم وجود طاقة مخزنة</li>
        <li>6. التحقق من الفصل الكامل</li>
        </ul>`,
        triggerSection: 'pumps'
    },
    {
        id: 'edu_ptw',
        title: 'تصريح العمل (Permit To Work)',
        content: `<h4>نظام تصريح العمل</h4>
        <p>نظام رسمي مكتوب يتحكم في الأعمال الخطرة ويضمن اتخاذ جميع احتياطات السلامة.</p>
        <h4>أنواع التصاريح:</h4>
        <ul>
        <li>🔥 تصريح عمل ساخن (Hot Work Permit)</li>
        <li>🕳️ تصريح الأماكن المحصورة (Confined Space)</li>
        <li>⬆️ تصريح العمل على ارتفاع (Working at Height)</li>
        <li>⚡ تصريح العمل الكهربائي</li>
        <li>🔧 تصريح الحفر (Excavation Permit)</li>
        </ul>`,
        triggerSection: 'pumps'
    },
    {
        id: 'edu_firstaid',
        title: 'الإسعافات الأولية',
        content: `<h4>الإسعافات الأولية في محطات المياه</h4>
        <h4>عند التعرض للكلور:</h4>
        <ul>
        <li>نقل المصاب للهواء النقي فوراً</li>
        <li>غسل العيون بالماء 15 دقيقة</li>
        <li>إعطاء أكسجين إذا توفر</li>
        <li>الاتصال بالطوارئ</li>
        </ul>
        <h4>عند الصعق الكهربائي:</h4>
        <ul>
        <li>فصل مصدر الكهرباء أولاً</li>
        <li>لا تلمس المصاب مباشرة</li>
        <li>بدء الإنعاش القلبي إذا لزم</li>
        <li>الاتصال بالإسعاف</li>
        </ul>`,
        triggerSection: 'lab'
    }
];

// ===== الجدران والعوائق =====
let walls = [];

function buildWalls() {
    walls = [];
    // حدود الخريطة
    for (let c = 0; c < MAP_COLS; c++) {
        walls.push({ x: c, y: 0 });
        walls.push({ x: c, y: MAP_ROWS - 1 });
    }
    for (let r = 0; r < MAP_ROWS; r++) {
        walls.push({ x: 0, y: r });
        walls.push({ x: MAP_COLS - 1, y: r });
    }

    // جدران الأقسام
    sections.forEach(sec => {
        for (let c = sec.x; c < sec.x + sec.w; c++) {
            walls.push({ x: c, y: sec.y });
            walls.push({ x: c, y: sec.y + sec.h - 1 });
        }
        for (let r = sec.y; r < sec.y + sec.h; r++) {
            walls.push({ x: sec.x, y: r });
            walls.push({ x: sec.x + sec.w - 1, y: r });
        }
    });

    // فتحات الأبواب (إزالة بعض الجدران)
    const doors = [
        // مأخذ المياه - باب سفلي
        { x: 8, y: 11 }, { x: 9, y: 11 },
        // غرفة الكلور - باب سفلي
        { x: 23, y: 11 }, { x: 24, y: 11 },
        // أحواض الترسيب - باب علوي (دخول من الممر)
        { x: 10, y: 14 }, { x: 11, y: 14 },
        // أحواض الترسيب - باب يمين
        { x: 23, y: 18 }, { x: 23, y: 19 },
        // غرفة الطلمبات - باب سفلي
        { x: 38, y: 15 }, { x: 39, y: 15 },
        // غرفة الطلمبات - باب يسار (دخول من الممر)
        { x: 32, y: 8 }, { x: 32, y: 9 },
        // غرفة الطلمبات - باب علوي
        { x: 40, y: 2 }, { x: 41, y: 2 },
        // المعمل - باب علوي
        { x: 38, y: 18 }, { x: 39, y: 18 },
        // المعمل - باب يسار
        { x: 32, y: 22 }, { x: 32, y: 23 },
        // أحواض - باب أيسر
        { x: 2, y: 18 }, { x: 2, y: 19 },
        // مأخذ - باب يمين
        { x: 15, y: 6 }, { x: 15, y: 7 },
        // مأخذ - باب علوي
        { x: 8, y: 2 }, { x: 9, y: 2 },
        // غرفة الكلور - باب علوي
        { x: 23, y: 2 }, { x: 24, y: 2 },
        // غرفة الكلور - باب يمين
        { x: 29, y: 6 }, { x: 29, y: 7 },
    ];

    walls = walls.filter(w => {
        return !doors.some(d => d.x === w.x && d.y === w.y);
    });
}

function isWall(px, py) {
    const gx = Math.floor(px / TILE);
    const gy = Math.floor(py / TILE);
    return walls.some(w => w.x === gx && w.y === gy);
}

function collidesWithWall(x, y, w, h) {
    // تحقق من الأركان الأربعة
    return isWall(x, y) || isWall(x + w - 1, y) || isWall(x, y + h - 1) || isWall(x + w - 1, y + h - 1);
}

// ===== نظام الصوت البسيط =====
const AudioSys = {
    ctx: null,
    init() {
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        } catch(e) {}
    },
    play(freq, duration, type = 'sine', vol = 0.15) {
        if (!this.ctx) return;
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
            gain.gain.setValueAtTime(vol, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            osc.stop(this.ctx.currentTime + duration);
        } catch(e) {}
    },
    alert() { this.play(880, 0.15, 'square', 0.1); setTimeout(() => this.play(660, 0.2, 'square', 0.1), 180); },
    discover() { this.play(523, 0.1, 'sine', 0.12); setTimeout(() => this.play(659, 0.1, 'sine', 0.12), 120); setTimeout(() => this.play(784, 0.15, 'sine', 0.12), 240); },
    success() { this.play(523, 0.12); setTimeout(() => this.play(659, 0.12), 150); setTimeout(() => this.play(784, 0.12), 300); setTimeout(() => this.play(1047, 0.2), 450); },
    error() { this.play(300, 0.2, 'sawtooth', 0.1); setTimeout(() => this.play(200, 0.3, 'sawtooth', 0.1), 220); },
    step() { this.play(100 + Math.random() * 50, 0.05, 'triangle', 0.03); }
};

// ===== رسم الخريطة =====
function drawMap() {
    // أرضية خارجية
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(0, 0, MAP_W, MAP_H);

    // شبكة الأرضية
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    for (let c = 0; c < MAP_COLS; c++) {
        for (let r = 0; r < MAP_ROWS; r++) {
            ctx.strokeRect(c * TILE, r * TILE, TILE, TILE);
        }
    }

    // ممرات (مسارات بين الأقسام)
    ctx.fillStyle = '#34495e';
    // ممر أفقي علوي
    ctx.fillRect(1 * TILE, 12 * TILE, (MAP_COLS - 2) * TILE, 2 * TILE);
    // ممر أفقي سفلي
    ctx.fillRect(1 * TILE, 28 * TILE, (MAP_COLS - 2) * TILE, 2 * TILE);
    // ممر عمودي يسار
    ctx.fillRect(16 * TILE, 1 * TILE, 2 * TILE, (MAP_ROWS - 2) * TILE);
    // ممر عمودي وسط
    ctx.fillRect(30 * TILE, 1 * TILE, 2 * TILE, (MAP_ROWS - 2) * TILE);

    // رسم خطوط الممر
    ctx.strokeStyle = 'rgba(241,196,15,0.25)';
    ctx.lineWidth = 2;
    ctx.setLineDash([15, 10]);
    ctx.beginPath();
    ctx.moveTo(1 * TILE, 13 * TILE);
    ctx.lineTo((MAP_COLS - 1) * TILE, 13 * TILE);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(17 * TILE, 1 * TILE);
    ctx.lineTo(17 * TILE, (MAP_ROWS - 1) * TILE);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(31 * TILE, 1 * TILE);
    ctx.lineTo(31 * TILE, (MAP_ROWS - 1) * TILE);
    ctx.stroke();
    ctx.setLineDash([]);

    // رسم الأقسام
    sections.forEach(sec => {
        // أرضية القسم
        ctx.fillStyle = sec.color;
        ctx.fillRect(sec.x * TILE, sec.y * TILE, sec.w * TILE, sec.h * TILE);

        // حدود القسم
        ctx.strokeStyle = sec.borderColor;
        ctx.lineWidth = 3;
        ctx.strokeRect(sec.x * TILE + 1, sec.y * TILE + 1, sec.w * TILE - 2, sec.h * TILE - 2);

        // اسم القسم
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.font = 'bold 14px Segoe UI, Tahoma, Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        const cx = (sec.x + sec.w / 2) * TILE;
        ctx.fillText(sec.icon + ' ' + sec.name, cx, sec.y * TILE + 8);

        // رسم العناصر داخل القسم
        sec.items.forEach(item => {
            drawStationItem(item);
        });
    });

    // رسم الجدران
    walls.forEach(w => {
        const sec = sections.find(s =>
            w.x >= s.x && w.x < s.x + s.w && w.y >= s.y && w.y < s.y + s.h
        );
        if (sec) {
            ctx.fillStyle = sec.borderColor;
        } else {
            ctx.fillStyle = '#566573';
        }
        ctx.fillRect(w.x * TILE, w.y * TILE, TILE, TILE);

        // نمط الجدار
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(w.x * TILE, w.y * TILE, TILE, 3);
        ctx.fillRect(w.x * TILE, w.y * TILE, 3, TILE);
    });

    // رسم مخاطر غير مكتشفة (وميض خفي)
    hazards.forEach(h => {
        if (!h.discovered) {
            const pulse = Math.sin(Date.now() / 500) * 0.3 + 0.3;
            ctx.fillStyle = `rgba(255,0,0,${pulse * 0.15})`;
            ctx.beginPath();
            ctx.arc(h.x * TILE + TILE / 2, h.y * TILE + TILE / 2, TILE * 0.8, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // مكتشف - علامة خضراء
            ctx.fillStyle = 'rgba(76,175,80,0.3)';
            ctx.fillRect(h.x * TILE + 4, h.y * TILE + 4, TILE - 8, TILE - 8);
            ctx.fillStyle = '#69f0ae';
            ctx.font = '18px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('✓', h.x * TILE + TILE / 2, h.y * TILE + TILE / 2);
        }
    });

    // رسم محفزات السيناريوهات
    scenarios.forEach(sc => {
        if (!sc.completed) {
            const pulse = Math.sin(Date.now() / 400) * 0.4 + 0.4;
            ctx.fillStyle = `rgba(255,152,0,${pulse * 0.2})`;
            ctx.beginPath();
            ctx.arc(sc.triggerX * TILE + TILE / 2, sc.triggerY * TILE + TILE / 2, TILE, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = `rgba(255,152,0,${pulse + 0.3})`;
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('❗', sc.triggerX * TILE + TILE / 2, sc.triggerY * TILE + TILE / 2);
        }
    });

    // مواسير خارجية تزيينية
    drawPipes();
}

function drawStationItem(item) {
    const x = item.x * TILE;
    const y = item.y * TILE;
    const s = TILE;

    ctx.save();
    switch (item.type) {
        case 'pump':
        case 'bigpump':
            // مضخة
            const pumpSize = item.type === 'bigpump' ? s * 1.5 : s;
            ctx.fillStyle = '#7f8c8d';
            ctx.fillRect(x + 4, y + 4, pumpSize - 8, s - 8);
            ctx.fillStyle = '#95a5a6';
            ctx.fillRect(x + 8, y + 8, pumpSize - 16, s - 16);
            // دائرة المحرك
            ctx.fillStyle = '#2c3e50';
            ctx.beginPath();
            ctx.arc(x + pumpSize / 2, y + s / 2, s / 4, 0, Math.PI * 2);
            ctx.fill();
            // دوران
            const angle = Date.now() / 500;
            ctx.strokeStyle = '#e74c3c';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(x + pumpSize / 2, y + s / 2, s / 5, angle, angle + Math.PI);
            ctx.stroke();
            break;
        case 'filter':
            ctx.fillStyle = '#1abc9c';
            ctx.fillRect(x + 2, y + 2, s * 2 - 4, s - 4);
            ctx.strokeStyle = '#16a085';
            ctx.lineWidth = 2;
            // خطوط الفلتر
            for (let i = 0; i < 5; i++) {
                ctx.beginPath();
                ctx.moveTo(x + 6 + i * 14, y + 4);
                ctx.lineTo(x + 6 + i * 14, y + s - 4);
                ctx.stroke();
            }
            break;
        case 'barrier':
            ctx.fillStyle = '#8e6c3e';
            ctx.fillRect(x + 2, y + 2, s - 4, s - 4);
            ctx.strokeStyle = '#6d4c2f';
            ctx.lineWidth = 2;
            ctx.strokeRect(x + 2, y + 2, s - 4, s - 4);
            // شبكة
            ctx.strokeStyle = '#a0805c';
            ctx.lineWidth = 1;
            for (let i = 0; i < 4; i++) {
                ctx.beginPath();
                ctx.moveTo(x + 2, y + 6 + i * 8);
                ctx.lineTo(x + s - 2, y + 6 + i * 8);
                ctx.stroke();
            }
            break;
        case 'cylinder':
            // أسطوانة كلور
            ctx.fillStyle = '#27ae60';
            const cylW = s * 0.5;
            ctx.fillRect(x + (s - cylW) / 2, y + 4, cylW, s - 8);
            ctx.fillStyle = '#2ecc71';
            ctx.beginPath();
            ctx.ellipse(x + s / 2, y + 4, cylW / 2, 4, 0, 0, Math.PI * 2);
            ctx.fill();
            // رمز خطر
            ctx.fillStyle = '#fff';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Cl₂', x + s / 2, y + s / 2 + 3);
            break;
        case 'sensor':
            ctx.fillStyle = '#e67e22';
            ctx.beginPath();
            ctx.arc(x + s / 2, y + s / 2, s / 4, 0, Math.PI * 2);
            ctx.fill();
            // وميض
            if (Math.sin(Date.now() / 300) > 0) {
                ctx.fillStyle = '#f39c12';
                ctx.beginPath();
                ctx.arc(x + s / 2, y + s / 2, s / 6, 0, Math.PI * 2);
                ctx.fill();
            }
            break;
        case 'vent':
            ctx.fillStyle = '#bdc3c7';
            ctx.fillRect(x + 4, y + 4, s - 8, s - 8);
            // شفرات المروحة
            ctx.strokeStyle = '#7f8c8d';
            ctx.lineWidth = 2;
            const va = Date.now() / 200;
            for (let i = 0; i < 4; i++) {
                ctx.beginPath();
                ctx.moveTo(x + s / 2, y + s / 2);
                ctx.lineTo(x + s / 2 + Math.cos(va + i * Math.PI / 2) * 12, y + s / 2 + Math.sin(va + i * Math.PI / 2) * 12);
                ctx.stroke();
            }
            break;
        case 'basin':
            // حوض
            ctx.fillStyle = 'rgba(52,152,219,0.4)';
            ctx.fillRect(x, y, s * 3, s * 2);
            ctx.strokeStyle = '#3498db';
            ctx.lineWidth = 3;
            ctx.strokeRect(x, y, s * 3, s * 2);
            // تموجات المياه
            ctx.strokeStyle = 'rgba(52,152,219,0.5)';
            ctx.lineWidth = 1;
            const waveOff = Math.sin(Date.now() / 800) * 3;
            for (let i = 0; i < 3; i++) {
                ctx.beginPath();
                ctx.moveTo(x + 4, y + 10 + i * 16 + waveOff);
                ctx.quadraticCurveTo(x + s * 1.5, y + 10 + i * 16 - waveOff + 6, x + s * 3 - 4, y + 10 + i * 16 + waveOff);
                ctx.stroke();
            }
            break;
        case 'pipe':
            ctx.fillStyle = '#7f8c8d';
            ctx.fillRect(x, y + s / 2 - 5, s * 2, 10);
            ctx.fillStyle = '#95a5a6';
            ctx.fillRect(x, y + s / 2 - 3, s * 2, 6);
            // وصلة
            ctx.fillStyle = '#5d6d7e';
            ctx.fillRect(x + s - 4, y + s / 2 - 8, 8, 16);
            break;
        case 'valve':
            ctx.fillStyle = '#c0392b';
            ctx.beginPath();
            ctx.arc(x + s / 2, y + s / 2, s / 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#e74c3c';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(x + s / 2 - 8, y + s / 2);
            ctx.lineTo(x + s / 2 + 8, y + s / 2);
            ctx.stroke();
            break;
        case 'panel':
            // لوحة كهرباء
            ctx.fillStyle = '#2c3e50';
            ctx.fillRect(x + 2, y + 2, s * 1.5 - 4, s * 1.5 - 4);
            ctx.strokeStyle = '#e74c3c';
            ctx.lineWidth = 2;
            ctx.strokeRect(x + 2, y + 2, s * 1.5 - 4, s * 1.5 - 4);
            // أضواء
            for (let i = 0; i < 3; i++) {
                ctx.fillStyle = ['#2ecc71', '#f39c12', '#e74c3c'][i];
                if (Math.random() > 0.3) {
                    ctx.beginPath();
                    ctx.arc(x + 12 + i * 14, y + 14, 4, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            break;
        case 'fire_ext':
            ctx.fillStyle = '#c0392b';
            ctx.fillRect(x + s / 2 - 5, y + 6, 10, s - 12);
            ctx.fillStyle = '#e74c3c';
            ctx.fillRect(x + s / 2 - 3, y + 4, 6, 6);
            break;
        case 'bench':
            ctx.fillStyle = '#8e6c3e';
            ctx.fillRect(x, y, s * 2, s);
            ctx.fillStyle = '#a0805c';
            ctx.fillRect(x + 2, y + 2, s * 2 - 4, s - 4);
            // أدوات معملية
            ctx.fillStyle = '#ecf0f1';
            ctx.fillRect(x + 10, y + 8, 6, 14);
            ctx.fillStyle = '#3498db';
            ctx.fillRect(x + 30, y + 6, 8, 12);
            break;
        case 'chemical':
            ctx.fillStyle = '#5b2c6f';
            ctx.fillRect(x + 4, y + 4, s - 8, s - 8);
            ctx.strokeStyle = '#8e44ad';
            ctx.lineWidth = 2;
            ctx.strokeRect(x + 4, y + 4, s - 8, s - 8);
            ctx.fillStyle = '#f1c40f';
            ctx.font = '14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('☠', x + s / 2, y + s / 2 + 5);
            break;
        case 'microscope':
            ctx.fillStyle = '#34495e';
            ctx.fillRect(x + s / 2 - 6, y + 10, 12, 20);
            ctx.fillStyle = '#2c3e50';
            ctx.beginPath();
            ctx.arc(x + s / 2, y + 8, 6, 0, Math.PI * 2);
            ctx.fill();
            break;
        case 'eyewash':
            ctx.fillStyle = '#3498db';
            ctx.fillRect(x + 6, y + 6, s - 12, s - 12);
            ctx.fillStyle = '#fff';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('👁️', x + s / 2, y + s / 2 + 4);
            break;
        case 'warning':
            ctx.fillStyle = '#f39c12';
            ctx.beginPath();
            ctx.moveTo(x + s / 2, y + 4);
            ctx.lineTo(x + s - 4, y + s - 4);
            ctx.lineTo(x + 4, y + s - 4);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = '#000';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('!', x + s / 2, y + s - 10);
            break;
    }
    ctx.restore();
}

function drawPipes() {
    ctx.strokeStyle = '#7f8c8d';
    ctx.lineWidth = 6;

    // مواسير أفقية بين الأقسام
    ctx.beginPath();
    ctx.moveTo(15 * TILE, 7 * TILE);
    ctx.lineTo(18 * TILE, 7 * TILE);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(29 * TILE, 7 * TILE);
    ctx.lineTo(32 * TILE, 7 * TILE);
    ctx.stroke();

    // مواسير عمودية
    ctx.beginPath();
    ctx.moveTo(10 * TILE, 11 * TILE);
    ctx.lineTo(10 * TILE, 14 * TILE);
    ctx.stroke();

    // نقاط الوصل
    ctx.fillStyle = '#5d6d7e';
    [[15, 7], [18, 7], [29, 7], [32, 7], [10, 11], [10, 14]].forEach(([px, py]) => {
        ctx.beginPath();
        ctx.arc(px * TILE, py * TILE, 5, 0, Math.PI * 2);
        ctx.fill();
    });

    // خط تدفق المياه (أنيمشن)
    ctx.strokeStyle = 'rgba(52,152,219,0.4)';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 12]);
    ctx.lineDashOffset = -Date.now() / 100;
    ctx.beginPath();
    ctx.moveTo(15 * TILE, 7 * TILE);
    ctx.lineTo(18 * TILE, 7 * TILE);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(29 * TILE, 7 * TILE);
    ctx.lineTo(32 * TILE, 7 * TILE);
    ctx.stroke();
    ctx.setLineDash([]);
}

// ===== رسم اللاعب =====
function drawPlayer() {
    const px = player.x;
    const py = player.y;
    const s = player.w;

    ctx.save();

    // ظل
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(px + s / 2, py + s + 2, s / 2, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // جسم اللاعب
    ctx.fillStyle = '#e67e22';
    ctx.fillRect(px + 4, py + 8, s - 8, s - 8);

    // سترة سلامة
    ctx.fillStyle = '#f39c12';
    ctx.fillRect(px + 6, py + 10, s - 12, s - 14);
    // خطوط عاكسة
    ctx.fillStyle = '#ecf0f1';
    ctx.fillRect(px + 6, py + 16, s - 12, 2);
    ctx.fillRect(px + 6, py + 22, s - 12, 2);

    // رأس
    ctx.fillStyle = '#fad7a0';
    ctx.beginPath();
    ctx.arc(px + s / 2, py + 6, 7, 0, Math.PI * 2);
    ctx.fill();

    // خوذة
    ctx.fillStyle = '#f1c40f';
    ctx.beginPath();
    ctx.arc(px + s / 2, py + 4, 8, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(px + s / 2 - 9, py + 3, 18, 3);

    // اتجاه النظر
    ctx.fillStyle = '#2c3e50';
    let eyeX = px + s / 2;
    let eyeY = py + 6;
    if (player.dir === 'left') eyeX -= 2;
    else if (player.dir === 'right') eyeX += 2;
    else if (player.dir === 'up') eyeY -= 2;
    else eyeY += 2;
    ctx.beginPath();
    ctx.arc(eyeX - 2, eyeY, 1.5, 0, Math.PI * 2);
    ctx.arc(eyeX + 2, eyeY, 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

// ===== Minimap =====
function drawMinimap() {
    const mw = miniCanvas.width;
    const mh = miniCanvas.height;
    const sx = mw / MAP_W;
    const sy = mh / MAP_H;

    miniCtx.fillStyle = '#1a2332';
    miniCtx.fillRect(0, 0, mw, mh);

    // أقسام
    sections.forEach(sec => {
        miniCtx.fillStyle = sec.color;
        miniCtx.fillRect(sec.x * TILE * sx, sec.y * TILE * sy, sec.w * TILE * sx, sec.h * TILE * sy);
        miniCtx.strokeStyle = sec.borderColor;
        miniCtx.lineWidth = 1;
        miniCtx.strokeRect(sec.x * TILE * sx, sec.y * TILE * sy, sec.w * TILE * sx, sec.h * TILE * sy);
    });

    // مخاطر غير مكتشفة
    hazards.forEach(h => {
        if (!h.discovered) {
            miniCtx.fillStyle = 'rgba(255,0,0,0.6)';
        } else {
            miniCtx.fillStyle = 'rgba(0,255,0,0.6)';
        }
        miniCtx.beginPath();
        miniCtx.arc(h.x * TILE * sx + 2, h.y * TILE * sy + 2, 2, 0, Math.PI * 2);
        miniCtx.fill();
    });

    // اللاعب
    miniCtx.fillStyle = '#f1c40f';
    miniCtx.fillRect(player.x * sx - 2, player.y * sy - 2, 5, 5);

    // إطار الكاميرا
    miniCtx.strokeStyle = 'rgba(255,255,255,0.4)';
    miniCtx.lineWidth = 1;
    miniCtx.strokeRect(camera.x * sx, camera.y * sy, camera.w * sx, camera.h * sy);
}

// ===== تحديث الكاميرا =====
function updateCamera() {
    camera.w = canvas.width;
    camera.h = canvas.height;
    camera.x = player.x + player.w / 2 - camera.w / 2;
    camera.y = player.y + player.h / 2 - camera.h / 2;

    // حدود الكاميرا
    camera.x = Math.max(0, Math.min(MAP_W - camera.w, camera.x));
    camera.y = Math.max(0, Math.min(MAP_H - camera.h, camera.y));
}

// ===== تحديث اللاعب =====
function updatePlayer() {
    player.vx = 0;
    player.vy = 0;

    if (keys['ArrowUp'] || keys['KeyW'] || keys['w'] || keys['W'] || touchDirs.up) { player.vy = -PLAYER_SPEED; player.dir = 'up'; }
    if (keys['ArrowDown'] || keys['KeyS'] || keys['s'] || keys['S'] || touchDirs.down) { player.vy = PLAYER_SPEED; player.dir = 'down'; }
    if (keys['ArrowLeft'] || keys['KeyA'] || keys['a'] || keys['A'] || touchDirs.left) { player.vx = -PLAYER_SPEED; player.dir = 'left'; }
    if (keys['ArrowRight'] || keys['KeyD'] || keys['d'] || keys['D'] || touchDirs.right) { player.vx = PLAYER_SPEED; player.dir = 'right'; }

    // حركة قطرية أبطأ
    if (player.vx !== 0 && player.vy !== 0) {
        player.vx *= 0.707;
        player.vy *= 0.707;
    }

    // تصادم أفقي
    let nx = player.x + player.vx;
    if (!collidesWithWall(nx, player.y, player.w, player.h)) {
        player.x = nx;
    }

    // تصادم عمودي
    let ny = player.y + player.vy;
    if (!collidesWithWall(player.x, ny, player.w, player.h)) {
        player.y = ny;
    }

    // حدود الخريطة
    player.x = Math.max(TILE, Math.min(MAP_W - TILE - player.w, player.x));
    player.y = Math.max(TILE, Math.min(MAP_H - TILE - player.h, player.y));

    // صوت خطوات
    if ((player.vx !== 0 || player.vy !== 0)) {
        player.frameTimer++;
        if (player.frameTimer > 15) {
            player.frameTimer = 0;
            AudioSys.step();
        }
    }

    // تحديث القسم الحالي
    updateCurrentSection();

    // تحقق من القرب من المخاطر والسيناريوهات
    checkProximity();
}

// ===== تحديد القسم الحالي =====
function updateCurrentSection() {
    const pcx = (player.x + player.w / 2) / TILE;
    const pcy = (player.y + player.h / 2) / TILE;

    let found = 'خارج الأقسام';
    for (const sec of sections) {
        if (pcx >= sec.x && pcx < sec.x + sec.w && pcy >= sec.y && pcy < sec.y + sec.h) {
            found = sec.name;

            // عرض معلومة تعليمية عند دخول قسم جديد
            if (gameState.currentSection !== sec.id) {
                const edu = educationalContent.find(e => e.triggerSection === sec.id && !gameState.educationShown.includes(e.id));
                if (edu) {
                    setTimeout(() => showEducation(edu), 1000);
                }
            }
            gameState.currentSection = sec.id;
            break;
        }
    }
    document.getElementById('sectionIndicator').textContent = found;
}

// ===== تحقق القرب =====
let nearHazard = null;
let nearScenario = null;

function checkProximity() {
    const pcx = player.x + player.w / 2;
    const pcy = player.y + player.h / 2;
    const dist = TILE * 1.8;

    nearHazard = null;
    nearScenario = null;

    // مخاطر
    for (const h of hazards) {
        if (h.discovered) continue;
        const hx = h.x * TILE + TILE / 2;
        const hy = h.y * TILE + TILE / 2;
        const d = Math.hypot(pcx - hx, pcy - hy);
        if (d < dist) {
            nearHazard = h;
            break;
        }
    }

    // سيناريوهات
    for (const sc of scenarios) {
        if (sc.completed) continue;
        const sx = sc.triggerX * TILE + TILE / 2;
        const sy = sc.triggerY * TILE + TILE / 2;
        const d = Math.hypot(pcx - sx, pcy - sy);
        if (d < dist) {
            nearScenario = sc;
            break;
        }
    }

    // إظهار/إخفاء مؤشر التفاعل
    const hint = document.getElementById('interactHint');
    if (nearHazard || nearScenario) {
        hint.classList.remove('hidden');
    } else {
        hint.classList.add('hidden');
    }
}

// ===== التفاعل =====
function interact() {
    if (gameState.paused) return;

    if (nearHazard) {
        discoverHazard(nearHazard);
    } else if (nearScenario) {
        triggerScenario(nearScenario);
    }
}

// ===== اكتشاف خطر =====
let currentHazard = null;

function discoverHazard(hazard) {
    currentHazard = hazard;
    gameState.paused = true;
    AudioSys.discover();

    document.getElementById('hazardTitle').textContent = '⚠️ ' + hazard.name;
    document.getElementById('hazardDesc').textContent = hazard.desc;
    document.getElementById('hazardIcon').textContent = hazard.icon;
    document.getElementById('severitySlider').value = 3;
    document.getElementById('likelihoodSlider').value = 3;
    updateRiskCalc();

    document.getElementById('hazardModal').classList.remove('hidden');
}

function updateRiskCalc() {
    const sev = parseInt(document.getElementById('severitySlider').value);
    const lik = parseInt(document.getElementById('likelihoodSlider').value);
    const score = sev * lik;

    document.getElementById('sevVal').textContent = sev;
    document.getElementById('likVal').textContent = lik;
    document.getElementById('riskScore').textContent = score;

    const levelEl = document.getElementById('riskLevel');
    if (score <= 4) {
        levelEl.textContent = 'منخفض';
        levelEl.className = 'risk-level low';
    } else if (score <= 9) {
        levelEl.textContent = 'متوسط';
        levelEl.className = 'risk-level medium';
    } else if (score <= 16) {
        levelEl.textContent = 'مرتفع';
        levelEl.className = 'risk-level high';
    } else {
        levelEl.textContent = '⛔ خطر شديد!';
        levelEl.className = 'risk-level very-high';
    }
}

function confirmRiskAssessment() {
    if (!currentHazard) return;

    const sev = parseInt(document.getElementById('severitySlider').value);
    const lik = parseInt(document.getElementById('likelihoodSlider').value);

    // تحقق من دقة التقييم
    const sevDiff = Math.abs(sev - currentHazard.severity);
    const likDiff = Math.abs(lik - currentHazard.likelihood);

    let bonus = 0;
    if (sevDiff === 0 && likDiff === 0) {
        bonus = 10;
        showToast('تقييم ممتاز! +10 نقاط', 'success');
    } else if (sevDiff <= 1 && likDiff <= 1) {
        bonus = 5;
        showToast('تقييم جيد! +5 نقاط', 'info');
    } else {
        bonus = 2;
        showToast('تقييم مقبول +2 نقاط', 'warning');
    }

    gameState.score += bonus + 10; // +10 لاكتشاف الخطر
    currentHazard.discovered = true;
    gameState.discoveredHazards.push(currentHazard.id);

    document.getElementById('hazardModal').classList.add('hidden');

    // عرض نافذة PPE
    setTimeout(() => showPPESelection(currentHazard), 500);
}

// ===== اختيار معدات الوقاية =====
let selectedPPE = [];

function showPPESelection(hazard) {
    selectedPPE = [];
    const grid = document.getElementById('ppeGrid');
    grid.innerHTML = '';

    ppeItems.forEach(item => {
        const div = document.createElement('div');
        div.className = 'ppe-item';
        div.innerHTML = `<span class="ppe-icon">${item.icon}</span><span>${item.name}</span>`;
        div.onclick = () => {
            div.classList.toggle('selected');
            if (selectedPPE.includes(item.id)) {
                selectedPPE = selectedPPE.filter(p => p !== item.id);
            } else {
                selectedPPE.push(item.id);
            }
        };
        grid.appendChild(div);
    });

    document.getElementById('ppeFeedback').classList.add('hidden');
    document.getElementById('ppeModal').classList.remove('hidden');
}

function confirmPPE() {
    if (!currentHazard) return;

    const required = currentHazard.requiredPPE;
    const correct = required.every(r => selectedPPE.includes(r));
    const extra = selectedPPE.filter(s => !required.includes(s));
    const missing = required.filter(r => !selectedPPE.includes(r));

    const feedback = document.getElementById('ppeFeedback');
    feedback.classList.remove('hidden');

    // تلوين العناصر
    document.querySelectorAll('.ppe-item').forEach(el => {
        const itemName = el.querySelector('span:last-child').textContent;
        const pItem = ppeItems.find(p => p.name === itemName);
        if (!pItem) return;

        if (el.classList.contains('selected')) {
            if (required.includes(pItem.id)) {
                el.classList.add('correct');
            } else {
                el.classList.add('wrong');
            }
        } else {
            if (required.includes(pItem.id)) {
                el.classList.add('wrong');
            }
        }
    });

    if (correct && extra.length === 0) {
        feedback.className = 'ppe-feedback success';
        feedback.textContent = '✅ ممتاز! اختيار معدات الوقاية صحيح تماماً! +20 نقطة';
        gameState.score += 20;
        AudioSys.success();
    } else if (correct) {
        feedback.className = 'ppe-feedback success';
        feedback.textContent = '✅ جيد! المعدات الأساسية صحيحة. +15 نقطة';
        gameState.score += 15;
        AudioSys.success();
    } else {
        const missingNames = missing.map(m => ppeItems.find(p => p.id === m)?.name).join('، ');
        feedback.className = 'ppe-feedback fail';
        feedback.textContent = '❌ ناقص: ' + missingNames + ' (-5 نقاط)';
        gameState.score = Math.max(0, gameState.score - 5);
        gameState.health = Math.max(0, gameState.health - 5);
        AudioSys.error();
    }

    // تحديث أمان المحطة
    updateSafety();

    setTimeout(() => {
        document.getElementById('ppeModal').classList.add('hidden');
        currentHazard = null;
        gameState.paused = false;
        checkWinCondition();
    }, 2500);
}

// ===== السيناريوهات =====
let currentScenario = null;

function triggerScenario(scenario) {
    currentScenario = scenario;
    gameState.paused = true;
    AudioSys.alert();

    document.getElementById('scenarioTitle').textContent = scenario.title;
    document.getElementById('scenarioDesc').textContent = scenario.desc;

    const choicesDiv = document.getElementById('scenarioChoices');
    choicesDiv.innerHTML = '';

    scenario.choices.forEach((choice, index) => {
        const btn = document.createElement('button');
        btn.className = 'scenario-choice';
        btn.textContent = choice.text;
        btn.onclick = () => handleScenarioChoice(index);
        choicesDiv.appendChild(btn);
    });

    document.getElementById('scenarioModal').classList.remove('hidden');
}

function handleScenarioChoice(index) {
    if (!currentScenario) return;

    const choice = currentScenario.choices[index];
    const buttons = document.querySelectorAll('.scenario-choice');

    buttons.forEach((btn, i) => {
        btn.disabled = true;
        if (currentScenario.choices[i].correct) {
            btn.classList.add('correct-choice');
        }
        if (i === index && !choice.correct) {
            btn.classList.add('wrong-choice');
        }
    });

    if (choice.correct) {
        gameState.score += 50;
        AudioSys.success();
        showToast('إجابة صحيحة! +50 نقطة 🎉', 'success');
    } else {
        gameState.score = Math.max(0, gameState.score - 10);
        gameState.health = Math.max(0, gameState.health - 10);
        AudioSys.error();
        showToast(choice.feedback, 'danger');
    }

    currentScenario.completed = true;
    gameState.completedScenarios.push(currentScenario.id);
    updateSafety();

    setTimeout(() => {
        document.getElementById('scenarioModal').classList.add('hidden');
        currentScenario = null;
        gameState.paused = false;
        checkWinCondition();
    }, 3000);
}

// ===== نوافذ تعليمية =====
function showEducation(edu) {
    if (gameState.educationShown.includes(edu.id)) return;
    gameState.educationShown.push(edu.id);
    gameState.paused = true;

    document.getElementById('eduTitle').textContent = edu.title;
    document.getElementById('eduContent').innerHTML = edu.content;
    document.getElementById('eduModal').classList.remove('hidden');
}

// ===== تحديث الأمان =====
function updateSafety() {
    const totalTasks = hazards.length + scenarios.length;
    const completed = gameState.discoveredHazards.length + gameState.completedScenarios.length;
    gameState.safetyPercent = Math.round((completed / totalTasks) * 100);
}

// ===== فحص النجاح =====
function checkWinCondition() {
    const allHazards = hazards.every(h => h.discovered);
    const allScenarios = scenarios.every(s => s.completed);

    if (allHazards && allScenarios) {
        setTimeout(() => showWinScreen(), 1000);
    }
}

// ===== شاشة النجاح =====
function showWinScreen() {
    gameState.running = false;
    AudioSys.success();
    setTimeout(() => AudioSys.success(), 500);

    document.getElementById('finalScore').textContent = gameState.score;
    document.getElementById('finalHazards').textContent = gameState.discoveredHazards.length + ' / ' + hazards.length;
    document.getElementById('finalSafety').textContent = gameState.safetyPercent + '%';
    document.getElementById('finalTime').textContent = formatTime(gameState.time);

    document.getElementById('gameScreen').classList.remove('active');
    document.getElementById('winScreen').classList.add('active');

    // مسح التقدم المحفوظ
    localStorage.removeItem('waterPlantSafety_save');
}

// ===== Toast =====
function showToast(msg, type = 'info') {
    const toast = document.createElement('div');
    toast.className = 'toast ' + type;
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.5s';
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

// ===== تحديث واجهة المستخدم =====
function updateUI() {
    document.getElementById('healthBar').style.width = gameState.health + '%';
    document.getElementById('healthVal').textContent = gameState.health + '%';

    if (gameState.health <= 30) {
        document.getElementById('healthBar').style.background = 'linear-gradient(to left, #f44336, #e57373)';
    } else if (gameState.health <= 60) {
        document.getElementById('healthBar').style.background = 'linear-gradient(to left, #ff9800, #ffb74d)';
    } else {
        document.getElementById('healthBar').style.background = 'linear-gradient(to left, #4caf50, #66bb6a)';
    }

    document.getElementById('timeVal').textContent = formatTime(gameState.time);
    document.getElementById('scoreVal').textContent = gameState.score;
    document.getElementById('safetyBar').style.width = gameState.safetyPercent + '%';
    document.getElementById('safetyVal').textContent = gameState.safetyPercent + '%';
}

function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
}

// ===== المؤقت =====
let timerInterval = null;

function startTimer() {
    timerInterval = setInterval(() => {
        if (!gameState.running || gameState.paused) return;
        gameState.time--;
        if (gameState.time <= 0) {
            gameState.time = 0;
            showWinScreen(); // انتهى الوقت
        }
        if (gameState.time <= 60) {
            document.getElementById('timeVal').style.color = '#f44336';
        }
    }, 1000);
}

// ===== حفظ / تحميل =====
function saveGame() {
    const save = {
        score: gameState.score,
        health: gameState.health,
        time: gameState.time,
        discoveredHazards: gameState.discoveredHazards,
        completedScenarios: gameState.completedScenarios,
        educationShown: gameState.educationShown,
        playerX: player.x,
        playerY: player.y,
        safetyPercent: gameState.safetyPercent
    };
    localStorage.setItem('waterPlantSafety_save', JSON.stringify(save));
    showToast('تم حفظ التقدم بنجاح 💾', 'success');
}

function loadGame() {
    const data = localStorage.getItem('waterPlantSafety_save');
    if (!data) return false;

    try {
        const save = JSON.parse(data);
        gameState.score = save.score || 0;
        gameState.health = save.health || 100;
        gameState.time = save.time || GAME_TIME;
        gameState.discoveredHazards = save.discoveredHazards || [];
        gameState.completedScenarios = save.completedScenarios || [];
        gameState.educationShown = save.educationShown || [];
        gameState.safetyPercent = save.safetyPercent || 0;
        player.x = save.playerX || 680;
        player.y = save.playerY || 510;

        // تحديث حالة المخاطر
        hazards.forEach(h => {
            h.discovered = gameState.discoveredHazards.includes(h.id);
        });
        scenarios.forEach(s => {
            s.completed = gameState.completedScenarios.includes(s.id);
        });

        return true;
    } catch (e) {
        return false;
    }
}

// ===== حلقة اللعبة الرئيسية =====
function gameLoop() {
    if (!gameState.running) return;

    if (!gameState.paused) {
        updatePlayer();
    }

    // تحديث الكاميرا
    updateCamera();

    // حجم Canvas
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    // مسح
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // تحويل الكاميرا
    ctx.save();
    ctx.translate(-camera.x, -camera.y);

    // رسم
    drawMap();
    drawPlayer();

    ctx.restore();

    // UI
    updateUI();
    drawMinimap();

    requestAnimationFrame(gameLoop);
}

// ===== تهيئة الأحداث =====
function initEvents() {
    // لوحة المفاتيح
    document.addEventListener('keydown', e => {
        keys[e.code] = true;
        keys[e.key] = true;
        if (e.code === 'KeyE' || e.key === 'e' || e.key === 'E') {
            interact();
        }
        if (e.code === 'Escape') {
            togglePause();
        }
        e.preventDefault();
    });

    document.addEventListener('keyup', e => {
        keys[e.code] = false;
        keys[e.key] = false;
    });

    // أزرار اللمس - D-pad
    document.querySelectorAll('.dpad-btn').forEach(btn => {
        const dir = btn.dataset.dir;

        const startTouch = (e) => { e.preventDefault(); touchDirs[dir] = true; };
        const endTouch = (e) => { e.preventDefault(); touchDirs[dir] = false; };

        btn.addEventListener('touchstart', startTouch, { passive: false });
        btn.addEventListener('touchend', endTouch, { passive: false });
        btn.addEventListener('touchcancel', endTouch, { passive: false });
        btn.addEventListener('mousedown', startTouch);
        btn.addEventListener('mouseup', endTouch);
        btn.addEventListener('mouseleave', endTouch);
    });

    // زر التفاعل
    document.getElementById('btnInteract').addEventListener('touchstart', e => { e.preventDefault(); interact(); }, { passive: false });
    document.getElementById('btnInteract').addEventListener('click', () => interact());

    // أزرار الواجهة
    document.getElementById('btnStart').addEventListener('click', startGame);
    document.getElementById('btnContinue').addEventListener('click', continueGame);
    document.getElementById('btnMenu').addEventListener('click', togglePause);
    document.getElementById('btnResume').addEventListener('click', togglePause);
    document.getElementById('btnSave').addEventListener('click', () => { saveGame(); });
    document.getElementById('btnShowMatrix').addEventListener('click', () => {
        document.getElementById('pauseMenu').classList.add('hidden');
        document.getElementById('matrixModal').classList.remove('hidden');
    });
    document.getElementById('btnCloseMatrix').addEventListener('click', () => {
        document.getElementById('matrixModal').classList.add('hidden');
        document.getElementById('pauseMenu').classList.remove('hidden');
    });
    document.getElementById('btnQuit').addEventListener('click', () => {
        saveGame();
        location.reload();
    });
    document.getElementById('btnRestart').addEventListener('click', () => location.reload());
    document.getElementById('btnCloseEdu').addEventListener('click', () => {
        document.getElementById('eduModal').classList.add('hidden');
        gameState.paused = false;
    });
    document.getElementById('btnAssessRisk').addEventListener('click', confirmRiskAssessment);
    document.getElementById('btnConfirmPPE').addEventListener('click', confirmPPE);

    // Sliders
    document.getElementById('severitySlider').addEventListener('input', updateRiskCalc);
    document.getElementById('likelihoodSlider').addEventListener('input', updateRiskCalc);

    // Resize
    window.addEventListener('resize', resizeCanvas);

    // اكتشاف الموبايل
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
        document.getElementById('mobileControls').style.display = 'flex';
    }
}

function resizeCanvas() {
    const topBarH = document.getElementById('topBar').offsetHeight;
    canvas.style.top = topBarH + 'px';
    canvas.style.height = 'calc(100% - ' + topBarH + 'px)';
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    // تحديث حجم minimap على الموبايل
    if (window.innerWidth <= 768) {
        miniCanvas.width = 120;
        miniCanvas.height = 94;
    } else {
        miniCanvas.width = 180;
        miniCanvas.height = 140;
    }
}

function togglePause() {
    if (!gameState.running) return;

    gameState.paused = !gameState.paused;
    const menu = document.getElementById('pauseMenu');

    if (gameState.paused) {
        document.getElementById('pauseScore').textContent = gameState.score;
        document.getElementById('pauseHazards').textContent = gameState.discoveredHazards.length + ' / ' + hazards.length;
        document.getElementById('pauseSafety').textContent = gameState.safetyPercent + '%';
        menu.classList.remove('hidden');
    } else {
        menu.classList.add('hidden');
    }
}

// ===== بدء اللعبة =====
function startGame() {
    AudioSys.init();
    buildWalls();
    gameState.totalHazards = hazards.length;
    gameState.running = true;

    document.getElementById('startScreen').classList.remove('active');
    document.getElementById('gameScreen').classList.add('active');

    resizeCanvas();
    startTimer();
    gameLoop();
}

function continueGame() {
    AudioSys.init();
    buildWalls();
    loadGame();
    gameState.totalHazards = hazards.length;
    gameState.running = true;

    document.getElementById('startScreen').classList.remove('active');
    document.getElementById('gameScreen').classList.add('active');

    resizeCanvas();
    startTimer();
    gameLoop();
}

// ===== تهيئة عند التحميل =====
window.addEventListener('DOMContentLoaded', () => {
    initEvents();

    // تحقق من وجود حفظ سابق
    const saved = localStorage.getItem('waterPlantSafety_save');
    if (saved) {
        document.getElementById('btnContinue').style.display = 'inline-block';
    }
});
