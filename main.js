import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-analytics.js";
  

// ==========================================
// 1. FIREBASE CONFIGURATION
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyBYI8bOIJHEWMlJegoeqfutrywhzt6VZOI",
    authDomain: "iot1-46d86.firebaseapp.com",
    databaseURL: "https://iot1-46d86-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "iot1-46d86",
    storageBucket: "iot1-46d86.firebasestorage.app",
    messagingSenderId: "698261743475",
    appId: "1:698261743475:web:29988a16847083a7110706",
    measurementId: "G-Y7HSFWQVYT"
  };

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);


// ==========================================
// 2. INITIALIZE MAP & CHARTS
// ==========================================
// Hardcoded Location for Covilhã, Portugal
const STATION_LAT = 40.277222;
const STATION_LNG = -7.509361;

const map = L.map('map').setView([STATION_LAT, STATION_LNG], 15);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

const marker = L.marker([STATION_LAT, STATION_LNG])
    .addTo(map)
    .bindPopup("<b>Facility Alpha</b><br>Main Operations Floor")
    .openPopup();

// Helper function to build Chart.js instances
function createChart(ctxId, label, color) {
    const ctx = document.getElementById(ctxId).getContext('2d');
    return new Chart(ctx, {
        type: 'line',
        data: { 
            labels: [], 
            datasets: [{ 
                label: label, 
                data: [], 
                borderColor: color, 
                backgroundColor: color + '33', 
                tension: 0.3, 
                pointRadius: 2 
            }] 
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false, 
            plugins: { legend: { labels: { color: 'white' } } }, 
            scales: { 
                x: { ticks: { color: '#aaa' }, grid: { color: '#333' } }, 
                y: { ticks: { color: '#aaa' }, grid: { color: '#333' } } 
            } 
        }
    });
}

// Initialize Workplace Charts
const charts = {
    temperature: createChart('temperatureChart', 'Temperature (°C)', '#ff5722'), // Deep Orange
    humidity: createChart('humidityChart', 'Humidity (%)', '#00BFFF'),           // Deep Sky Blue
    aqi: createChart('aqiChart', 'Air Quality (AQI)', '#32CD32'),                // Lime Green
    light: createChart('lightChart', 'Light Level (lux)', '#FFD700'),            // Gold
    pressure: createChart('pressureChart', 'Pressure (hPa)', '#FF6347')          // Tomato Red
};

// ==========================================
// 3. LIVE DASHBOARD LOGIC (Single Zone)
// ==========================================
const TARGET_ZONE = "main_workspace"; // The Firebase node your Arduino pushes to
let currentLiveListener = null;

function listenToDevice(deviceId) {
    if (currentLiveListener) currentLiveListener(); 

    const sensorRef = query(ref(db, `sensors/${deviceId}`), limitToLast(20));

    currentLiveListener = onValue(sensorRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            document.getElementById('status').innerText = `Live Monitoring Active (Zone: ${deviceId})`;
            const labels = [];
            const historyData = { temperature: [], humidity: [], aqi: [], light: [], pressure: [] };
            let latestEntry = null;

            // Extract data for charts and cards
            Object.keys(data).forEach(key => {
                latestEntry = data[key];
                labels.push(new Date(latestEntry.timestamp).toLocaleTimeString());
                historyData.temperature.push(latestEntry.temperature);
                historyData.humidity.push(latestEntry.humidity);
                historyData.aqi.push(latestEntry.aqi);
                historyData.light.push(latestEntry.light);
                historyData.pressure.push(latestEntry.pressure);
            });

            // Update UI Cards
            document.getElementById('temperature').innerText = latestEntry.temperature;
            document.getElementById('humidity').innerText = latestEntry.humidity;
            document.getElementById('air_quality').innerText = latestEntry.aqi;
            document.getElementById('light').innerText = latestEntry.light;
            document.getElementById('pressure').innerText = latestEntry.pressure;

            // Update Charts
            Object.keys(charts).forEach(sensorType => {
                charts[sensorType].data.labels = labels;
                charts[sensorType].data.datasets[0].data = historyData[sensorType];
                charts[sensorType].update();
            });
        } else {
            document.getElementById('status').innerText = `No data found for ${deviceId}`;
        }
    });
}

// Start listening immediately
listenToDevice(TARGET_ZONE);

// ==========================================
// 4. GROK AI WORKPLACE INSIGHTS
// ==========================================
document.getElementById('generateAiBtn').addEventListener('click', async () => {
    const timeRange = document.getElementById('timeRange').value;
    const statusText = document.getElementById('aiStatus');
    
    statusText.innerText = "Analyzing all workplace metrics & contacting Grok AI...";

    const deviceRef = ref(db, `sensors/${TARGET_ZONE}`);
    let aiQuery;

    // Fetch data based on selected time window
    if (timeRange === 'all') {
        aiQuery = deviceRef; 
    } else {
        const startTime = Date.now() - parseInt(timeRange);
        aiQuery = query(deviceRef, orderByChild('timestamp'), startAt(startTime)); 
    }

    try {
        const snapshot = await get(aiQuery); 
        
        if (snapshot.exists()) {
            const data = snapshot.val();
            // 1. We now prepare arrays for ALL metrics
            const aiData = { temperature: [], humidity: [], aqi: [], light: [], pressure: [] };
            
            Object.values(data).forEach(entry => {
                if(entry.temperature !== undefined) aiData.temperature.push(entry.temperature);
                if(entry.humidity !== undefined) aiData.humidity.push(entry.humidity);
                if(entry.aqi !== undefined) aiData.aqi.push(entry.aqi);
                if(entry.light !== undefined) aiData.light.push(entry.light);
                if(entry.pressure !== undefined) aiData.pressure.push(entry.pressure);
            });

            if (aiData.temperature.length > 0) {
                updateAIInsights(aiData);
                statusText.innerText = `Comprehensive evaluation complete using ${aiData.temperature.length} data points.`;
            } else {
                statusText.innerText = "Data found, but missing sensor values.";
            }
        } else {
            statusText.innerText = "No data found for the selected time range.";
        }
    } catch (error) {
        console.error("Firebase fetch error:", error);
        statusText.innerText = "Error fetching data. Check console.";
    }
});

async function updateAIInsights(historyData) {
    // 2. Calculate averages for ALL metrics
    const avgTemp = historyData.temperature.reduce((a, b) => a + b, 0) / historyData.temperature.length;
    const avgHum = historyData.humidity.reduce((a, b) => a + b, 0) / historyData.humidity.length;
    const avgAqi = historyData.aqi.reduce((a, b) => a + b, 0) / historyData.aqi.length;
    const avgLight = historyData.light.reduce((a, b) => a + b, 0) / historyData.light.length;
    const avgPressure = historyData.pressure.reduce((a, b) => a + b, 0) / historyData.pressure.length;
    
    const tbody = document.getElementById('insightsBody');
    tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: #ff5722;">Connecting to Grok AI for Safety Evaluation...</td></tr>`;

    // ⚠️ DANGER: DO NOT PUBLISH THIS KEY ON A PUBLIC WEBSITE.
    const GROK_API_KEY = "xoxb-YOUR_ACTUAL_GROK_API_KEY_HERE"; 

    // 3. UPDATED PROMPT: Giving Grok all the data and expanding its scope
    const prompt = `You are an Occupational Health and Safety (OHS) expert. Evaluate a workplace environment currently averaging:
    - Temperature: ${avgTemp.toFixed(1)}°C
    - Humidity: ${avgHum.toFixed(1)}%
    - Air Quality (AQI): ${avgAqi.toFixed(0)}
    - Light Level: ${avgLight.toFixed(0)} lux
    - Air Pressure: ${avgPressure.toFixed(1)} hPa
    
    Provide comprehensive recommendations based on thermal comfort, respiratory safety, visual ergonomics, and overall worker well-being.
    Return ONLY a valid JSON object with exactly two keys: 
    "facility" (3-4 sentences advising on HVAC, air filtration, lighting adjustments, and physical facility controls) and 
    "personnel" (3-4 sentences advising on worker safety protocols, break schedules, hydration, eye strain mitigation, or protective measures). 
    Do not include markdown blocks or any other text outside the JSON.`;

    try {
        const response = await fetch('https://api.x.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GROK_API_KEY}`
            },
            body: JSON.stringify({
                model: "grok-beta", 
                messages: [
                    { role: "system", content: "You are a professional occupational safety assistant." },
                    { role: "user", content: prompt }
                ],
                temperature: 0.2 
            })
        });

        if (!response.ok) throw new Error(`API Error: ${response.status}`);

        const data = await response.json();
        const aiResponseText = data.choices[0].message.content.trim();
        
        const cleanJsonString = aiResponseText.replace(/```json/gi, '').replace(/```/g, '');
        const aiInsights = JSON.parse(cleanJsonString);

        // 4. Inject the expanded data into the UI Table
        tbody.innerHTML = `
            <tr>
                <td>Facility Systems<br><small style="color:#aaa;">(HVAC, Air, Lighting)</small></td>
                <td>
                    Temp: <strong>${avgTemp.toFixed(1)}°C</strong> | Hum: <strong>${avgHum.toFixed(1)}%</strong><br>
                    AQI: <strong>${avgAqi.toFixed(0)}</strong> | Light: <strong>${avgLight.toFixed(0)} lux</strong><br>
                    Pressure: <strong>${avgPressure.toFixed(0)} hPa</strong>
                </td>
                <td>${aiInsights.facility}</td>
            </tr>
            <tr>
                <td>Personnel Safety<br><small style="color:#aaa;">(Protocols & Comfort)</small></td>
                <td>Comprehensive Ergonomics & Health Assessment</td>
                <td>${aiInsights.personnel}</td>
            </tr>
        `;

    } catch (error) {
        console.error("Grok AI Fetch Error:", error);
        tbody.innerHTML = `
            <tr>
                <td colspan="3" style="text-align: center; color: #FF6347;">
                    Failed to load safety evaluation. Check API key and browser console.
                </td>
            </tr>
        `;
    }
}