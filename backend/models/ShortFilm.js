const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema({
    user: String,
    text: String,
    createdAt: { type: Date, default: Date.now }
});

const shortFilmSchema = new mongoose.Schema({
    title: String,
    description: String,
    videoUrl: String,
    thumbnail: String,
    genre: { type: String, enum: ['Drama', 'Horror', 'Comedy', 'Romance', 'Thriller', 'Documentary'] },
    duration: Number, // in seconds
    creator: String,
    status: { type: String, enum: ['pending', 'approved', 'rejected', 'in-production', 'completed'], default: 'pending' },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    comments: [commentSchema],
    views: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },

    // Post-production workflow fields
    isPostProduction: { type: Boolean, default: false },
    selectedScript: { type: mongoose.Schema.Types.ObjectId, ref: 'Script' },
    team: {
        director: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        actors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        scriptwriter: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } // Original script uploader
    },
    budget: {
        amount: { type: Number, default: 0 },
        currency: { type: String, default: 'USD' },
        approved: { type: Boolean, default: false }
    },
    workflow: {
        scriptwriterApproval: {
            requested: { type: Boolean, default: false },
            approved: { type: Boolean, default: false },
            responseDate: Date,
            notes: String
        },
        directorAssigned: { type: Boolean, default: false },
        teamFormed: { type: Boolean, default: false },
        budgetSet: { type: Boolean, default: false },
        productionStarted: { type: Boolean, default: false },
        completed: { type: Boolean, default: false }
    },
    productionDetails: {
        startDate: Date,
        endDate: Date,
        location: String,
        equipment: [String],
        notes: String
    }
});

module.exports = mongoose.model("ShortFilm", shortFilmSchema);
