import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@/utils/supabase/server';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = 'ValutX Withdrawals <support@valutx.business>';

export async function POST(req: NextRequest) {
  try {
    const { withdrawalId, action } = await req.json() as {
      withdrawalId: string;
      action: 'approved' | 'rejected';
    };

    if (!withdrawalId || !action) {
      return NextResponse.json({ error: 'withdrawalId and action are required.' }, { status: 400 });
    }

    const supabase = createClient();

    /* ── Fetch withdrawal + profile ── */
    const { data: wd, error: wdErr } = await supabase
      .from('withdrawals')
      .select('*, profiles(first_name, last_name, email)')
      .eq('id', withdrawalId)
      .single();

    if (wdErr || !wd) {
      return NextResponse.json({ error: 'Withdrawal not found.' }, { status: 404 });
    }

    const profile  = wd.profiles as any;
    const toEmail  = profile?.email;
    const userName = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'Investor';

    if (!toEmail) {
      return NextResponse.json({ success: true, note: 'No email on profile.' });
    }

    const amount   = Number(wd.amount).toLocaleString('en-US', { minimumFractionDigits: 2 });
    const network  = wd.network || 'BEP-20';
    const shortId  = String(withdrawalId).slice(0, 8).toUpperCase();
    const wallet   = wd.address || '—';
    const shortWallet = wallet.length > 20
      ? wallet.slice(0, 10) + '…' + wallet.slice(-6)
      : wallet;
    const txHash   = wd.tx_hash || null;
    const reason   = wd.rejection_reason || '';
    const sentAt   = new Date().toLocaleString('en-GB', {
      dateStyle: 'medium', timeStyle: 'short',
    });

    /* ════════════════════════════════
       APPROVED TEMPLATE
    ════════════════════════════════ */
    const approvedHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    body{margin:0;padding:0;background:#f6f1e9;font-family:'DM Sans',Arial,sans-serif}
    .wrap{max-width:580px;margin:32px auto;background:#faf7f2;border:1px solid rgba(184,147,90,.22);border-radius:14px;overflow:hidden}
    .hd{background:#1c1c1c;padding:36px 32px;text-align:center}
    .logo{font-size:22px;font-family:Georgia,serif;color:#d4aa72;letter-spacing:.04em;margin:0 0 6px;font-weight:400}
    .logo-sub{font-size:11px;text-transform:uppercase;letter-spacing:.14em;color:rgba(246,241,233,.35);margin:0}
    .pill{display:inline-block;background:rgba(74,103,65,.2);border:1px solid rgba(106,140,96,.4);border-radius:100px;padding:6px 18px;font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:#6a8c60;margin-top:20px}
    .body{padding:36px 32px}
    .greeting{font-size:16px;color:#1c1c1c;margin:0 0 14px}
    .txt{font-size:14px;color:#6b6459;line-height:1.75;margin:0 0 24px;font-weight:300}
    .amt-card{background:#1c1c1c;border-radius:12px;padding:28px 24px;text-align:center;margin:0 0 24px}
    .amt-lbl{font-size:11px;text-transform:uppercase;letter-spacing:.16em;color:rgba(246,241,233,.35);margin:0 0 10px}
    .amt-val{font-family:Georgia,serif;font-size:2.6rem;color:#d4aa72;font-weight:300;margin:0;line-height:1}
    .amt-usdt{font-size:13px;color:rgba(246,241,233,.4);margin-top:6px}
    .dbox{background:rgba(184,147,90,.05);border:1px solid rgba(184,147,90,.18);border-radius:8px;padding:16px 18px;margin:0 0 24px}
    .drow{display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid rgba(184,147,90,.1)}
    .drow:last-child{border-bottom:none;padding-bottom:0}
    .dk{font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:#9c9186}
    .dv{font-size:13px;font-weight:500;color:#1c1c1c}
    .dv-g{color:#4a6741}
    .dv-m{font-family:monospace;font-size:11px;word-break:break-all;text-align:right;max-width:280px}
    .info{background:rgba(74,103,65,.06);border:1px solid rgba(74,103,65,.2);border-radius:8px;padding:14px 16px;margin:0 0 8px}
    .info-t{font-size:13px;color:#4a6741;line-height:1.7;margin:0}
    .cta{text-align:center;margin-top:28px}
    .cta-a{display:inline-block;background:#b8935a;color:#f6f1e9;text-decoration:none;padding:13px 36px;border-radius:6px;font-size:13px;letter-spacing:.1em;text-transform:uppercase}
    .ft{padding:20px 32px;border-top:1px solid rgba(184,147,90,.14);background:#f6f1e9;text-align:center}
    .ft p{font-size:11px;color:#9c9186;margin:0;letter-spacing:.03em}
    @media(max-width:600px){.body,.hd{padding:28px 20px}.amt-val{font-size:2rem}}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="hd">
      <p class="logo">Valut<span style="color:#b8935a">X</span></p>
      <p class="logo-sub">Withdrawal Notification</p>
      <div class="pill">✓ Withdrawal Approved</div>
    </div>
    <div class="body">
      <p class="greeting">Hi <strong>${userName}</strong>,</p>
      <p class="txt">
        Your withdrawal request has been <strong style="color:#4a6741">approved and processed</strong> by our team.
        The funds have been sent to your provided wallet address on the ${network} network.
        Please allow a few minutes for the transaction to confirm on-chain.
      </p>
      <div class="amt-card">
        <p class="amt-lbl">Amount Sent</p>
        <p class="amt-val">$${amount}</p>
        <p class="amt-usdt">USDT · ${network}</p>
      </div>
      <div class="dbox">
        <div class="drow"><span class="dk">Withdrawal ID</span><span class="dv dv-m">${shortId}</span></div>
        <div class="drow"><span class="dk">Network</span><span class="dv">${network}</span></div>
        <div class="drow"><span class="dk">Status</span><span class="dv dv-g">✓ Approved &amp; Sent</span></div>
        <div class="drow"><span class="dk">Wallet</span><span class="dv dv-m">${shortWallet}</span></div>
        ${txHash ? `<div class="drow"><span class="dk">Transaction Hash</span><span class="dv dv-m">${txHash}</span></div>` : ''}
        <div class="drow"><span class="dk">Processed At</span><span class="dv">${sentAt}</span></div>
      </div>
      <div class="info">
        <p class="info-t">
          ⏱ <strong>Confirmation time:</strong>
          BEP-20 transfers typically confirm within 1–3 minutes.
          You can verify your transaction using the hash above on BscScan.
          If you haven't received your funds within 30 minutes, please contact support.
        </p>
      </div>
      <div class="cta">
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://valutx.business'}/withdraw" class="cta-a">View History →</a>
      </div>
    </div>
    <div class="ft">
      <p>© ${new Date().getFullYear()} ValutX · This is an automated notification from withdraw@support.valutx.business</p>
    </div>
  </div>
</body>
</html>`;

    /* ════════════════════════════════
       REJECTED TEMPLATE
    ════════════════════════════════ */
    const rejectedHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    body{margin:0;padding:0;background:#f6f1e9;font-family:'DM Sans',Arial,sans-serif}
    .wrap{max-width:580px;margin:32px auto;background:#faf7f2;border:1px solid rgba(184,147,90,.22);border-radius:14px;overflow:hidden}
    .hd{background:#1c1c1c;padding:36px 32px;text-align:center}
    .logo{font-size:22px;font-family:Georgia,serif;color:#d4aa72;letter-spacing:.04em;margin:0 0 6px;font-weight:400}
    .logo-sub{font-size:11px;text-transform:uppercase;letter-spacing:.14em;color:rgba(246,241,233,.35);margin:0}
    .pill{display:inline-block;background:rgba(155,58,58,.18);border:1px solid rgba(155,58,58,.3);border-radius:100px;padding:6px 18px;font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:#c97070;margin-top:20px}
    .body{padding:36px 32px}
    .greeting{font-size:16px;color:#1c1c1c;margin:0 0 14px}
    .txt{font-size:14px;color:#6b6459;line-height:1.75;margin:0 0 24px;font-weight:300}
    .amt-card{background:#1c1c1c;border-radius:12px;padding:28px 24px;text-align:center;margin:0 0 24px}
    .amt-lbl{font-size:11px;text-transform:uppercase;letter-spacing:.16em;color:rgba(246,241,233,.35);margin:0 0 10px}
    .amt-val{font-family:Georgia,serif;font-size:2.6rem;color:#d4aa72;font-weight:300;margin:0;line-height:1}
    .amt-usdt{font-size:13px;color:rgba(246,241,233,.4);margin-top:6px}
    .dbox{background:rgba(184,147,90,.05);border:1px solid rgba(184,147,90,.18);border-radius:8px;padding:16px 18px;margin:0 0 20px}
    .drow{display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid rgba(184,147,90,.1)}
    .drow:last-child{border-bottom:none;padding-bottom:0}
    .dk{font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:#9c9186}
    .dv{font-size:13px;font-weight:500;color:#1c1c1c}
    .dv-r{color:#9b3a3a}
    .dv-m{font-family:monospace;font-size:11px}
    .reason-box{background:rgba(155,58,58,.05);border:1px solid rgba(155,58,58,.2);border-radius:8px;padding:16px 18px;margin:0 0 24px}
    .reason-lbl{font-size:11px;text-transform:uppercase;letter-spacing:.12em;color:#9b3a3a;margin:0 0 8px;font-weight:600}
    .reason-txt{font-size:14px;color:#1c1c1c;line-height:1.7;margin:0}
    .refund-box{background:rgba(74,103,65,.06);border:1px solid rgba(74,103,65,.2);border-radius:8px;padding:14px 16px;margin:0 0 24px}
    .refund-t{font-size:13px;color:#4a6741;line-height:1.7;margin:0}
    .info{background:rgba(184,147,90,.05);border:1px solid rgba(184,147,90,.18);border-radius:8px;padding:14px 16px;margin:0 0 8px}
    .info-t{font-size:13px;color:#6b6459;line-height:1.7;margin:0}
    .cta{text-align:center;margin-top:28px}
    .cta-a{display:inline-block;background:#b8935a;color:#f6f1e9;text-decoration:none;padding:13px 36px;border-radius:6px;font-size:13px;letter-spacing:.1em;text-transform:uppercase}
    .ft{padding:20px 32px;border-top:1px solid rgba(184,147,90,.14);background:#f6f1e9;text-align:center}
    .ft p{font-size:11px;color:#9c9186;margin:0;letter-spacing:.03em}
    @media(max-width:600px){.body,.hd{padding:28px 20px}.amt-val{font-size:2rem}}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="hd">
      <p class="logo">Valut<span style="color:#b8935a">X</span></p>
      <p class="logo-sub">Withdrawal Notification</p>
      <div class="pill">✕ Withdrawal Rejected</div>
    </div>
    <div class="body">
      <p class="greeting">Hi <strong>${userName}</strong>,</p>
      <p class="txt">
        Your withdrawal request has been <strong style="color:#9b3a3a">reviewed and rejected</strong> by our team.
        Your funds have been <strong>returned to your withdrawable balance</strong> — no deduction has been made.
        Please review the reason below and resubmit if needed.
      </p>
      <div class="amt-card">
        <p class="amt-lbl">Returned Amount</p>
        <p class="amt-val">$${amount}</p>
        <p class="amt-usdt">USDT · ${network}</p>
      </div>
      <div class="dbox">
        <div class="drow"><span class="dk">Withdrawal ID</span><span class="dv dv-m">${shortId}</span></div>
        <div class="drow"><span class="dk">Network</span><span class="dv">${network}</span></div>
        <div class="drow"><span class="dk">Wallet</span><span class="dv dv-m">${shortWallet}</span></div>
        <div class="drow"><span class="dk">Status</span><span class="dv dv-r">✕ Rejected</span></div>
        <div class="drow"><span class="dk">Reviewed At</span><span class="dv">${sentAt}</span></div>
      </div>
      <div class="reason-box">
        <p class="reason-lbl">Rejection Reason</p>
        <p class="reason-txt">${reason || 'No specific reason provided. Please contact support for details.'}</p>
      </div>
      <div class="refund-box">
        <p class="refund-t">
          ✓ <strong>Your funds are safe.</strong>
          The $${amount} USDT has been automatically returned to your available balance.
          You can submit a new withdrawal request at any time.
        </p>
      </div>
      <div class="info">
        <p class="info-t">
          💡 <strong>Need help?</strong>
          If you believe this rejection is an error, please reply to this email with your withdrawal ID
          (<strong>${shortId}</strong>) and our support team will investigate promptly.
        </p>
      </div>
      <div class="cta">
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://valutx.business'}/withdraw" class="cta-a">Resubmit Withdrawal →</a>
      </div>
    </div>
    <div class="ft">
      <p>© ${new Date().getFullYear()} ValutX · Reply to this email for support assistance.</p>
    </div>
  </div>
</body>
</html>`;

    /* ── Send via Resend ── */
    const { error: sendError } = await resend.emails.send({
      from: FROM,
      to:   toEmail,
      subject: action === 'approved'
        ? `✅ Withdrawal of $${amount} USDT Approved — ValutX`
        : `❌ Withdrawal of $${amount} USDT Rejected — ValutX`,
      html: action === 'approved' ? approvedHtml : rejectedHtml,
    });

    if (sendError) {
      console.error('Resend withdrawal email error:', sendError);
      return NextResponse.json({ error: sendError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Withdrawal notification error:', err);
    return NextResponse.json({ error: err.message || 'Failed to send email.' }, { status: 500 });
  }
}