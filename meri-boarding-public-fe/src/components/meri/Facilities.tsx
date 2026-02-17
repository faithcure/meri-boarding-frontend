import type { HomeResolvedContent } from "@/lib/homeContentApi";

type FacilitiesProps = {
  content?: HomeResolvedContent["facilities"];
};

export default function Facilities({ content }: FacilitiesProps = {}) {
  const stats = (content?.stats || []).slice(0, 3);
  while (stats.length < 3) {
    stats.push({ label: "", suffix: "" });
  }

  const t = {
    subtitle: content?.subtitle || "",
    title: content?.title || "",
    description: content?.description || "",
    stats,
    primaryImage: content?.primaryImage || "",
    secondaryImage: content?.secondaryImage || "",
    statsNumbers: content?.statsNumbers || [0, 0, 0]
  };

  return (
    <section>
      <div className="container">
        <div className="row g-4 mb-4 justify-content-center">
          <div className="col-lg-6 text-center">
            <div className="subtitle id-color wow fadeInUp" data-wow-delay=".0s">
              {t.subtitle}
            </div>
            <h2 className="wow fadeInUp" data-wow-delay=".2s">{t.title}</h2>
            <p className="cwow fadeInUp" data-wow-delay=".4s">
              {t.description}
            </p>
          </div>
        </div>

        <div className="row g-4">
          <div className="col-md-6">
            <div className="h-100 rounded-1 mh-300 wow fadeInUp" data-bgimage={`url(${t.primaryImage}) center`}></div>
          </div>

          <div className="col-md-6">
            <div className="row g-4">
              <div className="col-md-6 wow fadeInUp" data-wow-delay=".0s">
                <div className="p-30 bg-white rounded-1 h-100">
                  <small className="text-uppercase border-bottom d-block">{t.stats[0].label}</small>
                  <div className="sm-hide spacer-double"></div>
                  <div className="spacer-double"></div>
                  <h2 className="mb-0">
                    <span className="timer" data-to={t.statsNumbers?.[0] ?? 0} data-speed="3000">
                      0
                    </span>
                    <span className="id-color">+</span>
                  </h2>
                  {t.stats[0].suffix}
                </div>
              </div>

              <div className="col-md-6 wow fadeInUp" data-wow-delay=".2s">
                <div className="p-30 bg-white rounded-1 h-100">
                  <small className="text-uppercase border-bottom d-block">{t.stats[1].label}</small>
                  <div className="sm-hide spacer-double"></div>
                  <div className="spacer-double"></div>
                  <h2 className="mb-0">
                    <span className="timer" data-to={t.statsNumbers?.[1] ?? 0} data-speed="3000">
                      0
                    </span>
                    <span className="id-color">+</span>
                  </h2>
                  {t.stats[1].suffix}
                </div>
              </div>

              <div className="col-md-6 wow fadeInUp" data-wow-delay=".4s">
                <div className="p-30 bg-white rounded-1 h-100">
                  <small className="text-uppercase border-bottom d-block">{t.stats[2].label}</small>
                  <div className="sm-hide spacer-double"></div>
                  <div className="spacer-double"></div>
                  <h2 className="mb-0">
                    <span className="timer" data-to={t.statsNumbers?.[2] ?? 0} data-speed="3000">
                      0
                    </span>
                    <span className="id-color">+</span>
                  </h2>
                  {t.stats[2].suffix}
                </div>
              </div>

              <div className="col-md-6 wow fadeInUp sm-hide d-md-block d-xs-none" data-wow-delay=".6s">
                <div className="p-30 bg-dark-2 rounded-1 h-100" data-bgimage={`url(${t.secondaryImage}) center`}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
