import pytest
import pandas as pd
import json
import tempfile
import os
from io import StringIO
import sys

# Add the backend source to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend', 'recon-backend', 'src'))

from routes.reconciliation import (
    map_columns, 
    reconcile_transactions, 
    detect_anomalies,
    allowed_file
)

class TestColumnMapping:
    """Test cases for AI-driven column mapping functionality"""
    
    def test_basic_column_mapping(self):
        """Test basic column mapping with standard headers"""
        headers = ['transaction_id', 'amount', 'status']
        mappings = map_columns(headers)
        
        assert 'transaction_reference' in mappings
        assert mappings['transaction_reference'] == 'transaction_id'
        assert mappings['amount'] == 'amount'
        assert mappings['status'] == 'status'
    
    def test_variant_column_mapping(self):
        """Test column mapping with header variations"""
        headers = ['txn_ref', 'total_value', 'transaction_state']
        mappings = map_columns(headers)
        
        assert mappings['transaction_reference'] == 'txn_ref'
        assert mappings['amount'] == 'total_value'
        assert mappings['status'] == 'transaction_state'
    
    def test_case_insensitive_mapping(self):
        """Test that column mapping is case insensitive"""
        headers = ['TRANSACTION_ID', 'Amount', 'STATUS']
        mappings = map_columns(headers)
        
        assert mappings['transaction_reference'] == 'TRANSACTION_ID'
        assert mappings['amount'] == 'Amount'
        assert mappings['status'] == 'STATUS'
    
    def test_underscore_and_dash_handling(self):
        """Test handling of underscores and dashes in headers"""
        headers = ['transaction-reference', 'total_amount', 'payment-status']
        mappings = map_columns(headers)
        
        assert mappings['transaction_reference'] == 'transaction-reference'
        assert mappings['amount'] == 'total_amount'
        assert mappings['status'] == 'payment-status'
    
    def test_no_matching_headers(self):
        """Test behavior when no headers match known patterns"""
        headers = ['unknown_field1', 'random_column', 'other_data']
        mappings = map_columns(headers)
        
        assert len(mappings) == 0
    
    def test_partial_mapping(self):
        """Test when only some headers can be mapped"""
        headers = ['transaction_id', 'unknown_field', 'status']
        mappings = map_columns(headers)
        
        assert 'transaction_reference' in mappings
        assert 'status' in mappings
        assert 'amount' not in mappings

class TestReconciliation:
    """Test cases for transaction reconciliation logic"""
    
    def setup_method(self):
        """Set up test data for reconciliation tests"""
        self.internal_data = pd.DataFrame({
            'transaction_reference': ['TXN001', 'TXN002', 'TXN003', 'TXN004'],
            'amount': [100.0, 200.0, 300.0, 400.0],
            'status': ['Completed', 'Pending', 'Failed', 'Completed']
        })
        
        self.provider_data = pd.DataFrame({
            'transaction_reference': ['TXN001', 'TXN002', 'TXN005', 'TXN006'],
            'amount': [100.0, 250.0, 500.0, 600.0],
            'status': ['Completed', 'Completed', 'Pending', 'Failed']
        })
    
    def test_perfect_match_reconciliation(self):
        """Test reconciliation with perfect matches"""
        internal = pd.DataFrame({
            'transaction_reference': ['TXN001', 'TXN002'],
            'amount': [100.0, 200.0],
            'status': ['Completed', 'Pending']
        })
        
        provider = pd.DataFrame({
            'transaction_reference': ['TXN001', 'TXN002'],
            'amount': [100.0, 200.0],
            'status': ['Completed', 'Pending']
        })
        
        result = reconcile_transactions(internal, provider)
        
        assert result['summary']['matched'] == 2
        assert result['summary']['internal_only'] == 0
        assert result['summary']['provider_only'] == 0
        assert len(result['matched']) == 2
        
        # Check that all matches are perfect
        for match in result['matched']:
            assert match['amount_match'] == True
            assert match['status_match'] == True
    
    def test_mixed_reconciliation(self):
        """Test reconciliation with mixed results"""
        result = reconcile_transactions(self.internal_data, self.provider_data)
        
        assert result['summary']['matched'] == 2  # TXN001, TXN002
        assert result['summary']['internal_only'] == 2  # TXN003, TXN004
        assert result['summary']['provider_only'] == 2  # TXN005, TXN006
        
        # Check specific matches
        matched_refs = [match['transaction_reference'] for match in result['matched']]
        assert 'TXN001' in matched_refs
        assert 'TXN002' in matched_refs
    
    def test_amount_mismatch_detection(self):
        """Test detection of amount mismatches"""
        result = reconcile_transactions(self.internal_data, self.provider_data)
        
        # Find TXN002 which has amount mismatch (200 vs 250)
        txn002_match = next(
            match for match in result['matched'] 
            if match['transaction_reference'] == 'TXN002'
        )
        
        assert txn002_match['amount_match'] == False
        assert txn002_match['amount_internal'] == 200.0
        assert txn002_match['amount_provider'] == 250.0
    
    def test_status_mismatch_detection(self):
        """Test detection of status mismatches"""
        result = reconcile_transactions(self.internal_data, self.provider_data)
        
        # Find TXN002 which has status mismatch (Pending vs Completed)
        txn002_match = next(
            match for match in result['matched'] 
            if match['transaction_reference'] == 'TXN002'
        )
        
        assert txn002_match['status_match'] == False
        assert txn002_match['status_internal'] == 'Pending'
        assert txn002_match['status_provider'] == 'Completed'
    
    def test_missing_transaction_reference(self):
        """Test error handling when transaction_reference is missing"""
        internal_no_ref = pd.DataFrame({
            'amount': [100.0, 200.0],
            'status': ['Completed', 'Pending']
        })
        
        with pytest.raises(ValueError, match="transaction_reference column not found"):
            reconcile_transactions(internal_no_ref, self.provider_data)
    
    def test_empty_dataframes(self):
        """Test reconciliation with empty dataframes"""
        empty_df = pd.DataFrame(columns=['transaction_reference', 'amount', 'status'])
        
        result = reconcile_transactions(empty_df, empty_df)
        
        assert result['summary']['matched'] == 0
        assert result['summary']['internal_only'] == 0
        assert result['summary']['provider_only'] == 0
        assert len(result['matched']) == 0

class TestAnomalyDetection:
    """Test cases for AI-powered anomaly detection"""
    
    def test_amount_variance_detection(self):
        """Test detection of high amount variance"""
        matched_df = pd.DataFrame({
            'transaction_reference': ['TXN001', 'TXN002', 'TXN003'],
            'amount_internal': [100.0, 200.0, 1000.0],
            'amount_provider': [100.0, 220.0, 500.0],  # 10% and 50% variance
            'status_internal': ['Completed', 'Completed', 'Completed'],
            'status_provider': ['Completed', 'Completed', 'Completed'],
            'amount_match': [True, False, False],
            'status_match': [True, True, True]
        })
        
        result = detect_anomalies(matched_df)
        
        # Check that high variance transactions are flagged
        high_variance_txns = result[result['amount_variance'] > 5]
        assert len(high_variance_txns) == 2  # TXN002 and TXN003
        
        # Check that TXN003 (50% variance) is marked as high risk
        txn003 = result[result['transaction_reference'] == 'TXN003'].iloc[0]
        assert txn003['risk_level'] == 'High'
        assert txn003['anomaly'] == True
    
    def test_status_conflict_detection(self):
        """Test detection of critical status mismatches"""
        matched_df = pd.DataFrame({
            'transaction_reference': ['TXN001', 'TXN002'],
            'amount_internal': [100.0, 200.0],
            'amount_provider': [100.0, 200.0],
            'status_internal': ['Processed', 'Completed'],
            'status_provider': ['Failed', 'Completed'],
            'amount_match': [True, True],
            'status_match': [False, True]
        })
        
        result = detect_anomalies(matched_df)
        
        # Check that critical status mismatch is detected
        txn001 = result[result['transaction_reference'] == 'TXN001'].iloc[0]
        assert txn001['anomaly'] == True
        assert txn001['risk_level'] == 'High'
    
    def test_empty_dataframe_anomaly_detection(self):
        """Test anomaly detection with empty dataframe"""
        empty_df = pd.DataFrame()
        result = detect_anomalies(empty_df)
        
        assert result.empty
    
    def test_isolation_forest_anomaly_detection(self):
        """Test machine learning anomaly detection"""
        # Create data with one clear outlier
        matched_df = pd.DataFrame({
            'transaction_reference': [f'TXN{i:03d}' for i in range(1, 11)],
            'amount_internal': [100.0] * 9 + [10000.0],  # One outlier
            'amount_provider': [100.0] * 9 + [10000.0],
            'status_internal': ['Completed'] * 10,
            'status_provider': ['Completed'] * 10,
            'amount_match': [True] * 10,
            'status_match': [True] * 10
        })
        
        result = detect_anomalies(matched_df)
        
        # Check that at least some anomalies are detected
        anomalies = result[result['anomaly'] == True]
        assert len(anomalies) >= 1

class TestFileValidation:
    """Test cases for file validation functionality"""
    
    def test_allowed_file_csv(self):
        """Test that CSV files are allowed"""
        assert allowed_file('test.csv') == True
        assert allowed_file('data.CSV') == True
        assert allowed_file('transactions.csv') == True
    
    def test_disallowed_file_types(self):
        """Test that non-CSV files are rejected"""
        assert allowed_file('test.txt') == False
        assert allowed_file('data.xlsx') == False
        assert allowed_file('file.pdf') == False
        assert allowed_file('script.py') == False
    
    def test_no_extension(self):
        """Test files without extensions"""
        assert allowed_file('filename') == False
        assert allowed_file('') == False
    
    def test_multiple_extensions(self):
        """Test files with multiple extensions"""
        assert allowed_file('data.backup.csv') == True
        assert allowed_file('file.csv.txt') == False

class TestIntegration:
    """Integration tests for the complete reconciliation workflow"""
    
    def test_end_to_end_reconciliation(self):
        """Test complete reconciliation workflow"""
        # Create test CSV data
        internal_csv = """transaction_id,amount,status
TXN001,100.00,Completed
TXN002,200.00,Pending
TXN003,300.00,Failed"""
        
        provider_csv = """ref_id,total,state
TXN001,100.00,Completed
TXN002,250.00,Completed
TXN004,400.00,Pending"""
        
        # Parse CSV data
        internal_df = pd.read_csv(StringIO(internal_csv))
        provider_df = pd.read_csv(StringIO(provider_csv))
        
        # Apply column mapping
        internal_mappings = map_columns(internal_df.columns.tolist())
        provider_mappings = map_columns(provider_df.columns.tolist())
        
        internal_df = internal_df.rename(columns=internal_mappings)
        provider_df = provider_df.rename(columns=provider_mappings)
        
        # Perform reconciliation
        result = reconcile_transactions(internal_df, provider_df)
        
        # Verify results
        assert result['summary']['matched'] == 2
        assert result['summary']['internal_only'] == 1
        assert result['summary']['provider_only'] == 1
        
        # Check that amount mismatch is detected
        assert result['summary']['amount_mismatches'] >= 1
        assert result['summary']['status_mismatches'] >= 1
    
    def test_large_dataset_performance(self):
        """Test performance with larger datasets"""
        # Create larger test datasets
        size = 1000
        internal_data = pd.DataFrame({
            'transaction_reference': [f'TXN{i:06d}' for i in range(size)],
            'amount': [100.0 + i for i in range(size)],
            'status': ['Completed'] * size
        })
        
        provider_data = pd.DataFrame({
            'transaction_reference': [f'TXN{i:06d}' for i in range(size // 2, size + size // 2)],
            'amount': [100.0 + i for i in range(size // 2, size + size // 2)],
            'status': ['Completed'] * size
        })
        
        # Perform reconciliation and measure basic performance
        result = reconcile_transactions(internal_data, provider_data)
        
        # Verify that reconciliation completes successfully
        assert result['summary']['matched'] == size // 2
        assert result['summary']['internal_only'] == size // 2
        assert result['summary']['provider_only'] == size // 2

if __name__ == '__main__':
    pytest.main([__file__, '-v'])

