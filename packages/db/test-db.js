const { Client } = require('pg');
console.log('DATABASE_URL in process.env:', process.env.DATABASE_URL);
const client = new Client({
  connectionString: process.env.DATABASE_URL,
});
client.connect()
  .then(() => {
    console.log('Successfully connected!');
    return client.query('SELECT NOW()');
  })
  .then((res) => {
    console.log('Query result:', res.rows[0]);
    return client.end();
  })
  .catch((err) => {
    console.error('Connection failed:', err);
    process.exit(1);
  });
