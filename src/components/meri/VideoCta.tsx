export default function VideoCta() {
  return (
    <section className="p-0 mx-2" aria-label="section">
      <div className="container-fluid">
        <div className="row">
          <div className="col-lg-12">
            <a className="d-block hover popup-youtube overflow-hidden rounded-1" href="https://www.youtube.com/watch?v=C6rf51uHWJg">
              <div className="relative overflow-hidden media-frame media-frame--ultra">
                <div className="absolute start-0 w-100 abs-middle fs-36 text-white text-center z-2">
                  <div className="player bg-color no-border circle wow scaleIn"><span></span></div>
                </div>
                <div className="absolute w-100 h-100 top-0 bg-dark hover-op-05"></div>
                <img src="/images/Europaplatz_Fotos/Selection_Auswahl/_DSC6639.jpg" className="w-100 hover-scale-1-1" alt="" />
              </div>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
