# HRMS Leave Management - Frontend

This is the frontend application for the HRMS Leave Management Portal, built with React, TypeScript, and Tailwind CSS.

## Technology Stack

- React 18
- TypeScript
- Tailwind CSS
- Context API for state management
- React Router for navigation

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

### `npm test`

Launches the test runner in the interactive watch mode.

### `npm run build`

Builds the app for production to the `build` folder.

## Project Structure

```
src/
├── components/     # Reusable UI components
├── contexts/       # React Context providers
├── hooks/         # Custom React hooks
├── pages/         # Page components
├── services/      # API service functions
├── types/         # TypeScript type definitions
└── utils/         # Utility functions
```

## Features

- 🔐 Secure authentication with JWT
- 📱 Responsive design for all devices
- 🎨 Modern UI with Tailwind CSS
- 🔄 Real-time leave balance updates
- 📊 Interactive dashboards and reports
- 👥 Role-based access control

## Environment Setup

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Update the environment variables:
   ```
   REACT_APP_API_URL=http://localhost:5000/api
   ```

## Development Guidelines

- Follow the TypeScript strict mode guidelines
- Use functional components with hooks
- Implement proper error handling
- Write unit tests for critical components
- Follow the Tailwind CSS class naming conventions

## Authentication

The app uses JWT tokens for authentication. The token is stored in localStorage and managed through the AuthContext.

## Available Routes

- `/login` - User authentication
- `/dashboard` - Main dashboard
- `/leaves/apply` - Leave application
- `/leaves/my-leaves` - Personal leave history
- `/leaves/team` - Team leave management
- `/reports` - Leave reports
- `/settings` - User settings

## Contributing

1. Follow the TypeScript and ESLint guidelines
2. Create meaningful commit messages
3. Write or update tests as needed
4. Update documentation for any new features

For detailed contribution guidelines, see the main project README.
