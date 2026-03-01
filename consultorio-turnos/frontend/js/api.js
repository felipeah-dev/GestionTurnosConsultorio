/**
 * api.js: Módulo central de llamadas simuladas (Mock API).
 * Proporciona datos para trabajar sin backend real.
 */

const API_SIMULATION_DELAY = 600; // ms

/**
 * Simula una pausa de red.
 */
const delay = () => new Promise(resolve => setTimeout(resolve, API_SIMULATION_DELAY));

/**
 * Obtiene la disponibilidad para una fecha y médico específico.
 */
async function fetchAvailability(fecha, medicoId) {
    await delay();

    const todosLosHorarios = [
        { "franja_id": 1, "hora": "09:00 AM" },
        { "franja_id": 2, "hora": "10:00 AM" },
        { "franja_id": 3, "hora": "11:30 AM" },
        { "franja_id": 4, "hora": "02:00 PM" },
        { "franja_id": 5, "hora": "03:30 PM" },
        { "franja_id": 6, "hora": "05:00 PM" }
    ];

    const citas = JSON.parse(localStorage.getItem('mis_citas') || '[]');

    // Filtrar por ID de médico para mayor precisión (Sigue siendo mock)
    const horariosOcupados = citas
        .filter(c => c.fecha === fecha && c.medico_id === medicoId)
        .map(c => c.hora);

    const disponibles = todosLosHorarios.filter(h => !horariosOcupados.includes(h.hora));

    return {
        "fecha": fecha,
        "medico_id": medicoId,
        "horarios_libres": disponibles
    };
}

/**
 * Obtiene el listado de citas del paciente con persistencia en localStorage.
 */
async function fetchAppointments() {
    await delay();

    const stored = localStorage.getItem('mis_citas');
    if (stored) {
        return JSON.parse(stored);
    }

    // Datos iniciales con la nueva estructura de nombres
    const iniciales = [
        {
            "public_id": "uuid-123",
            "medico": {
                "nombre": "Alberto",
                "primer_apellido": "García",
                "segundo_apellido": "Mora"
            },
            "especialidad": "Cardiología",
            "fecha": "2026-04-15",
            "hora": "10:00 AM",
            "estado": "CONFIRMADO"
        }
    ];

    localStorage.setItem('mis_citas', JSON.stringify(iniciales));
    return iniciales;
}

/**
 * Simula la creación de una cita y la guarda en localStorage.
 */
async function createAppointment(data) {
    await delay();

    const citas = JSON.parse(localStorage.getItem('mis_citas') || '[]');

    const nuevaCita = {
        public_id: `uuid-${Math.random().toString(36).substr(2, 9)}`,
        medico_id: data.medico_id,
        medico: data.medico_info || { // Objeto con el desglose de nombre
            "nombre": "Dr.",
            "primer_apellido": "Asignado",
            "segundo_apellido": null
        },
        especialidad: data.especialidad || "General",
        fecha: data.fecha,
        hora: data.hora || "09:00 AM",
        estado: "CONFIRMADO"
    };

    citas.push(nuevaCita);
    localStorage.setItem('mis_citas', JSON.stringify(citas));

    return { success: true, message: "Cita agendada correctamente" };
}

// Exportar funciones
window.API = {
    fetchAvailability,
    fetchAppointments,
    createAppointment
};
