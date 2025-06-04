"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

interface Category {
  id: string;
  name: string;
  code: string;
  description: string | null;
}

interface CategoryFormProps {
  initialData: Category | null;
  onSubmit: (data: Omit<Category, 'id'>) => void;
  onCancel: () => void;
}

export function CategoryForm({ initialData, onSubmit, onCancel }: CategoryFormProps) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Set initial form values if editing
  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setCode(initialData.code);
      setDescription(initialData.description || "");
    }
  }, [initialData]);

  // Generate code from name
  const generateCode = () => {
    if (!name) return;

    // Convert name to uppercase and remove special characters
    const generatedCode = name
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .substring(0, 6);

    setCode(generatedCode);
  };

  // Auto-generate code when name changes (only for new categories)
  useEffect(() => {
    if (!initialData && name && !code) {
      generateCode();
    }
  }, [name, initialData, code]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !code) {
      alert('Name and code are required');
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit({
        name,
        code,
        description: description || null,
      });

      // Reset form
      setName("");
      setCode("");
      setDescription("");
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="name" className="mb-1 block text-sm font-medium text-gray-800">
            Category Name *
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
          <label htmlFor="code" className="mb-1 block text-sm font-medium text-gray-800">
            Category Code *
          </label>
          <div className="flex gap-2">
            <input
              id="code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              required
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={generateCode}
            >
              Generate
            </Button>
          </div>
        </div>

        <div className="md:col-span-2">
          <label htmlFor="description" className="mb-1 block text-sm font-medium text-gray-800">
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          isLoading={isSubmitting}
          disabled={isSubmitting}
        >
          {initialData ? 'Update Category' : 'Create Category'}
        </Button>
      </div>
    </form>
  );
}
