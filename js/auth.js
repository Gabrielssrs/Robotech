document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('jwtToken');
    const userString = localStorage.getItem('user');
    const navList = document.getElementById('nav-links');

    // Determina si la página actual es una página protegida
    // Las páginas protegidas redirigirán al login si no hay sesión.
    const isProtectedPage = document.body.classList.contains('protected-page');

    if (token && userString && navList) {
        // Si hay token y datos de usuario, el usuario ha iniciado sesión.
        const user = JSON.parse(userString);

        // Limpiamos los botones de login/registro si existen
        const loginButton = navList.querySelector('.btn-login');
        const registerButton = navList.querySelector('.btn-register');
        if (loginButton) loginButton.parentElement.remove();
        if (registerButton) registerButton.parentElement.remove();

        // --- Crear y añadir el perfil de usuario ---
        const userProfile = document.createElement('li');
        userProfile.className = 'user-profile';
        userProfile.innerHTML = `
            <a href="#">
                <img src="img/user-icon.svg" alt="User" class="user-icon">
                <span>${user.nombre}</span>
            </a>
        `;

        // --- Crear y añadir el botón de cerrar sesión ---
        const logoutButton = document.createElement('li');
        const logoutLink = document.createElement('a');
        logoutLink.href = '#';
        logoutLink.textContent = 'Cerrar Sesión';
        logoutLink.className = 'btn-logout';
        logoutLink.onclick = () => {
            localStorage.removeItem('jwtToken');
            localStorage.removeItem('user');
            window.location.href = 'index.html';
        };
        logoutButton.appendChild(logoutLink);

        // Añadir los nuevos elementos a la navegación
        navList.appendChild(userProfile);
        navList.appendChild(logoutButton);

    } else {
        // Si no hay token y la página es protegida, redirigir al login.
        if (isProtectedPage) {
            window.location.href = 'login.html';
        }
        // Si es una página pública, no hacemos nada y se mostrarán los botones por defecto.
    }
});