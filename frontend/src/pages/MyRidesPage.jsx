import React, { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);

function StarRating({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: '6px' }}>
      {[1, 2, 3, 4, 5].map(star => (
        <span
          key={star}
          onClick={() => onChange && onChange(star)}
          style={{ fontSize: '28px', cursor: onChange ? 'pointer' : 'default', color: star <= value ? '#f59e0b' : '#d1d5db' }}
        >★</span>
      ))}
    </div>
  );
}

function MyRidesPage() {
  const { authToken } = useOutletContext();
  const navigate = useNavigate();
  const [offeredRides, setOfferedRides] = useState([]);
  const [bookedRides, setBookedRides] = useState([]);
  const [offeredRidePassengers, setOfferedRidePassengers] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [ratingModal, setRatingModal] = useState(null);
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [ratingSubmitting, setRatingSubmitting] = useState(false);

  useEffect(() => {
    if (message) {
      const t = setTimeout(() => setMessage(''), 5000);
      return () => clearTimeout(t);
    }
  }, [message]);

  const fetchOfferedRidePassengers = async (rides) => {
    if (!authToken || !rides || rides.length === 0) { setOfferedRidePassengers({}); return; }
    const passengerEntries = await Promise.all(
      rides.map(async (ride) => {
        try {
          const res = await fetch(`/api/bookings/ride/${ride.id}`, { headers: { 'Authorization': `Bearer ${authToken}` } });
          const data = await res.json();
          if (!res.ok) return [ride.id, []];
          const activePassengers = (data.bookings || []).filter((booking) => booking.status !== 'cancelled');
          return [ride.id, activePassengers];
        } catch (_error) { return [ride.id, []]; }
      })
    );
    setOfferedRidePassengers(Object.fromEntries(passengerEntries));
  };

  const fetchMyRides = async () => {
    setIsLoading(true); setMessage('');
    try {
      if (!authToken) { window.location.href = '/login'; setIsLoading(false); return; }
      const [offeredRes, bookedRes] = await Promise.all([
        fetch('/api/my-rides/offered', { headers: { 'Authorization': `Bearer ${authToken}` } }),
        fetch('/api/my-rides/booked', { headers: { 'Authorization': `Bearer ${authToken}` } })
      ]);
      const offeredData = await offeredRes.json();
      const bookedData = await bookedRes.json();
      const offered = offeredData.rides || [];
      setOfferedRides(offered);
      setBookedRides(bookedData.rides || []);
      await fetchOfferedRidePassengers(offered);
    } catch (error) { setMessage(error.message); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchMyRides(); }, [authToken]);

  const handleCancelRide = async (rideId) => {
    if (!window.confirm('Are you sure you want to cancel this ride?')) return;
    try {
      const res = await fetch(`/api/rides/${rideId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${authToken}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setMessage(data.message); fetchMyRides();
    } catch (error) { setMessage(error.message); }
  };

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${authToken}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setMessage(data.message); fetchMyRides();
    } catch (error) { setMessage(error.message); }
  };

  const handleConfirmBooking = async (bookingId) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/bookings/${bookingId}/confirm`, { method: 'PUT', headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setMessage('Booking confirmed!'); fetchMyRides();
    } catch (err) { setMessage(err.message); }
  };

  const handleRejectBooking = async (bookingId) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/bookings/${bookingId}/reject`, { method: 'PUT', headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setMessage('Booking rejected.'); fetchMyRides();
    } catch (err) { setMessage(err.message); }
  };

  const handleCompleteRide = async (rideId) => {
    if (!window.confirm('Mark this ride as completed?')) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/rides/${rideId}/complete`, { method: 'PUT', headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setMessage('Ride completed!'); fetchMyRides();
    } catch (err) { setMessage(err.message); }
  };

  const handleShareRide = async (bookingId) => {
    try {
      const res = await fetch(`/api/bookings/${bookingId}/share-link`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      const shareUrl = `${window.location.origin}/share/${data.token}`;
      await navigator.clipboard.writeText(shareUrl);
      setMessage('Safety link copied! Share it with someone you trust.');
    } catch (err) { setMessage(err.message); }
  };

  const handlePassengerComplete = async (bookingId) => {
    if (!window.confirm('Mark your journey as completed?')) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/bookings/${bookingId}/passenger-complete`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setMessage('Journey marked as completed!');
      fetchMyRides();
    } catch (err) {
      setMessage(err.message);
    }
  };

  const openRatingModal = (rideId, ratedId, ratedName) => {
    setRatingModal({ rideId, ratedId, ratedName });
    setRatingValue(0);
    setRatingComment('');
  };

  const handleSubmitRating = async () => {
    if (!ratingValue) { setMessage('Please select a star rating.'); return; }
    setRatingSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/ratings', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ rideId: ratingModal.rideId, ratedId: ratingModal.ratedId, rating: ratingValue, comment: ratingComment })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setMessage('Rating submitted!');
      setRatingModal(null);
      fetchMyRides();
    } catch (err) { setMessage(err.message); }
    finally { setRatingSubmitting(false); }
  };

  const formatDateTime = (isoString) => {
    if (!isoString) return 'Invalid date';
    return new Date(isoString).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (isLoading) return <p>Loading your rides...</p>;

  return (
    <>
      <style>{`
        main.main-content { max-width: 100% !important; width: 100% !important; margin: 0 !important; padding: 0 !important; background: #c2cbd3; }
        .mr-page { min-height: 100vh; background: #c2cbd3; padding: 40px 16px; font-family: 'Space Grotesk', sans-serif; color: #313851; }
        .mr-container { max-width: 896px; margin: 0 auto; }
        .mr-header { margin-bottom: 40px; }
        .mr-header h1 { margin: 0; font-size: 2.25rem; font-weight: 700; letter-spacing: -0.02em; color: #313851; }
        .mr-header p { margin: 8px 0 0; font-size: 1.5rem; font-weight: 500; color: rgba(49, 56, 81, 0.6); }
        .mr-toast { position: fixed; bottom: 32px; left: 50%; transform: translateX(-50%); background: #313851; color: #fff; padding: 14px 28px; border-radius: 12px; font-size: 15px; font-weight: 700; box-shadow: 0 8px 24px rgba(49,56,81,0.35); z-index: 9999; white-space: nowrap; border: 1px solid rgba(255,255,255,0.15); }
        .mr-section { margin-bottom: 48px; }
        .mr-section-head { display: flex; align-items: center; justify-content: space-between; gap: 14px; margin-bottom: 24px; }
        .mr-section-head h2 { margin: 0; font-size: 2rem; font-weight: 700; color: #313851; letter-spacing: -0.01em; }
        .mr-pill { display: inline-flex; align-items: center; border-radius: 999px; background: rgba(49, 56, 81, 0.1); color: #313851; padding: 4px 12px; font-size: 0.875rem; font-weight: 600; white-space: nowrap; }
        .mr-grid { display: grid; gap: 24px; }
        .mr-empty-card { border-radius: 12px; border: 2px dashed rgba(49, 56, 81, 0.2); background: rgba(255, 255, 255, 0.5); padding: 40px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; }
        .mr-empty-icon { width: 64px; height: 64px; border-radius: 999px; background: rgba(49, 56, 81, 0.05); margin-bottom: 16px; }
        .mr-empty-text { margin: 0; color: rgba(49, 56, 81, 0.6); font-size: 1.5rem; font-weight: 500; }
        .mr-empty-button { margin-top: 16px; border: 0; background: rgba(49, 56, 81, 0.8); color: #ffffff; padding: 8px 24px; border-radius: 12px; font-size: 0.875rem; font-weight: 700; font-family: 'Space Grotesk', sans-serif; cursor: pointer; }
        .mr-ride-card { border-radius: 12px; border: 1px solid rgba(49, 56, 81, 0.16); background: rgba(255, 255, 255, 0.5); padding: 20px; display: grid; gap: 8px; }
        .mr-route { margin: 0; color: #313851; font-size: 1.5rem; font-weight: 700; letter-spacing: -0.01em; }
        .mr-line { margin: 0; color: rgba(49, 56, 81, 0.85); font-size: 1rem; line-height: 1.45; }
        .mr-line strong { color: #313851; }
        .mr-vehicle-details { border-radius: 10px; border: 1px solid rgba(49, 56, 81, 0.14); background: rgba(255, 255, 255, 0.4); padding: 10px 12px; display: grid; gap: 6px; }
        .mr-status { display: inline-flex; align-items: center; border-radius: 999px; padding: 2px 10px; font-size: 0.75rem; font-weight: 700; text-transform: capitalize; }
        .mr-status.status-active, .mr-status.status-confirmed { color: #0f5132; background: rgba(25, 135, 84, 0.18); }
        .mr-status.status-cancelled, .mr-status.status-rejected { color: #842029; background: rgba(220, 53, 69, 0.16); }
        .mr-status.status-completed { color: #084298; background: rgba(13, 110, 253, 0.14); }
        .mr-status.status-pending { color: #92400e; background: rgba(245, 158, 11, 0.18); }
        .mr-price { margin: 2px 0 0; color: #313851; font-size: 1.5rem; font-weight: 700; }
        .mr-action { justify-self: start; border: 0; background: rgba(49, 56, 81, 0.8); color: #ffffff; padding: 8px 14px; border-radius: 12px; font-size: 0.875rem; font-weight: 700; font-family: 'Space Grotesk', sans-serif; cursor: pointer; }
        .mr-action.complete { background: #16a34a; }
        .mr-action.rate { background: #f59e0b; color: #1c1917; }
        .mr-action.share { background: #0ea5e9; }
      `}</style>

      <div className="mr-page">
        <div className="mr-container">
          <header className="mr-header">
            <h1>My Rides</h1>
            <p>Manage your shared journeys</p>
          </header>

          {message && <div className="mr-toast">{message}</div>}

          <section className="mr-section">
            <div className="mr-section-head">
              <h2>Rides You've Offered</h2>
              <span className="mr-pill">{offeredRides.length} Rides</span>
            </div>
            <div className="mr-grid">
              {offeredRides.length > 0 ? offeredRides.map((ride) => (
                <div key={ride.id} className="mr-ride-card">
                  <h3 className="mr-route">{ride.origin} to {ride.destination}</h3>
                  <p className="mr-line"><strong>Departure:</strong> {formatDateTime(ride.departureTime)}</p>
                  <p className="mr-line"><strong>Seats Available:</strong> {ride.availableSeats}</p>
                  <p className="mr-line"><strong>Status:</strong> <span className={`mr-status status-${ride.status}`}>{ride.status}</span></p>
                  <div className="mr-vehicle-details">
                    <p className="mr-line"><strong>Passengers</strong></p>
                    {(offeredRidePassengers[ride.id] || []).length > 0 ? (
                      (offeredRidePassengers[ride.id] || []).map((p) => (
                        <div key={p.id} style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid rgba(49,56,81,0.1)' }}>
                          <p className="mr-line"><strong>Name:</strong> {p.full_name || 'N/A'}</p>
                          <p className="mr-line"><strong>Age, Gender:</strong> {p.age || 'N/A'}, {p.gender || 'N/A'}</p>
                          <p className="mr-line"><strong>Talkativeness:</strong> {p.talkativeness || 'N/A'}</p>
                          <p className="mr-line"><strong>Music:</strong> {p.music_preference || 'N/A'}</p>
                          <p className="mr-line"><strong>Pickup:</strong> {p.pickup_location || 'Not specified'}</p>
                          <p className="mr-line"><strong>Drop:</strong> {p.drop_location || 'Not specified'}</p>
                          <p className="mr-line"><strong>Offered Price:</strong> ₹{p.passenger_price ?? p.driver_price ?? 'N/A'}</p>
                          <p className="mr-line"><strong>Phone:</strong> {p.phone || 'N/A'}</p>
                          <p className="mr-line"><strong>Booking:</strong> <span className={`mr-status status-${p.status}`}>{p.status}</span></p>
                          {p.status === 'pending' && (
                            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                              <button onClick={() => handleConfirmBooking(p.id)} style={{ padding: '6px 12px', background: '#16a34a', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>Confirm</button>
                              <button onClick={() => handleRejectBooking(p.id)} style={{ padding: '6px 12px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>Reject</button>
                            </div>
                          )}
                          {ride.status === 'completed' && p.status === 'confirmed' && (
                            <button className="mr-action rate" style={{ marginTop: '10px' }} onClick={() => openRatingModal(ride.id, p.user_id, p.full_name)}>
                              ⭐ Rate Passenger
                            </button>
                          )}
                        </div>
                      ))
                    ) : <p className="mr-line">No passengers yet</p>}
                  </div>
                  {(() => {
                    const confirmedPassengers = (offeredRidePassengers[ride.id] || []).filter((p) => p.status === 'confirmed');
                    return confirmedPassengers.length > 0 ? (
                      <>
                        <p style={{ margin: '8px 0 0', fontSize: '16px', fontWeight: 700, color: '#16a34a' }}>
                          💰 Total Earnings: ₹{confirmedPassengers.reduce((sum, p) => sum + (p.passenger_price || 0), 0)}
                        </p>
                        <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'rgba(49,56,81,0.6)' }}>
                          from {confirmedPassengers.length} confirmed passenger{confirmedPassengers.length !== 1 ? 's' : ''}
                        </p>
                      </>
                    ) : (
                      <p style={{ margin: '8px 0 0', fontSize: '14px', color: 'rgba(49,56,81,0.5)', fontWeight: 600 }}>
                        💰 No confirmed passengers yet
                      </p>
                    );
                  })()}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {ride.status === 'active' && (
                      <>
                        <button type="button" onClick={() => handleCompleteRide(ride.id)} className="mr-action complete">Mark as Completed</button>
                        <button type="button" onClick={() => handleCancelRide(ride.id)} className="mr-action">Cancel Ride</button>
                      </>
                    )}
                  </div>
                </div>
              )) : (
                <div className="mr-empty-card">
                  <div className="mr-empty-icon"></div>
                  <p className="mr-empty-text">You haven't offered any rides yet</p>
                  <button type="button" className="mr-empty-button" onClick={() => navigate('/')}>Offer a Ride</button>
                </div>
              )}
            </div>
          </section>

          <section className="mr-section">
            <div className="mr-section-head">
              <h2>Rides You've Booked</h2>
              <span className="mr-pill">{bookedRides.length} Bookings</span>
            </div>
            <div className="mr-grid">
              {bookedRides.length > 0 ? bookedRides.map((booking) => (
                <div key={booking.bookingId} className="mr-ride-card">
                  <h3 className="mr-route">{booking.origin} to {booking.destination}</h3>
                  <p className="mr-line"><strong>Driver:</strong> {booking.driverName}</p>
                  <div className="mr-vehicle-details">
                    <p className="mr-line"><strong>Vehicle:</strong> {booking.vehicleMake} {booking.vehicleModel} ({booking.vehicleColor})</p>
                    <p className="mr-line"><strong>Plate:</strong> {booking.vehicleRegistration}</p>
                  </div>
                  <p className="mr-line"><strong>Departure:</strong> {formatDateTime(booking.departureTime)}</p>
                  <p className="mr-line">
                    <strong>Status:</strong>{' '}
                    {booking.passengerCompleted ? (
                      <span className="mr-status status-confirmed">Completed</span>
                    ) : (
                      <span className="mr-status status-pending">Ongoing</span>
                    )}
                  </p>
                  <p className="mr-line" style={{ fontSize: '0.85rem' }}>
                    <strong>Booking:</strong>{' '}
                    <span className={`mr-status status-${booking.bookingStatus}`}>{booking.bookingStatus}</span>
                  </p>
                  <p className="mr-price">₹{booking.price}</p>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {booking.bookingStatus === 'confirmed' && !booking.passengerCompleted && (
                      <button type="button" onClick={() => handleCancelBooking(booking.bookingId)} className="mr-action">Cancel Booking</button>
                    )}
                    {booking.bookingStatus === 'confirmed' && !booking.passengerCompleted && (
                      <button type="button" onClick={() => handlePassengerComplete(booking.bookingId)} className="mr-action complete">Mark as Completed ✅</button>
                    )}
                    {booking.bookingStatus === 'confirmed' && (
                      <button type="button" onClick={() => handleShareRide(booking.bookingId)} className="mr-action share">Share Ride 🔗</button>
                    )}
                    {booking.passengerCompleted && booking.bookingStatus === 'confirmed' && (
                      <button type="button" className="mr-action rate" onClick={() => openRatingModal(booking.rideId, booking.driverId, booking.driverName)}>⭐ Rate Driver</button>
                    )}
                  </div>
                </div>
              )) : (
                <div className="mr-empty-card">
                  <div className="mr-empty-icon"></div>
                  <p className="mr-empty-text">You haven't booked any rides yet</p>
                  <button type="button" className="mr-empty-button" onClick={() => navigate('/')}>Find a Ride</button>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {ratingModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#c2cbd3', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '420px', color: '#313851', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
            <h2 style={{ margin: '0 0 6px', fontSize: '22px', fontWeight: 700 }}>Rate Your Ride</h2>
            <p style={{ margin: '0 0 20px', color: 'rgba(49,56,81,0.7)', fontSize: '14px' }}>How was your experience with {ratingModal.ratedName}?</p>
            <StarRating value={ratingValue} onChange={setRatingValue} />
            <textarea
              placeholder="Leave a comment (optional)"
              value={ratingComment}
              onChange={e => setRatingComment(e.target.value)}
              style={{ width: '100%', marginTop: '16px', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(49,56,81,0.2)', background: 'rgba(255,255,255,0.4)', color: '#313851', fontSize: '14px', fontFamily: 'Space Grotesk, sans-serif', resize: 'vertical', minHeight: '80px', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              <button onClick={() => setRatingModal(null)} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid rgba(49,56,81,0.2)', background: 'transparent', color: '#313851', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleSubmitRating} disabled={ratingSubmitting} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: 'none', background: '#313851', color: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
                {ratingSubmitting ? 'Submitting...' : 'Submit Rating'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default MyRidesPage;
