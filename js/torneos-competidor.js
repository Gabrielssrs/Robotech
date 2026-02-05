// js/torneos-competidor.js
const API_BASE = '' ; // set to '' so relative calls work; change if needed
const TORNEOS_API = API_BASE + '/api/torneos';
const ROBOTS_API = API_BASE + '/api/robots/mis-robots';

document.addEventListener('DOMContentLoaded', () => {
  initPage();
});

async function initPage() {
  try {
    const [torneos, robots] = await Promise.all([fetchTorneos(), fetchMyRobots()]);
    window._myRobots = robots || [];
    renderTorneosTable(torneos || []);
  } catch (err) {
    console.error(err);
    renderTorneosTable([]);
  }
}

async function fetchTorneos() {
  try {
    const res = await fetch(TORNEOS_API, { headers: authHeader() });
    if (!res.ok) throw new Error('Error fetching torneos');
    return await res.json();
  } catch (err) {
    console.warn('Falling back to demo torneos data', err);
    return demoTorneos();
  }
}

async function fetchMyRobots() {
  try {
    const res = await fetch(ROBOTS_API, { headers: authHeader() });
    if (!res.ok) throw new Error('Error fetching robots');
    return await res.json();
  } catch (err) {
    console.warn('No robots from API, using demo robots', err);
    return demoRobots();
  }
}

function renderTorneosTable(torneos) {
  const tbody = document.querySelector('#torneos-table tbody');
  tbody.innerHTML = '';
  if (!torneos.length) {
    const tr = document.createElement('tr');
    tr.innerHTML = '<td colspan="7" style="text-align:center; padding:18px; color:#cfcfcf">No hay torneos disponibles</td>';
    tbody.appendChild(tr);
    return;
  }

  torneos.forEach(t => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(t.nombre)}</td>
      <td>${formatDate(t.fechaInicio)}</td>
      <td>${formatDate(t.fechaFin)}</td>
      <td>${escapeHtml(t.categoria || 'General')}</td>
      <td>${escapeHtml(t.estado || (isUpcoming(t.fechaInicio) ? 'Abierto' : 'Cerrado'))}</td>
      <td>${t.inscripcion ? 'Pago' : 'Gratis'}</td>
      <td class="actions">
        <button class="btn-main btn-participar" data-id="${t.id}">Participar</button>
        <button class="btn-secondary btn-detalle" data-id="${t.id}">Reglas y Premio</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // attach handlers
  document.querySelectorAll('.btn-participar').forEach(b => b.addEventListener('click', onParticipar));
  document.querySelectorAll('.btn-detalle').forEach(b => b.addEventListener('click', onDetalle));
}

async function onParticipar(e) {
  const id = e.currentTarget.dataset.id;
  const torneo = await getTorneoById(id);
  const robots = window._myRobots || [];

  if (!robots.length) {
    return Swal.fire({ icon: 'info', title: 'Sin robots', text: 'No tienes robots registrados para participar. Crea uno desde tu perfil.' });
  }

  const optionsHtml = robots.map(r => `<option value="${r.id}">${escapeHtml(r.nombre)} (${escapeHtml(r.modelo || '')})</option>`).join('');

  const { value: robotId } = await Swal.fire({
    title: `Participar en ${torneo.nombre}`,
    html: `
      <p>Selecciona tu robot para inscribirse:</p>
      <select id="swal-robot-select" class="swal2-select" style="width:100%; padding:8px;">
        ${optionsHtml}
      </select>
    `,
    focusConfirm: false,
    showCancelButton: true,
    preConfirm: () => {
      const sel = document.getElementById('swal-robot-select');
      return sel ? sel.value : null;
    }
  });

  if (!robotId) return; // canceled

  // call API to participate
  try {
    const res = await fetch(`${TORNEOS_API}/${id}/inscripciones`, {
      method: 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json' }, authHeader()),
      body: JSON.stringify({ robotId })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'No se pudo inscribir');
    }
    Swal.fire({ icon: 'success', title: 'Inscripción completa', text: 'Te inscribiste correctamente.' });
  } catch (err) {
    console.error(err);
    Swal.fire({ icon: 'error', title: 'Error', text: err.message || 'Error al inscribir' });
  }
}

async function onDetalle(e) {
  const id = e.currentTarget.dataset.id;
  const torneo = await getTorneoById(id);

  Swal.fire({
    title: `${escapeHtml(torneo.nombre)} — Reglas y Premios`,
    html: `
      <p><strong>Reglas:</strong></p>
      <p style="text-align:left">${escapeHtml(torneo.reglas || 'Reglas no disponibles')}</p>
      <p><strong>Premios:</strong></p>
      <p style="text-align:left">${escapeHtml(torneo.premios || 'Premios no definidos')}</p>
    `,
    width: 700
  });
}

async function getTorneoById(id) {
  // try cached or fetch single
  try {
    const res = await fetch(`${TORNEOS_API}/${id}`, { headers: authHeader() });
    if (res.ok) return await res.json();
  } catch (err) { /*ignore*/ }
  // fallback to demo
  const demo = demoTorneos().find(d => String(d.id) === String(id));
  return demo || { id, nombre: 'Torneo', reglas: '', premios: '' };
}

function authHeader() {
  const token = localStorage.getItem('jwtToken');
  return token ? { 'Authorization': 'Bearer ' + token } : {};
}

function formatDate(d) {
  if (!d) return '-';
  try { const dt = new Date(d); return dt.toLocaleDateString(); } catch(e) { return d; }
}

function isUpcoming(fechaInicio) {
  if (!fechaInicio) return true;
  return new Date(fechaInicio) > new Date();
}

function escapeHtml(s) { if (s === null || s === undefined) return ''; return String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

function demoTorneos() {
  return [
    { id: 1, nombre: 'Copa Nacional 2026', fechaInicio: '2026-03-10', fechaFin: '2026-03-12', categoria: 'Junior', estado: 'Abierto', inscripcion: false, reglas: 'No se permite sabotaje. Rondas de 1v1.', premios: 'Trofeo y medallas. 1er: $500' },
    { id: 2, nombre: 'Torneo Regional Centro', fechaInicio: '2026-04-20', fechaFin: '2026-04-21', categoria: 'Senior', estado: 'Abierto', inscripcion: true, reglas: 'Cumplir con medidas de seguridad.', premios: 'Equipos y certificados.' }
  ];
}

function demoRobots() {
  return [
    { id: 'r1', nombre: 'Rayo', modelo: 'RX-1' },
    { id: 'r2', nombre: 'Bulldozer', modelo: 'BD-3' }
  ];
}