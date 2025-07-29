# Development Guide

This guide provides detailed information for developers working on the HRMS Leave Management Portal.

## Development Environment Setup

### Required Tools
- Node.js >= 14.x
- MongoDB >= 4.x
- VS Code (recommended)
- Git

### VS Code Extensions
- ESLint
- Prettier
- TypeScript and JavaScript Language Features
- Tailwind CSS IntelliSense
- MongoDB for VS Code

### Code Style

1. **TypeScript**
   - Use strict mode
   - Define interfaces for all data structures
   - Use proper type annotations
   - Avoid `any` type unless absolutely necessary

2. **React**
   - Use functional components
   - Implement proper error boundaries
   - Use React.memo() for performance optimization
   - Follow the React hooks rules

3. **CSS/Tailwind**
   - Use Tailwind utility classes
   - Create custom components for repeated styles
   - Follow mobile-first approach
   - Use CSS modules for component-specific styles

## Git Workflow

1. **Branch Naming**
   - feature/feature-name
   - bugfix/bug-description
   - hotfix/issue-description
   - release/version-number

2. **Commit Messages**
   ```
   type(scope): description

   [optional body]
   [optional footer]
   ```
   Types: feat, fix, docs, style, refactor, test, chore

3. **Pull Request Process**
   - Create feature branch
   - Make changes
   - Run tests
   - Update documentation
   - Create pull request
   - Request review
   - Address feedback
   - Merge after approval

## Testing

### Backend Tests
```bash
# Run all tests
npm test

# Run specific test file
npm test -- test/auth.test.js

# Run with coverage
npm run test:coverage
```

### Frontend Tests
```bash
cd client

# Run all tests
npm test

# Run specific test
npm test -- MyComponent.test.tsx

# Update snapshots
npm test -- -u
```

### Integration Tests
```bash
# Run all integration tests
npm run test:integration

# Run specific suite
npm run test:integration -- --grep "Auth API"
```

## Debugging

### Backend
1. Using VS Code debugger:
   - Set breakpoints
   - Use launch configuration in .vscode/launch.json
   - Start debugging session

2. Using console:
   ```javascript
   console.log('Debug:', variable);
   console.table(arrayData);
   console.trace('Stack trace');
   ```

### Frontend
1. React Developer Tools
   - Components tab for component inspection
   - Profiler tab for performance analysis

2. Console debugging:
   ```typescript
   console.log('State:', state);
   console.group('API Response');
   console.log(data);
   console.groupEnd();
   ```

## Performance Optimization

### Backend
1. Database
   - Create proper indexes
   - Use lean queries
   - Implement caching
   - Optimize aggregation pipelines

2. API
   - Implement pagination
   - Use proper error handling
   - Optimize file uploads
   - Use compression

### Frontend
1. React
   - Implement code splitting
   - Use React.lazy for route-based splitting
   - Optimize re-renders
   - Use proper key props

2. Assets
   - Optimize images
   - Use lazy loading
   - Implement proper caching
   - Minify production builds

## Common Issues & Solutions

### Backend
1. MongoDB Connection
   ```javascript
   // Use proper connection options
   mongoose.connect(uri, {
     useNewUrlParser: true,
     useUnifiedTopology: true,
     serverSelectionTimeoutMS: 5000
   });
   ```

2. JWT Authentication
   ```javascript
   // Proper error handling
   try {
     const decoded = jwt.verify(token, process.env.JWT_SECRET);
   } catch (error) {
     if (error instanceof jwt.TokenExpiredError) {
       // Handle expired token
     }
     // Handle other errors
   }
   ```

### Frontend
1. State Updates
   ```typescript
   // Use functional updates
   setCount(prev => prev + 1);
   ```

2. API Error Handling
   ```typescript
   try {
     const response = await api.get('/data');
   } catch (error) {
     if (axios.isAxiosError(error)) {
       // Handle API error
     }
     // Handle other errors
   }
   ```

## Deployment

### Production Build
1. Backend
   ```bash
   # Set production environment
   export NODE_ENV=production
   
   # Install dependencies
   npm ci
   
   # Build
   npm run build
   ```

2. Frontend
   ```bash
   cd client
   
   # Install dependencies
   npm ci
   
   # Build
   npm run build
   ```

### Environment Variables
1. Backend (.env)
   ```
   NODE_ENV=production
   MONGODB_URI=your_mongodb_uri
   JWT_SECRET=your_jwt_secret
   SMTP_HOST=your_smtp_host
   ```

2. Frontend (.env)
   ```
   REACT_APP_API_URL=your_api_url
   REACT_APP_ENV=production
   ```

## Security Best Practices

1. Input Validation
   - Validate all user inputs
   - Sanitize data before storage
   - Use proper content security policies

2. Authentication
   - Implement proper password hashing
   - Use secure session management
   - Implement rate limiting

3. API Security
   - Use HTTPS
   - Implement CORS properly
   - Validate API tokens
   - Implement request validation

## Monitoring & Logging

1. Backend
   - Use Winston for logging
   - Implement proper error tracking
   - Monitor server resources
   - Track API performance

2. Frontend
   - Implement error boundary logging
   - Track user interactions
   - Monitor performance metrics
   - Use analytics tools

## Additional Resources

1. Documentation
   - API Documentation
   - Component Documentation
   - Database Schema
   - Architecture Diagrams

2. Tools
   - Postman Collection
   - VS Code Settings
   - Git Hooks
   - Docker Compose Files

---

For any questions or clarifications, please contact the development team or open an issue in the repository. 