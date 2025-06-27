import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import App from '../src/recon-frontend/src/App';
import FileUploader from '../src/recon-frontend/src/components/FileUploader';
import SummaryDashboard from '../src/recon-frontend/src/components/SummaryDashboard';
import CategoryTable from '../src/recon-frontend/src/components/CategoryTable';

// Mock axios for API calls
jest.mock('axios', () => ({
  post: jest.fn(),
  get: jest.fn(),
}));

// Mock file-saver
jest.mock('file-saver', () => ({
  saveAs: jest.fn(),
}));

// Mock papaparse
jest.mock('papaparse', () => ({
  unparse: jest.fn(() => 'mocked,csv,data'),
}));

describe('App Component', () => {
  test('renders main title and description', () => {
    render(<App />);
    
    expect(screen.getByText('Transaction Reconciliation Tool')).toBeInTheDocument();
    expect(screen.getByText('Upload and compare internal and provider transaction files')).toBeInTheDocument();
  });

  test('shows file uploader initially', () => {
    render(<App />);
    
    expect(screen.getByText('Upload CSV Files')).toBeInTheDocument();
  });

  test('does not show results initially', () => {
    render(<App />);
    
    expect(screen.queryByText('Matched Transactions')).not.toBeInTheDocument();
    expect(screen.queryByText('Internal Only Transactions')).not.toBeInTheDocument();
    expect(screen.queryByText('Provider Only Transactions')).not.toBeInTheDocument();
  });
});

describe('FileUploader Component', () => {
  const mockOnReconciliationComplete = jest.fn();

  beforeEach(() => {
    mockOnReconciliationComplete.mockClear();
  });

  test('renders upload areas for both files', () => {
    render(<FileUploader onReconciliationComplete={mockOnReconciliationComplete} />);
    
    expect(screen.getByText('Internal System Export')).toBeInTheDocument();
    expect(screen.getByText('Provider Statement')).toBeInTheDocument();
  });

  test('shows upload button as disabled initially', () => {
    render(<FileUploader onReconciliationComplete={mockOnReconciliationComplete} />);
    
    const uploadButton = screen.getByRole('button', { name: /upload and reconcile/i });
    expect(uploadButton).toBeDisabled();
  });

  test('displays file names when files are selected', async () => {
    render(<FileUploader onReconciliationComplete={mockOnReconciliationComplete} />);
    
    const file = new File(['test,data\n1,100'], 'test.csv', { type: 'text/csv' });
    const input = screen.getAllByRole('textbox', { hidden: true })[0];
    
    await userEvent.upload(input, file);
    
    await waitFor(() => {
      expect(screen.getByText('test.csv')).toBeInTheDocument();
    });
  });

  test('shows error for invalid file types', async () => {
    render(<FileUploader onReconciliationComplete={mockOnReconciliationComplete} />);
    
    const file = new File(['test data'], 'test.txt', { type: 'text/plain' });
    const input = screen.getAllByRole('textbox', { hidden: true })[0];
    
    await userEvent.upload(input, file);
    
    await waitFor(() => {
      expect(screen.getByText(/please upload a csv file under 10mb/i)).toBeInTheDocument();
    });
  });

  test('enables upload button when both files are selected', async () => {
    render(<FileUploader onReconciliationComplete={mockOnReconciliationComplete} />);
    
    const file1 = new File(['test,data\n1,100'], 'internal.csv', { type: 'text/csv' });
    const file2 = new File(['ref,amount\n1,100'], 'provider.csv', { type: 'text/csv' });
    
    const inputs = screen.getAllByRole('textbox', { hidden: true });
    
    await userEvent.upload(inputs[0], file1);
    await userEvent.upload(inputs[1], file2);
    
    await waitFor(() => {
      const uploadButton = screen.getByRole('button', { name: /upload and reconcile/i });
      expect(uploadButton).not.toBeDisabled();
    });
  });
});

describe('SummaryDashboard Component', () => {
  const mockSummary = {
    matched: 150,
    internal_only: 25,
    provider_only: 10,
    anomalies: 5,
    high_risk: 2,
    amount_mismatches: 8,
    status_mismatches: 3
  };

  const mockColumnMappings = {
    internal: {
      transaction_reference: 'txn_id',
      amount: 'total_amount'
    },
    provider: {
      transaction_reference: 'ref_id',
      amount: 'value'
    }
  };

  test('renders summary statistics correctly', () => {
    render(<SummaryDashboard summary={mockSummary} />);
    
    expect(screen.getByText('150')).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  test('displays AI insights', () => {
    render(<SummaryDashboard summary={mockSummary} />);
    
    expect(screen.getByText('AI Anomalies')).toBeInTheDocument();
    expect(screen.getByText('High Risk')).toBeInTheDocument();
    expect(screen.getByText('Amount Issues')).toBeInTheDocument();
    expect(screen.getByText('Status Issues')).toBeInTheDocument();
  });

  test('shows column mapping results when provided', () => {
    render(<SummaryDashboard summary={mockSummary} columnMappings={mockColumnMappings} />);
    
    expect(screen.getByText('AI Column Mapping Results')).toBeInTheDocument();
    expect(screen.getByText('Internal File Mappings')).toBeInTheDocument();
    expect(screen.getByText('Provider File Mappings')).toBeInTheDocument();
  });

  test('calculates percentages correctly', () => {
    render(<SummaryDashboard summary={mockSummary} />);
    
    const total = 150 + 25 + 10; // 185
    const matchedPercentage = ((150 / 185) * 100).toFixed(1);
    
    expect(screen.getByText(`${matchedPercentage}% of total`)).toBeInTheDocument();
  });

  test('handles empty summary gracefully', () => {
    render(<SummaryDashboard summary={null} />);
    
    expect(screen.queryByText('Matched Transactions')).not.toBeInTheDocument();
  });
});

describe('CategoryTable Component', () => {
  const mockData = [
    {
      transaction_reference: 'TXN001',
      amount_internal: 100,
      amount_provider: 100,
      status_internal: 'Completed',
      status_provider: 'Completed',
      amount_match: true,
      status_match: true,
      anomaly: false,
      risk_level: 'Low'
    },
    {
      transaction_reference: 'TXN002',
      amount_internal: 200,
      amount_provider: 250,
      status_internal: 'Pending',
      status_provider: 'Completed',
      amount_match: false,
      status_match: false,
      anomaly: true,
      risk_level: 'High'
    }
  ];

  test('renders table with data', () => {
    render(
      <CategoryTable
        title="Test Transactions"
        data={mockData}
        category="matched"
        sessionId="test-session"
      />
    );
    
    expect(screen.getByText('Test Transactions (2)')).toBeInTheDocument();
    expect(screen.getByText('TXN001')).toBeInTheDocument();
    expect(screen.getByText('TXN002')).toBeInTheDocument();
  });

  test('shows export buttons', () => {
    render(
      <CategoryTable
        title="Test Transactions"
        data={mockData}
        category="matched"
        sessionId="test-session"
      />
    );
    
    expect(screen.getByText('Export CSV (Client)')).toBeInTheDocument();
    expect(screen.getByText('Export CSV (Server)')).toBeInTheDocument();
  });

  test('displays search functionality', () => {
    render(
      <CategoryTable
        title="Test Transactions"
        data={mockData}
        category="matched"
        sessionId="test-session"
      />
    );
    
    expect(screen.getByPlaceholderText('Search transactions...')).toBeInTheDocument();
  });

  test('filters data based on search term', async () => {
    render(
      <CategoryTable
        title="Test Transactions"
        data={mockData}
        category="matched"
        sessionId="test-session"
      />
    );
    
    const searchInput = screen.getByPlaceholderText('Search transactions...');
    
    await userEvent.type(searchInput, 'TXN001');
    
    await waitFor(() => {
      expect(screen.getByText('TXN001')).toBeInTheDocument();
      expect(screen.queryByText('TXN002')).not.toBeInTheDocument();
    });
  });

  test('handles empty data gracefully', () => {
    render(
      <CategoryTable
        title="Empty Transactions"
        data={[]}
        category="matched"
        sessionId="test-session"
      />
    );
    
    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  test('sorts data when column headers are clicked', async () => {
    render(
      <CategoryTable
        title="Test Transactions"
        data={mockData}
        category="matched"
        sessionId="test-session"
      />
    );
    
    const referenceHeader = screen.getByText('TRANSACTION_REFERENCE');
    
    await userEvent.click(referenceHeader);
    
    // Check that sort indicator appears
    await waitFor(() => {
      expect(screen.getByText('↑')).toBeInTheDocument();
    });
  });

  test('displays pagination when needed', () => {
    // Create data with more than 10 items to trigger pagination
    const largeData = Array.from({ length: 15 }, (_, i) => ({
      transaction_reference: `TXN${i.toString().padStart(3, '0')}`,
      amount: 100 + i,
      status: 'Completed'
    }));

    render(
      <CategoryTable
        title="Large Dataset"
        data={largeData}
        category="matched"
        sessionId="test-session"
      />
    );
    
    expect(screen.getByText('Previous')).toBeInTheDocument();
    expect(screen.getByText('Next')).toBeInTheDocument();
    expect(screen.getByText(/Page 1 of/)).toBeInTheDocument();
  });
});

describe('Integration Tests', () => {
  test('complete workflow from upload to results display', async () => {
    const mockAxios = require('axios');
    
    const mockResponse = {
      data: {
        matched: [
          {
            transaction_reference: 'TXN001',
            amount_internal: 100,
            amount_provider: 100,
            status_internal: 'Completed',
            status_provider: 'Completed',
            amount_match: true,
            status_match: true
          }
        ],
        internal_only: [],
        provider_only: [],
        summary: {
          matched: 1,
          internal_only: 0,
          provider_only: 0,
          anomalies: 0,
          high_risk: 0,
          amount_mismatches: 0,
          status_mismatches: 0
        },
        session_id: 'test-session',
        column_mappings: {
          internal: { transaction_reference: 'txn_id' },
          provider: { transaction_reference: 'ref_id' }
        }
      }
    };
    
    mockAxios.post.mockResolvedValue(mockResponse);
    
    render(<App />);
    
    // Upload files
    const file1 = new File(['txn_id,amount\nTXN001,100'], 'internal.csv', { type: 'text/csv' });
    const file2 = new File(['ref_id,value\nTXN001,100'], 'provider.csv', { type: 'text/csv' });
    
    const inputs = screen.getAllByRole('textbox', { hidden: true });
    
    await userEvent.upload(inputs[0], file1);
    await userEvent.upload(inputs[1], file2);
    
    // Click upload button
    const uploadButton = screen.getByRole('button', { name: /upload and reconcile/i });
    await userEvent.click(uploadButton);
    
    // Wait for results to appear
    await waitFor(() => {
      expect(screen.getByText('Matched Transactions')).toBeInTheDocument();
      expect(screen.getByText('AI Column Mapping Results')).toBeInTheDocument();
    });
    
    // Verify API was called
    expect(mockAxios.post).toHaveBeenCalledWith(
      'http://localhost:5000/api/upload_and_reconcile',
      expect.any(FormData),
      expect.objectContaining({
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
    );
  });

  test('handles API errors gracefully', async () => {
    const mockAxios = require('axios');
    
    mockAxios.post.mockRejectedValue({
      response: {
        data: {
          error: 'Invalid CSV format'
        }
      }
    });
    
    render(<App />);
    
    // Upload files
    const file1 = new File(['invalid data'], 'internal.csv', { type: 'text/csv' });
    const file2 = new File(['invalid data'], 'provider.csv', { type: 'text/csv' });
    
    const inputs = screen.getAllByRole('textbox', { hidden: true });
    
    await userEvent.upload(inputs[0], file1);
    await userEvent.upload(inputs[1], file2);
    
    // Click upload button
    const uploadButton = screen.getByRole('button', { name: /upload and reconcile/i });
    await userEvent.click(uploadButton);
    
    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText('Invalid CSV format')).toBeInTheDocument();
    });
  });
});

describe('Accessibility Tests', () => {
  test('file upload areas have proper labels', () => {
    const mockOnReconciliationComplete = jest.fn();
    render(<FileUploader onReconciliationComplete={mockOnReconciliationComplete} />);
    
    expect(screen.getByText('Internal System Export')).toBeInTheDocument();
    expect(screen.getByText('Provider Statement')).toBeInTheDocument();
  });

  test('buttons have accessible names', () => {
    const mockData = [{ transaction_reference: 'TXN001', amount: 100 }];
    
    render(
      <CategoryTable
        title="Test"
        data={mockData}
        category="matched"
        sessionId="test"
      />
    );
    
    expect(screen.getByRole('button', { name: /export csv \(client\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /export csv \(server\)/i })).toBeInTheDocument();
  });

  test('search input has proper placeholder', () => {
    const mockData = [{ transaction_reference: 'TXN001', amount: 100 }];
    
    render(
      <CategoryTable
        title="Test"
        data={mockData}
        category="matched"
        sessionId="test"
      />
    );
    
    const searchInput = screen.getByPlaceholderText('Search transactions...');
    expect(searchInput).toBeInTheDocument();
    expect(searchInput).toHaveAttribute('type', 'text');
  });
});

describe('Performance Tests', () => {
  test('handles large datasets without crashing', () => {
    const largeData = Array.from({ length: 1000 }, (_, i) => ({
      transaction_reference: `TXN${i.toString().padStart(6, '0')}`,
      amount: 100 + i,
      status: 'Completed'
    }));

    expect(() => {
      render(
        <CategoryTable
          title="Large Dataset"
          data={largeData}
          category="matched"
          sessionId="test"
        />
      );
    }).not.toThrow();
    
    // Should only render first page (10 items)
    expect(screen.getByText('TXN000000')).toBeInTheDocument();
    expect(screen.queryByText('TXN000015')).not.toBeInTheDocument();
  });

  test('search performance with large datasets', async () => {
    const largeData = Array.from({ length: 1000 }, (_, i) => ({
      transaction_reference: `TXN${i.toString().padStart(6, '0')}`,
      amount: 100 + i,
      status: i % 2 === 0 ? 'Completed' : 'Pending'
    }));

    render(
      <CategoryTable
        title="Large Dataset"
        data={largeData}
        category="matched"
        sessionId="test"
      />
    );
    
    const searchInput = screen.getByPlaceholderText('Search transactions...');
    
    // Search should complete quickly
    const startTime = Date.now();
    await userEvent.type(searchInput, 'Pending');
    const endTime = Date.now();
    
    expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
  });
});

