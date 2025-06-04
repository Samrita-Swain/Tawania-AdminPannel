"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LoyaltyTier } from "@prisma/client";

interface CustomerAddress {
  id: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

interface CustomerEditFormProps {
  customer: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    loyaltyPoints: number;
    loyaltyTier: LoyaltyTier;
    isActive: boolean;
  };
  addresses: CustomerAddress[];
}

export function CustomerEditForm({ customer, addresses: initialAddresses }: CustomerEditFormProps) {
  const router = useRouter();

  // Form state
  const [name, setName] = useState(customer.name);
  const [email, setEmail] = useState(customer.email || "");
  const [phone, setPhone] = useState(customer.phone || "");
  const [address, setAddress] = useState(customer.address || "");
  const [loyaltyPoints, setLoyaltyPoints] = useState(customer.loyaltyPoints);
  const [loyaltyTier, setLoyaltyTier] = useState<LoyaltyTier>(customer.loyaltyTier);
  const [isActive, setIsActive] = useState(customer.isActive);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Address state
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressType, setAddressType] = useState("SHIPPING");
  const [isDefault, setIsDefault] = useState(true);
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("India");
  const [addresses, setAddresses] = useState<CustomerAddress[]>(initialAddresses);

  const handleAddAddress = () => {
    if (!street || !city || !postalCode || !country) {
      setError("Please fill in all required address fields");
      return;
    }

    const newAddress = {
      id: `temp-${Date.now()}`,
      address: street,
      city,
      state,
      postalCode,
      country,
      isDefault
    };

    setAddresses([...addresses, newAddress]);

    // Reset address form
    setStreet("");
    setCity("");
    setState("");
    setPostalCode("");
    setShowAddressForm(false);
    setError("");
  };

  const handleRemoveAddress = (index: number) => {
    const updatedAddresses = [...addresses];
    updatedAddresses.splice(index, 1);
    setAddresses(updatedAddresses);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name) {
      setError("Customer name is required");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setSuccess("");

    try {
      // Only include fields that exist in the Prisma schema
      const customerData = {
        name,
        email: email || null,
        phone: phone || null,
        address: address || null,
        loyaltyPoints: loyaltyPoints || 0,
        loyaltyTier,
        isActive,
      };

      const response = await fetch(`/api/customers/${customer.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(customerData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update customer");
      }

      setSuccess("Customer updated successfully!");

      // Redirect to the customer detail page after a short delay
      setTimeout(() => {
        router.push(`/customers/${customer.id}`);
        router.refresh();
      }, 1500);

    } catch (err: any) {
      setError(err.message || "An error occurred while updating the customer");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-600">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-4 text-lg font-medium text-gray-800">Customer Information</h2>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="md:col-span-2">
              <label htmlFor="name" className="mb-1 block text-sm font-medium text-gray-800">
                Customer Name *
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-800">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="phone" className="mb-1 block text-sm font-medium text-gray-800">
                Phone
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="address" className="mb-1 block text-sm font-medium text-gray-800">
                Primary Address
              </label>
              <input
                id="address"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="loyaltyPoints" className="mb-1 block text-sm font-medium text-gray-800">
                Loyalty Points
              </label>
              <input
                id="loyaltyPoints"
                type="number"
                min="0"
                value={loyaltyPoints}
                onChange={(e) => setLoyaltyPoints(parseInt(e.target.value))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="loyaltyTier" className="mb-1 block text-sm font-medium text-gray-800">
                Loyalty Tier
              </label>
              <select
                id="loyaltyTier"
                value={loyaltyTier}
                onChange={(e) => setLoyaltyTier(e.target.value as LoyaltyTier)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="STANDARD">Standard</option>
                <option value="SILVER">Silver</option>
                <option value="GOLD">Gold</option>
                <option value="PLATINUM">Platinum</option>
              </select>
            </div>

            <div>
              <label htmlFor="isActive" className="mb-1 block text-sm font-medium text-gray-800">
                Status
              </label>
              <select
                id="isActive"
                value={isActive ? "active" : "inactive"}
                onChange={(e) => setIsActive(e.target.value === "active")}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <Link
            href={`/customers/${customer.id}`}
            className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            Cancel
          </Link>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            {isSubmitting ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
