const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const auth = require('../middleware/auth');
const mailer = require('../utils/mailer');
const { notifyUser } = require('../utils/notify');
const { getCache, setCache, deleteCache } = require('../utils/cache');
const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://swxocqjjfyfhwacioanc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3eG9jcWpqZnlmaHdhY2lvYW5jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjgwODAyMCwiZXhwIjoyMDg4Mzg0MDIwfQ.RG37CMiXXWd-iauAPYWLOGsn2vPQOmA2neGNdCsvupo'
);

const toLegacyRideStatus = (status) => {
  if (status === 'cancelled') return 'canceled';
  if (status === 'scheduled' || status === 'in_progress') return 'active';
  return status;
};

const tokenizeAddress = (value) => String(value || '')
  .toLowerCase()
  .replace(/[^a-z0-9\s]/g, ' ')
  .split(/\s+/)
  .filter(Boolean);

const hasWordOverlap = (left, right) => {
  const leftWords = new Set(tokenizeAddress(left));
  return tokenizeAddress(right).some((word) => leftWords.has(word));
};

const toDateOnly = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
};

if (typeof mailer.sendRideAlert !== 'function') {
  mailer.sendRideAlert = async (to, { name, origin, destination, departureTime, appLink }) => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error('RESEND_API_KEY is missing');
    const subject = 'A ride matching your alert is available on RastaConnect!';
    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
        <h2 style="margin:0 0 12px">Ride Alert Match Found</h2>
        <p style="margin:0 0 12px">Hi ${name || 'there'}, a new ride matching your alert is now available.</p>
        <p style="margin:0"><strong>From:</strong> ${origin}</p>
        <p style="margin:0"><strong>To:</strong> ${destination}</p>
        <p style="margin:0 0 14px"><strong>Departure:</strong> ${departureTime}</p>
        <p style="margin:0"><a href="${appLink}" style="color:#2563eb">Open RastaConnect and book now</a></p>
      </div>
    `;
    const text = `Hi ${name || 'there'}, a new ride matching your alert is available.\nFrom: ${origin}\nTo: ${destination}\nDeparture: ${departureTime}\nBook now: ${appLink}`;

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'RastaConnect <onboarding@resend.dev>',
        to: [to],
        subject,
        html,
        text
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Resend email failed: ${response.status} ${errorBody}`);
    }

    return response.json();
  };
}

router.get('/', async (req, res) => {
  // Optional auth to check user gender for women_only filtering
  let userGender = null;
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    if (token) {
      const { data: authData } = await supabase.auth.getUser(token);
      if (authData?.user?.id) {
        const { data: userData } = await supabase.from('users').select('gender').eq('id', authData.user.id).maybeSingle();
        userGender = userData?.gender || null;
      }
    }
  }

  const cacheKey = 'rides:all';
  const cached = await getCache(cacheKey);
  if (cached) {
    console.log('Cache HIT for rides:all');
    return res.json(typeof cached === 'string' ? JSON.parse(cached) : cached);
  }
  console.log('Cache MISS for rides:all');

  const { data, error } = await supabase
    .from('rides')
    .select('*, users(full_name, phone, age, gender, talkativeness, music_preference, face_verified), vehicles(*), bookings(*)')
    .eq('status', 'scheduled')
    .gt('departure_time', new Date().toISOString())
    .gt('available_seats', 0);

  if (error) {
    console.error('!!! DATABASE ERROR fetching rides:', error.message);
    return res.status(500).json({ message: 'Database error.', error: error.message });
  }

  const rides = data || [];

  const formattedRides = (rides || [])
    .filter((ride) => {
      // Hide women_only rides from non-female users
      if (ride.women_only && (!userGender || userGender.toLowerCase() !== 'female')) return false;
      return true;
    })
    .map((ride) => {
    const relatedBookings = Array.isArray(ride.bookings) ? ride.bookings : [];
    const hasActiveBooking = relatedBookings.some(
      (booking) => booking.status === 'confirmed' || booking.status === 'active'
    );

    const driverDetails = hasActiveBooking
      ? {
          full_name: ride.users?.full_name || '',
          phone: ride.users?.phone || '',
          age: ride.users?.age ?? '',
          gender: ride.users?.gender ?? '',
          talkativeness: ride.users?.talkativeness ?? '',
          music_preference: ride.users?.music_preference ?? '',
          face_verified: Boolean(ride.users?.face_verified),
        }
      : null;

    const vehicleDetails = hasActiveBooking
      ? {
          make: ride.vehicles?.make || '',
          model: ride.vehicles?.model || '',
          color: ride.vehicles?.color || '',
          plate_number: ride.vehicles?.plate_number || '',
          capacity: ride.vehicles?.capacity ?? null,
        }
      : null;

    return {
      id: ride.id,
      origin: ride.pickup_address,
      destination: ride.dropoff_address,
      departureTime: ride.departure_time,
      availableSeats: ride.available_seats,
      price: ride.price,
      status: toLegacyRideStatus(ride.status),
      driverName: hasActiveBooking ? (ride.users?.full_name || 'Driver') : 'Driver',
      driverFaceVerified: Boolean(ride.users?.face_verified),
      vehicleId: ride.vehicle_id,
      womenOnly: Boolean(ride.women_only),
      driver: driverDetails,
      vehicle: vehicleDetails,
    };
  });

  const ridesResponse = { rides: formattedRides };
  await setCache(cacheKey, JSON.stringify(ridesResponse), 60);
  return res.json(ridesResponse);
});

router.post('/', auth, async (req, res) => {
  const driverId = req.user.id;
  const { origin, destination, departureTime, availableSeats, vehicleId, women_only } = req.body;
  if (!vehicleId) { return res.status(400).json({ message: 'Please select a vehicle for the ride.' }); }

  const { data, error } = await supabase
    .from('rides')
    .insert([{
      user_id: driverId,
      vehicle_id: vehicleId,
      pickup_address: origin,
      dropoff_address: destination,
      departure_time: departureTime,
      available_seats: Number(availableSeats),
      price: 0,
      status: 'scheduled',
      women_only: Boolean(women_only),
    }])
    .select('id')
    .single();

  if (error) { return res.status(500).json({ message: 'Database error.', error: error.message }); }
  await deleteCache('rides:all');

  try {
    const { data: alerts, error: alertsError } = await supabase
      .from('ride_alerts')
      .select('id, user_id, origin, destination, travel_date, is_active')
      .eq('is_active', true);

    if (alertsError) throw alertsError;

    const rideDate = toDateOnly(departureTime);
    for (const alert of alerts || []) {
      try {
        const originMatches = hasWordOverlap(alert.origin, origin);
        const destinationMatches = hasWordOverlap(alert.destination, destination);
        if (!originMatches || !destinationMatches) continue;

        const alertDate = toDateOnly(alert.travel_date);
        if (alertDate && rideDate !== alertDate) continue;

        const { data: alertUser, error: userError } = await supabase
          .from('users')
          .select('full_name, email')
          .eq('id', alert.user_id)
          .maybeSingle();

        if (userError || !alertUser?.email) continue;

        await mailer.sendRideAlert(alertUser.email, {
          name: alertUser.full_name || 'there',
          origin,
          destination,
          departureTime,
          appLink: process.env.FRONTEND_URL || 'http://localhost:5173'
        });

        await supabase
          .from('ride_alerts')
          .update({ is_active: false })
          .eq('id', alert.id);
      } catch (singleAlertError) {
        console.error('Single alert processing error (non-blocking):', singleAlertError.message);
      }
    }
  } catch (alertError) {
    console.error('Ride alert matching error (non-blocking):', alertError.message);
  }

  return res.status(201).json({ message: 'Ride offered successfully!', rideId: data.id });
});

router.get('/:rideId/suggested-price', async (req, res) => {
  const rideId = req.params.rideId;
  const { data: ride, error: rideError } = await supabase
    .from('rides')
    .select('pickup_address, dropoff_address, departure_time, available_seats, user_id, status')
    .eq('id', rideId)
    .maybeSingle();

  if (rideError) return res.status(500).json({ message: 'Database error fetching ride.', error: rideError.message });
  if (!ride || ride.status !== 'scheduled') return res.status(404).json({ message: 'Ride not found or is no longer active.' });

  const { data: driver, error: driverError } = await supabase
    .from('users')
    .select('average_rating')
    .eq('id', ride.user_id)
    .maybeSingle();

  if (driverError) return res.status(500).json({ message: 'Database error fetching driver rating.', error: driverError.message });

  const origin = (ride.pickup_address || '').toLowerCase();
  const destination = (ride.dropoff_address || '').toLowerCase();
  const wordList = (text) => text.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
  const originWords = new Set(wordList(origin));
  const hasSameAreaWord = wordList(destination).some((word) => originWords.has(word));

  const farSuburbKeywords = [
    'gurugram', 'gurgaon', 'noida', 'greater noida', 'faridabad', 'ghaziabad',
    'navi mumbai', 'thane', 'kalyan', 'vasai', 'virar', 'whitefield',
    'electronic city', 'rajarhat', 'new town'
  ];
  const cityCenterKeywords = [
    'connaught place', 'cp', 'city center', 'city centre', 'downtown',
    'central', 'cbd', 'mg road', 'park street', 'churchgate', 'fort', 'bkc'
  ];
  const hasFarSuburb = farSuburbKeywords.some((keyword) => origin.includes(keyword) || destination.includes(keyword));
  const hasCityCenter = cityCenterKeywords.some((keyword) => origin.includes(keyword) || destination.includes(keyword));

  let base = 150;
  if (hasFarSuburb && hasCityCenter) {
    base = 250;
  } else if (hasSameAreaWord) {
    base = 80;
  }

  const departureDate = new Date(ride.departure_time);
  const departureHour = Number.isNaN(departureDate.getTime()) ? null : departureDate.getHours();
  let timeMultiplier = 1.00;
  if (departureHour !== null) {
    if ((departureHour >= 7 && departureHour < 10) || (departureHour >= 17 && departureHour < 21)) {
      timeMultiplier = 1.15;
    } else if (departureHour >= 22 || departureHour < 5) {
      timeMultiplier = 0.90;
    }
  }

  const seatsLeft = Number(ride.available_seats);
  let scarcityMultiplier = 1.00;
  if (seatsLeft === 1) {
    scarcityMultiplier = 1.20;
  } else if (seatsLeft === 2) {
    scarcityMultiplier = 1.10;
  }

  const rating = Number(driver?.average_rating);
  let reputationMultiplier = 1.00;
  if (!Number.isNaN(rating)) {
    if (rating >= 4.5) reputationMultiplier = 1.10;
    else if (rating >= 4.0) reputationMultiplier = 1.05;
  }

  const suggestedPriceRaw = base * timeMultiplier * scarcityMultiplier * reputationMultiplier;
  const suggestedPrice = Math.round(suggestedPriceRaw / 5) * 5;
  const passengerOfferPrice = Math.max(10, Math.round((suggestedPriceRaw * 0.80) / 5) * 5);

  return res.status(200).json({
    suggestedPrice,
    passengerOfferPrice,
    breakdown: {
      base,
      timeMultiplier,
      scarcityMultiplier,
      reputationMultiplier,
      discountApplied: '20%'
    }
  });
});

router.delete('/:rideId', auth, async (req, res) => {
  const rideId = req.params.rideId;
  const driverId = req.user.id;

  const { data: ride, error: checkError } = await supabase
    .from('rides')
    .select('user_id')
    .eq('id', rideId)
    .maybeSingle();

  if (checkError || !ride || ride.user_id !== driverId) {
    return res.status(403).json({ message: 'Forbidden: You are not the driver of this ride.' });
  }

  const { error: updateRideError } = await supabase
    .from('rides')
    .update({ status: 'cancelled' })
    .eq('id', rideId);

  if (updateRideError) {
    return res.status(500).json({ message: 'Failed to cancel ride.' });
  }
  await deleteCache('rides:all');

  const { error: updateBookingsError } = await supabase
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('ride_id', rideId);

  if (updateBookingsError) {
    return res.status(500).json({ message: 'Failed to cancel associated bookings.' });
  }

  // Notify all booked passengers about ride cancellation
  try {
    const { data: rideInfo } = await supabase.from('rides').select('pickup_address, dropoff_address, departure_time').eq('id', rideId).maybeSingle();
    const { data: bookings } = await supabase.from('bookings').select('user_id').eq('ride_id', rideId);
    if (bookings && bookings.length > 0) {
      const passengerIds = [...new Set(bookings.map(b => b.user_id))];
      const { data: passengers } = await supabase.from('users').select('email, full_name').in('id', passengerIds);
      if (passengers) {
        for (const p of passengers) {
          if (p.email) {
            mailer.sendRideCancellationToPassenger(p.email, {
              passengerName: p.full_name || 'Passenger',
              origin: rideInfo?.pickup_address || '',
              destination: rideInfo?.dropoff_address || '',
              departureTime: rideInfo?.departure_time || ''
            }).catch(e => console.error('Ride cancellation email error:', e.message));
          }
        }
      }
    }
  } catch (emailErr) {
    console.error('Email send error (non-blocking):', emailErr.message);
  }

  // Push notifications to affected passengers
  try {
    const { data: rPush } = await supabase.from('rides').select('pickup_address, dropoff_address').eq('id', rideId).maybeSingle();
    const { data: bkPush } = await supabase.from('bookings').select('user_id').eq('ride_id', rideId);
    if (bkPush && bkPush.length > 0) {
      const pIds = [...new Set(bkPush.map(b => b.user_id))];
      for (const pid of pIds) {
        notifyUser(supabase, pid, 'Ride Cancelled \u274C', `Your ride from ${rPush?.pickup_address || 'origin'} to ${rPush?.dropoff_address || 'destination'} was cancelled by the driver`);
      }
    }
  } catch (pushErr) {
    console.error('Push notification error (non-blocking):', pushErr.message);
  }

  return res.status(200).json({ message: 'Ride and all associated bookings have been canceled.' });
});

router.post('/:rideId/book', auth, async (req, res) => {
  const rideId = req.params.rideId;
  const passengerId = req.user.id;
  const { pickup_location, drop_location, passenger_price } = req.body;

  const { data: ride, error: checkRideError } = await supabase
    .from('rides')
    .select('available_seats, user_id, status, price, women_only, departure_time')
    .eq('id', rideId)
    .maybeSingle();

  if (checkRideError) return res.status(500).json({ message: 'Database error checking ride.' });
  if (!ride || ride.status !== 'scheduled') return res.status(404).json({ message: 'Ride not found or is no longer active.' });
  if (ride.user_id === passengerId) return res.status(400).json({ message: 'You cannot book your own ride.' });

  // Women-only ride check
  if (ride.women_only) {
    const { data: passengerUser } = await supabase.from('users').select('gender').eq('id', passengerId).maybeSingle();
    if (!passengerUser || passengerUser.gender?.toLowerCase() !== 'female') {
      return res.status(403).json({ message: 'This ride is for female passengers only.' });
    }
  }

  const offeredPrice = Number(passenger_price);
  const status = 'pending';
  const newRideDepartureMs = new Date(ride.departure_time).getTime();

  const { data: confirmedBookings, error: confirmedBookingsError } = await supabase
    .from('bookings')
    .select('ride_id')
    .eq('user_id', passengerId)
    .eq('status', 'confirmed');

  if (confirmedBookingsError) return res.status(500).json({ message: 'Database error checking booking conflicts.' });

  for (const existingBooking of confirmedBookings || []) {
    const { data: existingRide, error: existingRideError } = await supabase
      .from('rides')
      .select('departure_time, status')
      .eq('id', existingBooking.ride_id)
      .maybeSingle();

    if (existingRideError) return res.status(500).json({ message: 'Database error checking booking conflicts.' });
    if (!existingRide || existingRide.status !== 'scheduled') continue;

    const existingRideDepartureMs = new Date(existingRide.departure_time).getTime();
    if (
      !Number.isNaN(newRideDepartureMs) &&
      !Number.isNaN(existingRideDepartureMs) &&
      Math.abs(existingRideDepartureMs - newRideDepartureMs) <= 7200000
    ) {
      return res.status(400).json({
        message: 'You already have a confirmed booking around this time. Please cancel it before booking another ride.'
      });
    }
  }

  const { data: freshRide, error: freshRideError } = await supabase
    .from('rides')
    .select('available_seats')
    .eq('id', rideId)
    .maybeSingle();

  if (freshRideError) return res.status(500).json({ message: 'Database error checking ride seats.' });
  if (!freshRide || freshRide.available_seats < 1) {
    return res.status(400).json({ message: 'Sorry, this ride is fully booked.' });
  }

  const { data: booking, error: insertBookingError } = await supabase
    .from('bookings')
    .insert([{
      ride_id: rideId,
      user_id: passengerId,
      seats: 1,
      status,
      pickup_location: pickup_location || '',
      drop_location: drop_location || '',
      passenger_price: offeredPrice,
      driver_price: offeredPrice
    }])
    .select('id')
    .single();

  if (insertBookingError) {
    return res.status(500).json({ message: 'Failed to create booking.' });
  }

  if (status === 'confirmed') {
    const { error: updateRideError } = await supabase
      .from('rides')
      .update({ available_seats: freshRide.available_seats - 1 })
      .eq('id', rideId)
      .eq('available_seats', freshRide.available_seats);

    if (updateRideError) {
      await supabase.from('bookings').delete().eq('id', booking.id);
      return res.status(500).json({ message: 'Failed to update ride seats.' });
    }

    const { data: updatedRide, error: updatedRideError } = await supabase
      .from('rides')
      .select('available_seats')
      .eq('id', rideId)
      .maybeSingle();

    if (updatedRideError) {
      await supabase.from('bookings').delete().eq('id', booking.id);
      return res.status(500).json({ message: 'Failed to verify ride seats.' });
    }

    if (!updatedRide || updatedRide.available_seats === freshRide.available_seats) {
      await supabase.from('bookings').delete().eq('id', booking.id);
      return res.status(400).json({ message: 'Sorry, this ride just got fully booked. Please try again.' });
    }

    await deleteCache('rides:all');
  }

  // Send transactional emails (never block the response)
  try {
    const { data: passenger } = await supabase.from('users').select('email, full_name').eq('id', passengerId).maybeSingle();
    const { data: driver } = await supabase.from('users').select('email, full_name').eq('id', ride.user_id).maybeSingle();
    const { data: rideDetails } = await supabase.from('rides').select('pickup_address, dropoff_address, departure_time, vehicles(make, model, plate_number)').eq('id', rideId).maybeSingle();

    if (status === 'confirmed') {
      if (passenger?.email) {
        mailer.sendBookingConfirmation(passenger.email, {
          passengerName: passenger.full_name || 'Passenger',
          driverName: driver?.full_name || 'Driver',
          origin: rideDetails?.pickup_address || '',
          destination: rideDetails?.dropoff_address || '',
          departureTime: rideDetails?.departure_time || '',
          vehicleMake: rideDetails?.vehicles?.make || '',
          vehicleModel: rideDetails?.vehicles?.model || '',
          vehiclePlate: rideDetails?.vehicles?.plate_number || '',
          price: offeredPrice
        }).catch(e => console.error('Booking confirmation email error:', e.message));
      }
      if (driver?.email) {
        mailer.sendDriverBookingAlert(driver.email, {
          driverName: driver.full_name || 'Driver',
          passengerName: passenger?.full_name || 'Passenger',
          origin: rideDetails?.pickup_address || '',
          destination: rideDetails?.dropoff_address || '',
          departureTime: rideDetails?.departure_time || '',
          passengerPrice: offeredPrice,
          pickup: pickup_location || '',
          drop: drop_location || ''
        }).catch(e => console.error('Driver alert email error:', e.message));
      }
    } else {
      // Pending booking — only alert the driver
      if (driver?.email) {
        mailer.sendDriverBookingAlert(driver.email, {
          driverName: driver.full_name || 'Driver',
          passengerName: passenger?.full_name || 'Passenger',
          origin: rideDetails?.pickup_address || '',
          destination: rideDetails?.dropoff_address || '',
          departureTime: rideDetails?.departure_time || '',
          passengerPrice: offeredPrice,
          pickup: pickup_location || '',
          drop: drop_location || ''
        }).catch(e => console.error('Driver alert email error:', e.message));
      }
    }
  } catch (emailErr) {
    console.error('Email send error (non-blocking):', emailErr.message);
  }

  // Push notifications (never block the response)
  try {
    const { data: pUser } = await supabase.from('users').select('full_name').eq('id', passengerId).maybeSingle();
    const { data: rInfo } = await supabase.from('rides').select('pickup_address, dropoff_address').eq('id', rideId).maybeSingle();
    const pName = pUser?.full_name || 'A passenger';
    const orig = rInfo?.pickup_address || 'origin';
    const dest = rInfo?.dropoff_address || 'destination';
    if (status === 'confirmed') {
      notifyUser(supabase, ride.user_id, 'New Booking Confirmed \uD83C\uDF89', `${pName} booked your ride from ${orig} to ${dest}`);
    } else {
      notifyUser(supabase, ride.user_id, 'New Booking Request \uD83D\uDD14', `${pName} wants to join your ride — review and confirm`);
    }
  } catch (pushErr) {
    console.error('Push notification error (non-blocking):', pushErr.message);
  }

  return res.status(201).json({
    message: status === 'confirmed' ? 'Ride booked successfully!' : 'Booking request sent! Waiting for driver confirmation.',
    bookingId: booking.id,
    status
  });
});

// PUT - Complete a ride (driver only)
router.put('/:rideId/complete', auth, async (req, res) => {
  try {
    const rideId = req.params.rideId;
    const driverId = req.user.id;

    const { data: ride, error } = await supabase
      .from('rides')
      .select('user_id, status')
      .eq('id', rideId)
      .maybeSingle();

    if (error || !ride) return res.status(404).json({ message: 'Ride not found.' });
    if (ride.user_id !== driverId) return res.status(403).json({ message: 'Forbidden.' });
    if (ride.status === 'completed') return res.status(400).json({ message: 'Ride already completed.' });

    await supabase.from('rides').update({ status: 'completed' }).eq('id', rideId);
    await deleteCache('rides:all');

    // Update driver total_rides count
    const { data: driverData } = await supabase
      .from('users')
      .select('total_rides')
      .eq('id', driverId)
      .maybeSingle();

    await supabase
      .from('users')
      .update({ total_rides: (driverData?.total_rides || 0) + 1 })
      .eq('id', driverId);

    return res.status(200).json({ message: 'Ride marked as completed.' });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});
module.exports = router;
