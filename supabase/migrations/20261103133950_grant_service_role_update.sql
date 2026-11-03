-- Grant UPDATE to service_role so the server-side gameplay loop can write stat changes.
-- The prior grant migration gave only INSERT + SELECT; UPDATE was missing.
GRANT UPDATE ON public.student_simulation_states TO service_role;
GRANT UPDATE ON public.students TO service_role;
