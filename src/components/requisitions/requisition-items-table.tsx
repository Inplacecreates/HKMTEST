"use client";

import { formatKES } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

const ITEM_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-gray-100 text-gray-700",
  PRICED: "bg-blue-100 text-blue-700",
  APPROVED: "bg-green-100 text-green-700",
  ORDERED: "bg-teal-100 text-teal-700",
  DELIVERED: "bg-emerald-100 text-emerald-700",
  DISCREPANCY: "bg-red-100 text-red-700",
};

interface RequisitionItem {
  id: string;
  itemName: string;
  description?: string | null;
  unit: string;
  qtyRequested: string | number;
  qtyApproved?: string | number | null;
  qtyReceived?: string | number | null;
  unitPrice?: string | number | null;
  status: string;
  supplier?: { id: string; name: string } | null;
  catalogItem?: { id: string; name: string } | null;
}

interface RequisitionItemsTableProps {
  items: RequisitionItem[];
  showPricing?: boolean;
  className?: string;
}

export function RequisitionItemsTable({ items, showPricing = true, className }: RequisitionItemsTableProps) {
  const total = items.reduce((sum, item) => {
    const price = Number(item.unitPrice || 0);
    const qty = Number(item.qtyApproved || item.qtyRequested);
    return sum + price * qty;
  }, 0);

  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-gray-50 text-left">
            <th className="px-3 py-2 font-medium text-gray-600">Item</th>
            <th className="px-3 py-2 font-medium text-gray-600">Unit</th>
            <th className="px-3 py-2 font-medium text-gray-600 text-right">Qty Req.</th>
            {showPricing && (
              <>
                <th className="px-3 py-2 font-medium text-gray-600 text-right">Qty Appr.</th>
                <th className="px-3 py-2 font-medium text-gray-600 text-right">Unit Price</th>
                <th className="px-3 py-2 font-medium text-gray-600 text-right">Total</th>
                <th className="px-3 py-2 font-medium text-gray-600">Supplier</th>
              </>
            )}
            <th className="px-3 py-2 font-medium text-gray-600">Status</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const qty = Number(item.qtyApproved || item.qtyRequested);
            const price = Number(item.unitPrice || 0);
            const lineTotal = price * qty;

            return (
              <tr key={item.id} className="border-b hover:bg-gray-50">
                <td className="px-3 py-2">
                  <div>
                    <span className="font-medium text-gray-900">{item.itemName}</span>
                    {item.description && (
                      <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2 text-gray-600">{item.unit}</td>
                <td className="px-3 py-2 text-right text-gray-900">{Number(item.qtyRequested)}</td>
                {showPricing && (
                  <>
                    <td className="px-3 py-2 text-right text-gray-900">
                      {item.qtyApproved ? Number(item.qtyApproved) : "-"}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-900">
                      {item.unitPrice ? formatKES(price) : "-"}
                    </td>
                    <td className="px-3 py-2 text-right font-medium text-gray-900">
                      {item.unitPrice ? formatKES(lineTotal) : "-"}
                    </td>
                    <td className="px-3 py-2 text-gray-600">
                      {item.supplier?.name || "-"}
                    </td>
                  </>
                )}
                <td className="px-3 py-2">
                  <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", ITEM_STATUS_COLORS[item.status])}>
                    {item.status}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
        {showPricing && total > 0 && (
          <tfoot>
            <tr className="border-t-2 bg-gray-50">
              <td colSpan={5} className="px-3 py-2 text-right font-semibold text-gray-700">
                Total
              </td>
              <td className="px-3 py-2 text-right font-bold text-gray-900">
                {formatKES(total)}
              </td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
