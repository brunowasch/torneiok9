export type UserRole = 'admin' | 'judge';

export type Modality =
  | 'Cão de patrulha e intervenção'
  | 'Proteção/intervenção'
  | 'Feminina'
  | 'Batalha Arena K9'
  | 'Busca e resgate por odor específico'
  | 'Faro de narcóticos';

export const MODALITIES: Modality[] = [
  'Cão de patrulha e intervenção',
  'Proteção/intervenção',
  'Feminina',
  'Batalha Arena K9',
  'Busca e resgate por odor específico',
  'Faro de narcóticos'
];

export interface AppUser {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: number;
}

export interface Room {
  id: string;
  name: string;
  description: string;
  active: boolean;
  createdBy: string; 
  judges: string[];
  judgeAssignments?: Record<string, string[]>;
  createdAt: number;
}

export interface Competitor {
  id: string;
  roomId: string;
  handlerName: string; 
  dogName: string;
  dogBreed: string;
  competitorNumber: number;
  testIds?: string[]; 
  testId?: string; // Deprecated: mantido para compatibilidade
  photoUrl?: string;
  createdAt: number;
}

export interface ScoreOption {
  id: string;
  label: string;
  maxPoints: number;
  description?: string;
}

export interface ScoreGroup {
  name: string; // ex: "Parte A: Avaliação da Condutora"
  items: ScoreOption[];
}

export interface PenaltyOption {
  id: string;
  label: string;
  value: number; // Valor negativo, ex: -5.0
}

export interface TestTemplate {
  id: string;
  roomId?: string; 
  modality?: Modality; 
  title: string; // ex: "Prova de Proteção 1"
  description: string;
  maxScore: number;
  groups: ScoreGroup[];
  penalties: PenaltyOption[];
}

export interface Evaluation {
  id: string;
  roomId: string;
  testId: string;
  competitorId: string;
  judgeId: string;

  // Mapa de IDs dos critérios de nota -> valor atribuído
  scores: Record<string, number>;

  // Lista de penalidades aplicadas
  penaltiesApplied: {
    penaltyId: string;
    value: number;
  }[];

  finalScore: number;
  notes?: string;
  createdAt: number;
}
