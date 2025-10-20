document.addEventListener('DOMContentLoaded', function () {
  const monthYearEl = document.getElementById('month-year');
  const daysContainer = document.getElementById('days');
  const prevBtn = document.getElementById('prev');
  const nextBtn = document.getElementById('next');
  const searchInput = document.getElementById('search');

  if (!daysContainer || !monthYearEl) return;


  const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

  const weekdayLabels = ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];

  let viewDate = new Date();
  let selectedDate = null;

  function pad(n){ return String(n).padStart(2,'0'); }
  function ymd(y,m,d){ return `${y}-${pad(m+1)}-${pad(d)}`; } // m:0..11


  function parseYMD(dateStr){
    const [y,m,d] = dateStr.split('-').map(Number);
    return new Date(y, m-1, d);
  }

  function keyFor(dateStr){ return 'diary-' + dateStr; }
  function loadEntries(dateStr){
    const raw = localStorage.getItem(keyFor(dateStr));
    return raw ? JSON.parse(raw) : [];
  }
  function saveEntries(dateStr, arr){
    localStorage.setItem(keyFor(dateStr), JSON.stringify(arr));
    renderCalendar();
    dispatchSelected(dateStr);
  }


  (function ensureWeekdays(){
    const weekdaysEl = document.querySelector('.weekdays');
    if (!weekdaysEl) return;
    if (weekdaysEl.children.length >= 7) return;
    weekdayLabels.forEach(l=> {
      const d = document.createElement('div'); d.textContent = l; weekdaysEl.appendChild(d);
    });
  })();

  function renderCalendar(){
    daysContainer.innerHTML = '';
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);


    const startWeekday = (first.getDay() + 6) % 7; // 0 = seg, ... 6 = dom

    monthYearEl.textContent = `${months[month]} ${year}`;


    if (startWeekday > 0) {
      const prevMonthLast = new Date(year, month, 0).getDate();
      const startDate = prevMonthLast - startWeekday + 1;
      for (let d = startDate; d <= prevMonthLast; d++) {
        appendDayCell(new Date(year, month - 1, d), true);
      }
    }


    for (let d = 1; d <= last.getDate(); d++) {
      appendDayCell(new Date(year, month, d), false);
    }


    while (daysContainer.children.length % 7 !== 0) {
      const count = daysContainer.children.length;
      const nextDay = count - (startWeekday + last.getDate()) + 1;
      appendDayCell(new Date(year, month + 1, nextDay), true);
      if (daysContainer.children.length > 100) break;
    }

    updateSelectionVisual();
  }

  function appendDayCell(dateObj, otherMonth){
    const y = dateObj.getFullYear(), m = dateObj.getMonth(), d = dateObj.getDate();
    const dateStr = ymd(y,m,d);
    const el = document.createElement('div');
    el.className = 'day' + (otherMonth ? ' other' : '');
    el.textContent = d;
    el.dataset.date = dateStr;

    const entries = loadEntries(dateStr);
    if (entries.length) el.classList.add('has-entry');

    const today = new Date();
    if (y === today.getFullYear() && m === today.getMonth() && d === today.getDate()) el.classList.add('today');

    el.addEventListener('click', ()=> selectDate(dateStr));
    daysContainer.appendChild(el);
  }

  function selectDate(dateStr){
    selectedDate = dateStr;
    updateSelectionVisual();
    dispatchSelected(dateStr);
  }

  function updateSelectionVisual(){
    const all = daysContainer.querySelectorAll('[data-date]');
    all.forEach(el=> el.classList.toggle('selected', el.dataset.date === selectedDate));
  }


  function dispatchSelected(dateStr){
    const entries = loadEntries(dateStr).slice().reverse();
    const detail = { date: dateStr, entries, api: { add: (t)=> addEntry(dateStr,t), remove: (id)=> deleteEntryById(dateStr,id), clearAll: ()=> clearAllForDay(dateStr) } };
    document.dispatchEvent(new CustomEvent('diary:date-selected', { detail }));
    autoFillPanel(dateStr, entries);
  }

  function autoFillPanel(dateStr, entries){
    const titleEl = document.getElementById('selectedDateTitle');
    const listEl = document.getElementById('entries');
    const formEl = document.getElementById('entryForm');
    const ta = document.getElementById('entryText');
    const clearBtn = document.getElementById('clearAll');

    if (titleEl) titleEl.textContent = parseYMD(dateStr).toLocaleDateString('pt-BR', { weekday:'long', day:'2-digit', month:'long', year:'numeric' });

    if (listEl) {
      listEl.innerHTML = '';
      if (!entries.length) {
        const p = document.createElement('p'); p.className = 'muted'; p.textContent = 'Nenhuma carta para este dia.'; listEl.appendChild(p);
      } else {
        entries.forEach(item=>{
          const div = document.createElement('div'); div.className = 'entry';
          const time = document.createElement('time'); time.textContent = new Date(item.created).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
          const p = document.createElement('p'); p.textContent = item.text; p.style.whiteSpace='pre-wrap';
          const rem = document.createElement('button'); rem.textContent = 'Remover'; rem.className='remove';
          rem.addEventListener('click', ()=> { if(confirm('Remover esta carta?')) deleteEntryById(dateStr, item.id); });
          div.appendChild(time); div.appendChild(p); div.appendChild(rem);
          listEl.appendChild(div);
        });
      }
    }

    if (formEl && ta) {
      // apenas mostra o form — handler de submit é único e registrado abaixo (evita duplicação)
      formEl.style.display = '';
      formEl.onsubmit = null;
    }

    if (clearBtn) {
      clearBtn.onclick = function(){ if(!confirm('Apagar todas as cartas deste dia?')) return; clearAllForDay(dateStr); };
    }
  }


  function addEntry(dateStr, text){
    const arr = loadEntries(dateStr);
    arr.push({ id: Date.now(), text: text, created: new Date().toISOString() });
    saveEntries(dateStr, arr);
  }
  function deleteEntryById(dateStr, id){
    const arr = loadEntries(dateStr).filter(x=> x.id !== id);
    saveEntries(dateStr, arr);
    if (window.authPass && typeof window.syncDayRemote === 'function') {
      window.syncDayRemote(dateStr).catch(e=>console.error('Erro ao sincronizar exclusão:', e));
    }
  }
  function clearAllForDay(dateStr){
    saveEntries(dateStr, []);
    if (window.authPass && typeof window.syncDayRemote === 'function') {
      window.syncDayRemote(dateStr).catch(e=>console.error('Erro ao sincronizar limpeza:', e));
    }
  }


  prevBtn.addEventListener('click', ()=>{ viewDate.setMonth(viewDate.getMonth() - 1); renderCalendar(); });
  nextBtn.addEventListener('click', ()=>{ viewDate.setMonth(viewDate.getMonth() + 1); renderCalendar(); });


  if (searchInput){
    searchInput.addEventListener('input', (e)=>{
      const q = String(e.target.value || '').trim().toLowerCase();
      if (!q) { if (selectedDate) dispatchSelected(selectedDate); return; }

      const results = {};
      for (let i=0;i<localStorage.length;i++){
        const key = localStorage.key(i);
        if (!key || !key.startsWith('diary-')) continue;
        try {
          const arr = JSON.parse(localStorage.getItem(key)) || [];
          const matches = arr.filter(item => String(item.text || '').toLowerCase().includes(q));
          if (matches.length) results[key.replace(/^diary-/,'')] = matches.slice().reverse();
        } catch(e){}
      }
      renderSearchResults(results);
    });
  }

  function renderSearchResults(map){
    const listEl = document.getElementById('entries');
    const formEl = document.getElementById('entryForm');
    if (!listEl) return;
    listEl.innerHTML = '';
    if (!map || Object.keys(map).length === 0){
      const p = document.createElement('p'); p.className='no-results muted'; p.textContent = 'Nenhum resultado encontrado.';
      listEl.appendChild(p);
      if (formEl) formEl.style.display = 'none';
      return;
    }
    Object.keys(map).sort().reverse().forEach(dateStr => {
      const header = document.createElement('h3');
      header.style.margin = '8px 0 6px'; header.style.fontSize = '0.95rem'; header.style.color = '#333';
      header.textContent = parseYMD(dateStr).toLocaleDateString('pt-BR', { weekday:'short', day:'2-digit', month:'short', year:'numeric' });
      listEl.appendChild(header);
      map[dateStr].forEach(item => {
        const div = document.createElement('div'); div.className = 'entry';
        const time = document.createElement('time'); time.textContent = new Date(item.created).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
        time.style.display='block'; time.style.marginBottom='6px'; time.style.color='#666'; time.style.fontSize='12px';
        const p = document.createElement('p'); p.textContent = item.text;
        div.addEventListener('click', ()=> selectDate(dateStr));
        div.appendChild(time); div.appendChild(p);
        listEl.appendChild(div);
      });
    });
    if (formEl) formEl.style.display = 'none';
  }


  /* --- carregamento centralizado (data.json) + desbloqueio por senha simples "sapudo" --- */
  (async function(){
    // helpers base64 <-> ArrayBuffer
    function b64ToBuf(b64){
      const bin = atob(b64); const arr = new Uint8Array(bin.length);
      for (let i=0;i<bin.length;i++) arr[i] = bin.charCodeAt(i);
      return arr.buffer;
    }
    function bufToB64(buf){
      return btoa(String.fromCharCode(...new Uint8Array(buf)));
    }

    async function deriveKey(pass, saltBytes){
      const enc = new TextEncoder();
      const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(pass), {name:'PBKDF2'}, false, ['deriveBits','deriveKey']);
      return crypto.subtle.deriveKey({ name:'PBKDF2', salt: new Uint8Array(saltBytes), iterations: 200000, hash:'SHA-256' }, keyMaterial, { name:'AES-GCM', length:256 }, false, ['decrypt']);
    }

    async function decryptPayload(cipherJsonStr, pass){
      // cipherJsonStr é string JSON: { salt, iv, ct } (todos base64)
      const parts = JSON.parse(cipherJsonStr);
      const salt = b64ToBuf(parts.salt);
      const iv = new Uint8Array(b64ToBuf(parts.iv));
      const ct = b64ToBuf(parts.ct);
      const key = await deriveKey(pass, salt);
      const plainBuf = await crypto.subtle.decrypt({ name:'AES-GCM', iv }, key, ct);
      const text = new TextDecoder().decode(plainBuf);
      return JSON.parse(text); // espera objeto com { entries: [...] }
    }

    async function fetchAndUnlock(){
      try {
        const r = await fetch('data.json', {cache: 'no-store'});
        if (!r.ok) { console.warn('data.json não encontrado'); return; }
        const j = await r.json();
        if (!j || !j.cipher) { console.warn('data.json sem campo cipher'); return; }

        // pedir senha (use prompt simples; você pode substituir pelo modal existente)
        const pass = prompt('Digite a senha para ver o diário:');
        if (!pass) return;

        // normalizar senha (não sensível a maiúsculas/minúsculas)
        const normalized = pass.trim().toLowerCase();

        // senha esperada (se quiser forçar "sapudo" sem depender do hash no arquivo)
        // const expected = 'sapudo';
        // if (normalized !== expected) { alert('Senha incorreta'); return; }

        // tenta descriptografar
        let payload;
        try {
          payload = await decryptPayload(j.cipher, normalized);
        } catch(err){
          console.error(err);
          alert('Senha incorreta ou arquivo inválido.');
          return;
        }

        // payload esperado: { entries: [ {date:'YYYY-MM-DD', texts:[...]} , ... ] }
        renderSharedPayload(payload);
      } catch(err){
        console.error(err);
        alert('Erro ao carregar dados compartilhados.');
      }
    }

    function renderSharedPayload(payload){
      // simples render: substitui #entries pelo conteúdo do payload
      const target = document.getElementById('entries');
      if (!target) return;
      target.innerHTML = ''; // limpar
      const title = document.getElementById('selectedDateTitle');
      title.textContent = 'Cartas compartilhadas';
      if (!payload || !Array.isArray(payload.entries) || payload.entries.length === 0) {
        target.innerHTML = '<p class="muted">Nenhuma carta no arquivo compartilhado.</p>';
        return;
      }
      payload.entries.forEach(item => {
        const box = document.createElement('div');
        box.className = 'entry shared-entry';
        const h = document.createElement('div');
        h.className = 'entry-meta';
        h.textContent = item.date || '';
        const p = document.createElement('div');
        p.className = 'entry-text';
        p.textContent = (Array.isArray(item.texts) ? item.texts.join('\n\n') : (item.text || ''));
        box.appendChild(h); box.appendChild(p);
        target.appendChild(box);
      });
    }

    // se houver ?shared=1 ou simplesmente sempre carregar, chame fetchAndUnlock
    // Aqui chamamos automaticamente ao carregar a página — ajustável
    window.addEventListener('load', ()=> {
      // tenta carregar data.json central (se existir)
      fetch('data.json', {method:'HEAD'}).then(resp=>{
        if (resp.ok) fetchAndUnlock();
      }).catch(()=>{/* silencioso */});
    });

  })();


  /* Remote save/load via Netlify + Supabase (criptografia cliente) */
  (async function(){
    const enc = new TextEncoder();
    const dec = new TextDecoder();

    function bufToB64(buf){ return btoa(String.fromCharCode(...new Uint8Array(buf))); }
    function b64ToBuf(b64){ const bin = atob(b64); const u = new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) u[i]=bin.charCodeAt(i); return u.buffer; }

    async function deriveKey(pass, saltBytes){
      const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(pass), { name:'PBKDF2' }, false, ['deriveBits','deriveKey']);
      return crypto.subtle.deriveKey({ name:'PBKDF2', salt: new Uint8Array(saltBytes), iterations:200000, hash:'SHA-256' }, keyMaterial, { name:'AES-GCM', length:256 }, false, ['encrypt','decrypt']);
    }

    async function encryptObject(obj, pass){
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const key = await deriveKey(pass, salt);
      const plain = enc.encode(JSON.stringify(obj));
      const ct = await crypto.subtle.encrypt({ name:'AES-GCM', iv }, key, plain);
      return JSON.stringify({ salt: bufToB64(salt.buffer), iv: bufToB64(iv.buffer), ct: bufToB64(ct) });
    }

    async function decryptObject(cipher, pass){
      const parts = JSON.parse(cipher);
      const salt = b64ToBuf(parts.salt);
      const iv = new Uint8Array(b64ToBuf(parts.iv));
      const ct = b64ToBuf(parts.ct);
      const key = await deriveKey(pass, salt);
      const plain = await crypto.subtle.decrypt({ name:'AES-GCM', iv }, key, ct);
      return JSON.parse(dec.decode(plain));
    }

    // upload para save-entry (usar FUNCTION_BASE)
    async function saveRemote(dateStr, objCipher) {
      const url = `${FUNCTION_BASE}/save-entry`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: dateStr, ciphertext: objCipher })
      });
      if (!res.ok) {
        const txt = await res.text().catch(()=>res.statusText);
        throw new Error('Falha ao salvar remotamente: ' + txt);
      }
      return (await res.json()).id;
    }

    // fetch de todas as linhas (usar FUNCTION_BASE)
    async function fetchAllRemote() {
      const url = `${FUNCTION_BASE}/get-entries`;
      const res = await fetch(url);
      if (!res.ok) {
        const txt = await res.text().catch(()=>res.statusText);
        throw new Error('Falha ao obter entradas remotas: ' + txt);
      }
      return await res.json(); // array de {id,date,ciphertext,...}
    }

    // integrar com seu fluxo de salvar: ao submeter o form, criptografa e envia
    const form = document.getElementById('entryForm');
    if (form) {
      form.addEventListener('submit', async (e)=>{
        e.preventDefault();
        const ta = document.getElementById('entryText');
        const text = ta ? ta.value.trim() : '';
        if (!text) return;

        // usa a data selecionada do calendário (variável global selectedDate)
        const dateStr = window.selectedDate || selectedDate;
        if (!dateStr) { alert('Selecione uma data no calendário antes de salvar.'); return; }

        // salva localmente sempre (mantém comportamento original)
        addEntry(dateStr, text);

        // se o site estiver desbloqueado e tivermos a senha em memória, salva também no backend
        if (window.authPass) {
          try {
            const payload = { date: dateStr, texts: [ text ], created: new Date().toISOString() };
            const cipher = await encryptObject(payload, window.authPass.toLowerCase());
            await saveRemote(dateStr, cipher);
            console.log('Salvo remoto com sucesso');
          } catch (err) { console.error('Erro ao salvar remoto:', err); }
        }

        if (ta) ta.value = '';
      });
    }


    // auth modal: mantém blur até senha correta e carrega entradas remotas (se houver)
    (function siteAuth(){
      const CORRECT = 'sapudo';
      const appEl = document.querySelector('.container');
      // aplica blur inicial
      if (appEl) { appEl.style.filter = 'blur(10px)'; appEl.style.pointerEvents = 'none'; }

      function showModal(){
        const overlay = document.createElement('div');
        overlay.id = 'site-auth-overlay';
        Object.assign(overlay.style, { position:'fixed', inset:0, background:'rgba(0,0,0,.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999 });
        const box = document.createElement('div');
        Object.assign(box.style, { background:'#fff', padding:'16px', borderRadius:'8px', width:'360px', maxWidth:'94%', textAlign:'center' });
        const h = document.createElement('h3'); h.textContent = 'Senha necessária';
        // dica visível no modal
        const hintNote = document.createElement('p');
        hintNote.className = 'auth-hint-note';
        hintNote.textContent = 'O nome da sua pelúcia favorita é a senha';
        const input = document.createElement('input'); input.type='password'; input.placeholder='Senha';
        Object.assign(input.style, { width:'100%', padding:'8px', marginTop:'12px', boxSizing:'border-box' });
        const btn = document.createElement('button'); btn.textContent='Entrar';
        Object.assign(btn.style, { marginTop:'12px', padding:'8px 12px' });
        // botão "Continuar sem entrar" removido — usuário deve informar a senha para desbloquear
        box.appendChild(h);
        box.appendChild(hintNote);
        box.appendChild(input);
        box.appendChild(document.createElement('br'));
        box.appendChild(btn);
        overlay.appendChild(box); document.body.appendChild(overlay);

        input.addEventListener('keydown', (ev)=> { if (ev.key === 'Enter') btn.click(); });

        btn.addEventListener('click', async ()=>{
          const passRaw = String(input.value || '').trim();
          if (!passRaw) { alert('Digite a senha.'); input.focus(); return; }
          const pass = passRaw.toLowerCase();
          if (pass !== CORRECT) { alert('Senha incorreta.'); input.value=''; input.focus(); return; }

          // senha correta: guarda e desbloqueia UI
          window.authPass = pass;
          overlay.remove();
          if (appEl) { appEl.style.filter = ''; appEl.style.pointerEvents = ''; }

          // carrega entradas remotas via função get-entries -> tenta descriptografar cada registro com a senha
          try {
            const rows = await fetchAllRemote().catch(()=>[]);
            for (const r of rows){
              try {
                const payload = await decryptObject(r.ciphertext, pass);
                // payload esperado: { date, texts:[...] }
                const existing = loadEntries(payload.date) || [];
                (payload.texts || []).forEach(t => existing.push({ id: Date.now() + Math.floor(Math.random()*1000), text: t, created: payload.created || new Date().toISOString() }));
                saveEntries(payload.date, existing); // atualiza local + calendário
              } catch(e){
                // senha não bateu para esse registro -> ignora
              }
            }
          } catch(err){
            console.error('Erro ao carregar entradas remotas:', err);
          }
        });

        // sem handler de cancelamento — apenas o botão "Entrar" está disponível
      }

      window.addEventListener('load', ()=> setTimeout(showModal, 200));
    })();
  })();


  (function init(){
    renderCalendar();
    const today = new Date();
    const todayStr = ymd(today.getFullYear(), today.getMonth(), today.getDate());
    selectDate(todayStr);
  })();
});

// defina a base das Netlify Functions (substitua pelo seu site Netlify)
const FUNCTION_BASE = 'https://xuily.netlify.app/.netlify/functions';
