/* THADATHIL Family Hub - logic. Markup lives in index.html; JS only fills lists and handles data (localStorage). */
const K = 'thadathil_hub_v2',
    $ = (s, r = document) => r.querySelector(s),
    $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;'
} [c]));
const uid = () => Math.random().toString(36).slice(2, 9);
const fmtD = d => d ? new Date(d + 'T00:00').toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
}) : '';
const inr = n => '₹' + Number(n || 0).toLocaleString('en-IN');
const COL = {
    member: 'members',
    committee: 'committees',
    post: 'posts',
    meetup: 'meetups',
    program: 'programs',
    fin: 'fin',
    gallery: 'gallery'
};
const ICO = {
    Program: '🎤',
    Game: '🎯',
    Gift: '🎁',
    Prize: '🏆'
};
let PG = 'home',
    PID = '';

/* ---------- data ---------- */
function def() {
    return {
        family: {
            name: 'THADATHIL',
            tagline: '',
            est: '',
            by: '',
            logo: '',
            banner: ''
        },
        members: [],
        committees: [],
        posts: [],
        meetups: [],
        programs: [],
        fin: [],
        gallery: []
    }
}

function load() {
    // One-time clean start for this release: remove previous demo/personal data,
    // then continue using localStorage normally for data the family adds later.
    try {
        if (!localStorage.getItem('thadathil_clean_v1')) {
            localStorage.removeItem(K);
            localStorage.removeItem('thadathil_hub_v1');
            localStorage.removeItem('thadathil_start_hide');
            localStorage.setItem('thadathil_clean_v1', '1')
        }
    } catch (e) {}
    try {
        const s = JSON.parse(localStorage.getItem(K));
        if (s) return s
    } catch (e) {}
    const d = def();
    try {
        localStorage.setItem(K, JSON.stringify(d))
    } catch (e) {}
    return d
}
let S = load();

function save() {
    try {
        localStorage.setItem(K, JSON.stringify(S))
    } catch (e) {
        alert('Storage is full. Use smaller photos.')
    }
}

/* ---------- helpers ---------- */
const byId = id => S.members.find(m => m.id === id),
    mname = id => (S.meetups.find(m => m.id === id) || {}).title || '';
const ph = (m, c = 'av') => `<div class="${c}">${m.photo?`<img src="${m.photo}" alt="">`:esc((m.name||'?')[0]).toUpperCase()}</div>`;
const life = m => m.dob || m.dod ? `${(m.dob||'?').slice(0,4)}${m.dod?' – '+m.dod.slice(0,4):''}` : '';

function age(m) {
    if (!m.dob) return '';
    const e = m.dod ? new Date(m.dod) : new Date(),
        b = new Date(m.dob);
    let a = e.getFullYear() - b.getFullYear();
    if (e < new Date(e.getFullYear(), b.getMonth(), b.getDate())) a--;
    return a
}

function nextOcc(ds) {
    if (!ds) return null;
    const [y, m, d] = ds.split('-').map(Number), t = new Date();
    t.setHours(0, 0, 0, 0);
    let n = new Date(t.getFullYear(), m - 1, d);
    if (n < t) n = new Date(t.getFullYear() + 1, m - 1, d);
    return {
        date: n,
        days: Math.round((n - t) / 864e5),
        n: n.getFullYear() - y
    }
}
const iso = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`,
    inDays = d => d === 0 ? 'Today' : d === 1 ? 'Tomorrow' : `In ${d} days`,
    tc = t => String(t || '').toLowerCase().replace(/(^|\s)\S/g, c => c.toUpperCase()),
    inrS = n => (n < 0 ? '−' : '') + inr(Math.abs(n));

function celebs() {
    const o = [];
    S.members.forEach(m => {
        let x = !m.dod && nextOcc(m.dob);
        if (x) o.push({
            kind: 'birthday',
            m,
            ...x,
            label: `${m.name} turns ${x.n}`
        });
        x = nextOcc(m.ann);
        if (x && !m.dod) o.push({
            kind: 'anniversary',
            m,
            ...x,
            label: `${m.name}${m.spouse?' & '+m.spouse:''} · ${x.n} years`
        })
    });
    return o.sort((a, b) => a.days - b.days)
}
const empty = t => `<div class="empty">${t}</div>`;
const acts = (k, id, extra = '') => `<div class="acts">${extra}<button class="btn g s" onclick="openDlg('${k}','${id}')">Edit</button><button class="btn g s d" onclick="del('${k}','${id}')">Delete</button></div>`;

/* ---------- navigation ---------- */
function go(p, id) {
    PG = p;
    if (id) PID = id;
    $$('.page').forEach(s => s.hidden = s.id !== 'p-' + p);
    $$('#nav button').forEach(b => b.classList.toggle('on', b.dataset.p === (p === 'profile' ? 'family' : p)));
    window.scrollTo(0, 0);
    renderAll()
}
$('#nav').onclick = e => {
    const b = e.target.closest('button');
    if (b) go(b.dataset.p)
};

/* ---------- generic dialogs (fields live in index.html) ---------- */
const SRC = {
    members: () => [...S.members].sort((a, b) => (a.gen - b.gen) || a.name.localeCompare(b.name)).map(m => [m.id, `${m.name} (G${m.gen})`]),
    meetups: () => S.meetups.map(m => [m.id, m.title]),
    committees: () => S.committees.map(c => [c.id, c.name])
};

function openDlg(k, id) {
    const d = $('#d-' + k),
        f = $('form', d);
    f.reset();
    $$('select[data-src]', f).forEach(s => s.innerHTML = (s.dataset.blank !== undefined ? `<option value="">${s.dataset.blank}</option>` : '') + SRC[s.dataset.src]().map(([v, t]) => `<option value="${v}">${esc(t)}</option>`).join(''));
    $$('datalist', f).forEach(l => l.innerHTML = (l.id === 'dl-mem' ? S.members.map(m => m.name) : [...new Set(S.gallery.map(g => g.album))]).map(v => `<option value="${esc(v)}">`).join(''));
    const it = k === 'family' ? S.family : id ? S[COL[k]].find(x => x.id === id) : {};
    for (const el of f.elements) {
        if (!el.name) continue;
        if (el.type === 'checkbox') el.checked = !!it[el.name];
        else el.value = it[el.name] ?? (el.tagName === 'SELECT' ? el.value : '')
    }
    $$('.pv', f).forEach(p => {
        const v = it[p.dataset.f];
        p.src = v || '';
        p.style.display = v ? 'block' : 'none'
    });
    d.showModal()
}
document.addEventListener('click', e => {
    if (e.target.matches('[data-close]')) e.target.closest('dialog').close()
});
document.addEventListener('change', async e => {
    const t = e.target;
    if (t.matches('input[data-to]') && t.files[0]) {
        const f = t.form,
            v = await shrink(t.files[0], +t.dataset.max || 600, .82, !!t.dataset.sq);
        f.elements[t.dataset.to].value = v;
        const p = $(`.pv[data-f="${t.dataset.to}"]`, f);
        p.src = v;
        p.style.display = 'block'
    }
});
document.addEventListener('submit', e => {
    const f = e.target.closest('form[data-k]');
    if (!f) return;
    e.preventDefault();
    const k = f.dataset.k,
        d = {};
    for (const el of f.elements) {
        if (!el.name || el.type === 'file') continue;
        d[el.name] = el.type === 'checkbox' ? el.checked : el.value
    }
    if (k === 'family') Object.assign(S.family, d);
    else {
        const arr = S[COL[k]],
            id = d.id;
        delete d.id;
        let it;
        if (id) {
            it = arr.find(x => x.id === id);
            Object.assign(it, d)
        } else {
            it = {
                id: uid(),
                ...d
            };
            arr.push(it)
        }
        if (k === 'committee' && it.cur) S.committees.forEach(c => {
            if (c !== it) c.cur = false
        })
    }
    save();
    f.closest('dialog').close();
    renderAll()
});

function del(k, id) {
    if (!confirm('Delete this entry?')) return;
    const c = COL[k];
    S[c] = S[c].filter(x => x.id !== id);
    if (k === 'committee') S.posts = S.posts.filter(p => p.cid !== id);
    if (k === 'meetup') S.programs = S.programs.filter(p => p.mid !== id);
    if (k === 'member') S.members.forEach(m => {
        if (m.father === id) m.father = '';
        if (m.mother === id) m.mother = ''
    });
    save();
    if (PG === 'profile') go('family');
    else renderAll()
}

function shrink(file, max, q, sq) {
    return new Promise(res => {
        const r = new FileReader();
        r.onload = () => {
            const i = new Image();
            i.onload = () => {
                const c = document.createElement('canvas'),
                    g = c.getContext('2d');
                if (sq) {
                    const n = Math.min(i.width, i.height);
                    c.width = c.height = max;
                    g.drawImage(i, (i.width - n) / 2, (i.height - n) / 2, n, n, 0, 0, max, max)
                } else {
                    const k = Math.min(1, max / Math.max(i.width, i.height));
                    c.width = i.width * k;
                    c.height = i.height * k;
                    g.drawImage(i, 0, 0, c.width, c.height)
                }
                res(c.toDataURL('image/jpeg', q))
            };
            i.src = r.result
        };
        r.readAsDataURL(file)
    })
}
$('#bn').onchange = async e => {
    if (e.target.files[0]) {
        S.family.banner = await shrink(e.target.files[0], 1400, .75);
        save();
        renderAll()
    }
};

/* ---------- renderers ---------- */
function renderAll() {
    rBrand();
    rHome();
    rFamily();
    rProfile();
    rCommittee();
    rMeetups();
    rPrograms();
    rFin();
    rCel();
    rGallery();
    if (PG === 'poster') fillItems(true)
}

function rBrand() {
    const f = S.family;
    $('#hname').textContent = f.name;
    $('#htag').textContent = f.tagline;
    if (f.logo) $('#logo').innerHTML = `<img src="${f.logo}" alt="${esc(f.name)} logo">`;
    document.title = f.name + ' Family Hub';
    $('#foot-name').textContent = `${tc(f.name)} Family Hub`;
    $('#foot-year').textContent = String(new Date().getFullYear());
    $('#foot-credit').textContent = f.by ? `Created by ${f.by}` : 'A place to connect, remember and celebrate'
}

function hideStart() {
    try {
        localStorage.setItem('thadathil_start_hide', '1')
    } catch (e) {}
    rHome()
}

function rHome() {
    const f = S.family,
        n = S.members.length,
        g = Math.max(0, ...S.members.map(m => +m.gen || 0)),
        inc = S.fin.filter(x => x.type !== 'Expense').reduce((a, x) => a + +x.amt, 0),
        ex = S.fin.filter(x => x.type === 'Expense').reduce((a, x) => a + +x.amt, 0);
    /* hero */
    $('#hero-t').textContent = `The ${tc(f.name)} family`;
    $('#hero-tag').textContent = f.tagline || '';
    $('#hero-s').textContent = n ? `${n} member${n>1?'s':''} across ${g} generation${g>1?'s':''}${f.est?', together since '+f.est:''}.` : 'Start by adding your eldest family member, then build the tree from there.';
    const im = $('#hero-img');
    im.hidden = !f.banner;
    if (f.banner) im.src = f.banner;
    else im.removeAttribute('src');
    /* first-run checklist */
    const done = {
        members: n > 0,
        logo: !!f.logo,
        banner: !!f.banner,
        committee: S.posts.some(p => p.person),
        meetup: S.meetups.length > 0,
        gallery: S.gallery.length > 0
    };
    $$('#home-start [data-step]').forEach(li => li.classList.toggle('done', !!done[li.dataset.step]));
    const dn = Object.values(done).filter(Boolean).length;
    $('#start-n').textContent = `${dn} of 6 done`;
    let hid = false;
    try {
        hid = localStorage.getItem('thadathil_start_hide') === '1'
    } catch (e) {}
    $('#home-start').hidden = hid || dn === 6;
    /* numbers that open their page */
    $('#home-stats').innerHTML = [
        [n, 'Members', 'family'],
        [g, 'Generations', 'family'],
        [S.meetups.length, 'Meetups', 'meetups'],
        [S.programs.length, 'Programs and games', 'programs'],
        [S.gallery.length, 'Drive albums', 'gallery']
    ].map(([a, b, p]) => `<button class="fig" onclick="go('${p}')"><b>${a}</b><span>${b}</span></button>`).join('');
    /* next meetup */
    const today = iso(new Date()),
        t0 = new Date(today + 'T00:00'),
        nx = S.meetups.filter(m => m.date >= today).sort((a, b) => a.date.localeCompare(b.date))[0],
        box = $('#home-next');
    box.className = 'next' + (nx ? '' : ' is-empty');
    if (nx) {
        const d = new Date(nx.date + 'T00:00'),
            left = Math.round((d - t0) / 864e5),
            meta = [nx.time && esc(nx.time), nx.venue && esc(nx.venue)].filter(Boolean).join(', ');
        box.innerHTML = `<div class="dcal"><small>${d.toLocaleDateString('en-IN',{month:'short',year:'numeric'})}</small><b>${d.getDate()}</b><span>${d.toLocaleDateString('en-IN',{weekday:'long'})}</span></div>
  <div class="nx-body"><div class="nx-top"><span>Next meetup</span><span class="tag gold">${inDays(left)}</span></div><h3>${esc(nx.title)}</h3>${meta?`<p class="nx-meta">${meta}</p>`:''}${nx.purpose?`<p>${esc(nx.purpose)}</p>`:''}
  <div class="acts"><button class="btn s" onclick="go('programs')">Programs</button><button class="btn g s" onclick="toPoster('meetup','${nx.id}')">Make poster</button><button class="btn g s" onclick="openDlg('meetup','${nx.id}')">Edit</button></div></div>`
    } else box.innerHTML = `<div class="nx-body"><div class="nx-top"><span>Next meetup</span></div><h3>No meetup planned yet</h3><p>Choose a date, venue and purpose. Programs, prizes and the poster follow from it.</p><div class="acts"><button class="btn" onclick="go('meetups');openDlg('meetup')">Plan a meetup</button></div></div>`;
    /* birthdays and anniversaries */
    const c = celebs().slice(0, 5);
    $('#home-cel').innerHTML = c.length ? c.map(x => `<div class="li"><div class="dchip"><b>${x.date.getDate()}</b><small>${x.date.toLocaleDateString('en-IN',{month:'short'})}</small></div><div class="t"><b>${esc(x.label)}</b><span>${x.kind==='birthday'?'Birthday':'Anniversary'}</span></div><span class="ind${x.days===0?' now':''}">${inDays(x.days)}</span></div>`).join('') : '<p class="mut">Add dates of birth and wedding anniversaries to members and they show up here.</p>';
    /* committee */
    const cur = S.committees.find(x => x.cur),
        ps = cur ? S.posts.filter(p => p.cid === cur.id) : [];
    $('#home-com-t').textContent = cur ? `${cur.name}${cur.term?', '+cur.term:''}` : '';
    $('#home-com').innerHTML = ps.length ? ps.slice(0, 7).map(p => `<div class="kv"><span>${esc(p.role)}</span><b>${esc(p.person)||'Not assigned'}</b></div>`).join('') : '<p class="mut">No current committee yet.</p><div class="acts"><button class="btn g s" onclick="go(\'committee\');openDlg(\'committee\')">Create committee</button></div>';
    /* family fund */
    const pct = inc > 0 ? Math.min(100, Math.round(ex / inc * 100)) : 0;
    $('#home-fin').innerHTML = S.fin.length ? `<div class="bal">${inrS(inc-ex)}</div><div class="mut">Balance</div><span class="bar" role="img" aria-label="Spent ${pct}% of income"><i style="width:${pct}%"></i></span><div class="bar-l">${pct}% of income spent</div><div class="kv"><span>Income</span><b class="in-c">${inr(inc)}</b></div><div class="kv"><span>Expense</span><b class="out-c">${inr(ex)}</b></div>` : '<p class="mut">Record contributions, sponsors and expenses to see the balance here.</p><div class="acts"><button class="btn g s" onclick="go(\'fin\');openDlg(\'fin\')">Add entry</button></div>';
    /* family faces */
    const fm = [...S.members].sort((a, b) => (a.gen - b.gen) || a.name.localeCompare(b.name)).slice(0, 8);
    $('#home-fam').innerHTML = fm.length ? `<div class="faces">${fm.map(m=>`<button class="face" onclick="go('profile','${m.id}')" title="${esc(m.name)}">${ph(m)}<span>${esc(m.name.split(' ')[0])}</span></button>`).join('')}</div>${n>8?`<p class="mut" style="margin:14px 0 0">and ${n-8} more in the family tree</p>`:''}` : '<p class="mut">Add the eldest member first. Children join the tree when you pick their father and mother.</p><div class="acts"><button class="btn g s" onclick="openDlg(\'member\')">Add first member</button></div>'
}

/* family tree + members */
function spouseOf(m) {
    const c = S.members.find(x => x.father === m.id && byId(x.mother));
    if (c) return byId(c.mother);
    const d = S.members.find(x => x.mother === m.id && byId(x.father));
    return d ? byId(d.father) : null
}

function kidsOf(m) {
    return S.members.filter(c => c.father === m.id || (!c.father && c.mother === m.id))
}

function tnode(m, d = 0) {
    if (d > 8) return '';
    const sp = spouseOf(m),
        k = kidsOf(m);
    return `<li><div class="tn" onclick="go('profile','${m.id}')">${ph(m)}<span><b>${esc(m.name)}</b><small>G${m.gen} ${life(m)}</small></span>${sp?`<span class="amp">&</span>${ph(sp)}<span><b>${esc(sp.name)}</b><small>${life(sp)}</small></span>`:m.spouse?`<span class="amp">&</span>${m.sphoto?`<div class="av"><img src="${m.sphoto}" alt=""></div>`:''}<span><b>${esc(m.spouse)}</b></span>`:''}</div>${k.length?`<ul>${k.map(c=>tnode(c,d+1)).join('')}</ul>`:''}</li>`
}

function rFamily() {
    const f = S.family;
    $('#fam-t').textContent = `${f.name} family`;
    $('#fam-s').textContent = `${f.tagline}${f.est?' · Since '+f.est:''} · Created by ${f.by}`;
    const married = m => !m.father && !m.mother && S.members.some(c => c.mother === m.id && byId(c.father));
    const roots = S.members.filter(m => !byId(m.father) && !byId(m.mother) && !married(m)).sort((a, b) => a.gen - b.gen);
    $('#tree').innerHTML = roots.length ? roots.map(r => `<div class="card branch"><h3>${esc(r.name.split(' ')[0])} branch</h3><div class="tree"><ul>${tnode(r)}</ul></div></div>`).join('') : empty('Add the eldest family member first, then add children by choosing their father and mother.');
    const gf = $('#gen-f').value,
        l = S.members.filter(m => !gf || m.gen === gf).sort((a, b) => (a.gen - b.gen) || a.name.localeCompare(b.name));
    $('#members').innerHTML = l.length ? l.map(m => `<div class="card"><div class="mem">${ph(m)}<div><h3><a href="#" onclick="go('profile','${m.id}');return false">${esc(m.name)}</a></h3><span class="tag">Gen ${m.gen}</span>${m.dod?' <span class="tag mute">In memory</span>':''}</div></div>
 <p class="mut" style="margin:10px 0 0">${m.job?'💼 '+esc(m.job)+'<br>':''}${m.edu?'🎓 '+esc(m.edu)+'<br>':''}${m.dob?'🎂 '+fmtD(m.dob):''}${m.phone?'<br>📞 '+esc(m.phone):''}</p>${acts('member',m.id,`<button class="btn g s" onclick="go('profile','${m.id}')">Profile</button>`)}</div>`).join('') : empty('No members here yet.')
}

/* complete profile with auto-fetched grandparents */
function rProfile() {
    const m = byId(PID),
        el = $('#profile');
    if (!m) {
        el.innerHTML = empty('Choose a member from the Family page.');
        return
    }
    const f = byId(m.father),
        mo = byId(m.mother),
        ch = l => l.map(x => `<a class="chip" href="#" onclick="go('profile','${x.id}');return false">${esc(x.name)}</a>`).join('') || '—';
    const gp = [
        [f && byId(f.father), 'Paternal grandfather'],
        [f && byId(f.mother), 'Paternal grandmother'],
        [mo && byId(mo.father), 'Maternal grandfather'],
        [mo && byId(mo.mother), 'Maternal grandmother']
    ].filter(x => x[0]);
    const sib = S.members.filter(s => s.id !== m.id && ((m.father && s.father === m.father) || (m.mother && s.mother === m.mother))),
        kids = S.members.filter(c => c.father === m.id || c.mother === m.id),
        sp = spouseOf(m);
    const dl = (a, b) => b ? `<div><small>${a}</small><b>${b}</b></div>` : '';
    el.innerHTML = `<div class="card pf-top">${m.photo?`<img class="pf-ph" src="${m.photo}" alt="">`:`<div class="pf-ph ph">${esc(m.name[0]).toUpperCase()}</div>`}
 <div><span class="tag">Generation ${m.gen}</span>${m.dod?' <span class="tag mute">In loving memory</span>':''}<h2 style="margin:6px 0">${esc(m.name)}</h2><p class="mut">${life(m)}${age(m)!==''?` · ${m.dod?'lived '+age(m)+' years':'age '+age(m)}`:''}</p>${m.about?`<p>${esc(m.about)}</p>`:''}
 <div class="acts"><button class="btn g s" onclick="openDlg('member','${m.id}')">Edit</button>${m.dob&&!m.dod?`<button class="btn g s" onclick="toPoster('birthday','${m.id}')">Birthday poster</button>`:''}${m.ann?`<button class="btn g s" onclick="toPoster('anniversary','${m.id}')">Anniversary poster</button>`:''}</div></div></div>
 <div class="card dl" style="margin-top:16px">${dl('Education',esc(m.edu))}${dl('Job',esc(m.job))}${dl('Date of birth',fmtD(m.dob))}${dl('Date of death',fmtD(m.dod))}${dl('Phone',esc(m.phone))}${dl('Place',esc(m.place))}${dl('Wedding anniversary',fmtD(m.ann))}${dl('Siblings (listed)',esc(m.sibs))}</div>
 <div class="card" style="margin-top:16px"><h3>Family connections</h3>
 <div class="kv"><span>Father</span><b>${f?ch([f]):'—'}</b></div><div class="kv"><span>Mother</span><b>${mo?ch([mo]):'—'}</b></div>
 <div class="kv"><span>Spouse</span><b>${sp?ch([sp]):esc(m.spouse)||'—'}</b></div>
 <div class="kv"><span>Siblings (in tree)</span><b>${ch(sib)}</b></div><div class="kv"><span>Children</span><b>${ch(kids)}</b></div></div>
 <div class="card" style="margin-top:16px"><h3>Grandparents <small class="mut">(fetched automatically from parents)</small></h3>${gp.length?gp.map(([g,t])=>`<div class="kv"><span>${t}</span><b>${ch([g])}</b></div>`).join(''):'<p class="mut">Set this member\'s father and mother (and their parents) to see grandparents here.</p>'}</div>`
}

/* committees */
function comBlock(c) {
    const ps = S.posts.filter(p => p.cid === c.id);
    return `<div class="com-head"><div><h3>${esc(c.name)}</h3><span class="mut">${esc(c.term)}</span></div>${acts('committee',c.id)}</div>
 <div class="grid">${ps.map(p=>`<div class="card role"><h3>${esc(p.role)}</h3><p style="margin:6px 0 0;font-weight:800">${esc(p.person)||'<span class="mut">Not assigned</span>'}</p><p class="mut">${p.phone?'📞 '+esc(p.phone):''}</p>${acts('post',p.id)}</div>`).join('')||empty('No posts yet.')}</div>`
}

function rCommittee() {
    const cur = S.committees.filter(c => c.cur),
        prev = S.committees.filter(c => !c.cur);
    $('#com-cur').innerHTML = cur.length ? cur.map(c => `<div class="card cur">${comBlock(c)}</div>`).join('') : empty('No current committee. Create one and tick "current".');
    $('#com-prev').innerHTML = prev.length ? prev.map(c => `<details class="card"><summary>${esc(c.name)} <span class="mut">${esc(c.term)} · ${S.posts.filter(p=>p.cid===c.id).length} posts</span></summary>${comBlock(c)}</details>`).join('') : '<p class="mut">Older committees (1st, 2nd...) appear here.</p>'
}

function rMeetups() {
    $('#meet-list').innerHTML = S.meetups.length ? [...S.meetups].sort((a, b) => b.date.localeCompare(a.date)).map(m => `<div class="card mt"><h3>${esc(m.title)}</h3><p class="mut">📅 ${fmtD(m.date)} ${esc(m.time)}<br>📍 ${esc(m.venue)}</p><p><b>Purpose:</b> ${esc(m.purpose)}</p><p class="mut">${S.programs.filter(p=>p.mid===m.id).length} programs, games &amp; gifts planned</p>${acts('meetup',m.id,`<button class="btn g s" onclick="$('#prog-f').value='${m.id}';go('programs')">Programs</button><button class="btn g s" onclick="toPoster('meetup','${m.id}')">Poster</button>`)}</div>`).join('') : empty('No meetups yet. Plan the first gathering.')
}

function rPrograms() {
    const sel = $('#prog-f'),
        v = sel.value;
    sel.innerHTML = '<option value="">All meetups</option>' + S.meetups.map(m => `<option value="${m.id}">${esc(m.title)}</option>`).join('');
    sel.value = S.meetups.some(m => m.id === v) ? v : '';
    const ms = S.meetups.filter(m => !sel.value || m.id === sel.value).sort((a, b) => b.date.localeCompare(a.date));
    $('#prog-list').innerHTML = ms.length ? ms.map(m => {
        const ps = S.programs.filter(p => p.mid === m.id);
        return `<div class="grp"><h3>${esc(m.title)}</h3><span class="mut">${fmtD(m.date)}</span></div><div class="grid">${ps.map(p=>`<div class="card"><span class="tag">${ICO[p.cat]} ${p.cat}</span><h3 style="font-size:19px;margin-top:8px">${esc(p.title)}</h3><p class="mut">${p.time?'🕙 '+esc(p.time):''}${p.incharge?' · In charge: '+esc(p.incharge):''}</p>${p.details?`<p>${esc(p.details)}</p>`:''}${p.reward?`<p><b>🏆 Prize / gift:</b> ${esc(p.reward)}</p>`:''}${p.sponsor?`<p class="mut">Sponsored by ${esc(p.sponsor)}</p>`:''}${acts('program',p.id)}</div>`).join('')||empty('Nothing added for this meetup yet.')}</div>`
    }).join('') : empty('Plan a meetup first, then add its programs, games, prizes and gifts here.')
}

function rFin() {
    const inc = S.fin.filter(f => f.type !== 'Expense').reduce((a, f) => a + +f.amt, 0),
        sp = S.fin.filter(f => f.type === 'Sponsor').reduce((a, f) => a + +f.amt, 0),
        ex = S.fin.filter(f => f.type === 'Expense').reduce((a, f) => a + +f.amt, 0);
    $('#fin-stats').innerHTML = [
        [inc, 'Total income', 'in-c'],
        [ex, 'Total expense', 'out-c'],
        [inc - ex, 'Balance', ''],
        [sp, 'From sponsors', '']
    ].map(([a, b, c]) => `<div class="card stat"><b class="${c}">${inr(a)}</b><span>${b}</span></div>`).join('');
    $('#fin-body').innerHTML = S.fin.length ? [...S.fin].sort((a, b) => b.date.localeCompare(a.date)).map(f => `<tr><td>${fmtD(f.date)}</td><td>${f.type}</td><td>${esc(f.title)}<div class="mut">${esc(f.note)}</div></td><td>${esc(mname(f.mid))||'General'}</td><td class="${f.type==='Expense'?'out-c':'in-c'}">${f.type==='Expense'?'−':'+'}${inr(f.amt)}</td><td style="white-space:nowrap"><button class="btn g s" onclick="openDlg('fin','${f.id}')">Edit</button> <button class="btn g s d" onclick="del('fin','${f.id}')">✕</button></td></tr>`).join('') : '<tr><td colspan="6" class="mut">No entries yet.</td></tr>'
}

function rCel() {
    const c = celebs();
    $('#cel-list').innerHTML = c.length ? c.map(x => `<div class="card cel"><div><span class="tag">${x.kind==='birthday'?'🎂 Birthday':'💍 Anniversary'}</span><h3 style="font-size:18px;margin-top:6px">${esc(x.label)}</h3><div class="mut">${fmtD(iso(x.date))}</div><button class="btn g s" style="margin-top:8px" onclick="toPoster('${x.kind}','${x.m.id}')">Make poster</button></div><div class="days">${x.days===0?'🎉':x.days}<small>${x.days===0?'today':'days'}</small></div></div>`).join('') : empty('Add dates of birth and anniversaries to members.')
}

function rGallery() {
    const sel = $('#gal-f'),
        v = sel.value,
        al = [...new Set(S.gallery.map(g => g.album))];
    sel.innerHTML = '<option value="">All albums</option>' + al.map(a => `<option>${esc(a)}</option>`).join('');
    sel.value = al.includes(v) ? v : '';
    const l = S.gallery.filter(g => !sel.value || g.album === sel.value);
    $('#gal-list').innerHTML = l.length ? l.map(g => `<div class="card drive"><div class="d-ico">📁</div><span class="tag">${esc(g.album)}</span><h3 style="font-size:19px">${esc(g.title)}</h3>${g.note?`<p class="mut">${esc(g.note)}</p>`:''}<a class="btn s" href="${esc(g.link)}" target="_blank" rel="noopener noreferrer">Open in Google Drive ↗</a>${acts('gallery',g.id)}</div>`).join('') : empty('No albums yet. Paste a Google Drive folder link to add one.')
}

/* ---------- poster studio ---------- */
const TH = [
    ['Backwater green', '#0e4d38', '#093626'],
    ['Royal blue', '#1560a8', '#0f4c8a'],
    ['Navy', '#0e2f5a', '#08203f'],
    ['Maroon', '#8a1c2b', '#5e1120'],
    ['Purple', '#5a2d9c', '#3d1d70']
];

function toPoster(t, id) {
    $('#pz-type').value = t;
    go('poster');
    fillItems(false, id)
}

function fillItems(keep, pick) {
    const t = $('#pz-type').value,
        s = $('#pz-item'),
        v = pick || (keep && s.value),
        l = t === 'meetup' ? S.meetups.map(m => [m.id, m.title]) : S.members.filter(m => t === 'birthday' ? m.dob && !m.dod : m.ann).map(m => [m.id, m.name]);
    s.innerHTML = l.map(([a, b]) => `<option value="${a}">${esc(b)}</option>`).join('') || '<option value="">— nothing available —</option>';
    if (v && l.some(x => x[0] === v)) s.value = v;
    draw()
}
const L = src => new Promise(r => {
    if (!src) return r(null);
    const i = new Image();
    i.onload = () => r(i);
    i.onerror = () => r(null);
    i.src = src
});

function wrap(x, t, cx, y, w, lh, max) {
    const ws = String(t || '').split(' ');
    let l = '',
        n = 0;
    for (const q of ws) {
        const tt = l + q + ' ';
        if (x.measureText(tt).width > w && l) {
            if (++n >= max) {
                x.fillText(l.trim() + '…', cx, y);
                return y + lh
            }
            x.fillText(l.trim(), cx, y);
            y += lh;
            l = q + ' '
        } else l = tt
    }
    x.fillText(l.trim(), cx, y);
    return y + lh
}

function heart(x, cx, cy, s) {
    x.beginPath();
    x.moveTo(cx, cy + s * .35);
    x.bezierCurveTo(cx - s, cy - s * .3, cx - s * .5, cy - s, cx, cy - s * .4);
    x.bezierCurveTo(cx + s * .5, cy - s, cx + s, cy - s * .3, cx, cy + s * .35);
    x.fill()
}

function spark(x, cx, cy, r) {
    x.beginPath();
    x.moveTo(cx, cy - r);
    x.quadraticCurveTo(cx, cy, cx + r, cy);
    x.quadraticCurveTo(cx, cy, cx, cy + r);
    x.quadraticCurveTo(cx, cy, cx - r, cy);
    x.quadraticCurveTo(cx, cy, cx, cy - r);
    x.fill()
}

function dots(x, x0, y0, c, r, g) {
    for (let i = 0; i < c; i++)
        for (let j = 0; j < r; j++) {
            x.beginPath();
            x.arc(x0 + i * g, y0 + j * g, 4.5, 0, 7);
            x.fill()
        }
}

function deco(x, F) {
    x.fillStyle = F;
    x.strokeStyle = F;
    [
        [155, 158, 44],
        [212, 130, 20],
        [193, 186, 14],
        [922, 920, 50],
        [885, 890, 18],
        [866, 943, 20],
        [957, 343, 16],
        [122, 737, 16]
    ].forEach(a => spark(x, ...a));
    dots(x, 858, 14, 8, 2, 29);
    dots(x, 1007, 102, 3, 5, 29);
    dots(x, 14, 858, 3, 5, 29);
    dots(x, 14, 1005, 8, 2, 29);
    x.lineWidth = 2.5;
    x.beginPath();
    x.moveTo(122, 330);
    x.lineTo(122, 735);
    x.moveTo(957, 360);
    x.lineTo(957, 748);
    x.stroke()
}

function rsq(x, i, px, py, s, ch) {
    const r = s * .09;
    x.save();
    x.beginPath();
    x.roundRect(px, py, s, s, r);
    x.clip();
    if (i) {
        const k = Math.max(s / i.width, s / i.height);
        x.drawImage(i, px + s / 2 - i.width * k / 2, py + s / 2 - i.height * k / 2, i.width * k, i.height * k)
    } else {
        x.fillStyle = '#ffffff30';
        x.fillRect(px, py, s, s);
        x.fillStyle = '#fff';
        x.font = `800 ${s*.45}px "Playfair Display",serif`;
        x.textAlign = 'center';
        x.fillText(ch, px + s / 2, py + s * .65)
    }
    x.restore();
    x.strokeStyle = '#fff';
    x.lineWidth = 14;
    x.beginPath();
    x.roundRect(px - 7, py - 7, s + 14, s + 14, r + 7);
    x.stroke()
}
async function draw() {
    const cv = $('#cv');
    if (!cv) return;
    const x = cv.getContext('2d');
    try {
        await Promise.all([document.fonts.load('100px "Great Vibes"'), document.fonts.load('800 40px "Playfair Display"'), document.fonts.load('800 30px "Nunito Sans"')])
    } catch (e) {}
    const W = 1080,
        C = 540,
        T = TH[+$('#pz-theme').value || 0],
        ty = $('#pz-type').value,
        id = $('#pz-item').value,
        F = '#fff',
        SER = '"Playfair Display",Georgia,serif',
        SAN = '"Nunito Sans",Arial,sans-serif',
        SCR = '"Great Vibes","Brush Script MT",cursive',
        handle = S.family.handle || ('@' + S.family.name.toLowerCase().replace(/\s+/g, '') + '_family');
    const g = x.createLinearGradient(0, 0, W, W);
    g.addColorStop(0, T[1]);
    g.addColorStop(1, T[2]);
    x.fillStyle = g;
    x.fillRect(0, 0, W, W);
    deco(x, F);
    const tx = (t, y, f, sp, cx = C) => {
        x.font = f;
        x.fillStyle = F;
        x.textAlign = 'center';
        x.fillText(sp ? t.split('').join(' ') : t, cx, y)
    };
    const fs = (t, f, st, w) => {
        x.font = `${f} ${st}px ${SER}`;
        return Math.min(st, st * w / x.measureText(t).width)
    };
    const script = (t, y, w, max) => {
        x.font = `${max}px ${SCR}`;
        tx(t, y, `${Math.min(max,max*w/x.measureText(t).width)}px ${SCR}`)
    };
    const lines = (y1, y2, a = 320, b = 760) => {
        x.strokeStyle = F;
        x.lineWidth = 2;
        x.beginPath();
        x.moveTo(a, y1);
        x.lineTo(b, y1);
        x.moveTo(a, y2);
        x.lineTo(b, y2);
        x.stroke()
    };
    const m = ty === 'meetup' ? S.meetups.find(q => q.id === id) : byId(id),
        foot = () => tx(handle, 1040, '600 26px ' + SAN, 1);
    if (!m) {
        tx('Add details to create this poster', 540, '700 34px ' + SAN);
        foot();
        return
    }
    if (ty === 'birthday') {
        const i = await L(m.photo),
            o = nextOcc(m.dob);
        tx('HAPPY', 140, '800 36px ' + SAN, 1);
        rsq(x, i, 298, 328, 462, m.name[0].toUpperCase());
        script('Birthday', 335, 600, 240);
        lines(838, 935);
        tx(m.name, 905, `${fs(m.name,400,56,400)}px ${SER}`.replace(/^/, '400 '));
        if (o) tx(`Turning ${o.n} · ${o.date.toLocaleDateString('en-IN',{day:'numeric',month:'long'})}`, 988, '600 28px ' + SAN)
    } else if (ty === 'anniversary') {
        const [a, b] = await Promise.all([L(m.photo), L(m.sphoto)]), o = nextOcc(m.ann);
        tx('HAPPY', 140, '800 36px ' + SAN, 1);
        rsq(x, a, 160, 345, 360, m.name[0].toUpperCase());
        rsq(x, b, 560, 345, 360, (m.spouse || '?')[0].toUpperCase());
        x.fillStyle = T[1];
        x.beginPath();
        x.arc(540, 525, 54, 0, 7);
        x.fill();
        x.strokeStyle = F;
        x.lineWidth = 5;
        x.stroke();
        x.fillStyle = F;
        heart(x, 540, 528, 34);
        script('Anniversary', 335, 680, 240);
        const nm = m.name + (m.spouse ? ' & ' + m.spouse : '');
        lines(790, 905, 240, 840);
        tx(nm, 862, `400 ${fs(nm,400,54,560)}px ${SER}`);
        if (o) {
            tx(`${o.n} Years of Togetherness`, 960, '700 30px ' + SAN);
            tx(o.date.toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'long'
            }), 1000, '600 24px ' + SAN)
        }
    } else {
        const pr = S.programs.filter(p => p.mid === m.id && p.cat === 'Program').slice(0, 4),
            d = new Date(m.date + 'T00:00');
        tx(`${S.family.name} FAMILY`, 140, '800 34px ' + SAN, 1);
        script('Family Meetup', 335, 640, 240);
        x.fillStyle = '#ffffff1c';
        x.beginPath();
        x.roundRect(150, 365, 780, 390, 40);
        x.fill();
        x.strokeStyle = F;
        x.lineWidth = 8;
        x.stroke();
        tx(String(d.getDate()), 560, '400 170px ' + SER, 0, 335);
        tx(d.toLocaleDateString('en-IN', {
            month: 'short',
            year: 'numeric'
        }).toUpperCase(), 615, '800 30px ' + SAN, 1, 335);
        tx(m.time || '', 668, '700 30px ' + SAN, 0, 335);
        if (m.venue) tx(m.venue, 718, `600 ${fs(m.venue,600,26,300)}px ${SER}`, 0, 335);
        x.strokeStyle = '#ffffff88';
        x.lineWidth = 2;
        x.beginPath();
        x.moveTo(520, 410);
        x.lineTo(520, 710);
        x.stroke();
        x.textAlign = 'left';
        x.fillStyle = F;
        if (pr.length) {
            x.font = '800 24px ' + SAN;
            x.fillText('P R O G R A M M E', 565, 425);
            pr.forEach((p, k) => {
                x.font = '700 28px ' + SAN;
                x.fillText(`${p.time?p.time+' · ':''}${p.title}`, 565, 490 + k * 62, 340)
            })
        } else {
            x.font = 'italic 600 30px ' + SER;
            wrap(x, m.purpose || '', 565, 440, 340, 44, 6)
        }
        x.textAlign = 'center';
        const big = (x.font = `400 48px ${SER}`, x.measureText(m.title).width > 440);
        lines(805, 935);
        x.font = `400 48px ${SER}`;
        wrap(x, m.title, C, big ? 860 : 882, 440, 56, 2);
        if (pr.length && m.purpose) {
            x.font = 'italic 600 26px ' + SER;
            wrap(x, m.purpose, C, 988, 760, 34, 1)
        }
    }
    foot()
}
$('#pz-dl').onclick = () => {
    const a = document.createElement('a');
    a.download = `${S.family.name}-${$('#pz-type').value}-poster.png`;
    a.href = $('#cv').toDataURL('image/png');
    a.click()
};

/* ---------- theme toggle + start ---------- */
(function() {
    const d = document.documentElement;
    try {
        const t = localStorage.getItem('thadathil_theme');
        if (t) d.dataset.theme = t
    } catch (e) {}
    $('#tgl').onclick = () => {
        const dark = d.dataset.theme ? d.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches,
            n = dark ? 'light' : 'dark';
        d.dataset.theme = n;
        try {
            localStorage.setItem('thadathil_theme', n)
        } catch (e) {}
    }
})();
go('home');