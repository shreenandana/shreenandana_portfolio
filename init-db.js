const mysql = require('mysql2/promise');

async function run() {
    try {
        const url = 'mysql://root:qgSJUoCGheuvGafuVihObjUVutxtYmSG@crossover.proxy.rlwy.net:34279/railway';
        console.log('Connecting...');
        const pool = mysql.createPool(url);
        const conn = await pool.getConnection();
        console.log('Connected! Creating tables...');

        await conn.query(`CREATE TABLE IF NOT EXISTS contacts (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255) NOT NULL, email VARCHAR(255) NOT NULL, message TEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
        await conn.query(`CREATE TABLE IF NOT EXISTS site_content (section_key VARCHAR(100) PRIMARY KEY, content TEXT NOT NULL)`);
        await conn.query(`CREATE TABLE IF NOT EXISTS skills (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(100) NOT NULL)`);
        await conn.query(`CREATE TABLE IF NOT EXISTS projects (id INT AUTO_INCREMENT PRIMARY KEY, title VARCHAR(255) NOT NULL, description TEXT NOT NULL, image_url VARCHAR(255) DEFAULT '', code_url VARCHAR(255) DEFAULT '', live_url VARCHAR(255) DEFAULT '')`);

        const [rows] = await conn.query('SHOW TABLES');
        console.log('Tables created successfully:');
        console.log(rows);

        conn.release();
    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        process.exit();
    }
}

run();
