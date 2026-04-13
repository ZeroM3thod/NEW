import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { firstName, lastName, email, subject, message } = body;

    // Basic validation
    if (!firstName || !email || !message) {
      return NextResponse.json(
        { error: 'firstName, email, and message are required.' },
        { status: 400 }
      );
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, ''),
      },
    });

    const mailOptions = {
      from: `"VaultX Contact Form" <${process.env.GMAIL_USER}>`,
      to: process.env.GMAIL_TO || 'hassrb4@gmail.com',
      replyTo: email,
      subject: `[VaultX Contact] ${subject || 'New Message'}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'DM Sans', Arial, sans-serif; background: #f6f1e9; margin: 0; padding: 0; }
            .wrapper { max-width: 600px; margin: 30px auto; background: #faf7f2; border: 1px solid rgba(184,147,90,0.25); border-radius: 8px; overflow: hidden; }
            .header { background: #1c1c1c; padding: 28px 32px; }
            .header h1 { font-family: Georgia, serif; color: #d4aa72; font-size: 22px; margin: 0; font-weight: 400; letter-spacing: 0.05em; }
            .header p { color: rgba(246,241,233,0.45); font-size: 12px; margin: 6px 0 0; letter-spacing: 0.08em; text-transform: uppercase; }
            .body { padding: 32px; }
            .row { margin-bottom: 20px; }
            .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.12em; color: #6b6459; margin-bottom: 5px; }
            .value { font-size: 15px; color: #1c1c1c; background: #ede7da; border: 1px solid rgba(184,147,90,0.18); border-radius: 4px; padding: 10px 14px; }
            .message-value { white-space: pre-wrap; line-height: 1.7; }
            .footer { padding: 18px 32px; border-top: 1px solid rgba(184,147,90,0.18); background: #f6f1e9; }
            .footer p { font-size: 11px; color: #9c9186; margin: 0; text-align: center; letter-spacing: 0.05em; }
          </style>
        </head>
        <body>
          <div class="wrapper">
            <div class="header">
              <h1>VaultX — New Contact Message</h1>
              <p>Received from your website contact form</p>
            </div>
            <div class="body">
              <div class="row">
                <div class="label">Full Name</div>
                <div class="value">${firstName} ${lastName || ''}</div>
              </div>
              <div class="row">
                <div class="label">Email Address</div>
                <div class="value">${email}</div>
              </div>
              <div class="row">
                <div class="label">Subject</div>
                <div class="value">${subject || '(no subject)'}</div>
              </div>
              <div class="row">
                <div class="label">Message</div>
                <div class="value message-value">${message}</div>
              </div>
              <div class="row">
                <div class="label">Sent At</div>
                <div class="value">${new Date().toLocaleString('en-GB', { timeZone: 'Asia/Dhaka', dateStyle: 'full', timeStyle: 'short' })}</div>
              </div>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} VaultX · This email was sent from your website contact form.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    await transporter.sendMail(mailOptions);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Contact form email error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to send email.' },
      { status: 500 }
    );
  }
}