'use client';

import { useState, useEffect } from 'react';
import { addressAPI, Province, District, Ward } from '@/lib/addressApi';

interface AddressSelectorProps {
  onAddressChange: (address: {
    street: string;
    ward: string;
    wardCode: number;
    district: string;
    districtCode: number;
    province: string;
    provinceCode: number;
    fullAddress: string;
  }) => void;
  initialStreet?: string;
  initialProvince?: number;
  initialDistrict?: number;
  initialWard?: number;
  required?: boolean;
}

export default function AddressSelector({
  onAddressChange,
  initialStreet = '',
  initialProvince,
  initialDistrict,
  initialWard,
  required = false,
}: AddressSelectorProps) {
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);

  const [selectedProvince, setSelectedProvince] = useState<number | null>(initialProvince || null);
  const [selectedDistrict, setSelectedDistrict] = useState<number | null>(initialDistrict || null);
  const [selectedWard, setSelectedWard] = useState<number | null>(initialWard || null);
  const [street, setStreet] = useState(initialStreet);

  const [loading, setLoading] = useState(false);

  // Load provinces on mount
  useEffect(() => {
    loadProvinces();
  }, []);

  // Load districts when province changes
  useEffect(() => {
    if (selectedProvince) {
      loadDistricts(selectedProvince);
    } else {
      setDistricts([]);
      setSelectedDistrict(null);
    }
  }, [selectedProvince]);

  // Load wards when district changes
  useEffect(() => {
    if (selectedDistrict) {
      loadWards(selectedDistrict);
    } else {
      setWards([]);
      setSelectedWard(null);
    }
  }, [selectedDistrict]);

  // Notify parent when address changes
  useEffect(() => {
    if (selectedProvince && selectedDistrict && selectedWard) {
      const province = provinces.find(p => p.code === selectedProvince);
      const district = districts.find(d => d.code === selectedDistrict);
      const ward = wards.find(w => w.code === selectedWard);

      if (province && district && ward) {
        const fullAddress = addressAPI.formatAddress(
          street,
          ward.name,
          district.name,
          province.name
        );

        onAddressChange({
          street,
          ward: ward.name,
          wardCode: ward.code,
          district: district.name,
          districtCode: district.code,
          province: province.name,
          provinceCode: province.code,
          fullAddress,
        });
      }
    }
  }, [street, selectedProvince, selectedDistrict, selectedWard]);

  const loadProvinces = async () => {
    setLoading(true);
    const data = await addressAPI.getProvinces();
    setProvinces(data);
    setLoading(false);
  };

  const loadDistricts = async (provinceCode: number) => {
    setLoading(true);
    const data = await addressAPI.getDistricts(provinceCode);
    setDistricts(data);
    setLoading(false);
  };

  const loadWards = async (districtCode: number) => {
    setLoading(true);
    const data = await addressAPI.getWards(districtCode);
    setWards(data);
    setLoading(false);
  };

  const handleProvinceChange = (code: string) => {
    const provinceCode = code ? parseInt(code) : null;
    setSelectedProvince(provinceCode);
    setSelectedDistrict(null);
    setSelectedWard(null);
    setDistricts([]);
    setWards([]);
  };

  const handleDistrictChange = (code: string) => {
    const districtCode = code ? parseInt(code) : null;
    setSelectedDistrict(districtCode);
    setSelectedWard(null);
    setWards([]);
  };

  const handleWardChange = (code: string) => {
    const wardCode = code ? parseInt(code) : null;
    setSelectedWard(wardCode);
  };

  return (
    <div className="space-y-4">
      {/* Tỉnh/Thành phố */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
          <span>Tỉnh/Thành phố</span>
          {required && <span className="text-red-500">*</span>}
        </label>
        <div className="relative group">
          <select
            value={selectedProvince || ''}
            onChange={(e) => handleProvinceChange(e.target.value)}
            required={required}
            disabled={loading}
            className="w-full pl-4 pr-10 py-3 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 dark:text-white appearance-none"
          >
            <option value="">-- Chọn Tỉnh/Thành phố --</option>
            {provinces.map((province) => (
              <option key={province.code} value={province.code} className="text-gray-900 bg-white dark:bg-gray-800">
                {province.name}
              </option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {/* Quận/Huyện */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
          <span>Quận/Huyện</span>
          {required && <span className="text-red-500">*</span>}
        </label>
        <div className="relative group">
          <select
            value={selectedDistrict || ''}
            onChange={(e) => handleDistrictChange(e.target.value)}
            required={required}
            disabled={!selectedProvince || loading}
            className="w-full pl-4 pr-10 py-3 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 dark:text-white appearance-none"
          >
            <option value="">-- Chọn Quận/Huyện --</option>
            {districts.map((district) => (
              <option key={district.code} value={district.code} className="text-gray-900 bg-white dark:bg-gray-800">
                {district.name}
              </option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {/* Phường/Xã */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
          <span>Phường/Xã</span>
          {required && <span className="text-red-500">*</span>}
        </label>
        <div className="relative group">
          <select
            value={selectedWard || ''}
            onChange={(e) => handleWardChange(e.target.value)}
            required={required}
            disabled={!selectedDistrict || loading}
            className="w-full pl-4 pr-10 py-3 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 dark:text-white appearance-none"
          >
            <option value="">-- Chọn Phường/Xã --</option>
            {wards.map((ward) => (
              <option key={ward.code} value={ward.code} className="text-gray-900 bg-white dark:bg-gray-800">
                {ward.name}
              </option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {/* Địa chỉ cụ thể */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
          <span>Số nhà, tên đường</span>
          {required && <span className="text-red-500">*</span>}
        </label>
        <input
          type="text"
          value={street}
          onChange={(e) => setStreet(e.target.value)}
          placeholder="Ví dụ: 123 Nguyễn Trãi"
          required={required}
          className="w-full px-4 py-3 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
        />
      </div>

      {/* Preview địa chỉ đầy đủ */}
      {street && selectedProvince && selectedDistrict && selectedWard && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-200 dark:border-blue-500/20">
          <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">Địa chỉ đầy đủ:</p>
          <p className="text-sm text-gray-800 dark:text-gray-200">
            {street}, {wards.find(w => w.code === selectedWard)?.name}, {districts.find(d => d.code === selectedDistrict)?.name}, {provinces.find(p => p.code === selectedProvince)?.name}
          </p>
        </div>
      )}
    </div>
  );
}
