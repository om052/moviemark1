require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');
const User = require('./models/User');
const Script = require('./models/Script');
const ShortFilm = require('./models/ShortFilm');
const ChatMessage = require('./models/ChatMessage');
const Project = require('./models/Project');
const adminAuth = require('./middleware/admin');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/admin", require("./routes/admin"));
// app.use("/api/movie", require("./routes/movie")); // Commented out as movie.js is empty
app.use("/api/script", require("./routes/script"));
app.use("/api/profile", require("./routes/profile"));
app.use("/api/chat", require("./routes/chat"));
app.use("/api/shortfilm", require("./routes/shortfilm"));
app.use("/api/requests", require("./routes/requests"));
app.use("/api/projects", require("./routes/projects"));
app.use("/api/crowdfunding", require("./routes/crowdfunding"));
app.use("/api/testimonials", require("./routes/testimonials"));

// home page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

// example: register page
app.get("/register", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/register.html"));
});

// connect mongodb
mongoose.connect(process.env.MONGO_URI)
.then(async () => {
    console.log("MongoDB Connected");

    // Populate sample data for testing
    await populateSampleData();

    // Ensure admin user exists
    await createAdminUser();
})
.catch(err => console.log("Mongo error:", err));

// Function to create admin user
async function createAdminUser() {
    try {
        const existingAdmin = await User.findOne({ email: 'admin@hackthon.com' });
        if (!existingAdmin) {
            const adminPassword = await bcrypt.hash("admin123", 10);
            const adminUser = new User({
                name: "Platform Administrator",
                email: "admin@hackthon.com",
                password: adminPassword,
                isAdmin: true,
                isVerified: true,
                roles: ["admin"],
                bio: "Platform Administrator",
                roleInFilm: "Administrator",
                skills: "Platform Management, User Support, Content Moderation"
            });
            await adminUser.save();
            console.log("Created admin user: admin@hackthon.com / admin123");
        } else {
            console.log("Admin user already exists");
        }
    } catch (error) {
        console.log("Error creating admin user:", error.message);
    }
}

// Function to populate sample data
async function populateSampleData() {
    try {
        const Script = require("./models/Script");
        const ShortFilm = require("./models/ShortFilm");
        const Request = require("./models/Request");
        const ChatMessage = require("./models/ChatMessage");

        // Check if data already exists (5 sample users and projects)
        const existingUsers = await User.countDocuments();
        const existingProjects = await Project.countDocuments();
        if (existingUsers >= 5 && existingProjects >= 4) {
            console.log("Sample data already exists");
            return;
        }

        // Clear existing data
        console.log("Clearing existing data...");
        await User.deleteMany({});
        await Script.deleteMany({});
        await ShortFilm.deleteMany({});
        await Request.deleteMany({});
        await ChatMessage.deleteMany({});

        // Create sample users
        const hashedPassword = await bcrypt.hash("password123", 10);
        const users = [
            {
                name: "John Doe",
                email: "john@example.com",
                password: hashedPassword,
                roles: ["user"],
                bio: "Aspiring filmmaker",
                roleInFilm: "Director",
                skills: "Scriptwriting, Editing",
                instagram: "@johndoe",
                youtube: "youtube.com/johndoe"
            },
            {
                name: "Jane Smith",
                email: "jane@example.com",
                password: hashedPassword,
                roles: ["user"],
                bio: "Screenwriter",
                roleInFilm: "Writer",
                skills: "Scriptwriting",
                instagram: "@janesmith",
                youtube: "youtube.com/janesmith"
            },
            {
                name: "Bob Johnson",
                email: "bob@example.com",
                password: hashedPassword,
                roles: ["user"],
                bio: "Actor and producer",
                roleInFilm: "Actor",
                skills: "Acting, Producing",
                instagram: "@bobjohnson",
                youtube: "youtube.com/bobjohnson"
            },
            {
                name: "Alice Brown",
                email: "alice@example.com",
                password: hashedPassword,
                roles: ["user"],
                bio: "Cinematographer",
                roleInFilm: "Cinematographer",
                skills: "Cinematography, Lighting",
                instagram: "@alicebrown",
                youtube: "youtube.com/alicebrown"
            },
            {
                name: "Charlie Wilson",
                email: "charlie@example.com",
                password: hashedPassword,
                roles: ["user"],
                bio: "Sound designer",
                roleInFilm: "Sound Designer",
                skills: "Sound Design, Mixing",
                instagram: "@charliewilson",
                youtube: "youtube.com/charliewilson"
            }
        ];

        const createdUsers = await User.insertMany(users);
        console.log("Created users:", createdUsers.length);

        // Create sample scripts
        const scripts = [
            {
                title: "The Lost City",
                description: "An adventure story about explorers finding a lost city",
                content: "Script content here...",
                genre: "Drama",
                category: "Feature film",
                visibility: "Public",
                author: "John Doe",
                uploadedBy: createdUsers[0]._id,
                collaborators: [createdUsers[1]._id, createdUsers[2]._id],
                votes: 15,
                status: "approved"
            },
            {
                title: "Midnight Shadows",
                description: "A thriller about a detective chasing a serial killer",
                content: "Script content here...",
                genre: "Thriller",
                category: "Short film",
                visibility: "Public",
                author: "Jane Smith",
                uploadedBy: createdUsers[1]._id,
                collaborators: [createdUsers[0]._id],
                votes: 8,
                status: "approved"
            },
            {
                title: "Love in Paris",
                description: "A romantic comedy set in Paris",
                content: "Script content here...",
                genre: "Romance",
                category: "Web series",
                visibility: "Team",
                author: "Bob Johnson",
                uploadedBy: createdUsers[2]._id,
                collaborators: [createdUsers[3]._id, createdUsers[4]._id],
                votes: 12,
                status: "approved"
            },
            {
                title: "The Experiment",
                description: "A sci-fi short about a failed experiment",
                content: "Script content here...",
                genre: "Drama",
                category: "Short film",
                visibility: "Public",
                author: "Alice Brown",
                uploadedBy: createdUsers[3]._id,
                votes: 5,
                status: "pending"
            },
            {
                title: "Echoes of War",
                description: "A documentary about war veterans",
                content: "Script content here...",
                genre: "Documentary",
                category: "Short film",
                visibility: "Public",
                author: "Charlie Wilson",
                uploadedBy: createdUsers[4]._id,
                votes: 20,
                status: "approved"
            }
        ];

        const createdScripts = await Script.insertMany(scripts);
        console.log("Created scripts:", createdScripts.length);

        // Create sample short films
        const shortFilms = [
            {
                title: "Urban Dreams",
                description: "A short film about city life",
                uploadedBy: createdUsers[0]._id,
                file: "urban_dreams.mp4",
                genre: "Drama"
            },
            {
                title: "Forest Whisper",
                description: "Nature documentary",
                uploadedBy: createdUsers[1]._id,
                file: "forest_whisper.mp4",
                genre: "Documentary"
            }
        ];

        const createdFilms = await ShortFilm.insertMany(shortFilms);
        console.log("Created short films:", createdFilms.length);

        // Create sample requests
        const requests = [
            {
                userId: createdUsers[0]._id,
                type: "Collaboration",
                message: "I would like to collaborate on your script",
                scriptId: createdScripts[0]._id,
                status: "pending"
            },
            {
                userId: createdUsers[1]._id,
                type: "Collaboration",
                message: "Interested in joining your project",
                scriptId: createdScripts[2]._id,
                status: "accepted"
            },
            {
                userId: createdUsers[2]._id,
                type: "Feedback",
                message: "Can you review my script?",
                scriptId: createdScripts[1]._id,
                status: "pending"
            }
        ];

        const createdRequests = await Request.insertMany(requests);
        console.log("Created requests:", createdRequests.length);

        // Create sample chat messages
        const chatMessages = [
            {
                projectId: createdScripts[0]._id,
                sender: createdUsers[0]._id,
                message: "Let's discuss the plot",
                messageType: "text"
            },
            {
                projectId: createdScripts[0]._id,
                sender: createdUsers[1]._id,
                message: "I think we should add more action",
                messageType: "text"
            },
            {
                projectId: createdScripts[2]._id,
                sender: createdUsers[2]._id,
                message: "The script looks good",
                messageType: "text"
            },
            {
                projectId: createdScripts[2]._id,
                sender: createdUsers[3]._id,
                message: "Agreed, let's start filming",
                messageType: "text"
            }
        ];

        const createdMessages = await ChatMessage.insertMany(chatMessages);
        console.log("Created chat messages:", createdMessages.length);

        // Create sample reports
        const Report = require("./models/Report");
        const reports = [
            {
                messageId: createdMessages[0]._id,
                reporter: createdUsers[1]._id,
                reason: "Inappropriate content",
                description: "This message contains offensive language",
                status: "pending"
            },
            {
                messageId: createdMessages[1]._id,
                reporter: createdUsers[2]._id,
                reason: "Spam",
                description: "Repeated messages",
                status: "reviewed"
            }
        ];

        const createdReports = await Report.insertMany(reports);
        console.log("Created reports:", createdReports.length);

        // Create sample testimonials
        const Testimonial = require("./models/Testimonials");
        const testimonials = [
            {
                name: "John Doe",
                role: "Director",
                text: "MovieMark revolutionized how I collaborate on film projects. The platform is intuitive and connects me with amazing talent.",
                avatar: "https://via.placeholder.com/50"
            },
            {
                name: "Jane Smith",
                role: "Screenwriter",
                text: "As a screenwriter, finding the right collaborators was always challenging. MovieMark made it effortless and led to my breakthrough film.",
                avatar: "https://via.placeholder.com/50"
            },
            {
                name: "Bob Johnson",
                role: "Producer",
                text: "The funding tools on MovieMark helped me secure investment for my first feature film. Highly recommended!",
                avatar: "https://via.placeholder.com/50"
            }
        ];

        const createdTestimonials = await Testimonial.insertMany(testimonials);
        console.log("Created testimonials:", createdTestimonials.length);

        // Create sample projects
        const Project = require("./models/Project");
        const projects = [
            {
                title: "The Lost City Adventure",
                description: "An epic adventure film about explorers discovering a lost civilization",
                genre: "Action",
                category: "Feature film",
                status: "Production",
                budget: 50000,
                deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
                owner: createdUsers[0]._id,
                collaborators: [
                    { user: createdUsers[1]._id, role: "Writer" },
                    { user: createdUsers[2]._id, role: "Director" }
                ],
                scripts: [createdScripts[0]._id],
                progress: 45,
                visibility: "Public",
                featured: true
            },
            {
                title: "Midnight Shadows Thriller",
                description: "A psychological thriller about a detective hunting a serial killer",
                genre: "Thriller",
                category: "Short film",
                status: "Post-production",
                budget: 15000,
                deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
                owner: createdUsers[1]._id,
                collaborators: [
                    { user: createdUsers[0]._id, role: "Cinematographer" },
                    { user: createdUsers[3]._id, role: "Editor" }
                ],
                scripts: [createdScripts[1]._id],
                progress: 80,
                visibility: "Public",
                featured: true
            },
            {
                title: "Love in Paris Romance",
                description: "A romantic comedy set in the beautiful streets of Paris",
                genre: "Romance",
                category: "Web series",
                status: "Planning",
                budget: 25000,
                deadline: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000), // 120 days from now
                owner: createdUsers[2]._id,
                collaborators: [
                    { user: createdUsers[3]._id, role: "Writer" },
                    { user: createdUsers[4]._id, role: "Actor" }
                ],
                scripts: [createdScripts[2]._id],
                progress: 20,
                visibility: "Team",
                featured: false
            },
            {
                title: "Echoes of War Documentary",
                description: "A powerful documentary about war veterans and their stories",
                genre: "Documentary",
                category: "Short film",
                status: "Completed",
                budget: 10000,
                deadline: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
                owner: createdUsers[4]._id,
                collaborators: [
                    { user: createdUsers[0]._id, role: "Editor" },
                    { user: createdUsers[1]._id, role: "Sound Designer" }
                ],
                scripts: [createdScripts[4]._id],
                shortFilms: [createdFilms[1]._id],
                progress: 100,
                visibility: "Public",
                featured: true
            }
        ];

        const createdProjects = await Project.insertMany(projects);
        console.log("Created projects:", createdProjects.length);

        // Create sample crowdfunding campaign
        const Crowdfunding = require("./models/Crowdfunding");
        const sampleCrowdfundingExists = await Crowdfunding.findOne({ title: 'Support Our Drama Film' });
        if (!sampleCrowdfundingExists) {
            const sampleCrowdfunding = new Crowdfunding({
                script: createdScripts[0]._id, // Use first script
                title: 'Support Our Drama Film',
                description: 'Help us bring this compelling drama to life through your generous contributions.',
                goalAmount: 5000,
                currentAmount: 1200,
                status: 'active',
                createdBy: createdUsers[0]._id, // John Doe
                endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
            });
            await sampleCrowdfunding.save();
            console.log("Sample crowdfunding campaign created");
        } else {
            console.log("Sample crowdfunding campaign already exists");
        }

        console.log("Database populated successfully!");
        console.log("Sample users: john@example.com, jane@example.com, etc. / password123");

    } catch (error) {
        console.log("Error populating sample data:", error.message);
    }
}



// Catch-all for API routes to return JSON 404
app.use('/api', (req, res) => {
  res.status(404).json({ message: 'API endpoint not found' });
});

// Global error handler to ensure JSON responses
app.use((err, req, res, next) => {
  console.error('Global error handler:', err.stack);
  if (!res.headersSent) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Static file serving (after API routes to avoid conflicts)
app.use(express.static(path.join(__dirname, "../frontend")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Socket.io
const onlineUsers = new Map();

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('joinProject', async (projectId) => {
        try {
            const token = socket.handshake.auth.token;
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.id);

            socket.join(projectId);
            socket.projectId = projectId;
            socket.user = user;

            if (!onlineUsers.has(projectId)) {
                onlineUsers.set(projectId, new Set());
            }
            onlineUsers.get(projectId).add(socket.id);

            io.to(projectId).emit('onlineUsers', onlineUsers.get(projectId).size);
            io.to(projectId).emit('userJoined', user);
        } catch (err) {
            console.error('Join project error:', err);
        }
    });

    socket.on('sendMessage', async (data) => {
        try {
            const message = new ChatMessage({
                projectId: data.projectId,
                sender: socket.user._id,
                message: data.message,
                messageType: data.messageType || 'text',
                fileUrl: data.fileUrl,
                fileName: data.fileName
            });
            await message.save();

            const populatedMessage = await ChatMessage.findById(message._id).populate('sender', 'name');
            io.to(data.projectId).emit('message', populatedMessage);
        } catch (err) {
            console.error('Send message error:', err);
        }
    });

    socket.on('typing', (projectId) => {
        socket.to(projectId).emit('typing', socket.user);
    });

    socket.on('stopTyping', (projectId) => {
        socket.to(projectId).emit('stopTyping');
    });

    socket.on('togglePin', async (data) => {
        try {
            const message = await ChatMessage.findById(data.messageId);
            message.pinned = data.pinned;
            await message.save();

            io.to(message.projectId).emit('messagePinned', message);
        } catch (err) {
            console.error('Toggle pin error:', err);
        }
    });

    socket.on('disconnect', () => {
        if (socket.projectId && onlineUsers.has(socket.projectId)) {
            onlineUsers.get(socket.projectId).delete(socket.id);
            io.to(socket.projectId).emit('onlineUsers', onlineUsers.get(socket.projectId).size);
            if (socket.user) {
                io.to(socket.projectId).emit('userLeft', socket.user);
            }
        }
        console.log('User disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log("Server running on port", PORT);
});
