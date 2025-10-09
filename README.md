# Apartment Dashboard

Welcome! This project is a local-first dashboard for managing recurring chores and tasks, designed for roommates to collaborate.

## ⚠️ Current Status & Known Issues

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

## Getting Started

### Original Version (Local-First)
1. **Clone the repository**
   ```sh
   git clone <repo-url>
   ```
2. **Open in VS Code or your preferred editor**
3. **Open `index.html` in your browser**
   - All data is stored locally in your browser (no backend required).

### React Version (Full-Stack)
1. **Navigate to the React version**
   ```sh
   cd apartment-dashboard-react
   ```
2. **Follow the setup instructions in `apartment-dashboard-react/README.md`**
   - Includes MongoDB Atlas integration
   - Full authentication system
   - Modern React architecture

## Contributing

- Please add comments to your code for clarity.
- Use clear commit messages.
- If you add new features, update this README with instructions.
- Address the authentication requirements listed above.

## Project Structure
- `index.html` — Main dashboard UI (original version)
- `script.js` — App logic and interactions (original version)
- `styles.css` — Custom styles (original version)
- `apartment-dashboard-react/` — Modern React version with full authentication

## Collaboration Tips
- Assign tasks to yourself or others using the "Assigned To" field.
- Use the "Notes" field for extra details.
- Mark tasks as done and see stats update in real time.

## License
MIT
