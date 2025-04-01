from flask import Flask, request, jsonify
from models import Base, Task, SalesRecord
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import json
import time
from queue import Queue
from threading import Thread
from utils.data_loader import fetch_external_data
import os
from flask_cors import CORS  # Add this import at the top


app = Flask(__name__)
app.config['DATABASE_URI'] = 'sqlite:///narravance.db'
engine = create_engine(app.config['DATABASE_URI'])
Base.metadata.create_all(engine)
Session = sessionmaker(bind=engine)

CORS(app)  # This will enable CORS for all routes

job_queue = Queue()

def process_tasks():
    while True:
        task_id = job_queue.get()
        session = Session()
        try:
            task = session.query(Task).filter_by(id=task_id).first()
            if task:
                task.status = 'in_progress'
                session.commit()
                
                time.sleep(5)  # Simulate processing delay
                
                filter_params = json.loads(task.filter_params)
                data = fetch_external_data(filter_params)
                
                for record in data:
                    sales_record = SalesRecord(
                        task_id=task.id,
                        source=record['source'],
                        company=record['company'],
                        car_model=record['car_model'],
                        date_of_sale=record['date_of_sale'],
                        price=record['price']
                    )
                    session.add(sales_record)
                
                task.status = 'completed'
                session.commit()
        except Exception as e:
            print(f"Error processing task {task_id}: {str(e)}")
            if task:
                task.status = 'failed'
                session.commit()
        finally:
            session.close()
            job_queue.task_done()

worker = Thread(target=process_tasks, daemon=True)
worker.start()

@app.route('/api/tasks', methods=['POST'])
def create_task():
    data = request.json
    session = Session()
    try:
        task = Task(filter_params=json.dumps(data['filters']))
        session.add(task)
        session.commit()
        job_queue.put(task.id)
        return jsonify({
            'id': task.id,
            'status': task.status,
            'created_at': task.created_at.isoformat()
        }), 201
    finally:
        session.close()

@app.route('/api/tasks', methods=['GET'])
def list_tasks():
    session = Session()
    try:
        tasks = session.query(Task).order_by(Task.created_at.desc()).all()
        return jsonify([{
            'id': t.id,
            'status': t.status,
            'created_at': t.created_at.isoformat(),
            'completed_at': t.completed_at.isoformat() if t.completed_at else None
        } for t in tasks])
    finally:
        session.close()

@app.route('/api/tasks/<int:task_id>/data', methods=['GET'])
def get_task_data(task_id):
    session = Session()
    try:
        records = session.query(SalesRecord).filter_by(task_id=task_id).all()
        return jsonify([{
            'source': r.source,
            'company': r.company,
            'car_model': r.car_model,
            'date_of_sale': r.date_of_sale,
            'price': r.price
        } for r in records])
    finally:
        session.close()

if __name__ == '__main__':
    app.run(debug=True)