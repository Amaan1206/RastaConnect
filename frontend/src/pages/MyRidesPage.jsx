// RastaConnect/frontend/src/pages/MyRidesPage.jsx

import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';

function MyRidesPage() {
  const { authToken } = useOutletContext();
  const [offeredRides, setOfferedRides] = useState([]);
  const [bookedRides, setBookedRides] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');

  const fetchMyRides = async () => { setIsLoading(true); setMessage(''); try { if (!authToken) { window.location.href = '/login'; setIsLoading(false); return; } const [offeredRes, bookedRes] = await Promise.all([ fetch('/api/my-rides/offered', { headers: { 'Authorization': `Bearer ${authToken}` } }), fetch('/api/my-rides/booked', { headers: { 'Authorization': `Bearer ${authToken}` } }) ]); if (!offeredRes.ok || !bookedRes.ok) { const offeredData = await offeredRes.json(); const bookedData = await bookedRes.json(); throw new Error(offeredData.message || bookedData.message || 'Failed to fetch rides'); } const offeredData = await offeredRes.json(); const bookedData = await bookedRes.json(); setOfferedRides(offeredData.rides || []); setBookedRides(bookedData.rides || []); } catch (error) { console.error("Failed to fetch my rides:", error); setMessage(error.message); } finally { setIsLoading(false); }};
  useEffect(() => { fetchMyRides(); }, [authToken]);
  const handleCancelRide = async (rideId) => { if (!window.confirm("Are you sure you want to cancel this ride? This will cancel all bookings as well.")) return; try { if (!authToken) { window.location.href = '/login'; return; } const res = await fetch(`/api/rides/${rideId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${authToken}` } }); const data = await res.json(); if (!res.ok) throw new Error(data.message); setMessage(data.message); fetchMyRides(); } catch (error) { setMessage(error.message); } };
  const handleCancelBooking = async (bookingId) => { if (!window.confirm("Are you sure you want to cancel this booking?")) return; try { if (!authToken) { window.location.href = '/login'; return; } const res = await fetch(`/api/bookings/${bookingId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${authToken}` } }); const data = await res.json(); if (!res.ok) throw new Error(data.message); setMessage(data.message); fetchMyRides(); } catch (error) { setMessage(error.message); } };
  const formatDateTime = (isoString) => { if (!isoString) return 'Invalid date'; const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }; return new Date(isoString).toLocaleDateString(undefined, options); };

  if (isLoading) { return <p>Loading your rides...</p>; }

  return (
    <div className="my-rides-container">
      {message && <p className="info-message">{message}</p>}
      <div className="rides-section">
        <h2>Rides You've Offered</h2>
        {offeredRides.length > 0 ? ( offeredRides.map(ride => ( <div key={ride.id} className="ride-card"> <h3>{ride.origin} to {ride.destination}</h3> <p><strong>Departure:</strong> {formatDateTime(ride.departureTime)}</p> <p><strong>Seats Available:</strong> {ride.availableSeats}</p> <p><strong>Status:</strong> <span className={`status-${ride.status}`}>{ride.status}</span></p> <p className="price">₹{ride.price}</p> {ride.status === 'active' && <button onClick={() => handleCancelRide(ride.id)} className="cancel-button">Cancel Ride</button>} </div> )) ) : ( <p>You have not offered any rides.</p> )}
      </div>
      <div className="rides-section">
        <h2>Rides You've Booked</h2>
        {bookedRides.length > 0 ? (
          bookedRides.map(booking => (
            <div key={booking.bookingId} className="ride-card">
              <h3>{booking.origin} to {booking.destination}</h3>
              <p><strong>Driver:</strong> {booking.driverName}</p>

              {/* --- NEW: Vehicle Details Displayed Here --- */}
              <div className="vehicle-details">
                <p><strong>Vehicle:</strong> {booking.vehicleMake} {booking.vehicleModel} ({booking.vehicleColor})</p>
                <p><strong>Plate:</strong> {booking.vehicleRegistration}</p>
              </div>

              <p><strong>Departure:</strong> {formatDateTime(booking.departureTime)}</p>
              <p><strong>Status:</strong> <span className={`status-${booking.bookingStatus}`}>{booking.bookingStatus}</span></p>
              <p className="price">₹{booking.price}</p>
              {booking.bookingStatus === 'confirmed' && <button onClick={() => handleCancelBooking(booking.bookingId)} className="cancel-button">Cancel Booking</button>}
            </div>
          ))
        ) : ( <p>You have not booked any rides.</p> )}
      </div>
    </div>
  );
}

export default MyRidesPage;
