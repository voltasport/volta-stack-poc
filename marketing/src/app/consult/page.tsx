import {ConsultForm} from "@/components/consult-form";
import {SiteFooter, SiteHeader} from "@/components/site-frame";

export default function ConsultPage() {
  return (
    <div style={{minHeight: "100vh", background: "#F6F4F0"}}>
      <SiteHeader />
      <section style={{padding: "72px 0 96px"}}>
        <div className="wrap consult-grid" style={{display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(280px,420px)", gap: 48}}>
          <div>
            <p className="eyebrow" style={{color: "#2E7A4A"}}>
              <span className="dot" /> Book a consult
            </p>
            <h1 className="disp" style={{margin: "16px 0 0", fontSize: "clamp(64px,8vw,112px)", color: "#101B2D"}}>
              Let&apos;s talk kit.
            </h1>
            <p style={{fontSize: 20, lineHeight: 1.5, maxWidth: 460}}>
              15 minutes. Free advice, worst case.
            </p>
            <ol style={{display: "flex", flexDirection: "column", gap: 14, marginTop: 32, padding: 0, listStyle: "none"}}>
              {["Tell us about your program", "Pick a 15-minute slot", "Mockups in 3 business days"].map(
                (step, index) => (
                  <li key={step} style={{display: "flex", gap: 16, alignItems: "baseline"}}>
                    <span className="disp" style={{fontSize: 28, color: "#2E7A4A"}}>
                      0{index + 1}
                    </span>
                    <span style={{fontSize: 18}}>{step}</span>
                  </li>
                ),
              )}
            </ol>
            <p style={{marginTop: 28}}>
              <a href="mailto:hello@voltasport.co">hello@voltasport.co</a>
            </p>
          </div>
          <div style={{background: "#fff", borderRadius: 28, padding: 28}}>
            <ConsultForm />
          </div>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
