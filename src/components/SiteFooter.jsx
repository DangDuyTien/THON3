import { ArrowUp, Settings } from "lucide-react";
import { useSiteContent } from "../content/SiteContentProvider.jsx";

export default function SiteFooter() {
  const { content } = useSiteContent();

  return (
    <footer className="site-footer">
      <p>{content.settings.siteName} <span>—</span> {content.settings.footerText}</p>
      <div className="site-footer-actions">
        <a className="footer-admin-link" href="/#admin" title="Mở quản trị nội dung">
          <Settings aria-hidden="true" />
          <span>Quản trị</span>
        </a>
        <a className="footer-back-to-top" href="#home" aria-label="Lên đầu trang">
          <ArrowUp aria-hidden="true" />
        </a>
      </div>
    </footer>
  );
}
