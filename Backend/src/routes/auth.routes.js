const express = require("express");
const rateLimit = require("express-rate-limit");

const router = express.Router();

const {
    register,
    login,
    getProfile,
    logout
} = require("../controllers/auth.controller");

const authUser = require("../middleware/auth.middleware");

const {
    createPassword,
    getPassword,
    updatePassword,
    deletePassword
} = require("../controllers/password.controller");

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    skipSuccessfulRequests: true,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        message: "Too many login attempts, please try again after 15 minutes"
    }
});

const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        message: "Too many registration attempts, please try again after an hour"
    }
});

router.post("/register", registerLimiter, register);
router.post("/login", loginLimiter, login);
router.get("/profile", authUser, getProfile);
router.post("/logout", logout);
router.post("/create", authUser, createPassword);
router.get("/get", authUser, getPassword);
router.put("/update/:id", authUser, updatePassword);
router.delete("/delete/:id", authUser, deletePassword);

module.exports = router;
