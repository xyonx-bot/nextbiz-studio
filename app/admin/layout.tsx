export default function AdminLayout({ children }: { children: React.ReactNode }) {
  // Scoping wrapper: admin.css ports Mira's wireframe classnames 1:1 but every
  // rule is prefixed `.adminui` so admin styles never leak into the public
  // site (which shares the same global CSS bundle). Canvas: desk #EAE7E4.
  return <div className="adminui">{children}</div>;
}
