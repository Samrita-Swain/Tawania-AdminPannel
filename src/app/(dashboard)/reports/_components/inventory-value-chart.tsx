"use client";

import { useEffect, useRef } from "react";
import Chart from "chart.js/auto";

interface InventoryValueChartProps {
  data: {
    name: string;
    value: number;
    type: string;
  }[];
}

export function InventoryValueChart({ data }: InventoryValueChartProps) {
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
    
    // Generate colors based on type
    const backgroundColors = data.map(item => 
      item.type === 'Warehouse' ? 'rgba(153, 102, 255, 0.7)' : 'rgba(75, 192, 192, 0.7)'
    );
    
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
            backgroundColor: backgroundColors,
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
                  const item = data[i];
                  label.text = `${item.name} (${item.type}): $${item.value.toFixed(2)}`;
                });
                
                return labels;
              },
            },
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const item = data[context.dataIndex];
                return `${item.name} (${item.type}): $${context.parsed.toFixed(2)}`;
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
