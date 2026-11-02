const mongoose = require("mongoose");

const passwordSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
    },

    username: {
        type: String,
        required: true,
        trim: true,
    },

    url: {
        type: String,
        required: true,
        trim: true,
    },

    password: {
        iv: {
            type: String,
            required: true,
        },
        content: {
            type: String,
            required: true,
        },
        authTag: {
            type: String,
            required: true,
        },
    },

    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "User",
    }
});

const passwordModel = mongoose.model("Password", passwordSchema);

module.exports = passwordModel;