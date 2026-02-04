const mongoose = require("mongoose");

const requestSchema = new mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    receiver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        enum: ['collaboration', 'project_join', 'film_approval'],
        default: 'collaboration'
    },
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project'
    },
    script: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Script'
    },
    film: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ShortFilm'
    },
    role: {
        type: String,
        enum: ['Writer', 'Director', 'Producer', 'Cinematographer', 'Editor', 'Sound Designer', 'Actor', 'Other'],
        required: true
    },
    message: {
        type: String,
        required: true,
        maxlength: 500
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected'],
        default: 'pending'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model("Request", requestSchema);
