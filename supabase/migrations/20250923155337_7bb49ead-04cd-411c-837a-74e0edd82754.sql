-- Create password reset OTP table
CREATE TABLE public.password_reset_otps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  otp TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for quick lookups
CREATE INDEX idx_password_reset_otps_email ON public.password_reset_otps(email);
CREATE INDEX idx_password_reset_otps_otp ON public.password_reset_otps(otp);

-- Enable RLS
ALTER TABLE public.password_reset_otps ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to verify their own OTP
CREATE POLICY "Users can verify their own OTP" 
ON public.password_reset_otps 
FOR SELECT 
USING (true);

-- Create policy to allow inserting OTPs
CREATE POLICY "Allow OTP creation" 
ON public.password_reset_otps 
FOR INSERT 
WITH CHECK (true);

-- Create policy to allow updating OTPs when used
CREATE POLICY "Allow OTP updates" 
ON public.password_reset_otps 
FOR UPDATE 
USING (true);

-- Function to generate random 6-digit OTP
CREATE OR REPLACE FUNCTION generate_otp()
RETURNS TEXT AS $$
BEGIN
  RETURN LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Function to create password reset OTP
CREATE OR REPLACE FUNCTION create_password_reset_otp(user_email TEXT)
RETURNS TEXT AS $$
DECLARE
  otp_code TEXT;
BEGIN
  -- Generate OTP
  otp_code := generate_otp();
  
  -- Insert OTP with 10 minute expiry
  INSERT INTO public.password_reset_otps (email, otp, expires_at)
  VALUES (user_email, otp_code, now() + interval '10 minutes');
  
  RETURN otp_code;
END;
$$ LANGUAGE plpgsql;

-- Function to verify OTP
CREATE OR REPLACE FUNCTION verify_password_reset_otp(user_email TEXT, otp_code TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  otp_record RECORD;
BEGIN
  -- Find valid OTP
  SELECT * INTO otp_record
  FROM public.password_reset_otps
  WHERE email = user_email 
    AND otp = otp_code 
    AND expires_at > now() 
    AND used = false
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF otp_record IS NULL THEN
    RETURN false;
  END IF;
  
  -- Mark OTP as used
  UPDATE public.password_reset_otps
  SET used = true
  WHERE id = otp_record.id;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;