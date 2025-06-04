"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NewStorePage() {
  const router = useRouter();

  // Form state
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [openingHours, setOpeningHours] = useState("");
  const [isActive, setIsActive] = useState(true);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [codeError, setCodeError] = useState("");
  const [storeCreated, setStoreCreated] = useState(false);

  // Reset form
  const resetForm = () => {
    setName("");
    setCode("");
    setAddress("");
    setPhone("");
    setEmail("");
    setOpeningHours("");
    setIsActive(true);
    setCodeError("");
  };

  // Generate store code automatically
  const generateStoreCode = async (storeName: string) => {
    if (!storeName) return "";

    // Create base code from store name
    let baseCode = storeName
      .toUpperCase()
      .replace(/[^A-Z0-9\s]/g, '') // Remove special characters
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .substring(0, 10); // Limit to 10 characters

    // If the base code is too short, pad it
    if (baseCode.length < 3) {
      baseCode = baseCode + "STORE";
    }

    // Check if this code exists, if so, add numbers
    let finalCode = baseCode;
    let counter = 1;

    while (true) {
      try {
        const response = await fetch(`/api/stores/check-code?code=${encodeURIComponent(finalCode)}`);
        const data = await response.json();

        if (!data.exists) {
          // Code is available
          return finalCode;
        } else {
          // Code exists, try with number suffix
          finalCode = `${baseCode}_${counter}`;
          counter++;

          // Prevent infinite loop
          if (counter > 999) {
            finalCode = `${baseCode}_${Date.now()}`;
            break;
          }
        }
      } catch (error) {
        console.error("Error checking store code:", error);
        // If there's an error, use timestamp suffix
        finalCode = `${baseCode}_${Date.now()}`;
        break;
      }
    }

    return finalCode;
  };

  // Auto-generate code when name changes
  const handleNameChange = async (newName: string) => {
    setName(newName);

    // Auto-generate code if code field is empty or was auto-generated
    if (!code || code.includes('_') || code === code.toUpperCase()) {
      if (newName.length >= 2) {
        const generatedCode = await generateStoreCode(newName);
        setCode(generatedCode);
        // Check the generated code
        if (generatedCode) {
          setTimeout(() => checkStoreCode(generatedCode), 100);
        }
      }
    }
  };

  // Manual code generation
  const handleGenerateCode = async () => {
    if (!name) {
      setErrorMessage("Please enter a store name first");
      return;
    }

    const generatedCode = await generateStoreCode(name);
    setCode(generatedCode);

    // Check the generated code
    if (generatedCode) {
      setTimeout(() => checkStoreCode(generatedCode), 100);
    }
  };

  // Check if store code already exists
  const checkStoreCode = async (code: string) => {
    if (!code) return;

    try {
      const response = await fetch(`/api/stores/check-code?code=${encodeURIComponent(code)}`);
      const data = await response.json();

      if (data.exists) {
        setCodeError("This store code already exists");
      } else {
        setCodeError("");
      }
    } catch (error) {
      console.error("Error checking store code:", error);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clear any previous messages
    setErrorMessage("");
    setSuccessMessage("");

    // Validate form
    if (!name || !code) {
      setErrorMessage("Name and code are required");
      return;
    }

    // Check if there's a code error
    if (codeError) {
      setErrorMessage("Please fix the store code issue before submitting");
      return;
    }

    setIsSubmitting(true);

    try {
      // Process opening hours - if it looks like JSON, ensure it's valid
      let processedOpeningHours = openingHours;
      if (openingHours && (openingHours.includes('{') || openingHours.includes('['))) {
        try {
          // Try to parse it as JSON to validate
          JSON.parse(openingHours);
          // If it parses successfully, use it as is
        } catch (error) {
          // If it's not valid JSON but looks like it should be, treat as plain text
          console.warn("Opening hours looks like JSON but is invalid, treating as plain text");
        }
      }

      // Prepare store data
      const storeData = {
        name,
        code,
        address,
        phone,
        email,
        openingHours: processedOpeningHours,
        isActive,
      };

      // Send API request
      console.log("Sending store data to API:", storeData);

      try {
        console.log("Sending API request to create store");
        const response = await fetch('/api/stores', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(storeData),
        });

        // Parse response
        const responseData = await response.json();
        console.log("API response:", responseData);

        // Handle error response
        if (!response.ok) {
          console.error("API error:", responseData.error, responseData.details);
          setErrorMessage(responseData.error || 'Failed to create store');
          if (responseData.details) {
            setErrorMessage(`${responseData.error}: ${responseData.details}`);
          }
          setIsSubmitting(false);
          return;
        }

        // Verify that we have a store ID
        if (!responseData.store || !responseData.store.id) {
          console.error("API returned success but no store ID:", responseData);
          setErrorMessage('Store was created but no ID was returned');
          setIsSubmitting(false);
          return;
        }

        // Handle success
        const storeId = responseData.store.id;
        console.log("Store created with ID:", storeId);
        setSuccessMessage(`Store "${name}" created successfully with ID: ${storeId}`);
        setStoreCreated(true);

        // Verify the store exists by making a GET request
        console.log("Verifying store exists in database");
        try {
          const verifyResponse = await fetch(`/api/stores/${storeId}`, {
            headers: {
              'x-verification': 'true'
            }
          });
          const verifyData = await verifyResponse.json();
          console.log("Verification response:", verifyData);

          if (verifyResponse.ok && verifyData.store) {
            console.log("Store verified successfully:", verifyData.store);
            console.log("Verification data:", verifyData);

            // Update success message with more details
            setSuccessMessage(`Store "${name}" created successfully with ID: ${storeId} and has been verified.`);

            // Reset form after successful verification
            resetForm();

            // Redirect after delay
            setTimeout(() => {
              console.log("Redirecting to store details:", storeId);
              window.location.href = `/stores/${storeId}`;
            }, 2000);
          } else {
            console.warn("Store created but could not be verified");
            console.warn("Verification response:", verifyResponse.status, verifyData);

            // The store was created but verification failed
            // This is likely due to the store being saved to the database but not yet available for querying
            // We'll still consider this a success and redirect to the store details

            setSuccessMessage(`Store "${name}" created successfully with ID: ${storeId}`);
            setErrorMessage("Store was created but could not be immediately verified. You will be redirected to the stores list.");

            // Redirect to stores list after delay
            setTimeout(() => {
              console.log("Redirecting to stores list");
              window.location.href = '/stores';
            }, 3000);
          }
        } catch (verifyError) {
          console.error("Error verifying store:", verifyError);

          // Even though verification failed, the store was still created
          // This is likely a network error or other transient issue
          setSuccessMessage(`Store "${name}" created successfully with ID: ${storeId}`);
          setErrorMessage("Store was created but verification encountered an error. You will be redirected to the stores list.");

          // Still redirect to stores list
          setTimeout(() => {
            console.log("Redirecting to stores list after verification error");
            window.location.href = '/stores';
          }, 3000);
        }
      } catch (fetchError) {
        console.error("Fetch error:", fetchError);
        setErrorMessage(`Network error: ${fetchError.message}`);
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error('Error creating store:', error);
      setErrorMessage('Failed to create store. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Prevent form submission if store was already created
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (storeCreated) {
        // Allow navigation without warning
        return;
      }

      // Standard way of showing a confirmation dialog
      e.preventDefault();
      e.returnValue = '';
      return '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [storeCreated]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Add New Store</h1>
        <Link
          href="/stores"
          className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-200 transition-colors"
        >
          Back to Stores
        </Link>
      </div>

      <div className="rounded-lg bg-white p-6 shadow-md">
        <form onSubmit={handleSubmit} className="space-y-6">
          {errorMessage && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">{errorMessage}</h3>
                </div>
              </div>
            </div>
          )}

          {successMessage && (
            <div className="rounded-md bg-green-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800">{successMessage}</h3>
                  <p className="mt-2 text-sm text-green-700">Redirecting to store details...</p>
                </div>
              </div>
            </div>
          )}
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label htmlFor="name" className="mb-1 block text-sm font-medium text-gray-800">
                Store Name *
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
                disabled={storeCreated || isSubmitting}
                placeholder="Enter store name (code will be auto-generated)"
              />
            </div>

            <div>
              <label htmlFor="code" className="mb-1 block text-sm font-medium text-gray-800">
                Store Code *
              </label>
              <div className="flex gap-2">
                <input
                  id="code"
                  type="text"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value);
                    // Check code after a short delay to avoid too many requests
                    if (e.target.value) {
                      setTimeout(() => checkStoreCode(e.target.value), 500);
                    } else {
                      setCodeError("");
                    }
                  }}
                  className={`flex-1 rounded-md border ${codeError ? 'border-red-500' : 'border-gray-300'} px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500`}
                  required
                  disabled={storeCreated || isSubmitting}
                  placeholder="Auto-generated from store name"
                />
                <button
                  type="button"
                  onClick={handleGenerateCode}
                  disabled={!name || storeCreated || isSubmitting}
                  className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  title="Generate code from store name"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
              {codeError ? (
                <p className="mt-1 text-xs text-red-600">
                  {codeError}
                </p>
              ) : (
                <p className="mt-1 text-xs text-gray-600">
                  Auto-generated from store name. Click refresh to regenerate or edit manually.
                </p>
              )}
            </div>

            <div>
              <label htmlFor="address" className="mb-1 block text-sm font-medium text-gray-800">
                Address
              </label>
              <textarea
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                rows={3}
                disabled={storeCreated || isSubmitting}
              />
            </div>

            <div className="space-y-6">
              <div>
                <label htmlFor="phone" className="mb-1 block text-sm font-medium text-gray-800">
                  Phone
                </label>
                <input
                  id="phone"
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  disabled={storeCreated || isSubmitting}
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
                  disabled={storeCreated || isSubmitting}
                />
              </div>
            </div>

            <div>
              <label htmlFor="openingHours" className="mb-1 block text-sm font-medium text-gray-800">
                Opening Hours
              </label>
              <textarea
                id="openingHours"
                value={openingHours}
                onChange={(e) => setOpeningHours(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                rows={3}
                placeholder="e.g., Mon-Fri: 9am-6pm, Sat-Sun: 10am-4pm"
                disabled={storeCreated || isSubmitting}
              />
              <p className="mt-1 text-xs text-gray-500">
                Enter as plain text or use JSON format for structured data
              </p>
            </div>

            <div>
              <div className="flex items-center">
                <input
                  id="isActive"
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  disabled={storeCreated || isSubmitting}
                />
                <label htmlFor="isActive" className="ml-2 block text-sm font-medium text-gray-800">
                  Active
                </label>
              </div>
              <p className="mt-1 text-xs text-gray-800">
                Inactive stores won't appear in most operations
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Link
              href="/stores"
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </Link>
            <Button
              type="submit"
              disabled={isSubmitting || !!codeError || storeCreated}
            >
              {isSubmitting ? "Creating..." : "Create Store"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
