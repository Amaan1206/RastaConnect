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

    const handleDeleteVehicle = async (vehicleId) => {
        const confirmed = window.confirm('Are you sure you want to delete this vehicle?');
        if (!confirmed) return;

        setMessage('');
        try {
            if (!authToken) { window.location.href = '/login'; return; }
            const res = await fetch(`/api/vehicles/${vehicleId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
            setMessage(data.message || 'Vehicle deleted successfully.');
            fetchVehicles();
        } catch (error) {
            setMessage(error.message);
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
                .mv-page {
                    min-height: 100vh;
                    background: #c2cbd3;
                    color: #313851;
                    font-family: 'Space Grotesk', sans-serif;
                    display: flex;
                    flex-direction: column;
                }
                .mv-main {
                    flex-grow: 1;
                    max-width: 1280px;
                    margin: 0 auto;
                    width: 100%;
                    padding: 40px 16px;
                }
                .mv-layout {
                    display: flex;
                    flex-direction: column;
                    gap: 40px;
                }
                .mv-left {
                    flex: 1;
                    display: grid;
                    gap: 32px;
                }
                .mv-head {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-end;
                    gap: 12px;
                }
                .mv-title {
                    margin: 0;
                    color: #313851;
                    font-size: 56px;
                    line-height: 1.1;
                    font-weight: 700;
                    letter-spacing: -0.02em;
                }
                .mv-subtitle {
                    margin: 8px 0 0;
                    color: #313851;
                    font-size: 30px;
                    line-height: 1.3;
                }
                .mv-pill {
                    background: rgba(255, 255, 255, 0.3);
                    color: #313851;
                    padding: 8px 16px;
                    border-radius: 999px;
                    font-size: 20px;
                    font-weight: 600;
                    border: 1px solid rgba(255, 255, 255, 0.4);
                    backdrop-filter: blur(6px);
                    -webkit-backdrop-filter: blur(6px);
                    white-space: nowrap;
                }
                .mv-list-wrap {
                    display: grid;
                    gap: 16px;
                }
                .mv-empty {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    text-align: center;
                    padding: 60px 24px;
                    background: rgba(255, 255, 255, 0.1);
                    backdrop-filter: blur(8px);
                    -webkit-backdrop-filter: blur(8px);
                    border: 1px dashed rgba(255, 255, 255, 0.4);
                    border-radius: 14px;
                }
                .mv-empty-icon {
                    font-size: 58px;
                    margin-bottom: 12px;
                    opacity: 0.35;
                }
                .mv-empty-title {
                    margin: 0;
                    font-size: 34px;
                    line-height: 1.2;
                    font-weight: 700;
                    opacity: 0.6;
                }
                .mv-empty-sub {
                    margin: 10px auto 0;
                    max-width: 420px;
                    font-size: 20px;
                    line-height: 1.35;
                    opacity: 0.5;
                }
                .mv-vehicle-card {
                    background: rgba(255, 255, 255, 0.16);
                    border: 1px solid rgba(255, 255, 255, 0.35);
                    border-radius: 12px;
                    backdrop-filter: blur(8px);
                    -webkit-backdrop-filter: blur(8px);
                    padding: 18px;
                }
                .mv-vehicle-title {
                    margin: 0;
                    font-size: 26px;
                    line-height: 1.2;
                    font-weight: 700;
                    color: #313851;
                }
                .mv-vehicle-meta {
                    margin: 8px 0 0;
                    font-size: 18px;
                    color: rgba(49, 56, 81, 0.85);
                }
                .mv-vehicle-actions {
                    margin-top: 12px;
                    display: flex;
                    justify-content: flex-end;
                }
                .mv-delete-btn {
                    border: 1px solid #dc2626;
                    background: transparent;
                    color: #dc2626;
                    border-radius: 999px;
                    padding: 4px 12px;
                    font-size: 12px;
                    line-height: 1.2;
                    font-weight: 700;
                    font-family: 'Space Grotesk', sans-serif;
                    cursor: pointer;
                }
                .mv-delete-btn:hover {
                    background: rgba(220, 38, 38, 0.08);
                }
                .mv-right {
                    width: 100%;
                }
                .mv-right-sticky {
                    position: static;
                }
                .mv-form-card {
                    border-radius: 14px;
                    background: #ffffff;
                    border: 1px solid rgba(249, 128, 6, 0.25);
                    padding: 32px;
                    box-shadow: 0 22px 34px rgba(49, 56, 81, 0.12);
                }
                .mv-form-title {
                    margin: 0;
                    color: #313851;
                    font-size: 46px;
                    line-height: 1.15;
                    font-weight: 700;
                    letter-spacing: -0.02em;
                }
                .mv-form-subtitle {
                    margin: 10px 0 0;
                    color: #313851;
                    font-size: 22px;
                    line-height: 1.35;
                    font-weight: 500;
                }
                .mv-form-stack {
                    margin-top: 28px;
                    display: grid;
                    gap: 18px;
                }
                .mv-field {
                    display: grid;
                    gap: 8px;
                }
                .mv-label {
                    color: #313851;
                    font-size: 12px;
                    line-height: 1.2;
                    font-weight: 700;
                    letter-spacing: 0.08em;
                    text-transform: uppercase;
                    opacity: 0.8;
                }
                .mv-two-col {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 14px;
                }
                .mv-color-row {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                .mv-color-preview {
                    height: 48px;
                    width: 48px;
                    border-radius: 10px;
                    background: rgba(255, 255, 255, 0.4);
                    border: 1px solid rgba(255, 255, 255, 0.4);
                    box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.06);
                    flex-shrink: 0;
                }
                .mv-input,
                .mv-select {
                    width: 100%;
                    border-radius: 10px;
                    background: rgba(255, 255, 255, 0.2);
                    border: 1px solid rgba(255, 255, 255, 0.4);
                    color: #313851;
                    padding: 10px 12px;
                    min-height: 42px;
                    font-size: 0.875rem;
                    line-height: 1.4;
                    outline: none;
                }
                .mv-input::placeholder {
                    color: rgba(49, 56, 81, 0.5);
                    font-size: 0.875rem;
                }
                .mv-input:focus,
                .mv-select:focus {
                    border-color: #313851;
                    box-shadow: 0 0 0 1px #313851;
                }
                .mv-action {
                    width: 100%;
                    margin-top: 6px;
                    background: rgba(255, 255, 255, 0.2);
                    backdrop-filter: blur(10px);
                    -webkit-backdrop-filter: blur(10px);
                    border: 1px solid rgba(255, 255, 255, 0.6);
                    box-shadow: inset 0 1px 2px rgba(255, 255, 255, 0.8), 0 10px 16px rgba(0, 0, 0, 0.06);
                    color: #313851;
                    font-size: 30px;
                    line-height: 1.2;
                    font-weight: 900;
                    border-radius: 10px;
                    padding: 14px 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                }
                .mv-action:disabled {
                    opacity: 0.65;
                    cursor: not-allowed;
                }
                .mv-message {
                    margin: 14px 0 0;
                    color: #313851;
                    background: rgba(255, 255, 255, 0.35);
                    border: 1px solid rgba(49, 56, 81, 0.16);
                    border-radius: 10px;
                    padding: 10px 12px;
                    font-size: 16px;
                }
                .mv-note-wrap {
                    margin-top: 26px;
                    padding-top: 26px;
                    border-top: 1px solid rgba(49, 56, 81, 0.1);
                }
                .mv-note {
                    display: flex;
                    align-items: flex-start;
                    gap: 12px;
                    padding: 14px;
                    border-radius: 10px;
                    background: rgba(255, 255, 255, 0.2);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    font-size: 12px;
                    line-height: 1.6;
                    color: #313851;
                    font-style: italic;
                }
                .mv-note span {
                    flex-shrink: 0;
                }
                .mv-footer {
                    margin-top: 56px;
                    border-top: 1px solid rgba(0, 0, 0, 0.05);
                    background: rgba(255, 255, 255, 0.1);
                    backdrop-filter: blur(4px);
                    -webkit-backdrop-filter: blur(4px);
                    padding: 30px 0;
                }
                .mv-footer-inner {
                    max-width: 1280px;
                    margin: 0 auto;
                    padding: 0 16px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: space-between;
                    gap: 12px;
                }
                .mv-footer-brand {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    color: #313851;
                    font-size: 14px;
                    line-height: 1;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                }
                .mv-footer-links {
                    display: flex;
                    gap: 24px;
                }
                .mv-footer-links a {
                    color: #313851;
                    font-size: 14px;
                    font-weight: 500;
                    text-decoration: none;
                }
                .mv-footer-copy {
                    color: #94a3b8;
                    font-size: 12px;
                    margin: 0;
                }
                @media (min-width: 768px) {
                    .mv-main,
                    .mv-footer-inner {
                        padding-left: 24px;
                        padding-right: 24px;
                    }
                    .mv-footer-inner {
                        flex-direction: row;
                    }
                }
                @media (min-width: 1024px) {
                    .mv-layout {
                        flex-direction: row;
                        align-items: flex-start;
                    }
                    .mv-right {
                        width: 400px;
                        flex-shrink: 0;
                    }
                    .mv-right-sticky {
                        position: sticky;
                        top: 112px;
                    }
                }
            `}</style>
            <div className="mv-page">
                <main className="mv-main">
                    <div className="mv-layout">
                        <div className="mv-left">
                            <div className="mv-head">
                                <div>
                                    <h1 className="mv-title">My Vehicles</h1>
                                    <p className="mv-subtitle">Manage your luxury fleet and active registrations.</p>
                                </div>
                                <span className="mv-pill">{vehicles.length} Active Vehicles</span>
                            </div>

                            <div className="mv-list-wrap">
                                {vehicles.length > 0 ? (
                                    vehicles.map(v => (
                                        <div key={v.id} className="mv-vehicle-card">
                                            <p className="mv-vehicle-title">{v.make} {v.model} ({v.type})</p>
                                            <p className="mv-vehicle-meta">{v.registrationNumber}</p>
                                            <div className="mv-vehicle-actions">
                                                <button
                                                    type="button"
                                                    className="mv-delete-btn"
                                                    onClick={() => handleDeleteVehicle(v.id)}
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="mv-empty">
                                        <span className="material-symbols-outlined mv-empty-icon">no_transportation</span>
                                        <h3 className="mv-empty-title">No vehicles added yet</h3>
                                        <p className="mv-empty-sub">Register your first vehicle using the form on the right to start managing your fleet.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="mv-right">
                            <div className="mv-right-sticky">
                                <div className="mv-form-card">
                                    <h2 className="mv-form-title">Add New Vehicle</h2>
                                    <p className="mv-form-subtitle">Expand your fleet with RastaConnect.</p>

                                    <div className="mv-form-stack">
                                        <div className="mv-field">
                                            <label className="mv-label">Vehicle Type</label>
                                            <select className="mv-select" value={type} onChange={e => setType(e.target.value)}>
                                                <option value="Car">Car</option>
                                                <option value="Bike">Bike</option>
                                            </select>
                                        </div>

                                        <div className="mv-two-col">
                                            <div className="mv-field">
                                                <label className="mv-label">Make</label>
                                                <input className="mv-input" type="text" value={make} onChange={e => setMake(e.target.value)} placeholder="Enter make" required />
                                            </div>
                                            <div className="mv-field">
                                                <label className="mv-label">Model</label>
                                                <input className="mv-input" type="text" value={model} onChange={e => setModel(e.target.value)} placeholder="Enter model" required />
                                            </div>
                                        </div>

                                        <div className="mv-field">
                                            <label className="mv-label">Color</label>
                                            <div className="mv-color-row">
                                                <input className="mv-input" type="text" value={color} onChange={e => setColor(e.target.value)} placeholder="Enter color" required />
                                                <div className="mv-color-preview"></div>
                                            </div>
                                        </div>

                                        <div className="mv-field">
                                            <label className="mv-label">Registration Number</label>
                                            <input className="mv-input" type="text" value={registrationNumber} onChange={e => setRegistrationNumber(e.target.value)} placeholder="Enter registration number" required />
                                        </div>

                                        <button className="mv-action" type="button" onClick={handleAddVehicle}>
                                            <span className="material-symbols-outlined">add_circle</span>
                                            Add Vehicle
                                        </button>
                                    </div>

                                    {message && <p className="mv-message">{message}</p>}

                                    <div className="mv-note-wrap">
                                        <div className="mv-note">
                                            <span className="material-symbols-outlined">verified_user</span>
                                            <p>
                                                All vehicles undergo a premium safety inspection before being cleared for the RastaConnect network.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>

                <footer className="mv-footer">
                    <div className="mv-footer-inner">
                        <div className="mv-footer-brand">
                            <span className="material-symbols-outlined">directions_car</span>
                            <span>RastaConnect</span>
                        </div>
                        <div className="mv-footer-links">
                            <a href="#">Privacy Policy</a>
                            <a href="#">Service Terms</a>
                            <a href="#">Support</a>
                        </div>
                        <p className="mv-footer-copy">© 2024 RastaConnect Mobility. All rights reserved.</p>
                    </div>
                </footer>
            </div>
        </>
    );
}
export default VehiclesPage;
