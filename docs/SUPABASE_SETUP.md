# Supabase Setup Guide

This guide covers the complete setup of Supabase backend for the SplitEase expense tracking application.

## Prerequisites

- Supabase account (free tier available)
- Basic understanding of PostgreSQL
- Access to Supabase dashboard

## 1. Project Creation

### Create New Supabase Project
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Fill in project details:
   - **Name**: SplitEase
   - **Database Password**: (generate secure password)
   - **Region**: Choose closest to your users

### Get Project Credentials
After project creation, collect these values from Settings > API:
- **Project URL**: `https://your-project.supabase.co`
- **Anon Public Key**: `eyJ...`
- **Service Role Key**: `eyJ...` (keep secret!)

## 2. Database Schema

The application uses these main tables:

### Core Tables
- **profiles**: User profile information
- **groups**: Expense groups/families
- **group_members**: Members belonging to groups
- **expenses**: Individual expense records
- **expense_splits**: How expenses are split among members
- **expense_payments**: Payment tracking records

### Setup Database
Run the migrations in order:
```sql
-- See supabase/migrations/ directory for complete schema
-- Tables are created with proper RLS policies
-- Functions and triggers are included
```

## 3. Row Level Security (RLS) Policies

All tables have RLS enabled with these access patterns:

### Groups Table
- Users can create groups
- Users can view groups they own or are members of
- Only group creators can update/delete groups

### Expenses Table
- Group members can create expenses
- Users can view expenses of groups they belong to
- Only expense creators can update/delete expenses

### Security Functions
```sql
-- Helper functions for policy checks
is_group_owner(group_id, user_id)
is_member_of_group(group_id, user_id)
is_user_group_member(group_id, user_id)
```

## 4. Authentication Setup

### Email Configuration
1. Go to Authentication > Settings
2. Configure Site URL: `https://your-domain.com`
3. Add Redirect URLs:
   - `http://localhost:5173/reset-password` (development)
   - `https://your-domain.com/reset-password` (production)

### Email Templates
Configure custom email templates in Authentication > Email Templates:
- **Confirm signup**: Welcome message
- **Reset password**: Password reset instructions
- **Magic Link**: Login link (if enabled)

## 5. Edge Functions

### Deploy Functions
The project includes edge functions for:
- **send-payment-reminder**: Email/SMS reminders

Functions are automatically deployed with the application.

### Function Secrets
Required secrets (add in Dashboard > Edge Functions > Settings):
- `RESEND_API_KEY`: For sending emails
- `SUPABASE_URL`: Project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Backend access

## 6. Real-time Configuration

### Enable Real-time
1. Go to Database > Replication
2. Enable replication for these tables:
   - `group_members`
   - `expenses`
   - `expense_splits`
   - `expense_payments`

### Client Subscription
Real-time updates are handled automatically in the React application.

## 7. Storage (Optional)

### File Uploads
If implementing file attachments:
1. Go to Storage
2. Create bucket: `expense-attachments`
3. Set up RLS policies for file access

## 8. Database Triggers

### Auto-update Timestamps
```sql
-- Trigger for updated_at columns
CREATE TRIGGER update_updated_at_column
BEFORE UPDATE ON table_name
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

### User Profile Creation
```sql
-- Auto-create profile on user registration
CREATE TRIGGER handle_new_user
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION handle_new_user();
```

## 9. Performance Optimization

### Indexes
Key indexes for performance:
```sql
-- Group membership lookups
CREATE INDEX idx_group_members_user_id ON group_members(user_id);
CREATE INDEX idx_group_members_group_id ON group_members(group_id);

-- Expense queries
CREATE INDEX idx_expenses_group_id ON expenses(group_id);
CREATE INDEX idx_expense_splits_expense_id ON expense_splits(expense_id);
```

## 10. Backup and Recovery

### Automated Backups
Supabase automatically:
- Takes daily backups (retained for 7 days on free tier)
- Provides point-in-time recovery
- Maintains transaction logs

### Manual Backup
```bash
# Backup specific tables
pg_dump -h your-db-host -p 5432 -U postgres -t public.groups > groups_backup.sql
```

## 11. Monitoring and Logs

### Database Logs
Monitor in Dashboard > Logs:
- **Database logs**: Query performance, errors
- **API logs**: Request/response tracking
- **Function logs**: Edge function execution

### Performance Metrics
Track key metrics:
- Query performance
- Connection usage
- Storage usage
- Bandwidth consumption

## Environment Variables

Add to your application environment:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Troubleshooting

### Common Issues

**RLS Policy Errors**
- Verify user authentication
- Check policy conditions
- Test with proper user context

**Migration Failures**
- Check for foreign key constraints
- Verify data types match
- Review existing data conflicts

**Connection Issues**
- Verify project URL and keys
- Check network connectivity
- Review CORS settings

### Debug Tools
- Supabase Dashboard SQL Editor
- Database logs and query analysis
- RLS policy simulator

## Security Best Practices

1. **Never expose service role key** in client code
2. **Use RLS policies** for all data access
3. **Validate inputs** in edge functions
4. **Enable HTTPS only** in production
5. **Regularly rotate** API keys
6. **Monitor access logs** for suspicious activity

## Production Checklist

- [ ] RLS enabled on all tables
- [ ] Proper backup strategy configured
- [ ] Monitoring and alerting set up
- [ ] SSL/TLS configured
- [ ] API keys secured
- [ ] Performance optimization applied
- [ ] Security policies reviewed

## Support Resources

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Edge Functions Guide](https://supabase.com/docs/guides/functions)