import React, { useState } from 'react';

function RideList({ rides, onRideBooked, infoMessage, setInfoMessage, authToken }) {
  const [bookingRideId, setBookingRideId] = useState(null);
  const [modalRide, setModalRide] = useState(null);
  const [pickupLocation, setPickupLocation] = useState('');
  const [dropLocation, setDropLocation] = useState('');
  const [passengerPrice, setPassengerPrice] = useState('');

  const openModal = (ride) => {
    setModalRide(ride);
    setPickupLocation('');
    setDropLocation('');
    setPassengerPrice(String(ride.price));
    setInfoMessage('');
  };

  const closeModal = () => {
    setModalRide(null);
    setPickupLocation('');
    setDropLocation('');
    setPassengerPrice('');
  };

  const handleBookRide = async () => {
    if (!modalRide) return;
    setBookingRideId(modalRide.id);
    setInfoMessage('');
    try {
      if (!authToken) { window.location.href = '/login'; return; }
      if (!pickupLocation.trim()) { setInfoMessage('Please enter your pickup location.'); setBookingRideId(null); return; }
      if (!dropLocation.trim()) { setInfoMessage('Please enter your drop location.'); setBookingRideId(null); return; }
      if (!passengerPrice || isNaN(Number(passengerPrice)) || Number(passengerPrice) <= 0) {
        setInfoMessage('Please enter a valid price.'); setBookingRideId(null); return;
      }
      const response = await fetch(`/api/rides/${modalRide.id}/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
        body: JSON.stringify({
          pickup_location: pickupLocation.trim(),
          drop_location: dropLocation.trim(),
          passenger_price: Number(passengerPrice)
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setInfoMessage(data.message);
      closeModal();
      onRideBooked();
    } catch (error) {
      setInfoMessage(error.message);
    } finally {
      setBookingRideId(null);
    }
  };

  const formatDateTime = (isoString) => {
    if (!isoString) return 'Invalid date';
    const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(isoString).toLocaleDateString(undefined, options);
  };

  return (
    <div className="hs-rides-wrap">
      <div className="hs-rides-head">
        <h2 className="hs-rides-title">Rides for You</h2>
        <button type="button" className="hs-filter-btn">Filter</button>
      </div>
      {infoMessage && <p className="hs-info-message">{infoMessage}</p>}
      <div className="hs-rides-list">
        {!rides || rides.length === 0 ? (
          <div className="hs-empty-state">
            <p className="hs-empty-text">No rides found matching your criteria.</p>
            <p className="hs-empty-subtext">Try adjusting your search or check back later.</p>
          </div>
        ) : (
          rides.map(ride => {
            const activeBookings = Array.isArray(ride.bookings)
              ? ride.bookings.filter((booking) => booking.status !== 'cancelled')
              : [];
            return (
              <div key={ride.id} className="hs-ride-card">
                <h3 className="hs-ride-title">{ride.origin} to {ride.destination}</h3>
                <p className="hs-ride-line">
                  <strong>Driver:</strong> {ride.driverName}
                  {ride.driverFaceVerified && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', marginLeft: '8px', padding: '2px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 700, color: '#166534', background: 'rgba(134, 239, 172, 0.55)', border: '1px solid rgba(22, 163, 74, 0.35)' }}>
                      Face Verified
                    </span>
                  )}
                </p>
                <p className="hs-ride-line"><strong>Departure:</strong> {formatDateTime(ride.departureTime)}</p>
                <p className="hs-ride-line"><strong>Seats Available:</strong> {ride.availableSeats}</p>
                {activeBookings.length > 0 && (
                  <details className="hs-driver-details" style={{ marginTop: '8px', border: '1px solid rgba(49, 56, 81, 0.15)', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.2)', padding: '8px 10px' }}>
                    <summary style={{ cursor: 'pointer', fontWeight: 700, color: '#313851', fontSize: '14px' }}>Driver Details</summary>
                    <div style={{ marginTop: '8px', display: 'grid', gap: '6px' }}>
                      <p className="hs-ride-line"><strong>Name:</strong> {ride.driver?.full_name || ride.driverName || 'Not available'}</p>
                      <p className="hs-ride-line"><strong>Phone:</strong> {ride.driver?.phone || 'Not available'}</p>
                      <p className="hs-ride-line"><strong>Age, Gender:</strong> {ride.driver?.age || 'N/A'}, {ride.driver?.gender || 'N/A'}</p>
                      <p className="hs-ride-line"><strong>Talkativeness:</strong> {ride.driver?.talkativeness || 'N/A'}</p>
                      <p className="hs-ride-line"><strong>Music Preference:</strong> {ride.driver?.music_preference || 'N/A'}</p>
                      <p className="hs-ride-line">
                        <strong>Vehicle:</strong>{' '}
                        {[ride.vehicle?.make, ride.vehicle?.model, ride.vehicle?.color].filter(Boolean).join(' ') || 'Not available'}
                        {ride.vehicle?.plate_number ? ` (${ride.vehicle.plate_number})` : ''}
                      </p>
                    </div>
                  </details>
                )}
                <p className="hs-ride-price">₹{ride.price}</p>
                <button className="hs-book-btn" onClick={() => openModal(ride)}>
                  Book Ride
                </button>
              </div>
            );
          })
        )}
      </div>

      {modalRide && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#1a1f35', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '460px', color: '#fff', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
            <h2 style={{ marginBottom: '8px', fontSize: '20px', fontWeight: 700 }}>Book Ride</h2>
            <p style={{ marginBottom: '24px', color: '#9ca3af', fontSize: '14px' }}>{modalRide.origin} → {modalRide.destination}</p>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#d1d5db' }}>Your Pickup Location</label>
              <input
                type="text"
                placeholder="e.g. Andheri Station Gate 2"
                value={pickupLocation}
                onChange={e => setPickupLocation(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.08)', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#d1d5db' }}>Your Drop Location</label>
              <input
                type="text"
                placeholder="e.g. Borivali West McDonald's"
                value={dropLocation}
                onChange={e => setDropLocation(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.08)', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#d1d5db' }}>
                Your Price Offer (₹) <span style={{ color: '#9ca3af', fontWeight: 400 }}>— Driver asks ₹{modalRide.price}</span>
              </label>
              <input
                type="number"
                placeholder={String(modalRide.price)}
                value={passengerPrice}
                onChange={e => setPassengerPrice(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.08)', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }}
              />
              {passengerPrice && Number(passengerPrice) !== modalRide.price && (
                <p style={{ marginTop: '6px', fontSize: '12px', color: '#fbbf24' }}>⚠ Your price differs from driver's — booking will need driver approval.</p>
              )}
              {passengerPrice && Number(passengerPrice) === modalRide.price && (
                <p style={{ marginTop: '6px', fontSize: '12px', color: '#34d399' }}>✓ Matches driver's price — booking will be confirmed instantly.</p>
              )}
            </div>

            {infoMessage && <p style={{ marginBottom: '16px', color: '#f87171', fontSize: '13px' }}>{infoMessage}</p>}

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={closeModal}
                style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleBookRide}
                disabled={bookingRideId === modalRide.id}
                style={{ flex: 1, padding: '12px', borderRadius: '8px', border: 'none', background: '#3b82f6', color: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
              >
                {bookingRideId === modalRide.id ? 'Booking...' : 'Confirm Booking'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RideList;
