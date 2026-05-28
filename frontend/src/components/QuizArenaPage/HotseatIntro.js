import React, { useEffect, useRef, useState } from 'react';
import './HotseatIntro.css';
import KbcLogo from './KbcLogo';

export default function HotseatIntro({ onComplete, onTransitionStart, contestantName, introTitle }) {
  const [stage, setStage] = useState('start'); // start -> zoom -> flash -> welcome -> fade-out -> finish
  const audioRef = useRef(null);

  const fullTitle = introTitle || "Kaun Banega Codepati";

  useEffect(() => {
    // Play music
    const audio = new Audio('/kaunbanegacrorepati.mp3');
    audioRef.current = audio;
    
    let fallbackTimer;
    
    const finishIntro = () => {
      setStage('finish');
      setTimeout(() => {
        if (onComplete) onComplete();
      }, 1000); // 1-second fade out
    };

    audio.play().catch(e => {
      console.log('Audio autoplay blocked', e);
      fallbackTimer = setTimeout(finishIntro, 15000);
    });

    // Animation sequence
    const t1 = setTimeout(() => setStage('zoom'), 8000);
    const t2 = setTimeout(() => setStage('flash'), 12500);
    const t3 = setTimeout(() => setStage('welcome'), 13000);
    
    const t4 = setTimeout(() => {
      setStage('fade-out');
      if (onTransitionStart) onTransitionStart();
    }, 16500); // 16.5s: Reveal the arena underneath

    const t5 = setTimeout(() => {
      // Fade out audio smoothly over the last 1.5s
      if (audioRef.current) {
        const fadeInterval = setInterval(() => {
          if (audioRef.current.volume > 0.05) {
            audioRef.current.volume -= 0.05;
          } else {
            clearInterval(fadeInterval);
            audioRef.current.pause();
          }
        }, 100);
      }
      finishIntro();
    }, 19000); // 19s: Audio fades completely and intro unmounts

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
      clearTimeout(fallbackTimer);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`hotseat-intro-container stage-${stage}`}>
      <div className="drone-camera">
        <div className="intro-rings">
          <div className="intro-floor-grid"></div>
          <div className="intro-ring ring-1"></div>
          <div className="intro-ring ring-2"></div>
          <div className="intro-ring ring-3"></div>
          <div className="intro-ring ring-4"></div>
        </div>
        <div className="intro-spotlight"></div>
        <div className="intro-spotlight-beam beam-left"></div>
        <div className="intro-spotlight-beam beam-right"></div>
      </div>
      
      <div className="intro-content" style={{ opacity: (stage === 'start' || stage === 'welcome' || stage === 'fade-out' || stage === 'finish') ? 0 : 1, transition: 'opacity 1s ease' }}>
        <KbcLogo title={fullTitle} />
        
        <div className="intro-player-card">
          <p className="intro-subtitle">HOTSEAT CONTENDER</p>
          <h2 className="intro-name">{contestantName || 'CONTESTANT'}</h2>
        </div>
      </div>

      <div className={`intro-welcome-msg ${(stage === 'welcome' || stage === 'fade-out') ? 'visible' : ''}`} style={{ opacity: stage === 'fade-out' ? 0 : undefined }}>
        <h1 className="welcome-text">WELCOME TO THE HOTSEAT</h1>
        <p className="welcome-subtext">The ultimate test of knowledge begins now.</p>
      </div>

      <div className="intro-flash-overlay"></div>
    </div>
  );
}
