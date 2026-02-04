const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema({
    user: String,
    text: String,
    scene: String,
    likes: { type: Number, default: 0 },
    resolved: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

const ratingSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    points: { type: Number, min: 1, max: 10, required: true },
    createdAt: { type: Date, default: Date.now }
});

const versionSchema = new mongoose.Schema({
    version: Number,
    content: String,
    createdAt: { type: Date, default: Date.now }
});

// Define the script schema first
const scriptSchema = new mongoose.Schema({
    title: String,
    description: String,
    content: String, // For online editor
    file: String, // For uploaded files
    genre: { type: String, enum: ['Drama', 'Horror', 'Comedy', 'Romance', 'Thriller', 'Documentary'] },
    category: { type: String, enum: ['Short film', 'Web series', 'Feature film', 'Ad / Reel', 'Student film'] },
    visibility: { type: String, enum: ['Public', 'Private', 'Team'], default: 'Public' },
    status: { type: String, enum: ['pending', 'approved', 'rejected', 'production'], default: 'pending' },
    author: String, // From profile
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    collaborators: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    comments: [commentSchema],
    ratings: [ratingSchema],
    versions: [versionSchema],
    currentVersion: { type: Number, default: 1 },
    votes: { type: Number, default: 0 },
    views: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Users who added this script to their read list
    chatName: { type: String }, // Custom name for chatroom
    chatEndTime: { type: Date }, // Optional end time for chat
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // All users added to chatroom
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Add methods to script schema
scriptSchema.methods.addRating = async function(userId, points) {
    // Remove existing rating from this user
    this.ratings = this.ratings.filter(rating => rating.user.toString() !== userId.toString());

    // Add new rating
    this.ratings.push({
        user: userId,
        points: points,
        createdAt: new Date()
    });

    await this.save();
};

scriptSchema.methods.getUserRating = function(userId) {
    const rating = this.ratings.find(r => r.user.toString() === userId.toString());
    return rating ? rating.points : null;
};

// Virtual for average rating
scriptSchema.virtual('averageRating').get(function() {
    if (this.ratings.length === 0) return 0;
    const sum = this.ratings.reduce((acc, rating) => acc + rating.points, 0);
    return sum / this.ratings.length;
});

module.exports = mongoose.model("Script", scriptSchema);
