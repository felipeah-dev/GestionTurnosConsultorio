/**
 * auth.js: Lógica de login, registro y validaciones dinámicas.
 * Cumple con: Manipulación avanzada del DOM, Validaciones dinámicas y Manejo de estados visuales.
 */


document.addEventListener('DOMContentLoaded', () => {
    // === AUTO-CONFIGURACIÓN DE FECHAS (Validación Básica de Front Inicial) ===
    const inputFechaNac = document.getElementById('input-fecha-nac');
    if (inputFechaNac) {
        // Restringir que no se puedan seleccionar fechas futuras para el nacimiento
        const today = new Date().toISOString().split('T')[0];
        inputFechaNac.setAttribute('max', today);
    }

    // === FORMULARIO DE LOGIN ===
    const formLogin = document.getElementById('form-login');
    if (formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('input-email').value;
            const password = document.getElementById('input-password').value;

            window.UI.toggleSpinner(true);

            //Cambio 5 - Mitzy: Llamada real al backend para login con manejo de token e identidad
            try {
                const response = await fetch("http://localhost:4000/api/auth/login", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || "Credenciales inválidas");
                }

                // Guardar token REAL
                localStorage.setItem("token", data.token);

                // Guardar identidad EXACTA como pide el proyecto
                const userIdentity = {
                    nombre: data.nombre,
                    primer_apellido: data.primer_apellido
                };

                localStorage.setItem("user_identity", JSON.stringify(userIdentity));

                window.UI.showNotification("¡Bienvenido!", "success");

                setTimeout(() => {
                    window.location.href = 'pages/paciente/dashboard.html';
                }, 1000);

            } catch (error) {
                window.UI.showNotification(error.message, "error");
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
        const inputEmail = document.getElementById('input-email');
        const errorEmail = document.getElementById('error-email');
        const errorConfirm = document.getElementById('error-confirm-password');

        // Validación dinámica de coincidencia de contraseñas al escribir
        const validatePasswords = () => {
            if (inputConfirm.value && inputPass.value !== inputConfirm.value) {
                if (errorConfirm) errorConfirm.classList.remove('oculto');
                inputConfirm.style.borderColor = 'var(--color-peligro)';
                return false;
            } else {
                if (errorConfirm) errorConfirm.classList.add('oculto');
                inputConfirm.style.borderColor = '';
                return true;
            }
        };

        // Ocultar error de email al escribir si es válido
        if (inputEmail) {
            inputEmail.addEventListener('input', () => {
                const val = inputEmail.value.trim();
                const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
                if (isValid && errorEmail) errorEmail.classList.add('oculto');
            });
        }

        if (inputConfirm) inputConfirm.addEventListener('input', validatePasswords);
        if (inputPass) inputPass.addEventListener('input', validatePasswords);

        formRegister.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Capturar campos de nombre y apellidos
            const nombre = document.getElementById('input-nombre').value.trim();
            const primerApellido = document.getElementById('input-primer-apellido').value.trim();
            const segundoApellido = document.getElementById('input-segundo-apellido').value.trim();

            const email = inputEmail.value.trim();
            const password = inputPass.value;
            let telefono = document.getElementById('input-telefono').value.trim();

            // Anteponer '+' si el usuario no lo puso (aunque ahora hay un prefijo visual)
            if (telefono !== "" && !telefono.startsWith('+')) {
                telefono = '+' + telefono;
            }

            // Validar todo antes de enviar
            const isPasswordsMatch = validatePasswords();
            const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

            // Regla de Contraseña: Mín 8 chars, 1 mayúscula, 1 número
            const hasUpperCase = /[A-Z]/.test(password);
            const hasNumber = /[0-9]/.test(password);
            const isPassValid = password.length >= 8 && hasUpperCase && hasNumber;

            // Regla de Teléfono: Internacional flexible (acepta +, espacios, guiones y entre 7-15 dígitos)
            const isPhoneValid = telefono === "" || /^\+?[\d\s\-()]{7,15}$/.test(telefono);

            if (!isPassValid) {
                const errPass = document.getElementById('error-password');
                if (errPass) {
                    errPass.textContent = "Debe tener 8+ caracteres, una mayúscula y un número";
                    errPass.classList.remove('oculto');
                }
                window.UI.showNotification("La contraseña debe tener 8+ caracteres, una mayúscula y un número", "error");
                return;
            } else {
                const errPass = document.getElementById('error-password');
                if (errPass) errPass.classList.add('oculto');
            }

            if (!isPasswordsMatch) {
                window.UI.showNotification("Las contraseñas no coinciden", "error");
                return;
            }

            if (!isEmailValid) {
                if (errorEmail) errorEmail.classList.remove('oculto');
                window.UI.showNotification("Formato de correo inválido", "error");
                return;
            } else {
                if (errorEmail) errorEmail.classList.add('oculto');
            }

            if (!isPhoneValid) {
                const errTel = document.getElementById('error-telefono');
                if (errTel) errTel.classList.remove('oculto');
                window.UI.showNotification("Formato de teléfono inválido (Use + y números)", "error");
                return;
            } else {
                const errTel = document.getElementById('error-telefono');
                if (errTel) errTel.classList.add('oculto');
            }

            window.UI.toggleSpinner(true);

            //Cambio 6 - Mitzy: Llamada real al backend para registro con manejo de respuestas
            try {
                const response = await fetch("http://localhost:4000/api/auth/register", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        nombre,
                        primer_apellido: primerApellido,
                        segundo_apellido: segundoApellido,
                        email,
                        password,
                        telefono,
                        fecha_nacimiento: document.getElementById('input-fecha-nac').value
                    })
                });
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || "Credenciales inválidas");
                }

                window.UI.showNotification("¡Cuenta creada! Inicia sesion para continuar.", "success");

                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1000);

            } catch (error) {
                window.UI.showNotification(error.message, "error");
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
