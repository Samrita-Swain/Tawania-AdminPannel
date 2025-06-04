"use client";

interface Category {
  id: string;
  name: string;
}

interface POSCategoriesProps {
  categories: (Category | null)[];
  selectedCategory: string | null;
  onCategoryChange: (categoryId: string | null) => void;
}

export function POSCategories({
  categories,
  selectedCategory,
  onCategoryChange,
}: POSCategoriesProps) {
  return (
    <div className="border-b border-gray-200 bg-gray-50 p-2">
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => onCategoryChange(null)}
          className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium ${
            selectedCategory === null
              ? "bg-blue-100 text-blue-700"
              : "bg-white text-gray-800 hover:bg-gray-100"
          }`}
        >
          All Categories
        </button>
        
        {categories.map((category) => (
          <button
            key={category?.id}
            onClick={() => onCategoryChange(category?.id || null)}
            className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium ${
              selectedCategory === category?.id
                ? "bg-blue-100 text-blue-700"
                : "bg-white text-gray-800 hover:bg-gray-100"
            }`}
          >
            {category?.name}
          </button>
        ))}
      </div>
    </div>
  );
}
