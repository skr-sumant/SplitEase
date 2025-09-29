import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PaymentReminderRequest {
  expenseId: string;
  memberEmail: string;
  memberName: string;
  expenseTitle: string;
  amount: number;
  groupName: string;
  whatsappNumber?: string;
  reminderType: 'email' | 'whatsapp' | 'both';
  paymentLink?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { 
      expenseId, 
      memberEmail, 
      memberName, 
      expenseTitle, 
      amount, 
      groupName, 
      whatsappNumber,
      reminderType,
      paymentLink 
    }: PaymentReminderRequest = await req.json();

    console.log("Processing payment reminder:", { expenseId, memberEmail, reminderType });

    const responses: any = {};

    // Send email reminder
    if (reminderType === 'email' || reminderType === 'both') {
      try {
        const client = new SMTPClient({
          connection: {
            hostname: Deno.env.get("SMTP_HOST") || "mail.cantan.in",
            port: parseInt(Deno.env.get("SMTP_PORT") || "465"),
            tls: true,
            auth: {
              username: Deno.env.get("SMTP_EMAIL") || "support@cantan.in",
              password: Deno.env.get("SMTP_PASSWORD") || "12345@Ankush",
            },
          },
        });

        const rawHtml = `
<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 32px 24px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">🔔 Payment Reminder</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 16px;">SplitEase - Keep your expenses organized</p>
  </div>
  <div style="padding: 32px 24px;">
    <p style="font-size: 18px; color: #333; margin: 0 0 16px 0;">Hello <strong>${memberName}</strong> 👋</p>
    <p style="color: #666; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">This is a friendly reminder that you have an outstanding payment for the expense <strong>"${expenseTitle}"</strong> in the group <strong>${groupName}</strong>.</p>
    <div style="background-color: #f8f9fa; padding: 24px; margin: 24px 0; border-radius: 12px; border-left: 4px solid #007bff;">
      <h3 style="margin: 0 0 16px 0; color: #1a1a1a; font-size: 18px;">💰 Payment Details</h3>
      <div style="background: white; padding: 16px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <p style="margin: 8px 0; color: #333; font-size: 14px;"><strong>📋 Expense:</strong> ${expenseTitle}</p>
        <p style="margin: 8px 0; color: #d73027; font-size: 16px; font-weight: bold;"><strong>💸 Amount Due:</strong> ₹${amount.toFixed(2)}</p>
        <p style="margin: 8px 0; color: #333; font-size: 14px;"><strong>👥 Group:</strong> ${groupName}</p>
      </div>
    </div>
    ${paymentLink ? `
      <div style="text-align: center; margin: 32px 0;">
        <a href="${paymentLink}" style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 30px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 4px 15px rgba(40, 167, 69, 0.3);">
          💳 Pay Now - ₹${amount.toFixed(2)}
        </a>
      </div>
      <p style="text-align: center; font-size: 12px; color: #999; margin-top: 16px;">Or copy this link: <a href="${paymentLink}" style="color: #007bff;">${paymentLink}</a></p>
    ` : ''}
    <div style="margin: 32px 0; padding: 20px; background: #e8f5e8; border-radius: 8px; border-left: 4px solid #28a745;">
      <p style="margin: 0; color: #155724; font-size: 14px;">💡 <strong>Next Step:</strong> Please mark your payment as completed in the app once you've settled this expense.</p>
    </div>
    <div style="text-align: center; margin-top: 40px; padding-top: 24px; border-top: 1px solid #eee;">
      <p style="color: #666; font-size: 16px; margin: 0;">Thank you for using SplitEase! 🙏</p>
      <p style="color: #999; font-size: 14px; margin: 8px 0 0 0;"><em>The SplitEase Team</em></p>
    </div>
  </div>
</div>`;

        // Minify to avoid quoted-printable artifacts like "=20"
        const htmlMin = rawHtml
          .replace(/\r?\n/g, '') // remove newlines
          .replace(/\s+>/g, '>') // trim spaces before closing angle
          .replace(/>\s+/g, '>') // trim spaces after closing angle
          .replace(/\s{2,}/g, ' '); // collapse multiple spaces

        await client.send({
          from: Deno.env.get("SMTP_EMAIL") || "support@cantan.in",
          to: memberEmail,
          subject: `Payment Reminder: ${expenseTitle}`,
          html: htmlMin,
        });

        await client.close();
        responses.email = { success: true };
        console.log("Email sent successfully via SMTP");
      } catch (error: any) {
        console.error("Error sending email:", error);
        responses.emailError = error?.message || 'Unknown error occurred';
      }
    }

    // Send WhatsApp reminder (using a simple webhook approach)
    if ((reminderType === 'whatsapp' || reminderType === 'both') && whatsappNumber) {
      try {
        const whatsappMessage = `🔔 *Payment Reminder*\n\nHi ${memberName},\n\nYou have an outstanding payment:\n\n💰 *Amount:* ₹${amount.toFixed(2)}\n📋 *Expense:* ${expenseTitle}\n👥 *Group:* ${groupName}\n\nPlease mark your payment as completed once settled.\n\nThank you! 🙏`;
        
        // This is a placeholder for WhatsApp integration
        // You would need to integrate with WhatsApp Business API or a service like Twilio
        responses.whatsapp = {
          status: 'pending',
          message: 'WhatsApp integration requires additional setup',
          phoneNumber: whatsappNumber,
          messageContent: whatsappMessage
        };
        
        console.log("WhatsApp reminder prepared for:", whatsappNumber);
      } catch (error: any) {
        console.error("Error preparing WhatsApp reminder:", error);
        responses.whatsappError = error?.message || 'Unknown error occurred';
      }
    }

    return new Response(JSON.stringify({
      success: true,
      responses,
      message: "Reminder(s) sent successfully"
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Error in send-payment-reminder function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);