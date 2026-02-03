// Global variables
let rawData = [];
let processedData = [];
let scaledData = [];
let scaler = null;
let selectedFeatures = ['Age', 'Annual Income (k$)', 'Spending Score (1-100)'];
let kmeansModel = null;
let clusterLabels = [];
let inertiaValues = [];
let optimalK = 5;

// Cluster colors
const clusterColors = [
    '#667eea', '#f093fb', '#f5576c', '#4facfe', '#43e97b',
    '#fa709a', '#fee140', '#30cfd0', '#a8edea', '#ff6e7f'
];

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
    document.getElementById('loadSampleBtn').addEventListener('click', loadSampleDataset);
    document.getElementById('uploadBtn').addEventListener('click', () => {
        document.getElementById('fileInput').click();
    });
    document.getElementById('fileInput').addEventListener('change', handleFileUpload);
    document.getElementById('preprocessBtn').addEventListener('click', preprocessData);
    document.getElementById('elbowBtn').addEventListener('click', calculateElbowCurve);
    document.getElementById('trainBtn').addEventListener('click', trainKMeans);
    document.getElementById('visualizeBtn').addEventListener('click', visualizeClusters);
    document.getElementById('interpretBtn').addEventListener('click', interpretClusters);
    document.getElementById('exportBtn').addEventListener('click', exportSegmentedCSV);
    document.getElementById('exportReportBtn').addEventListener('click', exportAnalysisReport);
}

// Toggle workflow steps
function toggleStep(stepId) {
    const content = document.getElementById(stepId);
    content.classList.toggle('active');
}

// Generate sample mall customer dataset
function generateMallCustomerDataset() {
    const dataset = [];
    const customerCount = 200;
    
    for (let i = 1; i <= customerCount; i++) {
        const gender = Math.random() > 0.5 ? 'Male' : 'Female';
        const age = Math.floor(18 + Math.random() * 52); // 18-70
        
        // Create different customer segments
        const segment = Math.floor(Math.random() * 5);
        let income, spendingScore;
        
        switch(segment) {
            case 0: // Low income, low spending
                income = Math.floor(15 + Math.random() * 25);
                spendingScore = Math.floor(1 + Math.random() * 40);
                break;
            case 1: // Low income, high spending
                income = Math.floor(15 + Math.random() * 25);
                spendingScore = Math.floor(60 + Math.random() * 40);
                break;
            case 2: // High income, low spending
                income = Math.floor(70 + Math.random() * 67);
                spendingScore = Math.floor(1 + Math.random() * 40);
                break;
            case 3: // High income, high spending
                income = Math.floor(70 + Math.random() * 67);
                spendingScore = Math.floor(60 + Math.random() * 40);
                break;
            case 4: // Medium income, medium spending
                income = Math.floor(40 + Math.random() * 30);
                spendingScore = Math.floor(40 + Math.random() * 20);
                break;
        }
        
        dataset.push({
            'CustomerID': i,
            'Gender': gender,
            'Age': age,
            'Annual Income (k$)': income,
            'Spending Score (1-100)': spendingScore
        });
    }
    
    return dataset;
}

// Load sample dataset
function loadSampleDataset() {
    rawData = generateMallCustomerDataset();
    
    document.getElementById('totalCustomers').textContent = rawData.length;
    document.getElementById('dataStatus').textContent = 'Loaded ✓';
    
    const infoHTML = `
        <div class="alert alert-success">
            <h3>✅ Sample Dataset Loaded</h3>
            <p><strong>Total Customers:</strong> ${rawData.length}</p>
            <p><strong>Features:</strong> CustomerID, Gender, Age, Annual Income, Spending Score</p>
            <p><strong>Source:</strong> Mall Customer Segmentation Data (Simulated)</p>
        </div>
    `;
    
    document.getElementById('datasetInfo').innerHTML = infoHTML;
    displayDataPreview();
}

// Handle CSV file upload
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const text = e.target.result;
        rawData = parseCSV(text);
        
        if (rawData.length > 0) {
            document.getElementById('totalCustomers').textContent = rawData.length;
            document.getElementById('dataStatus').textContent = 'Loaded ✓';
            
            const infoHTML = `
                <div class="alert alert-success">
                    <h3>✅ CSV File Loaded</h3>
                    <p><strong>Total Records:</strong> ${rawData.length}</p>
                    <p><strong>Features:</strong> ${Object.keys(rawData[0]).join(', ')}</p>
                </div>
            `;
            
            document.getElementById('datasetInfo').innerHTML = infoHTML;
            displayDataPreview();
        }
    };
    reader.readAsText(file);
}

// Parse CSV
function parseCSV(text) {
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        if (values.length === headers.length) {
            const row = {};
            headers.forEach((header, index) => {
                const value = values[index].trim();
                row[header] = isNaN(value) ? value : parseFloat(value);
            });
            data.push(row);
        }
    }
    
    return data;
}

// Display data preview
function displayDataPreview() {
    const previewDiv = document.getElementById('dataPreview');
    
    let html = '<h4>Data Preview (First 10 Rows):</h4><table><thead><tr>';
    const headers = Object.keys(rawData[0]);
    headers.forEach(header => html += `<th>${header}</th>`);
    html += '</tr></thead><tbody>';
    
    rawData.slice(0, 10).forEach(row => {
        html += '<tr>';
        headers.forEach(header => html += `<td>${row[header]}</td>`);
        html += '</tr>';
    });
    
    html += '</tbody></table>';
    previewDiv.innerHTML = html;
}

// Preprocess data
function preprocessData() {
    if (!rawData.length) {
        alert('Please load dataset first!');
        return;
    }
    
    // Get selected features
    selectedFeatures = [];
    if (document.getElementById('featureAge').checked) selectedFeatures.push('Age');
    if (document.getElementById('featureIncome').checked) selectedFeatures.push('Annual Income (k$)');
    if (document.getElementById('featureSpending').checked) selectedFeatures.push('Spending Score (1-100)');
    
    if (selectedFeatures.length < 2) {
        alert('Please select at least 2 features for clustering!');
        return;
    }
    
    // Extract selected features (dropping CustomerID)
    processedData = rawData.map(row => {
        const newRow = {};
        selectedFeatures.forEach(feature => {
            newRow[feature] = row[feature];
        });
        return newRow;
    });
    
    // Apply StandardScaler
    scaler = fitStandardScaler(processedData, selectedFeatures);
    scaledData = transformStandardScaler(processedData, scaler, selectedFeatures);
    
    // Display results
    const resultsHTML = `
        <div class="alert alert-success">
            <h3>✅ Preprocessing Complete</h3>
            <p><strong>CustomerID Dropped:</strong> Not relevant for clustering</p>
            <p><strong>Selected Features:</strong> ${selectedFeatures.join(', ')}</p>
            <p><strong>StandardScaler Applied:</strong> Features normalized to mean=0, std=1</p>
            <p><strong>Ready for Clustering:</strong> ${scaledData.length} samples</p>
        </div>
    `;
    
    document.getElementById('preprocessingResults').innerHTML = resultsHTML;
    displayFeatureStatistics();
}

// Fit StandardScaler
function fitStandardScaler(data, features) {
    const scaler = { means: {}, stds: {} };
    
    features.forEach(feature => {
        const values = data.map(row => row[feature]);
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
        const std = Math.sqrt(variance) || 1;
        
        scaler.means[feature] = mean;
        scaler.stds[feature] = std;
    });
    
    return scaler;
}

// Transform using StandardScaler
function transformStandardScaler(data, scaler, features) {
    return data.map(row => {
        const scaledRow = {};
        features.forEach(feature => {
            scaledRow[feature] = (row[feature] - scaler.means[feature]) / scaler.stds[feature];
        });
        return scaledRow;
    });
}

// Display feature statistics
function displayFeatureStatistics() {
    const statsDiv = document.getElementById('featureStats');
    
    let html = '<h4>Feature Statistics (Before Scaling):</h4><table><tr><th>Feature</th><th>Mean</th><th>Std Dev</th><th>Min</th><th>Max</th></tr>';
    
    selectedFeatures.forEach(feature => {
        const values = processedData.map(row => row[feature]);
        const mean = scaler.means[feature];
        const std = scaler.stds[feature];
        const min = Math.min(...values);
        const max = Math.max(...values);
        
        html += `<tr>
            <td><strong>${feature}</strong></td>
            <td>${mean.toFixed(2)}</td>
            <td>${std.toFixed(2)}</td>
            <td>${min.toFixed(2)}</td>
            <td>${max.toFixed(2)}</td>
        </tr>`;
    });
    
    html += '</table>';
    statsDiv.innerHTML = html;
}

// Calculate elbow curve
function calculateElbowCurve() {
    if (!scaledData.length) {
        alert('Please preprocess data first!');
        return;
    }
    
    const maxK = parseInt(document.getElementById('maxClusters').value);
    const progressDiv = document.getElementById('elbowProgress');
    
    progressDiv.innerHTML = '<div class="progress-bar"><div class="progress-fill loading">Calculating inertia for different K values...</div></div>';
    
    setTimeout(() => {
        inertiaValues = [];
        
        for (let k = 1; k <= maxK; k++) {
            const model = trainKMeansModel(scaledData, k, selectedFeatures);
            inertiaValues.push({ k: k, inertia: model.inertia });
            
            const progress = (k / maxK) * 100;
            progressDiv.innerHTML = `<div class="progress-bar"><div class="progress-fill" style="width: ${progress}%">${progress.toFixed(0)}%</div></div>`;
        }
        
        // Find elbow using derivative method
        optimalK = findElbowPoint(inertiaValues);
        
        document.getElementById('optimalK').textContent = optimalK;
        
        const recHTML = `
            <div class="alert alert-success">
                <h3>📊 Elbow Analysis Complete</h3>
                <p><strong>Recommended K:</strong> ${optimalK} clusters</p>
                <p><strong>Method:</strong> Maximum curvature point in inertia curve</p>
                <p>The elbow point indicates where adding more clusters provides diminishing returns.</p>
            </div>
        `;
        
        document.getElementById('elbowRecommendation').innerHTML = recHTML;
        document.getElementById('selectedK').value = optimalK;
        
        drawElbowCurve();
        progressDiv.innerHTML = '';
    }, 100);
}

// Find elbow point
function findElbowPoint(inertiaValues) {
    const n = inertiaValues.length;
    if (n < 3) return 3;
    
    // Calculate second derivative
    let maxCurvature = -Infinity;
    let elbowK = 3;
    
    for (let i = 1; i < n - 1; i++) {
        const d1 = inertiaValues[i].inertia - inertiaValues[i - 1].inertia;
        const d2 = inertiaValues[i + 1].inertia - inertiaValues[i].inertia;
        const curvature = Math.abs(d2 - d1);
        
        if (curvature > maxCurvature && i >= 2) {
            maxCurvature = curvature;
            elbowK = inertiaValues[i].k;
        }
    }
    
    return elbowK;
}

// Draw elbow curve
function drawElbowCurve() {
    const canvas = document.getElementById('elbowChart');
    const ctx = canvas.getContext('2d');
    
    canvas.width = canvas.offsetWidth;
    canvas.height = 400;
    
    const padding = 80;
    const chartWidth = canvas.width - 2 * padding;
    const chartHeight = canvas.height - 2 * padding;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const maxInertia = Math.max(...inertiaValues.map(v => v.inertia));
    const minInertia = Math.min(...inertiaValues.map(v => v.inertia));
    const inertiaRange = maxInertia - minInertia;
    
    // Draw axes
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, canvas.height - padding);
    ctx.lineTo(canvas.width - padding, canvas.height - padding);
    ctx.stroke();
    
    // Draw grid
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
        const y = padding + (chartHeight / 5) * i;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(canvas.width - padding, y);
        ctx.stroke();
        
        const value = maxInertia - (inertiaRange / 5) * i;
        ctx.fillStyle = '#555';
        ctx.font = '12px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(value.toFixed(0), padding - 10, y + 4);
    }
    
    // Draw line
    ctx.strokeStyle = '#667eea';
    ctx.lineWidth = 3;
    ctx.beginPath();
    
    inertiaValues.forEach((point, i) => {
        const x = padding + (point.k - 1) * (chartWidth / (inertiaValues.length - 1));
        const y = canvas.height - padding - ((point.inertia - minInertia) / inertiaRange) * chartHeight;
        
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.stroke();
    
    // Draw points
    inertiaValues.forEach(point => {
        const x = padding + (point.k - 1) * (chartWidth / (inertiaValues.length - 1));
        const y = canvas.height - padding - ((point.inertia - minInertia) / inertiaRange) * chartHeight;
        
        ctx.fillStyle = point.k === optimalK ? '#f5576c' : '#667eea';
        ctx.beginPath();
        ctx.arc(x, y, point.k === optimalK ? 8 : 5, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw K labels
        ctx.fillStyle = '#555';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(point.k, x, canvas.height - padding + 20);
    });
    
    // Highlight elbow
    if (optimalK) {
        const point = inertiaValues.find(v => v.k === optimalK);
        const x = padding + (point.k - 1) * (chartWidth / (inertiaValues.length - 1));
        const y = canvas.height - padding - ((point.inertia - minInertia) / inertiaRange) * chartHeight;
        
        ctx.strokeStyle = '#f5576c';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, canvas.height - padding);
        ctx.stroke();
        ctx.setLineDash([]);
    }
    
    // Labels
    ctx.fillStyle = '#333';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Number of Clusters (K)', canvas.width / 2, canvas.height - 20);
    
    ctx.save();
    ctx.translate(20, canvas.height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Inertia (WCSS)', 0, 0);
    ctx.restore();
    
    // Title
    ctx.font = 'bold 16px Arial';
    ctx.fillText('Elbow Method - Optimal K Selection', canvas.width / 2, 30);
}

// Train KMeans
function trainKMeans() {
    if (!scaledData.length) {
        alert('Please preprocess data first!');
        return;
    }
    
    const k = parseInt(document.getElementById('selectedK').value);
    
    kmeansModel = trainKMeansModel(scaledData, k, selectedFeatures);
    clusterLabels = kmeansModel.labels;
    
    document.getElementById('numClusters').textContent = k;
    document.getElementById('inertia').textContent = kmeansModel.inertia.toFixed(2);
    document.getElementById('modelStatus').textContent = 'Trained ✓';
    document.getElementById('segmentsCount').textContent = k;
    
    const resultsHTML = `
        <div class="alert alert-success">
            <h3>✅ KMeans Model Trained</h3>
            <p><strong>Number of Clusters:</strong> ${k}</p>
            <p><strong>Inertia:</strong> ${kmeansModel.inertia.toFixed(2)}</p>
            <p><strong>Iterations:</strong> ${kmeansModel.iterations}</p>
            <p><strong>Converged:</strong> ${kmeansModel.converged ? 'Yes' : 'No'}</p>
        </div>
    `;
    
    document.getElementById('trainingResults').innerHTML = resultsHTML;
    displayClusterSizes();
    
    // Enable export buttons
    document.getElementById('exportBtn').disabled = false;
    document.getElementById('exportReportBtn').disabled = false;
}

// Train KMeans model (KMeans++ initialization)
function trainKMeansModel(data, k, features) {
    const maxIterations = 100;
    const tolerance = 1e-4;
    
    // Extract feature vectors
    const X = data.map(row => features.map(f => row[f]));
    const n = X.length;
    const d = X[0].length;
    
    // Initialize centroids using KMeans++
    let centroids = initializeKMeansPlusPlus(X, k);
    let labels = new Array(n);
    let prevInertia = Infinity;
    let iterations = 0;
    let converged = false;
    
    for (iterations = 0; iterations < maxIterations; iterations++) {
        // Assign labels
        for (let i = 0; i < n; i++) {
            let minDist = Infinity;
            let bestCluster = 0;
            
            for (let j = 0; j < k; j++) {
                const dist = euclideanDistance(X[i], centroids[j]);
                if (dist < minDist) {
                    minDist = dist;
                    bestCluster = j;
                }
            }
            
            labels[i] = bestCluster;
        }
        
        // Update centroids
        const newCentroids = [];
        for (let j = 0; j < k; j++) {
            const clusterPoints = X.filter((_, i) => labels[i] === j);
            
            if (clusterPoints.length > 0) {
                const centroid = new Array(d).fill(0);
                for (let point of clusterPoints) {
                    for (let dim = 0; dim < d; dim++) {
                        centroid[dim] += point[dim];
                    }
                }
                for (let dim = 0; dim < d; dim++) {
                    centroid[dim] /= clusterPoints.length;
                }
                newCentroids.push(centroid);
            } else {
                // Re-initialize empty cluster
                newCentroids.push(X[Math.floor(Math.random() * n)]);
            }
        }
        
        centroids = newCentroids;
        
        // Calculate inertia
        const inertia = calculateInertia(X, labels, centroids);
        
        // Check convergence
        if (Math.abs(prevInertia - inertia) < tolerance) {
            converged = true;
            break;
        }
        
        prevInertia = inertia;
    }
    
    const finalInertia = calculateInertia(X, labels, centroids);
    
    return {
        k: k,
        centroids: centroids,
        labels: labels,
        inertia: finalInertia,
        iterations: iterations + 1,
        converged: converged
    };
}

// KMeans++ initialization
function initializeKMeansPlusPlus(X, k) {
    const n = X.length;
    const centroids = [];
    
    // Choose first centroid randomly
    centroids.push(X[Math.floor(Math.random() * n)]);
    
    // Choose remaining centroids
    for (let i = 1; i < k; i++) {
        const distances = X.map(point => {
            const minDist = Math.min(...centroids.map(c => euclideanDistance(point, c)));
            return minDist * minDist;
        });
        
        const totalDist = distances.reduce((a, b) => a + b, 0);
        const probabilities = distances.map(d => d / totalDist);
        
        // Weighted random selection
        let cumsum = 0;
        const rand = Math.random();
        for (let j = 0; j < n; j++) {
            cumsum += probabilities[j];
            if (cumsum >= rand) {
                centroids.push(X[j]);
                break;
            }
        }
    }
    
    return centroids;
}

// Calculate inertia
function calculateInertia(X, labels, centroids) {
    let inertia = 0;
    for (let i = 0; i < X.length; i++) {
        const dist = euclideanDistance(X[i], centroids[labels[i]]);
        inertia += dist * dist;
    }
    return inertia;
}

// Euclidean distance
function euclideanDistance(a, b) {
    return Math.sqrt(a.reduce((sum, val, i) => sum + Math.pow(val - b[i], 2), 0));
}

// Display cluster sizes
function displayClusterSizes() {
    const clusterCounts = {};
    for (let i = 0; i < kmeansModel.k; i++) {
        clusterCounts[i] = clusterLabels.filter(l => l === i).length;
    }
    
    let html = '<h4>Cluster Distribution:</h4><table><tr><th>Cluster</th><th>Size</th><th>Percentage</th></tr>';
    
    let maxSize = 0;
    let maxCluster = 0;
    
    for (let i = 0; i < kmeansModel.k; i++) {
        const size = clusterCounts[i];
        const percentage = (size / clusterLabels.length * 100).toFixed(1);
        
        html += `<tr>
            <td><span class="cluster-badge" style="background: ${clusterColors[i]}">Cluster ${i}</span></td>
            <td>${size} customers</td>
            <td>${percentage}%</td>
        </tr>`;
        
        if (size > maxSize) {
            maxSize = size;
            maxCluster = i;
        }
    }
    
    html += '</table>';
    document.getElementById('clusterSizes').innerHTML = html;
    document.getElementById('largestSegment').textContent = `Cluster ${maxCluster} (${maxSize} customers)`;
}

// Visualize clusters
function visualizeClusters() {
    if (!kmeansModel) {
        alert('Please train KMeans model first!');
        return;
    }
    
    const xFeature = document.getElementById('xAxis').value;
    const yFeature = document.getElementById('yAxis').value;
    
    drawClusterScatter(xFeature, yFeature);
}

// Draw cluster scatter plot
function drawClusterScatter(xFeature, yFeature) {
    const canvas = document.getElementById('clusterScatter');
    const ctx = canvas.getContext('2d');
    
    canvas.width = canvas.offsetWidth;
    canvas.height = 400;
    
    const padding = 80;
    const chartWidth = canvas.width - 2 * padding;
    const chartHeight = canvas.height - 2 * padding;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Get data for selected features
    const xData = processedData.map(row => row[xFeature]);
    const yData = processedData.map(row => row[yFeature]);
    
    const xMin = Math.min(...xData);
    const xMax = Math.max(...xData);
    const yMin = Math.min(...yData);
    const yMax = Math.max(...yData);
    
    const xRange = xMax - xMin;
    const yRange = yMax - yMin;
    
    // Draw axes
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, canvas.height - padding);
    ctx.lineTo(canvas.width - padding, canvas.height - padding);
    ctx.stroke();
    
    // Draw grid
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
        const y = padding + (chartHeight / 5) * i;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(canvas.width - padding, y);
        ctx.stroke();
        
        const value = yMax - (yRange / 5) * i;
        ctx.fillStyle = '#555';
        ctx.font = '12px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(value.toFixed(0), padding - 10, y + 4);
    }
    
    for (let i = 0; i <= 5; i++) {
        const x = padding + (chartWidth / 5) * i;
        ctx.beginPath();
        ctx.moveTo(x, padding);
        ctx.lineTo(x, canvas.height - padding);
        ctx.stroke();
        
        const value = xMin + (xRange / 5) * i;
        ctx.fillStyle = '#555';
        ctx.textAlign = 'center';
        ctx.fillText(value.toFixed(0), x, canvas.height - padding + 20);
    }
    
    // Draw points
    processedData.forEach((row, i) => {
        const x = padding + ((row[xFeature] - xMin) / xRange) * chartWidth;
        const y = canvas.height - padding - ((row[yFeature] - yMin) / yRange) * chartHeight;
        
        ctx.fillStyle = clusterColors[clusterLabels[i]];
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 1;
        ctx.stroke();
    });
    
    // Draw centroids
    const xFeatureIdx = selectedFeatures.indexOf(xFeature);
    const yFeatureIdx = selectedFeatures.indexOf(yFeature);
    
    if (xFeatureIdx !== -1 && yFeatureIdx !== -1) {
        kmeansModel.centroids.forEach((centroid, i) => {
            // Transform back from scaled to original
            const xScaled = centroid[xFeatureIdx];
            const yScaled = centroid[yFeatureIdx];
            
            const xOriginal = xScaled * scaler.stds[xFeature] + scaler.means[xFeature];
            const yOriginal = yScaled * scaler.stds[yFeature] + scaler.means[yFeature];
            
            const x = padding + ((xOriginal - xMin) / xRange) * chartWidth;
            const y = canvas.height - padding - ((yOriginal - yMin) / yRange) * chartHeight;
            
            ctx.fillStyle = clusterColors[i];
            ctx.beginPath();
            ctx.arc(x, y, 10, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 3;
            ctx.stroke();
            
            ctx.fillStyle = 'white';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('C', x, y + 4);
        });
    }
    
    // Labels
    ctx.fillStyle = '#333';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(xFeature, canvas.width / 2, canvas.height - 20);
    
    ctx.save();
    ctx.translate(20, canvas.height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(yFeature, 0, 0);
    ctx.restore();
    
    // Title
    ctx.font = 'bold 16px Arial';
    ctx.fillText('Customer Segments Visualization', canvas.width / 2, 30);
    
    // Legend
    const legendX = canvas.width - 150;
    let legendY = 60;
    for (let i = 0; i < kmeansModel.k; i++) {
        ctx.fillStyle = clusterColors[i];
        ctx.beginPath();
        ctx.arc(legendX, legendY, 6, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#333';
        ctx.font = '12px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`Cluster ${i}`, legendX + 15, legendY + 4);
        legendY += 25;
    }
}

// Interpret clusters
function interpretClusters() {
    if (!kmeansModel) {
        alert('Please train KMeans model first!');
        return;
    }
    
    const segments = analyzeSegments();
    displaySegmentProfiles(segments);
    displayBusinessInsights(segments);
}

// Analyze segments
function analyzeSegments() {
    const segments = [];
    
    for (let cluster = 0; cluster < kmeansModel.k; cluster++) {
        const clusterData = processedData.filter((_, i) => clusterLabels[i] === cluster);
        
        const stats = {};
        selectedFeatures.forEach(feature => {
            const values = clusterData.map(row => row[feature]);
            stats[feature] = {
                mean: values.reduce((a, b) => a + b, 0) / values.length,
                min: Math.min(...values),
                max: Math.max(...values)
            };
        });
        
        // Interpret segment
        const interpretation = interpretSegment(stats, cluster);
        
        segments.push({
            cluster: cluster,
            size: clusterData.length,
            stats: stats,
            ...interpretation
        });
    }
    
    // Find high-value customers
    const highValue = segments.filter(s => s.value === 'High').reduce((sum, s) => sum + s.size, 0);
    document.getElementById('highValueCount').textContent = `${highValue} customers`;
    document.getElementById('strategyStatus').textContent = 'Ready ✓';
    
    return segments;
}

// Interpret individual segment
function interpretSegment(stats, cluster) {
    const income = stats['Annual Income (k$)'] ? stats['Annual Income (k$)'].mean : 50;
    const spending = stats['Spending Score (1-100)'] ? stats['Spending Score (1-100)'].mean : 50;
    const age = stats['Age'] ? stats['Age'].mean : 35;
    
    let label, description, value, strategy;
    
    if (income < 40 && spending < 40) {
        label = 'Careful Shoppers';
        description = 'Low income, low spending customers who are price-sensitive';
        value = 'Low';
        strategy = 'Focus on discounts, value deals, and loyalty programs';
    } else if (income < 40 && spending >= 40) {
        label = 'Impulse Buyers';
        description = 'Low income but high spending - potential debt risk';
        value = 'Medium';
        strategy = 'Promote credit facilities and installment plans';
    } else if (income >= 70 && spending < 40) {
        label = 'Potential Targets';
        description = 'High income but low spending - untapped potential';
        value = 'High';
        strategy = 'Premium marketing campaigns to increase engagement';
    } else if (income >= 70 && spending >= 40) {
        label = 'VIP Customers';
        description = 'High income and high spending - most valuable segment';
        value = 'High';
        strategy = 'Personalized service, exclusive offers, VIP programs';
    } else {
        label = 'Standard Customers';
        description = 'Medium income and spending - stable customer base';
        value = 'Medium';
        strategy = 'Cross-selling and upselling opportunities';
    }
    
    return { label, description, value, strategy };
}

// Display segment profiles
function displaySegmentProfiles(segments) {
    const container = document.getElementById('clusterProfiles');
    
    let html = '';
    segments.forEach(segment => {
        html += `
            <div class="profile-card">
                <h3>Cluster ${segment.cluster}</h3>
                <span class="segment-label">${segment.label}</span>
                <div class="stats">
                    <p><strong>Size:</strong> ${segment.size} customers (${(segment.size / clusterLabels.length * 100).toFixed(1)}%)</p>
                    <p><strong>Value Tier:</strong> ${segment.value}</p>
                    ${selectedFeatures.map(feature => `
                        <p><strong>${feature}:</strong> ${segment.stats[feature].mean.toFixed(1)}</p>
                    `).join('')}
                </div>
                <p><strong>Profile:</strong> ${segment.description}</p>
                <div class="strategy">
                    <strong>💡 Strategy:</strong> ${segment.strategy}
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    
    const analysisHTML = `
        <div class="alert alert-success">
            <h3>✅ Segment Analysis Complete</h3>
            <p>All ${segments.length} customer segments have been analyzed and labeled with business-relevant names.</p>
            <p>View detailed profiles and strategies below.</p>
        </div>
    `;
    
    document.getElementById('segmentAnalysis').innerHTML = analysisHTML;
}

// Display business insights
function displayBusinessInsights(segments) {
    const container = document.getElementById('businessInsights');
    
    const highValueSegments = segments.filter(s => s.value === 'High');
    const mediumValueSegments = segments.filter(s => s.value === 'Medium');
    const lowValueSegments = segments.filter(s => s.value === 'Low');
    
    const totalRevenuePotential = segments.reduce((sum, s) => {
        const potential = s.stats['Annual Income (k$)'] ? s.stats['Annual Income (k$)'].mean * s.stats['Spending Score (1-100)'].mean / 100 : 0;
        return sum + potential * s.size;
    }, 0);
    
    let html = `
        <div class="insight-card">
            <h4>🎯 Key Findings</h4>
            <ul>
                <li><strong>Total Segments:</strong> ${segments.length} distinct customer groups identified</li>
                <li><strong>High-Value Segments:</strong> ${highValueSegments.length} segments (${highValueSegments.reduce((sum, s) => sum + s.size, 0)} customers)</li>
                <li><strong>Medium-Value Segments:</strong> ${mediumValueSegments.length} segments (${mediumValueSegments.reduce((sum, s) => sum + s.size, 0)} customers)</li>
                <li><strong>Low-Value Segments:</strong> ${lowValueSegments.length} segments (${lowValueSegments.reduce((sum, s) => sum + s.size, 0)} customers)</li>
                <li><strong>Revenue Potential Index:</strong> ${totalRevenuePotential.toFixed(0)}</li>
            </ul>
        </div>
        
        <div class="insight-card">
            <h4>💰 Revenue Opportunities</h4>
            <ul>
                <li>Focus premium marketing on high-income low-spending segments</li>
                <li>Implement loyalty programs for VIP customers to increase retention</li>
                <li>Create targeted discounts for price-sensitive segments</li>
                <li>Develop cross-selling strategies for medium-value customers</li>
            </ul>
        </div>
        
        <div class="insight-card">
            <h4>📈 Recommended Actions</h4>
            <ul>
                <li><strong>Immediate:</strong> Launch personalized email campaigns for each segment</li>
                <li><strong>Short-term:</strong> Develop segment-specific product bundles</li>
                <li><strong>Medium-term:</strong> Implement dynamic pricing based on segment behavior</li>
                <li><strong>Long-term:</strong> Build predictive models to identify segment transitions</li>
            </ul>
        </div>
        
        <div class="insight-card">
            <h4>⚠️ Risk Factors</h4>
            <ul>
                <li>Impulse buyers may have high churn rate - monitor spending patterns</li>
                <li>Potential targets segment is underutilized - requires engagement strategy</li>
                <li>Regular re-segmentation needed as customer behaviors change</li>
            </ul>
        </div>
    `;
    
    container.innerHTML = html;
}

// Export segmented CSV
function exportSegmentedCSV() {
    if (!kmeansModel) {
        alert('Please train KMeans model first!');
        return;
    }
    
    // Add cluster labels to original data
    const segmentedData = rawData.map((row, i) => ({
        ...row,
        'Cluster': clusterLabels[i],
        'Segment_Label': interpretSegment(
            getStatsForRow(processedData[i]),
            clusterLabels[i]
        ).label
    }));
    
    // Convert to CSV
    const headers = Object.keys(segmentedData[0]);
    let csv = headers.join(',') + '\n';
    
    segmentedData.forEach(row => {
        csv += headers.map(header => row[header]).join(',') + '\n';
    });
    
    // Download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'customer_segments.csv';
    a.click();
    
    const infoHTML = `
        <div class="alert alert-success">
            <h3>✅ CSV Export Complete</h3>
            <p><strong>Filename:</strong> customer_segments.csv</p>
            <p><strong>Records:</strong> ${segmentedData.length}</p>
            <p><strong>Added Columns:</strong> Cluster, Segment_Label</p>
        </div>
    `;
    
    document.getElementById('exportInfo').innerHTML = infoHTML;
}

// Export analysis report
function exportAnalysisReport() {
    const segments = analyzeSegments();
    
    let report = 'CUSTOMER SEGMENTATION ANALYSIS REPORT\n';
    report += '=====================================\n\n';
    report += `Generated: ${new Date().toLocaleString()}\n`;
    report += `Total Customers: ${rawData.length}\n`;
    report += `Number of Segments: ${kmeansModel.k}\n`;
    report += `Features Used: ${selectedFeatures.join(', ')}\n`;
    report += `Model Inertia: ${kmeansModel.inertia.toFixed(2)}\n\n`;
    
    segments.forEach(segment => {
        report += `\nSEGMENT ${segment.cluster}: ${segment.label}\n`;
        report += '─'.repeat(50) + '\n';
        report += `Size: ${segment.size} customers (${(segment.size / clusterLabels.length * 100).toFixed(1)}%)\n`;
        report += `Value Tier: ${segment.value}\n`;
        report += `Description: ${segment.description}\n`;
        report += `\nAverage Characteristics:\n`;
        selectedFeatures.forEach(feature => {
            report += `  - ${feature}: ${segment.stats[feature].mean.toFixed(1)}\n`;
        });
        report += `\nRecommended Strategy:\n${segment.strategy}\n`;
    });
    
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'segmentation_analysis_report.txt';
    a.click();
}

// Helper function
function getStatsForRow(row) {
    const stats = {};
    selectedFeatures.forEach(feature => {
        stats[feature] = { mean: row[feature] };
    });
    return stats;
}