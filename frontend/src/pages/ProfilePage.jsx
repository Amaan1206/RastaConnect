import React, { useRef, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import LivenessCheck from '../components/LivenessCheck';

function ProfilePage() {
    const [profile, setProfile] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [isEditMode, setIsEditMode] = useState(false);
    const [fullName, setFullName] = useState('');
    const [gender, setGender] = useState('');
    const [age, setAge] = useState('');
    const [talkativeness, setTalkativeness] = useState('Sometimes');
    const [musicPreference, setMusicPreference] = useState('Any');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [isFaceVerified, setIsFaceVerified] = useState(false);
    const [isFaceModalOpen, setIsFaceModalOpen] = useState(false);
    const [hasReferenceEmbedding, setHasReferenceEmbedding] = useState(false);
    const [faceModalMessage, setFaceModalMessage] = useState('');
    const [isFaceActionLoading, setIsFaceActionLoading] = useState(false);
    const fileInputRef = useRef(null);

    // Phone Verification State
    const [phoneNumber, setPhoneNumber] = useState('');
    const [otp, setOtp] = useState('');
    const [showOtpForm, setShowOtpForm] = useState(false);

    const [faceMessage, setFaceMessage] = useState('');
    const [referenceRegistered, setReferenceRegistered] = useState(false);
    const [dateOfBirth, setDateOfBirth] = useState('');
    const [smokingAllowed, setSmokingAllowed] = useState(false);
    const [petFriendly, setPetFriendly] = useState(false);
    const [totalRides, setTotalRides] = useState(0);
    const [averageRating, setAverageRating] = useState(0);
    const [phoneVerified, setPhoneVerified] = useState(false);

    const loadAvatar = async (userId) => {
        const avatarPath = `${userId}/avatar.jpg`;
        const { error: downloadError } = await supabase.storage
            .from('avatars')
            .download(avatarPath);

        if (downloadError) {
            setAvatarUrl('');
            return;
        }

        const { data: publicData } = supabase.storage
            .from('avatars')
            .getPublicUrl(avatarPath);

        setAvatarUrl(publicData?.publicUrl ? `${publicData.publicUrl}?t=${Date.now()}` : '');
    };

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
            console.log('Profile API response:', data);
            if (!res.ok) throw new Error(data.message);
            setProfile(data);
            setFullName(data.fullName || '');
            setGender(data.gender || '');
            setAge(data.age || '');
            setTalkativeness(data.talkativeness || 'Sometimes');
            setMusicPreference(data.musicPreference || 'Any');
            setPhoneNumber(data.phoneNumber || '');
            setDateOfBirth(data.dateOfBirth || '');
            setSmokingAllowed(Boolean(data.smokingAllowed));
            setPetFriendly(Boolean(data.petFriendly));
            setTotalRides(data.totalRides || 0);
            setAverageRating(data.averageRating || 0);
            setIsFaceVerified(Boolean(data.faceVerified ?? data.face_verified ?? data.isFaceVerified));
            setPhoneVerified(Boolean(data.phoneVerified));
            await loadAvatar(session.user.id);
        } catch (error) {
            setMessage(error.message);
        } finally {
            setIsLoading(false);
        }
    };
    useEffect(() => { fetchProfile(); }, []);

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
                body: JSON.stringify({
                    fullName,
                    gender,
                    age,
                    talkativeness,
                    musicPreference,
                    dateOfBirth,
                    smokingAllowed,
                    petFriendly
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
            setMessage(data.message);
            setTimeout(() => setMessage(''), 5000);
            setIsEditMode(false); // Exit edit mode
            fetchProfile(); // Refresh profile data
        } catch (error) {
            setMessage(error.message);
        }
    };

    const handleSendOtp = async (e) => { e.preventDefault(); setMessage(''); try { const { data: { session } } = await supabase.auth.getSession(); if (!session) { setMessage('Please log in again'); return; } const res = await fetch('/api/profile/send-otp', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` }, body: JSON.stringify({ phoneNumber }), }); const data = await res.json(); if (!res.ok) throw new Error(data.message); if (data.otp) { setOtp(data.otp); } setMessage(`OTP sent to terminal. (Hint: it's ${data.otp})`); setTimeout(() => setMessage(''), 5000); setShowOtpForm(true); } catch (error) { setMessage(error.message); } };
    const handleVerifyOtp = async (e) => { e.preventDefault(); setMessage(''); try { const { data: { session } } = await supabase.auth.getSession(); if (!session) { setMessage('Please log in again'); return; } const res = await fetch('/api/profile/verify-otp', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` }, body: JSON.stringify({ otp }), }); const data = await res.json(); if (!res.ok) throw new Error(data.message); setMessage(data.message); setTimeout(() => setMessage(''), 5000); setShowOtpForm(false); fetchProfile(); } catch (error) { setMessage(error.message); } };
    const handleCameraClick = () => {
        fileInputRef.current?.click();
    };
    const handleOpenFaceModal = () => {
        setFaceModalMessage('');
        setHasReferenceEmbedding(false);
        setIsFaceModalOpen(true);
    };
    const handleCloseFaceModal = () => {
        if (isFaceActionLoading) return;
        setIsFaceModalOpen(false);
        setFaceModalMessage('');
        setHasReferenceEmbedding(false);
    };
    const handleRegisterFace = async () => {
        if (faceMessage === 'Registering face...') return;
        try {
            setFaceMessage('Registering face...');
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return setFaceMessage('Please log in again.');

            const avatarPath = `${session.user.id}/avatar.jpg`;
            const { data } = supabase.storage
                .from('avatars')
                .getPublicUrl(avatarPath);

            const imageResponse = await fetch(data.publicUrl);
            if (!imageResponse.ok) throw new Error('Could not fetch profile picture.');
            const blob = await imageResponse.blob();

            const formData = new FormData();
            formData.append('file', blob, 'avatar.jpg');

            const res = await fetch('/api/profile/upload-face', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: formData
            });

            const data2 = await res.json();
            if (!res.ok) throw new Error(data2.message);
            setFaceMessage('Reference face registered successfully.');
            setReferenceRegistered(true);
        } catch (err) {
            setFaceMessage(err.message);
        }
    };
    const handleLivenessFailure = () => {
        setFaceModalMessage('Liveness check failed or timed out. Please try again.');
    };
    const handleLivenessSuccess = async (imageBlob) => {
        try {
            setIsFaceActionLoading(true);
            setFaceModalMessage('Processing live verification...');
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                setFaceModalMessage('Please log in again');
                return;
            }

            const liveFormData = new FormData();
            liveFormData.append('image', imageBlob, 'live-capture.jpg');

            const liveEmbeddingRes = await fetch('/api/profile/extract-embedding', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${session.access_token}` },
                body: liveFormData
            });
            if (liveEmbeddingRes.status === 400) {
                setFaceModalMessage('No face detected in live capture. Please try again.');
                return;
            }
            if (!liveEmbeddingRes.ok) {
                throw new Error('Could not extract live face embedding.');
            }
            const liveEmbeddingData = await liveEmbeddingRes.json();
            const liveEmbedding = liveEmbeddingData?.embedding;
            if (!Array.isArray(liveEmbedding) || liveEmbedding.length !== 512) {
                throw new Error('Invalid live embedding received.');
            }

            const storedEmbeddingRes = await fetch('/api/profile/face-embedding', {
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json'
                }
            });
            const storedEmbeddingData = await storedEmbeddingRes.json();
            if (!storedEmbeddingRes.ok) {
                throw new Error(storedEmbeddingData.message || 'Could not fetch reference embedding.');
            }

            const storedEmbedding = storedEmbeddingData?.embedding || storedEmbeddingData?.face_embedding;
            if (!Array.isArray(storedEmbedding) || storedEmbedding.length !== 512) {
                throw new Error('Reference embedding is missing. Complete Step 1 first.');
            }

            const verifyRes = await fetch('/api/profile/verify-face-match', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({
                    embedding1: liveEmbedding,
                    embedding2: storedEmbedding
                })
            });
            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) {
                throw new Error('Face match verification failed.');
            }

            if (verifyData.match) {
                const markVerifiedRes = await fetch('/api/profile/verify-face', {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${session.access_token}`,
                        'Content-Type': 'application/json'
                    }
                });
                const markVerifiedData = await markVerifiedRes.json();
                if (!markVerifiedRes.ok) {
                    throw new Error(markVerifiedData.message || 'Could not mark face as verified.');
                }

                setIsFaceVerified(true);
                setFaceModalMessage('Face Verified');
                setMessage('Face Verified');
                setTimeout(() => setMessage(''), 5000);
                setIsFaceModalOpen(false);
                return;
            }

            setFaceModalMessage('Face did not match. Please try again.');
        } catch (error) {
            setFaceModalMessage(error.message);
        } finally {
            setIsFaceActionLoading(false);
        }
    };
    const handleAvatarFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setMessage('Please select a valid image file.');
            e.target.value = '';
            return;
        }

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                setMessage('Please log in again');
                e.target.value = '';
                return;
            }

            const avatarPath = `${session.user.id}/avatar.jpg`;
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(avatarPath, file, { upsert: true });

            if (uploadError) {
                throw new Error(uploadError.message);
            }

            const { data: publicData } = supabase.storage
                .from('avatars')
                .getPublicUrl(avatarPath);

            setAvatarUrl(publicData?.publicUrl ? `${publicData.publicUrl}?t=${Date.now()}` : '');
            setMessage('Profile picture updated successfully.');
            setTimeout(() => setMessage(''), 5000);
        } catch (error) {
            setMessage(error.message);
        } finally {
            e.target.value = '';
        }
    };

    if (isLoading) return <p>Loading profile...</p>;
    if (!profile) return <p>Could not load profile. Please log in again.</p>;

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
                .pf-page {
                    min-height: 100vh;
                    background: #c2cbd3;
                    color: #313851;
                    font-family: 'Space Grotesk', sans-serif;
                    display: flex;
                    flex-direction: column;
                }
                .pf-main {
                    flex: 1;
                    max-width: 1100px;
                    width: 100%;
                    margin: 0 auto;
                    padding: 24px 20px 40px;
                    display: grid;
                    gap: 24px;
                }
                .pf-hero {
                    border-radius: 12px;
                    border: 1px solid rgba(255, 255, 255, 0.4);
                    background: rgba(255, 255, 255, 0.2);
                    backdrop-filter: blur(16px);
                    -webkit-backdrop-filter: blur(16px);
                    box-shadow: 0 10px 20px rgba(49, 56, 81, 0.12);
                    padding: 16px 24px;
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                    width: 100%;
                    height: auto;
                    align-self: start;
                }
                .pf-hero-top {
                    display: flex;
                    align-items: center;
                    gap: 20px;
                    width: 100%;
                }
                .pf-avatar-wrap {
                    position: relative;
                    flex-shrink: 0;
                }
                .pf-avatar {
                    height: 110px;
                    width: 110px;
                    border-radius: 999px;
                    border: 2px solid rgba(255, 255, 255, 0.5);
                    background: rgba(255, 255, 255, 0.1);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    overflow: hidden;
                }
                .pf-avatar-image {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    display: block;
                }
                .pf-camera {
                    position: absolute;
                    right: -4px;
                    bottom: -4px;
                    border: 0;
                    background: #313851;
                    color: #c2cbd3;
                    border-radius: 999px;
                    width: 28px;
                    height: 28px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 6px 10px rgba(49, 56, 81, 0.2);
                    cursor: pointer;
                }
                .pf-hero-content h2 {
                    margin: 0;
                    color: #313851;
                    font-size: 30px;
                    line-height: 1.2;
                    font-weight: 700;
                    letter-spacing: -0.02em;
                    flex: 1;
                    min-width: 0;
                }
                .pf-name-row {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    flex: 1;
                    min-width: 0;
                }
                .pf-face-badge {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 999px;
                    padding: 4px 10px;
                    font-size: 12px;
                    line-height: 1;
                    font-weight: 700;
                    color: #166534;
                    background: rgba(134, 239, 172, 0.55);
                    border: 1px solid rgba(22, 163, 74, 0.4);
                    white-space: nowrap;
                }
                .pf-hero-content {
                    flex: 1;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 20px;
                    flex-wrap: nowrap;
                }
                .pf-hero-content p {
                    margin: 4px 0 0;
                    color: rgba(49, 56, 81, 0.7);
                    font-size: 16px;
                    line-height: 1.4;
                    font-weight: 600;
                }
                .pf-hero-buttons {
                    display: flex;
                    flex-direction: column;
                    align-items: flex-end;
                    gap: 10px;
                    flex-shrink: 0;
                }
                .pf-btn {
                    border-radius: 8px;
                    border: 1px solid rgba(255, 255, 255, 0.4);
                    background: rgba(255, 255, 255, 0.2);
                    color: #313851;
                    font-family: 'Space Grotesk', sans-serif;
                    font-size: 14px;
                    line-height: 1.2;
                    font-weight: 700;
                    padding: 10px 18px;
                    box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.6);
                }
                .pf-btn-secondary {
                    background: rgba(255, 255, 255, 0.12);
                    border-color: rgba(255, 255, 255, 0.2);
                }
                .pf-grid {
                    display: grid;
                    gap: 22px;
                    align-items: start;
                }
                .pf-left {
                    display: grid;
                    gap: 18px;
                    border: 0;
                    background: transparent;
                    box-shadow: none;
                    padding: 0;
                }
                .pf-profile-head {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    border-bottom: 1px solid rgba(49, 56, 81, 0.2);
                    padding-bottom: 8px;
                    color: #313851;
                    font-size: 20px;
                    font-weight: 700;
                }
                .pf-profile-fields {
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 14px;
                }
                .pf-field {
                    display: grid;
                    gap: 6px;
                }
                .pf-label {
                    color: rgba(49, 56, 81, 0.8);
                    font-size: 14px;
                    line-height: 1.3;
                    font-weight: 600;
                }
                .pf-input,
                .pf-select {
                    width: 100%;
                    border-radius: 8px;
                    border: 1px solid rgba(255, 255, 255, 0.4);
                    background: rgba(255, 255, 255, 0.3);
                    color: #313851;
                    padding: 10px 12px;
                    font-size: 16px;
                    line-height: 1.35;
                    outline: none;
                }
                .pf-input::placeholder {
                    color: rgba(49, 56, 81, 0.5);
                }
                .pf-value {
                    margin: 0;
                    width: 100%;
                    border-radius: 8px;
                    border: 1px solid rgba(255, 255, 255, 0.4);
                    background: rgba(255, 255, 255, 0.22);
                    color: #313851;
                    padding: 10px 12px;
                    font-size: 16px;
                    line-height: 1.35;
                    min-height: 44px;
                    display: flex;
                    align-items: center;
                }
                .pf-input:focus,
                .pf-select:focus {
                    border-color: rgba(255, 255, 255, 0.65);
                    box-shadow: 0 0 0 2px rgba(49, 56, 81, 0.18);
                }
                .pf-verify-col {
                    display: block;
                    height: auto;
                    align-self: start;
                }
                .pf-verify-card {
                    border-radius: 12px;
                    border: 1px solid rgba(255, 255, 255, 0.4);
                    background: rgba(255, 255, 255, 0.2);
                    backdrop-filter: blur(16px);
                    -webkit-backdrop-filter: blur(16px);
                    box-shadow: 0 10px 18px rgba(49, 56, 81, 0.1);
                    padding: 16px;
                    display: grid;
                    gap: 12px;
                    width: 100%;
                    height: auto;
                    align-content: start;
                }
                .pf-face-card {
                    margin-top: 12px;
                }
                .pf-face-step-label {
                    margin: 0;
                    font-size: 13px;
                    font-weight: 600;
                    color: rgba(49, 56, 81, 0.82);
                }
                .pf-face-preview {
                    width: 100%;
                    max-width: 180px;
                    height: 180px;
                    object-fit: cover;
                    border-radius: 12px;
                    border: 1px solid rgba(49, 56, 81, 0.2);
                    background: rgba(255, 255, 255, 0.35);
                }
                .pf-modal-backdrop {
                    position: fixed;
                    inset: 0;
                    z-index: 1000;
                    background: rgba(18, 24, 38, 0.58);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 20px;
                    box-sizing: border-box;
                }
                .pf-modal {
                    width: min(920px, 100%);
                    max-height: 92vh;
                    overflow-y: auto;
                    border-radius: 14px;
                    border: 1px solid rgba(255, 255, 255, 0.4);
                    background: #c2cbd3;
                    color: #313851;
                    box-shadow: 0 20px 40px rgba(18, 24, 38, 0.35);
                    padding: 18px;
                    display: grid;
                    gap: 14px;
                }
                .pf-modal-head {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 12px;
                }
                .pf-modal-title {
                    margin: 0;
                    font-size: 24px;
                    line-height: 1.2;
                    font-weight: 700;
                }
                .pf-modal-close {
                    border-radius: 8px;
                    border: 1px solid rgba(49, 56, 81, 0.25);
                    background: rgba(255, 255, 255, 0.4);
                    color: #313851;
                    font-size: 13px;
                    font-weight: 700;
                    padding: 8px 12px;
                    cursor: pointer;
                }
                .pf-modal-section {
                    border-radius: 12px;
                    border: 1px solid rgba(255, 255, 255, 0.45);
                    background: rgba(255, 255, 255, 0.22);
                    padding: 14px;
                    display: grid;
                    gap: 10px;
                }
                .pf-modal-section h4 {
                    margin: 0;
                    font-size: 16px;
                    font-weight: 700;
                }
                .pf-modal-message {
                    margin: 0;
                    border-radius: 10px;
                    border: 1px solid rgba(49, 56, 81, 0.2);
                    background: rgba(255, 255, 255, 0.35);
                    padding: 10px 12px;
                    font-size: 14px;
                    line-height: 1.35;
                }
                .pf-success-text {
                    margin: 0;
                    color: #166534;
                    font-size: 13px;
                    font-weight: 700;
                }
                .pf-verify-head {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    border-bottom: 1px solid rgba(49, 56, 81, 0.16);
                    padding-bottom: 8px;
                    font-size: 18px;
                    line-height: 1.2;
                    font-weight: 700;
                }
                .pf-verify-block {
                    display: grid;
                    gap: 8px;
                }
                .pf-verify-title {
                    margin: 0;
                    font-size: 12px;
                    line-height: 1.2;
                    font-weight: 700;
                    text-transform: uppercase;
                    color: rgba(49, 56, 81, 0.8);
                }
                .pf-row {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 8px;
                }
                .pf-btn-sm {
                    border-radius: 8px;
                    border: 1px solid rgba(255, 255, 255, 0.4);
                    background: rgba(255, 255, 255, 0.2);
                    color: #313851;
                    padding: 8px 10px;
                    font-size: 12px;
                    line-height: 1.2;
                    font-weight: 700;
                }
                .pf-btn-sm.alt {
                    background: rgba(255, 255, 255, 0.1);
                    border-color: rgba(255, 255, 255, 0.2);
                }
                .pf-divider {
                    border-top: 1px solid rgba(49, 56, 81, 0.1);
                    padding-top: 10px;
                }
                .pf-message {
                    margin: 0;
                    color: #313851;
                    border: 1px solid rgba(49, 56, 81, 0.2);
                    background: rgba(255, 255, 255, 0.35);
                    border-radius: 10px;
                    padding: 8px 12px;
                    font-size: 14px;
                    line-height: 1.35;
                    width: fit-content;
                    max-width: 100%;
                    align-self: start;
                }
                @media (min-width: 768px) {
                    .pf-main {
                        padding: 30px 24px 44px;
                    }
                    .pf-profile-fields {
                        grid-template-columns: 1fr 1fr;
                    }
                }
                @media (min-width: 1024px) {
                    .pf-main {
                        padding: 34px 28px 48px;
                    }
                    .pf-grid {
                        grid-template-columns: 2fr 1fr;
                        gap: 26px;
                    }
                    .pf-verify-col {
                        align-content: start;
                    }
                }
            `}</style>
            <div className="pf-page">
                <main className="pf-main">
                    <section className="pf-hero">
                        <div className="pf-hero-top">
                            <div className="pf-avatar-wrap">
                                <div className="pf-avatar">
                                    {avatarUrl ? (
                                        <img src={avatarUrl} alt="Profile avatar" className="pf-avatar-image" />
                                    ) : (
                                        <span className="material-symbols-outlined" style={{ fontSize: '50px', opacity: 0.5 }}>account_circle</span>
                                    )}
                                </div>
                                <button type="button" className="pf-camera" onClick={handleCameraClick}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>photo_camera</span>
                                </button>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    style={{ display: 'none' }}
                                    onChange={handleAvatarFileChange}
                                />
                            </div>
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'nowrap' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
                                    <h2 style={{ margin: 0, color: '#313851', fontSize: '30px', fontWeight: 700, letterSpacing: '-0.02em' }}>{fullName || 'Profile'}</h2>
                                    <p style={{ margin: 0, fontSize: '14px', color: 'rgba(49,56,81,0.7)', fontWeight: 600 }}>
                                        {averageRating > 0 ? `⭐ ${averageRating.toFixed(2)}` : '⭐ No ratings yet'} · {totalRides} ride{totalRides !== 1 ? 's' : ''} completed
                                    </p>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                                    {isFaceVerified && <span className="pf-face-badge">Face Verified</span>}
                                    {phoneVerified && (
                                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: '999px', padding: '4px 10px', fontSize: '12px', lineHeight: 1, fontWeight: 700, color: '#166534', background: 'rgba(134, 239, 172, 0.55)', border: '1px solid rgba(22, 163, 74, 0.35)', whiteSpace: 'nowrap' }}>
                                            Number Verified
                                        </span>
                                    )}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <button type="button" className="pf-btn" onClick={(e) => handleUpdateProfile(e)} disabled={!isEditMode} style={{ cursor: isEditMode ? 'pointer' : 'not-allowed' }}>Save Changes</button>
                                        <button type="button" className="pf-btn pf-btn-secondary" onClick={() => setIsEditMode(true)}>Edit Profile</button>
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                if (!window.confirm('Are you sure you want to delete your account? This cannot be undone.')) return;
                                                const { data: { session } } = await supabase.auth.getSession();
                                                const res = await fetch('/api/profile/delete-account', { method: 'DELETE', headers: { 'Authorization': `Bearer ${session.access_token}` } });
                                                if (res.ok) { await supabase.auth.signOut(); window.location.href = '/'; }
                                            }}
                                            style={{ padding: '10px 18px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Space Grotesk, sans-serif' }}
                                        >
                                            Delete Account
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div style={{ borderTop: '1px solid rgba(49,56,81,0.1)', paddingTop: '16px' }}>
                            <div className="pf-profile-head">
                                <span>My Profile</span>
                            </div>
                            <div className="pf-profile-fields">
                                <div className="pf-field">
                                    <label className="pf-label">Full Name</label>
                                    {isEditMode ? (
                                        <input
                                            className="pf-input"
                                            type="text"
                                            value={fullName}
                                            onChange={(e) => setFullName(e.target.value)}
                                        />
                                    ) : (
                                        <p className="pf-value">{fullName || 'Not Added'}</p>
                                    )}
                                </div>

                                <div className="pf-field">
                                    <label className="pf-label">Email Address</label>
                                    <p className="pf-value">{profile.email || 'Not Added'}</p>
                                </div>

                                <div className="pf-field">
                                    <label className="pf-label">Gender</label>
                                    {isEditMode ? (
                                        <select
                                            className="pf-select"
                                            value={gender}
                                            onChange={(e) => setGender(e.target.value)}
                                        >
                                            <option value="">Select gender</option>
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                            <option value="Non-binary">Non-binary</option>
                                            <option value="Prefer not to say">Prefer not to say</option>
                                        </select>
                                    ) : (
                                        <p className="pf-value">{gender || 'Not Added'}</p>
                                    )}
                                </div>

                                <div className="pf-field">
                                    <label className="pf-label">Date of Birth</label>
                                    {isEditMode ? (
                                        <input
                                            className="pf-input"
                                            type="date"
                                            value={dateOfBirth}
                                            onChange={(e) => setDateOfBirth(e.target.value)}
                                        />
                                    ) : (
                                        <p className="pf-value">{dateOfBirth || 'Not Added'}</p>
                                    )}
                                </div>

                                <div className="pf-field">
                                    <label className="pf-label">Talkativeness</label>
                                    {isEditMode ? (
                                        <select
                                            className="pf-select"
                                            value={talkativeness}
                                            onChange={(e) => setTalkativeness(e.target.value)}
                                        >
                                            <option value="Talkative">Talkative</option>
                                            <option value="Sometimes">Sometimes</option>
                                            <option value="Silence">Quiet Ride</option>
                                        </select>
                                    ) : (
                                        <p className="pf-value">{talkativeness || 'Not Added'}</p>
                                    )}
                                </div>

                                <div className="pf-field">
                                    <label className="pf-label">Smoking Allowed</label>
                                    {isEditMode ? (
                                        <select
                                            className="pf-select"
                                            value={smokingAllowed ? 'yes' : 'no'}
                                            onChange={(e) => setSmokingAllowed(e.target.value === 'yes')}
                                        >
                                            <option value="no">No Smoking</option>
                                            <option value="yes">Smoking Allowed</option>
                                        </select>
                                    ) : (
                                        <p className="pf-value">{smokingAllowed ? '🚬 Smoking Allowed' : '🚭 No Smoking'}</p>
                                    )}
                                </div>

                                <div className="pf-field">
                                    <label className="pf-label">Pet Friendly</label>
                                    {isEditMode ? (
                                        <select
                                            className="pf-select"
                                            value={petFriendly ? 'yes' : 'no'}
                                            onChange={(e) => setPetFriendly(e.target.value === 'yes')}
                                        >
                                            <option value="no">No Pets</option>
                                            <option value="yes">Pets Welcome</option>
                                        </select>
                                    ) : (
                                        <p className="pf-value">{petFriendly ? '🐾 Pets Welcome' : '🚫 No Pets'}</p>
                                    )}
                                </div>

                                <div className="pf-field">
                                    <label className="pf-label">Music Preference</label>
                                    {isEditMode ? (
                                        <select
                                            className="pf-select"
                                            value={musicPreference}
                                            onChange={(e) => setMusicPreference(e.target.value)}
                                        >
                                            <option value="Any">Anything goes</option>
                                            <option value="Pop">Top 40 / Pop</option>
                                            <option value="Rock">Rock / Indie</option>
                                            <option value="Hip Hop">Hip Hop / Rap</option>
                                            <option value="Electronic">Electronic / EDM</option>
                                            <option value="Classical">Classical / Jazz</option>
                                            <option value="Silence">Quiet Ride</option>
                                        </select>
                                    ) : (
                                        <p className="pf-value">{musicPreference || 'Not Added'}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </section>

                    <section style={{ display: 'grid', gap: '20px' }}>

                        <div className="pf-verify-col">
                            <div className="pf-verify-card">
                                <div className="pf-verify-head">
                                    <span>Verification</span>
                                </div>

                                <div className="pf-verify-block">
                                    <h4 className="pf-verify-title">
                                        Verify Phone Number
                                        {phoneVerified && (
                                            <span style={{ marginLeft: '8px', color: '#16a34a', fontSize: '11px', fontWeight: 700 }}>✓ Verified</span>
                                        )}
                                    </h4>
                                    <input
                                        className="pf-input"
                                        type="tel"
                                        value={showOtpForm ? otp : phoneNumber}
                                        onChange={(e) => (showOtpForm ? setOtp(e.target.value) : setPhoneNumber(e.target.value))}
                                        placeholder={showOtpForm ? 'Enter OTP' : 'Phone Number'}
                                    />
                                    <div className="pf-row">
                                        <button type="button" className="pf-btn-sm" onClick={handleSendOtp}>Send OTP</button>
                                        <button type="button" className="pf-btn-sm alt" onClick={handleVerifyOtp} disabled={!showOtpForm}>Verify OTP</button>
                                    </div>
                                </div>

                                <div className="pf-divider">
                                    <div className="pf-verify-block">
                                        <h4 className="pf-verify-title">Verify PAN</h4>
                                        <input className="pf-input" type="text" placeholder="PAN Number" defaultValue={profile.panNumber || ''} />
                                        <button type="button" className="pf-btn-sm">
                                            Verify PAN
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="pf-verify-card pf-face-card">
                                <div className="pf-verify-head">
                                    <span>Face Verification</span>
                                </div>
                                <div className="pf-verify-block">
                                    <h4 className="pf-verify-title">Status</h4>
                                    <p className="pf-value" style={{ color: isFaceVerified ? '#16a34a' : '#dc2626', fontWeight: 700 }}>
                                        {isFaceVerified ? '✓ Face Verified' : 'Not Verified'}
                                    </p>
                                    {!isFaceVerified && (
                                        <button type="button" className="pf-btn-sm" onClick={handleOpenFaceModal}>
                                            Verify Face
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </section>

                    {message && (
                        <div style={{
                            position: 'fixed',
                            bottom: '32px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            background: '#313851',
                            color: '#fff',
                            padding: '14px 28px',
                            borderRadius: '12px',
                            fontFamily: '"Space Grotesk", sans-serif',
                            fontSize: '15px',
                            fontWeight: 700,
                            boxShadow: '0 8px 24px rgba(49,56,81,0.35)',
                            zIndex: 9999,
                            whiteSpace: 'nowrap',
                            border: '1px solid rgba(255,255,255,0.15)'
                        }}>
                            {message}
                        </div>
                    )}

                </main>
            </div >
            {
                isFaceModalOpen ? (
                    <div className="pf-modal-backdrop" >
                        <div className="pf-modal">
                            <div className="pf-modal-head">
                                <h3 className="pf-modal-title">Face Verification</h3>
                                <button type="button" className="pf-modal-close" onClick={handleCloseFaceModal}>
                                    Close
                                </button>
                            </div>

                            <div className="pf-modal-section">
                                <h4>Step 1 — Upload Reference Photo</h4>
                                <p className="pf-face-step-label">Use your current profile picture as the reference face embedding.</p>
                                {avatarUrl ? (
                                    <img src={avatarUrl} alt="Reference profile" className="pf-face-preview" />
                                ) : (
                                    <p className="pf-face-step-label">No profile picture found. Upload one using the camera button first.</p>
                                )}
                                <button
                                    type="button"
                                    className="pf-btn-sm"
                                    onClick={handleRegisterFace}
                                    disabled={isFaceActionLoading || !avatarUrl}
                                >
                                    Use Profile Picture as Reference
                                </button>
                                {faceMessage && <p style={{ marginTop: '10px', color: 'green' }}>{faceMessage}</p>}
                                {hasReferenceEmbedding ? <p className="pf-success-text">Reference embedding stored successfully.</p> : null}
                            </div>

                            <div className="pf-modal-section">
                                <h4>Step 2 — Live Verification</h4>
                                {!referenceRegistered ? (
                                    <p>Complete Step 1 first to start live verification.</p>
                                ) : (
                                    <LivenessCheck
                                        onSuccess={handleLivenessSuccess}
                                        onFailure={handleLivenessFailure}
                                    />
                                )}
                            </div>

                            {faceModalMessage ? <p className="pf-modal-message">{faceModalMessage}</p> : null}
                        </div>
                    </div>
                ) : null
            }
        </>
    );
}
export default ProfilePage;
