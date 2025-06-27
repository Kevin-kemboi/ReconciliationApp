import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, FileText, AlertCircle } from 'lucide-react';
import axios from 'axios';

const FileUploader = ({ onReconciliationComplete }) => {
  const [internalFile, setInternalFile] = useState(null);
  const [providerFile, setProviderFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const onDropInternal = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    if (file && file.type === 'text/csv' && file.size <= 10 * 1024 * 1024) {
      setInternalFile(file);
      setError('');
    } else {
      setError('Please upload a CSV file under 10MB');
    }
  }, []);

  const onDropProvider = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    if (file && file.type === 'text/csv' && file.size <= 10 * 1024 * 1024) {
      setProviderFile(file);
      setError('');
    } else {
      setError('Please upload a CSV file under 10MB');
    }
  }, []);

  const {
    getRootProps: getInternalRootProps,
    getInputProps: getInternalInputProps,
    isDragActive: isInternalDragActive
  } = useDropzone({
    onDrop: onDropInternal,
    accept: {
      'text/csv': ['.csv']
    },
    maxSize: 10 * 1024 * 1024,
    multiple: false
  });

  const {
    getRootProps: getProviderRootProps,
    getInputProps: getProviderInputProps,
    isDragActive: isProviderDragActive
  } = useDropzone({
    onDrop: onDropProvider,
    accept: {
      'text/csv': ['.csv']
    },
    maxSize: 10 * 1024 * 1024,
    multiple: false
  });

  const handleUpload = async () => {
    if (!internalFile || !providerFile) {
      setError('Please select both files');
      return;
    }

    setUploading(true);
    setError('');

    const formData = new FormData();
    formData.append('internal_file', internalFile);
    formData.append('provider_file', providerFile);

    try {
      const response = await axios.post('http://localhost:5000/api/upload_and_reconcile', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      onReconciliationComplete(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload CSV Files
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Internal File Upload */}
            <div>
              <label className="block text-sm font-medium mb-2">Internal System Export</label>
              <div
                {...getInternalRootProps()}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                  isInternalDragActive
                    ? 'border-blue-400 bg-blue-50'
                    : internalFile
                    ? 'border-green-400 bg-green-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <input {...getInternalInputProps()} />
                <FileText className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                {internalFile ? (
                  <p className="text-sm text-green-600">{internalFile.name}</p>
                ) : (
                  <div>
                    <p className="text-sm text-gray-600">
                      Drag & drop your internal CSV file here, or click to select
                    </p>
                    <p className="text-xs text-gray-400 mt-1">Max 10MB</p>
                  </div>
                )}
              </div>
            </div>

            {/* Provider File Upload */}
            <div>
              <label className="block text-sm font-medium mb-2">Provider Statement</label>
              <div
                {...getProviderRootProps()}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                  isProviderDragActive
                    ? 'border-blue-400 bg-blue-50'
                    : providerFile
                    ? 'border-green-400 bg-green-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <input {...getProviderInputProps()} />
                <FileText className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                {providerFile ? (
                  <p className="text-sm text-green-600">{providerFile.name}</p>
                ) : (
                  <div>
                    <p className="text-sm text-gray-600">
                      Drag & drop your provider CSV file here, or click to select
                    </p>
                    <p className="text-xs text-gray-400 mt-1">Max 10MB</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <Button
            onClick={handleUpload}
            disabled={!internalFile || !providerFile || uploading}
            className="w-full"
          >
            {uploading ? 'Processing...' : 'Upload and Reconcile'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default FileUploader;

