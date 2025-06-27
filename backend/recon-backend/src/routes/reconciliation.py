import os
import pandas as pd
import json
import numpy as np
from flask import Blueprint, request, jsonify, send_file, session
from werkzeug.utils import secure_filename
from io import StringIO
import tempfile
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

reconciliation_bp = Blueprint('reconciliation', __name__)

UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'csv'}

# Store reconciliation results in memory (in production, use Redis or database)
reconciliation_cache = {}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def ensure_upload_folder():
    if not os.path.exists(UPLOAD_FOLDER):
        os.makedirs(UPLOAD_FOLDER)

def map_columns(headers):
    """Enhanced AI-driven column mapping based on header analysis"""
    ref_keywords = ['reference', 'id', 'txn_id', 'transaction_id', 'ref', 'txn_ref', 'trans_id']
    amount_keywords = ['amount', 'value', 'total', 'sum', 'price', 'cost', 'fee', 'charge']
    status_keywords = ['status', 'state', 'condition', 'stage', 'phase']
    date_keywords = ['date', 'time', 'timestamp', 'created', 'processed']
    currency_keywords = ['currency', 'curr', 'ccy']
    
    mappings = {}
    confidence_scores = {}
    
    for header in headers:
        header_lower = header.lower().replace('_', ' ').replace('-', ' ')
        
        # Calculate confidence scores for each mapping
        ref_score = sum(1 for kw in ref_keywords if kw in header_lower)
        amount_score = sum(1 for kw in amount_keywords if kw in header_lower)
        status_score = sum(1 for kw in status_keywords if kw in header_lower)
        date_score = sum(1 for kw in date_keywords if kw in header_lower)
        currency_score = sum(1 for kw in currency_keywords if kw in header_lower)
        
        # Map to the category with highest confidence
        scores = {
            'transaction_reference': ref_score,
            'amount': amount_score,
            'status': status_score,
            'transaction_date': date_score,
            'transaction_currency': currency_score
        }
        
        max_score = max(scores.values())
        if max_score > 0:
            best_match = max(scores, key=scores.get)
            if best_match not in mappings or scores[best_match] > confidence_scores.get(best_match, 0):
                mappings[best_match] = header
                confidence_scores[best_match] = scores[best_match]
    
    return mappings

def detect_anomalies(matched_df):
    """Detect anomalies in matched transactions using machine learning"""
    if matched_df.empty:
        return matched_df
    
    # Initialize anomaly flags
    matched_df['anomaly'] = False
    matched_df['amount_variance'] = 0.0
    matched_df['risk_level'] = 'Low'
    
    # Amount variance analysis
    if 'amount_internal' in matched_df.columns and 'amount_provider' in matched_df.columns:
        # Calculate percentage variance
        matched_df['amount_variance'] = abs(
            (matched_df['amount_internal'] - matched_df['amount_provider']) / 
            matched_df['amount_internal'].replace(0, 1)  # Avoid division by zero
        ) * 100
        
        # Flag high variance transactions (>5%)
        high_variance = matched_df['amount_variance'] > 5
        matched_df.loc[high_variance, 'risk_level'] = 'High'
        matched_df.loc[high_variance, 'anomaly'] = True
        
        # Use Isolation Forest for anomaly detection on amounts
        try:
            amounts = matched_df[['amount_internal', 'amount_provider']].fillna(0)
            if len(amounts) > 1:
                scaler = StandardScaler()
                amounts_scaled = scaler.fit_transform(amounts)
                
                isolation_forest = IsolationForest(contamination=0.1, random_state=42)
                anomaly_predictions = isolation_forest.fit_predict(amounts_scaled)
                
                # Mark anomalies detected by Isolation Forest
                ml_anomalies = anomaly_predictions == -1
                matched_df.loc[ml_anomalies, 'anomaly'] = True
                matched_df.loc[ml_anomalies & (matched_df['risk_level'] == 'Low'), 'risk_level'] = 'Medium'
        except Exception as e:
            print(f"ML anomaly detection failed: {e}")
    
    # Status mismatch analysis
    if 'status_internal' in matched_df.columns and 'status_provider' in matched_df.columns:
        status_mismatch = matched_df['status_internal'] != matched_df['status_provider']
        
        # Define critical status mismatches
        critical_mismatches = [
            ('Processed', 'Failed'),
            ('Completed', 'Pending'),
            ('Success', 'Error'),
            ('Approved', 'Rejected')
        ]
        
        for internal_status, provider_status in critical_mismatches:
            critical_mask = (
                (matched_df['status_internal'].str.contains(internal_status, case=False, na=False)) &
                (matched_df['status_provider'].str.contains(provider_status, case=False, na=False))
            ) | (
                (matched_df['status_internal'].str.contains(provider_status, case=False, na=False)) &
                (matched_df['status_provider'].str.contains(internal_status, case=False, na=False))
            )
            
            matched_df.loc[critical_mask, 'anomaly'] = True
            matched_df.loc[critical_mask, 'risk_level'] = 'High'
    
    return matched_df

def reconcile_transactions(internal_df, provider_df):
    """Perform transaction reconciliation with AI enhancements"""
    # Ensure transaction_reference exists in both dataframes
    if 'transaction_reference' not in internal_df.columns or 'transaction_reference' not in provider_df.columns:
        raise ValueError("transaction_reference column not found in one or both files")
    
    # Perform outer merge
    merged = pd.merge(internal_df, provider_df, on='transaction_reference', how='outer', indicator=True, suffixes=('_internal', '_provider'))
    
    # Categorize transactions
    matched = merged[merged['_merge'] == 'both'].copy()
    
    # Get original column names for filtering
    internal_cols = [col for col in internal_df.columns if col in merged.columns]
    provider_cols = [col for col in provider_df.columns if col in merged.columns]
    
    internal_only = merged[merged['_merge'] == 'left_only'][internal_cols].copy()
    provider_only = merged[merged['_merge'] == 'right_only'][provider_cols].copy()
    
    # Add match flags for matched transactions
    if not matched.empty:
        if 'amount_internal' in matched.columns and 'amount_provider' in matched.columns:
            matched['amount_match'] = matched['amount_internal'] == matched['amount_provider']
        else:
            matched['amount_match'] = True
            
        if 'status_internal' in matched.columns and 'status_provider' in matched.columns:
            matched['status_match'] = matched['status_internal'] == matched['status_provider']
        else:
            matched['status_match'] = True
        
        # Apply AI anomaly detection
        matched = detect_anomalies(matched)
    
    # Calculate enhanced summary statistics
    summary = {
        'matched': len(matched),
        'internal_only': len(internal_only),
        'provider_only': len(provider_only),
        'anomalies': len(matched[matched['anomaly'] == True]) if not matched.empty else 0,
        'high_risk': len(matched[matched['risk_level'] == 'High']) if not matched.empty else 0,
        'amount_mismatches': len(matched[matched['amount_match'] == False]) if not matched.empty else 0,
        'status_mismatches': len(matched[matched['status_match'] == False]) if not matched.empty else 0
    }
    
    return {
        'matched': matched.to_dict('records'),
        'internal_only': internal_only.to_dict('records'),
        'provider_only': provider_only.to_dict('records'),
        'summary': summary
    }

@reconciliation_bp.route('/upload_and_reconcile', methods=['POST'])
def upload_and_reconcile():
    try:
        ensure_upload_folder()
        
        if 'internal_file' not in request.files or 'provider_file' not in request.files:
            return jsonify({'error': 'Both internal_file and provider_file are required'}), 400
        
        internal_file = request.files['internal_file']
        provider_file = request.files['provider_file']
        
        if internal_file.filename == '' or provider_file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not (allowed_file(internal_file.filename) and allowed_file(provider_file.filename)):
            return jsonify({'error': 'Only CSV files are allowed'}), 400
        
        # Save files
        internal_filename = secure_filename('internal.csv')
        provider_filename = secure_filename('provider.csv')
        
        internal_path = os.path.join(UPLOAD_FOLDER, internal_filename)
        provider_path = os.path.join(UPLOAD_FOLDER, provider_filename)
        
        internal_file.save(internal_path)
        provider_file.save(provider_path)
        
        # Read CSV files
        try:
            internal_df = pd.read_csv(internal_path)
            provider_df = pd.read_csv(provider_path)
        except Exception as e:
            return jsonify({'error': f'Error reading CSV files: {str(e)}'}), 400
        
        # Apply enhanced column mapping
        internal_mappings = map_columns(internal_df.columns.tolist())
        provider_mappings = map_columns(provider_df.columns.tolist())
        
        # Rename columns based on mappings
        if internal_mappings:
            internal_df = internal_df.rename(columns=internal_mappings)
        if provider_mappings:
            provider_df = provider_df.rename(columns=provider_mappings)
        
        # Perform reconciliation with AI enhancements
        result = reconcile_transactions(internal_df, provider_df)
        
        # Store result in cache for export functionality
        session_id = request.remote_addr + str(hash(str(result)))
        reconciliation_cache[session_id] = result
        result['session_id'] = session_id
        
        # Add column mapping information to response
        result['column_mappings'] = {
            'internal': internal_mappings,
            'provider': provider_mappings
        }
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@reconciliation_bp.route('/export_csv', methods=['GET'])
def export_csv():
    try:
        category = request.args.get('category')
        session_id = request.args.get('session_id')
        
        if not category:
            return jsonify({'error': 'Category parameter is required'}), 400
        
        if not session_id or session_id not in reconciliation_cache:
            return jsonify({'error': 'No reconciliation data found. Please perform reconciliation first.'}), 400
        
        data = reconciliation_cache[session_id]
        
        if category not in data:
            return jsonify({'error': f'Invalid category: {category}'}), 400
        
        # Convert data to DataFrame and then to CSV
        df = pd.DataFrame(data[category])
        
        if df.empty:
            return jsonify({'error': f'No data available for category: {category}'}), 400
        
        # Create temporary file
        temp_file = tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.csv')
        df.to_csv(temp_file.name, index=False)
        temp_file.close()
        
        filename = f'{category}_transactions.csv'
        
        return send_file(
            temp_file.name,
            as_attachment=True,
            download_name=filename,
            mimetype='text/csv'
        )
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@reconciliation_bp.route('/export_all', methods=['GET'])
def export_all():
    try:
        session_id = request.args.get('session_id')
        
        if not session_id or session_id not in reconciliation_cache:
            return jsonify({'error': 'No reconciliation data found. Please perform reconciliation first.'}), 400
        
        data = reconciliation_cache[session_id]
        
        # Create a temporary directory for multiple CSV files
        temp_dir = tempfile.mkdtemp()
        
        # Export each category to separate CSV files
        for category in ['matched', 'internal_only', 'provider_only']:
            if data[category]:
                df = pd.DataFrame(data[category])
                csv_path = os.path.join(temp_dir, f'{category}_transactions.csv')
                df.to_csv(csv_path, index=False)
        
        # Create a zip file containing all CSVs
        import zipfile
        zip_path = os.path.join(temp_dir, 'reconciliation_results.zip')
        
        with zipfile.ZipFile(zip_path, 'w') as zipf:
            for category in ['matched', 'internal_only', 'provider_only']:
                csv_path = os.path.join(temp_dir, f'{category}_transactions.csv')
                if os.path.exists(csv_path):
                    zipf.write(csv_path, f'{category}_transactions.csv')
        
        return send_file(
            zip_path,
            as_attachment=True,
            download_name='reconciliation_results.zip',
            mimetype='application/zip'
        )
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

