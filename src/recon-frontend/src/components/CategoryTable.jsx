import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Download, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import Papa from 'papaparse';
import { saveAs } from 'file-saver';
import axios from 'axios';

const CategoryTable = ({ title, data, category, highlightColor, sessionId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [exporting, setExporting] = useState(false);
  const itemsPerPage = 10;

  const filteredData = useMemo(() => {
    if (!data) return [];
    return data.filter(item =>
      Object.values(item).some(value =>
        value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [data, searchTerm]);

  const sortedData = useMemo(() => {
    if (!sortConfig.key) return filteredData;
    
    return [...filteredData].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortConfig]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedData.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedData, currentPage]);

  const totalPages = Math.ceil(sortedData.length / itemsPerPage);

  const handleSort = (key) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const exportToCsvClient = () => {
    if (!data || data.length === 0) return;
    
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `${category}_transactions.csv`);
  };

  const exportToCsvServer = async () => {
    if (!sessionId) {
      exportToCsvClient();
      return;
    }

    setExporting(true);
    try {
      const response = await axios.get(`http://localhost:5000/api/export_csv`, {
        params: { category, session_id: sessionId },
        responseType: 'blob'
      });

      const blob = new Blob([response.data], { type: 'text/csv' });
      saveAs(blob, `${category}_transactions.csv`);
    } catch (error) {
      console.error('Export failed:', error);
      // Fallback to client-side export
      exportToCsvClient();
    } finally {
      setExporting(false);
    }
  };

  const getRowClassName = (row) => {
    let baseClass = 'border-b hover:bg-gray-50';
    
    if (category === 'matched') {
      // Priority: anomaly > amount_match > status_match > default
      if (row.anomaly === true) {
        if (row.risk_level === 'High') {
          baseClass += ' bg-purple-200 border-purple-300';
        } else {
          baseClass += ' bg-purple-100 border-purple-200';
        }
      } else if (row.amount_match === false) {
        baseClass += ' bg-orange-100';
      } else if (row.status_match === false) {
        baseClass += ' bg-red-100';
      }
    } else if (category === 'internal_only') {
      baseClass += ' bg-yellow-100';
    } else if (category === 'provider_only') {
      baseClass += ' bg-red-100';
    }
    
    return baseClass;
  };

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-center py-8">No data available</p>
        </CardContent>
      </Card>
    );
  }

  const columns = Object.keys(data[0]);

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>{title} ({data.length})</CardTitle>
          <div className="flex gap-2">
            <Button onClick={exportToCsvClient} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export CSV (Client)
            </Button>
            <Button 
              onClick={exportToCsvServer} 
              variant="outline" 
              size="sm"
              disabled={exporting}
            >
              <Download className="h-4 w-4 mr-2" />
              {exporting ? 'Exporting...' : 'Export CSV (Server)'}
            </Button>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Search className="h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search transactions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                {columns.map(column => (
                  <th
                    key={column}
                    className="text-left p-2 cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort(column)}
                  >
                    <div className="flex items-center space-x-1">
                      <span className="font-medium">{column.replace(/_/g, ' ').toUpperCase()}</span>
                      {sortConfig.key === column && (
                        <span className="text-xs">
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((row, index) => (
                <tr key={index} className={getRowClassName(row)}>
                  {columns.map(column => (
                    <td key={column} className="p-2">
                      {typeof row[column] === 'boolean' 
                        ? (row[column] ? '✓' : '✗')
                        : row[column]?.toString() || '-'
                      }
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-gray-500">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, sortedData.length)} of {sortedData.length} results
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <span className="text-sm">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CategoryTable;

