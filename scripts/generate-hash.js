const bcrypt = require('bcryptjs');

// Mot de passe que tu veux utiliser
const password = 'admin123';

// Générer le hash
const hash = bcrypt.hashSync(password, 10);

console.log('📝 Mot de passe :', password);
console.log('🔑 Hash à copier :');
console.log(hash);