/* // js/club-crud.js

// --- CONSTANTES ---
const COMP_STORAGE_KEY = 'robotech_competitors';
const CLUB_DATA_KEY = 'robotech_club_data';
const DEFAULT_CLUB_LOGO = 'https://via.placeholder.com/100x100?text=Logo+Club';

const competitorsTableBody = document.getElementById('competitors-table-body');
const crudCompetitorModal = document.getElementById('crud-competitor-modal');
const competitorForm = document.getElementById('competitor-form');
const competitorIdInput = document.getElementById('competitor-id');
const modalTitle = document.getElementById('competitor-modal-title');
const totalCompetidoresSpan = document.getElementById('total-competidores');

const clubEditModal = document.getElementById('edit-club-info-modal');
const clubEditForm = document.getElementById('club-edit-form');
const clubLogoImg = document.getElementById('club-logo-img');
const clubEditLogoFile = document.getElementById('club-edit-logo-file'); // NUEVO: Input de tipo file

// Datos iniciales limpios con IDs numéricos
const initialCompetitors = [
    { id: 1, nombre: "Luis Pérez", alias: "IronBot", categoria: "Combate", estado: "Activo" },
    { id: 2, nombre: "Ana Torres", alias: "SpeedX", categoria: "Velocidad", estado: "Activo" },
    { id: 3, nombre: "Carlos Vega", alias: "TitanCore", categoria: "Sumo", estado: "Descanso" }
];

// Datos iniciales del club
const initialClubData = {
    name: "RoboTech Warriors",
    city: "Lima - Perú",
    creationDate: "12 de marzo de 2023",
    categories: "Sumo, Velocidad, Combate",
    competitors: 3, 
    points: "2350 pts",
    logoUrl: DEFAULT_CLUB_LOGO
};


// --- FUNCIONES DE UTILIDAD (NUEVO) ---
function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
}
 */

// --- FUNCIONES DE ALMACENAMIENTO ---

function getCompetitors() {
    const competitorsData = localStorage.getItem(COMP_STORAGE_KEY);
    if (!competitorsData) {
        localStorage.setItem(COMP_STORAGE_KEY, JSON.stringify(initialCompetitors));
        return initialCompetitors;
    }
    try {
        const parsedData = JSON.parse(competitorsData);
        if (!Array.isArray(parsedData) || (parsedData.length > 0 && typeof parsedData[0].id !== 'number')) {
             throw new Error("Datos de competidores corruptos.");
        }
        return parsedData;
    } catch (e) {
        console.error("Error al cargar competidores desde localStorage. Reseteando datos.", e);
        localStorage.setItem(COMP_STORAGE_KEY, JSON.stringify(initialCompetitors));
        return initialCompetitors;
    }
}

function saveCompetitors(competitors) {
    localStorage.setItem(COMP_STORAGE_KEY, JSON.stringify(competitors));
    const clubData = getClubData();
    clubData.competitors = competitors.length;
    saveClubData(clubData);
}

function getClubData() {
    const data = localStorage.getItem(CLUB_DATA_KEY);
    if (!data) {
        localStorage.setItem(CLUB_DATA_KEY, JSON.stringify(initialClubData));
        return initialClubData;
    }
    return JSON.parse(data);
}

function saveClubData(data) {
    localStorage.setItem(CLUB_DATA_KEY, JSON.stringify(data));
}

// --- FUNCIONES DE VISTA Y RENDERING ---

function renderClubData() {
    const data = getClubData();
    if (document.getElementById('club-name-value')) {
        document.getElementById('club-name-value').textContent = data.name;
        document.getElementById('club-city-value').textContent = data.city;
        document.getElementById('club-creation-date-value').textContent = data.creationDate;
        document.getElementById('club-categories-value').textContent = data.categories;
        document.getElementById('club-points-value').textContent = data.points;
        totalCompetidoresSpan.textContent = data.competitors;
        clubLogoImg.src = data.logoUrl || DEFAULT_CLUB_LOGO;
    }
}

function renderCompetitors() {
    const competitors = getCompetitors();
    competitorsTableBody.innerHTML = '';

    competitors.forEach(competitor => {
        const row = competitorsTableBody.insertRow();
        row.innerHTML = `
            <td class="table-avatar-cell">
                <img src="https://via.placeholder.com/40?text=A" alt="Foto" class="table-avatar competitor-avatar-table">
            </td>
            <td>${competitor.nombre}</td>
            <td>${competitor.alias}</td>
            <td>${competitor.categoria}</td>
            <td class="status-cell">
                <span class="status ${competitor.estado === 'Activo' ? 'active' : 'inactive'}">
                    ${competitor.estado}
                </span>
            </td>
            <td class="actions">
                <button class="btn-action view-profile" onclick="window.location.href='competitor-profile.html?id=${competitor.id}'">Ver perfil</button>
                <button class="btn-action edit" data-id="${competitor.id}">Editar</button>
                <button class="btn-action delete" data-id="${competitor.id}">Eliminar</button>
            </td>
        `;
    });

    addCompetitorActionListeners();
}

function addCompetitorActionListeners() {
    document.querySelectorAll('.btn-action.edit').forEach(button => {
        button.addEventListener('click', (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            editCompetitor(id);
        });
    });

    document.querySelectorAll('.btn-action.delete').forEach(button => {
        button.addEventListener('click', (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            deleteCompetitor(id);
        });
    });
}


// --- CRUD LÓGICA DE COMPETIDORES ---

function openAddCompetitorModal() {
    modalTitle.textContent = 'Agregar Nuevo Competidor';
    competitorForm.reset();
    competitorIdInput.value = '';
    crudCompetitorModal.style.display = 'block';
}

function closeCompetitorModal() {
    crudCompetitorModal.style.display = 'none';
}

function editCompetitor(id) {
    const competitors = getCompetitors();
    const competitorId = parseInt(id);
    const competitor = competitors.find(c => c.id === competitorId);
    
    if (!competitor) {
        alert('Error: Competidor no encontrado. Intenta recargar la página.');
        return;
    }
    
    modalTitle.textContent = 'Editar Competidor';
    competitorIdInput.value = competitor.id;
    document.getElementById('comp-nombre').value = competitor.nombre;
    document.getElementById('comp-alias').value = competitor.alias;
    document.getElementById('comp-categoria').value = competitor.categoria;
    document.getElementById('comp-estado').value = competitor.estado;
    
    crudCompetitorModal.style.display = 'block';
}

function deleteCompetitor(id) {
    if (!confirm('¿Estás seguro de que deseas eliminar a este competidor?')) return;

    let competitors = getCompetitors();
    const competitorId = parseInt(id);

    const initialLength = competitors.length;
    competitors = competitors.filter(c => c.id !== competitorId);

    if (competitors.length === initialLength) {
         alert('Error: Competidor no encontrado durante la eliminación. Intenta recargar la página.');
         return;
    }
    
    saveCompetitors(competitors);
    renderCompetitors();
}

function handleCompetitorFormSubmit(e) {
    e.preventDefault();

    let competitors = getCompetitors();
    const id = competitorIdInput.value;
    const isEditing = !!id;

    const newCompetitorData = {
        nombre: document.getElementById('comp-nombre').value,
        alias: document.getElementById('comp-alias').value,
        categoria: document.getElementById('comp-categoria').value,
        estado: document.getElementById('comp-estado').value,
    };

    if (isEditing) {
        const competitorId = parseInt(id);
        const index = competitors.findIndex(c => c.id === competitorId);
        if (index > -1) {
            competitors[index] = { ...competitors[index], ...newCompetitorData };
        } else {
             alert('Error: Competidor no encontrado para edición.');
             closeCompetitorModal();
             return;
        }
    } else {
        const newId = competitors.length > 0 
            ? Math.max(...competitors.map(c => Number(c.id))) + 1 
            : 1;

        competitors.push({ id: newId, ...newCompetitorData });
    }

    saveCompetitors(competitors);
    renderCompetitors();
    closeCompetitorModal();
}

// --- LÓGICA DEL CLUB INFO EDIT (Modal 2) ---

function openEditClubInfoModal() {
    const data = getClubData();
    document.getElementById('club-edit-name').value = data.name;
    document.getElementById('club-edit-city').value = data.city;
    document.getElementById('club-edit-categories').value = data.categories;
    document.getElementById('club-edit-points').value = parseInt(data.points);
    clubEditLogoFile.value = ''; // NUEVO: Limpiar el input de archivo al abrir
    clubEditModal.style.display = 'block';
}

function closeClubInfoModal() {
    clubEditModal.style.display = 'none';
}

async function handleClubEditFormSubmit(e) { // NUEVO: `async` para usar await
    e.preventDefault();
    const currentData = getClubData();
    
    currentData.name = document.getElementById('club-edit-name').value;
    currentData.city = document.getElementById('club-edit-city').value;
    currentData.categories = document.getElementById('club-edit-categories').value;
    currentData.points = document.getElementById('club-edit-points').value + ' pts';
    
    // NUEVO: Manejar la carga de archivos
    const file = clubEditLogoFile.files[0];
    if (file) {
        try {
            currentData.logoUrl = await readFileAsBase64(file);
        } catch (error) {
            console.error("Error al leer el archivo:", error);
            alert("No se pudo cargar la imagen. Inténtalo de nuevo.");
            return;
        }
    } else {
        // Si no se selecciona un archivo, se mantiene la URL existente o el valor por defecto
        currentData.logoUrl = currentData.logoUrl || DEFAULT_CLUB_LOGO;
    }

    saveClubData(currentData);
    renderClubData();
    closeClubInfoModal();
}

// --- LISTENERS DE EVENTOS ---

document.addEventListener('DOMContentLoaded', () => {
    renderClubData();
    renderCompetitors(); 

    document.getElementById('open-add-competitor-modal').addEventListener('click', openAddCompetitorModal);
    document.querySelector('.competitor-close-btn').addEventListener('click', closeCompetitorModal);
    competitorForm.addEventListener('submit', handleCompetitorFormSubmit);
    
    document.querySelector('.edit-club-btn').addEventListener('click', openEditClubInfoModal);
    document.querySelector('.club-info-close-btn').addEventListener('click', closeClubInfoModal);
    clubEditForm.addEventListener('submit', handleClubEditFormSubmit);

    window.addEventListener('click', (e) => {
        if (e.target === crudCompetitorModal) {
            closeCompetitorModal();
        }
        if (e.target === clubEditModal) {
            closeClubInfoModal();
        }
    });
});