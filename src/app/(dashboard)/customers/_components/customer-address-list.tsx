"use client";

import Link from "next/link";
import { format } from "date-fns";

interface CustomerAddress {
  id: string;
  customerId: string;
  addressType: string;
  isDefault: boolean;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string | null;
  postalCode: string;
  country: string;
  phone: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface CustomerAddressListProps {
  addresses: CustomerAddress[];
}

export function CustomerAddressList({ addresses }: CustomerAddressListProps) {
  if (addresses.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-gray-300">
        <p className="text-gray-800">No addresses found</p>
      </div>
    );
  }
  
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {addresses.map((address) => (
        <div
          key={address.id}
          className={`rounded-lg border p-4 ${
            address.isDefault ? "border-blue-300 bg-blue-50" : "border-gray-200"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
              address.addressType === "SHIPPING"
                ? "bg-green-100 text-green-800"
                : address.addressType === "BILLING"
                  ? "bg-purple-100 text-purple-800"
                  : "bg-blue-100 text-blue-800"
            }`}>
              {address.addressType.charAt(0) + address.addressType.slice(1).toLowerCase()}
            </span>
            {address.isDefault && (
              <span className="inline-flex rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
                Default
              </span>
            )}
          </div>
          
          <div className="space-y-1 text-sm text-gray-800">
            <p>{address.addressLine1}</p>
            {address.addressLine2 && <p>{address.addressLine2}</p>}
            <p>
              {address.city}
              {address.state && `, ${address.state}`} {address.postalCode}
            </p>
            <p>{address.country}</p>
            {address.phone && <p>Phone: {address.phone}</p>}
          </div>
          
          <div className="mt-3 flex items-center justify-end gap-2">
            <Link
              href={`/customers/${address.customerId}/addresses/${address.id}/edit`}
              className="rounded bg-blue-50 p-1 text-blue-600 hover:bg-blue-100"
              title="Edit Address"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
              </svg>
            </Link>
            {!address.isDefault && (
              <Link
                href={`/api/customers/${address.customerId}/addresses/${address.id}/default`}
                className="rounded bg-green-50 p-1 text-green-600 hover:bg-green-100"
                title="Set as Default"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              </Link>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
