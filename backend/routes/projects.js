const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Project = require('../models/Project');

// Get public projects for homepage showcase
router.get('/public', async (req, res) => {
  try {
    const projects = await Project.find({ visibility: 'Public' })
      .populate('owner', 'name')
      .sort({ createdAt: -1 })
      .limit(8); // Limit to 8 for showcase

    res.json(projects);
  } catch (error) {
    console.error('Error fetching public projects:', error);
    res.status(500).json({ message: 'Error fetching projects' });
  }
});

// Get user's projects (where they are owner or collaborator)
router.get('/my-projects', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const projects = await Project.find({
      $or: [
        { owner: userId },
        { 'collaborators.user': userId }
      ]
    })
    .populate('owner', 'name email')
    .populate('collaborators.user', 'name email')
    .sort({ createdAt: -1 });

    res.json(projects);
  } catch (error) {
    console.error('Error fetching user projects:', error);
    res.status(500).json({ message: 'Error fetching projects' });
  }
});

// Get project by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('owner', 'name email')
      .populate('collaborators.user', 'name email')
      .populate('scripts')
      .populate('shortFilms');

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if user has access to this project
    const isOwner = project.owner._id.toString() === req.user.id;
    const isCollaborator = project.collaborators.some(c => c.user._id.toString() === req.user.id);

    if (!isOwner && !isCollaborator) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(project);
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ message: 'Error fetching project' });
  }
});

// Create new project
router.post('/', auth, async (req, res) => {
  try {
    const { title, description, genre, category, budget, deadline, collaborators, scripts, shortFilms } = req.body;

    const project = new Project({
      title,
      description,
      genre,
      category,
      budget,
      deadline,
      owner: req.user.id,
      collaborators: collaborators || [],
      scripts: scripts || [],
      shortFilms: shortFilms || []
    });

    await project.save();

    const populatedProject = await Project.findById(project._id)
      .populate('owner', 'name email')
      .populate('collaborators.user', 'name email');

    res.status(201).json(populatedProject);
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ message: 'Error creating project' });
  }
});

// Update project
router.put('/:id', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if user is owner
    if (project.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only project owner can update' });
    }

    const updates = req.body;
    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) {
        project[key] = updates[key];
      }
    });

    await project.save();

    const populatedProject = await Project.findById(project._id)
      .populate('owner', 'name email')
      .populate('collaborators.user', 'name email');

    res.json(populatedProject);
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ message: 'Error updating project' });
  }
});

// Add collaborator to project
router.post('/:id/collaborators', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if user is owner
    if (project.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only project owner can add collaborators' });
    }

    const { userId, role } = req.body;

    // Check if user is already a collaborator
    const existingCollaborator = project.collaborators.find(c => c.user.toString() === userId);
    if (existingCollaborator) {
      return res.status(400).json({ message: 'User is already a collaborator' });
    }

    project.collaborators.push({
      user: userId,
      role: role || 'Other'
    });

    await project.save();

    const populatedProject = await Project.findById(project._id)
      .populate('owner', 'name email')
      .populate('collaborators.user', 'name email');

    res.json(populatedProject);
  } catch (error) {
    console.error('Error adding collaborator:', error);
    res.status(500).json({ message: 'Error adding collaborator' });
  }
});

// Remove collaborator from project
router.delete('/:id/collaborators/:userId', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if user is owner
    if (project.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only project owner can remove collaborators' });
    }

    project.collaborators = project.collaborators.filter(c => c.user.toString() !== req.params.userId);

    await project.save();

    const populatedProject = await Project.findById(project._id)
      .populate('owner', 'name email')
      .populate('collaborators.user', 'name email');

    res.json(populatedProject);
  } catch (error) {
    console.error('Error removing collaborator:', error);
    res.status(500).json({ message: 'Error removing collaborator' });
  }
});

// Delete project
router.delete('/:id', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if user is owner
    if (project.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only project owner can delete' });
    }

    await Project.findByIdAndDelete(req.params.id);
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ message: 'Error deleting project' });
  }
});

// Get available projects (scripts in production status and admin-created projects)
router.get('/available', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get scripts that are in production status and not created by the user
    const availableScripts = await Script.find({
      status: 'production',
      uploadedBy: { $ne: userId },
      visibility: { $in: ['Public', 'Team'] }
    })
    .populate('uploadedBy', 'name')
    .sort({ createdAt: -1 });

    // Get admin-created projects where user is not owner and not already a collaborator
    const availableAdminProjects = await Project.find({
      owner: { $ne: userId },
      'collaborators.user': { $ne: userId },
      visibility: { $in: ['Public', 'Team'] },
      status: { $in: ['Planning', 'Pre-production', 'Production'] } // Only active projects
    })
    .populate('owner', 'name')
    .sort({ createdAt: -1 });

    // Format scripts as projects for the dashboard
    const scriptProjects = availableScripts.map(script => ({
      _id: script._id,
      title: script.title,
      description: script.description || 'No description available.',
      genre: script.genre,
      category: script.category,
      owner: script.uploadedBy,
      status: 'Production', // Map script status to project status
      visibility: script.visibility,
      createdAt: script.createdAt,
      type: 'script', // Indicate this is a script-based project
      progress: 0 // Scripts don't have progress
    }));

    // Format admin projects for the dashboard
    const adminProjects = availableAdminProjects.map(project => ({
      _id: project._id,
      title: project.title,
      description: project.description,
      genre: project.genre,
      category: project.category,
      owner: project.owner,
      status: project.status,
      visibility: project.visibility,
      createdAt: project.createdAt,
      type: 'project', // Indicate this is an admin-created project
      progress: project.progress || 0,
      budget: project.budget,
      collaborators: project.collaborators.length
    }));

    // Combine and sort by creation date (newest first)
    const allAvailableProjects = [...scriptProjects, ...adminProjects]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json(allAvailableProjects);
  } catch (error) {
    console.error('Error fetching available projects:', error);
    res.status(500).json({ message: 'Error fetching available projects' });
  }
});

module.exports = router;
