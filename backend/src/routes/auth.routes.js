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

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        message: "Too many attempts, please try again after 15 minutes"
    }
});

router.post("/register", authLimiter, register);

router.post("/login", authLimiter, login);

router.get("/profile", authUser, getProfile);

router.post("/logout", logout);

router.post("/create", authUser, createPassword);

router.get("/get", authUser, getPassword);

router.put("/update/:id", authUser, updatePassword);

router.delete("/delete/:id", authUser, deletePassword);

module.exports = router;
