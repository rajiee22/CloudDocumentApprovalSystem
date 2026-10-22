// DEV ONLY: wipes the tables and inserts demo users + one sample Load Revision request.
// All demo accounts use the password "password123". The approver names are made up.
import bcrypt from "bcryptjs";
import { env } from "../config/env";
import { pool, withTransaction } from "../lib/db";
import { buildSteps } from "../lib/workflow";

const PASSWORD = "password123";

const samplePermit = {
  term: "2nd Semester",
  schoolYear: "2024–2025",
  familyName: "Santos",
  givenName: "Andrea",
  middleName: "M.",
  studentId: "2021-1234",
  permitDate: "2025-05-26",
  college: "College of Computer Studies",
  department: "Information Technology Department",
  courseYear: "BS Information Technology – 4th Year",
  withdraw: [{ course: "IT 138 – A", title: "Information Assurance and Security", units: "3" }],
  add: [{ course: "IT 141 – B", title: "Systems Integration and Architecture", units: "3", closed: false }],
  loadBeforeUnits: "18",
  loadBeforeHours: "21",
  loadAfterUnits: "18",
  loadAfterHours: "21",
  conflict: true,
  dissolved: false,
  otherReason: "",
};

async function seed() {
  if (env.NODE_ENV === "production") throw new Error("Refusing to seed a production database.");
  const hash = await bcrypt.hash(PASSWORD, 10);

  await withTransaction(async db => {
    await db.query(
      "TRUNCATE notifications, request_events, request_steps, signatures, requests, users RESTART IDENTITY CASCADE");

    const insertUser = async (u: { email: string; name: string; role: string; position?: string; studentNo?: string }) =>
      (await db.query(
        `INSERT INTO users (email, password_hash, name, role, position, student_no, college, department)
         VALUES ($1,$2,$3,$4,$5,$6,'College of Computer Studies','Information Technology Department') RETURNING id`,
        [u.email, hash, u.name, u.role, u.position ?? null, u.studentNo ?? null])).rows[0].id as string;

    const studentId = await insertUser({ email: "andrea.santos@g.msuiit.edu.ph", name: "Andrea M. Santos", role: "student", studentNo: "2021-1234" });
    const adviserId = await insertUser({ email: "ramon.flores@msuiit.edu.ph", name: "Prof. Ramon C. Flores", role: "approver", position: "Adviser" });
    await insertUser({ email: "maria.reyes@msuiit.edu.ph", name: "Dr. Maria L. Reyes", role: "approver", position: "Chairperson" });
    await insertUser({ email: "jose.villanueva@msuiit.edu.ph", name: "Dr. Jose P. Villanueva", role: "approver", position: "College Dean" });

    // Sample request IIT-2025-1048: submitted, Adviser has already signed, now waiting on the Chairperson.
    const type = "Load Revision Form";
    const req = await db.query(
      `INSERT INTO requests (reference_no, type, student_id, status, current_step, data, created_at)
       VALUES ('IIT-2025-1048', $1, $2, 'Pending', 2, $3, '2025-05-22') RETURNING id`,
      [type, studentId, JSON.stringify(samplePermit)]);
    const requestId = req.rows[0].id as string;

    for (const s of buildSteps(type)) {
      const adviserDone = s.stepOrder === 1;
      await db.query(
        `INSERT INTO request_steps (request_id, step_order, position, status, acted_by, acted_at)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [requestId, s.stepOrder, s.position,
         adviserDone ? "Approved" : s.stepOrder === 2 ? "Pending" : "Waiting",
         adviserDone ? adviserId : null, adviserDone ? "2025-05-23" : null]);
    }
    await db.query(
      `INSERT INTO request_events (request_id, actor_id, action, created_at) VALUES
       ($1,$2,'submitted','2025-05-22'), ($1,$3,'approved','2025-05-23')`, [requestId, studentId, adviserId]);

    // Keep the reference-number sequence ahead of the hand-written 1048.
    await db.query("SELECT setval('request_ref_seq', 1048)");
  });

  console.log(`Seeded. Log in with any seeded email and password "${PASSWORD}".`);
}

seed()
  .catch(err => { console.error(err); process.exitCode = 1; })
  .finally(() => pool.end());
