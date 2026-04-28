import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SplitCalculator } from './SplitCalculator';
import { clearCalculatorTemplates, saveCalculatorTemplate } from '../../services/calculatorTemplateStore';

describe('SplitCalculator', () => {
  beforeEach(() => {
    localStorage.clear();
    clearCalculatorTemplates();
  });

  afterEach(() => {
    localStorage.clear();
    clearCalculatorTemplates();
  });

  it('applies a saved template and resets to the initial calculator state', () => {
    saveCalculatorTemplate('Vacation', {
      type: 'equal',
      participants: [
        { id: '1', name: 'Alice', amount: 50, percentage: 50, items: [] },
        { id: '2', name: 'Bob', amount: 50, percentage: 50, items: [] },
      ],
      items: [],
      totalAmount: 100,
      taxAmount: 0,
      tipAmount: 0,
      currency: 'EUR',
      rounding: 'none',
    });

    render(<SplitCalculator />);

    expect(screen.getByRole('button', { name: /Apply/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Apply/i }));

    expect(screen.getByLabelText(/currency/i)).toHaveValue('EUR');

    fireEvent.click(screen.getByRole('button', { name: /Reset/i }));

    expect(screen.getByLabelText(/currency/i)).toHaveValue('USD');
  });
});
