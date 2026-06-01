// Correcting modular design paradigms across Firebase Framework SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
import { getDatabase, ref, query, limitToLast, onValue, orderByChild, startAt, get } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-database.js";

// ==========================================
// 1. SECURE FIREBASE APPLICATION ROUTING
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
// 2. GEOSPATIAL & METRIC CHART COMPANIONS
// ==========================================
const STATION_LAT = 40.277222;
const STATION_LNG = -7.509361;

const map = L.map('map', { zoomControl: true, attributionControl: false }).setView([STATION_LAT, STATION_LNG], 15);
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png').addTo(map); // High fidelity modern dark mapping

L.marker([STATION_LAT, STATION_LNG]).addTo(map)
    .bindPopup("<b style='color:#000;'>Facility Alpha</b><br><span style='color:#333;'>Main Processing Node</span>")
    .openPopup();

function createModernChart(ctxId, label, lineColor) {
    const ctx = document.getElementById(ctxId).getContext('2d');
    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: label,
                data: [],
                borderColor: lineColor,
                borderWidth: 2,
                backgroundColor: lineColor + '08',
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { ticks: { color: '#6b7280', font: { family: 'Plus Jakarta Sans' } }, grid: { display: false } },
                y: { ticks: { color: '#6b7280', font: { family: 'Plus Jakarta Sans' } }, grid: { color: 'rgba(255,255,255,0.03)' } }
            }
        }
    });
}

const charts = {
    temperature: createModernChart('temperatureChart', 'Temperature (°C)', '#ff5b24'),
    humidity: createModernChart('humidityChart', 'Humidity (%)', '#00b0ff'),
    air_quality_raw: createModernChart('gasChart', 'Air Quality (Raw)', '#10b981'),
    light_level: createModernChart('lightChart', 'Light Level (%)', '#fbc02d')
};

// ==========================================
// 3. TELEMETRY SYNCHRONIZATION PIPELINE
// ==========================================
// Point precisely to the custom node created by your gateway.py file!
const TARGET_NODE = "Telemetry"; 

function startLiveTelemetryStreaming() {
    const telemetryRef = query(ref(db, TARGET_NODE), limitToLast(24));

    onValue(telemetryRef, (snapshot) => {
        const payload = snapshot.val();
        if (payload) {
            document.getElementById('status').innerText = "Live Operations Streaming Active";
            document.getElementById('statusPulse').classList.add('active');
            
            const timelineLabels = [];
            const structuralHistory = { temperature: [], humidity: [], air_quality_raw: [], light_level: [] };
            let terminalEntry = null;

            // Loop through entries pushed from Python gateway
            Object.keys(payload).forEach(hashId => {
                terminalEntry = payload[hashId];
                
                // Fallback timestamp formatting
                const eventTime = terminalEntry.timestamp ? new Date(terminalEntry.timestamp).toLocaleTimeString() : new Date().toLocaleTimeString();
                timelineLabels.push(eventTime);
                
                if(terminalEntry.temperature) structuralHistory.temperature.push(parseFloat(terminalEntry.temperature));
                if(terminalEntry.humidity) structuralHistory.humidity.push(parseFloat(terminalEntry.humidity));
                if(terminalEntry.air_quality_raw) structuralHistory.air_quality_raw.push(terminalEntry.air_quality_raw);
                if(terminalEntry.light_level) structuralHistory.light_level.push(terminalEntry.light_level);
            });

            // Refresh Client Visual Interface Elements
            if (terminalEntry) {
const zoneNameEl = document.getElementById('uiZoneName');
                if (zoneNameEl) {
                    zoneNameEl.innerText = terminalEntry.zona_id || "Unassigned Zone";
                }

                // Grab HTML Elements
                const tempEl = document.getElementById('temperature');
                const humEl = document.getElementById('humidity');
                const gasEl = document.getElementById('air_quality');
                const rainEl = document.getElementById('rain');
                const alertBanner = document.getElementById('alertBanner');
                const alertText = document.getElementById('alertText');

                // 1. Update Values
                tempEl.innerText = terminalEntry.temperature || "N/A";
                humEl.innerText = terminalEntry.humidity || "N/A";
                gasEl.innerText = terminalEntry.air_quality_raw || "--";
                document.getElementById('light').innerText = terminalEntry.light_level ? Math.round(terminalEntry.light_level) : "--";
                rainEl.innerText = terminalEntry.rain_status || "Unknown";

                // 2. TRAFFIC LIGHT LOGIC (Semáforo)
                // Clear old classes
                tempEl.className = humEl.className = gasEl.className = rainEl.className = "";
                let isCritical = false;
                let criticalMessage = "";

                // Temperature Logic (Example: >28 is Red, <22 is Yellow, else Green)
                let t = parseFloat(terminalEntry.temperature);
                if (t >= 28) { tempEl.classList.add("status-danger"); }
                else if (t <= 20) { tempEl.classList.add("status-warning"); }
                else { tempEl.classList.add("status-safe"); }

                // Air Quality Logic (Raw Gas > 800 is Red)
                let g = parseInt(terminalEntry.air_quality_raw);
                if (g > 400) { 
                    gasEl.classList.add("status-danger"); 
                    isCritical = true;
                    criticalMessage = "HIGH GAS/SMOKE LEVELS DETECTED!";
                }
                else if (g > 600) { gasEl.classList.add("status-warning"); }
                else { gasEl.classList.add("status-safe"); }

                // Rain/Water Leak Logic
                if (terminalEntry.rain_status === "Raining") {
                    rainEl.classList.add("status-danger");
                    isCritical = true;
                    criticalMessage = "WATER LEAK DETECTED!";
                } else {
                    rainEl.classList.add("status-safe");
                }

                // 3. WEB NOTIFICATION SYSTEM
                if (alertBanner && alertText) {
                    if (isCritical) {
                        alertText.innerText = criticalMessage;
                        alertBanner.classList.add("show");
                    } else {
                        alertBanner.classList.remove("show");
                    }
                }
            }

            // Sync structural records to graph configurations
            Object.keys(charts).forEach(metricKey => {
                if(structuralHistory[metricKey].length > 0) {
                    charts[metricKey].data.labels = timelineLabels.slice(-structuralHistory[metricKey].length);
                    charts[metricKey].data.datasets[0].data = structuralHistory[metricKey];
                    charts[metricKey].update();
                }
            });
        } else {
            document.getElementById('status').innerText = "Telemetry Node Null. Awaiting Data Transmission.";
            document.getElementById('statusPulse').classList.remove('active');
        }
    });
}

startLiveTelemetryStreaming();

// ==========================================
// 4. AUTOMATED INDUSTRIAL AI EVALUATOR
// ==========================================
document.getElementById('generateAiBtn').addEventListener('click', async () => {
    const rangeSelection = document.getElementById('timeRange').value;
    const infoFeedback = document.getElementById('aiStatus');
    
    infoFeedback.innerText = "Querying historical data blocks and requesting safety diagnostics...";

    const masterRef = ref(db, TARGET_NODE);
    let executionQuery = masterRef;

    if (rangeSelection !== 'all') {
        const rangeBoundaryTimestamp = Date.now() - parseInt(rangeSelection);
        executionQuery = query(masterRef, orderByChild('timestamp'), startAt(rangeBoundaryTimestamp));
    }

    try {
        const querySnapshot = await get(executionQuery);
        if (querySnapshot.exists()) {
            const compositeDataset = querySnapshot.val();
            
            const analysisArrays = { temp: [], hum: [], gas: [], light: [] };
            let rainCount = 0;
            let totalRecords = 0;

            Object.values(compositeDataset).forEach(row => {
                totalRecords++;
                if(row.temperature) analysisArrays.temp.push(parseFloat(row.temperature));
                if(row.humidity) analysisArrays.hum.push(parseFloat(row.humidity));
                if(row.air_quality_raw) analysisArrays.gas.push(row.air_quality_raw);
                if(row.light_level) analysisArrays.light.push(row.light_level);
                if(row.rain_status === "Raining") rainCount++;
            });

            if(analysisArrays.temp.length > 0) {
                const averages = {
                    temp: analysisArrays.temp.reduce((s,v)=>s+v,0) / analysisArrays.temp.length,
                    hum: analysisArrays.hum.reduce((s,v)=>s+v,0) / analysisArrays.hum.length,
                    gas: analysisArrays.gas.reduce((s,v)=>s+v,0) / analysisArrays.gas.length,
                    light: analysisArrays.light.reduce((s,v)=>s+v,0) / analysisArrays.light.length,
                    rainPct: (rainCount / totalRecords) * 100
                };
                
                await communicateWithGrokEngine(averages, infoFeedback);
            } else {
                infoFeedback.innerText = "Telemetry records fetched, but entries lacked valid numeric properties.";
            }
        } else {
            infoFeedback.innerText = "No data snapshots found matching chosen timeline window.";
        }
    } catch(err) {
        console.error("Firebase runtime acquisition error:", err);
        infoFeedback.innerText = "Error pulling data. Verify credentials inside code console.";
    }
});

async function communicateWithGrokEngine(metrics, statusElement) {
    const feedbackTableBody = document.getElementById('insightsBody');
    feedbackTableBody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: #ec4899; padding: 30px;">Evaluating workplace parameters through Deep AI Matrix...</td></tr>`;

    // ⚠️ CRITICAL NOTICE: Replace this with your backend routing path if deploying publicly!
    const RUNTIME_TOKEN = "xoxb-YOUR_ACTUAL_GROK_API_KEY_HERE"; 

    const evaluationContextPrompt = `You are an expert workspace safety engineer. Assess this office's metrics:
    - Temperature Average: ${metrics.temp.toFixed(1)}°C
    - Relative Humidity: ${metrics.hum.toFixed(1)}%
    - Air Quality Sensor Value (Raw MQ135): ${metrics.gas.toFixed(0)} (0-4095 scale, where higher means more volatile organic compounds/smoke)
    - Ambient Illumination: ${metrics.light.toFixed(0)}% Light Level
    - External Precipitation Incidence: ${metrics.rainPct.toFixed(0)}% of tracked period caught rain.
    
    Provide concise engineering recommendations based on thermal comfort, air filtration requirements, and visual ergonomics.
    Return ONLY a raw, unquoted JSON object with exactly two string keys: 
    "facility" (2-3 sentences advising on facility management, HVAC adjustments, or mechanical ventilation updates) and 
    "personnel" (2-3 sentences outlining worker safety rules, breaks, visual strain care, or ergonomic instructions). 
    Do not add markdown wrappers or structural content outside this clean JSON structure.`;

    try {
        const serverResponse = await fetch('https://api.x.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${RUNTIME_TOKEN}`
            },
            body: JSON.stringify({
                model: "grok-beta",
                messages: [
                    { role: "system", content: "You are an analytical environmental compliance validation engine." },
                    { role: "user", content: evaluationContextPrompt }
                ],
                temperature: 0.1
            })
        });

        if (!serverResponse.ok) throw new Error(`API Connection Failed: ${serverResponse.status}`);

        const payloadJson = await serverResponse.json();
        const outputContent = payloadJson.choices[0].message.content.trim();
        
        const strictJsonPayloadString = outputContent.replace(/```json/gi, '').replace(/```/g, '');
        const verifiedInsights = JSON.parse(strictJsonPayloadString);

        statusElement.innerText = "Workplace environmental profile successfully cross-referenced.";
        
        feedbackTableBody.innerHTML = `
            <tr>
                <td><b>Infrastructure Systems</b><br><small style="color:#71717a;">HVAC & Lighting Assets</small></td>
                <td>
                    Temp: <strong>${metrics.temp.toFixed(1)}°C</strong><br>
                    Humid: <strong>${metrics.hum.toFixed(1)}%</strong><br>
                    Illumination: <strong>${metrics.light.toFixed(0)}%</strong>
                </td>
                <td>${verifiedInsights.facility}</td>
            </tr>
            <tr>
                <td><b>Occupant Protection</b><br><small style="color:#71717a;">Personnel Standards</small></td>
                <td>
                    Air Quality Index: <strong>${metrics.gas.toFixed(0)} raw</strong><br>
                    Rain Exposure: <strong>${metrics.rainPct.toFixed(0)}%</strong>
                </td>
                <td>${verifiedInsights.personnel}</td>
            </tr>
        `;
    } catch(err) {
        console.error("Grok Engine handshake exception:", err);
        feedbackTableBody.innerHTML = `
            <tr>
                <td colspan="3" style="text-align: center; color: #ef4444; padding: 20px;">
                    Failed to finalize compliance generation. Verify token mapping configs inside web console arrays.
                </td>
            </tr>
        `;
    }
}