import React, { useState, useMemo } from 'react';
import type { CaseData } from '../types';
import CaseDetailModal from './CaseDetailModal';

interface CalendarViewProps {
  cases: CaseData[];
  onAddAttachment: (caseId: number, file: File) => void;
  isAdminView: boolean;
}

const CalendarView: React.FC<CalendarViewProps> = ({ cases, onAddAttachment, isAdminView }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedCase, setSelectedCase] = useState<CaseData | null>(null);

  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const daysOfWeek = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  const casesByDate = useMemo(() => {
    const map = new Map<string, CaseData[]>();
    cases.forEach(c => {
      if (c.dataFinal) {
        // Normalize date to YYYY-MM-DD format without time zone issues
        const date = new Date(c.dataFinal);
        
        // FIX: Check if the date is valid before processing to prevent crashes
        if (isNaN(date.getTime())) {
            return; // Skip cases with invalid date strings
        }

        const adjustedDate = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
        const key = adjustedDate.toISOString().split('T')[0];
        if (!map.has(key)) {
          map.set(key, []);
        }
        map.get(key)!.push(c);
      }
    });
    return map;
  }, [cases]);

  const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const startDay = startOfMonth.getDay();
  const daysInMonth = endOfMonth.getDate();

  const calendarDays = [];
  // Add blank days for the start of the month
  for (let i = 0; i < startDay; i++) {
    calendarDays.push(<div key={`empty-start-${i}`} className="border-r border-b border-gray-200"></div>);
  }

  // Add the actual days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const dateKey = date.toISOString().split('T')[0];
    const dayCases = casesByDate.get(dateKey) || [];
    const isToday = new Date().toISOString().split('T')[0] === dateKey;

    calendarDays.push(
      <div key={day} className="p-2 border-r border-b border-gray-200 min-h-[120px] flex flex-col">
        <div className={`font-semibold text-sm ${isToday ? 'bg-indigo-600 text-white rounded-full w-7 h-7 flex items-center justify-center' : 'text-gray-700'}`}>
          {day}
        </div>
        <div className="mt-1 space-y-1 overflow-y-auto flex-1">
          {dayCases.map(c => (
            <div
              key={c.id}
              onClick={() => setSelectedCase(c)}
              className="p-1.5 rounded-md text-xs cursor-pointer bg-indigo-100 text-indigo-800 hover:bg-indigo-200"
            >
              <p className="font-semibold truncate">{c.processoNumero}</p>
              <p className="truncate">{c.autor}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const changeMonth = (offset: number) => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Calendário de Prazos</h2>
        <div className="flex items-center gap-4">
          <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-gray-200">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <span className="text-lg font-semibold text-gray-700 w-40 text-center">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </span>
          <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-gray-200">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 border-t border-l border-gray-200">
        {daysOfWeek.map(day => (
          <div key={day} className="p-2 text-center text-sm font-medium text-gray-500 bg-gray-50 border-r border-b border-gray-200">{day}</div>
        ))}
        {calendarDays}
      </div>
      {selectedCase && (
        <CaseDetailModal
          caseData={selectedCase}
          onClose={() => setSelectedCase(null)}
          onAddAttachment={onAddAttachment}
          isAdminView={isAdminView}
        />
      )}
    </div>
  );
};

export default CalendarView;