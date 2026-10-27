import bcrypt from "bcryptjs";
import { HttpError } from "../../lib/errors";
import { query } from "../../lib/db";
import { signToken } from "../../lib/jwt";

export type PublicUser = {
  id: string;
  name: string;
  email: string;
  role: "student" | "approver";
  position: "Adviser" | "Chairperson" | "College Dean" | null;
  studentNo: string | null;
  college: string | null;
  department: string | null;
};

const COLUMNS = "id, name, email, role, position, student_no, college, department";

const toPublic = (r: any): PublicUser => ({
  id: r.id, name: r.name, email: r.email, role: r.role, position: r.position,
  studentNo: r.student_no, college: r.college, department: r.department,
});

// Compared against when the email doesn't exist, so "unknown email" and "wrong password"
// take the same time and an attacker can't tell which emails are registered.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 10);

export async function login(email: string, password: string) {
  const { rows } = await query(`SELECT ${COLUMNS}, password_hash FROM users WHERE lower(email) = lower($1)`, [email]);
  const row = rows[0];
  const ok = await bcrypt.compare(password, row?.password_hash ?? DUMMY_HASH);
  if (!row || !ok) throw new HttpError(401, "Invalid email or password");
  return { token: signToken(row.id), user: toPublic(row) };
}

export async function findUserById(id: string): Promise<PublicUser | null> {
  const { rows } = await query(`SELECT ${COLUMNS} FROM users WHERE id = $1`, [id]);
  return rows[0] ? toPublic(rows[0]) : null;
}
