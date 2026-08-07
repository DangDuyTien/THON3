import { memo, useRef } from "react";
import { Waves } from "lucide-react";
import { useSiteContent } from "../../content/SiteContentProvider.jsx";
import { useViewportEntryProgress } from "../../hooks/useMotion.js";
import RevealLine from "../RevealLine.jsx";

export default memo(function ExploreStatementSection({ reducedMotion }) {
  const { content } = useSiteContent();
  const { exploreStatement } = content;
  const sectionRef = useRef(null);

  useViewportEntryProgress(sectionRef, reducedMotion, (progress) => {
    sectionRef.current?.style.setProperty("--reveal-progress", `${progress}`);
  }, undefined, { name: "explore-statement" });

  return (
    <section className="explore-statement-section" id="ban-do" ref={sectionRef} aria-labelledby="map-title">
      <div className="explore-statement-layout">
        <p className="explore-statement-mark">
          <Waves aria-hidden="true" />
          <RevealLine>{exploreStatement.eyebrow}</RevealLine>
        </p>

        <h2 className="explore-statement-title" id="map-title">
          {exploreStatement.lines.map((line, index) => (
            <RevealLine
              className="explore-statement-line"
              direction={index % 2 === 0 ? "right" : "left"}
              key={line.accent}
            >
              {line.before && <>{line.before} </>}
              <em>{line.accent}</em>
              {line.after && <> {line.after}</>}
            </RevealLine>
          ))}
        </h2>
      </div>
    </section>
  );
});
