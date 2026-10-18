import React, { useState, useEffect } from 'react';
import { Timer, AlertTriangle, ShieldCheck } from 'lucide-react';

interface SeatLockTimerProps {
  initialSeconds: number;
  onExpire: () => void;
}

export const SeatLockTimer: React.FC<SeatLockTimerProps> = ({
  initialSeconds,
  onExpire,
}) => {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);

  useEffect(() => {
    setSecondsLeft(initialSeconds);
  }, [initialSeconds]);

  useEffect(() => {
    if (secondsLeft <= 0) {
      onExpire();
      return;
    }

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onExpire();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [secondsLeft, onExpire]);

  const minutes = Math.floor(secondsLeft / 60);
  const remainingSecs = secondsLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(remainingSecs).padStart(2, '0')}`;

  const percentLeft = Math.max(0, (secondsLeft / 300) * 100);
  const isCritical = secondsLeft < 60;

  return (
    <div
      className={`rounded-xl p-3 border transition-colors ${
        isCritical
          ? 'bg-rose-50 border-rose-300 text-rose-800'
          : 'bg-amber-50 border-amber-300 text-amber-900'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {isCritical ? (
            <AlertTriangle className="w-5 h-5 text-rose-600 animate-bounce" />
          ) : (
            <Timer className="w-5 h-5 text-amber-600 animate-spin" style={{ animationDuration: '6s' }} />
          )}
          <div>
            <span className="text-xs font-bold block">
              {isCritical ? 'Seat hold expiring soon!' : 'Seat temporarily locked for you!'}
            </span>
            <span className="text-[11px] opacity-80">
              No one else can book this seat for the next 5 minutes.
            </span>
          </div>
        </div>

        <div className="text-right">
          <span className="font-mono text-base font-extrabold tracking-tight block">
            {formattedTime}
          </span>
          <span className="text-[9px] uppercase font-bold tracking-wider opacity-70">
            Remaining
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-200/80 h-1.5 rounded-full overflow-hidden mt-2">
        <div
          className={`h-full transition-all duration-1000 ease-linear ${
            isCritical ? 'bg-rose-500' : 'bg-amber-500'
          }`}
          style={{ width: `${percentLeft}%` }}
        ></div>
      </div>
    </div>
  );
};

export default SeatLockTimer;
