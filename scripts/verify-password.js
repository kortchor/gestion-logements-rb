const bcrypt = require('bcryptjs');

const enteredPassword = 'admin123';
const storedHash = '$2b$10$1PC08GPMKCqDcyj1IIt.lepowy/Abe8IzroI0GFnAlm0V31YBdXJY';

// Vérifier
const isValid = bcrypt.compareSync(enteredPassword, storedHash);
console.log('✅ Le mot de passe est valide :', isValid);