import type { ReactNode } from "react";
import { Icon } from "./Icon";

export function Modal({ title, children, close }: { title: string; children: ReactNode; close: () => void }) {
  return <div className="modal-layer"><div className="modal"><button className="modal-close" onClick={close}><Icon name="x"/></button><h3>{title}</h3>{children}</div></div>;
}
