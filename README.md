# Transaction Reconciliation Tool

A comprehensive web application for comparing internal and provider transaction CSVs, featuring drag-and-drop uploads, categorized results, AI-driven column mapping, and anomaly detection. Built with React, Flask, and Pandas.

## Features

### Core Functionality

- **Drag-and-Drop File Upload**: Support for CSV files up to 10MB with real-time validation
- **Intelligent Column Mapping**: AI-powered automatic detection and mapping of CSV columns
- **Transaction Comparison**: Automated reconciliation based on transaction reference IDs
- **Categorized Results**: Transactions sorted into Matched, Internal Only, and Provider Only
- **Export Options**: Client-side and server-side CSV export functionality

### AI Enhancements

- **Smart Column Detection**: Enhanced NLP-based column mapping with confidence scoring
- **Anomaly Detection**: Machine learning-powered identification of suspicious transactions
- **Risk Assessment**: Automatic flagging of high-risk discrepancies
- **Variance Analysis**: Statistical analysis of amount and status mismatches

### User Interface

- **Responsive Design**: Mobile-friendly interface built with TailwindCSS
- **Interactive Dashboard**: Summary statistics with pie charts and bar graphs
- **Advanced Tables**: Sortable, filterable, and paginated transaction views
- **Visual Indicators**: Color-coded highlighting for different transaction types and anomalies

## Tech Stack

### Frontend

- **React 18**: Modern React with hooks and functional components
- **TailwindCSS**: Utility-first CSS framework for responsive design
- **shadcn/ui**: High-quality UI components
- **Recharts**: Data visualization library for charts
- **React Dropzone**: File upload with drag-and-drop support
- **PapaParse**: CSV parsing and generation
- **Axios**: HTTP client for API communication

### Backend

- **Flask**: Python web framework with RESTful API design
- **Pandas**: Data manipulation and analysis
- **Scikit-learn**: Machine learning for anomaly detection
- **NumPy**: Numerical computing support
- **Flask-CORS**: Cross-origin resource sharing support

## Setup Instructions

### Prerequisites

- Python 3.11+
- Node.js 20+
- pnpm (recommended) or npm

### Backend Setup

1. Navigate to the backend directory:

   ```bash
   cd backend/recon-backend
   ```

2. Create and activate virtual environment:

   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:

   ```bash
   pip install -r requirements.txt
   ```

4. Start the Flask server:

   ```bash
   python src/main.py
   ```

The backend will be available at `http://localhost:5000`

### Frontend Setup

1. Navigate to the frontend directory:

   ```bash
   cd src/recon-frontend
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Start the development server:

   ```bash
   pnpm run dev
   ```

The frontend will be available at `http://localhost:5173`

## API Documentation

### Endpoints

#### POST /api/upload_and_reconcile

Upload and reconcile two CSV files.

**Request:**

- `internal_file`: CSV file (multipart/form-data)
- `provider_file`: CSV file (multipart/form-data)

**Response:**

```json
{
  "matched": [...],
  "internal_only": [...],
  "provider_only": [...],
  "summary": {
    "matched": 150,
    "internal_only": 25,
    "provider_only": 10,
    "anomalies": 5,
    "high_risk": 2,
    "amount_mismatches": 8,
    "status_mismatches": 3
  },
  "session_id": "unique_session_id",
  "column_mappings": {
    "internal": {...},
    "provider": {...}
  }
}
```

#### GET /api/export_csv

Export reconciliation results as CSV.

**Parameters:**

- `category`: matched | internal_only | provider_only
- `session_id`: Session identifier from reconciliation

**Response:** CSV file download

#### GET /api/export_all

Export all reconciliation results as a ZIP file.

**Parameters:**

- `session_id`: Session identifier from reconciliation

**Response:** ZIP file download containing all CSV files

## File Structure

```text
recon-tool/
├── backend/
│   └── recon-backend/
│       ├── src/
│       │   ├── main.py              # Flask application entry point
│       │   ├── models/              # Database models
│       │   ├── routes/
│       │   │   ├── reconciliation.py # Main reconciliation logic
│       │   │   └── user.py          # User management routes
│       │   └── static/              # Static files for deployment
│       ├── venv/                    # Python virtual environment
│       └── requirements.txt         # Python dependencies
├── src/
│   └── recon-frontend/
│       ├── src/
│       │   ├── components/
│       │   │   ├── FileUploader.jsx     # File upload component
│       │   │   ├── SummaryDashboard.jsx # Statistics dashboard
│       │   │   ├── CategoryTable.jsx    # Data table component
│       │   │   └── ui/                  # shadcn/ui components
│       │   ├── App.jsx              # Main application component
│       │   └── main.jsx             # React entry point
│       ├── public/                  # Static assets
│       └── package.json             # Node.js dependencies
├── docs/                            # Documentation files
├── tests/                           # Test files
└── README.md                        # This file
```

## Usage Guide

### 1. File Upload

- Drag and drop or click to select two CSV files
- Files must be under 10MB and in CSV format
- The system will automatically validate file format and size

### 2. Column Mapping

- The AI system automatically detects and maps columns
- Common patterns recognized:
  - Transaction Reference: `id`, `reference`, `txn_id`, `transaction_id`
  - Amount: `amount`, `value`, `total`, `sum`
  - Status: `status`, `state`, `condition`
  - Date: `date`, `timestamp`, `created`
  - Currency: `currency`, `curr`, `ccy`

### 3. Reconciliation Results

- **Matched Transactions**: Present in both files
  - Green highlighting for perfect matches
  - Orange highlighting for amount mismatches
  - Red highlighting for status mismatches
  - Purple highlighting for AI-detected anomalies
- **Internal Only**: Transactions only in internal file (yellow highlighting)
- **Provider Only**: Transactions only in provider file (red highlighting)

### 4. AI Insights

- **Anomaly Detection**: Machine learning identifies unusual patterns
- **Risk Assessment**: Transactions categorized as Low, Medium, or High risk
- **Variance Analysis**: Statistical analysis of amount differences
- **Status Conflicts**: Detection of critical status mismatches

### 5. Export Options

- **Individual CSV Export**: Export each category separately
- **Bulk ZIP Export**: Download all results in a single ZIP file
- **Client-side Export**: Immediate download using browser
- **Server-side Export**: Enhanced export with additional processing

## Deployment

### Local Development

Follow the setup instructions above for local development.

### Production Deployment

#### Option 1: Replit

1. Import the project to Replit
2. Configure the `.replit` file for both Flask and React
3. Install dependencies and run the application

#### Option 2: Vercel (Frontend) + Fly.io (Backend)

1. Deploy frontend to Vercel:

   ```bash
   cd src/recon-frontend
   npm run build
   vercel --prod
   ```

2. Deploy backend to Fly.io:

   ```bash
   cd backend/recon-backend
   fly deploy
   ```

#### Option 3: Full-Stack Deployment

1. Build the React frontend:

   ```bash
   cd src/recon-frontend
   npm run build
   ```

2. Copy build files to Flask static directory:

   ```bash
   cp -r build/* ../backend/recon-backend/src/static/
   ```

3. Deploy the Flask application with integrated frontend

## Testing

### Backend Tests

```bash
cd backend/recon-backend
source venv/bin/activate
pytest tests/
```

### Frontend Tests

```bash
cd src/recon-frontend
pnpm test
```

## Performance Considerations

### File Size Limits

- Maximum file size: 10MB per CSV
- Recommended: Under 5MB for optimal performance
- Large files are processed in chunks to prevent memory issues

### Scalability

- In-memory caching for demo purposes
- Production deployment should use Redis or database storage
- Consider implementing file streaming for very large datasets

### Browser Compatibility

- Modern browsers with ES6+ support
- Responsive design for mobile and tablet devices
- Progressive enhancement for older browsers

## Security Considerations

- File validation prevents malicious uploads
- CORS configuration allows cross-origin requests
- Session-based data isolation
- No persistent storage of sensitive data
- Input sanitization for all user data

## Troubleshooting

### Common Issues

1. **File Upload Fails**
   - Check file size (must be under 10MB)
   - Ensure file is in CSV format
   - Verify network connection

2. **Column Mapping Issues**
   - Ensure CSV has proper headers
   - Check for required columns (transaction_reference)
   - Review AI mapping results in dashboard

3. **Export Not Working**
   - Verify reconciliation was completed successfully
   - Check browser download settings
   - Try alternative export method (client vs server)

4. **Performance Issues**
   - Reduce file size if possible
   - Clear browser cache
   - Restart the application

### Support

For technical support or feature requests, please refer to the project documentation or contact the development team.

## License

This project is developed for demonstration purposes. Please refer to the license file for usage terms and conditions.

## Portfolio Snippet

A web app for comparing internal and provider transaction CSVs, featuring drag-and-drop uploads, categorized results, and AI-driven column mapping. Built with React, Flask, and Pandas, deployed on Replit. [Live Demo](https://replit.com/@username/recon-tool) | [GitHub](https://github.com/username/recon-tool)
"# ReconApp" 
"# ReconciliationApp" 
"# ReconciliationApp" 
