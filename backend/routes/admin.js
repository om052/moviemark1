const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/admin');
const User = require('../models/User');
const Script = require('../models/Script');
const ShortFilm = require('../models/ShortFilm');
const Request = require('../models/Request');
const ChatMessage = require('../models/ChatMessage');
const Report = require('../models/Report');
const Project = require('../models/Project');
const Movie = require('../models/Movie');
const MovieChatroom = require('../models/MovieChatroom');
const Crowdfunding = require('../models/Crowdfunding');
const AdminLogs = require('../models/AdminLogs');

// Get dashboard stats
router.get('/stats', adminAuth, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalScripts = await Script.countDocuments();
    const totalFilms = await ShortFilm.countDocuments();
    const pendingApprovals = await Script.countDocuments({ status: 'pending' }) +
                             await ShortFilm.countDocuments({ status: 'pending' });
    const activeChatrooms = await ChatMessage.distinct('projectId').then(ids => ids.length);

    res.json({
      totalUsers,
      totalScripts,
      totalFilms,
      pendingApprovals,
      activeChatrooms
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all users
router.get('/users', adminAuth, async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update user status (block/unblock, mute/unmute)
router.put('/users/:id', adminAuth, async (req, res) => {
  try {
    const { isBlocked, isMuted } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isBlocked, isMuted },
      { new: true }
    ).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all projects (scripts and films)
router.get('/projects', adminAuth, async (req, res) => {
  try {
    const scripts = await Script.find().populate('uploadedBy', 'name email');
    const films = await ShortFilm.find().populate('uploadedBy', 'name email');
    res.json({ scripts, films });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Approve/reject project
router.put('/projects/:id/:type', adminAuth, async (req, res) => {
  try {
    const { status } = req.body;
    let project;

    if (req.params.type === 'script') {
      project = await Script.findByIdAndUpdate(
        req.params.id,
        { status },
        { new: true }
      ).populate('uploadedBy', 'name email');
    } else if (req.params.type === 'film') {
      project = await ShortFilm.findByIdAndUpdate(
        req.params.id,
        { status },
        { new: true }
      ).populate('uploadedBy', 'name email');
    }

    res.json(project);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Pin project to dashboard
router.put('/projects/:id/:type/pin', adminAuth, async (req, res) => {
  try {
    const { pinned } = req.body;
    let project;

    if (req.params.type === 'script') {
      project = await Script.findByIdAndUpdate(
        req.params.id,
        { pinned },
        { new: true }
      );
    } else if (req.params.type === 'film') {
      project = await ShortFilm.findByIdAndUpdate(
        req.params.id,
        { pinned },
        { new: true }
      );
    }

    res.json(project);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all requests
router.get('/requests', adminAuth, async (req, res) => {
  try {
    const requests = await Request.find()
      .populate('userId', 'name email')
      .populate('scriptId', 'title');
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Send request to user (admin can send requests)
router.post('/requests', adminAuth, async (req, res) => {
  try {
    const { userId, type, message, scriptId } = req.body;
    const request = new Request({
      userId,
      type,
      message,
      scriptId,
      status: 'pending'
    });
    await request.save();
    res.status(201).json(request);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update request status
router.put('/requests/:id', adminAuth, async (req, res) => {
  try {
    const { status } = req.body;
    const request = await Request.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    res.json(request);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create chatroom (enable chat for a project)
router.post('/chatrooms', adminAuth, async (req, res) => {
  try {
    console.log('Create chatroom request:', req.body);
    const { projectId, name, endTime } = req.body;

    if (!projectId) {
      return res.status(400).json({ message: 'Project ID is required' });
    }

    // Validate project exists
    const project = await Script.findById(projectId);
    if (!project) {
      console.log('Project not found:', projectId);
      return res.status(404).json({ message: 'Project not found' });
    }

    console.log('Found project:', project.title);

    // Get all users
    const allUsers = await User.find({}, '_id');
    const userIds = allUsers.map(user => user._id);

    // Update project with chat settings and add all users as participants
    const updateData = {
      participants: userIds
    };
    if (name) updateData.chatName = name;
    if (endTime) updateData.chatEndTime = new Date(endTime);

    console.log('Update data:', updateData);

    const updatedProject = await Script.findByIdAndUpdate(projectId, updateData, { new: true });
    console.log('Updated project:', updatedProject.chatName);

    res.status(201).json({
      message: 'Chatroom created successfully',
      projectId,
      name,
      endTime,
      participantsCount: userIds.length
    });
  } catch (error) {
    console.error('Create chatroom error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get all chatrooms/projects with messages
router.get('/chatrooms', adminAuth, async (req, res) => {
  try {
    const chatrooms = await ChatMessage.aggregate([
      {
        $group: {
          _id: '$projectId',
          messageCount: { $sum: 1 },
          lastMessage: { $last: '$message' },
          lastMessageTime: { $last: '$createdAt' },
          participants: { $addToSet: '$sender' }
        }
      },
      {
        $lookup: {
          from: 'scripts',
          localField: '_id',
          foreignField: '_id',
          as: 'script'
        }
      },
      {
        $unwind: { path: '$script', preserveNullAndEmptyArrays: true }
      },
      {
        $project: {
          projectId: '$_id',
          chatName: '$script.chatName',
          title: '$script.title',
          chatEndTime: '$script.chatEndTime',
          messageCount: 1,
          lastMessage: 1,
          lastMessageTime: 1,
          participantCount: { $size: '$participants' },
          reportedCount: { $sum: { $cond: ['$reported', 1, 0] } }
        }
      }
    ]);
    res.json(chatrooms);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create chatroom timer (set end time)
router.post('/chatrooms/:projectId/timer', adminAuth, async (req, res) => {
  try {
    const { endTime } = req.body;
    // This would require adding a timer field to projects
    // For now, we'll store it in a simple way
    const project = await Script.findByIdAndUpdate(
      req.params.projectId,
      { chatEndTime: new Date(endTime) },
      { new: true }
    );
    res.json(project);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// End chatroom (delete all messages or mark as ended)
router.delete('/chatrooms/:projectId', adminAuth, async (req, res) => {
  try {
    await ChatMessage.deleteMany({ projectId: req.params.projectId });
    res.json({ message: 'Chatroom ended and messages deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create movie chatroom
router.post('/movie-chatrooms', adminAuth, async (req, res) => {
  try {
    const { movieName, endTime } = req.body;

    if (!movieName) {
      return res.status(400).json({ message: 'Movie name is required' });
    }

    // Check if chatroom already exists for this movie name
    const existingChatroom = await MovieChatroom.findOne({ movieName, isActive: true });
    if (existingChatroom) {
      return res.status(400).json({ message: 'Chatroom already exists for this movie name' });
    }

    // Create new movie chatroom
    const movieChatroom = new MovieChatroom({
      movieName,
      endTime: endTime ? new Date(endTime) : null
    });

    await movieChatroom.save();

    res.status(201).json({
      message: 'Movie chatroom created successfully',
      chatroom: movieChatroom
    });
  } catch (error) {
    console.error('Create movie chatroom error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get all movie chatrooms
router.get('/movie-chatrooms', async (req, res) => {
  try {
    const movieChatrooms = await MovieChatroom.find({ isActive: true })
      .sort({ createdAt: -1 });
    res.json(movieChatrooms);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Crowdfunding management routes

// Get all crowdfunding campaigns
router.get('/crowdfunding', adminAuth, async (req, res) => {
  try {
    const campaigns = await Crowdfunding.find()
      .populate('script', 'title author genre category averageRating')
      .populate('createdBy', 'name email')
      .populate('backers', 'name email')
      .sort({ createdAt: -1 });

    const campaignsWithDetails = campaigns.map(campaign => ({
      _id: campaign._id,
      title: campaign.title,
      description: campaign.description,
      script: campaign.script,
      goalAmount: campaign.goalAmount,
      currentAmount: campaign.currentAmount,
      progressPercentage: campaign.progressPercentage,
      totalBackers: campaign.totalBackers,
      status: campaign.status,
      endDate: campaign.endDate,
      createdBy: campaign.createdBy,
      createdAt: campaign.createdAt,
      contributions: campaign.contributions.length
    }));

    res.json(campaignsWithDetails);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get crowdfunding stats
router.get('/crowdfunding/stats', adminAuth, async (req, res) => {
  try {
    const totalCampaigns = await Crowdfunding.countDocuments();
    const activeCampaigns = await Crowdfunding.countDocuments({ status: 'active' });
    const completedCampaigns = await Crowdfunding.countDocuments({ status: 'completed' });
    const totalRaised = await Crowdfunding.aggregate([
      { $group: { _id: null, total: { $sum: '$currentAmount' } } }
    ]);

    const totalBackers = await Crowdfunding.aggregate([
      { $unwind: '$backers' },
      { $group: { _id: '$backers' } },
      { $count: 'uniqueBackers' }
    ]);

    res.json({
      totalCampaigns,
      activeCampaigns,
      completedCampaigns,
      totalRaised: totalRaised.length > 0 ? totalRaised[0].total : 0,
      totalBackers: totalBackers.length > 0 ? totalBackers[0].uniqueBackers : 0
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get scripts available for crowdfunding
router.get('/crowdfunding/available-scripts', adminAuth, async (req, res) => {
  try {
    // Get approved scripts that don't have active crowdfunding campaigns
    const activeCampaignScriptIds = await Crowdfunding.find({ status: 'active' }).distinct('script');
    const scripts = await Script.find({
      status: 'approved',
      _id: { $nin: activeCampaignScriptIds }
    })
    .populate('uploadedBy', 'name email')
    .sort({ averageRating: -1, 'ratings.length': -1 })
    .limit(50);

    const scriptsWithDetails = scripts.map(script => ({
      _id: script._id,
      title: script.title,
      author: script.author,
      genre: script.genre,
      category: script.category,
      averageRating: script.averageRating,
      totalRatings: script.ratings.length,
      uploadedBy: script.uploadedBy,
      createdAt: script.createdAt
    }));

    res.json(scriptsWithDetails);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create crowdfunding campaign
router.post('/crowdfunding', adminAuth, async (req, res) => {
  try {
    const { scriptId, title, description, goalAmount, endDate } = req.body;

    // Validate script exists and is approved
    const script = await Script.findById(scriptId);
    if (!script || script.status !== 'approved') {
      return res.status(400).json({ message: 'Invalid or unapproved script' });
    }

    // Check if script already has an active campaign
    const existingCampaign = await Crowdfunding.findOne({ script: scriptId, status: 'active' });
    if (existingCampaign) {
      return res.status(400).json({ message: 'Script already has an active crowdfunding campaign' });
    }

    const campaign = new Crowdfunding({
      script: scriptId,
      title,
      description,
      goalAmount,
      endDate: endDate ? new Date(endDate) : null,
      createdBy: req.user._id
    });

    await campaign.save();

    // Populate the response
    await campaign.populate('script', 'title author genre category averageRating');
    await campaign.populate('createdBy', 'name email');

    res.status(201).json({
      message: 'Crowdfunding campaign created successfully',
      campaign
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get crowdfunding campaign details
router.get('/crowdfunding/:id', adminAuth, async (req, res) => {
  try {
    const campaign = await Crowdfunding.findById(req.params.id)
      .populate('script', 'title author genre category averageRating')
      .populate('createdBy', 'name email')
      .populate('backers', 'name email')
      .populate('contributions.user', 'name email');

    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    res.json(campaign);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update crowdfunding campaign
router.put('/crowdfunding/:id', adminAuth, async (req, res) => {
  try {
    const { title, description, goalAmount, endDate, status } = req.body;

    const campaign = await Crowdfunding.findByIdAndUpdate(
      req.params.id,
      {
        title,
        description,
        goalAmount,
        endDate: endDate ? new Date(endDate) : null,
        status,
        updatedAt: new Date()
      },
      { new: true }
    )
    .populate('script', 'title author genre category averageRating')
    .populate('createdBy', 'name email');

    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    res.json(campaign);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete crowdfunding campaign
router.delete('/crowdfunding/:id', adminAuth, async (req, res) => {
  try {
    const campaign = await Crowdfunding.findByIdAndDelete(req.params.id);

    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    res.json({ message: 'Campaign deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get user contributions for a campaign
router.get('/crowdfunding/:id/contributions', adminAuth, async (req, res) => {
  try {
    const campaign = await Crowdfunding.findById(req.params.id)
      .populate('contributions.user', 'name email')
      .select('contributions');

    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    res.json(campaign.contributions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get user's crowdfunding dashboard
router.get('/crowdfunding/user/:userId/dashboard', adminAuth, async (req, res) => {
  try {
    const userId = req.params.userId;

    // Get user's contributions
    const contributions = await Crowdfunding.getUserContributions(userId);

    // Get campaigns user has backed
    const backedCampaigns = await Crowdfunding.find({ 'contributions.user': userId })
      .populate('script', 'title author genre category averageRating')
      .select('title currentAmount goalAmount status endDate contributions.$');

    // Calculate user's total contributions
    const totalContributed = contributions.reduce((sum, campaign) => {
      const userContributions = campaign.contributions.filter(c => c.user.toString() === userId);
      return sum + userContributions.reduce((campaignSum, contrib) => campaignSum + contrib.amount, 0);
    }, 0);

    // Get campaigns created by user
    const createdCampaigns = await Crowdfunding.find({ createdBy: userId })
      .populate('script', 'title author genre category averageRating')
      .sort({ createdAt: -1 });

    res.json({
      userId,
      totalContributed,
      totalBackedCampaigns: backedCampaigns.length,
      totalCreatedCampaigns: createdCampaigns.length,
      contributions,
      backedCampaigns,
      createdCampaigns
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Export crowdfunding data
router.get('/crowdfunding/export', adminAuth, async (req, res) => {
  try {
    const campaigns = await Crowdfunding.find()
      .populate('script', 'title author')
      .populate('createdBy', 'name email')
      .populate('backers', 'name email')
      .sort({ createdAt: -1 });

    const exportData = campaigns.map(campaign => ({
      title: campaign.title,
      scriptTitle: campaign.script.title,
      scriptAuthor: campaign.script.author,
      goalAmount: campaign.goalAmount,
      currentAmount: campaign.currentAmount,
      progressPercentage: campaign.progressPercentage,
      totalBackers: campaign.totalBackers,
      status: campaign.status,
      createdBy: campaign.createdBy.name,
      createdAt: campaign.createdAt,
      contributions: campaign.contributions.map(c => ({
        user: c.user.name,
        amount: c.amount,
        message: c.message,
        anonymous: c.anonymous,
        createdAt: c.createdAt
      }))
    }));

    res.json(exportData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get platform analytics
router.get('/analytics', adminAuth, async (req, res) => {
  try {
    console.log('Analytics endpoint called');

    // Total users
    const totalUsers = await User.countDocuments();
    console.log('Total users:', totalUsers);

    // Active users (logged in within last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const activeUsers = await User.countDocuments({ lastLogin: { $gte: thirtyDaysAgo } });
    console.log('Active users:', activeUsers);

    // Total content
    const totalScripts = await Script.countDocuments();
    const totalFilms = await ShortFilm.countDocuments();
    const totalContent = totalScripts + totalFilms;
    console.log('Total content:', totalContent);

    // Total messages
    const totalMessages = await ChatMessage.countDocuments();
    console.log('Total messages:', totalMessages);

    // User growth data (last 12 months) - simplified
    const userGrowthData = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const count = await User.countDocuments({
        createdAt: { $gte: startOfMonth, $lt: endOfMonth }
      });

      userGrowthData.push({
        month: startOfMonth.toLocaleString('default', { month: 'short', year: 'numeric' }),
        users: count
      });
    }

    // Content trends data (last 12 months) - simplified
    const contentTrendsData = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const scriptCount = await Script.countDocuments({
        createdAt: { $gte: startOfMonth, $lt: endOfMonth }
      });
      const filmCount = await ShortFilm.countDocuments({
        createdAt: { $gte: startOfMonth, $lt: endOfMonth }
      });

      contentTrendsData.push({
        month: startOfMonth.toLocaleString('default', { month: 'short', year: 'numeric' }),
        uploads: scriptCount + filmCount
      });
    }

    // Chat activity data (last 7 days) - simplified
    const chatActivityData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);

      const count = await ChatMessage.countDocuments({
        createdAt: { $gte: startOfDay, $lt: endOfDay }
      });

      chatActivityData.push({
        day: startOfDay.toLocaleString('default', { weekday: 'short' }),
        messages: count
      });
    }

    const analyticsData = {
      totalUsers,
      activeUsers,
      totalContent,
      totalViews: 0, // Placeholder
      totalMessages,
      averageRating: 0, // Placeholder
      userGrowthData,
      contentTrendsData,
      chatActivityData
    };

    console.log('Analytics data prepared:', analyticsData);
    res.json(analyticsData);
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get top performing content
router.get('/top-content', adminAuth, async (req, res) => {
  try {
    // Get top scripts and films (placeholder - would need view/like tracking)
    const scripts = await Script.find()
      .populate('uploadedBy', 'name')
      .sort({ createdAt: -1 })
      .limit(10);

    const films = await ShortFilm.find()
      .populate('uploadedBy', 'name')
      .sort({ createdAt: -1 })
      .limit(10);

    const topContent = [
      ...scripts.map(s => ({ ...s.toObject(), type: 'script' })),
      ...films.map(f => ({ ...f.toObject(), type: 'film' }))
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 10);

    res.json(topContent);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get script rankings
router.get('/script-rankings', adminAuth, async (req, res) => {
  try {
    const { period = 'all-time', limit = 50 } = req.query;

    // Get all approved scripts with ratings
    const scripts = await Script.find({ status: 'approved' })
      .populate('uploadedBy', 'name email')
      .populate('ratings.user', 'name');

    // Calculate rankings based on average rating and number of ratings
    const rankedScripts = scripts
      .map(script => ({
        ...script.toObject(),
        averageRating: script.averageRating,
        totalRatings: script.ratings.length,
        score: script.averageRating * Math.log(script.ratings.length + 1) // Weighted score
      }))
      .filter(script => script.totalRatings > 0) // Only include scripts with ratings
      .sort((a, b) => b.score - a.score) // Sort by score descending
      .slice(0, parseInt(limit));

    // Add rank positions
    const rankedScriptsWithPosition = rankedScripts.map((script, index) => ({
      ...script,
      rank: index + 1
    }));

    res.json({
      period,
      totalRankedScripts: rankedScriptsWithPosition.length,
      rankings: rankedScriptsWithPosition
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get script ratings details
router.get('/script-ratings/:scriptId', adminAuth, async (req, res) => {
  try {
    const script = await Script.findById(req.params.scriptId)
      .populate('uploadedBy', 'name email')
      .populate('ratings.user', 'name email');

    if (!script) {
      return res.status(404).json({ message: 'Script not found' });
    }

    const ratingsBreakdown = {
      1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0
    };

    script.ratings.forEach(rating => {
      ratingsBreakdown[rating.points] = (ratingsBreakdown[rating.points] || 0) + 1;
    });

    res.json({
      script: {
        id: script._id,
        title: script.title,
        author: script.author,
        averageRating: script.averageRating,
        totalRatings: script.ratings.length
      },
      ratingsBreakdown,
      individualRatings: script.ratings.map(rating => ({
        user: rating.user.name,
        email: rating.user.email,
        points: rating.points,
        createdAt: rating.createdAt
      }))
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Export analytics data
router.get('/analytics/export', adminAuth, async (req, res) => {
  try {
    // Get the same data as the analytics endpoint
    const totalUsers = await User.countDocuments();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const activeUsers = await User.countDocuments({ lastLogin: { $gte: thirtyDaysAgo } });
    const totalScripts = await Script.countDocuments();
    const totalFilms = await ShortFilm.countDocuments();
    const totalContent = totalScripts + totalFilms;
    const totalMessages = await ChatMessage.countDocuments();

    const analytics = {
      totalUsers,
      activeUsers,
      totalContent,
      totalScripts,
      totalFilms,
      totalMessages,
      exportedAt: new Date()
    };

    res.json(analytics);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Generate system report
router.get('/reports/generate', adminAuth, async (req, res) => {
  try {
    const { range = 30, type = 'all' } = req.query;
    const days = parseInt(range);
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    let reportData = {};

    // Basic stats
    reportData.totalUsers = await User.countDocuments();
    reportData.totalContent = await Script.countDocuments() + await ShortFilm.countDocuments();
    reportData.totalMessages = await ChatMessage.countDocuments({ createdAt: { $gte: startDate } });
    reportData.totalReports = await Report.countDocuments({ createdAt: { $gte: startDate } });

    // Filter by type if specified
    if (type === 'users' || type === 'all') {
      reportData.newUsers = await User.countDocuments({ createdAt: { $gte: startDate } });
      reportData.activeUsers = await User.countDocuments({ lastLogin: { $gte: startDate } });
    }

    if (type === 'content' || type === 'all') {
      reportData.newContent = await Script.countDocuments({ createdAt: { $gte: startDate } }) +
                              await ShortFilm.countDocuments({ createdAt: { $gte: startDate } });
      reportData.pendingApprovals = await Script.countDocuments({ status: 'pending', createdAt: { $gte: startDate } }) +
                                   await ShortFilm.countDocuments({ status: 'pending', createdAt: { $gte: startDate } });
    }

    if (type === 'chat' || type === 'all') {
      reportData.chatMessages = await ChatMessage.countDocuments({ createdAt: { $gte: startDate } });
      reportData.reportedMessages = await ChatMessage.countDocuments({ reported: true, createdAt: { $gte: startDate } });
    }

    if (type === 'system' || type === 'all') {
      reportData.systemHealth = {
        database: 'operational',
        server: 'operational',
        uptime: process.uptime(),
        memory: process.memoryUsage()
      };
    }

    res.json(reportData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get user activity report
router.get('/reports/users', adminAuth, async (req, res) => {
  try {
    const { range = 30 } = req.query;
    const days = parseInt(range);
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const users = await User.find({
      $or: [
        { createdAt: { $gte: startDate } },
        { lastLogin: { $gte: startDate } }
      ]
    })
    .select('name email createdAt lastLogin isBlocked loginCount')
    .sort({ createdAt: -1 })
    .limit(100);

    // Get content count and message count for each user
    const usersWithActivity = await Promise.all(users.map(async (user) => {
      const contentCount = await Script.countDocuments({ uploadedBy: user._id });
      const messageCount = await ChatMessage.countDocuments({ sender: user._id });

      return {
        ...user.toObject(),
        loginCount: user.loginCount || 0,
        contentCount,
        messageCount
      };
    }));

    res.json(usersWithActivity);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get content performance report
router.get('/reports/content', adminAuth, async (req, res) => {
  try {
    const { range = 30 } = req.query;
    const days = parseInt(range);
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const scripts = await Script.find({ createdAt: { $gte: startDate } })
      .populate('uploadedBy', 'name')
      .sort({ createdAt: -1 })
      .limit(50);

    const films = await ShortFilm.find({ createdAt: { $gte: startDate } })
      .populate('uploadedBy', 'name')
      .sort({ createdAt: -1 })
      .limit(50);

    const content = [
      ...scripts.map(s => ({ ...s.toObject(), type: 'script' })),
      ...films.map(f => ({ ...f.toObject(), type: 'film' }))
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 100);

    // Add performance metrics with real data
    const contentWithMetrics = content.map(item => ({
      ...item,
      views: item.views || 0,
      likes: item.likes || 0,
      comments: item.comments ? item.comments.length : 0
    }));

    res.json(contentWithMetrics);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get system health report
router.get('/reports/system-health', adminAuth, async (req, res) => {
  try {
    const healthMetrics = [
      {
        name: 'Database Connection',
        value: 'Connected',
        status: 'good',
        lastUpdated: new Date()
      },
      {
        name: 'Server Uptime',
        value: `${Math.floor(process.uptime() / 3600)}h ${Math.floor((process.uptime() % 3600) / 60)}m`,
        status: 'good',
        lastUpdated: new Date()
      },
      {
        name: 'Memory Usage',
        value: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`,
        status: process.memoryUsage().heapUsed > 500 * 1024 * 1024 ? 'warning' : 'good',
        lastUpdated: new Date()
      },
      {
        name: 'Active Users',
        value: 'Monitoring...',
        status: 'good',
        lastUpdated: new Date()
      }
    ];

    res.json(healthMetrics);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Export system report
router.get('/reports/export', adminAuth, async (req, res) => {
  try {
    const { range = 30, type = 'all', format = 'json' } = req.query;

    // Generate report data
    const reportData = await generateReportData(range, type);

    if (format === 'json') {
      res.json(reportData);
    } else if (format === 'csv') {
      // Convert to CSV format
      const csvContent = convertToCSV(reportData);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="system_report.csv"');
      res.send(csvContent);
    } else {
      res.status(400).json({ message: 'Unsupported format. Use json or csv.' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Helper function to generate report data
async function generateReportData(range, type) {
  const days = parseInt(range);
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const reportData = {
    generatedAt: new Date(),
    dateRange: `${startDate.toISOString().split('T')[0]} to ${new Date().toISOString().split('T')[0]}`,
    type: type
  };

  // Add relevant data based on type
  if (type === 'users' || type === 'all') {
    reportData.users = await User.find({ createdAt: { $gte: startDate } })
      .select('name email createdAt lastLogin')
      .sort({ createdAt: -1 });
  }

  if (type === 'content' || type === 'all') {
    const scripts = await Script.find({ createdAt: { $gte: startDate } });
    const films = await ShortFilm.find({ createdAt: { $gte: startDate } });
    reportData.content = [...scripts, ...films];
  }

  if (type === 'chat' || type === 'all') {
    reportData.messages = await ChatMessage.find({ createdAt: { $gte: startDate } })
      .populate('sender', 'name')
      .sort({ createdAt: -1 })
      .limit(1000);
  }

  return reportData;
}

// Helper function to convert data to CSV
function convertToCSV(data) {
  // Simple CSV conversion - would need more sophisticated implementation for complex data
  let csv = 'Key,Value\n';
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'object' && !Array.isArray(value)) {
      csv += `${key},\n`;
      for (const [subKey, subValue] of Object.entries(value)) {
        csv += `  ${subKey},${subValue}\n`;
      }
    } else {
      csv += `${key},${value}\n`;
    }
  }
  return csv;
}

// Get read lists stats
router.get('/read-lists/stats', adminAuth, async (req, res) => {
  try {
    const totalReadLists = await User.countDocuments({ readList: { $exists: true, $ne: [] } });
    const totalScriptsInLists = await User.aggregate([
      { $unwind: '$readList' },
      { $group: { _id: null, count: { $sum: 1 } } }
    ]);
    const averageScriptsPerUser = totalScriptsInLists.length > 0 ?
      (totalScriptsInLists[0].count / totalReadLists).toFixed(1) : 0;

    // Most popular script
    const mostPopularScript = await User.aggregate([
      { $unwind: '$readList' },
      { $group: { _id: '$readList', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 1 }
    ]);

    res.json({
      totalReadLists,
      totalScriptsInLists: totalScriptsInLists.length > 0 ? totalScriptsInLists[0].count : 0,
      averageScriptsPerUser: parseFloat(averageScriptsPerUser),
      mostPopularScript: mostPopularScript.length > 0 ? mostPopularScript[0] : null
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get users' read lists
router.get('/read-lists/users', adminAuth, async (req, res) => {
  try {
    const users = await User.find({ readList: { $exists: true, $ne: [] } })
      .select('name email readList createdAt updatedAt')
      .populate('readList', 'title author')
      .sort({ 'readList.length': -1 });

    const usersWithStats = users.map(user => ({
      _id: user._id,
      name: user.name,
      email: user.email,
      readListCount: user.readList.length,
      totalScriptsRead: user.readList.length,
      lastActivity: user.updatedAt,
      readList: user.readList
    }));

    res.json(usersWithStats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get popular scripts (most added to read lists)
router.get('/read-lists/popular', adminAuth, async (req, res) => {
  try {
    const popularScripts = await User.aggregate([
      { $unwind: '$readList' },
      { $group: { _id: '$readList', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 },
      {
        $lookup: {
          from: 'scripts',
          localField: '_id',
          foreignField: '_id',
          as: 'script'
        }
      },
      { $unwind: '$script' },
      {
        $project: {
          _id: '$script._id',
          title: '$script.title',
          author: '$script.author',
          genre: '$script.genre',
          status: '$script.status',
          readCount: '$count'
        }
      }
    ]);

    res.json(popularScripts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Export read lists data
router.get('/read-lists/export', adminAuth, async (req, res) => {
  try {
    const users = await User.find({ readList: { $exists: true, $ne: [] } })
      .select('name email readList createdAt updatedAt')
      .populate('readList', 'title author genre')
      .sort({ 'readList.length': -1 });

    const exportData = users.map(user => ({
      name: user.name,
      email: user.email,
      readListCount: user.readList.length,
      lastActivity: user.updatedAt,
      scripts: user.readList.map(script => ({
        title: script.title,
        author: script.author,
        genre: script.genre
      }))
    }));

    res.json(exportData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get scripts ratings data
router.get('/scripts-ratings', adminAuth, async (req, res) => {
  try {
    const scripts = await Script.find({ 'ratings.0': { $exists: true } })
      .populate('uploadedBy', 'name')
      .sort({ 'ratings.length': -1, averageRating: -1 });

    const scriptsWithRatings = scripts.map(script => ({
      _id: script._id,
      title: script.title,
      author: script.author,
      genre: script.genre,
      category: script.category,
      averageRating: script.averageRating,
      totalRatings: script.ratings.length,
      status: script.status,
      createdAt: script.createdAt
    }));

    res.json(scriptsWithRatings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get scripts ratings stats
router.get('/scripts-ratings/stats', adminAuth, async (req, res) => {
  try {
    const totalRatedScripts = await Script.countDocuments({ 'ratings.0': { $exists: true } });
    const totalRatings = await Script.aggregate([
      { $unwind: '$ratings' },
      { $group: { _id: null, count: { $sum: 1 } } }
    ]);

    const averageRating = await Script.aggregate([
      { $match: { 'ratings.0': { $exists: true } } },
      {
        $group: {
          _id: null,
          avgRating: { $avg: { $avg: '$ratings.points' } },
          totalScripts: { $sum: 1 }
        }
      }
    ]);

    res.json({
      totalRatedScripts,
      totalRatings: totalRatings.length > 0 ? totalRatings[0].count : 0,
      averageRating: averageRating.length > 0 ? averageRating[0].avgRating.toFixed(1) : 0
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Export scripts ratings data
router.get('/scripts-ratings/export', adminAuth, async (req, res) => {
  try {
    const scripts = await Script.find({ 'ratings.0': { $exists: true } })
      .populate('uploadedBy', 'name')
      .populate('ratings.user', 'name email')
      .sort({ 'ratings.length': -1, averageRating: -1 });

    const exportData = scripts.map(script => ({
      title: script.title,
      author: script.author,
      genre: script.genre,
      category: script.category,
      averageRating: script.averageRating,
      totalRatings: script.ratings.length,
      status: script.status,
      ratings: script.ratings.map(rating => ({
        user: rating.user.name,
        email: rating.user.email,
        points: rating.points,
        createdAt: rating.createdAt
      }))
    }));

    res.json(exportData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get system logs
router.get('/logs', adminAuth, async (req, res) => {
  try {
    const { level, timeRange, category, limit = 100 } = req.query;

    // Calculate date range
    let dateFilter = {};
    if (timeRange) {
      const hours = parseInt(timeRange);
      const startDate = new Date(Date.now() - hours * 60 * 60 * 1000);
      dateFilter.createdAt = { $gte: startDate };
    }

    // Build filter object
    let filter = { ...dateFilter };

    if (level && level !== 'all') {
      filter.level = level;
    }

    if (category && category !== 'all') {
      filter.category = category;
    }

    const logs = await AdminLogs.find(filter)
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json(logs);
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ message: error.message });
  }
});

// Export system logs
router.get('/logs/export', adminAuth, async (req, res) => {
  try {
    const logs = await AdminLogs.find()
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(1000); // Limit export to last 1000 logs

    const exportData = logs.map(log => ({
      timestamp: log.createdAt,
      level: log.level,
      category: log.category,
      message: log.message,
      user: log.user ? { name: log.user.name, email: log.user.email } : null,
      details: log.details
    }));

    res.json(exportData);
  } catch (error) {
    console.error('Error exporting logs:', error);
    res.status(500).json({ message: error.message });
  }
});

// Clear system logs
router.delete('/logs', adminAuth, async (req, res) => {
  try {
    await AdminLogs.deleteMany({});
    res.json({ message: 'All system logs cleared successfully' });
  } catch (error) {
    console.error('Error clearing logs:', error);
    res.status(500).json({ message: error.message });
  }
});

// Post-Production Routes

// Get post-production stats
router.get('/post-production/stats', adminAuth, async (req, res) => {
  try {
    const totalScripts = await Script.countDocuments({ status: 'approved' });
    const totalShortFilms = await ShortFilm.countDocuments();
    const completedFilms = await ShortFilm.countDocuments({ status: 'completed' });

    // Calculate average budget
    const filmsWithBudget = await ShortFilm.find({ 'budget.amount': { $exists: true } });
    const averageBudget = filmsWithBudget.length > 0 ?
      filmsWithBudget.reduce((sum, film) => sum + (film.budget.amount || 0), 0) / filmsWithBudget.length : 0;

    res.json({
      totalScripts,
      totalShortFilms,
      completedFilms,
      averageBudget: Math.round(averageBudget)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get top rated scripts for production
router.get('/post-production/top-scripts', adminAuth, async (req, res) => {
  try {
    const scripts = await Script.find({ status: 'approved' })
      .populate('uploadedBy', 'name')
      .sort({ averageRating: -1, 'ratings.length': -1 })
      .limit(20);

    const scriptsWithDetails = scripts.map(script => ({
      _id: script._id,
      title: script.title,
      author: script.author,
      genre: script.genre,
      category: script.category,
      averageRating: script.averageRating,
      totalRatings: script.ratings.length,
      status: script.status,
      createdAt: script.createdAt
    }));

    res.json(scriptsWithDetails);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get short films in production
router.get('/post-production/short-films', adminAuth, async (req, res) => {
  try {
    const films = await ShortFilm.find()
      .populate('uploadedBy', 'name')
      .populate({
        path: 'selectedScript',
        select: 'title author',
        model: 'Script'
      })
      .sort({ createdAt: -1 });

    const filmsWithDetails = films.map(film => ({
      _id: film._id,
      title: film.title,
      scriptTitle: film.selectedScript ? film.selectedScript.title : 'N/A',
      director: film.team && film.team.director ? film.team.director.name : 'Not assigned',
      budget: film.budget ? film.budget.amount : 0,
      status: film.status,
      progress: film.progress || 0,
      createdAt: film.createdAt
    }));

    res.json(filmsWithDetails);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create short film
router.post('/post-production/short-films', adminAuth, async (req, res) => {
  try {
    const { scriptId, title, director, budget } = req.body;

    // Verify script exists
    const script = await Script.findById(scriptId);
    if (!script) {
      return res.status(404).json({ message: 'Script not found' });
    }

    const shortFilm = new ShortFilm({
      title,
      selectedScript: scriptId,
      team: {
        director: director
      },
      budget: {
        amount: budget
      },
      status: 'in-production',
      progress: 0,
      uploadedBy: req.user.id
    });

    await shortFilm.save();

    res.status(201).json(shortFilm);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update short film progress
router.put('/post-production/short-films/:id', adminAuth, async (req, res) => {
  try {
    const { progress } = req.body;

    const film = await ShortFilm.findByIdAndUpdate(
      req.params.id,
      { progress: parseInt(progress) },
      { new: true }
    );

    if (!film) {
      return res.status(404).json({ message: 'Film not found' });
    }

    res.json(film);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete short film
router.delete('/post-production/short-films/:id', adminAuth, async (req, res) => {
  try {
    const film = await ShortFilm.findByIdAndDelete(req.params.id);

    if (!film) {
      return res.status(404).json({ message: 'Film not found' });
    }

    res.json({ message: 'Film deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Export post-production data
router.get('/post-production/export', adminAuth, async (req, res) => {
  try {
    const scripts = await Script.find({ status: 'approved' })
      .sort({ averageRating: -1 })
      .limit(20);

    const films = await ShortFilm.find()
      .populate('selectedScript', 'title')
      .sort({ createdAt: -1 });

    res.json({
      scripts: scripts.map(script => ({
        title: script.title,
        author: script.author,
        averageRating: script.averageRating,
        totalRatings: script.ratings.length,
        status: script.status
      })),
      films: films.map(film => ({
        title: film.title,
        director: film.team && film.team.director ? film.team.director.name : 'N/A',
        budget: film.budget ? film.budget.amount : 0,
        status: film.status,
        progress: film.progress || 0
      }))
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Post-Production Workflow Routes

// Get top ranked scripts for post-production
router.get('/post-production/scripts', adminAuth, async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    // Get top ranked scripts
    const topScripts = await Script.find({ status: 'approved' })
      .populate('uploadedBy', 'name email')
      .populate('ratings.user', 'name')
      .sort({ averageRating: -1, 'ratings.length': -1 })
      .limit(parseInt(limit));

    const scriptsWithDetails = topScripts.map(script => ({
      _id: script._id,
      title: script.title,
      author: script.author,
      genre: script.genre,
      category: script.category,
      averageRating: script.averageRating,
      totalRatings: script.ratings.length,
      uploadedBy: script.uploadedBy,
      createdAt: script.createdAt
    }));

    res.json(scriptsWithDetails);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create short film from selected script
router.post('/post-production/create-film', adminAuth, async (req, res) => {
  try {
    const { scriptId, title, description, genre } = req.body;

    // Verify script exists and is approved
    const script = await Script.findById(scriptId);
    if (!script || script.status !== 'approved') {
      return res.status(400).json({ message: 'Invalid or unapproved script' });
    }

    // Create short film for post-production
    const shortFilm = new ShortFilm({
      title: title || script.title,
      description: description || script.description,
      genre: genre || script.genre,
      isPostProduction: true,
      selectedScript: scriptId,
      team: {
        scriptwriter: script.uploadedBy
      },
      status: 'in-production',
      uploadedBy: req.user.id // Admin who created it
    });

    await shortFilm.save();

    // Populate the response
    await shortFilm.populate('selectedScript', 'title author');
    await shortFilm.populate('team.scriptwriter', 'name email');

    res.status(201).json({
      message: 'Short film created for post-production',
      shortFilm
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get post-production projects
router.get('/post-production/projects', adminAuth, async (req, res) => {
  try {
    const projects = await ShortFilm.find({ isPostProduction: true })
      .populate('selectedScript', 'title author genre')
      .populate('team.director', 'name email')
      .populate('team.actors', 'name email')
      .populate('team.scriptwriter', 'name email')
      .populate('uploadedBy', 'name email')
      .sort({ createdAt: -1 });

    res.json(projects);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update team for post-production project
router.put('/post-production/:projectId/team', adminAuth, async (req, res) => {
  try {
    const { director, actors } = req.body;

    const updateData = {
      'team.director': director,
      'team.actors': actors,
      'workflow.directorAssigned': !!director,
      'workflow.teamFormed': !!(director && actors && actors.length > 0)
    };

    const project = await ShortFilm.findByIdAndUpdate(
      req.params.projectId,
      updateData,
      { new: true }
    )
    .populate('selectedScript', 'title author')
    .populate('team.director', 'name email')
    .populate('team.actors', 'name email')
    .populate('team.scriptwriter', 'name email');

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    res.json(project);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Send approval request to scriptwriter
router.post('/post-production/:projectId/request-approval', adminAuth, async (req, res) => {
  try {
    const { message } = req.body;

    const project = await ShortFilm.findById(req.params.projectId)
      .populate('team.scriptwriter', 'name email')
      .populate('selectedScript', 'title');

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Create request to scriptwriter
    const request = new Request({
      userId: project.team.scriptwriter._id,
      type: 'scriptwriter-approval',
      message: message || `Your script "${project.selectedScript.title}" has been selected for post-production. Please review and approve the project details.`,
      scriptId: project.selectedScript._id,
      status: 'pending'
    });

    await request.save();

    // Update project workflow
    project.workflow.scriptwriterApproval.requested = true;
    await project.save();

    res.json({
      message: 'Approval request sent to scriptwriter',
      request,
      project
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Handle scriptwriter approval response
router.put('/post-production/:projectId/scriptwriter-approval', adminAuth, async (req, res) => {
  try {
    const { approved, notes } = req.body;

    const project = await ShortFilm.findById(req.params.projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    project.workflow.scriptwriterApproval.approved = approved;
    project.workflow.scriptwriterApproval.responseDate = new Date();
    project.workflow.scriptwriterApproval.notes = notes;

    await project.save();

    res.json({
      message: `Scriptwriter ${approved ? 'approved' : 'declined'} the project`,
      project
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Set budget and director for project
router.put('/post-production/:projectId/budget-director', adminAuth, async (req, res) => {
  try {
    const { budgetAmount, director } = req.body;

    const updateData = {
      'budget.amount': budgetAmount,
      'budget.approved': true,
      'team.director': director,
      'workflow.budgetSet': true,
      'workflow.directorAssigned': true
    };

    const project = await ShortFilm.findByIdAndUpdate(
      req.params.projectId,
      updateData,
      { new: true }
    )
    .populate('selectedScript', 'title author')
    .populate('team.director', 'name email')
    .populate('team.scriptwriter', 'name email');

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    res.json(project);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Start production
router.put('/post-production/:projectId/start-production', adminAuth, async (req, res) => {
  try {
    const { startDate, endDate, location, equipment, notes } = req.body;

    const project = await ShortFilm.findByIdAndUpdate(
      req.params.projectId,
      {
        'productionDetails.startDate': startDate,
        'productionDetails.endDate': endDate,
        'productionDetails.location': location,
        'productionDetails.equipment': equipment,
        'productionDetails.notes': notes,
        'workflow.productionStarted': true,
        status: 'in-production'
      },
      { new: true }
    )
    .populate('selectedScript', 'title author')
    .populate('team.director', 'name email')
    .populate('team.actors', 'name email')
    .populate('team.scriptwriter', 'name email');

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    res.json({
      message: 'Production started successfully',
      project
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Complete project
router.put('/post-production/:projectId/complete', adminAuth, async (req, res) => {
  try {
    const project = await ShortFilm.findByIdAndUpdate(
      req.params.projectId,
      {
        'workflow.completed': true,
        status: 'completed',
        updatedAt: new Date()
      },
      { new: true }
    )
    .populate('selectedScript', 'title author')
    .populate('team.director', 'name email')
    .populate('team.actors', 'name email')
    .populate('team.scriptwriter', 'name email');

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    res.json({
      message: 'Project completed successfully',
      project
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create film with team
router.post('/post-production/create-film', adminAuth, async (req, res) => {
  try {
    const { scriptId, title, director, actors, budget, sendApproval, createChatroom } = req.body;

    // Find the script
    const script = await Script.findById(scriptId).populate('uploadedBy', 'name email');
    if (!script) {
      return res.status(404).json({ message: 'Script not found' });
    }

    // Create the film
    const film = new ShortFilm({
      title,
      selectedScript: scriptId,
      team: {
        director,
        actors,
        scriptwriter: script.uploadedBy._id
      },
      budget: {
        amount: budget,
        approved: true
      },
      isPostProduction: true,
      status: 'in-production',
      workflow: {
        directorAssigned: true,
        teamFormed: true,
        budgetSet: true,
        productionStarted: false,
        completed: false
      }
    });

    await film.save();

    // Send approval request to scriptwriter if requested
    if (sendApproval) {
      const request = new Request({
        sender: req.user._id, // Admin sending the request
        receiver: script.uploadedBy._id, // Scriptwriter receiving the request
        type: 'film_approval',
        role: 'Writer', // Default role for scriptwriter
        message: `Your script "${script.title}" has been selected for film production. The film "${title}" is now in production with director and team assigned.`,
        script: scriptId,
        film: film._id,
        status: 'pending'
      });
      await request.save();
    }

    // Create personal project chatroom if requested
    if (createChatroom) {
      const MovieChatroom = require('../models/MovieChatroom');
      const chatroom = new MovieChatroom({
        movieName: title,
        projectId: film._id,
        participants: [director, ...actors, script.uploadedBy._id],
        createdBy: req.user._id,
        endTime: null // No time limit
      });
      await chatroom.save();
    }

    // Populate the response
    const populatedFilm = await ShortFilm.findById(film._id)
      .populate('selectedScript', 'title author')
      .populate('team.director', 'name email')
      .populate('team.actors', 'name email')
      .populate('team.scriptwriter', 'name email');

    res.status(201).json({
      message: 'Film created successfully with team and options',
      shortFilm: populatedFilm
    });
  } catch (error) {
    console.error('Error creating film:', error);
    res.status(500).json({ message: error.message });
  }
});

// Create film with team and options
router.post('/post-production/create-film-with-team', adminAuth, async (req, res) => {
  try {
    const { scriptId, title, director, actors, budget, sendApproval, createChatroom } = req.body;

    // Validate required fields
    if (!scriptId || !title || typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({ message: 'Script ID and valid title are required' });
    }

    // Trim title
    const trimmedTitle = title.trim();

    // Get the script to get the uploader
    const script = await Script.findById(scriptId).populate('uploadedBy', 'name email');
    if (!script) {
      return res.status(404).json({ message: 'Script not found' });
    }

    // Create the film
    const filmData = {
      title,
      description: `Film based on script: ${script.title}`,
      selectedScript: scriptId,
      uploadedBy: script.uploadedBy._id,
      isPostProduction: true,
      status: 'in-production',
      team: {
        director: director || null,
        actors: actors || [],
        scriptwriter: script.uploadedBy._id // Original script uploader
      },
      budget: {
        amount: budget || 0,
        currency: 'USD',
        approved: budget > 0
      },
      workflow: {
        scriptwriterApproval: {
          requested: sendApproval || false,
          approved: false,
          responseDate: null,
          notes: sendApproval ? 'Approval requested by admin during film creation' : null
        },
        directorAssigned: !!director,
        teamFormed: (director && actors && actors.length > 0) || false,
        budgetSet: budget > 0,
        productionStarted: false,
        completed: false
      }
    };

    const film = new ShortFilm(filmData);
    await film.save();

    // Send approval request to scriptwriter if requested
    if (sendApproval) {
      const request = new Request({
        sender: req.user._id, // Admin sending the request
        receiver: script.uploadedBy._id, // Scriptwriter receiving the request
        type: 'film_approval',
        role: 'Writer', // Default role for scriptwriter
        message: `Your script "${script.title}" has been selected for film production. The film "${title}" is being created. Please review and approve the production.`,
        script: scriptId,
        film: film._id,
        status: 'pending'
      });
      await request.save();
    }

    // Create personal project chatroom if requested
    let chatroom = null;
    if (createChatroom) {
      const chatroomData = {
        movieName: trimmedTitle, // Required field for MovieChatroom
        endTime: null // No time limit for personal project chat
      };

      chatroom = new MovieChatroom(chatroomData);
      await chatroom.save();
    }

    // Populate the response
    const populatedFilm = await ShortFilm.findById(film._id)
      .populate('selectedScript', 'title author')
      .populate('team.director', 'name email')
      .populate('team.actors', 'name email')
      .populate('team.scriptwriter', 'name email')
      .populate('uploadedBy', 'name email');

    res.status(201).json({
      message: 'Film created successfully with team and options',
      film: populatedFilm,
      chatroom: chatroom ? { _id: chatroom._id, title: chatroom.title } : null,
      approvalSent: sendApproval
    });

  } catch (error) {
    console.error('Error creating film with team:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
