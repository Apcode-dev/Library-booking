import React, { useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import { STANDARD_AMENITIES } from '../../constants/amenities';
import {
  X,
  Building2,
  MapPin,
  Camera,
  Upload,
  Clock,
  IndianRupee,
  Armchair,
  Check,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface MobileBranchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const MobileBranchModal: React.FC<MobileBranchModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [localities, setLocalities] = useState<string[]>([]);

  // 3-Image Showcase URLs (or Data URLs)
  const [bannerImage, setBannerImage] = useState(
    'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=1000'
  );
  const [interiorImage, setInteriorImage] = useState(
    'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=1000'
  );
  const [amenitiesImage, setAmenitiesImage] = useState(
    'https://images.unsplash.com/photo-1517842645767-c639042777db?w=1000'
  );

  // Pricing & Schedule
  const [hourlyRate, setHourlyRate] = useState('40');
  const [monthlyRate, setMonthlyRate] = useState('1200');
  const [yearlyRate, setYearlyRate] = useState('12000');
  const [openingTime, setOpeningTime] = useState('07:00');
  const [closingTime, setClosingTime] = useState('23:00');

  // Desk Allocations
  const [hourlySeats, setHourlySeats] = useState('10');
  const [monthlySeats, setMonthlySeats] = useState('5');
  const [yearlySeats, setYearlySeats] = useState('5');

  // Facilities
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>([
    'Air Conditioned',
    'High-Speed WiFi',
    'Power Sockets',
    'Silent Study Zone',
  ]);

  if (!isOpen) return null;

  // Handle Postal Pincode Auto-Lookup
  const handlePincodeChange = async (val: string) => {
    setPincode(val);
    if (val.trim().length === 6) {
      setPincodeLoading(true);
      try {
        const response = await fetch(`https://api.postalpincode.in/pincode/${val.trim()}`);
        const data = await response.json();
        if (data && data[0]?.Status === 'Success' && data[0].PostOffice?.length > 0) {
          const po = data[0].PostOffice[0];
          setCity(po.District || po.Block || '');
          setDistrict(po.District || '');
          setState(po.State || '');
          const places = data[0].PostOffice.map((p: any) => p.Name).slice(0, 10);
          setLocalities(places);
          toast.success(`Location identified: ${po.District}, ${po.State} 📍`);
        }
      } catch (_) {
      } finally {
        setPincodeLoading(false);
      }
    }
  };

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    target: 'banner' | 'interior' | 'amenities'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size exceeds 5MB limit. Please choose a smaller image.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (target === 'banner') setBannerImage(dataUrl);
      else if (target === 'interior') setInteriorImage(dataUrl);
      else if (target === 'amenities') setAmenitiesImage(dataUrl);
      toast.success('Photo uploaded successfully! 📸');
    };
    reader.readAsDataURL(file);
  };

  const toggleFacility = (facility: string) => {
    setSelectedFacilities((prev) =>
      prev.includes(facility) ? prev.filter((f) => f !== facility) : [...prev, facility]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await api.post('/owner/libraries', {
        name: name.trim(),
        tagline: tagline.trim() || undefined,
        address: address.trim(),
        city: city.trim(),
        district: district.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
        latitude: 26.8467,
        longitude: 80.9462,
        photos: [bannerImage, interiorImage, amenitiesImage],
        bannerImage,
        interiorImage,
        amenitiesImage,
        hourlyRate: parseFloat(hourlyRate) || 40,
        enableMembership: true,
        enableMonthly: true,
        monthlyRate: parseFloat(monthlyRate) || 1200,
        enableYearly: true,
        yearlyRate: parseFloat(yearlyRate) || 12000,
        hourlySeats: parseInt(hourlySeats) || 10,
        monthlySeats: parseInt(monthlySeats) || 5,
        yearlySeats: parseInt(yearlySeats) || 5,
        openingTime,
        closingTime,
        facilities: selectedFacilities,
      });

      if (res.data.success) {
        toast.success('Library branch submitted for verification! 🏢');
        onSuccess();
        onClose();
      } else {
        toast.error(res.data.message || 'Failed to list library.');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error submitting library branch.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[94vh] flex flex-col">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Building2 className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-extrabold text-white">Add Library Branch</h3>
              <p className="text-[10px] text-slate-400">Step {step} of 3 • Max 5 branches</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* STEP 1: Basic Information & Pincode Lookup */}
          {step === 1 && (
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Library Branch Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Study Hub"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Tagline / Catchphrase
                </label>
                <input
                  type="text"
                  placeholder="e.g. Quiet Air-Conditioned Academic Center"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Pincode (Auto-Lookup) *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      maxLength={6}
                      placeholder="226001"
                      value={pincode}
                      onChange={(e) => handlePincodeChange(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-mono placeholder-slate-500 focus:outline-none focus:border-amber-500"
                    />
                    {pincodeLoading && (
                      <span className="absolute right-2.5 top-2.5 w-4 h-4 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin"></span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                    City / District *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Lucknow"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Full Street Address *
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="Building, street, landmark, area"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                ></textarea>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!name || !pincode || !address) {
                    toast.error('Please fill name, pincode, and address.');
                    return;
                  }
                  setStep(2);
                }}
                className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 transition active:scale-95"
              >
                <span>Continue to Photos & Timings</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* STEP 2: 3-Image Showcase Uploads */}
          {step === 2 && (
            <div className="space-y-3.5">
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[10px] text-slate-400">
                📸 <strong>3-Image Showcase Required:</strong> Upload exterior banner, interior
                study hall, and desk amenities photos (Max 5MB each).
              </div>

              {/* Photo 1: Exterior Banner */}
              <div className="space-y-1">
                <span className="font-bold text-slate-300">1. Exterior Building Banner</span>
                <div className="flex items-center gap-3 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <img
                    src={bannerImage}
                    alt="Banner"
                    className="w-16 h-12 object-cover rounded-lg border border-slate-700"
                  />
                  <label className="cursor-pointer px-3 py-1.5 rounded-lg bg-slate-800 text-white text-[11px] font-bold hover:bg-slate-700 transition flex items-center gap-1">
                    <Upload className="w-3.5 h-3.5 text-amber-400" />
                    <span>Change Banner</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, 'banner')}
                    />
                  </label>
                </div>
              </div>

              {/* Photo 2: Interior Hall */}
              <div className="space-y-1">
                <span className="font-bold text-slate-300">2. Interior Study Hall Layout</span>
                <div className="flex items-center gap-3 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <img
                    src={interiorImage}
                    alt="Interior"
                    className="w-16 h-12 object-cover rounded-lg border border-slate-700"
                  />
                  <label className="cursor-pointer px-3 py-1.5 rounded-lg bg-slate-800 text-white text-[11px] font-bold hover:bg-slate-700 transition flex items-center gap-1">
                    <Upload className="w-3.5 h-3.5 text-amber-400" />
                    <span>Change Hall Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, 'interior')}
                    />
                  </label>
                </div>
              </div>

              {/* Photo 3: Desk Amenities */}
              <div className="space-y-1">
                <span className="font-bold text-slate-300">3. Amenities & Desks</span>
                <div className="flex items-center gap-3 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <img
                    src={amenitiesImage}
                    alt="Amenities"
                    className="w-16 h-12 object-cover rounded-lg border border-slate-700"
                  />
                  <label className="cursor-pointer px-3 py-1.5 rounded-lg bg-slate-800 text-white text-[11px] font-bold hover:bg-slate-700 transition flex items-center gap-1">
                    <Upload className="w-3.5 h-3.5 text-amber-400" />
                    <span>Change Amenities</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, 'amenities')}
                    />
                  </label>
                </div>
              </div>

              {/* Schedule */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Opening Time
                  </label>
                  <input
                    type="time"
                    value={openingTime}
                    onChange={(e) => setOpeningTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Closing Time
                  </label>
                  <input
                    type="time"
                    value={closingTime}
                    onChange={(e) => setClosingTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-1/3 py-2.5 bg-slate-800 text-slate-300 rounded-xl font-bold"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="w-2/3 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold flex items-center justify-center gap-1"
                >
                  <span>Continue to Pricing</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Pricing, Capacity & Facilities */}
          {step === 3 && (
            <div className="space-y-3.5">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">
                    Hourly (₹/hr)
                  </label>
                  <input
                    type="number"
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-white text-center font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">
                    Monthly (₹)
                  </label>
                  <input
                    type="number"
                    value={monthlyRate}
                    onChange={(e) => setMonthlyRate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-white text-center font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">
                    Yearly VIP (₹)
                  </label>
                  <input
                    type="number"
                    value={yearlyRate}
                    onChange={(e) => setYearlyRate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-white text-center font-bold"
                  />
                </div>
              </div>

              {/* Seat Allocations */}
              <div className="space-y-1">
                <span className="font-bold text-slate-300">Desk Category Allocation</span>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-slate-950 p-2 rounded-xl border border-slate-800 text-center">
                    <span className="text-[9px] text-slate-400 block">Hourly Desks</span>
                    <input
                      type="number"
                      value={hourlySeats}
                      onChange={(e) => setHourlySeats(e.target.value)}
                      className="w-full bg-transparent text-center font-black text-white text-sm focus:outline-none"
                    />
                  </div>
                  <div className="bg-slate-950 p-2 rounded-xl border border-slate-800 text-center">
                    <span className="text-[9px] text-slate-400 block">Monthly Desks</span>
                    <input
                      type="number"
                      value={monthlySeats}
                      onChange={(e) => setMonthlySeats(e.target.value)}
                      className="w-full bg-transparent text-center font-black text-white text-sm focus:outline-none"
                    />
                  </div>
                  <div className="bg-slate-950 p-2 rounded-xl border border-slate-800 text-center">
                    <span className="text-[9px] text-slate-400 block">Yearly Desks</span>
                    <input
                      type="number"
                      value={yearlySeats}
                      onChange={(e) => setYearlySeats(e.target.value)}
                      className="w-full bg-transparent text-center font-black text-white text-sm focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Amenities Checklist */}
              <div className="space-y-1.5">
                <span className="font-bold text-slate-300">Facilities Available</span>
                <div className="grid grid-cols-2 gap-1.5 max-h-32 overflow-y-auto">
                  {STANDARD_AMENITIES.map((amenity) => {
                    const isSelected = selectedFacilities.includes(amenity.name);
                    return (
                      <button
                        key={amenity.name}
                        type="button"
                        onClick={() => toggleFacility(amenity.name)}
                        className={`p-2 rounded-xl border text-left text-[11px] font-semibold flex items-center gap-1.5 transition ${
                          isSelected
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : 'bg-slate-950 text-slate-400 border-slate-800'
                        }`}
                      >
                        <span
                          className={`w-3.5 h-3.5 rounded flex items-center justify-center border text-[9px] ${
                            isSelected
                              ? 'bg-amber-500 text-black border-amber-500'
                              : 'border-slate-700'
                          }`}
                        >
                          {isSelected && '✓'}
                        </span>
                        <span className="truncate">{amenity.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="w-1/3 py-3 bg-slate-800 text-slate-300 rounded-xl font-bold"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-2/3 py-3 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white rounded-xl font-bold shadow-lg shadow-amber-950/40 transition active:scale-95 flex items-center justify-center gap-1.5"
                >
                  {loading ? (
                    <span>Submitting Branch...</span>
                  ) : (
                    <>
                      <span>Submit for Verification</span>
                      <Check className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default MobileBranchModal;
