const fileInput = document.getElementById('fileInput');
let chartInstance = null;

fileInput.addEventListener('change', function(e) {
    const reader = new FileReader();
    reader.onload = function() {
        try {
            // 1. Leemos el JSON puramente numérico
            const rawData = JSON.parse(reader.result);
            
            // 2. Mapeamos las posiciones del arreglo a los nombres del Dashboard
            const runnerData = rawData.map(d => ({
                step: d[0],
                tm: d[1],
                dist: d[2],
                vel_i: d[3],
                vel_m: d[4],
                top: d[5]
            }));

            // 3. Enviamos los datos procesados
            processAndDisplay(runnerData);
            
        } catch(err) {
            alert("Error: El formato del JSON no es válido.");
            console.error(err);
        }
    };
    reader.readAsText(e.target.files[0]);
});

// Función para convertir segundos a formato MM:SS
function secondsToMMSS(totalSeconds) {
    const mins = Math.floor(totalSeconds / 60);
    const secs = Math.floor(totalSeconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Función para calcular el Ritmo (min/km)
function calculatePace(distanceMeters, timeSeconds) {
    if (distanceMeters === 0) return "00:00";
    const distanceKm = distanceMeters / 1000;
    const minutes = timeSeconds / 60;
    const paceDecimal = minutes / distanceKm; // minutos por kilometro
    return secondsToMMSS(paceDecimal * 60);
}

function processAndDisplay(data) {
    // Obtenemos el último registro para los totales
    const lastEntry = data[data.length - 1];

    // --- 1. LÓGICA DE DISTANCIA (M vs KM) ---
    // Primero calculamos qué vamos a mostrar
    let distanciaHTML = "";
    if (lastEntry.dist >= 1000) {
        let distanciaKm = lastEntry.dist / 1000;
        distanciaHTML = `${distanciaKm.toFixed(2)} <small>km</small>`;
    } else {
        distanciaHTML = `${lastEntry.dist.toFixed(2)} <small>m</small>`;
    }

    // --- 2. ACTUALIZAR TARJETAS EN EL DOM ---
    document.getElementById('val-dist').innerHTML = distanciaHTML;
    document.getElementById('val-steps').innerText = lastEntry.step;
    document.getElementById('val-top').innerHTML = `${lastEntry.top.toFixed(1)} <small>km/h</small>`;
    document.getElementById('val-avg').innerHTML = `${lastEntry.vel_m.toFixed(1)} <small>km/h</small>`;
    
    // Tiempo y Ritmo
    document.getElementById('val-time').innerText = secondsToMMSS(lastEntry.tm);
    document.getElementById('val-pace').innerHTML = `${calculatePace(lastEntry.dist, lastEntry.tm)} <small>min/km</small>`;

    // --- 3. CONFIGURAR GRÁFICA ---
    const ctx = document.getElementById('performanceChart').getContext('2d');
    
    // Destruir la instancia anterior si existe para que no se superpongan
    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(d => secondsToMMSS(d.tm)), 
            datasets: [{
                label: 'Velocidad Instantánea',
                data: data.map(d => d.vel_i),
                borderColor: '#00ffa3',
                backgroundColor: 'rgba(0, 255, 163, 0.1)',
                borderWidth: 1.5,      
                fill: true,
                tension: 0.4,          
                pointRadius: 0,        
                pointHoverRadius: 5,   
                pointBackgroundColor: '#ffffff', 
                pointBorderColor: '#00ffa3',
                pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index', 
                intersect: false,
            },
            scales: {
                x: {
                    title: { display: true, text: 'Tiempo de Carrera (MM:SS)', color: '#94a3b8' },
                    grid: { display: false },
                    ticks: { 
                        color: '#94a3b8',
                        maxTicksLimit: 10, 
                        maxRotation: 0     
                    }
                },
                y: {
                    title: { display: true, text: 'Velocidad (km/h)', color: '#94a3b8' },
                    grid: { color: '#1e293b' }, 
                    ticks: { color: '#94a3b8' },
                    beginAtZero: true
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: { 
                    backgroundColor: 'rgba(10, 17, 40, 0.9)',
                    titleColor: '#94a3b8',
                    bodyColor: '#ffffff',
                    borderColor: '#1e293b',
                    borderWidth: 1,
                    displayColors: false
                }
            }
        }
    });
}
