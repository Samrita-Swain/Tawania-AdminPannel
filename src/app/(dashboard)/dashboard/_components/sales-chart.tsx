"use client";

import { useEffect, useRef } from "react";
import Chart from "chart.js/auto";

interface SalesData {
  date: string;
  count: number;
  total: number;
}

interface SalesChartProps {
  data: SalesData[];
}

export function SalesChart({ data }: SalesChartProps) {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);

  useEffect(() => {
    if (!chartRef.current || !data || data.length === 0) return;

    // Format dates for display
    const labels = data.map((item) => {
      const date = new Date(item.date);
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    });

    const totals = data.map((item) => Number(item.total) || 0);
    const counts = data.map((item) => Number(item.count) || 0);

    // Destroy previous chart if it exists
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    // Create new chart
    const ctx = chartRef.current.getContext('2d');
    if (ctx) {
      chartInstance.current = new Chart(ctx, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'Sales Amount (₹)',
              data: totals,
              backgroundColor: 'rgba(59, 130, 246, 0.5)',
              borderColor: 'rgba(59, 130, 246, 1)',
              borderWidth: 1,
              yAxisID: 'y',
            },
            {
              label: 'Number of Sales',
              data: counts,
              type: 'line',
              backgroundColor: 'rgba(16, 185, 129, 0.2)',
              borderColor: 'rgba(16, 185, 129, 1)',
              borderWidth: 2,
              pointBackgroundColor: 'rgba(16, 185, 129, 1)',
              pointRadius: 4,
              tension: 0.1,
              yAxisID: 'y1',
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              type: 'linear',
              display: true,
              position: 'left',
              title: {
                display: true,
                text: 'Sales Amount (₹)',
              },
              beginAtZero: true,
            },
            y1: {
              type: 'linear',
              display: true,
              position: 'right',
              title: {
                display: true,
                text: 'Number of Sales',
              },
              beginAtZero: true,
              grid: {
                drawOnChartArea: false,
              },
            },
          },
          plugins: {
            tooltip: {
              callbacks: {
                label: function(context) {
                  const label = context.dataset.label || '';
                  const value = context.raw;
                  if (label.includes('Amount')) {
                    return `${label}: ₹${value}`;
                  }
                  return `${label}: ${value}`;
                }
              }
            }
          }
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
        <p className="text-gray-800">No sales data available</p>
      </div>
    );
  }

  return (
    <div className="h-64">
      <canvas ref={chartRef}></canvas>
    </div>
  );
}
