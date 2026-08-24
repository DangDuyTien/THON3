import { memo } from "react";
import { Waves } from "lucide-react";
import { useSiteContent } from "../../content/SiteContentProvider.jsx";
import RevealLine from "../RevealLine.jsx";

export default memo(function ExploreStatementSection() {
  const { content } = useSiteContent();
  const { exploreStatement } = content;

  return (
    <section className="explore-statement-section" id="ban-do" aria-labelledby="map-title">
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
