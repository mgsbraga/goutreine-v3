# Goutreine V5 — Architecture & Migration Plan

## Current State (V4): What Lives Where

The entire app is a single `index.html` (5,410 lines). Here's what it contains:

| Lines (approx.) | What | Maps to (V5) |
|---|---|---|
| 1–214 | CSS styles (inline `<style>`) | `src/styles/` |
| 215–249 | CDN scripts + Tailwind config | Vite handles this |
| 250–260 | React hooks destructuring + Chart.js check | `src/lib/chart.js` |
| 261–271 | Supabase client init + credentials | `src/lib/supabase.js` |
| 272–445 | `DataService` object (all Supabase calls) | `src/services/*` |
| 447–569 | `PERIODIZATION_SCHEMES` constant | `src/shared/constants/periodization-schemes.js` |
| 570–670 | `MOCK_DATA` + mock generators | `src/shared/constants/mock-data.js` |
| 671–866 | Mock session/log generators (offline mode) | `src/shared/constants/mock-generators.js` |
| 867–938 | `loadSupabaseCache()` | `src/services/cache.js` |
| 939–1019 | Offline cache (localStorage persist/restore) | `src/lib/offline-cache.js` |
| 1020–1035 | SVG Icon components | `src/shared/components/icons.jsx` |
| 1036–1105 | Utility functions (formatDate, getActivePhase, etc.) | `src/shared/utils/` |
| 1106–1320 | `applyTemplateToStudent`, `copyPhaseToStudent` | `src/services/programs.js` |
| 1321–1496 | Chart data computation helpers | `src/lib/analytics.js` |
| 1497–1618 | `App` component (auth + routing) | `src/app/App.jsx` + `src/app/router.jsx` |
| 1619–1780 | `LoginPage` | `src/features/auth/LoginPage.jsx` |
| 1780–1856 | `StudentLayout` (nav + tabs) | `src/features/student/StudentLayout.jsx` |
| 1857–1901 | `StudentDashboardLayout` | `src/features/student/dashboard/Dashboard.jsx` |
| 1902–1943 | `TreinoPage` (workout list) | `src/features/student/workouts/TreinoPage.jsx` |
| 1944–2300 | `ExecutarTreinoPage` (set-by-set execution) | `src/features/student/workouts/ExecutarTreino.jsx` |
| 2300–2530 | `CalendarioPage` + `HistoricoPage` | `src/features/student/history/` |
| 2530–2863 | `ProgressoPage` (charts) | `src/features/student/progress/ProgressoPage.jsx` |
| 2864–2937 | `AdminLayout` (sidebar + nav) | `src/features/admin/AdminLayout.jsx` |
| 2938–2972 | `AdminDashboardLayout` | `src/features/admin/dashboard/Dashboard.jsx` |
| 2973–3400 | `AdminStudentProgressTab` (student charts) | `src/features/admin/students/ProgressTab.jsx` |
| 3400–3738 | `AdminExercisesPage` | `src/features/admin/exercises/ExercisesPage.jsx` |
| 3739–4548 | `StudentTreinosContent` (phase/plan/exercise management) | `src/features/admin/students/TreinosContent.jsx` |
| 4549–4556 | `AdminTreinosPage` (student selector wrapper) | `src/features/admin/students/TreinosPage.jsx` |
| 4557–5380 | `AdminTemplatesPage` (template CRUD + bulk edit) | `src/features/admin/templates/TemplatesPage.jsx` |
| 5381–5410 | ReactDOM.render + SW registration | `src/main.jsx` |

---

## V5 Folder Structure

```
goutreine/
├── index.html                    # Minimal shell (just <div id="root"> + script tag)
├── vite.config.js
├── package.json
├── vercel.json                   # Same static deploy config
├── manifest.json
├── sw.js                         # Service Worker (stays at root for scope)
├── public/
│   ├── logo.png
│   ├── logo-horizontal.png
│   ├── logo-vertical.png
│   └── icons/                    # PWA icons (same as V4)
│
└── src/
    ├── main.jsx                  # ReactDOM.createRoot + SW registration
    │
    ├── app/
    │   ├── App.jsx               # Root: providers wrapper + router
    │   └── router.jsx            # Hash-based route resolution + lazy imports
    │
    ├── contexts/
    │   └── auth-context.jsx      # AuthProvider: user, role, session, login/logout
    │
    ├── lib/
    │   ├── supabase.js           # createClient(URL, ANON_KEY) — single export
    │   ├── offline-cache.js      # localStorage persist/restore logic
    │   ├── chart.js              # useChart hook + Chart.js availability check
    │   └── analytics.js          # Chart data computation (progression, volume, frequency)
    │
    ├── services/
    │   ├── auth.js               # signIn, signOut, getSession, getProfile
    │   ├── profiles.js           # getMyProfile, getStudentProfile, getAllStudents
    │   ├── programs.js           # phases, plans, plan_exercises, week_configs CRUD
    │   │                         # + applyTemplateToStudent, copyPhaseToStudent
    │   ├── workouts.js           # startSession, logSet, finishSession, getSessions
    │   ├── exercises.js          # listExercises, createExercise, updateExercise, deleteExercise
    │   ├── templates.js          # template CRUD, template_plans, template_exercises, week_configs
    │   └── cache.js              # loadSupabaseCache (bulk data fetch on login)
    │
    ├── features/
    │   ├── auth/
    │   │   └── LoginPage.jsx
    │   │
    │   ├── student/
    │   │   ├── StudentLayout.jsx           # Bottom tab navigation
    │   │   ├── dashboard/
    │   │   │   └── Dashboard.jsx           # Phase timeline, stats, next workout
    │   │   ├── workouts/
    │   │   │   ├── TreinoPage.jsx          # Workout list for current phase
    │   │   │   └── ExecutarTreino.jsx      # Set-by-set execution + rest timer
    │   │   ├── history/
    │   │   │   ├── HistoricoPage.jsx
    │   │   │   └── CalendarioPage.jsx
    │   │   └── progress/
    │   │       └── ProgressoPage.jsx       # Charts (progression, volume, frequency)
    │   │
    │   └── admin/
    │       ├── AdminLayout.jsx             # Sidebar navigation
    │       ├── dashboard/
    │       │   └── Dashboard.jsx           # Overview stats + quick links
    │       ├── students/
    │       │   ├── StudentsPage.jsx         # Student list
    │       │   ├── TreinosPage.jsx          # Phase/plan management per student
    │       │   ├── TreinosContent.jsx       # Phase/plan/exercise CRUD
    │       │   └── ProgressTab.jsx          # Student progress charts
    │       ├── exercises/
    │       │   └── ExercisesPage.jsx        # Exercise catalog CRUD
    │       └── templates/
    │           └── TemplatesPage.jsx        # Template CRUD + bulk week config
    │
    ├── shared/
    │   ├── components/
    │   │   ├── icons.jsx                   # SVG icon components
    │   │   ├── Toast.jsx                   # Toast notification
    │   │   ├── Modal.jsx                   # Modal backdrop + content
    │   │   ├── Spinner.jsx                 # Loading spinner
    │   │   └── MuscleBadge.jsx             # Colored muscle group badge
    │   ├── hooks/
    │   │   └── useChart.js                 # Chart.js lifecycle hook
    │   ├── utils/
    │   │   ├── dates.js                    # formatDate, formatDateLong, getTodayFormatted
    │   │   ├── muscle-groups.js            # getMuscleGroupColor, getMuscleGroupName
    │   │   └── phase-helpers.js            # getActivePhase, getCurrentWeekForPhase, getPlanExercisesForWeek
    │   └── constants/
    │       ├── periodization-schemes.js    # 6 PERIODIZATION_SCHEMES
    │       ├── brand.js                    # Colors, phase colors
    │       └── mock-data.js                # MOCK_DATA + generators (dev/offline mode)
    │
    └── styles/
        └── index.css                       # Global CSS (muscle badges, toast, modal, rest-timer, etc.)
```

---

## Service Layer Contracts

### `services/auth.js`

```js
import { sb } from '../lib/supabase'

// Returns { user, session } or throws
export async function signIn(email, password)

// Clears session
export async function signOut()

// Returns session object or null (with 6s timeout)
export async function getCurrentSession()

// Returns { id, name, email, role } or throws (with 8s timeout)
export async function getProfile(userId)
```

### `services/profiles.js`

```js
// Returns profile for current user (sugar over getProfile)
export async function getMyProfile(userId)

// Returns profile for a specific student
export async function getStudentProfile(studentId)

// Returns all student profiles (admin only)
export async function getAllStudents()
```

### `services/programs.js`

```js
// --- Phases ---
export async function getPhasesByStudent(studentId)
export async function createPhase(studentId, { name, startDate, endDate, totalWeeks, status, schemeId })
export async function updatePhase(phaseId, updates)
export async function deletePhase(phaseId)

// --- Plans (workouts within a phase) ---
export async function getPlansByPhase(phaseId)
export async function createPlan(phaseId, { name, dayLabel, muscleGroups })
export async function updatePlan(planId, updates)
export async function deletePlan(planId)

// --- Plan Exercises ---
export async function getExercisesByPlan(planId)
export async function addExerciseToPlan(planId, { exerciseId, restSeconds, notes, order, supersetGroup })
export async function updatePlanExercise(planExerciseId, updates)
export async function removePlanExercise(planExerciseId)
export async function reorderPlanExercises(planId, orderedIds)

// --- Week Configs ---
export async function getWeekConfigs(planExerciseId)
export async function updateWeekConfig(weekConfigId, { sets, repsMin, repsMax, dropSets, suggestedWeight, notes })
export async function bulkUpdateWeekConfigs(planExerciseId, configs)

// --- High-level operations ---
export async function applyTemplateToStudent(templateId, studentId, { name, startDate, endDate })
export async function copyPhaseToStudent(sourcePhaseId, targetStudentId, { name, startDate, endDate })
```

### `services/workouts.js`

```js
// Returns created session { id, studentId, planId, date, ... }
export async function startSession(studentId, planId)

// Logs a single set: { exerciseId, setNumber, repsDone, weightKg, notes }
export async function logSet(sessionId, setData)

// Logs multiple sets at once (batch)
export async function logSets(sessionId, sets)

// Updates session with duration and finishes it
export async function finishSession(sessionId, durationMinutes, notes)

// --- Queries ---
export async function getSessionsByStudent(studentId, { days } = {})
export async function getSessionLogs(sessionId)
export async function getAllSessionLogs(studentId, { days } = {})
export async function getPersonalRecords(studentId)
```

### `services/exercises.js`

```js
export async function listExercises()
export async function listMuscleGroups()
export async function createExercise({ name, muscleGroupId, description })
export async function updateExercise(id, { name, muscleGroupId, description })
export async function deleteExercise(id)
```

### `services/templates.js`

```js
// --- Templates ---
export async function listTemplates()
export async function createTemplate({ name, description, totalWeeks, schemeId })
export async function updateTemplate(id, updates)
export async function deleteTemplate(id)

// --- Template Plans ---
export async function getTemplatePlans(templateId)
export async function createTemplatePlan(templateId, { name, dayLabel })
export async function deleteTemplatePlan(planId)

// --- Template Exercises ---
export async function getTemplateExercises(templatePlanId)
export async function addTemplateExercise(templatePlanId, { exerciseId, restSeconds, notes, order })
export async function removeTemplateExercise(templateExerciseId)

// --- Template Week Configs ---
export async function getTemplateWeekConfigs(templateExerciseId)
export async function bulkUpdateTemplateWeekConfigs(templateExerciseId, configs)
```

### `services/cache.js`

```js
// Bulk-fetches all data for a user on login, populates in-memory store
// Student: phases, plans, exercises, configs, sessions, logs
// Admin: all of the above + all students
export async function loadSupabaseCache(userId, role)

// Persists current in-memory data to localStorage
export async function persistOfflineCache()

// Restores from localStorage when offline
export async function restoreOfflineCache()
```

---

## Auth Context

```jsx
// src/contexts/auth-context.jsx

const AuthContext = React.createContext(null)

export function AuthProvider({ children }) {
  // Manages: user, role, authChecked, dataLoading
  // On mount: getSession() with 6s timeout → restoreSession → loadCache
  // Exposes: { user, role, isAdmin, isStudent, login, logout, dataLoading }
}

export function useAuth() {
  return useContext(AuthContext)
}
```

This replaces the current `App` component's auth state + `userRef` + `restoreSession` logic.

---

## Router

```jsx
// src/app/router.jsx
import { lazy, Suspense } from 'react'

const LoginPage = lazy(() => import('../features/auth/LoginPage'))
const StudentDashboard = lazy(() => import('../features/student/dashboard/Dashboard'))
const TreinoPage = lazy(() => import('../features/student/workouts/TreinoPage'))
const ExecutarTreino = lazy(() => import('../features/student/workouts/ExecutarTreino'))
const HistoricoPage = lazy(() => import('../features/student/history/HistoricoPage'))
const CalendarioPage = lazy(() => import('../features/student/history/CalendarioPage'))
const ProgressoPage = lazy(() => import('../features/student/progress/ProgressoPage'))

const AdminDashboard = lazy(() => import('../features/admin/dashboard/Dashboard'))
const AdminStudents = lazy(() => import('../features/admin/students/StudentsPage'))
const AdminTreinos = lazy(() => import('../features/admin/students/TreinosPage'))
const AdminExercises = lazy(() => import('../features/admin/exercises/ExercisesPage'))
const AdminTemplates = lazy(() => import('../features/admin/templates/TemplatesPage'))

// Hash-based routing (same as V4, but with lazy loading)
export function Router() {
  const { user } = useAuth()
  const [route, params] = useHashRoute()

  // Admin routes load ~0 student code
  // Student routes load ~0 admin code
}
```

---

## Migration Order (Phase 1 — Step by Step)

Following ChatGPT's guardrail: **service contracts before UI moves.**

### Step 1: Scaffold the Vite project
- `npm create vite@latest` with React template
- Copy `vercel.json`, `manifest.json`, `sw.js`, `public/` assets
- Verify `vercel build` still works as static deploy
- **Deliverable**: Empty Vite app deploying to Vercel

### Step 2: Extract `lib/supabase.js`
- Move Supabase URL + ANON_KEY + `createClient` to its own module
- Single export: `sb` (the client instance)
- **Deliverable**: Supabase client importable from anywhere

### Step 3: Extract service layer (the big one)
- Create all 7 service files with real implementations
- Each service imports `sb` from `lib/supabase`
- Each function matches the contracts above
- Keep `MOCK_DATA` as fallback for `!sb` cases (same pattern as V4)
- **Test**: Import services in a scratch component, verify Supabase calls work
- **Deliverable**: All data access behind clean function boundaries

### Step 4: Extract constants + utils
- `PERIODIZATION_SCHEMES` → `shared/constants/periodization-schemes.js`
- `MOCK_DATA` + generators → `shared/constants/mock-data.js`
- Date utils, muscle group helpers, phase helpers → `shared/utils/`
- Icons → `shared/components/icons.jsx`
- **Deliverable**: All non-UI, non-service code extracted

### Step 5: Create AuthContext
- Implement `AuthProvider` wrapping the current auth logic
- Replace `userRef` + manual state with context
- **Deliverable**: Any component can `useAuth()` to get user/role

### Step 6: Move UI into feature folders
- Start with `LoginPage` (simplest, no deep dependencies)
- Then `StudentLayout` + `StudentDashboard`
- Then admin components
- Each component:
  - Convert `React.createElement` back to JSX (Vite handles it)
  - Import services instead of calling `DataService.*` or `sb.from(...)`
  - Import `useAuth()` instead of receiving `user` as prop
- **Deliverable**: All components in feature folders, using services + context

### Step 7: Wire up router with lazy loading
- Implement hash-based router with `React.lazy`
- Admin bundle and student bundle split automatically
- **Deliverable**: Code splitting working, same UX as V4

### Step 8: Fix PWA update strategy
- Update `sw.js` to use `skipWaiting` + `clients.claim` more aggressively
- Add update prompt: "Nova versão disponível — atualizar?"
- **Deliverable**: Users always get latest code without reinstalling PWA

### Step 9: Extract + pre-build styles
- Move inline CSS to `src/styles/index.css`
- Switch from Tailwind CDN to `@tailwindcss/vite` (Tailwind v4)
- Configure `tailwind.config.js` with brand colors
- **Deliverable**: No more runtime Tailwind compilation

---

## What This Achieves

| Before (V4) | After (V5 Phase 1) |
|---|---|
| 5,410 lines in 1 file | ~40 files, avg ~100 lines each |
| No module boundaries | Services layer enforces data access patterns |
| All code loaded always | Lazy loading: students never download admin code |
| Tailwind CDN (runtime) | Pre-built CSS |
| `DataService` monolith | 7 focused service modules |
| Auth state via prop drilling | `useAuth()` context |
| `React.createElement` everywhere | JSX |
| No code splitting | Route-based lazy loading |
| PWA requires reinstall to update | Update prompt on new version |

---

## Phase 2 Preview (after Phase 1 ships)

- TanStack Query for server state (replaces manual cache logic)
- Error boundaries per feature
- Analytics utils extraction
- Pre-built Tailwind (if not done in Phase 1 Step 9)

## Phase 3 Preview

- Offline sync (queue mutations, replay on reconnect)
- Push notifications
- Realtime chat (Supabase Realtime)
- Program versioning (immutable snapshots)
