import type { SVGProps } from "react";

export function DeviceGlyph({ type, ...props }: { type: string } & SVGProps<SVGSVGElement>) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg viewBox="0 0 40 32" aria-hidden="true" {...props}>
      <g {...common}>{glyph(type)}</g>
    </svg>
  );
}

function glyph(type: string) {
  if (type === "orbiter") return <><rect x="15" y="10" width="10" height="12" rx="2" /><path d="M4 8h9v16H4zM27 8h9v16h-9zM18 6h4M20 6V2M17 26h6" /></>;
  if (type === "rover") return <><path d="M8 19h23l-3-9H13zM14 10l3-5h7l3 5" /><circle cx="12" cy="24" r="3" /><circle cx="27" cy="24" r="3" /></>;
  if (type === "main_hub") return <><path d="M9 24h22M12 24l3-13h10l3 13M15 11l5-7 5 7M18 16h4" /><path d="M7 7c3-3 6-4 9-4M33 7c-3-3-6-4-9-4" /></>;
  if (type === "surface_relay") return <><path d="M12 25h16M16 25l4-18 4 18M16 15h8" /><path d="M9 8c3-3 6-4 9-4M31 8c-3-3-6-4-9-4M6 4C10 1 14 0 17 0M34 4c-4-3-8-4-11-4" /></>;
  if (type === "ground") return <><path d="M7 7c11 0 19 8 19 19M7 7c0 11 8 19 19 19M7 7l19 19M15 26h16M23 26l4-6" /></>;
  if (type === "compute") return <><rect x="7" y="5" width="26" height="22" rx="3" /><rect x="12" y="10" width="16" height="8" rx="1" /><path d="M12 23h2M18 23h2M24 23h4" /></>;
  if (type === "payload") return <><circle cx="20" cy="15" r="8" /><path d="M20 7V3M20 27v-4M12 15H6M34 15h-6M14 21l-5 5M26 21l5 5" /><circle cx="20" cy="15" r="2" /></>;
  if (type === "terminal") return <><rect x="6" y="7" width="28" height="17" rx="2" /><path d="M12 29h16M20 24v5M12 14h5l3-4 3 9 3-5h3" /></>;
  return <><rect x="8" y="6" width="24" height="20" rx="3" /><path d="M14 12h12M14 17h12M14 22h7" /></>;
}
