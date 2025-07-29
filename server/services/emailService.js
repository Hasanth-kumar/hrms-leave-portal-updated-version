const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

class EmailService {
    constructor() {
        this.transporter = null;
        this.initializeTransporter();
    }

    initializeTransporter() {
        // Use environment variables for email configuration
        const emailConfig = {
            host: process.env.SMTP_HOST || 'localhost',
            port: parseInt(process.env.SMTP_PORT) || 587,
            secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USER || 'test@example.com',
                pass: process.env.SMTP_PASS || 'password'
            }
        };

        // For development, use Ethereal Email (fake SMTP service)
        if (process.env.NODE_ENV === 'development' || !process.env.SMTP_HOST) {
            // Create a test account for development
            this.createTestAccount();
        } else {
            this.transporter = nodemailer.createTransport(emailConfig);
        }
    }

    async createTestAccount() {
        try {
            const testAccount = await nodemailer.createTestAccount();
            
            this.transporter = nodemailer.createTransport({
                host: 'smtp.ethereal.email',
                port: 587,
                secure: false,
                auth: {
                    user: testAccount.user,
                    pass: testAccount.pass,
                },
            });

            console.log('📧 Development Email Service Initialized');
            console.log(`📧 Test Email User: ${testAccount.user}`);
            console.log(`📧 Test Email Pass: ${testAccount.pass}`);
            console.log('📧 View emails at: https://ethereal.email/');
        } catch (error) {
            console.error('Failed to create test email account:', error);
        }
    }

    async sendEmail(to, subject, htmlContent, textContent = null) {
        try {
            if (!this.transporter) {
                console.error('Email transporter not initialized');
                return false;
            }

            const mailOptions = {
                from: process.env.FROM_EMAIL || 'HRMS System <noreply@company.com>',
                to: to,
                subject: subject,
                text: textContent || this.htmlToText(htmlContent),
                html: htmlContent
            };

            const info = await this.transporter.sendMail(mailOptions);
            
            if (process.env.NODE_ENV === 'development') {
                console.log('📧 Email sent successfully!');
                console.log('📧 Preview URL:', nodemailer.getTestMessageUrl(info));
            } else {
                console.log('📧 Email sent:', info.messageId);
            }

            return true;
        } catch (error) {
            console.error('Email sending failed:', error);
            return false;
        }
    }

    htmlToText(html) {
        // Simple HTML to text conversion
        return html
            .replace(/<[^>]*>/g, '') // Remove HTML tags
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .trim();
    }

    // Leave application email
    async sendLeaveApplicationEmail(leave, action = 'applied') {
        const user = leave.userId;
        const hrEmail = process.env.HR_EMAIL || 'hr@company.com';
        
        const subject = `Leave ${action.charAt(0).toUpperCase() + action.slice(1)} - ${user.name}`;
        
        const htmlContent = this.generateLeaveEmailTemplate(leave, user, action);
        
        // Send to HR
        await this.sendEmail(hrEmail, subject, htmlContent);
        
        // Send confirmation to employee (except for application)
        if (action !== 'applied') {
            const employeeSubject = `Your Leave Request ${action.charAt(0).toUpperCase() + action.slice(1)}`;
            const employeeContent = this.generateEmployeeNotificationTemplate(leave, user, action);
            await this.sendEmail(user.email, employeeSubject, employeeContent);
        }
    }

    // Academic leave email with documents notification
    async sendAcademicLeaveEmail(leave, action = 'applied') {
        const user = leave.userId;
        const hrEmail = process.env.HR_EMAIL || 'hr@company.com';
        
        const subject = `Academic Leave ${action.charAt(0).toUpperCase() + action.slice(1)} - ${user.name} (Documents Attached)`;
        
        const htmlContent = this.generateAcademicLeaveEmailTemplate(leave, user, action);
        
        await this.sendEmail(hrEmail, subject, htmlContent);
        
        if (action !== 'applied') {
            const employeeSubject = `Your Academic Leave Request ${action.charAt(0).toUpperCase() + action.slice(1)}`;
            const employeeContent = this.generateEmployeeNotificationTemplate(leave, user, action);
            await this.sendEmail(user.email, employeeSubject, employeeContent);
        }
    }

    // LOP notification email
    async sendLOPAlertEmail(user, lopDetails) {
        const hrEmail = process.env.HR_EMAIL || 'hr@company.com';
        const subject = `LOP Alert - ${user.name} (${lopDetails.totalLOP} days)`;
        
        const htmlContent = this.generateLOPAlertTemplate(user, lopDetails);
        
        await this.sendEmail(hrEmail, subject, htmlContent);
        
        // Notify employee if approaching or exceeding limits
        if (lopDetails.totalLOP >= 5) {
            const employeeSubject = 'LOP Days Alert - Action Required';
            const employeeContent = this.generateEmployeeLOPNotificationTemplate(user, lopDetails);
            await this.sendEmail(user.email, employeeSubject, employeeContent);
        }
    }

    generateLeaveEmailTemplate(leave, user, action) {
        const actionColors = {
            applied: '#3B82F6',
            approved: '#10B981',
            rejected: '#EF4444',
            cancelled: '#6B7280'
        };

        const statusColor = actionColors[action] || '#6B7280';
        
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Leave ${action}</title>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: ${statusColor}; color: white; padding: 20px; text-align: center; }
                .content { background-color: #f9f9f9; padding: 20px; }
                .details { background-color: white; padding: 15px; border-left: 4px solid ${statusColor}; margin: 10px 0; }
                .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
                .status-badge { background-color: ${statusColor}; color: white; padding: 5px 10px; border-radius: 4px; display: inline-block; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Leave Request ${action.charAt(0).toUpperCase() + action.slice(1)}</h1>
                </div>
                
                <div class="content">
                    <h2>Employee Information</h2>
                    <div class="details">
                        <p><strong>Name:</strong> ${user.name}</p>
                        <p><strong>Email:</strong> ${user.email}</p>
                        <p><strong>Department:</strong> ${user.department || 'Not specified'}</p>
                        <p><strong>Employee Type:</strong> ${user.type || 'Regular'}</p>
                    </div>

                    <h2>Leave Details</h2>
                    <div class="details">
                        <p><strong>Leave Type:</strong> <span class="status-badge">${leave.leaveType.toUpperCase()}</span></p>
                        <p><strong>Start Date:</strong> ${new Date(leave.startDate).toLocaleDateString()}</p>
                        <p><strong>End Date:</strong> ${new Date(leave.endDate).toLocaleDateString()}</p>
                        <p><strong>Working Days:</strong> ${leave.workingDays}</p>
                        ${leave.isHalfDay ? '<p><strong>Half Day:</strong> Yes</p>' : ''}
                        ${leave.lopDays && leave.lopDays > 0 ? `<p><strong>LOP Days:</strong> ${leave.lopDays}</p>` : ''}
                        <p><strong>Status:</strong> <span class="status-badge">${leave.status.toUpperCase()}</span></p>
                        <p><strong>Applied On:</strong> ${new Date(leave.createdAt).toLocaleDateString()}</p>
                    </div>

                    <h2>Reason</h2>
                    <div class="details">
                        <p>${leave.reason}</p>
                    </div>

                    ${leave.documents && leave.documents.length > 0 ? `
                    <h2>Documents</h2>
                    <div class="details">
                        <p>${leave.documents.length} document(s) attached:</p>
                        <ul>
                            ${leave.documents.map(doc => `<li>${doc.fileName}</li>`).join('')}
                        </ul>
                    </div>
                    ` : ''}

                    ${leave.rejectionReason ? `
                    <h2>Rejection Reason</h2>
                    <div class="details">
                        <p>${leave.rejectionReason}</p>
                    </div>
                    ` : ''}
                </div>

                <div class="footer">
                    <p>This is an automated notification from HRMS Leave Management System</p>
                    <p>Please do not reply to this email</p>
                </div>
            </div>
        </body>
        </html>
        `;
    }

    generateAcademicLeaveEmailTemplate(leave, user, action) {
        // Academic leave has special formatting
        let template = this.generateLeaveEmailTemplate(leave, user, action);
        
        // Add academic leave specific notices
        if (action === 'applied') {
            template = template.replace(
                '<div class="footer">',
                `<div class="content">
                    <h2 style="color: #8B5CF6;">Academic Leave Notice</h2>
                    <div class="details" style="border-left-color: #8B5CF6;">
                        <p><strong>⚠️ Requires HR Approval:</strong> Academic leave requests require approval from both manager and HR.</p>
                        <p><strong>📄 Documents Required:</strong> Supporting documents have been attached and must be reviewed.</p>
                        <p><strong>⏰ Review Time:</strong> Academic leave requests may take additional time for approval due to documentation review.</p>
                    </div>
                </div>
                <div class="footer">`
            );
        }
        
        return template;
    }

    generateEmployeeNotificationTemplate(leave, user, action) {
        const actionColors = {
            approved: '#10B981',
            rejected: '#EF4444',
            cancelled: '#6B7280'
        };

        const statusColor = actionColors[action] || '#6B7280';
        const actionText = {
            approved: 'Your leave request has been approved! 🎉',
            rejected: 'Your leave request has been rejected.',
            cancelled: 'Your leave request has been cancelled.'
        };

        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Leave Request ${action}</title>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: ${statusColor}; color: white; padding: 20px; text-align: center; }
                .content { background-color: #f9f9f9; padding: 20px; }
                .details { background-color: white; padding: 15px; border-left: 4px solid ${statusColor}; margin: 10px 0; }
                .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>${actionText[action]}</h1>
                </div>
                
                <div class="content">
                    <p>Dear ${user.name},</p>
                    
                    <div class="details">
                        <p><strong>Leave Type:</strong> ${leave.leaveType.toUpperCase()}</p>
                        <p><strong>Dates:</strong> ${new Date(leave.startDate).toLocaleDateString()} - ${new Date(leave.endDate).toLocaleDateString()}</p>
                        <p><strong>Working Days:</strong> ${leave.workingDays}</p>
                    </div>

                    ${leave.rejectionReason ? `
                    <h3 style="color: #EF4444;">Reason for Rejection:</h3>
                    <div class="details">
                        <p>${leave.rejectionReason}</p>
                    </div>
                    ` : ''}

                    ${action === 'approved' ? `
                    <p>Please ensure proper handover of responsibilities before your leave starts.</p>
                    ` : ''}

                    ${action === 'rejected' ? `
                    <p>If you have any questions about this decision, please contact your manager or HR.</p>
                    ` : ''}
                </div>

                <div class="footer">
                    <p>HRMS Leave Management System</p>
                    <p>This is an automated notification - please do not reply</p>
                </div>
            </div>
        </body>
        </html>
        `;
    }

    generateLOPAlertTemplate(user, lopDetails) {
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>LOP Alert</title>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #EF4444; color: white; padding: 20px; text-align: center; }
                .content { background-color: #f9f9f9; padding: 20px; }
                .alert { background-color: #FEF2F2; border: 1px solid #FECACA; padding: 15px; border-radius: 4px; margin: 10px 0; }
                .details { background-color: white; padding: 15px; border-left: 4px solid #EF4444; margin: 10px 0; }
                .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>⚠️ LOP Alert - Action Required</h1>
                </div>
                
                <div class="content">
                    <div class="alert">
                        <p><strong>Employee:</strong> ${user.name} has accumulated significant LOP days.</p>
                    </div>

                    <h2>Employee Information</h2>
                    <div class="details">
                        <p><strong>Name:</strong> ${user.name}</p>
                        <p><strong>Email:</strong> ${user.email}</p>
                        <p><strong>Department:</strong> ${user.department || 'Not specified'}</p>
                    </div>

                    <h2>LOP Summary</h2>
                    <div class="details">
                        <p><strong>Total LOP Days (Year):</strong> ${lopDetails.yearlyLOP}</p>
                        <p><strong>LOP Days (Current Month):</strong> ${lopDetails.monthlyLOP}</p>
                        <p><strong>Maximum Allowed (Year):</strong> ${lopDetails.maxYearlyLOP}</p>
                        <p><strong>Maximum Allowed (Month):</strong> ${lopDetails.maxMonthlyLOP}</p>
                    </div>

                    ${lopDetails.yearlyLOP >= lopDetails.maxYearlyLOP ? `
                    <div class="alert">
                        <p><strong>⚠️ LIMIT EXCEEDED:</strong> Employee has reached or exceeded the yearly LOP limit!</p>
                    </div>
                    ` : ''}

                    <h3>Recommended Actions:</h3>
                    <ul>
                        <li>Review employee's attendance patterns</li>
                        <li>Schedule a meeting to discuss leave management</li>
                        <li>Consider performance improvement plan if necessary</li>
                        <li>Update leave policies if required</li>
                    </ul>
                </div>

                <div class="footer">
                    <p>HRMS Leave Management System - Automated Alert</p>
                </div>
            </div>
        </body>
        </html>
        `;
    }

    generateEmployeeLOPNotificationTemplate(user, lopDetails) {
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>LOP Days Alert</title>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #F59E0B; color: white; padding: 20px; text-align: center; }
                .content { background-color: #f9f9f9; padding: 20px; }
                .alert { background-color: #FEF3C7; border: 1px solid #FCD34D; padding: 15px; border-radius: 4px; margin: 10px 0; }
                .details { background-color: white; padding: 15px; border-left: 4px solid #F59E0B; margin: 10px 0; }
                .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>📊 Leave Balance Alert</h1>
                </div>
                
                <div class="content">
                    <p>Dear ${user.name},</p>
                    
                    <div class="alert">
                        <p><strong>⚠️ Important:</strong> You have accumulated ${lopDetails.totalLOP} Loss of Pay (LOP) days this year.</p>
                    </div>

                    <div class="details">
                        <p><strong>Current LOP Days:</strong> ${lopDetails.totalLOP}</p>
                        <p><strong>Maximum Allowed:</strong> ${lopDetails.maxYearlyLOP} days per year</p>
                        <p><strong>Remaining:</strong> ${Math.max(0, lopDetails.maxYearlyLOP - lopDetails.totalLOP)} days</p>
                    </div>

                    ${lopDetails.totalLOP >= lopDetails.maxYearlyLOP ? `
                    <div class="alert" style="background-color: #FEE2E2; border-color: #FECACA;">
                        <p><strong>🚫 LIMIT REACHED:</strong> You have reached the maximum LOP limit for this year. Further leave without balance may result in additional consequences.</p>
                    </div>
                    ` : ''}

                    <h3>What you can do:</h3>
                    <ul>
                        <li>Plan your leaves in advance to avoid LOP</li>
                        <li>Check your leave balance before applying</li>
                        <li>Consider comp-off credits for extra work</li>
                        <li>Speak with your manager about attendance concerns</li>
                    </ul>

                    <p>If you have any questions, please contact HR or your manager.</p>
                </div>

                <div class="footer">
                    <p>HRMS Leave Management System</p>
                </div>
            </div>
        </body>
        </html>
        `;
    }
}

module.exports = new EmailService(); 