-- Check if RLS is enabled on profiles
SELECT relname, relrowsecurity 
FROM pg_class 
WHERE relname = 'profiles';

-- Check existing policies
SELECT * FROM pg_policies 
WHERE tablename = 'profiles';
