import csv
import json
import os

def fetch_external_data(filters):
    data = []
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    
    # Source A: JSON
    if 'source_a' in filters.get('sources', []):
        json_path = os.path.join(base_dir, 'frontend', 'assets', 'data', 'source_a.json')
        with open(json_path) as f:
            json_data = json.load(f)
            for record in json_data:
                year = int(record['date_of_sale'][:4])
                if filters['year_from'] <= year <= filters['year_to']:
                    record['source'] = 'source_a'
                    data.append(record)
    
    # Source B: CSV
    if 'source_b' in filters.get('sources', []):
        csv_path = os.path.join(base_dir, 'frontend', 'assets', 'data', 'source_b.csv')
        with open(csv_path) as f:
            csv_reader = csv.DictReader(f)
            for record in csv_reader:
                year = int(record['date_of_sale'][:4])
                company_ok = not filters.get('companies') or record['company'] in filters['companies']
                year_ok = filters['year_from'] <= year <= filters['year_to']
                
                if company_ok and year_ok:
                    record['price'] = float(record['price'])
                    record['source'] = 'source_b'
                    data.append(record)
    
    return data
