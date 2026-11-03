const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const request = require("supertest");

// 1. Set environment variables BEFORE requiring app
process.env.PORT = "5000";
process.env.MONGO_URL = "mongodb://localhost:27017/test_db";
process.env.JWT_SECRET = "super_secure_random_jwt_secret_key_at_least_32_chars_long";
process.env.ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcde0";
process.env.FRONTEND_URL = "https://ciphervault.example.com";
process.env.NODE_ENV = "development";

// 2. Pre-populate require.cache
const userModelPath = path.resolve(__dirname, "../src/models/user.model.js");
const passwordModelPath = path.resolve(__dirname, "../src/models/password.model.js");

const hashedPwd = bcrypt.hashSync("CorrectPassword123!", 10);
const users = [
  {
    _id: new mongoose.Types.ObjectId().toString(),
    username: "ratelimituser",
    email: "rate@example.com",
    password: hashedPwd
  }
];

const fakeUserModel = {
  findOne: async (query) => {
    if (query.$or) {
      for (const cond of query.$or) {
        if (cond.username) {
          const found = users.find((u) => u.username === cond.username);
          if (found) return found;
        }
        if (cond.email) {
          const found = users.find((u) => u.email === cond.email);
          if (found) return found;
        }
      }
      return null;
    }
    return null;
  }
};

const fakePasswordModel = {};

require.cache[require.resolve(userModelPath)] = {
  id: require.resolve(userModelPath),
  filename: require.resolve(userModelPath),
  loaded: true,
  exports: fakeUserModel
};

require.cache[require.resolve(passwordModelPath)] = {
  id: require.resolve(passwordModelPath),
  filename: require.resolve(passwordModelPath),
  loaded: true,
  exports: fakePasswordModel
};

const app = require("../src/app");

test("6. rate limiting: failed logins trigger 429, successful logins do not lock out", async (t) => {
  await t.test("15 successful logins in a row are never blocked", async () => {
    for (let i = 0; i < 15; i++) {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ username: "ratelimituser", password: "CorrectPassword123!" });
      assert.equal(res.status, 200, `Login attempt ${i + 1} should succeed with 200`);
    }
  });

  await t.test("10 failed logins then 11th -> 429", async () => {
    for (let i = 0; i < 10; i++) {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ username: "ratelimituser", password: "WrongPassword!" });
      assert.equal(res.status, 401, `Failed attempt ${i + 1} should return 401`);
    }

    const resBlocked = await request(app)
      .post("/api/auth/login")
      .send({ username: "ratelimituser", password: "WrongPassword!" });
    assert.equal(resBlocked.status, 429, "11th failed attempt should return 429");
    assert.match(resBlocked.body.message, /Too many login attempts/i);
  });
});
