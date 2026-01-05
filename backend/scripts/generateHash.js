const bcrypt = require('bcryptjs');

async function generateHash() {
  const password = 'admin123'; // Change this to your desired password
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);
  
  console.log('Password:', password);
  console.log('Hash:', hash);
  
  // Test verification
  const isValid = await bcrypt.compare(password, hash);
  console.log('Verification test:', isValid ? '✅ PASSED' : '❌ FAILED');
}

generateHash().catch(console.error);