// In-memory data store — replaces V4's MOCK_DATA global
// Services read/write this. Will be replaced by TanStack Query in Phase 2.
// Defaults are placeholders; loadSupabaseCache() overwrites with real data on login.
export const store = {
  users: [],
  muscle_groups: [],
  exercises: [],
  templates: [],
  template_plans: [],
  template_exercises: [],
  template_week_configs: [],
  training_phases: [],
  training_plans: [],
  plan_exercises: [],
  week_configs: [],
  workout_sessions: [],
  session_logs: [],
}
