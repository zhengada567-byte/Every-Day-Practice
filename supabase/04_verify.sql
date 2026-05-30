-- Verify database setup (run after 01–03)

SELECT 'words' AS check_name, COUNT(*)::int AS count FROM words
UNION ALL
SELECT 'word_examples', COUNT(*)::int FROM word_examples
UNION ALL
SELECT 'blank_items', COUNT(*)::int FROM blank_items
UNION ALL
SELECT 'holidays', COUNT(*)::int FROM holidays
UNION ALL
SELECT 'schema_migrations', COUNT(*)::int FROM schema_migrations;

-- Expected: words 91, blank_items 364, holidays 34, schema_migrations 6
