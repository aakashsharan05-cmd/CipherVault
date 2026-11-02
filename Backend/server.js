require("dotenv").config();
const app = require("./src/app");

const conn = require("./src/db/db");

const PORT = process.env.PORT || 5000;

function validateEnv() {
    const missing = [];
    if (!process.env.MONGO_URL) missing.push("MONGO_URL");
    if (!process.env.JWT_SECRET) missing.push("JWT_SECRET");
    if (!process.env.ENCRYPTION_KEY) {
        missing.push("ENCRYPTION_KEY");
    } else if (!/^[0-9a-fA-F]{64}$/.test(process.env.ENCRYPTION_KEY)) {
        console.error("FATAL: ENCRYPTION_KEY must be a 64-character hexadecimal string (32 bytes).");
        process.exit(1);
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

startServer();
