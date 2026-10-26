// Shared types. They double as the API contract: the backend returns these shapes.
export type Role = "student" | "approver";
export type Page =
  | "login"
  | "dashboard"
  | "new"
  | "form"
  | "requests"
  | "detail"
  | "review"
  | "signature"
  | "notifications"
  | "settings";
export type Status = "Pending" | "Approved" | "Rejected" | "Returned for Revision" | "Completed";

export type SubjectRow = {
  course: string;
  title: string;
  units: string;
  closed?: boolean;
};

export type LoadRevisionPermit = {
  term: "1st Semester" | "2nd Semester" | "Summer Term";
  schoolYear: string;
  familyName: string;
  givenName: string;
  middleName: string;
  studentId: string;
  permitDate: string;
  college: string;
  department: string;
  courseYear: string;
  withdraw: SubjectRow[];
  add: SubjectRow[];
  loadBeforeUnits: string;
  loadBeforeHours: string;
  loadAfterUnits: string;
  loadAfterHours: string;
  conflict: boolean;
  dissolved: boolean;
  otherReason: string;
  studentSignature: string;
  signatures: Record<string, string>;
};

export type RequestItem = {
  id: string;
  type: string;
  student: string;
  date: string;
  stage: string;
  status: Status;
  reason?: string;
  permit?: LoadRevisionPermit;
};

export type Position = "Adviser" | "Chairperson" | "College Dean";

/** The signed-in user, as returned by the API (never includes the password). */
export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  position: Position | null;
  studentNo: string | null;
  college: string | null;
  department: string | null;
};
