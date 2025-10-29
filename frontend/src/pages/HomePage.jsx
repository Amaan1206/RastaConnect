import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import OfferRide from '../components/OfferRide';
import RideList from '../components/RideList';

function HomePage() {
  const { currentUser } = useOutletContext();
  const [allRides, setAllRides] = useState([]);
  const [isLoadingRides, setIsLoadingRides] = useState(true);
  const [infoMessage, setInfoMessage] = useState('');
  const [searchOrigin, setSearchOrigin] = useState('');
  const [searchDestination, setSearchDestination] = useState('');

  const fetchRides = () => {
    setIsLoadingRides(true);
    fetch('/api/rides')
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
    const intervalId = setInterval(fetchRides, 15000); // Polling
    return () => clearInterval(intervalId);
  }, []);

  const filteredRides = useMemo(() => {
    if (!allRides) return [];
    return allRides.filter(ride => {
      const originMatch = ride.origin.toLowerCase().includes(searchOrigin.toLowerCase());
      const destinationMatch = ride.destination.toLowerCase().includes(searchDestination.toLowerCase());
      return originMatch && destinationMatch;
    });
  }, [allRides, searchOrigin, searchDestination]);

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h2>{currentUser ? `Welcome back, ${currentUser.fullName}!` : "Find Your Next Ride"}</h2>
      </header>
      <div className="dashboard-content">
        {currentUser && (
          <div className="offer-ride-wrapper">
            <OfferRide onRideOffered={fetchRides} setInfoMessage={setInfoMessage} />
          </div>
        )}
        <div className={currentUser ? "ride-list-wrapper" : "ride-list-wrapper-full"}>
          <div className="search-filters">
            <input type="text" placeholder="From (Origin)" value={searchOrigin} onChange={(e) => setSearchOrigin(e.target.value)} />
            <input type="text" placeholder="To (Destination)" value={searchDestination} onChange={(e) => setSearchDestination(e.target.value)} />
          </div>
          {isLoadingRides ? <p>Loading rides...</p> : <RideList rides={filteredRides} onRideBooked={fetchRides} infoMessage={infoMessage} setInfoMessage={setInfoMessage} />}
        </div>
      </div>
    </div>
  );
}
export default HomePage;