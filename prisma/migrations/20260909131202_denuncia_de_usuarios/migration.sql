-- AlterTable
ALTER TABLE "Report" ADD COLUMN     "subjectId" TEXT,
ALTER COLUMN "listingId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Report_subjectId_idx" ON "Report"("subjectId");

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
