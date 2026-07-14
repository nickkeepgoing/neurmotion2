export type TestId = 'spiral' | 'tapping' | 'tremor' | 'facial' | 'voice';

export type TestResult = {
  test: TestId;
  metrics: Record<string, number>;
  subScore: number; // 0-100, higher = more concerning
  timestamp: string; // ISO
};

export type RiskLevel = 'low' | 'medium' | 'high';

export type Session = {
  id: string;
  userType: 'general' | 'patient';
  results: TestResult[];
  overallScore: number;
  riskLevel: RiskLevel;
  timestamp: string; // ISO
};

export type Settings = {
  consented: boolean; // (a) required consent — store results for screening
  consentTraining: boolean; // (b) optional — anonymized data for model improvement
  userType: 'general' | 'patient';
  displayName: string;
  textScale: 0 | 1 | 2; // A / A+ / A++
  voiceOn: boolean; // Thai spoken instructions (elderly-friendly)
  age?: number;
  nationalId?: string; // patient login (full patient system is future work)
  // registered account profile — stored locally only
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
};
