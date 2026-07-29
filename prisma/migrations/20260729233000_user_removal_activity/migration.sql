-- Record removals in the audit trail so offboarding is reviewable.
ALTER TYPE "ActivityType" ADD VALUE IF NOT EXISTS 'USER_REMOVED';
