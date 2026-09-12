import { useDeferredValue, useId, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, X } from "lucide-react";
import { getAdminCategories, getAdminProducts } from "../../api/adminApi";

const getValue = (item) => String(item?._id || item?.value || item || "");

const normalizeOption = (item, type) => ({
  value: getValue(item),
  name: item?.name || item?.label || (type === "product" ? "Saved product" : "Saved category"),
  arabicName: item?.arabicName || "",
  sku: item?.sku || "",
});

const mergeOptions = (items, type) => {
  const options = new Map();
  items.flat().filter(Boolean).forEach((item) => {
    const option = normalizeOption(item, type);
    if (option.value) options.set(option.value, { ...options.get(option.value), ...option });
  });
  return [...options.values()];
};

function AdminEntitySelector({
  type,
  label,
  value = [],
  onChange,
  initialOptions = [],
  multiple = true,
  excludeValues = [],
  placeholder,
}) {
  const listboxId = useId();
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const deferredSearch = useDeferredValue(search.trim());
  const selectedValues = multiple ? value : value ? [value] : [];

  const optionsQuery = useQuery({
    queryKey: ["admin-entity-options", type, type === "product" ? deferredSearch : "all"],
    queryFn: () => type === "product"
      ? getAdminProducts({ search: deferredSearch || undefined, limit: 60 })
      : getAdminCategories(),
    staleTime: 30_000,
  });

  const allOptions = useMemo(
    () => mergeOptions([initialOptions, optionsQuery.data?.data || []], type),
    [initialOptions, optionsQuery.data?.data, type]
  );
  const selectedOptions = selectedValues.map((selectedValue) =>
    allOptions.find((option) => option.value === String(selectedValue)) ||
      normalizeOption({ value: selectedValue }, type)
  );
  const unavailableValues = new Set([...selectedValues, ...excludeValues].map(String));
  const normalizedSearch = search.trim().toLocaleLowerCase();
  const availableOptions = allOptions.filter((option) => {
    if (unavailableValues.has(option.value)) return false;
    if (!normalizedSearch) return true;
    return `${option.name} ${option.arabicName} ${option.sku}`
      .toLocaleLowerCase()
      .includes(normalizedSearch);
  });

  const selectOption = (option) => {
    onChange(multiple ? [...selectedValues, option.value] : option.value);
    setSearch("");
    setActiveIndex(0);
    setIsOpen(false);
  };

  const removeOption = (optionValue) => {
    onChange(multiple ? selectedValues.filter((item) => String(item) !== optionValue) : "");
  };

  const handleKeyDown = (event) => {
    if (event.key === "Escape") {
      setIsOpen(false);
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((current) => {
        if (!availableOptions.length) return 0;
        const direction = event.key === "ArrowDown" ? 1 : -1;
        return (current + direction + availableOptions.length) % availableOptions.length;
      });
      return;
    }
    if (event.key === "Enter" && isOpen && availableOptions[activeIndex]) {
      event.preventDefault();
      selectOption(availableOptions[activeIndex]);
    }
  };

  return (
    <div>
      {label && <label htmlFor={`${listboxId}-search`} className="mb-2 block text-sm font-semibold text-darb-green">{label}</label>}
      {selectedOptions.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {selectedOptions.map((option) => (
            <span key={option.value} className="inline-flex max-w-full items-center gap-2 rounded-full bg-darb-green px-3 py-1.5 text-xs font-semibold text-darb-beige">
              <span className="truncate">{option.name}{option.sku ? ` · ${option.sku}` : ""}</span>
              <button type="button" onClick={() => removeOption(option.value)} className="rounded-full p-0.5 hover:bg-white/15" aria-label={`Remove ${option.name}`}>
                <X size={13} />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="relative">
        <Search size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-darb-muted" />
        <input
          id={`${listboxId}-search`}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-activedescendant={isOpen && availableOptions[activeIndex] ? `${listboxId}-option-${activeIndex}` : undefined}
          value={search}
          onChange={(event) => { setSearch(event.target.value); setActiveIndex(0); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => window.setTimeout(() => setIsOpen(false), 120)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || `Search ${type === "product" ? "products" : "categories"}`}
          className="w-full rounded-full border border-darb-gold/30 bg-white py-3 pl-11 pr-5 outline-none transition focus:border-darb-green"
        />
        {isOpen && (
          <div id={listboxId} role="listbox" className="absolute z-30 mt-2 max-h-64 w-full overflow-y-auto rounded-2xl border border-darb-gold/25 bg-white p-2 shadow-soft">
            {optionsQuery.isLoading && <p className="px-3 py-2 text-sm text-darb-muted">Loading options...</p>}
            {!optionsQuery.isLoading && availableOptions.length === 0 && <p className="px-3 py-2 text-sm text-darb-muted">No matching {type}s.</p>}
            {availableOptions.map((option, index) => (
              <button
                key={option.value}
                id={`${listboxId}-option-${index}`}
                type="button"
                role="option"
                aria-selected={false}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectOption(option)}
                className={`block w-full rounded-xl px-3 py-2 text-left transition ${index === activeIndex ? "bg-darb-cream" : "hover:bg-darb-cream/70"}`}
              >
                <span className="block text-sm font-semibold text-darb-green">{option.name}</span>
                {(option.arabicName || option.sku) && <span className="mt-0.5 block text-xs text-darb-muted">{[option.arabicName, option.sku].filter(Boolean).join(" · ")}</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminEntitySelector;
