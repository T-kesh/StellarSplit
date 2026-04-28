import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { buildCalculatorShareUrl } from '../utils/calculatorShare';
import SplitCalculatorPage from './SplitCalculatorPage';

describe('SplitCalculatorPage', () => {
  it('hydrates calculator state from a valid share link', () => {
    const shareState = {
      type: 'equal',
      participants: [
        { id: '1', name: 'Alice', amount: 5, percentage: 50, items: [] },
        { id: '2', name: 'Bob', amount: 5, percentage: 50, items: [] },
      ],
      items: [],
      totalAmount: 10,
      taxAmount: 1,
      tipAmount: 2,
      currency: 'EUR',
      rounding: 'none',
    };

    const shareUrl = buildCalculatorShareUrl(shareState);

    render(
      <MemoryRouter initialEntries={[shareUrl]}>
        <Routes>
          <Route path="/calculator" element={<SplitCalculatorPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByLabelText(/currency/i)).toHaveValue('EUR');
  });

  it('renders a fallback message for invalid share payloads', () => {
    render(
      <MemoryRouter initialEntries={["/calculator?data=invalid-data"]}>
        <Routes>
          <Route path="/calculator" element={<SplitCalculatorPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText(/invalid calculator link/i)).toBeInTheDocument();
  });
});
