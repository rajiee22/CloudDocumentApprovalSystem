export function Logo({ light = false }: { light?: boolean }) {
  return <div className={`logo ${light ? "logo-light" : ""}`}><div className="seal"><span>MSU</span><b>IIT</b></div><div><strong>MSU–IIT</strong><small>Document Services</small></div></div>;
}
