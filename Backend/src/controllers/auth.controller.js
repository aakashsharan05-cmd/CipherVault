const userModel = require("../models/user.model");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

function getCookieOptions() {
    const isProd = process.env.NODE_ENV === "production";
    return {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? "none" : "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    };
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function register(req, res) {
    try {
        const body = req.body ?? {};
        const { username, email, password } = body;

        if (
            typeof username !== "string" ||
            typeof email !== "string" ||
            typeof password !== "string"
        ) {
            return res.status(400).json({
                message: "Invalid input data"
            });
        }

        const trimmedUsername = username.trim();
        const trimmedEmail = email.trim().toLowerCase();

        if (trimmedUsername.length < 3 || trimmedUsername.length > 30) {
            return res.status(400).json({
                message: "Username must be between 3 and 30 characters"
            });
        }

        if (!EMAIL_REGEX.test(trimmedEmail)) {
            return res.status(400).json({
                message: "Invalid email format"
            });
        }

        if (password.length < 8 || password.length > 128) {
            return res.status(400).json({
                message: "Password must be between 8 and 128 characters"
            });
        }

        const isUserExist = await userModel.findOne({
            $or: [
                { username: trimmedUsername },
                { email: trimmedEmail }
            ]
        });

        if (isUserExist) {
            return res.status(400).json({
                message: "User already exists"
            });
        }

        const hash = await bcrypt.hash(password, 10);
        await userModel.create({
            username: trimmedUsername,
            email: trimmedEmail,
            password: hash
        });

        return res.status(201).json({
            message: "User registered successfully"
        });
    } catch (error) {
        if (error && error.code === 11000) {
            return res.status(400).json({
                message: "Username or email already exists"
            });
        }
        console.error("Register error:", error);
        return res.status(500).json({
            message: "Something went wrong"
        });
    }
}

async function login(req, res) {
    try {
        const body = req.body ?? {};
        const { username, email, password } = body;

        if (typeof password !== "string") {
            return res.status(400).json({
                message: "Invalid input data"
            });
        }

        const queryConditions = [];
        if (typeof username === "string" && username.trim().length > 0) {
            queryConditions.push({ username: username.trim() });
        }
        if (typeof email === "string" && email.trim().length > 0) {
            queryConditions.push({ email: email.trim().toLowerCase() });
        }

        if (queryConditions.length === 0) {
            return res.status(400).json({
                message: "Invalid input data"
            });
        }

        const user = await userModel.findOne({
            $or: queryConditions
        });

        if (!user) {
            return res.status(401).json({
                message: "Invalid credentials"
            });
        }

        const isPasswordvalid = await bcrypt.compare(password, user.password);

        if (!isPasswordvalid) {
            return res.status(401).json({
                message: "Invalid credentials"
            });
        }

        const token = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.cookie("token", token, getCookieOptions());

        return res.status(200).json({
            message: "Login successfully",
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        });
    } catch (error) {
        console.error("Login error:", error);
        return res.status(500).json({
            message: "Something went wrong"
        });
    }
}

// =========================
// GET USER PROFILE
// =========================
async function getProfile(req, res) {
    try {
        const user = await userModel.findById(req.user.id).select("-password");

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        return res.status(200).json({
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        });
    } catch (error) {
        console.error("Profile error:", error);
        return res.status(500).json({
            message: "Failed to fetch profile"
        });
    }
}

// =========================
// LOGOUT
// =========================
async function logout(req, res) {
    res.clearCookie("token", getCookieOptions());

    return res.status(200).json({
        message: "Logged out successfully"
    });
}

module.exports = { register, login, getProfile, logout };
