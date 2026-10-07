import {MarketingHeader} from "@/components/marketing-header";

export function PricingHeroBand() {
  return (
    <section className="pricing-hero-section" style={{background: "#101B2D", color: "#F6F4F0", padding: "20px 0 104px"}}>
      <div className="wrap">
        <MarketingHeader active="/pricing" />
        <div className="pricing-hero-top page-hero-pad">
          <div className="pricing-hero-copy">
            <div className="eyebrow rise" style={{color: "#58B077"}}>
              <span className="dot"></span>
              Pricing
            </div>
            <h1 className="disp headline-page rise" style={{margin: 0, animationDelay: ".1s"}}>
              Real prices. <span style={{color: "#58B077"}}>Right here.</span>
            </h1>
            <p className="rise" style={{margin: 0, fontSize: 20, color: "#B8C2D3", animationDelay: ".2s"}}>
              No quote forms. No dealer markup.
            </p>
          </div>
          <div className="pricing-savings-badge float1 rise" style={{animationDelay: ".3s"}}>
            <div className="disp pricing-savings-value">−35%</div>
            <div style={{fontSize: 16, fontWeight: 700, marginTop: 8}}>vs. traditional dealers</div>
          </div>
        </div>
      </div>
    </section>
  );
}
