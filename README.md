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

### Frontend
- **HTML5**, **CSS3**, **JavaScript**
- **Responsive Design** for mobile compatibility

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Hasanth-kumar/hrms-leave-portal-updated-version.git
   cd hrms-leave-portal-updated-version
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp env.example .env
   ```
   Update the `.env` file with your MongoDB connection string and other configurations.

4. **Database Setup**
   ```bash
   npm run migrate
   ```

5. **Start the application**
   ```bash
   npm start
   ```

6. **Access the application**
   - Open your browser and navigate to `http://localhost:3000`

## Default Users

After running migrations, the following test users are created:

| Email | Password | Role | Type |
|-------|----------|------|------|
| admin@company.com | password123 | Admin | Regular |
| jane@company.com | password123 | Manager | Regular |
| john@company.com | password123 | Employee | Regular |
| intern@company.com | password123 | Employee | Intern |

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration (development)
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

## Project Structure

```
hrms-leave-app/
├── server/
│   ├── config/          # Database configuration
│   ├── controllers/     # Route controllers
│   ├── middleware/      # Authentication & authorization
│   ├── models/          # Database models
│   ├── routes/          # API routes
│   ├── services/        # Business logic services
│   ├── utils/           # Utility functions
│   └── server.js        # Main server file
├── public/              # Frontend files
│   ├── html files       # UI pages
│   └── js/              # Frontend JavaScript
├── data/                # Data storage
└── package.json         # Dependencies
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support and questions, please open an issue in the GitHub repository.

---

**Note**: This is a development version. For production deployment, ensure proper security configurations, environment variables, and database setup. 