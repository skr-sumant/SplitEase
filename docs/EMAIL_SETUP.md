# Email Configuration Guide

This guide covers setting up email functionality for payment reminders and notifications using Resend API.

## Overview

The SplitEase app uses Resend for transactional emails:
- Payment reminders for outstanding expenses
- User authentication emails (via Supabase)
- Notification emails for group activities

## 1. Resend Account Setup

### Create Resend Account
1. Go to [Resend.com](https://resend.com)
2. Sign up for a free account
3. Verify your email address
4. Access the Resend dashboard

### Domain Verification (Recommended)
For production use, verify a custom domain:

1. **Add Domain**
   - Go to Domains section
   - Click "Add Domain"
   - Enter your domain (e.g., `yourdomain.com`)

2. **DNS Configuration**
   Add these DNS records to your domain:
   ```dns
   Type: TXT
   Name: _resend
   Value: [provided verification code]
   
   Type: MX
   Name: @
   Value: feedback-smtp.resend.com
   Priority: 10
   ```

3. **Verify Domain**
   - Click "Verify Domain" in Resend dashboard
   - Wait for DNS propagation (up to 48 hours)

### API Key Generation
1. Go to API Keys section
2. Click "Create API Key"
3. Name: `SplitEase Production` (or similar)
4. **Copy the API key securely** - you won't see it again!

## 2. Supabase Integration

### Add Resend API Key to Supabase
1. Open Supabase Dashboard
2. Go to Edge Functions > Settings
3. Add new secret:
   - **Name**: `RESEND_API_KEY`
   - **Value**: Your Resend API key

### Edge Function Configuration
The `send-payment-reminder` function is configured to use Resend:

```typescript
const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const emailResponse = await resend.emails.send({
  from: "SplitEase <noreply@yourdomain.com>",
  to: [recipientEmail],
  subject: "Payment Reminder",
  html: emailTemplate
});
```

## 3. Email Templates

### Payment Reminder Template
The app includes a responsive HTML email template:

**Features:**
- Professional design with branding
- Payment details breakdown
- Interactive payment buttons
- Mobile-responsive layout
- Clear call-to-action

**Customization:**
Edit the HTML template in `supabase/functions/send-payment-reminder/index.ts`:

```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #333;">💰 Payment Reminder</h2>
  <!-- Customize content here -->
</div>
```

## 4. Authentication Emails

### Supabase Email Configuration
Configure authentication emails in Supabase:

1. **Go to Authentication > Email Templates**
2. **Configure templates:**

#### Confirm Signup Template
```html
<h2>Welcome to SplitEase!</h2>
<p>Click the link below to confirm your account:</p>
<a href="{{ .ConfirmationURL }}">Confirm Account</a>
```

#### Reset Password Template
```html
<h2>Reset Your Password</h2>
<p>Click the link below to reset your password:</p>
<a href="{{ .ConfirmationURL }}">Reset Password</a>
<p>This link expires in 24 hours.</p>
```

### SMTP Settings (Alternative)
If not using Resend for auth emails, configure SMTP:

1. **Go to Authentication > Settings**
2. **Enable Custom SMTP**
3. **Configure SMTP settings:**
   ```
   Host: smtp.resend.com
   Port: 587
   Username: resend
   Password: [Your Resend API Key]
   ```

## 5. Email Types and Triggers

### Payment Reminders
**Triggered when:**
- User clicks "Send Reminder" on expense
- Automatic reminders (if implemented)

**Content includes:**
- Expense details (title, amount, group)
- Payment due amount
- Payment link (if available)
- Group context

### Authentication Emails
**Types:**
- Welcome/confirmation emails
- Password reset emails
- Magic link emails (if enabled)

## 6. Email Deliverability

### Best Practices
1. **Use verified domain** for from address
2. **Implement SPF/DKIM** records
3. **Monitor bounce rates** in Resend dashboard
4. **Use clear subject lines**
5. **Include unsubscribe links** for marketing emails

### DNS Records for Deliverability
```dns
# SPF Record
Type: TXT
Name: @
Value: v=spf1 include:_spf.resend.com ~all

# DKIM Record (provided by Resend)
Type: TXT
Name: [resend-provided-selector]._domainkey
Value: [resend-provided-key]
```

## 7. Testing and Development

### Development Setup
For development, emails are sent using Resend's default domain:
```
From: SplitEase <onboarding@resend.dev>
```

### Testing Email Delivery
1. **Use test email addresses** in development
2. **Check Resend logs** for delivery status
3. **Test different email clients** (Gmail, Outlook, etc.)
4. **Verify mobile responsiveness**

### Test Checklist
- [ ] Payment reminder emails send correctly
- [ ] Email templates render properly
- [ ] Links work and redirect correctly
- [ ] Mobile display looks good
- [ ] Spam folder placement is minimal

## 8. Production Configuration

### Environment Variables
Set these in your production environment:
```env
RESEND_API_KEY=re_xxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

### Rate Limits
Resend free tier limits:
- **3,000 emails/month**
- **100 emails/day**
- **10 emails/second**

For higher volumes, upgrade to paid plan.

### Monitoring
Monitor email performance:
1. **Delivery rates** in Resend dashboard
2. **Open rates** and click tracking
3. **Bounce and complaint rates**
4. **Error logs** in Supabase functions

## 9. Advanced Features

### Email Scheduling
For future enhancement, implement scheduled reminders:

```typescript
// In edge function
const scheduleReminder = async (reminderDate: Date) => {
  // Use Supabase cron or external scheduler
  // Send reminder at specific date/time
};
```

### Bulk Email Operations
For group notifications:

```typescript
// Send to multiple recipients
const sendGroupNotification = async (memberEmails: string[]) => {
  const emailPromises = memberEmails.map(email => 
    resend.emails.send({
      from: "SplitEase <noreply@yourdomain.com>",
      to: [email],
      subject: "Group Update",
      html: template
    })
  );
  
  await Promise.all(emailPromises);
};
```

### Email Analytics
Track email performance:
```typescript
// Add tracking parameters
const trackingUrl = `${paymentLink}?utm_source=email&utm_campaign=payment_reminder`;
```

## 10. Troubleshooting

### Common Issues

**Emails not sending:**
- Verify API key is correct
- Check Resend dashboard for errors
- Ensure from address is verified

**High bounce rate:**
- Validate email addresses before sending
- Use double opt-in for subscriptions
- Clean email list regularly

**Spam folder delivery:**
- Improve email content quality
- Set up proper DNS records
- Monitor sender reputation

### Debug Tools
1. **Resend Dashboard** - View send logs and errors
2. **Supabase Logs** - Check edge function execution
3. **Email testing tools** - Mail-tester.com, etc.

## Security Considerations

1. **Never expose API keys** in client-side code
2. **Use environment variables** for sensitive data
3. **Implement rate limiting** to prevent abuse
4. **Validate email addresses** before sending
5. **Log email activities** for audit trails

## Cost Optimization

1. **Batch similar emails** to reduce API calls
2. **Use email templates** to reduce bandwidth
3. **Monitor usage** in Resend dashboard
4. **Implement unsubscribe** to reduce unwanted sends
5. **Cache email content** when possible

This completes the email setup for your SplitEase application. The system is now ready to send professional payment reminders and handle all authentication-related emails.