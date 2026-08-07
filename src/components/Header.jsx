import { MapPin, Menu, X } from "lucide-react";
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
  const nameLines = siteName.split(" ");

  return (
    <>
      <header className={`site-header${menuOpen ? " is-menu-open" : ""}`} data-header>
        <a className="wordmark" href="#home" aria-label={`${siteName} - về trang đầu`}>
          <span className="wordmark-name">{nameLines[0]}<br />{nameLines.slice(1).join(" ")}</span>
          <span className="wordmark-tagline">{tagline}</span>
        </a>

        <nav className="desktop-nav" aria-label="Điều hướng chính">
          <a href="#cau-chuyen">Câu chuyện</a>
          <a href="#ban-do">Bản đồ</a>
          <a href="#nhung-mua">Nhịp sống</a>
        </nav>

        <div className="header-actions">
          <a className="visit-link" href="#lien-he">
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
