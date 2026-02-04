const mongoose = require("mongoose");

const movieChatroomSchema = new mongoose.Schema({
  movieName: {
    type: String,
    required: [true, 'Movie name is required'],
    trim: true,
    minlength: [1, 'Movie name cannot be empty']
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  endTime: {
    type: Date,
    required: false
  },
  isActive: {
    type: Boolean,
    default: true
  }
});

module.exports = mongoose.model("MovieChatroom", movieChatroomSchema);
