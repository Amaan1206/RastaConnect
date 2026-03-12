import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

function ShareRidePage() {
    const { token } = useParams();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        const fetchShare = async () => {
            try {
                const res = await fetch(`/api/bookings/share/${token}`);
                if (!res.ok) throw new Error('Not found');
                const json = await res.json();
                setData(json);
            } catch {
                setError(true);
            } finally {
                setLoading(false);
            }
        };
        fetchShare();
    }, [token]);

    const formatDateTime = (iso) => {
        if (!iso) return 'N/A';
        return new Date(iso).toLocaleDateString(undefined, {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    const statusColor = (s) => {
        if (s === 'confirmed') return { bg: 'rgba(134,239,172,0.55)', border: 'rgba(22,163,74,0.35)', color: '#166534' };
        if (s === 'pending') return { bg: 'rgba(253,224,71,0.4)', border: 'rgba(202,138,4,0.35)', color: '#854d0e' };
        if (s === 'cancelled') return { bg: 'rgba(252,165,165,0.4)', border: 'rgba(220,38,38,0.35)', color: '#991b1b' };
        return { bg: 'rgba(49,56,81,0.08)', border: 'rgba(49,56,81,0.15)', color: '#313851' };
    };

    const handleWhatsAppShare = () => {
        const url = window.location.href;
        const text = data
            ? `Check out my ride on RastaConnect!\n${data.origin} → ${data.destination}\nDriver: ${data.driverName}\n${url}`
            : url;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    };

    return (
        <>
            <style>{`
        .sr-page {
          min-height: 100vh;
          background: #c2cbd3;
          font-family: 'Space Grotesk', 'Segoe UI', Roboto, sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px 16px;
        }
        .sr-card {
          background: #fff;
          border-radius: 16px;
          max-width: 440px;
          width: 100%;
          box-shadow: 0 10px 40px rgba(49,56,81,0.15);
          overflow: hidden;
        }
        .sr-header {
          background: #313851;
          padding: 24px;
          text-align: center;
        }
        .sr-header h1 {
          margin: 0;
          font-size: 22px;
          font-weight: 700;
          color: #fff;
          letter-spacing: -0.02em;
        }
        .sr-header p {
          margin: 6px 0 0;
          font-size: 13px;
          color: rgba(255,255,255,0.6);
        }
        .sr-body {
          padding: 24px;
        }
        .sr-heading {
          font-size: 18px;
          font-weight: 700;
          color: #313851;
          margin: 0 0 20px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .sr-row {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 12px 0;
          border-bottom: 1px solid rgba(49,56,81,0.06);
        }
        .sr-row:last-of-type { border-bottom: none; }
        .sr-label {
          font-size: 12px;
          font-weight: 600;
          color: rgba(49,56,81,0.5);
          text-transform: uppercase;
          letter-spacing: 0.04em;
          min-width: 90px;
          flex-shrink: 0;
        }
        .sr-value {
          font-size: 14px;
          font-weight: 600;
          color: #313851;
          word-break: break-word;
        }
        .sr-whatsapp {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 14px;
          border: none;
          border-radius: 10px;
          background: #25D366;
          color: #fff;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          margin-top: 20px;
          font-family: inherit;
          transition: opacity 0.2s;
        }
        .sr-whatsapp:hover { opacity: 0.9; }
        .sr-footer {
          background: rgba(49,56,81,0.03);
          border-top: 1px solid rgba(49,56,81,0.06);
          padding: 16px 24px;
          text-align: center;
        }
        .sr-footer p {
          margin: 0;
          font-size: 11px;
          color: rgba(49,56,81,0.4);
          font-weight: 500;
        }
        .sr-center {
          text-align: center;
          padding: 60px 24px;
        }
        .sr-center h2 {
          color: #313851;
          font-size: 20px;
          margin: 0 0 8px;
        }
        .sr-center p {
          color: rgba(49,56,81,0.5);
          font-size: 14px;
          margin: 0;
        }
      `}</style>

            <div className="sr-page">
                <div className="sr-card">
                    <div className="sr-header">
                        <h1>RastaConnect</h1>
                        <p>Ride Safety Info</p>
                    </div>

                    {loading && (
                        <div className="sr-center">
                            <p>Loading ride details...</p>
                        </div>
                    )}

                    {error && !loading && (
                        <div className="sr-center">
                            <h2>Link Not Found</h2>
                            <p>This share link is invalid or has expired.</p>
                        </div>
                    )}

                    {data && !loading && (
                        <>
                            <div className="sr-body">
                                <h3 className="sr-heading">🛡️ Ride Details</h3>

                                <div className="sr-row">
                                    <span className="sr-label">Driver</span>
                                    <span className="sr-value">
                                        {data.driverName}
                                        {data.driverFaceVerified && (
                                            <span style={{ marginLeft: '8px', display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: '999px', fontSize: '10px', fontWeight: 700, color: '#166534', background: 'rgba(134,239,172,0.55)', border: '1px solid rgba(22,163,74,0.35)' }}>
                                                Face Verified ✓
                                            </span>
                                        )}
                                    </span>
                                </div>

                                <div className="sr-row">
                                    <span className="sr-label">Vehicle</span>
                                    <span className="sr-value">
                                        {[data.vehicleMake, data.vehicleModel].filter(Boolean).join(' ') || 'N/A'}
                                        {data.vehicleColor ? ` — ${data.vehicleColor}` : ''}
                                    </span>
                                </div>

                                <div className="sr-row">
                                    <span className="sr-label">Plate</span>
                                    <span className="sr-value">{data.vehiclePlate || 'N/A'}</span>
                                </div>

                                <div className="sr-row">
                                    <span className="sr-label">Route</span>
                                    <span className="sr-value">{data.origin} → {data.destination}</span>
                                </div>

                                <div className="sr-row">
                                    <span className="sr-label">Departure</span>
                                    <span className="sr-value">{formatDateTime(data.departureTime)}</span>
                                </div>

                                <div className="sr-row">
                                    <span className="sr-label">Status</span>
                                    <span style={{
                                        display: 'inline-flex', padding: '3px 10px', borderRadius: '999px',
                                        fontSize: '11px', fontWeight: 700,
                                        color: statusColor(data.bookingStatus).color,
                                        background: statusColor(data.bookingStatus).bg,
                                        border: `1px solid ${statusColor(data.bookingStatus).border}`,
                                        textTransform: 'capitalize'
                                    }}>
                                        {data.bookingStatus}
                                    </span>
                                </div>

                                <button className="sr-whatsapp" onClick={handleWhatsAppShare}>
                                    📱 Share on WhatsApp
                                </button>
                            </div>

                            <div className="sr-footer">
                                <p>Shared via RastaConnect — India's trusted carpooling platform</p>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </>
    );
}

export default ShareRidePage;
