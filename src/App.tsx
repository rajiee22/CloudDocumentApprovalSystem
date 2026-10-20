import { FormEvent, ReactNode, useMemo, useState } from "react";

type Role = "student" | "approver";
type Page =
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
type Status = "Pending" | "Approved" | "Rejected" | "Returned for Revision" | "Completed";

type SubjectRow = {
  course: string;
  title: string;
  units: string;
  closed?: boolean;
};

type LoadRevisionPermit = {
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

type RequestItem = {
  id: string;
  type: string;
  student: string;
  date: string;
  stage: string;
  status: Status;
  reason?: string;
  permit?: LoadRevisionPermit;
};

const defaultPermit: LoadRevisionPermit = {
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
  studentSignature: "Andrea M. Santos",
  signatures: { Adviser: "Prof. Ramon C. Flores" },
};

const isLoadRevision = (type: string) => type.includes("Load Revision");

const requestsSeed: RequestItem[] = [
  { id: "IIT-2025-1048", type: "Load Revision Form", student: "Andrea M. Santos", date: "May 22, 2025", stage: "College Dean", status: "Pending" },
  { id: "IIT-2025-1031", type: "Leave of Absence Form", student: "Andrea M. Santos", date: "May 18, 2025", stage: "Final Approval", status: "Approved" },
  { id: "IIT-2025-0987", type: "Shifter's Application Form", student: "Andrea M. Santos", date: "May 08, 2025", stage: "Student Revision", status: "Returned for Revision", reason: "Please attach a clearer statement explaining your intended program." },
  { id: "IIT-2025-0912", type: "Load Revision Form", student: "Andrea M. Santos", date: "Apr 27, 2025", stage: "Completed", status: "Completed" },
];

const approvalQueue: RequestItem[] = [
  { id: "IIT-2025-1056", type: "Leave of Absence Form", student: "Miguel A. Ramos", date: "May 24, 2025", stage: "Department Chair", status: "Pending" },
  { id: "IIT-2025-1052", type: "Load Revision Form", student: "Patricia L. Cruz", date: "May 23, 2025", stage: "Department Chair", status: "Pending" },
  { id: "IIT-2025-1048", type: "Load Revision Form", student: "Andrea M. Santos", date: "May 22, 2025", stage: "Department Chair", status: "Pending" },
];

const icons: Record<string, ReactNode> = {
  grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
  plus: <><path d="M12 5v14M5 12h14"/></>,
  file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"/></>,
  user: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1z"/></>,
  check: <><path d="m5 12 4 4L19 6"/></>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  x: <><path d="m7 7 10 10M17 7 7 17"/></>,
  rotate: <><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></>,
  search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
  chevron: <><path d="m9 18 6-6-6-6"/></>,
  arrow: <><path d="m19 12-7-7M19 12l-7 7M19 12H5"/></>,
  download: <><path d="M12 3v12M7 10l5 5 5-5M4 21h16"/></>,
  pen: <><path d="m3 21 3.8-1 12-12a2.1 2.1 0 0 0-3-3l-12 12L3 21zM14 7l3 3"/></>,
  logout: <><path d="M10 17l5-5-5-5M15 12H3M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/></>,
  menu: <><path d="M4 7h16M4 12h16M4 17h16"/></>,
  eye: <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="2.5"/></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></>,
  upload: <><path d="M12 16V4M7 9l5-5 5 5M4 20h16"/></>,
};

function Icon({ name, size = 20 }: { name: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{icons[name]}</svg>;
}

function Button({ children, variant = "primary", icon, onClick, type = "button", disabled, className = "" }: { children: ReactNode; variant?: "primary" | "secondary" | "ghost" | "danger" | "success"; icon?: string; onClick?: () => void; type?: "button" | "submit"; disabled?: boolean; className?: string }) {
  return <button className={`btn btn-${variant} ${className}`} onClick={onClick} type={type} disabled={disabled}>{icon && <Icon name={icon} size={17}/>}<span>{children}</span></button>;
}

function StatusBadge({ status }: { status: Status }) {
  const icon = status === "Approved" || status === "Completed" ? "check" : status === "Rejected" ? "x" : status === "Returned for Revision" ? "rotate" : "clock";
  return <span className={`status status-${status.toLowerCase().replaceAll(" ", "-")}`}><Icon name={icon} size={13}/>{status}</span>;
}

function Logo({ light = false }: { light?: boolean }) {
  return <div className={`logo ${light ? "logo-light" : ""}`}><div className="seal"><span>MSU</span><b>IIT</b></div><div><strong>MSU–IIT</strong><small>Document Services</small></div></div>;
}

const studentNav = [
  ["dashboard", "grid", "Dashboard"],
  ["new", "plus", "New Request"],
  ["requests", "file", "My Requests"],
  ["notifications", "bell", "Notifications"],
  ["settings", "settings", "Profile & Settings"],
];
const approverNav = [
  ["dashboard", "grid", "Dashboard"],
  ["requests", "clock", "Pending Approvals"],
  ["requests", "file", "Processed Requests"],
  ["signature", "pen", "My E-Signature"],
  ["notifications", "bell", "Notifications"],
  ["settings", "settings", "Profile & Settings"],
];

function Sidebar({ role, page, navigate, open, close }: { role: Role; page: Page; navigate: (p: Page) => void; open: boolean; close: () => void }) {
  const nav = role === "student" ? studentNav : approverNav;
  return <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
    <div className="sidebar-head"><Logo light/><button className="mobile-close" onClick={close} aria-label="Close menu"><Icon name="x"/></button></div>
    <div className="role-label">{role === "student" ? "Student Portal" : "Approver Workspace"}</div>
    <nav>{nav.map(([target, icon, label], i) => <button key={`${label}-${i}`} className={(page === target && !(i === 2 && role === "approver")) ? "nav-active" : ""} onClick={() => { navigate(target as Page); close(); }}><Icon name={icon}/><span>{label}</span>{label === "Notifications" && <em>3</em>}</button>)}</nav>
    <div className="sidebar-support"><div className="support-icon">?</div><strong>Need help?</strong><p>Visit the service guide or contact ICTC support.</p><button>View support center <Icon name="arrow" size={14}/></button></div>
    <button className="signout" onClick={() => navigate("login")}><Icon name="logout"/><span>Sign out</span></button>
  </aside>;
}

function Shell({ children, role, page, navigate, title, subtitle }: { children: ReactNode; role: Role; page: Page; navigate: (p: Page) => void; title: string; subtitle: string }) {
  const [menu, setMenu] = useState(false);
  return <div className="app-shell">
    <Sidebar role={role} page={page} navigate={navigate} open={menu} close={() => setMenu(false)}/>
    {menu && <div className="scrim" onClick={() => setMenu(false)}/>}
    <main className="main">
      <header className="topbar">
        <button className="menu-btn" onClick={() => setMenu(true)} aria-label="Open menu"><Icon name="menu"/></button>
        <div className="page-heading"><h1>{title}</h1><p>{subtitle}</p></div>
        <div className="top-actions">
          <button className="icon-btn" onClick={() => navigate("notifications")} aria-label="Notifications"><Icon name="bell"/><i/></button>
          <div className="profile"><div className="avatar">{role === "student" ? "AS" : "EV"}</div><div><strong>{role === "student" ? "Andrea Santos" : "Dr. Elena Villanueva"}</strong><small>{role === "student" ? "BS Information Technology" : "Department Chair"}</small></div><Icon name="chevron" size={15}/></div>
        </div>
      </header>
      <div className="content">{children}</div>
    </main>
  </div>;
}

function Login({ onLogin }: { onLogin: (role: Role) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState(false);
  function submit(e: FormEvent) {
    e.preventDefault();
    if (!email.endsWith("@g.msuiit.edu.ph") || !password) setError(true);
    else onLogin(email.includes("approver") ? "approver" : "student");
  }
  return <div className="login-page">
    <section className="login-story">
      <div className="story-overlay"/>
      <div className="story-content"><Logo light/><div className="story-copy"><span className="eyebrow light">A better way to move documents forward</span><h1>Approvals, made simpler.</h1><p>Submit university documents, follow every approval, and keep your academic requests moving—wherever you are.</p><div className="trust-row"><span><Icon name="check" size={16}/> Transparent tracking</span><span><Icon name="check" size={16}/> Secure e-signatures</span></div></div><small className="copyright">© 2025 Mindanao State University – Iligan Institute of Technology</small></div>
    </section>
    <section className="login-panel">
      <div className="login-box">
        <div className="mobile-logo"><Logo/></div>
        <span className="eyebrow">Welcome to Document Services</span>
        <h2>Sign in to your account</h2><p className="muted">Use your official MSU-IIT university credentials.</p>
        <form onSubmit={submit}>
          <label>University email</label>
          <div className={`field-icon ${error ? "field-error" : ""}`}><Icon name="mail" size={18}/><input type="email" value={email} onChange={e => {setEmail(e.target.value); setError(false)}} placeholder="name@g.msuiit.edu.ph"/></div>
          {error && <div className="error-text">Enter a valid MSU-IIT email and password.</div>}
          <div className="label-row"><label>Password</label><button type="button">Forgot password?</button></div>
          <div className="field-icon"><Icon name="user" size={18}/><input type={show ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password"/><button type="button" className="show-pass" onClick={() => setShow(!show)}><Icon name="eye" size={18}/></button></div>
          <Button type="submit" className="full">Sign in <Icon name="arrow" size={17}/></Button>
        </form>
        <div className="divider"><span>Prototype access</span></div>
        <div className="demo-buttons"><Button variant="secondary" onClick={() => onLogin("student")}><Icon name="user" size={17}/> Preview Student</Button><Button variant="secondary" onClick={() => onLogin("approver")}><Icon name="file" size={17}/> Preview Approver</Button></div>
        <p className="privacy">By signing in, you agree to the university's acceptable use and data privacy policies.</p>
      </div>
    </section>
  </div>;
}

function StatCard({ label, value, icon, tone, trend }: { label: string; value: number; icon: string; tone: string; trend?: string }) {
  return <div className="stat-card"><div className={`stat-icon ${tone}`}><Icon name={icon}/></div><div><p>{label}</p><strong>{value}</strong>{trend && <small>{trend}</small>}</div></div>;
}

function RequestTable({ data, onOpen, approver = false }: { data: RequestItem[]; onOpen: (r: RequestItem) => void; approver?: boolean }) {
  return <div className="table-wrap"><table><thead><tr><th>Reference</th>{approver && <th>Student</th>}<th>Document type</th><th>Submitted</th><th>{approver ? "Status" : "Current stage"}</th><th>Status</th><th><span className="sr-only">Action</span></th></tr></thead>
  <tbody>{data.map((r, index) => <tr key={`${r.id}-${r.type}-${r.date}-${index}`} onClick={() => onOpen(r)}><td><strong className="ref">{r.id}</strong></td>{approver && <td><div className="student-cell"><span>{r.student.split(" ").map(x => x[0]).slice(0,2).join("")}</span><strong>{r.student}</strong></div></td>}<td><div className="doc-cell"><span><Icon name="file" size={17}/></span>{r.type}</div></td><td>{r.date}</td><td>{approver ? <span className="priority"><i/>Awaiting review</span> : r.stage}</td><td><StatusBadge status={r.status}/></td><td><button className="row-action" aria-label="View request"><Icon name="chevron" size={17}/></button></td></tr>)}</tbody></table></div>;
}

function StudentDashboard({ navigate, open }: { navigate: (p: Page) => void; open: (r: RequestItem) => void }) {
  return <>
    <div className="welcome-row"><div><span className="eyebrow">Monday, May 26</span><h2>Good morning, Andrea.</h2><p>You have one document currently waiting for approval.</p></div><Button icon="plus" onClick={() => navigate("new")}>New document request</Button></div>
    <div className="stats-grid"><StatCard label="Total requests" value={12} icon="file" tone="tone-maroon" trend="+2 this semester"/><StatCard label="Pending" value={3} icon="clock" tone="tone-amber"/><StatCard label="Approved" value={7} icon="check" tone="tone-green"/><StatCard label="Returned / Rejected" value={2} icon="rotate" tone="tone-red"/></div>
    <div className="dashboard-grid">
      <section className="card table-card"><div className="card-head"><div><h3>Recent document requests</h3><p>Your latest submissions and their current progress.</p></div><Button variant="ghost" onClick={() => navigate("requests")}>View all <Icon name="arrow" size={15}/></Button></div><RequestTable data={requestsSeed.slice(0, 4)} onOpen={open}/></section>
      <aside className="card progress-card"><div className="card-head"><div><h3>Active request</h3><p>IIT-2025-1048</p></div><StatusBadge status="Pending"/></div><div className="active-document"><div className="doc-big"><Icon name="file"/></div><div><strong>Load Revision Form</strong><span>Submitted May 22, 2025</span></div></div><div className="mini-timeline"><Step done label="Submitted" meta="May 22, 9:14 AM"/><Step done label="Program Adviser" meta="Approved May 23"/><Step current label="College Dean" meta="Awaiting review"/><Step label="Registrar" meta="Next approver"/><Step label="Completed" meta="Final stage"/></div><Button variant="secondary" className="full" onClick={() => open(requestsSeed[0])}>Track request</Button><small className="timeline-note">Approval sequence may vary by document requirements.</small></aside>
    </div>
  </>;
}

function Step({ label, meta, done, current }: { label: string; meta: string; done?: boolean; current?: boolean }) {
  return <div className={`step ${done ? "step-done" : ""} ${current ? "step-current" : ""}`}><div className="step-mark">{done ? <Icon name="check" size={13}/> : <span/>}</div><div><strong>{label}</strong><small>{meta}</small></div>{current && <em>Current</em>}</div>;
}

const formTypes = [
  { title: "Academic Load Revision Permit", desc: "Official permit to add or withdraw subjects and revise your academic load.", meta: "FM-MSU-IIT-RGTR-008", accent: "maroon" },
  { title: "Shifter's Application Form", desc: "Apply to shift or transfer from your current program to an intended program.", meta: "Program change", accent: "blue" },
  { title: "Leave of Absence Form", desc: "Request an approved temporary leave from your academic program.", meta: "Academic leave", accent: "amber" },
];

function NewRequest({ select }: { select: (type: string) => void }) {
  return <><div className="intro"><span className="eyebrow">Start a request</span><h2>Which document do you need?</h2><p>Select a university form to begin. You can review all information before submitting.</p></div><div className="form-cards">{formTypes.map((f, i) => <article className="form-card" key={f.title}><div className={`form-illustration ${f.accent}`}><Icon name={i === 2 ? "clock" : i === 1 ? "rotate" : "file"} size={28}/><span>{String(i + 1).padStart(2, "0")}</span></div><small>{f.meta}</small><h3>{f.title}</h3><p>{f.desc}</p><Button variant="secondary" onClick={() => select(f.title)}>Start request <Icon name="arrow" size={16}/></Button></article>)}</div><div className="info-banner"><div><Icon name="check"/></div><p><strong>Your progress is protected.</strong><span>All submitted information is used only for university document processing. You can cancel before final submission.</span></p></div></>;
}

function Field({ label, required = false, children }: { label: string; required?: boolean; children: ReactNode }) {
  return <label className="field"><span>{label}{required && <em>*</em>}</span>{children}</label>;
}

function SubjectEditor({ kind, rows, update }: { kind: "withdraw" | "add"; rows: SubjectRow[]; update: (rows: SubjectRow[]) => void }) {
  const change = (index: number, field: keyof SubjectRow, value: string | boolean) => update(rows.map((row, i) => i === index ? { ...row, [field]: value } : row));
  return <div className="subject-editor">
    <div className="subject-editor-head"><div><h4>{kind === "withdraw" ? "Withdraw subjects" : "Add subjects"}</h4><p>{kind === "withdraw" ? "Controller and professor signatures are completed by authorized personnel." : "Controller and closed-subject instructor approvals are completed by authorized personnel."}</p></div><Button variant="secondary" icon="plus" onClick={() => update([...rows, { course: "", title: "", units: "", closed: false }])}>Add row</Button></div>
    {rows.map((row, index) => <div className="subject-row" key={`${kind}-${index}`}>
      <div className="subject-row-number">{index + 1}</div>
      <div className="subject-fields">
        <Field label="Course number and section" required><input value={row.course} onChange={e => change(index, "course", e.target.value)} placeholder="e.g. IT 141 – A"/></Field>
        <Field label="Course title" required><input value={row.title} onChange={e => change(index, "title", e.target.value)} placeholder="Official course title"/></Field>
        <Field label="Units" required><input type="number" min="0" value={row.units} onChange={e => change(index, "units", e.target.value)} placeholder="3"/></Field>
        {kind === "add" && <label className="check-field"><input type="checkbox" checked={!!row.closed} onChange={e => change(index, "closed", e.target.checked)}/><span>Closed subject</span></label>}
      </div>
      <div className="readonly-signatures">
        <span><Icon name="pen" size={14}/> Controller signature <b>University personnel only</b></span>
        <span><Icon name="pen" size={14}/> {kind === "withdraw" ? "Professor signature" : "Instructor approval for closed subject"} <b>{kind === "add" && !row.closed ? "Not applicable" : "University personnel only"}</b></span>
      </div>
      {rows.length > 1 && <button className="remove-row" type="button" onClick={() => update(rows.filter((_, i) => i !== index))}><Icon name="x" size={14}/> Remove</button>}
    </div>)}
  </div>;
}

function LoadRevisionForm({ cancel, submit }: { cancel: () => void; submit: (permit: LoadRevisionPermit) => void }) {
  const [data, setData] = useState<LoadRevisionPermit>(defaultPermit);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState("");
  const set = <K extends keyof LoadRevisionPermit,>(field: K, value: LoadRevisionPermit[K]) => setData(current => ({ ...current, [field]: value }));
  function validate(e: FormEvent) {
    e.preventDefault();
    const required = [data.schoolYear, data.familyName, data.givenName, data.studentId, data.permitDate, data.college, data.department, data.courseYear, data.loadBeforeUnits, data.loadBeforeHours, data.loadAfterUnits, data.loadAfterHours, data.studentSignature];
    const invalidRows = [...data.withdraw, ...data.add].some(row => !row.course.trim() || !row.title.trim() || !row.units.trim());
    if (required.some(value => !value.trim()) || invalidRows || (!data.conflict && !data.dissolved && !data.otherReason.trim())) {
      setError("Complete all required fields and select or enter at least one reason for revision.");
      return;
    }
    setError("");
    setConfirm(true);
  }
  return <><div className="form-page-head"><button className="back-link" onClick={cancel}>← Back to forms</button><span>Official Registrar Form · FM-MSU-IIT-RGTR-008</span><h2>Academic Load Revision Permit</h2><p>Complete the student portions of the official permit. Signature fields for university personnel are read-only.</p></div>
    <form className="request-form permit-form" onSubmit={validate}>
      <section className="form-section"><div className="section-number">1</div><div className="section-body"><div className="section-title"><h3>Academic term</h3><p>Select the term covered by this permit.</p></div><div className="form-grid"><Field label="Academic term" required><select value={data.term} onChange={e => set("term", e.target.value as LoadRevisionPermit["term"])}><option>1st Semester</option><option>2nd Semester</option><option>Summer Term</option></select></Field><Field label="School year" required><input value={data.schoolYear} onChange={e => set("schoolYear", e.target.value)} placeholder="e.g. 2025–2026"/></Field></div></div></section>
      <section className="form-section"><div className="section-number">2</div><div className="section-body"><div className="section-title"><h3>Student information</h3><p>Enter your name in Family, Given, Middle order as shown on the permit.</p></div><div className="form-grid three-col"><Field label="Family name" required><input value={data.familyName} onChange={e => set("familyName", e.target.value)}/></Field><Field label="Given name" required><input value={data.givenName} onChange={e => set("givenName", e.target.value)}/></Field><Field label="Middle name"><input value={data.middleName} onChange={e => set("middleName", e.target.value)}/></Field><Field label="Student ID number" required><input value={data.studentId} onChange={e => set("studentId", e.target.value)}/></Field><Field label="Date" required><input type="date" value={data.permitDate} onChange={e => set("permitDate", e.target.value)}/></Field></div></div></section>
      <section className="form-section"><div className="section-number">3</div><div className="section-body"><div className="section-title"><h3>Academic information</h3><p>Provide your current college, department, course, and year.</p></div><div className="form-grid"><Field label="College / School" required><input value={data.college} onChange={e => set("college", e.target.value)}/></Field><Field label="Department" required><input value={data.department} onChange={e => set("department", e.target.value)}/></Field><Field label="Course and year" required><input value={data.courseYear} onChange={e => set("courseYear", e.target.value)}/></Field></div></div></section>
      <section className="form-section"><div className="section-number">4</div><div className="section-body"><SubjectEditor kind="withdraw" rows={data.withdraw} update={rows => set("withdraw", rows)}/></div></section>
      <section className="form-section"><div className="section-number">5</div><div className="section-body"><SubjectEditor kind="add" rows={data.add} update={rows => set("add", rows)}/></div></section>
      <section className="form-section"><div className="section-number">6</div><div className="section-body"><div className="section-title"><h3>Academic load</h3><p>Enter both units and hours per week before and after revision.</p></div><div className="form-grid four-col"><Field label="Before — units" required><input type="number" value={data.loadBeforeUnits} onChange={e => set("loadBeforeUnits", e.target.value)}/></Field><Field label="Before — hours/week" required><input type="number" value={data.loadBeforeHours} onChange={e => set("loadBeforeHours", e.target.value)}/></Field><Field label="After — units" required><input type="number" value={data.loadAfterUnits} onChange={e => set("loadAfterUnits", e.target.value)}/></Field><Field label="After — hours/week" required><input type="number" value={data.loadAfterHours} onChange={e => set("loadAfterHours", e.target.value)}/></Field></div></div></section>
      <section className="form-section"><div className="section-number">7</div><div className="section-body"><div className="section-title"><h3>Reason for load revision</h3><p>Select all applicable reasons and provide your printed name for the student signature area.</p></div><div className="reason-checks"><label><input type="checkbox" checked={data.conflict} onChange={e => set("conflict", e.target.checked)}/> Conflict of Schedule</label><label><input type="checkbox" checked={data.dissolved} onChange={e => set("dissolved", e.target.checked)}/> Subject/s Dissolved</label></div><Field label="Other reason/s"><textarea rows={3} value={data.otherReason} onChange={e => set("otherReason", e.target.value)} placeholder="Enter other reason/s, if applicable"/></Field><Field label="Student signature over printed name" required><input value={data.studentSignature} onChange={e => set("studentSignature", e.target.value)}/></Field></div></section>
      <section className="form-section approval-readonly"><div className="section-number">8</div><div className="section-body"><div className="section-title"><h3>Approval</h3><p>These designated areas are completed by authorized university personnel after submission.</p></div><div className="approval-slots">{["Adviser", "Chairperson", "Dean", "Registrar"].map(role => <div key={role}><Icon name="pen" size={16}/><strong>{role}</strong><span>Signature over printed name · Date</span><em>Read-only</em></div>)}</div><div className="official-fields"><span>Assessment</span><b>University personnel only</b><span>Official Receipt No.</span><b>University personnel only</b></div></div></section>
      {error && <div className="form-error-banner"><Icon name="x" size={17}/>{error}</div>}
      <div className="form-actions"><Button variant="secondary" onClick={cancel}>Cancel</Button><Button type="submit">Review and submit <Icon name="arrow" size={16}/></Button></div>
    </form>
    {confirm && <Modal title="Submit this official permit?" close={() => setConfirm(false)}><div className="confirm-icon"><Icon name="file"/></div><p>You're about to submit the <strong>Academic Load Revision Permit</strong> (FM-MSU-IIT-RGTR-008). Designated university personnel will complete the approval and signature fields.</p><div className="modal-summary"><span>Student</span><strong>{data.familyName}, {data.givenName} {data.middleName}</strong><span>Term</span><strong>{data.term}, SY {data.schoolYear}</strong></div><div className="modal-actions"><Button variant="secondary" onClick={() => setConfirm(false)}>Go back</Button><Button onClick={() => submit(data)}>Confirm submission</Button></div></Modal>}
  </>;
}

function RequestForm({ type, cancel, submit }: { type: string; cancel: () => void; submit: (permit?: LoadRevisionPermit) => void }) {
  return isLoadRevision(type) ? <LoadRevisionForm cancel={cancel} submit={submit}/> : <GenericRequestForm type={type} cancel={cancel} submit={() => submit()}/>;
}

function GenericRequestForm({ type, cancel, submit }: { type: string; cancel: () => void; submit: () => void }) {
  const [reason, setReason] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState(false);
  function validate(e: FormEvent) { e.preventDefault(); if (!reason.trim()) setError(true); else setConfirm(true); }
  return <><div className="form-page-head"><button className="back-link" onClick={cancel}>← Back to forms</button><span>New request</span><h2>{type}</h2><p>Complete the required information below. Fields marked with * are required.</p></div>
  <form className="request-form" onSubmit={validate}>
    <section className="form-section"><div className="section-number">1</div><div className="section-body"><div className="section-title"><h3>Student information</h3><p>Confirm your university and academic details.</p></div><div className="form-grid"><Field label="Student ID" required><input defaultValue="2021-1234"/></Field><Field label="Full name" required><input defaultValue="Andrea M. Santos"/></Field><Field label="Program / Course" required><select defaultValue="BSIT"><option value="BSIT">BS Information Technology</option><option>BS Computer Science</option></select></Field><Field label="Year level" required><select defaultValue="4"><option value="4">4th Year</option><option>3rd Year</option></select></Field></div></div></section>
    <section className="form-section"><div className="section-number">2</div><div className="section-body"><div className="section-title"><h3>{type === "Load Revision Form" ? "Academic and subject details" : type === "Shifter's Application Form" ? "Program information" : "Academic information"}</h3><p>Provide the details relevant to this request.</p></div><div className="form-grid">
      {type === "Shifter's Application Form" && <><Field label="Current program" required><input defaultValue="BS Information Technology"/></Field><Field label="Intended program" required><input placeholder="Select intended program"/></Field></>}
      {type === "Leave of Absence Form" && <><Field label="Current academic year" required><input defaultValue="2024–2025"/></Field><Field label="Semester" required><select><option>Second semester</option><option>First semester</option></select></Field></>}
    </div></div></section>
    <section className="form-section"><div className="section-number">3</div><div className="section-body"><div className="section-title"><h3>Reason for request</h3><p>{type === "Shifter's Application Form" ? "Explain your reason for enrolling in the present course and for shifting." : "Briefly explain the circumstances for this request."}</p></div><Field label={type === "Leave of Absence Form" ? "Reason for leave of absence" : type === "Shifter's Application Form" ? "Reason for shifting or transferring" : "Reason for adding or withdrawing"} required><textarea value={reason} onChange={e => {setReason(e.target.value);setError(false)}} placeholder="Provide a clear explanation to help approvers review your request…" rows={5}/>{error && <span className="error-text">Please provide a reason before continuing.</span>}</Field></div></section>
    <div className="form-actions"><Button variant="secondary" onClick={cancel}>Cancel</Button><Button type="submit">Review and submit <Icon name="arrow" size={16}/></Button></div>
  </form>
  {confirm && <Modal title="Submit this request?" close={() => setConfirm(false)}><div className="confirm-icon"><Icon name="file"/></div><p>You're about to submit your <strong>{type}</strong>. The request will be routed to the first designated approver.</p><div className="modal-summary"><span>Student</span><strong>Andrea M. Santos</strong><span>Document</span><strong>{type}</strong></div><div className="modal-actions"><Button variant="secondary" onClick={() => setConfirm(false)}>Go back</Button><Button onClick={submit}>Confirm submission</Button></div></Modal>}</>;
}

function Modal({ title, children, close }: { title: string; children: ReactNode; close: () => void }) {
  return <div className="modal-layer"><div className="modal"><button className="modal-close" onClick={close}><Icon name="x"/></button><h3>{title}</h3>{children}</div></div>;
}

function SubmissionSuccess({ request, done }: { request: RequestItem; done: () => void }) {
  return <div className="success-page"><div className="success-ring"><Icon name="check" size={32}/></div><span className="eyebrow">Request received</span><h2>Your document is on its way.</h2><p>We've submitted your request and notified the first designated approver. You can follow every update from My Requests.</p><div className="receipt"><span>Reference number</span><strong>{request.id}</strong><button onClick={() => navigator.clipboard?.writeText(request.id)}>Copy</button><hr/><div><span>Document</span><b>{request.type}</b></div><div><span>Status</span><StatusBadge status="Pending"/></div><div><span>Submitted</span><b>May 26, 2025 · 10:42 AM</b></div></div><div className="success-actions"><Button onClick={done}>Track my request</Button><Button variant="secondary" onClick={() => window.print()}>Print receipt</Button></div></div>;
}

function RequestsPage({ data, role, open }: { data: RequestItem[]; role: Role; open: (r: RequestItem) => void }) {
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const list = useMemo(() => data.filter(r => (filter === "All" || r.status === filter) && (r.id + r.type + r.student).toLowerCase().includes(search.toLowerCase())), [data, filter, search]);
  const filters = role === "student" ? ["All", "Pending", "Approved", "Returned for Revision", "Completed"] : ["All", "Pending", "Approved", "Rejected", "Returned for Revision"];
  return <><div className="list-toolbar"><div className="search-box"><Icon name="search" size={18}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by reference, document, or student…"/></div><Button variant="secondary" icon="download">Export</Button></div><div className="filter-tabs">{filters.map(x => <button key={x} className={filter === x ? "active" : ""} onClick={() => setFilter(x)}>{x}<span>{x === "All" ? data.length : data.filter(r => r.status === x).length}</span></button>)}</div><section className="card request-list">{list.length ? <RequestTable data={list} onOpen={open} approver={role === "approver"}/> : <div className="empty"><Icon name="search" size={28}/><h3>No matching requests</h3><p>Try adjusting your search or selected status filter.</p></div>}</section></>;
}

function Detail({ request, role, back, review }: { request: RequestItem; role: Role; back: () => void; review?: () => void }) {
  return <><button className="back-link" onClick={back}>← Back to requests</button><div className="detail-head"><div><div className="detail-title"><span className="doc-big"><Icon name="file"/></span><div><span>{request.id}</span><h2>{request.type}</h2><p>Submitted by {request.student} on {request.date}</p></div></div></div><div className="detail-actions"><StatusBadge status={request.status}/>{request.status === "Completed" && <Button icon="download">Download PDF</Button>}{role === "approver" && request.status === "Pending" && <Button onClick={review}>Review request</Button>}</div></div>
  {request.status === "Returned for Revision" && <div className="return-banner"><Icon name="rotate"/><div><strong>Changes requested by Dr. Elena Villanueva</strong><p>{request.reason}</p></div><Button variant="secondary">Revise form</Button></div>}
  {isLoadRevision(request.type) && <PermitProgress permit={request.permit || defaultPermit}/>}
  <div className="detail-grid"><div><section className="card info-card"><div className="card-head"><div><h3>Submitted information</h3><p>Information provided with this request.</p></div></div><div className="info-grid"><Info label="Student ID" value="2021-1234"/><Info label="Full name" value={request.student}/><Info label="Program" value="BS Information Technology"/><Info label="Year level" value="4th Year"/><Info label="Academic status" value="Regular"/><Info label="Current units" value="18 units"/></div><div className="reason-box"><span>Reason for request</span><p>Adjusting my enrolled subjects to align with the updated prerequisite sequence advised by my program coordinator.</p></div></section><section className="card history-card"><div className="card-head"><div><h3>Status history</h3><p>A complete record of actions on this document.</p></div></div><div className="history-item"><span className="avatar tiny">AS</span><div><strong>Request submitted</strong><p>Andrea Santos submitted the document for approval.</p><small>May 22, 2025 · 9:14 AM</small></div></div><div className="history-item"><span className="avatar tiny dark">RC</span><div><strong>Approved by Program Adviser</strong><p>“Academic load and prerequisites verified.”</p><small>May 23, 2025 · 2:36 PM</small></div></div></section></div>
  <aside className="card timeline-card"><h3>Approval progress</h3><p>Current routing and signatory status.</p><div className="full-timeline"><Step done label="Submitted" meta="Andrea M. Santos"/><Step done label="Program Adviser" meta="Prof. Ramon C. Flores"/><Step current label={request.stage === "Completed" ? "Finalized" : "College Dean"} meta={request.stage === "Completed" ? "Completed" : "Dr. Elena Villanueva"}/><Step label="University Registrar" meta="Next approver"/><Step label="Completed" meta="PDF available"/></div><div className="sequence-note">The actual approval sequence depends on the university requirements for this document.</div><hr/><h4>Need assistance?</h4><p className="small">Contact the Office of the University Registrar at registrar@msuiit.edu.ph.</p></aside></div></>;
}

function PermitProgress({ permit }: { permit: LoadRevisionPermit }) {
  const slots = [
    ...permit.withdraw.flatMap((_, i) => [`Withdraw Controller ${i + 1}`, `Withdraw Professor ${i + 1}`]),
    ...permit.add.flatMap((row, i) => [`Add Controller ${i + 1}`, ...(row.closed ? [`Closed Instructor ${i + 1}`] : [])]),
    "Adviser", "Chairperson", "Dean", "Registrar",
  ];
  return <section className="card permit-progress"><div><span className="eyebrow">FM-MSU-IIT-RGTR-008</span><h3>Permit signature status</h3><p>Signature availability follows university-configured routing; no fixed order is represented.</p></div><div>{slots.map(slot => <span className={permit.signatures[slot] ? "complete" : ""} key={slot}><Icon name={permit.signatures[slot] ? "check" : "clock"} size={13}/><b>{slot}</b><small>{permit.signatures[slot] || "Pending"}</small></span>)}</div></section>;
}

function Info({ label, value }: { label: string; value: string }) { return <div><span>{label}</span><strong>{value}</strong></div>; }

function ApproverDashboard({ navigate, open, queue }: { navigate: (p: Page) => void; open: (r: RequestItem) => void; queue: RequestItem[] }) {
  const pending = queue.filter(r => r.status === "Pending");
  return <><div className="welcome-row"><div><span className="eyebrow">Approver workspace</span><h2>Good morning, Dr. Villanueva.</h2><p>{pending.length} documents are waiting for your review.</p></div><Button variant="secondary" onClick={() => navigate("requests")}>View approval queue</Button></div><div className="stats-grid"><StatCard label="Pending approvals" value={pending.length} icon="clock" tone="tone-amber" trend="1 due today"/><StatCard label="Approved documents" value={28 + queue.filter(r => r.status === "Approved").length} icon="check" tone="tone-green" trend="+8 this month"/><StatCard label="Rejected documents" value={2} icon="x" tone="tone-red"/><StatCard label="Returned for revision" value={4} icon="rotate" tone="tone-blue"/></div><section className="card table-card"><div className="card-head"><div><h3>Requests awaiting action</h3><p>Prioritized by submission date and routing order.</p></div><Button variant="ghost" onClick={() => navigate("requests")}>View full queue <Icon name="arrow" size={15}/></Button></div><RequestTable data={pending} onOpen={open} approver/></section><div className="approver-foot"><div className="card quick-card"><div className="stat-icon tone-maroon"><Icon name="pen"/></div><div><h3>Your e-signature is ready</h3><p>Last updated April 12, 2025. It will only be applied after your approval confirmation.</p></div><Button variant="secondary" onClick={() => navigate("signature")}>Manage signature</Button></div><div className="card reminder"><Icon name="clock"/><div><strong>Average review time</strong><span>1.4 business days</span></div></div></div></>;
}

function GenericReviewPage({ request, finish, back }: { request: RequestItem; finish: (action: Status, reason?: string) => void; back: () => void }) {
  const [dialog, setDialog] = useState<"approve" | "reject" | "return" | null>(null);
  const [comment, setComment] = useState("");
  return <><button className="back-link" onClick={back}>← Back to approval queue</button><div className="review-top"><div><span>{request.id}</span><h2>{request.type}</h2><p>Submitted by {request.student} · {request.date}</p></div><StatusBadge status="Pending"/></div><div className="review-grid"><section className="document-preview"><div className="preview-bar"><span>Document preview</span><div><button>−</button><b>100%</b><button>+</button><button><Icon name="download" size={16}/></button></div></div><div className="paper"><div className="paper-brand"><div className="mini-seal">MSU<br/>IIT</div><div><strong>Mindanao State University</strong><span>Iligan Institute of Technology</span><small>OFFICE OF THE UNIVERSITY REGISTRAR</small></div></div><hr/><h3>{request.type.toUpperCase()}</h3><div className="paper-row"><span>Student Name</span><b>{request.student}</b><span>Student ID</span><b>2021-1234</b></div><div className="paper-row"><span>Program</span><b>BS Information Technology</b><span>Year Level</span><b>4th Year</b></div><div className="paper-block"><span>Reason for request</span><p>Adjusting my enrolled subjects to align with the updated prerequisite sequence advised by my program coordinator.</p></div><div className="signature-lines"><div><i/><span>Student signature</span></div><div><i/><span>Program Adviser</span><em>Approved</em></div><div><i/><span>Department Chair</span></div></div></div></section><aside className="review-panel"><div className="review-tabs"><button className="active">Details</button><button>History</button></div><div className="review-section"><h3>Student information</h3><Info label="Student ID" value="2021-1234"/><Info label="Email" value="andrea.santos@g.msuiit.edu.ph"/><Info label="Program" value="BS Information Technology"/><Button variant="ghost" icon="mail">Contact student</Button></div><div className="review-section"><h3>Previous approval</h3><div className="previous"><span className="avatar tiny dark">RF</span><div><strong>Prof. Ramon Flores</strong><small>Program Adviser · Approved May 23</small><p>Academic load and prerequisites verified.</p></div></div></div><div className="action-box"><span className="eyebrow">Your decision</span><p>Review all submitted information before taking action.</p><Button variant="success" icon="check" onClick={() => setDialog("approve")}>Approve and sign</Button><div><Button variant="secondary" onClick={() => setDialog("return")}>Return for revision</Button><Button variant="danger" onClick={() => setDialog("reject")}>Reject</Button></div></div></aside></div>
  {dialog && <Modal title={dialog === "approve" ? "Approve and sign document?" : dialog === "reject" ? "Reject this request?" : "Return for revision?"} close={() => setDialog(null)}><div className={`confirm-icon ${dialog}`}><Icon name={dialog === "approve" ? "check" : dialog === "reject" ? "x" : "rotate"}/></div><p>{dialog === "approve" ? "Your saved e-signature will be applied and the document will move to the next approval stage." : "Provide a clear reason. The student will receive this message with the status update."}</p>{dialog !== "approve" && <textarea rows={4} value={comment} onChange={e => setComment(e.target.value)} placeholder={dialog === "reject" ? "Reason for rejection…" : "What should the student revise?"}/>}<div className="modal-actions"><Button variant="secondary" onClick={() => setDialog(null)}>Cancel</Button><Button variant={dialog === "approve" ? "success" : dialog === "reject" ? "danger" : "primary"} disabled={dialog !== "approve" && !comment.trim()} onClick={() => finish(dialog === "approve" ? "Approved" : dialog === "reject" ? "Rejected" : "Returned for Revision", comment)}>{dialog === "approve" ? "Approve document" : "Confirm decision"}</Button></div></Modal>}</>;
}

function PermitSignature({ label, value }: { label: string; value?: string }) {
  return <div className={`permit-signature ${value ? "signed" : ""}`}>{value ? <span className="script-signature">{value}</span> : <i/>}<small>{label}</small></div>;
}

function OfficialPermitPreview({ permit }: { permit: LoadRevisionPermit }) {
  const fullName = `${permit.familyName}, ${permit.givenName} ${permit.middleName}`.trim();
  return <div className="official-paper">
    <div className="official-header">
      <div className="official-mark">MSU<br/>IIT</div>
      <div><strong>ILIGAN INSTITUTE OF TECHNOLOGY</strong><span>MINDANAO STATE UNIVERSITY</span></div>
      <div className="document-meta"><span>OFFICE OF THE REGISTRAR</span><b>Document Code No.</b><strong>FM-MSU-IIT-RGTR-008</strong><small>Revision No. 00 · Effective 02.20.2020 · Page 1 of 1</small></div>
    </div>
    <h3>ACADEMIC LOAD REVISION PERMIT</h3>
    <div className="permit-part"><b>PART 1</b><div className="permit-term"><span>{permit.term === "1st Semester" ? "☒" : "☐"} 1ST Semester</span><span>{permit.term === "2nd Semester" ? "☒" : "☐"} 2ND Semester</span><span>{permit.term === "Summer Term" ? "☒" : "☐"} Summer Term</span><strong>School Year: {permit.schoolYear}</strong></div></div>
    <div className="permit-part"><b>PART 2</b><div className="permit-columns"><div><small>FULL NAME (Family, Given, Middle)</small><strong>{fullName}</strong></div><div><small>I.D. No.</small><strong>{permit.studentId}</strong></div><div><small>Date</small><strong>{permit.permitDate}</strong></div></div></div>
    <div className="permit-part"><b>PART 3</b><div className="permit-columns"><div><small>COLLEGE / SCHOOL</small><strong>{permit.college}</strong></div><div><small>DEPARTMENT</small><strong>{permit.department}</strong></div><div><small>COURSE & YEAR</small><strong>{permit.courseYear}</strong></div></div></div>
    <div className="permit-part subject-part"><b>PART 4</b><div><h4>WITHDRAW from the following subject/s:</h4><div className="permit-subject-head"><span>COURSE NO. & SEC.</span><span>COURSE TITLE</span><span>UNITS</span><span>CONTROLLER</span><span>PROFESSOR</span></div>{permit.withdraw.map((row, index) => <div className="permit-subject-row" key={`withdraw-${index}`}><strong>{row.course || "—"}</strong><strong>{row.title || "—"}</strong><strong>{row.units || "—"}</strong><PermitSignature label="Signature over Printed Name" value={permit.signatures[`Withdraw Controller ${index + 1}`]}/><PermitSignature label="Signature over Printed Name" value={permit.signatures[`Withdraw Professor ${index + 1}`]}/></div>)}<p className="permit-note">Note: WITHDRAW FROM ALL SUBJECTS. Attach letter stating reason/s and file leave of absence (Form 11) if planning to enroll in the Institute within one (1) year.</p></div></div>
    <div className="permit-part subject-part"><b>PART 5</b><div><h4>ADD the following subject/s:</h4><div className="permit-subject-head add-head"><span>NO.</span><span>COURSE NO. & SEC.</span><span>COURSE TITLE</span><span>UNITS</span><span>CONTROLLER</span></div>{permit.add.map((row, index) => <div className="permit-subject-row add-row" key={`add-${index}`}><strong>{index + 1}</strong><strong>{row.course || "—"}</strong><strong>{row.title || "—"}</strong><strong>{row.units || "—"}</strong><PermitSignature label="Signature over Printed Name" value={permit.signatures[`Add Controller ${index + 1}`]}/></div>)}<h5>APPROVAL of Instructor/s for closed subject/s:</h5><div className="closed-approvals">{permit.add.map((row, index) => <PermitSignature key={`closed-${index}`} label={`Subject ${index + 1}${row.closed ? " · Closed" : " · Not applicable"}`} value={row.closed ? permit.signatures[`Closed Instructor ${index + 1}`] : undefined}/>)}</div></div></div>
    <div className="permit-part"><b>PART 6</b><div className="load-totals"><strong>TOTAL LOAD before Revision <u>{permit.loadBeforeUnits}</u> units; <u>{permit.loadBeforeHours}</u> hours/week</strong><strong>TOTAL LOAD after Revision <u>{permit.loadAfterUnits}</u> units; <u>{permit.loadAfterHours}</u> hours/week</strong></div></div>
    <div className="permit-part"><b>PART 7</b><div className="permit-reasons"><strong>REASON/S for Load Revision</strong><p>{permit.conflict ? "☒" : "☐"} Conflict of Schedule &nbsp;&nbsp; {permit.dissolved ? "☒" : "☐"} Subject/s Dissolved &nbsp;&nbsp; Other reason/s: <u>{permit.otherReason || "—"}</u></p><PermitSignature label="Student's Signature over Printed Name" value={permit.studentSignature}/></div></div>
    <div className="permit-part"><b>PART 8</b><div className="permit-approval"><strong>APPROVAL:</strong>{["Adviser", "Chairperson", "Dean", "Registrar"].map(role => <div className="approval-line" key={role}><b>{role}</b><PermitSignature label="Signature over Printed Name" value={permit.signatures[role]}/><span>Date: ____________</span>{role === "Adviser" && <span>Assessment Php ____________</span>}{role === "Chairperson" && <span>O.R. No. ____________</span>}</div>)}</div></div>
    <p className="copies-note">Accomplish in 3 copies – for the Registrar, the Department and the Student.</p>
    <div className="official-footer"><span>A. Bonifacio Avenue, Tibanga, 9200 Iligan City</span><span>Website: www.msuiit.edu.ph</span><span>Registrar: registrar@g.msuiit.edu.ph</span></div>
  </div>;
}

function OfficialReviewPage({ request, finish, back }: { request: RequestItem; finish: (action: Status, reason?: string, signatureSlot?: string) => void; back: () => void }) {
  const permit = request.permit || defaultPermit;
  const signatureSlots = [
    ...permit.withdraw.flatMap((_, i) => [`Withdraw Controller ${i + 1}`, `Withdraw Professor ${i + 1}`]),
    ...permit.add.flatMap((row, i) => [`Add Controller ${i + 1}`, ...(row.closed ? [`Closed Instructor ${i + 1}`] : [])]),
    "Adviser", "Chairperson", "Dean", "Registrar",
  ];
  const [slot, setSlot] = useState(signatureSlots.find(name => !permit.signatures[name]) || "Chairperson");
  const [dialog, setDialog] = useState<"approve" | "reject" | "return" | null>(null);
  const [comment, setComment] = useState("");
  return <><button className="back-link" onClick={back}>← Back to approval queue</button><div className="review-top"><div><span>{request.id} · FM-MSU-IIT-RGTR-008</span><h2>Academic Load Revision Permit</h2><p>Submitted by {request.student} · {request.date}</p></div><StatusBadge status={request.status}/></div>
    <div className="review-grid"><section className="document-preview official-preview"><div className="preview-bar"><span>Official template preview · Read-only</span><div><b>Fit to page</b><button><Icon name="download" size={16}/></button></div></div><OfficialPermitPreview permit={permit}/></section>
      <aside className="review-panel"><div className="review-tabs"><button className="active">Signatures</button><button>History</button></div><div className="review-section"><h3>Submitted information</h3><Info label="Student ID" value={permit.studentId}/><Info label="Academic term" value={`${permit.term}, SY ${permit.schoolYear}`}/><Info label="Course and year" value={permit.courseYear}/><Button variant="ghost" icon="mail">Contact student</Button></div>
        <div className="review-section signature-routing"><h3>Designated signature field</h3><p>Select the field this authorized action applies to. The university-configured routing determines which fields are available.</p><select value={slot} onChange={e => setSlot(e.target.value)}>{signatureSlots.map(name => <option key={name} value={name}>{name}</option>)}</select><div className="slot-status"><Icon name={permit.signatures[slot] ? "check" : "clock"} size={15}/><span>{permit.signatures[slot] ? `Signed by ${permit.signatures[slot]}` : "Awaiting authorized signature"}</span></div></div>
        <div className="review-section"><h3>Signature coverage</h3><div className="coverage-list">{signatureSlots.map(name => <div key={name}><Icon name={permit.signatures[name] ? "check" : "clock"} size={13}/><span>{name}</span><b>{permit.signatures[name] ? "Signed" : "Pending"}</b></div>)}</div></div>
        <div className="action-box"><span className="eyebrow">Your decision</span><p>Approval places your saved prototype e-signature in the selected designated field. No fixed approval order is assumed.</p><Button variant="success" icon="check" onClick={() => setDialog("approve")}>Approve and sign field</Button><div><Button variant="secondary" onClick={() => setDialog("return")}>Return for revision</Button><Button variant="danger" onClick={() => setDialog("reject")}>Reject</Button></div></div>
      </aside></div>
    {dialog && <Modal title={dialog === "approve" ? `Sign ${slot}?` : dialog === "reject" ? "Reject this request?" : "Return for revision?"} close={() => setDialog(null)}><div className={`confirm-icon ${dialog}`}><Icon name={dialog === "approve" ? "pen" : dialog === "reject" ? "x" : "rotate"}/></div><p>{dialog === "approve" ? `Your saved e-signature will be simulated in the designated “${slot}” field. This does not assume or configure the university's approval order.` : "Provide a clear reason. The student will receive this message with the status update."}</p>{dialog !== "approve" && <textarea rows={4} value={comment} onChange={e => setComment(e.target.value)} placeholder={dialog === "reject" ? "Reason for rejection…" : "What should the student revise?"}/>}<div className="modal-actions"><Button variant="secondary" onClick={() => setDialog(null)}>Cancel</Button><Button variant={dialog === "approve" ? "success" : dialog === "reject" ? "danger" : "primary"} disabled={dialog !== "approve" && !comment.trim()} onClick={() => finish(dialog === "approve" ? "Approved" : dialog === "reject" ? "Rejected" : "Returned for Revision", comment, dialog === "approve" ? slot : undefined)}>{dialog === "approve" ? "Place signature" : "Confirm decision"}</Button></div></Modal>}
  </>;
}

function ReviewPage({ request, finish, back }: { request: RequestItem; finish: (action: Status, reason?: string, signatureSlot?: string) => void; back: () => void }) {
  return isLoadRevision(request.type) ? <OfficialReviewPage request={request} finish={finish} back={back}/> : <GenericReviewPage request={request} finish={finish} back={back}/>;
}

function SignaturePage() {
  const [saved, setSaved] = useState(true); const [tab, setTab] = useState<"draw" | "upload">("draw"); const [confirm, setConfirm] = useState(false);
  return <div className="signature-layout"><section className="card signature-main"><div className="card-head"><div><h3>Create your e-signature</h3><p>Draw a signature or upload a transparent image file.</p></div></div><div className="signature-tabs"><button className={tab === "draw" ? "active" : ""} onClick={() => setTab("draw")}><Icon name="pen" size={17}/> Draw signature</button><button className={tab === "upload" ? "active" : ""} onClick={() => setTab("upload")}><Icon name="upload" size={17}/> Upload image</button></div>{tab === "draw" ? <div className="signature-pad"><span className="script-signature">Elena Villanueva</span><div className="pad-line"/><small>Draw your signature above using your mouse or touch screen</small><button>Clear</button></div> : <label className="upload-zone"><Icon name="upload" size={30}/><strong>Drop your signature image here</strong><span>or click to browse · PNG or JPG up to 2 MB</span><input type="file" accept="image/*"/></label>}<div className="signature-actions"><Button variant="secondary">Reset</Button><Button onClick={() => setConfirm(true)}>Save signature</Button></div></section><aside className="card signature-preview"><span className="eyebrow">Current signature</span><div className="preview-sign">{saved ? <span className="script-signature">Elena Villanueva</span> : <em>No signature saved</em>}</div><div className="signature-status"><i/><div><strong>{saved ? "Signature ready" : "No saved signature"}</strong><span>{saved ? "Last updated April 12, 2025" : "Create one to approve documents"}</span></div></div>{saved && <Button variant="danger" className="full" onClick={() => setSaved(false)}>Remove signature</Button>}<div className="legal-note"><Icon name="check" size={18}/><p>This prototype signature is stored only within this interface and is not a legally verified or cryptographic digital signature.</p></div></aside>{confirm && <Modal title={saved ? "Replace saved signature?" : "Save this signature?"} close={() => setConfirm(false)}><p>This signature will be used in the prototype when you confirm document approvals.</p><div className="modal-actions"><Button variant="secondary" onClick={() => setConfirm(false)}>Cancel</Button><Button onClick={() => {setSaved(true);setConfirm(false)}}>{saved ? "Replace signature" : "Save signature"}</Button></div></Modal>}</div>;
}

function Notifications({ role }: { role: Role }) {
  const items = role === "student" ? [
    ["check", "Your document was approved", "Your Leave of Absence Form has received final approval.", "12 minutes ago", true],
    ["rotate", "Revision requested", "Your Shifter's Application Form was returned with a comment.", "Yesterday", true],
    ["file", "Document submitted successfully", "IIT-2025-1048 is now with the College Dean.", "May 22", false],
    ["download", "Your approved PDF is ready", "Load Revision Form IIT-2025-0912 is available to download.", "Apr 29", false],
  ] : [
    ["file", "New document awaiting review", "Miguel Ramos submitted a Leave of Absence Form.", "8 minutes ago", true],
    ["clock", "Pending approval reminder", "IIT-2025-1048 has been waiting for review for two days.", "2 hours ago", true],
    ["rotate", "Request updated", "Patricia Cruz revised and resubmitted her document.", "Yesterday", false],
  ];
  return <section className="card notification-card"><div className="card-head"><div><h3>All notifications</h3><p>Updates about documents and approval activity.</p></div><Button variant="ghost">Mark all as read</Button></div><div className="notification-filter"><button className="active">All</button><button>Unread <span>{items.filter(x => x[4]).length}</span></button></div>{items.map((x, i) => <div className={`notification-item ${x[4] ? "unread" : ""}`} key={i}><div className={`notification-icon tone-${x[0] === "check" || x[0] === "download" ? "green" : x[0] === "rotate" ? "amber" : "maroon"}`}><Icon name={x[0] as string}/></div><div><strong>{x[1]}</strong><p>{x[2]}</p><small>{x[3]}</small></div>{x[4] && <i/>}<button><Icon name="chevron" size={16}/></button></div>)}</section>;
}

export default function App() {
  const [page, setPage] = useState<Page>("login");
  const [role, setRole] = useState<Role>("student");
  const [selectedType, setSelectedType] = useState("Load Revision Form");
  const [selectedRequest, setSelectedRequest] = useState<RequestItem>(requestsSeed[0]);
  const [requests, setRequests] = useState<RequestItem[]>(requestsSeed);
  const [queue, setQueue] = useState<RequestItem[]>(approvalQueue);
  const [submitted, setSubmitted] = useState<RequestItem | null>(null);
  const login = (r: Role) => { setRole(r); setPage("dashboard"); };
  const open = (r: RequestItem) => { setSelectedRequest(r); setPage(role === "approver" ? "detail" : "detail"); };
  const submitRequest = (permit?: LoadRevisionPermit) => {
    const nextReference =
      Math.max(
        ...requests.map((request) => Number(request.id.split("-").at(-1)) || 0),
        ...queue.map((request) => Number(request.id.split("-").at(-1)) || 0),
        1061,
      ) + 1;
    const r = {
      id: `IIT-2025-${nextReference}`,
      type: selectedType,
      student: permit ? `${permit.givenName} ${permit.middleName} ${permit.familyName}`.replace(/\s+/g, " ").trim() : "Andrea M. Santos",
      date: "May 26, 2025",
      stage: "Program Adviser",
      status: "Pending" as Status,
      permit,
    };
    setRequests([r, ...requests]);
    setQueue([r, ...queue]);
    setSubmitted(r);
  };
  const finishReview = (status: Status, reason?: string, signatureSlot?: string) => {
    const nextStatus: Status = signatureSlot ? "Pending" : status;
    const permit = signatureSlot
      ? { ...(selectedRequest.permit || defaultPermit), signatures: { ...(selectedRequest.permit || defaultPermit).signatures, [signatureSlot]: "Dr. Elena Villanueva" } }
      : selectedRequest.permit;
    const updated = { ...selectedRequest, status: nextStatus, reason, permit, stage: signatureSlot ? `${signatureSlot} signed` : selectedRequest.stage };
    setSelectedRequest(updated);
    setRequests(requests.map(r => r.id === selectedRequest.id ? updated : r));
    setQueue(queue.map(r => r.id === selectedRequest.id ? updated : r));
    setPage("detail");
  };
  if (page === "login") return <Login onLogin={login}/>;
  if (submitted) return <Shell role={role} page="requests" navigate={p => {setSubmitted(null);setPage(p)}} title="Request submitted" subtitle="Your document has entered the approval workflow."><SubmissionSuccess request={submitted} done={() => {setSelectedRequest(submitted);setSubmitted(null);setPage("detail")}}/></Shell>;
  let title = "Dashboard", subtitle = role === "student" ? "An overview of your university document requests." : "Review and manage documents assigned to you.";
  if (page === "new") { title = "New document request"; subtitle = "Choose a form to begin your submission."; }
  if (page === "form") { title = "Complete request"; subtitle = "Provide the required document information."; }
  if (page === "requests") { title = role === "student" ? "My requests" : "Pending approvals"; subtitle = role === "student" ? "Search, filter, and track all your document requests." : "Documents currently awaiting your review."; }
  if (page === "detail") { title = "Request details"; subtitle = "Review submitted information and approval progress."; }
  if (page === "review") { title = "Document review"; subtitle = "Verify information and record your decision."; }
  if (page === "signature") { title = "My e-signature"; subtitle = "Create and manage your signature for document approvals."; }
  if (page === "notifications") { title = "Notifications"; subtitle = "Stay informed about document activity and updates."; }
  if (page === "settings") { title = "Profile & settings"; subtitle = "Manage your account preferences."; }
  return <Shell role={role} page={page} navigate={setPage} title={title} subtitle={subtitle}>
    {page === "dashboard" && (role === "student" ? <StudentDashboard navigate={setPage} open={open}/> : <ApproverDashboard navigate={setPage} open={open} queue={queue}/>)}
    {page === "new" && <NewRequest select={type => {setSelectedType(type);setPage("form")}}/>}
    {page === "form" && <RequestForm type={selectedType} cancel={() => setPage("new")} submit={submitRequest}/>}
    {page === "requests" && <RequestsPage data={role === "student" ? requests : queue} role={role} open={open}/>}
    {page === "detail" && <Detail request={selectedRequest} role={role} back={() => setPage("requests")} review={() => setPage("review")}/>}
    {page === "review" && <ReviewPage request={selectedRequest} finish={finishReview} back={() => setPage("detail")}/>}
    {page === "signature" && <SignaturePage/>}
    {page === "notifications" && <Notifications role={role}/>}
    {page === "settings" && <section className="card settings-placeholder"><div className="avatar large">{role === "student" ? "AS" : "EV"}</div><h2>{role === "student" ? "Andrea M. Santos" : "Dr. Elena Villanueva"}</h2><p>{role === "student" ? "andrea.santos@g.msuiit.edu.ph" : "elena.villanueva@msuiit.edu.ph"}</p><div className="info-grid"><Info label="University affiliation" value="MSU–IIT"/><Info label="Account role" value={role === "student" ? "Student" : "Authorized Approver"}/><Info label="Notification preference" value="Email and in-app"/><Info label="Account status" value="Active"/></div></section>}
  </Shell>;
}
