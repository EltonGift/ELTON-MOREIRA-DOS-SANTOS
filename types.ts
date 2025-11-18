export interface TramitationEntry {
  fromUser: string;
  toUser: string;
  timestamp: string;
  deadline: string;
}

export interface Attachment {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  content: string; // base64 data URL
  uploadedBy: string;
  timestamp: string;
}

export interface CaseData {
  id: number;
  id2: string;
  tribunal: string;
  processoNumero: string;
  autor: string;
  reu: string;
  trib: string;
  varaComarca: string;
  materia: string;
  ownerName: string; // Will always be "Ms Tributário"
  name: string; // Current assignee
  email: string; // Current assignee's email
  coResponsibleName?: string; // First assignee
  tramitationLog?: TramitationEntry[]; // Log of all tramitations
  attachments?: Attachment[]; // Array of file attachments
  dataNomeacao: string;
  dataInicial: string;
  prazoDeterminado: string;
  dataDesignada: string;
  dataFinal: string;
  startHour: string;
  finishHour: string;
  dataFinalCorridos: string;
  diasUteis: number;
  prioridade: 'Alta' | 'Média' | 'Baixa';
  dataAtribuida: string;
  fases: string;
  status: string;
  segredoDeJustica: 'Sim' | 'Não';
  naturezaAcao: string;
  valorDaAcao: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  password?: string;
  permission: 'adm' | 'user';
}

export interface Tribunal {
  id: number;
  name: string;
}

export interface Fase {
  id: number;
  name: string;
}

export interface Status {
  id: number;
  name: string;
}