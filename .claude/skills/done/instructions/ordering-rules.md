# Ordering Rule

Before merging any PR or committing to `main`, finish the shared-memory write in Step 4. The daily log, context updates, decisions, and session summary must already be on disk so they are included in the GitHub sync.

The completion iMessage is the second-to-last step of `/done`. Send it only after sync, validation, and smoke-test have finished. The true final step is Step 9: save a session snapshot, set markers, and tell the user to start a new session. The `session-bootstrap` hook will auto-inject recent session history on their first prompt in the new session.

# Deployment Rule

After every successful deployment or merged deploy PR:

- fast-forward the local repo state
- sync the iMac checkout to the same deployed commit
- run `npm run build` on the iMac after the pull
