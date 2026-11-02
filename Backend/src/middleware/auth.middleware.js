const jwt = require("jsonwebtoken");

async function authUser(req, res, next) {
    const token = req.cookies.token;

    if (!token) {
        return res.status(401).json({
            message: "Unauthorized"
        });
    }

    try {
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        req.user = decoded;

        next();
    } catch (err) {
        console.error("Auth middleware error:", err.message);
        return res.status(401).json({
            message: "Invalid or expired token"
        });
    }
}

module.exports = authUser;
