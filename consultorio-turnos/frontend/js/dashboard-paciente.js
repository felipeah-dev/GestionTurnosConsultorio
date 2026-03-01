/**
 * dashboard-paciente.js: Lógica para el panel principal del paciente.
 */

document.addEventListener('DOMContentLoaded', async () => {
    const listaCitas = document.getElementById('lista-citas-activas');
    const tablaHistorial = document.getElementById('tabla-historial-body');

    /**
     * Carga y renderiza las citas.
     */
    async function initDashboard() {
        window.UI.toggleSpinner(true);
        try {
            const citas = await window.API.fetchAppointments();
            renderCitasActivas(citas);
            // El historial se mantiene estático en el HTML por ahora, 
            // pero podríamos cargarlo igual si el mock lo tuviera.
        } catch (error) {
            window.UI.showNotification("Error al cargar tus citas", "error");
        } finally {
            window.UI.toggleSpinner(false);
        }
    }

    function renderCitasActivas(citas) {
        if (!listaCitas) return;
        listaCitas.innerHTML = '';

        if (citas.length === 0) {
            listaCitas.innerHTML = '<div class="card glass w-100"><p class="texto-centro">No tienes citas programadas.</p></div>';
            return;
        }

        citas.forEach(cita => {
            const card = document.createElement('div');
            card.className = 'card card-cita glass';
            card.dataset.id = cita.public_id;
            card.style.borderLeft = `5px solid ${cita.estado === 'CONFIRMADO' ? 'var(--color-primary)' : '#FFD700'}`;

            card.innerHTML = `
                <div class="d-flex justify-content-between align-items-start mb-4">
                    <div>
                        <span class="badge ${cita.estado === 'CONFIRMADO' ? 'badge-confirmada' : 'badge-reprogramada'}" 
                            style="font-size: 0.7rem; text-transform: uppercase; font-weight: 800;">${cita.estado}</span>
                    </div>
                    <div class="acciones-cita d-flex gap-2">
                        <button class="btn btn-secundario glass btn-reprogramar" 
                            style="padding: 0.5rem; min-width: 40px; border-radius: 8px;" title="Reprogramar">🔄</button>
                        <button class="btn btn-peligro btn-cancelar" 
                            style="padding: 0.5rem; min-width: 40px; border-radius: 8px;" title="Cancelar">🗑️</button>
                    </div>
                </div>
                <div class="cita-info">
                    <h3 style="font-size: 1.4rem; margin-bottom: 0.4rem; letter-spacing: -0.02em; font-weight: 700;">
                        Dr. ${cita.medico.nombre} ${cita.medico.primer_apellido} ${cita.medico.segundo_apellido || ''}
                    </h3>
                    <p class="texto-primario" style="font-weight: 800; font-size: 0.9rem; margin-bottom: 2rem; text-transform: uppercase; letter-spacing: 1px;">${cita.especialidad}</p>

                    <div class="d-flex gap-4 mt-2 p-3 glass" 
                        style="border-radius: 12px; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1);">
                        <div class="info-item">
                            <span style="display: block; font-size: 0.75rem; font-weight: 800; letter-spacing: 1.5px; color: var(--color-primary); margin-bottom: 6px; text-shadow: 0 0 10px rgba(12, 235, 235, 0.4);">FECHA</span>
                            <span style="font-weight: 700; font-size: 1.1rem; color: #FFFFFF;">${formatFecha(cita.fecha)}</span>
                        </div>
                        <div class="info-item" style="border-left: 1px solid rgba(255,255,255,0.15); padding-left: 1.5rem;">
                            <span style="display: block; font-size: 0.75rem; font-weight: 800; letter-spacing: 1.5px; color: var(--color-primary); margin-bottom: 6px; text-shadow: 0 0 10px rgba(12, 235, 235, 0.4);">HORA</span>
                            <span style="font-weight: 700; font-size: 1.1rem; color: #FFFFFF;">${cita.hora}</span>
                        </div>
                    </div>
                </div>
            `;

            // Agregar eventos a botones
            card.querySelector('.btn-cancelar').addEventListener('click', () => {
                window.UI.showNotification("Solicitud de cancelación enviada", "info");
            });

            listaCitas.appendChild(card);
        });
    }

    function formatFecha(fechaStr) {
        const fecha = new Date(fechaStr + 'T00:00:00');
        const opciones = { day: 'numeric', month: 'short', year: 'numeric' };
        return fecha.toLocaleDateString('es-ES', opciones).replace('.', '');
    }

    initDashboard();
});
