# HRMS Leave Management Portal

A comprehensive web-based Leave Management Portal as part of an HRMS system that streamlines leave application, approval workflows, leave balance tracking, and reporting.

## Features

### 🎯 Core Functionality
- **Leave Application & Approval Workflows**: Employees can apply for leave, managers/admins can approve or reject requests
- **Leave Balance Tracking**: Real-time tracking of Sick, Casual, and Vacation leave balances
- **Multiple Leave Types**: Sick, Casual, Vacation, Comp Off, LOP (Loss of Pay), WFH (Work From Home), and Academic leave
- **Role-Based Access Control**: Different access levels for Employees, Managers, and Admins

### 📋 Leave Management Rules
- **Sick Leave**: Can be applied on the same day (with configurable time cutoff)
- **Casual & Vacation Leave**: Must be applied for advance working days (configurable)
- **Academic Leave**: Requires supporting documents for students
- **LOP Management**: Leave beyond available balance is treated as Loss of Pay
- **Comp Off**: Employees can add compensation offs for extra work
- **WFH**: Work from home marking capability

### 🔧 Administrative Features
- **Configurable Leave Quotas**: Admin interface to set leave quotas for different employee types
- **Holiday Calendar Management**: Add/remove public holidays
- **User Management**: Create, update, and manage user accounts
- **Monthly Leave Accrual**: Automatic monthly leave crediting
- **Carry Forward Rules**: Unused leaves carry forward with configurable caps

### ⚡ Advanced Features
- **Leave Validation**: Prevents overlapping leaves, weekend/holiday applications
- **Email Notifications**: Automatic notifications to HR for leave actions
- **Leave History**: Complete audit trail of all leave transactions
- **Balance Protection**: Pending applications don't affect visible balance
- **Cancellation**: Employees can cancel leaves before start date

## Technology Stack

### Backend
- **Node.js** with Express.js framework
- **MongoDB** with Mongoose ODM
- **JWT** for authentication
- **bcryptjs** for password hashing
- **nodemailer** for email notifications

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **React Router** for navigation
- **Context API** for state management
- **Axios** for API requests

## Project Structure

```
hrms-leave-app/
├── client/                 # React frontend application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── contexts/      # React Context providers
│   │   ├── hooks/        # Custom React hooks
│   │   ├── pages/        # Page components
│   │   ├── services/     # API service functions
│   │   ├── types/        # TypeScript interfaces
│   │   └── utils/        # Utility functions
│   └── public/           # Static assets
├── server/
│   ├── config/           # Database & app configuration
│   ├── controllers/      # Route controllers
│   ├── middleware/       # Auth & request middleware
│   ├── models/           # Database models
│   ├── routes/           # API routes
│   ├── services/         # Business logic services
│   └── utils/            # Helper functions
└── uploads/              # File upload directory
```

## Getting Started

### Prerequisites
- Node.js >= 14.x
- MongoDB >= 4.x
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd hrms-leave-app
   ```

2. **Backend Setup**
   ```bash
   # Install backend dependencies
   npm install
   
   # Copy environment file
   cp env.example .env
   
   # Generate JWT secret
   node generate-jwt-secret.js
   
   # Update .env with your MongoDB URI and other configurations
   ```

3. **Frontend Setup**
   ```bash
   # Navigate to client directory
   cd client
   
   # Install frontend dependencies
   npm install
   
   # Copy environment file
   cp .env.example .env
   
   # Update REACT_APP_API_URL in .env
   ```

4. **Start Development Servers**
   ```bash
   # Terminal 1 - Start backend
   npm run server
   
   # Terminal 2 - Start frontend
   cd client && npm start
   ```

5. **Access the Application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

### Default Users

After setup, the following test users are available:

| Email | Password | Role | Type |
|-------|----------|------|------|
| admin@company.com | password123 | Admin | Regular |
| jane@company.com | password123 | Manager | Regular |
| john@company.com | password123 | Employee | Regular |
| intern@company.com | password123 | Employee | Intern |

## Development Workflow

1. **Environment Setup**
   - Follow the setup guides in `ENV_SETUP_GUIDE.md`
   - Use appropriate .env files for different environments

2. **Database Migrations**
   - Check `DATABASE_MIGRATION_SUMMARY.md` for migration history
   - Run migrations: `npm run migrate`

3. **Testing**
   - Backend tests: `npm run test`
   - Frontend tests: `cd client && npm test`
   - Integration tests: `npm run test:integration`

4. **Code Quality**
   - ESLint for code style
   - Prettier for code formatting
   - TypeScript for type safety

## API Documentation

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration (admin only)
- `GET /api/auth/me` - Get current user
- `POST /api/auth/change-password` - Change password

### Leave Management
- `GET /api/leaves/my-leaves` - Get user's leaves
- `POST /api/leaves/apply` - Apply for leave
- `PUT /api/leaves/cancel/:leaveId` - Cancel leave
- `GET /api/leaves/balance` - Get leave balance
- `POST /api/leaves/wfh` - Mark work from home
- `POST /api/leaves/comp-off` - Add compensation off

### Admin/Manager Routes
- `GET /api/leaves/all` - Get all leaves
- `GET /api/leaves/pending` - Get pending leaves
- `PUT /api/leaves/update-status/:leaveId` - Approve/reject leave
- `GET /api/admin/users` - Manage users
- `POST /api/admin/holidays` - Manage holidays
- `PUT /api/admin/quotas` - Update leave quotas

## Configuration

### Leave Quotas
The system supports configurable leave quotas for different employee types:

**Regular Employees (Annual)**
- Sick Leave: 12 days
- Casual Leave: 8 days
- Vacation Leave: 20 days

**Interns (Annual)**
- Sick Leave: 6 days
- Casual Leave: 6 days
- Vacation Leave: 0 days

### System Settings
- Advance notice requirements
- Sick leave same-day cutoff time
- Maximum LOP days per year
- Carry forward caps

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Support

For support and questions:
1. Check the documentation in the `docs` folder
2. Open an issue in the GitHub repository
3. Contact the development team

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Note**: For production deployment, ensure proper security configurations, environment variables, and database setup. 