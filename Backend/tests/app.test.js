const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const mongoose = require("mongoose");
const request = require("supertest");

// 1. Set environment variables BEFORE requiring app
process.env.PORT = "5000";
process.env.MONGO_URL = "mongodb://localhost:27017/test_db";
process.env.JWT_SECRET = "super_secure_random_jwt_secret_key_at_least_32_chars_long";
process.env.ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcde0";
process.env.FRONTEND_URL = "https://ciphervault.example.com";
process.env.NODE_ENV = "development";

// 2. Pre-populate require.cache with in-memory fakes for models
const userModelPath = path.resolve(__dirname, "../src/models/user.model.js");
const passwordModelPath = path.resolve(__dirname, "../src/models/password.model.js");

const users = [];
const passwords = [];

const fakeUserModel = {
  users,
  create: async (data) => {
    const doc = {
      _id: new mongoose.Types.ObjectId().toString(),
      username: data.username,
      email: data.email,
      password: data.password
    };
    users.push(doc);
    return doc;
  },
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
  },
  findById: (id) => ({
    select: async (fields) => {
      const found = users.find((u) => String(u._id) === String(id));
      if (!found) return null;
      if (fields === "-password") {
        const rest = { ...found };
        delete rest.password;
        return rest;
      }
      return found;
    }
  })
};

const fakePasswordModel = {
  passwords,
  create: async (data) => {
    const doc = {
      _id: new mongoose.Types.ObjectId().toString(),
      title: data.title,
      url: data.url,
      username: data.username,
      password: data.password,
      userId: data.userId,
      toObject: function () {
        const rest = { ...this };
        delete rest.toObject;
        return rest;
      }
    };
    passwords.push(doc);
    return doc;
  },
  find: async (query) => {
    return passwords
      .filter((p) => String(p.userId) === String(query.userId))
      .map((p) => ({
        ...p,
        toObject: function () {
          const rest = { ...this };
          delete rest.toObject;
          return rest;
        }
      }));
  },
  findOne: async (query) => {
    const found = passwords.find(
      (p) => String(p._id) === String(query._id) && String(p.userId) === String(query.userId)
    );
    if (!found) return null;
    return {
      ...found,
      toObject: function () {
        const rest = { ...this };
        delete rest.toObject;
        return rest;
      },
      save: async function () {
        const idx = passwords.findIndex((p) => String(p._id) === String(found._id));
        if (idx !== -1) {
          passwords[idx] = {
            _id: found._id,
            title: this.title,
            url: this.url,
            username: this.username,
            password: this.password,
            userId: this.userId,
            toObject: function () {
              const rest = { ...this };
              delete rest.toObject;
              return rest;
            }
          };
        }
      }
    };
  },
  findOneAndDelete: async (query) => {
    const idx = passwords.findIndex(
      (p) => String(p._id) === String(query._id) && String(p.userId) === String(query.userId)
    );
    if (idx === -1) return null;
    return passwords.splice(idx, 1)[0];
  }
};

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

// 3. Require the real app and server modules
const app = require("../src/app");
const { validateEnv } = require("../server");

test("1. register validation and persistence", async (t) => {
  await t.test("short password -> 400", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ username: "alice", email: "alice@example.com", password: "short" });
    assert.equal(res.status, 400);
  });

  await t.test("password as object {\"$ne\":null} -> 400", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ username: "alice", email: "alice@example.com", password: { $ne: null } });
    assert.equal(res.status, 400);
  });

  await t.test("missing body -> 400", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .set("Content-Type", "application/json");
    assert.equal(res.status, 400);
  });

  await t.test("valid registration -> 201; stored password is a bcrypt hash; email lowercased/trimmed", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        username: "  AliceUser  ",
        email: "  Alice.User@Example.Com  ",
        password: "ValidPassword123!"
      });
    assert.equal(res.status, 201);

    const stored = users.find((u) => u.username === "AliceUser");
    assert.ok(stored, "User should be stored");
    assert.equal(stored.email, "alice.user@example.com");
    assert.match(stored.password, /^\$2[aby]\$\d+\$/);
  });

  await t.test("duplicate registration -> 400", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        username: "AliceUser",
        email: "alice.user@example.com",
        password: "ValidPassword123!"
      });
    assert.equal(res.status, 400);
  });
});

test("2. login authentication and cookies", async (t) => {
  await t.test("{\"email\":{\"$ne\":null}} -> 400", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: { $ne: null }, password: "ValidPassword123!" });
    assert.equal(res.status, 400);
  });

  await t.test("wrong password -> 401 with same message as unknown user", async () => {
    const resWrongPwd = await request(app)
      .post("/api/auth/login")
      .send({ username: "AliceUser", password: "WrongPassword999!" });
    assert.equal(resWrongPwd.status, 401);

    const resUnknown = await request(app)
      .post("/api/auth/login")
      .send({ username: "NonExistentUser", password: "AnyPassword123!" });
    assert.equal(resUnknown.status, 401);

    assert.equal(resWrongPwd.body.message, resUnknown.body.message);
  });

  await t.test("success sets cookie HttpOnly + SameSite=Lax (dev)", async () => {
    process.env.NODE_ENV = "development";
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "AliceUser", password: "ValidPassword123!" });

    assert.equal(res.status, 200);
    const setCookie = res.headers["set-cookie"];
    assert.ok(setCookie && setCookie.length > 0);
    const cookieHeader = setCookie[0];
    assert.match(cookieHeader, /HttpOnly/i);
    assert.match(cookieHeader, /SameSite=Lax/i);
    assert.doesNotMatch(cookieHeader, /Secure/i);
  });

  await t.test("success sets cookie HttpOnly + Secure + SameSite=None when NODE_ENV=production", async () => {
    process.env.NODE_ENV = "production";
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "AliceUser", password: "ValidPassword123!" });

    assert.equal(res.status, 200);
    const setCookie = res.headers["set-cookie"];
    assert.ok(setCookie && setCookie.length > 0);
    const cookieHeader = setCookie[0];
    assert.match(cookieHeader, /HttpOnly/i);
    assert.match(cookieHeader, /SameSite=None/i);
    assert.match(cookieHeader, /Secure/i);

    process.env.NODE_ENV = "development";
  });
});

test("3. vault CRUD, encryption and isolation", async (t) => {
  // Login as User 1
  const loginRes1 = await request(app)
    .post("/api/auth/login")
    .send({ username: "AliceUser", password: "ValidPassword123!" });
  const cookie1 = loginRes1.headers["set-cookie"][0].split(";")[0];

  // Register and login User 2
  await request(app)
    .post("/api/auth/register")
    .send({ username: "BobUser", email: "bob@example.com", password: "BobPassword123!" });
  const loginRes2 = await request(app)
    .post("/api/auth/login")
    .send({ username: "BobUser", password: "BobPassword123!" });
  const cookie2 = loginRes2.headers["set-cookie"][0].split(";")[0];

  let createdEntryId;

  await t.test("create credential with invalid URLs -> 400", async () => {
    const resJs = await request(app)
      .post("/api/auth/create")
      .set("Cookie", cookie1)
      .send({
        title: "Test JS",
        url: "javascript:alert(1)",
        username: "user1",
        password: "SecretPassword1"
      });
    assert.equal(resJs.status, 400);

    const resTab = await request(app)
      .post("/api/auth/create")
      .set("Cookie", cookie1)
      .send({
        title: "Test Tab",
        url: "java\tscript:alert(1)",
        username: "user1",
        password: "SecretPassword1"
      });
    assert.equal(resTab.status, 400);
  });

  await t.test("create then get returns decrypted password; stored record contains no plaintext", async () => {
    const resCreate = await request(app)
      .post("/api/auth/create")
      .set("Cookie", cookie1)
      .send({
        title: "GitHub",
        url: "github.com/login",
        username: "alice",
        password: "DecryptedSecretPassword!"
      });
    assert.equal(resCreate.status, 201);
    createdEntryId = resCreate.body.savePassword._id;

    // Check raw stored database record
    const stored = passwords.find((p) => String(p._id) === String(createdEntryId));
    assert.ok(stored);
    assert.ok(typeof stored.password === "object");
    assert.ok(stored.password.iv && stored.password.content && stored.password.authTag);
    assert.doesNotMatch(JSON.stringify(stored), /DecryptedSecretPassword!/);

    // Check GET /get
    const resGet = await request(app)
      .get("/api/auth/get")
      .set("Cookie", cookie1);
    assert.equal(resGet.status, 200);
    const found = resGet.body.passwords.find((p) => String(p._id) === String(createdEntryId));
    assert.ok(found);
    assert.equal(found.password, "DecryptedSecretPassword!");
  });

  await t.test("second user gets 0 entries and 404 on update/delete of first user's id", async () => {
    const resGet2 = await request(app)
      .get("/api/auth/get")
      .set("Cookie", cookie2);
    assert.equal(resGet2.status, 200);
    assert.equal(resGet2.body.passwords.length, 0);

    const resUpdate = await request(app)
      .put(`/api/auth/update/${createdEntryId}`)
      .set("Cookie", cookie2)
      .send({
        title: "Hacked",
        url: "hacked.com",
        username: "hacker",
        password: "NewPassword123!"
      });
    assert.equal(resUpdate.status, 404);

    const resDelete = await request(app)
      .delete(`/api/auth/delete/${createdEntryId}`)
      .set("Cookie", cookie2);
    assert.equal(resDelete.status, 404);
  });

  await t.test("invalid ObjectId -> 400 on update and delete", async () => {
    const resUpdate = await request(app)
      .put("/api/auth/update/invalid-object-id")
      .set("Cookie", cookie1)
      .send({
        title: "Test",
        url: "example.com",
        username: "user",
        password: "Pass123456!"
      });
    assert.equal(resUpdate.status, 400);

    const resDelete = await request(app)
      .delete("/api/auth/delete/invalid-object-id")
      .set("Cookie", cookie1);
    assert.equal(resDelete.status, 400);
  });

  await t.test("corrupted ciphertext record is skipped and GET still returns 200 with other records", async () => {
    // Add corrupted record directly into user1's vault
    passwords.push({
      _id: new mongoose.Types.ObjectId().toString(),
      title: "Corrupted",
      url: "example.com",
      username: "user",
      password: {
        iv: "invalid-iv",
        content: "bad-content",
        authTag: "bad-tag"
      },
      userId: users[0]._id,
      toObject: function () {
        return {
          _id: this._id,
          title: this.title,
          url: this.url,
          username: this.username,
          userId: this.userId
        };
      }
    });

    const resGet = await request(app)
      .get("/api/auth/get")
      .set("Cookie", cookie1);
    assert.equal(resGet.status, 200);
    assert.ok(Array.isArray(resGet.body.passwords));
    const validFound = resGet.body.passwords.find((p) => String(p._id) === String(createdEntryId));
    assert.ok(validFound);
    const corruptedFound = resGet.body.passwords.find((p) => p.title === "Corrupted");
    assert.equal(corruptedFound, undefined);
  });
});

test("4. tampered JWT -> 401 with generic message", async () => {
  const tamperedToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalidpayload.invalidsignature";
  const res = await request(app)
    .get("/api/auth/profile")
    .set("Cookie", `token=${tamperedToken}`);
  assert.equal(res.status, 401);
  assert.equal(res.body.message, "Invalid or expired token");
});

test("5. CORS: origin verification across environments", async (t) => {
  await t.test("dev: localhost:5173 is allowed", async () => {
    process.env.NODE_ENV = "development";
    const res = await request(app)
      .options("/api/auth/login")
      .set("Origin", "http://localhost:5173");
    assert.equal(res.headers["access-control-allow-origin"], "http://localhost:5173");
  });

  await t.test("production: localhost:5173 is NOT allowed, FRONTEND_URL is", async () => {
    process.env.NODE_ENV = "production";
    const resDisallowed = await request(app)
      .options("/api/auth/login")
      .set("Origin", "http://localhost:5173");
    assert.equal(resDisallowed.headers["access-control-allow-origin"], undefined);

    const resAllowed = await request(app)
      .options("/api/auth/login")
      .set("Origin", "https://ciphervault.example.com");
    assert.equal(resAllowed.headers["access-control-allow-origin"], "https://ciphervault.example.com");

    process.env.NODE_ENV = "development";
  });
});

test("7. env validation rejects placeholder or short secrets", () => {
  // Short JWT_SECRET
  let exitCalled = false;
  const originalExit = process.exit;
  process.exit = () => {
    exitCalled = true;
    throw new Error("EXIT_CALLED");
  };

  try {
    assert.throws(
      () => {
        validateEnv({
          MONGO_URL: "mongodb://localhost",
          JWT_SECRET: "short",
          ENCRYPTION_KEY: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcde0"
        });
      },
      /EXIT_CALLED/
    );
    assert.ok(exitCalled);

    // Placeholder JWT_SECRET starting with "your_"
    exitCalled = false;
    assert.throws(
      () => {
        validateEnv({
          MONGO_URL: "mongodb://localhost",
          JWT_SECRET: "your_jwt_secret_that_is_long_enough_32_chars",
          ENCRYPTION_KEY: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcde0"
        });
      },
      /EXIT_CALLED/
    );
    assert.ok(exitCalled);

    // Repeating ENCRYPTION_KEY sequence
    exitCalled = false;
    assert.throws(
      () => {
        validateEnv({
          MONGO_URL: "mongodb://localhost",
          JWT_SECRET: "a_valid_secret_that_is_32_characters_long",
          ENCRYPTION_KEY: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
        });
      },
      /EXIT_CALLED/
    );
    assert.ok(exitCalled);

    // Single repeating character ENCRYPTION_KEY
    exitCalled = false;
    assert.throws(
      () => {
        validateEnv({
          MONGO_URL: "mongodb://localhost",
          JWT_SECRET: "a_valid_secret_that_is_32_characters_long",
          ENCRYPTION_KEY: "a".repeat(64)
        });
      },
      /EXIT_CALLED/
    );
    assert.ok(exitCalled);
  } finally {
    process.exit = originalExit;
  }
});
