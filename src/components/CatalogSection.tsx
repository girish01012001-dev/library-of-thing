import {
  AlertCircle,
  ArrowUpDown,
  CheckCircle2,
  Search,
  X,
  XCircle,
} from 'lucide-react';
import {
  PRODUCT_CATEGORIES,
  type Product,
  type SortOption,
} from '../types';
import {
  filterAndSortProducts,
  formatINR,
  getStockDisplayInfo,
} from '../utils/rentalMath';
import { ProductImage } from './ProductImage';

interface CatalogSectionProps {
  products: Product[];
  loading: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedCategory: string;
  onCategoryChange: (cat: string) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  onSelectProduct: (product: Product) => void;
}

export function CatalogSection({
  products,
  loading,
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  sortBy,
  onSortChange,
  onSelectProduct,
}: CatalogSectionProps) {
  const filteredProducts = filterAndSortProducts(
    products,
    searchQuery,
    selectedCategory,
    sortBy,
  );

  const categories = ['All', ...PRODUCT_CATEGORIES];

  return (
    <section id="catalog" className="py-12 sm:py-16 bg-[#FAF9F6]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Heading & Controls */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1F2933]">
              Rental Catalog
            </h2>
            <p className="mt-1.5 text-sm text-[#52606D]">
              Store-owned, sanitized gear ready for Dehradun pickup or doorstep delivery.
            </p>
          </div>
          <p className="text-xs font-medium text-[#52606D] tabular-nums">
            Showing {filteredProducts.length} of {products.length} items
          </p>
        </div>

        {/* Search + Sort Bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <label htmlFor="catalog-search" className="sr-only">
              Search rental catalog
            </label>
            <Search className="w-4 h-4 text-[#52606D] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="catalog-search"
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search PS5, DSLR camera, camping tent, drill..."
              className="w-full pl-10 pr-10 py-3 bg-white border border-[#E4E7EB] rounded-xl text-sm text-[#1F2933] placeholder:text-[#7B8794] focus:outline-none focus:border-[#1B4332] focus:ring-2 focus:ring-[#1B4332]/15 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                aria-label="Clear search query"
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#52606D] hover:text-[#1F2933] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="sm:w-56 relative">
            <label htmlFor="catalog-sort" className="sr-only">
              Sort products
            </label>
            <ArrowUpDown className="w-4 h-4 text-[#52606D] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              id="catalog-sort"
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as SortOption)}
              className="w-full pl-10 pr-4 py-3 bg-white border border-[#E4E7EB] rounded-xl text-sm font-medium text-[#1F2933] focus:outline-none focus:border-[#1B4332] focus:ring-2 focus:ring-[#1B4332]/15 cursor-pointer"
            >
              <option value="featured">Sort: Featured</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="available">Available Now</option>
            </select>
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div
          role="tablist"
          aria-label="Filter items by category"
          className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 mb-8"
        >
          {categories.map((cat) => {
            const active = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onCategoryChange(cat)}
                className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1B4332] ${
                  active
                    ? 'bg-[#1B4332] text-white'
                    : 'bg-white text-[#52606D] border border-[#E4E7EB] hover:border-[#1B4332]/50 hover:text-[#1F2933]'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Loading Skeletons */}
        {loading ? (
          <div
            data-testid="catalog-skeleton"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-[#E4E7EB] bg-white overflow-hidden animate-pulse"
              >
                <div className="aspect-[4/3] bg-[#EAE8E1]" />
                <div className="p-5 space-y-3">
                  <div className="h-3.5 bg-[#EAE8E1] rounded w-1/2" />
                  <div className="h-5 bg-[#EAE8E1] rounded w-4/5" />
                  <div className="h-4 bg-[#EAE8E1] rounded w-1/3" />
                  <div className="h-10 bg-[#EAE8E1] rounded-xl w-full mt-4" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          /* Empty Filter / Search State */
          <div className="rounded-2xl border border-[#E4E7EB] bg-white p-10 text-center max-w-lg mx-auto my-6">
            <p className="text-base font-semibold text-[#1F2933]">
              No matching gear found
            </p>
            <p className="mt-1.5 text-sm text-[#52606D]">
              Try clearing your search or switching back to all categories.
            </p>
            <button
              type="button"
              onClick={() => {
                onSearchChange('');
                onCategoryChange('All');
                onSortChange('featured');
              }}
              className="mt-5 inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold text-white bg-[#1B4332] hover:bg-[#143325] rounded-xl transition-colors cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          /* Product Grid */
          <div
            data-testid="catalog-grid"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filteredProducts.map((product) => {
              const stockInfo = getStockDisplayInfo(product.availableQuantity);

              return (
                <article
                  key={product.id}
                  data-testid={`product-card-${product.id}`}
                  className="group rounded-2xl border border-[#E4E7EB] bg-white overflow-hidden flex flex-col h-full transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="aspect-[4/3] bg-[#F2F1EC] overflow-hidden">
                    <ProductImage
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                    />
                  </div>

                  <div className="p-5 flex flex-col flex-1 justify-between">
                    <div>
                      {/* Clean unboxed category + multi-unit stock indicator */}
                      <div className="flex items-center justify-between gap-2 text-xs mb-2">
                        <span className="font-medium text-[#52606D] truncate">
                          {product.category}
                        </span>
                        <span
                          data-testid={`stock-label-${product.id}`}
                          className={`inline-flex items-center gap-1 font-semibold tabular-nums shrink-0 ${
                            stockInfo.tone === 'in-stock'
                              ? 'text-[#1B4332]'
                              : stockInfo.tone === 'low-stock'
                                ? 'text-[#B45309]'
                                : 'text-[#B91C1C]'
                          }`}
                        >
                          {stockInfo.tone === 'in-stock' ? (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          ) : stockInfo.tone === 'low-stock' ? (
                            <AlertCircle className="w-3.5 h-3.5" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5" />
                          )}
                          <span>{stockInfo.label}</span>
                        </span>
                      </div>

                      <h3 className="text-base sm:text-lg font-bold text-[#1F2933] leading-snug">
                        {product.name}
                      </h3>

                      <p className="mt-1 text-xs text-[#52606D] truncate">
                        {product.brandModel} · {product.condition}
                      </p>
                    </div>

                    <div className="mt-5 pt-4 border-t border-[#E4E7EB]">
                      <div className="flex items-baseline justify-between gap-2 mb-3.5">
                        <div className="tabular-nums">
                          <span className="text-lg font-extrabold text-[#1F2933]">
                            {formatINR(product.dailyPrice)}
                          </span>
                          <span className="text-xs font-medium text-[#52606D]"> / day</span>
                        </div>
                        <span className="text-xs text-[#52606D] tabular-nums">
                          {formatINR(product.securityDeposit)} refundable deposit
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => onSelectProduct(product)}
                        className={`w-full py-2.5 px-4 rounded-xl text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1B4332] ${
                          stockInfo.isAvailable
                            ? 'bg-[#1B4332] text-white hover:bg-[#143325]'
                            : 'bg-[#FAF9F6] text-[#52606D] border border-[#E4E7EB] hover:border-[#1B4332] hover:text-[#1F2933]'
                        }`}
                      >
                        {stockInfo.isAvailable ? 'View & Rent' : 'Out of Stock'}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
