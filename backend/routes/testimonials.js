const express = require("express");
const Testimonial = require("../models/Testimonials");
const router = express.Router();

// Get all testimonials
router.get("/", async (req, res) => {
    try {
        const testimonials = await Testimonial.find().sort({ createdAt: -1 });
        res.json(testimonials);
    } catch (err) {
        res.status(500).json({ msg: err.message });
    }
});

module.exports = router;
