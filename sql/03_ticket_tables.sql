-- Central Command - Ticket System Tables

-- Tickets table
CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number VARCHAR(50) NOT NULL UNIQUE,
  
  -- Status
  status ticket_status NOT NULL DEFAULT 'DRAFT',
  priority priority_level NOT NULL DEFAULT 'C',
  
  -- Location
  address TEXT NOT NULL,
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(2),
  zip_code VARCHAR(10),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  geofence_radius_meters INTEGER DEFAULT 500,
  
  -- Assignment
  assigned_to UUID REFERENCES contractors(id),
  assigned_by UUID REFERENCES profiles(id),
  assigned_at TIMESTAMPTZ,
  
  -- Timing
  created_at TIMESTAMPTZ DEFAULT NOW(),
  scheduled_date DATE,
  due_date DATE,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Client Info
  utility_client VARCHAR(255) NOT NULL,
  work_order_ref VARCHAR(100),
  client_contact_name VARCHAR(100),
  client_contact_phone VARCHAR(20),
  
  -- Work Details
  work_description TEXT,
  special_instructions TEXT,
  
  -- Damage Classification
  damage_types VARCHAR(100)[],
  severity VARCHAR(20),
  
  -- Route Optimization
  route_order INTEGER,
  route_batch_id UUID,
  estimated_travel_time INTEGER,
  
  -- Metadata
  created_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id),
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES profiles(id)
);

-- Enable RLS
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_assigned ON tickets(assigned_to);
CREATE INDEX idx_tickets_priority ON tickets(priority);
CREATE INDEX idx_tickets_client ON tickets(utility_client);
CREATE INDEX idx_tickets_scheduled ON tickets(scheduled_date);
CREATE INDEX idx_tickets_coordinates ON tickets USING GIST (
  point(longitude, latitude)
);

-- Ticket Status History
CREATE TABLE ticket_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  
  -- Status Change
  from_status ticket_status,
  to_status ticket_status NOT NULL,
  
  -- Who/When
  changed_by UUID REFERENCES profiles(id),
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Location Context
  gps_latitude DECIMAL(10, 8),
  gps_longitude DECIMAL(11, 8),
  gps_accuracy DECIMAL(8, 2),
  
  -- Device Context
  ip_address INET,
  user_agent TEXT,
  device_fingerprint VARCHAR(255),
  
  -- Reason
  change_reason TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE ticket_status_history ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_status_history_ticket ON ticket_status_history(ticket_id);
CREATE INDEX idx_status_history_changed ON ticket_status_history(changed_at);

-- Ticket Routes (Route Optimization)
CREATE TABLE ticket_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_name VARCHAR(255) NOT NULL,
  
  -- Assignment
  assigned_to UUID REFERENCES contractors(id),
  assigned_by UUID REFERENCES profiles(id),
  assigned_at TIMESTAMPTZ,
  
  -- Route Details
  ticket_ids UUID[] NOT NULL,
  total_distance_miles DECIMAL(8, 2),
  estimated_duration_minutes INTEGER,
  
  -- Optimization
  optimization_type VARCHAR(20),
  
  -- Status
  status VARCHAR(20) DEFAULT 'PENDING',
  
  -- Timing
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Metadata
  created_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE ticket_routes ENABLE ROW LEVEL SECURITY;
