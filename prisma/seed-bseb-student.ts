import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

/**
 * Seed script to add BSEB student from form data API
 * Student: NANDINI KUMARI (Registration: 91341-00009-24)
 */
async function main() {
  console.log('🌱 Seeding BSEB student data...');

  // Hash a default password (Test@1234)
  const hashedPassword = await bcrypt.hash('Test@1234', 10);

  // Student data from BSEB Form Data API
  const studentData = {
    phone: '9065254423',
    email: 'sandhyakumari1128510@gmail.com', // Lowercase for consistency
    password: hashedPassword,
    fullName: 'NANDINI KUMARI',
    fatherName: 'GULABCHAND SAH',
    motherName: 'SARITA DEVI',
    dob: '02/04/2010',
    gender: 'FEMALE',
    registrationNumber: '91341-00009-24',
    schoolName: 'UTKRAMIT MADHYAMIK SCHOOL ANWAL, JALALPUR, SARAN',
    address: 'VILLAGE+PO ANWAL PS KOPA SARAN, JALALPUR',
    district: 'SARAN',
    state: 'BIHAR',
    pincode: '841213',
    caste: 'EBC',
    religion: 'HINDU',
    area: 'RURAL',
    maritalStatus: 'UNMARRIED',
    class: '10', // Matric
    photoUrl: 'https://matricexam2026.s3.ap-south-1.amazonaws.com/photo/91341-00009-24.jpg',
    signatureUrl: 'https://matricexam2026.s3.ap-south-1.amazonaws.com/sign/91341-00009-24.jpg',
  };

  // Check if student already exists
  const existingStudent = await prisma.student.findFirst({
    where: {
      OR: [
        { phone: studentData.phone },
        { email: studentData.email },
        { registrationNumber: studentData.registrationNumber },
      ],
    },
  });

  if (existingStudent) {
    console.log('⚠️  Student already exists:');
    console.log(`   ID: ${existingStudent.id}`);
    console.log(`   Name: ${existingStudent.fullName}`);
    console.log(`   Phone: ${existingStudent.phone}`);
    console.log(`   Registration: ${existingStudent.registrationNumber}`);
    return;
  }

  // Create the student
  const student = await prisma.student.create({
    data: studentData,
  });

  console.log('✅ Student created successfully:');
  console.log(`   ID: ${student.id}`);
  console.log(`   Name: ${student.fullName}`);
  console.log(`   Phone: ${student.phone}`);
  console.log(`   Email: ${student.email}`);
  console.log(`   Registration: ${student.registrationNumber}`);
  console.log(`   School: ${student.schoolName}`);
  console.log('');
  console.log('📱 Login credentials:');
  console.log(`   Phone/Email: ${student.phone} or ${student.email}`);
  console.log('   Password: Test@1234');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
