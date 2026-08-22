// ==========================================================================
// Auth pages bilingual layer (Arabic default / English) — blueprint scope:
// register + login screens ONLY. Preference persists in localStorage.
// ==========================================================================

const LANG_KEY = 'gooog_lang';

export function getLang() {
    try {
        const saved = localStorage.getItem(LANG_KEY);
        if (saved === 'ar' || saved === 'en') return saved;
    } catch (e) {}
    return 'ar'; // Default language: Arabic
}

function setHtmlLang(lang) {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.classList.toggle('auth-lang-ar', lang === 'ar');
}

const STRINGS = {
    ar: {
        brandBadge: '👑 ساحة ألغاز المشاهير',
        subtitle: 'اختبر ذاكرتك وقدرتك على تمييز أشهر النجوم',
        tabLogin: '🔑 تسجيل الدخول',
        tabRegister: '✨ انضم إلى المعبد',
        rememberMe: 'تذكرني (30 يوماً)',
        signIn: 'دخول',
        usernamePh: 'اسم المستخدم',
        passwordPh: 'كلمة المرور',
        regUsernamePh: 'اختر اسم المستخدم (3-20: أحرف إنجليزية، أرقام، - _)',
        regPasswordPh: 'أنشئ كلمة المرور (6 أحرف على الأقل)',
        xHandlePh: 'معرّفك في 𝕏 (مطلوب)',
        xWarning: '⚠️ <strong>تنبيه مهم:</strong> يلزم حساب 𝕏 حقيقي وفعّال. الحسابات المزيفة أو المستحدثة أو غير الموجودة سيُرفض طلبها تلقائياً.',
        noteLabel: '📜 خطاب التقديم إلى المعبد: لماذا تريد الانضمام؟',
        notePh: 'اكتب هنا سبب رغبتك في الانضمام إلى المعبد...',
        noteCounter: '0 / 15 حرفاً كحد أدنى',
        submitRegister: 'أرسل طلب الانضمام 🏛️',
        welcomeBack: 'أهلاً بعودتك! جارٍ تحميل اللعبة...',
        loginFailed: 'فشل تسجيل الدخول',
        connErrLogin: 'خطأ اتصال. حاول مجدداً.',
        appReceived: '🏛️ تم استلام طلبك!',
        regFailed: 'فشل التسجيل',
        connErrReg: 'خطأ اتصال أثناء التسجيل.'
    },
    en: {
        brandBadge: '👑 CELEBRITY TRIVIA ARENA',
        subtitle: 'Test your memory & recognition of top stars',
        tabLogin: '🔑 Sign In',
        tabRegister: '✨ Create Account',
        rememberMe: 'Remember me (30 days)',
        signIn: 'Sign In',
        usernamePh: 'Username',
        passwordPh: 'Password',
        regUsernamePh: 'Choose Username (3-20: a-z, 0-9, - _)',
        regPasswordPh: 'Create Password (min 6 chars)',
        xHandlePh: '@your 𝕏 handle (required)',
        xWarning: '⚠️ <strong>Important Notice:</strong> A genuine, active 𝕏 account is required. Fake, newly created, or non-existent accounts will be rejected automatically.',
        noteLabel: '📜 Temple Application Statement: Why do you wish to join the Temple?',
        notePh: 'Write your application statement here...',
        noteCounter: '0 / 15 characters minimum',
        submitRegister: 'Submit Temple Application 🏛️',
        welcomeBack: 'Welcome back! Loading game...',
        loginFailed: 'Login failed',
        connErrLogin: 'Connection error. Please try again.',
        appReceived: '🏛️ Application received!',
        regFailed: 'Registration failed',
        connErrReg: 'Connection error during registration.'
    }
};

export function t(key) {
    return STRINGS[getLang()][key] ?? STRINGS.en[key] ?? key;
}

// Applies the active language to every auth-page element that carries a
// data-i18n key, plus placeholders via data-i18n-ph and the counter seed.
export function applyAuthLanguage() {
    const lang = getLang();
    setHtmlLang(lang);
    document.querySelectorAll('[data-i18n]').forEach(el => {
        el.innerHTML = t(el.dataset.i18n);
    });
    document.querySelectorAll('[data-i18n-ph]').forEach(el => {
        el.placeholder = t(el.dataset.i18nPh);
    });
    const counter = document.getElementById('register-note-counter');
    if (counter && !counter.value && counter.classList.contains('muted')) {
        counter.innerText = t('noteCounter');
    }
}

export function setAuthLang(lang) {
    if (lang !== 'ar' && lang !== 'en') return;
    try { localStorage.setItem(LANG_KEY, lang); } catch (e) {}
    applyAuthLanguage();
}
