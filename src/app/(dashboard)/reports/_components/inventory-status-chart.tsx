"use client";

import { useEffect, useRef } from "react";
import Chart from "chart.js/auto";

interface InventoryStatusChartProps {
  data: {
    name: string;
    value: number;
    color: string;
  }[];
}

export function InventoryStatusChart({ data }: InventoryStatusChartProps) {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);
  
  useEffect(() => {
    if (!chartRef.current) return;
    
    // Destroy previous chart if it exists
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }
    
    // Prepare data for chart
    const labels = data.map(item => item.name);
    const values = data.map(item => item.value);
    const colors = data.map(item => item.color);
    
    // Create new chart
    const ctx = chartRef.current.getContext("2d");
    if (!ctx) return;
    
    chartInstance.current = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: colors,
            borderWidth: 1,
            borderColor: "#fff",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "right",
            labels: {
              padding: 20,
              boxWidth: 15,
              font: {
                size: 12,
              },
            },
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                const value = context.parsed;
                const percentage = Math.round((value / total) * 100);
                return `${context.label}: ${value} (${percentage}%)`;
              },
            },
          },
        },
        cutout: "70%",
      },
    });
    
    // Cleanup on unmount
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [data]);
  
  // Calculate total
  const total = data.reduce((sum, item) => sum + item.value, 0);
  
  return (
    <div className="relative h-64">
      <canvas ref={chartRef}></canvas>
      {total > 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <p className="text-3xl font-bold text-gray-800">{total}</p>
            <p className="text-sm text-gray-800">Total Items</p>
          </div>
        </div>
      )}
    </div>
  );
}
