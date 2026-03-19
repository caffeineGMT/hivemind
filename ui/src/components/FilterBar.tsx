import { Check } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

interface FilterBarProps {
  items: { id: string; name: string }[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  label?: string;
}

export default function FilterBar({ items, selectedIds, onSelectionChange, label = 'Select Projects' }: FilterBarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleItem = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((selectedId) => selectedId !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  const selectAll = () => {
    onSelectionChange(items.map((item) => item.id));
  };

  const clearAll = () => {
    onSelectionChange([]);
  };

  const selectedCount = selectedIds.length;
  const allSelected = selectedCount === items.length;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className="flex min-h-[44px] min-w-[240px] items-center justify-between gap-2 rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-2 text-sm text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
      >
        <span className="truncate">
          {selectedCount === 0
            ? label
            : selectedCount === items.length
            ? 'All Projects'
            : `${selectedCount} Project${selectedCount > 1 ? 's' : ''} Selected`}
        </span>
        <svg
          className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full z-50 mt-2 w-full min-w-[280px] rounded-lg border border-zinc-700 bg-zinc-800 shadow-xl">
          {/* Select All / Clear All */}
          <div className="flex items-center justify-between border-b border-zinc-700 px-3 py-2">
            <button
              onClick={selectAll}
              disabled={allSelected}
              className="text-xs text-blue-400 hover:text-blue-300 disabled:text-zinc-600 disabled:cursor-not-allowed"
            >
              Select All
            </button>
            <button
              onClick={clearAll}
              disabled={selectedCount === 0}
              className="text-xs text-red-400 hover:text-red-300 disabled:text-zinc-600 disabled:cursor-not-allowed"
            >
              Clear All
            </button>
          </div>

          {/* Items */}
          <div className="max-h-[300px] overflow-y-auto">
            {items.map((item) => {
              const isSelected = selectedIds.includes(item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => toggleItem(item.id)}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-zinc-300 transition-colors hover:bg-zinc-700/50"
                >
                  <div
                    className={`flex h-4 w-4 items-center justify-center rounded border ${
                      isSelected ? 'border-blue-500 bg-blue-500' : 'border-zinc-600 bg-zinc-900'
                    }`}
                  >
                    {isSelected && <Check className="h-3 w-3 text-white" />}
                  </div>
                  <span className="flex-1 truncate">{item.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
