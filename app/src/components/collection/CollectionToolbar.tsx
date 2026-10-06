import { ListFilter, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { SortKey } from './sorting';

interface CollectionToolbarProps {
  /** Plural, lower-case, e.g. "pyramids". */
  nounPlural: string;
  search: string;
  onSearchChange: (search: string) => void;
  sortBy: SortKey;
  onSortChange: (sortBy: SortKey) => void;
}

/** Search and sort above a collection's card grid. */
export function CollectionToolbar({ nounPlural, search, onSearchChange, sortBy, onSortChange }: CollectionToolbarProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-6">
      <div className="flex-grow max-w-md relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          aria-label={`Search ${nounPlural}`}
          placeholder={`Search ${nounPlural}...`}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-8"
        />
      </div>
      <div className="w-full sm:w-[200px]">
        <Select value={sortBy} onValueChange={(value) => onSortChange(value as SortKey)}>
          <SelectTrigger aria-label="Sort by">
            <div className="flex items-center gap-2">
              <ListFilter size={16} />
              <SelectValue />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Recently modified</SelectItem>
            <SelectItem value="title">Title (A-Z)</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
