/**
 * agendar-paciente.js: Lógica para la página de agendar citas.
 */
// Cambio 8? - mitzy: proteccion de rutas (redirección si no está autenticado)

  const token = localStorage.getItem("token");

  if (!token) {
    window.location.href = "../../index.html";
  }


document.addEventListener('DOMContentLoaded', () => {
    const calendarMonthLabel = 'calendar-month-label';
    const calendarContainer = 'calendar-container';
    const horariosContainer = document.getElementById('horarios-container');
    const horariosFechaLabel = document.getElementById('horarios-fecha-label');
    const emptyHorarios = document.getElementById('empty-horarios');
    const btnConfirmar = document.getElementById('btn-confirmar-turno');

    // Personalizar saludo con el nombre real si existe
    const identity = JSON.parse(localStorage.getItem('user_identity'));
    if (identity) {
        const userNameElements = document.querySelectorAll('.user-name');
        userNameElements.forEach(el => {
            el.textContent = `${identity.nombre} ${identity.primer_apellido}`;
        });
    }

    let selectedDate = null;
    let selectedSlotId = null;

    // Filtros
    const filterEspecialidad = document.getElementById('filter-especialidad');
    const filterMedico = document.getElementById('filter-medico');

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

        const medicoOption = filterMedico.options[filterMedico.selectedIndex];
        const especialidadNombre = filterEspecialidad.options[filterEspecialidad.selectedIndex].text;
        const horaSeleccionada = document.querySelector('.slot-btn.btn-primario').textContent;

        const medicoInfo = JSON.parse(medicoOption.dataset.info);

        window.UI.toggleSpinner(true);
        try {
            const result = await window.API.createAppointment({
                fecha: selectedDate,
                franja_id: selectedSlotId,
                medico_id: filterMedico.value,
                medico_info: medicoInfo,
                especialidad: especialidadNombre,
                hora: horaSeleccionada
            });

            // Cambio 12? - mitzy: Mostrar mensaje de éxito y redirigir al dashboard
            window.UI.showNotification(result.message || "Turno reservado correctamente", "success");

            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 2000);
        } catch (error) {
            window.UI.showNotification("Error al reservar el turno", "error");
        } finally {
            window.UI.toggleSpinner(false);
        }
    });

    // cambio 11? - mitzy: cargar médicos dinámicamente al seleccionar especialidad
    filterEspecialidad.addEventListener('change', async () => {
        if (!filterEspecialidad.value) return;

        filterMedico.disabled = false;
        filterMedico.innerHTML = '<option value="" disabled selected>Cargando...</option>';

        try {
            const response = await fetch(
                `http://localhost:4000/api/medicos?especialidad_id=${filterEspecialidad.value}`
            );

            const medicos = await response.json();

            filterMedico.innerHTML = '<option value="" disabled selected>Selecciona médico</option>';

            medicos.forEach((m) => {
                const opt = document.createElement('option');
                opt.value = m.id;
                opt.textContent = `Dr. ${m.nombre} ${m.primer_apellido} ${m.segundo_apellido || ''}`.trim();
                opt.dataset.info = JSON.stringify(m);
                filterMedico.appendChild(opt);
            });

        } catch (error) {
            window.UI.showNotification("Error al cargar médicos", "error");
        }
    });

    filterMedico.addEventListener('change', () => {
        if (selectedDate) {
            // Disparar el callback del calendario manualmente para refrescar slots
            cal.onDateSelected(selectedDate);
        }
    });
});
