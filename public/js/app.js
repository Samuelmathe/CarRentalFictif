(() => {
  const API_CARS = '/api/cars';

  /** Instance calendrier réservation (Flatpickr) */
  let resFlatpickr = null;

  /** @type {{ id: number, email: string, display_name: string, role: string } | null} */
  let currentUser = null;

  /** @type {Array<Record<string, unknown>>} */
  let sourceCars = [];
  let workingCopy = [];

  const els = {
    grid: document.getElementById('voituresGrid'),
    catalogStatus: document.getElementById('catalogStatus'),
    tri: document.getElementById('tri'),
    recherche: document.getElementById('recherche'),
    prixMin: document.getElementById('prix_min'),
    prixMax: document.getElementById('prix_max'),
    kmMin: document.getElementById('kilometre_min'),
    kmMax: document.getElementById('kilometre_max'),
    capacite: document.getElementById('capacite'),
    filtreMarque: document.getElementById('filtre_marque'),
    essence: document.getElementById('essence'),
    diesel: document.getElementById('diesel'),
    electrique: document.getElementById('electrique'),
    nav: document.getElementById('siteNav'),
    navToggle: document.getElementById('navToggle'),
    navAdmin: document.getElementById('navAdmin'),
    modal: document.getElementById('resModal'),
    resForm: document.getElementById('resForm'),
    resCarId: document.getElementById('resCarId'),
    resCarLabel: document.getElementById('resCarLabel'),
    resMsg: document.getElementById('resMsg'),
    resDateRange: document.getElementById('resDateRange'),
    resStartDate: document.getElementById('resStartDate'),
    resEndDate: document.getElementById('resEndDate'),
    resBusyWrap: document.getElementById('resBusyWrap'),
    resBusyList: document.getElementById('resBusyList'),
    resBusyEmpty: document.getElementById('resBusyEmpty'),
    accountGuest: document.getElementById('accountGuest'),
    accountUser: document.getElementById('accountUser'),
    accountWelcome: document.getElementById('accountWelcome'),
    btnLogout: document.getElementById('btnLogout'),
    myReservationsEmpty: document.getElementById('myReservationsEmpty'),
    myReservationsTable: document.getElementById('myReservationsTable'),
    myReservationsBody: document.getElementById('myReservationsBody'),
    formLogin: document.getElementById('formLogin'),
    formRegister: document.getElementById('formRegister'),
    loginMsg: document.getElementById('loginMsg'),
    registerMsg: document.getElementById('registerMsg'),
    formNewCar: document.getElementById('formNewCar'),
    adminCarMsg: document.getElementById('adminCarMsg'),
    adminCarsBody: document.getElementById('adminCarsBody'),
    adminResBody: document.getElementById('adminResBody'),
  };

  function api(path, opts = {}) {
    const headers = { ...(opts.headers || {}) };
    if (opts.body && typeof opts.body === 'string' && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
    return fetch(path, {
      ...opts,
      credentials: 'include',
      headers,
    });
  }

  async function refreshUser() {
    try {
      const res = await api('/api/auth/me');
      const data = await res.json();
      currentUser = data.user || null;
    } catch {
      currentUser = null;
    }
    if (els.navAdmin) {
      els.navAdmin.hidden = !currentUser || currentUser.role !== 'admin';
    }
    updateAccountPanels();
  }

  function updateAccountPanels() {
    const loggedIn = !!currentUser;
    els.accountGuest.hidden = loggedIn;
    els.accountUser.hidden = !loggedIn;
    if (loggedIn && els.accountWelcome) {
      els.accountWelcome.textContent = `${currentUser.display_name} · ${currentUser.email}`;
    }
  }

  function statusLabel(s) {
    if (s === 'confirmed') return 'Confirmée';
    if (s === 'cancelled') return 'Annulée';
    return 'En attente';
  }

  function statusClass(s) {
    if (s === 'confirmed') return 'badge-confirmed';
    if (s === 'cancelled') return 'badge-cancelled';
    return 'badge-pending';
  }

  function formatMoneyCents(cents) {
    if (cents == null || cents === '') return '—';
    const n = Number(cents);
    if (!Number.isFinite(n)) return '—';
    return (n / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
  }

  function paymentMethodLabel(m) {
    if (m === 'stripe') return 'En ligne (Stripe)';
    return 'Sur place';
  }

  function paymentStatusUser(s) {
    if (s === 'paid') return 'Payé';
    if (s === 'unpaid') return 'Paiement Stripe en attente';
    if (s === 'awaiting_physical') return 'À payer sur place';
    if (s === 'failed') return 'Paiement refusé';
    return String(s || '');
  }

  function paymentStatusAdmin(s) {
    if (s === 'paid') return 'Payé';
    if (s === 'unpaid') return 'En attente (Stripe)';
    if (s === 'awaiting_physical') return 'À encaisser';
    if (s === 'failed') return 'Échec';
    return String(s || '');
  }

  async function loadMyReservations() {
    if (!currentUser) return;
    els.myReservationsEmpty.textContent = 'Chargement…';
    els.myReservationsEmpty.hidden = false;
    els.myReservationsTable.hidden = true;
    try {
      const res = await api('/api/me/reservations');
      if (!res.ok) throw new Error();
      const rows = await res.json();
      if (!rows.length) {
        els.myReservationsEmpty.textContent = 'Aucune réservation pour le moment.';
        els.myReservationsBody.innerHTML = '';
        return;
      }
      els.myReservationsEmpty.hidden = true;
      els.myReservationsTable.hidden = false;
      els.myReservationsBody.innerHTML = rows
        .map(
          (r) => `
        <tr>
          <td>${escapeHtml(String(r.car_name || ''))}</td>
          <td>${escapeHtml(String(r.start_date))} → ${escapeHtml(String(r.end_date))}</td>
          <td><span class="badge ${statusClass(String(r.status))}">${escapeHtml(statusLabel(String(r.status)))}</span></td>
          <td><span class="muted">${escapeHtml(paymentMethodLabel(String(r.payment_method || 'on_site')))}</span><br>${escapeHtml(paymentStatusUser(String(r.payment_status || 'paid')))}<br>${escapeHtml(formatMoneyCents(r.amount_cents))}</td>
        </tr>`
        )
        .join('');
    } catch {
      els.myReservationsEmpty.textContent = 'Impossible de charger la liste.';
    }
  }

  async function loadAdminData() {
    if (!currentUser || currentUser.role !== 'admin') return;
    try {
      const [carsRes, resRes] = await Promise.all([
        api('/api/cars'),
        api('/api/admin/reservations'),
      ]);
      const cars = carsRes.ok ? await carsRes.json() : [];
      const ress = resRes.ok ? await resRes.json() : [];
      els.adminCarsBody.innerHTML = (Array.isArray(cars) ? cars : [])
        .map(
          (c) => `
        <tr>
          <td>${escapeHtml(String(c.id))}</td>
          <td>${escapeHtml(String(c.name))}</td>
          <td>${Number(c.price_per_day)} €</td>
          <td><button type="button" class="btn btn-small" data-admin-delete-car="${escapeAttr(String(c.id))}">Supprimer</button></td>
        </tr>`
        )
        .join('');
      els.adminResBody.innerHTML = (Array.isArray(ress) ? ress : [])
        .map((r) => {
          const id = String(r.id);
          const st = String(r.status || 'pending');
          const pm = String(r.payment_method || 'on_site');
          const ps = String(r.payment_status || 'paid');
          const showPayBtn = pm === 'on_site' && ps === 'awaiting_physical';
          const payBtn = showPayBtn
            ? `<button type="button" class="btn btn-primary btn-pay-confirm" data-confirm-physical="${escapeAttr(id)}">Confirmer paiement sur place</button>`
            : '<span class="muted">—</span>';
          return `
        <tr>
          <td>${escapeHtml(id)}</td>
          <td>${escapeHtml(String(r.customer_name))}<br><span class="muted">${escapeHtml(String(r.email))}</span></td>
          <td>${escapeHtml(String(r.car_name || ''))}</td>
          <td>${escapeHtml(String(r.start_date))} → ${escapeHtml(String(r.end_date))}</td>
          <td>
            <select class="status-select" data-res-id="${id}" aria-label="Statut réservation">
              <option value="pending"${st === 'pending' ? ' selected' : ''}>En attente</option>
              <option value="confirmed"${st === 'confirmed' ? ' selected' : ''}>Confirmée</option>
              <option value="cancelled"${st === 'cancelled' ? ' selected' : ''}>Annulée</option>
            </select>
          </td>
          <td>
            ${escapeHtml(paymentMethodLabel(pm))}<br>
            <span class="muted">${escapeHtml(formatMoneyCents(r.amount_cents))} · ${escapeHtml(paymentStatusAdmin(ps))}</span>
          </td>
          <td>${payBtn}</td>
        </tr>`;
        })
        .join('');
    } catch {
      els.adminCarsBody.innerHTML = '';
      els.adminResBody.innerHTML = '';
    }
  }

  function showTab(tabId) {
    document.querySelectorAll('.tabcontent').forEach((el) => {
      el.hidden = el.id !== tabId;
    });
    document.querySelectorAll('.tablink').forEach((btn) => {
      const match = btn.getAttribute('data-tab') === tabId;
      btn.classList.toggle('is-active', match);
    });
    if (els.nav.classList.contains('is-open')) {
      els.nav.classList.remove('is-open');
      els.navToggle.setAttribute('aria-expanded', 'false');
    }
    if (tabId === 'tab4') loadMyReservations();
    if (tabId === 'tab5') loadAdminData();
  }

  function bindTabs() {
    document.querySelectorAll('.tablink').forEach((btn) => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        if (tab) showTab(tab);
      });
    });
    document.querySelector('.logo')?.addEventListener('click', (e) => {
      e.preventDefault();
      showTab('tab1');
    });
  }

  function bindNavToggle() {
    els.navToggle.addEventListener('click', () => {
      const open = els.nav.classList.toggle('is-open');
      els.navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  function fuelMatches(car, essence, diesel, elec) {
    const f = String(car.fuel);
    return (
      (essence && f === 'Essence') ||
      (diesel && f === 'Diesel') ||
      (elec && f === 'Électrique')
    );
  }

  function applyFilters() {
    const term = els.recherche.value.trim().toLowerCase();
    const pMin = parseFloat(els.prixMin.value);
    const pMax = parseFloat(els.prixMax.value);
    const kmMin = parseFloat(els.kmMin.value);
    const kmMax = parseFloat(els.kmMax.value);
    const seatsMin = parseInt(els.capacite.value, 10);
    const brand = els.filtreMarque.value;

    const essence = els.essence.checked;
    const diesel = els.diesel.checked;
    const electrique = els.electrique.checked;

    workingCopy = sourceCars.filter((car) => {
      const name = String(car.name).toLowerCase();
      const marque = String(car.brand).toLowerCase();
      if (term && !name.includes(term) && !marque.includes(term)) return false;
      if (!Number.isNaN(pMin) && Number(car.price_per_day) < pMin) return false;
      if (!Number.isNaN(pMax) && Number(car.price_per_day) > pMax) return false;
      if (!Number.isNaN(kmMin) && Number(car.km) < kmMin) return false;
      if (!Number.isNaN(kmMax) && Number(car.km) > kmMax) return false;
      if (!Number.isNaN(seatsMin) && Number(car.seats) < seatsMin) return false;
      if (brand !== 'toutes' && String(car.brand).toLowerCase() !== brand) return false;
      if (!fuelMatches(car, essence, diesel, electrique)) return false;
      return true;
    });

    sortWorking();
    renderGrid();
  }

  function sortWorking() {
    const crit = els.tri.value;
    const copy = [...workingCopy];
    if (crit === 'price') {
      copy.sort((a, b) => Number(a.price_per_day) - Number(b.price_per_day));
    } else if (crit === 'year') {
      copy.sort((a, b) => Number(b.year) - Number(a.year));
    } else if (crit === 'km') {
      copy.sort((a, b) => Number(a.km) - Number(b.km));
    } else if (crit === 'brand') {
      copy.sort((a, b) => String(a.brand).localeCompare(String(b.brand), 'fr'));
    }
    workingCopy = copy;
  }

  function renderGrid() {
    if (!workingCopy.length) {
      els.grid.innerHTML =
        '<p class="empty-state">Aucun véhicule ne correspond à ces critères.</p>';
      return;
    }
    const frag = document.createDocumentFragment();
    workingCopy.forEach((car) => {
      const card = document.createElement('article');
      card.className = 'car-card';
      card.innerHTML = `
        <figure><img src="${escapeAttr(String(car.image_url))}" alt="${escapeAttr(String(car.name))}" loading="lazy" width="400" height="250"></figure>
        <div class="car-body">
          <span class="price-pill">${Number(car.price_per_day)} € / jour</span>
          <h3>${escapeHtml(String(car.name))}</h3>
          <ul class="car-meta">
            <li>${escapeHtml(String(car.brand))} · ${Number(car.year)}</li>
            <li>${escapeHtml(String(car.fuel))} · ${Number(car.seats)} places</li>
            <li>${Number(car.km).toLocaleString('fr-FR')} km</li>
          </ul>
          <div class="car-actions">
            <button type="button" class="btn btn-primary btn-small" data-reserve="${escapeAttr(String(car.id))}">Demander une location</button>
          </div>
        </div>
      `;
      frag.appendChild(card);
    });
    els.grid.innerHTML = '';
    els.grid.appendChild(frag);
  }

  function escapeHtml(s) {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function escapeAttr(s) {
    return escapeHtml(s).replace(/'/g, '&#39;');
  }

  async function loadCars() {
    els.catalogStatus.textContent = 'Chargement…';
    try {
      const res = await api(API_CARS);
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      sourceCars = Array.isArray(data) ? data : [];
      workingCopy = [...sourceCars];
      els.catalogStatus.textContent = `${sourceCars.length} véhicule(s) en base`;
      applyFilters();
    } catch {
      els.catalogStatus.textContent = 'Erreur réseau ou serveur arrêté.';
      els.grid.innerHTML =
        '<p class="empty-state">Lancez le serveur avec <code>npm start</code> puis rechargez la page.</p>';
    }
  }

  function bindFilters() {
    [
      els.tri,
      els.recherche,
      els.prixMin,
      els.prixMax,
      els.kmMin,
      els.kmMax,
      els.capacite,
      els.filtreMarque,
      els.essence,
      els.diesel,
      els.electrique,
    ].forEach((el) => {
      el.addEventListener('input', () => {
        workingCopy = [...sourceCars];
        applyFilters();
      });
      el.addEventListener('change', () => {
        workingCopy = [...sourceCars];
        applyFilters();
      });
    });
  }

  function destroyResPicker() {
    if (resFlatpickr) {
      resFlatpickr.destroy();
      resFlatpickr = null;
    }
  }

  function fmtYMD(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function statusPeriodLabel(s) {
    if (s === 'confirmed') return 'confirmée';
    return 'en attente';
  }

  async function setupReservationCalendar(carId) {
    destroyResPicker();
    if (!els.resDateRange || !els.resStartDate || !els.resEndDate) return;
    els.resDateRange.value = '';
    els.resStartDate.value = '';
    els.resEndDate.value = '';

    let periods = [];
    try {
      const res = await api(`/api/cars/${encodeURIComponent(carId)}/availability`);
      const data = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(data.periods)) periods = data.periods;
    } catch {
      /* ignore */
    }

    if (els.resBusyWrap && els.resBusyList && els.resBusyEmpty) {
      els.resBusyWrap.hidden = false;
      els.resBusyList.innerHTML = '';
      if (!periods.length) {
        els.resBusyEmpty.hidden = false;
      } else {
        els.resBusyEmpty.hidden = true;
        periods.forEach((p) => {
          const li = document.createElement('li');
          li.textContent = `Du ${String(p.start_date)} au ${String(p.end_date)} (${statusPeriodLabel(String(p.status))})`;
          els.resBusyList.appendChild(li);
        });
      }
    }

    const disableRanges = periods.map((p) => ({ from: String(p.start_date), to: String(p.end_date) }));

    function rangeClashesBusy(s, e) {
      return periods.some((p) => String(p.start_date) <= e && String(p.end_date) >= s);
    }

    if (typeof window.flatpickr !== 'function') {
      els.resMsg.textContent = 'Calendrier indisponible (script bloqué ou hors ligne).';
      els.resMsg.className = 'form-msg err';
      return;
    }

    const localeOpt =
      window.flatpickr.l10ns && window.flatpickr.l10ns.fr ? { locale: window.flatpickr.l10ns.fr } : {};

    resFlatpickr = window.flatpickr(els.resDateRange, {
      mode: 'range',
      minDate: 'today',
      dateFormat: 'Y-m-d',
      disable: disableRanges,
      ...localeOpt,
      onChange(selectedDates) {
        if (selectedDates.length === 2) {
          const s = fmtYMD(selectedDates[0]);
          const e = fmtYMD(selectedDates[1]);
          if (rangeClashesBusy(s, e)) {
            resFlatpickr.clear();
            els.resStartDate.value = '';
            els.resEndDate.value = '';
            els.resMsg.textContent = 'Cette plage chevauche une période déjà réservée.';
            els.resMsg.className = 'form-msg err';
            return;
          }
          els.resMsg.textContent = '';
          els.resMsg.className = 'form-msg';
          els.resStartDate.value = s;
          els.resEndDate.value = e;
        } else if (selectedDates.length === 0) {
          els.resStartDate.value = '';
          els.resEndDate.value = '';
        }
      },
    });
  }

  function prefillReservationForm() {
    const nameInput = els.resForm.querySelector('input[name="customer_name"]');
    const emailInput = els.resForm.querySelector('input[name="email"]');
    if (!(nameInput instanceof HTMLInputElement) || !(emailInput instanceof HTMLInputElement)) return;
    if (currentUser) {
      nameInput.value = currentUser.display_name;
      emailInput.value = currentUser.email;
      nameInput.readOnly = true;
      emailInput.readOnly = true;
    } else {
      nameInput.value = '';
      emailInput.value = '';
      nameInput.readOnly = false;
      emailInput.readOnly = false;
    }
  }

  async function openModal(carId, label) {
    destroyResPicker();
    els.resForm.reset();
    els.resCarId.value = String(carId);
    els.resCarLabel.textContent = label;
    els.resMsg.textContent = '';
    els.resMsg.className = 'form-msg';
    els.modal.hidden = false;
    await setupReservationCalendar(carId);
    prefillReservationForm();
    const first = els.resForm.querySelector('input[name="customer_name"]');
    if (first instanceof HTMLElement && !currentUser) first.focus();
    els.resDateRange?.focus();
  }

  function closeModal() {
    destroyResPicker();
    els.modal.hidden = true;
  }

  function bindModal() {
    els.grid.addEventListener('click', (e) => {
      const t = e.target;
      if (!(t instanceof HTMLElement)) return;
      const id = t.getAttribute('data-reserve');
      if (!id) return;
      const car = sourceCars.find((c) => String(c.id) === id);
      const label = car ? `${car.name}` : `Véhicule #${id}`;
      void openModal(id, label);
    });
    els.modal.querySelectorAll('[data-close-modal]').forEach((n) => {
      n.addEventListener('click', closeModal);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !els.modal.hidden) closeModal();
    });
  }

  els.resForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    els.resMsg.textContent = '';
    els.resMsg.className = 'form-msg';
    const fd = new FormData(els.resForm);
    const start = String(fd.get('start_date') || '').trim();
    const end = String(fd.get('end_date') || '').trim();
    if (!start || !end) {
      els.resMsg.textContent = 'Veuillez choisir une période (date de début et de fin) dans le calendrier.';
      els.resMsg.classList.add('err');
      return;
    }
    if (start > end) {
      els.resMsg.textContent = 'La date de fin doit être après la date de début.';
      els.resMsg.classList.add('err');
      return;
    }
    const payRaw = String(fd.get('payment_method') || 'on_site');
    const body = {
      car_id: fd.get('car_id'),
      customer_name: fd.get('customer_name'),
      email: fd.get('email'),
      start_date: start,
      end_date: end,
      payment_method: payRaw === 'stripe' ? 'stripe' : 'on_site',
    };
    try {
      const res = await api('/api/reservations', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        els.resMsg.textContent = data.error || 'Erreur serveur';
        els.resMsg.classList.add('err');
        return;
      }
      if (data.checkoutUrl && typeof data.checkoutUrl === 'string') {
        window.location.href = data.checkoutUrl;
        return;
      }
      els.resMsg.textContent = data.message || 'Enregistré.';
      els.resMsg.classList.add('ok');
      setTimeout(closeModal, 1600);
      if (currentUser) loadMyReservations();
    } catch {
      els.resMsg.textContent = 'Impossible de contacter le serveur.';
      els.resMsg.classList.add('err');
    }
  });

  function setFormMsg(el, text, ok) {
    el.textContent = text;
    el.className = 'form-msg';
    if (ok) el.classList.add('ok');
    else if (text) el.classList.add('err');
  }

  els.formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();
    setFormMsg(els.loginMsg, '', true);
    const fd = new FormData(els.formLogin);
    const body = { email: fd.get('email'), password: fd.get('password') };
    try {
      const res = await api('/api/auth/login', { method: 'POST', body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormMsg(els.loginMsg, data.error || 'Erreur', false);
        return;
      }
      currentUser = data.user;
      updateAccountPanels();
      setFormMsg(els.loginMsg, 'Connecté.', true);
      els.formLogin.reset();
      if (els.navAdmin) els.navAdmin.hidden = currentUser.role !== 'admin';
    } catch {
      setFormMsg(els.loginMsg, 'Réseau indisponible.', false);
    }
  });

  els.formRegister.addEventListener('submit', async (e) => {
    e.preventDefault();
    setFormMsg(els.registerMsg, '', true);
    const fd = new FormData(els.formRegister);
    const body = {
      email: fd.get('email'),
      password: fd.get('password'),
      display_name: fd.get('display_name'),
    };
    try {
      const res = await api('/api/auth/register', { method: 'POST', body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormMsg(els.registerMsg, data.error || 'Erreur', false);
        return;
      }
      currentUser = data.user;
      updateAccountPanels();
      setFormMsg(els.registerMsg, 'Compte créé.', true);
      els.formRegister.reset();
      if (els.navAdmin) els.navAdmin.hidden = currentUser.role !== 'admin';
    } catch {
      setFormMsg(els.registerMsg, 'Réseau indisponible.', false);
    }
  });

  els.btnLogout.addEventListener('click', async () => {
    try {
      await api('/api/auth/logout', { method: 'POST' });
    } catch {
      /* ignore */
    }
    currentUser = null;
    if (els.navAdmin) els.navAdmin.hidden = true;
    updateAccountPanels();
    showTab('tab4');
  });

  els.formNewCar.addEventListener('submit', async (e) => {
    e.preventDefault();
    els.adminCarMsg.textContent = '';
    els.adminCarMsg.className = 'form-msg';
    const fd = new FormData(els.formNewCar);
    const body = Object.fromEntries(fd.entries());
    try {
      const res = await api('/api/admin/cars', { method: 'POST', body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        els.adminCarMsg.textContent = data.error || 'Erreur';
        els.adminCarMsg.classList.add('err');
        return;
      }
      els.formNewCar.reset();
      els.adminCarMsg.textContent = 'Véhicule ajouté.';
      els.adminCarMsg.classList.add('ok');
      await loadCars();
      await loadAdminData();
    } catch {
      els.adminCarMsg.textContent = 'Erreur réseau.';
      els.adminCarMsg.classList.add('err');
    }
  });

  document.getElementById('adminCarsTable')?.addEventListener('click', async (e) => {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;
    const delId = t.getAttribute('data-admin-delete-car');
    if (!delId) return;
    if (!confirm('Supprimer ce véhicule et ses réservations liées ?')) return;
    try {
      const res = await api(`/api/admin/cars/${encodeURIComponent(delId)}`, { method: 'DELETE' });
      if (!res.ok) return;
      await loadCars();
      await loadAdminData();
    } catch {
      /* ignore */
    }
  });

  document.getElementById('adminResTable')?.addEventListener('change', async (e) => {
    const t = e.target;
    if (!(t instanceof HTMLSelectElement) || !t.matches('.status-select')) return;
    const id = t.getAttribute('data-res-id');
    const status = t.value;
    try {
      const res = await api(`/api/admin/reservations/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      if (!res.ok) await loadAdminData();
    } catch {
      await loadAdminData();
    }
  });

  function bindAdminPhysicalPayment() {
    const tbl = document.getElementById('adminResTable');
    if (!tbl || tbl.dataset.payBound === '1') return;
    tbl.dataset.payBound = '1';
    tbl.addEventListener('click', async (e) => {
      const t = e.target;
      if (!(t instanceof HTMLElement)) return;
      const rid = t.getAttribute('data-confirm-physical');
      if (!rid) return;
      if (!confirm('Confirmer que le client a bien réglé sur place ?')) return;
      try {
        const res = await api(
          `/api/admin/reservations/${encodeURIComponent(rid)}/confirm-physical-payment`,
          { method: 'POST' }
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          alert(data.error || 'Erreur serveur');
          return;
        }
        await loadAdminData();
      } catch {
        alert('Réseau indisponible.');
      }
    });
  }

  bindTabs();
  bindNavToggle();
  bindFilters();
  bindModal();
  bindAdminPhysicalPayment();
  showTab('tab1');
  refreshUser().then(() => {
    updateAccountPanels();
    loadCars();
  });
})();
