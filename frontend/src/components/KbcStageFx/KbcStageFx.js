import './KbcStageFx.css';

/** Lightweight KBC studio backdrop — kept minimal for performance */
function KbcStageFx({ intensity = 'full' }) {
  const isLite = intensity === 'lite';

  return (
    <div className={`kbc-stage-fx ${isLite ? 'kbc-stage-fx--lite' : ''}`} aria-hidden="true">
      <div className="kbc-stage-vignette" />
      {!isLite && (
        <>
          <div className="kbc-spotlight-center" />
          <div className="kbc-stage-floor" />
        </>
      )}
    </div>
  );
}

export default KbcStageFx;
