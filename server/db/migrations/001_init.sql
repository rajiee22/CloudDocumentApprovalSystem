-- CloudDocumentApprovalSystem: initial schema

-- ---------- users ----------
CREATE TABLE users (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email          text NOT NULL,
  password_hash  text NOT NULL,
  name           text NOT NULL,
  role           text NOT NULL CHECK (role IN ('student', 'approver')),
  position       text CHECK (position IN ('Adviser', 'Chairperson', 'College Dean')),
  student_no     text,
  college        text,
  department     text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  -- approvers must have a position; students must not
  CONSTRAINT position_matches_role CHECK (
    (role = 'approver' AND position IS NOT NULL) OR (role = 'student' AND position IS NULL)
  )
);
CREATE UNIQUE INDEX users_email_key ON users (lower(email));

-- ---------- requests ----------
-- Reference numbers look like IIT-2025-1048; the year is added by the app, the number comes from this sequence.
CREATE SEQUENCE request_ref_seq START 1001;

CREATE TABLE requests (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_no   text NOT NULL UNIQUE,
  type           text NOT NULL CHECK (type IN ('Load Revision Form', 'Leave of Absence Form', 'Shifter''s Application Form')),
  student_id     uuid NOT NULL REFERENCES users(id),
  status         text NOT NULL DEFAULT 'Pending'
                 CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Returned for Revision', 'Completed')),
  current_step   integer,            -- step_order of the step whose turn it is; NULL when finished
  return_reason  text,               -- filled when status = 'Returned for Revision' or 'Rejected'
  data           jsonb NOT NULL DEFAULT '{}'::jsonb,  -- the form content (e.g. the Load Revision permit)
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX requests_student_idx ON requests (student_id, created_at DESC);
CREATE INDEX requests_status_idx  ON requests (status);

-- ---------- request_steps: the approval chain, one row per signer ----------
CREATE TABLE request_steps (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id  uuid NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  step_order  integer NOT NULL,
  position    text NOT NULL CHECK (position IN ('Adviser', 'Chairperson', 'College Dean')),
  status      text NOT NULL DEFAULT 'Waiting'
              CHECK (status IN ('Waiting', 'Pending', 'Approved', 'Rejected', 'Returned')),
  acted_by    uuid REFERENCES users(id),   -- the actual person who acted
  comment     text,
  acted_at    timestamptz,
  UNIQUE (request_id, step_order),
  UNIQUE (request_id, position)
);
-- An approver's queue = steps for their position that are Pending
CREATE INDEX request_steps_queue_idx ON request_steps (position, status);

-- ---------- signatures: each approver's saved signature ----------
CREATE TABLE signatures (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  image_data  text NOT NULL,            -- PNG data URL for now; can move to file storage later
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ---------- request_events: audit trail / timeline ----------
CREATE TABLE request_events (
  id          bigserial PRIMARY KEY,
  request_id  uuid NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  actor_id    uuid REFERENCES users(id),
  action      text NOT NULL,            -- e.g. 'submitted', 'approved', 'returned', 'rejected', 'resubmitted'
  comment     text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX request_events_request_idx ON request_events (request_id, created_at);

-- ---------- notifications ----------
CREATE TABLE notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  request_id  uuid REFERENCES requests(id) ON DELETE CASCADE,
  message     text NOT NULL,
  read        boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notifications_user_idx ON notifications (user_id, read, created_at DESC);
