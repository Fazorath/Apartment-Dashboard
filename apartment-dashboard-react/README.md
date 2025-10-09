# Apartment Dashboard - React Edition

A modern, collaborative task management dashboard built with React, Vite, and Node.js. Perfect for roommates to track recurring chores and tasks.

## 🚀 Features

- **User Authentication**: Secure login/register system with JWT tokens
- **Task Management**: Create, edit, delete, and mark tasks as complete
- **Recurring Tasks**: Set frequency in days with automatic due date tracking
- **Collaboration**: Assign tasks to specific roommates
- **Real-time Statistics**: Track overdue, due soon, and total tasks
- **Advanced Filtering**: Filter by status (all, overdue, due soon, OK)
- **Search**: Find tasks quickly with real-time search
- **Modern UI**: Beautiful, responsive design with dark theme
- **Responsive**: Works perfectly on desktop and mobile

## ⚠️ Known Issues & Future Enhancements

### Non-Functional Features
- **"Forgot Password?" Link**: Currently non-functional and needs implementation
  - Requires password reset email system
  - Needs backend endpoint for password reset tokens
  - Frontend form for email input and new password entry

### Planned Authentication Enhancements
The following authentication methods are planned for future implementation:

#### 1. Apple Sign-In Integration
- **Requirements**:
  - Apple Developer account and app registration
  - Implement Apple's Sign in with Apple JS SDK
  - Backend integration with Apple's authentication service
  - User account linking for existing email/password users
  - Privacy-compliant user data handling

#### 2. Google Sign-In Integration
- **Requirements**:
  - Google Cloud Console project setup
  - Google Identity Services (GIS) implementation
  - OAuth 2.0 flow with Google's authentication API
  - Backend integration with Google's user info endpoint
  - Account merging for users with multiple sign-in methods

#### 3. Enhanced Email/Password System
- **Current State**: Basic username/password authentication
- **Planned Improvements**:
  - Email verification system
  - Password strength requirements
  - Account lockout after failed attempts
  - Password reset via email
  - Two-factor authentication (2FA) support

#### 4. Multi-Authentication Strategy
- **Account Linking**: Allow users to link multiple authentication methods
- **Fallback Options**: Graceful handling when primary auth method fails
- **User Preference**: Let users choose preferred sign-in method
- **Migration Path**: Smooth transition for existing users

### Implementation Priority
1. **High Priority**: Fix "Forgot Password?" functionality
2. **Medium Priority**: Google Sign-In integration
3. **Medium Priority**: Enhanced email/password features
4. **Low Priority**: Apple Sign-In integration
5. **Low Priority**: Multi-authentication strategy

## 🛠️ Tech Stack

### Frontend
- **React 18** - Modern React with hooks
- **Vite** - Fast build tool and dev server
- **React Query** - Data fetching and caching
- **React Router** - Client-side routing
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide React** - Beautiful icons
- **Axios** - HTTP client

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB object modeling
- **JWT** - JSON Web Tokens for authentication
- **bcryptjs** - Password hashing
- **CORS** - Cross-origin resource sharing

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- MongoDB Atlas account (or local MongoDB)

### 1. Clone and Setup
```bash
git clone <repository-url>
cd apartment-dashboard-react
```

### 2. Frontend Setup
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### 3. Backend Setup
```bash
# Navigate to backend
cd backend

# Install dependencies
npm install

# Create environment file
cp env.example .env

# Edit .env with your MongoDB URI and JWT secret
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/apartment-dashboard
# JWT_SECRET=your-super-secret-jwt-key-here

# Start backend server
npm run dev
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the `backend` directory:

```env
# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/apartment-dashboard?retryWrites=true&w=majority

# JWT Secret (use a strong, random string)
JWT_SECRET=your-super-secret-jwt-key-here

# Server
PORT=3000
NODE_ENV=development

# CORS
FRONTEND_URL=http://localhost:5173
```

### MongoDB Atlas Setup

1. Create a MongoDB Atlas account
2. Create a new cluster
3. Get your connection string
4. Replace `<username>`, `<password>`, and `<cluster>` in the connection string
5. Add your IP address to the whitelist

## 🚀 Deployment

### Frontend (Vercel/Netlify)
```bash
# Build the project
npm run build

# Deploy to your preferred platform
# The build files will be in the 'dist' directory
```

### Backend (Railway/Heroku/Render)
```bash
# Set environment variables in your hosting platform
# Deploy the backend directory
```

## 📱 Usage

1. **Register/Login**: Create an account or sign in
2. **Add Tasks**: Click "Add Task" to create new recurring tasks
3. **Set Frequency**: Choose how often the task should be done (in days)
4. **Assign Tasks**: Assign tasks to specific roommates
5. **Track Progress**: See overdue, due soon, and completed tasks
6. **Mark Complete**: Click the checkmark to mark tasks as done
7. **Filter & Search**: Use filters and search to find specific tasks

## 🎨 Customization

- **Themes**: Dark theme by default (easily customizable)
- **Colors**: Accent colors can be customized
- **Layout**: Responsive design adapts to any screen size

## 🔒 Security

- Passwords are hashed with bcrypt
- JWT tokens for secure authentication
- Rate limiting to prevent abuse
- Input validation and sanitization
- CORS protection

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

If you encounter any issues:

1. Check the console for errors
2. Ensure MongoDB connection is working
3. Verify environment variables are set correctly
4. Check that both frontend and backend servers are running

## 🔄 Migration from Original

This React version is a complete rewrite of the original HTML/CSS/JS version with:
- Modern React architecture
- Proper state management
- Real database persistence
- Better user experience
- Mobile responsiveness
- Production-ready code