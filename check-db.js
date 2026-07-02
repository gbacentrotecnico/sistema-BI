const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:gbamecanica010203@localhost:5432/postgres?schema=public' });

pool.query('SELECT * FROM "DeadLetter" ORDER BY id DESC LIMIT 1', (err, res) => {
  if (err) console.error(err);
  else console.log('DeadLetter:', res.rows[0]);
  pool.end();
});
