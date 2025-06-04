"use client";

import { useEffect, useRef } from "react";
import Chart from "chart.js/auto";

interface InventoryStatusData {
  status: string;
  count: number;
  total_quantity: number;
}

interface InventoryStatusChartProps {
  data: InventoryStatusData[];
}

export function InventoryStatusChart({ data }: InventoryStatusChartProps) {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);

  useEffect(() => {
    if (!chartRef.current || !data || data.length === 0) return;

    // Format status labels
    const formatStatus = (status: string) => {
      return status.replace('_', ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
    };

    const labels = data.map((item) => formatStatus(item.status));
    const quantities = data.map((item) => Number(item.total_quantity) || 0);

    // Define colors for different statuses
    const getStatusColor = (status: string) => {
      switch (status) {
        case 'AVAILABLE':
          return 'rgba(16, 185, 129, 0.7)'; // Green
        case 'RESERVED':
          return 'rgba(245, 158, 11, 0.7)'; // Amber
        case 'IN_TRANSIT':
          return 'rgba(59, 130, 246, 0.7)'; // Blue
        case 'DAMAGED':
          return 'rgba(239, 68, 68, 0.7)'; // Red
        case 'EXPIRED':
          return 'rgba(107, 114, 128, 0.7)'; // Gray
        case 'QUARANTINED':
          return 'rgba(168, 85, 247, 0.7)'; // Purple
        default:
          return 'rgba(209, 213, 219, 0.7)'; // Light Gray
      }
    };

    const backgroundColors = data.map((item) => getStatusColor(item.status));

    // Destroy previous chart if it exists
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    // Create new chart
    const ctx = chartRef.current.getContext('2d');
    if (ctx) {
      chartInstance.current = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels,
          datasets: [
            {
              data: quantities,
              backgroundColor: backgroundColors,
              borderColor: 'white',
              borderWidth: 1,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'right',
              labels: {
                boxWidth: 15,
                padding: 15,
              },
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  const label = context.label || '';
                  const value = context.raw as number;
                  const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0) as number;
                  const percentage = Math.round((value / total) * 100);
                  return `${label}: ${value} units (${percentage}%)`;
                }
              }
            }
          },
        },
      });
    }

    // Cleanup function
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-gray-800">No inventory data available</p>
      </div>
    );
  }

  return (
    <div className="h-64">
      <canvas ref={chartRef}></canvas>
    </div>
  );
}
