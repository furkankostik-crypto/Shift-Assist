import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { useAppStore } from '../store/useAppStore';
import { calculateLeaveBalances } from '../utils/leaveBalances';
import { CalendarCheck, Palmtree, Info } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

export function LeaveBalancesSummary() {
  const exceptions = useLiveQuery(() => db.exceptions.toArray()) || [];
  const { employmentStartDate, annualLeaveEntitlement } = useAppStore();

  const balances = calculateLeaveBalances(exceptions, employmentStartDate, annualLeaveEntitlement);

  return (
    <div className="bg-card border border-slate-200/80 dark:border-slate-800 rounded-xl px-2.5 py-1.5 mb-2.5 shadow-2xs flex flex-col gap-1 text-xs animate-in fade-in">
      {/* Balances */}
      <div className="flex items-center justify-between gap-2 sm:gap-4 flex-1 min-w-0">
        {/* Mazeret */}
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="w-5 h-5 rounded-md bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
            <CalendarCheck className="w-3 h-3" />
          </div>
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Mazeret:</span>
          <div className="flex items-baseline gap-0.5">
            <span className="text-xs font-black text-slate-900 dark:text-slate-100 leading-none">{balances.remainingExcuse}</span>
            <span className="text-[10px] font-semibold text-slate-400 leading-none">/7 Hak</span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium">({balances.usedExcuse} kul.)</span>
        </div>

        <div className="w-px h-3.5 bg-slate-200 dark:bg-slate-700/60 shrink-0" />

        {/* Senelik */}
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="w-5 h-5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Palmtree className="w-3 h-3" />
          </div>
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Senelik:</span>
          <div className="flex items-baseline gap-0.5">
            <span className="text-xs font-black text-slate-900 dark:text-slate-100 leading-none">{balances.remainingVacation}</span>
            <span className="text-[10px] font-semibold text-slate-400 leading-none">/{annualLeaveEntitlement} Gün</span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium">({balances.usedVacation} kul.)</span>
        </div>
      </div>

      {/* Period Info (Centered) */}
      <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium flex items-center justify-center gap-1 pt-1 border-t border-slate-100 dark:border-slate-800/60 w-full text-center">
        {!balances.hasEmploymentDate ? (
          <span className="text-amber-600 dark:text-amber-500 font-semibold flex items-center gap-1">
            <Info className="w-3 h-3" />
            <span>İşe giriş tarihi girin</span>
          </span>
        ) : (
          <span>{format(balances.periodStart, 'd MMM yy', {locale: tr})} - {format(balances.periodEnd, 'd MMM yy', {locale: tr})}</span>
        )}
      </div>
    </div>
  );
}

