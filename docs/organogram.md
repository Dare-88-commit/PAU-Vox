# PAU Vox Organogram (System Roles and Operations)

This organogram reflects the current system structure for academic and non-academic flows, including survey visibility and task assignment.

## High-level structure

- University Governance Layer
  - University Management (analytics/oversight only)
  - ICT Admin (system administration, user management)
- Academic Track
  - Dean (per school)
    - Department Head(s) (can cover multiple departments)
      - Academic Staff
      - Course Coordinator (intermediary; sends surveys; views feedback but does not change status)
- Non-Academic Track
  - Head of Student Affairs
    - Student Affairs Officers
    - Head Security -> Security Supervisor -> Security Staff
    - Head Maintenance -> Maintenance Staff
    - Head Facilities -> Facilities Staff / Facilities Account
    - Head Cafeteria -> Cafeteria Staff

## Survey governance (current behavior)

- Only the survey creator can view responses by default.
- The creator can grant response visibility to:
  - Specific roles (selected at creation time)
  - Specific users (by email)
- Surveys can be targeted to:
  - Specific student users (by email)
  - Specific departments
- Reminders are sent only by the survey creator and can target specific users/departments.

## Mermaid diagram

```mermaid
flowchart TB
  UM[University Management\n(Analytics/Oversight)]
  ICT[ICT Admin\n(System Admin)]

  A[Academic Track]
  NA[Non-Academic Track]

  Dean[Dean (per school)]
  HOD[Department Head(s)\n(multi-department allowed)]
  Staff[Academic Staff]
  Coord[Course Coordinator\n(intermediary)]

  HSA[Head Student Affairs]
  SA[Student Affairs Officers]

  HS[Head Security]
  SSup[Security Supervisor]
  SStaff[Security Staff]

  HM[Head Maintenance]
  MStaff[Maintenance Staff]

  HF[Head Facilities]
  FStaff[Facilities Staff]
  FAcct[Facilities Account]

  HC[Head Cafeteria]
  CStaff[Cafeteria Staff]

  UM --> A
  UM --> NA
  ICT --> A
  ICT --> NA

  A --> Dean --> HOD --> Staff
  HOD --> Coord

  NA --> HSA --> SA
  HSA --> HS --> SSup --> SStaff
  HSA --> HM --> MStaff
  HSA --> HF --> FStaff
  HF --> FAcct
  HSA --> HC --> CStaff
```

## Image

See `docs/organogram.svg` for a rendered picture version.
