-- IBAN is employee payment data and must only exist on USER accounts.
UPDATE "users"
SET "iban" = NULL
WHERE "role" IN ('ADMIN', 'MANAGER');

ALTER TABLE "users"
ADD CONSTRAINT "users_iban_user_role_only"
CHECK ("role" = 'USER' OR "iban" IS NULL);
