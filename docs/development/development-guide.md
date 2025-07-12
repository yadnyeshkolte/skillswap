# Skill Swap Platform Development Guide

This guide provides information for developers who want to extend and enhance the Skill Swap Platform. It covers the project structure, coding conventions, and guidelines for adding new features.

## Project Structure

The Skill Swap Platform follows a modular architecture with separate components for the backend, web frontend, and mobile application:

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
```

## Backend Development

### API Structure

The backend follows a RESTful API design with the following structure:

- **Routes**: Define API endpoints and connect them to controllers
- **Controllers**: Handle request/response logic
- **Models**: Interact with the database
- **Middleware**: Handle cross-cutting concerns like authentication
- **Services**: Contain business logic (when needed)
- **Utils**: Provide helper functions

### Adding a New API Endpoint

1. **Create or update a model** in `backend/models/` if needed
2. **Create a controller function** in `backend/controllers/`
3. **Add a route** in `backend/routes/`
4. **Update app.js** if adding a new route file

Example of adding a new endpoint:

```javascript
// 1. Add a model function (if needed)
// In models/user.model.js
exports.getUserStats = async (userId) => {
  // Database interaction code
};

// 2. Create a controller function
// In controllers/user.controller.js
exports.getUserStats = async (req, res) => {
  try {
    const stats = await userModel.getUserStats(req.params.id);
    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// 3. Add a route
// In routes/user.routes.js
router.get('/:id/stats', protect, getUserStats);
```

### Database Operations

The application uses Oracle Autonomous Database with the `oracledb` Node.js driver. When working with the database:

1. Use the `execute` function from `config/db.js` for all database operations
2. Use parameterized queries to prevent SQL injection
3. Handle database errors appropriately
4. Use transactions for operations that require atomicity

Example:

```javascript
const { execute } = require('../config/db');

// Simple query
const result = await execute(
  'SELECT * FROM users WHERE id = :id',
  { id: userId }
);

// Transaction example
let connection;
try {
  connection = await getConnection();
  await connection.execute('BEGIN');
  
  // Multiple operations...
  
  await connection.execute('COMMIT');
} catch (err) {
  if (connection) {
    await connection.execute('ROLLBACK');
  }
  throw err;
} finally {
  if (connection) {
    await connection.close();
  }
}
```

### Authentication and Authorization

The application uses JWT for authentication:

- **Authentication**: Verifying user identity using JWT tokens
- **Authorization**: Checking if a user has permission to access a resource

To protect routes:
- Use the `protect` middleware for authenticated routes
- Use the `authorize` middleware for role-based access control

Example:

```javascript
// Protect a route (authenticated users only)
router.get('/profile', protect, getUserProfile);

// Restrict to admin users
router.get('/admin/users', protect, authorize('admin'), getAllUsers);
```

## Frontend Development (Web)

### Component Structure

The React frontend follows a component-based architecture:

- **Pages**: Top-level components that correspond to routes
- **Components**: Reusable UI elements
- **Contexts**: For state management across components
- **Hooks**: Custom React hooks for shared logic
- **Services**: API calls and data fetching

### Adding a New Page

1. Create a new component in `frontend/src/pages/`
2. Add a route in the main router configuration
3. Link to the page from navigation components

Example:

```jsx
// 1. Create a page component
// In pages/UserStats.js
import React, { useState, useEffect } from 'react';
import { getUserStats } from '../services/userService';

const UserStats = ({ match }) => {
  const [stats, setStats] = useState(null);
  const userId = match.params.id;
  
  useEffect(() => {
    const fetchStats = async () => {
      const data = await getUserStats(userId);
      setStats(data);
    };
    fetchStats();
  }, [userId]);
  
  // Render component...
};

export default UserStats;

// 2. Add to router
// In App.js or your router file
<Route path="/users/:id/stats" component={UserStats} />
```

### API Integration

Use the service files to interact with the backend API:

1. Create or update a service file in `frontend/src/services/`
2. Use fetch or axios to make API requests
3. Handle authentication, errors, and loading states

Example:

```javascript
// In services/userService.js
import { API_URL } from '../config';
import { getAuthHeader } from '../utils/auth';

export const getUserStats = async (userId) => {
  try {
    const response = await fetch(`${API_URL}/api/users/${userId}/stats`, {
      headers: {
        ...getAuthHeader()
      }
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error);
    }
    
    return data.data;
  } catch (error) {
    console.error('Error fetching user stats:', error);
    throw error;
  }
};
```

### State Management

For simple state management, use React's built-in Context API:

1. Create a context in `frontend/src/contexts/`
2. Create a provider component that manages state
3. Use the context in components with `useContext`

For more complex state management, consider using Redux or MobX.

## Mobile Development (React Native)

### Shared Code

The mobile app shares code with the web frontend where possible:

- **Constants**: API URLs, error messages, etc.
- **Utils**: Helper functions
- **Services**: API integration logic

### Platform-Specific Code

For platform-specific features:

1. Create separate components when necessary
2. Use platform detection (`Platform.OS === 'android'`)
3. Use React Native's styling system instead of CSS

### Navigation

The mobile app uses React Navigation:

1. Define screens in the appropriate navigator
2. Configure navigation options
3. Use navigation props to navigate between screens

Example:

```jsx
// In navigation/AppNavigator.js
import { createStackNavigator } from '@react-navigation/stack';
import UserProfile from '../screens/UserProfile';
import UserStats from '../screens/UserStats';

const Stack = createStackNavigator();

function AppNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="UserProfile" component={UserProfile} />
      <Stack.Screen name="UserStats" component={UserStats} />
    </Stack.Navigator>
  );
}
```

## Shared Code

For code that needs to be shared between web and mobile:

1. Place it in the `shared/` directory
2. Import it in both web and mobile projects
3. Keep it platform-agnostic

Example:

```javascript
// In shared/utils/validation.js
export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

// Usage in web
import { validateEmail } from '../../../shared/utils/validation';

// Usage in mobile
import { validateEmail } from '../../shared/utils/validation';
```

## Testing

### Backend Testing

Use Jest and Supertest for backend testing:

1. Create test files in a `__tests__` directory or with `.test.js` suffix
2. Mock database calls and external services
3. Test API endpoints, models, and utilities

Example:

```javascript
// In __tests__/user.test.js
const request = require('supertest');
const app = require('../app');
const { execute } = require('../config/db');

// Mock database
jest.mock('../config/db', () => ({
  execute: jest.fn()
}));

describe('User API', () => {
  test('GET /api/users/:id returns user', async () => {
    // Mock database response
    execute.mockResolvedValueOnce({
      rows: [{ ID: '123', NAME: 'Test User', EMAIL: 'test@example.com' }]
    });
    
    const res = await request(app).get('/api/users/123');
    
    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBeTruthy();
    expect(res.body.data.name).toEqual('Test User');
  });
});
```

### Frontend Testing

Use Jest and React Testing Library for frontend testing:

1. Test components, hooks, and utilities
2. Mock API calls and context providers
3. Focus on user interactions and rendering

Example:

```javascript
// In components/__tests__/UserCard.test.js
import { render, screen } from '@testing-library/react';
import UserCard from '../UserCard';

test('renders user information', () => {
  const user = {
    name: 'Test User',
    offeredSkills: [{ id: '1', name: 'JavaScript' }],
    wantedSkills: [{ id: '2', name: 'Python' }]
  };
  
  render(<UserCard user={user} />);
  
  expect(screen.getByText('Test User')).toBeInTheDocument();
  expect(screen.getByText('JavaScript')).toBeInTheDocument();
  expect(screen.getByText('Python')).toBeInTheDocument();
});
```

## Coding Standards

### JavaScript/TypeScript

- Use ES6+ features
- Follow Airbnb JavaScript Style Guide
- Use async/await for asynchronous code
- Use destructuring and spread operators
- Use meaningful variable and function names

### React/React Native

- Use functional components with hooks
- Keep components small and focused
- Use prop-types or TypeScript for type checking
- Follow the container/presentational pattern
- Use CSS-in-JS or styled-components for styling

### API Design

- Follow RESTful principles
- Use consistent response formats
- Include appropriate HTTP status codes
- Document API endpoints
- Implement proper error handling

## Adding New Features

When adding new features to the Skill Swap Platform:

1. **Plan the feature**: Define requirements and design
2. **Backend implementation**: Add models, controllers, and routes
3. **Frontend implementation**: Add components, services, and state management
4. **Testing**: Write tests for both backend and frontend
5. **Documentation**: Update API docs and user guides

### Feature Implementation Checklist

- [ ] Database schema changes (if needed)
- [ ] Backend API endpoints
- [ ] Authentication/authorization rules
- [ ] Frontend components and services
- [ ] Error handling
- [ ] Testing
- [ ] Documentation

## Deployment

See the [OCI Deployment Guide](../deployment/oci-deployment.md) for detailed instructions on deploying the application to Oracle Cloud Infrastructure.

## Troubleshooting

### Common Issues

- **Database connection errors**: Check connection string and credentials
- **Authentication issues**: Verify JWT token configuration
- **CORS errors**: Ensure CORS middleware is properly configured
- **Mobile build failures**: Check React Native and Android SDK versions

### Debugging

- Use console.log/console.error for basic debugging
- Use browser developer tools for frontend issues
- Use tools like Postman to test API endpoints
- Check server logs for backend errors

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write tests
5. Submit a pull request

## Resources

- [Express.js Documentation](https://expressjs.com/)
- [React Documentation](https://reactjs.org/docs/getting-started.html)
- [React Native Documentation](https://reactnative.dev/docs/getting-started)
- [Oracle Database Documentation](https://docs.oracle.com/en/database/)
- [JWT Authentication](https://jwt.io/introduction/)