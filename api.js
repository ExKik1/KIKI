/* ============================================================
   KIKI — Frontend API Client
   Connects all forms to Netlify Functions backend
   ============================================================ */

const API_BASE = '/.netlify/functions';

// ── Generic fetch helper ─────────────────────────────────────
async function apiFetch(endpoint, data) {
  const res = await fetch(`${API_BASE}/${endpoint}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(data),
  });
  const json = await res.json().catch(() => ({ error: 'Invalid server response' }));
  return { ok: res.ok, status: res.status, data: json };
}

// ── Auth token helpers ───────────────────────────────────────
const Token = {
  get()       { return localStorage.getItem('kiki_token'); },
  set(t)      { localStorage.setItem('kiki_token', t); },
  clear()     { localStorage.removeItem('kiki_token'); },
  headers()   {
    const t = Token.get();
    return t ? { Authorization: `Bearer ${t}` } : {};
  },
};

// ── Notification toast ───────────────────────────────────────
function showToast(message, type = 'success') {
  // Remove existing
  document.querySelector('.kiki-toast')?.remove();

  const toast = document.createElement('div');
  toast.className = 'kiki-toast';
  toast.innerHTML = `
    <span class="toast-icon">${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span>
    <span class="toast-msg">${message}</span>
  `;

  const colors = { success: '#1f8a52', error: '#c0392b', info: '#3a4bf4' };
  const bg     = { success: '#e8f8f0', error: '#ffeaea', info: '#eef0ff' };

  Object.assign(toast.style, {
    position:     'fixed',
    bottom:       '28px',
    left:         '50%',
    transform:    'translateX(-50%) translateY(80px)',
    background:   bg[type]   || bg.info,
    color:        colors[type] || colors.info,
    border:       `1.5px solid ${colors[type] || colors.info}`,
    borderRadius: '14px',
    padding:      '14px 22px',
    fontFamily:   'Plus Jakarta Sans, sans-serif',
    fontWeight:   '700',
    fontSize:     '14px',
    display:      'flex',
    alignItems:   'center',
    gap:          '10px',
    zIndex:       '10000',
    boxShadow:    '0 8px 32px rgba(0,0,0,.14)',
    transition:   'transform .35s cubic-bezier(.22,1,.36,1), opacity .3s',
    opacity:      '0',
    maxWidth:     '420px',
    whiteSpace:   'nowrap',
  });

  document.body.appendChild(toast);
  requestAnimationFrame(() => {
    toast.style.transform = 'translateX(-50%) translateY(0)';
    toast.style.opacity   = '1';
  });

  setTimeout(() => {
    toast.style.transform = 'translateX(-50%) translateY(80px)';
    toast.style.opacity   = '0';
    setTimeout(() => toast.remove(), 350);
  }, 4000);
}

// ── REGISTER FORM ─────────────────────────────────────────────
function initRegisterForm() {
  const form = document.getElementById('registerForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('[type="submit"]');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = '⏳ Creating account...';

    const { ok, data } = await apiFetch('auth', {
      action:    'register',
      firstName: form.querySelector('[name="firstName"], #firstName')?.value || '',
      lastName:  form.querySelector('[name="lastName"],  #lastName']?.value  || '',
      email:     form.querySelector('[name="email"],     #email']?.value     || form.querySelector('[type="email"]')?.value || '',
      password:  form.querySelector('[name="password"],  #signupPw, [type="password"]')?.value || '',
      useCase:   form.querySelector('select')?.value || '',
    });

    btn.disabled = false;
    btn.textContent = originalText;

    if (ok && data.success) {
      Token.set(data.token);
      showToast('Account created! Welcome to KIKI 🎉', 'success');

      // Animate steps if present
      const step1 = document.getElementById('step1');
      const step2 = document.getElementById('step2');
      const step3 = document.getElementById('step3');
      if (step1 && step2 && step3) {
        step1.classList.add('done'); step1.classList.remove('active');
        step2.classList.add('active');
        setTimeout(() => {
          step2.classList.add('done'); step2.classList.remove('active');
          step3.classList.add('active');
          document.getElementById('formContent')?.style && (document.getElementById('formContent').style.display = 'none');
          const ss = document.getElementById('successScreen');
          if (ss) { ss.style.display = 'flex'; setTimeout(() => { document.getElementById('progFill') && (document.getElementById('progFill').style.width = '100%'); }, 100); }
          setTimeout(() => window.location.href = 'index.html', 2600);
        }, 800);
      }
    } else {
      const msg = data.details?.join(', ') || data.error || 'Something went wrong. Please try again.';
      showToast(msg, 'error');
    }
  });
}

// ── LOGIN FORM ────────────────────────────────────────────────
function initLoginForm() {
  const form = document.getElementById('loginForm') || document.querySelector('form[data-form="login"]');
  const btn  = document.getElementById('loginSubmit') || document.querySelector('.submit-btn, .btn.btn-primary[type="submit"]');

  if (!btn && !form) return;

  const el = form || btn.closest('form');
  if (!el) return;

  el.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn   = el.querySelector('[type="submit"]');
    const labelEl     = document.getElementById('btnLabel') || submitBtn;
    const originalText = labelEl.textContent;

    if (submitBtn) submitBtn.disabled = true;
    labelEl.textContent = '⏳ Logging in...';

    const email    = el.querySelector('#email,    [name="email"]')?.value    || '';
    const password = el.querySelector('#password, [name="password"]')?.value || '';

    const { ok, data } = await apiFetch('auth', { action: 'login', email, password });

    if (submitBtn) submitBtn.disabled = false;
    labelEl.textContent = originalText;

    if (ok && data.success) {
      Token.set(data.token);
      showToast('Welcome back! 👋', 'success');
      setTimeout(() => window.location.href = 'index.html', 1200);
    } else {
      showToast(data.error || 'Invalid email or password', 'error');
    }
  });
}

// ── NEWSLETTER FORM ───────────────────────────────────────────
function initNewsletterForms() {
  document.querySelectorAll('[data-form="newsletter"], .nl-form, .newsletter-form').forEach(form => {
    const btn   = form.querySelector('button, [type="submit"]');
    const input = form.querySelector('input[type="email"]');
    if (!btn || !input) return;

    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const email = input.value.trim();
      if (!email) { showToast('Please enter your email address', 'error'); return; }

      const orig     = btn.textContent;
      btn.disabled   = true;
      btn.textContent = '⏳ Subscribing...';

      const { ok, data } = await apiFetch('newsletter', { email });

      btn.disabled   = false;
      btn.textContent = orig;

      if (ok && data.success) {
        input.value = '';
        showToast(data.message || 'You\'re subscribed! 🎉', 'success');
      } else {
        showToast(data.error || 'Subscription failed. Please try again.', 'error');
      }
    });
  });
}

// ── CONTACT FORM ──────────────────────────────────────────────
function initContactForm() {
  const form = document.querySelector('[data-form="contact"], #contactForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn          = form.querySelector('[type="submit"]');
    const originalText = btn?.textContent || 'Send';
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Sending...'; }

    const name    = form.querySelector('[name="name"],    #name')?.value    || '';
    const email   = form.querySelector('[name="email"],   #email')?.value   || '';
    const subject = form.querySelector('[name="subject"], #subject')?.value || '';
    const message = form.querySelector('[name="message"], #message, textarea')?.value || '';

    const { ok, data } = await apiFetch('contact', { name, email, subject, message });

    if (btn) { btn.disabled = false; btn.textContent = originalText; }

    if (ok && data.success) {
      form.reset();
      showToast(data.message || 'Message sent successfully! 📨', 'success');
    } else {
      const msg = data.details?.join(', ') || data.error || 'Failed to send. Please try again.';
      showToast(msg, 'error');
    }
  });
}

// ── WAITLIST FORM ─────────────────────────────────────────────
function initWaitlistForms() {
  document.querySelectorAll('[data-form="waitlist"]').forEach(form => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn   = form.querySelector('[type="submit"]');
      const input = form.querySelector('input[type="email"]');
      if (!input) return;

      const orig   = btn?.textContent;
      if (btn) { btn.disabled = true; btn.textContent = '⏳ Joining...'; }

      const { ok, data } = await apiFetch('waitlist', {
        email: input.value.trim(),
        name:  form.querySelector('[name="name"]')?.value || '',
      });

      if (btn) { btn.disabled = false; btn.textContent = orig; }

      if (ok && data.success) {
        input.value = '';
        showToast(data.message || `You're on the waitlist! (#${data.position})`, 'success');
      } else {
        showToast(data.error || 'Failed to join. Please try again.', 'error');
      }
    });
  });
}

// ── AUTH GUARD ────────────────────────────────────────────────
function initAuthGuard() {
  const isLoggedIn   = !!Token.get();
  const currentPage  = location.pathname.split('/').pop();
  const protectedPages = [];    // Add protected page names here if needed
  const guestOnlyPages = ['login.html', 'get-started.html'];

  if (isLoggedIn && guestOnlyPages.includes(currentPage)) {
    window.location.href = 'index.html';
  }

  // Update nav "Log in" → "Dashboard" when logged in
  if (isLoggedIn) {
    document.querySelectorAll('.login-link').forEach(el => {
      el.textContent = 'Dashboard';
      el.href = 'index.html';
    });
  }
}

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initRegisterForm();
  initLoginForm();
  initNewsletterForms();
  initContactForm();
  initWaitlistForms();
  initAuthGuard();
});
