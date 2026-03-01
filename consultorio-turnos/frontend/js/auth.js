/**
 * auth.js: Lógica de login, registro y validaciones dinámicas.
 * Cumple con: Manipulación avanzada del DOM, Validaciones dinámicas y Manejo de estados visuales.
 */

const mockDelay = (ms = 800) => new Promise(resolve => setTimeout(resolve, ms));

document.addEventListener('DOMContentLoaded', () => {
    // === FORMULARIO DE LOGIN ===
    const formLogin = document.getElementById('form-login');
    if (formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('input-email').value;
            const password = document.getElementById('input-password').value;

            window.UI.toggleSpinner(true);

            try {
                await mockDelay();
                if (email && password) {
                    window.UI.showNotification("¡Bienvenido! Sesión iniciada correctamente.", "success");
                    localStorage.setItem('user_token', 'mock_jwt_token_123');
                    setTimeout(() => window.location.href = 'pages/paciente/dashboard.html', 1000);
                } else {
                    window.UI.showNotification("Credenciales inválidas.", "error");
                }
            } catch (error) {
                window.UI.showNotification("Error en el servidor mock", "error");
            } finally {
                window.UI.toggleSpinner(false);
            }
        });
    }

    // === FORMULARIO DE REGISTRO CON VALIDACIONES DINÁMICAS ===
    const formRegister = document.getElementById('form-register');
    if (formRegister) {
        const inputPass = document.getElementById('input-password');
        const inputConfirm = document.getElementById('input-confirm-password');
        const errorConfirm = document.getElementById('error-confirm-password');

        // Validación dinámica de coincidencia de contraseñas al escribir
        const validatePasswords = () => {
            if (inputConfirm.value && inputPass.value !== inputConfirm.value) {
                errorConfirm.classList.remove('oculto');
                inputConfirm.style.borderColor = 'var(--color-peligro)';
                return false;
            } else {
                errorConfirm.classList.add('oculto');
                inputConfirm.style.borderColor = '';
                return true;
            }
        };

        inputConfirm.addEventListener('input', validatePasswords);
        inputPass.addEventListener('input', validatePasswords);

        formRegister.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Validar todo antes de enviar
            const isPasswordsMatch = validatePasswords();
            const email = document.getElementById('input-email').value;
            const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

            if (!isPasswordsMatch) {
                window.UI.showNotification("Las contraseñas no coinciden", "error");
                return;
            }

            if (!isEmailValid) {
                document.getElementById('error-email').classList.remove('oculto');
                window.UI.showNotification("Formato de correo inválido", "error");
                return;
            }

            window.UI.toggleSpinner(true);
            try {
                await mockDelay(1200);
                window.UI.showNotification("Cuenta creada con éxito. Ya puedes iniciar sesión.", "success");
                setTimeout(() => window.location.href = 'index.html', 2000);
            } catch (error) {
                window.UI.showNotification("Error al procesar registro", "error");
            } finally {
                window.UI.toggleSpinner(false);
            }
        });
    }

    // === TOGGLE VISIBILIDAD PASSWORD ===
    const btnToggle = document.getElementById('btn-toggle-password');
    if (btnToggle) {
        btnToggle.addEventListener('click', () => {
            const input = document.getElementById('input-password');
            const isPass = input.type === 'password';
            input.type = isPass ? 'text' : 'password';
            btnToggle.textContent = isPass ? '🔒' : '👁️';
        });
    }
});
