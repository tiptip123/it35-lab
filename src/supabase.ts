import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qeuignqfwdwvejqndojs.supabase.co'; 
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFldWlnbnFmd2R3dmVqcW5kb2pzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI3Mzg0MjIsImV4cCI6MjA1ODMxNDQyMn0.q-IOt7mWr22VWjv_plW1h9GHrA-KSrjfQVLFVVEJXrg'; 

export const supabase = createClient(supabaseUrl, supabaseKey);