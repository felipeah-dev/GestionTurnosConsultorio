/** Cambio 1 - Mitzy */
const BASE_URL = "http://localhost:4000/api";

function getAuthHeaders() {
    const token = localStorage.getItem("token");

    return {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
    };
}

/**
 * Cambio 2 - Mitzy: Obtiene la disponibilidad para una fecha y médico específico.
 */
async function fetchAvailability(fecha, medicoId) {

    const response = await fetch(
        `${BASE_URL}/disponibilidad?medico_id=${medicoId}&fecha=${fecha}`,
        {
            method: "GET",
            headers: getAuthHeaders()
        }
    );

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al consultar disponibilidad");
    }

    return response.json();
}

/**
 Cambio 3 - Mitzy: Obtener citas del paciente
 */
async function fetchAppointments() {
    const token = localStorage.getItem("token");

    const response = await fetch(`${BASE_URL}/paciente/turnos`, {
        headers: {
            "Authorization": `Bearer ${token}`
        }
    });

    if (!response.ok) {
        throw new Error("Error al obtener citas");
    }

    return await response.json();
};

/**
 * Cambio 4 - Mitzy: creación de una cita 
 */
async function createAppointment(data) {
    const response = await fetch(`${BASE_URL}/turnos`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(data)
    });

    if (!response.ok) {
        throw new Error("Error al crear cita");
    }

    return response.json();
}

// Exportar funciones
window.API = {
    fetchAvailability,
    fetchAppointments,
    createAppointment
};
