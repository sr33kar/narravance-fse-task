# Narravance Data Analytics Dashboard - README

## Overview
This full-stack application allows users to:

- Create data collection tasks from multiple sources
- Monitor task progress in real-time
- Visualize collected data with interactive charts
- Filter and analyze sales data

## Prerequisites
- Python 3.8+
- Node.js (for frontend development)
- Modern web browser

## Installation
### Backend Setup
1. Navigate to the backend directory:
```bash
cd backend
```
2. Create and activate a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows
```
3. Install dependencies:
```bash
pip install -r requirements.txt
```

## Frontend Setup
The frontend requires no installation as it runs directly in the browser.

##Running the Application
1. Start the backend server:
```bash
python app.py
```
The backend will run on http://localhost:5000

2. Open the frontend:

- Simply open frontend/index.html in your web browser
- Or for development, use a local server like:
  ```bash
  python -m http.server 3000
  ```
  Then access http://localhost:3000/frontend

## Using the Application
### Creating a Task
1. Select data sources (JSON and/or CSV)
2. Set year range filters
3. Choose companies to include (for CSV source)
4. Click "Create Task"

### Monitoring Tasks
- The task list shows all previous tasks
- Status badges indicate progress:
  - ⏳ Pending (gray)
  - 🚧 In Progress (yellow)
  - ✅ Completed (green)
  - ❌ Failed (red)

### Viewing Analytics
1. Click on a completed task
2. Use the filter dropdowns to refine your view:
   - Filter by year
   - Filter by company
3. Interactive charts will update automatically

### Available Visualizations
1. Sales Trend Over Time
  - Shows monthly sales count (blue line)
  - Shows average price (orange line)
2. Sales by Company
  - Bar chart shows sales volume per company
  - Dots show average price per company
3. Price Distribution
  - Histogram showing price ranges
  - Helps identify common price points

## Data Sources
The application pulls from two sample data sources:
1. source_a.json - Sample JSON data from "CompanyA"
2. source_b.csv - Sample CSV data with Honda/Toyota sales

$# Troubleshooting
### Common Issues

1. Database Issues:
  - Delete narravance.db to reset the database
  - Restart the backend server

2. Visualization Problems:
  - Refresh the page
  - Check browser console for errors (F12)

## Development Notes
Backend API Endpoints
- POST /api/tasks - Create new task
- GET /api/tasks - List all tasks
- GET /api/tasks/<id>/data - Get task data

## Frontend Structure
- index.html - Main application page
- app.js - All application logic
- styles.css - Custom styling
- assets/data/ - Sample data files
