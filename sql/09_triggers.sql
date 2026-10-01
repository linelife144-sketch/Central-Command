-- Central Command - Database Triggers & Functions

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all tables
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contractors_updated_at
  BEFORE UPDATE ON contractors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tickets_updated_at
  BEFORE UPDATE ON tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_time_entries_updated_at
  BEFORE UPDATE ON time_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to log ticket status changes
CREATE OR REPLACE FUNCTION log_ticket_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO ticket_status_history (
      ticket_id,
      from_status,
      to_status,
      changed_by,
      changed_at
    ) VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      auth.uid(),
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ticket_status_change_trigger
  AFTER UPDATE ON tickets
  FOR EACH ROW EXECUTE FUNCTION log_ticket_status_change();

-- Function to update expense report totals
CREATE OR REPLACE FUNCTION update_expense_report_total()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE expense_reports
  SET 
    total_amount = (
      SELECT COALESCE(SUM(amount), 0) 
      FROM expense_items 
      WHERE expense_report_id = COALESCE(NEW.expense_report_id, OLD.expense_report_id)
    ),
    item_count = (
      SELECT COUNT(*) 
      FROM expense_items 
      WHERE expense_report_id = COALESCE(NEW.expense_report_id, OLD.expense_report_id)
    ),
    mileage_total = (
      SELECT COALESCE(SUM(mileage_end - mileage_start), 0)
      FROM expense_items 
      WHERE expense_report_id = COALESCE(NEW.expense_report_id, OLD.expense_report_id)
      AND category = 'MILEAGE'
    ),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.expense_report_id, OLD.expense_report_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER expense_item_change_trigger
  AFTER INSERT OR UPDATE OR DELETE ON expense_items
  FOR EACH ROW EXECUTE FUNCTION update_expense_report_total();

-- Function to generate ticket number
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ticket_number IS NULL THEN
    NEW.ticket_number := 'GES-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(NEXTVAL('ticket_number_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create sequence for ticket numbers
CREATE SEQUENCE IF NOT EXISTS ticket_number_seq START 1;

CREATE TRIGGER ticket_number_trigger
  BEFORE INSERT ON tickets
  FOR EACH ROW EXECUTE FUNCTION generate_ticket_number();
