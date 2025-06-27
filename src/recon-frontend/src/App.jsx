import { useState } from 'react'
import FileUploader from './components/FileUploader'
import SummaryDashboard from './components/SummaryDashboard'
import CategoryTable from './components/CategoryTable'
import './App.css'

function App() {
  const [reconciliationData, setReconciliationData] = useState(null);

  const handleReconciliationComplete = (data) => {
    setReconciliationData(data);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="text-center py-6">
          <h1 className="text-3xl font-bold text-gray-900">Transaction Reconciliation Tool</h1>
          <p className="text-gray-600 mt-2">Upload and compare internal and provider transaction files</p>
        </header>

        <FileUploader onReconciliationComplete={handleReconciliationComplete} />

        {reconciliationData && (
          <>
            <SummaryDashboard 
              summary={reconciliationData.summary} 
              columnMappings={reconciliationData.column_mappings}
            />
            
            <div className="space-y-6">
              <CategoryTable
                title="Matched Transactions"
                data={reconciliationData.matched}
                category="matched"
                highlightColor="green"
                sessionId={reconciliationData.session_id}
              />
              
              <CategoryTable
                title="Internal Only Transactions"
                data={reconciliationData.internal_only}
                category="internal_only"
                highlightColor="yellow"
                sessionId={reconciliationData.session_id}
              />
              
              <CategoryTable
                title="Provider Only Transactions"
                data={reconciliationData.provider_only}
                category="provider_only"
                highlightColor="red"
                sessionId={reconciliationData.session_id}
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default App
