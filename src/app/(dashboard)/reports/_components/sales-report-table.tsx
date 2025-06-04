"use client";

interface SalesData {
  period: string;
  count: number;
  total: number;
  subtotal: number;
  tax: number;
  average: number;
}

interface SalesReportTableProps {
  data: SalesData[];
  groupBy: string;
}

export function SalesReportTable({ data, groupBy }: SalesReportTableProps) {
  // Format labels based on groupBy
  const formatLabel = (period: string) => {
    switch (groupBy) {
      case 'hour':
        // Format: 2023-01-01 12:00:00 -> Jan 1, 2023 12:00
        const [datePart, timePart] = period.split(' ');
        const hourDate = new Date(datePart);
        return `${hourDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} ${timePart.substring(0, 5)}`;
      case 'day':
        // Format: 2023-01-01 -> Jan 1, 2023
        const date = new Date(period);
        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
      case 'week':
        // Format: 2023-01 -> Week 1, 2023
        const [year, week] = period.split('-');
        return `Week ${week}, ${year}`;
      case 'month':
        // Format: 2023-01 -> January 2023
        const [yearMonth, monthNum] = period.split('-');
        const monthDate = new Date(parseInt(yearMonth), parseInt(monthNum) - 1, 1);
        return monthDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
      default:
        return period;
    }
  };

  // Calculate totals
  const totals = data.reduce(
    (acc, item) => {
      acc.count += Number(item.count);
      acc.total += Number(item.total);
      acc.subtotal += Number(item.subtotal);
      acc.tax += Number(item.tax);
      return acc;
    },
    { count: 0, total: 0, subtotal: 0, tax: 0 }
  );

  // Calculate average sale value
  const averageSale = totals.count > 0 ? totals.total / totals.count : 0;

  if (!data || data.length === 0) {
    return (
      <div className="py-8 text-center text-gray-800">
        No sales data available for the selected period
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-800">
            <th className="px-6 py-3">Period</th>
            <th className="px-6 py-3 text-right">Sales Count</th>
            <th className="px-6 py-3 text-right">Subtotal</th>
            <th className="px-6 py-3 text-right">Tax</th>
            <th className="px-6 py-3 text-right">Total</th>
            <th className="px-6 py-3 text-right">Average Sale</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {data.map((item, index) => (
            <tr key={index} className="hover:bg-gray-50">
              <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                {formatLabel(item.period)}
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-800">
                {item.count}
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-800">
                ${Number(item.subtotal).toFixed(2)}
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-800">
                ${Number(item.tax).toFixed(2)}
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium text-gray-900">
                ${Number(item.total).toFixed(2)}
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-800">
                ${Number(item.average).toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="bg-gray-50">
          <tr>
            <td className="whitespace-nowrap px-6 py-4 text-sm font-bold text-gray-900">
              Total
            </td>
            <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-bold text-gray-900">
              {totals.count}
            </td>
            <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-bold text-gray-900">
              ${totals.subtotal.toFixed(2)}
            </td>
            <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-bold text-gray-900">
              ${totals.tax.toFixed(2)}
            </td>
            <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-bold text-gray-900">
              ${totals.total.toFixed(2)}
            </td>
            <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-bold text-gray-900">
              ${averageSale.toFixed(2)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

