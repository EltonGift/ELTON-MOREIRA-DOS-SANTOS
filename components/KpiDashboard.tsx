import React, { useMemo } from 'react';
import type { CaseData, User } from '../types';

const getDeadlineStatus = (dateString: string, status: string) => {
    const lowerStatus = status.toLowerCase();
    if (lowerStatus.includes('concluído') || lowerStatus.includes('finalizado') || lowerStatus.includes('transitado em julgado') || lowerStatus.includes('arquivado')) {
        return 'completed';
    }
    if (!dateString) return 'none';

    const deadline = new Date(dateString);
    const today = new Date();
    deadline.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    if (isNaN(deadline.getTime())) return 'none';
    if (deadline < today) return 'overdue';
    
    const timeDiff = deadline.getTime() - today.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    if (daysDiff <= 7) return 'due-soon';
    
    return 'on-track';
};

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; }> = ({ title, value, icon }) => (
    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 flex items-start">
        <div className="p-3 bg-indigo-100 text-indigo-600 rounded-full mr-4">
            {icon}
        </div>
        <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-3xl font-bold text-gray-900">{value}</p>
        </div>
    </div>
);

const KpiDashboard: React.FC<{ cases: CaseData[]; currentUser: User }> = ({ cases, currentUser }) => {

    const kpiData = useMemo(() => {
        const assignedToMe = cases.filter(c => c.name === currentUser.name).length;
        const coResponsible = cases.filter(c => c.coResponsibleName === currentUser.name).length;
        const segredoSim = cases.filter(c => c.segredoDeJustica === 'Sim').length;
        const segredoNao = cases.filter(c => c.segredoDeJustica === 'Não').length;

        let overdue = 0;
        let dueSoon = 0;
        let onTrack = 0;

        cases.forEach(c => {
            const status = getDeadlineStatus(c.dataFinal, c.status);
            switch (status) {
                case 'overdue': overdue++; break;
                case 'due-soon': dueSoon++; break;
                case 'on-track': onTrack++; break;
                default: break;
            }
        });
        
        return { assignedToMe, coResponsible, segredoSim, segredoNao, overdue, dueSoon, onTrack };
    }, [cases, currentUser]);

    const { assignedToMe, coResponsible, segredoSim, segredoNao, overdue, dueSoon, onTrack } = kpiData;
    
    const totalDeadlines = overdue + dueSoon + onTrack;
    const totalSegredo = segredoSim + segredoNao;

    const pieChartStyle = {
        background: `conic-gradient(
            #4338ca ${segredoSim / totalSegredo * 360}deg, 
            #a5b4fc 0
        )`
    };

    return (
        <div className="mt-8 p-6 bg-white rounded-lg shadow-lg border border-gray-200">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Meu Dashboard de KPIs</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard title="Casos Atribuídos a Mim" value={assignedToMe} icon={
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                }/>
                <StatCard title="Casos como Co-responsável" value={coResponsible} icon={
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                }/>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="p-4 rounded-lg border bg-gray-50">
                    <h3 className="text-lg font-semibold text-gray-700 mb-4">Status dos Prazos</h3>
                    <div className="space-y-3">
                        <div className="flex items-center">
                            <span className="w-28 text-sm text-gray-600">Vencidos</span>
                            <div className="flex-1 bg-gray-200 rounded-full h-5"><div className="bg-red-500 h-5 rounded-full text-white text-xs flex items-center justify-center" style={{width: `${totalDeadlines > 0 ? (overdue/totalDeadlines)*100 : 0}%`}}>{overdue > 0 && overdue}</div></div>
                        </div>
                         <div className="flex items-center">
                            <span className="w-28 text-sm text-gray-600">Vence em 7 dias</span>
                            <div className="flex-1 bg-gray-200 rounded-full h-5"><div className="bg-yellow-500 h-5 rounded-full text-white text-xs flex items-center justify-center" style={{width: `${totalDeadlines > 0 ? (dueSoon/totalDeadlines)*100 : 0}%`}}>{dueSoon > 0 && dueSoon}</div></div>
                        </div>
                         <div className="flex items-center">
                            <span className="w-28 text-sm text-gray-600">Em dia</span>
                            <div className="flex-1 bg-gray-200 rounded-full h-5"><div className="bg-green-500 h-5 rounded-full text-white text-xs flex items-center justify-center" style={{width: `${totalDeadlines > 0 ? (onTrack/totalDeadlines)*100 : 0}%`}}>{onTrack > 0 && onTrack}</div></div>
                        </div>
                    </div>
                </div>

                <div className="p-4 rounded-lg border bg-gray-50">
                    <h3 className="text-lg font-semibold text-gray-700 mb-4">Segredo de Justiça</h3>
                    {totalSegredo > 0 ? (
                        <div className="flex items-center gap-6">
                            <div className="w-24 h-24 rounded-full" style={pieChartStyle}></div>
                            <div className="text-sm space-y-2">
                                <div className="flex items-center"><span className="w-4 h-4 rounded-sm bg-indigo-700 mr-2"></span><span>Sim: {segredoSim} ({((segredoSim/totalSegredo)*100).toFixed(1)}%)</span></div>
                                <div className="flex items-center"><span className="w-4 h-4 rounded-sm bg-indigo-300 mr-2"></span><span>Não: {segredoNao} ({((segredoNao/totalSegredo)*100).toFixed(1)}%)</span></div>
                            </div>
                        </div>
                    ) : (
                         <p className="text-sm text-gray-500">Nenhum caso para exibir.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default KpiDashboard;
