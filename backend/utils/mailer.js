const nodemailer = require('nodemailer');

function getTransporter() {
  require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
  const apiKey = process.env.RESEND_API_KEY;
  return nodemailer.createTransport({
    host: 'smtp.resend.com',
    port: 465,
    secure: true,
    auth: {
      user: 'resend',
      pass: apiKey
    }
  });
}

const FROM = 'RastaConnect <onboarding@resend.dev>';

function wrap(title, body) {
  return {
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#c2cbd3;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#c2cbd3;padding:32px 0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(49,56,81,0.12)">
        <tr>
          <td style="background:#313851;padding:28px 32px;text-align:center">
            <h1 style="margin:0;font-size:26px;font-weight:700;color:#ffffff;letter-spacing:-0.02em">RastaConnect</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px">
            <h2 style="margin:0 0 20px;font-size:20px;font-weight:700;color:#313851">${title}</h2>
            ${body}
          </td>
        </tr>
        <tr>
          <td style="background:#f8f9fa;padding:20px 32px;text-align:center;border-top:1px solid rgba(49,56,81,0.08)">
            <p style="margin:0;font-size:12px;color:rgba(49,56,81,0.5)">© ${new Date().getFullYear()} RastaConnect. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    text: `${title}\n\n${body.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()}`
  };
}

function row(label, value) {
  return `
    <tr>
      <td style="padding:8px 12px;font-size:14px;color:rgba(49,56,81,0.6);font-weight:600;white-space:nowrap">${label}</td>
      <td style="padding:8px 12px;font-size:14px;color:#313851;font-weight:700">${value}</td>
    </tr>`;
}

function detailsTable(rows) {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(49,56,81,0.04);border-radius:8px;border:1px solid rgba(49,56,81,0.08);margin:16px 0">${rows}</table>`;
}

async function sendBookingConfirmation(to, { passengerName, driverName, origin, destination, departureTime, vehicleMake, vehicleModel, vehiclePlate, price }) {
  const body = `
    <p style="margin:0 0 16px;font-size:15px;color:#313851;line-height:1.6">Hi <strong>${passengerName}</strong>,</p>
    <p style="margin:0 0 16px;font-size:15px;color:#313851;line-height:1.6">Your booking has been <span style="color:#16a34a;font-weight:700">confirmed</span>! Here are your ride details:</p>
    ${detailsTable(
      row('Driver', driverName) +
      row('From', origin) +
      row('To', destination) +
      row('Departure', departureTime) +
      row('Vehicle', `${vehicleMake} ${vehicleModel}`) +
      row('Plate', vehiclePlate) +
      row('Price', `₹${price}`)
    )}
    <p style="margin:16px 0 0;font-size:14px;color:rgba(49,56,81,0.6);line-height:1.5">Have a safe and pleasant ride! 🚗</p>`;

  const { html, text } = wrap('Booking Confirmed ✅', body);
  return getTransporter().sendMail({ from: FROM, to, subject: 'Your RastaConnect Booking is Confirmed!', html, text });
}

async function sendBookingCancellation(to, { passengerName, origin, destination, departureTime }) {
  const body = `
    <p style="margin:0 0 16px;font-size:15px;color:#313851;line-height:1.6">Hi <strong>${passengerName}</strong>,</p>
    <p style="margin:0 0 16px;font-size:15px;color:#313851;line-height:1.6">Your booking has been <span style="color:#dc2626;font-weight:700">cancelled</span>.</p>
    ${detailsTable(
      row('From', origin) +
      row('To', destination) +
      row('Departure', departureTime)
    )}
    <p style="margin:16px 0 0;font-size:14px;color:rgba(49,56,81,0.6);line-height:1.5">You can browse and book another ride anytime on RastaConnect.</p>`;

  const { html, text } = wrap('Booking Cancelled', body);
  return getTransporter().sendMail({ from: FROM, to, subject: 'Your RastaConnect Booking Has Been Cancelled', html, text });
}

async function sendDriverBookingAlert(to, { driverName, passengerName, origin, destination, departureTime, passengerPrice, pickup, drop }) {
  const body = `
    <p style="margin:0 0 16px;font-size:15px;color:#313851;line-height:1.6">Hi <strong>${driverName}</strong>,</p>
    <p style="margin:0 0 16px;font-size:15px;color:#313851;line-height:1.6">You have a <span style="color:#2563eb;font-weight:700">new booking request</span> from <strong>${passengerName}</strong>!</p>
    ${detailsTable(
      row('Passenger', passengerName) +
      row('From', origin) +
      row('To', destination) +
      row('Pickup', pickup || origin) +
      row('Drop', drop || destination) +
      row('Departure', departureTime) +
      row('Fare', `₹${passengerPrice}`)
    )}
    <p style="margin:16px 0 0;font-size:14px;color:rgba(49,56,81,0.6);line-height:1.5">Log in to RastaConnect to confirm or manage this booking.</p>`;

  const { html, text } = wrap('New Booking Alert 🔔', body);
  return getTransporter().sendMail({ from: FROM, to, subject: `New Booking from ${passengerName} — RastaConnect`, html, text });
}

async function sendOTP(to, { name, otp }) {
  const body = `
    <p style="margin:0 0 16px;font-size:15px;color:#313851;line-height:1.6">Hi <strong>${name || 'there'}</strong>,</p>
    <p style="margin:0 0 20px;font-size:15px;color:#313851;line-height:1.6">Use the following code to verify your phone number:</p>
    <div style="text-align:center;margin:24px 0">
      <span style="display:inline-block;background:#313851;color:#ffffff;font-size:32px;font-weight:700;letter-spacing:8px;padding:16px 32px;border-radius:10px">${otp}</span>
    </div>
    <p style="margin:16px 0 0;font-size:13px;color:rgba(49,56,81,0.5);line-height:1.5;text-align:center">This code expires in 10 minutes. Do not share it with anyone.</p>`;

  const { html, text } = wrap('Your Verification Code', body);
  return getTransporter().sendMail({ from: FROM, to, subject: 'Your RastaConnect Verification Code', html, text });
}

async function sendRideAlert(to, { name, origin, destination, departureTime }) {
  const body = `
    <p style="margin:0 0 16px;font-size:15px;color:#313851;line-height:1.6">Hi <strong>${name || 'there'}</strong>, good news! A ride matching your saved alert has just been posted on RastaConnect.</p>
    ${detailsTable(
      row('From', origin) +
      row('To', destination) +
      row('Departure', departureTime)
    )}
    <p style="margin:16px 0 0;font-size:14px;color:rgba(49,56,81,0.6);line-height:1.5">Log in to RastaConnect now to book before seats fill up!</p>`;

  const { html, text } = wrap('Ride Alert', body);
  return getTransporter().sendMail({ from: FROM, to, subject: 'Ride Alert: A matching ride is now available!', html, text });
}

async function sendRideCancellationToPassenger(to, { passengerName, origin, destination, departureTime }) {
  const body = `
    <p style="margin:0 0 16px;font-size:15px;color:#313851;line-height:1.6">Hi <strong>${passengerName}</strong>,</p>
    <p style="margin:0 0 16px;font-size:15px;color:#313851;line-height:1.6">Unfortunately, the driver has <span style="color:#dc2626;font-weight:700">cancelled the ride</span> you were booked on.</p>
    ${detailsTable(
      row('From', origin) +
      row('To', destination) +
      row('Departure', departureTime)
    )}
    <p style="margin:16px 0 0;font-size:14px;color:rgba(49,56,81,0.6);line-height:1.5">We're sorry for the inconvenience. You can search for alternative rides on RastaConnect.</p>`;

  const { html, text } = wrap('Ride Cancelled by Driver', body);
  return getTransporter().sendMail({ from: FROM, to, subject: 'Your RastaConnect Ride Has Been Cancelled', html, text });
}

module.exports = {
  sendBookingConfirmation,
  sendBookingCancellation,
  sendDriverBookingAlert,
  sendOTP,
  sendRideAlert,
  sendRideCancellationToPassenger
};
