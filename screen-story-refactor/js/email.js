/* ===========================================================
   EMAIL.JS — постоянный почтовый ящик.
   Письма НЕ пропадают: каждый день добавляются новые сверху,
   старые остаются прочитанными. Вложение открывается отдельным
   большим окном.
   Хранилище (глобальное, живёт всю игру):
     window.INBOX        — массив писем {id,from,subj,body,kind,att?}
     window.INBOX_READ   — {id: true}
     window.INBOX_ATT    — {id: true} (вложение открыто)
   openInbox(beat, onDone):
     beat.add / beat.messages — что добавить в ящик (один раз)
     beat.must — id писем, которые надо прочитать, чтобы «Закрыть почту»
   =========================================================== */
window.INBOX = window.INBOX || [];
window.INBOX_READ = window.INBOX_READ || {};
window.INBOX_ATT = window.INBOX_ATT || {};

function inboxAdd(messages) {
  (messages || []).forEach((m) => {
    if (!window.INBOX.some((x) => x.id === m.id)) window.INBOX.unshift(m); // новое — сверху
  });
}

function openInbox(beat, onDone) {
  beat = beat || {};
  inboxAdd(beat.add || beat.messages || []);
  const must = beat.must || [];
  const gated = must.length > 0;
  const read = window.INBOX_READ, att = window.INBOX_ATT;
  let closed = false;

  const win = WM.createWindow({
    title: "Почта — Входящие", icon: "📧", bodyClass: "inbox-win",
    width: 480, x: 200, y: 48,
    build: (body) => {
      body.innerHTML =
        '<div class="inbox-cols">' +
          '<div class="inbox-list" id="ib-list"></div>' +
          '<div class="inbox-read" id="ib-read"><div class="ib-empty">Выберите письмо слева</div></div>' +
        "</div>" +
        '<div class="inbox-bar"><span id="ib-hint"></span><button class="ib-cont" id="ib-cont">Закрыть почту ▸</button></div>';
      const list = body.querySelector("#ib-list");
      const pane = body.querySelector("#ib-read");
      const cont = body.querySelector("#ib-cont");
      const hint = body.querySelector("#ib-hint");

      const needsAtt = (m) => !!(m && m.att);
      const done = (m) => read[m.id] && (!needsAtt(m) || att[m.id]);
      const allDone = () => must.every((id) => { const m = window.INBOX.find((x) => x.id === id); return m && done(m); });

      function refresh() {
        list.innerHTML = "";
        window.INBOX.forEach((m) => {
          const row = document.createElement("div");
          row.className = "mail-row " + (m.kind || "") + (read[m.id] ? "" : " unread");
          row.innerHTML = '<div class="mr-dot"></div><div class="mr-main"><div class="mr-from"></div><div class="mr-subj"></div></div>';
          row.querySelector(".mr-from").textContent = m.from;
          row.querySelector(".mr-subj").textContent = m.subj;
          row.addEventListener("click", () => openMsg(m));
          list.appendChild(row);
        });
        const ok = !gated || allDone();
        cont.disabled = !ok;
        hint.textContent = ok ? "" : "Прочитай новое письмо…";
      }

      function openMsg(m) {
        read[m.id] = true;
        pane.innerHTML = "";
        const h = document.createElement("div"); h.className = "ir-head";
        const s = document.createElement("div"); s.className = "ir-subj"; s.textContent = m.subj;
        const fr = document.createElement("div"); fr.className = "ir-from"; fr.textContent = "От: " + m.from;
        h.appendChild(s); h.appendChild(fr); pane.appendChild(h);
        const b = document.createElement("div"); b.className = "ir-body " + (m.kind || ""); b.textContent = m.body;
        pane.appendChild(b);
        if (m.att) {
          const chip = document.createElement("div"); chip.className = "ir-att" + (att[m.id] ? " opened" : "");
          chip.textContent = "📎 " + m.att.name;
          chip.addEventListener("click", () => openAtt(m, chip));
          pane.appendChild(chip);
        }
        Sounds.beep(m.kind === "bad" ? 160 : 520, 0.05, m.kind === "bad" ? "sawtooth" : "sine", 0.06);
        refresh();
      }

      function openAtt(m, chip) {
        att[m.id] = true; chip.classList.add("opened");
        WM.createWindow({
          title: "Просмотр — " + m.att.name, icon: "🖼", bodyClass: "image-window big-view",
          width: 520, x: 170, y: 55,
          build: (vb) => {
            const img = new Image(); img.className = "slot-img";
            img.onerror = () => { vb.innerHTML = '<div class="slot-ph">[ картинка: ' + (m.att.src || "") + " ]</div>"; if (m.att.caption) capIn(vb, m.att.caption); };
            img.onload = () => { vb.innerHTML = ""; vb.appendChild(img); if (m.att.caption) capIn(vb, m.att.caption); };
            img.src = m.att.src;
          }
        });
        Sounds.beep(90, 0.6, "sawtooth", 0.12); refresh();
      }
      function capIn(w, t) { const c = document.createElement("div"); c.className = "cam-caption"; c.style.position = "static"; c.textContent = t; w.appendChild(c); }

      cont.addEventListener("click", () => { if (cont.disabled || closed) return; closed = true; win._close(); onDone && onDone(); });
      refresh();
    }
  });
  const x = win.querySelector(".win-btn"); if (x) x.style.visibility = "hidden";
}
