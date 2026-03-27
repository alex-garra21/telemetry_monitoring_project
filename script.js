const fileInput = document.getElementById('fileInput');
let chartInstance = null;

fileInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            // Limpiamos el JSON por si el Arduino no cerró el corchete final "]"
            let rawData = e.target.result.trim();
            if (!rawData.endsWith(']')) rawData += '\n]';
            
            const data = JSON.parse(rawData);
            actualizarUI(data);
        } catch (error) {
            console.error(error);
            alert("Error: El archivo .JSN está corrupto o incompleto.");
        }
    };
    reader.readAsText(file);
});

function actualizarUI(data) {
    const ultimo = data[data.length - 1];

    // Actualizar las tarjetas con los datos finales
    document.getElementById('val-pasos').innerText = ultimo.step;
    document.getElementById('val-dist').innerText = ultimo.dist.toFixed(2);
    document.getElementById('val-media').innerText = ultimo.vel_m.toFixed(1);
    document.getElementById('val-punta').innerText = ultimo.top.toFixed(1);

    // Configurar la Gráfica
    const ctx = document.getElementById('velocidadChart').getContext('2d');
    
    // Si ya existe una gráfica, la borramos para crear la nueva
    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(d => "Paso " + d.step),
            datasets: [{
                label: 'Velocidad Instantánea (km/h)',
                data: data.map(d => d.vel_i),
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4, // Curva suave como en la captura
                pointRadius: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: '#334155' },
                    ticks: { color: '#94a3b8' }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#94a3b8', maxRotation: 45, minRotation: 45 }
                }
            }
        }
    });
}