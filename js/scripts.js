

document.addEventListener('DOMContentLoaded', () => {
  // Registro Competidor form
  const compForm = document.getElementById('form-competidor');
  if (compForm) {
    const dni = compForm.querySelector('#dni');
    const telefono = compForm.querySelector('#telefono');
    const nombre = compForm.querySelector('#nombre');
    const apellido = compForm.querySelector('#apellido');
    const correo = compForm.querySelector('#correo');
    const password = compForm.querySelector('#password');
    const password2 = compForm.querySelector('#password2');

    const setError = (el, msg) => {
      const e = el.parentElement.querySelector('.error');
      if (e) { e.textContent = msg; e.style.display = 'block'; }
    };
    const clearError = (el) => {
      const e = el.parentElement.querySelector('.error');
      if (e) { e.textContent = ''; e.style.display = 'none'; }
    };

    // simple validators
    const isDigits = (v) => /^[0-9]+$/.test(v);
    const hasUpper = (s) => /[A-Z]/.test(s);
    const hasLower = (s) => /[a-z]/.test(s);
    const hasNumber = (s) => /[0-9]/.test(s);
    const emailOK = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

    // real-time checks
    dni && dni.addEventListener('input', () => {
      if (dni.value.trim() === '') { clearError(dni); return; }
      if (!isDigits(dni.value) || dni.value.trim().length !== 8) setError(dni, 'El DNI debe tener 8 dígitos.');
      else clearError(dni);
    });

    telefono && telefono.addEventListener('input', () => {
      const v = telefono.value.replace(/\s+/g,'');
      if (v === '') { clearError(telefono); return; }
      // allow + country code OR 9-digit local starting with 9
      if (v[0] === '+') {
        const rest = v.slice(1);
        if (!isDigits(rest) || rest.length < 8) setError(telefono, 'Número con código inválido.');
        else clearError(telefono);
      } else {
        if (!isDigits(v) || v.length !== 9) setError(telefono, 'Teléfono debe tener 9 dígitos.');
        else if (v[0] !== '9') setError(telefono, 'Teléfono local debe empezar con 9.');
        else clearError(telefono);
      }
    });

    nombre && nombre.addEventListener('blur', () => {
      const v = nombre.value.trim();
      if (v === '') { setError(nombre,'Campo obligatorio'); return; }
      if (v[0] !== v[0].toUpperCase()) setError(nombre, 'El nombre debe empezar con mayúscula.');
      else clearError(nombre);
    });

    apellido && apellido.addEventListener('blur', () => {
      const v = apellido.value.trim();
      if (v === '') { setError(apellido,'Campo obligatorio'); return; }
      if (v[0] !== v[0].toUpperCase()) setError(apellido, 'El apellido debe empezar con mayúscula.');
      else clearError(apellido);
    });

    correo && correo.addEventListener('blur', () => {
      if (!emailOK(correo.value)) setError(correo,'Correo con formato inválido.');
      else clearError(correo);
    });

    // password checks
    password && password.addEventListener('input', () => {
      const v = password.value;
      let msg = '';
      if (v.length < 8) msg = 'Mínimo 8 caracteres';
      else if (!hasUpper(v) || !hasLower(v) || !hasNumber(v)) msg = 'Debe tener mayúsculas, minúsculas y números';
      // check that password does not contain dni or telefono
      if (dni && dni.value && v.includes(dni.value)) msg = 'La contraseña no puede contener tu DNI';
      if (telefono && telefono.value && telefono.value.trim() !== '' && v.includes(telefono.value)) msg = 'La contraseña no puede contener tu teléfono';
      if (msg) setError(password, msg); else clearError(password);
    });

    compForm.addEventListener('submit', (e) => {
      e.preventDefault();
      // run final checks
      let hasError = false;
      [nombre, apellido, dni, telefono, correo, password, password2].forEach(f => {
        if (!f) return;
        if (f.value.trim() === '') { setError(f,'Campo obligatorio'); hasError = true; }
      });

      if (password.value !== password2.value) {
        setError(password2, 'Las contraseñas no coinciden.'); hasError = true;
      }
      if (document.querySelectorAll('.error').length > 0) {
        // if any error elements visible (with text), block submission
        document.querySelectorAll('.error').forEach(el => { if (el.textContent.trim() !== '') hasError = true; });
      }

      if (hasError) {
        const s = compForm.querySelector('.form-message');
        if (s) { s.textContent = 'Corrige los errores del formulario.'; s.className = 'error'; s.style.display = 'block'; }
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      // simulated success (no backend)
      const s = compForm.querySelector('.form-message');
      if (s) { s.textContent = 'Registro simulado exitoso. El club deberá validar tu cuenta.'; s.className = 'success'; s.style.display = 'block'; }
      // here you could reset form or show modal
    });
  }

  // Registro Club form validations
  const clubForm = document.getElementById('form-club');
  if (clubForm) {
    const cNombre = clubForm.querySelector('#club-nombre');
    const cCorreo = clubForm.querySelector('#club-correo');
    const cTelefono = clubForm.querySelector('#club-tel');
    const cPass = clubForm.querySelector('#club-pass');

    const setError2 = (el,msg) => {
      const e = el.parentElement.querySelector('.error'); if (e){ e.textContent = msg; e.style.display = 'block'; }
    };
    const clearError2 = (el) => {
      const e = el.parentElement.querySelector('.error'); if (e){ e.textContent=''; e.style.display='none'; }
    };

    cCorreo && cCorreo.addEventListener('blur', () => {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cCorreo.value)) setError2(cCorreo,'Correo inválido'); else clearError2(cCorreo);
    });

    cTelefono && cTelefono.addEventListener('input', () => {
      const v = cTelefono.value.replace(/\s+/g,'');
      if (v && (!/^\+?[0-9]+$/.test(v) || v.length < 7)) setError2(cTelefono,'Teléfono inválido'); else clearError2(cTelefono);
    });

    cPass && cPass.addEventListener('input', () => {
      const v = cPass.value;
      if (v.length < 8) setError2(cPass,'Mínimo 8 caracteres'); else clearError2(cPass);
    });

    clubForm.addEventListener('submit', (e) => {
      e.preventDefault();
      let err=false;
      [cNombre,cCorreo,cPass].forEach(f => { if (f && f.value.trim()===''){ setError2(f,'Campo obligatorio'); err=true; }});
      if (err) {
        const s = clubForm.querySelector('.form-message'); if (s){ s.textContent='Corrige los errores.'; s.className='error'; s.style.display='block'; }
        return;
      }
      const s = clubForm.querySelector('.form-message'); if (s){ s.textContent='Registro de club simulado. Espera aprobación del admin.'; s.className='success'; s.style.display='block'; }
    });
  }

  // Login form simple visual
  const loginForm = document.getElementById('form-login');
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const user = loginForm.querySelector('#login-user');
      const pass = loginForm.querySelector('#login-pass');
      const msg = loginForm.querySelector('.form-message');
      if (!user.value.trim() || !pass.value.trim()) {
        msg.textContent = 'Ingresa usuario y contraseña.'; msg.className='error'; msg.style.display='block'; return;
      }
      msg.textContent = 'Login simulado. (Frontend only)'; msg.className='success'; msg.style.display='block';
    });
  }
});
