ALTER TABLE student_simulation_states RENAME COLUMN hygiene TO health;
ALTER TABLE student_simulation_states RENAME COLUMN fun    TO morale;
UPDATE student_simulation_states SET morale = ROUND((morale + social) / 2.0, 2);
ALTER TABLE student_simulation_states DROP COLUMN social;
ALTER TABLE student_simulation_states DROP COLUMN bladder;
