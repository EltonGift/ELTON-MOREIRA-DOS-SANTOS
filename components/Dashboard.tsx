import React from 'react';
import type { CaseData, User } from '../types';

interface DashboardProps {
  cases: CaseData[];
  filters: { searchTerm: string; priority: string; ownerName?: string };
  onFilterChange: (filters: { searchTerm: string; priority: string; ownerName?: string }) => void;
  users?: User[];
}

interface StatCardProps {
    title: string;
    value: number;
    icon: React.ReactNode;
    color: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color }) => (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 flex items-center">
        <div className={`p-3 rounded-full mr-4 ${color}`}>
            {icon}
        </div>
        <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
    </div>
);

const Dashboard: React.FC<DashboardProps> = ({ cases, filters, onFilterChange, users }) => {
  const totalCases = cases.length;
  const highPriority = cases.filter(c => c.prioridade === 'Alta').length;
  const mediumPriority = cases.filter(c => c.prioridade === 'Média').length;
  const lowPriority = cases.filter(c => c.prioridade === 'Baixa').length;

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    onFilterChange({ ...filters, [e.target.name]: e.target.value });
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
            title="Total de Casos" 
            value={totalCases}
            color="bg-blue-100 text-blue-600"
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>} 
        />
        <StatCard 
            title="Prioridade Alta" 
            value={highPriority} 
            color="bg-red-100 text-red-600"
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <StatCard 
            title="Prioridade Média" 
            value={mediumPriority}
            color="bg-yellow-100 text-yellow-600"
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <StatCard 
            title="Prioridade Baixa" 
            value={lowPriority}
            color="bg-green-100 text-green-600"
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
      </div>

      <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200 flex flex-col sm:flex-row gap-4 items-center">
        <h3 className="text-lg font-semibold text-gray-700">Filtros:</h3>
        <div className="flex-grow">
            <input 
                type="text"
                name="searchTerm"
                value={filters.searchTerm}
                onChange={handleFilterChange}
                placeholder="Buscar em todos os campos..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900"
            />
        </div>
        <div>
            <select
                name="priority"
                value={filters.priority}
                onChange={handleFilterChange}
                className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white"
            >
                <option value="all">Todas as Prioridades</option>
                <option value="Alta">Alta</option>
                <option value="Média">Média</option>
                <option value="Baixa">Baixa</option>
            </select>
        </div>
        {users && (
            <div>
                <select
                    name="ownerName"
                    value={filters.ownerName || 'all'}
                    onChange={handleFilterChange}
                    className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                >
                    <option value="all">Todos os Atribuídos</option>
                    {users.map(user => (
                        <option key={user.id} value={user.name}>{user.name}</option>
                    ))}
                </select>
            </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;