import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

function ProfilePage() {
    const [profile, setProfile] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [isEditMode, setIsEditMode] = useState(false);
    const [formData, setFormData] = useState({
        fullName: '', gender: '', age: '', talkativeness: '', musicPreference: ''
    });

    // Phone Verification State
    const [phoneNumber, setPhoneNumber] = useState('');
    const [otp, setOtp] = useState('');
    const [showOtpForm, setShowOtpForm] = useState(false);

    const fetchProfile = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                setMessage('Please log in again');
                setIsLoading(false);
                return;
            }
            const res = await fetch('/api/profile', {
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json'
                }
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
            setProfile(data);
            // Populate both view and form data
            setFormData({
                fullName: data.fullName || '',
                gender: data.gender || '',
                age: data.age || '',
                talkativeness: data.talkativeness || 'Sometimes',
                musicPreference: data.musicPreference || 'Any'
            });
            setPhoneNumber(data.phoneNumber || '');
        } catch (error) {
            setMessage(error.message);
        } finally {
            setIsLoading(false);
        }
    };
    useEffect(() => { fetchProfile(); }, []);

    const handleFormChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        setMessage('');
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                setMessage('Please log in again');
                return;
            }
            const res = await fetch('/api/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify(formData),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
            setMessage(data.message);
            setIsEditMode(false); // Exit edit mode
            fetchProfile(); // Refresh profile data
        } catch (error) {
            setMessage(error.message);
        }
    };

    const handleSendOtp = async (e) => { e.preventDefault(); setMessage(''); try { const { data: { session } } = await supabase.auth.getSession(); if (!session) { setMessage('Please log in again'); return; } const res = await fetch('/api/profile/send-otp', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` }, body: JSON.stringify({ phoneNumber }), }); const data = await res.json(); if (!res.ok) throw new Error(data.message); if (data.otp) { setOtp(data.otp); } setMessage(`OTP sent to terminal. (Hint: it's ${data.otp})`); setShowOtpForm(true); } catch (error) { setMessage(error.message); } };
    const handleVerifyOtp = async (e) => { e.preventDefault(); setMessage(''); try { const { data: { session } } = await supabase.auth.getSession(); if (!session) { setMessage('Please log in again'); return; } const res = await fetch('/api/profile/verify-otp', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` }, body: JSON.stringify({ otp }), }); const data = await res.json(); if (!res.ok) throw new Error(data.message); setMessage(data.message); setShowOtpForm(false); fetchProfile(); } catch (error) { setMessage(error.message); } };

    if (isLoading) return <p>Loading profile...</p>;
    if (!profile) return <p>Could not load profile. Please log in again.</p>;

    return (
        <div className="profile-container">
            <div className="card">
                <div className="profile-header">
                    <h2>My Profile</h2>
                    {!isEditMode && <button onClick={() => setIsEditMode(true)} className="edit-button">Edit Profile</button>}
                </div>

                {!isEditMode ? (
                    <div className="profile-details">
                        <p><strong>Full Name:</strong> {profile.fullName}</p>
                        <p><strong>Email:</strong> {profile.email}</p>
                        <p><strong>Phone:</strong> {profile.phoneNumber || 'Not Added'} 
                            {profile.phoneVerified ? <span className="verified-tick">✓</span> : null}
                        </p>
                        <p><strong>Gender:</strong> {profile.gender || 'Not Added'}</p>
                        <p><strong>Age:</strong> {profile.age || 'Not Added'}</p>
                        <p><strong>Talkativeness:</strong> {profile.talkativeness || 'Not Added'}</p>
                        <p><strong>Music Preference:</strong> {profile.musicPreference || 'Not Added'}</p>
                    </div>
                ) : (
                    <form onSubmit={handleUpdateProfile}>
                        <label>Full Name</label>
                        <input type="text" name="fullName" value={formData.fullName} onChange={handleFormChange} />

                        <label>Gender</label>
                        <input type="text" name="gender" value={formData.gender} onChange={handleFormChange} placeholder="e.g., Male, Female, Other" />

                        <label>Age</label>
                        <input type="number" name="age" value={formData.age} onChange={handleFormChange} />

                        <label>Talkativeness</label>
                        <select name="talkativeness" value={formData.talkativeness} onChange={handleFormChange}>
                            <option value="Talkative">Talkative</option>
                            <option value="Sometimes">Sometimes</option>
                            <option value="Quiet">Quiet Ride Preferred</option>
                        </select>

                        <label>Music Preference</label>
                        <select name="musicPreference" value={formData.musicPreference} onChange={handleFormChange}>
                            <option value="Any">Any</option>
                            <option value="Rock">Rock</option>
                            <option value="Pop">Pop</option>
                            <option value="Hip Hop">Hip Hop</option>
                            <option value="Electronic">Electronic</option>
                            <option value="No Music">No Music</option>
                        </select>

                        <div className="form-actions">
                            <button type="submit" className="save-button">Save Changes</button>
                            <button type="button" onClick={() => setIsEditMode(false)}>Cancel</button>
                        </div>
                    </form>
                )}

                <hr />

                {!profile.phoneVerified && (
                    <div className="verification-section">
                        <h3>Verify Your Phone Number</h3>
                        {!showOtpForm ? (
                            <form onSubmit={handleSendOtp}><p>Enter your 10-digit phone number.</p><input type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="Phone Number" required /><button type="submit">Send OTP</button></form>
                        ) : (
                            <form onSubmit={handleVerifyOtp}><p>Check your backend terminal for the OTP.</p><input type="text" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="Enter 4-digit OTP" required /><button type="submit">Verify</button></form>
                        )}
                    </div>
                )}
                {message && <p className="info-message" style={{marginTop: '1rem'}}>{message}</p>}
            </div>
        </div>
    );
}
export default ProfilePage;
