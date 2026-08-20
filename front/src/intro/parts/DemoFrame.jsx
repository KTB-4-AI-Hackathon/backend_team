export default function DemoFrame({ title, children }) {
  return (
    <div className="demo-frame">
      <div className="demo-frame-bar">
        <i />
        <i />
        <i />
        <span>{title}</span>
      </div>
      <div className="demo-frame-body">{children}</div>
    </div>
  );
}
