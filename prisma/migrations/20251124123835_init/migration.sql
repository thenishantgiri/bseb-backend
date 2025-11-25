-- CreateTable
CREATE TABLE "Student" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "password" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "dob" TEXT,
    "gender" TEXT,
    "fatherName" TEXT,
    "motherName" TEXT,
    "rollNumber" TEXT,
    "rollCode" TEXT,
    "registrationNumber" TEXT,
    "schoolName" TEXT,
    "udiseCode" TEXT,
    "stream" TEXT,
    "class" TEXT,
    "address" TEXT,
    "block" TEXT,
    "district" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "caste" TEXT,
    "religion" TEXT,
    "differentlyAbled" TEXT,
    "maritalStatus" TEXT,
    "area" TEXT,
    "aadhaarNumber" TEXT,
    "photoUrl" TEXT,
    "signatureUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Student_phone_key" ON "Student"("phone");
