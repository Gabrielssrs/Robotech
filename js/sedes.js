document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('jwtToken');
  const API_BASE_URL = 'https://robotech-back.onrender.com/api/sedes';

  const swalSuccess = (title, text) => window.Swal ? Swal.fire({ icon: 'success', title, text }) : Promise.resolve(alert(title + (text ? '\n' + text : '')));
  const swalError = (title, text) => window.Swal ? Swal.fire({ icon: 'error', title, text }) : Promise.resolve(alert(title + (text ? '\n' + text : '')));

  const sedesTableBody = document.querySelector('#sedes-table tbody');
  const btnNuevaSede = document.getElementById('btn-nueva-sede');
  const editSedeModal = document.getElementById('edit-sede-modal');
  const editSedeForm = document.getElementById('edit-sede-form');
  
  // Inputs del formulario
  const sedeIdInput = document.getElementById('sede-id');
  const sedeNombreInput = document.getElementById('sede-nombre');
  const sedeDireccionInput = document.getElementById('sede-direccion');
  const sedeCiudadInput = document.getElementById('sede-ciudad'); // Campo Ciudad
  const sedeCapacidadInput = document.getElementById('sede-capacidad');
  const sedeCanchasInput = document.getElementById('sede-canchas');
  const sedeEstadoSelect = document.getElementById('sede-estado');
  const sedeTelefonoInput = document.getElementById('sede-telefono'); // Campo Teléfono
  
  const horariosModal = document.getElementById('sede-horarios-modal');
  const horariosContent = document.getElementById('horarios-content');
  const horariosTitle = document.getElementById('horarios-title');

  let sedesData = [];

  // Función para cargar sedes desde el backend
  async function fetchSedes() {
    try {
      const response = await fetch(API_BASE_URL, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Error al cargar sedes');
      sedesData = await response.json();
      renderSedesTable();
    } catch (error) {
      console.error(error);
      swalError('Error', 'No se pudieron cargar las sedes.');
    }
  }

  // Renderizar la tabla
  function renderSedesTable() {
    if (!sedesTableBody) return;
    sedesTableBody.innerHTML = '';
    sedesData.forEach(sede => {
      const tr = document.createElement('tr');
      // Mapeo de campos según la entidad Sede del backend
      tr.innerHTML = `
        <td>${sede.id}</td>
        <td>${sede.nombre}</td>
        <td>${sede.direccion}</td>
        <td>${sede.ciudad}</td>
        <td>${sede.capacidadTotal}</td> 
        <td>${sede.nroCanchas}</td>
        <td>${sede.estado}</td>
        <td>${sede.telefonoContacto || '-'}</td>
        <td class="actions">
          <button class="btn-secondary btn-edit-sede" data-id="${sede.id}">Editar</button>
          <button class="btn-secondary btn-delete-sede" data-id="${sede.id}" style="background:#d9534f; border:none; color:white;">Eliminar</button>
        </td>
      `;
      sedesTableBody.appendChild(tr);
    });
  }

  // Abrir modal para crear o editar
  function openEditSedeModal(id = null) {
    if (id == null) {
      document.getElementById('edit-sede-title').textContent = 'Crear Nueva Sede';
      sedeIdInput.value = '';
      sedeNombreInput.value = '';
      sedeDireccionInput.value = '';
      if(sedeCiudadInput) sedeCiudadInput.value = '';
      sedeCapacidadInput.value = '';
      sedeCanchasInput.value = '';
      sedeEstadoSelect.value = 'DISPONIBLE';
      if(sedeTelefonoInput) sedeTelefonoInput.value = '';
    } else {
      const sede = sedesData.find(s => s.id === Number(id));
      if (!sede) return swalError('Sede no encontrada', 'La sede seleccionada no existe');
      
      document.getElementById('edit-sede-title').textContent = 'Editar Sede';
      sedeIdInput.value = sede.id;
      sedeNombreInput.value = sede.nombre;
      sedeDireccionInput.value = sede.direccion;
      if(sedeCiudadInput) sedeCiudadInput.value = sede.ciudad;
      sedeCapacidadInput.value = sede.capacidadTotal;
      sedeCanchasInput.value = sede.nroCanchas;
      sedeEstadoSelect.value = sede.estado;
      if(sedeTelefonoInput) sedeTelefonoInput.value = sede.telefonoContacto || '';
    }
    editSedeModal.style.display = 'block';
  }

  function closeEditSedeModal() { editSedeModal.style.display = 'none'; }

  // Función para eliminar sede
  async function deleteSede(id) {
    if (!confirm('¿Estás seguro de eliminar esta sede?')) return;
    try {
      const response = await fetch(`${API_BASE_URL}/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Error al eliminar');
      swalSuccess('Eliminado', 'Sede eliminada correctamente');
      fetchSedes();
    } catch (error) {
      console.error(error);
      swalError('Error', 'No se pudo eliminar la sede.');
    }
  }

  // Eventos delegados de tabla
  sedesTableBody && sedesTableBody.addEventListener('click', (e) => {
    const editBtn = e.target.closest('.btn-edit-sede');
    const deleteBtn = e.target.closest('.btn-delete-sede');
    
    if (editBtn) openEditSedeModal(editBtn.getAttribute('data-id'));
    if (deleteBtn) deleteSede(deleteBtn.getAttribute('data-id'));
  });

  // Botón Nueva Sede
  btnNuevaSede && btnNuevaSede.addEventListener('click', () => openEditSedeModal(null));

  // Submit del formulario (Crear/Editar)
  editSedeForm && editSedeForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const idVal = sedeIdInput.value ? Number(sedeIdInput.value) : null;
    
    // Construir payload coincidiendo con SedeRequest.java
    const payload = {
      nombre: sedeNombreInput.value.trim(),
      direccion: sedeDireccionInput.value.trim(),
      ciudad: sedeCiudadInput ? sedeCiudadInput.value.trim() : '',
      capacidadTotal: Number(sedeCapacidadInput.value) || 0,
      nroCanchas: Number(sedeCanchasInput.value) || 0,
      estado: sedeEstadoSelect.value,
      telefonoContacto: sedeTelefonoInput ? sedeTelefonoInput.value.trim() : null
    };

    if (!payload.nombre || !payload.direccion || !payload.ciudad) {
      return swalError('Datos incompletos', 'Nombre, dirección y ciudad son obligatorios');
    }

    try {
      const method = idVal ? 'PUT' : 'POST';
      const url = idVal ? `${API_BASE_URL}/${idVal}` : API_BASE_URL;
      
      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || 'Error al guardar la sede');
      }

      swalSuccess('Éxito', idVal ? 'Sede actualizada' : 'Sede creada');
      closeEditSedeModal();
      fetchSedes();
    } catch (error) {
      console.error(error);
      swalError('Error', error.message);
    }
  });

  // Botones de cerrar modales
  document.querySelectorAll('[data-close]').forEach(btn => btn.addEventListener('click', (e) => {
    const target = e.target.getAttribute('data-close');
    if (target === 'edit-sede-modal') closeEditSedeModal();
    if (target === 'sede-horarios-modal') horariosModal.style.display = 'none';
  }));

  // Cerrar al hacer clic fuera del modal
  window.addEventListener('click', (event) => {
    if (event.target === editSedeModal) closeEditSedeModal();
    if (event.target === horariosModal) horariosModal.style.display = 'none';
  });

  // Carga inicial
  fetchSedes();
});
