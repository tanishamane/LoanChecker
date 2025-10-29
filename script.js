<<<<<<< HEAD
// --- Utilities ---
const $ = (s, parent=document) => parent.querySelector(s);
const $$ = (s, parent=document) => Array.from(parent.querySelectorAll(s));
const fmtINR = n => n.toLocaleString('en-IN', { maximumFractionDigits: 0 });

// Dark mode toggle
(function initTheme(){
  const key = 'cg-theme';
  const saved = localStorage.getItem(key);
  const root = document.documentElement;
  const btn = $('#themeToggle');
  function set(mode){
    if(!btn) return;
    if(mode==='dark'){ document.body.classList.add('dark'); localStorage.setItem(key,'dark'); }
    else if(mode==='light'){ document.body.classList.remove('dark'); localStorage.setItem(key,'light'); }
    else { // auto -> prefer dark
      document.body.classList.add('dark');
      localStorage.setItem(key,'dark');
    }
  }
  if(btn){ btn.addEventListener('click', ()=> set(document.body.classList.contains('dark')?'light':'dark')); }
  set(saved || 'auto');
})();

// Mobile menu
(function(){
  const toggle = $('#menuToggle');
  const nav = $('.nav');
  if(toggle && nav){
    toggle.addEventListener('click', ()=> {
      const visible = getComputedStyle(nav).display !== 'none';
      nav.style.display = visible ? 'none':'flex';
    });
  }
})();

// Footer year
(function(){ const y = $('#year'); if(y) y.textContent = new Date().getFullYear(); })();

// GSAP hero animation
window.addEventListener('DOMContentLoaded', ()=>{
  if (window.gsap && $('.hero')){
    gsap.from('.hero h1',{y:20,opacity:0,duration:.6});
    gsap.from('.hero p',{y:20,opacity:0,duration:.6,delay:.1});
    gsap.from('.hero-cta',{y:20,opacity:0,duration:.6,delay:.2});
    gsap.from('.hero-art',{y:10,opacity:0,duration:.6,delay:.15});
  }
});

// --- Check Score Page Logic ---
(function(){
  const form = $('#scoreForm');
  const otpSection = $('#otpSection');
  const loadingSection = $('#loadingSection');
  const otpInput = $('#otpInput');
  const otpMaskedMobile = $('#otpMaskedMobile');
  const verifyBtn = $('#verifyOtpBtn');
  const resendBtn = $('#resendOtpBtn');
  const formError = $('#formError');
  const otpError = $('#otpError');
  const otpSpinner = $('#otpSpinner');

  // Pre-select loan type via URL ?type=
  const params = new URLSearchParams(location.search);
  const loanType = params.get('type') || 'personal';

  function validPAN(p){ return /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(p); }
  function maskPAN(p){ return p ? p.replace(/^([A-Z]{3})[A-Z]([A-Z])[0-9]{4}([A-Z])$/, '$1X$2XXXX$3') : ''; }
  function maskMobile(m){ return m ? m.replace(/^(\d{2})\d{6}(\d{2})$/, '$1••••••$2') : ''; }

  if(form){
    form.addEventListener('submit', (e)=>{
      e.preventDefault();
      formError.classList.add('hidden');

      const data = Object.fromEntries(new FormData(form).entries());
      if(!validPAN((data.pan||'').toUpperCase())){
        formError.textContent = 'Invalid PAN format (e.g., ABCDE1234F).';
        formError.classList.remove('hidden');
        return;
      }
      if(!/^\d{10}$/.test(data.mobile||'')){
        formError.textContent = 'Mobile must be 10 digits.';
        formError.classList.remove('hidden');
        return;
      }
      if(!$('#consent').checked){
        formError.textContent = 'Please provide consent to proceed.';
        formError.classList.remove('hidden');
        return;
      }
      // Move to OTP
      otpSection.classList.remove('hidden');
      $$('.step-badge').forEach(b=> b.classList.toggle('active', b.dataset.step==='2'));
      otpMaskedMobile.textContent = maskMobile(data.mobile);

      // Save partial profile in sessionStorage for results page
      sessionStorage.setItem('cgProfile', JSON.stringify({
        fullName: data.fullName,
        panMasked: maskPAN((data.pan||'').toUpperCase()),
        dob: data.dob,
        mobile: data.mobile,
        email: data.email,
        type: loanType
      }));
    });
  }

  if(verifyBtn){
    verifyBtn.addEventListener('click', ()=>{
      otpError.classList.add('hidden');
      const code = otpInput.value.trim();
      if(!/^\d{6}$/.test(code)){
        otpError.textContent = 'Invalid OTP. Must be 6 digits.';
        otpError.classList.remove('hidden');
        return;
      }
      otpSpinner.classList.remove('hidden');

      // Simulate API call to fetch score
      setTimeout(()=>{
        otpSpinner.classList.add('hidden');
        // Generate a deterministic dummy score using mobile digits
        const mobile = (JSON.parse(sessionStorage.getItem('cgProfile')||'{}').mobile||'').slice(-4);
        let seed = Number(mobile)||Math.floor(Math.random()*9000+1000);
        const score = 500 + (seed % 351); // 500–850
        const offers = generateOffers(score, params.get('type'));

        // Persist for results
        sessionStorage.setItem('cgResult', JSON.stringify({ score, offers }));
        // Advance progress
        $$('.step-badge').forEach(b=> b.classList.toggle('active', b.dataset.step==='3'));

        // Show loading then redirect
        otpSection.classList.add('hidden');
        loadingSection.classList.remove('hidden');
        setTimeout(()=> location.href = 'results.html', 900);
      }, 900);
    });
  }

  if(resendBtn){
    resendBtn.addEventListener('click', ()=>{
      resendBtn.textContent = 'OTP Sent ✓';
      setTimeout(()=> resendBtn.textContent = 'Resend', 1500);
    });
  }

  function generateOffers(score, type){
    // Simple mock offers; higher scores get better rates and amounts
    const base = {
      personal: [{ bank:'Axis Bank', rate:15.5, max:1000000, tenure:'12–60m' },
                 { bank:'HDFC Bank', rate:14.0, max:1200000, tenure:'12–72m' }],
      home: [{ bank:'SBI', rate:9.1, max:10000000, tenure:'60–360m' },
             { bank:'ICICI', rate:9.3, max:9000000, tenure:'60–300m' }],
      car: [{ bank:'Kotak', rate:10.2, max:2500000, tenure:'12–84m' },
             { bank:'HDFC', rate:10.8, max:2200000, tenure:'12–84m' }],
      card: [{ bank:'RBL', rate:0, max:0, tenure:'—', perks:'Cashback, rewards' },
             { bank:'SBI Card', rate:0, max:0, tenure:'—', perks:'Fuel benefits' }]
    };
    const list = base[type||'personal'] || base.personal;
    return list.map(o=>{
      const adj = (850 - score)/100; // lower score => higher rate
      const rate = o.rate ? +(o.rate + Math.max(0, adj*2)).toFixed(2) : 0;
      const max = o.max ? Math.round(o.max * (score/850)) : 0;
      const emi = o.rate ? Math.round(emicalc(Math.min(max, 500000), rate, 36)) : 0;
      return {...o, rate, max, emi};
    });
  }

  function emicalc(amount, annualRate, months){
    const r = (annualRate/12)/100;
    return (amount * r * Math.pow(1+r, months)) / (Math.pow(1+r, months)-1);
  }
})();

// --- Results Page Logic ---
(function(){
  if(!location.pathname.endsWith('results.html')) return;

  const result = JSON.parse(sessionStorage.getItem('cgResult') || '{}');
  const profile = JSON.parse(sessionStorage.getItem('cgProfile') || '{}');
  const score = result.score || 0;
  const offers = result.offers || [];

  // Score text & band
  const scoreEl = $('#scoreValue'), bandEl = $('#scoreBand'), explain = $('#scoreExplain');
  if(scoreEl) scoreEl.textContent = score || '—';

  const band = score>=750 ? 'Excellent' : score>=700 ? 'Good' : score>=650 ? 'Fair' : 'Poor';
  if(bandEl) bandEl.textContent = band;
  if(explain){
    const msg = {
      Excellent:'Great! You should qualify for competitive offers.',
      Good:'Solid score. You may get attractive rates.',
      Fair:'You might qualify, but rates could be higher.',
      Poor:'Work on improvements to unlock better offers.'
    }[band];
    explain.textContent = msg || '';
  }

  // Score chart gauge
  const canvas = $('#scoreChart');
  if(canvas && window.Chart){
    const pct = Math.max(0, Math.min(1, (score-300)/(850-300)));
    const data = [pct*100, (1-pct)*100];
    new Chart(canvas.getContext('2d'),{
      type:'doughnut',
      data:{ datasets:[{ data, cutout:'70%' }]},
      options:{
        plugins:{ legend:{display:false}},
        rotation:-90, circumference:180
      }
    });
  }

  // Profile summary
  const profileWrap = $('#profileSummary');
  if(profileWrap){
    profileWrap.innerHTML = `
      <div><strong>Name:</strong> ${profile.fullName||'-'}</div>
      <div><strong>PAN:</strong> ${profile.panMasked||'-'}</div>
      <div><strong>DOB:</strong> ${profile.dob||'-'}</div>
      <div><strong>Loan Type:</strong> ${(profile.type||'personal').toUpperCase()}</div>
      <div><strong>Email:</strong> ${profile.email||'-'}</div>
      <div><strong>Mobile:</strong> ${profile.mobile ? profile.mobile.replace(/^(\d{2})\d{6}(\d{2})$/, '$1••••••$2'):'-'}</div>
    `;
  }

  // Offers
  const offersWrap = $('#offers');
  const compareBtn = $('#compareBtn');
  const compareTableWrap = $('#compareTableWrap');
  const compareBody = $('#compareTable tbody');
  if(offersWrap){
    offersWrap.innerHTML = offers.map((o,i)=> `
      <div class="card offer">
        <div class="flex-between" style="display:flex;align-items:center;justify-content:space-between;">
          <h4>${o.bank}</h4>
          <label style="display:flex;align-items:center;gap:6px;font-size:.9rem;">
            <input type="checkbox" class="offer-check" data-idx="${i}"/> Compare
          </label>
        </div>
        <p class="muted">${o.perks ? o.perks : 'Pre-approved (subject to verification)'}</p>
        <div class="stats">
          <div class="stat"><span class="stat-label">Rate</span><span class="stat-value">${o.rate?o.rate+'%':'—'}</span></div>
          <div class="stat"><span class="stat-label">Max Amount</span><span class="stat-value">₹${fmtINR(o.max||0)}</span></div>
          <div class="stat"><span class="stat-label">Tenure</span><span class="stat-value">${o.tenure}</span></div>
          <div class="stat"><span class="stat-label">Est. EMI (₹5L/36m)</span><span class="stat-value">${o.emi?fmtINR(o.emi):'—'}</span></div>
        </div>
        <div class="actions">
          <a href="#" class="btn btn-primary">Apply Now</a>
          <a href="calculator.html" class="btn btn-ghost">Recalculate</a>
        </div>
      </div>
    `).join('');

    // Compare selection
    offersWrap.addEventListener('change', e=>{
      if(e.target.classList.contains('offer-check')){
        const selected = $$('.offer-check:checked').map(c=> +c.dataset.idx);
        compareBtn.disabled = selected.length < 2;
      }
    });

    compareBtn.addEventListener('click', ()=>{
      const idxs = $$('.offer-check:checked').map(c=> +c.dataset.idx);
      compareBody.innerHTML = idxs.map(i=>{
        const o = offers[i];
        return `<tr><td>${o.bank}</td><td>${o.rate?o.rate+'%':'—'}</td><td>₹${fmtINR(o.max||0)}</td><td>${o.tenure}</td><td>${o.emi?fmtINR(o.emi):'—'}</td></tr>`;
      }).join('');
      compareTableWrap.classList.remove('hidden');
      compareBtn.scrollIntoView({behavior:'smooth',block:'center'});
    });
  }

  // Tips
  const tips = $('#tips');
  if(tips){
    const list = [
      'Pay bills on time—payment history is crucial.',
      'Reduce credit utilization below 30%.',
      'Avoid multiple new credit applications at once.',
      'Keep older accounts open to build credit age.',
      'Check your report for errors and dispute if needed.'
    ];
    tips.innerHTML = list.map(t=> `<li>${t}</li>`).join('');
  }
})();

// --- Calculators ---
(function(){
  if(!location.pathname.endsWith('calculator.html')) return;

  // EMI
  const emiForm = $('#emiForm');
  const out = { emi: $('#emiOut'), interest: $('#emiInterest'), total: $('#emiTotal') };
  const chartEl = $('#emiChart');
  let emiChart;

  function calcEMI(P, annualRate, n){
    const r = (annualRate/12)/100;
    const emi = (P*r*Math.pow(1+r,n))/(Math.pow(1+r,n)-1);
    const total = emi*n;
    const interest = total - P;
    return { emi, total, interest };
  }

  function updateEMI(){
    const P = +$('#emiAmount').value;
    const R = +$('#emiRate').value;
    const N = +$('#emiMonths').value;
    const { emi, total, interest } = calcEMI(P,R,N);
    out.emi.textContent = '₹'+fmtINR(Math.round(emi));
    out.interest.textContent = '₹'+fmtINR(Math.round(interest));
    out.total.textContent = '₹'+fmtINR(Math.round(total));
    if(window.Chart && chartEl){
      if(emiChart) emiChart.destroy();
      emiChart = new Chart(chartEl.getContext('2d'),{
        type:'pie',
        data:{ labels:['Principal','Interest'], datasets:[{ data:[P, interest] }]},
        options:{ plugins:{ legend:{ position:'bottom' } } }
      });
    }
  }

  if(emiForm){
    emiForm.addEventListener('submit', e=>{ e.preventDefault(); updateEMI(); });
    updateEMI();
  }

  // Eligibility
  const eligForm = $('#eligForm');
  const eligEmi = $('#eligEmi');
  const eligAmt = $('#eligAmt');
  const eligChartEl = $('#eligChart');
  let eligChart;

  function updateEligibility(){
    const salary = +$('#eligSalary').value;
    const exp = +$('#eligExp').value;
    const type = $('#eligType').value;
    const disposable = Math.max(0, salary - exp);
    const allowedEMI = disposable * 0.4; // FOIR ~ 40%
    const rate = type==='home' ? 9.0 : type==='car' ? 10.5 : 14.0;
    const months = type==='home' ? 240 : type==='car' ? 84 : 60;
    // invert EMI formula to estimate loan amount
    const r = (rate/12)/100;
    const P = allowedEMI * (Math.pow(1+r,months)-1) / (r*Math.pow(1+r,months));

    eligEmi.textContent = '₹'+fmtINR(Math.round(allowedEMI));
    eligAmt.textContent = '₹'+fmtINR(Math.round(P));

    if(window.Chart && eligChartEl){
      if(eligChart) eligChart.destroy();
      eligChart = new Chart(eligChartEl.getContext('2d'),{
        type:'bar',
        data:{ labels:['Salary','Expenses','Eligible EMI'], datasets:[{ data:[salary, exp, allowedEMI] }]},
        options:{ plugins:{ legend:{display:false}}, scales:{ y:{ beginAtZero:true }} }
      });
    }
  }

  if(eligForm){
    eligForm.addEventListener('submit', e=>{ e.preventDefault(); updateEligibility(); });
    updateEligibility();
  }
})();

// Loan EMI Affordability
let donutChart, barChart;

function calculateEMI(P, r, n) {
  let monthlyRate = r / 12 / 100;
  return (P * monthlyRate * Math.pow(1 + monthlyRate, n)) /
         (Math.pow(1 + monthlyRate, n) - 1);
}

function updateGraphs() {
  let income = parseFloat(document.getElementById("income").value);
  let currentEmi = parseFloat(document.getElementById("currentEmi").value);
  let loanAmount = parseFloat(document.getElementById("loanAmount").value);
  let tenure = parseFloat(document.getElementById("tenure").value) * 12;
  let interestRate = parseFloat(document.getElementById("interestRate").value);

  let safeLimit = income * 0.4;
  let newLoanEMI = calculateEMI(loanAmount, interestRate, tenure);
  let totalEMI = currentEmi + newLoanEMI;

  let utilization = (totalEMI / income) * 100;
  let remainingIncome = income - totalEMI;

  let statusColor = utilization <= 40 ? "green" : utilization <= 50 ? "orange" : "red";
  let recommendation = utilization <= 40
    ? "✅ You can take an extra loan safely."
    : "⚠ Reduce EMI or choose longer tenure.";

  document.getElementById("insightsBox").innerHTML = `
    <h3 style="color:${statusColor}">EMI Utilization: ${utilization.toFixed(1)}%</h3>
    <p>Safe EMI Limit: ₹${safeLimit.toFixed(0)}</p>
    <p>Current EMI Total: ₹${totalEMI.toFixed(0)}</p>
    <p><b>Recommendation:</b> ${recommendation}</p>
  `;

  if (donutChart) donutChart.destroy();
  donutChart = new Chart(document.getElementById('donutChart'), {
    type: 'doughnut',
    data: {
      labels: ['Total EMI', 'Remaining Income'],
      datasets: [{
        data: [totalEMI, remainingIncome],
        backgroundColor: ['#00ff88', '#334155']
      }]
    },
    options: { responsive: true, plugins: { legend: { labels: { color: 'white' }}}}
  });

  if (barChart) barChart.destroy();
  barChart = new Chart(document.getElementById('barChart'), {
    type: 'bar',
    data: {
      labels: ['Safe Limit', 'Your EMI'],
      datasets: [{
        data: [safeLimit, totalEMI],
        backgroundColor: [safeLimit >= totalEMI ? 'green' : 'red', 'orange']
      }]
    },
    options: { responsive: true, plugins: { legend: { display: false }}, scales: { x: { ticks: { color: 'white' }}, y: { ticks: { color: 'white' }}}}
  });
}

updateGraphs();

document.querySelectorAll(".accordion-header").forEach(button => {
  button.addEventListener("click", () => {
    const content = button.nextElementSibling;

    // Close all other accordion items
    document.querySelectorAll(".accordion-content").forEach(item => {
      if (item !== content) {
        item.style.maxHeight = null;
        item.classList.remove("open");
      }
    });

    // Toggle current accordion
    if (content.style.maxHeight) {
      content.style.maxHeight = null;
      content.classList.remove("open");
    } else {
      content.style.maxHeight = content.scrollHeight + "px";
      content.classList.add("open");
    }
  });
});

// Mobile Navbar Toggle
const menuToggle = document.getElementById('menu-toggle');
const mobileNav = document.getElementById('mobile-nav');

if (menuToggle && mobileNav) {
  menuToggle.addEventListener('click', () => {
    mobileNav.classList.toggle('show');
  });
}

// Mobile menu toggle
const menuToggle2 = document.getElementById("menuToggle");
const nav = document.querySelector(".nav");

if (menuToggle2 && nav) {
  menuToggle2.addEventListener("click", () => {
    nav.classList.toggle("open");
  });
}
=======
// --- Utilities ---
const $ = (s, parent=document) => parent.querySelector(s);
const $$ = (s, parent=document) => Array.from(parent.querySelectorAll(s));
const fmtINR = n => n.toLocaleString('en-IN', { maximumFractionDigits: 0 });

// Dark mode toggle
(function initTheme(){
  const key = 'cg-theme';
  const saved = localStorage.getItem(key);
  const root = document.documentElement;
  const btn = $('#themeToggle');
  function set(mode){
    if(!btn) return;
    if(mode==='dark'){ document.body.classList.add('dark'); localStorage.setItem(key,'dark'); }
    else if(mode==='light'){ document.body.classList.remove('dark'); localStorage.setItem(key,'light'); }
    else { // auto -> prefer dark
      document.body.classList.add('dark');
      localStorage.setItem(key,'dark');
    }
  }
  if(btn){ btn.addEventListener('click', ()=> set(document.body.classList.contains('dark')?'light':'dark')); }
  set(saved || 'auto');
})();

// Mobile menu
(function(){
  const toggle = $('#menuToggle');
  const nav = $('.nav');
  if(toggle && nav){
    toggle.addEventListener('click', ()=> {
      const visible = getComputedStyle(nav).display !== 'none';
      nav.style.display = visible ? 'none':'flex';
    });
  }
})();

// Footer year
(function(){ const y = $('#year'); if(y) y.textContent = new Date().getFullYear(); })();

// GSAP hero animation
window.addEventListener('DOMContentLoaded', ()=>{
  if (window.gsap && $('.hero')){
    gsap.from('.hero h1',{y:20,opacity:0,duration:.6});
    gsap.from('.hero p',{y:20,opacity:0,duration:.6,delay:.1});
    gsap.from('.hero-cta',{y:20,opacity:0,duration:.6,delay:.2});
    gsap.from('.hero-art',{y:10,opacity:0,duration:.6,delay:.15});
  }
});

// --- Check Score Page Logic ---
(function(){
  const form = $('#scoreForm');
  const otpSection = $('#otpSection');
  const loadingSection = $('#loadingSection');
  const otpInput = $('#otpInput');
  const otpMaskedMobile = $('#otpMaskedMobile');
  const verifyBtn = $('#verifyOtpBtn');
  const resendBtn = $('#resendOtpBtn');
  const formError = $('#formError');
  const otpError = $('#otpError');
  const otpSpinner = $('#otpSpinner');

  // Pre-select loan type via URL ?type=
  const params = new URLSearchParams(location.search);
  const loanType = params.get('type') || 'personal';

  function validPAN(p){ return /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(p); }
  function maskPAN(p){ return p ? p.replace(/^([A-Z]{3})[A-Z]([A-Z])[0-9]{4}([A-Z])$/, '$1X$2XXXX$3') : ''; }
  function maskMobile(m){ return m ? m.replace(/^(\d{2})\d{6}(\d{2})$/, '$1••••••$2') : ''; }

  if(form){
    form.addEventListener('submit', (e)=>{
      e.preventDefault();
      formError.classList.add('hidden');

      const data = Object.fromEntries(new FormData(form).entries());
      if(!validPAN((data.pan||'').toUpperCase())){
        formError.textContent = 'Invalid PAN format (e.g., ABCDE1234F).';
        formError.classList.remove('hidden');
        return;
      }
      if(!/^\d{10}$/.test(data.mobile||'')){
        formError.textContent = 'Mobile must be 10 digits.';
        formError.classList.remove('hidden');
        return;
      }
      if(!$('#consent').checked){
        formError.textContent = 'Please provide consent to proceed.';
        formError.classList.remove('hidden');
        return;
      }
      // Move to OTP
      otpSection.classList.remove('hidden');
      $$('.step-badge').forEach(b=> b.classList.toggle('active', b.dataset.step==='2'));
      otpMaskedMobile.textContent = maskMobile(data.mobile);

      // Save partial profile in sessionStorage for results page
      sessionStorage.setItem('cgProfile', JSON.stringify({
        fullName: data.fullName,
        panMasked: maskPAN((data.pan||'').toUpperCase()),
        dob: data.dob,
        mobile: data.mobile,
        email: data.email,
        type: loanType
      }));
    });
  }

  if(verifyBtn){
    verifyBtn.addEventListener('click', ()=>{
      otpError.classList.add('hidden');
      const code = otpInput.value.trim();
      if(!/^\d{6}$/.test(code)){
        otpError.textContent = 'Invalid OTP. Must be 6 digits.';
        otpError.classList.remove('hidden');
        return;
      }
      otpSpinner.classList.remove('hidden');

      // Simulate API call to fetch score
      setTimeout(()=>{
        otpSpinner.classList.add('hidden');
        // Generate a deterministic dummy score using mobile digits
        const mobile = (JSON.parse(sessionStorage.getItem('cgProfile')||'{}').mobile||'').slice(-4);
        let seed = Number(mobile)||Math.floor(Math.random()*9000+1000);
        const score = 500 + (seed % 351); // 500–850
        const offers = generateOffers(score, params.get('type'));

        // Persist for results
        sessionStorage.setItem('cgResult', JSON.stringify({ score, offers }));
        // Advance progress
        $$('.step-badge').forEach(b=> b.classList.toggle('active', b.dataset.step==='3'));

        // Show loading then redirect
        otpSection.classList.add('hidden');
        loadingSection.classList.remove('hidden');
        setTimeout(()=> location.href = 'results.html', 900);
      }, 900);
    });
  }

  if(resendBtn){
    resendBtn.addEventListener('click', ()=>{
      resendBtn.textContent = 'OTP Sent ✓';
      setTimeout(()=> resendBtn.textContent = 'Resend', 1500);
    });
  }

  function generateOffers(score, type){
    // Simple mock offers; higher scores get better rates and amounts
    const base = {
      personal: [{ bank:'Axis Bank', rate:15.5, max:1000000, tenure:'12–60m' },
                 { bank:'HDFC Bank', rate:14.0, max:1200000, tenure:'12–72m' }],
      home: [{ bank:'SBI', rate:9.1, max:10000000, tenure:'60–360m' },
             { bank:'ICICI', rate:9.3, max:9000000, tenure:'60–300m' }],
      car: [{ bank:'Kotak', rate:10.2, max:2500000, tenure:'12–84m' },
             { bank:'HDFC', rate:10.8, max:2200000, tenure:'12–84m' }],
      card: [{ bank:'RBL', rate:0, max:0, tenure:'—', perks:'Cashback, rewards' },
             { bank:'SBI Card', rate:0, max:0, tenure:'—', perks:'Fuel benefits' }]
    };
    const list = base[type||'personal'] || base.personal;
    return list.map(o=>{
      const adj = (850 - score)/100; // lower score => higher rate
      const rate = o.rate ? +(o.rate + Math.max(0, adj*2)).toFixed(2) : 0;
      const max = o.max ? Math.round(o.max * (score/850)) : 0;
      const emi = o.rate ? Math.round(emicalc(Math.min(max, 500000), rate, 36)) : 0;
      return {...o, rate, max, emi};
    });
  }

  function emicalc(amount, annualRate, months){
    const r = (annualRate/12)/100;
    return (amount * r * Math.pow(1+r, months)) / (Math.pow(1+r, months)-1);
  }
})();

// --- Results Page Logic ---
(function(){
  if(!location.pathname.endsWith('results.html')) return;

  const result = JSON.parse(sessionStorage.getItem('cgResult') || '{}');
  const profile = JSON.parse(sessionStorage.getItem('cgProfile') || '{}');
  const score = result.score || 0;
  const offers = result.offers || [];

  // Score text & band
  const scoreEl = $('#scoreValue'), bandEl = $('#scoreBand'), explain = $('#scoreExplain');
  if(scoreEl) scoreEl.textContent = score || '—';

  const band = score>=750 ? 'Excellent' : score>=700 ? 'Good' : score>=650 ? 'Fair' : 'Poor';
  if(bandEl) bandEl.textContent = band;
  if(explain){
    const msg = {
      Excellent:'Great! You should qualify for competitive offers.',
      Good:'Solid score. You may get attractive rates.',
      Fair:'You might qualify, but rates could be higher.',
      Poor:'Work on improvements to unlock better offers.'
    }[band];
    explain.textContent = msg || '';
  }

  // Score chart gauge
  const canvas = $('#scoreChart');
  if(canvas && window.Chart){
    const pct = Math.max(0, Math.min(1, (score-300)/(850-300)));
    const data = [pct*100, (1-pct)*100];
    new Chart(canvas.getContext('2d'),{
      type:'doughnut',
      data:{ datasets:[{ data, cutout:'70%' }]},
      options:{
        plugins:{ legend:{display:false}},
        rotation:-90, circumference:180
      }
    });
  }

  // Profile summary
  const profileWrap = $('#profileSummary');
  if(profileWrap){
    profileWrap.innerHTML = `
      <div><strong>Name:</strong> ${profile.fullName||'-'}</div>
      <div><strong>PAN:</strong> ${profile.panMasked||'-'}</div>
      <div><strong>DOB:</strong> ${profile.dob||'-'}</div>
      <div><strong>Loan Type:</strong> ${(profile.type||'personal').toUpperCase()}</div>
      <div><strong>Email:</strong> ${profile.email||'-'}</div>
      <div><strong>Mobile:</strong> ${profile.mobile ? profile.mobile.replace(/^(\d{2})\d{6}(\d{2})$/, '$1••••••$2'):'-'}</div>
    `;
  }

  // Offers
  const offersWrap = $('#offers');
  const compareBtn = $('#compareBtn');
  const compareTableWrap = $('#compareTableWrap');
  const compareBody = $('#compareTable tbody');
  if(offersWrap){
    offersWrap.innerHTML = offers.map((o,i)=> `
      <div class="card offer">
        <div class="flex-between" style="display:flex;align-items:center;justify-content:space-between;">
          <h4>${o.bank}</h4>
          <label style="display:flex;align-items:center;gap:6px;font-size:.9rem;">
            <input type="checkbox" class="offer-check" data-idx="${i}"/> Compare
          </label>
        </div>
        <p class="muted">${o.perks ? o.perks : 'Pre-approved (subject to verification)'}</p>
        <div class="stats">
          <div class="stat"><span class="stat-label">Rate</span><span class="stat-value">${o.rate?o.rate+'%':'—'}</span></div>
          <div class="stat"><span class="stat-label">Max Amount</span><span class="stat-value">₹${fmtINR(o.max||0)}</span></div>
          <div class="stat"><span class="stat-label">Tenure</span><span class="stat-value">${o.tenure}</span></div>
          <div class="stat"><span class="stat-label">Est. EMI (₹5L/36m)</span><span class="stat-value">${o.emi?fmtINR(o.emi):'—'}</span></div>
        </div>
        <div class="actions">
          <a href="#" class="btn btn-primary">Apply Now</a>
          <a href="calculator.html" class="btn btn-ghost">Recalculate</a>
        </div>
      </div>
    `).join('');

    // Compare selection
    offersWrap.addEventListener('change', e=>{
      if(e.target.classList.contains('offer-check')){
        const selected = $$('.offer-check:checked').map(c=> +c.dataset.idx);
        compareBtn.disabled = selected.length < 2;
      }
    });

    compareBtn.addEventListener('click', ()=>{
      const idxs = $$('.offer-check:checked').map(c=> +c.dataset.idx);
      compareBody.innerHTML = idxs.map(i=>{
        const o = offers[i];
        return `<tr><td>${o.bank}</td><td>${o.rate?o.rate+'%':'—'}</td><td>₹${fmtINR(o.max||0)}</td><td>${o.tenure}</td><td>${o.emi?fmtINR(o.emi):'—'}</td></tr>`;
      }).join('');
      compareTableWrap.classList.remove('hidden');
      compareBtn.scrollIntoView({behavior:'smooth',block:'center'});
    });
  }

  // Tips
  const tips = $('#tips');
  if(tips){
    const list = [
      'Pay bills on time—payment history is crucial.',
      'Reduce credit utilization below 30%.',
      'Avoid multiple new credit applications at once.',
      'Keep older accounts open to build credit age.',
      'Check your report for errors and dispute if needed.'
    ];
    tips.innerHTML = list.map(t=> `<li>${t}</li>`).join('');
  }
})();

// --- Calculators ---
(function(){
  if(!location.pathname.endsWith('calculator.html')) return;

  // EMI
  const emiForm = $('#emiForm');
  const out = { emi: $('#emiOut'), interest: $('#emiInterest'), total: $('#emiTotal') };
  const chartEl = $('#emiChart');
  let emiChart;

  function calcEMI(P, annualRate, n){
    const r = (annualRate/12)/100;
    const emi = (P*r*Math.pow(1+r,n))/(Math.pow(1+r,n)-1);
    const total = emi*n;
    const interest = total - P;
    return { emi, total, interest };
  }

  function updateEMI(){
    const P = +$('#emiAmount').value;
    const R = +$('#emiRate').value;
    const N = +$('#emiMonths').value;
    const { emi, total, interest } = calcEMI(P,R,N);
    out.emi.textContent = '₹'+fmtINR(Math.round(emi));
    out.interest.textContent = '₹'+fmtINR(Math.round(interest));
    out.total.textContent = '₹'+fmtINR(Math.round(total));
    if(window.Chart && chartEl){
      if(emiChart) emiChart.destroy();
      emiChart = new Chart(chartEl.getContext('2d'),{
        type:'pie',
        data:{ labels:['Principal','Interest'], datasets:[{ data:[P, interest] }]},
        options:{ plugins:{ legend:{ position:'bottom' } } }
      });
    }
  }

  if(emiForm){
    emiForm.addEventListener('submit', e=>{ e.preventDefault(); updateEMI(); });
    updateEMI();
  }

  // Eligibility
  const eligForm = $('#eligForm');
  const eligEmi = $('#eligEmi');
  const eligAmt = $('#eligAmt');
  const eligChartEl = $('#eligChart');
  let eligChart;

  function updateEligibility(){
    const salary = +$('#eligSalary').value;
    const exp = +$('#eligExp').value;
    const type = $('#eligType').value;
    const disposable = Math.max(0, salary - exp);
    const allowedEMI = disposable * 0.4; // FOIR ~ 40%
    const rate = type==='home' ? 9.0 : type==='car' ? 10.5 : 14.0;
    const months = type==='home' ? 240 : type==='car' ? 84 : 60;
    // invert EMI formula to estimate loan amount
    const r = (rate/12)/100;
    const P = allowedEMI * (Math.pow(1+r,months)-1) / (r*Math.pow(1+r,months));

    eligEmi.textContent = '₹'+fmtINR(Math.round(allowedEMI));
    eligAmt.textContent = '₹'+fmtINR(Math.round(P));

    if(window.Chart && eligChartEl){
      if(eligChart) eligChart.destroy();
      eligChart = new Chart(eligChartEl.getContext('2d'),{
        type:'bar',
        data:{ labels:['Salary','Expenses','Eligible EMI'], datasets:[{ data:[salary, exp, allowedEMI] }]},
        options:{ plugins:{ legend:{display:false}}, scales:{ y:{ beginAtZero:true }} }
      });
    }
  }

  if(eligForm){
    eligForm.addEventListener('submit', e=>{ e.preventDefault(); updateEligibility(); });
    updateEligibility();
  }
})();

// Loan EMI Affordability
let donutChart, barChart;

function calculateEMI(P, r, n) {
  let monthlyRate = r / 12 / 100;
  return (P * monthlyRate * Math.pow(1 + monthlyRate, n)) /
         (Math.pow(1 + monthlyRate, n) - 1);
}

function updateGraphs() {
  let income = parseFloat(document.getElementById("income").value);
  let currentEmi = parseFloat(document.getElementById("currentEmi").value);
  let loanAmount = parseFloat(document.getElementById("loanAmount").value);
  let tenure = parseFloat(document.getElementById("tenure").value) * 12;
  let interestRate = parseFloat(document.getElementById("interestRate").value);

  let safeLimit = income * 0.4;
  let newLoanEMI = calculateEMI(loanAmount, interestRate, tenure);
  let totalEMI = currentEmi + newLoanEMI;

  let utilization = (totalEMI / income) * 100;
  let remainingIncome = income - totalEMI;

  let statusColor = utilization <= 40 ? "green" : utilization <= 50 ? "orange" : "red";
  let recommendation = utilization <= 40
    ? "✅ You can take an extra loan safely."
    : "⚠ Reduce EMI or choose longer tenure.";

  document.getElementById("insightsBox").innerHTML = `
    <h3 style="color:${statusColor}">EMI Utilization: ${utilization.toFixed(1)}%</h3>
    <p>Safe EMI Limit: ₹${safeLimit.toFixed(0)}</p>
    <p>Current EMI Total: ₹${totalEMI.toFixed(0)}</p>
    <p><b>Recommendation:</b> ${recommendation}</p>
  `;

  if (donutChart) donutChart.destroy();
  donutChart = new Chart(document.getElementById('donutChart'), {
    type: 'doughnut',
    data: {
      labels: ['Total EMI', 'Remaining Income'],
      datasets: [{
        data: [totalEMI, remainingIncome],
        backgroundColor: ['#00ff88', '#334155']
      }]
    },
    options: { responsive: true, plugins: { legend: { labels: { color: 'white' }}}}
  });

  if (barChart) barChart.destroy();
  barChart = new Chart(document.getElementById('barChart'), {
    type: 'bar',
    data: {
      labels: ['Safe Limit', 'Your EMI'],
      datasets: [{
        data: [safeLimit, totalEMI],
        backgroundColor: [safeLimit >= totalEMI ? 'green' : 'red', 'orange']
      }]
    },
    options: { responsive: true, plugins: { legend: { display: false }}, scales: { x: { ticks: { color: 'white' }}, y: { ticks: { color: 'white' }}}}
  });
}

updateGraphs();

document.querySelectorAll(".accordion-header").forEach(button => {
  button.addEventListener("click", () => {
    const content = button.nextElementSibling;

    // Close all other accordion items
    document.querySelectorAll(".accordion-content").forEach(item => {
      if (item !== content) {
        item.style.maxHeight = null;
        item.classList.remove("open");
      }
    });

    // Toggle current accordion
    if (content.style.maxHeight) {
      content.style.maxHeight = null;
      content.classList.remove("open");
    } else {
      content.style.maxHeight = content.scrollHeight + "px";
      content.classList.add("open");
    }
  });
});

// Mobile Navbar Toggle
const menuToggle = document.getElementById('menu-toggle');
const mobileNav = document.getElementById('mobile-nav');

if (menuToggle && mobileNav) {
  menuToggle.addEventListener('click', () => {
    mobileNav.classList.toggle('show');
  });
}

// Mobile menu toggle
const menuToggle2 = document.getElementById("menuToggle");
const nav = document.querySelector(".nav");

if (menuToggle2 && nav) {
  menuToggle2.addEventListener("click", () => {
    nav.classList.toggle("open");
  });
}
>>>>>>> 085537bd06f083e2d58f527b93cd476fb5dc02a7
