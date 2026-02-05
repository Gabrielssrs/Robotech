const API_BASE_URL = 'http://localhost:8080/api';
let currentEncuentro = null;
let scoreBlue = 0;
let scoreRed = 0;
let robotBlueId = null;
let robotRedId = null;

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const encuentroId = urlParams.get('encuentroId');

    if (!encuentroId) {
        alert("No se especificó un encuentro.");
        // window.location.href = 'torneo-juez.html'; // Descomentar en producción
        return;
    }

    loadEncuentroData(encuentroId);

    // Configurar botón de finalizar
    document.querySelector('.btn-finish').addEventListener('click', () => finalizarCombate(encuentroId));
});

async function loadEncuentroData(encuentroId) {
    const token = localStorage.getItem('jwtToken');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/torneos/encuentros/${encuentroId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error("Error al cargar el encuentro");

        currentEncuentro = await response.json();
        renderEncuentro(currentEncuentro);

    } catch (error) {
        console.error(error);
        alert("No se pudo cargar la información del encuentro.");
    }
}

function renderEncuentro(encuentro) {
    // Actualizar nombres y IDs
    const blueSection = document.querySelector('.team.blue');
    const redSection = document.querySelector('.team.red');

    // Robot A (Azul)
    blueSection.querySelector('h2').textContent = encuentro.robotA;
    blueSection.querySelector('p').textContent = "Competidor A"; // Placeholder
    robotBlueId = encuentro.robotAId;

    // Robot B (Rojo)
    redSection.querySelector('h2').textContent = encuentro.robotB;
    redSection.querySelector('p').textContent = "Competidor B"; // Placeholder
    robotRedId = encuentro.robotBId;

    // Título del evento
    document.querySelector('.event-title h3').textContent = `Encuentro #${encuentro.id}`;
    
    // Resetear puntajes visuales
    scoreBlue = 0;
    scoreRed = 0;
    updateScores();
}

function addPoints(team, points) {
    let reason = "";
    if (points === 1) reason = "IMPACTO";
    else if (points === 2) reason = "AGRESIÓN";
    else if (points === 3) reason = "CONTROL";
    else if (points === 5) reason = "DAÑO CRÍTICO";
    else if (points < 0) reason = "FALTA";

    if (team === 'blue') {
        scoreBlue += points;
        if (scoreBlue < 0) scoreBlue = 0; 
        logEvent(currentEncuentro.robotA, points, reason);
    } else {
        scoreRed += points;
        if (scoreRed < 0) scoreRed = 0;
        logEvent(currentEncuentro.robotB, points, reason);
    }
    updateScores();
}

function updateScores() {
    document.getElementById('score-blue').innerText = scoreBlue.toString().padStart(2, '0');
    document.getElementById('score-red').innerText = scoreRed.toString().padStart(2, '0');
}

function logEvent(robotName, points, reason) {
    const log = document.getElementById('event-log');
    const entry = document.createElement('li');
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
    const formattedPoints = (points > 0 ? '+' : '') + points;
    const colorClass = points < 0 ? 'style="color: #ff4b4b;"' : '';

    entry.innerHTML = `<span>${timeStr}</span> ${robotName} - <small>${reason}</small> <strong ${colorClass}>${formattedPoints}</strong>`;
    log.prepend(entry);
}

async function finalizarCombate(encuentroId) {
    if (!confirm("¿Estás seguro de enviar estos resultados finales?")) return;

    const token = localStorage.getItem('jwtToken');
    
    const reqA = fetch(`${API_BASE_URL}/torneos/calificar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ encuentroId: encuentroId, robotId: robotBlueId, puntaje: scoreBlue })
    });

    const reqB = fetch(`${API_BASE_URL}/torneos/calificar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ encuentroId: encuentroId, robotId: robotRedId, puntaje: scoreRed })
    });

    try {
        await Promise.all([reqA, reqB]);
        alert("Calificaciones enviadas correctamente.");
        window.location.href = 'torneo-juez.html';
    } catch (error) {
        console.error("Error enviando calificaciones:", error);
        alert("Hubo un error al enviar las calificaciones.");
    }
}