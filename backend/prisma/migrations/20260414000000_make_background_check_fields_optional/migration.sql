-- Make all BackgroundCheck fields optional since we create a placeholder record
-- before the tutor fills in their details via the Checkr apply link
ALTER TABLE "BackgroundCheck" ALTER COLUMN "fullLegalFirstName" DROP NOT NULL;
ALTER TABLE "BackgroundCheck" ALTER COLUMN "fullLegalLastName" DROP NOT NULL;
ALTER TABLE "BackgroundCheck" ALTER COLUMN "addressLine1" DROP NOT NULL;
ALTER TABLE "BackgroundCheck" ALTER COLUMN "city" DROP NOT NULL;
ALTER TABLE "BackgroundCheck" ALTER COLUMN "stateProvinceRegion" DROP NOT NULL;
ALTER TABLE "BackgroundCheck" ALTER COLUMN "postalCode" DROP NOT NULL;
ALTER TABLE "BackgroundCheck" ALTER COLUMN "country" DROP NOT NULL;
ALTER TABLE "BackgroundCheck" ALTER COLUMN "livedMoreThan3Years" DROP NOT NULL;
ALTER TABLE "BackgroundCheck" ALTER COLUMN "dateOfBirth" DROP NOT NULL;
ALTER TABLE "BackgroundCheck" ALTER COLUMN "socialSecurityNumber" DROP NOT NULL;
ALTER TABLE "BackgroundCheck" ALTER COLUMN "hasUSDriverLicense" DROP NOT NULL;
ALTER TABLE "BackgroundCheck" ALTER COLUMN "consentGiven" DROP NOT NULL;
