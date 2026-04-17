import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { createClient } from '@/utils/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const { depositId } = await req.json();
    if (!depositId) {
      return NextResponse.json({ error: 'depositId is required' }, { status: 400 });
    }

    const supabase = createClient();

    const { data: deposit, error: depErr } = await supabase
      .from('deposits')
      .select('*, profiles(first_name, last_name, email)')
      .eq('id', depositId)
      .single();

    if (depErr || !deposit) {
      return NextResponse.json({ error: 'Deposit not found' }, { status: 404 });
    }

    if (deposit.unlock_email_sent) {
      return NextResponse.json({ success: true, note: 'Already sent' });
    }

    // Mark as sent immediately to prevent duplicate emails
    await supabase
      .from('deposits')
      .update({ unlock_email_sent: true })
      .eq('id', depositId);

    const profile = deposit.profiles as any;
    const userEmail = profile?.email;
    const userName = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'Investor';
    const amount = Number(deposit.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const network = deposit.network || 'BEP-20';
    const shortId = String(depositId).slice(0, 8).toUpperCase();
    const unlockedAt = new Date().toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });

    if (!userEmail) {
      return NextResponse.json({ success: true, note: 'No email on profile' });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, ''),
      },
    });

    await transporter.sendMail({
      from: `"VaultX" <${process.env.GMAIL_USER}>`,
      to: userEmail,
      replyTo: process.env.GMAIL_USER,
      subject: `✅ Your $${amount} USDT Deposit Lock Has Expired — VaultX`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: 'DM Sans', Arial, sans-serif; background: #f6f1e9; margin: 0; padding: 0; }
    .wrapper { max-width: 580px; margin: 32px auto; background: #faf7f2; border: 1px solid rgba(184,147,90,0.22); border-radius: 14px; overflow: hidden; }
    .header { background: #1c1c1c; padding: 36px 32px 32px; text-align: center; }
    .logo-text { font-family: Georgia, serif; font-size: 22px; color: #d4aa72; letter-spacing: 0.04em; margin: 0 0 6px; font-weight: 400; }
    .logo-sub { font-size: 11px; text-transform: uppercase; letter-spacing: 0.14em; color: rgba(246,241,233,0.35); margin: 0; }
    .unlock-pill { display: inline-block; background: rgba(74,103,65,0.2); border: 1px solid rgba(106,140,96,0.4); border-radius: 100px; padding: 6px 18px; font-size: 12px; letter-spacing: 0.1em; text-transform: uppercase; color: #6a8c60; margin-top: 20px; }
    .body { padding: 36px 32px; }
    .greeting { font-size: 16px; color: #1c1c1c; margin: 0 0 14px; }
    .body-text { font-size: 14px; color: #6b6459; line-height: 1.75; margin: 0 0 24px; font-weight: 300; }
    .amount-card { background: #1c1c1c; border-radius: 12px; padding: 28px 24px; text-align: center; margin: 0 0 24px; position: relative; overflow: hidden; }
    .amount-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.16em; color: rgba(246,241,233,0.35); margin: 0 0 10px; }
    .amount-value { font-family: Georgia, serif; font-size: 2.6rem; color: #d4aa72; font-weight: 300; margin: 0; line-height: 1; }
    .amount-usdt { font-size: 13px; color: rgba(246,241,233,0.4); margin-top: 6px; }
    .details-box { background: rgba(184,147,90,0.05); border: 1px solid rgba(184,147,90,0.18); border-radius: 8px; padding: 16px 18px; margin: 0 0 24px; }
    .detail-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid rgba(184,147,90,0.1); }
    .detail-row:last-child { border-bottom: none; padding-bottom: 0; }
    .detail-key { font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #9c9186; }
    .detail-val { font-size: 13px; font-weight: 500; color: #1c1c1c; }
    .detail-val.green { color: #4a6741; }
    .detail-val.mono { font-family: monospace; font-size: 11px; }
    .info-box { background: rgba(74,103,65,0.06); border: 1px solid rgba(74,103,65,0.2); border-radius: 8px; padding: 14px 16px; margin: 0 0 8px; }
    .info-text { font-size: 13px; color: #4a6741; line-height: 1.7; margin: 0; }
    .cta-wrap { text-align: center; margin-top: 28px; }
    .cta-btn { display: inline-block; background: #b8935a; color: #f6f1e9; text-decoration: none; padding: 13px 36px; border-radius: 6px; font-size: 13px; letter-spacing: 0.1em; text-transform: uppercase; font-family: Arial, sans-serif; }
    .footer { padding: 20px 32px; border-top: 1px solid rgba(184,147,90,0.14); background: #f6f1e9; text-align: center; }
    .footer p { font-size: 11px; color: #9c9186; margin: 0; letter-spacing: 0.03em; }
    @media(max-width:600px) {
      .body { padding: 28px 20px; }
      .header { padding: 28px 20px; }
      .amount-value { font-size: 2rem; }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <p class="logo-text">Vault<span style="color:#b8935a">X</span></p>
      <p class="logo-sub">Deposit Notification</p>
      <div class="unlock-pill">&#10003; Funds Unlocked</div>
    </div>
    <div class="body">
      <p class="greeting">Hi <strong>${userName}</strong>,</p>
      <p class="body-text">
        Great news — your deposit has completed its 60-day security lock period and the funds are now <strong style="color:#4a6741">fully available</strong> for withdrawal or further investment.
      </p>

      <div class="amount-card">
        <p class="amount-label">Unlocked Amount</p>
        <p class="amount-value">$${amount}</p>
        <p class="amount-usdt">USDT · ${network}</p>
      </div>

      <div class="details-box">
        <div class="detail-row">
          <span class="detail-key">Deposit ID</span>
          <span class="detail-val mono">${shortId}</span>
        </div>
        <div class="detail-row">
          <span class="detail-key">Network</span>
          <span class="detail-val">${network}</span>
        </div>
        <div class="detail-row">
          <span class="detail-key">Status</span>
          <span class="detail-val green">&#10003; Unlocked &amp; Available</span>
        </div>
        <div class="detail-row">
          <span class="detail-key">Unlocked At</span>
          <span class="detail-val">${unlockedAt}</span>
        </div>
      </div>

      <div class="info-box">
        <p class="info-text">
          &#128274; <strong>What was the lock?</strong> All deposits are held for 60 days as a security measure. During this period you could invest and earn profits, but direct withdrawal of the deposited amount was paused. The lock has now lifted.
        </p>
      </div>

      <div class="cta-wrap">
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://valutx.vercel.app'}/withdraw" class="cta-btn">Withdraw Now</a>
      </div>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} VaultX &middot; This is an automated security notification. Do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Unlock notification error:', err);
    return NextResponse.json({ error: err.message || 'Failed to send notification' }, { status: 500 });
  }
}