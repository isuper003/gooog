import { showToast } from './toast.js';
import { setCsrfToken } from './csrf.js';

export function initAuth() {
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    const formLogin = document.getElementById('form-login');
    const formRegister = document.getElementById('form-register');

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
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;
        const rememberMe = document.getElementById('login-remember').checked;

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, rememberMe })
            });
            const data = await res.json();
            
            if (res.ok && data.success) {
                if (data.data?.sessionToken) {
                    localStorage.setItem('goooog_session_token', data.data.sessionToken);
                    sessionStorage.setItem('goooog_session_token', data.data.sessionToken);
                }
                setCsrfToken(data.data.csrfToken);
                showToast('Welcome back! Loading game...', 'success');
                if (typeof window.onLoginSuccess === 'function') {
                    window.onLoginSuccess(data.data.user);
                } else {
                    setTimeout(() => window.location.reload(), 300);
                }
            } else {
                showToast(data.error || 'Login failed', 'error');
            }
        } catch (err) {
            console.error(err);
            showToast('Connection error. Please try again.', 'error');
        }
    });

    formRegister?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('register-username').value;
        const password = document.getElementById('register-password').value;

        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            
            if (res.ok && data.success) {
                showToast('Account created! Logging in...', 'success');
                // Automatically log in the user
                const loginRes = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password, rememberMe: true })
                });
                const loginData = await loginRes.json();
                if (loginRes.ok && loginData.success) {
                    if (loginData.data?.sessionToken) {
                        localStorage.setItem('goooog_session_token', loginData.data.sessionToken);
                        sessionStorage.setItem('goooog_session_token', loginData.data.sessionToken);
                    }
                    setCsrfToken(loginData.data.csrfToken);
                    if (typeof window.onLoginSuccess === 'function') {
                        window.onLoginSuccess(loginData.data.user);
                    } else {
                        setTimeout(() => window.location.reload(), 300);
                    }
                } else {
                    tabLogin?.click();
                    const loginUserInput = document.getElementById('login-username');
                    if (loginUserInput) loginUserInput.value = username;
                }
            } else {
                showToast(data.error || 'Registration failed', 'error');
            }
        } catch (err) {
            console.error(err);
            showToast('Connection error during registration.', 'error');
        }
    });
}
