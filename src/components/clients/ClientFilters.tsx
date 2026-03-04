import { Search, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Service {
  id: string;
  service_name: string;
}

interface FilterValues {
  search: string;
  lastVisit: string;
  ltvMin: string;
  ltvMax: string;
  serviceId: string;
}

interface ClientFiltersProps {
  filters: FilterValues;
  onFilterChange: (filters: FilterValues) => void;
  services: Service[];
  onExport: () => void;
  filteredCount: number;
  totalCount: number;
}

export default function ClientFilters({
  filters,
  onFilterChange,
  services,
  onExport,
  filteredCount,
  totalCount,
}: ClientFiltersProps) {
  const update = (partial: Partial<FilterValues>) =>
    onFilterChange({ ...filters, ...partial });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
            strokeWidth={1.5}
          />
          <Input
            placeholder="Search clients..."
            value={filters.search}
            onChange={(e) => update({ search: e.target.value })}
            className="pl-9 rounded-xl border-border"
          />
        </div>
        <Button
          variant="outline"
          className="rounded-xl gap-2 shrink-0"
          onClick={onExport}
        >
          <Download className="h-4 w-4" strokeWidth={1.5} />
          Export CSV
        </Button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Last Visit
          </label>
          <Select
            value={filters.lastVisit}
            onValueChange={(v) => update({ lastVisit: v })}
          >
            <SelectTrigger className="w-[160px] rounded-xl h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="60">Last 60 days</SelectItem>
              <SelectItem value="90+">90+ days inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Total Spend (€)
          </label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              placeholder="Min"
              value={filters.ltvMin}
              onChange={(e) => update({ ltvMin: e.target.value })}
              className="w-20 rounded-xl h-9 text-sm"
            />
            <span className="text-muted-foreground text-xs">–</span>
            <Input
              type="number"
              placeholder="Max"
              value={filters.ltvMax}
              onChange={(e) => update({ ltvMax: e.target.value })}
              className="w-20 rounded-xl h-9 text-sm"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Service History
          </label>
          <Select
            value={filters.serviceId}
            onValueChange={(v) => update({ serviceId: v })}
          >
            <SelectTrigger className="w-[180px] rounded-xl h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Services</SelectItem>
              {services.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.service_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {filteredCount !== totalCount && (
          <div className="self-end pb-1">
            <span className="text-xs text-muted-foreground">
              {filteredCount} of {totalCount} clients
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
