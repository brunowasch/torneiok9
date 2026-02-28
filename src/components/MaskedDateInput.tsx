'use client';

import { useState, useEffect, useRef } from 'react';

function isoToDisplay(iso: string): string {
    if (!iso || iso.length !== 10) return '';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
}

function displayToIso(display: string): string {
    const digits = display.replace(/\D/g, '');
    if (digits.length !== 8) return '';
    const d = digits.slice(0, 2);
    const m = digits.slice(2, 4);
    const y = digits.slice(4, 8);
    const day = parseInt(d, 10);
    const month = parseInt(m, 10);
    if (day < 1 || day > 31 || month < 1 || month > 12) return '';
    return `${y}-${m}-${d}`;
}

function applyMask(raw: string): string {
    const digits = raw.replace(/\D/g, '').slice(0, 8);
    let d = digits.slice(0, 2);
    let m = digits.slice(2, 4);
    let y = digits.slice(4, 8);

    if (d.length === 2) {
        const dayNum = parseInt(d, 10);
        if (dayNum > 31) d = '31';
        else if (dayNum === 0) d = '01';
    }

    if (m.length === 2) {
        const monthNum = parseInt(m, 10);
        if (monthNum > 12) m = '12';
        else if (monthNum === 0) m = '01';
    }

    let masked = d;
    if (digits.length >= 3) masked += '/' + m;
    if (digits.length >= 5) masked += '/' + y;

    return masked;
}

function isoToFriendly(iso: string): string {
    if (!iso || iso.length !== 10) return iso;
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
}

interface Props {
    value: string;
    onChange: (iso: string) => void;
    onError?: (message: string) => void;
    className?: string;
    placeholder?: string;
    min?: string;
    max?: string;
}

export default function MaskedDateInput({
    value, onChange, onError,
    className = '', placeholder = 'DD/MM/AAAA',
    min, max,
}: Props) {
    const [display, setDisplay] = useState(() => isoToDisplay(value));
    const lastEmittedIso = useRef(value);

    useEffect(() => {
        if (value !== lastEmittedIso.current) {
            setDisplay(isoToDisplay(value));
            lastEmittedIso.current = value;
        }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const masked = applyMask(e.target.value);
        setDisplay(masked);

        const iso = displayToIso(masked);
        if (!iso) {
            lastEmittedIso.current = '';
            onChange('');
            return;
        }

        if (min && iso < min) {
            onError?.(`Data inválida! O mínimo permitido é ${isoToFriendly(min)}.`);
            return;
        }
        if (max && iso > max) {
            onError?.(`Data inválida! O máximo permitido é ${isoToFriendly(max)}.`);
            return;
        }

        lastEmittedIso.current = iso;
        onChange(iso);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        const allowed = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
        if (allowed.includes(e.key)) return;
        if (e.ctrlKey || e.metaKey) return;
        if (!/^\d$/.test(e.key)) e.preventDefault();
    };

    return (
        <input
            type="text"
            inputMode="numeric"
            value={display}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            maxLength={10}
            className={className}
        />
    );
}
