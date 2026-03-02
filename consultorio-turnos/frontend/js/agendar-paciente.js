/**
 * agendar-paciente.js: Lógica para la página de agendar citas.
 */
// Cambio 8? - mitzy: proteccion de rutas (redirección si no está autenticado)

const token = localStorage.getItem("token");

if (!token) {
    window.location.href = "../../index.html";
}


document.addEventListener('DOMContentLoaded', async () => {
    const calendarMonthLabel = 'calendar-month-label';
    const calendarContainer = 'calendar-container';
    const horariosContainer = document.getElementById('horarios-container');
    const horariosFechaLabel = document.getElementById('horarios-fecha-label');
    const emptyHorarios = document.getElementById('empty-horarios');
    const btnConfirmar = document.getElementById('btn-confirmar-turno');

    /**
     * Cargar identidad y especialidades PRIMERO
     */
    const identity = JSON.parse(localStorage.getItem('user_identity'));
    if (identity) {
        const userNameElements = document.querySelectorAll('.user-name');
        userNameElements.forEach(el => {
            el.textContent = `${identity.nombre} ${identity.primer_apellido}`;
        });
    }

    // Definir funciones de carga
    async function loadEspecialidades() {
        try {
            const response = await fetch('http://localhost:4000/api/especialidades');
            const especialidades = await response.json();
            const selectEsp = document.getElementById('filter-especialidad');
            if (selectEsp) {
                selectEsp.innerHTML = '<option value="" disabled selected>Selecciona especialidad</option>';
                especialidades.forEach(esp => {
                    const opt = document.createElement('option');
                    opt.value = esp.id;
                    opt.textContent = esp.nombre;
                    selectEsp.appendChild(opt);
                });
            }
        } catch (err) {
            console.error("Error cargando especialidades:", err);
            window.UI.showNotification("Error al conectar con el servidor", "error");
        }
    }

    // ESPERAR a que las especialidades carguen antes de seguir
    await loadEspecialidades();

    let selectedDate = null;
    let selectedSlotId = null;

    // Filtros
    const filterEspecialidad = document.getElementById('filter-especialidad');
    const filterMedico = document.getElementById('filter-medico');

    // Detectar modo reprogramacion
    const urlParams = new URLSearchParams(window.location.search);
    const reprogramarId = urlParams.get('reprogramar');

    if (reprogramarId) {
        window.UI.showNotification("Modo Reprogramación: Selecciona tu nuevo horario", "info");
        document.querySelector('h1').textContent = "Reprogramar Cita";
        // initReprogramacion se llama después de que cal esté listo
    }

    async function initReprogramacion(id) {
        window.UI.toggleSpinner(true);
        try {
            const turno = await window.API.fetchAppointmentById(id);

            // 1. Seleccionar especialidad
            filterEspecialidad.value = turno.especialidad_id;

            // 2. Cargar y seleccionar medico
            await cargarMedicos(turno.especialidad_id);
            filterMedico.value = turno.medico_id;

            // 3. Pre-seleccionar la fecha en el calendario (navega al mes y marca el día)
            const fechaISO = turno.fecha.includes('T') ? turno.fecha.split('T')[0] : turno.fecha;
            cal.selectDate(fechaISO);

            window.UI.showNotification("Datos pre-seleccionados: Modifica lo que necesites", "success");
        } catch (error) {
            console.error(error);
            window.UI.showNotification("Error al cargar datos de la cita", "error");
        } finally {
            window.UI.toggleSpinner(false);
        }
    }

    // Función auxiliar para cargar médicos (refactorizada para ser reusable)
    async function cargarMedicos(especialidadId) {
        filterMedico.disabled = false;
        filterMedico.innerHTML = '<option value="" disabled selected>Cargando...</option>';

        try {
            const response = await fetch(
                `http://localhost:4000/api/medicos?especialidad_id=${especialidadId}`
            );
            const medicos = await response.json();
            filterMedico.innerHTML = '<option value="" disabled selected>Selecciona médico</option>';
            medicos.forEach((m) => {
                const opt = document.createElement('option');
                opt.value = m.id;
                opt.textContent = `Dr. ${m.nombre} ${m.primer_apellido} ${m.segundo_apellido || ''}`.trim();
                filterMedico.appendChild(opt);
            });
        } catch (error) {
            window.UI.showNotification("Error al cargar médicos", "error");
        }
    }

    // Inicializar Calendario
    const cal = new window.Calendario(calendarContainer, calendarMonthLabel, async (fecha) => {
        selectedDate = fecha;
        selectedSlotId = null;
        btnConfirmar.disabled = true;

        const medicoId = filterMedico.value;

        if (!medicoId || filterMedico.value === "") {
            window.UI.showNotification("Por favor, selecciona un médico primero", "info");
            return;
        }

        // Actualizar label de fecha
        const dateObj = new Date(fecha + 'T00:00:00');
        const opciones = { day: 'numeric', month: 'long' };
        horariosFechaLabel.textContent = dateObj.toLocaleDateString('es-ES', opciones);

        // Cargar horarios disponibles para la fecha y médico seleccionado
        window.UI.toggleSpinner(true);
        try {
            const data = await window.API.fetchAvailability(fecha, medicoId);
            renderHorarios(data.horarios_libres);
        } catch (error) {
            window.UI.showNotification("Error al cargar horarios", "error");
        } finally {
            window.UI.toggleSpinner(false);
        }
    });

    cal.init();

    // Si estamos en modo reprogramación, pre-cargar datos AHORA que cal ya existe
    if (reprogramarId) {
        await initReprogramacion(reprogramarId);
    }

    // Navegación de mes
    document.getElementById('calendar-prev').addEventListener('click', () => cal.prevMonth());
    document.getElementById('calendar-next').addEventListener('click', () => cal.nextMonth());

    /**
     * Renderiza los slots de horarios.
     */
    function renderHorarios(horarios) {
        horariosContainer.innerHTML = '';

        if (!horarios || horarios.length === 0) {
            emptyHorarios.classList.remove('oculto');
            return;
        }

        emptyHorarios.classList.add('oculto');

        horarios.forEach(slot => {
            const btn = document.createElement('button');
            btn.className = 'btn btn-secundario glass slot-btn';
            btn.style.minWidth = '100px';
            btn.style.padding = '1rem';
            btn.style.borderRadius = '12px';
            btn.style.fontWeight = '600';
            btn.textContent = slot.hora;
            btn.dataset.id = slot.franja_id;

            btn.addEventListener('click', () => {
                // Desmarcar anteriores
                document.querySelectorAll('.slot-btn').forEach(b => {
                    b.classList.remove('btn-primario');
                    b.classList.add('btn-secundario', 'glass');
                    b.style.color = '';
                    b.style.boxShadow = '';
                });

                // Marcar actual
                btn.classList.remove('btn-secundario', 'glass');
                btn.classList.add('btn-primario');
                btn.style.color = '#000';
                btn.style.boxShadow = '0 0 20px rgba(12, 235, 235, 0.3)';

                selectedSlotId = slot.franja_id;
                btnConfirmar.disabled = false;
            });

            horariosContainer.appendChild(btn);
        });
    }

    // Lógica de confirmación
    btnConfirmar.addEventListener('click', async () => {
        if (!selectedDate || !selectedSlotId) return;

        const medicoId = filterMedico.value;
        const urlParams = new URLSearchParams(window.location.search);
        const reprogramarId = urlParams.get('reprogramar');

        window.UI.toggleSpinner(true);
        try {
            if (reprogramarId) {
                // Flujo de Reprogramación (PATCH)
                await window.API.updateAppointment(reprogramarId, "REPROGRAMADO", {
                    fecha: selectedDate,
                    franja_id: selectedSlotId
                });
                window.UI.showNotification("Cita reprogramada con éxito", "success");
            } else {
                // Flujo Normal (POST)
                const result = await window.API.createAppointment({
                    fecha: selectedDate,
                    franja_id: selectedSlotId,
                    medico_id: medicoId
                });
                window.UI.showNotification(result.message || "Turno reservado correctamente", "success");
            }

            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 2000);
        } catch (error) {
            window.UI.showNotification(error.message || "Error al procesar la cita", "error");
        } finally {
            window.UI.toggleSpinner(false);
        }
    });

    // cambio 11? - mitzy: cargar médicos dinámicamente al seleccionar especialidad
    filterEspecialidad.addEventListener('change', async () => {
        if (!filterEspecialidad.value) return;

        // Resetear seleccion anterior si existe
        selectedSlotId = null;
        btnConfirmar.disabled = true;

        await cargarMedicos(filterEspecialidad.value);
    });

    // Lógica para el botón "Buscar Horarios" (Ajuste Final Auditoría)
    const btnBuscar = document.getElementById('btn-buscar-disponibilidad');
    if (btnBuscar) {
        btnBuscar.addEventListener('click', () => {
            if (!filterEspecialidad.value || !filterMedico.value) {
                window.UI.showNotification("Primero selecciona especialidad y médico", "info");
                return;
            }

            if (!selectedDate) {
                window.UI.showNotification("¡Excelente! Ahora selecciona un día en el calendario", "success");
                // Scroll suave al calendario para guiar al usuario
                document.getElementById('calendar-container')?.scrollIntoView({ behavior: 'smooth' });
            } else {
                // Si ya hay fecha, refrescar
                cal.onDateSelected(selectedDate);
            }
        });
    }

    filterMedico.addEventListener('change', () => {
        if (selectedDate) {
            // Disparar el callback del calendario manualmente para refrescar slots
            cal.onDateSelected(selectedDate);
        }
    });

    // Logout
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            localStorage.removeItem('token');
            localStorage.removeItem('user_identity');
            window.location.href = '../../index.html';
        });
    }
});
