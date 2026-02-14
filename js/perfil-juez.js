document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('jwtToken');
    const API_BASE_URL = 'https://robotech-back.onrender.com/api/v1/juez';

    // --- Elementos del Perfil ---
    const profilePhoto = document.getElementById('profile-photo');
    const profileNombre = document.querySelector('.profile-nombre');
    const profileRole = document.querySelector('.profile-role');
    const profileSpecialty = document.querySelector('.profile-specialty');
    const profileMemberSince = document.querySelector('.profile-member-since');

    // --- Elementos del Modal ---
    const editBtn = document.getElementById('juez-edit-btn');
    const modal = document.getElementById('edit-juez-modal');
    const closeBtn = document.getElementById('close-juez-modal');
    const cancelBtn = document.getElementById('juez-cancel-edit');
    const form = document.getElementById('edit-juez-form');

    // --- Inputs del Formulario ---
    const editNombre = document.getElementById('edit-juez-nombre');
    const editRole = document.getElementById('edit-juez-role');
    const editSpecialty = document.getElementById('edit-juez-specialty');
    const editMember = document.getElementById('edit-juez-member');
    const editFoto = document.getElementById('edit-juez-foto');

    let currentJuezData = null;

    // --- Funciones ---

    function protectPage() {
        if (!token) {
            window.location.href = 'login.html';
            return false;
        }
        return true;
    }

    // CAMBIO: La función ahora formatea la fecha completa.
    function formatDate(dateString) {
        if (!dateString) return 'N/A';
        // Ajuste para la zona horaria: crear la fecha en UTC para evitar desfases.
        const date = new Date(dateString + 'T00:00:00');
        const day = date.getUTCDate();
        const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        const month = monthNames[date.getUTCMonth()];
        const year = date.getUTCFullYear();
        return `${day} de ${month} de ${year}`;
    }

    async function loadProfileData() {
        try {
            const response = await fetch(`${API_BASE_URL}/perfil`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('No se pudo cargar el perfil del juez.');

            currentJuezData = await response.json();
            updateProfileView(currentJuezData);

        } catch (error) {
            console.error('Error:', error);
            alert(error.message);
        }
    }

    function updateProfileView(data) {
        const placeholderUrl = `https://ui-avatars.com/api/?name=${data.nombre.charAt(0)}&size=250&background=random&color=fff&bold=true`;
        profilePhoto.src = data.fotoUrl || placeholderUrl;
        profileNombre.textContent = data.nombre || 'N/A';
        profileRole.textContent = data.nivelCredencial.replace(/_/g, ' ') || 'N/A';
        profileSpecialty.textContent = data.especialidades.join(', ') || 'Ninguna';
        profileMemberSince.textContent = formatDate(data.fechaCreacion);
    }

    function openModal() {
        if (!currentJuezData) return;
        editNombre.value = currentJuezData.nombre;
        editRole.value = currentJuezData.nivelCredencial.replace(/_/g, ' ');
        editSpecialty.value = currentJuezData.especialidades.join(', ');
        
        // CAMBIO: El campo "Miembro desde" ahora muestra la fecha completa y está deshabilitado.
        editMember.value = formatDate(currentJuezData.fechaCreacion);
        editMember.disabled = true;
        editRole.disabled = true;

        modal.style.display = 'block';
    }

    function closeModal() {
        modal.style.display = 'none';
        form.reset();
    }

    async function handleFormSubmit(event) {
        event.preventDefault();

        const details = {
            nombre: editNombre.value,
        };

        const formData = new FormData();
        formData.append('details', new Blob([JSON.stringify(details)], { type: 'application/json' }));
        
        if (editFoto.files[0]) {
            formData.append('foto', editFoto.files[0]);
        }

        try {
            const response = await fetch(`${API_BASE_URL}/perfil`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'No se pudo actualizar el perfil.');
            }

            const updatedData = await response.json();
            currentJuezData = updatedData;
            updateProfileView(updatedData);
            closeModal();
            alert('¡Perfil actualizado con éxito!');

        } catch (error) {
            console.error('Error al actualizar:', error);
            alert(error.message);
        }
    }

    // --- Event Listeners ---
    if (protectPage()) {
        loadProfileData();
        editBtn.addEventListener('click', openModal);
        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);
        window.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
        form.addEventListener('submit', handleFormSubmit);
    }
});
