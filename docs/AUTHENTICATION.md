# Authentication System Guide

Complete guide to the authentication system in SplitEase, built with Supabase Auth and React.

## Overview

The authentication system provides:
- Email/password authentication
- Password reset functionality
- Session management
- Protected routes
- User profile management
- Secure password handling

## 1. Authentication Flow

### Sign Up Process
1. User enters email, password, and full name
2. Supabase creates user account
3. Confirmation email sent (if enabled)
4. User profile automatically created via trigger
5. User redirected to dashboard

### Sign In Process
1. User enters email and password
2. Supabase validates credentials
3. Session token generated
4. User state updated in React context
5. Redirect to protected areas

### Password Reset Flow
1. User clicks "Forgot Password"
2. Enters email address
3. Reset email sent with secure link
4. User clicks link, redirected to reset page
5. New password entered and validated
6. Password updated, user signed in

## 2. React Authentication Context

### AuthContext Structure
```typescript
interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  updatePassword: (newPassword: string) => Promise<{ error: any }>;
}
```

### AuthProvider Implementation
```typescript
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);
  
  // ... auth methods
};
```

## 3. Route Protection

### Protected Routes Component
```typescript
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  return user ? <>{children}</> : <Navigate to="/auth" />;
};
```

### Public Routes Component
```typescript
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  return user ? <Navigate to="/dashboard" /> : <>{children}</>;
};
```

### Route Configuration
```typescript
<Routes>
  <Route path="/" element={<PublicRoute><Index /></PublicRoute>} />
  <Route path="/auth" element={<PublicRoute><Auth /></PublicRoute>} />
  <Route path="/reset-password" element={<ResetPassword />} />
  <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
  <Route path="/group/:groupId" element={<ProtectedRoute><GroupDetail /></ProtectedRoute>} />
</Routes>
```

## 4. Authentication Pages

### Auth Page (Login/Signup)
**Features:**
- Toggle between login and signup modes
- Form validation and error handling
- Loading states and user feedback
- Responsive design

**Key Components:**
```typescript
const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLogin) {
      const { error } = await signIn(email, password);
      // Handle response
    } else {
      const { error } = await signUp(email, password, fullName);
      // Handle response
    }
  };
};
```

### Password Reset Page
**Features:**
- Secure token validation
- New password form with confirmation
- Strength requirements
- Auto-redirect on success

**Implementation:**
```typescript
const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { updatePassword, session } = useAuth();
  
  const handleResetPassword = async (e: React.FormEvent) => {
    // Validate passwords match
    // Check minimum requirements
    // Update password via Supabase
    // Redirect to dashboard
  };
};
```

## 5. User Profile Management

### Profile Table Schema
```sql
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
```

### Auto-Profile Creation
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER handle_new_user
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();
```

## 6. Security Implementation

### Row Level Security (RLS)
```sql
-- Profiles table RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = user_id);
```

### Password Requirements
```typescript
const validatePassword = (password: string): string[] => {
  const errors: string[] = [];
  
  if (password.length < 6) {
    errors.push('Password must be at least 6 characters');
  }
  
  if (!/(?=.*[a-z])/.test(password)) {
    errors.push('Password must contain lowercase letter');
  }
  
  if (!/(?=.*[A-Z])/.test(password)) {
    errors.push('Password must contain uppercase letter');
  }
  
  if (!/(?=.*\d)/.test(password)) {
    errors.push('Password must contain a number');
  }
  
  return errors;
};
```

### Session Management
```typescript
// Automatic session refresh
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'TOKEN_REFRESHED') {
    console.log('Session refreshed');
  }
  
  if (event === 'SIGNED_OUT') {
    // Clean up user data
    localStorage.clear();
  }
});
```

## 7. Error Handling

### Common Auth Errors
```typescript
const handleAuthError = (error: any) => {
  switch (error.message) {
    case 'Invalid login credentials':
      return 'Invalid email or password';
    case 'User already registered':
      return 'An account with this email already exists';
    case 'Password should be at least 6 characters':
      return 'Password must be at least 6 characters long';
    case 'Unable to validate email address: invalid format':
      return 'Please enter a valid email address';
    default:
      return error.message || 'An unexpected error occurred';
  }
};
```

### Error Display Component
```typescript
const AuthError = ({ error }: { error: string | null }) => {
  if (!error) return null;
  
  return (
    <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md mb-4">
      {error}
    </div>
  );
};
```

## 8. Email Configuration

### Supabase Email Settings
1. **Site URL**: Set to your domain (e.g., `https://yourdomain.com`)
2. **Redirect URLs**: Add all valid redirect URLs:
   - `http://localhost:5173/reset-password` (development)
   - `https://yourdomain.com/reset-password` (production)

### Custom Email Templates
**Reset Password Template:**
```html
<h2>Reset your password</h2>
<p>Follow this link to reset the password for your user:</p>
<p><a href="{{ .ConfirmationURL }}">Reset Password</a></p>
<p>If you didn't request this, you can ignore this email.</p>
```

## 9. Testing Authentication

### Unit Tests
```typescript
// Test auth context
describe('AuthContext', () => {
  test('signIn with valid credentials', async () => {
    const { signIn } = renderHook(() => useAuth());
    const result = await signIn('test@example.com', 'password123');
    expect(result.error).toBeNull();
  });
  
  test('signUp creates user profile', async () => {
    const { signUp } = renderHook(() => useAuth());
    const result = await signUp('new@example.com', 'password123', 'Test User');
    expect(result.error).toBeNull();
  });
});
```

### Integration Tests
```typescript
// Test complete auth flow
describe('Authentication Flow', () => {
  test('user can sign up, confirm, and sign in', async () => {
    // Sign up
    await signUp('test@example.com', 'password123', 'Test User');
    
    // Confirm email (in test environment)
    await confirmEmail('test@example.com');
    
    // Sign in
    const { error } = await signIn('test@example.com', 'password123');
    expect(error).toBeNull();
  });
});
```

## 10. Performance Optimization

### Session Caching
```typescript
// Cache session in localStorage
const getStoredSession = () => {
  try {
    const stored = localStorage.getItem('supabase.auth.token');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};
```

### Lazy Loading
```typescript
// Lazy load auth pages
const Auth = React.lazy(() => import('./pages/Auth'));
const ResetPassword = React.lazy(() => import('./pages/ResetPassword'));
```

## 11. Security Best Practices

### Client-Side Security
1. **Never store sensitive data** in localStorage
2. **Validate inputs** on both client and server
3. **Use HTTPS** in production
4. **Implement proper CORS** policies
5. **Sanitize user inputs**

### Server-Side Security
1. **Enable RLS** on all tables
2. **Use service role key** only in edge functions
3. **Implement rate limiting**
4. **Log authentication events**
5. **Monitor for suspicious activity**

## 12. Deployment Considerations

### Environment Variables
```env
# Public (safe for client-side)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Private (server-side only)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Production Checklist
- [ ] Custom domain configured
- [ ] SSL certificate installed
- [ ] Email templates customized
- [ ] Rate limiting configured
- [ ] Monitoring set up
- [ ] Backup strategy implemented
- [ ] Security headers configured

This authentication system provides a secure, scalable foundation for user management in the SplitEase application.