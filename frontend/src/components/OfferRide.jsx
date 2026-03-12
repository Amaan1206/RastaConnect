import React, { useState, useEffect } from 'react';

function OfferRide({ onRideOffered, setInfoMessage, authToken }) {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [availableSeats, setAvailableSeats] = useState('');
  const [womenOnly, setWomenOnly] = useState(false);

  // --- NEW: State for vehicles ---
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');

  // --- NEW: Fetch user's vehicles when component loads ---
  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        if (!authToken) { window.location.href = '/login'; return; }
        const res = await fetch('/api/vehicles', { headers: { 'Authorization': `Bearer ${authToken}` } });
        const data = await res.json();
        if (res.ok) {
          setVehicles(data.vehicles || []);
          // Pre-select the first vehicle if available
          if (data.vehicles && data.vehicles.length > 0) {
            setSelectedVehicleId(data.vehicles[0].id);
          }
        }
      } catch (error) {
        console.error("Failed to fetch vehicles:", error);
      }
    };
    fetchVehicles();
  }, [authToken]);


  const handleOfferRide = async (e) => {
    e.preventDefault();
    setInfoMessage('');
    try {
      if (!authToken) { window.location.href = '/login'; return; }
      const response = await fetch('/api/rides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
        body: JSON.stringify({
          origin,
          destination,
          departureTime,
          availableSeats: parseInt(availableSeats),
          vehicleId: selectedVehicleId,
          women_only: womenOnly,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setInfoMessage("Ride offered successfully!");
      onRideOffered(); // Refresh the main ride list
    } catch (error) {
      setInfoMessage(error.message);
    }
  };

  return (
    <div className="hs-card">
      <h2 className="hs-section-title">Offer a Ride</h2>
      <div className="hs-offer-grid">
        <div className="hs-offer-field">
          <label className="hs-offer-label">Select Vehicle</label>
          <select className="hs-input hs-input-select" value={selectedVehicleId} onChange={(e) => setSelectedVehicleId(e.target.value)} required>
            <option value="" disabled>-- Select Your Vehicle --</option>
            {vehicles.length > 0 ? (
              vehicles.map(v => (
                <option key={v.id} value={v.id}>
                  {v.make} {v.model} ({v.registrationNumber})
                </option>
              ))
            ) : (
              <option disabled>Please add a vehicle first</option>
            )}
          </select>
        </div>

        <div className="hs-offer-two-col">
          <div className="hs-offer-field">
            <label className="hs-offer-label">From (Origin)</label>
            <input className="hs-input" type="text" placeholder="Enter origin" value={origin} onChange={(e) => setOrigin(e.target.value)} required />
          </div>
          <div className="hs-offer-field">
            <label className="hs-offer-label">To (Destination)</label>
            <input className="hs-input" type="text" placeholder="Enter destination" value={destination} onChange={(e) => setDestination(e.target.value)} required />
          </div>
        </div>

        <div className="hs-offer-two-col">
          <div className="hs-offer-field">
            <label className="hs-offer-label">Date &amp; Time</label>
            <input className="hs-input" type="datetime-local" placeholder="Select date and time" value={departureTime} onChange={(e) => setDepartureTime(e.target.value)} required />
          </div>
          <div className="hs-offer-field">
            <label className="hs-offer-label">Seats Available</label>
            <input className="hs-input" type="number" min="1" placeholder="Seats" value={availableSeats} onChange={(e) => setAvailableSeats(e.target.value)} required />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: '10px', background: 'rgba(49,56,81,0.04)', border: '1px solid rgba(49,56,81,0.08)' }}>
          <div>
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#313851' }}>Women Only Ride 👩</span>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'rgba(49,56,81,0.55)', fontWeight: 500 }}>Only female passengers can book</p>
          </div>
          <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px', flexShrink: 0 }}>
            <input type="checkbox" checked={womenOnly} onChange={(e) => setWomenOnly(e.target.checked)} style={{ opacity: 0, width: 0, height: 0 }} />
            <span style={{
              position: 'absolute', cursor: 'pointer', inset: 0, borderRadius: '999px',
              background: womenOnly ? '#313851' : '#c2cbd3',
              transition: 'background 0.25s ease',
            }}>
              <span style={{
                position: 'absolute', content: '""', height: '18px', width: '18px', left: womenOnly ? '23px' : '3px', bottom: '3px',
                background: '#fff', borderRadius: '50%', transition: 'left 0.25s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
              }} />
            </span>
          </label>
        </div>

        <button className="hs-post-btn" type="button" onClick={handleOfferRide} disabled={vehicles.length === 0}>Post Ride Offer</button>
      </div>
    </div>
  );
}
export default OfferRide;
