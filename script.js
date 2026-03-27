const fileInput = document.getElementById('fileInput');
let chartInstance = null;

fileInput.addEventListener('change', function(e) {
    const reader = new FileReader();
    reader.onload = function() {
        try {
            const runnerData = JSON.parse(reader.result);
            processAndDisplay(runnerData);
        } catch(err) {
            alert("Error: El formato del JSON no es válido.");
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
                borderWidth: 3,
                fill: true,
                tension: 0.3,
                pointRadius: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    title: { display: true, text: 'Tiempo de Carrera (MM:SS)', color: '#94a3b8' },
                    grid: { display: false },
                    ticks: { color: '#94a3b8' }
                },
                y: {
                    title: { display: true, text: 'Velocidad (km/h)', color: '#94a3b8' },
                    grid: { color: '#334155' },
                    ticks: { color: '#94a3b8' },
                    beginAtZero: true
                }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}