import React, { useEffect, useRef, useState } from 'react';
import * as tf from '@tensorflow/tfjs';

const CHALLENGES = [
  'Please BLINK your eyes',
  'Please TURN your head LEFT',
  'Please SMILE'
];

function LivenessCheck({ onSuccess, onFailure }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const detectorRef = useRef(null);
  const rafRef = useRef(null);
  const timeoutRef = useRef(null);
  const lastDetectionTsRef = useRef(0);
  const isDetectingRef = useRef(false);
  const finishedRef = useRef(false);
  const challengeIndexRef = useRef(0);
  const challengeStartedAtRef = useRef(null);

  const [currentChallengeIndex, setCurrentChallengeIndex] = useState(0);
  const [completed, setCompleted] = useState([false, false, false]);
  const [failed, setFailed] = useState([false, false, false]);
  const [statusText, setStatusText] = useState('Initializing camera and face model...');
  const [countdown, setCountdown] = useState(3);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const finishSuccess = async () => {
    if (finishedRef.current) return;
    finishedRef.current = true;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      stopCamera();
      if (typeof onFailure === 'function') onFailure();
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        stopCamera();
        if (blob && typeof onSuccess === 'function') {
          onSuccess(blob);
          return;
        }
        if (typeof onFailure === 'function') onFailure();
      },
      'image/jpeg',
      0.95
    );
  };

  const failTimeout = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setStatusText('Liveness check timed out. Please try again.');
    stopCamera();
    if (typeof onFailure === 'function') onFailure();
  };

  const advanceChallenge = () => {
    const current = challengeIndexRef.current;
    setCompleted((prev) => {
      const next = [...prev];
      next[current] = true;
      return next;
    });

    if (current >= CHALLENGES.length - 1) {
      setStatusText('Liveness verified successfully.');
      finishSuccess();
      return;
    }

    const nextIndex = current + 1;
    challengeIndexRef.current = nextIndex;
    setCurrentChallengeIndex(nextIndex);
    challengeStartedAtRef.current = null;
    setCountdown(3);
    setStatusText(`Challenge ${nextIndex + 1} of ${CHALLENGES.length}. Hold face steady.`);
  };

  const evaluateTimerChallenge = (faceDetected) => {
    if (!faceDetected) {
      challengeStartedAtRef.current = null;
      setCountdown(3);
      const currentIdx = challengeIndexRef.current;
      setFailed((prev) => {
        const next = [...prev];
        next[currentIdx] = true;
        return next;
      });
      return;
    }

    setFailed((prev) => { const next = [...prev]; next[challengeIndexRef.current] = false; return next; });
    if (!challengeStartedAtRef.current) {
      challengeStartedAtRef.current = Date.now();
    }

    const elapsedMs = Date.now() - challengeStartedAtRef.current;
    const remainingMs = 3000 - elapsedMs;
    const nextCountdown = Math.max(1, Math.ceil(remainingMs / 1000));
    setCountdown(nextCountdown);

    if (remainingMs <= 0) {
      setCountdown(1);
      challengeStartedAtRef.current = null;
      advanceChallenge();
      return;
    }

    setStatusText(`Face detected. Hold steady... ${nextCountdown}`);
  };

  useEffect(() => {
    let isMounted = true;

    const detectLoop = async (ts) => {
      if (!isMounted || finishedRef.current) return;

      const video = videoRef.current;
      if (
        detectorRef.current &&
        video &&
        video.readyState >= 2 &&
        !isDetectingRef.current &&
        ts - lastDetectionTsRef.current >= 100
      ) {
        isDetectingRef.current = true;
        lastDetectionTsRef.current = ts;
        try {
          const faces = await detectorRef.current.estimateFaces(video);
          if (faces && faces.length > 0) {
            evaluateTimerChallenge(true);
          } else {
            evaluateTimerChallenge(false);
            setStatusText('Face not detected. Keep your face centered.');
          }
        } catch (_error) {
          setStatusText('Face detection error. Please hold still and try again.');
        } finally {
          isDetectingRef.current = false;
        }
      }

      rafRef.current = requestAnimationFrame(detectLoop);
    };

    const init = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: false
        });
        if (!isMounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        const video = videoRef.current;
        video.srcObject = stream;
        await new Promise((resolve) => {
          video.onloadedmetadata = () => resolve();
        });
        await video.play();

        await tf.setBackend('webgl');
        await tf.ready();

        const model = await import('@tensorflow-models/face-detection');
        detectorRef.current = await model.createDetector(
          model.SupportedModels.MediaPipeFaceDetector,
          { runtime: 'tfjs' }
        );

        setStatusText(`Challenge 1 of ${CHALLENGES.length}. Hold face steady.`);
        timeoutRef.current = setTimeout(failTimeout, 60000);
        rafRef.current = requestAnimationFrame(detectLoop);
      } catch (_error) {
        setStatusText('Could not access camera or initialize model.');
        if (typeof onFailure === 'function') onFailure();
      }
    };

    init();

    return () => {
      isMounted = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (detectorRef.current && typeof detectorRef.current.dispose === 'function') {
        detectorRef.current.dispose();
      }
      stopCamera();
    };
  }, []);

  return (
    <div
      style={{
        background: '#c2cbd3',
        color: '#313851',
        fontFamily: '"Space Grotesk", sans-serif',
        width: '100%',
        borderRadius: '12px',
        padding: '20px',
        boxSizing: 'border-box',
        position: 'relative'
      }}
    >
      <div
        style={{
          maxWidth: '860px',
          margin: '0 auto',
          border: '1px solid rgba(255,255,255,0.4)',
          borderRadius: '12px',
          background: 'rgba(255,255,255,0.2)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          boxShadow: '0 10px 20px rgba(49,56,81,0.12)',
          padding: '20px'
        }}
      >
        <h3 style={{ margin: '0 0 10px', fontSize: '24px', fontWeight: 700 }}>Liveness Check</h3>
        <p style={{ margin: '0 0 14px', fontSize: '14px', opacity: 0.85 }}>
          Follow each challenge below to confirm you are physically present.
        </p>

        <div
          style={{
            width: '100%',
            borderRadius: '10px',
            overflow: 'hidden',
            border: '4px solid white',
            background: '#1d2434',
            minHeight: '320px',
            position: 'relative',
            boxShadow: '0 0 40px 20px rgba(255,255,255,0.85), 0 0 80px 40px rgba(255,255,255,0.4)'
          }}
        >
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            style={{ width: '100%', height: '100%', display: 'block', objectFit: 'cover', filter: 'brightness(1.6) contrast(1.1)' }}
          />
        </div>

        <div
          style={{
            marginTop: '14px',
            padding: '12px',
            borderRadius: '10px',
            border: '1px solid rgba(49,56,81,0.2)',
            background: 'rgba(255,255,255,0.25)',
            fontSize: '18px',
            fontWeight: 700
          }}
        >
          {CHALLENGES[currentChallengeIndex]}
        </div>
        <p style={{ marginTop: '8px', marginBottom: 0, fontSize: '16px', fontWeight: 700 }}>
          {countdown === 3 ? '3...2...1' : countdown === 2 ? '2...1' : '1'}
        </p>

        <div style={{ marginTop: '14px', display: 'grid', gap: '8px' }}>
          {CHALLENGES.map((challenge, index) => (
            <div
              key={challenge}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '14px',
                fontWeight: 600
              }}
            >
              <span
                style={{
                  color: completed[index] ? '#16a34a' : failed[index] ? '#dc2626' : '#6b7280',
                  fontSize: '18px',
                  lineHeight: 1
                }}
              >
                {completed[index] ? '✓' : failed[index] ? '✗' : '○'}
              </span>
              <span style={{ color: completed[index] ? '#16a34a' : failed[index] ? '#dc2626' : 'inherit' }}>
                {challenge}
              </span>
            </div>
          ))}
        </div>

        <p style={{ marginTop: '14px', marginBottom: 0, fontSize: '13px', fontWeight: 600 }}>
          {statusText}
        </p>
      </div>
    </div>
  );
}

export default LivenessCheck;
