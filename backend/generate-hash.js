// Script phụ trợ: generate bcrypt hash để paste vào SQL khi muốn tạo user thủ công.
// Chạy:  node generate-hash.js <password>
import bcrypt from 'bcryptjs';

const password = process.argv[2] || 'password123';
const hash = await bcrypt.hash(password, 10);
console.log('Password:', password);
console.log('Hash    :', hash);
console.log('\nCách dùng trong SQL:');
console.log(`INSERT INTO users (name, email, password_hash, role, points) VALUES ('Your Name', 'your@email.com', '${hash}', 'user', 100);`);
