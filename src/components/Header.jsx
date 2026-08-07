import { MapPin, Menu, X } from "lucide-react";
import { useSiteContent } from "../content/SiteContentProvider.jsx";
import CurtainMenu from "./CurtainMenu.jsx";

export default function Header({ menuOpen, onToggleMenu, onCloseMenu }) {
  const { content } = useSiteContent();
  const { siteName, tagline } = content.settings;
  const nameLines = siteName.split(" ");

  return (
    <>
      <header className="site-header" data-header>
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
            <span>Ghé thăm</span>
          </a>
          <button
            className="menu-button"
            type="button"
            onClick={onToggleMenu}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            title={menuOpen ? "Đóng menu" : "Mở menu"}
          >
            {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
            <span className="sr-only">{menuOpen ? "Đóng menu" : "Mở menu"}</span>
          </button>
        </div>
      </header>

      <CurtainMenu isOpen={menuOpen} onClose={onCloseMenu} />
    </>
  );
}
