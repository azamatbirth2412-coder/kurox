// Comment system configuration
export const COMMENT_CONFIG = {
  // If true, new comments go to PENDING and require admin approval
  // If false, comments are APPROVED immediately
  REQUIRE_MODERATION: true,

  // Rate limiting: seconds between comments per user
  RATE_LIMIT_SECONDS: 30,

  // Text length limits
  MIN_LENGTH: 3,
  MAX_LENGTH: 1000,

  // Basic spam word filter (add words as needed)
  BANNED_WORDS: [] as string[],
};
