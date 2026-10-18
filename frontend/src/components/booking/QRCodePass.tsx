import React from 'react';
import { Booking } from '../../types';
import { QrCode, CheckCircle, Calendar, Clock, Armchair, Download, RotateCcw, AlertTriangle, ShieldCheck } from 'lucide-react';

interface QRCodePassProps {
  booking: Booking;
  onExtend?: () => void;
  onCancel?: () => void;
}

export const QRCodePass: React.FC<QRCodePassProps> = ({ booking, onExtend, onCancel }) => {
  const handlePrint = () => {
    window.print();
  };

  const isCheckedIn = Boolean(booking.checkInTime || booking.status === 'CHECKED_IN');

  return (
    <div className="bg-gradient-to-b from-slate-900 to-slate-950 text-white rounded-3xl p-6 shadow-2xl border border-slate-800 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Ticket Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest block">
              Digital Entry Pass
            </span>
            {booking.bookingType === 'MONTHLY' && (
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                👑 Premium Monthly Pass
              </span>
            )}
            {booking.bookingType === 'YEARLY' && (
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                👑 Yearly VIP Pass
              </span>
            )}
          </div>
          <h4 className="text-base font-bold text-white tracking-tight mt-0.5">
            {booking.library?.name || 'Library Seat Pass'}
          </h4>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${
          isCheckedIn
            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
        }`}>
          {isCheckedIn ? (
            <>
              <CheckCircle className="w-3 h-3" /> Checked In
            </>
          ) : (
            <>
              <Clock className="w-3 h-3" /> Confirmed
            </>
          )}
        </span>
      </div>

      {/* Check-In Status Banner */}
      <div className={`p-2.5 rounded-xl border text-xs flex items-center gap-2 mb-3 ${
        isCheckedIn
          ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
          : 'bg-amber-950/40 border-amber-500/30 text-amber-200'
      }`}>
        {isCheckedIn ? (
          <>
            <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>Attendance recorded at entrance. Have a productive study session!</span>
          </>
        ) : (
          <>
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>Please scan at reception to record attendance. (30% refund applies if session expires without check-in).</span>
          </>
        )}
      </div>

      {/* QR Code Centerpiece */}
      <div className="flex flex-col items-center my-3">
        <div className="p-3 bg-white rounded-2xl shadow-xl">
          {booking.qrCode ? (
            <img
              src={booking.qrCode}
              alt="Booking QR Code"
              className="w-40 h-40 object-contain"
            />
          ) : (
            <div className="w-40 h-40 bg-slate-100 flex items-center justify-center text-slate-400">
              <QrCode className="w-16 h-16" />
            </div>
          )}
        </div>
        <div className="mt-3 text-center">
          <span className="font-mono text-sm font-extrabold tracking-widest text-blue-400 block">
            {booking.bookingCode}
          </span>
          <span className="text-[10px] text-slate-400">
            Show this QR code at library reception for contactless check-in & attendance
          </span>
        </div>
      </div>

      {/* Dashed divider */}
      <div className="relative my-3">
        <div className="border-t-2 border-dashed border-slate-800"></div>
        <div className="absolute -left-9 -top-3 w-6 h-6 rounded-full bg-white dark:bg-slate-900"></div>
        <div className="absolute -right-9 -top-3 w-6 h-6 rounded-full bg-white dark:bg-slate-900"></div>
      </div>

      {/* Seat & Schedule Details Grid */}
      <div className="grid grid-cols-2 gap-3 text-xs bg-slate-800/60 p-3.5 rounded-2xl border border-slate-800">
        <div>
          <span className="text-slate-400 text-[10px] block">Allocated Seat</span>
          <span className="font-bold text-white text-sm flex items-center gap-1">
            <Armchair className="w-3.5 h-3.5 text-blue-400" />
            Desk {booking.seat?.seatNumber || 'A-01'}
          </span>
        </div>
        <div>
          <span className="text-slate-400 text-[10px] block">Date</span>
          <span className="font-bold text-white text-sm flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-blue-400" />
            {booking.date}
          </span>
        </div>
        <div>
          <span className="text-slate-400 text-[10px] block">Time Window</span>
          <span className="font-bold text-white flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            {booking.startTime} - {booking.endTime}
          </span>
        </div>
        <div>
          <span className="text-slate-400 text-[10px] block">Paid Total</span>
          <span className="font-bold text-emerald-400 text-sm">
            ₹{booking.totalAmount}
          </span>
        </div>
      </div>

      {/* Pass Validity & Attendance Banner */}
      {booking.validUntil && (
        <div className="mt-3 p-3 rounded-2xl bg-gradient-to-r from-blue-900/40 to-indigo-900/40 border border-blue-500/30 flex items-center justify-between text-xs">
          <div>
            <span className="text-[10px] text-blue-300 font-bold block uppercase tracking-wider">
              Pass Validity Period
            </span>
            <span className="text-white font-bold">
              {booking.date} → {new Date(booking.validUntil).toLocaleDateString()}
            </span>
          </div>
          <span className="px-2 py-1 rounded-xl bg-blue-500/20 text-blue-300 font-extrabold text-[11px] border border-blue-500/30">
            Daily Attendance 1x/Day
          </span>
        </div>
      )}

      {/* Interactive Action Buttons: Rebook & Cancellation */}
      <div className="mt-3 space-y-2">
        {onExtend && booking.bookingType === 'HOURLY' && (
          <button
            type="button"
            onClick={onExtend}
            className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition"
          >
            <RotateCcw className="w-4 h-4" />
            <span>🔄 Rebook / Extend Desk Time</span>
          </button>
        )}

        <div className="flex gap-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2 px-3 rounded-xl bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 border border-rose-800/40 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
            >
              <span>Cancel (50% Refund)</span>
            </button>
          )}

          {/* Print / Save */}
          <button
            onClick={handlePrint}
            className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-700 transition"
          >
            <Download className="w-3.5 h-3.5" />
            Print / Save (PDF)
          </button>
        </div>
      </div>

      {/* Rules Footer */}
      <div className="mt-3 pt-3 border-t border-slate-800/80 text-[10px] text-slate-400 flex items-center gap-1.5 justify-center">
        <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
        <span>50% voluntary cancellation refund • 30% auto-refund if expired without check-in</span>
      </div>
    </div>
  );
};

export default QRCodePass;
