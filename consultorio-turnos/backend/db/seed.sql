-- seed.sql: Datos de prueba para el Sistema de Gestión de Turnos

-- 1. ROLES (Ya existen por el schema, pero aseguramos)
INSERT INTO roles (nombre) VALUES ('ADMIN'), ('PACIENTE') ON CONFLICT DO NOTHING;

-- 2. ESPECIALIDADES
INSERT INTO especialidades (nombre, descripcion) VALUES 
('Cardiología', 'Especialistas en salud del corazón y sistema circulatorio.'),
('Neurología', 'Tratamiento de trastornos del sistema nervioso.'),
('Pediatría', 'Atención médica integral para niños y adolescentes.'),
('Odontología', 'Salud bucal y tratamientos dentales.'),
('Dermatología', 'Cuidado de la piel, cabello y uñas.')
ON CONFLICT (nombre) DO NOTHING;

-- 3. MÉDICOS (Ejemplos)
INSERT INTO medicos (nombre, especialidad_id, telefono, activo) VALUES 
('Dr. Alberto García', 1, '555-0101', true),  -- Cardiología
('Dra. Elena Rodríguez', 2, '555-0102', true), -- Neurología
('Dr. Carlos Martínez', 3, '555-0103', true),  -- Pediatría
('Dra. Lucía Fernández', 4, '555-0104', true), -- Odontología
('Dr. Sergio López', 1, '555-0105', true)      -- Cardiología (segundo médico)
ON CONFLICT DO NOTHING;

-- 4. FRANJAS HORARIAS (Slots de 30 o 60 min)
INSERT INTO franjas_horarias (hora_inicio, hora_fin) VALUES 
('08:00', '09:00'),
('09:00', '10:00'),
('10:00', '11:00'),
('11:00', '12:00'),
('14:00', '15:00'),
('15:00', '16:00'),
('16:00', '17:00'),
('17:00', '18:00')
ON CONFLICT (hora_inicio, hora_fin) DO NOTHING;

-- 5. HORARIOS DISPONIBLES (Plantilla semanal)
-- Ejemplo: Dr. Alberto García (ID 1) atiende Lunes (1) y Miércoles (3) por la mañana
INSERT INTO horarios_disponibles (medico_id, dia_semana, franja_id) VALUES 
(1, 1, 1), (1, 1, 2), (1, 1, 3), (1, 1, 4), -- Lunes AM
(1, 3, 1), (1, 3, 2), (1, 3, 3), (1, 3, 4), -- Miércoles AM
-- Dra. Elena (ID 2) atiende Martes (2) y Jueves (4) por la tarde
(2, 2, 5), (2, 2, 6), (2, 2, 7), (2, 2, 8), -- Martes PM
(2, 4, 5), (2, 4, 6), (2, 4, 7), (2, 4, 8)  -- Jueves PM
ON CONFLICT DO NOTHING;

