# Tawania Admin Panel - Server Deployment Guide

## Quick Start

### Option 1: Using the Startup Script
1. Double-click `start-admin.bat` to automatically start the admin panel
2. Wait for the server to start
3. Open your browser and go to the displayed URL

### Option 2: Manual Start
1. Open terminal/command prompt
2. Navigate to the project directory
3. Run the following commands:

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

## Accessing the Admin Panel

Once the server is running, you can access the admin panel at:
- **Local:** http://localhost:3000 (or next available port)
- **Network:** http://[your-ip]:3000

## Admin Panel Features

### ✅ Working Features:
- **Dashboard:** Overview with statistics and quick actions
- **Warehouse Management:** Out of Stock and Closing Stock management
- **Store Management:** Store inventory and point of sale
- **Product Management:** Product catalog and categories
- **User Management:** Admin user controls
- **Reports:** Business intelligence and analytics

### 🎯 Main Sections:
1. **Dashboard** - Main overview page
2. **Warehouse Management** - Inventory control
3. **Store Management** - Retail operations
4. **Audit Management** - Inventory audits
5. **System** - User and report management

## Troubleshooting

### If you see a blank page:
1. Wait for the compilation to complete (check terminal)
2. Refresh the browser page
3. Clear browser cache (Ctrl+F5)
4. Check if the server is running on a different port

### If the server won't start:
1. Make sure Node.js is installed
2. Delete `node_modules` folder and run `npm install` again
3. Check if port 3000 is already in use
4. Try running `npm run build` first

### Common Issues:
- **Port already in use:** The server will automatically use the next available port
- **Compilation errors:** Check the terminal for error messages
- **Blank page:** Wait for compilation to complete, then refresh

## Production Deployment

For production deployment:

```bash
# Build for production
npm run build

# Start production server
npm start
```

## Support

If you encounter any issues:
1. Check the terminal/console for error messages
2. Ensure all dependencies are installed
3. Try restarting the development server
4. Clear browser cache and cookies

The admin panel is now optimized for server deployment with:
- ✅ Simplified authentication (no complex auth dependencies)
- ✅ Mock data for immediate functionality
- ✅ Clean error handling
- ✅ Proper loading states
- ✅ Responsive design for all devices
