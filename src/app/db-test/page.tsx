import { prisma } from "@/lib/prisma";

export default async function DbTestPage() {
  let dbStatus = "Unknown";
  let error = null;
  
  try {
    // Try to connect to the database
    await prisma.$connect();
    dbStatus = "Connected";
    
    // Try to query something simple
    const count = await prisma.customer.count();
    dbStatus = `Connected (${count} customers found)`;
  } catch (err) {
    dbStatus = "Error";
    error = err;
    console.error("Database connection error:", err);
  } finally {
    await prisma.$disconnect();
  }
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Database Test Page</h1>
      <p className="mt-4">Database status: <span className={dbStatus === "Error" ? "text-red-600 font-bold" : "text-green-600 font-bold"}>{dbStatus}</span></p>
      
      {error && (
        <div className="mt-4 p-4 bg-red-100 rounded-lg">
          <h2 className="font-bold text-red-800">Error Details:</h2>
          <pre className="mt-2 text-sm overflow-auto">{JSON.stringify(error, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
