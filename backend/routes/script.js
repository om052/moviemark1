const express = require("express");
const Script = require("../models/Script");
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const router = express.Router();

// Ensure uploads folder
if (!fs.existsSync("uploads")) {
    fs.mkdirSync("uploads");
}

// Auth middleware
const auth = (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ msg: "No token" });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ msg: "Invalid token" });
    }
};

// Multer config for script uploads
const storage = multer.diskStorage({
    destination: "uploads/",
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

// Upload script file
router.post("/upload", auth, upload.single("file"), async (req, res) => {
    try {
        const { title, description, genre, category, visibility } = req.body;
        const user = await User.findById(req.user.id);
        const profile = await require("../models/Profile").findOne({ email: user.email });

        const script = new Script({
            title,
            description,
            file: req.file ? req.file.filename : null,
            genre,
            category,
            visibility,
            status: 'pending',
            author: profile ? profile.name : user.name,
            uploadedBy: req.user.id,
            versions: [{ version: 1, content: "" }]
        });
        await script.save();
        res.json({ msg: "Script uploaded", script });
    } catch (err) {
        res.status(500).json({ msg: err.message });
    }
});

// Create script with content (online editor)
router.post("/create", auth, async (req, res) => {
    try {
        const { title, description, content, genre, category, visibility } = req.body;
        const user = await User.findById(req.user.id);
        const profile = await require("../models/Profile").findOne({ email: user.email });

        const script = new Script({
            title,
            description,
            content,
            genre,
            category,
            visibility,
            author: profile ? profile.name : user.name,
            uploadedBy: req.user.id,
            versions: [{ version: 1, content }]
        });
        await script.save();
        res.json({ msg: "Script created", script });
    } catch (err) {
        res.status(500).json({ msg: err.message });
    }
});

// Update script content (save version)
router.put("/:id", auth, async (req, res) => {
    try {
        const script = await Script.findById(req.params.id);
        if (!script) return res.status(404).json({ msg: "Script not found" });

        if (script.uploadedBy.toString() !== req.user.id && !script.collaborators.includes(req.user.id)) {
            return res.status(403).json({ msg: "Not authorized" });
        }

        const newVersion = script.currentVersion + 1;
        script.versions.push({ version: newVersion, content: req.body.content });
        script.content = req.body.content;
        script.currentVersion = newVersion;
        script.updatedAt = new Date();
        await script.save();

        res.json({ msg: "Script updated", script });
    } catch (err) {
        res.status(500).json({ msg: err.message });
    }
});

// Get public scripts for homepage
router.get("/public", async (req, res) => {
    try {
        const scripts = await Script.find({ visibility: 'Public' })
            .populate('uploadedBy', 'name')
            .sort({ votes: -1, updatedAt: -1 })
            .limit(8); // Limit to 8 for showcase
        res.json(scripts);
    } catch (err) {
        res.status(500).json({ msg: err.message });
    }
});

// Get homepage stats
router.get("/stats", async (req, res) => {
    try {
        const totalScripts = await Script.countDocuments({ visibility: 'Public' });
        const totalUsers = await User.countDocuments();
        const totalProjects = await require("../models/Project").countDocuments() || 0; // Count projects
        res.json({
            scripts: totalScripts,
            users: totalUsers,
            projects: totalProjects
        });
    } catch (err) {
        res.status(500).json({ msg: err.message });
    }
});

// Get all scripts (public or user's)
router.get("/", auth, async (req, res) => {
    try {
        const scripts = await Script.find({
            $or: [
                { visibility: 'Public' },
                { uploadedBy: req.user.id },
                { collaborators: req.user.id }
            ]
        }).populate('uploadedBy', 'name').sort({ updatedAt: -1 });
        res.json(scripts);
    } catch (err) {
        res.status(500).json({ msg: err.message });
    }
});

// Get script by ID
router.get("/:id", auth, async (req, res) => {
    try {
        const script = await Script.findById(req.params.id).populate('uploadedBy', 'name').populate('collaborators', 'name');
        if (!script) return res.status(404).json({ msg: "Script not found" });

        if (script.visibility === 'Private' && script.uploadedBy._id.toString() !== req.user.id && !script.collaborators.some(c => c._id.toString() === req.user.id)) {
            return res.status(403).json({ msg: "Not authorized" });
        }

        res.json(script);
    } catch (err) {
        res.status(500).json({ msg: err.message });
    }
});

// Add collaborator
router.post("/:id/collaborate", auth, async (req, res) => {
    try {
        const script = await Script.findById(req.params.id);
        if (!script) return res.status(404).json({ msg: "Script not found" });

        if (script.uploadedBy.toString() !== req.user.id) {
            return res.status(403).json({ msg: "Only owner can add collaborators" });
        }

        const user = await User.findOne({ email: req.body.email });
        if (!user) return res.status(404).json({ msg: "User not found" });

        if (!script.collaborators.includes(user._id)) {
            script.collaborators.push(user._id);
            await script.save();
        }

        res.json({ msg: "Collaborator added" });
    } catch (err) {
        res.status(500).json({ msg: err.message });
    }
});

// Add comment
router.post("/:id/comment", auth, async (req, res) => {
    try {
        const script = await Script.findById(req.params.id);
        if (!script) return res.status(404).json({ msg: "Script not found" });

        const user = await User.findById(req.user.id);
        script.comments.push({
            user: user.name,
            text: req.body.text,
            scene: req.body.scene
        });
        await script.save();

        res.json({ msg: "Comment added" });
    } catch (err) {
        res.status(500).json({ msg: err.message });
    }
});

// Get comments
router.get("/:id/comments", auth, async (req, res) => {
    try {
        const script = await Script.findById(req.params.id);
        if (!script) return res.status(404).json({ msg: "Script not found" });

        res.json(script.comments);
    } catch (err) {
        res.status(500).json({ msg: err.message });
    }
});

// Restore version
router.post("/:id/restore/:version", auth, async (req, res) => {
    try {
        const script = await Script.findById(req.params.id);
        if (!script) return res.status(404).json({ msg: "Script not found" });

        if (script.uploadedBy.toString() !== req.user.id) {
            return res.status(403).json({ msg: "Only owner can restore versions" });
        }

        const versionData = script.versions.find(v => v.version == req.params.version);
        if (!versionData) return res.status(404).json({ msg: "Version not found" });

        script.content = versionData.content;
        script.updatedAt = new Date();
        await script.save();

        res.json({ msg: "Version restored" });
    } catch (err) {
        res.status(500).json({ msg: err.message });
    }
});

// Rate script
router.post("/:id/rate", auth, async (req, res) => {
    try {
        const { points } = req.body;

        if (!points || points < 1 || points > 10) {
            return res.status(400).json({ msg: "Points must be between 1 and 10" });
        }

        const script = await Script.findById(req.params.id);
        if (!script) return res.status(404).json({ msg: "Script not found" });

        // Check if script is public or user has access
        if (script.visibility === 'Private' && script.uploadedBy.toString() !== req.user.id && !script.collaborators.includes(req.user.id)) {
            return res.status(403).json({ msg: "Not authorized to rate this script" });
        }

        await script.addRating(req.user.id, points);

        res.json({
            msg: "Rating added successfully",
            averageRating: script.averageRating,
            totalRatings: script.ratings.length
        });
    } catch (err) {
        res.status(500).json({ msg: err.message });
    }
});

// Get script rating for user
router.get("/:id/rating", auth, async (req, res) => {
    try {
        const script = await Script.findById(req.params.id);
        if (!script) return res.status(404).json({ msg: "Script not found" });

        const userRating = script.getUserRating(req.user.id);

        res.json({
            userRating: userRating,
            averageRating: script.averageRating,
            totalRatings: script.ratings.length
        });
    } catch (err) {
        res.status(500).json({ msg: err.message });
    }
});

// Get top rated scripts
router.get("/public/top-rated", async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;

        const scripts = await Script.find({ visibility: 'Public', status: 'approved' })
            .populate('uploadedBy', 'name')
            .sort({ 'ratings.length': -1, averageRating: -1 })
            .limit(limit);

        // Calculate average ratings for each script
        const scriptsWithRatings = scripts.map(script => ({
            ...script.toObject(),
            averageRating: script.averageRating,
            totalRatings: script.ratings.length
        }));

        res.json(scriptsWithRatings);
    } catch (err) {
        res.status(500).json({ msg: err.message });
    }
});

// Add script to user's read list
router.post("/:id/read", auth, async (req, res) => {
    try {
        const script = await Script.findById(req.params.id);
        if (!script) return res.status(404).json({ msg: "Script not found" });

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ msg: "User not found" });

        // Check if script is already in read list
        if (user.readList.includes(script._id)) {
            return res.status(400).json({ msg: "Script already in read list" });
        }

        // Add to user's read list
        user.readList.push(script._id);
        await user.save();

        // Add user to script's readBy list
        if (!script.readBy.includes(user._id)) {
            script.readBy.push(user._id);
            await script.save();
        }

        res.json({ msg: "Script added to read list" });
    } catch (err) {
        res.status(500).json({ msg: err.message });
    }
});

// Remove script from user's read list
router.delete("/:id/read", auth, async (req, res) => {
    try {
        const script = await Script.findById(req.params.id);
        if (!script) return res.status(404).json({ msg: "Script not found" });

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ msg: "User not found" });

        // Remove from user's read list
        user.readList = user.readList.filter(id => id.toString() !== script._id.toString());
        await user.save();

        // Remove user from script's readBy list
        script.readBy = script.readBy.filter(id => id.toString() !== user._id.toString());
        await script.save();

        res.json({ msg: "Script removed from read list" });
    } catch (err) {
        res.status(500).json({ msg: err.message });
    }
});

// Get user's read list
router.get("/read-list", auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).populate({
            path: 'readList',
            populate: { path: 'uploadedBy', select: 'name' }
        });

        if (!user) return res.status(404).json({ msg: "User not found" });

        res.json(user.readList);
    } catch (err) {
        res.status(500).json({ msg: err.message });
    }
});

// Check if script is in user's read list
router.get("/:id/read-status", auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ msg: "User not found" });

        const isInReadList = user.readList.includes(req.params.id);
        res.json({ isInReadList });
    } catch (err) {
        res.status(500).json({ msg: err.message });
    }
});

module.exports = router;
