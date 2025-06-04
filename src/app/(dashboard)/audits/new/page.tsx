"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

interface Warehouse {
  id: string;
  name: string;
  code: string;
}

interface WarehouseZone {
  id: string;
  name: string;
  warehouseId: string;
}

interface User {
  id: string;
  name: string | null;
  email: string;
}

export default function NewAuditPage() {
  const router = useRouter();

  // Form state
  const [warehouseId, setWarehouseId] = useState("");
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedZones, setSelectedZones] = useState<string[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Data state
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [zones, setZones] = useState<WarehouseZone[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [auditFunctionalityAvailable, setAuditFunctionalityAvailable] = useState(true);

  // Check if audit functionality is available
  useEffect(() => {
    const checkAuditFunctionality = async () => {
      try {
        // Make a simple request to the audits API to check if it's available
        const response = await fetch('/api/audits?page=1&pageSize=1');

        if (!response.ok) {
          const data = await response.json();
          if (data.error === "Audit functionality is not available") {
            setAuditFunctionalityAvailable(false);
          }
        }
      } catch (error) {
        console.error('Error checking audit functionality:', error);
        // Assume it's available and let the actual audit creation handle errors
      }
    };

    checkAuditFunctionality();
  }, []);

  // Fetch warehouses, zones, and users
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);

      try {
        // Fetch warehouses and users separately to handle errors independently
        try {
          // Fetch warehouses
          const warehousesResponse = await fetch('/api/warehouses?status=active');

          if (!warehousesResponse.ok) {
            const errorData = await warehousesResponse.json();
            console.error('Warehouse API error:', errorData);
            throw new Error(errorData.message || 'Failed to fetch warehouses');
          }

          const warehousesData = await warehousesResponse.json();
          setWarehouses(warehousesData.warehouses || []);
        } catch (err) {
          console.error('Error fetching warehouses:', err);
          setWarehouses([]);
        }

        try {
          // Fetch users
          const usersResponse = await fetch('/api/users');

          // Even if the response is not OK, try to parse it
          let usersData;
          try {
            usersData = await usersResponse.json();
          } catch (parseError) {
            console.error('Error parsing users response:', parseError);
            // If we can't parse the response, set an empty array
            setUsers([]);
            return; // Exit early
          }

          // If we have users data, use it regardless of response status
          if (usersData && Array.isArray(usersData.users)) {
            setUsers(usersData.users);
          } else {
            // If we don't have users data, set an empty array
            console.error('Users API returned invalid data:', usersData);
            setUsers([]);
          }
        } catch (err) {
          console.error('Error fetching users:', err);
          setUsers([]);
        }
      } catch (error: any) {
        console.error('Error fetching data:', error);
        // Use a more specific error message
        alert(error.message || 'Failed to load data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Fetch zones when warehouse changes
  useEffect(() => {
    const fetchZones = async () => {
      if (!warehouseId) {
        setZones([]);
        return;
      }

      console.log("Fetching zones for warehouse:", warehouseId);

      try {
        const zonesResponse = await fetch(`/api/warehouses/${warehouseId}/zones`);

        console.log("Zones response status:", zonesResponse.status);

        if (!zonesResponse.ok) {
          const errorData = await zonesResponse.json();
          console.error('Zones API error:', errorData);
          throw new Error(errorData.error || 'Failed to fetch warehouse zones');
        }

        const zonesData = await zonesResponse.json();
        console.log("Zones data received:", zonesData);

        setZones(zonesData.zones || []);
      } catch (error) {
        console.error('Error fetching zones:', error);

        // More specific error message
        let errorMessage = 'Failed to load warehouse zones. ';
        if (error instanceof Error) {
          if (error.message.includes('Warehouse not found')) {
            errorMessage += 'The selected warehouse was not found.';
          } else if (error.message.includes('Unauthorized')) {
            errorMessage += 'You are not authorized to access this warehouse.';
          } else {
            errorMessage += error.message;
          }
        } else {
          errorMessage += 'Please try again.';
        }

        alert(errorMessage);
        setZones([]);
      }
    };

    fetchZones();
  }, [warehouseId]);

  // Handle zone selection
  const handleZoneToggle = (zoneId: string) => {
    setSelectedZones(prev =>
      prev.includes(zoneId)
        ? prev.filter(id => id !== zoneId)
        : [...prev, zoneId]
    );
  };

  // Handle user selection
  const handleUserToggle = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check if audit functionality is available first
    if (!auditFunctionalityAvailable) {
      // Don't show an alert, just return and let the UI handle it
      return;
    }

    if (!warehouseId || !startDate) {
      alert('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      // Double-check audit functionality before submitting
      const checkResponse = await fetch('/api/audits?page=1&pageSize=1');
      if (!checkResponse.ok) {
        const checkData = await checkResponse.json();
        if (checkData.error === "Audit functionality is not available") {
          setAuditFunctionalityAvailable(false);
          throw new Error("Audit functionality is not available. Please check system configuration.");
        }
      }

      const auditData = {
        warehouseId,
        startDate: new Date(startDate).toISOString(),
        endDate: endDate ? new Date(endDate).toISOString() : null,
        notes,
        zones: selectedZones,
        users: selectedUsers,
      };

      const response = await fetch('/api/audits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(auditData),
      });

      let errorMessage = 'Failed to create audit. Please try again.';

      try {
        // Log the raw response for debugging
        console.log('Response status:', response.status);
        console.log('Response headers:', Object.fromEntries([...response.headers.entries()]));

        let data;
        let responseText = '';

        try {
          // First try to get the raw text
          responseText = await response.text();
          console.log('Raw response text:', responseText);

          // Then parse it as JSON if possible
          try {
            data = JSON.parse(responseText);
            console.log('Parsed response data:', data);
          } catch (parseError) {
            console.error('Error parsing JSON from text:', parseError);
            throw new Error(`Failed to parse server response: ${responseText}`);
          }
        } catch (textError) {
          console.error('Error getting response text:', textError);
          throw new Error('Failed to read server response. Please try again.');
        }

        if (!response.ok) {
          // Extract error details
          errorMessage = data?.error || data?.details || errorMessage;
          console.error('Server error response:', data);

          if (data?.stack) {
            console.error('Error stack:', data.stack);
          }

          // Check if the error is about audit functionality
          if (errorMessage.includes("Audit functionality is not available")) {
            setAuditFunctionalityAvailable(false);
          }

          throw new Error(errorMessage);
        }

        // Success - redirect to audit details page
        if (data.audit && data.audit.id) {
          console.log('Audit created successfully:', data.audit);
          router.push(`/audits/${data.audit.id}`);
        } else {
          console.warn('Audit created but no ID returned:', data);
          // If we don't have an audit ID, go back to the audits list
          router.push('/audits');
        }
      } catch (parseError) {
        console.error('Error handling response:', parseError);
        throw new Error(errorMessage);
      }
    } catch (error: any) {
      console.error('Error creating audit:', error);
      console.error('Error stack:', error.stack);

      // If the error is about audit functionality, don't show an alert
      // as we'll show the not available UI instead
      if (!error.message.includes("Audit functionality is not available")) {
        // Create a more user-friendly error message
        let userMessage = error.message || 'Failed to create audit. Please try again.';

        // If it's a technical error, add a more user-friendly prefix
        if (userMessage.includes("TypeError") ||
            userMessage.includes("SyntaxError") ||
            userMessage.includes("undefined") ||
            userMessage.includes("null")) {
          userMessage = "Technical error occurred: " + userMessage;
        }

        alert(userMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg bg-white p-6 shadow-md">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600 mx-auto"></div>
          <p className="text-gray-800">Loading data...</p>
        </div>
      </div>
    );
  }

  if (!auditFunctionalityAvailable) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">Create New Audit</h1>
          <Link
            href="/audits"
            className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-200 transition-colors"
          >
            Back to Audits
          </Link>
        </div>

        <div className="flex flex-col items-center justify-center py-12 px-4 rounded-lg bg-white shadow-md">
          <div className="rounded-full bg-yellow-100 p-3 text-yellow-600 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Audit Functionality Not Available</h2>
          <p className="text-gray-800 mb-6 text-center max-w-md">
            The audit functionality is not available in the current system configuration.
            This may be because the required database models have not been set up.
          </p>
          <div className="flex gap-4">
            <Link
              href="/audits"
              className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-200 transition-colors"
            >
              Back to Audits
            </Link>
            <Button
              type="button"
              onClick={() => router.push('/')}
            >
              Go to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }



  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Create New Audit</h1>
        <Link
          href="/audits"
          className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-200 transition-colors"
        >
          Cancel
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">Audit Information</h2>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label htmlFor="warehouse" className="mb-1 block text-sm font-medium text-gray-800">
                Warehouse *
              </label>
              <select
                id="warehouse"
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              >
                <option value="">Select Warehouse</option>
                {warehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name} ({warehouse.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="startDate" className="mb-1 block text-sm font-medium text-gray-800">
                Start Date *
              </label>
              <input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label htmlFor="endDate" className="mb-1 block text-sm font-medium text-gray-800">
                End Date (Optional)
              </label>
              <input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="notes" className="mb-1 block text-sm font-medium text-gray-800">
                Notes
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Warehouse Zones */}
        <div className="rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">Warehouse Zones</h2>
          {!warehouseId ? (
            <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-gray-300">
              <p className="text-gray-800">Please select a warehouse first</p>
            </div>
          ) : zones.length === 0 ? (
            <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-gray-300">
              <p className="text-gray-800">No zones found for this warehouse</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {zones.map((zone) => (
                <div
                  key={zone.id}
                  className={`rounded-lg border p-4 cursor-pointer transition-colors ${
                    selectedZones.includes(zone.id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                  }`}
                  onClick={() => handleZoneToggle(zone.id)}
                >
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedZones.includes(zone.id)}
                      onChange={() => {}}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label className="ml-2 text-sm font-medium text-gray-800">
                      {zone.name}
                    </label>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Assign Users */}
        <div className="rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">Assign Users</h2>
          {users.length === 0 ? (
            <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-gray-300">
              <p className="text-gray-800">No users found</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {users.map((user) => (
                <div
                  key={user.id}
                  className={`rounded-lg border p-4 cursor-pointer transition-colors ${
                    selectedUsers.includes(user.id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                  }`}
                  onClick={() => handleUserToggle(user.id)}
                >
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user.id)}
                      onChange={() => {}}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label className="ml-2 text-sm font-medium text-gray-800">
                      {user.name || user.email}
                    </label>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/audits')}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            isLoading={isSubmitting}
            disabled={isSubmitting || !warehouseId || !startDate || !auditFunctionalityAvailable}
          >
            Create Audit
          </Button>
        </div>
      </form>
    </div>
  );
}
