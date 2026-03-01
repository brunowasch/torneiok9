'use client';

import { useState, useEffect } from 'react';
import { Clock, CalendarCheck } from 'lucide-react';
import { Room } from '@/types/schema';
import { useTranslation } from 'react-i18next';

interface TimeLeft {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
}

function calcTimeLeft(targetDate: Date): TimeLeft | null {
    const diff = targetDate.getTime() - Date.now();
    if (diff <= 0) return null;
    return {
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
    };
}

type Status = 'upcoming' | 'ongoing_with_end' | 'ongoing_no_end' | 'finished' | 'none';

function getStatus(room: Room): { status: Status; target: Date | null } {
    if (!room.startDate) return { status: 'none', target: null };

    const startTimeVal = room.startTime || '00:00';
    const start = new Date(`${room.startDate}T${startTimeVal}:00`);
    const now = Date.now();

    if (now < start.getTime()) {
        return { status: 'upcoming', target: start };
    }

    if (room.endDate) {
        const time = room.endTime ?? '23:59';
        const end = new Date(`${room.endDate}T${time}:00`);
        if (now <= end.getTime()) {
            return { status: 'ongoing_with_end', target: end };
        }
        return { status: 'finished', target: null };
    }

    return { status: 'ongoing_no_end', target: null };
}

interface Props {
    room: Room;
    variant?: 'dark' | 'light';
}

export default function RoomCountdown({ room, variant = 'dark' }: Props) {
    const { t } = useTranslation();
    const { status, target } = getStatus(room);
    const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);

    const targetTime = target?.getTime() || 0;

    useEffect(() => {
        if (!targetTime) return;

        const targetDate = new Date(targetTime);

        const tick = () => {
            const t = calcTimeLeft(targetDate);
            setTimeLeft(t);
        };

        tick();
        
        const interval = setInterval(() => {
            const t = calcTimeLeft(targetDate);
            setTimeLeft(t);
            if (!t) clearInterval(interval);
        }, 1000);
        
        return () => clearInterval(interval);
    }, [targetTime]);

    if (status === 'none') return null;

    const isDark = variant === 'dark';

    if (status === 'finished') {
        return (
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${
                isDark
                    ? 'bg-gray-800 border-gray-700 text-gray-500'
                    : 'bg-gray-100 border-gray-200 text-gray-400'
            }`}>
                <CalendarCheck className="w-3.5 h-3.5 shrink-0" />
                <span className="text-[10px] md:text-xs font-black uppercase tracking-widest">{t('countdown.finished')}</span>
            </div>
        );
    }

    if (status === 'ongoing_no_end') {
        return (
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${
                isDark
                    ? 'bg-green-900/30 border-green-700/40 text-green-400'
                    : 'bg-green-50 border-green-200 text-green-700'
            }`}>
                <span className="w-2 h-2 rounded-full bg-current animate-pulse shrink-0" />
                <span className="text-[10px] md:text-xs font-black uppercase tracking-widest">{t('countdown.ongoing')}</span>
            </div>
        );
    }

    if (!timeLeft) return null;

    const isOngoing = status === 'ongoing_with_end';
    const pad = (n: number) => String(n).padStart(2, '0');

    const blockClass = isDark
        ? 'bg-blue-900/20 border border-blue-500/30 text-blue-100 shadow-[0_0_10px_rgba(59,130,246,0.1)]'
        : (isOngoing ? 'bg-white border-2 border-green-200 text-k9-black shadow-sm' : 'bg-white border-2 border-blue-200 text-k9-black shadow-sm');

    const labelClass = isDark ? 'text-blue-300' : (isOngoing ? 'text-green-600' : 'text-blue-500');

    const badgeBg = isOngoing
        ? isDark ? 'bg-green-900/30 border-green-700/40 text-green-400' : 'bg-green-50 border-green-200 text-green-700'
        : isDark ? 'bg-blue-900/40 border-blue-500/40 text-blue-300' : 'bg-blue-50 border-blue-200 text-blue-700';

    const units = [
        { value: timeLeft.days,    label: timeLeft.days === 1 ? t('countdown.day') : t('countdown.days') },
        { value: timeLeft.hours,   label: t('countdown.hours') },
        { value: timeLeft.minutes, label: t('countdown.min') },
        { value: timeLeft.seconds, label: t('countdown.sec') },
    ];

    return (
        <div className="flex flex-col gap-2">
            {/* Label above */}
            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border self-start text-[10px] md:text-xs font-black uppercase tracking-widest ${badgeBg}`}>
                <Clock className="w-3.5 h-3.5 animate-pulse shrink-0" />
                <span>{isOngoing ? t('countdown.endsIn') : t('countdown.startsIn')}</span>
            </div>

            {/* Countdown blocks */}
            <div className="flex items-end gap-1">
                {units.map((unit, i) => (
                    <div key={i} className="flex items-end gap-1">
                        <div className={`flex flex-col items-center w-12 py-1.5 rounded-lg ${blockClass}`}>
                            <span className="text-lg font-black leading-none tabular-nums tracking-tighter w-full text-center">
                                {pad(unit.value)}
                            </span>
                            <span className={`text-[7px] font-black uppercase tracking-widest mt-1 ${labelClass}`}>
                                {unit.label}
                            </span>
                        </div>
                        {i < units.length - 1 && (
                            <span className={`text-base font-black mb-2 select-none ${isDark ? 'text-gray-600' : 'text-gray-300'}`}>:</span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
