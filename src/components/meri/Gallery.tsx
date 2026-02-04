import type { Locale } from "@/i18n/getLocale";
import { getLocale } from "@/i18n/getLocale";
import { getMessages } from "@/i18n/messages";

type GalleryProps = {
  locale?: Locale;
};

export default async function Gallery({ locale: localeProp }: GalleryProps = {}) {
  const locale = localeProp ?? (await getLocale());
  const t = getMessages(locale).gallery;
  return (
    <section className="bg-color-op-1 rounded-1 mx-2">
      <div className="container">
        <div className="row g-4 gx-5 align-items-center justify-content-between">
          <div className="col-lg-6">
            <div className="subtitle wow fadeInUp" data-wow-delay=".0s">{t.subtitle}</div>
            <h2 className="wow fadeInUp" data-wow-delay=".2s">
              {t.title}
            </h2>
          </div>
          <div className="col-lg-6">
            <p className="wow fadeInUp" data-wow-delay=".4s">
              {t.description}
            </p>
          </div>
        </div>

        <div className="spacer-single"></div>

        <div className="row">
          <div className="col-md-12 text-center">
            <ul id="filters" className="wow fadeInUp" data-wow-delay="0s">
              <li><a href="#" data-filter="*" className="selected">{t.filters.all}</a></li>
              <li><a href="#" data-filter=".rooms">{t.filters.rooms}</a></li>
              <li><a href="#" data-filter=".dining">{t.filters.dining}</a></li>
              <li><a href="#" data-filter=".facilities">{t.filters.facilities}</a></li>
            </ul>
          </div>
        </div>

        <div id="gallery" className="row g-3 wow fadeIn" data-wow-delay=".3s">
          <div className="col-md-3 col-sm-6 col-12 item rooms">
            <a href="/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6699.jpg" className="image-popup d-block hover">
              <div className="relative overflow-hidden rounded-1 media-frame">
                <div className="absolute start-0 w-100 hover-op-1 p-5 abs-middle z-3 text-center text-white">{t.view}</div>
                <div className="absolute start-0 w-100 h-100 overlay-black-5 hover-op-1 z-2"></div>
                <img src="/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6699.jpg" className="w-100 hover-scale-1-2" alt="" />
              </div>
            </a>
          </div>

          <div className="col-md-3 col-sm-6 col-12 item dining">
            <a href="/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6844.jpg" className="image-popup d-block hover">
              <div className="relative overflow-hidden rounded-1 media-frame">
                <div className="absolute start-0 w-100 hover-op-1 p-5 abs-middle z-3 text-center text-white">{t.view}</div>
                <div className="absolute start-0 w-100 h-100 overlay-black-5 hover-op-1 z-2"></div>
                <img src="/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6844.jpg" className="w-100 hover-scale-1-2" alt="" />
              </div>
            </a>
          </div>

          <div className="col-md-3 col-sm-6 col-12 item facilities">
            <a href="/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6861.jpg" className="image-popup d-block hover">
              <div className="relative overflow-hidden rounded-1 media-frame">
                <div className="absolute start-0 w-100 hover-op-1 p-5 abs-middle z-3 text-center text-white">{t.view}</div>
                <div className="absolute start-0 w-100 h-100 overlay-black-5 hover-op-1 z-2"></div>
                <img src="/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6861.jpg" className="w-100 hover-scale-1-2" alt="" />
              </div>
            </a>
          </div>

          <div className="col-md-3 col-sm-6 col-12 item rooms">
            <a href="/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6754.jpg" className="image-popup d-block hover">
              <div className="relative overflow-hidden rounded-1 media-frame">
                <div className="absolute start-0 w-100 hover-op-1 p-5 abs-middle z-3 text-center text-white">{t.view}</div>
                <div className="absolute start-0 w-100 h-100 overlay-black-5 hover-op-1 z-2"></div>
                <img src="/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6754.jpg" className="w-100 hover-scale-1-2" alt="" />
              </div>
            </a>
          </div>

          <div className="col-md-3 col-sm-6 col-12 item dining">
            <a href="/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6856-Bearbeitet.jpg" className="image-popup d-block hover">
              <div className="relative overflow-hidden rounded-1 media-frame">
                <div className="absolute start-0 w-100 hover-op-1 p-5 abs-middle z-3 text-center text-white">{t.view}</div>
                <div className="absolute start-0 w-100 h-100 overlay-black-5 hover-op-1 z-2"></div>
                <img src="/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6856-Bearbeitet.jpg" className="w-100 hover-scale-1-2" alt="" />
              </div>
            </a>
          </div>

          <div className="col-md-3 col-sm-6 col-12 item rooms">
            <a href="/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6821-Bearbeitet.jpg" className="image-popup d-block hover">
              <div className="relative overflow-hidden rounded-1 media-frame">
                <div className="absolute start-0 w-100 hover-op-1 p-5 abs-middle z-3 text-center text-white">{t.view}</div>
                <div className="absolute start-0 w-100 h-100 overlay-black-5 hover-op-1 z-2"></div>
                <img src="/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6821-Bearbeitet.jpg" className="w-100 hover-scale-1-2" alt="" />
              </div>
            </a>
          </div>

          <div className="col-md-3 col-sm-6 col-12 item facilities">
            <a href="/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6716.jpg" className="image-popup d-block hover">
              <div className="relative overflow-hidden rounded-1 media-frame">
                <div className="absolute start-0 w-100 hover-op-1 p-5 abs-middle z-3 text-center text-white">{t.view}</div>
                <div className="absolute start-0 w-100 h-100 overlay-black-5 hover-op-1 z-2"></div>
                <img src="/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6716.jpg" className="w-100 hover-scale-1-2" alt="" />
              </div>
            </a>
          </div>

          <div className="col-md-3 col-sm-6 col-12 item rooms">
            <a href="/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6744.jpg" className="image-popup d-block hover">
              <div className="relative overflow-hidden rounded-1 media-frame">
                <div className="absolute start-0 w-100 hover-op-1 p-5 abs-middle z-3 text-center text-white">{t.view}</div>
                <div className="absolute start-0 w-100 h-100 overlay-black-5 hover-op-1 z-2"></div>
                <img src="/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6744.jpg" className="w-100 hover-scale-1-2" alt="" />
              </div>
            </a>
          </div>

          <div className="col-md-3 col-sm-6 col-12 item facilities">
            <a href="/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6709.jpg" className="image-popup d-block hover">
              <div className="relative overflow-hidden rounded-1 media-frame">
                <div className="absolute start-0 w-100 hover-op-1 p-5 abs-middle z-3 text-center text-white">{t.view}</div>
                <div className="absolute start-0 w-100 h-100 overlay-black-5 hover-op-1 z-2"></div>
                <img src="/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6709.jpg" className="w-100 hover-scale-1-2" alt="" />
              </div>
            </a>
          </div>

          <div className="col-md-3 col-sm-6 col-12 item rooms">
            <a href="/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6756.jpg" className="image-popup d-block hover">
              <div className="relative overflow-hidden rounded-1 media-frame">
                <div className="absolute start-0 w-100 hover-op-1 p-5 abs-middle z-3 text-center text-white">{t.view}</div>
                <div className="absolute start-0 w-100 h-100 overlay-black-5 hover-op-1 z-2"></div>
                <img src="/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6756.jpg" className="w-100 hover-scale-1-2" alt="" />
              </div>
            </a>
          </div>

          <div className="col-md-3 col-sm-6 col-12 item dining">
            <a href="/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6846.jpg" className="image-popup d-block hover">
              <div className="relative overflow-hidden rounded-1 media-frame">
                <div className="absolute start-0 w-100 hover-op-1 p-5 abs-middle z-3 text-center text-white">{t.view}</div>
                <div className="absolute start-0 w-100 h-100 overlay-black-5 hover-op-1 z-2"></div>
                <img src="/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6846.jpg" className="w-100 hover-scale-1-2" alt="" />
              </div>
            </a>
          </div>

          <div className="col-md-3 col-sm-6 col-12 item facilities">
            <a href="/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6726.jpg" className="image-popup d-block hover">
              <div className="relative overflow-hidden rounded-1 media-frame">
                <div className="absolute start-0 w-100 hover-op-1 p-5 abs-middle z-3 text-center text-white">{t.view}</div>
                <div className="absolute start-0 w-100 h-100 overlay-black-5 hover-op-1 z-2"></div>
                <img src="/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6726.jpg" className="w-100 hover-scale-1-2" alt="" />
              </div>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
