import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import OfferRide from '../components/OfferRide';
import RideList from '../components/RideList';
import { supabase } from '../supabaseClient';

function HomePage() {
  const { currentUser, authToken } = useOutletContext();
  const [allRides, setAllRides] = useState([]);
  const [isLoadingRides, setIsLoadingRides] = useState(true);
  const [infoMessage, setInfoMessage] = useState('');
  const [searchOrigin, setSearchOrigin] = useState('');
  const [searchDestination, setSearchDestination] = useState('');
  const [alertOrigin, setAlertOrigin] = useState('');
  const [alertDestination, setAlertDestination] = useState('');
  const [alertTravelDate, setAlertTravelDate] = useState('');
  const [isSettingAlert, setIsSettingAlert] = useState(false);
  const [alertToast, setAlertToast] = useState('');

  const fetchRides = () => {
    if (!authToken) { window.location.href = '/login'; return; }
    setIsLoadingRides(true);
    fetch('/api/rides', { headers: { 'Authorization': `Bearer ${authToken}` } })
      .then(async (res) => {
        if (!res.ok) {
          const errData = await res.json().catch(() => ({ message: "An unknown error occurred." }));
          throw new Error(errData.message || 'Failed to fetch rides');
        }
        return res.json();
      })
      .then(data => {
        setAllRides(data.rides || []);
      })
      .catch(err => {
        console.error("Caught an error:", err);
        setInfoMessage(err.message);
      })
      .finally(() => {
        setIsLoadingRides(false);
      });
  };

  useEffect(() => {
    fetchRides();
    const ridesChannel = supabase
      .channel('rides')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rides' },
        () => {
          fetchRides();
        }
      )
      .subscribe();

    return () => {
      ridesChannel.unsubscribe();
    };
  }, [authToken]);

  const filteredRides = useMemo(() => {
    if (!allRides) return [];
    return allRides.filter(ride => {
      const originMatch = ride.origin.toLowerCase().includes(searchOrigin.toLowerCase());
      const destinationMatch = ride.destination.toLowerCase().includes(searchDestination.toLowerCase());
      return originMatch && destinationMatch;
    });
  }, [allRides, searchOrigin, searchDestination]);

  useEffect(() => {
    if (!alertToast) return undefined;
    const timer = setTimeout(() => setAlertToast(''), 4000);
    return () => clearTimeout(timer);
  }, [alertToast]);

  const handleSetAlert = async (e) => {
    e.preventDefault();
    if (!authToken) { window.location.href = '/login'; return; }
    if (!alertOrigin.trim() || !alertDestination.trim()) {
      setAlertToast('Please enter both origin and destination.');
      return;
    }
    setIsSettingAlert(true);
    try {
      const response = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({
          origin: alertOrigin.trim(),
          destination: alertDestination.trim(),
          travelDate: alertTravelDate || null
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to set alert.');
      setAlertToast("Alert set! We'll email you when a matching ride is posted.");
      setAlertOrigin('');
      setAlertDestination('');
      setAlertTravelDate('');
    } catch (error) {
      setAlertToast(error.message);
    } finally {
      setIsSettingAlert(false);
    }
  };

  return (
    <>
      <style>{`
        main.main-content {
          max-width: 100% !important;
          width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          background: #c2cbd3;
        }
        .hs-page {
          min-height: calc(100vh - 64px);
          background: #c2cbd3;
          color: #313851;
          font-family: 'Space Grotesk', sans-serif;
          padding: 32px 24px 0;
        }
        .hs-container {
          max-width: 1280px;
          margin: 0 auto;
        }
        .hs-hero {
          border-radius: 24px;
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 18px 28px rgba(49, 56, 81, 0.12);
          padding: 48px;
          margin-bottom: 32px;
        }
        .hs-hero h1 {
          margin: 0;
          color: #313851;
          font-size: 64px;
          font-weight: 900;
          line-height: 1.1;
          letter-spacing: -0.03em;
        }
        .hs-hero p {
          margin: 12px 0 0;
          color: rgba(49, 56, 81, 0.8);
          font-size: 26px;
          line-height: 1.35;
        }
        .hs-hero .hs-hero-subline {
          margin-top: 2px;
        }
        .hs-hero-btn {
          margin-top: 18px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.4);
          color: #313851;
          font-size: 24px;
          font-weight: 700;
          font-family: 'Space Grotesk', sans-serif;
          padding: 14px 26px;
          box-shadow: 0 12px 24px rgba(49, 56, 81, 0.08);
        }
        .hs-layout {
          display: grid;
          grid-template-columns: 5fr 7fr;
          gap: 32px;
          align-items: start;
        }
        .hs-side-stack {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .hs-card {
          border-radius: 18px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          box-shadow: 0 6px 16px rgba(49, 56, 81, 0.08);
          padding: 24px;
        }
        .hs-section-title {
          margin: 0 0 16px;
          color: #313851;
          font-size: 36px;
          font-weight: 700;
          line-height: 1.2;
          letter-spacing: -0.02em;
        }
        .hs-quick-title {
          margin: 0 0 14px;
          color: #313851;
          font-size: 32px;
          font-weight: 700;
          line-height: 1.2;
          letter-spacing: -0.02em;
        }
        .hs-quick-stack {
          display: grid;
          gap: 12px;
        }
        .hs-input {
          width: 100%;
          border: 1px solid rgba(255, 255, 255, 0.2);
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          padding: 12px 14px;
          color: #313851;
          font-size: 15px;
          line-height: 1.4;
          outline: none;
        }
        .hs-input::placeholder {
          color: rgba(49, 56, 81, 0.55);
        }
        .hs-input:focus {
          border-color: #313851;
          box-shadow: 0 0 0 2px rgba(49, 56, 81, 0.18);
        }
        .hs-input-select {
          appearance: auto;
        }
        .hs-offer-grid {
          display: grid;
          gap: 16px;
        }
        .hs-offer-field {
          display: grid;
          gap: 6px;
        }
        .hs-offer-label {
          color: rgba(49, 56, 81, 0.7);
          font-size: 14px;
          font-weight: 600;
          line-height: 1.35;
        }
        .hs-offer-two-col {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .hs-post-btn {
          width: 100%;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.3);
          background: rgba(255, 255, 255, 0.2);
          box-shadow: 0 10px 20px rgba(49, 56, 81, 0.08);
          color: #313851;
          font-size: 26px;
          font-weight: 900;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          font-family: 'Space Grotesk', sans-serif;
          padding: 14px 12px;
        }
        .hs-post-btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }
        .hs-rides-wrap {
          display: grid;
          gap: 14px;
        }
        .hs-rides-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .hs-rides-title {
          margin: 0;
          color: #313851;
          font-size: 36px;
          font-weight: 700;
          line-height: 1.2;
          letter-spacing: -0.02em;
        }
        .hs-filter-btn {
          border: 1px solid rgba(255, 255, 255, 0.2);
          background: rgba(255, 255, 255, 0.1);
          color: #313851;
          border-radius: 10px;
          padding: 8px 12px;
          font-size: 14px;
          font-weight: 700;
          font-family: 'Space Grotesk', sans-serif;
        }
        .hs-info-message {
          margin: 0;
          border-radius: 10px;
          border: 1px solid rgba(49, 56, 81, 0.2);
          background: rgba(255, 255, 255, 0.35);
          color: #313851;
          padding: 12px 14px;
          font-size: 14px;
        }
        .hs-rides-list {
          display: grid;
          gap: 12px;
        }
        .hs-empty-state {
          border-radius: 16px;
          border: 1px dashed rgba(255, 255, 255, 0.3);
          background: rgba(255, 255, 255, 0.05);
          padding: 56px 18px;
          text-align: center;
        }
        .hs-empty-text {
          margin: 0;
          color: rgba(49, 56, 81, 0.65);
          font-size: 18px;
          font-weight: 600;
          line-height: 1.35;
        }
        .hs-empty-subtext {
          margin: 6px 0 0;
          color: rgba(49, 56, 81, 0.45);
          font-size: 13px;
          line-height: 1.35;
        }
        .hs-ride-card {
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.25);
          background: rgba(255, 255, 255, 0.08);
          padding: 18px;
          display: grid;
          gap: 8px;
        }
        .hs-ride-title {
          margin: 0;
          color: #313851;
          font-size: 24px;
          font-weight: 700;
          line-height: 1.2;
        }
        .hs-ride-line {
          margin: 0;
          color: rgba(49, 56, 81, 0.78);
          font-size: 14px;
          line-height: 1.4;
        }
        .hs-ride-line strong {
          color: #313851;
        }
        .hs-ride-price {
          margin: 2px 0 0;
          color: #313851;
          font-size: 22px;
          font-weight: 800;
          line-height: 1.2;
        }
        .hs-book-btn {
          justify-self: end;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.3);
          background: rgba(255, 255, 255, 0.2);
          color: #313851;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 14px;
          font-weight: 700;
          padding: 8px 14px;
        }
        .hs-book-btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }
        .hs-quick-btn {
          width: 100%;
          border: 1px solid rgba(255, 255, 255, 0.3);
          background: rgba(255, 255, 255, 0.1);
          color: #313851;
          border-radius: 10px;
          padding: 10px 12px;
          font-size: 24px;
          font-weight: 700;
          font-family: 'Space Grotesk', sans-serif;
          box-shadow: 0 4px 10px rgba(49, 56, 81, 0.08);
        }
        .hs-footer {
          margin-top: 48px;
          border-top: 1px solid rgba(49, 56, 81, 0.1);
          padding: 28px 24px 34px;
          text-align: center;
          background: #c2cbd3;
        }
        .hs-footer-brand {
          margin: 0;
          color: #313851;
          font-size: 22px;
          font-weight: 700;
          letter-spacing: -0.01em;
        }
        .hs-footer-copy {
          margin: 8px 0 0;
          color: rgba(49, 56, 81, 0.58);
          font-size: 13px;
          line-height: 1.4;
        }
        .hs-footer-links {
          margin-top: 16px;
          display: flex;
          justify-content: center;
          gap: 28px;
        }
        .hs-footer-links a {
          color: rgba(49, 56, 81, 0.6);
          font-size: 14px;
          font-weight: 500;
          text-decoration: none;
        }
        .hs-alert-card {
          margin-top: 28px;
          border-radius: 16px;
          border: 1px solid rgba(49, 56, 81, 0.2);
          background: rgba(255, 255, 255, 0.3);
          box-shadow: 0 8px 22px rgba(49, 56, 81, 0.09);
          padding: 18px;
        }
        .hs-alert-title {
          margin: 0;
          color: #313851;
          font-size: 24px;
          font-weight: 700;
          line-height: 1.2;
        }
        .hs-alert-subtitle {
          margin: 6px 0 0;
          color: rgba(49, 56, 81, 0.65);
          font-size: 14px;
        }
        .hs-alert-form {
          margin-top: 14px;
          display: grid;
          gap: 10px;
          grid-template-columns: 1fr 1fr 220px auto;
          align-items: end;
        }
        .hs-alert-btn {
          border-radius: 10px;
          border: 1px solid rgba(49, 56, 81, 0.22);
          background: #313851;
          color: #fff;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 14px;
          font-weight: 700;
          padding: 12px 14px;
        }
        .hs-alert-btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }
        .hs-toast {
          position: fixed;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          background: #313851;
          color: #fff;
          padding: 12px 22px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 700;
          box-shadow: 0 8px 22px rgba(49,56,81,0.32);
          border: 1px solid rgba(255,255,255,0.14);
          z-index: 9999;
          white-space: nowrap;
        }
        @media (max-width: 1100px) {
          .hs-page {
            padding: 20px 16px 0;
          }
          .hs-hero {
            padding: 28px;
          }
          .hs-hero h1 {
            font-size: 48px;
          }
          .hs-hero p {
            font-size: 20px;
          }
          .hs-layout {
            grid-template-columns: 1fr;
          }
          .hs-section-title,
          .hs-rides-title,
          .hs-quick-title {
            font-size: 30px;
          }
          .hs-post-btn,
          .hs-quick-btn {
            font-size: 20px;
          }
          .hs-offer-two-col {
            grid-template-columns: 1fr;
          }
          .hs-alert-form {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
      <div className="hs-page">
        <div className="hs-container">
          <section className="hs-hero">
            <h1>Welcome back !</h1>
            <p>Mumbai is calling.</p>
            <p className="hs-hero-subline">Lets get you something out of nothing.</p>
            <button type="button" className="hs-hero-btn">View My Schedule</button>
          </section>
          <div className="hs-layout">
            <div className="hs-side-stack">
              {currentUser && (
                <OfferRide onRideOffered={fetchRides} setInfoMessage={setInfoMessage} authToken={authToken} />
              )}
              <div className="hs-card">
                <h3 className="hs-quick-title">Quick Find</h3>
                <div className="hs-quick-stack">
                  <input
                    className="hs-input"
                    type="text"
                    placeholder="From (Origin)"
                    value={searchOrigin}
                    onChange={(e) => setSearchOrigin(e.target.value)}
                  />
                  <input
                    className="hs-input"
                    type="text"
                    placeholder="To (Destination)"
                    value={searchDestination}
                    onChange={(e) => setSearchDestination(e.target.value)}
                  />
                  <button type="button" className="hs-quick-btn">Search Rides</button>
                </div>
              </div>
            </div>
            <div>
              {isLoadingRides ? (
                <p>Loading rides...</p>
              ) : (
                <RideList
                  rides={filteredRides}
                  onRideBooked={fetchRides}
                  infoMessage={infoMessage}
                  setInfoMessage={setInfoMessage}
                  authToken={authToken}
                />
              )}
            </div>
          </div>
          <section className="hs-alert-card">
            <h3 className="hs-alert-title">🔔 Not finding a ride?</h3>
            <p className="hs-alert-subtitle">Set an alert and we'll email you when a matching ride is posted</p>
            <form className="hs-alert-form" onSubmit={handleSetAlert}>
              <input
                className="hs-input"
                type="text"
                placeholder="Origin"
                value={alertOrigin}
                onChange={(e) => setAlertOrigin(e.target.value)}
                required
              />
              <input
                className="hs-input"
                type="text"
                placeholder="Destination"
                value={alertDestination}
                onChange={(e) => setAlertDestination(e.target.value)}
                required
              />
              <input
                className="hs-input"
                type="date"
                value={alertTravelDate}
                onChange={(e) => setAlertTravelDate(e.target.value)}
              />
              <button className="hs-alert-btn" type="submit" disabled={isSettingAlert}>
                {isSettingAlert ? 'Setting...' : 'Set Alert'}
              </button>
            </form>
          </section>
        </div>
        {alertToast && <div className="hs-toast">{alertToast}</div>}
        <footer className="hs-footer">
          <h4 className="hs-footer-brand">RastaConnect</h4>
          <p className="hs-footer-copy">Made with ❤️ for Mumbai&apos;s student community.</p>
          <div className="hs-footer-links">
            <a href="#">Terms</a>
            <a href="#">Privacy</a>
            <a href="#">Support</a>
          </div>
        </footer>
      </div>
    </>
  );
}
export default HomePage;
