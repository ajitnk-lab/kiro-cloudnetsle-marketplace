import React, { useState } from 'react';
import { countries } from '../config/countries';
import { indianStates } from '../config/indianStates';
import { validateGSTIN } from '../utils/gstinValidator';

interface BillingInfo {
  billingCountry: string;
  billingAddress: string;
  billingCity: string;
  billingState: string;
  billingPostalCode: string;
  isBusinessPurchase: boolean;
  gstin?: string;
  companyName?: string;
  phoneCountryCode?: string;
  phoneNumber?: string;
}

interface Props {
  onSubmit: (billingInfo: BillingInfo) => void;
  onBack?: () => void;
  initialData?: BillingInfo;
  detectedCountry?: string;
}

export const BillingInformationForm: React.FC<Props> = ({ onSubmit, onBack, initialData, detectedCountry }) => {
  const [formData, setFormData] = useState<BillingInfo>(initialData || {
    billingCountry: detectedCountry || 'IN',
    billingAddress: '',
    billingCity: '',
    billingState: '',
    billingPostalCode: '',
    isBusinessPurchase: false,
    phoneCountryCode: '+91',
    phoneNumber: '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof BillingInfo, string>>>({});

  // Auto-update phone country code when billing country changes
  const handleCountryChange = (countryCode: string) => {
    const country = countries.find(c => c.code === countryCode);
    setFormData({ 
      ...formData, 
      billingCountry: countryCode,
      phoneCountryCode: country?.phoneCode || formData.phoneCountryCode
    });
  };

  const validate = () => {
    const newErrors: Partial<Record<keyof BillingInfo, string>> = {};

    if (!formData.billingCountry) newErrors.billingCountry = 'Country is required';
    if (!formData.billingAddress?.trim()) newErrors.billingAddress = 'Address is required';
    if (formData.billingAddress && formData.billingAddress.length < 10) {
      newErrors.billingAddress = 'Address must be at least 10 characters';
    }
    if (!formData.billingCity?.trim()) newErrors.billingCity = 'City is required';
    if (!formData.billingState?.trim()) newErrors.billingState = 'State is required';
    if (!formData.billingPostalCode?.trim()) newErrors.billingPostalCode = 'Postal code is required';
    
    // Postal code validation
    if (formData.billingPostalCode) {
      if (formData.billingCountry === 'IN' && !/^\d{6}$/.test(formData.billingPostalCode)) {
        newErrors.billingPostalCode = 'Indian postal code must be 6 digits';
      } else if (['US', 'CA'].includes(formData.billingCountry) && !/^\d{5}(-\d{4})?$/.test(formData.billingPostalCode)) {
        newErrors.billingPostalCode = 'Invalid postal code format';
      } else if (formData.billingCountry === 'GB' && !/^[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}$/i.test(formData.billingPostalCode)) {
        newErrors.billingPostalCode = 'Invalid UK postcode format';
      } else if (formData.billingPostalCode.length < 3) {
        newErrors.billingPostalCode = 'Invalid postal code';
      }
    }
    
    // Phone validation
    if (!formData.phoneNumber?.trim()) {
      newErrors.phoneNumber = 'Phone number is required';
    } else if (!/^\d{7,15}$/.test(formData.phoneNumber.replace(/[\s-]/g, ''))) {
      newErrors.phoneNumber = 'Phone number must be 7-15 digits';
    }

    if (formData.isBusinessPurchase && formData.billingCountry === 'IN' && formData.gstin) {
      if (!validateGSTIN(formData.gstin)) {
        newErrors.gstin = 'Invalid GSTIN format';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-lg font-semibold">Billing Information</h3>

      <div>
        <label className="block text-sm font-medium mb-1">Country *</label>
        <select
          value={formData.billingCountry}
          onChange={(e) => handleCountryChange(e.target.value)}
          className="w-full p-2 border rounded"
        >
          {countries.map((c) => (
            <option key={c.code} value={c.code}>{c.name}</option>
          ))}
        </select>
        {detectedCountry && detectedCountry !== 'IN' && (
          <p className="text-xs text-blue-600 mt-1">
            ℹ️ Auto-detected: {countries.find(c => c.code === detectedCountry)?.name || detectedCountry}
          </p>
        )}
        {errors.billingCountry && <p className="text-red-500 text-sm">{errors.billingCountry}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Address *</label>
        <input
          type="text"
          value={formData.billingAddress}
          onChange={(e) => setFormData({ ...formData, billingAddress: e.target.value })}
          className="w-full p-2 border rounded"
        />
        {errors.billingAddress && <p className="text-red-500 text-sm">{errors.billingAddress}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">City *</label>
          <input
            type="text"
            value={formData.billingCity}
            onChange={(e) => setFormData({ ...formData, billingCity: e.target.value })}
            className="w-full p-2 border rounded"
          />
          {errors.billingCity && <p className="text-red-500 text-sm">{errors.billingCity}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">State/Province *</label>
          {formData.billingCountry === 'IN' ? (
            <select
              value={formData.billingState}
              onChange={(e) => setFormData({ ...formData, billingState: e.target.value })}
              className="w-full p-2 border rounded"
            >
              <option value="">Select State</option>
              {indianStates.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={formData.billingState}
              onChange={(e) => setFormData({ ...formData, billingState: e.target.value })}
              placeholder="State/Province/Region"
              className="w-full p-2 border rounded"
            />
          )}
          {errors.billingState && <p className="text-red-500 text-sm">{errors.billingState}</p>}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Postal Code *</label>
        <input
          type="text"
          value={formData.billingPostalCode}
          onChange={(e) => setFormData({ ...formData, billingPostalCode: e.target.value })}
          className="w-full p-2 border rounded"
        />
        {errors.billingPostalCode && <p className="text-red-500 text-sm">{errors.billingPostalCode}</p>}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Country Code *</label>
          <select
            value={formData.phoneCountryCode}
            onChange={(e) => setFormData({ ...formData, phoneCountryCode: e.target.value })}
            className="w-full p-2 border rounded"
          >
            {countries.map((c) => (
              <option key={c.phoneCode} value={c.phoneCode}>
                {c.phoneCode} ({c.code})
              </option>
            ))}
          </select>
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium mb-1">Phone Number *</label>
          <input
            type="tel"
            value={formData.phoneNumber}
            onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
            placeholder="9876543210"
            className="w-full p-2 border rounded"
          />
          {errors.phoneNumber && <p className="text-red-500 text-sm">{errors.phoneNumber}</p>}
        </div>
      </div>

      <div>
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={formData.isBusinessPurchase}
            onChange={(e) => setFormData({ ...formData, isBusinessPurchase: e.target.checked })}
          />
          <span className="text-sm">Buying for business?</span>
        </label>
      </div>

      {formData.isBusinessPurchase && (
        <>
          <div>
            <label className="block text-sm font-medium mb-1">Company Name</label>
            <input
              type="text"
              value={formData.companyName || ''}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              className="w-full p-2 border rounded"
            />
          </div>

          {formData.billingCountry === 'IN' && (
            <div>
              <label className="block text-sm font-medium mb-1">GSTIN (Optional)</label>
              <input
                type="text"
                value={formData.gstin || ''}
                onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                placeholder="29ABCDE1234F1Z5"
                maxLength={15}
                className="w-full p-2 border rounded"
              />
              {errors.gstin && <p className="text-red-500 text-sm">{errors.gstin}</p>}
            </div>
          )}
        </>
      )}

      <div className="flex gap-4">
        {onBack && (
          <button type="button" onClick={onBack} className="px-4 py-2 border rounded">
            Back
          </button>
        )}
        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">
          Continue to Payment
        </button>
      </div>
    </form>
  );
};
