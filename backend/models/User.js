const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  roles: [String],
  isAdmin: { type: Boolean, default: false },
  isBlocked: { type: Boolean, default: false },
  isMuted: { type: Boolean, default: false },
  lastLogin: { type: Date }, // Track last login time
  loginCount: { type: Number, default: 0 }, // Track number of logins

  bio: String,
  roleInFilm: String,
  skills: String,
  instagram: String,
  youtube: String,
  photo: String,
  readList: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Script' }] // Scripts added to read list
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
