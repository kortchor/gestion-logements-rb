const { Client } = require('pg');

const client = new Client({
  connectionString: "postgresql://postgres:111876354@localhost:5432/gestion_logements"
});

async function testConnection() {
  try {
    await client.connect();
    console.log("✅ Connexion à PostgreSQL locale réussie !");
    
    const res = await client.query('SELECT NOW()');
    console.log("✅ Heure du serveur :", res.rows[0].now);
    
    await client.end();
  } catch (err) {
    console.error("❌ Erreur de connexion :", err.message);
  }
}

testConnection();