-- Create security_incidents table
CREATE TABLE IF NOT EXISTS security_incidents (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_email TEXT NOT NULL,
    type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    description TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES auth.users(id)
);

-- Create locked_users table
CREATE TABLE IF NOT EXISTS locked_users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    locked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    attempts INTEGER NOT NULL DEFAULT 0,
    unlocked_at TIMESTAMP WITH TIME ZONE,
    unlocked_by UUID REFERENCES auth.users(id)
);

-- Create RLS policies for security_incidents
ALTER TABLE security_incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all incidents"
    ON security_incidents FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND auth.users.email = 'admin'
        )
    );

CREATE POLICY "Admins can insert incidents"
    ON security_incidents FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND auth.users.email = 'admin'
        )
    );

-- Create RLS policies for locked_users
ALTER TABLE locked_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all locked users"
    ON locked_users FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND auth.users.email = 'admin'
        )
    );

CREATE POLICY "Admins can manage locked users"
    ON locked_users FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND auth.users.email = 'admin'
        )
    );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_security_incidents_timestamp ON security_incidents(timestamp);
CREATE INDEX IF NOT EXISTS idx_locked_users_email ON locked_users(email);
CREATE INDEX IF NOT EXISTS idx_locked_users_locked_at ON locked_users(locked_at); 