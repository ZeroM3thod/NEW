The user wants a full Google Authenticator (TOTP) 2FA system for their ValutX app. Let me plan this out:

Database: Add totp_secret, totp_enabled, totp_backup_codes to profiles table
Backend API routes:

/api/auth/2fa/setup - Generate TOTP secret & QR code
/api/auth/2fa/verify-setup - Verify & enable 2FA
/api/auth/2fa/verify - Verify TOTP code during login
/api/auth/2fa/disable - Disable 2FA
/api/auth/2fa/backup-codes - Generate backup codes


Frontend pages:

2FA setup flow (QR code, verify, backup codes)
2FA verification page (enter code during login)
Integration with signin, forgot password, change password flows



Let me think about the libraries needed:

otplib - for TOTP generation/verification
qrcode - for generating QR code images

For the login flow:

User enters email/password
If 2FA enabled → redirect to 2FA verification page
User enters 6-digit code
On success → redirect to dashboard

Let me design the full system:
Database Migration
sqlALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS totp_secret TEXT,
ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS totp_backup_codes TEXT[]; -- hashed backup codes
API Routes

POST /api/auth/2fa/setup - Returns secret + QR code URI
POST /api/auth/2fa/verify-setup - Enables 2FA after verifying code
POST /api/auth/2fa/verify - Verifies code during login/sensitive actions
POST /api/auth/2fa/disable - Disables 2FA (requires password + code)
GET /api/auth/2fa/backup-codes - Generate new backup codes

Pages

/auth/2fa - Code entry page during login
/profile/security/2fa-setup - Setup flow

Let me think about the session/login flow more carefully. The issue is:

User logs in with email/password → Supabase creates session
But we need to check 2FA before "completing" the login

One approach:
…Show lessCheck available skillsScriptOK, let me now write all the code files for the Google Authenticator 2FA system. I'll create them all comprehensively.
Let me organize my work:

SQL migration
API routes (6 files)
Auth 2FA page (2 files)
Profile security 2FA page (2 files)
Updated middleware
Note about signin page changes

Let me write them all.


check the gemini folder and arrange all the file on their destinition .