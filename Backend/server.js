require("dotenv").config();
const app = require("./src/app");
const conn = require("./src/db/db");

const PORT = process.env.PORT || 5000;

function validateEnv(env = process.env) {
    const missing = [];
    if (!env.MONGO_URL) missing.push("MONGO_URL");

    if (!env.JWT_SECRET) {
        missing.push("JWT_SECRET");
    } else if (
        env.JWT_SECRET.length < 32 ||
        env.JWT_SECRET.startsWith("your_") ||
        env.JWT_SECRET.startsWith("REPLACE")
    ) {
        console.error("FATAL: JWT_SECRET must be at least 32 characters and cannot be a placeholder.");
        process.exit(1);
    }

    if (!env.ENCRYPTION_KEY) {
        missing.push("ENCRYPTION_KEY");
    } else if (!/^[0-9a-fA-F]{64}$/.test(env.ENCRYPTION_KEY)) {
        console.error("FATAL: ENCRYPTION_KEY must be a 64-character hexadecimal string (32 bytes).");
        process.exit(1);
    } else if (
        /^(0123456789abcdef)+$/i.test(env.ENCRYPTION_KEY) ||
        new Set(env.ENCRYPTION_KEY).size === 1
    ) {
        console.error("FATAL: ENCRYPTION_KEY is insecure or a repeating sequence/character.");
        process.exit(1);
    }

    if (env.NODE_ENV === "production" && !env.FRONTEND_URL) {
        missing.push("FRONTEND_URL");
    }

    if (missing.length > 0) {
        console.error(`FATAL: Missing required environment variable(s): ${missing.join(", ")}`);
        process.exit(1);
    }
}

async function startServer() {
    try {
        validateEnv();
        await conn();

        app.listen(PORT, "0.0.0.0", () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error("Server startup error:", error);
        process.exit(1);
    }
}

if (require.main === module) {
    startServer();
}

module.exports = { validateEnv, startServer };
