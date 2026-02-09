export type UserRole = 'admin' | 'judge';

export interface AppUser {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: number; // Timestamp (milliseconds)
}

export interface Room {
  id: string;
  name: string;
  description: string;
  active: boolean;
  createdBy: string; // Admin UID
  judges: string[]; // Array of Judge UIDs authorized for this room
  createdAt: number;
}

export interface Competitor {
  id: string;
  roomId: string;
  handlerName: string; // Nome da Condutora/Condutor
  dogName: string;
  dogBreed: string;
  competitorNumber: number;
  testId?: string; // ID da prova que o competidor vai realizar
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
  roomId?: string; // Se null, é um template global
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
