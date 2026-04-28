import {
  clearCalculatorTemplates,
  deleteCalculatorTemplate,
  DuplicateTemplateNameError,
  getCalculatorTemplate,
  listCalculatorTemplates,
  saveCalculatorTemplate,
} from './calculatorTemplateStore';

describe('calculatorTemplateStore', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('saves and lists a new calculator template', () => {
    const template = saveCalculatorTemplate('Lunch Split', {
      type: 'equal',
      participants: [
        { id: '1', name: 'Alice', amount: 10, percentage: 50, items: [] },
        { id: '2', name: 'Bob', amount: 10, percentage: 50, items: [] },
      ],
      items: [],
      totalAmount: 20,
      taxAmount: 0,
      tipAmount: 0,
      currency: 'USD',
      rounding: 'none',
    });

    expect(template.name).toBe('Lunch Split');
    expect(listCalculatorTemplates()).toHaveLength(1);
    expect(listCalculatorTemplates()[0].name).toBe('Lunch Split');
  });

  it('rejects duplicate template names', () => {
    saveCalculatorTemplate('Lunch Split', {
      type: 'equal',
      participants: [
        { id: '1', name: 'Alice', amount: 0, percentage: 0, items: [] },
      ],
      items: [],
      totalAmount: 0,
      taxAmount: 0,
      tipAmount: 0,
      currency: 'USD',
      rounding: 'none',
    });

    expect(() =>
      saveCalculatorTemplate('Lunch Split', {
        type: 'equal',
        participants: [
          { id: '1', name: 'Alice', amount: 0, percentage: 0, items: [] },
        ],
        items: [],
        totalAmount: 0,
        taxAmount: 0,
        tipAmount: 0,
        currency: 'USD',
        rounding: 'none',
      }),
    ).toThrow(DuplicateTemplateNameError);
  });

  it('returns a deep clone when loading a calculator template', () => {
    saveCalculatorTemplate('Dinner', {
      type: 'equal',
      participants: [
        { id: '1', name: 'Alice', amount: 10, percentage: 0, items: [] },
      ],
      items: [],
      totalAmount: 10,
      taxAmount: 0,
      tipAmount: 0,
      currency: 'USD',
      rounding: 'none',
    });

    const loadedTemplate = getCalculatorTemplate('Dinner');
    expect(loadedTemplate).not.toBeNull();
    if (loadedTemplate) {
      loadedTemplate.state.totalAmount = 999;
    }

    const again = getCalculatorTemplate('Dinner');
    expect(again?.state.totalAmount).toBe(10);
  });

  it('deletes a template and clears storage', () => {
    saveCalculatorTemplate('Gym', {
      type: 'equal',
      participants: [
        { id: '1', name: 'Alice', amount: 0, percentage: 0, items: [] },
      ],
      items: [],
      totalAmount: 0,
      taxAmount: 0,
      tipAmount: 0,
      currency: 'USD',
      rounding: 'none',
    });

    deleteCalculatorTemplate('Gym');
    expect(listCalculatorTemplates()).toHaveLength(0);

    saveCalculatorTemplate('Office', {
      type: 'equal',
      participants: [
        { id: '1', name: 'Alice', amount: 0, percentage: 0, items: [] },
      ],
      items: [],
      totalAmount: 0,
      taxAmount: 0,
      tipAmount: 0,
      currency: 'USD',
      rounding: 'none',
    });

    clearCalculatorTemplates();
    expect(listCalculatorTemplates()).toHaveLength(0);
  });
});
