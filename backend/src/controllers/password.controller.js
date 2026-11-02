const mongoose = require("mongoose");
const passwordModel = require("../models/password.model");
const { encrypt, decrypt } = require("../utlis/encryption");

function validatePasswordInput(data) {
    const { title, url, username, password } = data;

    if (
        typeof title !== "string" ||
        typeof url !== "string" ||
        typeof username !== "string" ||
        typeof password !== "string"
    ) {
        return null;
    }

    const trimmedTitle = title.trim();
    const trimmedUrl = url.trim();
    const trimmedUsername = username.trim();

    if (
        trimmedTitle.length === 0 || trimmedTitle.length > 100 ||
        trimmedUrl.length === 0 || trimmedUrl.length > 2048 ||
        trimmedUsername.length === 0 || trimmedUsername.length > 100 ||
        password.length === 0 || password.length > 500
    ) {
        return null;
    }

    return {
        title: trimmedTitle,
        url: trimmedUrl,
        username: trimmedUsername,
        password
    };
}

async function createPassword(req, res) {
    try {
        const validated = validatePasswordInput(req.body);
        if (!validated) {
            return res.status(400).json({
                message: "All fields are required and must be valid non-empty strings"
            });
        }

        const encryptedPassword = encrypt(validated.password);
        const savePassword = await passwordModel.create({
            title: validated.title,
            url: validated.url,
            username: validated.username,
            password: encryptedPassword,
            userId: req.user.id
        });

        return res.status(201).json({
            message: "Password created",
            savePassword: {
                _id: savePassword._id,
                title: savePassword.title,
                url: savePassword.url,
                username: savePassword.username,
                password: validated.password,
                userId: savePassword.userId
            }
        });
    } catch (error) {
        console.error("createPassword error:", error);
        return res.status(500).json({
            message: "Failed to create password"
        });
    }
}

async function getPassword(req, res) {
    try {
        const passwords = await passwordModel.find({
            userId: req.user.id
        });

        const newPassword = [];
        for (const pass of passwords) {
            try {
                const decryptedPassword = decrypt(pass.password);
                newPassword.push({
                    ...pass.toObject(),
                    password: decryptedPassword
                });
            } catch (decErr) {
                console.error(`Failed to decrypt password record ${pass._id}:`, decErr.message);
                // Skip corrupted record so one bad entry does not break the whole vault
            }
        }

        return res.status(200).json({
            message: "password fetched successfully",
            passwords: newPassword
        });
    } catch (error) {
        console.error("getPassword error:", error);
        return res.status(500).json({
            message: "Failed to fetch passwords"
        });
    }
}

async function updatePassword(req, res) {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({
                message: "Invalid ID format"
            });
        }

        const validated = validatePasswordInput(req.body);
        if (!validated) {
            return res.status(400).json({
                message: "All fields are required and must be valid non-empty strings"
            });
        }

        const pass = await passwordModel.findOne({
            _id: req.params.id,
            userId: req.user.id
        });

        if (pass == null) {
            return res.status(404).json({
                message: "Password not found for this user"
            });
        }

        pass.title = validated.title;
        pass.url = validated.url;
        pass.username = validated.username;
        pass.password = encrypt(validated.password);
        await pass.save();

        return res.status(200).json({
            message: "Password updated",
            savePassword: {
                _id: pass._id,
                title: pass.title,
                url: pass.url,
                username: pass.username,
                password: validated.password,
                userId: pass.userId
            }
        });
    } catch (error) {
        console.error("UPDATE PASSWORD ERROR:", error);
        return res.status(500).json({
            message: "Failed to update password"
        });
    }
}

async function deletePassword(req, res) {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({
                message: "Invalid ID format"
            });
        }

        const pass = await passwordModel.findOne({
            _id: req.params.id,
            userId: req.user.id
        });

        if (pass == null) {
            return res.status(404).json({
                message: "Password not found for this user"
            });
        }

        await pass.deleteOne();

        return res.status(200).json({
            message: "Password deleted"
        });
    } catch (error) {
        console.error("deletePassword error:", error);
        return res.status(500).json({
            message: "Failed to delete password"
        });
    }
}

module.exports = { createPassword, getPassword, updatePassword, deletePassword };
