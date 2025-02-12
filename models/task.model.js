const mongoose = require("mongoose");

const TaskSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: String,
    deadline: Date,
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true } // Привязываем к пользователю
}, { timestamps: true });

module.exports = mongoose.model("Task", TaskSchema);
