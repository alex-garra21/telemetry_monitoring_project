const fileInput = document.getElementById('fileInput');
let chartInstance = null;

fileInput.addEventListener('change', function(e) {
    const reader = new FileReader();
    reader.onload = function() {
        try {
            // 1. Leemos el JSON puramente numérico (ej. [ [1, 4.63...], [2, 5.77...] ])
            const rawData = JSON.parse(reader.result);
            
            // 2. Mapeamos (traducimos) las posiciones del arreglo a los nombres de tu Dashboard
            const runnerData = rawData.map(d => ({
                step: d[0],
                tm: d[1],
                dist: d[2],
                vel_i: d[3],
                vel_m: d[4],
                top: d[5]
            }));

            // 3. Enviamos los datos procesados a tu función
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
    const lastEntry = data[data.length - 1];

    // 1. Actualizar Tarjetas
    document.getElementById('val-dist').innerHTML = `${lastEntry.dist.toFixed(2)} <small>m</small>`;
    document.getElementById('val-steps').innerText = lastEntry.step;
    document.getElementById('val-top').innerHTML = `${lastEntry.top.toFixed(1)} <small>km/h</small>`;
    document.getElementById('val-avg').innerHTML = `${lastEntry.vel_m.toFixed(1)} <small>km/h</small>`;
    
    // Tiempo y Ritmo
    document.getElementById('val-time').innerText = secondsToMMSS(lastEntry.tm);
    document.getElementById('val-pace').innerHTML = `${calculatePace(lastEntry.dist, lastEntry.tm)} <small>min/km</small>`;

    // 2. Configurar Gráfica Velocidad vs Tiempo
    const ctx = document.getElementById('performanceChart').getContext('2d');
    
    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(d => secondsToMMSS(d.tm)), // Eje X: Tiempo formateado
            datasets: [{
                label: 'Velocidad Instantánea',
                data: data.map(d => d.vel_i),
                borderColor: '#00ffa3',
                backgroundColor: 'rgba(0, 255, 163, 0.1)',
                borderWidth: 1.5,      // 1. Línea más delgada
                fill: true,
                tension: 0.4,          // 2. Curva más suave
                pointRadius: 0,        // 3. Ocultar los puntos estáticos
                pointHoverRadius: 5,   // 4. Mostrar el punto solo al pasar el mouse
                pointBackgroundColor: '#ffffff', // Color del punto al pasar el mouse
                pointBorderColor: '#00ffa3',
                pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index', // Mejora la interacción con el mouse
                intersect: false,
            },
            scales: {
                x: {
                    title: { display: true, text: 'Tiempo de Carrera (MM:SS)', color: '#94a3b8' },
                    grid: { display: false },
                    ticks: { 
                        color: '#94a3b8',
                        maxTicksLimit: 10, // 5. Evita que el eje X se llene de texto
                        maxRotation: 0     // Mantiene los textos en horizontal
                    }
                },
                y: {
                    title: { display: true, text: 'Velocidad (km/h)', color: '#94a3b8' },
                    grid: { color: '#1e293b' }, // Un gris más oscuro para el fondo
                    ticks: { color: '#94a3b8' },
                    beginAtZero: true
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: { // Mejora visual del cuadro de información al pasar el mouse
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
