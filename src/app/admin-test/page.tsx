export default function AdminTest() {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          🎉 Admin Panel Test - Working!
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Dashboard</h2>
            <p className="text-gray-600">Main admin dashboard</p>
            <a href="/dashboard" className="text-blue-600 hover:underline">
              Go to Dashboard →
            </a>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Products</h2>
            <p className="text-gray-600">Manage products</p>
            <a href="/products" className="text-blue-600 hover:underline">
              Go to Products →
            </a>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Returns</h2>
            <p className="text-gray-600">Process returns</p>
            <a href="/returns/new" className="text-blue-600 hover:underline">
              Go to Returns →
            </a>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Inventory</h2>
            <p className="text-gray-600">Manage inventory</p>
            <a href="/inventory" className="text-blue-600 hover:underline">
              Go to Inventory →
            </a>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Sales</h2>
            <p className="text-gray-600">View sales</p>
            <a href="/sales" className="text-blue-600 hover:underline">
              Go to Sales →
            </a>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Customers</h2>
            <p className="text-gray-600">Manage customers</p>
            <a href="/customers" className="text-blue-600 hover:underline">
              Go to Customers →
            </a>
          </div>
        </div>
        
        <div className="mt-8 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          <strong>✅ Success!</strong> Your admin panel is working. The server is running properly.
        </div>
      </div>
    </div>
  );
}
