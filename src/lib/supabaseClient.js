import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ifeiftlrgtitvrsilztg.supabase.co'; // Replace with your Project URL
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmZWlmdGxyZ3RpdHZyc2lsenRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE3MzM0NjMsImV4cCI6MjA2NzMwOTQ2M30.jjqQMY8S7uEV4SuuIWMsg5yfhDs677giWEIL34sgUGk'; // Replace with anon key

export const supabase = createClient(supabaseUrl, supabaseKey);
