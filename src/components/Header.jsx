import { MapPin, Menu, X } from "lucide-react";
import { useEffect } from "react";
import { useSiteContent } from "../content/SiteContentProvider.jsx";
import CurtainMenu from "./CurtainMenu.jsx";

function KineticRollText({ children }) {
  const text = String(children);
  return (
    <span className="closing-kinetic-roll">
      <span className="closing-kinetic-white">{text}</span>
      <span className="closing-kinetic-green" aria-hidden="true">{text}</span>
    </span>
  );
}

function IconRoll({ isOpen }) {
  return (
    <span className="header-icon-roll">
      <span className="header-icon-primary">{isOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}</span>
      <span className="header-icon-hover" aria-hidden="true">{isOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}</span>
    </span>
  );
}

export default function Header({ menuOpen, onToggleMenu, onCloseMenu }) {
  const { content } = useSiteContent();
  const { siteName, tagline } = content.settings;

  useEffect(() => {
    const wordmark = document.querySelector("[data-critical-wordmark]");
    if (!wordmark) return;
    const nameLines = siteName.split(" ");
    const name = wordmark.querySelector(".critical-wordmark-name");
    const taglineNode = wordmark.querySelector(".critical-wordmark-tagline");
    const expectedNameText = `${nameLines[0]}${nameLines.slice(1).join(" ")}`;
    if (name && name.textContent !== expectedNameText) {
      name.replaceChildren(nameLines[0], document.createElement("br"), nameLines.slice(1).join(" "));
    }
    if (taglineNode && taglineNode.textContent !== tagline) taglineNode.textContent = tagline;
    const label = `${siteName} - về trang đầu`;
    if (wordmark.getAttribute("aria-label") !== label) wordmark.setAttribute("aria-label", label);
  }, [siteName, tagline]);

  return (
    <>
      <header className={`site-header${menuOpen ? " is-menu-open" : ""}`} data-header>
        <div className="header-actions">
          <a className="visit-link" href="#lien-he" aria-label="Ghé thăm">
            <MapPin aria-hidden="true" />
            <KineticRollText>Ghé thăm</KineticRollText>
          </a>
          <button
            className="menu-button"
            type="button"
            onClick={onToggleMenu}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            title={menuOpen ? "Đóng menu" : "Mở menu"}
          >
            <IconRoll isOpen={menuOpen} />
            <span className="sr-only">{menuOpen ? "Đóng menu" : "Mở menu"}</span>
          </button>
        </div>
      </header>

      <CurtainMenu isOpen={menuOpen} onClose={onCloseMenu} />
    </>
  );
}
