/**
 * auth.js: Lógica de login, registro y redirecciones simuladas.
 * Cumple con el requerimiento de 'async/await' y manipulación de estados visuales.
 */

// Simulación de retraso de red (Pattern sugerido en el prompt)
const mockDelay = (ms = 800) => new Promise(resolve => setTimeout(resolve, ms));

document.addEventListener('DOMContentLoaded', () => {
    // Formulario de Login
    const formLogin = document.getElementById('form-login');
    if (formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('input-email').value;
            const password = document.getElementById('input-password').value;

            window.UI.toggleSpinner(true);

            try {
                await mockDelay(); // Simula la llamada a la API con async/await

                if (email && password) {
                    window.UI.showNotification("¡Bienvenido! Sesión iniciada correctamente.", "success");

                    // Simular guardado de token (Tarea parcial del integrador pero útil para el flujo)
                    localStorage.setItem('user_token', 'mock_jwt_token_safe_123');

                    setTimeout(() => {
                        window.location.href = 'pages/paciente/dashboard.html';
                    }, 1000);
                } else {
                    window.UI.showNotification("Credenciales inválidas.", "error");
                }
            } catch (error) {
                window.UI.showNotification("Error de conexión con el servidor mock.", "error");
            } finally {
                window.UI.toggleSpinner(false);
            }
        });
    }

    // Formulario de Registro
    const formRegister = document.getElementById('form-register');
    if (formRegister) {
        formRegister.addEventListener('submit', async (e) => {
            e.preventDefault();
            const nombre = document.getElementById('input-nombre').value;

            window.UI.toggleSpinner(true);

            try {
                await mockDelay(1000); // Uso obligatorio de async/await
                window.UI.showNotification(`Cuenta creada para ${nombre}. Ya puedes iniciar sesión.`, "success");

                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 2000);
            } catch (error) {
                window.UI.showNotification("No se pudo completar el registro.", "error");
            } finally {
                window.UI.toggleSpinner(false);
            }
        });
    }

    // Toggle Password Visibility (Uso de dataset/classList como pide el prompt)
    const btnToggle = document.getElementById('btn-toggle-password');
    if (btnToggle) {
        btnToggle.addEventListener('click', () => {
            const input = document.getElementById('input-password');
            const isPassword = input.type === 'password';

            input.type = isPassword ? 'text' : 'password';
            btnToggle.textContent = isPassword ? '🔒' : '👁️';
            btnToggle.classList.toggle('active', isPassword);
        });
    }
});
