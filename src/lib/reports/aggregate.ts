export interface ReportAppointment {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  is_paid?: boolean;
  service_id: string | null;
  staff_id: string | null;
  shop_id?: string;
  services?: { price: number; service_name: string } | null;
}

export interface ReportProductSale {
  total_amount: number;
  sale_date: string;
  inventory_id?: string;
  shop_id?: string;
  inventory?: { product_name: string } | null;
}

export interface ReportExpense {
  amount: number;
  category: string;
  shop_id?: string;
}

export interface ReportStaff {
  id: string;
  commission_rate: number;
  shop_id?: string;
}

/**
 * Realized-revenue rule, shared across single-shop and franchise reports:
 * an appointment counts toward revenue iff it isn't Cancelled or No-Show
 * and its end_time has already passed.
 */
export const isRevenueEligible = (a: ReportAppointment, now: Date) =>
  a.status !== "Cancelled" && a.status !== "No-Show" && new Date(a.end_time) <= now;

export const sumRevenue = (appts: ReportAppointment[], now: Date) =>
  appts
    .filter((a) => isRevenueEligible(a, now))
    .reduce((s, a) => s + Number(a.services?.price || 0), 0);

export const sumProductRevenue = (sales: ReportProductSale[]) =>
  sales.reduce((s, p) => s + Number(p.total_amount), 0);

export function computeCommissions(
  appts: ReportAppointment[],
  staffMap: Record<string, number>,
  now: Date,
) {
  return appts
    .filter((a) => isRevenueEligible(a, now) && a.staff_id && a.services?.price)
    .reduce((sum, a) => {
      const rate = staffMap[a.staff_id!] || 0;
      return sum + (Number(a.services!.price) * rate) / 100;
    }, 0);
}

export function staffCommissionMap(staff: ReportStaff[]): Record<string, number> {
  const m: Record<string, number> = {};
  for (const s of staff) m[s.id] = Number(s.commission_rate);
  return m;
}

export function expensesByCategoryMap(expenses: ReportExpense[]): Record<string, number> {
  const m: Record<string, number> = {};
  for (const e of expenses) m[e.category] = (m[e.category] || 0) + Number(e.amount);
  return m;
}

export const formatCurrency = (v: number) => `€${v.toFixed(0)}`;
