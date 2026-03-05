export type UserRole = 'admin' | 'judge';

export type Modality = string;

export interface ModalityConfig {
  id: string;
  name: string;
  createdAt: number;
}

export const INITIAL_MODALITIES: Modality[] = [];

export interface AppUser {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: number;
}

export interface ReserveActivation {
  competitorId: string;
  testId: string;
  activatedAt: number;
  activatedBy: string;
}

export interface Room {
  id: string;
  name: string;
  description: string;
  active: boolean;
  createdBy: string;
  judges: string[];
  judgeReserves?: string[];
  judgeReserveModalities?: Record<string, string[]>;
  judgeCompetitorReserves?: Record<string, string[]>;
  reserveActivations?: ReserveActivation[];
  judgeAssignments?: Record<string, string[]>;
  judgeModalities?: Record<string, Modality[]>;
  createdAt: number;
  startDate?: string;
  startTime?: string;
  endDate?: string;
  endTime?: string;
}

export interface Competitor {
  id: string;
  roomId: string;
  handlerName: string;
  dogName: string;
  dogBreed: string;
  modality: Modality;
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
  value: number;
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
  testNumber?: number;
}

export interface Evaluation {
  id: string;
  roomId: string;
  testId: string;
  competitorId: string;
  judgeId: string;

  scores: Record<string, number>;

  penaltiesApplied: {
    penaltyId: string;
    value: number;
    description: string;
  }[];

  finalScore: number;
  notes?: string;
  status?: 'evaluated' | 'did_not_participate';
  createdAt: number;
}

export interface EditScoreRequest {
  id: string;
  roomId: string;
  competitorId: string;
  competitorName: string;
  testId: string;
  testTitle: string;
  evaluationId: string;
  judgeId: string;
  judgeName: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'consumed';
  respondedBy?: string;
  respondedAt?: number;
  createdAt: number;
}
