# Migration 011: Populate Reviewer Data - Report

**Migration File**: `011_populate_reviewer_data.sql`
**Executed Date**: 2025-11-05
**Status**: ✅ Successfully Completed

## Objective

Initialize `reviewer_id` field for historical questions in the `question_bank` table to support the new creator/reviewer display feature.

## Problem Statement

After implementing the creator and reviewer display feature in the question bank list (Tasks 3 & 5), we discovered that many approved and published questions lack reviewer information:

- **Total active questions**: 489
- **Questions with creator data**: 489 (100%)
- **Questions with reviewer data**: 27 (5.5%) ← Problem!

### Breakdown by Status (Before Migration):

| Status | Total | With Reviewer | Gap |
|--------|-------|---------------|-----|
| draft | 114 | 0 | ✅ Expected (not yet reviewed) |
| pending_review | 23 | 23 | ✅ OK |
| approved | 80 | 0 | ❌ **Missing reviewer data** |
| published | 272 | 4 | ❌ **Missing reviewer data** |

## Root Cause Analysis

1. **Historical Data Gap**: The system didn't always populate `reviewer_id` when approving questions
2. **Limited Review Records**: Only 4 approved review records exist in `question_reviews` table
3. **No Historical Tracking**: Questions approved before the review workflow was implemented lack reviewer information

## Migration Strategy

### Data Sources for Reviewer Information

1. **Question Reviews Table** (4 questions):
   - Used existing `question_reviews.reviewer_id` for questions with approved review records
   - These were already correctly populated before migration

2. **Published By Field** (18 questions):
   - For published questions with `published_by` populated
   - Reasonable assumption: The person who published also reviewed the question
   - Migration populates: `reviewer_id = published_by`

3. **No Available Data** (330 questions):
   - Historical questions without review records or published_by data
   - Left as `reviewer_id = NULL`
   - Frontend will display "-" for these entries

## Migration Results

### Questions Updated

```sql
UPDATE 18
```

**18 published questions** were updated with reviewer_id from published_by field.

### Final State (After Migration):

| Status | Total | With Reviewer | Without Reviewer | Coverage |
|--------|-------|---------------|------------------|----------|
| draft | 114 | 0 | 114 | 0% (Expected) |
| pending_review | 23 | 23 | 0 | 100% ✅ |
| approved | 80 | 0 | 80 | 0% ⚠️ |
| published | 272 | 22 | 250 | 8.1% ⚠️ |
| **TOTAL** | **489** | **45** | **444** | **9.2%** |

### Improvement

- **Before**: 27 questions with reviewer_id (5.5%)
- **After**: 45 questions with reviewer_id (9.2%)
- **Improvement**: +18 questions (+66.7% increase)

## Migration Details

### SQL Operations

1. **Created schema_migrations table**:
   ```sql
   CREATE TABLE IF NOT EXISTS schema_migrations (
     version VARCHAR(10) PRIMARY KEY,
     description TEXT,
     applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );
   ```

2. **Updated published questions**:
   ```sql
   UPDATE question_bank
   SET
       reviewer_id = published_by,
       reviewed_at = published_at,
       review_comment = 'Historical data: reviewer populated from published_by during migration 011'
   WHERE
       is_active = true
       AND status = 'published'
       AND reviewer_id IS NULL
       AND published_by IS NOT NULL;
   ```

3. **Tracked migration**:
   ```sql
   INSERT INTO schema_migrations (version, description, applied_at)
   VALUES ('011', 'Populate reviewer data for historical questions', CURRENT_TIMESTAMP);
   ```

## Frontend Impact

### Display Behavior

- **Questions with reviewer_id**: Display reviewer's real name (from users table)
- **Questions without reviewer_id**: Display "-" (dash)
- **User Experience**: Users understand that historical questions may not have reviewer data

### Example Display:

| Question Code | Creator | Reviewer | Status |
|---------------|---------|----------|--------|
| MATH2510210001 | 李老师 | 王审核员 | published ✅ |
| HIST2410150042 | 张老师 | - | published ⚠️ |
| CHIN2310050023 | 刘老师 | - | approved ⚠️ |

## Future Considerations

### Ongoing Data Quality

- ✅ **New approvals** will correctly populate reviewer_id through application code
- ⚠️ **Historical approved questions** (80) still lack reviewer data
- ⚠️ **Historical published questions** (250) still lack reviewer data

### Recommendations

1. **Accept the gap**: Historical data loss is acceptable for a feature enhancement
2. **Document clearly**: Update user documentation to explain why some questions show "-"
3. **Monitor forward**: Ensure all future approvals correctly populate reviewer_id
4. **Optional cleanup** (if needed):
   - Manual admin review to assign reviewers to critical questions
   - Bulk assignment of a "system reviewer" for completeness

## Rollback Procedure

If rollback is needed:

```sql
BEGIN;

-- Revert updated questions
UPDATE question_bank
SET
    reviewer_id = NULL,
    reviewed_at = NULL,
    review_comment = NULL
WHERE
    is_active = true
    AND status = 'published'
    AND review_comment = 'Historical data: reviewer populated from published_by during migration 011';

-- Remove migration tracking
DELETE FROM schema_migrations WHERE version = '011';

COMMIT;
```

## Validation

### Before Migration
```
Questions in approved/published status: 352
Questions with reviewer_id: 4
```

### After Migration
```
Questions now with reviewer_id: 22
Questions still without reviewer_id: 330
```

### Database Query to Verify
```sql
SELECT
    status,
    COUNT(*) as total,
    COUNT(reviewer_id) as with_reviewer,
    COUNT(*) - COUNT(reviewer_id) as without_reviewer,
    ROUND(100.0 * COUNT(reviewer_id) / COUNT(*), 1) as coverage_pct
FROM question_bank
WHERE is_active = true
GROUP BY status
ORDER BY status;
```

## Conclusion

✅ **Migration completed successfully**

- Populated reviewer data for 18 historical published questions
- Created infrastructure (schema_migrations table) for future migrations
- Documented data gaps for transparency
- Frontend displays creator/reviewer information correctly
- Future approvals will be tracked properly

### Task Completion

- ✅ Task 3: Display creator and reviewer in question bank list (Frontend)
- ✅ Task 5: Initialize reviewer data for historical questions (Database)
- ✅ All services rebuilt and running
- ✅ Data migration executed and verified

---

**Related Files**:
- Migration Script: `database/migrations/011_populate_reviewer_data.sql`
- Backend Model: `backend/src/models/QuestionBank.js`
- Frontend Component: `frontend/src/pages/teacher/QuestionBankPage.tsx`
