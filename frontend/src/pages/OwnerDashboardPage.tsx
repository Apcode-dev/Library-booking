import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Library } from '../types';
import {
  Building2,
  TrendingUp,
  DollarSign,
  Armchair,
  Plus,
  CheckCircle,
  CheckCircle2,
  Clock,
  XCircle,
  Settings,
  X,
  AlertCircle,
  Calendar,
  Users,
  QrCode,
  Search,
  ShieldCheck,
  Sparkles,
  User as UserIcon,
  Camera,
  Check,
  Crown,
  UserCheck,
  Phone,
  Mail,
  CalendarDays,
  FileText,
  Edit3,
  Loader2,
  Lock,
  Unlock,
  KeyRound,
  ArrowLeft,
  Hash,
  ShieldAlert,
  ChevronRight,
  Eye,
  EyeOff,
  Layers,
  Upload,
} from 'lucide-react';

import AuthModal from '../components/common/AuthModal';
import ProfileModal from '../components/common/ProfileModal';
import QRScannerModal from '../components/scanner/QRScannerModal';
import { STANDARD_AMENITIES } from '../constants/amenities';

// Supported Regions for LibSpace Library Listings
const SUPPORTED_REGIONS = [
  'Uttar Pradesh',
  'Rajasthan',
  'Delhi',
  'Bihar',
  'Maharashtra',
  'Haryana',
];

export const OwnerDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [metrics, setMetrics] = useState<any>(null);
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddLibModalOpen, setIsAddLibModalOpen] = useState(false);

  // New Library Form State
  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [pincodeError, setPincodeError] = useState<string | null>(null);
  const [availableLocalities, setAvailableLocalities] = useState<string[]>([]);
  const [hourlyRate, setHourlyRate] = useState('40');

  // 3-Image Showcase Upload States
  const [bannerImage, setBannerImage] = useState(
    'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=1000&auto=format&fit=crop&q=80'
  );
  const [interiorImage, setInteriorImage] = useState(
    'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=1000&auto=format&fit=crop&q=80'
  );
  const [amenitiesImage, setAmenitiesImage] = useState(
    'https://images.unsplash.com/photo-1517842645767-c639042777db?w=1000&auto=format&fit=crop&q=80'
  );

  const handleImageFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    target: 'banner' | 'interior' | 'amenities'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Selected image exceeds 5MB. Please choose a smaller image.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const dataUrl = uploadEvent.target?.result as string;
      if (target === 'banner') setBannerImage(dataUrl);
      else if (target === 'interior') setInteriorImage(dataUrl);
      else if (target === 'amenities') setAmenitiesImage(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  // Category-wise Seat Allocation
  const [hourlySeats, setHourlySeats] = useState('10');
  const [monthlySeats, setMonthlySeats] = useState('5');
  const [yearlySeats, setYearlySeats] = useState('5');

  // Membership Controls
  const [enableMembership, setEnableMembership] = useState(true);
  const [enableMonthly, setEnableMonthly] = useState(true);
  const [monthlyRate, setMonthlyRate] = useState('1200');
  const [monthlyDetails, setMonthlyDetails] = useState('30 Days Dedicated Desk + Unlimited Access + 1x Daily QR Attendance');
  const [enableYearly, setEnableYearly] = useState(true);
  const [yearlyRate, setYearlyRate] = useState('12000');
  const [yearlyDetails, setYearlyDetails] = useState('365 Days Fixed VIP Desk + Personal Locker + 1x Daily QR Attendance');

  // Extra Charges (Tax & Service Fee)
  const [taxPercent, setTaxPercent] = useState('0');
  const [serviceFee, setServiceFee] = useState('0');
  const [extraChargesDesc, setExtraChargesDesc] = useState('Service & Maintenance Fee');

  const [selectedFacilities, setSelectedFacilities] = useState<string[]>([
    'Air Conditioned',
    'High-Speed WiFi',
    'Power Sockets',
    'Silent Study Zone',
  ]);
  const [customAmenity, setCustomAmenity] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Edit / Update Library Modal State
  const [editingLibrary, setEditingLibrary] = useState<Library | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editHourlyRate, setEditHourlyRate] = useState('40');
  const [editEnableMembership, setEditEnableMembership] = useState(true);
  const [editEnableMonthly, setEditEnableMonthly] = useState(true);
  const [editMonthlyRate, setEditMonthlyRate] = useState('1200');
  const [editMonthlyDetails, setEditMonthlyDetails] = useState('');
  const [editEnableYearly, setEditEnableYearly] = useState(true);
  const [editYearlyRate, setEditYearlyRate] = useState('12000');
  const [editYearlyDetails, setEditYearlyDetails] = useState('');
  const [editTaxPercent, setEditTaxPercent] = useState('0');
  const [editServiceFee, setEditServiceFee] = useState('0');
  const [editExtraChargesDesc, setEditExtraChargesDesc] = useState('Service & Maintenance Fee');
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Students & Attendance State
  const [studentTab, setStudentTab] = useState<'daily' | 'premium' | 'attendance'>('premium');
  const [studentSearch, setStudentSearch] = useState('');
  const [studentData, setStudentData] = useState<{
    dailyBookings: any[];
    premiumPasses: any[];
    attendanceLogs: any[];
  }>({
    dailyBookings: [],
    premiumPasses: [],
    attendanceLogs: [],
  });
  const [loadingStudents, setLoadingStudents] = useState(false);

  // Master Account & Multi-Library State
  const [selectedLibraryId, setSelectedLibraryId] = useState<string | null>(null);
  const [unlockedLibraryIds, setUnlockedLibraryIds] = useState<string[]>([]);
  const [hasSecurityPin, setHasSecurityPin] = useState<boolean | null>(null);

  // Security PIN Modal State
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinTargetLibrary, setPinTargetLibrary] = useState<Library | null>(null);
  const [pinMode, setPinMode] = useState<'VERIFY' | 'SETUP' | 'FORGOT_OTP'>('VERIFY');
  const [pinInput, setPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [pinLoading, setPinLoading] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinSuccessMsg, setPinSuccessMsg] = useState<string | null>(null);
  const [showPin, setShowPin] = useState(false);

  // QR Scanner & Verification State
  const [scanCode, setScanCode] = useState('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [verifiedBooking, setVerifiedBooking] = useState<any>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifySuccessMsg, setVerifySuccessMsg] = useState<string | null>(null);

  const handleCameraScanSuccess = (scannedCode: string) => {
    setScanCode(scannedCode);
    handleVerifyQr(scannedCode);
  };

  const handleVerifyQr = async (codeToVerify?: string) => {
    const targetCode = (codeToVerify || scanCode).trim();
    if (!targetCode) {
      setVerifyError('Please enter or scan a valid Booking Pass code.');
      return;
    }

    setVerifying(true);
    setVerifyError(null);
    setVerifySuccessMsg(null);
    setVerifiedBooking(null);

    try {
      const res = await api.post('/owner/verify-qr', { bookingCode: targetCode });
      if (res.data.success && res.data.booking) {
        setVerifiedBooking(res.data.booking);
      }
    } catch (err: any) {
      setVerifyError(err.response?.data?.message || 'Invalid or unauthorized QR Pass code.');
    } finally {
      setVerifying(false);
    }
  };

  const handleCheckInStudent = async () => {
    if (!verifiedBooking) return;
    setCheckingIn(true);
    setVerifyError(null);

    try {
      const res = await api.post('/owner/check-in', { bookingCode: verifiedBooking.bookingCode });
      if (res.data.success) {
        setVerifySuccessMsg(res.data.message);
        setVerifiedBooking((prev: any) => ({
          ...prev,
          status: 'CHECKED_IN',
          checkInTime: new Date().toISOString(),
          alreadyMarkedToday: true,
          totalAttendances: (prev?.totalAttendances || 0) + 1,
        }));
        fetchDashboard(selectedLibraryId || undefined);
        fetchStudentData(selectedLibraryId || undefined);
      }
    } catch (err: any) {
      setVerifyError(err.response?.data?.message || 'Check-in failed.');
    } finally {
      setCheckingIn(false);
    }
  };

  const checkPinStatus = async () => {
    try {
      const res = await api.get('/owner/pin-status');
      if (res.data.success) {
        setHasSecurityPin(res.data.hasPin);
      }
    } catch (err) {
      console.error('Failed to check PIN status', err);
    }
  };

  const fetchStudentData = async (libId?: string) => {
    setLoadingStudents(true);
    try {
      const targetId = libId !== undefined ? libId : selectedLibraryId;
      const url = targetId ? `/owner/students-and-attendance?libraryId=${targetId}` : '/owner/students-and-attendance';
      const res = await api.get(url);
      if (res.data.success) {
        setStudentData({
          dailyBookings: res.data.dailyBookings || [],
          premiumPasses: res.data.premiumPasses || [],
          attendanceLogs: res.data.attendanceLogs || [],
        });
      }
    } catch (err) {
      console.error('Failed to load student data', err);
    } finally {
      setLoadingStudents(false);
    }
  };

  const fetchDashboard = async (libId?: string) => {
    setLoading(true);
    try {
      const targetId = libId !== undefined ? libId : selectedLibraryId;
      const dashUrl = targetId ? `/owner/dashboard?libraryId=${targetId}` : '/owner/dashboard';
      const [dashRes, libRes] = await Promise.all([
        api.get(dashUrl),
        api.get('/owner/my-libraries'),
      ]);

      if (dashRes.data.success) {
        setMetrics(dashRes.data.metrics);
      }
      if (libRes.data.success) {
        setLibraries(libRes.data.libraries);
      }
      fetchStudentData(targetId || undefined);
    } catch (err) {
      console.error('Failed to load owner data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'OWNER' || user?.role === 'ADMIN') {
      fetchDashboard();
      checkPinStatus();
    }
  }, [user]);

  // Master Account PIN Actions
  const handleSelectLibrary = (lib: Library) => {
    if (unlockedLibraryIds.includes(lib.id)) {
      setSelectedLibraryId(lib.id);
      fetchDashboard(lib.id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setPinTargetLibrary(lib);
      setPinInput('');
      setConfirmPinInput('');
      setForgotOtp('');
      setNewPinInput('');
      setPinError(null);
      setPinSuccessMsg(null);
      setPinMode(hasSecurityPin ? 'VERIFY' : 'SETUP');
      setIsPinModalOpen(true);
    }
  };

  const handleVerifyPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinTargetLibrary) return;
    if (pinInput.length !== 6 || !/^\d{6}$/.test(pinInput)) {
      setPinError('Please enter a valid 6-digit numeric PIN.');
      return;
    }

    setPinLoading(true);
    setPinError(null);
    try {
      const res = await api.post('/owner/security-pin/verify', { pin: pinInput });
      if (res.data.success) {
        setUnlockedLibraryIds((prev) => Array.from(new Set([...prev, pinTargetLibrary.id])));
        setSelectedLibraryId(pinTargetLibrary.id);
        fetchDashboard(pinTargetLibrary.id);
        setIsPinModalOpen(false);
        setPinInput('');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err: any) {
      setPinError(err.response?.data?.message || 'Incorrect 6-digit security PIN.');
    } finally {
      setPinLoading(false);
    }
  };

  const handleSetupPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.length !== 6 || !/^\d{6}$/.test(pinInput)) {
      setPinError('Security PIN must be exactly 6 numeric digits.');
      return;
    }
    if (pinInput !== confirmPinInput) {
      setPinError('PINs do not match. Please re-enter.');
      return;
    }

    setPinLoading(true);
    setPinError(null);
    try {
      const res = await api.post('/owner/security-pin/setup', { pin: pinInput });
      if (res.data.success) {
        setHasSecurityPin(true);
        if (pinTargetLibrary) {
          setUnlockedLibraryIds((prev) => Array.from(new Set([...prev, pinTargetLibrary.id])));
          setSelectedLibraryId(pinTargetLibrary.id);
          fetchDashboard(pinTargetLibrary.id);
        }
        setIsPinModalOpen(false);
        setPinInput('');
        setConfirmPinInput('');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err: any) {
      setPinError(err.response?.data?.message || 'Failed to set up PIN.');
    } finally {
      setPinLoading(false);
    }
  };

  const handleSendForgotOtp = async () => {
    setPinLoading(true);
    setPinError(null);
    setPinSuccessMsg(null);
    try {
      const res = await api.post('/owner/security-pin/forgot');
      if (res.data.success) {
        setPinMode('FORGOT_OTP');
        setPinSuccessMsg(res.data.message || 'A 6-digit reset OTP has been sent to your registered email.');
      }
    } catch (err: any) {
      setPinError(err.response?.data?.message || 'Failed to dispatch reset OTP.');
    } finally {
      setPinLoading(false);
    }
  };

  const handleResetPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (forgotOtp.length !== 6 || !/^\d{6}$/.test(forgotOtp)) {
      setPinError('Please enter a valid 6-digit OTP received on your email.');
      return;
    }
    if (newPinInput.length !== 6 || !/^\d{6}$/.test(newPinInput)) {
      setPinError('New PIN must be exactly 6 numeric digits.');
      return;
    }
    if (newPinInput !== confirmPinInput) {
      setPinError('New PIN and Confirm PIN do not match.');
      return;
    }

    setPinLoading(true);
    setPinError(null);
    try {
      const res = await api.post('/owner/security-pin/reset', {
        otp: forgotOtp,
        newPin: newPinInput,
      });
      if (res.data.success) {
        setHasSecurityPin(true);
        if (pinTargetLibrary) {
          setUnlockedLibraryIds((prev) => Array.from(new Set([...prev, pinTargetLibrary.id])));
          setSelectedLibraryId(pinTargetLibrary.id);
          fetchDashboard(pinTargetLibrary.id);
        }
        setIsPinModalOpen(false);
        setPinInput('');
        setConfirmPinInput('');
        setForgotOtp('');
        setNewPinInput('');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err: any) {
      setPinError(err.response?.data?.message || 'Failed to reset PIN. Invalid or expired OTP.');
    } finally {
      setPinLoading(false);
    }
  };

  const handleBackToAllLibraries = () => {
    setSelectedLibraryId(null);
    fetchDashboard(undefined);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLockLibrary = (libId: string) => {
    setUnlockedLibraryIds((prev) => prev.filter((id) => id !== libId));
    if (selectedLibraryId === libId) {
      setSelectedLibraryId(null);
      fetchDashboard(undefined);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleAddCustomAmenity = () => {
    const trimmed = customAmenity.trim();
    if (trimmed && !selectedFacilities.includes(trimmed)) {
      setSelectedFacilities((prev) => [...prev, trimmed]);
      setCustomAmenity('');
    }
  };

  // Automatic Indian PIN Code Lookup with 6-State Service Area Validation
  const lookupPincode = async (pin: string) => {
    if (pin.length !== 6) return;
    setPincodeLoading(true);
    setPincodeError(null);
    setAvailableLocalities([]);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(`https://api.postalpincode.in/pincode/${pin}`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error('Network error looking up PIN code');
      }

      const data = await response.json();
      if (
        !Array.isArray(data) ||
        !data[0] ||
        data[0].Status !== 'Success' ||
        !data[0].PostOffice ||
        data[0].PostOffice.length === 0
      ) {
        setPincodeError('Invalid PIN code. No location records found in postal database.');
        return;
      }

      const postOffices = data[0].PostOffice;
      const firstPo = postOffices[0];

      // Validate detected state against platform's active service regions
      const detectedState = firstPo.State || '';
      const isStateSupported = SUPPORTED_REGIONS.some(
        (s) => s.toLowerCase() === detectedState.trim().toLowerCase()
      );

      if (!isStateSupported) {
        setPincodeError(
          `Service Area Notice: LibSpace currently operates in Uttar Pradesh, Rajasthan, Delhi, Bihar, Maharashtra, and Haryana. PIN code ${pin} (${detectedState}) is outside our active service regions.`
        );
        setState(detectedState);
        setDistrict(firstPo.District || '');
        setCity(firstPo.District || firstPo.Name || '');
        return;
      }

      // Collect all unique post office localities under this PIN code
      const localities = Array.from(
        new Set(postOffices.map((po: any) => po.Name).filter(Boolean))
      ) as string[];

      setAvailableLocalities(localities);

      // Auto-fill existing form fields
      setState(detectedState);
      setDistrict(firstPo.District || '');
      const primaryCity = firstPo.District || firstPo.Name || '';
      setCity(primaryCity);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setPincodeError('PIN code lookup timed out. Please enter details manually.');
      } else {
        setPincodeError('Unable to fetch PIN code details. Please verify or fill manually.');
      }
    } finally {
      setPincodeLoading(false);
    }
  };

  const handlePincodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const digits = raw.replace(/\D/g, '').slice(0, 6);
    setPincode(digits);

    // Clear stale location values when PIN code changes
    if (digits.length < 6) {
      setPincodeError(null);
      setAvailableLocalities([]);
      if (pincode.length === 6 && digits.length < 6) {
        setCity('');
        setDistrict('');
        setState('');
      }
    } else if (digits.length === 6) {
      lookupPincode(digits);
    }
  };

  const handleCreateLibrary = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate master account 5-library limit
    if (libraries.length >= 5) {
      alert('Master account limit reached. You can list up to 5 libraries under one master account.');
      return;
    }

    // Validate supported service region
    if (state && !SUPPORTED_REGIONS.some((s) => s.toLowerCase() === state.trim().toLowerCase())) {
      alert(
        `Currently, LibSpace listings are only available in Uttar Pradesh, Rajasthan, Delhi, Bihar, Maharashtra, and Haryana. (${state} is not supported)`
      );
      return;
    }

    setSubmitting(true);
    try {
      const parsedHourlySeats = Number(hourlySeats) || 10;
      const parsedMonthlySeats = enableMembership && enableMonthly ? (Number(monthlySeats) || 5) : 0;
      const parsedYearlySeats = enableMembership && enableYearly ? (Number(yearlySeats) || 5) : 0;
      const computedTotalSeats = parsedHourlySeats + parsedMonthlySeats + parsedYearlySeats;

      const res = await api.post('/owner/libraries', {
        name,
        tagline,
        address,
        city,
        district,
        state,
        pincode,
        bannerImage,
        interiorImage,
        amenitiesImage,
        photos: [bannerImage, interiorImage, amenitiesImage],
        totalSeats: computedTotalSeats,
        hourlyRate: Number(hourlyRate),
        hourlySeats: parsedHourlySeats,
        monthlySeats: parsedMonthlySeats,
        yearlySeats: parsedYearlySeats,
        enableMembership,
        enableMonthly,
        monthlyRate: Number(monthlyRate) || 1200,
        monthlyDetails,
        enableYearly,
        yearlyRate: Number(yearlyRate) || 12000,
        yearlyDetails,
        taxPercent: Number(taxPercent) || 0,
        serviceFee: Number(serviceFee) || 0,
        extraChargesDesc,
        facilities:
          selectedFacilities.length > 0
            ? selectedFacilities
            : ['Air Conditioned', 'High-Speed WiFi', 'Power Sockets', 'Silent Study Zone'],
      });

      if (res.data.success) {
        alert('Library submitted for Admin Approval!');
        setIsAddLibModalOpen(false);
        setName('');
        setTagline('');
        setAddress('');
        setCity('');
        setDistrict('');
        setState('');
        setPincode('');
        setPincodeError(null);
        setBannerImage('https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=1000&auto=format&fit=crop&q=80');
        setInteriorImage('https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=1000&auto=format&fit=crop&q=80');
        setAmenitiesImage('https://images.unsplash.com/photo-1517842645767-c639042777db?w=1000&auto=format&fit=crop&q=80');
        setAvailableLocalities([]);
        setHourlyRate('40');
        setHourlySeats('10');
        setMonthlySeats('5');
        setYearlySeats('5');
        setEnableMembership(true);
        setEnableMonthly(true);
        setMonthlyRate('1200');
        setEnableYearly(true);
        setYearlyRate('12000');
        setTaxPercent('0');
        setServiceFee('0');
        setSelectedFacilities([
          'Air Conditioned',
          'High-Speed WiFi',
          'Power Sockets',
          'Silent Study Zone',
        ]);
        setCustomAmenity('');
        fetchDashboard();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to submit library');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (lib: Library) => {
    setEditingLibrary(lib);
    setEditHourlyRate(String(lib.hourlyRate || 40));
    setEditEnableMembership(lib.enableMembership !== false);
    setEditEnableMonthly(lib.enableMonthly !== false);
    setEditMonthlyRate(String(lib.monthlyRate || 1200));
    setEditMonthlyDetails(lib.monthlyDetails || '');
    setEditEnableYearly(lib.enableYearly !== false);
    setEditYearlyRate(String(lib.yearlyRate || 12000));
    setEditYearlyDetails(lib.yearlyDetails || '');
    setEditTaxPercent(String(lib.taxPercent ?? 0));
    setEditServiceFee(String(lib.serviceFee ?? 0));
    setEditExtraChargesDesc(lib.extraChargesDesc || 'Service & Maintenance Fee');
    setIsEditModalOpen(true);
  };

  const handleUpdateLibrary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLibrary) return;
    setEditSubmitting(true);
    try {
      const res = await api.put(`/owner/libraries/${editingLibrary.id}`, {
        hourlyRate: Number(editHourlyRate),
        enableMembership: editEnableMembership,
        enableMonthly: editEnableMonthly,
        monthlyRate: Number(editMonthlyRate),
        monthlyDetails: editMonthlyDetails,
        enableYearly: editEnableYearly,
        yearlyRate: Number(editYearlyRate),
        yearlyDetails: editYearlyDetails,
        taxPercent: Number(editTaxPercent),
        serviceFee: Number(editServiceFee),
        extraChargesDesc: editExtraChargesDesc,
      });

      if (res.data.success) {
        alert('Library pricing & memberships updated successfully!');
        setIsEditModalOpen(false);
        setEditingLibrary(null);
        fetchDashboard();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update library details');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleToggleSeat = async (seatId: string) => {
    try {
      const res = await api.patch(`/owner/seats/${seatId}/toggle`);
      if (res.data.success) {
        fetchDashboard();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update seat status');
    }
  };

  const filteredDaily = studentData.dailyBookings.filter((b) => {
    const q = studentSearch.toLowerCase();
    return (
      b.user?.name?.toLowerCase().includes(q) ||
      b.user?.email?.toLowerCase().includes(q) ||
      b.user?.phone?.toLowerCase().includes(q) ||
      b.bookingCode?.toLowerCase().includes(q) ||
      b.seat?.seatNumber?.toLowerCase().includes(q) ||
      b.library?.name?.toLowerCase().includes(q)
    );
  });

  const filteredPremium = studentData.premiumPasses.filter((b) => {
    const q = studentSearch.toLowerCase();
    return (
      b.user?.name?.toLowerCase().includes(q) ||
      b.user?.email?.toLowerCase().includes(q) ||
      b.user?.phone?.toLowerCase().includes(q) ||
      b.bookingCode?.toLowerCase().includes(q) ||
      b.seat?.seatNumber?.toLowerCase().includes(q) ||
      b.library?.name?.toLowerCase().includes(q)
    );
  });

  const filteredAttendance = studentData.attendanceLogs.filter((att) => {
    const q = studentSearch.toLowerCase();
    return (
      att.user?.name?.toLowerCase().includes(q) ||
      att.user?.email?.toLowerCase().includes(q) ||
      att.user?.phone?.toLowerCase().includes(q) ||
      att.seatNumber?.toLowerCase().includes(q) ||
      att.date?.toLowerCase().includes(q) ||
      att.booking?.bookingCode?.toLowerCase().includes(q) ||
      att.library?.name?.toLowerCase().includes(q)
    );
  });

  const selectedLibrary = libraries.find((lib) => lib.id === selectedLibraryId) || null;

  // If user is not an owner or admin, show switch banner
  if (user?.role !== 'OWNER' && user?.role !== 'ADMIN') {
    return (
      <div className="max-w-xl mx-auto my-20 p-8 bg-white rounded-3xl border border-slate-200 text-center space-y-4 shadow-sm">
        <img
          src="/images/libspace-logo.png"
          alt="LibSpace Official Logo"
          className="w-16 h-16 rounded-2xl object-contain mx-auto shadow-md"
        />
        <h2 className="text-xl font-bold text-slate-800">Library Owner Portal</h2>
        <p className="text-xs text-slate-500">
          You must be logged in as a verified <strong>Library Owner</strong> to manage study spaces, seats, and view revenue.
        </p>
        <button
          onClick={() => setIsAuthModalOpen(true)}
          className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow transition"
        >
          🏢 Sign In or Register as Owner
        </button>

        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          defaultRole="OWNER"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      {/* Top Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {selectedLibrary ? (
            /* Selected Library Branch Header */
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <button
                  type="button"
                  onClick={handleBackToAllLibraries}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-slate-600" />
                  <span>All Libraries</span>
                </button>

                <span className="px-2.5 py-0.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 font-mono font-bold text-xs flex items-center gap-1">
                  <Hash className="w-3.5 h-3.5 text-indigo-500" />
                  <span>{selectedLibrary.lid || 'LID-101'}</span>
                </span>

                <span
                  className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                    selectedLibrary.status === 'APPROVED'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : selectedLibrary.status === 'PENDING'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}
                >
                  {selectedLibrary.status === 'APPROVED' ? '🟢 Live & Approved' : selectedLibrary.status === 'PENDING' ? '🟡 Pending Approval' : '🔴 Rejected'}
                </span>

                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg flex items-center gap-1">
                  <Unlock className="w-3 h-3 text-emerald-600" />
                  <span>Workspace Unlocked</span>
                </span>
              </div>

              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                <span>{selectedLibrary.name}</span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                📍 {selectedLibrary.address}, {selectedLibrary.city}, {selectedLibrary.state} {selectedLibrary.pincode ? `• PIN: ${selectedLibrary.pincode}` : ''}
              </p>
            </div>
          ) : (
            /* Master Account Multi-Library Overview Header */
            <div className="flex items-center gap-3.5">
              <Link to="/" title="LibSpace Home">
                <img
                  src="/images/libspace-logo.png"
                  alt="LibSpace Official Logo"
                  className="w-12 h-12 rounded-2xl object-contain shadow-xs hover:scale-105 transition"
                />
              </Link>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500/10 to-indigo-500/10 text-indigo-800 text-xs font-extrabold border border-indigo-200 flex items-center gap-1.5 shadow-2xs">
                    <Crown className="w-3.5 h-3.5 text-amber-600" />
                    <span>Master Owner Console</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsProfileModalOpen(true)}
                    className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-indigo-700 font-bold bg-slate-100 hover:bg-indigo-50 px-2.5 py-1 rounded-full border border-slate-200 transition cursor-pointer"
                  >
                    <img
                      src={user?.avatar || 'https://api.dicebear.com/7.x/initials/svg?seed=Owner'}
                      alt={user?.name || 'Owner'}
                      className="w-4 h-4 rounded-full object-cover"
                    />
                    <span>Welcome, {user?.name || 'Owner'}</span>
                    <span className="text-[10px] text-indigo-700 font-extrabold underline ml-1">Edit Profile</span>
                  </button>
                </div>
                <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                  Library Performance & Revenue
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Master account overview: manage up to 5 library branches with 6-digit PIN security.
                </p>
              </div>
            </div>
          )}

          {selectedLibrary ? (
            /* Selected Library Branch Action Buttons */
            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => openEditModal(selectedLibrary)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl border border-blue-200 transition cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Update Pricing & Desks</span>
              </button>

              <button
                type="button"
                onClick={() => handleLockLibrary(selectedLibrary.id)}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition cursor-pointer"
                title="Lock this library console"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Lock Console</span>
              </button>

              <button
                type="button"
                onClick={handleBackToAllLibraries}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow transition cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Switch Library ({libraries.length})</span>
              </button>
            </div>
          ) : (
            /* Master Account Branch Counter & Add Button */
            <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
              <div className="px-3.5 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-indigo-600" />
                <span>Capacity: <strong>{libraries.length} / 5</strong> Added</span>
              </div>

              {libraries.length < 5 ? (
                <button
                  type="button"
                  onClick={() => setIsAddLibModalOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>List New Library Space</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-200 text-slate-500 text-xs font-bold rounded-xl cursor-not-allowed"
                  title="Master accounts can list a maximum of 5 libraries."
                >
                  <Check className="w-4 h-4" />
                  <span>Max 5 Libraries Listed</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {!selectedLibrary ? (
          /* ========================================================================= */
          /* MODE A: MASTER ACCOUNT OVERVIEW & ALL LIBRARIES CARDS GRID               */
          /* ========================================================================= */
          <div className="space-y-8">
            {/* KPI Metrics Cards (Master Account Network Overview) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
                <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">
                  Total Network Revenue
                </span>
                <div className="text-2xl font-extrabold text-emerald-600">
                  ₹{metrics?.totalOwnerEarnings || 0}
                </div>
                <span className="text-[11px] text-slate-400">Net earnings across all branches</span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
                <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">
                  Today's Payout
                </span>
                <div className="text-2xl font-extrabold text-slate-900">
                  ₹{metrics?.todayEarnings || 0}
                </div>
                <span className="text-[11px] text-emerald-600 font-semibold">Live across all branches</span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
                <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">
                  Active Branches
                </span>
                <div className="text-2xl font-extrabold text-indigo-600">
                  {libraries.filter((l) => l.status === 'APPROVED').length} / {libraries.length}
                </div>
                <span className="text-[11px] text-slate-400">
                  {libraries.length >= 5 ? 'Max 5 branch limit reached' : `${5 - libraries.length} branch slots remaining`}
                </span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
                <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">
                  Network Desks
                </span>
                <div className="text-2xl font-extrabold text-slate-900">
                  {libraries.reduce((sum, l) => sum + (l.totalSeats || 0), 0)}
                </div>
                <span className="text-[11px] text-slate-400">Total study desks managed</span>
              </div>
            </div>

            {/* Master Library Cards Grid */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-indigo-600" />
                    <span>Your Managed Libraries ({libraries.length} of 5 Added)</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Each library is protected by your master 6-digit PIN. Click any library card to unlock and enter its dedicated operations console.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold">
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                    <span>6-Digit Security PIN Protected</span>
                  </span>
                </div>
              </div>

              {loading ? (
                <div className="py-16 text-center text-xs font-semibold text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-2" />
                  Loading your library network...
                </div>
              ) : libraries.length === 0 ? (
                <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-4 shadow-sm">
                  <Building2 className="w-12 h-12 text-slate-300 mx-auto" />
                  <div>
                    <h3 className="text-base font-bold text-slate-800">No Libraries Listed Yet</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                      Your master owner account can list and manage up to 5 individual library spaces.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAddLibModalOpen(true)}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow transition cursor-pointer"
                  >
                    + List Your First Library Space
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {libraries.map((lib) => {
                    const isUnlocked = unlockedLibraryIds.includes(lib.id);
                    return (
                      <div
                        key={lib.id}
                        onClick={() => handleSelectLibrary(lib)}
                        className={`group bg-white rounded-3xl border transition-all duration-200 shadow-sm hover:shadow-xl hover:-translate-y-1 cursor-pointer flex flex-col justify-between overflow-hidden ${
                          isUnlocked
                            ? 'border-indigo-300 ring-2 ring-indigo-500/20'
                            : 'border-slate-200 hover:border-indigo-300'
                        }`}
                      >
                        <div className="p-6 space-y-4">
                          {/* Top Badge Strip: LID & Approval Status */}
                          <div className="flex items-center justify-between gap-2">
                            <span className="px-3 py-1 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 text-indigo-700 font-mono font-black text-xs rounded-xl flex items-center gap-1.5 shadow-2xs">
                              <Hash className="w-3.5 h-3.5 text-indigo-500" />
                              <span>{lib.lid || 'LID-101'}</span>
                            </span>

                            <span
                              className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                                lib.status === 'APPROVED'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : lib.status === 'PENDING'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}
                            >
                              {lib.status === 'APPROVED' ? '🟢 Approved & Live' : lib.status === 'PENDING' ? '🟡 Pending Approval' : '🔴 Rejected'}
                            </span>
                          </div>

                          {/* Library Name & Tagline */}
                          <div>
                            <h3 className="text-lg font-extrabold text-slate-900 group-hover:text-indigo-600 transition">
                              {lib.name}
                            </h3>
                            {lib.tagline && (
                              <p className="text-xs text-slate-500 italic mt-0.5 line-clamp-1">
                                "{lib.tagline}"
                              </p>
                            )}
                            <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                              📍 {lib.address}, {lib.city}, {lib.state}{lib.pincode ? ` • PIN: ${lib.pincode}` : ''}
                            </p>
                          </div>

                          {/* Key Specs Grid */}
                          <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100">
                            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80">
                              <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Desks</span>
                              <span className="text-sm font-extrabold text-slate-800">{lib.totalSeats} Desks</span>
                            </div>
                            <div className="p-2.5 bg-blue-50/60 rounded-xl border border-blue-200/80">
                              <span className="text-[10px] uppercase font-bold text-blue-500 block">Hourly Rate</span>
                              <span className="text-sm font-extrabold text-blue-700">₹{lib.hourlyRate}/h</span>
                            </div>
                            <div className="p-2.5 bg-amber-50/60 rounded-xl border border-amber-200/80">
                              <span className="text-[10px] uppercase font-bold text-amber-600 block">Monthly Pass</span>
                              <span className="text-xs font-bold text-amber-900">
                                {lib.enableMembership !== false && lib.enableMonthly !== false ? `₹${lib.monthlyRate || 1200}/mo` : 'Disabled'}
                              </span>
                            </div>
                            <div className="p-2.5 bg-purple-50/60 rounded-xl border border-purple-200/80">
                              <span className="text-[10px] uppercase font-bold text-purple-600 block">Yearly VIP</span>
                              <span className="text-xs font-bold text-purple-900">
                                {lib.enableMembership !== false && lib.enableYearly !== false ? `₹${lib.yearlyRate || 12000}/yr` : 'Disabled'}
                              </span>
                            </div>
                          </div>

                          {/* Facilities Chips */}
                          {Array.isArray(lib.facilities) && lib.facilities.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-1">
                              {lib.facilities.slice(0, 3).map((f, idx) => (
                                <span key={idx} className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600">
                                  ✓ {f}
                                </span>
                              ))}
                              {lib.facilities.length > 3 && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-400">
                                  +{lib.facilities.length - 3} more
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Security Strip & Action Footer */}
                        <div className={`p-4 border-t flex items-center justify-between gap-2 transition ${
                          isUnlocked
                            ? 'bg-emerald-50/50 border-emerald-200 text-emerald-800'
                            : 'bg-slate-50 border-slate-100 text-slate-700'
                        }`}>
                          <div className="flex items-center gap-1.5 text-xs font-bold">
                            {isUnlocked ? (
                              <>
                                <Unlock className="w-4 h-4 text-emerald-600" />
                                <span className="text-emerald-700">Unlocked (Active)</span>
                              </>
                            ) : (
                              <>
                                <Lock className="w-4 h-4 text-amber-600" />
                                <span className="text-slate-600">6-Digit PIN Protected</span>
                              </>
                            )}
                          </div>

                          <div className="flex items-center gap-1 text-xs font-extrabold text-indigo-600 group-hover:translate-x-0.5 transition">
                            <span>{isUnlocked ? 'Open Console' : 'Unlock Card'}</span>
                            <ChevronRight className="w-4 h-4" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* MODE B: DEDICATED ISOLATED CONSOLE FOR SELECTED LIBRARY                   */
          /* ========================================================================= */
          <div className="space-y-8">
            {/* KPI Metrics Cards (Isolated for Selected Library) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
                <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">
                  Net Earnings
                </span>
                <div className="text-2xl font-extrabold text-emerald-600">
                  ₹{metrics?.totalOwnerEarnings || 0}
                </div>
                <span className="text-[11px] text-slate-400">For {selectedLibrary.name}</span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
                <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">
                  Today's Payout
                </span>
                <div className="text-2xl font-extrabold text-slate-900">
                  ₹{metrics?.todayEarnings || 0}
                </div>
                <span className="text-[11px] text-emerald-600 font-semibold">Active Bookings</span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
                <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">
                  Live Occupancy
                </span>
                <div className="text-2xl font-extrabold text-blue-600">
                  {metrics?.occupancyRate || 0}%
                </div>
                <span className="text-[11px] text-slate-400">
                  {metrics?.activeRightNow || 0} of {metrics?.totalSeats || selectedLibrary.totalSeats} seats in use
                </span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
                <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">
                  Total Reservations
                </span>
                <div className="text-2xl font-extrabold text-slate-900">
                  {metrics?.totalBookings || 0}
                </div>
                <span className="text-[11px] text-slate-400">At this branch</span>
              </div>
            </div>

            {/* QR Code Pass Scanner & Student Check-In Portal */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 sm:p-8 rounded-3xl text-white shadow-xl border border-slate-800 space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-400 block mb-1">
                    Security & Desk Validation • {selectedLibrary.lid || 'LID-101'}
                  </span>
                  <h2 className="text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
                    <QrCode className="w-6 h-6 text-indigo-400" />
                    <span>Student QR Code Pass Verification</span>
                  </h2>
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Scanner Active for {selectedLibrary.name}</span>
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Input & Scanner Form */}
                <div className="lg:col-span-5 space-y-4">
                  {/* Primary Camera Scanner Trigger Button */}
                  <button
                    type="button"
                    onClick={() => setIsScannerOpen(true)}
                    className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-600 hover:from-indigo-500 hover:to-blue-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-indigo-950/60 transition flex items-center justify-center gap-2 border border-indigo-400/30 active:scale-[0.98] cursor-pointer"
                  >
                    <Camera className="w-4 h-4 text-white animate-pulse" />
                    <span>📷 Scan Student QR Pass with Camera</span>
                  </button>

                  <div className="relative flex items-center justify-center py-1">
                    <div className="border-t border-slate-800 w-full"></div>
                    <span className="bg-slate-900 px-3 text-[10px] uppercase font-extrabold text-slate-500 tracking-wider absolute">
                      or enter code manually
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Student Booking Pass Code
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
                        <input
                          type="text"
                          value={scanCode}
                          onChange={(e) => setScanCode(e.target.value.toUpperCase())}
                          placeholder="e.g. LIB-1741-98"
                          className="w-full pl-9 pr-9 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <button
                          type="button"
                          onClick={() => setIsScannerOpen(true)}
                          className="absolute right-2 top-2 p-1 text-indigo-400 hover:text-indigo-300 hover:bg-slate-800 rounded-lg transition"
                          title="Open Camera Scanner"
                        >
                          <Camera className="w-4 h-4" />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleVerifyQr()}
                        disabled={verifying}
                        className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
                      >
                        {verifying ? 'Verifying...' : 'Verify Pass'}
                      </button>
                    </div>
                  </div>

                  {/* Sample Quick-Paste Recent Bookings */}
                  {metrics?.recentBookings && metrics.recentBookings.length > 0 && (
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block mb-1.5">
                        Quick Verification (Recent Passes):
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {metrics.recentBookings.slice(0, 4).map((b: any) => (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => {
                              setScanCode(b.bookingCode);
                              handleVerifyQr(b.bookingCode);
                            }}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-indigo-900/60 border border-slate-700/80 text-indigo-200 text-[11px] font-mono font-bold rounded-lg transition flex items-center gap-1"
                          >
                            <span>{b.bookingCode}</span>
                            <span className="text-[9px] opacity-70">({b.seat?.seatNumber})</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {verifyError && (
                    <div className="p-3 bg-rose-500/20 border border-rose-500/30 text-rose-200 rounded-xl text-xs font-medium flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                      <span>{verifyError}</span>
                    </div>
                  )}

                  {verifySuccessMsg && (
                    <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 text-emerald-200 rounded-xl text-xs font-medium flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <span>{verifySuccessMsg}</span>
                    </div>
                  )}
                </div>

                {/* Live Verified Result Card */}
                <div className="lg:col-span-7 bg-slate-950/80 rounded-2xl border border-slate-800 p-5 space-y-4">
                  {!verifiedBooking ? (
                    <div className="py-8 text-center text-slate-500 space-y-2">
                      <QrCode className="w-10 h-10 mx-auto text-slate-700" />
                      <p className="text-xs">Scan or enter a booking pass code above to verify student entry.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                              verifiedBooking.status === 'CHECKED_IN'
                                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                : verifiedBooking.status === 'CONFIRMED'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {verifiedBooking.status === 'CHECKED_IN' ? '🟣 Checked-In' : '🟢 Verified Valid Pass'}
                          </span>

                          {/* VIP Pass Badge */}
                          {verifiedBooking.bookingType === 'YEARLY' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-amber-500 to-orange-500 text-white flex items-center gap-1 shadow-xs">
                              <Crown className="w-3 h-3" /> YEARLY VIP
                            </span>
                          )}
                          {verifiedBooking.bookingType === 'MONTHLY' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-purple-600 to-indigo-600 text-white flex items-center gap-1 shadow-xs">
                              <Crown className="w-3 h-3" /> MONTHLY PASS
                            </span>
                          )}

                          <span className="font-mono text-xs font-bold text-amber-400">
                            {verifiedBooking.bookingCode}
                          </span>
                        </div>

                        <span className="text-[11px] text-slate-400">
                          Payment: <strong className="text-emerald-400 font-bold">{verifiedBooking.paymentStatus}</strong>
                        </span>
                      </div>

                      {/* Expiration or Validity Alert */}
                      {verifiedBooking.isExpired ? (
                        <div className="p-3 bg-rose-500/20 border border-rose-500/40 text-rose-300 rounded-xl text-xs font-bold flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                          <span>❌ Pass has EXPIRED on {new Date(verifiedBooking.validUntil).toLocaleDateString()}. Ask student to renew membership.</span>
                        </div>
                      ) : (verifiedBooking.bookingType === 'MONTHLY' || verifiedBooking.bookingType === 'YEARLY') ? (
                        <div className="p-3 bg-gradient-to-r from-purple-900/40 to-indigo-900/40 border border-purple-700/50 rounded-xl text-xs flex items-center justify-between text-purple-200">
                          <span className="flex items-center gap-1.5 font-bold">
                            <Crown className="w-4 h-4 text-amber-400" />
                            Valid Until: {new Date(verifiedBooking.validUntil).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                          <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-md font-extrabold text-[11px] border border-emerald-500/30">
                            ⚡ {verifiedBooking.daysRemaining} Days Left • {verifiedBooking.totalAttendances || 0} Visits
                          </span>
                        </div>
                      ) : null}

                      {/* Today Attendance Rule Alert */}
                      {verifiedBooking.alreadyMarkedToday && (
                        <div className="p-3 bg-amber-500/20 border border-amber-500/40 text-amber-200 rounded-xl text-xs font-bold flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                          <span>
                            ⚠️ Attendance ALREADY Recorded Today at {new Date(verifiedBooking.todayAttendance?.checkInTime || verifiedBooking.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. (Strict 1 scan/day limit). Pass is valid!
                          </span>
                        </div>
                      )}

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                        <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                          <span className="text-[10px] text-slate-400 block font-semibold uppercase">Student Aspirant</span>
                          <span className="font-bold text-white block mt-0.5">{verifiedBooking.student?.name}</span>
                          <span className="text-[10px] text-slate-400 block truncate">{verifiedBooking.student?.email}</span>
                          {verifiedBooking.student?.phone && (
                            <span className="text-[10px] text-indigo-400 block font-mono">{verifiedBooking.student?.phone}</span>
                          )}
                        </div>

                        <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                          <span className="text-[10px] text-slate-400 block font-semibold uppercase">Seat & Library</span>
                          <span className="font-bold text-indigo-300 block mt-0.5">Desk {verifiedBooking.seatNumber}</span>
                          <span className="text-[10px] text-slate-400 block truncate">{verifiedBooking.libraryName}</span>
                        </div>

                        <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 col-span-2 sm:col-span-1">
                          <span className="text-[10px] text-slate-400 block font-semibold uppercase">Pass Duration</span>
                          <span className="font-bold text-white block mt-0.5">
                            {verifiedBooking.bookingType === 'YEARLY'
                              ? '365 Days VIP'
                              : verifiedBooking.bookingType === 'MONTHLY'
                              ? '30 Days Pass'
                              : verifiedBooking.date}
                          </span>
                          <span className="text-[10px] text-emerald-400 block font-semibold">
                            {verifiedBooking.bookingType === 'MONTHLY' || verifiedBooking.bookingType === 'YEARLY'
                              ? 'Full Day Unlimited Access'
                              : `${verifiedBooking.startTime} - ${verifiedBooking.endTime}`}
                          </span>
                        </div>
                      </div>

                      {!verifiedBooking.isExpired && !verifiedBooking.alreadyMarkedToday && (
                        <button
                          type="button"
                          onClick={handleCheckInStudent}
                          disabled={checkingIn}
                          className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>{checkingIn ? 'Recording Attendance...' : 'Record Daily Attendance & Check-In Student'}</span>
                        </button>
                      )}

                      {verifiedBooking.alreadyMarkedToday && (
                        <div className="p-3 bg-emerald-950/60 border border-emerald-800/60 text-emerald-200 rounded-xl text-xs text-center font-bold flex items-center justify-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>✓ Today's Attendance Verified (Scanned at Gate)</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Student Memberships, Passes & Attendance Records Portal (Filtered for this library) */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-600 block mb-1">
                    Student Directory & Access Records • {selectedLibrary.lid || 'LID-101'}
                  </span>
                  <h2 className="text-xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
                    <Users className="w-6 h-6 text-blue-600" />
                    <span>Student Members, Passes & Gate Attendance</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Tracking Daily Bookings, Premium Passes (Monthly & Yearly), and Live Attendance Records for {selectedLibrary.name}.
                  </p>
                </div>

                {/* Quick Stat Pill */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 text-xs font-bold flex items-center gap-1.5">
                    <Crown className="w-4 h-4 text-purple-600" />
                    <span>{studentData.premiumPasses.length} Premium Members</span>
                  </span>
                  <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-emerald-600" />
                    <span>{studentData.attendanceLogs.length} Total Visits</span>
                  </span>
                </div>
              </div>

              {/* Filter Bar & Tabs */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                {/* 3 Main Tabs */}
                <div className="flex bg-slate-100 p-1 rounded-2xl w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setStudentTab('premium')}
                    className={`flex-1 sm:flex-none px-4 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
                      studentTab === 'premium'
                        ? 'bg-white text-purple-700 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Crown className="w-3.5 h-3.5" />
                    <span>Premium Passes ({studentData.premiumPasses.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStudentTab('daily')}
                    className={`flex-1 sm:flex-none px-4 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
                      studentTab === 'daily'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <CalendarDays className="w-3.5 h-3.5" />
                    <span>Daily Bookings ({studentData.dailyBookings.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStudentTab('attendance')}
                    className={`flex-1 sm:flex-none px-4 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
                      studentTab === 'attendance'
                        ? 'bg-white text-emerald-600 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Gate Attendance Logs ({studentData.attendanceLogs.length})</span>
                  </button>
                </div>

                {/* Search Box */}
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    placeholder="Search student, pass, desk..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {studentSearch && (
                    <button
                      type="button"
                      onClick={() => setStudentSearch('')}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* TAB CONTENT */}
              {loadingStudents ? (
                <div className="py-12 text-center space-y-2">
                  <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-xs text-slate-400 font-semibold">Loading student and attendance logs...</p>
                </div>
              ) : studentTab === 'premium' ? (
                /* TAB 1: PREMIUM PASS MEMBERS (Monthly & Yearly) */
                filteredPremium.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 bg-slate-50/70 rounded-2xl border border-dashed border-slate-200 space-y-2">
                    <Crown className="w-8 h-8 mx-auto text-slate-300" />
                    <p className="text-xs font-bold text-slate-600">No Premium Pass Members Found</p>
                    <p className="text-[11px] text-slate-400">Students subscribing to Monthly or Yearly passes will appear here.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider font-extrabold">
                        <tr>
                          <th className="py-3 px-3">Student Aspirant</th>
                          <th className="py-3 px-3">Membership Pass</th>
                          <th className="py-3 px-3">Reserved Desk</th>
                          <th className="py-3 px-3">Validity & Days Left</th>
                          <th className="py-3 px-3">Attendance Stats</th>
                          <th className="py-3 px-3">Pass QR Code</th>
                          <th className="py-3 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredPremium.map((b) => (
                          <tr key={b.id} className="hover:bg-slate-50/60 transition">
                            {/* Student */}
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs uppercase">
                                  {b.user?.name ? b.user.name.charAt(0) : 'S'}
                                </div>
                                <div>
                                  <span className="font-extrabold text-slate-900 block">{b.user?.name || 'Aspirant'}</span>
                                  <span className="text-[11px] text-slate-500 block">{b.user?.email}</span>
                                  {b.user?.phone && (
                                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                      <Phone className="w-2.5 h-2.5" /> {b.user.phone}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Membership Type */}
                            <td className="py-3 px-3">
                              <div className="space-y-1">
                                {b.bookingType === 'YEARLY' ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-xs">
                                    <Crown className="w-3 h-3" /> YEARLY VIP (365d)
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-xs">
                                    <Crown className="w-3 h-3" /> MONTHLY PASS (30d)
                                  </span>
                                )}
                                <span className="text-[11px] text-slate-600 block font-semibold">
                                  ₹{b.totalAmount} Paid
                                </span>
                              </div>
                            </td>

                            {/* Reserved Desk */}
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-1.5">
                                <span className="px-2.5 py-1 rounded-xl bg-indigo-50 text-indigo-700 font-extrabold text-xs border border-indigo-200">
                                  Desk {b.seat?.seatNumber || 'N/A'}
                                </span>
                              </div>
                            </td>

                            {/* Validity & Days Left */}
                            <td className="py-3 px-3">
                              <div className="space-y-1">
                                <span className="text-slate-800 font-bold block">
                                  Until {b.validUntil ? new Date(b.validUntil).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
                                </span>
                                {b.isExpired ? (
                                  <span className="inline-block px-2 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-bold rounded-md">
                                    ❌ Expired
                                  </span>
                                ) : (
                                  <span className="inline-block px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold rounded-md">
                                    ⚡ {b.daysRemaining} Days Left
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Attendance Stats */}
                            <td className="py-3 px-3">
                              <div>
                                <span className="text-emerald-700 font-extrabold text-xs block">
                                  {b.totalAttendances} Days Recorded
                                </span>
                                {b.lastAttendance ? (
                                  <span className="text-[10px] text-slate-500">
                                    Last: {new Date(b.lastAttendance).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-400">No visits yet</span>
                                )}
                              </div>
                            </td>

                            {/* Pass QR Code */}
                            <td className="py-3 px-3">
                              <span className="font-mono text-xs font-extrabold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                                {b.bookingCode}
                              </span>
                            </td>

                            {/* Action */}
                            <td className="py-3 px-3 text-right">
                              <button
                                type="button"
                                onClick={() => {
                                  setScanCode(b.bookingCode);
                                  handleVerifyQr(b.bookingCode);
                                  window.scrollTo({ top: 300, behavior: 'smooth' });
                                }}
                                className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[11px] font-bold transition inline-flex items-center gap-1 shadow-xs cursor-pointer"
                              >
                                <QrCode className="w-3 h-3 text-cyan-400" />
                                <span>Scan / Verify</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              ) : studentTab === 'daily' ? (
                /* TAB 2: DAILY & HOURLY BOOKINGS */
                filteredDaily.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 bg-slate-50/70 rounded-2xl border border-dashed border-slate-200 space-y-2">
                    <CalendarDays className="w-8 h-8 mx-auto text-slate-300" />
                    <p className="text-xs font-bold text-slate-600">No Daily / Hourly Bookings Found</p>
                    <p className="text-[11px] text-slate-400">Hourly student desk reservations will appear here.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider font-extrabold">
                        <tr>
                          <th className="py-3 px-3">Student Aspirant</th>
                          <th className="py-3 px-3">Reserved Desk</th>
                          <th className="py-3 px-3">Date & Slot</th>
                          <th className="py-3 px-3">Amount & Payment</th>
                          <th className="py-3 px-3">Check-In Status</th>
                          <th className="py-3 px-3">Booking Code</th>
                          <th className="py-3 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredDaily.map((b) => (
                          <tr key={b.id} className="hover:bg-slate-50/60 transition">
                            {/* Student */}
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs uppercase">
                                  {b.user?.name ? b.user.name.charAt(0) : 'S'}
                                </div>
                                <div>
                                  <span className="font-extrabold text-slate-900 block">{b.user?.name || 'Aspirant'}</span>
                                  <span className="text-[11px] text-slate-500 block">{b.user?.email}</span>
                                  {b.user?.phone && (
                                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                      <Phone className="w-2.5 h-2.5" /> {b.user.phone}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Reserved Desk */}
                            <td className="py-3 px-3">
                              <span className="px-2.5 py-1 rounded-xl bg-blue-50 text-blue-700 font-extrabold text-xs border border-blue-200">
                                Desk {b.seat?.seatNumber || 'N/A'}
                              </span>
                            </td>

                            {/* Date & Slot */}
                            <td className="py-3 px-3">
                              <span className="font-bold text-slate-800 block">{b.date}</span>
                              <span className="text-[11px] text-slate-500">
                                {b.startTime} - {b.endTime} ({b.durationHours}h)
                              </span>
                            </td>

                            {/* Amount */}
                            <td className="py-3 px-3">
                              <span className="font-bold text-slate-900 block">₹{b.totalAmount}</span>
                              <span className="text-[10px] text-emerald-600 font-semibold">{b.payment?.paymentStatus || 'PAID'}</span>
                            </td>

                            {/* Status */}
                            <td className="py-3 px-3">
                              {b.status === 'CHECKED_IN' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200">
                                  <CheckCircle2 className="w-3 h-3 text-purple-600" /> Checked-In
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Confirmed
                                </span>
                              )}
                            </td>

                            {/* Code */}
                            <td className="py-3 px-3">
                              <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                                {b.bookingCode}
                              </span>
                            </td>

                            {/* Action */}
                            <td className="py-3 px-3 text-right">
                              <button
                                type="button"
                                onClick={() => {
                                  setScanCode(b.bookingCode);
                                  handleVerifyQr(b.bookingCode);
                                  window.scrollTo({ top: 300, behavior: 'smooth' });
                                }}
                                className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[11px] font-bold transition inline-flex items-center gap-1 shadow-xs cursor-pointer"
                              >
                                <QrCode className="w-3 h-3 text-cyan-400" />
                                <span>Scan Pass</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              ) : (
                /* TAB 3: GATE ATTENDANCE LOGS */
                filteredAttendance.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 bg-slate-50/70 rounded-2xl border border-dashed border-slate-200 space-y-2">
                    <UserCheck className="w-8 h-8 mx-auto text-slate-300" />
                    <p className="text-xs font-bold text-slate-600">No Attendance Records Yet</p>
                    <p className="text-[11px] text-slate-400">Scanned student check-ins will be logged here with date & time timestamps.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider font-extrabold">
                        <tr>
                          <th className="py-3 px-3">Date & Check-In Time</th>
                          <th className="py-3 px-3">Student Aspirant</th>
                          <th className="py-3 px-3">Desk Reserved</th>
                          <th className="py-3 px-3">Pass Type</th>
                          <th className="py-3 px-3">Booking Code</th>
                          <th className="py-3 px-3 text-right">Security Validation</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredAttendance.map((att) => (
                          <tr key={att.id} className="hover:bg-slate-50/60 transition">
                            {/* Date & Time */}
                            <td className="py-3 px-3">
                              <span className="font-extrabold text-slate-900 block">
                                {new Date(att.checkInTime).toLocaleDateString('en-GB', {
                                  weekday: 'short',
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </span>
                              <span className="text-[11px] text-slate-500 font-semibold flex items-center gap-1">
                                <Clock className="w-3 h-3 text-blue-500" />
                                {new Date(att.checkInTime).toLocaleTimeString('en-US', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: true,
                                })}
                              </span>
                            </td>

                            {/* Student */}
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs uppercase">
                                  {att.user?.name ? att.user.name.charAt(0) : 'S'}
                                </div>
                                <div>
                                  <span className="font-bold text-slate-900 block">{att.user?.name || 'Aspirant'}</span>
                                  <span className="text-[11px] text-slate-500 block">{att.user?.email}</span>
                                </div>
                              </div>
                            </td>

                            {/* Desk */}
                            <td className="py-3 px-3">
                              <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 font-extrabold text-xs border border-emerald-200">
                                Desk {att.seatNumber}
                              </span>
                            </td>

                            {/* Pass Type */}
                            <td className="py-3 px-3">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                                att.passType === 'YEARLY'
                                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                  : att.passType === 'MONTHLY'
                                  ? 'bg-purple-100 text-purple-800 border border-purple-300'
                                  : 'bg-blue-50 text-blue-700 border border-blue-200'
                              }`}>
                                {att.passType}
                              </span>
                            </td>

                            {/* Booking Code */}
                            <td className="py-3 px-3">
                              <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                                {att.booking?.bookingCode || 'PASS'}
                              </span>
                            </td>

                            {/* Security Verification */}
                            <td className="py-3 px-3 text-right">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-[10px] font-extrabold">
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                Verified Gate Scan (1/Day)
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              )}
            </div>

            {/* My Managed Library & Visual Seat Map (Scoped to Selected Library) */}
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-900">Branch Visual Seat Map & Real-Time Availability</h2>

              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-5">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900">{selectedLibrary.name}</h3>
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                          selectedLibrary.status === 'APPROVED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : selectedLibrary.status === 'PENDING'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {selectedLibrary.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      {selectedLibrary.address}, {selectedLibrary.city}
                    </p>

                    {/* Pricing & Membership Badges */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
                        ⏱️ Hourly: ₹{selectedLibrary.hourlyRate}/h
                      </span>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border ${
                        selectedLibrary.enableMembership !== false && selectedLibrary.enableMonthly !== false
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-slate-100 text-slate-400 border-slate-200'
                      }`}>
                        👑 Monthly Pass: {selectedLibrary.enableMembership !== false && selectedLibrary.enableMonthly !== false ? `₹${selectedLibrary.monthlyRate || '-'}/mo` : 'Disabled'}
                      </span>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border ${
                        selectedLibrary.enableMembership !== false && selectedLibrary.enableYearly !== false
                          ? 'bg-purple-50 text-purple-800 border-purple-200'
                          : 'bg-slate-100 text-slate-400 border-slate-200'
                      }`}>
                        👑 Yearly VIP: {selectedLibrary.enableMembership !== false && selectedLibrary.enableYearly !== false ? `₹${selectedLibrary.yearlyRate || '-'}/yr` : 'Disabled'}
                      </span>
                      <span className="text-[10px] font-medium text-slate-500 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-200">
                        Extra Charges: {selectedLibrary.taxPercent ?? 0}% Tax • ₹{selectedLibrary.serviceFee ?? 0} Fee
                      </span>
                    </div>

                    {/* Amenities Chips */}
                    {Array.isArray(selectedLibrary.facilities) && selectedLibrary.facilities.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {selectedLibrary.facilities.map((fac, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-slate-50 text-slate-600 border border-slate-200/80"
                          >
                            ✓ {fac}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 self-start lg:self-auto">
                    <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                      {selectedLibrary.totalSeats} Total Desks
                    </span>

                    {/* Update Button */}
                    <button
                      type="button"
                      onClick={() => openEditModal(selectedLibrary)}
                      className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Update Pricing & Memberships</span>
                    </button>
                  </div>
                </div>

                {/* Real-time Category Status Cards (Hourly vs Monthly vs Yearly) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Hourly Card */}
                  <div className="p-3.5 bg-gradient-to-br from-blue-50/70 to-indigo-50/40 rounded-2xl border border-blue-200/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-blue-900 flex items-center gap-1.5 uppercase tracking-wide">
                        <Clock className="w-4 h-4 text-blue-600" />
                        Hourly Seats
                      </span>
                      <span className="text-xs font-black text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-md">
                        {selectedLibrary.categoryStats?.hourly?.total || selectedLibrary.hourlySeats || 0} Total
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 text-center text-[10px]">
                      <div className="p-1.5 bg-white rounded-xl border border-emerald-200">
                        <span className="block font-bold text-slate-400">Available</span>
                        <span className="text-sm font-extrabold text-emerald-600">
                          {selectedLibrary.categoryStats?.hourly?.available ?? 0}
                        </span>
                      </div>
                      <div className="p-1.5 bg-white rounded-xl border border-blue-200">
                        <span className="block font-bold text-slate-400">Booked</span>
                        <span className="text-sm font-extrabold text-blue-600">
                          {selectedLibrary.categoryStats?.hourly?.booked ?? 0}
                        </span>
                      </div>
                      <div className="p-1.5 bg-white rounded-xl border border-purple-200">
                        <span className="block font-bold text-slate-400">Occupied</span>
                        <span className="text-sm font-extrabold text-purple-600">
                          {selectedLibrary.categoryStats?.hourly?.occupied ?? 0}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Monthly Pass Card */}
                  <div className={`p-3.5 rounded-2xl border space-y-2 ${
                    selectedLibrary.enableMembership !== false && selectedLibrary.enableMonthly !== false
                      ? 'bg-gradient-to-br from-amber-50/70 to-orange-50/40 border-amber-200/80'
                      : 'bg-slate-50 border-slate-200 opacity-60'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-amber-900 flex items-center gap-1.5 uppercase tracking-wide">
                        <Crown className="w-4 h-4 text-amber-600" />
                        Monthly Pass Slots
                      </span>
                      <span className="text-xs font-black text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-md">
                        {selectedLibrary.categoryStats?.monthly?.total || selectedLibrary.monthlySeats || 0} Slots
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 text-center text-[10px]">
                      <div className="p-1.5 bg-white rounded-xl border border-emerald-200">
                        <span className="block font-bold text-slate-400">Available</span>
                        <span className="text-sm font-extrabold text-emerald-600">
                          {selectedLibrary.categoryStats?.monthly?.available ?? 0}
                        </span>
                      </div>
                      <div className="p-1.5 bg-white rounded-xl border border-blue-200">
                        <span className="block font-bold text-slate-400">Booked</span>
                        <span className="text-sm font-extrabold text-blue-600">
                          {selectedLibrary.categoryStats?.monthly?.booked ?? 0}
                        </span>
                      </div>
                      <div className="p-1.5 bg-white rounded-xl border border-purple-200">
                        <span className="block font-bold text-slate-400">Occupied</span>
                        <span className="text-sm font-extrabold text-purple-600">
                          {selectedLibrary.categoryStats?.monthly?.occupied ?? 0}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Yearly VIP Card */}
                  <div className={`p-3.5 rounded-2xl border space-y-2 ${
                    selectedLibrary.enableMembership !== false && selectedLibrary.enableYearly !== false
                      ? 'bg-gradient-to-br from-purple-50/70 to-indigo-50/40 border-purple-200/80'
                      : 'bg-slate-50 border-slate-200 opacity-60'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-purple-900 flex items-center gap-1.5 uppercase tracking-wide">
                        <Crown className="w-4 h-4 text-purple-600" />
                        Yearly VIP Slots
                      </span>
                      <span className="text-xs font-black text-purple-800 bg-purple-100/80 px-2 py-0.5 rounded-md">
                        {selectedLibrary.categoryStats?.yearly?.total || selectedLibrary.yearlySeats || 0} Slots
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 text-center text-[10px]">
                      <div className="p-1.5 bg-white rounded-xl border border-emerald-200">
                        <span className="block font-bold text-slate-400">Available</span>
                        <span className="text-sm font-extrabold text-emerald-600">
                          {selectedLibrary.categoryStats?.yearly?.available ?? 0}
                        </span>
                      </div>
                      <div className="p-1.5 bg-white rounded-xl border border-blue-200">
                        <span className="block font-bold text-slate-400">Booked</span>
                        <span className="text-sm font-extrabold text-blue-600">
                          {selectedLibrary.categoryStats?.yearly?.booked ?? 0}
                        </span>
                      </div>
                      <div className="p-1.5 bg-white rounded-xl border border-purple-200">
                        <span className="block font-bold text-slate-400">Occupied</span>
                        <span className="text-sm font-extrabold text-purple-600">
                          {selectedLibrary.categoryStats?.yearly?.occupied ?? 0}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Seat Grid with Real-Time Color Mapping */}
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <div>
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Real-Time Seat Occupancy & Color Map
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Separated by Hourly Seats, Monthly Pass Slots, and Yearly VIP Pass Slots. Click any desk to toggle maintenance.
                      </p>
                    </div>

                    {/* Color Legend Banner */}
                    <div className="flex flex-wrap gap-2 text-[10px] font-bold">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        Available
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-600 text-white shadow-sm">
                        <span className="w-2 h-2 rounded-full bg-white"></span>
                        Booked
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-600 text-white shadow-sm">
                        <span className="w-2 h-2 rounded-full bg-white"></span>
                        Checked-In
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500 text-white">
                        <span className="w-2 h-2 rounded-full bg-white"></span>
                        5m Hold
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-300">
                        <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                        Maintenance
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {selectedLibrary.seatZones?.map((zone) => (
                      <div key={zone.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                        <div className="flex items-center justify-between mb-2.5">
                          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            {zone.name.includes('Monthly') ? (
                              <Crown className="w-4 h-4 text-amber-500" />
                            ) : zone.name.includes('Yearly') ? (
                              <Crown className="w-4 h-4 text-purple-600" />
                            ) : (
                              <Clock className="w-4 h-4 text-blue-600" />
                            )}
                            <span>{zone.name}</span>
                          </span>
                          <span className="text-[10px] font-semibold text-slate-500">
                            {zone.seats?.length} Desks
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-2.5">
                          {zone.seats?.map((seat: any) => {
                            let seatStyle =
                              'bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-50 shadow-sm';
                            let statusBadge = '• Active';
                            let tooltip = 'Click to mark Under Maintenance';

                            if (seat.status === 'CHECKED_IN') {
                              seatStyle =
                                'bg-purple-600 text-white border-purple-700 shadow-md ring-2 ring-purple-300';
                              statusBadge = `• ${
                                seat.activeStudentName
                                  ? seat.activeStudentName.split(' ')[0]
                                  : 'Checked-In'
                              }`;
                              tooltip = `Checked-In Student: ${seat.activeStudentName || 'Unknown'} (${
                                seat.activeBookingCode || ''
                              })`;
                            } else if (seat.status === 'BOOKED') {
                              seatStyle = 'bg-blue-600 text-white border-blue-700 shadow-sm';
                              statusBadge = `• ${
                                seat.activeStudentName
                                  ? seat.activeStudentName.split(' ')[0]
                                  : 'Booked'
                              }`;
                              tooltip = `Booked by ${seat.activeStudentName || 'Student'} (${
                                seat.activeBookingCode || ''
                              })`;
                            } else if (seat.status === 'LOCKED') {
                              seatStyle = 'bg-amber-500 text-white border-amber-600 shadow-sm';
                              statusBadge = '• 5m Hold';
                              tooltip = 'Seat is currently held on 5-minute lock';
                            } else if (seat.status === 'MAINTENANCE') {
                              seatStyle = 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100';
                              statusBadge = '• Maint.';
                              tooltip = 'Under Maintenance - Click to activate seat';
                            }

                            return (
                              <button
                                key={seat.id}
                                type="button"
                                onClick={() => handleToggleSeat(seat.id)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${seatStyle}`}
                                title={tooltip}
                              >
                                <span>{seat.seatNumber}</span>
                                {seat.category && (
                                  <span className="text-[8px] uppercase tracking-wider px-1 py-0.2 rounded bg-black/10">
                                    {seat.category === 'YEARLY' ? 'VIP' : seat.category === 'MONTHLY' ? 'PASS' : 'HR'}
                                  </span>
                                )}
                                <span className="text-[9px] opacity-90 font-extrabold">{statusBadge}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Library Modal */}
      {isAddLibModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-xl bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" /> List New Library Space
              </h3>
              <button
                onClick={() => setIsAddLibModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLibrary} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Library Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Apex Scholars Reading Lounge"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tagline
                </label>
                <input
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="e.g. Air-conditioned quiet pods with fast fiber WiFi"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Detailed Address *
                </label>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. 3rd Floor, Plot 14, Near Metro Station Gate 2"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    City *
                  </label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. New Delhi"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  {availableLocalities.length > 1 && (
                    <div className="mt-1.5">
                      <label className="block text-[10px] font-medium text-slate-500 mb-0.5">
                        Select locality ({availableLocalities.length} found):
                      </label>
                      <select
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="w-full px-2 py-1 text-[11px] border border-blue-200 bg-blue-50/60 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                      >
                        {district && <option value={district}>{district} (General)</option>}
                        {availableLocalities.map((loc) => (
                          <option key={loc} value={loc}>
                            {loc}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    District *
                  </label>
                  <input
                    type="text"
                    required
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    placeholder="e.g. Laxmi Nagar / Central Delhi"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    State *
                  </label>
                  <input
                    type="text"
                    required
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="e.g. Delhi / Uttar Pradesh"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Pincode *</span>
                    {pincodeLoading && (
                      <span className="text-[10px] font-normal text-blue-600 flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" /> Fetching...
                      </span>
                    )}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={pincode}
                      onChange={handlePincodeChange}
                      placeholder="e.g. 110092"
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    {pincodeLoading && (
                      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                        <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {pincodeError && (
                <div
                  className={`p-2.5 rounded-xl text-xs flex items-start gap-2 border ${
                    pincodeError.includes('Service Area Notice')
                      ? 'bg-amber-50 border-amber-200 text-amber-800'
                      : 'bg-red-50 border-red-200 text-red-700'
                  }`}
                >
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{pincodeError}</span>
                </div>
              )}

              {/* 📸 3 Library Photos (Front Banner, Study Hall, Amenities) */}
              <div className="p-4 bg-gradient-to-br from-blue-50/70 via-indigo-50/40 to-slate-50 rounded-2xl border border-blue-200/80 space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <div>
                    <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                      <Camera className="w-4 h-4 text-blue-600" />
                      📸 Library Showcase Photos (3 Images)
                    </h4>
                    <p className="text-[11px] text-slate-600 leading-snug mt-0.5">
                      <strong>Image 1</strong> shows on the front page card. <strong>Image 2 & 3</strong> show in the 3-image collage when students checkout / book seats.
                    </p>
                  </div>
                  <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200 shrink-0 self-start sm:self-auto">
                    3 Images Required
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Photo 1: Front Banner */}
                  <div className="p-3 bg-white rounded-xl border border-slate-200/90 shadow-2xs space-y-2 flex flex-col justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                          1. Front Banner
                        </span>
                        <span className="text-[10px] text-slate-500 font-semibold">Front Page</span>
                      </div>
                      <p className="text-[10px] text-slate-500 leading-tight">
                        Main cover image displayed on cards & listings
                      </p>
                    </div>

                    <div className="relative aspect-video rounded-lg overflow-hidden bg-slate-100 border border-slate-200 group">
                      <img
                        src={bannerImage}
                        alt="Front Banner"
                        className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                      />
                      <label className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center cursor-pointer text-white text-[11px] font-bold gap-1.5">
                        <Upload className="w-3.5 h-3.5" /> Replace Photo
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleImageFileUpload(e, 'banner')}
                        />
                      </label>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center gap-1.5">
                        <label className="flex-1 text-center py-1.5 px-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[10px] rounded-lg border border-blue-200 cursor-pointer transition flex items-center justify-center gap-1">
                          <Upload className="w-3 h-3" /> Upload File
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleImageFileUpload(e, 'banner')}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => setBannerImage('https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=1000&auto=format&fit=crop&q=80')}
                          className="px-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-[10px] rounded-lg transition"
                          title="Use High-Res Library Preset"
                        >
                          Preset
                        </button>
                      </div>
                      <input
                        type="url"
                        value={bannerImage}
                        onChange={(e) => setBannerImage(e.target.value)}
                        placeholder="Or paste image URL..."
                        className="w-full px-2 py-1 text-[10px] border border-slate-200 rounded-lg bg-slate-50 text-slate-700 focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Photo 2: Study Hall Interior */}
                  <div className="p-3 bg-white rounded-xl border border-slate-200/90 shadow-2xs space-y-2 flex flex-col justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                          2. Study Hall
                        </span>
                        <span className="text-[10px] text-slate-500 font-semibold">Booking Collage</span>
                      </div>
                      <p className="text-[10px] text-slate-500 leading-tight">
                        Interior reading tables & quiet study zones
                      </p>
                    </div>

                    <div className="relative aspect-video rounded-lg overflow-hidden bg-slate-100 border border-slate-200 group">
                      <img
                        src={interiorImage}
                        alt="Study Hall"
                        className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                      />
                      <label className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center cursor-pointer text-white text-[11px] font-bold gap-1.5">
                        <Upload className="w-3.5 h-3.5" /> Replace Photo
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleImageFileUpload(e, 'interior')}
                        />
                      </label>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center gap-1.5">
                        <label className="flex-1 text-center py-1.5 px-2 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-[10px] rounded-lg border border-amber-200 cursor-pointer transition flex items-center justify-center gap-1">
                          <Upload className="w-3 h-3" /> Upload File
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleImageFileUpload(e, 'interior')}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => setInteriorImage('https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=1000&auto=format&fit=crop&q=80')}
                          className="px-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-[10px] rounded-lg transition"
                          title="Use High-Res Library Preset"
                        >
                          Preset
                        </button>
                      </div>
                      <input
                        type="url"
                        value={interiorImage}
                        onChange={(e) => setInteriorImage(e.target.value)}
                        placeholder="Or paste image URL..."
                        className="w-full px-2 py-1 text-[10px] border border-slate-200 rounded-lg bg-slate-50 text-slate-700 focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Photo 3: Amenities & Desk Facilities */}
                  <div className="p-3 bg-white rounded-xl border border-slate-200/90 shadow-2xs space-y-2 flex flex-col justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                          3. Amenities
                        </span>
                        <span className="text-[10px] text-slate-500 font-semibold">Booking Collage</span>
                      </div>
                      <p className="text-[10px] text-slate-500 leading-tight">
                        Power sockets, Wi-Fi routers & desk setup
                      </p>
                    </div>

                    <div className="relative aspect-video rounded-lg overflow-hidden bg-slate-100 border border-slate-200 group">
                      <img
                        src={amenitiesImage}
                        alt="Amenities"
                        className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                      />
                      <label className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center cursor-pointer text-white text-[11px] font-bold gap-1.5">
                        <Upload className="w-3.5 h-3.5" /> Replace Photo
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleImageFileUpload(e, 'amenities')}
                        />
                      </label>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center gap-1.5">
                        <label className="flex-1 text-center py-1.5 px-2 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-[10px] rounded-lg border border-purple-200 cursor-pointer transition flex items-center justify-center gap-1">
                          <Upload className="w-3 h-3" /> Upload File
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleImageFileUpload(e, 'amenities')}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => setAmenitiesImage('https://images.unsplash.com/photo-1517842645767-c639042777db?w=1000&auto=format&fit=crop&q=80')}
                          className="px-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-[10px] rounded-lg transition"
                          title="Use High-Res Library Preset"
                        >
                          Preset
                        </button>
                      </div>
                      <input
                        type="url"
                        value={amenitiesImage}
                        onChange={(e) => setAmenitiesImage(e.target.value)}
                        placeholder="Or paste image URL..."
                        className="w-full px-2 py-1 text-[10px] border border-slate-200 rounded-lg bg-slate-50 text-slate-700 focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Live Collage Preview */}
                <div className="pt-2 border-t border-blue-200/60">
                  <span className="text-[10px] font-bold text-blue-900 block mb-1">
                    ✨ Student Checkout Collage Preview:
                  </span>
                  <div className="grid grid-cols-3 gap-1.5 h-16 rounded-xl overflow-hidden border border-blue-200 bg-white p-1">
                    <div className="col-span-2 relative rounded-lg overflow-hidden">
                      <img src={bannerImage} alt="Cover Preview" className="w-full h-full object-cover" />
                      <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] px-1 rounded font-bold">1. Cover Banner</span>
                    </div>
                    <div className="grid grid-rows-2 gap-1">
                      <div className="relative rounded overflow-hidden">
                        <img src={interiorImage} alt="Hall Preview" className="w-full h-full object-cover" />
                        <span className="absolute bottom-0.5 left-0.5 bg-black/60 text-white text-[8px] px-1 rounded">2. Hall</span>
                      </div>
                      <div className="relative rounded overflow-hidden">
                        <img src={amenitiesImage} alt="Amenities Preview" className="w-full h-full object-cover" />
                        <span className="absolute bottom-0.5 left-0.5 bg-black/60 text-white text-[8px] px-1 rounded">3. Amenities</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Hourly Pricing & Category Seats */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Hourly Desk Rate (₹/hr) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  placeholder="e.g. 40"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold text-slate-800"
                />
              </div>

              {/* Category-wise Seat Allocation */}
              <div className="p-3.5 bg-blue-50/50 rounded-2xl border border-blue-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-extrabold text-blue-900 block">
                      Dedicated Seat Quantities Per Category
                    </span>
                    <span className="text-[11px] text-blue-700">
                      Allocate separate desks for Hourly learners vs Monthly & Yearly passholders
                    </span>
                  </div>
                  <span className="px-2.5 py-1 bg-blue-600 text-white rounded-lg text-xs font-black shadow-xs">
                    {(Number(hourlySeats) || 0) + (enableMembership && enableMonthly ? (Number(monthlySeats) || 0) : 0) + (enableMembership && enableYearly ? (Number(yearlySeats) || 0) : 0)} Total Desks
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2.5 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      ⏱️ Hourly Desks *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={hourlySeats}
                      onChange={(e) => setHourlySeats(e.target.value)}
                      placeholder="10"
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-xl bg-white font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      👑 Monthly Slots
                    </label>
                    <input
                      type="number"
                      min="0"
                      disabled={!enableMembership || !enableMonthly}
                      value={monthlySeats}
                      onChange={(e) => setMonthlySeats(e.target.value)}
                      placeholder="5"
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-xl bg-white font-bold disabled:opacity-40"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      👑 Yearly VIP Slots
                    </label>
                    <input
                      type="number"
                      min="0"
                      disabled={!enableMembership || !enableYearly}
                      value={yearlySeats}
                      onChange={(e) => setYearlySeats(e.target.value)}
                      placeholder="5"
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-xl bg-white font-bold disabled:opacity-40"
                    />
                  </div>
                </div>
              </div>

              {/* Extra Charges (Tax & Service Fee) */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
                <span className="text-xs font-bold text-slate-800 block">
                  Extra Charges & Taxes (Defaults to 0 for Transparent Pricing)
                </span>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                      Tax Percentage (% - e.g. 0)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="50"
                      step="0.5"
                      value={taxPercent}
                      onChange={(e) => setTaxPercent(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-xl bg-white font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                      Service / Platform Fee (₹ - e.g. 0)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={serviceFee}
                      onChange={(e) => setServiceFee(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-xl bg-white font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Membership Configuration Section */}
              <div className="p-3.5 bg-purple-50/60 rounded-2xl border border-purple-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-extrabold text-purple-900 block">
                      👑 Premium Membership Passes
                    </span>
                    <span className="text-[11px] text-purple-700">
                      Enable monthly and yearly continuous desk bookings
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEnableMembership(!enableMembership)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      enableMembership
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {enableMembership ? '✓ Membership ON' : '✕ Membership OFF'}
                  </button>
                </div>

                {enableMembership && (
                  <div className="space-y-3 pt-2 border-t border-purple-200/80">
                    {/* Monthly Pass Card */}
                    <div className="p-3 bg-white rounded-xl border border-purple-100 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <Crown className="w-4 h-4 text-amber-500" />
                          Monthly Pass Plan
                        </span>
                        <button
                          type="button"
                          onClick={() => setEnableMonthly(!enableMonthly)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                            enableMonthly
                              ? 'bg-amber-500 text-white'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {enableMonthly ? 'Monthly ON' : 'Monthly OFF'}
                        </button>
                      </div>

                      {enableMonthly && (
                        <div className="space-y-2 pt-1">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                              Monthly Pass Price (₹ / 30 Days)
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={monthlyRate}
                              onChange={(e) => setMonthlyRate(e.target.value)}
                              placeholder="1200"
                              className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 font-bold"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                              Monthly Details & Perks
                            </label>
                            <input
                              type="text"
                              value={monthlyDetails}
                              onChange={(e) => setMonthlyDetails(e.target.value)}
                              placeholder="e.g. 30 Days Dedicated Desk + Unlimited Access"
                              className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Yearly VIP Pass Card */}
                    <div className="p-3 bg-white rounded-xl border border-purple-100 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <Crown className="w-4 h-4 text-purple-600" />
                          Yearly VIP Pass Plan
                        </span>
                        <button
                          type="button"
                          onClick={() => setEnableYearly(!enableYearly)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                            enableYearly
                              ? 'bg-purple-600 text-white'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {enableYearly ? 'Yearly ON' : 'Yearly OFF'}
                        </button>
                      </div>

                      {enableYearly && (
                        <div className="space-y-2 pt-1">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                              Yearly VIP Price (₹ / 365 Days)
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={yearlyRate}
                              onChange={(e) => setYearlyRate(e.target.value)}
                              placeholder="12000"
                              className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 font-bold"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                              Yearly Details & Perks
                            </label>
                            <input
                              type="text"
                              value={yearlyDetails}
                              onChange={(e) => setYearlyDetails(e.target.value)}
                              placeholder="e.g. 365 Days Fixed VIP Desk + Personal Locker"
                              className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Amenities & Facilities Multi-Selection Section */}
              <div className="pt-2 border-t border-slate-100 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    Amenities & Facilities ({selectedFacilities.length} selected)
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedFacilities([...STANDARD_AMENITIES])}
                      className="text-[11px] font-bold text-blue-600 hover:underline"
                    >
                      Select All
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={() => setSelectedFacilities([])}
                      className="text-[11px] font-bold text-rose-600 hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500">
                  Select all available facilities by clicking them. Students will be able to filter your library by these choices.
                </p>

                {/* Pre-defined Amenities Chip Toggles */}
                <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto p-2.5 bg-slate-50 rounded-2xl border border-slate-200">
                  {STANDARD_AMENITIES.map((amenity) => {
                    const isSelected = selectedFacilities.includes(amenity);
                    return (
                      <button
                        type="button"
                        key={amenity}
                        onClick={() => {
                          setSelectedFacilities((prev) =>
                            prev.includes(amenity)
                              ? prev.filter((item) => item !== amenity)
                              : [...prev, amenity]
                          );
                        }}
                        className={`text-[11px] font-semibold px-2.5 py-1.5 rounded-xl border transition-all duration-150 flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                        }`}
                      >
                        {isSelected ? (
                          <Check className="w-3 h-3 stroke-[3]" />
                        ) : (
                          <Plus className="w-3 h-3 text-slate-400" />
                        )}
                        <span>{amenity}</span>
                      </button>
                    );
                  })}

                  {/* Custom added amenities */}
                  {selectedFacilities
                    .filter((f) => !STANDARD_AMENITIES.includes(f))
                    .map((custom) => (
                      <button
                        type="button"
                        key={custom}
                        onClick={() => {
                          setSelectedFacilities((prev) =>
                            prev.filter((item) => item !== custom)
                          );
                        }}
                        className="text-[11px] font-semibold px-2.5 py-1.5 rounded-xl border bg-purple-600 text-white border-purple-600 shadow-sm flex items-center gap-1.5"
                      >
                        <Check className="w-3 h-3 stroke-[3]" />
                        <span>{custom}</span>
                        <X className="w-3 h-3 ml-0.5 hover:text-rose-200" />
                      </button>
                    ))}
                </div>

                {/* Add Custom Amenity Input */}
                <div className="flex items-center gap-2 pt-0.5">
                  <input
                    type="text"
                    value={customAmenity}
                    onChange={(e) => setCustomAmenity(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomAmenity();
                      }
                    }}
                    placeholder="Add custom amenity (e.g. Free Coffee, Nap Pods)..."
                    className="flex-1 px-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white text-slate-800"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomAmenity}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 transition flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow transition flex items-center justify-center gap-2"
                >
                  {submitting ? 'Submitting...' : 'Submit for Admin Approval'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit / Update Library Modal */}
      {isEditModalOpen && editingLibrary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-xl bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-blue-600" /> Update Pricing & Memberships
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">{editingLibrary.name}</p>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateLibrary} className="space-y-4">
              {/* Hourly Pricing */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Hourly Rate (₹/hr) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={editHourlyRate}
                  onChange={(e) => setEditHourlyRate(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold text-slate-800"
                />
              </div>

              {/* Extra Charges */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <span className="text-xs font-bold text-slate-800 block">
                  Extra Charges & Taxes (Set to 0 for Transparent Pricing)
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Tax Percentage (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="50"
                      step="0.5"
                      value={editTaxPercent}
                      onChange={(e) => setEditTaxPercent(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Service / Platform Fee (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={editServiceFee}
                      onChange={(e) => setEditServiceFee(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white font-medium"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Fee Description
                  </label>
                  <input
                    type="text"
                    value={editExtraChargesDesc}
                    onChange={(e) => setEditExtraChargesDesc(e.target.value)}
                    placeholder="e.g. Service & Maintenance Fee"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white font-medium"
                  />
                </div>
              </div>

              {/* Master Membership Toggle */}
              <div className="p-3.5 bg-purple-50/50 rounded-2xl border border-purple-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-extrabold text-purple-900 block">
                      👑 Premium Membership Plans
                    </span>
                    <span className="text-[11px] text-purple-700">
                      Enable or disable Monthly & Yearly memberships for this library
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditEnableMembership(!editEnableMembership)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      editEnableMembership
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {editEnableMembership ? '✓ Membership ON' : '✕ Membership OFF'}
                  </button>
                </div>

                {editEnableMembership && (
                  <div className="space-y-3 pt-2 border-t border-purple-200/80">
                    {/* Monthly Membership */}
                    <div className="p-3 bg-white rounded-xl border border-purple-100 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <Crown className="w-4 h-4 text-amber-500" />
                          Monthly Pass Plan
                        </span>
                        <button
                          type="button"
                          onClick={() => setEditEnableMonthly(!editEnableMonthly)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                            editEnableMonthly
                              ? 'bg-amber-500 text-white'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {editEnableMonthly ? 'Monthly ON' : 'Monthly OFF'}
                        </button>
                      </div>

                      {editEnableMonthly && (
                        <div className="space-y-2 pt-1">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                              Monthly Pass Price (₹ / 30 Days)
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={editMonthlyRate}
                              onChange={(e) => setEditMonthlyRate(e.target.value)}
                              className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 font-bold"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                              Plan Details / Description
                            </label>
                            <input
                              type="text"
                              value={editMonthlyDetails}
                              onChange={(e) => setEditMonthlyDetails(e.target.value)}
                              placeholder="e.g. 30 Days Dedicated Desk + Unlimited Access + 1x Daily QR Attendance"
                              className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Yearly Membership */}
                    <div className="p-3 bg-white rounded-xl border border-purple-100 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <Crown className="w-4 h-4 text-purple-600" />
                          Yearly VIP Pass Plan
                        </span>
                        <button
                          type="button"
                          onClick={() => setEditEnableYearly(!editEnableYearly)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                            editEnableYearly
                              ? 'bg-purple-600 text-white'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {editEnableYearly ? 'Yearly ON' : 'Yearly OFF'}
                        </button>
                      </div>

                      {editEnableYearly && (
                        <div className="space-y-2 pt-1">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                              Yearly VIP Price (₹ / 365 Days)
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={editYearlyRate}
                              onChange={(e) => setEditYearlyRate(e.target.value)}
                              className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 font-bold"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                              Plan Details / Description
                            </label>
                            <input
                              type="text"
                              value={editYearlyDetails}
                              onChange={(e) => setEditYearlyDetails(e.target.value)}
                              placeholder="e.g. 365 Days Fixed VIP Desk + Personal Locker + 1x Daily QR Attendance"
                              className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow transition flex items-center gap-1.5"
                >
                  {editSubmitting ? 'Updating...' : 'Save & Update Library'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />

      {/* Live Camera QR Scanner Modal */}
      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleCameraScanSuccess}
      />

      {/* Master Account 6-Digit Security PIN Modal */}
      {isPinModalOpen && pinTargetLibrary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center font-bold shadow-xs">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    {pinMode === 'SETUP'
                      ? 'Set Up Master Security PIN'
                      : pinMode === 'FORGOT_OTP'
                      ? 'Reset Security PIN via OTP'
                      : 'Enter 6-Digit Security PIN'}
                  </h3>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium mt-0.5">
                    <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded">
                      {pinTargetLibrary.lid || 'LID-101'}
                    </span>
                    <span className="truncate max-w-[180px]">{pinTargetLibrary.name}</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPinModalOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* MODE: VERIFY PIN */}
            {pinMode === 'VERIFY' && (
              <form onSubmit={handleVerifyPin} className="space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Enter your master 6-digit security PIN to unlock this library's performance analytics, live seat map, and gate scanner.
                </p>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700">
                      Master Security PIN (6 Digits)
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className="text-[11px] text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-semibold cursor-pointer"
                    >
                      {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      <span>{showPin ? 'Hide PIN' : 'Show PIN'}</span>
                    </button>
                  </div>

                  <input
                    type={showPin ? 'text' : 'password'}
                    maxLength={6}
                    autoFocus
                    required
                    value={pinInput}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setPinInput(digits);
                      setPinError(null);
                    }}
                    placeholder="• • • • • •"
                    className="w-full text-center tracking-[0.6em] text-2xl font-bold py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>

                {pinError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                    <span>{pinError}</span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={handleSendForgotOtp}
                    disabled={pinLoading}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-bold underline cursor-pointer"
                  >
                    Forgot Security PIN?
                  </button>
                  <span className="text-[11px] text-slate-400 font-medium">OTP via Brevo Email</span>
                </div>

                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPinModalOpen(false)}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={pinLoading || pinInput.length !== 6}
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {pinLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4" />}
                    <span>{pinLoading ? 'Verifying...' : 'Unlock Workspace'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* MODE: SETUP PIN (FIRST TIME) */}
            {pinMode === 'SETUP' && (
              <form onSubmit={handleSetupPin} className="space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed">
                  You haven't configured a security PIN for your master account yet. Set a 6-digit numeric PIN now to protect your library spaces.
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Create 6-Digit PIN *
                    </label>
                    <input
                      type={showPin ? 'text' : 'password'}
                      maxLength={6}
                      autoFocus
                      required
                      value={pinInput}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, '').slice(0, 6);
                        setPinInput(digits);
                        setPinError(null);
                      }}
                      placeholder="e.g. 123456"
                      className="w-full text-center tracking-[0.5em] text-xl font-bold py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Confirm 6-Digit PIN *
                    </label>
                    <input
                      type={showPin ? 'text' : 'password'}
                      maxLength={6}
                      required
                      value={confirmPinInput}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, '').slice(0, 6);
                        setConfirmPinInput(digits);
                        setPinError(null);
                      }}
                      placeholder="e.g. 123456"
                      className="w-full text-center tracking-[0.5em] text-xl font-bold py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                    />
                  </div>
                </div>

                {pinError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                    <span>{pinError}</span>
                  </div>
                )}

                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPinModalOpen(false)}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={pinLoading || pinInput.length !== 6 || confirmPinInput.length !== 6}
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {pinLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    <span>{pinLoading ? 'Saving...' : 'Set PIN & Unlock'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* MODE: FORGOT_OTP (RESET VIA EMAIL) */}
            {pinMode === 'FORGOT_OTP' && (
              <form onSubmit={handleResetPin} className="space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed">
                  We've sent a 6-digit verification OTP to your registered email (<strong>{user?.email}</strong>). Enter it below with your new PIN.
                </p>

                {pinSuccessMsg && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                    <span>{pinSuccessMsg}</span>
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      6-Digit OTP from Email *
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      autoFocus
                      required
                      value={forgotOtp}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, '').slice(0, 6);
                        setForgotOtp(digits);
                        setPinError(null);
                      }}
                      placeholder="• • • • • •"
                      className="w-full text-center tracking-[0.5em] text-lg font-bold py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      New 6-Digit PIN *
                    </label>
                    <input
                      type={showPin ? 'text' : 'password'}
                      maxLength={6}
                      required
                      value={newPinInput}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, '').slice(0, 6);
                        setNewPinInput(digits);
                        setPinError(null);
                      }}
                      placeholder="e.g. 654321"
                      className="w-full text-center tracking-[0.5em] text-lg font-bold py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Confirm New PIN *
                    </label>
                    <input
                      type={showPin ? 'text' : 'password'}
                      maxLength={6}
                      required
                      value={confirmPinInput}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, '').slice(0, 6);
                        setConfirmPinInput(digits);
                        setPinError(null);
                      }}
                      placeholder="e.g. 654321"
                      className="w-full text-center tracking-[0.5em] text-lg font-bold py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                    />
                  </div>
                </div>

                {pinError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                    <span>{pinError}</span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={handleSendForgotOtp}
                    disabled={pinLoading}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-bold underline cursor-pointer"
                  >
                    Resend OTP
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPinMode('VERIFY');
                      setPinError(null);
                      setPinSuccessMsg(null);
                    }}
                    className="text-xs text-slate-500 hover:text-slate-800 font-bold cursor-pointer"
                  >
                    Back to PIN Entry
                  </button>
                </div>

                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPinModalOpen(false)}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={pinLoading || forgotOtp.length !== 6 || newPinInput.length !== 6 || confirmPinInput.length !== 6}
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {pinLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    <span>{pinLoading ? 'Resetting...' : 'Reset PIN & Unlock'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default OwnerDashboardPage;
