"""
Association Rule Mining for Printer Parts Recommendation
Uses Apriori algorithm to find frequent part combinations
"""

import mysql.connector
import pandas as pd
from mlxtend.frequent_patterns import apriori, association_rules
from mlxtend.preprocessing import TransactionEncoder
import json
import sys
from datetime import datetime

# Database configuration
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': 'Natusv1ncere.',
    'database': 'serviceease'
}

def connect_db():
    """Connect to MySQL database"""
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        print(f"[DEBUG] Connected to database successfully", file=sys.stderr)
        return conn
    except mysql.connector.Error as err:
        print(f"[ERROR] Database connection failed: {err}", file=sys.stderr)
        sys.exit(1)

def fetch_transactions(printer_brand=None, printer_model=None):
    """Fetch service request transactions with parts used"""
    conn = connect_db()
    cursor = conn.cursor(dictionary=True)
    
    query = """
        SELECT 
            sr.id as request_id,
            sr.request_number,
            p.brand as printer_brand,
            p.model as printer_model,
            pp.name as part_name,
            pp.id as part_id
        FROM service_requests sr
        INNER JOIN printers p ON sr.printer_id = p.id
        INNER JOIN service_parts_used spu ON sr.id = spu.service_request_id
        INNER JOIN printer_parts pp ON spu.part_id = pp.id
        WHERE sr.status = 'completed'
    """
    
    params = []
    if printer_brand:
        query += " AND p.brand = %s"
        params.append(printer_brand)
    if printer_model:
        query += " AND p.model = %s"
        params.append(printer_model)
    
    query += " ORDER BY sr.id, pp.name"
    
    print(f"[DEBUG] Executing query for {printer_brand} {printer_model}", file=sys.stderr)
    
    cursor.execute(query, params)
    results = cursor.fetchall()
    
    print(f"[DEBUG] Query returned {len(results)} rows", file=sys.stderr)
    
    cursor.close()
    conn.close()
    
    return results

def prepare_transactions(raw_data):
    """Convert raw data to transaction format"""
    transactions = {}
    
    for row in raw_data:
        request_id = row['request_id']
        part_name = row['part_name']
        
        if request_id not in transactions:
            transactions[request_id] = {
                'request_number': row['request_number'],
                'printer_brand': row['printer_brand'],
                'printer_model': row['printer_model'],
                'parts': []
            }
        
        # Avoid duplicate parts in same transaction
        if part_name not in transactions[request_id]['parts']:
            transactions[request_id]['parts'].append(part_name)
    
    transaction_list = [data['parts'] for data in transactions.values()]
    transaction_details = list(transactions.values())
    
    print(f"[DEBUG] Prepared {len(transaction_list)} transactions", file=sys.stderr)
    print(f"[DEBUG] Transaction details: {transaction_details[:3]}", file=sys.stderr)
    
    return transaction_list, transaction_details

def run_apriori(transactions, min_support=0.1, min_confidence=0.5):
    """Run Apriori algorithm"""
    
    if len(transactions) == 0:
        return None, None, "No transactions found"
    
    if len(transactions) < 2:
        return None, None, f"Need at least 2 transactions (found {len(transactions)})"
    
    print(f"[DEBUG] Running Apriori with min_support={min_support}, min_confidence={min_confidence}", file=sys.stderr)
    
    te = TransactionEncoder()
    te_ary = te.fit(transactions).transform(transactions)
    df = pd.DataFrame(te_ary, columns=te.columns_)
    
    print(f"[DEBUG] DataFrame shape: {df.shape}", file=sys.stderr)
    print(f"[DEBUG] Parts found: {list(df.columns)}", file=sys.stderr)
    
    try:
        frequent_itemsets = apriori(df, min_support=min_support, use_colnames=True, max_len=5)
        
        print(f"[DEBUG] Frequent itemsets count: {len(frequent_itemsets)}", file=sys.stderr)
        
        if len(frequent_itemsets) == 0:
            return None, None, f"No patterns found with min_support={min_support}. Try 0.05 or lower"
        
        rules = pd.DataFrame()
        try:
            rules = association_rules(frequent_itemsets, metric="confidence", min_threshold=min_confidence)
            print(f"[DEBUG] Association rules count: {len(rules)}", file=sys.stderr)
            
            if len(rules) > 0:
                rules = rules.sort_values(['confidence', 'lift'], ascending=[False, False])
        except ValueError as e:
            print(f"[DEBUG] No association rules generated: {e}", file=sys.stderr)
        
        return frequent_itemsets, rules, None
        
    except Exception as e:
        print(f"[ERROR] Apriori failed: {str(e)}", file=sys.stderr)
        return None, None, f"Analysis error: {str(e)}"

def format_rules_for_ui(rules):
    """Format rules for UI display"""
    if rules is None or len(rules) == 0:
        return []
    
    formatted_rules = []
    
    for idx, rule in rules.iterrows():
        antecedents = list(rule['antecedents'])
        consequents = list(rule['consequents'])
        
        formatted_rules.append({
            'id': idx + 1,
            'antecedents': antecedents,
            'consequents': consequents,
            'support': round(float(rule['support']), 4),
            'confidence': round(float(rule['confidence']), 4),
            'lift': round(float(rule['lift']), 4),
            'rule_text': f"If {', '.join(antecedents)} → Then {', '.join(consequents)}",
            'interpretation': f"When using {', '.join(antecedents)}, {', '.join(consequents)} is also needed in {rule['confidence']*100:.1f}% of cases"
        })
    
    return formatted_rules

def format_itemsets_for_ui(itemsets):
    """Format frequent itemsets for UI"""
    if itemsets is None or len(itemsets) == 0:
        return []
    
    formatted = []
    for idx, row in itemsets.iterrows():
        items = list(row['itemsets'])
        formatted.append({
            'id': idx + 1,
            'items': items,
            'support': round(float(row['support']), 4),
            'item_count': len(items)
        })
    
    formatted.sort(key=lambda x: x['support'], reverse=True)
    return formatted

def get_recommendations_for_printer(printer_brand, printer_model, min_support=0.1, min_confidence=0.5):
    """Get part recommendations for specific printer"""
    
    print(f"[INFO] Analyzing {printer_brand} {printer_model}", file=sys.stderr)
    
    raw_data = fetch_transactions(printer_brand, printer_model)
    
    if len(raw_data) == 0:
        return {
            'success': False,
            'message': f'No historical data found for {printer_brand} {printer_model}',
            'detail': 'Based on 0 historical service(s)',
            'total_transactions': 0,
            'rules': [],
            'frequent_itemsets': []
        }
    
    transactions, transaction_details = prepare_transactions(raw_data)
    
    if len(transactions) < 2:
        return {
            'success': False,
            'message': f'Not enough data for analysis',
            'detail': f'Found {len(transactions)} service(s), need at least 2',
            'total_transactions': len(transactions),
            'rules': [],
            'frequent_itemsets': []
        }
    
    frequent_itemsets, rules, error = run_apriori(transactions, min_support, min_confidence)
    
    if error:
        return {
            'success': False,
            'message': error,
            'detail': f'Based on {len(transactions)} historical service(s)',
            'total_transactions': len(transactions),
            'rules': [],
            'frequent_itemsets': []
        }
    
    formatted_rules = format_rules_for_ui(rules)
    formatted_itemsets = format_itemsets_for_ui(frequent_itemsets)
    
    message = f'Found {len(formatted_rules)} association rules' if len(formatted_rules) > 0 else f'Found {len(formatted_itemsets)} frequent patterns'
    
    return {
        'success': True,
        'message': message,
        'detail': f'Based on {len(transactions)} historical service(s)',
        'total_transactions': len(transactions),
        'printer_brand': printer_brand,
        'printer_model': printer_model,
        'rules': formatted_rules,
        'frequent_itemsets': formatted_itemsets,
        'min_support': min_support,
        'min_confidence': min_confidence
    }

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python association_rule_mining.py analyze_printer <brand> <model> [min_support] [min_confidence]", file=sys.stderr)
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == "analyze_printer":
        brand = sys.argv[2]
        model = sys.argv[3]
        min_support = float(sys.argv[4]) if len(sys.argv) > 4 else 0.1
        min_confidence = float(sys.argv[5]) if len(sys.argv) > 5 else 0.5
        
        result = get_recommendations_for_printer(brand, model, min_support, min_confidence)
        print(json.dumps(result, indent=2))
    else:
        print(f"Unknown command: {command}", file=sys.stderr)
        sys.exit(1)