"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface LoyaltyProgramTier {
  id: string;
  name: string;
  description: string | null;
  requiredPoints: number;
  pointsMultiplier: number;
  benefits: string | null;
}

interface LoyaltyProgram {
  id: string;
  name: string;
  description: string | null;
  pointsPerCurrency: number;
  minimumPurchase: number | null;
  isActive: boolean;
  tiers: LoyaltyProgramTier[];
}

interface LoyaltyTiersClientProps {
  initialLoyaltyProgram: LoyaltyProgram;
}

export function LoyaltyTiersClient({
  initialLoyaltyProgram,
}: LoyaltyTiersClientProps) {
  const router = useRouter();
  const [loyaltyProgram, setLoyaltyProgram] = useState<LoyaltyProgram>(initialLoyaltyProgram);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [editedTier, setEditedTier] = useState<LoyaltyProgramTier | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newTier, setNewTier] = useState<Omit<LoyaltyProgramTier, 'id'>>({
    name: '',
    description: '',
    requiredPoints: 0,
    pointsMultiplier: 1,
    benefits: JSON.stringify([]),
  });

  // Function to handle editing a tier
  const handleEditTier = (tier: LoyaltyProgramTier) => {
    setIsEditing(tier.id);
    setEditedTier({...tier});
  };

  // Function to handle saving edited tier
  const handleSaveTier = async () => {
    if (!editedTier) return;
    
    setIsSaving(true);
    try {
      // API call to update tier would go here
      const response = await fetch(`/api/loyalty/tiers/${editedTier.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editedTier),
      });

      if (response.ok) {
        // Update local state
        const updatedTiers = loyaltyProgram.tiers.map(tier => 
          tier.id === editedTier.id ? editedTier : tier
        );
        setLoyaltyProgram({
          ...loyaltyProgram,
          tiers: updatedTiers,
        });
        setIsEditing(null);
        setEditedTier(null);
      } else {
        console.error('Failed to update tier');
      }
    } catch (error) {
      console.error('Error updating tier:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Function to handle adding a new tier
  const handleAddTier = async () => {
    setIsSaving(true);
    try {
      // API call to add new tier would go here
      const response = await fetch(`/api/loyalty/tiers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newTier,
          programId: loyaltyProgram.id,
        }),
      });

      if (response.ok) {
        const createdTier = await response.json();
        // Update local state
        setLoyaltyProgram({
          ...loyaltyProgram,
          tiers: [...loyaltyProgram.tiers, createdTier],
        });
        setIsAddingNew(false);
        setNewTier({
          name: '',
          description: '',
          requiredPoints: 0,
          pointsMultiplier: 1,
          benefits: JSON.stringify([]),
        });
      } else {
        console.error('Failed to add tier');
      }
    } catch (error) {
      console.error('Error adding tier:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Function to handle deleting a tier
  const handleDeleteTier = async (tierId: string) => {
    if (!confirm('Are you sure you want to delete this tier?')) return;
    
    try {
      // API call to delete tier would go here
      const response = await fetch(`/api/loyalty/tiers/${tierId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Update local state
        const updatedTiers = loyaltyProgram.tiers.filter(tier => tier.id !== tierId);
        setLoyaltyProgram({
          ...loyaltyProgram,
          tiers: updatedTiers,
        });
      } else {
        console.error('Failed to delete tier');
      }
    } catch (error) {
      console.error('Error deleting tier:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Loyalty Tiers</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/loyalty"
            className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
          >
            Back to Loyalty Program
          </Link>
          <button
            onClick={() => setIsAddingNew(true)}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            Add New Tier
          </button>
        </div>
      </div>

      {/* Tiers List */}
      <div className="rounded-lg bg-white p-6 shadow-md">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Program Tiers</h2>
        
        {loyaltyProgram.tiers.length === 0 ? (
          <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-gray-300">
            <p className="text-gray-800">No tiers found. Add your first tier to get started.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {loyaltyProgram.tiers.map((tier) => (
              <div key={tier.id} className="rounded-lg border border-gray-200 p-4">
                {isEditing === tier.id ? (
                  // Edit mode
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tier Name</label>
                      <input
                        type="text"
                        value={editedTier?.name || ''}
                        onChange={(e) => setEditedTier({...editedTier!, name: e.target.value})}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                      <textarea
                        value={editedTier?.description || ''}
                        onChange={(e) => setEditedTier({...editedTier!, description: e.target.value})}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                        rows={2}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Required Points</label>
                        <input
                          type="number"
                          value={editedTier?.requiredPoints || 0}
                          onChange={(e) => setEditedTier({...editedTier!, requiredPoints: parseInt(e.target.value)})}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Points Multiplier</label>
                        <input
                          type="number"
                          step="0.01"
                          value={editedTier?.pointsMultiplier || 1}
                          onChange={(e) => setEditedTier({...editedTier!, pointsMultiplier: parseFloat(e.target.value)})}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Benefits (comma-separated)</label>
                      <input
                        type="text"
                        value={
                          editedTier?.benefits 
                            ? JSON.parse(editedTier.benefits).join(', ') 
                            : ''
                        }
                        onChange={(e) => {
                          const benefitsArray = e.target.value.split(',').map(b => b.trim()).filter(Boolean);
                          setEditedTier({...editedTier!, benefits: JSON.stringify(benefitsArray)});
                        }}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => {
                          setIsEditing(null);
                          setEditedTier(null);
                        }}
                        className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveTier}
                        disabled={isSaving}
                        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
                      >
                        {isSaving ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                ) : (
                  // View mode
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-gray-800">{tier.name}</h3>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEditTier(tier)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteTier(tier.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <p className="mt-1 text-sm text-gray-800">{tier.description}</p>
                    <div className="mt-2 text-sm">
                      <span className="font-medium">Required Points:</span> {tier.requiredPoints}
                    </div>
                    <div className="mt-1 text-sm">
                      <span className="font-medium">Points Multiplier:</span> {tier.pointsMultiplier}x
                    </div>
                    {tier.benefits && tier.benefits !== "null" && (
                      <div className="mt-2">
                        <span className="text-sm font-medium">Benefits:</span>
                        <ul className="mt-1 list-inside list-disc text-sm text-gray-800">
                          {(() => {
                            try {
                              const benefits = JSON.parse(tier.benefits);
                              return Array.isArray(benefits) ? benefits.map((benefit: string, index: number) => (
                                <li key={index}>{benefit}</li>
                              )) : null;
                            } catch (error) {
                              console.error("Error parsing benefits:", error);
                              return null;
                            }
                          })()}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add New Tier Form */}
      {isAddingNew && (
        <div className="rounded-lg bg-white p-6 shadow-md">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Add New Tier</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tier Name</label>
              <input
                type="text"
                value={newTier.name}
                onChange={(e) => setNewTier({...newTier, name: e.target.value})}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="e.g., Silver, Gold, Platinum"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={newTier.description || ''}
                onChange={(e) => setNewTier({...newTier, description: e.target.value})}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                rows={2}
                placeholder="Brief description of this tier and its benefits"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Required Points</label>
                <input
                  type="number"
                  value={newTier.requiredPoints}
                  onChange={(e) => setNewTier({...newTier, requiredPoints: parseInt(e.target.value)})}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  placeholder="Points needed to reach this tier"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Points Multiplier</label>
                <input
                  type="number"
                  step="0.01"
                  value={newTier.pointsMultiplier}
                  onChange={(e) => setNewTier({...newTier, pointsMultiplier: parseFloat(e.target.value)})}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  placeholder="e.g., 1.25 for 25% bonus points"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Benefits (comma-separated)</label>
              <input
                type="text"
                value={
                  newTier.benefits 
                    ? JSON.parse(newTier.benefits).join(', ') 
                    : ''
                }
                onChange={(e) => {
                  const benefitsArray = e.target.value.split(',').map(b => b.trim()).filter(Boolean);
                  setNewTier({...newTier, benefits: JSON.stringify(benefitsArray)});
                }}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="e.g., Free shipping, Birthday gift, Exclusive offers"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setIsAddingNew(false)}
                className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddTier}
                disabled={isSaving || !newTier.name}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isSaving ? 'Adding...' : 'Add Tier'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
