// connection.js: Pool de conexiones a PostgreSQL usando la librería pg, exportado para uso en los modelos
import pkg from 'pg';

const { Pool } = pkg;

const pool = new Pool({
    host: 'localhost',
    user: 'postgres',
    password: '12345',
    database: 'consultorio_DOM',
    port: 5432
});

export default pool;