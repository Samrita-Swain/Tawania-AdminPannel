"use client";

import { useEffect, useState } from "react";

export default function TestPage() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Test Page</h1>
      <p className="mb-4">This is a simple test page to check if rendering works.</p>
      <div className="p-4 bg-green-100 rounded-md">
        {isClient ? (
          <p className="text-green-800">✅ Client-side rendering is working!</p>
        ) : (
          <p>Waiting for client-side hydration...</p>
        )}
      </div>
    </div>
  );
}
