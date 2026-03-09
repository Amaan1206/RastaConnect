import React, { useState, useEffect } from 'react';

function OfferRide({ onRideOffered, setInfoMessage, authToken }) {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [availableSeats, setAvailableSeats] = useState('');
  const [price, setPrice] = useState('');

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
          price: parseFloat(price),
          vehicleId: selectedVehicleId, // Send the selected vehicle ID
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

        <div className="hs-offer-field">
          <label className="hs-offer-label">Price per seat (₹)</label>
          <input className="hs-input" type="number" min="0" placeholder="Set price per seat" value={price} onChange={(e) => setPrice(e.target.value)} required />
        </div>

        <button className="hs-post-btn" type="button" onClick={handleOfferRide} disabled={vehicles.length === 0}>Post Ride Offer</button>
      </div>
    </div>
  );
}
export default OfferRide;
