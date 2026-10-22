import type { ReactNode } from "react";
import { Icon } from "./Icon";

export function Button({ children, variant = "primary", icon, onClick, type = "button", disabled, className = "" }: { children: ReactNode; variant?: "primary" | "secondary" | "ghost" | "danger" | "success"; icon?: string; onClick?: () => void; type?: "button" | "submit"; disabled?: boolean; className?: string }) {
  return <button className={`btn btn-${variant} ${className}`} onClick={onClick} type={type} disabled={disabled}>{icon && <Icon name={icon} size={17}/>}<span>{children}</span></button>;
}
