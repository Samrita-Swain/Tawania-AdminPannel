"use client";

import { useEffect, useRef } from "react";
import Chart from "chart.js/auto";

interface InventoryByLocationChartProps {
  data: {
    id: string;
    name: string;
    type: string;
    value: number;
    quantity: number;
  }[];
}

export function InventoryByLocationChart({ data }: InventoryByLocationChartProps) {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);
  
  useEffect(() => {
    if (!chartRef.current) return;
    
    // Destroy previous chart if it exists
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }
    
    // Prepare data for chart
    const labels = data.map(item => `${item.name} (${item.type})`);
    const values = data.map(item => item.value);
    
    // Generate colors based on type
    const backgroundColors = data.map(item => 
      item.type === 'Warehouse' ? 'rgba(153, 102, 255, 0.7)' : 'rgba(75, 192, 192, 0.7)'
    );
    
    // Create new chart
    const ctx = chartRef.current.getContext("2d");
    if (!ctx) return;
    
    chartInstance.current = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Inventory Value",
            data: values,
            backgroundColor: backgroundColors,
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return `Value: $${context.parsed.x.toFixed(2)}`;
              },
              afterLabel: function(context) {
                const item = data[context.dataIndex];
                return `Quantity: ${item.quantity}`;
              },
            },
          },
        },
        scales: {
          x: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return `$${value}`;
              },
            },
          },
          y: {
            ticks: {
              font: {
                size: 11,
              },
            },
          },
        },
      },
    });
    
    // Cleanup on unmount
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [data]);
  
  return (
    <div className="h-80">
      <canvas ref={chartRef}></canvas>
    </div>
  );
}
