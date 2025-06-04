"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ProductStatusDropdown } from "./product-status-dropdown";

interface Product {
  id: string;
  name: string;
  sku: string;
  description: string | null;
  categoryId: string | null;
  costPrice: number;
  wholesalePrice: number;
  retailPrice: number;
  minStockLevel: number;
  reorderPoint: number;
  barcode: string | null;
  isActive: boolean;
  condition: string;
  createdAt: Date;
  updatedAt: Date;
  category: {
    id: string;
    name: string;
  } | null;
}

interface ProductsTableProps {
  products: Product[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  params: any;
}

export function ProductsTable({
  products,
  totalItems,
  totalPages,
  currentPage,
  pageSize,
  params,
}: ProductsTableProps) {
  const router = useRouter();

  const handleDeleteProduct = async (productId: string, productName: string) => {
    if (!confirm(`Are you sure you want to delete "${productName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete product');
      }

      const result = await response.json();

      if (result.message.includes('marked as inactive')) {
        alert(`Product "${productName}" has been marked as inactive because it is used in inventory.`);
      } else {
        alert(`Product "${productName}" has been deleted successfully.`);
      }

      // Refresh the page to show updated data
      router.refresh();
    } catch (error) {
      console.error('Error deleting product:', error);
      alert(`Failed to delete product: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="rounded-lg bg-white shadow-md">
      {/* Mobile Card View */}
      <div className="block sm:hidden">
        <div className="divide-y divide-gray-200">
          {products.length > 0 ? (
            products.map((product) => (
              <div key={product.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <Link href={`/products/${product.id}`} className="text-sm font-medium text-blue-600">
                      {product.name}
                    </Link>
                    <p className="text-xs text-gray-500 mt-1">SKU: {product.sku}</p>
                    <p className="text-xs text-gray-500">Category: {product.category?.name || "Uncategorized"}</p>
                  </div>
                  <ProductStatusDropdown
                    productId={product.id}
                    currentIsActive={product.isActive}
                    currentCondition={product.condition}
                    productName={product.name}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-500">Cost:</span> ${product.costPrice.toFixed(2)}
                  </div>
                  <div>
                    <span className="text-gray-500">Wholesale:</span> ${product.wholesalePrice.toFixed(2)}
                  </div>
                  <div>
                    <span className="text-gray-500">Retail:</span> ${product.retailPrice.toFixed(2)}
                  </div>
                  <div>
                    <span className="text-gray-500">Min Stock:</span> {product.minStockLevel}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-gray-500">Reorder: {product.reorderPoint}</span>
                  <div className="flex items-center gap-1">
                    <Link
                      href={`/products/${product.id}`}
                      className="rounded bg-blue-50 p-1 text-blue-600 hover:bg-blue-100"
                      title="View Details"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                      </svg>
                    </Link>
                    <Link
                      href={`/products/${product.id}/edit`}
                      className="rounded bg-green-50 p-1 text-green-600 hover:bg-green-100"
                      title="Edit Product"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                      </svg>
                    </Link>
                    <Link
                      href={`/products/${product.id}/barcode`}
                      className="rounded bg-purple-50 p-1 text-purple-600 hover:bg-purple-100"
                      title="Generate Barcode"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75ZM6.75 16.5h.75v.75h-.75v-.75ZM16.5 6.75h.75v.75h-.75v-.75ZM13.5 13.5h.75v.75h-.75v-.75ZM13.5 19.5h.75v.75h-.75v-.75ZM19.5 13.5h.75v.75h-.75v-.75ZM19.5 19.5h.75v.75h-.75v-.75ZM16.5 16.5h.75v.75h-.75v-.75Z" />
                      </svg>
                    </Link>
                    <button
                      onClick={() => handleDeleteProduct(product.id, product.name)}
                      className="rounded bg-red-50 p-1 text-red-600 hover:bg-red-100"
                      title="Delete Product"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-sm text-gray-500">
              No products found
            </div>
          )}
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden sm:block overflow-x-auto table-container">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-800">
              <th className="px-4 lg:px-6 py-3">Product</th>
              <th className="px-4 lg:px-6 py-3">SKU</th>
              <th className="px-4 lg:px-6 py-3">Category</th>
              <th className="px-4 lg:px-6 py-3">Cost Price</th>
              <th className="px-4 lg:px-6 py-3">Wholesale Price</th>
              <th className="px-4 lg:px-6 py-3">Retail Price</th>
              <th className="px-4 lg:px-6 py-3">Min Stock</th>
              <th className="px-4 lg:px-6 py-3">Reorder Point</th>
              <th className="px-4 lg:px-6 py-3">Status</th>
              <th className="px-4 lg:px-6 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {products.length > 0 ? (
              products.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-4 lg:px-6 py-4 text-sm font-medium text-blue-600">
                    <Link href={`/products/${product.id}`}>
                      {product.name}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-4 lg:px-6 py-4 text-sm text-gray-800">
                    {product.sku}
                  </td>
                  <td className="whitespace-nowrap px-4 lg:px-6 py-4 text-sm text-gray-800">
                    {product.category?.name || "Uncategorized"}
                  </td>
                  <td className="whitespace-nowrap px-4 lg:px-6 py-4 text-sm text-gray-800">
                    ${product.costPrice.toFixed(2)}
                  </td>
                  <td className="whitespace-nowrap px-4 lg:px-6 py-4 text-sm text-gray-800">
                    ${product.wholesalePrice.toFixed(2)}
                  </td>
                  <td className="whitespace-nowrap px-4 lg:px-6 py-4 text-sm text-gray-800">
                    ${product.retailPrice.toFixed(2)}
                  </td>
                  <td className="whitespace-nowrap px-4 lg:px-6 py-4 text-sm text-gray-800">
                    {product.minStockLevel}
                  </td>
                  <td className="whitespace-nowrap px-4 lg:px-6 py-4 text-sm text-gray-800">
                    {product.reorderPoint}
                  </td>
                  <td className="whitespace-nowrap px-4 lg:px-6 py-4 text-sm">
                    <ProductStatusDropdown
                      productId={product.id}
                      currentIsActive={product.isActive}
                      currentCondition={product.condition}
                      productName={product.name}
                    />
                  </td>
                  <td className="whitespace-nowrap px-4 lg:px-6 py-4 text-sm">
                    <div className="flex items-center gap-1 lg:gap-2">
                      <Link
                        href={`/products/${product.id}`}
                        className="rounded bg-blue-50 p-1 text-blue-600 hover:bg-blue-100"
                        title="View Details"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4 lg:h-5 lg:w-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                        </svg>
                      </Link>
                      <Link
                        href={`/products/${product.id}/edit`}
                        className="rounded bg-green-50 p-1 text-green-600 hover:bg-green-100"
                        title="Edit Product"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4 lg:h-5 lg:w-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                        </svg>
                      </Link>
                      <Link
                        href={`/products/${product.id}/barcode`}
                        className="rounded bg-purple-50 p-1 text-purple-600 hover:bg-purple-100"
                        title="Generate Barcode"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4 lg:h-5 lg:w-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75ZM6.75 16.5h.75v.75h-.75v-.75ZM16.5 6.75h.75v.75h-.75v-.75ZM13.5 13.5h.75v.75h-.75v-.75ZM13.5 19.5h.75v.75h-.75v-.75ZM19.5 13.5h.75v.75h-.75v-.75ZM19.5 19.5h.75v.75h-.75v-.75ZM16.5 16.5h.75v.75h-.75v-.75Z" />
                        </svg>
                      </Link>
                      <button
                        onClick={() => handleDeleteProduct(product.id, product.name)}
                        className="rounded bg-red-50 p-1 text-red-600 hover:bg-red-100"
                        title="Delete Product"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4 lg:h-5 lg:w-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={10} className="px-4 lg:px-6 py-4 text-center text-sm text-gray-800">
                  No products found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
          <div className="flex flex-1 justify-between sm:hidden">
            <Link
              href={{
                pathname: '/products',
                query: {
                  ...params,
                  page: currentPage > 1 ? currentPage - 1 : 1,
                },
              }}
              className={`relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 ${currentPage <= 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Previous
            </Link>
            <Link
              href={{
                pathname: '/products',
                query: {
                  ...params,
                  page: currentPage < totalPages ? currentPage + 1 : totalPages,
                },
              }}
              className={`relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 ${currentPage >= totalPages ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Next
            </Link>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-800">
                Showing <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span> to{' '}
                <span className="font-medium">
                  {Math.min(currentPage * pageSize, totalItems)}
                </span>{' '}
                of <span className="font-medium">{totalItems}</span> results
              </p>
            </div>
            <div>
              <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                <Link
                  href={{
                    pathname: '/products',
                    query: {
                      ...params,
                      page: currentPage > 1 ? currentPage - 1 : 1,
                    },
                  }}
                  className={`relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-800 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 ${currentPage <= 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span className="sr-only">Previous</span>
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                  </svg>
                </Link>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = i + 1;
                  return (
                    <Link
                      key={pageNum}
                      href={{
                        pathname: '/products',
                        query: {
                          ...params,
                          page: pageNum,
                        },
                      }}
                      className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                        pageNum === currentPage
                          ? 'z-10 bg-blue-600 text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600'
                          : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                      }`}
                    >
                      {pageNum}
                    </Link>
                  );
                })}
                <Link
                  href={{
                    pathname: '/products',
                    query: {
                      ...params,
                      page: currentPage < totalPages ? currentPage + 1 : totalPages,
                    },
                  }}
                  className={`relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-800 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 ${currentPage >= totalPages ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span className="sr-only">Next</span>
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                  </svg>
                </Link>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
