document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = 'http://localhost:8080/api';
    const token = localStorage.getItem('jwtToken');

    const tabs = Array.from(document.querySelectorAll('.stepper-tab'));
    const track = document.querySelector('.steps-track');
    const steps = Array.from(document.querySelectorAll('.step'));
    const prevBtn = document.getElementById('prev-step');
    const nextBtn = document.getElementById('next-step');
    const form = document.getElementById('robot-multiform');
    const submitBtn = document.getElementById('submit-robot');
    const progressFill = document.querySelector('.steps-progress-fill');
    const feedbackEl = document.getElementById('robot-feedback');
    
    // Elementos específicos para validación de categoría
    const categoriaSelect = document.getElementById('r-categoria');
    const lblPeso = document.getElementById('lbl-peso');
    const lblAltura = document.getElementById('lbl-altura');
    const lblAncho = document.getElementById('lbl-ancho');
    const lblVelocidad = document.getElementById('lbl-vel-max');

    let current = 0;
    let categoriasData = [];
    let selectedCategoryLimits = null;

    // --- 1. Protección de ruta ---
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    // --- 2. Cargar Categorías ---
    async function loadCategorias() {
        try {
            const response = await fetch(`${API_BASE_URL}/categorias`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                categoriasData = await response.json();
                categoriasData.forEach(cat => {
                    // Solo mostrar categorías activas
                    if (cat.activa) {
                        const option = document.createElement('option');
                        option.value = cat.id;
                        option.textContent = cat.nombre;
                        categoriaSelect.appendChild(option);
                    }
                });
            }
        } catch (error) {
            console.error("Error cargando categorías:", error);
        }
    }
    loadCategorias();

    // --- 3. Manejo de Selección de Categoría y Límites ---
    categoriaSelect.addEventListener('change', () => {
        const catId = parseInt(categoriaSelect.value);
        const cat = categoriasData.find(c => c.id === catId);
        
        if (cat) {
            selectedCategoryLimits = cat;
            
            // Actualizar Labels con información visual
            updateLabel(lblPeso, "Peso (kg)", cat.pesoMaximoKg);
            updateLabel(lblAltura, "Altura (cm)", cat.altoMaximoCm);
            updateLabel(lblAncho, "Ancho (cm)", cat.anchoMaximoCm);
            updateLabel(lblVelocidad, "Velocidad máxima (km/h)", cat.velocidadMaximaPermitidaKmh);
            
            // Opcional: Establecer atributos max en los inputs para validación nativa
            setInputMax('r-peso', cat.pesoMaximoKg);
            setInputMax('r-altura', cat.altoMaximoCm);
            setInputMax('r-ancho', cat.anchoMaximoCm);
            setInputMax('r-vel-max', cat.velocidadMaximaPermitidaKmh);
        }
    });

    function updateLabel(element, text, limit) {
        if (element && limit) {
            element.innerHTML = `${text} <span style="color: var(--primary-color); font-size: 0.85em;">(Máx: ${limit})</span>`;
        } else if (element) {
            element.textContent = text;
        }
    }

    function setInputMax(inputId, limit) {
        const input = document.getElementById(inputId);
        if (input && limit) {
            input.setAttribute('max', limit);
        } else if (input) {
            input.removeAttribute('max');
        }
    }

    // --- 4. Lógica del Stepper (UI) ---
    function updateUI() {
        tabs.forEach((t, i) => t.classList.toggle('active', i === current));
        const stepPercent = 100 / steps.length;
        
        if (window.matchMedia('(min-width: 721px)').matches) {
            track.style.transform = `translateX(-${current * stepPercent}%)`;
        } else {
            track.style.transform = 'translateX(0)';
            steps.forEach((s, i) => s.style.display = (i === current ? 'block' : 'none'));
        }

        prevBtn.style.display = current === 0 ? 'none' : 'inline-block';
        nextBtn.style.display = current === steps.length - 1 ? 'none' : 'inline-block';
        submitBtn.style.display = current === steps.length - 1 ? 'inline-block' : 'none';

        if (progressFill) {
            const pct = ((current + 1) / steps.length) * 100;
            progressFill.style.width = pct + '%';
        }

        tabs.forEach((t, i) => {
            const num = t.querySelector('.step-num');
            if (!num) return;
            num.classList.toggle('completed', i < current);
        });
    }

    function goToStep(index) {
        if (index < 0 || index >= steps.length) return;
        current = index;
        updateUI();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // --- 5. Validación ---
    function validateCurrentStep() {
        const currentStepEl = steps[current];
        const inputs = Array.from(currentStepEl.querySelectorAll('input, textarea, select'));
        let isValid = true;

        // Validación de campos requeridos
        for (const el of inputs) {
            if (el.hasAttribute('required') && !el.value.trim()) {
                showError(el);
                isValid = false;
            }
        }

        // Validación de límites de categoría (si estamos en el paso correspondiente)
        if (selectedCategoryLimits) {
            // Paso 2: Movilidad (Velocidad)
            if (current === 1) {
                const velInput = document.getElementById('r-vel-max');
                if (velInput && velInput.value && selectedCategoryLimits.velocidadMaximaPermitidaKmh) {
                    if (parseFloat(velInput.value) > selectedCategoryLimits.velocidadMaximaPermitidaKmh) {
                        showError(velInput, `Excede el límite de ${selectedCategoryLimits.velocidadMaximaPermitidaKmh} km/h`);
                        isValid = false;
                    }
                }
            }
            // Paso 3: Características (Peso, Dimensiones)
            if (current === 2) {
                if (!checkLimit('r-peso', selectedCategoryLimits.pesoMaximoKg, 'kg')) isValid = false;
                if (!checkLimit('r-altura', selectedCategoryLimits.altoMaximoCm, 'cm')) isValid = false;
                if (!checkLimit('r-ancho', selectedCategoryLimits.anchoMaximoCm, 'cm')) isValid = false;
            }
        }

        return isValid;
    }

    function checkLimit(inputId, limit, unit) {
        const input = document.getElementById(inputId);
        if (input && input.value && limit) {
            if (parseFloat(input.value) > limit) {
                showError(input, `Máximo permitido: ${limit} ${unit}`);
                return false;
            }
        }
        return true;
    }

    function showError(el, msg) {
        el.focus();
        el.classList.add('input-error');
        if(msg) {
            // Aquí podrías mostrar un mensaje de error más elaborado
            console.warn(msg);
            // Opcional: alert(msg); 
        }
        setTimeout(() => el.classList.remove('input-error'), 2000);
    }

    // --- Event Listeners de Navegación ---
    nextBtn.addEventListener('click', () => {
        if (!validateCurrentStep()) return;
        goToStep(current + 1);
    });

    prevBtn.addEventListener('click', () => goToStep(current - 1));

    // --- 6. Envío del Formulario ---
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!validateCurrentStep()) return;

        // Construir el objeto JSON anidado según RobotRequest.java
        const robotRequest = {
            nombre: document.getElementById('r-nombre').value,
            descripcion: document.getElementById('r-descripcion').value,
            categoriaId: parseInt(document.getElementById('r-categoria').value),
            
            ataque: {
                armaPrincipal: document.getElementById('r-arma1').value,
                armaSecundaria: document.getElementById('r-arma2').value,
                alcance: document.getElementById('r-alcance').value
            },
            
            movilidad: {
                velocidadMaximaKmh: parseFloat(document.getElementById('r-vel-max').value) || 0,
                tipoTraccion: document.getElementById('r-traccion').value,
                agilidad: document.getElementById('r-agilidad').value,
                terrenoIdeal: document.getElementById('r-terreno').value
            },
            
            caracteristicas: {
                materialPrincipal: document.getElementById('r-material').value,
                pesoKg: parseFloat(document.getElementById('r-peso').value) || 0,
                alturaCm: parseFloat(document.getElementById('r-altura').value) || 0,
                anchoCm: parseFloat(document.getElementById('r-ancho').value) || 0,
                fuentePoder: document.getElementById('r-fuente').value,
                blindaje: document.getElementById('r-blindaje').value,
                caracteristicaEspecial: document.getElementById('r-especial').value
            }
        };

        try {
            const response = await fetch(`${API_BASE_URL}/robots`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(robotRequest)
            });

            if (response.ok) {
                if (feedbackEl) {
                    feedbackEl.querySelector('.feedback-text').textContent = 'Robot guardado con éxito.';
                    feedbackEl.classList.remove('error');
                    feedbackEl.classList.add('success');
                    feedbackEl.style.display = 'flex';
                }
                setTimeout(() => {
                    window.location.href = 'perfil_competidor.html';
                }, 1500);
            } else {
                const errorText = await response.text();
                // Intentar parsear si es JSON
                try {
                    const errorJson = JSON.parse(errorText);
                    throw new Error(errorJson.message || errorText);
                } catch(e) {
                    throw new Error(errorText || 'Error al guardar el robot');
                }
            }
        } catch (error) {
            console.error('Error:', error);
            if (feedbackEl) {
                feedbackEl.querySelector('.feedback-text').textContent = 'Error: ' + error.message;
                feedbackEl.classList.add('error');
                feedbackEl.style.display = 'flex';
            }
        }
    });

    // Responsive
    function handleResize() {
        if (window.matchMedia('(max-width: 720px)').matches) {
            steps.forEach((s, i) => s.style.display = i === current ? 'block' : 'none');
            track.style.transform = 'translateX(0)';
        } else {
            steps.forEach(s => s.style.display = 'block');
            const stepPercent = 100 / steps.length;
            track.style.transform = `translateX(-${current * stepPercent}%)`;
        }
    }

    window.addEventListener('resize', handleResize);
    updateUI();
    handleResize();
});
