import {MarketingHeader} from "@/components/marketing-header";
import {MarketingPhoto} from "@/components/marketing-photo";
import {marketingImages as img} from "@/lib/image-paths";

export function HomeHero() {
  return (
    <section style={{background: "#101B2D", color: "#F6F4F0", padding: "20px 0 0", overflow: "hidden"}}>
      <div className="wrap">
        <MarketingHeader />
        <div className="hero-layout">
          <div className="hero-copy">
            <div className="eyebrow rise" style={{color: "#58B077"}}>
              <span className="dot"></span>
              Custom teamwear · factory-direct
            </div>
            <h1 className="disp headline-hero rise" style={{margin: 0, animationDelay: ".1s"}}>
              Dressed for the level <span style={{color: "#58B077"}}>you play.</span>
            </h1>
            <p
              className="rise"
              style={{margin: 0, fontSize: "20px", lineHeight: 1.5, color: "#B8C2D3", maxWidth: "460px", animationDelay: ".2s"}}
            >
              Designed with you. Made direct. Tracked live.
            </p>
            <div className="rise" style={{display: "flex", flexWrap: "wrap", gap: "12px", animationDelay: ".3s"}}>
              <a className="btn btn-g" href="/consult">
                Book a 15-min consult <span aria-hidden="true">→</span>
              </a>
              <a className="btn btn-o" href="/pricing">
                See pricing
              </a>
            </div>
            <div className="hero-stats rise" style={{animationDelay: ".4s"}}>
              <div className="hero-stat">
                <div className="disp hero-stat-value">
                  3<span className="hero-stat-accent"> days</span>
                </div>
                <div className="hero-stat-label">to first mockup</div>
              </div>
              <div className="hero-stat">
                <div className="disp hero-stat-value">
                  <span className="hero-stat-accent">$</span>0
                </div>
                <div className="hero-stat-label">design fees</div>
              </div>
              <div className="hero-stat">
                <div className="disp hero-stat-value">
                  35<span className="hero-stat-accent">%</span>
                </div>
                <div className="hero-stat-label">less than dealers</div>
              </div>
              <div className="hero-stat">
                <div className="disp hero-stat-value">
                  12<span className="hero-stat-accent"> sports</span>
                </div>
                <div className="hero-stat-label">in one program roll-out</div>
              </div>
            </div>
          </div>
          <div className="hero-media">
            <div className="hero-media-inner">
              <MarketingPhoto
                src={img.heroPlayer}
                alt="Soccer player in custom Volta match kit"
                className="ph ph-d rise"
                style={{position: "absolute", inset: 0, animationDelay: ".15s"}}
                priority
                sizes="(max-width: 1024px) 100vw, 480px"
              />
            </div>
            <div className="hero-overlay-stack">
              <div
                className="float1 hero-overlay-card"
                style={{
                  background: "#F6F4F0",
                  color: "#0F1724",
                  borderRadius: "18px",
                  padding: "14px 18px",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  boxShadow: "0 18px 40px rgba(0,0,0,.35)",
                }}
              >
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "12px",
                    background: "#58B077",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flex: "none",
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0F1724" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </div>
                <div style={{minWidth: 0}}>
                  <div style={{fontSize: "14px", fontWeight: "700"}}>Home kit approved</div>
                  <div style={{fontSize: "12px", color: "#4A5566"}}>Proof v3 · 2 min ago</div>
                </div>
              </div>
              <div
                className="float2 hero-overlay-card"
                style={{
                  background: "#16243A",
                  border: "1px solid #26395A",
                  borderRadius: "18px",
                  padding: "16px 18px",
                  boxShadow: "0 18px 40px rgba(0,0,0,.35)",
                }}
              >
                <div style={{display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#B8C2D3"}}>
                  <span>In production</span>
                  <span>Wk 5 of 6</span>
                </div>
                <div style={{marginTop: "10px", height: "8px", borderRadius: "999px", background: "#26395A", overflow: "hidden"}}>
                  <div className="bar"></div>
                </div>
                <div style={{marginTop: "10px", fontSize: "14px", fontWeight: "700"}}>38 kits · ships Friday</div>
              </div>
            </div>
            <div
              className="disp hero-watermark"
              aria-hidden="true"
              style={{
                position: "absolute",
                right: "24px",
                top: "20px",
                fontSize: "clamp(80px, 12vw, 150px)",
                color: "transparent",
                WebkitTextStroke: "2px #58B077",
                pointerEvents: "none",
              }}
            >
              07
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
