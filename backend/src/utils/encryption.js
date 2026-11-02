
const crypto = require("crypto");

const ALGORITHM = "aes-256-gcm";

function getEncryptionKey() {
    const keyHex = process.env.ENCRYPTION_KEY;

    if (!keyHex || !/^[0-9a-fA-F]{64}$/.test(keyHex)) {
        throw new Error("ENCRYPTION_KEY must be a 32-byte hex key");
    }

    return Buffer.from(keyHex, "hex");
}

function encrypt(text) {
    const iv = crypto.randomBytes(12);

    const cipher = crypto.createCipheriv(
        ALGORITHM,
        getEncryptionKey(),
        iv
    );

    const encrypted = Buffer.concat([
        cipher.update(text, "utf8"),
        cipher.final()
    ]);

    const authTag = cipher.getAuthTag();

    return {
        iv: iv.toString("hex"),
        content: encrypted.toString("hex"),
        authTag: authTag.toString("hex")
    };
}

function decrypt({ iv, content, authTag }) {
    const decipher = crypto.createDecipheriv(
        ALGORITHM,
        getEncryptionKey(),
        Buffer.from(iv, "hex")
    );

    decipher.setAuthTag(Buffer.from(authTag, "hex"));

    const decrypted = Buffer.concat([
        decipher.update(Buffer.from(content, "hex")),
        decipher.final()
    ]);

    return decrypted.toString("utf8");
}

module.exports = { encrypt, decrypt };
