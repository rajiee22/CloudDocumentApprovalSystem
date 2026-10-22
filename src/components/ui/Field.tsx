import type { ReactNode } from "react";

export function Field({ label, required = false, children }: { label: string; required?: boolean; children: ReactNode }) {
  return <label className="field"><span>{label}{required && <em>*</em>}</span>{children}</label>;
}
