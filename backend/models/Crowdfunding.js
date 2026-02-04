const mongoose = require('mongoose');

const contributionSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true, min: 1 },
    message: { type: String, default: '' },
    anonymous: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

const crowdfundingSchema = new mongoose.Schema({
    script: { type: mongoose.Schema.Types.ObjectId, ref: 'Script', required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    goalAmount: { type: Number, required: true, min: 1 },
    currentAmount: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'completed', 'cancelled'], default: 'active' },
    contributions: [contributionSchema],
    backers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    endDate: { type: Date },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Virtual for progress percentage
crowdfundingSchema.virtual('progressPercentage').get(function() {
    if (this.goalAmount === 0) return 0;
    return Math.min((this.currentAmount / this.goalAmount) * 100, 100);
});

// Virtual for total backers count
crowdfundingSchema.virtual('totalBackers').get(function() {
    return this.backers.length;
});

// Include virtuals in JSON output
crowdfundingSchema.set('toJSON', { virtuals: true });

// Method to add contribution
crowdfundingSchema.methods.addContribution = async function(userId, amount, message = '', anonymous = false) {
    // Check if user already contributed
    const existingContribution = this.contributions.find(c => c.user.toString() === userId.toString());
    if (!existingContribution) {
        this.backers.push(userId);
    }

    // Add new contribution
    this.contributions.push({
        user: userId,
        amount: amount,
        message: message,
        anonymous: anonymous,
        createdAt: new Date()
    });

    // Update current amount
    this.currentAmount += amount;

    // Check if goal reached
    if (this.currentAmount >= this.goalAmount && this.status === 'active') {
        this.status = 'completed';
    }

    this.updatedAt = new Date();
    await this.save();
    return this;
};

// Static method to get user's contributions
crowdfundingSchema.statics.getUserContributions = async function(userId) {
    return await this.find({ 'contributions.user': userId })
        .populate('script', 'title author')
        .select('title currentAmount goalAmount status contributions.$')
        .sort({ createdAt: -1 });
};

module.exports = mongoose.model('Crowdfunding', crowdfundingSchema);
