import { prisma } from "@/lib/db";

export default async function TestDbPage() {
  let dbStatus = "Unknown";
  let error = null;
  let customers = [];

  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1 as result`;
    dbStatus = "Connected";

    // Try to fetch customers
    customers = await prisma.customer.findMany({
      take: 5,
      orderBy: {
        createdAt: "desc",
      },
    });
  } catch (err) {
    dbStatus = "Error";
    error = err;
  }

  return (
    <div className="p-8 bg-white">
      <h1 className="text-2xl font-bold mb-4">Database Connection Test</h1>
      
      <div className="mb-4">
        <strong>Status:</strong>{" "}
        <span className={dbStatus === "Connected" ? "text-green-600" : "text-red-600"}>
          {dbStatus}
        </span>
      </div>
      
      {error && (
        <div className="mb-4 p-4 bg-red-50 text-red-800 rounded">
          <strong>Error:</strong>
          <pre className="mt-2 text-sm">{JSON.stringify(error, null, 2)}</pre>
        </div>
      )}
      
      <div className="mb-4">
        <h2 className="text-xl font-semibold mb-2">Sample Customers:</h2>
        {customers.length > 0 ? (
          <ul className="list-disc pl-5">
            {customers.map((customer: any) => (
              <li key={customer.id} className="mb-1">
                {customer.name} ({customer.email})
              </li>
            ))}
          </ul>
        ) : (
          <p>No customers found</p>
        )}
      </div>
      
      <div className="mt-8">
        <a href="/customers" className="text-blue-600 hover:underline">
          Go back to Customers page
        </a>
      </div>
    </div>
  );
}
