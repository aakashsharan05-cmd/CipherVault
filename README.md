# 🔐 CipherVault — Secure Password Manager

CipherVault is a production-grade full-stack MERN password manager designed to help users securely store and manage their website credentials. It leverages **server-side AES-256-GCM authenticated encryption** to protect stored passwords, **bcryptjs** for credential hashing, **JWT authentication with HTTP-only cookies** for session control, **Helmet** for HTTP security headers, and **rate limiting** to guard against brute-force attacks.

> ℹ️ **Architectural Note:** CipherVault uses **server-side authenticated encryption (AES-256-GCM)** with user-isolated vaults. It is **not** a zero-knowledge password manager; encryption keys and decryption operations reside server-side in protected environment variables.

---

## ✨ Features

- **User Authentication:** Registration, login, logout, and persistent session state with secure HTTP-only cookies.
- **Server-Side AES-256-GCM Encryption:** Encrypts saved credentials with 96-bit random IVs and integrity authentication tags before persisting to MongoDB.
- **Cryptographic Password Generator:** In-browser generator using `window.crypto.getRandomValues` with length customization (8–64 chars) and character set toggles (uppercase, lowercase, numbers, symbols).
- **Password Strength Meter:** Real-time visual feedback analyzing entropy, character diversity, and length.
- **Credential Management (CRUD):** Add, view, edit, and delete saved credentials with custom non-blocking confirmation modals.
- **Instant Search & Filter:** Filter stored credentials instantaneously by site title, URL, or username.
- **Interactive Show/Hide Passwords:** Toggle password visibility per entry.
- **One-Click Clipboard Copy:** Instant credential copying with dynamic visual feedback.
- **Strict Authorization & User Isolation:** All CRUD operations are scoped to the authenticated user's ID verified through JWT.
- **Responsive & Modern Dark UI:** High-contrast, responsive interface built with React 19 and Tailwind CSS 4.
- **Toast Notifications:** Smooth notifications via React Toastify for user actions and system feedback.

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, Vite, Tailwind CSS 4, React Router 7, React Icons, React Toastify |
| **Backend** | Node.js, Express 5, MongoDB, Mongoose |
| **Authentication** | JWT (`jsonwebtoken`), `bcryptjs`, `cookie-parser` |
| **Encryption** | Node.js Crypto (`aes-256-gcm`, 12-byte IV, 16-byte Auth Tag) |
| **Security & Hardening** | `helmet`, `express-rate-limit`, HTTP-only SameSite cookies, CORS origin validation |

---

## 🛡️ Security Architecture

### 1. AES-256-GCM Authenticated Encryption
Saved website passwords are encrypted prior to being stored in the database:
- **Algorithm:** `aes-256-gcm` (Galois/Counter Mode).
- **Initialization Vector:** A unique, cryptographically random 12-byte (96-bit) IV generated per encryption via `crypto.randomBytes(12)`.
- **Integrity Verification:** A 16-byte authentication tag is generated and stored with each ciphertext, preventing undetected tampering or bit-flipping attacks.
- **Key Management:** Encrypted with a 256-bit (32-byte) hex key loaded exclusively via the `ENCRYPTION_KEY` environment variable. Never exposed to the frontend or committed to git.

### 2. Session Management & Cookies
- User authentication tokens are stored in an `HttpOnly`, `SameSite` cookie, blocking malicious client-side JavaScript access (mitigating XSS token theft).
- Production deployments enable the `secure: true` flag to mandate HTTPS transmission.
- Shared cookie configuration helper ensures synchronized attributes between `res.cookie` on login and `res.clearCookie` on logout.

### 3. Rate Limiting & Denial of Service Protection
- Public authentication routes (`/api/auth/login` and `/api/auth/register`) are protected by `express-rate-limit` (10 requests per 15-minute window per IP) to prevent automated credential stuffing and brute-force attacks.

### 4. Input Validation & Injection Defense
- Strict type validation ensures fields (`username`, `email`, `password`) are primitive strings, preventing NoSQL object injection attacks (e.g., `{"$ne": null}`).
- Passwords enforce length boundaries (8–128 characters) and usernames enforce alphanumeric constraints (3–30 characters).
- URL sanitization prevents malicious protocol injection (`javascript:`, `data:`, `vbscript:`).

### 5. Architectural Disclosure
CipherVault employs **server-side encryption**. Because the server holds the AES key to decrypt credentials for the authenticated user, this architecture is not zero-knowledge. Server environment security is essential.

---

## 📁 Project Structure

```text
CipherVault/
├── Backend/
│   ├── server.js                     # Server entry point & environment validation
│   ├── package.json                  # Express 5, Mongoose, Helmet, Rate Limit
│   ├── .env.example                  # Backend environment template
│   └── src/
│       ├── app.js                    # Express application configuration & middleware
│       ├── db/
│       │   └── db.js                 # MongoDB connection handler
│       ├── routes/
│       │   └── auth.routes.js        # Authentication & vault API routes
│       ├── controllers/
│       │   ├── auth.controller.js    # Register, login, logout, profile controllers
│       │   └── password.controller.js# Vault CRUD controllers with ownership checks
│       ├── middleware/
│       │   └── auth.middleware.js    # JWT verification & route protection
│       ├── models/
│       │   ├── user.model.js         # Mongoose User schema with unique indexes
│       │   └── password.model.js     # Mongoose Encrypted Password schema
│       └── utils/
│           └── encryption.js         # AES-256-GCM encryption/decryption utilities
├── Frontend/
│   ├── index.html                    # Root HTML document
│   ├── package.json                  # React 19, Vite, Tailwind CSS 4
│   ├── vite.config.js                # Vite build configuration
│   ├── .env.example                  # Frontend environment template
│   └── src/
│       ├── App.jsx                   # Main layout, route definitions, auth bootstrap
│       ├── config.js                 # Centralized API endpoint configuration
│       ├── main.jsx                  # React DOM root entry
│       └── components/
│           ├── navbar.jsx            # Responsive navigation & profile menu
│           ├── footer.jsx            # Application footer & architecture note
│           ├── manager.jsx           # Vault dashboard, generator, strength meter, CRUD
│           ├── login.jsx             # Secure login form with validation
│           └── register.jsx          # User registration form with validation
├── .gitignore
└── README.md
```

---

## 🚀 Getting Started

Follow these steps to run CipherVault locally.

### Prerequisites

- Node.js 18 or later
- npm
- MongoDB (local service or MongoDB Atlas)

---

### 1. Clone the Repository

```bash
git clone https://github.com/aakashsharan05-cmd/CipherVault.git
cd CipherVault
```

---

### 2. Backend Setup

Open a terminal and navigate to the `backend` directory:

```bash
cd backend
npm install
```

#### Configure Backend Environment Variables

Create a `.env` file in the `backend/` directory (you can copy `.env.example`):

```bash
cp .env.example .env
```

Set the required variables:

```env
PORT=5000
MONGO_URL=mongodb://localhost:27017/password-manager
JWT_SECRET=your_super_secret_jwt_key
ENCRYPTION_KEY=your_64_character_hex_encryption_key
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

> 💡 **Generate secure secrets using Node.js:**
>
> ```bash
> # 64-character (32-byte) hex ENCRYPTION_KEY
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
>
> # Secure JWT_SECRET
> node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
> ```

#### Start the Backend Server

```bash
cd backend && npm install && npm run dev
```

The backend starts at `http://localhost:5000`.

---

### 3. Frontend Setup

Open a separate terminal and navigate to the `Frontend` directory:

```bash
cd Frontend
npm install
```

#### Configure Frontend Environment Variables (Optional)

Create a `.env` file in the `Frontend/` directory:

```env
VITE_API_URL=http://localhost:5000
```

#### Start the Frontend Development Server

```bash
cd Frontend && npm install && npm run dev
```

The application will be accessible at:
```text
http://localhost:5173
```

---

## 📡 API Reference

All routes are mounted under `/api/auth`.

| Method | Endpoint | Description | Protection |
|---|---|---|---|
| `POST` | `/register` | Register user account (Rate limited: 10/15min) | Public |
| `POST` | `/login` | Authenticate and issue HttpOnly cookie (Rate limited: 10/15min) | Public |
| `POST` | `/logout` | Clear authentication cookie | Public |
| `GET` | `/profile` | Retrieve authenticated user profile | JWT Cookie Required |
| `POST` | `/create` | Encrypt & save new credential | JWT Cookie Required |
| `GET` | `/get` | Retrieve & decrypt user credentials | JWT Cookie Required |
| `PUT` | `/update/:id` | Update credential (verified against user ID) | JWT Cookie Required |
| `DELETE` | `/delete/:id` | Delete credential (verified against user ID) | JWT Cookie Required |

---

## 🔮 Future Enhancements

- **Two-Factor Authentication (2FA):** Time-based one-time passwords (TOTP) via authenticator apps.
- **Client-Side Zero-Knowledge Encryption:** Deriving encryption keys client-side via PBKDF2/Argon2id and Web Crypto API.
- **Encrypted Vault Export / Import:** Secure password export in password-protected JSON/CSV format.
- **Breach Monitoring:** HaveIBeenPwned API integration to alert users about compromised credentials.

---

## 👨‍💻 Author

**Aakash Sharan**  
GitHub: [@aakashsharan05-cmd](https://github.com/aakashsharan05-cmd)

---

## 📄 License

This project is licensed under the MIT License.
