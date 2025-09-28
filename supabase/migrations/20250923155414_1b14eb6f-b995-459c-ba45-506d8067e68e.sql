-- Fix search path security warnings for OTP functions
CREATE OR REPLACE FUNCTION generate_otp()
RETURNS TEXT 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
END;
$$;

-- Fix search path for create_password_reset_otp function
CREATE OR REPLACE FUNCTION create_password_reset_otp(user_email TEXT)
RETURNS TEXT 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Fix search path for verify_password_reset_otp function
CREATE OR REPLACE FUNCTION verify_password_reset_otp(user_email TEXT, otp_code TEXT)
RETURNS BOOLEAN 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;