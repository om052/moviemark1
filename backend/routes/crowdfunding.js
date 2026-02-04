const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Crowdfunding = require('../models/Crowdfunding');
const User = require('../models/User');

// Get all active crowdfunding campaigns
router.get('/', auth, async (req, res) => {
  try {
    const campaigns = await Crowdfunding.find({ status: 'active' })
      .populate('script', 'title genre category author')
      .sort({ createdAt: -1 });

    res.json(campaigns);
  } catch (error) {
    console.error('Error fetching crowdfunding campaigns:', error);
    res.status(500).json({ message: 'Error fetching campaigns' });
  }
});

// Get specific crowdfunding campaign
router.get('/:id', auth, async (req, res) => {
  try {
    const campaign = await Crowdfunding.findById(req.params.id)
      .populate('script', 'title genre category author description')
      .populate('backers.user', 'name');

    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    res.json(campaign);
  } catch (error) {
    console.error('Error fetching campaign:', error);
    res.status(500).json({ message: 'Error fetching campaign' });
  }
});

// Contribute to a crowdfunding campaign
router.post('/:id/contribute', auth, async (req, res) => {
  try {
    const { amount, message, anonymous } = req.body;
    const campaignId = req.params.id;
    const userId = req.user.id;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Valid contribution amount is required' });
    }

    const campaign = await Crowdfunding.findById(campaignId);
    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    if (campaign.status !== 'active') {
      return res.status(400).json({ message: 'Campaign is not active' });
    }

    // Add contribution
    await campaign.addContribution(userId, amount, message, anonymous);

    // Populate the updated campaign
    const updatedCampaign = await Crowdfunding.findById(campaignId)
      .populate('script', 'title genre category author')
      .populate('backers.user', 'name');

    res.json({
      message: 'Contribution successful',
      campaign: updatedCampaign
    });
  } catch (error) {
    console.error('Error making contribution:', error);
    res.status(500).json({ message: 'Error processing contribution' });
  }
});

// Get user's contribution history
router.get('/user/contributions', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const contributions = await Crowdfunding.find({
      'contributions.user': userId
    })
    .populate('script', 'title genre category author')
    .select('script contributions goalAmount raisedAmount status')
    .sort({ createdAt: -1 });

    // Filter and format contributions for this user
    const userContributions = contributions.map(campaign => {
      const userContrib = campaign.contributions.find(c => c.user.toString() === userId);
      return {
        campaignId: campaign._id,
        script: campaign.script,
        amount: userContrib.amount,
        message: userContrib.message,
        anonymous: userContrib.anonymous,
        date: userContrib.date,
        goalAmount: campaign.goalAmount,
        raisedAmount: campaign.raisedAmount,
        status: campaign.status
      };
    });

    res.json(userContributions);
  } catch (error) {
    console.error('Error fetching user contributions:', error);
    res.status(500).json({ message: 'Error fetching contributions' });
  }
});

module.exports = router;
