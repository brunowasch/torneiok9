'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { getAllCompetitors } from '@/services/rankingService';
import { getModalities } from '@/services/adminService';
import { Competitor, ModalityConfig } from '@/types/schema';
import { Users, Search, Flame } from 'lucide-react';

export default function CompetitorsPage() {
    const [competitors, setCompetitors] = useState<Competitor[]>([]);
    const [filtered, setFiltered] = useState<Competitor[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [comps, mods] = await Promise.all([
                    getAllCompetitors(),
                    getModalities()
                ]);
                const validModalityNames = mods.map(m => m.name);
                const validComps = comps.filter(c => validModalityNames.includes(c.modality));
                setCompetitors(validComps);
                setFiltered(validComps);
            } catch (e) {
                console.error("Error fetching competitors", e);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    useEffect(() => {
        if (!search) {
            setFiltered(competitors);
        } else {
            const lower = search.toLowerCase();
            setFiltered(competitors.filter(c =>
                c.handlerName.toLowerCase().includes(lower) ||
                c.dogName.toLowerCase().includes(lower) ||
                c.dogBreed.toLowerCase().includes(lower)
            ));
        }
    }, [search, competitors]);

    return (
        <div className="min-h-screen bg-k9-white text-k9-black font-sans">
            <Navbar />

            <main className="max-w-7xl mx-auto p-4 md:p-8">
                <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-k9-black uppercase tracking-tighter flex items-center gap-3">
                            <Users className="w-8 h-8 text-k9-orange" />
                            Lista de Competidores
                        </h1>
                        <p className="text-gray-500 text-sm uppercase tracking-widest pl-11">Registro Oficial de Binômios</p>
                    </div>

                    <div className="relative w-full md:w-64">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-gray-500" />
                        </div>
                        <input
                            type="text"
                            className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg bg-white text-k9-black placeholder-gray-500 focus:outline-none focus:border-k9-orange focus:ring-1 focus:ring-k9-orange sm:text-sm uppercase tracking-wider transition-all shadow-sm"
                            placeholder="BUSCAR..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="bg-white border border-gray-100 p-6 rounded-2xl animate-pulse h-32"></div>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filtered.map(comp => (
                            <div key={comp.id} className="bg-white border border-gray-100 p-5 rounded-2xl shadow-sm hover:shadow-xl transform hover:-translate-y-1 transition-all group relative overflow-hidden flex items-center gap-4">
                                <div className="w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center text-xl font-black shrink-0 shadow-inner overflow-hidden bg-orange-50 text-orange-600 border border-orange-100">
                                    {comp.photoUrl ? (
                                        <img src={comp.photoUrl} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        comp.handlerName.substring(0, 2).toUpperCase()
                                    )}
                                </div>

                                {/* Details */}
                                <div className="min-w-0 flex-1">
                                    <h3 className="text-lg md:text-xl font-black text-k9-black uppercase leading-tight tracking-tight truncate group-hover:text-k9-orange transition-colors">
                                        {comp.handlerName}
                                    </h3>
                                    
                                    <div className="flex items-center gap-1.5 mt-1.5">
                                        <Flame className="w-3.5 h-3.5 text-k9-orange shrink-0" />
                                        <span className="text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-tighter">Cão:</span>
                                        <span className="text-[11px] md:text-sm font-bold text-gray-800 truncate uppercase">{comp.dogName}</span>
                                    </div>

                                    <div className="mt-3 flex items-center">
                                        <div className="text-[9px] md:text-[10px] text-gray-500 uppercase font-black px-2.5 py-1 bg-gray-50 rounded-full border border-gray-100 tracking-widest truncate">
                                            {comp.dogBreed || 'RAÇA NÃO DEFINIDA'}
                                        </div>
                                    </div>
                                </div>

                                <div className="absolute -bottom-2 -right-2 opacity-5 group-hover:opacity-10 transition-opacity">
                                    <Flame className="w-20 h-20 text-k9-orange rotate-12" />
                                </div>
                            </div>
                        ))}

                        {filtered.length === 0 && (
                            <div className="col-span-full text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                                <Users className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                                <div className="text-gray-400 font-black uppercase tracking-widest">NENHUM COMPETIDOR ENCONTRADO</div>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
