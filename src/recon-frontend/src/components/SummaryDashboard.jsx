import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { CheckCircle, AlertTriangle, XCircle, Shield, Brain, TrendingUp } from 'lucide-react';

const SummaryDashboard = ({ summary, columnMappings }) => {
  if (!summary) return null;

  const chartData = [
    { name: 'Matched', value: summary.matched, color: '#10b981' },
    { name: 'Internal Only', value: summary.internal_only, color: '#f59e0b' },
    { name: 'Provider Only', value: summary.provider_only, color: '#ef4444' }
  ];

  const aiInsightsData = [
    { name: 'Anomalies', value: summary.anomalies || 0, color: '#8b5cf6' },
    { name: 'High Risk', value: summary.high_risk || 0, color: '#ef4444' },
    { name: 'Amount Mismatches', value: summary.amount_mismatches || 0, color: '#f59e0b' },
    { name: 'Status Mismatches', value: summary.status_mismatches || 0, color: '#06b6d4' }
  ];

  const total = summary.matched + summary.internal_only + summary.provider_only;

  return (
    <div className="space-y-6">
      {/* Main Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Matched Transactions</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{summary.matched}</div>
            <p className="text-xs text-muted-foreground">
              {total > 0 ? ((summary.matched / total) * 100).toFixed(1) : 0}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Internal Only</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{summary.internal_only}</div>
            <p className="text-xs text-muted-foreground">
              {total > 0 ? ((summary.internal_only / total) * 100).toFixed(1) : 0}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Provider Only</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{summary.provider_only}</div>
            <p className="text-xs text-muted-foreground">
              {total > 0 ? ((summary.provider_only / total) * 100).toFixed(1) : 0}% of total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* AI Insights */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Anomalies</CardTitle>
            <Brain className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{summary.anomalies || 0}</div>
            <p className="text-xs text-muted-foreground">ML detected issues</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Risk</CardTitle>
            <Shield className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{summary.high_risk || 0}</div>
            <p className="text-xs text-muted-foreground">Critical discrepancies</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Amount Issues</CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{summary.amount_mismatches || 0}</div>
            <p className="text-xs text-muted-foreground">Value discrepancies</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status Issues</CardTitle>
            <AlertTriangle className="h-4 w-4 text-cyan-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-cyan-600">{summary.status_mismatches || 0}</div>
            <p className="text-xs text-muted-foreground">State mismatches</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Transaction Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AI Quality Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={aiInsightsData}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8884d8">
                    {aiInsightsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Column Mapping Information */}
      {columnMappings && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              AI Column Mapping Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">Internal File Mappings</h4>
                <div className="space-y-1">
                  {Object.entries(columnMappings.internal || {}).map(([standard, original]) => (
                    <div key={standard} className="text-sm">
                      <span className="font-mono bg-gray-100 px-2 py-1 rounded">{original}</span>
                      <span className="mx-2">→</span>
                      <span className="text-blue-600">{standard}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">Provider File Mappings</h4>
                <div className="space-y-1">
                  {Object.entries(columnMappings.provider || {}).map(([standard, original]) => (
                    <div key={standard} className="text-sm">
                      <span className="font-mono bg-gray-100 px-2 py-1 rounded">{original}</span>
                      <span className="mx-2">→</span>
                      <span className="text-blue-600">{standard}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SummaryDashboard;

