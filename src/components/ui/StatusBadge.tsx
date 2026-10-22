import type { Status } from "@/types";
import { Icon } from "./Icon";

export function StatusBadge({ status }: { status: Status }) {
  const icon = status === "Approved" || status === "Completed" ? "check" : status === "Rejected" ? "x" : status === "Returned for Revision" ? "rotate" : "clock";
  return <span className={`status status-${status.toLowerCase().replace(/ /g, "-")}`}><Icon name={icon} size={13}/>{status}</span>;
}
