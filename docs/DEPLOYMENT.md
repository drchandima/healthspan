# HealthSpan Deployment

## MVP Deployment Position

The application is designed first for an internal/test deployment.

JSON-file persistence is acceptable for a controlled MVP environment only when the deployment provides reliable persistent storage and access is restricted.

For production or multi-user deployment, replace the JSON repository with a database-backed repository.

## Deployment Steps

1. Install dependencies.
2. Run lint and tests.
3. Build the Next.js application.
4. Configure environment variables.
5. Provision persistent storage for MVP JSON data if JSON persistence is still used.
6. Start the application.
7. Verify authentication.
8. Verify dashboard loading.
9. Verify health-record writes.
10. Verify lab upload/review.
11. Verify notification settings.
12. Verify export and deletion behavior.
13. Review logs for errors.

## Environment Separation

Maintain separate configuration for:

- Local
- Development
- Staging
- Production

Do not copy production secrets into local development.

## Deployment Verification

### Application

- [ ] Application starts successfully.
- [ ] Login works.
- [ ] Protected routes reject unauthenticated requests.
- [ ] Logout/session expiration works.

### Data

- [ ] JSON storage is writable where MVP deployment requires it.
- [ ] Data survives application restart.
- [ ] User isolation is enforced.
- [ ] Audit events are created.

### Health Features

- [ ] Body metric chart loads.
- [ ] Reference bands render.
- [ ] Abnormal values are highlighted.
- [ ] Lab results can be reviewed.
- [ ] Health Score calculates.
- [ ] Insights are generated.

### Notifications

- [ ] Weekly/monthly/off preference is persisted.
- [ ] Email preview reflects current data.
- [ ] Unsubscribe/frequency change works.

### Privacy

- [ ] Export produces the user's own data.
- [ ] Account deletion permanently removes account data.
- [ ] Deleted account cannot authenticate.

## Rollback

If a deployment introduces a functional regression:

1. Stop the rollout.
2. Restore the previous application version.
3. Verify health endpoints and authentication.
4. Verify data access.
5. Review application logs.
6. If a schema/data migration is involved in a future database implementation, follow the migration rollback plan.

## Important MVP Limitation

Do not assume JSON persistence is horizontally scalable. Multiple application instances can create conflicting writes or inconsistent state.

When moving beyond a single controlled deployment, migrate to a transactional database before enabling horizontal scaling.

## Release Checklist

- [ ] Tests pass.
- [ ] Build passes.
- [ ] Environment variables verified.
- [ ] Security review completed.
- [ ] Medical disclaimer visible.
- [ ] No test credentials exposed in production UI/logs.
- [ ] Backup/restore strategy verified for persisted data.
- [ ] Account deletion tested.
