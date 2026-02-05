const combatHistory = [
    { res: 'KO 1:45', opName: 'Muro de hierro', opImg: 'https://i.pravatar.cc/30?img=1', event: 'Nacional 2025', date: '20 de noviembre', status: 'win' },
    { res: 'Juez 3-0', opName: 'Destructor X', opImg: 'https://i.pravatar.cc/30?img=2', event: 'Nacional 2025', date: '20 de noviembre', status: 'win' },
    { res: 'KO 2:30', opName: 'Viper Bot', opImg: 'https://i.pravatar.cc/30?img=3', event: 'Regional 2025', date: '12 de noviembre', status: 'win' }
];

function loadHistory() {
    const tableBody = document.getElementById('history-body');
    
    combatHistory.forEach(match => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><span class="res-badge">${match.res}</span></td>
            <td>
                <div style="display:flex; align-items:center; gap:10px;">
                    <img src="${match.opImg}" style="border-radius:50%; width:25px;">
                    ${match.opName}
                </div>
            </td>
            <td>${match.event}</td>
            <td>${match.date}</td>
        `;
        tableBody.appendChild(row);
    });
}

document.addEventListener('DOMContentLoaded', loadHistory);