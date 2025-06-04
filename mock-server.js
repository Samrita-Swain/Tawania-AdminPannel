const http = require('http');
const fs = require('fs');
const path = require('path');

// Create a simple HTTP server
const server = http.createServer((req, res) => {
  console.log(`Request received: ${req.method} ${req.url}`);
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // Serve static HTML file for the root path
  if (req.url === '/' || req.url === '/index.html') {
    const filePath = path.join(__dirname, 'mock-admin-panel.html');
    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(500);
        res.end('Error loading the page');
        return;
      }
      
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(content);
    });
    return;
  }
  
  // Handle API requests
  if (req.url.startsWith('/api')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    
    // Mock API responses
    if (req.url === '/api/auth/login' && req.method === 'POST') {
      // Mock login response
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      
      req.on('end', () => {
        try {
          const { email, password } = JSON.parse(body);
          
          if (email === 'admin@tawania.com' && password === 'admin123') {
            res.end(JSON.stringify({
              success: true,
              user: {
                id: '1',
                name: 'Rajesh Kumar',
                email: 'admin@tawania.com',
                role: 'ADMIN'
              },
              token: 'mock-jwt-token'
            }));
          } else {
            res.writeHead(401);
            res.end(JSON.stringify({
              success: false,
              message: 'Invalid credentials'
            }));
          }
        } catch (error) {
          res.writeHead(400);
          res.end(JSON.stringify({
            success: false,
            message: 'Invalid request'
          }));
        }
      });
      return;
    }
    
    // Mock dashboard data
    if (req.url === '/api/dashboard' && req.method === 'GET') {
      res.end(JSON.stringify({
        stats: {
          totalSales: 12500,
          totalOrders: 150,
          totalCustomers: 75,
          totalProducts: 200
        },
        recentSales: [
          { id: '1', customer: 'John Doe', amount: 250, date: '2023-05-18' },
          { id: '2', customer: 'Jane Smith', amount: 120, date: '2023-05-17' },
          { id: '3', customer: 'Bob Johnson', amount: 350, date: '2023-05-16' }
        ],
        lowStockItems: [
          { id: '1', name: 'Product A', stock: 5, minStock: 10 },
          { id: '2', name: 'Product B', stock: 3, minStock: 15 },
          { id: '3', name: 'Product C', stock: 8, minStock: 20 }
        ]
      }));
      return;
    }
    
    // Default API response
    res.end(JSON.stringify({
      message: 'Mock API endpoint'
    }));
    return;
  }
  
  // Handle 404
  res.writeHead(404);
  res.end('Not Found');
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Mock server running at http://localhost:${PORT}`);
  console.log('Use the following credentials to log in:');
  console.log('Email: admin@tawania.com');
  console.log('Password: admin123');
});
