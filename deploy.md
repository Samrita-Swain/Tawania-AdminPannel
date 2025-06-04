# 🚀 Tawania Admin Panel - Vercel Deployment Guide

## Prerequisites
1. **Vercel Account** - Sign up at https://vercel.com
2. **GitHub Repository** - Your code should be in a GitHub repo
3. **Neon Database** - Your database should be running

## Step 1: Install Vercel CLI
```bash
npm install -g vercel
```

## Step 2: Login to Vercel
```bash
vercel login
```

## Step 3: Environment Variables Setup
You need to set these environment variables in Vercel:

### Required Environment Variables:
```
DATABASE_URL=your-neon-database-url
DIRECT_URL=your-neon-direct-url  
NEXTAUTH_URL=https://your-app-name.vercel.app
NEXTAUTH_SECRET=your-strong-secret-key
NODE_ENV=production
```

### How to Set Environment Variables:
1. Go to your Vercel dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Add each variable with its value

## Step 4: Deploy Commands

### Option A: Deploy from Local (Recommended)
```bash
# Navigate to your project directory
cd your-project-directory

# Deploy to Vercel
vercel

# Follow the prompts:
# - Link to existing project or create new
# - Set up project settings
# - Deploy
```

### Option B: Deploy from GitHub
1. Connect your GitHub repository to Vercel
2. Import your project
3. Set environment variables
4. Deploy automatically

## Step 5: Post-Deployment Setup

### Database Migration (if needed)
```bash
# Run this after first deployment
npx prisma db push
```

### Verify Deployment
1. Check your app URL: `https://your-app-name.vercel.app`
2. Test authentication
3. Test database connection
4. Test all major features

## Troubleshooting

### Common Issues:
1. **Build Errors**: Check build logs in Vercel dashboard
2. **Database Connection**: Verify DATABASE_URL and DIRECT_URL
3. **Authentication Issues**: Check NEXTAUTH_URL and NEXTAUTH_SECRET
4. **API Timeouts**: Functions have 30-second timeout limit

### Build Optimization:
- Prisma schema is generated during build
- Next.js optimizations are applied
- Static assets are optimized

## Production Checklist
- [ ] Environment variables set
- [ ] Database accessible
- [ ] Authentication working
- [ ] All pages loading
- [ ] API endpoints responding
- [ ] Real-time features working
- [ ] Performance optimized

## Support
If you encounter issues:
1. Check Vercel build logs
2. Verify environment variables
3. Test database connection
4. Check API routes
