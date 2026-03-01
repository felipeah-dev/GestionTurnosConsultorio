/**
 * agendar-paciente.js: Lógica para la página de agendar citas.
 */

document.addEventListener('DOMContentLoaded', () => {
    const calendarMonthLabel = 'calendar-month-label';
    const calendarContainer = 'calendar-container';
    const horariosContainer = document.getElementById('horarios-container');
    const horariosFechaLabel = document.getElementById('horarios-fecha-label');
    const emptyHorarios = document.getElementById('empty-horarios');
    const btnConfirmar = document.getElementById('btn-confirmar-turno');

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

        const medicoNombre = filterMedico.options[filterMedico.selectedIndex]?.text;

        if (!medicoNombre || filterMedico.value === "") {
            window.UI.showNotification("Por favor, selecciona un médico primero", "info");
            return;
        }

        // Actualizar label de fecha
        const dateObj = new Date(fecha + 'T00:00:00');
        const opciones = { day: 'numeric', month: 'long' };
        horariosFechaLabel.textContent = dateObj.toLocaleDateString('es-ES', opciones);

        // Cargar horarios desde la API simulada
        window.UI.toggleSpinner(true);
        try {
            const data = await window.API.fetchAvailability(fecha, medicoNombre);
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

        const medicoNombre = filterMedico.options[filterMedico.selectedIndex].text;
        const especialidadNombre = filterEspecialidad.options[filterEspecialidad.selectedIndex].text;
        const horaSeleccionada = document.querySelector('.slot-btn.btn-primario').textContent;

        window.UI.toggleSpinner(true);
        try {
            const result = await window.API.createAppointment({
                fecha: selectedDate,
                franja_id: selectedSlotId,
                medico: medicoNombre,
                especialidad: especialidadNombre,
                hora: horaSeleccionada
            });

            if (result.success) {
                window.UI.showNotification(result.message, "success");
                // Redirigir al dashboard tras un breve delay
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 2000);
            }
        } catch (error) {
            window.UI.showNotification("Error al reservar el turno", "error");
        } finally {
            window.UI.toggleSpinner(false);
        }
    });

    // Filtros (Simulados para habilitar médico al elegir especialidad)
    filterEspecialidad.addEventListener('change', () => {
        if (filterEspecialidad.value) {
            filterMedico.disabled = false;
            filterMedico.innerHTML = '<option value="" disabled selected>Selecciona médico</option>';

            // Mock de médicos según especialidad
            const medicos = {
                "1": ["Dr. Roberto Sánchez", "Dr. Luis Martínez"],
                "2": ["Dra. Laura Montes", "Dr. Mario Garcés"],
                "3": ["Dra. Elena Gómez"]
            };

            const lista = medicos[filterEspecialidad.value] || [];
            lista.forEach((nombre, idx) => {
                const opt = document.createElement('option');
                opt.value = idx + 1;
                opt.textContent = nombre;
                filterMedico.appendChild(opt);
            });
        }
    });

    filterMedico.addEventListener('change', () => {
        if (selectedDate) {
            // Disparar el callback del calendario manualmente para refrescar slots
            cal.onDateSelected(selectedDate);
        }
    });
});
