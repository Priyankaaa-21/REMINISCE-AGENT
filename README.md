🧠 Reminisce AI - Memory Support Platform
AI-powered reminiscence therapy and comprehensive health management platform for Alzheimer's patients and their caretakers.

Built by Team ResQR | Powered by Microsoft Azure AI + Google Gemini

🌐 Live Application: https://reminisce-agent.onrender.com

✨ Key Features
🎯 Core Functionality
🖼️ Memory Hub - Interactive photo memory system with AI-generated personalized questions
🎤 Voice Assistant - Hands-free navigation with voice commands
📅 Daily Routines - Track and manage daily tasks and activities
🚨 Emergency SOS - One-tap emergency alert system for caretakers
👥 Caretaker Dashboard - Comprehensive monitoring and management tools
🤖 AI-Powered Features
Image Analysis (Azure Computer Vision)

Automatic photo caption generation
Object and scene detection
Tag extraction for memory context
Memory Questions (Google Gemini 2.0 Flash)

Generates 5 personalized questions per photo
Rotates questions every 12 hours
Contextual and emotionally engaging prompts
Text-to-Speech (Azure Speech Service)

Natural voice playback of memory questions
Accessible audio interface
Warm, friendly voice output
Voice Commands (Web Speech API)

"Show me my memories" - Opens Memory Hub
"Help!" / "Call caretaker" - Triggers emergency alert
"What are my tasks?" - Shows daily routines
"What time is it?" - Displays current time
"Play question" - Reads memory question aloud
🛠️ Tech Stack
Frontend:

React 18 + TypeScript
TailwindCSS (Custom high-contrast theme)
Framer Motion (Animations)
React Query (State management)
Vite (Build tool)
Backend:

Express.js + Node.js
MongoDB (Database)
Passport.js (Authentication)
AI Services:

Microsoft Azure Computer Vision API
Microsoft Azure Speech Service
Google Gemini 2.0 Flash Experimental
Web Speech API (Browser-based voice recognition)
🚀 Quick Start
Prerequisites
Node.js 18.0+
MongoDB 6.0+
Azure Account (for Vision + Speech APIs)
Google AI Studio Account (for Gemini API)
1. Clone & Install
git clone <repository-url>
cd Reminisce-AI
npm install
2. Environment Configuration
Create a .env file in the root directory:

# Database (Use MongoDB Atlas for production)
DATABASE_URL=mongodb+srv://username:password@cluster.mongodb.net/reminisce_ai?retryWrites=true&w=majority
DATABASE_NAME=reminisce_ai

# Session Security
SESSION_SECRET=your-secure-random-secret-at-least-32-characters-long

# Microsoft Azure Computer Vision (Image Analysis)
AZURE_COMPUTER_VISION_ENDPOINT=https://your-endpoint.cognitiveservices.azure.com/
AZURE_COMPUTER_VISION_KEY=your-computer-vision-api-key

# Microsoft Azure Speech Service (Text-to-Speech)
AZURE_SPEECH_ENDPOINT=https://your-region.api.cognitive.microsoft.com/
AZURE_SPEECH_KEY=your-speech-api-key
AZURE_SPEECH_REGION=your-azure-region

# Google Gemini AI (Question Generation)
GEMINI_API_KEY=your-gemini-api-key-from-ai-studio
3. Database Setup
Local Development:

# Windows
net start MongoDB

# Linux/Mac
sudo systemctl start mongod
Production (MongoDB Atlas):

Create account at mongodb.com/cloud/atlas
Create a new cluster
Get connection string and add to .env
Collections are created automatically on first run
4. Run the Application
Development Mode:

npm run dev
Production Build:

npm run build
npm start
The application will be available at http://localhost:5000

📁 Project Structure
Reminisce-AI/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/ui/  # Reusable UI components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # Utility functions
│   │   ├── pages/          # Main page components
│   │   │   ├── PatientDashboard.tsx
│   │   │   ├── CaretakerDashboard.tsx
│   │   │   └── Auth.tsx
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── index.html
│
├── server/                 # Express backend
│   ├── auth.ts            # Authentication logic
│   ├── azure_services.ts  # Azure API integration
│   ├── db.ts              # MongoDB connection
│   ├── routes.ts          # API endpoints
│   ├── storage.ts         # File storage
│   └── index.ts           # Server entry point
│
├── shared/                 # Shared types & schemas
│   ├── routes.ts          # Route definitions
│   └── schema.ts          # Database schemas
│
├── script/                 # Build scripts
│   └── build.ts
│
├── package.json
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── .env
🎨 UI Features
Patient Dashboard
Memory Hub Modal - Fullscreen photo viewer with carousel navigation
Animated Transitions - Smooth Framer Motion animations throughout
Voice Assistant Overlay - Real-time voice command processing
Responsive Design - Mobile-first, works on all screen sizes
Accessibility - High contrast colors, large touch targets, keyboard navigation
Caretaker Dashboard
Batch Image Upload - Upload multiple memories at once
Patient Management - Monitor patient activity and health
Emergency Alerts - Instant SOS notifications
Memory Management - Add, edit, and organize patient memories
🔐 Security
Session-based authentication with secure HTTP-only cookies
Password hashing using crypto.scrypt with random salts
Environment variable protection for API keys
CORS configuration for cross-origin security
MongoDB injection prevention with Mongoose
🚀 API Endpoints
Authentication
POST /api/register - Create new user account
POST /api/login - User authentication
POST /api/logout - Session termination
GET /api/user - Get current user info
Memories
GET /api/memories - Fetch patient memories
POST /api/memories - Upload new memory with image
POST /api/text-to-speech - Generate audio from text
Routines
GET /api/routines - Get patient routines
POST /api/routines - Create new routine
PATCH /api/routines/:id - Update routine status
Emergency
POST /api/emergency - Trigger SOS alert
GET /api/emergency-list - Get emergency history
🎯 Voice Commands
Command	Action
"Show me my memories"	Opens Memory Hub modal
"Help!" / "SOS"	Triggers emergency alert
"Call caretaker"	Sends emergency notification
"What are my tasks?"	Scrolls to routines section
"What time is it?"	Displays current time
"Play question"	Plays memory question audio
"Close" / "Cancel"	Closes voice assistant
� Deployment
Current Deployment Stack
Full-Stack: Render (reminisce-agent.onrender.com)
Database: MongoDB Atlas (Cloud)
Deploy Your Own
Render (Full-Stack - Recommended):

Create Web Service at render.com
Connect your GitHub repository
Render will auto-detect render.yaml configuration
Add environment variables in Render dashboard:
DATABASE_URL (MongoDB Atlas connection string)
DATABASE_NAME=reminisce_ai
SESSION_SECRET (random 64-char string)
AZURE_COMPUTER_VISION_ENDPOINT
AZURE_COMPUTER_VISION_KEY
AZURE_SPEECH_ENDPOINT
AZURE_SPEECH_KEY
AZURE_SPEECH_REGION
GEMINI_API_KEY
Deploy - Render builds frontend + backend automatically
Alternative: Separate Frontend (Vercel) + Backend (Render):

Frontend: Deploy to Vercel, set VITE_API_URL env variable
Backend: Follow steps above for Render
�🔧 Development
Available Scripts
npm run dev          # Start development server (Vite + Express)
npm run build        # Production build (TypeScript → dist/)
npm start            # Run production server
npm run check        # TypeScript type checking
Environment Modes
Development - Hot module replacement, detailed errors
Production - Optimized bundle, minified assets
📝 Database Schema
User Collection
{
  id: number,
  username: string,
  password: string (hashed),
  role: "patient" | "caretaker",
  caretakerId?: number
}
Memory Collection
{
  id: number,
  patientId: number,
  imageUrl: string,
  description: string,
  aiQuestions: string[],  // 5 AI-generated questions
  lastQuestionIndex: number,
  createdAt: Date
}
Routine Collection
{
  id: number,
  patientId: number,
  task: string,
  time: string,
  completed: boolean
}
🌐 Browser Compatibility
Chrome/Edge ✅ (Full support including voice recognition)
Firefox ⚠️ (No voice recognition support)
Safari ⚠️ (Limited voice recognition support)
Voice assistant requires browser support for Web Speech API

🤝 Contributing
This project was built for hackathon submission. Future enhancements:

 Mobile app (React Native)
 Multi-language support
 Advanced analytics dashboard
 Video memory support
 Integration with wearable devices
📜 License
MIT License - feel free to use and modify for your projects!

👥 Team ResQR
Built with ❤️ by Team ResQR

Technologies: Microsoft Azure AI, Google Gemini, React, TypeScript, MongoDB, Express.js

🙏 Acknowledgments
Microsoft Azure for Computer Vision and Speech Services
Google for Gemini AI API
Vercel for shadcn/ui components
Framer for Motion animations library
For support or questions, please open an issue on GitHub.