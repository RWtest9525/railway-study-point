# Complete Setup & Troubleshooting Guide

## 🚀 Quick Start

### 1. Database Setup (CRITICAL - Fixes All Schema Errors)

**Run this migration in your Supabase SQL Editor:**

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** → **New Query**
3. Copy and paste the entire content from `project/supabase/migrations/20260405000000_fix_schema_issues.sql`
4. Click **Run** to execute

This single migration will:
- ✅ Add missing `created_at` column to profiles table
- ✅ Add missing `updated_at` column to profiles table  
- ✅ Add missing `phone` column to profiles table
- ✅ Add missing `premium_started_at` column to profiles table
- ✅ Add missing `premium_until` column to profiles table
- ✅ Create `site_settings` table if missing
- ✅ Add missing `trial_nudge_interval_seconds` column
- ✅ Add missing `subject` column to exams table
- ✅ Create performance indexes
- ✅ Set up proper permissions

### 2. Environment Variables

Create a `.env` file in the `project/` directory:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_RAZORPAY_KEY_ID=your_razorpay_test_key_id
```

**Getting Razorpay Keys:**
1. Login to [Razorpay Dashboard](https://dashboard.razorpay.com/)
2. Go to **Settings** → **API Keys**
3. Generate **Test Keys** (for development)
4. Copy the **Key Id** (starts with `rzp_test_`)
5. Add to `.env` as `VITE_RAZORPAY_KEY_ID`

### 3. Install & Run

```bash
cd project
npm install
npm run dev
```

## 🔧 Troubleshooting Common Issues

### Issue 1: "Could not find 'premium_price_paise' column"

**Cause:** The `site_settings` table is missing or incomplete.

**Solution:** Run the migration file mentioned above.

### Issue 2: "column profiles.created_at does not exist"

**Cause:** The `profiles` table is missing the `created_at` column.

**Solution:** Run the migration file mentioned above.

### Issue 3: "Failed to load exams"

**Cause:** Missing `subject` column in exams table or permission issues.

**Solution:** 
1. Run the migration file
2. Ensure you're logged in as an admin user

### Issue 4: Razorpay Not Opening / Payment Gateway Error

**Causes:**
1. Razorpay SDK not loaded
2. Invalid or missing API key
3. Network connectivity issues

**Solutions:**

**A. Verify Razorpay Key:**
```bash
# Check if key is set
echo $VITE_RAZORPAY_KEY_ID
```

**B. Test Razorpay SDK Loading:**
Open browser console (F12) and run:
```javascript
console.log(window.Razorpay ? 'Razorpay loaded' : 'Razorpay not loaded');
```

**C. Check Browser Console:**
- Look for errors like "Failed to load resource: net::ERR_FAILED"
- This indicates network issues blocking Razorpay CDN

**D. Verify Key Format:**
- Test keys start with `rzp_test_`
- Live keys start with `rzp_live_`
- Make sure there are no extra spaces in the `.env` file

### Issue 5: Users Not Showing in User Management

**Cause:** Permission issues or missing columns.

**Solution:**
1. Run the migration file
2. Verify admin role in Supabase:
```sql
SELECT id, email, role FROM profiles WHERE email = 'your_email@gmail.com';
```
3. If role is not 'admin', update it:
```sql
UPDATE profiles SET role = 'admin' WHERE email = 'your_email@gmail.com';
```

## 📊 Database Verification

After running the migration, verify your setup:

```sql
-- Check all tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('profiles', 'exams', 'questions', 'site_settings', 'transactions');

-- Check profiles columns
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position;

-- Check site_settings has data
SELECT * FROM site_settings;

-- Check admin user exists
SELECT id, email, role, is_premium FROM profiles 
WHERE role = 'admin' OR email = 'your_email@gmail.com';
```

## 🎯 Testing the Fixes

### Test 1: Premium Settings
1. Login as admin
2. Go to Admin Portal → Premium Settings
3. Should see current price and validity settings
4. Try updating the price - should save successfully

### Test 2: User Management
1. Go to Admin Portal → Users
2. Should see list of all users
3. Try searching, filtering, and performing actions (promote, ban, etc.)

### Test 3: Subscription Management
1. Go to Admin Portal → Subscriptions
2. Should see all users with subscription status
3. Stats cards should show correct numbers

### Test 4: Exam Creator
1. Go to Admin Portal → Create Exam
2. Should load without errors
3. Try creating a new exam

### Test 5: Razorpay Payment
1. Go to Upgrade page (as non-admin user)
2. Click "Upgrade Now"
3. Razorpay modal should open
4. Use test card: `4111 1111 1111 1111` with any future date and CVV
5. Payment should succeed and redirect to dashboard

## ⚡ Performance Optimizations

The migration includes performance indexes:
- `idx_profiles_created_at` - Faster user listing
- `idx_exams_created_at` - Faster exam loading
- `idx_questions_created_at` - Faster question queries

## 🆘 Still Having Issues?

### Collect Debug Information:

1. **Browser Console Logs:**
   - Press F12 → Console tab
   - Copy all error messages

2. **Network Tab:**
   - Press F12 → Network tab
   - Check for failed requests (red entries)
   - Look for 400, 401, 403, 500 errors

3. **Supabase Logs:**
   - Go to Supabase Dashboard → Logs
   - Filter by error level
   - Check for database errors

### Common Error Patterns:

**"relation does not exist"** → Run migration
**"permission denied"** → Check RLS policies and user role
**"column does not exist"** → Run migration
**"network error"** → Check internet connection and CORS settings

## 📝 Migration File Location

The fix-all migration is at:
```
project/supabase/migrations/20260405000000_fix_schema_issues.sql
```

You can also find it in your Supabase dashboard under:
**SQL Editor** → **Saved** (after running it)

## 🔄 Updating Existing Database

If you already have data in your database, the migration is safe:
- Uses `IF NOT EXISTS` checks
- Won't duplicate columns
- Preserves existing data
- Only adds missing structure

## ✅ Verification Checklist

After completing setup:

- [ ] Migration executed successfully
- [ ] `.env` file created with all variables
- [ ] `npm install` completed
- [ ] Application starts without errors
- [ ] Can login as admin
- [ ] Premium Settings page loads
- [ ] User Management shows users
- [ ] Subscription Management shows data
- [ ] Exam Creator loads without errors
- [ ] Razorpay modal opens on Upgrade page
- [ ] Test payment succeeds

If all items are checked, your setup is complete! 🎉