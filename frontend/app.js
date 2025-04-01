// Global variables
let currentTaskId = null;
let currentTaskData = [];

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    loadTasks();
    document.getElementById('taskForm').addEventListener('submit', createTask);
    document.getElementById('filterYear').addEventListener('change', updateCharts);
    document.getElementById('filterCompany').addEventListener('change', updateCharts);
});

// Load all tasks from the API
function loadTasks() {
    fetch('http://localhost:5000/api/tasks')
        .then(response => response.json())
        .then(tasks => {
            const taskList = document.getElementById('taskList');
            taskList.innerHTML = '';
            
            tasks.forEach(task => {
                const taskElement = document.createElement('button');
                taskElement.className = `list-group-item list-group-item-action task-card d-flex justify-content-between align-items-center ${task.status}`;
                taskElement.innerHTML = `
                    <div>
                        <strong>Task #${task.id}</strong>
                        <div class="text-muted small">${new Date(task.created_at).toLocaleString()}</div>
                    </div>
                    <span class="badge bg-${getStatusBadgeColor(task.status)} rounded-pill">${task.status.replace('_', ' ')}</span>
                `;
                
                taskElement.addEventListener('click', () => loadTaskData(task.id));
                taskList.appendChild(taskElement);
            });
        })
        .catch(error => console.error('Error loading tasks:', error));
}

// Get badge color based on task status
function getStatusBadgeColor(status) {
    switch(status) {
        case 'pending': return 'secondary';
        case 'in_progress': return 'warning';
        case 'completed': return 'success';
        case 'failed': return 'danger';
        default: return 'primary';
    }
}

// Create a new task
function createTask(e) {
    e.preventDefault();
    
    const form = e.target;
    const formData = {
        sources: Array.from(form.querySelectorAll('input[name="sources"]:checked')).map(el => el.value),
        year_from: parseInt(form.yearFrom.value),
        year_to: parseInt(form.yearTo.value),
        companies: Array.from(form.querySelectorAll('input[name="companies"]:checked')).map(el => el.value)
    };

    console.log(formData);
    
    fetch('http://localhost:5000/api/tasks', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ filters: formData })
    })
    .then(response => {
        if (!response.ok) throw new Error('Failed to create task');
        return response.json();
    })
    .then(task => {
        loadTasks();
        alert(`Task #${task.id} created successfully!`);
        form.reset();
    })
    .catch(error => {
        console.error('Error creating task:', error);
        alert('Failed to create task. Please try again.');
    });
}

// Load data for a specific task
function loadTaskData(taskId) {
    currentTaskId = taskId;
    
    fetch(`http://localhost:5000/api/tasks/${taskId}/data`)
        .then(response => {
            if (!response.ok) throw new Error('Task data not available yet');
            return response.json();
        })
        .then(data => {
            currentTaskData = data.map(record => ({
                ...record,
                date_of_sale: new Date(record.date_of_sale)
            }));
            
            document.getElementById('analyticsView').style.display = 'block';
            document.getElementById('emptyState').style.display = 'none';
            renderAllCharts(currentTaskData);
        })
        .catch(error => {
            console.error('Error loading task data:', error);
            alert('Task data is not ready yet. Please try again later.');
        });
}

// Render all charts
function renderAllCharts(data) {
    renderSalesTrendChart(data);
    renderCompanySalesChart(data);
    renderPriceDistributionChart(data);
}

// Update charts when filters change
function updateCharts() {
    const yearFilter = document.getElementById('filterYear').value;
    const companyFilter = document.getElementById('filterCompany').value;
    
    let filteredData = currentTaskData;
    
    if (yearFilter !== 'all') {
        filteredData = filteredData.filter(d => d.date_of_sale.getFullYear() == yearFilter);
    }
    
    if (companyFilter !== 'all') {
        filteredData = filteredData.filter(d => d.company === companyFilter);
    }
    
    renderAllCharts(filteredData);
}

// Render sales trend over time chart
function renderSalesTrendChart(data) {
    const container = document.getElementById('salesTrendChart');
    container.innerHTML = '';
    if (data.length === 0) return;
    
    // Group data by month
    const salesByMonth = {};
    
    data.forEach(record => {
        const monthYear = `${record.date_of_sale.getFullYear()}-${(record.date_of_sale.getMonth() + 1).toString().padStart(2, '0')}`;
        
        if (!salesByMonth[monthYear]) {
            salesByMonth[monthYear] = {
                count: 0,
                totalPrice: 0,
                date: record.date_of_sale
            };
        }
        
        salesByMonth[monthYear].count += 1;
        salesByMonth[monthYear].totalPrice += record.price;
    });
    
    const chartData = Object.entries(salesByMonth).map(([monthYear, stats]) => ({
        monthYear,
        date: stats.date,
        count: stats.count,
        avgPrice: stats.totalPrice / stats.count
    }));
    
    // Sort by date
    chartData.sort((a, b) => a.date - b.date);
    
    // Set up SVG
    const margin = { top: 20, right: 40, bottom: 40, left: 50 };
    const width = container.clientWidth - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;
    
    const svg = d3.select(container)
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // X scale (time)
    const x = d3.scaleTime()
        .domain(d3.extent(chartData, d => d.date))
        .range([0, width]);
    
    // Y scale (count)
    const y = d3.scaleLinear()
        .domain([0, d3.max(chartData, d => d.count)])
        .nice()
        .range([height, 0]);
    
    // Y scale right (price)
    const yRight = d3.scaleLinear()
        .domain([0, d3.max(chartData, d => d.avgPrice)])
        .nice()
        .range([height, 0]);
    
    // Add X axis
    svg.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x).tickFormat(d3.timeFormat('%b %Y')));
    
    // Add Y axis (left)
    svg.append('g')
        .call(d3.axisLeft(y));
    
    // Add Y axis (right)
    svg.append('g')
        .attr('transform', `translate(${width},0)`)
        .call(d3.axisRight(yRight));
    
    // Add count line
    svg.append('path')
        .datum(chartData)
        .attr('fill', 'none')
        .attr('stroke', 'steelblue')
        .attr('stroke-width', 2)
        .attr('d', d3.line()
            .x(d => x(d.date))
            .y(d => y(d.count))
        );
    
    // Add avg price line
    svg.append('path')
        .datum(chartData)
        .attr('fill', 'none')
        .attr('stroke', 'orange')
        .attr('stroke-width', 2)
        .attr('d', d3.line()
            .x(d => x(d.date))
            .y(d => yRight(d.avgPrice))
        );
    
    // Add legend
    const legend = svg.append('g')
        .attr('transform', `translate(${width - 150},20)`);
    
    legend.append('rect')
        .attr('width', 12)
        .attr('height', 12)
        .attr('fill', 'steelblue');
    
    legend.append('text')
        .attr('x', 20)
        .attr('y', 10)
        .text('Sales Count')
        .style('font-size', '12px');
    
    legend.append('rect')
        .attr('y', 20)
        .attr('width', 12)
        .attr('height', 12)
        .attr('fill', 'orange');
    
    legend.append('text')
        .attr('x', 20)
        .attr('y', 30)
        .text('Avg Price')
        .style('font-size', '12px');
    
    // Add chart title
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', -5)
        .attr('text-anchor', 'middle')
        .style('font-size', '14px')
        .text('Sales Trend Over Time');
}

// Render company sales chart
function renderCompanySalesChart(data) {
    const container = document.getElementById('companySalesChart');
    container.innerHTML = '';
    if (data.length === 0) return;
    
    // Group data by company
    const salesByCompany = {};
    
    data.forEach(record => {
        if (!salesByCompany[record.company]) {
            salesByCompany[record.company] = {
                count: 0,
                totalPrice: 0
            };
        }
        
        salesByCompany[record.company].count += 1;
        salesByCompany[record.company].totalPrice += record.price;
    });
    
    const chartData = Object.entries(salesByCompany).map(([company, stats]) => ({
        company,
        count: stats.count,
        avgPrice: stats.totalPrice / stats.count
    }));
    
    // Sort by count
    chartData.sort((a, b) => b.count - a.count);
    
    // Set up SVG
    const margin = { top: 20, right: 30, bottom: 40, left: 50 };
    const width = container.clientWidth - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;
    
    const svg = d3.select(container)
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // X scale (companies)
    const x = d3.scaleBand()
        .domain(chartData.map(d => d.company))
        .range([0, width])
        .padding(0.2);
    
    // Y scale (count)
    const y = d3.scaleLinear()
        .domain([0, d3.max(chartData, d => d.count)])
        .nice()
        .range([height, 0]);
    
    // Add X axis
    svg.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x));
    
    // Add Y axis
    svg.append('g')
        .call(d3.axisLeft(y));
    
    // Add bars
    svg.selectAll('rect')
        .data(chartData)
        .enter()
        .append('rect')
        .attr('x', d => x(d.company))
        .attr('y', d => y(d.count))
        .attr('width', x.bandwidth())
        .attr('height', d => height - y(d.count))
        .attr('fill', 'steelblue');
    
    // Add avg price as circles
    const yRight = d3.scaleLinear()
        .domain([0, d3.max(chartData, d => d.avgPrice)])
        .nice()
        .range([height, 0]);
    
    svg.selectAll('circle')
        .data(chartData)
        .enter()
        .append('circle')
        .attr('cx', d => x(d.company) + x.bandwidth() / 2)
        .attr('cy', d => yRight(d.avgPrice))
        .attr('r', 5)
        .attr('fill', 'orange');
    
    // Add chart title
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', -5)
        .attr('text-anchor', 'middle')
        .style('font-size', '14px')
        .text('Sales by Company (Bars = Count, Dots = Avg Price)');
}

// Render price distribution chart
function renderPriceDistributionChart(data) {
    const container = document.getElementById('priceDistributionChart');
    container.innerHTML = '';
    if (data.length === 0) return;
    
    // Set up SVG
    const margin = { top: 20, right: 30, bottom: 40, left: 50 };
    const width = container.clientWidth - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;
    
    const svg = d3.select(container)
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Create bins for histogram
    const prices = data.map(d => d.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    
    const histogram = d3.histogram()
        .value(d => d.price)
        .domain([minPrice, maxPrice])
        .thresholds(10);
    
    const bins = histogram(data);
    
    // X scale
    const x = d3.scaleLinear()
        .domain([minPrice, maxPrice])
        .range([0, width]);
    
    // Y scale
    const y = d3.scaleLinear()
        .domain([0, d3.max(bins, d => d.length)])
        .nice()
        .range([height, 0]);
    
    // Add X axis
    svg.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x).tickFormat(d => `$${d.toLocaleString()}`));
    
    // Add Y axis
    svg.append('g')
        .call(d3.axisLeft(y));
    
    // Add bars
    svg.selectAll('rect')
        .data(bins)
        .enter()
        .append('rect')
        .attr('x', d => x(d.x0) + 1)
        .attr('y', d => y(d.length))
        .attr('width', d => x(d.x1) - x(d.x0) - 1)
        .attr('height', d => height - y(d.length))
        .attr('fill', 'steelblue');
    
    // Add chart title
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', -5)
        .attr('text-anchor', 'middle')
        .style('font-size', '14px')
        .text('Price Distribution');
}