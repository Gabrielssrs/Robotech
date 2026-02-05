// Read query param and update tournament title; placeholder for fetching tournament teams
(function(){
    function getQueryParam(name) {
        const params = new URLSearchParams(window.location.search);
        return params.get(name);
    }

    const id = getQueryParam('id') || 'DESCONOCIDO';
    const titleEl = document.getElementById('tournament-title');
    const subEl = document.getElementById('tournament-sub');

    titleEl.textContent = `Torneo: ${id}`;

    // Placeholder: In a later step we could fetch teams/fixtures from an API
    // and populate the bracket dynamically. For now, we show placeholders.
})();