import prisma from '../src/config/prisma';
import bcrypt from 'bcryptjs';

async function check() {
  const email = 'test.student.role@check.com';
  await prisma.user.deleteMany({ where: { email } });

  const hash = await bcrypt.hash('pass123', 10);
  const user = await prisma.user.create({
    data: {
      name: 'Test Student',
      email,
      password: hash,
      role: 'USER',
      isApproved: true,
      approvalStatus: 'APPROVED',
    },
  });

  console.log('Created user:', user.email, 'Role:', user.role);

  // Test 1: Student trying to login as OWNER
  const resOwner = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password: 'pass123',
      expectedRole: 'OWNER',
    }),
  });

  const dataOwner = await resOwner.json();
  console.log('Test 1 (Student logging into Owner Portal):', resOwner.status, dataOwner);

  // Test 2: Student trying to login as ADMIN
  const resAdmin = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password: 'pass123',
      expectedRole: 'ADMIN',
    }),
  });

  const dataAdmin = await resAdmin.json();
  console.log('Test 2 (Student logging into Admin Portal):', resAdmin.status, dataAdmin);

  // Test 3: Student logging into STUDENT (USER) portal
  const resStudent = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password: 'pass123',
      expectedRole: 'USER',
    }),
  });

  const dataStudent = await resStudent.json();
  console.log('Test 3 (Student logging into Student Portal):', resStudent.status, 'Success:', dataStudent.success);

  // Clean up
  await prisma.user.deleteMany({ where: { email } });
  console.log('Cleaned up test user.');
}

check();
