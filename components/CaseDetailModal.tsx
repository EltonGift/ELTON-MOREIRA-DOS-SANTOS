import React from 'react';
import type { CaseData, Attachment } from '../types';

interface CaseDetailModalProps {
    caseData: CaseData;
    onClose: () => void;
    onAddAttachment: (caseId: number, file: File) => void;
    isAdminView: boolean;
}

const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    const adjustedDate = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
    return adjustedDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const formatDateTime = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

const DetailItem: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
    <div>
        <dt className="text-xs font-medium text-gray-500">{label}</dt>
        <dd className="mt-1 text-sm text-gray-900">{value || 'N/A'}</dd>
    </div>
);

const CaseDetailModal: React.FC<CaseDetailModalProps> = ({ caseData, onClose, onAddAttachment, isAdminView }) => {
    const attachmentInputRef = React.useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            onAddAttachment(caseData.id, file);
            if (attachmentInputRef.current) {
                attachmentInputRef.current.value = '';
            }
        }
    };
    
    const handleDownload = (attachment: Attachment) => {
        const link = document.createElement('a');
        link.href = attachment.content;
        link.download = attachment.fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
            <div className="relative mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-xl bg-gray-50">
                <div className="flex justify-between items-center border-b pb-4 mb-5">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900">Detalhes do Processo</h3>
                        <p className="text-sm text-indigo-600 font-semibold">{caseData.processoNumero}</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                
                <div className="max-h-[70vh] overflow-y-auto pr-4 space-y-6">
                    {/* Main Details */}
                    <div className="bg-white p-4 rounded-lg border">
                        <h4 className="text-lg font-semibold text-gray-800 mb-4">Informações Gerais</h4>
                        <dl className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
                            <DetailItem label="Autor" value={caseData.autor} />
                            <DetailItem label="Réu" value={caseData.reu} />
                            <DetailItem label="Tribunal" value={caseData.tribunal} />
                            <DetailItem label="Vara/Comarca" value={caseData.varaComarca} />
                            <DetailItem label="Matéria" value={caseData.materia} />
                            <DetailItem label="Natureza da Ação" value={caseData.naturezaAcao} />
                            {isAdminView && <DetailItem label="Valor da Ação" value={caseData.valorDaAcao} />}
                            <DetailItem label="Segredo de Justiça" value={caseData.segredoDeJustica} />
                        </dl>
                    </div>

                     {/* Status & Deadlines */}
                     <div className="bg-white p-4 rounded-lg border">
                         <h4 className="text-lg font-semibold text-gray-800 mb-4">Prazos e Status</h4>
                         <dl className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
                            <DetailItem label="Status Atual" value={<span className="font-bold text-blue-700">{caseData.status}</span>} />
                            <DetailItem label="Fase" value={caseData.fases} />
                            <DetailItem label="Prioridade" value={caseData.prioridade} />
                            {isAdminView && <DetailItem label="Data de Nomeação" value={formatDate(caseData.dataNomeacao)} />}
                            <DetailItem label="Data Inicial" value={formatDate(caseData.dataInicial)} />
                            <DetailItem label="Prazo Final" value={<span className="font-bold text-red-600">{formatDate(caseData.dataFinal)}</span>} />
                         </dl>
                    </div>

                     {/* Assignment */}
                     <div className="bg-white p-4 rounded-lg border">
                         <h4 className="text-lg font-semibold text-gray-800 mb-4">Responsáveis</h4>
                         <dl className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
                            {isAdminView && <DetailItem label="Responsável Principal" value={caseData.ownerName} />}
                            <DetailItem label="Co-responsável" value={caseData.coResponsibleName} />
                            <DetailItem label="Atribuído a" value={<span className="font-bold">{caseData.name}</span>} />
                            <DetailItem label="E-mail do Atribuído" value={caseData.email} />
                         </dl>
                    </div>

                    {/* Tramitation History */}
                    <div>
                        <h4 className="text-lg font-semibold text-gray-800 mb-4">Histórico de Tramitação</h4>
                        <div className="overflow-x-auto bg-white border rounded-lg">
                             {(caseData.tramitationLog && caseData.tramitationLog.length > 0) ? (
                                <table className="w-full text-sm text-left text-gray-500">
                                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                        <tr>
                                            <th scope="col" className="px-4 py-2">De</th>
                                            <th scope="col" className="px-4 py-2">Para</th>
                                            <th scope="col" className="px-4 py-2">Data da Tramitação</th>
                                            <th scope="col" className="px-4 py-2">Prazo Definido</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {[...caseData.tramitationLog].reverse().map((log, index) => (
                                            <tr key={index} className="bg-white border-b hover:bg-gray-50">
                                                <td className="px-4 py-2 font-medium text-gray-800">{log.fromUser}</td>
                                                <td className="px-4 py-2 font-medium text-gray-800">{log.toUser}</td>
                                                <td className="px-4 py-2">{formatDateTime(log.timestamp)}</td>
                                                <td className="px-4 py-2">{formatDate(log.deadline)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                             ) : (
                                <p className="text-sm text-gray-500 italic p-4">Nenhuma tramitação registrada.</p>
                             )}
                        </div>
                    </div>

                    {/* Attachments */}
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="text-lg font-semibold text-gray-800">Anexos</h4>
                            <input type="file" ref={attachmentInputRef} onChange={handleFileChange} className="hidden" accept=".zip,.rar,.doc,.docx,.xls,.xlsx,.txt,.csv,.pdf" />
                            <button 
                                onClick={() => attachmentInputRef.current?.click()}
                                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                Adicionar Anexo
                            </button>
                        </div>
                        <div className="overflow-x-auto bg-white border rounded-lg">
                            {(caseData.attachments && caseData.attachments.length > 0) ? (
                                <table className="w-full text-sm text-left text-gray-500">
                                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                        <tr>
                                            <th scope="col" className="px-4 py-2">Nome do Arquivo</th>
                                            <th scope="col" className="px-4 py-2">Tamanho</th>
                                            <th scope="col" className="px-4 py-2">Enviado por</th>
                                            <th scope="col" className="px-4 py-2">Data</th>
                                            <th scope="col" className="px-4 py-2 text-right">Ação</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {[...caseData.attachments].reverse().map((att) => (
                                            <tr key={att.id} className="bg-white border-b hover:bg-gray-50">
                                                <td className="px-4 py-2 font-medium text-gray-800 truncate max-w-xs" title={att.fileName}>{att.fileName}</td>
                                                <td className="px-4 py-2">{formatBytes(att.fileSize)}</td>
                                                <td className="px-4 py-2">{att.uploadedBy}</td>
                                                <td className="px-4 py-2">{formatDateTime(att.timestamp)}</td>
                                                <td className="px-4 py-2 text-right">
                                                    <button onClick={() => handleDownload(att)} className="font-medium text-indigo-600 hover:text-indigo-800">
                                                        Baixar
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <p className="text-sm text-gray-500 italic p-4">Nenhum anexo encontrado.</p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="mt-6 text-right">
                    <button onClick={onClose} className="px-6 py-2 bg-indigo-600 text-white text-base font-medium rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CaseDetailModal;