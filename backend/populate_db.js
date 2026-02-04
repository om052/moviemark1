const User = require('./models/User');
const Script = require('./models/Script');
const ShortFilm = require('./models/ShortFilm');
const Request = require('./models/Request');
const MovieChatroom = require('./models/MovieChatroom');
const Crowdfunding = require('./models/Crowdfunding');

const populateDB = async () => {
  try {
    // Check if admin user exists
    const adminExists = await User.findOne({ email: 'admin@example.com' });
    if (!adminExists) {
      const admin = new User({
        name: 'Admin User',
        email: 'admin@example.com',
        password: '$2a$10$hashedpassword', // Pre-hashed password
        role: 'admin',
        isVerified: true
      });
      await admin.save();
      console.log('Admin user created');
    } else {
      console.log('Admin user already exists');
    }

    // Check if sample data exists
    const sampleUserExists = await User.findOne({ email: 'user@example.com' });
    if (!sampleUserExists) {
      const sampleUser = new User({
        name: 'Sample User',
        email: 'user@example.com',
        password: '$2a$10$hashedpassword', // Pre-hashed password
        role: 'user',
        isVerified: true
      });
      await sampleUser.save();
      console.log('Sample user created');
    } else {
      console.log('Sample data already exists');
    }

    // Create sample script for crowdfunding
    const sampleScriptExists = await Script.findOne({ title: 'Sample Film Script' });
    let sampleScript;
    if (!sampleScriptExists) {
      sampleScript = new Script({
        title: 'Sample Film Script',
        description: 'A sample script for crowdfunding demonstration',
        content: 'Sample script content...',
        genre: 'Drama',
        category: 'Short film',
        visibility: 'Public',
        status: 'approved',
        author: 'Sample User',
        uploadedBy: sampleUserExists ? sampleUserExists._id : (await User.findOne({ email: 'user@example.com' }))._id
      });
      await sampleScript.save();
      console.log('Sample script created');
    } else {
      sampleScript = sampleScriptExists;
      console.log('Sample script already exists');
    }

    // Create sample crowdfunding campaign
    const sampleCrowdfundingExists = await Crowdfunding.findOne({ title: 'Support Our Drama Film' });
    if (!sampleCrowdfundingExists) {
      const sampleCrowdfunding = new Crowdfunding({
        script: sampleScript._id,
        title: 'Support Our Drama Film',
        description: 'Help us bring this compelling drama to life through your generous contributions.',
        goalAmount: 5000,
        currentAmount: 1200,
        status: 'active',
        createdBy: sampleUserExists ? sampleUserExists._id : (await User.findOne({ email: 'user@example.com' }))._id,
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
      });
      await sampleCrowdfunding.save();
      console.log('Sample crowdfunding campaign created');
    } else {
      console.log('Sample crowdfunding campaign already exists');
    }

    // Do not create films with team to avoid validation errors
    // The film creation logic in admin.js has bugs that need to be fixed first

  } catch (error) {
    console.error('Error populating database:', error);
  }
};

module.exports = populateDB;
