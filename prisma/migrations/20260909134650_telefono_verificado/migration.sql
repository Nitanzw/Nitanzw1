-- AlterEnum
ALTER TYPE "TokenType" ADD VALUE 'PHONE_VERIFICATION';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "phoneVerified" TIMESTAMP(3);
