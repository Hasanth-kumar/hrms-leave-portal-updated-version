const User = require('../models/User');

// Get team members for a manager
const getTeamMembers = async (req, res) => {
    try {
        const currentUser = req.user;
        
        if (!currentUser) {
            return res.status(401).json({ 
                success: false, 
                message: 'Not authenticated' 
            });
        }

        // Get all team members based on managerId and department
        const teamMembers = await User.find({ 
            $or: [
                { managerId: currentUser._id },
                { department: currentUser.department }
            ],
            _id: { $ne: currentUser._id },
            isActive: true
        })
        .select('name email department role type joiningDate')
        .sort('name');

        // Group members by department
        const membersByDepartment = teamMembers.reduce((acc, member) => {
            const dept = member.department || 'Unassigned';
            if (!acc[dept]) {
                acc[dept] = [];
            }
            acc[dept].push({
                id: member._id,
                name: member.name,
                email: member.email,
                role: member.role,
                type: member.type,
                joiningDate: member.joiningDate
            });
            return acc;
        }, {});
        
        res.json({
            success: true,
            data: {
                departments: Object.keys(membersByDepartment),
                members: membersByDepartment
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching team members',
            error: error.message
        });
    }
};

module.exports = {
    getTeamMembers
}; 