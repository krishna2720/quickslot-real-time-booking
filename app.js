const roasterUrl="https://jsonplaceholder.typicode.com/users?_limit=10";
const clockUrl="https://corsproxy.io/?https://worldtimeapi.org/api/timezone/Asia/Kolkata";  
const providerSelect=document.getElementById("providerSelect");
const dateInput=document.getElementById("dateInput");
const loadSlotsBtn=document.getElementById("loadSlotsBtn");
const refreshBtn=document.getElementById("refreshBtn");
const slotsGrid=document.getElementById("slotsGrid");
const slotsHeadline = document.getElementById("slotsHeadline");
const slotMeta = document.getElementById("slotMeta");
const bookingsList = document.getElementById("bookingsList");
const clearBookingsBtn = document.getElementById("clearBookingsBtn");
const statProviders = document.getElementById("statProviders");
const statBookings = document.getElementById("statBookings");
const statClock = document.getElementById("statClock");
const lastSync = document.getElementById("lastSync");

const confirmModal = new bootstrap.Modal(
  document.getElementById("confirmModal")
);
const confirmTitle = document.getElementById("confirmTitle");
const confirmMeta = document.getElementById("confirmMeta");
const confirmBtn = document.getElementById("confirmBtn");
const notesInput = document.getElementById("notesInput");

const state={
    providers:[],
    nowUtc:null,
    target:null,   
    bookings:[],
    pendingSlot:null
}
//limit of local storage is 5mb and session storage is 5mb.
function saveBookings(){
    localStorage.setItem("quickslots-bookings",JSON.stringify(state.bookings));
     statBookings.textContent = state.bookings.length;
}
function readBookings(){
    state.bookings=JSON.parse(
    localStorage.getItem("quickslots-bookings") || "[]" );

}

//API calling si done here for 10 provider name..
async function fetchProviders() {
  providerSelect.disabled = true;
  providerSelect.innerHTML = `<option>Loading roster…</option>`;

  try {
    const res = await fetch(roasterUrl);
    const data = await res.json(); //convert data to json

    // Map API data to simple provider objects1
    state.providers = data.map((person) => ({
      id: person.id,
      name: person.name,
      specialty: person.company?.bs || "Generalist",
      city: person.address?.city || "Remote",
    }));

    statProviders.textContent = state.providers.length;
    renderProviderSelect();
  } catch (err) {
    providerSelect.innerHTML = `<option>Error loading providers</option>`;
    console.error(err);
  }
}
// fetchProviders();

function renderProviderSelect() {
  providerSelect.disabled = false;
  providerSelect.innerHTML = `<option value="">Select provider</option>`;

  // Create <option> for each provider
  state.providers.forEach((p) => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = `${p.name} — ${p.specialty}`;
    providerSelect.appendChild(opt);
  });
}
//api for time ..so thats time can come ..   
async function syncClock() {
  try {
    const res = await fetch(clockUrl);
    const data = await res.json();

    // Convert string date to JS Date()
    state.nowUtc = new Date(data.datetime);

    // Show time on UI
    statClock.textContent = state.nowUtc.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    lastSync.textContent = `Last synced ${new Date().toLocaleTimeString(
      "en-IN"
    )}`;
  } catch (err) {
    // fallback when time API fails
    console.warn("Clock sync failed, falling back to client time", err);

    state.nowUtc = new Date(); // local time
    statClock.textContent = state.nowUtc.toLocaleTimeString("en-IN");
    lastSync.textContent = `Fallback to client ${new Date().toLocaleTimeString(
      "en-IN"
    )}`;
  }
}
syncClock();

//fucntion so that we can avoid the slot which user wanted at time which has gone already i.e. previous time .. 
function setMinDate() {
  const today = new Date().toISOString().split("T")[0]; // yyyy-mm-dd
  dateInput.min = today;
  dateInput.value = today;
}

//building the slots of 9-5 with half hour break . 
function buildSlots(date) {
  const slots = [];

  for (let hour = 9; hour <= 17; hour++) {
    ["00", "30"].forEach((minute) => {
      const label = `${String(hour).padStart(2, "0")}:${minute}`; // 09:00, 09:30, etc.
      slots.push(label);
    });
  }
 // Convert each slot into an object with "disabled" flag
  return slots.map((label) => ({
    label,
    disabled: isSlotDisabled(date, label),
  }));
}

//current time se less hai then disabled that slot .
function isSlotDisabled(date, slotLabel) {
  // Convert slot + date → JS Date()
  const targetDate = new Date(`${date}T${slotLabel}:00+05:30`);
  const now = state.nowUtc || new Date();

  // Rule 1: cannot book past times
  if (targetDate < now) return true;

  // Rule 2: cannot book already-booked slot for same provider
  const alreadyBooked = state.bookings.some(
    (item) =>
      item.date === date &&
      item.slot === slotLabel &&
      item.providerId === state.target?.providerId
  );

  return alreadyBooked;
}

//12 column grid system i.e. bootstrap used so that slot can be put into it..  
function renderSlots(providerId, date) {
  const provider = state.providers.find((p) => p.id === Number(providerId));

  // If no provider or date selected → show placeholder
  if (!provider || !date) {
    slotsGrid.innerHTML = `<div class="col-12 text-center text-secondary">Select a provider and date to view availability.</div>`;
    return;
  }

  // Save current selection in global state
  state.target = { providerId: provider.id, providerName: provider.name, date };
  
  // Update header info
  slotsHeadline.textContent = `Slots for ${provider.name}`;
  slotMeta.textContent = `${new Date(
    date
  ).toDateString()} • refreshed ${new Date().toLocaleTimeString("en-IN")}`;

  const slots = buildSlots(date);

  slotsGrid.innerHTML = "";

  // Render each slot as a card
  slots.forEach((slot) => {
    const col = document.createElement("div");
    col.className = "col-6 col-xl-4";

    const card = document.createElement("div");
    card.className = `slot-card h-100 ${slot.disabled ? "disabled" : ""}`;
    card.innerHTML = `
      <div class="fw-semibold">${slot.label}</div>
      <div class="small text-secondary">${
        slot.disabled ? "Unavailable" : "Tap to book"
      }</div>
    `;

    // When available → clicking opens modal
    if (!slot.disabled) {
      card.onclick = () => openModal(provider, date, slot.label);
    }

    col.appendChild(card);
    slotsGrid.appendChild(col);
  });
}

//opening modal by clicking on the prefered slots on particular time .
function openModal(provider, date, slotLabel) {
  state.pendingSlot = { provider, date, slotLabel };

  confirmTitle.textContent = provider.name;
  confirmMeta.textContent = `${date} · ${slotLabel} IST`;
  notesInput.value = "";

  confirmModal.show(); //show the modal in ui 
}


confirmBtn.addEventListener("click", () => {
  if (!state.pendingSlot) return; // safety check
 
  const payload = {
    id: crypto.randomUUID(), // unique booking id
    providerId: state.pendingSlot.provider.id,
    provider: state.pendingSlot.provider.name,
    specialty: state.pendingSlot.provider.specialty,
    date: state.pendingSlot.date,
    slot: state.pendingSlot.slotLabel,
    notes: notesInput.value.trim(),
  };

  state.bookings.push(payload);

  saveBookings(); // persist
  renderSlots(state.pendingSlot.provider.id, state.pendingSlot.date);
  renderBookings();
  sendConfirmationEmail(payload); // optional API
  confirmModal.hide();
});

function renderBookings() {
  bookingsList.innerHTML = "";

  // Empty state message
  if (!state.bookings.length) {
    bookingsList.innerHTML = `<div class="text-secondary small">No bookings yet.</div>`;
    return;
  }

  // Sort by date+time for clean ordering
  state.bookings
    .slice()
    .sort((a, b) => `${a.date}${a.slot}`.localeCompare(`${b.date}${b.slot}`))
    .forEach((booking) => {
      const card = document.createElement("div");
      card.className = "booking-card";

      card.innerHTML = `
        <div class="d-flex justify-content-between align-items-start gap-3">
          <div>
            <div class="fw-semibold">${booking.provider}</div>
            <div class="small text-secondary">${booking.date} · ${
        booking.slot
      }</div>
            <div class="small text-muted">${booking.notes || "No notes"}</div>
          </div>

          <button class="btn btn-sm btn-outline-danger" data-id="${booking.id}">
            <i class="bi bi-x"></i>
          </button>
        </div>
      `;

      // Remove booking on click
      card.querySelector("button").onclick = () => cancelBooking(booking.id);

      bookingsList.appendChild(card);
    });
}

function cancelBooking(id) {
  state.bookings = state.bookings.filter((booking) => booking.id !== id);
  saveBookings();
  renderBookings();
  if (state.target) {
    renderSlots(state.target.providerId, state.target.date);
  }
}
//if we want to clear all bookings through clearAll booking button .
clearBookingsBtn.addEventListener("click", () => {
  if (!state.bookings.length) return;
  if (confirm("Clear all stored bookings?")) {
    state.bookings = [];
    saveBookings();
    renderBookings();
    if (state.target) renderSlots(state.target.providerId, state.target.date);
  }
});
//if we dont select the Provider name then eror will be show 
loadSlotsBtn.addEventListener("click", async () => {
  const providerId = providerSelect.value;
  const date = dateInput.value;

  if (!providerId || !date) {
    alert("Please Select provider and date ");
    return;
  }

  await syncClock(); // ensure time accuracy
  renderSlots(providerId, date);
});

refreshBtn.addEventListener("click", async () => {
  await syncClock();
  if (state.target) renderSlots(state.target.providerId, state.target.date);
});
//initialise the function .. 
async function init() {
  readBookings();
  statBookings.textContent = state.bookings.length;
  setMinDate(); // prevent selecting past dates
  // Load providers + sync clock in parallel
  await Promise.all([fetchProviders(), syncClock()]);
  renderBookings();
}
document.addEventListener("DOMContentLoaded", init);


//u have to add a mail function or it can a dummy
// add a login and signup page ui so user can login then book slot


