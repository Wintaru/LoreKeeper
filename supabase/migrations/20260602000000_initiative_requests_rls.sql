-- Enable RLS on initiative_requests (was missing from original migration)

ALTER TABLE initiative_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "initiative_requests_select" ON initiative_requests
  FOR SELECT USING (true);

CREATE POLICY "initiative_requests_insert" ON initiative_requests
  FOR INSERT WITH CHECK ((SELECT auth.role()) = 'service_role');

CREATE POLICY "initiative_requests_update" ON initiative_requests
  FOR UPDATE USING ((SELECT auth.role()) = 'service_role');

CREATE POLICY "initiative_requests_delete" ON initiative_requests
  FOR DELETE USING ((SELECT auth.role()) = 'service_role');
