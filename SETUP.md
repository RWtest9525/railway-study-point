# Railway Study Point - Setup Guide

A complete competitive exam preparation platform with admin and student portals.

## Features

- **Student Portal**: Browse exam categories (ALP, NTPC, Group-D), attempt timed exams, view detailed results
- **Admin Portal**: Manage questions, create exams, track revenue from premium subscriptions
- **Authentication**: Email/password and Google OAuth with Supabase
- **Payments**: Razorpay integration for ₹39 premium upgrades
- **Dark Mode**: Modern dark UI optimized for studying

## Prerequisites

- Node.js 16+ installed
- A Supabase account and project
- A Razorpay account (for payment integration)

## Setup Instructions

### 1. Supabase Configuration

1. Create a new Supabase project at https://app.supabase.com
2. Go to Project Settings → API Keys
3. Copy your `Project URL` and `anon public key`

### 2. Environment Variables

Create a `.env.local` file in the project root:

```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_RAZORPAY_KEY_ID=your_razorpay_key_id
```

### 3. Database Setup

The database migrations are automatically applied through Supabase. The schema includes:

- **profiles**: User accounts with roles (admin/student) and premium status
- **questions**: MCQs organized by category with explanations
- **exams**: Timed exams bundling questions together
- **results**: Student exam scores and performance data
- **transactions**: Payment records for premium upgrades

### 4. Create Admin User

To create an admin user:

1. Sign up normally in the app
2. Go to Supabase Dashboard → SQL Editor
3. Run this query:
```sql
UPDATE profiles SET role = 'admin' WHERE email = 'your_email@example.com';
```

### 5. Seed Sample Questions

To populate the database with 10 sample questions:

```bash
# First, ensure your .env.local is configured
# Then run the seed script
npx ts-node seed-questions.ts
```

The sample questions cover:
- ALP (Assistant Loco Pilot) - 5 questions
- NTPC (Non-Technical Popular Categories) - 3 questions
- Group-D - 2 questions

### 6. Configure Google OAuth (Optional)

1. Go to Supabase Dashboard → Authentication → Providers
2. Enable Google provider
3. Follow the setup instructions (requires Google Cloud credentials)

### 7. Razorpay Integration

1. Get your Razorpay Key ID from https://dashboard.razorpay.com/app/keys
2. Add it to `.env.local` as `VITE_RAZORPAY_KEY_ID`
3. For webhooks, see Razorpay webhook documentation

## Running the Application

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

The app will open at `http://localhost:5173`

## User Roles

### Students
- Browse and take exams
- View detailed results with explanations
- Upgrade to premium for exclusive exams
- Track performance over time

### Admins
- Add/edit/delete questions
- Create exams by bundling questions
- View revenue from premium subscriptions
- Monitor user transactions

## Project Structure

```
src/
├── components/          # Reusable components
├── contexts/           # React contexts (Auth, Router)
├── lib/                # Utilities and database types
├── pages/
│   ├── admin/         # Admin portal pages
│   ├── ExamInterface.tsx
│   ├── Results.tsx
│   ├── StudentDashboard.tsx
│   ├── Login.tsx
│   ├── Signup.tsx
│   └── Upgrade.tsx
└── App.tsx            # Main routing
```

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL | `https://abc.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key | `eyJhbGciOiJIUzI1NiIs...` |
| `VITE_RAZORPAY_KEY_ID` | Razorpay Key ID | `rzp_live_xxxxxxxx` |

## API Routes & Webhooks

### Razorpay Webhook

When a payment is successful, the app automatically:
1. Updates the transaction status to 'success'
2. Sets the user's `is_premium` flag to true
3. Unlocks premium exams

## Troubleshooting

### "Missing Supabase environment variables"
- Check `.env.local` file exists with correct variables
- Restart development server after changing .env

### "Authentication failed"
- Verify Supabase credentials are correct
- Check network connectivity
- Clear browser cookies and try again

### "Payment button not working"
- Ensure Razorpay Key ID is correct
- Check browser console for errors
- Verify you're in test mode with test credentials

### Database migration errors
- Migrations run automatically on first connection
- If issues occur, check Supabase SQL logs
- Contact Supabase support for database issues

## Testing the App

### Test Workflow (Student)
1. Sign up with email
2. Navigate to a free exam
3. Take the exam
4. View results with explanations
5. Try upgrading to premium

### Test Workflow (Admin)
1. Create admin account
2. Go to Admin Portal
3. Add questions to Question Bank
4. Create an exam from those questions
5. View revenue from premium users

## Performance

- Optimized for mobile with responsive design
- Lazy loading for exam content
- Real-time database sync
- Caching for question data

## Security

- Row Level Security (RLS) on all tables
- JWT authentication with Supabase
- Environment variables for sensitive data
- CORS configured for Razorpay

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Payments**: Razorpay
- **Icons**: Lucide React

## Next Steps

1. Deploy to Vercel or similar platform
2. Configure custom domain
3. Set up email templates for auth
4. Add analytics
5. Implement progress tracking

## Support

For issues or questions:
- Check Supabase documentation
- Review Razorpay API docs
- Check browser console for errors

## License

This project is open source and available for educational purposes.
