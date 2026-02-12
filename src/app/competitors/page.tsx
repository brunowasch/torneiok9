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
                    <div className="text-center p-12 animate-pulse text-k9-orange font-mono">[CARREGANDO DADOS...]</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filtered.map(comp => (
                            <div key={comp.id} className="bg-white border-2 border-gray-200 rounded-xl p-6 hover:border-k9-orange hover:shadow-lg transition-all group relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-15 transition-opacity">
                                    <Users className="w-24 h-24 text-k9-orange" />
                                </div>

                                <div className="flex items-start gap-4 z-10 relative">
                                    <div className="w-16 h-16 bg-linear-to-br from-k9-orange to-k9-black rounded-lg border-2 border-k9-orange flex items-center justify-center text-lg font-black text-white shadow-md">
                                        #{comp.competitorNumber}
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-k9-black uppercase leading-tight tracking-tight">{comp.handlerName}</h3>
                                        <div className="text-k9-orange text-sm font-bold mt-2 flex items-center gap-2">
                                            <span className="w-2 h-2 bg-k9-orange rounded-full"></span>
                                            CÃO: <span className="text-k9-black">{comp.dogName}</span>
                                        </div>
                                        <div className="text-gray-600 text-xs uppercase tracking-wider mt-3 bg-gray-100 inline-block px-3 py-1 rounded-full border border-gray-200 font-semibold">
                                            {comp.dogBreed}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {filtered.length === 0 && (
                            <div className="col-span-full text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 text-gray-500">
                                NENHUM COMPETIDOR ENCONTRADO
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
