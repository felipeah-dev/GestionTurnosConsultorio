/**
 * calendario.js: Generación dinámica del calendario mensual.
 */

class Calendario {
    constructor(containerId, labelId, onDateSelected) {
        this.container = document.getElementById(containerId);
        this.label = document.getElementById(labelId);
        this.onDateSelected = onDateSelected;
        this.currentDate = new Date(); // Fecha actual para referencia
        this.selectedDate = null;
        this.viewDate = new Date(); // Fecha que se está visualizando (mes/año)

        this.meses = [
            "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
            "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
        ];
    }

    init() {
        this.render();
    }

    render() {
        if (!this.container || !this.label) return;

        const year = this.viewDate.getFullYear();
        const month = this.viewDate.getMonth();

        // Actualizar etiqueta de mes/año
        this.label.textContent = `${this.meses[month].toUpperCase()} ${year}`;

        // Limpiar contenedor
        this.container.innerHTML = '';

        // Obtener primer día del mes y total de días
        const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 (Dom) a 6 (Sáb)
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        // Obtener días del mes anterior para rellenar
        const daysInPrevMonth = new Date(year, month, 0).getDate();

        // Rellenar días del mes anterior (opcional, pero mejora el look)
        for (let i = firstDayOfMonth; i > 0; i--) {
            const dayDiv = document.createElement('div');
            dayDiv.className = 'calendar-day glass padding-disabled';
            dayDiv.style.opacity = '0.3';
            dayDiv.style.cursor = 'default';
            dayDiv.textContent = daysInPrevMonth - i + 1;
            this.container.appendChild(dayDiv);
        }

        // Generar días del mes actual
        for (let day = 1; day <= daysInMonth; day++) {
            const dayDiv = document.createElement('div');
            dayDiv.className = 'calendar-day glass';
            dayDiv.textContent = day;

            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

            // Marcar si es hoy
            const todayStr = this.formatDate(new Date());
            if (dateStr === todayStr) {
                dayDiv.classList.add('is-today');
                dayDiv.style.border = '1px solid var(--color-primary)';
            }

            // Marcar si es el seleccionado
            if (this.selectedDate === dateStr) {
                this.setActiveDay(dayDiv);
            }

            // Evento de click
            dayDiv.addEventListener('click', () => {
                this.selectedDate = dateStr;
                this.render(); // Re-render para actualizar estado visual
                if (this.onDateSelected) {
                    this.onDateSelected(dateStr);
                }
            });

            this.container.appendChild(dayDiv);
        }
    }

    setActiveDay(element) {
        element.classList.add('active');
        element.style.background = 'var(--color-primary)';
        element.style.color = '#000';
        element.style.fontWeight = '800';
        element.style.boxShadow = '0 0 25px rgba(12, 235, 235, 0.4)';
        element.style.border = 'none';
    }

    nextMonth() {
        this.viewDate.setMonth(this.viewDate.getMonth() + 1);
        this.render();
    }

    prevMonth() {
        this.viewDate.setMonth(this.viewDate.getMonth() - 1);
        this.render();
    }

    /**
     * Selecciona una fecha programáticamente (para pre-selección al reprogramar)
     * @param {string} dateStr - Fecha en formato YYYY-MM-DD
     */
    selectDate(dateStr) {
        const [year, month, day] = dateStr.split('-').map(Number);
        // Navegar al mes correcto
        this.viewDate = new Date(year, month - 1, 1);
        this.selectedDate = dateStr;
        this.render();
        // Disparar callback para cargar slots de esa fecha
        if (this.onDateSelected) {
            this.onDateSelected(dateStr);
        }
    }

    formatDate(date) {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }
}

// Exportar para uso global
window.Calendario = Calendario;
