"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { notFound } from "next/navigation";
import JsBarcode from "jsbarcode";
import { use } from "react";

export default function ProductBarcodePage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  // Use React.use() to unwrap the params Promise
  const unwrappedParams = use(params);
  const productId = unwrappedParams.id;

  const [product, setProduct] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [barcodeType, setBarcodeType] = useState("CODE128");
  const [barcodeValue, setBarcodeValue] = useState("");
  const [barcodeWidth, setBarcodeWidth] = useState(2);
  const [barcodeHeight, setBarcodeHeight] = useState(100);
  const [displayValue, setDisplayValue] = useState(true);
  const [fontSize, setFontSize] = useState(20);
  const [quantity, setQuantity] = useState(1);

  const barcodeRef = useRef<SVGSVGElement>(null);

  // Fetch product
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await fetch(`/api/products/${productId}`);
        if (!response.ok) {
          if (response.status === 404) {
            notFound();
          }
          throw new Error('Failed to fetch product');
        }

        const data = await response.json();
        setProduct(data.product);

        // Set barcode value
        if (data.product.barcode) {
          setBarcodeValue(data.product.barcode);
        } else {
          setBarcodeValue(data.product.sku);
        }
      } catch (error) {
        console.error('Error fetching product:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProduct();
  }, [productId]);

  // Generate barcode
  useEffect(() => {
    if (barcodeRef.current && barcodeValue) {
      try {
        JsBarcode(barcodeRef.current, barcodeValue, {
          format: barcodeType,
          width: barcodeWidth,
          height: barcodeHeight,
          displayValue: displayValue,
          fontSize: fontSize,
          margin: 10,
        });
      } catch (error) {
        console.error('Error generating barcode:', error);
      }
    }
  }, [barcodeValue, barcodeType, barcodeWidth, barcodeHeight, displayValue, fontSize]);

  // Save barcode to product
  const saveBarcode = async () => {
    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          barcode: barcodeValue,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save barcode');
      }

      alert('Barcode saved successfully');
      router.push(`/products/${productId}`);
    } catch (error) {
      console.error('Error saving barcode:', error);
      alert('Failed to save barcode. Please try again.');
    }
  };

  // Print barcode
  const printBarcode = () => {
    if (!barcodeRef.current) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow pop-ups to print barcodes');
      return;
    }

    const barcodeHTML = barcodeRef.current.outerHTML;
    const productName = product.name;
    const productPrice = product.retailPrice.toFixed(2);

    // Create print content
    let printContent = '<html><head><title>Barcode</title>';
    printContent += '<style>';
    printContent += 'body { font-family: Arial, sans-serif; margin: 0; padding: 0; }';
    printContent += '.barcode-container { display: flex; flex-wrap: wrap; }';
    printContent += '.barcode-item { margin: 10px; text-align: center; }';
    printContent += '.product-name { font-size: 14px; font-weight: bold; margin: 5px 0; }';
    printContent += '.product-price { font-size: 16px; font-weight: bold; }';
    printContent += '@media print { @page { size: auto; margin: 0mm; } }';
    printContent += '</style></head><body>';
    printContent += '<div class="barcode-container">';

    // Repeat barcode based on quantity
    for (let i = 0; i < quantity; i++) {
      printContent += '<div class="barcode-item">';
      printContent += `<div class="product-name">${productName}</div>`;
      printContent += barcodeHTML;
      printContent += `<div class="product-price">$${productPrice}</div>`;
      printContent += '</div>';
    }

    printContent += '</div></body></html>';

    // Write to print window and print
    printWindow.document.open();
    printWindow.document.write(printContent);
    printWindow.document.close();

    // Wait for images to load before printing
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg bg-white p-6 shadow-md">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600 mx-auto"></div>
          <p className="text-gray-500">Loading data...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Generate Barcode</h1>
        <Link
          href={`/products/${productId}`}
          className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
        >
          Back to Product
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h2 className="mb-4 text-lg font-semibold text-gray-800">Product Information</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Product Name</p>
                <p className="font-medium">{product.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">SKU</p>
                <p className="font-medium">{product.sku}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Current Barcode</p>
                <p className="font-medium">{product.barcode || "Not set"}</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-white p-6 shadow-md">
            <h2 className="mb-4 text-lg font-semibold text-gray-800">Barcode Settings</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="barcodeValue" className="mb-1 block text-sm font-medium text-gray-700">
                  Barcode Value
                </label>
                <input
                  id="barcodeValue"
                  type="text"
                  value={barcodeValue}
                  onChange={(e) => setBarcodeValue(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label htmlFor="barcodeType" className="mb-1 block text-sm font-medium text-gray-700">
                  Barcode Type
                </label>
                <select
                  id="barcodeType"
                  value={barcodeType}
                  onChange={(e) => setBarcodeType(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="CODE128">CODE128</option>
                  <option value="EAN13">EAN-13</option>
                  <option value="UPC">UPC</option>
                  <option value="EAN8">EAN-8</option>
                  <option value="CODE39">CODE39</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="barcodeWidth" className="mb-1 block text-sm font-medium text-gray-700">
                    Width
                  </label>
                  <input
                    id="barcodeWidth"
                    type="number"
                    value={barcodeWidth}
                    onChange={(e) => setBarcodeWidth(Number(e.target.value))}
                    min="1"
                    max="5"
                    step="0.5"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="barcodeHeight" className="mb-1 block text-sm font-medium text-gray-700">
                    Height
                  </label>
                  <input
                    id="barcodeHeight"
                    type="number"
                    value={barcodeHeight}
                    onChange={(e) => setBarcodeHeight(Number(e.target.value))}
                    min="50"
                    max="200"
                    step="10"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="displayValue" className="mb-1 block text-sm font-medium text-gray-700">
                    Display Value
                  </label>
                  <select
                    id="displayValue"
                    value={displayValue ? "true" : "false"}
                    onChange={(e) => setDisplayValue(e.target.value === "true")}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="fontSize" className="mb-1 block text-sm font-medium text-gray-700">
                    Font Size
                  </label>
                  <input
                    id="fontSize"
                    type="number"
                    value={fontSize}
                    onChange={(e) => setFontSize(Number(e.target.value))}
                    min="10"
                    max="30"
                    step="1"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    disabled={!displayValue}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="quantity" className="mb-1 block text-sm font-medium text-gray-700">
                  Print Quantity
                </label>
                <input
                  id="quantity"
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  min="1"
                  max="100"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h2 className="mb-4 text-lg font-semibold text-gray-800">Barcode Preview</h2>
            <div className="flex flex-col items-center justify-center p-4 border border-dashed border-gray-300 rounded-lg">
              <p className="mb-2 font-medium">{product.name}</p>
              <svg ref={barcodeRef} className="w-full"></svg>
              <p className="mt-2 font-bold">${product.retailPrice.toFixed(2)}</p>
            </div>
          </div>

          <div className="rounded-lg bg-white p-6 shadow-md">
            <h2 className="mb-4 text-lg font-semibold text-gray-800">Actions</h2>
            <div className="space-y-3">
              <Button
                onClick={saveBarcode}
                className="w-full"
                disabled={!barcodeValue}
              >
                Save Barcode to Product
              </Button>
              <Button
                onClick={printBarcode}
                variant="outline"
                className="w-full"
                disabled={!barcodeValue}
              >
                Print Barcode
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
