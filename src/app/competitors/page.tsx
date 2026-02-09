'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { getAllCompetitors } from '@/services/rankingService';
import { Competitor } from '@/types/schema';
import { Users, Search } from 'lucide-react';

export default function CompetitorsPage() {
    const [competitors, setCompetitors] = useState<Competitor[]>([]);
    const [filtered, setFiltered] = useState<Competitor[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const data = await getAllCompetitors();
                setCompetitors(data);
                setFiltered(data);
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
        <div className="min-h-screen bg-tactical-black text-gray-200 font-sans">
            <Navbar />

            <main className="max-w-7xl mx-auto p-4 md:p-8">
                <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                            <Users className="w-8 h-8 text-police-gold" />
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
                            className="block w-full pl-10 pr-3 py-3 border border-gray-700 rounded bg-black/50 text-white placeholder-gray-500 focus:outline-none focus:border-police-gold sm:text-sm uppercase tracking-wider"
                            placeholder="BUSCAR..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="text-center p-12 animate-pulse text-police-gold font-mono">[CARREGANDO DADOS...]</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filtered.map(comp => (
                            <div key={comp.id} className="bg-tactical-gray border border-gray-800 rounded-lg p-6 hover:border-police-gold transition-all group relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <Users className="w-24 h-24 text-white" />
                                </div>

                                <div className="flex items-start gap-4 z-10 relative">
                                    <div className="w-16 h-16 bg-black rounded border border-gray-700 flex items-center justify-center text-xl font-black text-gray-600">
                                        #{comp.competitorNumber}
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-white uppercase leading-tight">{comp.handlerName}</h3>
                                        <div className="text-police-gold text-sm font-mono mt-1 flex items-center gap-2">
                                            <span className="w-1 h-1 bg-police-gold rounded-full"></span>
                                            CÃO: {comp.dogName}
                                        </div>
                                        <div className="text-gray-500 text-xs uppercase tracking-wider mt-2 bg-black/30 inline-block px-2 py-1 rounded">
                                            {comp.dogBreed}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {filtered.length === 0 && (
                            <div className="col-span-full text-center py-12 bg-white/5 rounded border border-dashed border-gray-700 text-gray-500">
                                NENHUM COMPETIDOR ENCONTRADO
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
