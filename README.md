# KIKI — Create, Design, Share, Inspire

> All-in-one creative platform with iOS 27 Glossy design, built for Netlify.

## 🚀 Deploy to Netlify

### Option A — One-click (recommended)
1. Fork / clone this repo to your GitHub
2. Go to [app.netlify.com](https://app.netlify.com) → **Add new site** → **Import from Git**
3. Select your repo
4. Build settings are auto-detected from `netlify.toml`:
   - **Publish directory**: `.`
   - **Functions directory**: `netlify/functions`
5. Click **Deploy site** ✅

### Option B — Netlify CLI
```bash
npm install -g netlify-cli
netlify login
netlify init          # link to existing or create new site
netlify deploy --prod # deploy to production
```

### Option C — Drag & Drop
Zip the entire repo folder and drag it to [app.netlify.com/drop](https://app.netlify.com/drop).

---

## ⚙️ Environment Variables

Set these in **Netlify → Site settings → Environment variables**:

| Variable              | Required | Description                          |
|-----------------------|----------|--------------------------------------|
| `JWT_SECRET`          | ✅ Yes   | Secret key for JWT tokens (min 32 chars) |
| `CONTACT_TO_EMAIL`    | Optional | Where contact form emails are sent   |
| `SMTP_HOST`           | Optional | SMTP server (e.g. smtp.gmail.com)    |
| `SMTP_PORT`           | Optional | SMTP port (587 or 465)               |
| `SMTP_USER`           | Optional | SMTP username / email                |
| `SMTP_PASS`           | Optional | SMTP password / app password         |
| `MAILCHIMP_API_KEY`   | Optional | Mailchimp API key for newsletter     |
| `MAILCHIMP_LIST_ID`   | Optional | Mailchimp audience/list ID           |
| `CONVERTKIT_API_KEY`  | Optional | ConvertKit API key (alternative)     |
| `CONVERTKIT_FORM_ID`  | Optional | ConvertKit form ID                   |
| `CORS_ORIGIN`         | Optional | Allowed CORS origin (default `*`)    |

---

## 📁 Project Structure

```
KIKI/
├── index.html            # Home / Dashboard
├── features.html         # Features page
├── templates.html        # Template library
├── pricing.html          # Pricing plans
├── resources.html        # Docs & resources
├── about.html            # About us
├── login.html            # Login page
├── get-started.html      # Sign-up page
├── watch-demo.html       # Product demo
│
├── shared.css            # Design system (iOS 27 Glossy)
├── api.js                # Frontend API client
├── logo.svg              # Geometric KIKI wordmark
│
├── netlify.toml          # Netlify build + redirect + header config
├── _redirects            # URL rewrite rules (fallback)
├── package.json          # Dependencies
│
└── netlify/
    └── functions/
        ├── auth.js       # Register + Login + JWT verify
        ├── contact.js    # Contact form → email
        ├── newsletter.js # Newsletter subscribe (Mailchimp / ConvertKit)
        ├── waitlist.js   # Early-access waitlist
        ├── health.js     # Health check endpoint
        └── utils.js      # Shared helpers
```

---

## 🔌 API Endpoints

All endpoints are available at `/.netlify/functions/<name>` or `/api/<name>`:

| Endpoint          | Method | Description                           |
|-------------------|--------|---------------------------------------|
| `/api/health`     | GET    | System health check                   |
| `/api/auth`       | POST   | Register / Login / Verify token       |
| `/api/contact`    | POST   | Contact form submission               |
| `/api/newsletter` | POST   | Newsletter subscription               |
| `/api/waitlist`   | POST   | Early-access waitlist join            |

### Auth API
```js
// Register
POST /api/auth
{ action: 'register', firstName, lastName, email, password, useCase }

// Login
POST /api/auth
{ action: 'login', email, password }

// Verify token
POST /api/auth
{ action: 'verify' }
Headers: Authorization: Bearer <token>
```

### Newsletter API
```js
POST /api/newsletter
{ email: 'user@example.com', firstName: 'Jane' }
```

### Contact API
```js
POST /api/contact
{ name: 'Jane', email: 'jane@example.com', subject: 'Hello', message: 'Hi there!' }
```

---

## 🎨 Design System

The `shared.css` file implements **iOS 27 Glossy** design:

- **`.btn-primary`** — Blue glossy button with specular highlight + glint sweep
- **`.btn-secondary`** — White glossy button
- **`.btn-outline`** — Glass backdrop-filter button
- **`.btn-cyan`** — Cyan brand-accent button
- **`.btn-sm / .btn-lg / .btn-xl`** — Size modifiers
- **`.btn-full`** — Full-width button

---

## 🧑‍💻 Local Development

```bash
npm install          # Install netlify-cli + nodemailer
netlify dev          # Starts local server on http://localhost:8888
                     # Functions available at localhost:8888/.netlify/functions/*
```
