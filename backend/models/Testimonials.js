const mongoose = require("mongoose");

const testimonialSchema = new mongoose.Schema({
    name: String,
    role: String,
    text: String,
    avatar: String,
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Testimonial", testimonialSchema);
