"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LoyaltyTier } from "@prisma/client";

export function CustomerForm() {
  const router = useRouter();

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [loyaltyTier, setLoyaltyTier] = useState<LoyaltyTier>("STANDARD");
  const [isActive, setIsActive] = useState(true);
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
  const [addresses, setAddresses] = useState<any[]>([]);

  const handleAddAddress = () => {
    if (!street || !city || !postalCode || !country) {
      setError("Please fill in all required address fields");
      return;
    }

    const newAddress = {
      type: addressType,
      street,
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
      const customerData = {
        name,
        email: email || null,
        phone: phone || null,
        address: address || null,
        loyaltyPoints: loyaltyPoints || 0,
        loyaltyTier,
        isActive,
        addresses
      };
      
      const response = await fetch("/api/customers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(customerData),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to create customer");
      }
      
      setSuccess("Customer created successfully!");
      
      // Redirect to the customer detail page after a short delay
      setTimeout(() => {
        router.push(`/customers/${data.customer.id}`);
        router.refresh();
      }, 1500);
      
    } catch (err: any) {
      setError(err.message || "An error occurred while creating the customer");
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
        
        {/* Addresses Section */}
        <div className="rounded-lg bg-white p-6 shadow-md">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-800">Addresses</h2>
            <Button 
              type="button" 
              onClick={() => setShowAddressForm(true)}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              disabled={showAddressForm}
            >
              Add Address
            </Button>
          </div>
          
          {addresses.length === 0 && !showAddressForm && (
            <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-gray-300">
              <p className="text-gray-500">No addresses added yet</p>
            </div>
          )}
          
          {addresses.length > 0 && (
            <div className="mb-4 space-y-3">
              {addresses.map((addr, index) => (
                <div key={index} className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
                  <div>
                    <div className="font-medium">{addr.type} Address {addr.isDefault && "(Default)"}</div>
                    <div className="text-sm text-gray-600">
                      {addr.street}, {addr.city}, {addr.state && `${addr.state},`} {addr.postalCode}, {addr.country}
                    </div>
                  </div>
                  <Button
                    type="button"
                    onClick={() => handleRemoveAddress(index)}
                    className="rounded-md bg-red-100 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-200"
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}
          
          {showAddressForm && (
            <div className="mt-4 rounded-lg border border-gray-200 p-4">
              <h3 className="mb-3 text-md font-medium text-gray-800">Add New Address</h3>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="addressType" className="mb-1 block text-sm font-medium text-gray-800">
                    Address Type
                  </label>
                  <select
                    id="addressType"
                    value={addressType}
                    onChange={(e) => setAddressType(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="SHIPPING">Shipping</option>
                    <option value="BILLING">Billing</option>
                    <option value="BOTH">Both</option>
                  </select>
                </div>
                
                <div>
                  <label htmlFor="isDefault" className="mb-1 block text-sm font-medium text-gray-800">
                    Default Address
                  </label>
                  <select
                    id="isDefault"
                    value={isDefault ? "yes" : "no"}
                    onChange={(e) => setIsDefault(e.target.value === "yes")}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>
                
                <div className="md:col-span-2">
                  <label htmlFor="street" className="mb-1 block text-sm font-medium text-gray-800">
                    Street Address *
                  </label>
                  <input
                    id="street"
                    type="text"
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="city" className="mb-1 block text-sm font-medium text-gray-800">
                    City *
                  </label>
                  <input
                    id="city"
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="state" className="mb-1 block text-sm font-medium text-gray-800">
                    State/Province
                  </label>
                  <input
                    id="state"
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label htmlFor="postalCode" className="mb-1 block text-sm font-medium text-gray-800">
                    Postal Code *
                  </label>
                  <input
                    id="postalCode"
                    type="text"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="country" className="mb-1 block text-sm font-medium text-gray-800">
                    Country *
                  </label>
                  <input
                    id="country"
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
              
              <div className="mt-4 flex justify-end space-x-2">
                <Button
                  type="button"
                  onClick={() => setShowAddressForm(false)}
                  className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleAddAddress}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Add
                </Button>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex justify-end space-x-3">
          <Link
            href="/customers"
            className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            Cancel
          </Link>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            {isSubmitting ? "Creating..." : "Create Customer"}
          </Button>
        </div>
      </form>
    </div>
  );
}
