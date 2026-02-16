'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface RoomSelectProps {
  value: string;
  onChange: (value: string) => void;
  rooms: Array<{ id: string; name: string }>;
  buttonColor?: string; // Cor do botão
  dropdownColor?: string; // Cor do dropdown
  selectedColor?: string; // Cor do item selecionado
  textColor?: string; // Cor do texto
}

export default function RoomSelect({
  value,
  onChange,
  rooms,
  buttonColor = 'bg-white', // Cor padrão do botão
  dropdownColor = 'bg-white', // Cor padrão do dropdown
  selectedColor = 'bg-orange-400 text-white border-orange-400 shadow-md', // Cor padrão do item selecionado (mesmo laranja do botão Campeão)
  textColor = 'text-k9-black', // Cor padrão do texto
}: RoomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedRoom = rooms.find(room => room.id === value);
  const displayLabel = selectedRoom?.name || 'Selecione uma sala...';

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleSelect = (roomId: string) => {
    onChange(roomId);
    setIsOpen(false);
  };

  return (
    <div className="w-full md:w-auto relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full md:w-64 ${buttonColor} border-2 border-gray-300 ${textColor} p-3 rounded-lg shadow-sm 
          hover:border-k9-orange hover:shadow-md 
          active:border-k9-orange active:shadow-md
          transition-all duration-200
          focus:border-k9-orange focus:ring-2 focus:ring-k9-orange focus:ring-offset-0 focus:outline-none
          uppercase font-bold text-sm tracking-wide
          flex items-center justify-between gap-3`}
      >
        <span className="truncate text-left flex-1">{displayLabel}</span>
        <ChevronDown
          className={`w-5 h-5 text-k9-orange shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className={`absolute top-full left-0 right-0 mt-2 ${dropdownColor} border-2 border-k9-orange rounded-lg shadow-2xl z-50 overflow-hidden`}>
          <div className="max-h-64 overflow-y-auto">
            {rooms.length > 0 ? (
              rooms.map(room => (
                <button
                  key={room.id}
                  onClick={() => handleSelect(room.id)}
                  className={`w-full text-left px-4 py-3 font-bold uppercase text-sm tracking-wide transition-all
                    ${value === room.id ? selectedColor : `${textColor} hover:bg-orange-50 active:bg-k9-orange active:text-white`}`}
                >
                  {room.name}
                </button>
              ))
            ) : (
              <div className="px-4 py-6 text-center text-gray-400 text-xs font-bold uppercase">
                NENHUMA SALA DISPONÍVEL
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}