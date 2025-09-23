import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import nodemailer from "npm:nodemailer";

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
  reminderType: "email" | "whatsapp" | "both";
  paymentLink?: string;
}

const handler = async (req: Request): Promise<Response> => {
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
      paymentLink,
    }: PaymentReminderRequest = await req.json();

    console.log("Processing payment reminder:", { expenseId, memberEmail, reminderType });

    const responses: any = {};

    // SMTP transporter
    const transporter = nodemailer.createTransport({
      host: "mail.cantan.in", // SMTP server
      port: 465, // SSL port
      secure: true, // true = SSL/TLS
      auth: {
        user: "support@cantan.in",
        pass: "12345@Ankush",
      },
    });

    // Email Reminder
    if (reminderType === "email" || reminderType === "both") {
      try {
        const mailOptions = {
          from: '"SplitEase" <support@cantan.in>',
          to: memberEmail,
          subject: Payment Reminder: ${expenseTitle},
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">💰 Payment Reminder</h2>
              <p>Hi ${memberName},</p>
              <p>This is a friendly reminder that you have an outstanding payment for the expense <strong>"${expenseTitle}"</strong> in the group <strong>${groupName}</strong>.</p>
              
              <div style="background-color: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 8px;">
                <h3 style="margin: 0 0 10px 0; color: #333;">Payment Details:</h3>
                <p><strong>Expense:</strong> ${expenseTitle}</p>
                <p><strong>Amount Due:</strong> $${amount.toFixed(2)}</p>
                <p><strong>Group:</strong> ${groupName}</p>
              </div>

              ${paymentLink ? `
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${paymentLink}" style="
                    background-color: #007bff;
                    color: white;
                    padding: 12px 24px;
                    text-decoration: none;
                    border-radius: 6px;
                    font-weight: bold;
                    display: inline-block;
                  ">💳 Pay Now</a>
                </div>
                <p style="text-align: center; font-size: 12px; color: #666;">
                  Or copy this link: <a href="${paymentLink}">${paymentLink}</a>
                </p>
              ` : ""}

              <p>Please mark your payment as completed once you've settled this expense.</p>
              <p>Thank you!</p>
              <p><em>The SplitEase Team</em></p>
            </div>
          `,
        };

        const emailResponse = await transporter.sendMail(mailOptions);
        responses.email = emailResponse;
        console.log("✅ Email sent successfully:", emailResponse);
      } catch (error) {
        console.error("❌ Error sending email:", error);

        // Optional: Notify admin or log to supabase table
        try {
          await supabase.from("email_failures").insert({
            expense_id: expenseId,
            member_email: memberEmail,
            error_message: error.message,
            created_at: new Date().toISOString(),
          });
          console.log("Notification logged to supabase for failed email.");
        } catch (logError) {
          console.error("Failed to log email error to supabase:", logError);
        }

        responses.emailError = error.message;
      }
    }

    // WhatsApp Reminder Placeholder
    if ((reminderType === "whatsapp" || reminderType === "both") && whatsappNumber) {
      const whatsappMessage =
        🔔 *Payment Reminder*\n\nHi ${memberName},\n\nYou have an outstanding payment:\n\n💰 *Amount:* $${amount.toFixed(2)}\n📋 *Expense:* ${expenseTitle}\n👥 *Group:* ${groupName}\n\nPlease mark your payment as completed once settled.\n\nThank you! 🙏;

      responses.whatsapp = {
        status: "pending",
        message: "WhatsApp integration requires API setup",
        phoneNumber: whatsappNumber,
        messageContent: whatsappMessage,
      };
    }

    return new Response(
      JSON.stringify({
        success: true,
        responses,
        message: "Reminder(s) processed",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error("❌ Error in handler:", error);
    return new Response(
      JSON.stringify({ error: error.message, success: false }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
