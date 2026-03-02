/**
 * dashboard-paciente.js: Lógica para el panel principal del paciente.
 */

// cambio 9? - mitzy: proteccion de rutas (redirección si no está autenticado)
const token = localStorage.getItem("token");

if (!token) {
    window.location.href = "index.html";
}

document.addEventListener('DOMContentLoaded', async () => {
    const listaCitas = document.getElementById('lista-citas-activas');
    const tablaHistorial = document.getElementById('tabla-historial-body');

    /**
     * Carga y renderiza las citas y el perfil.
     */
    async function initDashboard() {
        // Personalizar saludo con el nombre real si existe
        const identity = JSON.parse(localStorage.getItem('user_identity'));
        if (identity) {
            const userNameElements = document.querySelectorAll('.user-name, #saludo-paciente span');
            userNameElements.forEach(el => {
                el.textContent = `${identity.nombre} ${identity.primer_apellido}`;
            });
        }

        window.UI.toggleSpinner(true);
        try {
            const citas = await window.API.fetchAppointments();

            // Filtrar citas activas (Confirmadas o Reprogramadas)
            const citasActivas = citas.filter(c => ['CONFIRMADO', 'REPROGRAMADO'].includes(c.estado));
            // Filtrar historial (Canceladas o Atendidas)
            const historial = citas.filter(c => ['CANCELADO', 'ATENDIDA'].includes(c.estado));

            renderCitasActivas(citasActivas);
            renderHistorial(historial);
        } catch (error) {
            console.error(error);
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
            // Actualizar contador visual si existe
            const contador = document.querySelector('.mis-citas-activas p');
            if (contador) contador.textContent = "No tienes consultas programadas para esta semana";
            return;
        }

        // Actualizar contador visual
        const contador = document.querySelector('section h2 + p');
        if (contador) contador.textContent = `Tienes ${citas.length} ${citas.length === 1 ? 'consulta programada' : 'consultas programadas'} para esta semana`;

        citas.forEach(cita => {
            const card = document.createElement('div');
            card.className = 'card card-cita glass';
            card.dataset.id = cita.turno_id;
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
                        Dr. ${cita.nombre} ${cita.primer_apellido} ${cita.segundo_apellido || ''}
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

            // Confirmación de cancelación mejorada
            card.querySelector('.btn-cancelar').addEventListener('click', async () => {
                if (!confirm(`¿Estás seguro de cancelar tu cita con el Dr. ${cita.nombre} ${cita.primer_apellido}?`)) return;

                try {
                    window.UI.toggleSpinner(true);
                    await window.API.updateAppointment(cita.turno_id, "CANCELADO");
                    window.UI.showNotification("Cita cancelada. Ahora puedes verla en tu historial.", "success");
                    initDashboard();
                } catch (error) {
                    window.UI.showNotification(error.message, "error");
                } finally {
                    window.UI.toggleSpinner(false);
                }
            });

            // Reprogramar cita
            card.querySelector('.btn-reprogramar').addEventListener('click', () => {
                window.location.href = `agendar.html?reprogramar=${cita.turno_id}`;
            });

            listaCitas.appendChild(card);
        });
    }

    function renderHistorial(citas) {
        if (!tablaHistorial) return;
        tablaHistorial.innerHTML = '';

        if (citas.length === 0) {
            tablaHistorial.innerHTML = '<tr><td colspan="4" class="texto-centro">No hay historial disponible.</td></tr>';
            return;
        }

        citas.forEach(cita => {
            const tr = document.createElement('tr');
            const badgeClass = cita.estado === 'CANCELADO' ? 'badge-peligro' : 'badge-completada';

            tr.innerHTML = `
                <td>${formatFecha(cita.fecha)}</td>
                <td>Dr. ${cita.nombre} ${cita.primer_apellido}</td>
                <td>${cita.especialidad}</td>
                <td><span class="badge ${badgeClass}">${cita.estado}</span></td>
            `;
            tablaHistorial.appendChild(tr);
        });
    }

    function formatFecha(fechaStr) {
        // El backend suele devolver la fecha como "YYYY-MM-DD" o "ISOString"
        // Forzamos el parseo tomando solo la parte de la fecha si es necesario
        const isoFecha = fechaStr.includes('T') ? fechaStr.split('T')[0] : fechaStr;
        const fecha = new Date(isoFecha + 'T12:00:00'); // T12:00:00 evita desfases por zona horaria
        const opciones = { day: 'numeric', month: 'short', year: 'numeric' };
        return fecha.toLocaleDateString('es-ES', opciones).replace('.', '');
    }

    initDashboard();
});

// cambio 10? - mitzy: cerrar sesión
document.getElementById("btn-logout")?.addEventListener("click", () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user_identity");
    window.location.href = "../../index.html";
});
