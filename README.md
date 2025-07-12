# Skill Swap Platform

A cross-platform application for exchanging skills between users.

## Project Overview

The Skill Swap Platform enables users to list their skills and request others in return. It's designed to be accessible via web browsers and Android devices, with a focus on modularity for easy future development.

## Features

- **User Profiles**:
  - Basic info: Name, location (optional), profile photo (optional)
  - List of skills offered
  - List of skills wanted
  - Availability (e.g., weekends, evenings)
  - Public/private profile option

- **Skill Discovery**:
  - Browse or search users by skill
  - Filter by availability

- **Swap Management**:
  - Request skill swaps
  - Accept or reject swap offers
  - View current and pending swap requests
  - Delete pending swap requests
  - Provide ratings/feedback after swaps

- **Admin Features**:
  - Moderate skill descriptions
  - User management (ban violators)
  - Monitor swap activities
  - Platform-wide messaging
  - Analytics and reporting

## Technical Architecture

### Backend
- **Node.js/Express.js**: RESTful API services
- **Database**: Oracle Autonomous Database
- **Authentication**: JWT-based authentication
- **Storage**: Oracle Object Storage for profile images

### Frontend
- **Web**: React.js with responsive design
- **Mobile**: React Native for Android

### Deployment
- **Infrastructure**: Oracle Cloud Infrastructure (OCI) Free Tier
- **CI/CD**: GitHub Actions for automated deployment

## Project Structure

```
skillswap/
├── backend/                 # Node.js/Express backend
│   ├── config/              # Configuration files
│   ├── controllers/         # Request handlers
│   ├── middleware/          # Express middleware
│   ├── models/              # Database models
│   ├── routes/              # API routes
│   ├── services/            # Business logic
│   ├── utils/               # Utility functions
│   ├── app.js               # Express app setup
│   ├── server.js            # Server entry point
│   └── package.json         # Backend dependencies
│
├── frontend/                # React.js web frontend
│   ├── public/              # Static files
│   ├── src/                 # Source code
│   │   ├── assets/          # Images, fonts, etc.
│   │   ├── components/      # Reusable components
│   │   ├── contexts/        # React contexts
│   │   ├── hooks/           # Custom React hooks
│   │   ├── pages/           # Page components
│   │   ├── services/        # API service calls
│   │   ├── utils/           # Utility functions
│   │   ├── App.js           # Main component
│   │   └── index.js         # Entry point
│   └── package.json         # Frontend dependencies
│
├── mobile/                  # React Native mobile app
│   ├── android/             # Android-specific files
│   ├── src/                 # Source code (similar structure to web)
│   └── package.json         # Mobile dependencies
│
├── shared/                  # Code shared between web and mobile
│   ├── components/          # Shared components
│   ├── constants/           # Shared constants
│   └── utils/               # Shared utilities
│
├── docs/                    # Documentation
│   ├── api/                 # API documentation
│   ├── deployment/          # Deployment guides
│   └── development/         # Development guides
│
├── .github/                 # GitHub configuration
│   └── workflows/           # GitHub Actions workflows
│
├── oci/                     # OCI deployment configuration
│   ├── compute/             # Compute instance setup
│   ├── database/            # Database setup
│   └── storage/             # Object storage setup
│
└── README.md                # Project overview
```

## Getting Started

### Prerequisites
- Node.js (v14+)
- npm or yarn
- Oracle Cloud account (Free Tier)
- Android Studio (for mobile development)

### Development Setup
1. Clone the repository
2. Set up the backend:
   ```
   cd backend
   npm install
   npm run dev
   ```
3. Set up the frontend:
   ```
   cd frontend
   npm install
   npm start
   ```
4. Set up the mobile app:
   ```
   cd mobile
   npm install
   npx react-native run-android
   ```

## Deployment on Oracle Cloud Infrastructure (Free Tier)

Detailed deployment instructions will be provided in the deployment guide.

## Team

- Team Leader & Member: yadnyeshkolte
