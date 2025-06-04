"use client";

import { useEffect, useRef } from "react";
import Chart from "chart.js/auto";

interface InventoryByCategoryChartProps {
  data: {
    id: string;
    name: string;
    value: number;
    quantity: number;
  }[];
}

export function InventoryByCategoryChart({ data }: InventoryByCategoryChartProps) {
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
    
    // Generate colors
    const backgroundColors = [
      'rgba(54, 162, 235, 0.7)',
      'rgba(75, 192, 192, 0.7)',
      'rgba(153, 102, 255, 0.7)',
      'rgba(255, 159, 64, 0.7)',
      'rgba(255, 99, 132, 0.7)',
      'rgba(255, 205, 86, 0.7)',
      'rgba(201, 203, 207, 0.7)',
      'rgba(54, 162, 235, 0.5)',
      'rgba(75, 192, 192, 0.5)',
      'rgba(153, 102, 255, 0.5)',
    ];
    
    // Create new chart
    const ctx = chartRef.current.getContext("2d");
    if (!ctx) return;
    
    chartInstance.current = new Chart(ctx, {
      type: "pie",
      data: {
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: backgroundColors.slice(0, data.length),
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
              font: {
                size: 11,
              },
              generateLabels: function(chart) {
                const original = Chart.overrides.pie.plugins.legend.labels.generateLabels;
                const labels = original.call(this, chart);
                
                labels.forEach((label, i) => {
                  if (i < data.length) {
                    const item = data[i];
                    const percentage = ((item.value / data.reduce((sum, d) => sum + d.value, 0)) * 100).toFixed(1);
                    label.text = `${item.name}: $${item.value.toFixed(2)} (${percentage}%)`;
                  }
                });
                
                return labels;
              },
            },
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const item = data[context.dataIndex];
                const percentage = ((item.value / data.reduce((sum, d) => sum + d.value, 0)) * 100).toFixed(1);
                return `${item.name}: $${item.value.toFixed(2)} (${percentage}%)`;
              },
              afterLabel: function(context) {
                const item = data[context.dataIndex];
                return `Quantity: ${item.quantity}`;
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
