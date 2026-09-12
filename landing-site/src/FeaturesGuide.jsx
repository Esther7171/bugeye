import TargetCursor from './components/TargetCursor.jsx';
import { TOOLS, TOOL_COUNT, toolSlug, FINE_POINTER } from './data.js';

export default function FeaturesGuide() {
  return (
    <>
      {FINE_POINTER && <TargetCursor cursorColor="#fbf7ee" cursorColorOnTarget="#f0463a" spinDuration={2.4} />}

      <main className="guide wrap">
        <a className="guide-back cursor-target" href="./">&larr; Back to BugEye</a>
        <span className="eyebrow">Field manual</span>
        <h1 className="guide-title">Features &amp; Tool Guide</h1>
        <p className="guide-lede">
          Every BugEye tool, {TOOL_COUNT} across nine pillars, with a one-line description of what it
          does. All passive recon, OSINT and triage, for authorized testing only.
        </p>

        <nav className="guide-toc">
          {TOOLS.map(g => (
            <a className="cursor-target" href={`#${g.id}`} key={g.id}>
              {g.code} {g.name}
            </a>
          ))}
        </nav>

        {TOOLS.map(g => (
          <section className="guide-pillar" id={g.id} key={g.id}>
            <div className="guide-pillar-head">
              <span className="pillar-code">{g.code}</span>
              <h2>{g.name}</h2>
              <span className="guide-count">{g.items.length}</span>
            </div>
            <div className="guide-tools">
              {g.items.map(([name, desc]) => (
                <div className="guide-tool cursor-target" id={`tool-${toolSlug(name)}`} key={name}>
                  <div className="guide-tool-name">{name}</div>
                  <div className="guide-tool-desc">{desc}</div>
                </div>
              ))}
            </div>
          </section>
        ))}

        <a className="guide-back cursor-target" href="./" style={{ marginTop: '48px' }}>&larr; Back to BugEye</a>
      </main>
    </>
  );
}
