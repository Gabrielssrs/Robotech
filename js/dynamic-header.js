/**
 * Dynamic Header Management
 * Actualiza el header en páginas públicas basado en el rol del usuario autenticado
 * Soporta roles: admin, competidor, club
 */

document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('jwtToken');
    const userString = localStorage.getItem('user');
    const rolString = localStorage.getItem('rol');

    // Si no hay sesión, no hacer nada (se usa el header por defecto)
    if (!token || !userString) {
        console.log('Sin sesión activa - usando header público');
        return;
    }

    try {
        const user = JSON.parse(userString);
        const rol = rolString ? rolString.toLowerCase() : '';

        console.log('Usuario autenticado:', { nombre: user.nombre, rol });

        // Obtener el header actual
        const header = document.querySelector('header.header');
        if (!header) {
            console.warn('Header no encontrado en la página');
            return;
        }

        // Actualizar el header según el rol
        if (rol === 'admin') {
            updateHeaderForAdmin(header, user);
        } else if (rol === 'competidor') {
            updateHeaderForCompetidor(header, user);
        } else if (rol === 'club') {
            updateHeaderForClub(header, user);
        } else {
            console.warn('Rol desconocido:', rol);
        }
    } catch (error) {
        console.error('Error al procesar datos de sesión:', error);
    }
});

/**
 * Actualiza el header para usuarios administradores
 */
function updateHeaderForAdmin(header, user) {
    console.log('Actualizando header para ADMIN');
    
    const logo = header.querySelector('.logo');
    const navList = header.querySelector('nav ul');

    if (logo) {
        logo.textContent = 'ROBOTech Admin';
    }

    if (navList) {
        // Limpiar nav actual
        navList.innerHTML = '';

        // Agregar elementos del header de admin
        const adminLabel = document.createElement('li');
        adminLabel.className = 'active';
        adminLabel.textContent = 'PERFIL ADMINISTRADOR';

        const logoutLi = document.createElement('li');
        const logoutLink = document.createElement('a');
        logoutLink.href = '#';
        logoutLink.className = 'btn-logout';
        logoutLink.textContent = 'Cerrar Sesión';
        logoutLink.onclick = (e) => {
            e.preventDefault();
            logout();
        };
        logoutLi.appendChild(logoutLink);

        navList.appendChild(adminLabel);
        navList.appendChild(logoutLi);
    }

    // Agregar clase al header si es necesaria
    header.classList.add('admin-header');
}

/**
 * Actualiza el header para usuarios competidores
 */
function updateHeaderForCompetidor(header, user) {
    console.log('Actualizando header para COMPETIDOR');
    
    const logo = header.querySelector('.logo');
    const navList = header.querySelector('nav ul');

    if (logo) {
        logo.textContent = 'ROBOTech';
    }

    if (navList) {
        // Limpiar nav actual manteniendo estructura básica
        navList.innerHTML = '';

        // Crear estructura de navegación para competidor
        const items = [
            { href: 'index.html', text: 'Inicio' },
            { href: 'torneo.html', text: 'Torneos' },
            { href: 'ranking.html', text: 'Ranking' }
        ];

        items.forEach(item => {
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.href = item.href;
            a.textContent = item.text;
            // Marcar como activa si es la página actual
            if (getCurrentPageName() === item.href.split('.')[0]) {
                a.classList.add('active');
            }
            li.appendChild(a);
            navList.appendChild(li);
        });

        // Nombre del competidor
        const profileNameLi = document.createElement('li');
        profileNameLi.className = 'nav-profile-name';
        profileNameLi.textContent = user.nombre || user.alias || 'Competidor';
        navList.appendChild(profileNameLi);

        // Botón de cerrar sesión
        const logoutLi = document.createElement('li');
        const logoutLink = document.createElement('a');
        logoutLink.href = '#';
        logoutLink.className = 'btn-logout';
        logoutLink.textContent = 'Cerrar Sesión';
        logoutLink.onclick = (e) => {
            e.preventDefault();
            logout();
        };
        logoutLi.appendChild(logoutLink);
        navList.appendChild(logoutLi);
    }
}

/**
 * Actualiza el header para usuarios de club
 */
function updateHeaderForClub(header, user) {
    console.log('Actualizando header para CLUB');
    
    const logo = header.querySelector('.logo');
    const navList = header.querySelector('nav ul');

    if (logo) {
        // Mostrar el nombre del club en el logo
        logo.textContent = user.nombreClub || user.nombre || 'ROBOTech Club';
    }

    if (navList) {
        // Limpiar nav actual
        navList.innerHTML = '';

        // Crear estructura de navegación para club
        const items = [
            { href: 'index.html', text: 'Inicio' },
            { href: 'torneo.html', text: 'Torneos' },
            { href: 'noticias.html', text: 'Noticias' },
            { href: 'ranking.html', text: 'Ranking' },
            { href: 'perfil_club.html', text: 'Perfil del Club' }
        ];

        items.forEach(item => {
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.href = item.href;
            a.textContent = item.text;
            // Marcar como activa si es la página actual
            if (getCurrentPageName() === item.href.split('.')[0]) {
                li.className = 'active';
                a.classList.add('active');
            }
            li.appendChild(a);
            navList.appendChild(li);
        });

        // Botón de cerrar sesión
        const logoutLi = document.createElement('li');
        const logoutLink = document.createElement('a');
        logoutLink.href = '#';
        logoutLink.className = 'btn-logout';
        logoutLink.textContent = 'Cerrar Sesión';
        logoutLink.onclick = (e) => {
            e.preventDefault();
            logout();
        };
        logoutLi.appendChild(logoutLink);
        navList.appendChild(logoutLi);
    }
}

/**
 * Obtiene el nombre de la página actual sin extensión
 */
function getCurrentPageName() {
    const path = window.location.pathname;
    const filename = path.split('/').pop();
    return filename.split('.')[0];
}

/**
 * Función para cerrar sesión
 */
function logout() {
    console.log('Cerrando sesión...');
    localStorage.removeItem('jwtToken');
    localStorage.removeItem('user');
    localStorage.removeItem('rol');
    window.location.href = 'index.html';
}
