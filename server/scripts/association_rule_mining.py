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
        return conn
    except mysql.connector.Error as err:
        print(f"Database connection error: {err}")
        sys.exit(1)

def fetch_transactions(printer_brand=None, printer_model=None):
    """
    Fetch service request transactions with parts used
    Returns list of transactions (each transaction is a list of parts)
    """
    conn = connect_db()
    cursor = conn.cursor(dictionary=True)
    
    # Build query based on filters
    query = """
        SELECT 
            sr.id as request_id,
            sr.request_number,
            ii.brand as printer_brand,
            ii.model as printer_model,
            GROUP_CONCAT(pp.name ORDER BY pp.name SEPARATOR '|') as parts_used,
            GROUP_CONCAT(pp.id ORDER BY pp.name SEPARATOR '|') as part_ids,
            COUNT(DISTINCT spu.part_id) as num_parts
        FROM service_requests sr
        INNER JOIN inventory_items ii ON sr.inventory_item_id = ii.id
        INNER JOIN service_parts_used spu ON sr.id = spu.service_request_id
        INNER JOIN printer_parts pp ON spu.part_id = pp.id
        WHERE sr.status = 'completed'
    """
    
    params = []
    if printer_brand:
        query += " AND ii.brand = %s"
        params.append(printer_brand)
    if printer_model:
        query += " AND ii.model = %s"
        params.append(printer_model)
    
    query += " GROUP BY sr.id HAVING num_parts >= 2"
    query += " ORDER BY sr.created_at DESC"
    
    cursor.execute(query, params)
    results = cursor.fetchall()
    
    cursor.close()
    conn.close()
    
    return results

def prepare_transactions(raw_data):
    """Convert raw data to transaction format"""
    transactions = []
    transaction_details = []
    
    for row in raw_data:
        parts = row['parts_used'].split('|')
        part_ids = row['part_ids'].split('|')
        
        transactions.append(parts)
        transaction_details.append({
            'request_id': row['request_id'],
            'request_number': row['request_number'],
            'printer_brand': row['printer_brand'],
            'printer_model': row['printer_model'],
            'parts': parts,
            'part_ids': part_ids
        })
    
    return transactions, transaction_details

def run_apriori(transactions, min_support=0.1, min_confidence=0.5):
    """
    Run Apriori algorithm on transactions
    """
    if len(transactions) == 0:
        return None, None, "No transactions found"
    
    if len(transactions) < 10:
        return None, None, f"Insufficient data: only {len(transactions)} transactions (need at least 10)"
    
    # Convert to one-hot encoded DataFrame
    te = TransactionEncoder()
    te_ary = te.fit(transactions).transform(transactions)
    df = pd.DataFrame(te_ary, columns=te.columns_)
    
    # Find frequent itemsets
    try:
        frequent_itemsets = apriori(df, min_support=min_support, use_colnames=True, max_len=4)
        
        if len(frequent_itemsets) == 0:
            return None, None, f"No frequent itemsets found with min_support={min_support}"
        
        # Generate association rules
        rules = association_rules(frequent_itemsets, metric="confidence", min_threshold=min_confidence)
        
        if len(rules) == 0:
            return frequent_itemsets, None, f"No rules found with min_confidence={min_confidence}"
        
        # Sort by confidence and lift
        rules = rules.sort_values(['confidence', 'lift'], ascending=[False, False])
        
        return frequent_itemsets, rules, None
        
    except ValueError as e:
        return None, None, f"Algorithm error: {str(e)}"

def format_rules_for_ui(rules, transaction_details):
    """Format rules for UI display"""
    if rules is None or len(rules) == 0:
        return []
    
    formatted_rules = []
    
    for idx, rule in rules.iterrows():
        antecedents = list(rule['antecedents'])
        consequents = list(rule['consequents'])
        
        formatted_rule = {
            'id': idx + 1,
            'antecedents': antecedents,
            'consequents': consequents,
            'support': round(float(rule['support']), 4),
            'confidence': round(float(rule['confidence']), 4),
            'lift': round(float(rule['lift']), 4),
            'conviction': round(float(rule['conviction']), 4) if rule['conviction'] != float('inf') else 999,
            'rule_text': f"If {', '.join(antecedents)} → Then {', '.join(consequents)}",
            'interpretation': generate_interpretation(antecedents, consequents, rule['confidence'], rule['lift'])
        }
        
        formatted_rules.append(formatted_rule)
    
    return formatted_rules

def generate_interpretation(antecedents, consequents, confidence, lift):
    """Generate human-readable interpretation"""
    confidence_pct = confidence * 100
    
    if len(antecedents) == 1 and len(consequents) == 1:
        interpretation = f"When technicians use {antecedents[0]}, they also use {consequents[0]} in {confidence_pct:.1f}% of cases."
    else:
        ant_text = " and ".join(antecedents)
        cons_text = " and ".join(consequents)
        interpretation = f"When technicians use {ant_text}, they also use {cons_text} in {confidence_pct:.1f}% of cases."
    
    if lift > 1.5:
        interpretation += f" (Strong association: {lift:.2f}x more likely)"
    elif lift > 1.2:
        interpretation += f" (Moderate association: {lift:.2f}x more likely)"
    
    return interpretation

def get_recommendations_for_printer(printer_brand, printer_model, min_support=0.1, min_confidence=0.5):
    """Get part recommendations for a specific printer"""
    
    # Fetch transactions
    raw_data = fetch_transactions(printer_brand, printer_model)
    
    if len(raw_data) == 0:
        # Try brand-level if model-specific has no data
        raw_data = fetch_transactions(printer_brand, None)
    
    if len(raw_data) == 0:
        return {
            'success': False,
            'message': f'No historical data found for {printer_brand} {printer_model}',
            'total_transactions': 0,
            'rules': []
        }
    
    # Prepare transactions
    transactions, transaction_details = prepare_transactions(raw_data)
    
    # Run Apriori
    frequent_itemsets, rules, error = run_apriori(transactions, min_support, min_confidence)
    
    if error:
        return {
            'success': False,
            'message': error,
            'total_transactions': len(transactions),
            'rules': []
        }
    
    # Format rules
    formatted_rules = format_rules_for_ui(rules, transaction_details)
    
    return {
        'success': True,
        'message': f'Found {len(formatted_rules)} association rules',
        'total_transactions': len(transactions),
        'printer_brand': printer_brand,
        'printer_model': printer_model,
        'rules': formatted_rules,
        'frequent_itemsets': len(frequent_itemsets) if frequent_itemsets is not None else 0
    }

def get_all_printer_models():
    """Get all printer models with completed service requests"""
    conn = connect_db()
    cursor = conn.cursor(dictionary=True)
    
    query = """
        SELECT DISTINCT 
            ii.brand,
            ii.model,
            COUNT(DISTINCT sr.id) as request_count
        FROM service_requests sr
        INNER JOIN inventory_items ii ON sr.inventory_item_id = ii.id
        INNER JOIN service_parts_used spu ON sr.id = spu.service_request_id
        WHERE sr.status = 'completed'
        GROUP BY ii.brand, ii.model
        HAVING request_count >= 5
        ORDER BY request_count DESC
    """
    
    cursor.execute(query)
    results = cursor.fetchall()
    
    cursor.close()
    conn.close()
    
    return results

def analyze_all_printers(min_support=0.1, min_confidence=0.5):
    """Analyze all printers and generate comprehensive report"""
    
    printers = get_all_printer_models()
    
    results = {
        'timestamp': datetime.now().isoformat(),
        'total_printer_models': len(printers),
        'min_support': min_support,
        'min_confidence': min_confidence,
        'printer_analyses': []
    }
    
    for printer in printers:
        analysis = get_recommendations_for_printer(
            printer['brand'],
            printer['model'],
            min_support,
            min_confidence
        )
        
        analysis['request_count'] = printer['request_count']
        results['printer_analyses'].append(analysis)
    
    return results

def save_to_database(analysis_results):
    """Save analysis results to database for quick retrieval"""
    conn = connect_db()
    cursor = conn.cursor()
    
    # Create table if not exists
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS arm_analysis_cache (
            id INT AUTO_INCREMENT PRIMARY KEY,
            printer_brand VARCHAR(255),
            printer_model VARCHAR(255),
            analysis_data JSON,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_printer (printer_brand, printer_model)
        )
    """)
    
    # Insert or update analysis
    for analysis in analysis_results['printer_analyses']:
        if analysis['success']:
            cursor.execute("""
                INSERT INTO arm_analysis_cache (printer_brand, printer_model, analysis_data)
                VALUES (%s, %s, %s)
                ON DUPLICATE KEY UPDATE 
                    analysis_data = VALUES(analysis_data),
                    created_at = CURRENT_TIMESTAMP
            """, (
                analysis['printer_brand'],
                analysis['printer_model'],
                json.dumps(analysis)
            ))
    
    conn.commit()
    cursor.close()
    conn.close()

if __name__ == "__main__":
    import sys
    
    # Parse command line arguments
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == "analyze_printer" and len(sys.argv) >= 4:
            brand = sys.argv[2]
            model = sys.argv[3]
            min_support = float(sys.argv[4]) if len(sys.argv) > 4 else 0.1
            min_confidence = float(sys.argv[5]) if len(sys.argv) > 5 else 0.5
            
            result = get_recommendations_for_printer(brand, model, min_support, min_confidence)
            print(json.dumps(result, indent=2))
            
        elif command == "analyze_all":
            min_support = float(sys.argv[2]) if len(sys.argv) > 2 else 0.1
            min_confidence = float(sys.argv[3]) if len(sys.argv) > 3 else 0.5
            
            results = analyze_all_printers(min_support, min_confidence)
            
            # Save to database
            save_to_database(results)
            
            print(json.dumps(results, indent=2))
            
        else:
            print("Invalid command. Use: analyze_printer <brand> <model> or analyze_all")
            sys.exit(1)
    else:
        print("Usage: python association_rule_mining.py <command> [args]")
        print("Commands:")
        print("  analyze_printer <brand> <model> [min_support] [min_confidence]")
        print("  analyze_all [min_support] [min_confidence]")
        sys.exit(1)
