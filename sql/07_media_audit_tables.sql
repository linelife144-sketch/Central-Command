-- Central Command - Media & Audit Tables

-- Media Assets
CREATE TABLE media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Ownership
  uploaded_by UUID REFERENCES profiles(id),
  subcontractor_id UUID REFERENCES subcontractors(id),
  
  -- File Info
  file_name VARCHAR(255) NOT NULL,
  original_name VARCHAR(255),
  file_type media_type NOT NULL,
  mime_type VARCHAR(100),
  file_size_bytes INTEGER,
  
  -- Storage
  storage_bucket VARCHAR(100) NOT NULL,
  storage_path TEXT NOT NULL,
  public_url TEXT,
  thumbnail_url TEXT,
  
  -- EXIF Data (for photos)
  exif_data JSONB,
  captured_at TIMESTAMPTZ,
  gps_latitude DECIMAL(10, 8),
  gps_longitude DECIMAL(11, 8),
  gps_accuracy DECIMAL(8, 2),
  
  -- Verification
  checksum_sha256 VARCHAR(64),
  
  -- Context
  entity_type VARCHAR(50),
  entity_id UUID,
  
  -- Status
  upload_status VARCHAR(20) DEFAULT 'PENDING',
  
  -- Retention
  retention_until DATE,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE media_assets ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_media_uploader ON media_assets(uploaded_by);
CREATE INDEX idx_media_entity ON media_assets(entity_type, entity_id);

-- Audit Logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Action Details
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id UUID,
  
  -- User Context
  user_id UUID REFERENCES profiles(id),
  user_role user_role,
  
  -- Change Details
  old_values JSONB,
  new_values JSONB,
  change_summary TEXT,
  
  -- Context
  ip_address INET,
  user_agent TEXT,
  session_id VARCHAR(255),
  
  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_date DATE DEFAULT CURRENT_DATE
);

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_created ON audit_logs(created_at);

-- Notification Logs
CREATE TABLE notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Recipient
  user_id UUID NOT NULL REFERENCES profiles(id),
  
  -- Notification Details
  notification_type notification_type NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  data JSONB,
  
  -- Delivery
  channel VARCHAR(20),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  
  -- Status
  status VARCHAR(20) DEFAULT 'SENT',
  error_message TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

-- Sync Queue (Offline Support)
CREATE TABLE sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Operation
  operation VARCHAR(20) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id UUID NOT NULL,
  
  -- Data
  payload JSONB NOT NULL,
  
  -- Ownership
  user_id UUID NOT NULL REFERENCES profiles(id),
  device_id VARCHAR(255),
  
  -- Status
  status VARCHAR(20) DEFAULT 'PENDING',
  attempt_count INTEGER DEFAULT 0,
  last_error TEXT,
  
  -- Timing
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  
  -- Retry
  retry_after TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE sync_queue ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_sync_user ON sync_queue(user_id);
CREATE INDEX idx_sync_status ON sync_queue(status);
