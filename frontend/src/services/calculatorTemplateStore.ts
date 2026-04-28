import type { CalculatorState } from '../components/SplitCalculator/SplitCalculator';

const STORAGE_KEY = 'splitcalculator_templates_v1';

export interface CalculatorTemplate {
  name: string;
  state: CalculatorState;
  createdAt: string;
  updatedAt: string;
}

export class DuplicateTemplateNameError extends Error {
  constructor(name: string) {
    super(`A template named '${name}' already exists.`);
    this.name = 'DuplicateTemplateNameError';
  }
}

export class CalculatorTemplateStoreError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CalculatorTemplateStoreError';
  }
}

function safelyParseTemplates(raw: string | null): Record<string, CalculatorTemplate> {
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return {};
    }

    return Object.entries(parsed).reduce((acc, [key, value]) => {
      if (
        typeof key === 'string' &&
        typeof value === 'object' &&
        value !== null &&
        typeof (value as any).name === 'string' &&
        typeof (value as any).createdAt === 'string' &&
        typeof (value as any).updatedAt === 'string' &&
        typeof (value as any).state === 'object'
      ) {
        acc[key] = value as CalculatorTemplate;
      }
      return acc;
    }, {} as Record<string, CalculatorTemplate>);
  } catch {
    return {};
  }
}

function persistTemplates(templates: Record<string, CalculatorTemplate>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
}

function cloneState(state: CalculatorState): CalculatorState {
  return JSON.parse(JSON.stringify(state));
}

export function listCalculatorTemplates(): CalculatorTemplate[] {
  const storage = safelyParseTemplates(localStorage.getItem(STORAGE_KEY));
  return Object.values(storage);
}

export function getCalculatorTemplate(name: string): CalculatorTemplate | null {
  const storage = safelyParseTemplates(localStorage.getItem(STORAGE_KEY));
  const candidate = storage[name];
  return candidate ? { ...candidate, state: cloneState(candidate.state) } : null;
}

export function saveCalculatorTemplate(name: string, state: CalculatorState): CalculatorTemplate {
  const normalizedName = name.trim();
  if (!normalizedName) {
    throw new CalculatorTemplateStoreError('Template name cannot be empty.');
  }

  const storage = safelyParseTemplates(localStorage.getItem(STORAGE_KEY));
  if (storage[normalizedName]) {
    throw new DuplicateTemplateNameError(normalizedName);
  }

  const template: CalculatorTemplate = {
    name: normalizedName,
    state: cloneState(state),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  storage[normalizedName] = template;
  persistTemplates(storage);

  return template;
}

export function deleteCalculatorTemplate(name: string): void {
  const storage = safelyParseTemplates(localStorage.getItem(STORAGE_KEY));
  if (storage[name]) {
    delete storage[name];
    persistTemplates(storage);
  }
}

export function clearCalculatorTemplates(): void {
  localStorage.removeItem(STORAGE_KEY);
}
