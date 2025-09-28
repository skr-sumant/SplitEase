import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface OTPEmailRequest {
  email: string;
  otp: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, otp }: OTPEmailRequest = await req.json();

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

    await client.send({
  from: Deno.env.get("SMTP_EMAIL") || "support@cantan.in",
  to: email,
  subject: "Reset Your SplitEase Password",
  html: `
    <div style="font-family: 'Helvetica', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff; border: 1px solid #e0e0e0; border-radius: 10px;">
      <h1 style="color: #1e293b; font-size: 24px; margin-bottom: 10px;">Password Reset Request</h1>
      <p style="color: #475569; font-size: 16px; line-height: 1.5;">
        You requested to reset your SplitEase password. Use the OTP below to continue:
      </p>

      <div style="background-color: #f0f4ff; padding: 25px; text-align: center; margin: 20px 0; border-radius: 12px; border: 1px solid #c7d2fe;">
        <h2 style="color: #3b82f6; font-size: 36px; margin: 0; letter-spacing: 6px;">${otp}</h2>
      </div>

      <p style="color: #64748b; font-size: 14px;">
        This OTP is valid for 10 minutes. If you did not request a password reset, please ignore this email.
      </p>

      <p style="color: #1e293b; font-size: 16px; margin-top: 30px;">
        Best regards,<br>
        <strong>The SplitEase Team</strong>
      </p>
    </div>
  `,
  encoding: "base64",
});


    await client.close();

    console.log("OTP email sent successfully");

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-otp-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);