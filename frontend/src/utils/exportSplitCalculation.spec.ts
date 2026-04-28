import { exportSplitCalculation, buildSplitCalculationFileName } from './exportSplitCalculation';

describe('exportSplitCalculation', () => {
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;
  const clickSpy = vi.fn();
  const elementMock = {
    href: '',
    download: '',
    click: clickSpy,
  } as unknown as HTMLAnchorElement;

  beforeEach(() => {
    vi.spyOn(document, 'createElement').mockImplementation(() => elementMock);
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob://test-url');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    clickSpy.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(URL, 'createObjectURL', {
      value: originalCreateObjectURL,
      writable: true,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      value: originalRevokeObjectURL,
      writable: true,
    });
  });

  it('creates a JSON export and triggers a download', () => {
    exportSplitCalculation(
      {
        type: 'equal',
        participants: [{ id: '1', name: 'Alice', amount: 10 }],
        items: [],
        subtotal: 10,
        currency: 'USD',
      },
      'custom-name.json',
    );

    expect(elementMock.href).toBe('blob://test-url');
    expect(elementMock.download).toBe('custom-name.json');
    expect(clickSpy).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob://test-url');
  });

  it('generates a default file name when none is provided', () => {
    const fileName = buildSplitCalculationFileName('test-prefix');
    expect(fileName).toMatch(/^test-prefix-\d+\.json$/);
  });
});
