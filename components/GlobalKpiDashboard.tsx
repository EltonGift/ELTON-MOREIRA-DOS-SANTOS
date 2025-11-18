import React, { useMemo } from 'react';
import type { CaseData, User } from '../types';

// Re-using the same helper function from KpiDashboard
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

const GlobalKpiDashboard: React.FC<{ cases: CaseData[]; users: User[] }> = ({ cases, users }) => {

    const kpiData = useMemo(() => {
        // 1. Cases by Assignee
        const casesByAssignee: Record<string, number> = {};
        cases.forEach(c => {
            casesByAssignee[c.name] = (casesByAssignee[c.name] || 0) + 1;
        });
        const sortedAssignees = Object.entries(casesByAssignee)
            .sort(([, a], [, b]) => b - a) // Sort by case count desc
            .slice(0, 10); // Show top 10 for brevity

        // 2. Cases by Priority
        const priority = {
            'Alta': 0,
            'Média': 0,
            'Baixa': 0
        };
        cases.forEach(c => {
            if (priority.hasOwnProperty(c.prioridade)) {
                priority[c.prioridade]++;
            }
        });

        // 3. Overall Deadline Status
        const deadlineStatus = {
            overdue: 0,
            dueSoon: 0,
            onTrack: 0
        };
        cases.forEach(c => {
            const status = getDeadlineStatus(c.dataFinal, c.status);
            switch (status) {
                case 'overdue': deadlineStatus.overdue++; break;
                case 'due-soon': deadlineStatus.dueSoon++; break;
                case 'on-track': deadlineStatus.onTrack++; break;
                default: break;
            }
        });

        // 4. Cases by Co-Responsible
        const casesByCoResponsible: Record<string, number> = {};
        cases.forEach(c => {
            const coResponsible = c.coResponsibleName || 'Não Definido';
            casesByCoResponsible[coResponsible] = (casesByCoResponsible[coResponsible] || 0) + 1;
        });
        const sortedCoResponsibles = Object.entries(casesByCoResponsible)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10);
        
        return { sortedAssignees, priority, deadlineStatus, sortedCoResponsibles };
    }, [cases, users]);

    const { sortedAssignees, priority, deadlineStatus, sortedCoResponsibles } = kpiData;
    
    const totalPriorityCases = priority.Alta + priority.Média + priority.Baixa;
    const altaPercent = totalPriorityCases > 0 ? (priority.Alta / totalPriorityCases) * 100 : 0;
    const mediaPercent = totalPriorityCases > 0 ? (priority.Média / totalPriorityCases) * 100 : 0;
    
    // Ensure total doesn't exceed 100 due to floating point math
    const baixaPercent = Math.max(0, 100 - altaPercent - mediaPercent);


    const pieChartStyle = {
        background: `conic-gradient(
            #ef4444 ${altaPercent}%, 
            #f59e0b 0 ${altaPercent + mediaPercent}%,
            #22c55e 0
        )`
    };
    
    const totalDeadlines = deadlineStatus.overdue + deadlineStatus.dueSoon + deadlineStatus.onTrack;

    return (
        <div className="mt-8 p-6 bg-white rounded-lg shadow-lg border border-gray-200">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Dashboard Geral de KPIs</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Chart 1: Cases per Assignee */}
                <div className="p-4 rounded-lg border bg-gray-50">
                    <h3 className="text-lg font-semibold text-gray-700 mb-4">Casos por Atribuído (Top 10)</h3>
                    <div className="space-y-2">
                        {sortedAssignees.length > 0 ? sortedAssignees.map(([name, count]) => (
                            <div key={name} className="flex items-center text-sm">
                                <span className="w-2/5 truncate" title={name}>{name}</span>
                                <div className="w-3/5 bg-gray-200 rounded-full h-4">
                                    <div 
                                        className="bg-indigo-600 h-4 rounded-full text-white text-[10px] flex items-center justify-center"
                                        style={{width: `${sortedAssignees.length > 0 && sortedAssignees[0][1] > 0 ? (count / sortedAssignees[0][1]) * 100 : 0}%`}}
                                    >
                                        {count}
                                    </div>
                                </div>
                            </div>
                        )) : <p className="text-sm text-gray-500">Nenhum caso atribuído.</p>}
                    </div>
                </div>

                 {/* Chart 2: Cases per Co-Responsible */}
                <div className="p-4 rounded-lg border bg-gray-50">
                    <h3 className="text-lg font-semibold text-gray-700 mb-4">Casos por Co-Responsável (Top 10)</h3>
                    <div className="space-y-2">
                        {sortedCoResponsibles.length > 0 ? sortedCoResponsibles.map(([name, count]) => (
                            <div key={name} className="flex items-center text-sm">
                                <span className="w-2/5 truncate" title={name}>{name}</span>
                                <div className="w-3/5 bg-gray-200 rounded-full h-4">
                                    <div 
                                        className="bg-purple-600 h-4 rounded-full text-white text-[10px] flex items-center justify-center"
                                        style={{width: `${sortedCoResponsibles.length > 0 && sortedCoResponsibles[0][1] > 0 ? (count / sortedCoResponsibles[0][1]) * 100 : 0}%`}}
                                    >
                                        {count}
                                    </div>
                                </div>
                            </div>
                        )) : <p className="text-sm text-gray-500">Nenhum caso com co-responsável.</p>}
                    </div>
                </div>


                {/* Chart 3: Priority Distribution */}
                <div className="p-4 rounded-lg border bg-gray-50">
                    <h3 className="text-lg font-semibold text-gray-700 mb-4">Distribuição por Prioridade</h3>
                    {totalPriorityCases > 0 ? (
                        <div className="flex items-center gap-6">
                            <div className="w-24 h-24 rounded-full" style={pieChartStyle}></div>
                            <div className="text-sm space-y-2">
                                <div className="flex items-center"><span className="w-4 h-4 rounded-sm bg-red-500 mr-2"></span><span>Alta: {priority.Alta} ({altaPercent.toFixed(1)}%)</span></div>
                                <div className="flex items-center"><span className="w-4 h-4 rounded-sm bg-yellow-500 mr-2"></span><span>Média: {priority.Média} ({mediaPercent.toFixed(1)}%)</span></div>
                                <div className="flex items-center"><span className="w-4 h-4 rounded-sm bg-green-500 mr-2"></span><span>Baixa: {priority.Baixa} ({baixaPercent.toFixed(1)}%)</span></div>
                            </div>
                        </div>
                    ) : (
                         <p className="text-sm text-gray-500">Nenhum caso para exibir.</p>
                    )}
                </div>

                {/* Chart 4: Deadline Status */}
                <div className="p-4 rounded-lg border bg-gray-50">
                    <h3 className="text-lg font-semibold text-gray-700 mb-4">Status Geral dos Prazos</h3>
                    <div className="space-y-3">
                        <div className="flex items-center">
                            <span className="w-28 text-sm text-gray-600">Vencidos</span>
                            <div className="flex-1 bg-gray-200 rounded-full h-5"><div className="bg-red-500 h-5 rounded-full text-white text-xs flex items-center justify-center" style={{width: `${totalDeadlines > 0 ? (deadlineStatus.overdue/totalDeadlines)*100 : 0}%`}}>{deadlineStatus.overdue > 0 && deadlineStatus.overdue}</div></div>
                        </div>
                         <div className="flex items-center">
                            <span className="w-28 text-sm text-gray-600">Vence em 7 dias</span>
                            <div className="flex-1 bg-gray-200 rounded-full h-5"><div className="bg-yellow-500 h-5 rounded-full text-white text-xs flex items-center justify-center" style={{width: `${totalDeadlines > 0 ? (deadlineStatus.dueSoon/totalDeadlines)*100 : 0}%`}}>{deadlineStatus.dueSoon > 0 && deadlineStatus.dueSoon}</div></div>
                        </div>
                         <div className="flex items-center">
                            <span className="w-28 text-sm text-gray-600">Em dia</span>
                            <div className="flex-1 bg-gray-200 rounded-full h-5"><div className="bg-green-500 h-5 rounded-full text-white text-xs flex items-center justify-center" style={{width: `${totalDeadlines > 0 ? (deadlineStatus.onTrack/totalDeadlines)*100 : 0}%`}}>{deadlineStatus.onTrack > 0 && deadlineStatus.onTrack}</div></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GlobalKpiDashboard;