import { useEffect, useRef, useState } from 'react';
import './ReflectiveCard.css';
import { Fingerprint, Activity, Lock } from 'lucide-react';
import { acquireSharedCamera } from '../../cameraStream.ts';

const CAM_ERROR_TEXT = {
  denied: '摄像头权限被拒绝，已显示占位画面。',
  missing: '没有可用的摄像头，已显示占位画面。',
  unsupported: '当前环境不支持摄像头，已显示占位画面。'
};

const ReflectiveCard = ({
  blurStrength = 12,
  color = 'white',
  metalness = 1,
  roughness = 0.4,
  overlayColor = 'rgba(255, 255, 255, 0.1)',
  grayscale = 1,
  className = '',
  style = {},
  preview = false
}) => {
  const videoRef = useRef(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [camError, setCamError] = useState(null);

  useEffect(() => {
    if (preview || !cameraOn) return;
    const video = videoRef.current;
    if (!video) return;

    let cancelled = false;
    const release = acquireSharedCamera({
      video,
      onError: failure => {
        if (cancelled) return;
        setCamError(failure);
        setCameraOn(false);
      }
    });

    return () => {
      cancelled = true;
      release();
      if (video.srcObject) video.srcObject = null;
    };
  }, [preview, cameraOn]);

  const saturation = 1 - Math.max(0, Math.min(1, grayscale));
  const cssVariables = {
    '--blur-strength': `${blurStrength}px`,
    '--metalness': metalness,
    '--roughness': roughness,
    '--overlay-color': overlayColor,
    '--text-color': color,
    '--saturation': saturation
  };

  const toggleCamera = () => {
    setCamError(null);
    setCameraOn(on => !on);
  };

  return (
    <div className={`reflective-card-frame${preview ? ' is-preview' : ''}${className ? ` ${className}` : ''}`}>
      <div className="reflective-card-scaler">
        <div className="reflective-card-container" style={{ ...style, ...cssVariables }}>
          <div className="reflective-fallback" />
          {cameraOn && (
            <video ref={videoRef} autoPlay playsInline muted disablePictureInPicture className="reflective-video" />
          )}

          <div className="reflective-noise" />
          <div className="reflective-sheen" />
          <div className="reflective-border" />

          <div className="reflective-content">
            <div className="card-header">
              <div className="security-badge">
                <Lock size={14} className="security-icon" />
                <span>SECURE ACCESS</span>
              </div>
              <Activity className="status-icon" size={20} />
            </div>

            <div className="card-body">
              <div className="user-info">
                <h2 className="user-name">ALEXANDER DOE</h2>
                <p className="user-role">SENIOR DEVELOPER</p>
              </div>
            </div>

            <div className="card-footer">
              <div className="id-section">
                <span className="label">ID NUMBER</span>
                <span className="value">8901-2345-6789</span>
              </div>
              <div className="fingerprint-section">
                <Fingerprint size={32} className="fingerprint-icon" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {!preview && (
        <div className="reflective-cam-bar">
          <p className="reflective-cam-note">画面只在本地渲染，不上传、不保存。</p>
          <button
            type="button"
            className="reflective-cam-toggle"
            aria-pressed={cameraOn}
            onClick={toggleCamera}
          >
            {cameraOn ? '摄像头已开启 · 点击关闭' : '开启摄像头反射'}
          </button>
          {camError && <p className="reflective-cam-error">{CAM_ERROR_TEXT[camError] || CAM_ERROR_TEXT.unsupported}</p>}
        </div>
      )}
    </div>
  );
};

export default ReflectiveCard;
