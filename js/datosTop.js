document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const type = params.get('type') || 'robot';
    const name = params.get('name') ? decodeURIComponent(params.get('name')) : 'Perfil';

    // Map type to friendly headings
    const titleEl = document.querySelector('.hero-info h1');
    const badgeEl = document.querySelector('.badge-rank');
    const metaEl = document.querySelector('.hero-info .meta');

    titleEl.textContent = name;

    if (type === 'robot') {
        badgeEl.textContent = '🏆 RANKING MUNDIAL #1';
        metaEl.innerHTML = '<span><i class="fa-solid fa-microchip"></i> Combate 1kg</span><span><i class="fa-solid fa-circle-check"></i> Habilitado para Torneo</span><span><i class="fa-solid fa-flag"></i> Perú</span>';
        // Optionally call loadHistory from datosRobots.js if present
        if (window.loadHistory) window.loadHistory();
    } else if (type === 'club') {
        badgeEl.textContent = '🏆 MEJOR CLUB';
        metaEl.innerHTML = '<span><i class="fa-solid fa-building"></i> Club</span><span><i class="fa-solid fa-people-group"></i> Equipos activos</span>';
        // swap hero image to a club placeholder
        const img = document.querySelector('.robot-img');
        if (img) { img.src = 'https://via.placeholder.com/150?text=Club'; img.alt = name; }
    } else if (type === 'user') {
        badgeEl.textContent = '🏅 COMPETIDOR DESTACADO';
        metaEl.innerHTML = '<span><i class="fa-solid fa-user-tie"></i> Piloto</span><span><i class="fa-solid fa-building"></i> Equipo: Robótica Alfa</span>';
        const img = document.querySelector('.robot-img');
        if (img) { img.src = 'https://i.pravatar.cc/150?img=45'; img.alt = name; }
    }

    // Update page title
    document.title = `${name} — Perfil`;

    // Back link to ranking
    const back = document.querySelector('.back-link');
    if (back) back.href = 'ranking.html';
});