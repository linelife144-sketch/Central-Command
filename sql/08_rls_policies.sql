-- Central Command - Row Level Security Policies

-- Helper function to check if current user has admin role
-- Using SECURITY DEFINER to bypass RLS and avoid recursion
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('SUPER_ADMIN', 'ADMIN')
  );
END;
$$;

-- Grant execute permission on the helper function
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon;

-- Profiles RLS Policies
-- Users can view their own profile
CREATE POLICY profiles_select_own ON profiles
  FOR SELECT USING (id = auth.uid());

-- Admins can view all profiles (using helper function to avoid recursion)
CREATE POLICY profiles_select_admin ON profiles
  FOR SELECT USING (is_admin());

-- Users can update their own profile
CREATE POLICY profiles_update_own ON profiles
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Only admins can insert/delete profiles
CREATE POLICY profiles_insert_admin ON profiles
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY profiles_delete_admin ON profiles
  FOR DELETE USING (is_admin());

-- Subcontractors RLS Policies
-- Users can view their own subcontractor record
CREATE POLICY subcontractors_select_own ON subcontractors
  FOR SELECT USING (profile_id = auth.uid());

-- Admins can view all subcontractor records
CREATE POLICY subcontractors_select_admin ON subcontractors
  FOR SELECT USING (is_admin());

-- Users can update their own subcontractor record
CREATE POLICY subcontractors_update_own ON subcontractors
  FOR UPDATE USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

-- Admins have full access to subcontractors
CREATE POLICY subcontractors_write_admin ON subcontractors
  FOR ALL USING (is_admin());

-- Tickets RLS Policies
-- Users can view tickets assigned to them
CREATE POLICY tickets_select_assigned ON tickets
  FOR SELECT USING (
    assigned_to IN (
      SELECT id FROM subcontractors WHERE profile_id = auth.uid()
    )
  );

-- Admins have full access to tickets
CREATE POLICY tickets_admin ON tickets
  FOR ALL USING (is_admin());

-- Time Entries RLS Policies
-- Users can manage their own time entries
CREATE POLICY time_entries_own ON time_entries
  FOR ALL USING (
    subcontractor_id IN (
      SELECT id FROM subcontractors WHERE profile_id = auth.uid()
    )
  );

-- Admins have full access to time entries
CREATE POLICY time_entries_admin ON time_entries
  FOR ALL USING (is_admin());

-- Expense Reports RLS Policies
-- Users can manage their own expense reports
CREATE POLICY expense_reports_own ON expense_reports
  FOR ALL USING (
    subcontractor_id IN (
      SELECT id FROM subcontractors WHERE profile_id = auth.uid()
    )
  );

-- Admins have full access to expense reports
CREATE POLICY expense_reports_admin ON expense_reports
  FOR ALL USING (is_admin());

-- Expense Items RLS Policies (inherit from parent report)
CREATE POLICY expense_items_own ON expense_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM expense_reports er
      JOIN subcontractors s ON er.subcontractor_id = s.id
      WHERE expense_items.expense_report_id = er.id
      AND s.profile_id = auth.uid()
    )
  );

CREATE POLICY expense_items_admin ON expense_items
  FOR ALL USING (is_admin());

-- Damage Assessments RLS Policies
CREATE POLICY damage_assessments_own ON damage_assessments
  FOR ALL USING (
    subcontractor_id IN (
      SELECT id FROM subcontractors WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY damage_assessments_admin ON damage_assessments
  FOR ALL USING (is_admin());

-- Equipment Assessments RLS Policies
CREATE POLICY equipment_assessments_own ON equipment_assessments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM damage_assessments da
      JOIN subcontractors s ON da.subcontractor_id = s.id
      WHERE equipment_assessments.damage_assessment_id = da.id
      AND s.profile_id = auth.uid()
    )
  );

CREATE POLICY equipment_assessments_admin ON equipment_assessments
  FOR ALL USING (is_admin());

-- Subcontractor Rates RLS Policies
CREATE POLICY rates_own ON subcontractor_rates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM subcontractors s
      WHERE subcontractor_rates.subcontractor_id = s.id
      AND s.profile_id = auth.uid()
    )
  );

CREATE POLICY rates_admin ON subcontractor_rates
  FOR ALL USING (is_admin());

-- Subcontractor Banking RLS Policies
CREATE POLICY banking_own ON subcontractor_banking
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM subcontractors s
      WHERE subcontractor_banking.subcontractor_id = s.id
      AND s.profile_id = auth.uid()
    )
  );

CREATE POLICY banking_admin ON subcontractor_banking
  FOR ALL USING (is_admin());

-- Subcontractor Invoices RLS Policies
CREATE POLICY invoices_own ON subcontractor_invoices
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM subcontractors s
      WHERE subcontractor_invoices.subcontractor_id = s.id
      AND s.profile_id = auth.uid()
    )
  );

CREATE POLICY invoices_admin ON subcontractor_invoices
  FOR ALL USING (is_admin());

-- Invoice Line Items RLS Policies
CREATE POLICY invoice_line_items_own ON invoice_line_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM subcontractor_invoices si
      JOIN subcontractors s ON si.subcontractor_id = s.id
      WHERE invoice_line_items.invoice_id = si.id
      AND s.profile_id = auth.uid()
    )
  );

CREATE POLICY invoice_line_items_admin ON invoice_line_items
  FOR ALL USING (is_admin());

-- Media Assets RLS Policies
-- Users can view their own uploaded media
CREATE POLICY media_select_own ON media_assets
  FOR SELECT USING (uploaded_by = auth.uid());

-- Users can view media related to their tickets/assessments
CREATE POLICY media_select_assigned ON media_assets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tickets t
      JOIN subcontractors s ON t.assigned_to = s.id
      WHERE media_assets.entity_id = t.id
      AND media_assets.entity_type = 'ticket'
      AND s.profile_id = auth.uid()
    )
  );

-- Admins have full access to media
CREATE POLICY media_admin ON media_assets
  FOR ALL USING (is_admin());

-- Audit Logs RLS Policies (read-only for admins)
CREATE POLICY audit_logs_admin ON audit_logs
  FOR SELECT USING (is_admin());

-- Audit logs are system-generated, no user inserts/updates
CREATE POLICY audit_logs_no_insert ON audit_logs
  FOR INSERT WITH CHECK (false);

CREATE POLICY audit_logs_no_update ON audit_logs
  FOR UPDATE USING (false);

CREATE POLICY audit_logs_no_delete ON audit_logs
  FOR DELETE USING (false);

-- Notification Logs RLS Policies
CREATE POLICY notifications_own ON notification_logs
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY notifications_admin ON notification_logs
  FOR ALL USING (is_admin());

-- Sync Queue RLS Policies
CREATE POLICY sync_queue_own ON sync_queue
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY sync_queue_admin ON sync_queue
  FOR ALL USING (is_admin());

-- Tax 1099 Tracking RLS Policies
CREATE POLICY tax_1099_own ON tax_1099_tracking
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM subcontractors s
      WHERE tax_1099_tracking.subcontractor_id = s.id
      AND s.profile_id = auth.uid()
    )
  );

CREATE POLICY tax_1099_admin ON tax_1099_tracking
  FOR ALL USING (is_admin());

-- Ticket Status History RLS Policies
CREATE POLICY ticket_status_history_own ON ticket_status_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tickets t
      JOIN subcontractors s ON t.assigned_to = s.id
      WHERE ticket_status_history.ticket_id = t.id
      AND s.profile_id = auth.uid()
    )
  );

CREATE POLICY ticket_status_history_admin ON ticket_status_history
  FOR ALL USING (is_admin());

-- Ticket Routes RLS Policies
CREATE POLICY ticket_routes_own ON ticket_routes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tickets t
      JOIN subcontractors s ON t.assigned_to = s.id
      WHERE t.id = ANY(ticket_routes.ticket_ids)
      AND s.profile_id = auth.uid()
    )
  );

CREATE POLICY ticket_routes_admin ON ticket_routes
  FOR ALL USING (is_admin());

-- Reference Tables (read-only for all authenticated users)
CREATE POLICY equipment_types_read ON equipment_types
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY hazard_categories_read ON hazard_categories
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY wire_sizes_read ON wire_sizes
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY expense_policies_read ON expense_policies
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow admin write access to reference tables
CREATE POLICY equipment_types_admin ON equipment_types
  FOR ALL USING (is_admin());

CREATE POLICY hazard_categories_admin ON hazard_categories
  FOR ALL USING (is_admin());

CREATE POLICY wire_sizes_admin ON wire_sizes
  FOR ALL USING (is_admin());

CREATE POLICY expense_policies_admin ON expense_policies
  FOR ALL USING (is_admin());
