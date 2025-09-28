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
      subject: "Password Reset OTP - SplitEase",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Password Reset Request</h1>
          <p>You requested to reset your password for SplitEase. Use the OTP below to proceed:</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
            <h2 style="color: #2563eb; font-size: 32px; margin: 0; letter-spacing: 4px;">${otp}</h2>
          </div>
          
          <p style="color: #666;">This OTP is valid for 10 minutes. If you didn't request this password reset, please ignore this email.</p>
          
          <p>Best regards,<br>The SplitEase Team</p>
        </div>
      `,
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