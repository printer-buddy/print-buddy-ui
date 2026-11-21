//LICENSE
//
//Copyright (C) 2026  sterling motuz <Sterling@dexabyte.ca>
//
//for https://github.com/printer-buddy/printer-buddy
//
//SPDX-License-Identifier: AGPL-3.0-only
//
//Additional term (AGPL-3.0 section 7b, keep author credit): keep this header
//
//Additional term (AGPL-3.0 section 7c, mark changed versions): if you make any changes, you must include a CHANGELOG with all changes and their dates
(() => {
  // Live WebRTC player for LAN viewing: the browser talks straight to the camera,
  // so it only works on the same network and can't cross a share link. On any failure
  // the overlay is torn down and the <img> snapshot path takes over again.
  const STUN = [{ urls: "stun:stun.l.google.com:19302" }];
  const entries = new Map();   // img -> { video, key, close }

  function go2rtc(video, src, onfail) {
    const base = new URL(src);
    const ws = new URL("api/ws" + base.search, base);
    ws.protocol = ws.protocol === "https:" ? "wss:" : "ws:";
    const sock = new WebSocket(ws);
    sock.binaryType = "arraybuffer";
    const h = { pc: null, dead: false };
    sock.onopen = async () => {
      if (h.dead) return;
      const pc = h.pc = new RTCPeerConnection({ bundlePolicy: "max-bundle", iceServers: STUN });
      pc.onicecandidate = e => { if (e.candidate) sock.send(JSON.stringify({ type: "webrtc/candidate", value: e.candidate.toJSON().candidate })); };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") {
          video.srcObject = new MediaStream(pc.getTransceivers().filter(t => t.direction === "recvonly").map(t => t.receiver.track));
        } else if (pc.connectionState === "failed" || pc.connectionState === "disconnected") onfail();
      };
      pc.addTransceiver("video", { direction: "recvonly" });
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      sock.send(JSON.stringify({ type: "webrtc/offer", value: offer.sdp }));
    };
    sock.onmessage = async ev => {
      const m = JSON.parse(ev.data);
      if (m.type === "webrtc/candidate") { try { await h.pc?.addIceCandidate({ candidate: m.value, sdpMid: "0" }); } catch {} }
      else if (m.type === "webrtc/answer") { try { await h.pc?.setRemoteDescription({ type: "answer", sdp: m.value }); } catch {} }
      else if (m.type === "error") onfail();
    };
    sock.onclose = e => { if (!e.wasClean) onfail(); };
    return () => { h.dead = true; try { h.pc?.close(); } catch {} try { sock.close(); } catch {} };
  }

  function camerastreamer(video, src, onfail) {
    const h = { pc: null, dead: false, id: null };
    (async () => {
      const res = await fetch(src, { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "request", iceServers: STUN, keepAlive: true }) });
      if (!res.ok) throw new Error("http " + res.status);
      const offer = await res.json();
      if (h.dead) return;
      h.id = typeof offer.id === "string" ? offer.id : null;
      const pc = h.pc = new RTCPeerConnection({ iceServers: Array.isArray(offer.iceServers) ? offer.iceServers : STUN });
      pc.ondatachannel = ev => { if (ev.channel.label === "keepalive") ev.channel.onmessage = () => { try { ev.channel.send("pong"); } catch {} }; };
      pc.addTransceiver("video", { direction: "recvonly" });
      pc.ontrack = ev => { if (ev.track.kind === "video") video.srcObject = ev.streams[0]; };
      pc.onicecandidate = async ev => {
        if (!ev.candidate) return;
        try { await fetch(src, { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "remote_candidate", id: h.id, candidates: [ev.candidate] }) }); } catch {}
      };
      pc.onconnectionstatechange = () => { if (pc.connectionState === "failed" || pc.connectionState === "disconnected") onfail(); };
      await pc.setRemoteDescription(offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await fetch(src, { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: answer.type, id: h.id, sdp: answer.sdp }) });
    })().catch(() => onfail());
    return () => { h.dead = true; try { h.pc?.close(); } catch {} };
  }

  function mediamtx(video, src, onfail) {
    const base = new URL(src);
    if (!base.pathname.endsWith("/")) base.pathname += "/";
    const whep = new URL("whep", base).toString();
    const h = { pc: null, dead: false, session: "", offer: null, queued: [] };
    const parseOffer = sdp => {
      const o = { iceUfrag: "", icePwd: "", medias: [] };
      for (const l of sdp.split("\r\n")) {
        if (l.startsWith("m=")) o.medias.push(l.slice(2));
        else if (!o.iceUfrag && l.startsWith("a=ice-ufrag:")) o.iceUfrag = l.slice(12);
        else if (!o.icePwd && l.startsWith("a=ice-pwd:")) o.icePwd = l.slice(10);
      }
      return o;
    };
    const frag = cands => {
      const byMid = {};
      for (const c of cands) { const m = c.sdpMLineIndex; (byMid[m] = byMid[m] || []).push(c); }
      let f = "a=ice-ufrag:" + h.offer.iceUfrag + "\r\na=ice-pwd:" + h.offer.icePwd + "\r\n";
      let mid = 0;
      for (const media of h.offer.medias) {
        if (byMid[mid]) { f += "m=" + media + "\r\na=mid:" + mid + "\r\n"; for (const c of byMid[mid]) f += "a=" + c.candidate + "\r\n"; }
        mid++;
      }
      return f;
    };
    const linkIce = links => !links ? [] : links.split(", ").map(link => {
      const m = link.match(/^<(.+?)>; rel="ice-server"(; username="(.*?)"; credential="(.*?)"; credential-type="password")?/i);
      const r = { urls: [m[1]] };
      if (m[3] !== undefined) { r.username = JSON.parse('"' + m[3] + '"'); r.credential = JSON.parse('"' + m[4] + '"'); r.credentialType = "password"; }
      return r;
    });
    const sendCands = async c => { try { await fetch(h.session, { method: "PATCH", headers: { "Content-Type": "application/trickle-ice-sdpfrag", "If-Match": "*" }, body: frag(c) }); } catch {} };
    (async () => {
      const opt = await fetch(whep, { method: "OPTIONS" });
      if (h.dead) return;
      const pc = h.pc = new RTCPeerConnection({ iceServers: linkIce(opt.headers.get("Link")) });
      pc.addTransceiver("video", { direction: "recvonly" });
      pc.onicecandidate = e => { if (!e.candidate) return; if (!h.session) h.queued.push(e.candidate); else sendCands([e.candidate]); };
      pc.oniceconnectionstatechange = () => { if (pc.iceConnectionState === "disconnected") onfail(); };
      pc.ontrack = e => { video.srcObject = e.streams[0]; };
      const offer = await pc.createOffer();
      h.offer = parseOffer(offer.sdp || "");
      await pc.setLocalDescription(offer);
      const res = await fetch(whep, { method: "POST", headers: { "Content-Type": "application/sdp" }, body: offer.sdp });
      if (res.status !== 201) throw new Error("whep " + res.status);
      const loc = res.headers.get("location") || "";
      const sid = loc.slice(loc.lastIndexOf("/") + 1);
      if (!sid) throw new Error("no session");
      h.session = whep + "/" + sid;
      await pc.setRemoteDescription({ type: "answer", sdp: await res.text() });
      if (h.queued.length) { sendCands(h.queued); h.queued = []; }
    })().catch(() => onfail());
    return () => { h.dead = true; try { h.pc?.close(); } catch {} if (h.session) fetch(h.session, { method: "DELETE" }).catch(() => {}); };
  }

  function dial(video, service, src, onfail) {
    const s = (service || "").toLowerCase();
    if (s.includes("go2rtc")) return go2rtc(video, src, onfail);
    if (s.includes("mediamtx")) return mediamtx(video, src, onfail);
    return camerastreamer(video, src, onfail);
  }

  function stop(img) {
    const e = entries.get(img);
    if (!e) return;
    entries.delete(img);
    try { e.close(); } catch {}
    e.video.srcObject = null;
    e.video.remove();
  }

  function play(img, cam) {
    if (!cam || !cam.src) return null;
    const key = cam.src + "|" + (cam.service || "");
    const cur = entries.get(img);
    if (cur && cur.key === key && cur.video.isConnected) return cur.video;
    stop(img);
    const video = document.createElement("video");
    video.autoplay = video.muted = video.playsInline = true;
    video.setAttribute("playsinline", "");
    video.disablePictureInPicture = true;
    video.className = "pb-camvid";
    img.insertAdjacentElement("afterend", video);
    const onfail = () => { const e = entries.get(img); if (e && e.video === video) { stop(img); img.dataset.camWf = String(performance.now() + 8000); } };
    const close = dial(video, cam.service, cam.src, onfail);
    entries.set(img, { video, key, close });
    return video;
  }

  function sweep() {
    for (const img of [...entries.keys()]) if (!img.isConnected || !img.offsetParent) stop(img);
  }

  PB.webrtc = { play, stop, sweep };
})();
