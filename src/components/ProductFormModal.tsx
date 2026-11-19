import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { ImagePlus, Link2, Upload, X } from 'lucide-react';
import {
  PRODUCT_CATEGORIES,
  type Category,
  type ItemCondition,
  type Product,
} from '../types';
import { compressImageFile, estimateDataUrlKB } from '../utils/imageCompression';
import { computeAdjustedStockOnEdit } from '../utils/rentalMath';
import { ProductImage } from './ProductImage';

interface ProductFormModalProps {
  isOpen: boolean;
  editingProduct: Product | null;
  onClose: () => void;
  onSave: (
    data: Omit<Product, 'id' | 'createdAt'>,
    existingId?: string,
  ) => Promise<void>;
}

const CONDITIONS: ItemCondition[] = ['Like New', 'Excellent', 'Good'];

export function ProductFormModal({
  isOpen,
  editingProduct,
  onClose,
  onSave,
}: ProductFormModalProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<Category>('Gaming');
  const [brandModel, setBrandModel] = useState('');
  const [condition, setCondition] = useState<ItemCondition>('Like New');
  const [dailyPrice, setDailyPrice] = useState('350');
  const [securityDeposit, setSecurityDeposit] = useState('2000');
  const [totalQuantity, setTotalQuantity] = useState('1');
  const [accessoriesText, setAccessoriesText] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageMode, setImageMode] = useState<'upload' | 'url'>('url');
  const [available, setAvailable] = useState(true);

  const [compressing, setCompressing] = useState(false);
  const [compressedKB, setCompressedKB] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (editingProduct) {
      setName(editingProduct.name);
      setCategory(editingProduct.category);
      setBrandModel(editingProduct.brandModel);
      setCondition(editingProduct.condition);
      setDailyPrice(String(editingProduct.dailyPrice));
      setSecurityDeposit(String(editingProduct.securityDeposit));
      setTotalQuantity(String(editingProduct.totalQuantity || 1));
      setAccessoriesText(editingProduct.accessories.join('\n'));
      setDescription(editingProduct.description);
      setImageUrl(editingProduct.imageUrl);
      setImageMode(editingProduct.imageUrl.startsWith('data:') ? 'upload' : 'url');
      setAvailable(editingProduct.available);
      setCompressedKB(
        editingProduct.imageUrl.startsWith('data:')
          ? estimateDataUrlKB(editingProduct.imageUrl)
          : null,
      );
    } else {
      setName('');
      setCategory('Gaming');
      setBrandModel('');
      setCondition('Like New');
      setDailyPrice('350');
      setSecurityDeposit('2000');
      setTotalQuantity('1');
      setAccessoriesText('');
      setDescription('');
      setImageUrl('');
      setImageMode('upload');
      setAvailable(true);
      setCompressedKB(null);
    }
    setError('');
    setSaving(false);
  }, [isOpen, editingProduct]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const parsedTotalQtyPreview = Math.max(1, Math.floor(Number(totalQuantity) || 1));
  const stockPreview = editingProduct
    ? computeAdjustedStockOnEdit(
        editingProduct.totalQuantity,
        editingProduct.availableQuantity,
        parsedTotalQtyPreview,
      )
    : {
        totalQuantity: parsedTotalQtyPreview,
        availableQuantity: available ? parsedTotalQtyPreview : 0,
        available,
      };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setCompressing(true);
    try {
      const dataUrl = await compressImageFile(file, 800, 0.72);
      setImageUrl(dataUrl);
      setCompressedKB(estimateDataUrlKB(dataUrl));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to process selected image.',
      );
    } finally {
      setCompressing(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const parsedPrice = Number(dailyPrice);
    const parsedDeposit = Number(securityDeposit);
    const parsedTotalQty = Number(totalQuantity);

    if (!name.trim()) {
      setError('Product name is required.');
      return;
    }
    if (!brandModel.trim()) {
      setError('Brand & model is required.');
      return;
    }
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      setError('Enter a valid daily rental price in ₹.');
      return;
    }
    if (!Number.isFinite(parsedDeposit) || parsedDeposit < 0) {
      setError('Enter a valid refundable deposit amount in ₹.');
      return;
    }
    if (!Number.isInteger(parsedTotalQty) || parsedTotalQty < 1) {
      setError('Total Quantity in Stock must be a whole number of at least 1.');
      return;
    }
    if (!description.trim()) {
      setError('Add a short item description.');
      return;
    }

    const accessories = accessoriesText
      .split(/\n|,/)
      .map((s) => s.trim())
      .filter(Boolean);

    const stockFields = editingProduct
      ? computeAdjustedStockOnEdit(
          editingProduct.totalQuantity,
          editingProduct.availableQuantity,
          parsedTotalQty,
        )
      : {
          totalQuantity: parsedTotalQty,
          availableQuantity: available ? parsedTotalQty : 0,
          available,
        };

    setSaving(true);
    try {
      await onSave(
        {
          name: name.trim(),
          category,
          brandModel: brandModel.trim(),
          condition,
          dailyPrice: Math.round(parsedPrice),
          securityDeposit: Math.round(parsedDeposit),
          accessories: accessories.length > 0 ? accessories : ['Standard Kit'],
          description: description.trim(),
          imageUrl: imageUrl.trim(),
          totalQuantity: stockFields.totalQuantity,
          availableQuantity: stockFields.availableQuantity,
          available: stockFields.available,
        },
        editingProduct?.id,
      );
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[#1F2933]/55 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-form-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white border border-[#E4E7EB] shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-white border-b border-[#E4E7EB]">
          <h2 id="product-form-title" className="text-lg font-bold text-[#1F2933]">
            {editingProduct ? 'Edit Catalog Item' : 'Add New Catalog Item'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close item form"
            className="w-9 h-9 rounded-xl border border-[#E4E7EB] flex items-center justify-center text-[#52606D] hover:text-[#1F2933] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Photo Upload (with Canvas compression) OR Image URL */}
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-semibold text-[#1F2933]">
                Item Photo
              </span>
              <div className="inline-flex rounded-lg bg-[#FAF9F6] border border-[#E4E7EB] p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setImageMode('upload')}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-medium cursor-pointer ${
                    imageMode === 'upload'
                      ? 'bg-[#1B4332] text-white'
                      : 'text-[#52606D]'
                  }`}
                >
                  <Upload className="w-3 h-3" />
                  <span>Upload File</span>
                </button>
                <button
                  type="button"
                  onClick={() => setImageMode('url')}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-medium cursor-pointer ${
                    imageMode === 'url'
                      ? 'bg-[#1B4332] text-white'
                      : 'text-[#52606D]'
                  }`}
                >
                  <Link2 className="w-3 h-3" />
                  <span>Paste URL</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
              <div className="sm:col-span-5 aspect-[4/3] rounded-xl overflow-hidden border border-[#E4E7EB] bg-[#F2F1EC]">
                {imageUrl ? (
                  <ProductImage
                    src={imageUrl}
                    alt={name || 'Item preview'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-[#52606D] p-4 text-center">
                    <ImagePlus className="w-6 h-6 mb-1.5 opacity-70" />
                    <span className="text-xs">Photo preview</span>
                  </div>
                )}
              </div>

              <div className="sm:col-span-7">
                {imageMode === 'upload' ? (
                  <div
                    key="upload-mode"
                    className="rounded-xl border border-dashed border-[#CBD2D9] bg-[#FAF9F6] p-4"
                  >
                    <label
                      htmlFor="item-photo-upload"
                      className="block text-xs font-semibold text-[#1B4332] cursor-pointer"
                    >
                      Choose photo from computer or phone
                    </label>
                    <input
                      key="file-input"
                      id="item-photo-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="mt-2 block w-full text-xs text-[#52606D] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-[#E4E7EB] file:text-xs file:font-semibold file:bg-white file:text-[#1F2933] hover:file:bg-[#F2F1EC] cursor-pointer"
                    />
                    <p className="mt-2 text-[11px] text-[#52606D]">
                      {compressing
                        ? 'Resizing & compressing image...'
                        : compressedKB
                          ? `Compressed cleanly to ${compressedKB} KB Base64 JPEG (max 800px).`
                          : 'Automatically resized (max 800px) & compressed in-browser.'}
                    </p>
                  </div>
                ) : (
                  <div key="url-mode">
                    <label
                      htmlFor="item-image-url"
                      className="block text-xs font-medium text-[#52606D] mb-1"
                    >
                      Image URL or Local Path
                    </label>
                    <input
                      key="url-input"
                      id="item-image-url"
                      type="text"
                      value={imageUrl}
                      onChange={(e) => {
                        setImageUrl(e.target.value);
                        setCompressedKB(null);
                      }}
                      placeholder="https://... or /src/assets/images/..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4E7EB] text-sm text-[#1F2933] focus:outline-none focus:border-[#1B4332]"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="item-name"
                className="block text-xs font-medium text-[#52606D] mb-1"
              >
                Product Name
              </label>
              <input
                id="item-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. DJI Mini 3 Drone"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4E7EB] text-sm text-[#1F2933] focus:outline-none focus:border-[#1B4332]"
              />
            </div>

            <div>
              <label
                htmlFor="item-brand"
                className="block text-xs font-medium text-[#52606D] mb-1"
              >
                Brand &amp; Model
              </label>
              <input
                id="item-brand"
                type="text"
                value={brandModel}
                onChange={(e) => setBrandModel(e.target.value)}
                placeholder="e.g. DJI Mini 3 Fly More"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4E7EB] text-sm text-[#1F2933] focus:outline-none focus:border-[#1B4332]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="item-category"
                className="block text-xs font-medium text-[#52606D] mb-1"
              >
                Category
              </label>
              <select
                id="item-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4E7EB] bg-white text-sm text-[#1F2933] focus:outline-none focus:border-[#1B4332]"
              >
                {PRODUCT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="item-condition"
                className="block text-xs font-medium text-[#52606D] mb-1"
              >
                Condition
              </label>
              <select
                id="item-condition"
                value={condition}
                onChange={(e) => setCondition(e.target.value as ItemCondition)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4E7EB] bg-white text-sm text-[#1F2933] focus:outline-none focus:border-[#1B4332]"
              >
                {CONDITIONS.map((cond) => (
                  <option key={cond} value={cond}>
                    {cond}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label
                htmlFor="item-daily-price"
                className="block text-xs font-medium text-[#52606D] mb-1"
              >
                Daily Price (₹)
              </label>
              <input
                id="item-daily-price"
                type="number"
                min={1}
                value={dailyPrice}
                onChange={(e) => setDailyPrice(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4E7EB] text-sm text-[#1F2933] tabular-nums focus:outline-none focus:border-[#1B4332]"
              />
            </div>

            <div>
              <label
                htmlFor="item-deposit"
                className="block text-xs font-medium text-[#52606D] mb-1"
              >
                Refundable Deposit (₹)
              </label>
              <input
                id="item-deposit"
                type="number"
                min={0}
                value={securityDeposit}
                onChange={(e) => setSecurityDeposit(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4E7EB] text-sm text-[#1F2933] tabular-nums focus:outline-none focus:border-[#1B4332]"
              />
            </div>

            <div>
              <label
                htmlFor="item-total-quantity"
                className="block text-xs font-medium text-[#52606D] mb-1"
              >
                Total Quantity in Stock
              </label>
              <input
                id="item-total-quantity"
                type="number"
                min={1}
                step={1}
                required
                value={totalQuantity}
                onChange={(e) => setTotalQuantity(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4E7EB] text-sm text-[#1F2933] tabular-nums focus:outline-none focus:border-[#1B4332]"
              />
              <p className="mt-1 text-[11px] text-[#52606D] tabular-nums">
                {stockPreview.availableQuantity} of {stockPreview.totalQuantity} available
              </p>
            </div>
          </div>

          <div>
            <label
              htmlFor="item-accessories"
              className="block text-xs font-medium text-[#52606D] mb-1"
            >
              Included Accessories (one per line or comma-separated)
            </label>
            <textarea
              id="item-accessories"
              rows={2}
              value={accessoriesText}
              onChange={(e) => setAccessoriesText(e.target.value)}
              placeholder="Carry Case, Charging Cable, Extra Battery"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4E7EB] text-sm text-[#1F2933] focus:outline-none focus:border-[#1B4332]"
            />
          </div>

          <div>
            <label
              htmlFor="item-description"
              className="block text-xs font-medium text-[#52606D] mb-1"
            >
              Description
            </label>
            <textarea
              id="item-description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe ideal use cases and condition..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4E7EB] text-sm text-[#1F2933] focus:outline-none focus:border-[#1B4332]"
            />
          </div>

          {!editingProduct && (
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={available}
                onChange={(e) => setAvailable(e.target.checked)}
                className="w-4 h-4 accent-[#1B4332] rounded cursor-pointer"
              />
              <span className="text-sm font-medium text-[#1F2933]">
                Start with all {parsedTotalQtyPreview} {parsedTotalQtyPreview === 1 ? 'unit' : 'units'} Available for booking
              </span>
            </label>
          )}

          {error && (
            <p className="text-xs font-medium text-red-600">{error}</p>
          )}

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-[#E4E7EB] text-sm font-semibold text-[#52606D] hover:text-[#1F2933] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || compressing}
              className="px-5 py-2.5 rounded-xl bg-[#1B4332] hover:bg-[#143325] disabled:opacity-60 text-white text-sm font-semibold cursor-pointer"
            >
              {saving
                ? 'Saving...'
                : editingProduct
                  ? 'Save Changes'
                  : 'Add Item to Catalog'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
