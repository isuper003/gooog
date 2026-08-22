import { showToast } from './toast.js';
import { setCsrfToken } from './csrf.js';
import { getLang, applyAuthLanguage, setAuthLang, t } from './i18n-auth.js';

// Blueprint §1.B — official Temple reception screen shown after a successful
// application. Replaces the auth forms; the account cannot log in until
// approved, so no session flow is started here.
function renderPendingScreen(username) {
    // The glass auth card that hosts tabs + both forms.
    const card = document.querySelector('.auth-box');
    if (!card) return;
    card.innerHTML = `
        <div class="temple-pending-screen text-center">
            <div class="temple-pending-icon">🏛️📜</div>
            <h2 class="glow-text" style="font-size: 1.15rem;">Your request to join the Temple has been successfully received! 🏛️📜</h2>
            <p style="line-height: 1.9; margin-top: 0.75rem;">
                Your application is currently under review by the Temple Keepers.<br>
                You will be able to log in as soon as your membership has been approved and consecrated.
            </p>
            <p style="opacity: 0.7; font-size: 0.78rem; margin-top: 1rem;">@${username.replace(/</g, '&lt;')}</p>
        </div>
    `;
}

// Blueprint §1.C — styled status banner above the login form for
// pending/rejected/banned verdicts returned by the API.
function showAuthStatusAlert(message, kind) {
    const form = document.getElementById('form-login');
    const parent = form?.parentElement;
    if (!parent) {
        showToast(message, kind === 'pending' ? 'warning' : 'error');
        return;
    }
    let alertBox = document.getElementById('auth-status-alert');
    if (!alertBox) {
        alertBox = document.createElement('div');
        alertBox.id = 'auth-status-alert';
        parent.insertBefore(alertBox, parent.firstChild);
    }
    alertBox.className = `auth-status-alert auth-status-${kind}`;
    // Message originates from our own API with fixed wording; still escaped.
    const safe = message.replace(/[<>&"]/g, c => ({ '<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;' }[c]));
    alertBox.textContent = safe;
}

export function initAuth() {
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    const formLogin = document.getElementById('form-login');
    const formRegister = document.getElementById('form-register');

    // Bilingual auth pages: Arabic default (Amiri Quran via html.auth-lang-ar),
    // preference persisted on switch (blueprint: register/login only).
    applyAuthLanguage();
    document.getElementById(`lang-${getLang()}`)?.classList.add('active');
    document.getElementById('lang-ar')?.addEventListener('click', () => {
        setAuthLang('ar');
        document.getElementById('lang-ar').classList.add('active');
        document.getElementById('lang-en').classList.remove('active');
    });
    document.getElementById('lang-en')?.addEventListener('click', () => {
        setAuthLang('en');
        document.getElementById('lang-en').classList.add('active');
        document.getElementById('lang-ar').classList.remove('active');
    });

    tabLogin?.addEventListener('click', () => {
        tabLogin.classList.add('active');
        tabRegister.classList.remove('active');
        formLogin.classList.remove('hidden');
        formRegister.classList.add('hidden');
    });

    tabRegister?.addEventListener('click', () => {
        tabRegister.classList.add('active');
        tabLogin.classList.remove('active');
        formRegister.classList.remove('hidden');
        formLogin.classList.add('hidden');
    });

    // Live interactive character counter for the application statement
    const noteInput = document.getElementById('register-application-note');
    const noteCounter = document.getElementById('register-note-counter');
    noteInput?.addEventListener('input', () => {
        const len = noteInput.value.trim().length;
        if (noteCounter) {
            noteCounter.innerText = `${len} / 15 ${getLang() === 'ar' ? 'حرفاً كحد أدنى' : 'characters minimum'}`;
            noteCounter.classList.toggle('muted', len < 15);
            noteCounter.classList.toggle('glowing', len >= 15);
        }
    });

    // Password Hide/Unhide Toggle
    document.querySelectorAll('.btn-toggle-pwd').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = btn.dataset.target;
            const input = document.getElementById(targetId);
            if (!input) return;

            const isPassword = input.type === 'password';
            input.type = isPassword ? 'text' : 'password';
            btn.innerText = isPassword ? '🙈' : '👁️';
            btn.title = isPassword ? 'Hide Password' : 'Show Password';
            btn.classList.toggle('active', isPassword);
        });
    });

    formLogin?.addEventListener('submit', async (e) => {
        e.preventDefault();
        document.getElementById('auth-status-alert')?.remove();

        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;
        const rememberMe = document.getElementById('login-remember').checked;

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username, password, rememberMe,
                    timezoneOffsetMinutes: new Date().getTimezoneOffset()
                })
            });
            const data = await res.json();

            if (res.ok && data.success) {
                // No raw session token is persisted client-side anymore: the
                // server sets an HttpOnly+Secure cookie and the middleware
                // accepts it. XSS can no longer exfiltrate a long-lived token.
                if (data.data?.user) {
                    localStorage.setItem('goooog_user', JSON.stringify(data.data.user));
                }
                setCsrfToken(data.data.csrfToken);
                showToast(t('welcomeBack'), 'success');
                if (typeof window.onLoginSuccess === 'function') {
                    window.onLoginSuccess(data.data.user);
                } else {
                    setTimeout(() => window.location.reload(), 300);
                }
            } else {
                // Membership gate verdicts get their own styled banner.
                const msg = data.error || t('loginFailed');
                if (/pending/i.test(msg)) showAuthStatusAlert(msg, 'pending');
                else if (/rejected/i.test(msg)) showAuthStatusAlert(msg, 'rejected');
                else if (/suspended/i.test(msg)) showAuthStatusAlert(msg, 'banned');
                else showToast(msg, 'error');
            }
        } catch (err) {
            console.error(err);
            showToast(t('connErrLogin'), 'error');
        }
    });

    formRegister?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const username = document.getElementById('register-username').value;
        const password = document.getElementById('register-password').value;
        const rawHandle = document.getElementById('register-x-handle').value;
        const applicationNote = document.getElementById('register-application-note').value;

        // Client-side sanitization mirrors the server rule: strip @/whitespace.
        const xHandle = rawHandle.trim().replace(/^@+/, '').trim();

        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, xHandle, applicationNote })
            });
            const data = await res.json();

            if (res.ok && data.success) {
                showToast(t('appReceived'), 'success');
                renderPendingScreen(username);
            } else {
                showToast(data.error || t('regFailed'), 'error');
            }
        } catch (err) {
            console.error(err);
            showToast(t('connErrReg'), 'error');
        }
    });
}
