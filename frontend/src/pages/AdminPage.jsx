import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const DEFAULT_STATS = {
  totalUsers: 0,
  totalRides: 0,
  totalBookings: 0,
  completedRides: 0,
  bannedUsers: 0,
  verifiedUsers: 0
};

function AdminPage() {
  const navigate = useNavigate();
  const { authToken } = useOutletContext();

  const [activeTab, setActiveTab] = useState('overview');
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [toast, setToast] = useState('');

  const [overviewLoading, setOverviewLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [ridesLoading, setRidesLoading] = useState(false);
  const [bookingsLoading, setBookingsLoading] = useState(false);

  const [stats, setStats] = useState(DEFAULT_STATS);
  const [users, setUsers] = useState([]);
  const [rides, setRides] = useState([]);
  const [bookings, setBookings] = useState([]);

  const [userSearch, setUserSearch] = useState('');
  const [rideStatus, setRideStatus] = useState('all');
  const [bookingStatus, setBookingStatus] = useState('all');

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(''), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const getToken = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || authToken || '';
  }, [authToken]);

  const apiFetch = useCallback(async (url, options = {}) => {
    const token = await getToken();
    const headers = {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`
    };
    const response = await fetch(url, { ...options, headers });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || 'Request failed.');
    }
    return data;
  }, [getToken]);

  const fetchStats = useCallback(async () => {
    setOverviewLoading(true);
    try {
      const data = await apiFetch('/api/admin/stats');
      setStats({
        totalUsers: Number(data.totalUsers || 0),
        totalRides: Number(data.totalRides || 0),
        totalBookings: Number(data.totalBookings || 0),
        completedRides: Number(data.completedRides || 0),
        bannedUsers: Number(data.bannedUsers || 0),
        verifiedUsers: Number(data.verifiedUsers || 0)
      });
    } catch (error) {
      setToast(error.message);
    } finally {
      setOverviewLoading(false);
    }
  }, [apiFetch]);

  const fetchUsers = useCallback(async (search = '') => {
    setUsersLoading(true);
    try {
      const query = search ? `?search=${encodeURIComponent(search)}` : '';
      const data = await apiFetch(`/api/admin/users${query}`);
      setUsers(data.users || []);
    } catch (error) {
      setToast(error.message);
    } finally {
      setUsersLoading(false);
    }
  }, [apiFetch]);

  const fetchRides = useCallback(async (status = 'all') => {
    setRidesLoading(true);
    try {
      const query = status !== 'all' ? `?status=${encodeURIComponent(status)}` : '';
      const data = await apiFetch(`/api/admin/rides${query}`);
      setRides(data.rides || []);
    } catch (error) {
      setToast(error.message);
    } finally {
      setRidesLoading(false);
    }
  }, [apiFetch]);

  const fetchBookings = useCallback(async (status = 'all') => {
    setBookingsLoading(true);
    try {
      const query = status !== 'all' ? `?status=${encodeURIComponent(status)}` : '';
      const data = await apiFetch(`/api/admin/bookings${query}`);
      setBookings(data.bookings || []);
    } catch (error) {
      setToast(error.message);
    } finally {
      setBookingsLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        setCheckingAccess(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setAccessDenied(true);
          setCheckingAccess(false);
          navigate('/');
          return;
        }

        const res = await fetch('/api/profile', {
          headers: { Authorization: `Bearer ${session.access_token}` }
        });
        const data = await res.json();

        console.log('Profile data:', data);
        console.log('Role:', data.role);

        if (data.role !== 'admin') {
          setAccessDenied(true);
          setCheckingAccess(false);
          setTimeout(() => navigate('/'), 2000);
          return;
        }
        setAccessDenied(false);
        setCheckingAccess(false);
        fetchStats();
      } catch (err) {
        console.error('Admin check error:', err);
        setAccessDenied(true);
        setCheckingAccess(false);
        navigate('/');
      }
    };
    checkAdmin();
  }, []);

  useEffect(() => {
    if (checkingAccess || accessDenied) return;
    if (activeTab === 'overview') fetchStats();
  }, [activeTab, checkingAccess, accessDenied, fetchStats]);

  useEffect(() => {
    if (checkingAccess || accessDenied || activeTab !== 'users') return undefined;
    const timer = setTimeout(() => fetchUsers(userSearch), 300);
    return () => clearTimeout(timer);
  }, [activeTab, checkingAccess, accessDenied, fetchUsers, userSearch]);

  useEffect(() => {
    if (checkingAccess || accessDenied || activeTab !== 'rides') return;
    fetchRides(rideStatus);
  }, [activeTab, checkingAccess, accessDenied, rideStatus, fetchRides]);

  useEffect(() => {
    if (checkingAccess || accessDenied || activeTab !== 'bookings') return;
    fetchBookings(bookingStatus);
  }, [activeTab, checkingAccess, accessDenied, bookingStatus, fetchBookings]);

  const statCards = useMemo(() => ([
    { label: 'Total Users', value: stats.totalUsers },
    { label: 'Total Rides', value: stats.totalRides },
    { label: 'Total Bookings', value: stats.totalBookings },
    { label: 'Completed Rides', value: stats.completedRides },
    { label: 'Banned Users', value: stats.bannedUsers },
    { label: 'Verified Users', value: stats.verifiedUsers }
  ]), [stats]);

  const formatDateTime = (iso) => {
    if (!iso) return 'N/A';
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleBan = async (userId) => {
    const reason = window.prompt('Enter ban reason');
    if (reason === null) return;
    try {
      await apiFetch(`/api/admin/users/${userId}/ban`, {
        method: 'PUT',
        body: JSON.stringify({ reason })
      });
      setToast('User banned successfully.');
      fetchUsers(userSearch);
      if (activeTab === 'overview') fetchStats();
    } catch (error) {
      setToast(error.message);
    }
  };

  const handleUnban = async (userId) => {
    try {
      await apiFetch(`/api/admin/users/${userId}/unban`, { method: 'PUT' });
      setToast('User unbanned successfully.');
      fetchUsers(userSearch);
      if (activeTab === 'overview') fetchStats();
    } catch (error) {
      setToast(error.message);
    }
  };

  const handleMakeAdmin = async (userId) => {
    try {
      await apiFetch(`/api/admin/users/${userId}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role: 'admin' })
      });
      setToast('User role updated to admin.');
      fetchUsers(userSearch);
    } catch (error) {
      setToast(error.message);
    }
  };

  const handleDeleteRide = async (rideId) => {
    if (!window.confirm('Are you sure you want to delete this ride and all its bookings?')) return;
    try {
      await apiFetch(`/api/admin/rides/${rideId}`, { method: 'DELETE' });
      setToast('Ride deleted successfully.');
      fetchRides(rideStatus);
      if (activeTab === 'overview') fetchStats();
    } catch (error) {
      setToast(error.message);
    }
  };

  if (checkingAccess) {
    return (
      <div className="ad-page">
        <div className="ad-container">
          <p className="ad-loading">Checking admin access...</p>
        </div>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="ad-page">
        <div className="ad-container">
          <div className="ad-denied-card">
            <h1>Access Denied</h1>
            <p>You must be an admin to view this page. Redirecting to home...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        main.main-content { max-width: 100% !important; width: 100% !important; margin: 0 !important; padding: 0 !important; background: #c2cbd3; }
        .ad-page { min-height: 100vh; background: #c2cbd3; color: #313851; font-family: 'Space Grotesk', sans-serif; padding: 32px 16px; }
        .ad-container { max-width: 1200px; margin: 0 auto; }
        .ad-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 24px; }
        .ad-title { margin: 0; font-size: 38px; font-weight: 800; letter-spacing: -0.02em; color: #313851; }
        .ad-sub { margin: 4px 0 0; color: rgba(49, 56, 81, 0.7); font-size: 16px; font-weight: 500; }
        .ad-tabs { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 20px; }
        .ad-tab { border: 1px solid rgba(49, 56, 81, 0.22); background: rgba(255, 255, 255, 0.35); color: #313851; border-radius: 10px; padding: 9px 14px; font-size: 14px; font-weight: 700; cursor: pointer; }
        .ad-tab.active { background: #313851; color: #fff; border-color: #313851; }
        .ad-panel { border-radius: 14px; border: 1px solid rgba(49, 56, 81, 0.16); background: rgba(255, 255, 255, 0.45); padding: 18px; box-shadow: 0 8px 18px rgba(49, 56, 81, 0.1); }
        .ad-loading { margin: 0; font-size: 16px; font-weight: 600; color: #313851; }
        .ad-denied-card { margin: 80px auto; max-width: 560px; border-radius: 14px; border: 1px solid rgba(220, 38, 38, 0.28); background: rgba(254, 226, 226, 0.7); padding: 24px; text-align: center; }
        .ad-denied-card h1 { margin: 0 0 8px; font-size: 30px; color: #991b1b; }
        .ad-denied-card p { margin: 0; color: #7f1d1d; font-size: 14px; }
        .ad-toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); background: #313851; color: #fff; padding: 12px 24px; border-radius: 12px; font-size: 14px; font-weight: 700; box-shadow: 0 8px 24px rgba(49,56,81,0.35); z-index: 1000; border: 1px solid rgba(255,255,255,0.14); }
        .ad-stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
        .ad-stat-card { background: #313851; color: #fff; border-radius: 12px; padding: 18px; }
        .ad-stat-number { font-size: 38px; font-weight: 800; letter-spacing: -0.02em; line-height: 1; margin: 0 0 8px; }
        .ad-stat-label { margin: 0; font-size: 13px; opacity: 0.9; font-weight: 600; }
        .ad-tools { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin-bottom: 12px; }
        .ad-search { width: 100%; max-width: 320px; border: 1px solid rgba(49,56,81,0.2); border-radius: 9px; padding: 10px 12px; font-size: 14px; background: rgba(255,255,255,0.8); color: #313851; }
        .ad-filter { border: 1px solid rgba(49,56,81,0.22); background: rgba(255,255,255,0.7); color: #313851; border-radius: 999px; padding: 7px 12px; font-size: 12px; font-weight: 700; cursor: pointer; }
        .ad-filter.active { background: #313851; color: #fff; border-color: #313851; }
        .ad-table-wrap { overflow-x: auto; border: 1px solid rgba(49,56,81,0.14); border-radius: 10px; }
        .ad-table { width: 100%; border-collapse: collapse; min-width: 860px; }
        .ad-table th { background: rgba(49,56,81,0.08); color: #313851; text-align: left; font-size: 12px; letter-spacing: 0.03em; text-transform: uppercase; font-weight: 800; padding: 11px 10px; border-bottom: 1px solid rgba(49,56,81,0.16); }
        .ad-table td { padding: 11px 10px; font-size: 13px; color: rgba(49,56,81,0.95); border-bottom: 1px solid rgba(49,56,81,0.1); vertical-align: top; }
        .ad-badge { display: inline-flex; align-items: center; border-radius: 999px; padding: 3px 9px; font-size: 11px; font-weight: 700; }
        .ad-badge.active { color: #166534; background: rgba(22, 163, 74, 0.2); }
        .ad-badge.banned { color: #991b1b; background: rgba(239, 68, 68, 0.2); }
        .ad-row-banned { background: rgba(239, 68, 68, 0.08); }
        .ad-action { border: 0; border-radius: 8px; padding: 6px 9px; font-size: 12px; font-weight: 700; color: #fff; cursor: pointer; margin-right: 6px; margin-bottom: 6px; }
        .ad-action.ban { background: #dc2626; }
        .ad-action.unban { background: #16a34a; }
        .ad-action.admin { background: #6b7280; }
        .ad-action.delete { background: #b91c1c; }
        .ad-muted { color: rgba(49,56,81,0.55); font-size: 12px; }
        @media (max-width: 960px) {
          .ad-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
        @media (max-width: 640px) {
          .ad-title { font-size: 30px; }
          .ad-stats { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="ad-page">
        <div className="ad-container">
          <div className="ad-header">
            <div>
              <h1 className="ad-title">Admin Dashboard</h1>
              <p className="ad-sub">Platform operations and moderation controls</p>
            </div>
          </div>

          <div className="ad-tabs">
            <button className={`ad-tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Overview</button>
            <button className={`ad-tab ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>Users</button>
            <button className={`ad-tab ${activeTab === 'rides' ? 'active' : ''}`} onClick={() => setActiveTab('rides')}>Rides</button>
            <button className={`ad-tab ${activeTab === 'bookings' ? 'active' : ''}`} onClick={() => setActiveTab('bookings')}>Bookings</button>
          </div>

          <div className="ad-panel">
            {activeTab === 'overview' && (
              overviewLoading ? (
                <p className="ad-loading">Loading overview...</p>
              ) : (
                <div className="ad-stats">
                  {statCards.map((item) => (
                    <div key={item.label} className="ad-stat-card">
                      <p className="ad-stat-number">{item.value}</p>
                      <p className="ad-stat-label">{item.label}</p>
                    </div>
                  ))}
                </div>
              )
            )}

            {activeTab === 'users' && (
              <>
                <div className="ad-tools">
                  <input
                    className="ad-search"
                    type="text"
                    placeholder="Search by name or email"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                  />
                </div>
                {usersLoading ? (
                  <p className="ad-loading">Loading users...</p>
                ) : (
                  <div className="ad-table-wrap">
                    <table className="ad-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Role</th>
                          <th>Face Verified</th>
                          <th>Rating</th>
                          <th>Total Rides</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.length === 0 ? (
                          <tr><td colSpan="8">No users found.</td></tr>
                        ) : users.map((user) => (
                          <tr key={user.id} className={user.is_banned ? 'ad-row-banned' : ''}>
                            <td>{user.full_name || 'N/A'}</td>
                            <td>{user.email || 'N/A'}</td>
                            <td>{user.role || 'user'}</td>
                            <td>{user.face_verified ? 'Yes' : 'No'}</td>
                            <td>{user.average_rating ?? 0}</td>
                            <td>{user.total_rides ?? 0}</td>
                            <td>
                              {user.is_banned ? (
                                <span className="ad-badge banned">Banned</span>
                              ) : (
                                <span className="ad-badge active">Active</span>
                              )}
                            </td>
                            <td>
                              {!user.is_banned ? (
                                <button className="ad-action ban" onClick={() => handleBan(user.id)}>Ban</button>
                              ) : (
                                <button className="ad-action unban" onClick={() => handleUnban(user.id)}>Unban</button>
                              )}
                              <button className="ad-action admin" onClick={() => handleMakeAdmin(user.id)}>Make Admin</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {activeTab === 'rides' && (
              <>
                <div className="ad-tools">
                  {['all', 'scheduled', 'completed', 'cancelled'].map((status) => (
                    <button
                      key={status}
                      className={`ad-filter ${rideStatus === status ? 'active' : ''}`}
                      onClick={() => setRideStatus(status)}
                    >
                      {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
                    </button>
                  ))}
                </div>
                {ridesLoading ? (
                  <p className="ad-loading">Loading rides...</p>
                ) : (
                  <div className="ad-table-wrap">
                    <table className="ad-table">
                      <thead>
                        <tr>
                          <th>Route</th>
                          <th>Driver</th>
                          <th>Status</th>
                          <th>Bookings</th>
                          <th>Departure</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rides.length === 0 ? (
                          <tr><td colSpan="6">No rides found.</td></tr>
                        ) : rides.map((ride) => (
                          <tr key={ride.id}>
                            <td>{ride.origin} → {ride.destination}</td>
                            <td>{ride.driver_name || 'N/A'}</td>
                            <td>{ride.status}</td>
                            <td>{ride.booking_count ?? 0}</td>
                            <td>{formatDateTime(ride.departure_time)}</td>
                            <td>
                              <button className="ad-action delete" onClick={() => handleDeleteRide(ride.id)}>Delete</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {activeTab === 'bookings' && (
              <>
                <div className="ad-tools">
                  {['all', 'pending', 'confirmed', 'cancelled'].map((status) => (
                    <button
                      key={status}
                      className={`ad-filter ${bookingStatus === status ? 'active' : ''}`}
                      onClick={() => setBookingStatus(status)}
                    >
                      {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
                    </button>
                  ))}
                </div>
                {bookingsLoading ? (
                  <p className="ad-loading">Loading bookings...</p>
                ) : (
                  <div className="ad-table-wrap">
                    <table className="ad-table">
                      <thead>
                        <tr>
                          <th>Passenger</th>
                          <th>Driver</th>
                          <th>Route</th>
                          <th>Price</th>
                          <th>Status</th>
                          <th>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bookings.length === 0 ? (
                          <tr><td colSpan="6">No bookings found.</td></tr>
                        ) : bookings.map((booking) => (
                          <tr key={booking.id}>
                            <td>{booking.passenger_name || 'N/A'}</td>
                            <td>{booking.driver_name || 'N/A'}</td>
                            <td>{booking.ride ? `${booking.ride.origin} → ${booking.ride.destination}` : 'N/A'}</td>
                            <td>₹{booking.passenger_price ?? booking.driver_price ?? 0}</td>
                            <td>{booking.status}</td>
                            <td>{formatDateTime(booking.created_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        {toast && <div className="ad-toast">{toast}</div>}
      </div>
    </>
  );
}

export default AdminPage;
