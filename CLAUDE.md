# ShareRide (turo-clone)

Live production app at jayxz.com, run by PM2 as "turo-clone" (cluster mode, port 3000).
The database (turo_clone, Prisma, localhost) is the PRODUCTION database.

## Rules
- NEVER run `prisma migrate dev`, `prisma migrate reset`, or `prisma db push`.
  For schema changes, create the migration and ask me before running `npx prisma migrate deploy`.
- Never restart or reload PM2 without asking.
- Work on a git branch, not main. Commit in small steps with clear messages.
- Run `npm run build` to check for errors before saying a change is done.

## Deploy (only when I say so)
git checkout main && git merge <branch> && npm run build && pm2 restart turo-clone
