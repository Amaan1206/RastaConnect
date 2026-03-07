// RastaConnect/frontend/src/pages/VehiclesPage.jsx
import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';

function VehiclesPage() {
    const { authToken } = useOutletContext();
    const [vehicles, setVehicles] = useState([]);
    const [type, setType] = useState('Car');
    const [make, setMake] = useState('');
    const [model, setModel] = useState('');
    const [color, setColor] = useState('');
    const [registrationNumber, setRegistrationNumber] = useState('');
    const [message, setMessage] = useState('');

    const fetchVehicles = async () => {
        if (!authToken) { window.location.href = '/login'; return; }
        const res = await fetch('/api/vehicles', { headers: { 'Authorization': `Bearer ${authToken}` }});
        const data = await res.json();
        setVehicles(data.vehicles || []);
    };

    useEffect(() => { fetchVehicles(); }, [authToken]);

    const handleAddVehicle = async (e) => {
        e.preventDefault();
        setMessage('');
        try {
            if (!authToken) { window.location.href = '/login'; return; }
            const res = await fetch('/api/vehicles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
                body: JSON.stringify({ type, make, model, color, registrationNumber }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
            setMessage(data.message);
            fetchVehicles(); // Refresh list
        } catch (error) {
            setMessage(error.message);
        }
    };

    return (
        <div className="my-rides-container">
            <div className="rides-section">
                <h2>My Vehicles</h2>
                {vehicles.length > 0 ? (
                    vehicles.map(v => (
                        <div key={v.id} className="vehicle-card">
                            <p><strong>{v.make} {v.model}</strong> ({v.type})</p>
                            <p>{v.registrationNumber}</p>
                        </div>
                    ))
                ) : <p>You have not added any vehicles.</p>}
            </div>
            <div className="rides-section">
                <h2>Add a New Vehicle</h2>
                <form onSubmit={handleAddVehicle}>
                    <select value={type} onChange={e => setType(e.target.value)}>
                        <option value="Car">Car</option>
                        <option value="Bike">Bike</option>
                    </select>
                    <input type="text" value={make} onChange={e => setMake(e.target.value)} placeholder="Make (e.g., Maruti)" required />
                    <input type="text" value={model} onChange={e => setModel(e.target.value)} placeholder="Model (e.g., Swift)" required />
                    <input type="text" value={color} onChange={e => setColor(e.target.value)} placeholder="Color" required />
                    <input type="text" value={registrationNumber} onChange={e => setRegistrationNumber(e.target.value)} placeholder="Registration Number (e.g., MH01AB1234)" required />
                    <button type="submit">Add Vehicle</button>
                </form>
                {message && <p className="info-message">{message}</p>}
            </div>
        </div>
    );
}
export default VehiclesPage;
