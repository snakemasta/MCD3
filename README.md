# Major Crimes Division CaseOps Platform

Converted from the original v0 / Vercel Next.js project into an MCD-focused investigation platform.

## What was changed

- Rebranded the app to Major Crimes Division / MCD CaseOps Platform.
- Added MCD roles such as Super Admin, MCD Command, Supervisor, Detective, Investigator, Marked Unit, Crime Analyst, Evidence Technician, Liaison, Prosecutor, Judge, Confidential Informant, and Read Only.
- Updated the main navigation for Active Cases, Cold Cases, Evidence Locker, Master Person Database, Vehicle Database, Gang Intelligence, Drug Intelligence, Court Packet Builder, Warrants, Reports, SOP/Knowledge Bank, and Investigation AI.
- Expanded the database schema with MCD investigation fields and new tables for persons, vehicles, gangs, gang memberships, informants, intel reports, checklists, linked cases, and court packets.
- Added shell pages for the new MCD modules so v0 or Codex can continue building each module without starting over.

## Run locally

```bash
npm install
npm run dev
```

## Deploy

Import this repository into Vercel, add your environment variables, then deploy.
