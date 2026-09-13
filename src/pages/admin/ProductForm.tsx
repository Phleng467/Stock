import { useState, useEffect, useRef, type FormEvent, type ChangeEvent } from 'react';
import { api } from '../../lib/api';
import { Product, Brand, ProductVariant, ProductColor } from '../../types';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Trash2, Wand2, UploadCloud, AlertCircle, AlertTriangle, Sparkles, Image as ImageIcon, Check, X, ExternalLink, Search, Globe, ChevronDown, RefreshCw, Loader2, Camera as CameraIcon, LayoutTemplate } from 'lucide-react';
import { getSuggestedImages, getColorHex, resolveProductImage, type ImageOption } from '../../lib/deviceImages';
import AdminToast, { ToastItem, MarginViolation } from '../../components/AdminToast';
import { cn } from '../../components/ProductCard';
import CameraCaptureModal from '../../components/CameraCaptureModal';
import PlaceholderGeneratorModal from '../../components/PlaceholderGeneratorModal';

export default function ProductForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingSpecs, setFetchingSpecs] = useState(false);
  const [error, setError] = useState('');
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [activeImagePicker, setActiveImagePicker] = useState<{ vIndex: number; cIndex: number } | null>(null);
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [suggestedColorsFromAi, setSuggestedColorsFromAi] = useState<string[]>([]);
  
  // Modals state
  const [activeCameraPicker, setActiveCameraPicker] = useState<{ vIndex: number; cIndex: number } | null>(null);
  const [activePlaceholderPicker, setActivePlaceholderPicker] = useState<{ vIndex: number; cIndex: number } | null>(null);
  
  // Real Google / Web Image Search State
  const [webImageResults, setWebImageResults] = useState<{ title: string; imageUrl: string; thumbnailUrl: string; source?: string; width?: number; height?: number }[]>([]);
  const [searchingWebImages, setSearchingWebImages] = useState(false);
  const [webSearchQuery, setWebSearchQuery] = useState('');
  const [pickerTab, setPickerTab] = useState<'google' | 'presets' | 'custom'>('google');
  const [autoFillingImages, setAutoFillingImages] = useState(false);
  const [uploadingImage, setUploadingImage] = useState<{ vIndex: number; cIndex: number } | null>(null);

  // Brand dropdown state
  const [brandSearchOpen, setBrandSearchOpen] = useState(false);
  const [brandSearchQuery, setBrandSearchQuery] = useState('');
  const brandDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (brandDropdownRef.current && !brandDropdownRef.current.contains(event.target as Node)) {
        setBrandSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [form, setForm] = useState<Partial<Product>>({
    category: 'Mobile',
    brandId: '',
    model: '',
    detail: '',
    specs: { screen: '', chipset: '', camera: '', battery: '', os: '', weight: '' },
    isHidden: false,
    variants: [
      {
        id: Math.random().toString(36).substring(7),
        ram: '',
        rom: '128GB',
        retailPrice: 0,
        wholesalePrice: null,
        colors: [
          { id: Math.random().toString(36).substring(7), colorName: '', sku: '', stock: 0, imageUrl: '' }
        ]
      }
    ]
  });

  useEffect(() => {
    api.getBrands().then(b => {
      setBrands(b);
      if (!id && b.length > 0) setForm(f => ({ ...f, brandId: b[0].id }));
    });
    
    if (id) {
      api.getProducts().then(products => {
        const p = products.find(prod => prod.id === id);
        if (p) setForm(p);
      });
    }
  }, [id]);

  const currentBrand = brands.find(b => b.id === form.brandId)?.name || 'Apple';
  const isApple = currentBrand.toLowerCase().includes('apple') || 
                  currentBrand.toLowerCase().includes('iphone') || 
                  (form.model || '').toLowerCase().includes('iphone') || 
                  (form.model || '').toLowerCase().includes('ipad');

  // If Apple product, ensure no RAM values linger
  useEffect(() => {
    if (isApple && form.variants?.some(v => v.ram)) {
      setForm(prev => ({
        ...prev,
        variants: (prev.variants || []).map(v => ({ ...v, ram: '' }))
      }));
    }
  }, [isApple]);

  const handleFetchSpecs = async () => {
    if (!form.model) {
      setError('กรุณากรอกรุ่นสินค้าก่อนดึงข้อมูล');
      return;
    }
    setFetchingSpecs(true);
    setError('');
    try {
      const result = await api.fetchSpecs(form.model, form.category || 'Mobile');
      
      const { colors, ...specs } = result;
      setForm(f => ({ ...f, specs: { ...f.specs, ...specs } }));

      if (Array.isArray(colors) && colors.length > 0) {
        setSuggestedColorsFromAi(colors);
      }

      // Auto-populate image for existing colors if empty
      const brandName = brands.find(b => b.id === form.brandId)?.name || '';
      const updatedVariants = (form.variants || []).map(variant => ({
        ...variant,
        colors: variant.colors.map(c => ({
          ...c,
          imageUrl: c.imageUrl || resolveProductImage(brandName, form.model || '', c.colorName || '', '', form.category)
        }))
      }));
      setForm(f => ({ ...f, variants: updatedVariants }));

    } catch (err) {
      setError('ไม่พบข้อมูล หรือดึงข้อมูลล้มเหลว');
    } finally {
      setFetchingSpecs(false);
    }
  };

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>, vIndex: number, cIndex: number) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingImage({ vIndex, cIndex });
      const res = await api.uploadImage(file);
      const newVariants = [...(form.variants || [])];
      newVariants[vIndex].colors[cIndex].imageUrl = res.url;
      setForm({ ...form, variants: newVariants });
    } catch (err) {
      alert('Upload failed');
    } finally {
      setUploadingImage(null);
    }
  };

  const handleRemoveBackground = async (vIndex: number, cIndex: number, imageUrl: string) => {
    if (!imageUrl) {
      alert('ไม่มีรูปภาพสำหรับลบพื้นหลัง');
      return;
    }
    
    try {
      setUploadingImage({ vIndex, cIndex });
      
      // Load image to get base64
      const getBase64 = async (url: string) => {
        const response = await fetch(url);
        const blob = await response.blob();
        return new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      };
      
      const dataUrl = await getBase64(imageUrl);
      const res = await api.editImageAI(dataUrl, "Remove the background of this image and keep only the product. Make it a transparent PNG.");
      
      const newVariants = [...(form.variants || [])];
      newVariants[vIndex].colors[cIndex].imageUrl = res.url;
      setForm({ ...form, variants: newVariants });
      alert('ลบพื้นหลังสำเร็จ!');
    } catch (err: any) {
      console.error(err);
      alert(`ลบพื้นหลังล้มเหลว: ${err.message}`);
    } finally {
      setUploadingImage(null);
    }
  };

  const addVariant = () => {
    setForm(f => ({
      ...f,
      variants: [...(f.variants || []), {
        id: Math.random().toString(36).substring(7),
        ram: isApple ? '' : '8GB',
        rom: '128GB',
        retailPrice: 0,
        wholesalePrice: null,
        colors: [{ id: Math.random().toString(36).substring(7), colorName: '', sku: '', stock: 0, imageUrl: '' }]
      }]
    }));
  };

  const addColor = (vIndex: number) => {
    const newVariants = [...(form.variants || [])];
    const defaultImg = resolveProductImage(currentBrand, form.model || '', '', '', form.category);
    newVariants[vIndex].colors.push({ 
      id: Math.random().toString(36).substring(7), 
      colorName: '', 
      sku: '', 
      stock: 0, 
      imageUrl: defaultImg 
    });
    setForm({ ...form, variants: newVariants });
  };

  // Open the image picker modal and automatically search Google/Web images for this device & color
  const openImagePicker = (vIndex: number, cIndex: number) => {
    setActiveImagePicker({ vIndex, cIndex });
    const color = form.variants?.[vIndex]?.colors?.[cIndex];
    const colorName = color?.colorName || '';
    const initialQuery = `${currentBrand} ${form.model || ''} ${colorName} official render`.trim();
    setWebSearchQuery(initialQuery);
    setPickerTab('google');
    fetchWebImages(initialQuery);
  };

  const fetchWebImages = async (queryText?: string) => {
    const q = (queryText !== undefined ? queryText : webSearchQuery).trim();
    if (!q) return;
    setSearchingWebImages(true);
    try {
      const res = await api.searchImages({ query: q });
      setWebImageResults(res.results || []);
    } catch (e) {
      console.error('Failed to search web images', e);
      setWebImageResults([]);
    } finally {
      setSearchingWebImages(false);
    }
  };

  // Auto-fill images for all colors in a specific variant using web search + fallback
  const handleAutoFillAllImages = async (vIndex: number) => {
    if (!form.model) {
      setError('กรุณากรอกรุ่นสินค้าก่อน');
      return;
    }
    setAutoFillingImages(true);
    try {
      const newVariants = [...(form.variants || [])];
      const colors = [...newVariants[vIndex].colors];

      for (let i = 0; i < colors.length; i++) {
        const c = colors[i];
        try {
          const res = await api.searchImages({
            query: `${currentBrand} ${form.model} ${c.colorName} official render`
          });
          if (res.results && res.results.length > 0) {
            colors[i] = { ...c, imageUrl: res.results[0].imageUrl };
            continue;
          }
        } catch {
          // fallback
        }
        colors[i] = {
          ...c,
          imageUrl: resolveProductImage(currentBrand, form.model || '', c.colorName || '', '', form.category)
        };
      }
      newVariants[vIndex].colors = colors;
      setForm({ ...form, variants: newVariants });
    } finally {
      setAutoFillingImages(false);
    }
  };

  // Auto-populate official standard colors for this device with matching images & ITEM CODE template
  const handleAutoPopulateStandardColors = (vIndex: number) => {
    if (!form.model) {
      setError('กรุณากรอกรุ่นสินค้าก่อน');
      return;
    }

    let colorNames = suggestedColorsFromAi;
    if (colorNames.length === 0) {
      const cleanModel = form.model.toLowerCase();
      if (cleanModel.includes('iphone')) {
        colorNames = ['Black', 'Blue', 'Green', 'Yellow', 'Pink'];
      } else if (cleanModel.includes('galaxy') || cleanModel.includes('samsung')) {
        colorNames = ['Phantom Black', 'Marble Gray', 'Cobalt Violet', 'Amber Yellow'];
      } else if (cleanModel.includes('ipad') || cleanModel.includes('tablet')) {
        colorNames = ['Space Gray', 'Silver', 'Starlight'];
      } else {
        colorNames = ['ดำ (Black)', 'ขาว (White)', 'ฟ้า (Blue)', 'เขียว (Green)'];
      }
    }

    const romLabel = form.variants?.[vIndex]?.rom || '128';
    const modelClean = form.model.replace(/\s+/g, '').substring(0, 6).toUpperCase();

    const newColors: ProductColor[] = colorNames.map((colorName, idx) => ({
      id: Math.random().toString(36).substring(7),
      colorName,
      sku: `${modelClean}-${romLabel}-${idx + 1}`,
      stock: 5,
      imageUrl: resolveProductImage(currentBrand, form.model || '', colorName, '', form.category)
    }));

    const newVariants = [...(form.variants || [])];
    newVariants[vIndex].colors = newColors;
    setForm({ ...form, variants: newVariants });
  };

  const handleSelectSuggestedImage = (url: string) => {
    if (!activeImagePicker) return;
    const { vIndex, cIndex } = activeImagePicker;
    const newVariants = [...(form.variants || [])];
    newVariants[vIndex].colors[cIndex].imageUrl = url;
    setForm({ ...form, variants: newVariants });
    setActiveImagePicker(null);
    setCustomUrlInput('');
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Basic Validation
    if (!form.model || !form.brandId) {
      setError('กรุณากรอกข้อมูลให้ครบถ้วน (รุ่น, แบรนด์)');
      setLoading(false);
      return;
    }

    // Margin Management: Check if wholesale price exceeds retail price
    const marginViolations: MarginViolation[] = [];
    form.variants?.forEach(v => {
      if (v.wholesalePrice !== null && v.wholesalePrice !== undefined && v.wholesalePrice > v.retailPrice) {
        const label = isApple 
          ? (v.rom ? `ROM ${v.rom}` : 'ความจุมาตรฐาน')
          : `${v.ram ? `RAM ${v.ram} / ` : ''}${v.rom ? `ROM ${v.rom}` : 'ความจุมาตรฐาน'}`;
        marginViolations.push({
          variantId: v.id,
          variantLabel: label,
          retailPrice: v.retailPrice,
          wholesalePrice: v.wholesalePrice,
          lossAmount: v.wholesalePrice - v.retailPrice,
        });
      }
    });

    if (marginViolations.length > 0) {
      setLoading(false);
      setError('ไม่สามารถบันทึกได้: พบราคาส่งสูงกว่าราคาขายปลีก กรุณาตรวจสอบ Margin');
      
      const toastId = Math.random().toString(36).substring(7);
      setToasts(prev => [
        ...prev,
        {
          id: toastId,
          type: 'margin_warning',
          title: `แจ้งเตือน Margin ขาดทุน: ราคาส่ง > ราคาขายปลีก (${marginViolations.length} รายการ)`,
          message: 'พบการตั้งราคาส่งสูงกว่าราคาขายปลีก ซึ่งจะทำให้เกิดการขาดทุนต่อเครื่อง กรุณาปรับราคาเพื่อรักษากำไรขั้นต้น',
          violations: marginViolations,
          onScrollToVariant: (variantId: string) => {
            const el = document.getElementById(`variant-card-${variantId}`);
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              el.classList.add('ring-4', 'ring-red-500');
              setTimeout(() => el.classList.remove('ring-4', 'ring-red-500'), 3000);
            }
          }
        }
      ]);

      // Auto dismiss toast after 9 seconds
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== toastId));
      }, 9000);

      // Scroll smoothly to first offending variant
      const firstEl = document.getElementById(`variant-card-${marginViolations[0].variantId}`);
      if (firstEl) {
        firstEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }

      return;
    }

    // Ensure all colors have a fallback image if left blank, and ensure no RAM for Apple
    const sanitizedVariants = (form.variants || []).map(v => ({
      ...v,
      ram: isApple ? '' : (v.ram || ''),
      colors: v.colors.map(c => ({
        ...c,
        imageUrl: c.imageUrl || resolveProductImage(currentBrand, form.model || '', c.colorName, '', form.category)
      }))
    }));

    try {
      await api.saveProduct({ ...form, variants: sanitizedVariants } as Product);
      navigate('/admin/products');
    } catch (err) {
      setError('บันทึกข้อมูลล้มเหลว');
      setLoading(false);
    }
  };

  // Currently active color for image picker
  const activeColor = activeImagePicker 
    ? form.variants?.[activeImagePicker.vIndex]?.colors?.[activeImagePicker.cIndex]
    : null;
  const suggestedImagesList: ImageOption[] = activeColor
    ? getSuggestedImages(currentBrand, form.model || '', activeColor.colorName)
    : [];

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{id ? 'แก้ไขสินค้า' : 'เพิ่มสินค้าใหม่'}</h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" /> {error}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-8">
        {/* Basic Info */}
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl shadow-xs border border-gray-200 dark:border-zinc-700 space-y-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white border-b pb-2">ข้อมูลทั่วไป</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300">หมวดหมู่</label>
              <select 
                value={form.category} 
                onChange={e => setForm({...form, category: e.target.value as 'Mobile' | 'Tablet'})}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-2xs focus:ring-primary focus:border-primary sm:text-sm py-2 px-3 border bg-white dark:bg-zinc-900"
              >
                <option value="Mobile">Mobile (โทรศัพท์มือถือ)</option>
                <option value="Tablet">Tablet (แท็บเล็ต)</option>
              </select>
            </div>
            <div className="relative" ref={brandDropdownRef}>
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300">แบรนด์</label>
              <div
                className="mt-1 flex w-full items-center justify-between border-gray-300 rounded-md shadow-2xs focus:ring-primary focus:border-primary sm:text-sm py-2 px-3 border bg-white dark:bg-zinc-900 cursor-pointer"
                onClick={() => setBrandSearchOpen(!brandSearchOpen)}
              >
                <span>{brands.find(b => b.id === form.brandId)?.name || 'เลือกแบรนด์...'}</span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </div>
              {brandSearchOpen && (
                <div className="absolute z-10 mt-1 w-full bg-white dark:bg-zinc-900 shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                  <div className="sticky top-0 px-2 pb-2 bg-white dark:bg-zinc-900 pt-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 bg-gray-50 dark:bg-zinc-800/50"
                        placeholder="ค้นหาแบรนด์..."
                        value={brandSearchQuery}
                        onChange={(e) => setBrandSearchQuery(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        autoFocus
                      />
                    </div>
                  </div>
                  {brands.filter(b => b.name.toLowerCase().includes(brandSearchQuery.toLowerCase())).map(b => (
                    <div
                      key={b.id}
                      className={`cursor-pointer select-none relative py-2.5 pl-3 pr-9 hover:bg-red-50 hover:text-red-900 transition-colors ${form.brandId === b.id ? 'bg-red-50 text-red-900 font-bold' : 'text-gray-900 dark:text-white'}`}
                      onClick={() => {
                        setForm({...form, brandId: b.id});
                        setBrandSearchOpen(false);
                        setBrandSearchQuery('');
                      }}
                    >
                      {b.name}
                    </div>
                  ))}
                  {brands.filter(b => b.name.toLowerCase().includes(brandSearchQuery.toLowerCase())).length === 0 && (
                    <div className="py-3 px-3 text-sm text-gray-500 dark:text-zinc-400 text-center">ไม่พบแบรนด์ที่ค้นหา</div>
                  )}
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300">รุ่นสินค้า (Model)</label>
              <input 
                type="text" required
                placeholder="เช่น iPhone 15, Galaxy S24, Reno 12"
                value={form.model} 
                onChange={e => setForm({...form, model: e.target.value})}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-2xs focus:ring-primary focus:border-primary sm:text-sm py-2 px-3 border"
              />
            </div>
            {form.category === 'Tablet' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300">รายละเอียดเพิ่มเติม (เช่น Wi-Fi, 5G)</label>
                <input 
                  type="text" 
                  value={form.detail} 
                  onChange={e => setForm({...form, detail: e.target.value})}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-2xs focus:ring-primary focus:border-primary sm:text-sm py-2 px-3 border"
                />
              </div>
            )}
          </div>
        </div>

        {/* Specs */}
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl shadow-xs border border-gray-200 dark:border-zinc-700 space-y-6">
          <div className="flex justify-between items-center border-b pb-2">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">สเปกเครื่อง (Specifications)</h2>
              <p className="text-xs text-gray-500 dark:text-zinc-400">ดึงข้อมูลสเปกอัตโนมัติด้วย AI พร้อมแนะนำสีและรูปภาพประจำรุ่น</p>
            </div>
            <button 
              type="button" 
              onClick={handleFetchSpecs}
              disabled={fetchingSpecs}
              className="inline-flex items-center text-xs font-bold text-zinc-900 dark:text-white bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 active:scale-95 px-4 py-2 rounded-full border border-zinc-200 dark:border-zinc-700/70 transition-all cursor-pointer"
            >
              <Wand2 className={`w-3.5 h-3.5 mr-1.5 ${fetchingSpecs ? 'animate-spin' : ''}`} /> 
              {fetchingSpecs ? 'กำลังดึงข้อมูลสเปก & สี...' : '✨ Auto Fetch Specs & Images'}
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {['screen', 'chipset', 'camera', 'battery', 'os', 'weight'].map((key) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 capitalize">{key}</label>
                <input 
                  type="text" 
                  value={form.specs?.[key] || ''} 
                  onChange={e => setForm({...form, specs: {...form.specs, [key]: e.target.value}})}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-2xs focus:ring-primary focus:border-primary sm:text-sm py-2 px-3 border bg-gray-50 dark:bg-zinc-800/50/60"
                  placeholder={fetchingSpecs ? 'กำลังดึงข้อมูล...' : ''}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Variants & Colors */}
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {isApple ? 'ความจุ และ สี (ROM & Colors)' : 'ความจุ และ สี (Variants & Colors)'}
            </h2>
            <button 
              type="button" 
              onClick={addVariant} 
              className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-zinc-900 hover:bg-zinc-800 active:scale-95 px-4 py-2 rounded-full shadow-md shadow-zinc-900/15 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> {isApple ? 'เพิ่มความจุ (ROM)' : 'เพิ่มความจุ (RAM/ROM)'}
            </button>
          </div>

          {form.variants?.map((variant, vIndex) => {
            const isNegativeMargin = variant.wholesalePrice !== null && variant.wholesalePrice !== undefined && variant.wholesalePrice > variant.retailPrice;
            const marginLoss = isNegativeMargin ? (variant.wholesalePrice! - variant.retailPrice) : 0;

            return (
              <div 
                key={variant.id} 
                id={`variant-card-${variant.id}`} 
                className={cn(
                  "bg-white dark:bg-zinc-900 rounded-xl shadow-xs border overflow-hidden transition-all duration-300",
                  isNegativeMargin 
                    ? "border-red-400 ring-2 ring-red-400/20" 
                    : "border-gray-200 dark:border-zinc-700"
                )}
              >
                <div className="bg-gray-50 dark:bg-zinc-800/50 p-4 border-b border-gray-200 dark:border-zinc-700 flex gap-4 items-end flex-wrap">
                  {!isApple && (
                    <div className="flex-1 min-w-[120px]">
                      <label className="block text-xs font-medium text-gray-500 dark:text-zinc-400 uppercase">RAM</label>
                      <select required={!isApple}
                        value={variant.ram || ''} onChange={e => {
                          const newV = [...form.variants!]; newV[vIndex].ram = e.target.value; setForm({...form, variants: newV});
                        }}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-2xs sm:text-sm py-2 px-3 border bg-white dark:bg-zinc-900 text-gray-900 dark:text-white"
                      >
                        <option value="">เลือก RAM</option>
                        <option value="3GB">3GB</option>
                        <option value="4GB">4GB</option>
                        <option value="6GB">6GB</option>
                        <option value="8GB">8GB</option>
                        <option value="12GB">12GB</option>
                        <option value="16GB">16GB</option>
                        <option value="18GB">18GB</option>
                        <option value="24GB">24GB</option>
                      </select>
                    </div>
                  )}
                  <div className="flex-1 min-w-[120px]">
                    <label className="block text-xs font-medium text-gray-500 dark:text-zinc-400 uppercase">
                      {isApple ? 'ความจุ (ROM)' : 'ROM (ความจุ)'}
                    </label>
                    <select required
                      value={variant.rom} onChange={e => {
                        const newV = [...form.variants!]; newV[vIndex].rom = e.target.value; setForm({...form, variants: newV});
                      }}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-2xs sm:text-sm py-2 px-3 border bg-white dark:bg-zinc-900 text-gray-900 dark:text-white"
                    >
                      <option value="">{isApple ? 'เลือกความจุ' : 'เลือก ROM'}</option>
                      <option value="64GB">64GB</option>
                      <option value="128GB">128GB</option>
                      <option value="256GB">256GB</option>
                      <option value="512GB">512GB</option>
                      <option value="1TB">1TB</option>
                      <option value="2TB">2TB</option>
                    </select>
                  </div>
                  <div className="flex-1 min-w-[120px]">
                    <label className="block text-xs font-medium text-gray-500 dark:text-zinc-400 uppercase">ราคาขาย (฿)</label>
                    <input type="number" required min="0"
                      value={variant.retailPrice} onChange={e => {
                        const newV = [...form.variants!]; newV[vIndex].retailPrice = Number(e.target.value); setForm({...form, variants: newV});
                      }}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-2xs sm:text-sm py-2 px-3 border text-red-600 font-bold bg-white dark:bg-zinc-900" />
                  </div>
                  <div className="flex-1 min-w-[120px]">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-medium text-gray-500 dark:text-zinc-400 uppercase">ราคาส่ง (฿)</label>
                      <label className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-zinc-400 cursor-pointer">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3 h-3"
                          checked={variant.wholesalePrice !== null && variant.wholesalePrice !== undefined}
                          onChange={(e) => {
                            const newV = [...form.variants!]; 
                            newV[vIndex].wholesalePrice = e.target.checked ? (variant.wholesalePrice || 0) : null; 
                            setForm({...form, variants: newV});
                          }}
                        />
                        มีราคาส่ง
                      </label>
                    </div>
                    {isNegativeMargin && (
                      <span className="text-[10px] font-bold text-red-600 animate-pulse block mb-1">สูงกว่าราคาขาย!</span>
                    )}
                    {variant.wholesalePrice !== null && variant.wholesalePrice !== undefined ? (
                      <input type="number" min="0"
                        value={variant.wholesalePrice} onChange={e => {
                          const newV = [...form.variants!]; newV[vIndex].wholesalePrice = e.target.value ? Number(e.target.value) : 0; setForm({...form, variants: newV});
                        }}
                        className={cn(
                          "mt-1 block w-full rounded-md shadow-2xs sm:text-sm py-2 px-3 border bg-white dark:bg-zinc-900",
                          isNegativeMargin ? "border-red-500 text-red-700 focus:ring-red-500 focus:border-red-500 font-semibold" : "border-gray-300"
                        )} />
                    ) : (
                      <div className="mt-1 block w-full rounded-md shadow-2xs sm:text-sm py-2 px-3 border border-gray-200 dark:border-zinc-700 bg-gray-100 dark:bg-zinc-800 text-gray-400 italic">
                        ไม่มีราคาส่ง
                      </div>
                    )}
                  </div>
                  {form.variants!.length > 1 && (
                    <button type="button" onClick={() => {
                      const newV = form.variants!.filter((_, i) => i !== vIndex);
                      setForm({...form, variants: newV});
                    }} className="p-2 text-red-500 hover:bg-red-50 rounded-md cursor-pointer">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}

                  {/* Negative Margin Alert Bar */}
                  {isNegativeMargin && (
                    <div className="w-full mt-2 py-2 px-3 bg-red-100/70 border border-red-300/80 rounded-lg text-xs text-red-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                        <span>
                          <strong>Margin เสี่ยงขาดทุน:</strong> ราคาส่ง (฿{variant.wholesalePrice?.toLocaleString()}) สูงกว่าราคาขายปลีก (฿{variant.retailPrice.toLocaleString()})
                        </span>
                      </div>
                      <span className="font-bold text-white bg-red-600 px-2.5 py-0.5 rounded-full text-[11px] shrink-0 text-center shadow-xs">
                        ขาดทุน -฿{marginLoss.toLocaleString()} ต่อเครื่อง
                      </span>
                    </div>
                  )}
                </div>

              {/* Colors for this variant */}
              <div className="p-4 space-y-4">
                <div className="flex flex-wrap justify-between items-center gap-2">
                  <h4 className="text-sm font-bold text-gray-700 dark:text-zinc-300">ตัวเลือกสีสำหรับความจุนี้</h4>
                  
                  {/* Quick Auto-Image Helpers */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <button 
                      type="button" 
                      onClick={() => handleAutoFillAllImages(vIndex)}
                      disabled={autoFillingImages}
                      className="text-xs inline-flex items-center font-semibold text-blue-700 bg-blue-50/80 hover:bg-blue-100/80 active:scale-95 px-3 py-1.5 rounded-full border border-blue-200/80 transition-all cursor-pointer disabled:opacity-50"
                      title="ค้นหาและดึงรูปภาพจากเว็บอัตโนมัติตามรุ่นและชื่อสี"
                    >
                      {autoFillingImages ? (
                        <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin text-blue-600" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5 mr-1" />
                      )}
                      {autoFillingImages ? 'กำลังค้นหารูป...' : 'เติมรูปภาพ Auto ทุกสี'}
                    </button>
                    <button 
                      type="button" 
                      onClick={() => handleAutoPopulateStandardColors(vIndex)}
                      className="text-xs inline-flex items-center font-semibold text-purple-700 bg-purple-50/80 hover:bg-purple-100/80 active:scale-95 px-3 py-1.5 rounded-full border border-purple-200/80 transition-all cursor-pointer"
                      title="สร้างตัวเลือกสีมาตรฐานทั้งหมดพร้อมรูปภาพและ ITEM CODE"
                    >
                      <Wand2 className="w-3.5 h-3.5 mr-1" /> สร้างสีมาตรฐาน Auto
                    </button>
                    <button 
                      type="button" 
                      onClick={() => addColor(vIndex)} 
                      className="text-xs inline-flex items-center font-semibold text-zinc-900 dark:text-white bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 active:scale-95 px-3 py-1.5 rounded-full transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" /> เพิ่มสีใหม่
                    </button>
                  </div>
                </div>
                
                <div className="grid gap-3">
                  {variant.colors.map((color, cIndex) => {
                    const previewImg = color.imageUrl || resolveProductImage(currentBrand, form.model || '', color.colorName, '', form.category);
                    const colorHex = getColorHex(color.colorName);

                    return (
                      <div key={color.id} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-gray-50 dark:bg-zinc-800/50/70 p-3 rounded-lg border border-gray-200 dark:border-zinc-700">
                        {/* Image Thumbnail & Quick Picker */}
                        <div className="flex flex-col gap-2 shrink-0">
                          <label className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-zinc-400 cursor-pointer mb-1 self-start">
                            <input
                              type="checkbox"
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3 h-3"
                              checked={color.imageUrl !== null}
                              onChange={(e) => {
                                const newV = [...form.variants!];
                                newV[vIndex].colors[cIndex].imageUrl = e.target.checked ? '' : null;
                                setForm({...form, variants: newV});
                              }}
                            />
                            แสดงรูปภาพสินค้า
                          </label>
                          
                          {color.imageUrl !== null ? (
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-20 h-20 bg-white dark:bg-zinc-900 border border-gray-300 rounded-lg flex items-center justify-center relative overflow-hidden group cursor-pointer shadow-2xs"
                                onClick={() => openImagePicker(vIndex, cIndex)}
                                title="คลิกเพื่อค้นหารูปตามรุ่นและสีจริงจาก Google / Web"
                              >
                                {uploadingImage?.vIndex === vIndex && uploadingImage?.cIndex === cIndex ? (
                                  <div className="absolute inset-0 bg-white dark:bg-zinc-900/80 z-10 flex flex-col items-center justify-center">
                                    <Loader2 className="w-5 h-5 animate-spin text-blue-500 mb-1" />
                                    <span className="text-[9px] text-blue-600 font-medium">กำลังอัปโหลด...</span>
                                  </div>
                                ) : null}
                                <img src={previewImg} alt={color.colorName} className="object-contain w-full h-full p-1" />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[10px] font-medium text-center px-1">
                                  <Search className="w-4 h-4 mb-0.5 text-blue-300" />
                                  <span>ค้นหารูป Google</span>
                                </div>
                              </div>

                              <div className="flex flex-col gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => openImagePicker(vIndex, cIndex)}
                                  className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 border border-zinc-200 dark:border-zinc-700/80 px-2.5 py-1 rounded-full shadow-2xs active:scale-95 transition-all flex items-center justify-center gap-1 cursor-pointer"
                                >
                                  <Search className="w-3 h-3 text-zinc-500 dark:text-zinc-400" /> ค้นหารูป Google
                                </button>
                                <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 px-2.5 py-1 rounded-full shadow-2xs active:scale-95 transition-all flex items-center justify-center gap-1 cursor-pointer">
                                  <UploadCloud className="w-3 h-3 text-zinc-400" /> อัปโหลดไฟล์
                                  <input 
                                    type="file" 
                                    accept="image/*" 
                                    onChange={(e) => handleImageUpload(e, vIndex, cIndex)} 
                                    className="hidden" 
                                  />
                                </label>
                                <div className="flex gap-1.5 mt-0.5">
                                  <button
                                    type="button"
                                    onClick={() => setActiveCameraPicker({ vIndex, cIndex })}
                                    className="flex-1 text-[10px] font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 border border-zinc-200 dark:border-zinc-700/80 px-2 py-1 rounded-full shadow-2xs active:scale-95 transition-all flex items-center justify-center gap-1 cursor-pointer"
                                    title="ถ่ายรูปสินค้าด้วยกล้องมือถือ/แท็บเล็ต"
                                  >
                                    <CameraIcon className="w-3 h-3 text-zinc-500 dark:text-zinc-400" /> ถ่ายรูป
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setActivePlaceholderPicker({ vIndex, cIndex })}
                                    className="flex-1 text-[10px] font-semibold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 px-2 py-1 rounded-full shadow-2xs active:scale-95 transition-all flex items-center justify-center gap-1 cursor-pointer"
                                    title="สร้างภาพจำลองสินค้า"
                                  >
                                    <LayoutTemplate className="w-3 h-3 text-indigo-500" /> สร้าง
                                  </button>
                                </div>
                                <div className="flex mt-0.5">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveBackground(vIndex, cIndex, previewImg)}
                                    disabled={uploadingImage?.vIndex === vIndex && uploadingImage?.cIndex === cIndex}
                                    className="flex-1 text-[10px] font-semibold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 border border-purple-200/80 px-2 py-1 rounded-full shadow-2xs active:scale-95 transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                                    title="ลบพื้นหลังด้วย AI"
                                  >
                                    <Sparkles className="w-3 h-3 text-purple-500" /> ลบพื้นหลัง (AI)
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="w-[200px] h-20 bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 border-dashed rounded-lg flex items-center justify-center text-[11px] text-gray-400 italic">
                              ซ่อนรูปภาพสินค้าสำหรับสีนี้
                            </div>
                          )}
                        </div>
                        
                        {/* Fields */}
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
                          <div>
                            <div className="flex items-center justify-between">
                              <label className="block text-xs font-medium text-gray-500 dark:text-zinc-400">ชื่อสี</label>
                              <span 
                                className="w-3 h-3 rounded-full border border-gray-300"
                                style={{ backgroundColor: colorHex }}
                                title={colorHex}
                              />
                            </div>
                            <input 
                              type="text" required placeholder="เช่น Black, Blue, ไทเทเนียม"
                              value={color.colorName} onChange={e => {
                                const newV = [...form.variants!]; newV[vIndex].colors[cIndex].colorName = e.target.value; setForm({...form, variants: newV});
                              }}
                              className="mt-1 block w-full border-gray-300 rounded-md shadow-2xs sm:text-sm py-1.5 px-3 border bg-white dark:bg-zinc-900" 
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500 dark:text-zinc-400">ITEM CODE</label>
                            <input type="text" required placeholder="เช่น IP15-128-BLK"
                              value={color.sku} onChange={e => {
                                const newV = [...form.variants!]; newV[vIndex].colors[cIndex].sku = e.target.value; setForm({...form, variants: newV});
                              }}
                              className="mt-1 block w-full border-gray-300 rounded-md shadow-2xs sm:text-sm py-1.5 px-3 border bg-white dark:bg-zinc-900" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500 dark:text-zinc-400">จำนวน Stock</label>
                            <input type="number" required min="0"
                              value={color.stock} onChange={e => {
                                const newV = [...form.variants!]; newV[vIndex].colors[cIndex].stock = Number(e.target.value); setForm({...form, variants: newV});
                              }}
                              className="mt-1 block w-full border-gray-300 rounded-md shadow-2xs sm:text-sm py-1.5 px-3 border bg-white dark:bg-zinc-900" />
                          </div>
                        </div>
                        
                        {variant.colors.length > 1 && (
                          <button type="button" onClick={() => {
                            const newV = [...form.variants!]; newV[vIndex].colors = newV[vIndex].colors.filter((_, i) => i !== cIndex); setForm({...form, variants: newV});
                          }} className="p-2 text-red-500 hover:bg-red-50 rounded-md self-center cursor-pointer">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="fixed bottom-0 left-64 right-0 bg-white dark:bg-zinc-900/95 backdrop-blur-md border-t border-zinc-200 dark:border-zinc-700/80 p-4 px-8 flex justify-end gap-3 z-40">
          <button 
            type="button" 
            onClick={() => navigate('/admin/products')} 
            className="px-5 py-2 rounded-full text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:text-white bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 active:scale-95 transition-all cursor-pointer"
          >
            ยกเลิก
          </button>
          <button 
            type="submit" 
            disabled={loading} 
            className="px-6 py-2 rounded-full text-xs font-bold text-white bg-zinc-900 hover:bg-zinc-800 shadow-md shadow-zinc-900/15 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          >
            {loading ? 'กำลังบันทึก...' : 'บันทึกสินค้า'}
          </button>
        </div>
      </form>

      {/* Auto-Image Picker Modal (Google / Web Search Style) */}
      {activeImagePicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-gray-200 dark:border-zinc-700 overflow-hidden animate-in fade-in zoom-in duration-200">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-gray-200 dark:border-zinc-700 bg-gradient-to-r from-blue-50/60 via-indigo-50/30 to-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    ค้นหารูปภาพตามรุ่นและสี (Google / Web Search)
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-zinc-400 mt-0.5">
                    <span>แบรนด์ & รุ่น: <strong className="text-gray-900 dark:text-white">{currentBrand} {form.model || 'ไม่ได้ระบุ'}</strong></span>
                    {activeColor?.colorName && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          สี: 
                          <span 
                            className="w-2.5 h-2.5 rounded-full border border-gray-300 inline-block ml-0.5" 
                            style={{ backgroundColor: getColorHex(activeColor.colorName) }}
                          />
                          <strong className="text-blue-700">{activeColor.colorName}</strong>
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <button 
                type="button"
                onClick={() => setActiveImagePicker(null)} 
                className="p-2 text-gray-400 hover:text-gray-700 dark:text-zinc-300 rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-700 dark:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800/50/80 px-4 pt-2 gap-2 text-xs sm:text-sm font-medium">
              <button
                type="button"
                onClick={() => setPickerTab('google')}
                className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                  pickerTab === 'google'
                    ? 'border-blue-600 text-blue-600 font-bold'
                    : 'border-transparent text-gray-500 dark:text-zinc-400 hover:text-gray-800 dark:text-zinc-100'
                }`}
              >
                <Search className="w-4 h-4 text-blue-600" />
                ค้นหาจาก Google / Web
                {webImageResults.length > 0 && (
                  <span className="ml-1 text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.2 rounded-full">
                    {webImageResults.length}
                  </span>
                )}
              </button>
              
              <button
                type="button"
                onClick={() => setPickerTab('presets')}
                className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                  pickerTab === 'presets'
                    ? 'border-blue-600 text-blue-600 font-bold'
                    : 'border-transparent text-gray-500 dark:text-zinc-400 hover:text-gray-800 dark:text-zinc-100'
                }`}
              >
                <Sparkles className="w-4 h-4 text-amber-500" />
                คลังภาพมาตรฐาน ({suggestedImagesList.length})
              </button>

              <button
                type="button"
                onClick={() => setPickerTab('custom')}
                className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                  pickerTab === 'custom'
                    ? 'border-blue-600 text-blue-600 font-bold'
                    : 'border-transparent text-gray-500 dark:text-zinc-400 hover:text-gray-800 dark:text-zinc-100'
                }`}
              >
                <ExternalLink className="w-4 h-4" />
                ใส่ลิงก์ภาพเอง (URL)
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {pickerTab === 'google' && (
                <div className="space-y-4">
                  {/* Google-like Search Bar */}
                  <div className="space-y-2">
                    <form 
                      onSubmit={(e) => { e.preventDefault(); fetchWebImages(); }}
                      className="flex gap-2"
                    >
                      <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                          <Search className="w-4 h-4 text-blue-500" />
                        </div>
                        <input
                          type="text"
                          value={webSearchQuery}
                          onChange={(e) => setWebSearchQuery(e.target.value)}
                          placeholder="พิมพ์รุ่น และสี เพื่อค้นหา เช่น iPhone 15 Blue official png"
                          className="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-zinc-900 border border-gray-300 rounded-xl text-xs sm:text-sm text-gray-900 dark:text-white placeholder:text-gray-400 shadow-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-hidden transition-all"
                        />
                        {webSearchQuery && (
                          <button
                            type="button"
                            onClick={() => setWebSearchQuery('')}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:text-zinc-400"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <button
                        type="submit"
                        disabled={searchingWebImages || !webSearchQuery.trim()}
                        className="px-4 sm:px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white text-xs sm:text-sm font-semibold rounded-xl transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
                      >
                        {searchingWebImages ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Search className="w-4 h-4" />
                        )}
                        <span>{searchingWebImages ? 'กำลังค้นหา...' : 'ค้นหารูปภาพ'}</span>
                      </button>
                    </form>

                    {/* Fast Filter Tags */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      <span className="text-[11px] text-gray-400 font-medium mr-1">คำค้นแนะนำ:</span>
                      {[
                        `${activeColor?.colorName || ''} official`,
                        'ตัดพื้นหลัง png',
                        'front and back',
                        'studio shot',
                        'press render'
                      ].map((tag, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            const newQ = `${currentBrand} ${form.model || ''} ${activeColor?.colorName || ''} ${tag}`.trim();
                            setWebSearchQuery(newQ);
                            fetchWebImages(newQ);
                          }}
                          className="text-[11px] bg-gray-100 dark:bg-zinc-800 hover:bg-blue-50 hover:text-blue-700 text-gray-600 dark:text-zinc-400 px-2.5 py-1 rounded-lg border border-gray-200 dark:border-zinc-700 transition-colors cursor-pointer"
                        >
                          + {tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Results Gallery */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-semibold text-gray-700 dark:text-zinc-300 uppercase tracking-wider">
                        ผลการค้นหารูปภาพจริงตรงรุ่น & สี (คลิกเลือกได้ทันที):
                      </label>
                      {webImageResults.length > 0 && (
                        <span className="text-xs text-gray-500 dark:text-zinc-400">พบ {webImageResults.length} ภาพ</span>
                      )}
                    </div>

                    {searchingWebImages ? (
                      <div className="py-16 text-center space-y-3">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
                        <p className="text-sm font-medium text-gray-600 dark:text-zinc-400">กำลังค้นหารูปภาพตรงรุ่นและสีจาก Google / Web...</p>
                        <p className="text-xs text-gray-400">ระบบกำลังดึงภาพตัวเครื่องความละเอียดสูงและภาพทางการประจำรุ่น</p>
                      </div>
                    ) : webImageResults.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[50vh] overflow-y-auto p-1">
                        {webImageResults.map((item, idx) => (
                          <div
                            key={idx}
                            onClick={() => handleSelectSuggestedImage(item.imageUrl)}
                            className="group relative border border-gray-200 dark:border-zinc-700 hover:border-blue-500 hover:ring-2 hover:ring-blue-100 rounded-xl p-2 bg-white dark:bg-zinc-900 flex flex-col items-center justify-between cursor-pointer transition-all shadow-2xs hover:shadow-md"
                          >
                            <div className="w-full h-32 flex items-center justify-center overflow-hidden mb-2 bg-[#fcfcfc] rounded-lg p-1">
                              <img 
                                src={item.thumbnailUrl || item.imageUrl} 
                                alt={item.title} 
                                className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300 select-none" 
                                loading="lazy"
                              />
                            </div>
                            
                            <div className="w-full text-left space-y-0.5">
                              <p className="text-[11px] text-gray-800 dark:text-zinc-100 font-medium line-clamp-1 group-hover:text-blue-600">
                                {item.title || `${currentBrand} ${form.model}`}
                              </p>
                              <div className="flex items-center justify-between text-[9px] text-gray-400">
                                <span>{item.source || 'web'}</span>
                                {item.width && item.height && <span>{item.width}×{item.height}</span>}
                              </div>
                            </div>

                            {/* Select Overlay on hover */}
                            <div className="absolute inset-0 bg-blue-600/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                              <span className="bg-blue-600 text-white text-[11px] font-semibold px-3 py-1 rounded-full shadow-md flex items-center gap-1">
                                <Check className="w-3.5 h-3.5" /> เลือกภาพนี้
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-12 text-center border-2 border-dashed border-gray-200 dark:border-zinc-700 rounded-xl space-y-3">
                        <Search className="w-8 h-8 text-gray-300 mx-auto" />
                        <p className="text-sm font-medium text-gray-600 dark:text-zinc-400">ไม่พบรูปภาพจากคำค้นนี้</p>
                        <p className="text-xs text-gray-400 max-w-sm mx-auto">
                          ลองเปลี่ยนคำค้นหาให้สั้นลง เช่น &quot;{form.model} {activeColor?.colorName}&quot; หรือเลือกภาพจากแท็บคลังภาพมาตรฐาน
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            const fallbackQuery = `${form.model || ''} phone`.trim();
                            setWebSearchQuery(fallbackQuery);
                            fetchWebImages(fallbackQuery);
                          }}
                          className="text-xs text-blue-600 font-semibold hover:underline"
                        >
                          ค้นหาด้วย &quot;{form.model} phone&quot;
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {pickerTab === 'presets' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-gray-700 dark:text-zinc-300 uppercase tracking-wider">
                      รูปภาพมาตรฐานประจำรุ่นที่แนะนำ:
                    </label>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[50vh] overflow-y-auto p-1">
                    {suggestedImagesList.map((item, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleSelectSuggestedImage(item.url)}
                        className="group border border-gray-200 dark:border-zinc-700 hover:border-blue-500 hover:ring-2 hover:ring-blue-100 rounded-xl p-2 bg-gray-50 dark:bg-zinc-800/50 flex flex-col items-center justify-between cursor-pointer transition-all hover:shadow-md"
                      >
                        <div className="w-full h-28 flex items-center justify-center overflow-hidden mb-2 bg-white dark:bg-zinc-900 rounded-lg p-1">
                          <img src={item.url} alt={item.label} className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform" />
                        </div>
                        <span className="text-[11px] text-gray-700 dark:text-zinc-300 font-medium text-center line-clamp-1 group-hover:text-blue-600">
                          {item.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {pickerTab === 'custom' && (
                <div className="space-y-4 py-2">
                  <div className="bg-gray-50 dark:bg-zinc-800/50 p-4 rounded-xl border border-gray-200 dark:border-zinc-700 space-y-3">
                    <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 uppercase tracking-wider">
                      ใส่ลิงก์รูปภาพโดยตรง (Direct Image URL):
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        placeholder="https://example.com/phone-black.jpg"
                        value={customUrlInput}
                        onChange={(e) => setCustomUrlInput(e.target.value)}
                        className="flex-1 text-xs sm:text-sm border border-gray-300 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white dark:bg-zinc-900"
                      />
                      <button
                        type="button"
                        disabled={!customUrlInput.trim()}
                        onClick={() => handleSelectSuggestedImage(customUrlInput.trim())}
                        className="px-5 py-2.5 bg-gray-900 text-white text-xs sm:text-sm font-semibold rounded-xl hover:bg-gray-800 disabled:opacity-40 transition-colors cursor-pointer"
                      >
                        ใช้รูปนี้
                      </button>
                    </div>

                    {customUrlInput.trim() && (
                      <div className="mt-3 p-3 bg-white dark:bg-zinc-900 rounded-lg border border-gray-200 dark:border-zinc-700 flex items-center gap-3">
                        <img 
                          src={customUrlInput.trim()} 
                          alt="Preview" 
                          className="w-16 h-16 object-contain border border-gray-200 dark:border-zinc-700 rounded-md p-1 bg-gray-50 dark:bg-zinc-800/50"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                        <span className="text-xs text-gray-500 dark:text-zinc-400">ตัวอย่างรูปภาพจากลิงก์ที่กรอก</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800/50 flex items-center justify-between">
              <span className="text-xs text-gray-500 dark:text-zinc-400 hidden sm:inline">
                เคล็ดลับ: สามารถคลิกที่รูปภาพใดก็ได้เพื่อนำไปใช้ทันที
              </span>
              <div className="flex gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => setActiveImagePicker(null)}
                  className="px-5 py-2 border border-gray-300 text-xs font-semibold text-gray-700 dark:text-zinc-300 rounded-xl hover:bg-white dark:bg-zinc-900 transition-colors cursor-pointer"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Toast Notifications (e.g. Margin alerts) */}
      <AdminToast 
        toasts={toasts} 
        onDismiss={(toastId) => setToasts(prev => prev.filter(t => t.id !== toastId))} 
      />

      {/* Camera Capture Modal */}
      <CameraCaptureModal
        isOpen={activeCameraPicker !== null}
        onClose={() => setActiveCameraPicker(null)}
        title="ถ่ายรูปสินค้าจริง"
        subtitle={`ถ่ายรูปเครื่อง ${currentBrand} ${form.model || ''}`}
        onCapture={async (dataUrl) => {
          if (activeCameraPicker) {
            try {
              setLoading(true);
              const res = await api.uploadBase64Image(dataUrl);
              const newVariants = [...(form.variants || [])];
              newVariants[activeCameraPicker.vIndex].colors[activeCameraPicker.cIndex].imageUrl = res.url;
              setForm({ ...form, variants: newVariants });
              setActiveCameraPicker(null);
            } catch (err) {
              console.error("Camera upload failed", err);
              alert("อัปโหลดรูปจากกล้องไม่สำเร็จ กรุณาลองใหม่");
            } finally {
              setLoading(false);
            }
          }
        }}
      />

      {/* Placeholder Generator Modal */}
      <PlaceholderGeneratorModal
        isOpen={activePlaceholderPicker !== null}
        onClose={() => setActivePlaceholderPicker(null)}
        initialBrand={currentBrand}
        initialModel={form.model}
        initialCategory={form.category}
        initialColorName={activePlaceholderPicker ? form.variants?.[activePlaceholderPicker.vIndex]?.colors?.[activePlaceholderPicker.cIndex]?.colorName : ''}
        onSelectImage={async (dataUrl) => {
          if (activePlaceholderPicker) {
            try {
              setLoading(true);
              const res = await api.uploadBase64Image(dataUrl);
              const newVariants = [...(form.variants || [])];
              newVariants[activePlaceholderPicker.vIndex].colors[activePlaceholderPicker.cIndex].imageUrl = res.url;
              setForm({ ...form, variants: newVariants });
              setActivePlaceholderPicker(null);
            } catch (err) {
              console.error("Generated image upload failed", err);
              alert("อัปโหลดรูปภาพที่สร้างไม่สำเร็จ กรุณาลองใหม่");
            } finally {
              setLoading(false);
            }
          }
        }}
      />
    </div>
  );
}
