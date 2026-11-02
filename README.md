# 🔐 CipherVault — Secure Password Manager

CipherVault is a full-stack MERN password manager that helps users securely store and manage their website credentials. It uses **AES-256-GCM encryption** to protect stored passwords, **bcrypt** for account password hashing, and **JWT authentication with HTTP-only cookies** to manage user sessions.

The application provides a secure, user-specific vault with credential management, search, password visibility controls, and a responsive interface.

## ✨ Features

- **User Authentication:** Register, login, logout, and persistent sessions.
- **Encrypted Password Vault:** Encrypts stored website passwords using AES-256-GCM.
- **Credential Management:** Create, read, update, and delete saved credentials.
- **Instant Search:** Search saved credentials by title, URL, or username.
- **Show/Hide Passwords:** Reveal or conceal saved passwords individually.
- **One-Click Copy:** Copy credentials to the clipboard.
- **User-Specific Access:** Users can access and manage only their own saved credentials.
- **Profile Dropdown:** View account information and logout.
- **Responsive UI:** Dark-themed interface designed for desktop and mobile screens.
- **Toast Notifications:** Feedback for user actions.

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| Frontend | React 19, Vite |
| Styling | Tailwind CSS 4 |
| Routing | React Router 7 |
| UI Components | React Icons |
| Notifications | React Toastify |
| Backend | Node.js, Express 5 |
| Database | MongoDB, Mongoose |
| Authentication | JWT, bcryptjs, cookie-parser |
| Encryption | Node.js Crypto module — AES-256-GCM |
| Security | HTTP-only cookies, CORS, Helmet |

## 🛡️ Security Design

### 1. AES-256-GCM Encryption

Saved website passwords are encrypted before being stored in MongoDB.

- Uses AES-256-GCM authenticated encryption.
- Generates a fresh random 96-bit initialization vector (IV) for each encryption operation.
- Stores the authentication tag with the encrypted credential.
- Uses a 32-byte encryption key supplied through the `ENCRYPTION_KEY` environment variable.
- The encryption key is not stored in the database or committed to the repository.

### 2. Secure Account Authentication

- User account passwords are hashed using bcrypt with a salt cost factor of 10.
- JWT-based authentication is used for session management.
- JWT is stored in an HTTP-only cookie.
- The frontend does not store authentication tokens in localStorage.
- Authentication middleware verifies the JWT before allowing access to protected routes.

### 3. Authorization and User Isolation

Every protected credential operation is scoped to the authenticated user.

The server derives the user's identity from the verified JWT rather than trusting a user ID provided by the client.

Update and delete operations verify both the credential ID and the owner ID, preventing users from modifying another user's saved credentials.

### 4. Security Limitations

CipherVault currently uses **server-side encryption and is not a zero-knowledge password manager**.

The server holds the AES encryption key and decrypts saved credentials when returning them to the authenticated user. A compromise of the backend and its environment variables could expose stored vault data.

A future zero-knowledge architecture could derive encryption keys from a user-controlled master password and perform encryption/decryption entirely in the browser.

## 📁 Project Structure

```text
CipherVault/
├── backend/
│   ├── server.js
│   ├── .env.example
│   └── src/
│       ├── app.js
│       ├── db/
│       │   └── db.js
│       ├── routes/
│       │   └── auth.routes.js
│       ├── controllers/
│       │   ├── auth.controller.js
│       │   └── password.controller.js
│       ├── middleware/
│       │   └── auth.middleware.js
│       ├── models/
│       │   ├── user.model.js
│       │   └── password.model.js
│       └── utlis/
│           └── encryption.js
├── public/
├── src/
│   ├── components/
│   │   ├── manager.jsx
│   │   ├── login.jsx
│   │   ├── register.jsx
│   │   ├── navbar.jsx
│   │   └── footer.jsx
│   ├── App.jsx
│   ├── config.js
│   └── main.jsx
├── .env.example
├── .gitignore
├── index.html
├── package.json
├── package-lock.json
├── vite.config.js
└── README.md
```

## 🚀 Getting Started

Follow these steps to run CipherVault locally.

### Prerequisites

- Node.js 18 or later
- npm
- MongoDB (local installation or MongoDB Atlas)
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/aakashsharan05-cmd/CipherVault.git
cd CipherVault
```

### 2. Install Frontend Dependencies

```bash
npm install
```

### 3. Install Backend Dependencies

```bash
cd backend
npm install
```

### 4. Configure Environment Variables

Create a `.env` file inside the `backend` directory.

You can use `backend/.env.example` as a reference.

```env
PORT=5000
MONGO_URL=mongodb://localhost:27017/password-manager
JWT_SECRET=your_long_random_jwt_secret
ENCRYPTION_KEY=your_64_character_hex_encryption_key
FRONTEND_URL=http://localhost:5173
```

Generate secure values for the secrets:

**Generate ENCRYPTION_KEY:**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Generate JWT_SECRET:**

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

> ⚠️ Important: Keep your environment variables private. Never commit your `.env` file to GitHub. Back up your encryption key securely. If the key is lost or changed, previously stored credentials may become permanently undecryptable.

### 5. Run the Backend

From the `backend` directory:

```bash
npm run dev
```

The backend runs at:

```text
http://localhost:5000
```

### 6. Run the Frontend

Open a new terminal in the project root:

```bash
npm run dev
```

The frontend runs at:

```text
http://localhost:5173
```

Open the frontend URL in your browser, register an account, log in, and start managing your credentials.

## 📡 API Reference

All authentication and password routes are prefixed with `/api/auth`.

| Method | Endpoint | Description | Authentication |
|---|---|---|---|
| POST | `/register` | Register a new user | Public |
| POST | `/login` | Authenticate user | Public |
| POST | `/logout` | Clear session cookie | Public |
| GET | `/profile` | Get current user profile | Required |
| POST | `/create` | Save a new credential | Required |
| GET | `/get` | Retrieve user's credentials | Required |
| PUT | `/update/:id` | Update a saved credential | Required |
| DELETE | `/delete/:id` | Delete a saved credential | Required |

## 🔮 Future Improvements

- Move hardcoded API URLs to environment-based configuration.
- Add rate limiting for authentication endpoints.
- Add stronger password validation and password-strength policies.
- Implement a password generator.
- Add a password strength meter.
- Implement two-factor authentication (2FA).
- Explore client-side encryption and a zero-knowledge architecture.
- Deploy the application with production-ready HTTPS and cookie configuration.

## 👨‍💻 Author

**Aakash Sharan**

- GitHub: [@aakashsharan05-cmd](https://github.com/aakashsharan05-cmd)

## 📄 License

This project is open-source. A license has not yet been specified.
