/**
 * ui.js: Helpers for UI interactions, notifications, and loading states.
 */

/**
 * Muestra una notificación en el área dedicada.
 * @param {string} mensaje - El texto a mostrar.
 * @param {'success' | 'error' | 'info'} tipo - El tipo de notificación.
 */
function showNotification(mensaje, tipo = 'info') {
    const area = document.getElementById('notification-area');
    if (!area) return;

    // Crear elemento de notificación
    const alert = document.createElement('div');
    alert.className = `alert alert-${tipo} fade-in`;
    alert.innerHTML = `
        <span class="alert-icon">${tipo === 'success' ? '✅' : tipo === 'error' ? '❌' : 'ℹ️'}</span>
        <span class="alert-message">${mensaje}</span>
        <button class="alert-close">&times;</button>
    `;

    // Agregar al área
    area.appendChild(alert);
    area.classList.remove('oculto');

    // Auto-eliminar después de 5 segundos
    const timer = setTimeout(() => {
        alert.classList.add('fade-out');
        alert.addEventListener('animationend', () => {
            alert.remove();
            if (area.children.length === 0) {
                area.classList.add('oculto');
            }
        });
    }, 5000);

    // Botón cerrar manual
    alert.querySelector('.alert-close').addEventListener('click', () => {
        clearTimeout(timer);
        alert.remove();
        if (area.children.length === 0) {
            area.classList.add('oculto');
        }
    });
}

/**
 * Controla la visibilidad del spinner de carga.
 * @param {boolean} show - Si se debe mostrar o no.
 */
function toggleSpinner(show) {
    const spinner = document.getElementById('loading-spinner');
    if (!spinner) return;

    if (show) {
        spinner.classList.remove('oculto');
    } else {
        spinner.classList.add('oculto');
    }
}

// Exportar para uso global (si no se usa módulos type="module", estarán en window)
window.UI = {
    showNotification,
    toggleSpinner
};
