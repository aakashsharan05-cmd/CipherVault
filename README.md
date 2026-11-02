# 🔐 CipherVault — Password Manager

A full-stack (MERN) password manager where every saved credential is **encrypted at rest with AES-256-GCM**, accounts are protected with **bcrypt**, and sessions use **JWT in `httpOnly` cookies**.

<!-- Live demo: add your deployed link here once it is live -->
<!-- ![Dashboard](./docs/dashboard.png) -->
<!-- ![Login](./docs/login.png) -->

---

## ✨ Features

- **Authentication**: register, login, logout, and session persistence across page refreshes
- **Encrypted vault**: store site title, URL, username and password per entry
- **Full CRUD**: add, edit and delete credentials
- **Instant search** across title, URL and username
- **Show / hide** passwords and **one-click copy** for every field
- **Per-user isolation**: you can only ever read, edit or delete your own entries
- **Responsive dark UI** (table on desktop, cards on mobile) with toast feedback

## 🧱 Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS 4, React Router 7, React Toastify, React Icons |
| Backend | Node.js, Express 5 |
| Database | MongoDB with Mongoose |
| Auth | JWT (`jsonwebtoken`), bcrypt hashing (`bcryptjs`), `cookie-parser` |
| Crypto | Node.js built-in `crypto` module (AES-256-GCM) |

## 🛡️ Security Design

**Credential encryption**
- Each password is encrypted with **AES-256-GCM** before it touches the database.
- A fresh **random 96-bit IV** is generated for every encryption, so the same password never produces the same ciphertext.
- The GCM **authentication tag** is stored with each record, so tampered ciphertext fails to decrypt instead of returning garbage.
- The 32-byte key lives only in the `ENCRYPTION_KEY` environment variable (validated as 64 hex characters), never in the repo or database.

**Accounts and sessions**
- User passwords are hashed with **bcrypt** (salted, cost factor 10). Plaintext is never stored.
- Login failures return the same `Invalid credentials` message for "no such user" and "wrong password".
- The JWT is stored in an **`httpOnly` cookie**, so JavaScript on the page cannot read it, and the frontend does not use `localStorage` for tokens.
- Cookies are `SameSite=Lax`, and CORS only allows the configured frontend origin.

**Authorization**
- User identity always comes from the verified JWT, never from the request body.
- Every read, update and delete queries by `{ _id, userId }`, so one user cannot touch another user's records by guessing IDs.

## 🗂️ Project Structure

```
password-manager/
├── src/                      # React frontend
│   ├── components/
│   │   ├── manager.jsx       # Vault dashboard (CRUD, search, copy)
│   │   ├── login.jsx
│   │   ├── register.jsx
│   │   ├── navbar.jsx
│   │   └── footer.jsx
│   ├── App.jsx               # Routes, session check, toast container
│   └── main.jsx
└── backend/
    ├── server.js             # Entry point
    └── src/
        ├── app.js            # Express app, CORS, routes
        ├── db/db.js          # MongoDB connection
        ├── routes/           # auth.routes.js
        ├── controllers/      # auth.controller.js, password.controller.js
        ├── middleware/       # auth.middleware.js (JWT verification)
        ├── models/           # user.model.js, password.model.js
        └── utlis/            # encryption.js (AES-256-GCM helpers)
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- A MongoDB database (local, or a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster)

### 1. Clone and install

```bash
git clone https://github.com/aakashsharan05-cmd/password-manager.git
cd password-manager

# frontend dependencies
npm install

# backend dependencies
cd backend
npm install
```

### 2. Configure the backend

Create `backend/.env`:

```env
PORT=5000
MONGO_URL=mongodb://localhost:27017/password-manager
JWT_SECRET=replace_with_a_long_random_string
ENCRYPTION_KEY=replace_with_64_hex_characters
FRONTEND_URL=http://localhost:5173
```

Generate strong values for the two secrets:

```bash
# ENCRYPTION_KEY (32 bytes as 64 hex chars)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# JWT_SECRET
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

> ⚠️ **Back up `ENCRYPTION_KEY`.** If you lose or change it, every stored password becomes permanently undecryptable.

### 3. Run

```bash
# terminal 1 — backend (http://localhost:5000)
cd backend
npm run dev

# terminal 2 — frontend (http://localhost:5173)
npm run dev
```

Open **http://localhost:5173**, register an account, and add your first credential.

## 📡 API Reference

All routes are prefixed with `/api/auth`. Routes marked 🔒 require a valid session cookie.

| Method | Endpoint | Description |
|---|---|---|
| POST | `/register` | Create an account |
| POST | `/login` | Log in and set the session cookie |
| POST | `/logout` | Clear the session cookie |
| GET | `/profile` 🔒 | Get the current user |
| POST | `/create` 🔒 | Save a new credential (password encrypted server-side) |
| GET | `/get` 🔒 | List the current user's credentials (decrypted) |
| PUT | `/update/:id` 🔒 | Update a credential |
| DELETE | `/delete/:id` 🔒 | Delete a credential |

## ⚠️ Known Limitations and Roadmap

Being upfront about what this project is and is not:

- **Server-side encryption, not zero-knowledge.** The server holds the encryption key and decrypts entries to serve them. A compromise of the server *and* its environment variables would expose vault data. A zero-knowledge design (key derived from a master password, encryption in the browser via Web Crypto) is the natural next step.
- **No rate limiting yet** on login/register.
- **Limited input validation** on the server (no password-strength policy, no schema validation).
- **API URL is hardcoded** to `http://localhost:5000` in the frontend; moving it to an environment variable is planned for deployment.
- **Sessions last 7 days** and logout only clears the cookie (no server-side revocation).

**Planned:** environment-based API URL, rate limiting, `helmet` security headers, input validation, password generator and strength meter, 2FA, deployment.

## 👤 Author

**Aakash Sharan** — [GitHub @aakashsharan05-cmd](https://github.com/aakashsharan05-cmd)