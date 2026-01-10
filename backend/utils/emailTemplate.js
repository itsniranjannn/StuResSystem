// backend/utils/emailTemplates.js
const verificationEmailTemplate = (user, code) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body {
            font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
        }
        .container {
            background: white;
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 0 20px 60px rgba(0,0,0,0.1);
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 40px 30px;
            text-align: center;
            color: white;
        }
        .content {
            padding: 40px;
        }
        .code {
            font-size: 42px;
            font-weight: 700;
            letter-spacing: 8px;
            color: #667eea;
            text-align: center;
            margin: 30px 0;
            background: #f7f9fc;
            padding: 20px;
            border-radius: 12px;
            border: 2px dashed #e2e8f0;
        }
        .button {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 14px 32px;
            text-decoration: none;
            border-radius: 10px;
            font-weight: 600;
            margin: 20px 0;
            transition: transform 0.3s;
        }
        .button:hover {
            transform: translateY(-2px);
        }
        .footer {
            background: #f8fafc;
            padding: 30px;
            text-align: center;
            color: #64748b;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="margin: 0; font-size: 28px;">🔐 Verify Your Email</h1>
            <p style="margin: 10px 0 0; opacity: 0.9;">Student Result System - TU BCA</p>
        </div>
        
        <div class="content">
            <h2>Hello ${user.name}!</h2>
            <p>Welcome to Student Result System. Use the verification code below to complete your registration:</p>
            
            <div class="code">${code}</div>
            
            <p style="color: #64748b;">This code will expire in 10 minutes.</p>
            
            <div style="text-align: center;">
                <a href="${process.env.FRONTEND_URL}/verify-email" class="button">Verify Email Now</a>
            </div>
            
            <p style="font-size: 14px; color: #94a3b8;">
                If you didn't create this account, you can safely ignore this email.
            </p>
        </div>
        
        <div class="footer">
            <p>© ${new Date().getFullYear()} Student Result System | Tribhuvan University</p>
            <p>BCA 6th Semester Project II - Result Analysis & Ranking System</p>
        </div>
    </div>
</body>
</html>
`;

module.exports = { verificationEmailTemplate };