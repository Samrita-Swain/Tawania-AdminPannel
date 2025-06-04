"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { useRouter } from "next/navigation";

interface Customer {
  id: string;
  name: string;
  email: string | null;
  loyaltyPoints: number;
  loyaltyTier: string;
}

interface LoyaltyTransaction {
  id: string;
  customerId: string;
  points: number;
  type: string;
  description: string | null;
  referenceId: string | null;
  expiryDate?: string | null;
  createdAt: string;
  customer: {
    id: string;
    name: string;
  };
}

interface LoyaltyTransactionsClientProps {
  initialTransactions: LoyaltyTransaction[];
  customers: Customer[];
  programId: string;
}

export function LoyaltyTransactionsClient({
  initialTransactions,
  customers,
  programId,
}: LoyaltyTransactionsClientProps) {
  const router = useRouter();
  const [transactions, setTransactions] = useState<LoyaltyTransaction[]>(initialTransactions);
  const [filteredTransactions, setFilteredTransactions] = useState<LoyaltyTransaction[]>(initialTransactions);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddingTransaction, setIsAddingTransaction] = useState(false);

  // Filter states
  const [customerFilter, setCustomerFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [dateFilter, setDateFilter] = useState<string>("");

  // New transaction state
  const [newTransaction, setNewTransaction] = useState({
    customerId: "",
    points: 0,
    type: "EARN",
    description: "",
    referenceId: "",
  });

  // Apply filters
  useEffect(() => {
    let filtered = [...transactions];

    if (customerFilter) {
      filtered = filtered.filter(t => t.customerId === customerFilter);
    }

    if (typeFilter) {
      filtered = filtered.filter(t => t.type === typeFilter);
    }

    if (dateFilter) {
      const filterDate = new Date(dateFilter);
      filtered = filtered.filter(t => {
        const transactionDate = new Date(t.createdAt);
        return (
          transactionDate.getFullYear() === filterDate.getFullYear() &&
          transactionDate.getMonth() === filterDate.getMonth() &&
          transactionDate.getDate() === filterDate.getDate()
        );
      });
    }

    setFilteredTransactions(filtered);
  }, [transactions, customerFilter, typeFilter, dateFilter]);

  // Handle adding a new transaction
  const handleAddTransaction = async () => {
    if (!newTransaction.customerId || !newTransaction.points) {
      alert("Customer and points are required");
      return;
    }

    setIsLoading(true);
    try {
      // Create an AbortController to handle timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch("/api/loyalty/transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...newTransaction,
          programId,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId); // Clear the timeout if the request completes

      if (response.ok) {
        const addedTransaction = await response.json();

        try {
          // Create an AbortController for customer fetch with a shorter timeout
          const customerController = new AbortController();
          const customerTimeoutId = setTimeout(() => customerController.abort(), 5000); // 5 second timeout

          // Fetch the customer details using the basic endpoint
          const customerResponse = await fetch(`/api/customers/basic/${newTransaction.customerId}`, {
            signal: customerController.signal,
          });

          clearTimeout(customerTimeoutId); // Clear the timeout if the request completes

          if (customerResponse.ok) {
            const customerData = await customerResponse.json();

            // Add the customer to the transaction
            const transactionWithCustomer = {
              ...addedTransaction,
              customer: {
                id: customerData.id,
                name: customerData.name,
              },
            };

            setTransactions([transactionWithCustomer, ...transactions]);
            setIsAddingTransaction(false);
            setNewTransaction({
              customerId: "",
              points: 0,
              type: "EARN",
              description: "",
              referenceId: "",
            });
          } else {
            throw new Error("Failed to fetch customer details");
          }
        } catch (customerError) {
          console.error("Error fetching customer details:", customerError);

          // Even if we can't fetch customer details, still add the transaction to the list
          const transactionWithCustomer = {
            ...addedTransaction,
            customer: {
              id: newTransaction.customerId,
              name: "Unknown Customer", // Fallback name
            },
          };

          setTransactions([transactionWithCustomer, ...transactions]);
          setIsAddingTransaction(false);
          setNewTransaction({
            customerId: "",
            points: 0,
            type: "EARN",
            description: "",
            referenceId: "",
          });
        }
      } else {
        const error = await response.json();
        alert(`Failed to add transaction: ${error.message}`);
      }
    } catch (error) {
      console.error("Error adding transaction:", error);

      // Check if it's an abort error (timeout)
      if (error.name === 'AbortError') {
        alert("The request timed out. Please try again.");
      } else {
        alert("An error occurred while adding the transaction");
      }
    } finally {
      // Always reset loading state and close the form
      setIsLoading(false);
      setIsAddingTransaction(false);
    }
  };

  // Reset filters
  const resetFilters = () => {
    setCustomerFilter("");
    setTypeFilter("");
    setDateFilter("");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Loyalty Transactions</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/loyalty"
            className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
          >
            Back to Loyalty Program
          </Link>
          <button
            onClick={() => setIsAddingTransaction(true)}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            Add Transaction
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-lg bg-white p-6 shadow-md">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Filter Transactions</h2>
        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
            <select
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">All Customers</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Transaction Type</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">All Types</option>
              <option value="EARN">Earn</option>
              <option value="REDEEM">Redeem</option>
              <option value="EXPIRE">Expire</option>
              <option value="ADJUST">Adjust</option>
              <option value="BONUS">Bonus</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={resetFilters}
              className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      {/* Add Transaction Form */}
      {isAddingTransaction && (
        <div className="rounded-lg bg-white p-6 shadow-md">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Add New Transaction</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
              <select
                value={newTransaction.customerId}
                onChange={(e) => setNewTransaction({...newTransaction, customerId: e.target.value})}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                required
              >
                <option value="">Select Customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name} ({customer.loyaltyPoints} points)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Transaction Type</label>
              <select
                value={newTransaction.type}
                onChange={(e) => setNewTransaction({...newTransaction, type: e.target.value})}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                required
              >
                <option value="EARN">Earn</option>
                <option value="REDEEM">Redeem</option>
                <option value="EXPIRE">Expire</option>
                <option value="ADJUST">Adjust</option>
                <option value="BONUS">Bonus</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Points</label>
              <input
                type="number"
                value={newTransaction.points}
                onChange={(e) => setNewTransaction({...newTransaction, points: parseInt(e.target.value)})}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reference ID (Optional)</label>
              <input
                type="text"
                value={newTransaction.referenceId}
                onChange={(e) => setNewTransaction({...newTransaction, referenceId: e.target.value})}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="e.g., Sale ID, Order ID"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
              <input
                type="text"
                value={newTransaction.description}
                onChange={(e) => setNewTransaction({...newTransaction, description: e.target.value})}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="e.g., Points earned from purchase, Birthday bonus"
              />
            </div>
            <div className="md:col-span-2 flex justify-end space-x-2">
              <button
                onClick={() => setIsAddingTransaction(false)}
                className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddTransaction}
                disabled={isLoading || !newTransaction.customerId || !newTransaction.points}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isLoading ? "Adding..." : "Add Transaction"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transactions Table */}
      <div className="rounded-lg bg-white p-6 shadow-md">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Transaction History</h2>
        {filteredTransactions.length === 0 ? (
          <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-gray-300">
            <p className="text-gray-800">No transactions found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-800">
                  <th className="px-4 py-2">Date</th>
                  <th className="px-4 py-2">Customer</th>
                  <th className="px-4 py-2">Type</th>
                  <th className="px-4 py-2">Points</th>
                  <th className="px-4 py-2">Description</th>
                  <th className="px-4 py-2">Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredTransactions.map((transaction) => {
                  // Determine points class
                  const pointsClass = transaction.type === "EARN" || transaction.type === "BONUS"
                    ? "text-green-600"
                    : transaction.type === "REDEEM" || transaction.type === "EXPIRE"
                      ? "text-red-600"
                      : "text-gray-800";

                  // Format points
                  const formattedPoints = transaction.type === "EARN" || transaction.type === "BONUS"
                    ? `+${transaction.points}`
                    : transaction.type === "REDEEM" || transaction.type === "EXPIRE"
                      ? `-${transaction.points}`
                      : transaction.points;

                  return (
                    <tr key={transaction.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-800">
                        {format(new Date(transaction.createdAt), "MMM d, yyyy")}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-sm font-medium text-blue-600">
                        <Link href={`/customers/${transaction.customerId}`}>
                          {transaction.customer.name}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-sm">
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                          transaction.type === "EARN" || transaction.type === "BONUS"
                            ? "bg-green-100 text-green-800"
                            : transaction.type === "REDEEM"
                              ? "bg-blue-100 text-blue-800"
                              : transaction.type === "EXPIRE"
                                ? "bg-red-100 text-red-800"
                                : "bg-gray-100 text-gray-800"
                        }`}>
                          {transaction.type}
                        </span>
                      </td>
                      <td className={`whitespace-nowrap px-4 py-2 text-sm font-medium ${pointsClass}`}>
                        {formattedPoints}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-800">
                        {transaction.description || "-"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-sm">
                        {transaction.referenceId ? (
                          <span className="text-gray-800">
                            {transaction.referenceId}
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
