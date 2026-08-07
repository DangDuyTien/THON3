import { memo } from "react";
import { ArrowUpRight, ArrowUp, Shield, Settings } from "lucide-react";
import RevealLine from "../RevealLine.jsx";
import { useSiteContent } from "../../content/SiteContentProvider.jsx";

export default memo(function YouthUnionSection({ reducedMotion }) {
  const { content } = useSiteContent();

  return (
    <section className="youth-union-section" id="doan-thanh-nien" aria-label="Đoàn Thanh Niên Xã Mê Linh">
      <div className="youth-union-wrapper">
        {/* Curved Top Notch Cutout */}
        <div className="youth-union-notch">
          <div className="youth-union-badge">
            <Shield className="youth-union-badge-icon" aria-hidden="true" />
            <span>ĐOÀN THANH NIÊN XÃ MÊ LINH</span>
          </div>
        </div>

        {/* Main Inner Container */}
        <div className="youth-union-stage">
          {/* Main Headline */}
          <div className="youth-union-header">
            <h2 className="youth-union-title">
              <span className="youth-union-title-main">TUỔI TRẺ MÊ LINH</span>
              <span className="youth-union-title-sub">
                <em>KHÁT VỌNG</em> CỐNG HIẾN
              </span>
              <span className="youth-union-title-bottom">TIÊN PHONG SÁNG TẠO.</span>
            </h2>
          </div>

          {/* Three Column Grid */}
          <div className="youth-union-grid">
            {/* Left Nav Column */}
            <div className="youth-union-col youth-union-col-left">
              <p className="youth-union-label">DANH MỤC</p>
              <nav className="youth-union-nav-list" aria-label="Điều hướng Đoàn Thanh Niên">
                <a href="#home">TRANG CHỦ</a>
                <a href="#cau-chuyen">CÂU CHUYỆN LÀNG</a>
                <a href="#nhung-mua">NHỊP SỐNG MÙA</a>
                <a href="#kho-luu-tru">KHO LƯU TRỮ</a>
                <a href="#tin-tuc">HOẠT ĐỘNG ĐOÀN</a>
              </nav>
              <a className="youth-union-tag-btn" href="#tin-tuc">
                THÔNG TIN TỔ CHỨC <ArrowUpRight className="icon-sm" aria-hidden="true" />
              </a>
            </div>

            {/* Center Visual Emblem */}
            <div className="youth-union-visual">
              <div className="youth-union-emblem-frame">
                <img
                  src="/assets/youth-union-hero.jpg"
                  alt="Biểu trưng 3D Đoàn Thanh Niên Việt Nam Xã Mê Linh"
                  className="youth-union-emblem-img"
                  loading="lazy"
                />
                <div className="youth-union-emblem-glow" />
              </div>
            </div>

            {/* Right Social Column */}
            <div className="youth-union-col youth-union-col-right">
              <p className="youth-union-label">KÊNH THÔNG TIN</p>
              <ul className="youth-union-social-list">
                <li><a href="https://facebook.com" target="_blank" rel="noopener noreferrer">FACEBOOK ĐOÀN THÔN</a></li>
                <li><a href="https://zalo.me" target="_blank" rel="noopener noreferrer">ZALO KẾT NỐI TUỔI TRẺ</a></li>
                <li><a href="https://youtube.com" target="_blank" rel="noopener noreferrer">YOUTUBE THANH NIÊN</a></li>
                <li><a href="https://tiktok.com" target="_blank" rel="noopener noreferrer">TIKTOK MÊ LINH</a></li>
              </ul>
            </div>
          </div>

          {/* Bottom Action Pill Button */}
          <div className="youth-union-cta-wrap">
            <a className="youth-union-cta-btn" href="#tin-tuc">
              LIÊN HỆ THƯỜNG TRỰC ĐOÀN <ArrowUpRight aria-hidden="true" />
            </a>
          </div>

          {/* Partner Badges Strip */}
          <div className="youth-union-partners-bar" aria-label="Các đơn vị đồng hành">
            <span className="youth-partner-tag">ĐOÀN TNCS HỒ CHÍ MINH</span>
            <span className="youth-partner-tag">UBND XÃ MÊ LINH</span>
            <span className="youth-partner-tag">HUYỆN ĐOÀN MÊ LINH</span>
            <span className="youth-partner-tag">HỘI LHTN VIỆT NAM</span>
            <span className="youth-partner-tag">MÊ LINH GREEN</span>
            <span className="youth-partner-tag">TUỔI TRẺ TIÊN PHONG</span>
          </div>
        </div>

        {/* Bottom Copyright & Legal Bar */}
        <div className="youth-union-footer-bar">
          <div className="youth-union-footer-left">
            <span>© 2026 ĐOÀN THANH NIÊN XÃ MÊ LINH — HÀ NỘI. BẢN QUYỀN THUỘC VỀ TUỔI TRẺ MÊ LINH.</span>
          </div>
          <div className="youth-union-footer-right">
            <a href="/#admin" className="youth-footer-link" title="Mở trang quản trị">
              <Settings className="icon-xs" aria-hidden="true" /> QUẢN TRỊ ADMIN
            </a>
            <a href="#home" className="youth-footer-link" aria-label="Lên đầu trang">
              LÊN ĐẦU TRANG <ArrowUp className="icon-xs" aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
});
