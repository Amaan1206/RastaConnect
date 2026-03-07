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
    <div className="card">
      <h2>Offer a Ride</h2>
      <form onSubmit={handleOfferRide}>
        {/* --- NEW: Vehicle Selector Dropdown --- */}
        <select value={selectedVehicleId} onChange={(e) => setSelectedVehicleId(e.target.value)} required>
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

        <input type="text" placeholder="Origin" value={origin} onChange={(e) => setOrigin(e.target.value)} required />
        <input type="text" placeholder="Destination" value={destination} onChange={(e) => setDestination(e.target.value)} required />
        <input type="datetime-local" placeholder="Departure Time" value={departureTime} onChange={(e) => setDepartureTime(e.target.value)} required />
        <input type="number" min="1" placeholder="Available Seats" value={availableSeats} onChange={(e) => setAvailableSeats(e.target.value)} required />
        <input type="number" min="0" placeholder="Price per seat" value={price} onChange={(e) => setPrice(e.target.value)} required />
        <button type="submit" disabled={vehicles.length === 0}>Offer Ride</button>
      </form>
    </div>
  );
}
export default OfferRide;
